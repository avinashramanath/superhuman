"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../sync-core.js");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const reorderSource = source.slice(source.indexOf("  function reorderTask("), source.indexOf("  function switchView("));
const pointerSource = source.slice(source.indexOf('  $("routine-list").addEventListener("pointerdown"'), source.indexOf('  $("add-task-button").addEventListener'));

function harness() {
  const listeners = {};
  const state = { tasks: [{ id: "a", name: "A", group: "One" }, { id: "b", name: "B", group: "Two" }, { id: "c", name: "C", group: "One" }] };
  let saved = 0;
  let callback;
  let hit;
  const list = { addEventListener(type, handler) { listeners[type] = handler; } };
  const card = id => ({ dataset: { id }, classList: { add() {}, remove() {} } });
  const first = card("a");
  const last = card("c");
  const handle = { disabled: false, closest() { return first; }, setPointerCapture() {} };
  const context = {
    state, $: () => list, save: () => saved++, render() {}, taskDrag: null,
    setTimeout(fn) { callback = fn; return 1; }, clearTimeout() { callback = null; },
    document: { elementFromPoint() { return hit && { closest: () => hit }; } },
    window: { innerHeight: 800, scrollBy() {} }, Math
  };
  vm.runInNewContext(reorderSource + pointerSource, context);
  const event = { pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, target: { closest: () => handle }, preventDefault() {} };
  return { listeners, state, first, last, event, hold() { callback(); }, target(value) { hit = value; }, get saved() { return saved; } };
}

test("hold and drag reorders tasks across groups and sync preserves their order", () => {
  const h = harness();
  h.listeners.pointerdown(h.event);
  h.hold();
  h.target(h.last);
  h.listeners.pointermove({ ...h.event, clientY: 200 });
  h.listeners.pointerup(h.event);
  assert.deepEqual(h.state.tasks.map(task => task.id), ["b", "c", "a"]);
  assert.equal(h.saved, 1);
  const values = core.recordsFromState({ ...h.state, completions: {}, routines: {}, journal: [], smoking: {}, growthPoints: 0, name: "test" });
  const records = Object.fromEntries(Object.entries(values).map(([record_key, value]) => [record_key, { record_key, value, deleted: false }]));
  assert.deepEqual(core.stateFromRecords(records).tasks.map(task => task.id), ["b", "c", "a"]);
});

test("cancelled or prematurely moved gestures do not reorder tasks", () => {
  const h = harness();
  h.listeners.pointerdown(h.event);
  h.target(h.last);
  h.listeners.pointermove({ ...h.event, clientY: 200 });
  h.listeners.pointerup(h.event);
  assert.deepEqual(h.state.tasks.map(task => task.id), ["a", "b", "c"]);
  h.listeners.pointerdown(h.event);
  h.hold();
  h.listeners.pointermove({ ...h.event, clientY: 200 });
  h.listeners.pointercancel(h.event);
  assert.deepEqual(h.state.tasks.map(task => task.id), ["a", "b", "c"]);
  assert.equal(h.saved, 0);
});
