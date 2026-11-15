"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../sync-core.js");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("100 additional routine badges have unique milestones and unlock at their thresholds", () => {
  const definitions = source.slice(source.indexOf("  const BADGES ="), source.indexOf("  const QUIT_MILESTONES ="));
  const context = {
    totalCompletions: s => s.tasks, fullDays: s => s.days, bestStreak: s => s.streak
  };
  vm.runInNewContext(definitions + "\nthis.badges = BADGES;", context);
  const badges = context.badges;
  assert.equal(badges.length, 133);
  assert.equal(new Set(badges.map(badge => badge.id)).size, 133);
  assert.equal(new Set(badges.map(badge => badge.title)).size, 133);
  for (const badge of badges) {
    const [kind, threshold] = badge.id.split("-");
    const count = Number(threshold);
    const below = { tasks: 0, days: 0, streak: 0, [kind]: count - 1 };
    const at = { ...below, [kind]: count };
    assert.equal(badge.test(below, below), false, badge.id);
    assert.equal(badge.test(at, at), true, badge.id);
  }
});

function oathHarness() {
  const elements = {};
  function element(id) {
    if (!elements[id]) elements[id] = {
      value: "", textContent: "", innerHTML: "", hidden: false, listeners: {},
      addEventListener(type, handler) { this.listeners[type] = handler; }, focus() { this.focused = true; }
    };
    return elements[id];
  }
  let now = new Date(2026, 10, 15, 23, 30);
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
  }
  const context = {
    state: { oaths: [] }, $: element, Date: Clock, Intl, SuperhumanSyncCore: core,
    isRecord: value => Boolean(value) && typeof value === "object" && !Array.isArray(value),
    escapeHtml: value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]),
    save: () => true
  };
  const localDate = source.slice(source.indexOf("  function localDateKey("), source.indexOf("  function loadState("));
  const validation = source.slice(source.indexOf("  function validOaths("), source.indexOf("  function normalizeStoredState("));
  const render = source.slice(source.indexOf("  function renderOaths("), source.indexOf("  function renderHistory("));
  const handlers = source.slice(source.indexOf('  $("oath-text").addEventListener'), source.indexOf('  $("journal-text").addEventListener'));
  vm.runInNewContext(localDate + validation + render + handlers, context);
  return { context, element, setNow(value) { now = value; }, submit() { element("oath-form").listeners.submit({ preventDefault() {} }); } };
}

test("today's oath saves, edits without duplicates, escapes history, and rolls over at midnight", () => {
  const h = oathHarness();
  h.element("oath-text").value = "<Be kind>";
  h.submit();
  assert.equal(h.context.state.oaths.length, 1);
  assert.equal(h.element("oath-words").textContent, "<Be kind>");
  assert.match(h.element("oath-entries").innerHTML, /&lt;Be kind&gt;/);
  assert.equal(h.element("oath-time-left").textContent, "0h 30m left today");
  h.element("oath-edit-button").listeners.click();
  assert.equal(h.element("oath-text").value, "<Be kind>");
  h.element("oath-text").value = "Keep going";
  h.submit();
  assert.equal(h.context.state.oaths.length, 1);
  assert.equal(h.context.state.oaths[0].text, "Keep going");
  h.setNow(new Date(2026, 10, 16, 0, 0));
  h.context.renderOaths(new Date(2026, 10, 16, 0, 0));
  assert.equal(h.element("oath-edit-button").hidden, true);
  assert.equal(h.element("oath-time-left").textContent, "24h 0m left today");
  h.element("oath-text").value = "A new promise";
  h.submit();
  assert.equal(h.context.state.oaths.length, 2);
  assert.equal(h.context.state.oaths[1].date, "2026-11-16");
});

test("empty or failed saves retain the draft and do not alter oath history", () => {
  const h = oathHarness();
  h.element("oath-text").value = "  ";
  h.submit();
  assert.equal(h.context.state.oaths.length, 0);
  assert.equal(h.element("oath-error").hidden, false);
  h.context.save = () => false;
  h.element("oath-text").value = "My promise";
  h.submit();
  assert.equal(h.context.state.oaths.length, 0);
  assert.equal(h.element("oath-text").value, "My promise");
  assert.match(h.element("oath-error").textContent, /could not be saved/);
});
