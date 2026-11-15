"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../sync-core.js");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const helpers = source.slice(source.indexOf("  function groupLabel("), source.indexOf("  function switchView("));
const gestures = source.slice(source.indexOf("  function startTaskDrag("), source.indexOf('  $("add-task-button").addEventListener'));
const formHandlers = source.slice(source.indexOf('  $("add-task-button").addEventListener'), source.indexOf('  $("delete-task-button").addEventListener'));

function harness(tasks = [
  { id: "a", name: "A", group: "Morning" },
  { id: "b", name: "B", group: "Morning" },
  { id: "c", name: "C", group: "Evening" }
]) {
  const listeners = {};
  const windowListeners = {};
  let timer;
  let saved = 0;
  let toggled = null;
  let removed = 0;
  let animations = 0;
  const groups = new Map();
  for (const task of tasks) {
    if (!groups.has(task.group)) {
      const top = 100 + groups.size * 200;
      groups.set(task.group, { cards: [], top, get children() { return this.cards; },
        parentElement: { getBoundingClientRect: () => ({ top: top - 40, bottom: top + 90 }) } });
    }
  }
  const cards = tasks.map(task => {
    const surface = { classList: { add() {}, remove() {} }, style: {} };
    const card = {
      dataset: { id: task.id },
      classList: { add() {}, remove() {} },
      getBoundingClientRect() {
        const top = this.parentNode.top + this.parentNode.cards.indexOf(this) * 100;
        return { top, bottom: top + 80, left: 0, width: 300 };
      },
      get nextSibling() { return this.parentNode.cards[this.parentNode.cards.indexOf(this) + 1] || null; },
      querySelector: () => surface,
      cloneNode: () => ({ classList: { add() {}, remove() {} }, setAttribute() {}, style: {}, remove() { removed++; } }),
      animate() { animations++; },
      setPointerCapture() {}
    };
    const group = groups.get(task.group);
    card.parentNode = group;
    group.cards.push(card);
    return card;
  });
  for (const group of groups.values()) {
    group.insertBefore = (card, before) => {
      card.parentNode.cards.splice(card.parentNode.cards.indexOf(card), 1);
      const index = before ? group.cards.indexOf(before) : group.cards.length;
      group.cards.splice(index, 0, card);
      card.parentNode = group;
    };
    group.appendChild = card => group.insertBefore(card, null);
  }
  const list = {
    classList: { add() {}, remove() {} },
    addEventListener(type, handler) { listeners[type] = handler; },
    querySelectorAll() { return [...groups.values()].flatMap(group => group.cards); }
  };
  const context = {
    state: { tasks }, taskDrag: null, suppressTaskClickUntil: 0,
    $: () => list, save: () => saved++, render() {}, toggleTask(id) { toggled = id; },
    setTimeout(fn) { timer = fn; return 1; }, clearTimeout() { timer = null; },
    setInterval() { return 2; }, clearInterval() {},
    document: { body: { appendChild() {} } },
    window: { innerHeight: 800, scrollBy() {}, matchMedia() { return { matches: false }; }, addEventListener(type, handler) { windowListeners[type] = handler; } },
    Math, Date
  };
  vm.runInNewContext(helpers + gestures, context);
  const touch = (id, x, y) => ({ identifier: id, clientX: x, clientY: y });
  const target = card => ({ closest(selector) { return selector === ".task-check" ? null : card; } });
  function start(card = cards[0]) {
    listeners.touchstart({ target: target(card), touches: [touch(1, 50, 140)], changedTouches: [touch(1, 50, 140)] });
  }
  function move(x, y) {
    let prevented = false;
    listeners.touchmove({ changedTouches: [touch(1, x, y)], preventDefault() { prevented = true; } });
    return prevented;
  }
  function end(x, y) { listeners.touchend({ changedTouches: [touch(1, x, y)] }); }
  return {
    context, cards, listeners, windowListeners, start, move, end,
    hold() { if (timer) { const fn = timer; timer = null; fn(); } },
    get saved() { return saved; }, get toggled() { return toggled; }, get removed() { return removed; },
    get visualIds() { return list.querySelectorAll().map(card => card.dataset.id); },
    get animations() { return animations; }
  };
}

function ids(h) { return Array.from(h.context.state.tasks, task => task.id); }

test("long press on a task moves it down into the target group", () => {
  const h = harness();
  h.start(); h.hold();
  assert.equal(h.move(50, 370), true);
  assert.deepEqual(h.visualIds, ["b", "c", "a"]);
  assert.ok(h.animations > 0);
  h.end(50, 370);
  assert.deepEqual(ids(h), ["b", "c", "a"]);
  assert.equal(h.context.state.tasks[2].group, "Evening");
  assert.equal(h.saved, 1);
  assert.equal(h.removed, 1);
});

test("a task can move upward before another task", () => {
  const h = harness();
  h.context.reorderTask("c", "a", false);
  assert.deepEqual(ids(h), ["c", "a", "b"]);
  assert.equal(h.context.state.tasks[0].group, "Morning");
});

test("reordering inside one group preserves its group", () => {
  const h = harness();
  h.context.reorderTask("a", "b", true);
  assert.deepEqual(ids(h), ["b", "a", "c"]);
  assert.equal(h.context.state.tasks[1].group, "Morning");
});

test("movement before the hold allows normal scrolling without reordering", () => {
  const h = harness();
  h.start();
  assert.equal(h.move(50, 245), false);
  h.hold(); h.end(50, 245);
  assert.deepEqual(ids(h), ["a", "b", "c"]);
  assert.equal(h.saved, 0);
});

test("cancelling an active touch removes the ghost without saving", () => {
  const h = harness();
  h.start(); h.hold(); h.move(50, 370);
  h.listeners.touchcancel();
  assert.deepEqual(ids(h), ["a", "b", "c"]);
  assert.deepEqual(h.visualIds, ["a", "b", "c"]);
  assert.equal(h.removed, 1);
  assert.equal(h.saved, 0);
});

test("a lone task can be dragged back into its original empty group", () => {
  const h = harness([
    { id: "a", name: "A", group: "Morning" },
    { id: "b", name: "B", group: "Evening" }
  ]);
  h.start(); h.hold(); h.move(50, 370);
  assert.deepEqual(h.visualIds, ["b", "a"]);
  h.move(50, 140);
  assert.deepEqual(h.visualIds, ["a", "b"]);
  h.end(50, 140);
  assert.deepEqual(ids(h), ["a", "b"]);
  assert.equal(h.saved, 0);
});

test("holding and releasing on the same task does not reorder or trigger a tap", () => {
  const h = harness();
  h.start(); h.hold(); h.end(50, 140);
  assert.deepEqual(ids(h), ["a", "b", "c"]);
  assert.equal(h.saved, 0);
  assert.ok(h.context.suppressTaskClickUntil > Date.now());
});

test("swiping left still completes a task without reordering", () => {
  const h = harness();
  h.start(); h.move(-50, 140); h.end(-50, 140);
  assert.equal(h.toggled, "a");
  assert.deepEqual(ids(h), ["a", "b", "c"]);
});

test("swiping still completes the only remaining task", () => {
  const h = harness([{ id: "a", name: "A", group: "Morning" }]);
  h.start(); h.move(-50, 140); h.end(-50, 140);
  assert.equal(h.toggled, "a");
  assert.equal(h.saved, 0);
});

test("pressing the completion button does not start a drag", () => {
  const h = harness();
  h.listeners.touchstart({
    target: { closest(selector) { return selector === ".task-check" ? {} : h.cards[0]; } },
    touches: [{}], changedTouches: [{ identifier: 1, clientX: 50, clientY: 140 }]
  });
  h.hold();
  assert.equal(h.context.taskDrag, null);
});

test("existing groups ignore case and whitespace and receive new tasks together", () => {
  const h = harness([
    { id: "a", name: "A", group: "Evening" },
    { id: "b", name: "B", group: "Morning" },
    { id: "c", name: "C", group: " evening " }
  ]);
  const added = { id: "d", name: "D", group: "EVENING" };
  const result = h.context.insertTaskInGroup(h.context.state.tasks, added);
  assert.deepEqual(Array.from(result, task => task.id), ["a", "c", "d", "b"]);
  assert.equal(added.group.trim().toLowerCase(), "evening");
});

test("new and ungrouped tasks remain in a single corresponding group", () => {
  const h = harness([{ id: "a", name: "A", group: "" }, { id: "b", name: "B", group: "Morning" }]);
  const daily = h.context.insertTaskInGroup(h.context.state.tasks, { id: "c", name: "C", group: "Daily flow" });
  assert.deepEqual(Array.from(daily, task => task.id), ["a", "c", "b"]);
  const fresh = h.context.insertTaskInGroup(daily, { id: "d", name: "D", group: "Evening" });
  assert.deepEqual(Array.from(fresh, task => task.id), ["a", "c", "b", "d"]);
});

test("dragged group and task order survive conversion to synced records", () => {
  const h = harness();
  h.context.reorderTask("a", "c", true);
  const values = core.recordsFromState({ ...h.context.state, completions: {}, routines: {}, journal: [], smoking: {}, growthPoints: 0, name: "test" });
  const records = Object.fromEntries(Object.entries(values).map(([record_key, value]) => [record_key, { record_key, value, deleted: false }]));
  const restored = core.stateFromRecords(records);
  assert.deepEqual(restored.tasks.map(task => task.id), ["b", "c", "a"]);
  assert.equal(restored.tasks[2].group, "Evening");
});

test("multiple touches cancel an active drag and do not save", () => {
  const h = harness();
  h.start(); h.hold(); h.move(50, 370);
  h.listeners.touchstart({ touches: [{}, {}] });
  assert.deepEqual(ids(h), ["a", "b", "c"]);
  assert.equal(h.saved, 0);
  assert.equal(h.removed, 1);
});

test("mouse drag uses the same long-press reorder behavior", () => {
  const h = harness();
  h.listeners.pointerdown({ pointerType: "mouse", isPrimary: true, button: 0, pointerId: 7, clientX: 50, clientY: 140,
    target: { closest(selector) { return selector === ".task-check" ? null : h.cards[0]; } } });
  h.hold();
  h.windowListeners.pointermove({ pointerId: 7, clientX: 50, clientY: 370, preventDefault() {} });
  h.windowListeners.pointerup({ pointerId: 7 });
  assert.deepEqual(ids(h), ["b", "c", "a"]);
});

function formHarness(tasks) {
  const elements = {};
  function element(id) {
    if (!elements[id]) {
      elements[id] = {
        value: "", innerHTML: "", hidden: false, required: false, disabled: false, listeners: {},
        addEventListener(type, handler) { this.listeners[type] = handler; },
        setCustomValidity(message) { this.error = message; },
        reportValidity() {}, focus() {}, showModal() {}, close() {},
        querySelector() { return {}; }
      };
    }
    return elements[id];
  }
  const context = {
    state: { tasks }, $: element, MAX_TASKS: 25, ICONS: ["*"], selectedIcon: "*", editingId: null,
    escapeHtml: value => value, save() {}, render() {}, Date, Math
  };
  vm.runInNewContext(helpers + formHandlers, context);
  return { context, elements, element };
}

test("group dropdown lists existing groups once and opens with the task's matching group", () => {
  const h = formHarness([
    { id: "a", name: "A", group: "Evening", icon: "*" },
    { id: "b", name: "B", group: " evening ", icon: "*" }
  ]);
  h.context.openTaskDialog(h.context.state.tasks[1]);
  assert.equal((h.element("task-group").innerHTML.match(/<option/g) || []).length, 3);
  assert.equal(h.element("task-group").value, "Evening");
  assert.equal(h.element("new-task-group").hidden, true);
});

test("creating a case-variant group via the form adds to the existing group", () => {
  const h = formHarness([
    { id: "a", name: "A", group: "Evening" },
    { id: "b", name: "B", group: "Morning" }
  ]);
  h.context.openTaskDialog();
  h.element("task-name").value = "New task";
  h.element("task-group").value = "";
  h.element("task-group").listeners.change();
  assert.equal(h.element("new-task-group").required, true);
  h.element("new-task-group").value = "  EVENING  ";
  h.element("task-form").listeners.submit({ preventDefault() {} });
  assert.deepEqual(Array.from(h.context.state.tasks, task => task.name), ["A", "New task", "B"]);
  assert.equal(h.context.state.tasks[1].group, "Evening");
});

test("editing a task to an existing group moves it into that group", () => {
  const h = formHarness([
    { id: "a", name: "A", group: "Morning", icon: "*" },
    { id: "b", name: "B", group: "Evening", icon: "*" },
    { id: "c", name: "C", group: "Evening", icon: "*" }
  ]);
  h.context.openTaskDialog(h.context.state.tasks[0]);
  h.element("task-group").value = "Evening";
  h.element("task-form").listeners.submit({ preventDefault() {} });
  assert.deepEqual(Array.from(h.context.state.tasks, task => task.id), ["b", "c", "a"]);
  assert.equal(h.context.state.tasks[2].group, "Evening");
});

test("blank new group is rejected instead of silently creating a group", () => {
  const h = formHarness([{ id: "a", name: "A", group: "Morning" }]);
  h.context.openTaskDialog();
  h.element("task-name").value = "New task";
  h.element("task-group").value = "";
  h.element("new-task-group").value = "   ";
  h.element("task-form").listeners.submit({ preventDefault() {} });
  assert.equal(h.context.state.tasks.length, 1);
  assert.match(h.element("new-task-group").error, /Enter a group name/);
  h.element("task-group").value = "Morning";
  h.element("task-group").listeners.change();
  assert.equal(h.element("new-task-group").error, "");
  assert.equal(h.element("new-task-group").required, false);
});
