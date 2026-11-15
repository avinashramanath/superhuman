"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { growthForDay, visualDayForScore, buildTimeline, timelineAt, taskPhase, createController } = require("../living-core.js");

test("the existing growth score maps continuously to the 150-point full-radiance cap", () => {
  assert.equal(visualDayForScore(0), 0);
  assert.equal(visualDayForScore(75), 10.5);
  assert.equal(visualDayForScore(150), 21);
  assert.equal(visualDayForScore(1000), 21);
  assert.ok(growthForDay(visualDayForScore(76)).coreRadius > growthForDay(visualDayForScore(75)).coreRadius);
  assert.throws(() => visualDayForScore(NaN), /non-negative/);
  assert.throws(() => visualDayForScore(-1), /non-negative/);
});

test("playback starts at the first routine record and does not invent full days or future check-ins", () => {
  const state = {
    routines: { "2024-02-28": ["a"], "2024-03-01": ["a"], "2024-03-05": ["a"] },
    completions: { "2024-02-29": ["a"], "2024-03-01": ["a"], "2024-03-05": ["a"] }
  };
  const timeline = buildTimeline(state, "2024-03-02");
  assert.equal(timeline.incomplete, true);
  assert.equal(timeline.snapshots.length, 3);
  assert.deepEqual(timelineAt(timeline, 0), {
    day: timeline.start, number: 1, date: "2024-02-28",
    snapshot: timeline.snapshots[0]
  });
  assert.equal(timeline.snapshots[1].actions, 1);
  assert.equal(timeline.snapshots[1].fullDays, 0);
  assert.equal(timeline.snapshots[1].score, 1);
  assert.equal(timeline.snapshots[2].actions, 2);
  assert.equal(timeline.snapshots[2].fullDays, 1);
  assert.equal(timeline.snapshots[2].score, 7);
  assert.equal(timelineAt(timeline, 1).date, "2024-03-02");
  assert.equal(timelineAt(timeline, 1).number, 4);
});

test("gaps preserve recorded values rather than inventing check-ins or streaks", () => {
  const state = {
    routines: { "2024-01-01": ["a"], "2024-01-03": ["a"] },
    completions: { "2024-01-01": ["a"], "2024-01-03": ["a"] }
  };
  const timeline = buildTimeline(state, "2024-01-03");
  const gap = timelineAt(timeline, 0.5);
  assert.equal(gap.date, "2024-01-02");
  assert.equal(gap.snapshot.date, "2024-01-01");
  assert.equal(timeline.snapshots[1].fullDays, 2);
  assert.equal(timeline.snapshots[1].bestStreak, 1);
  assert.equal(timeline.snapshots[1].score, 10);
  assert.equal(timeline.incomplete, true);
  assert.equal(timelineAt(buildTimeline({ routines: {}, completions: {} }, "2024-01-03"), 1), null);
  assert.throws(() => buildTimeline(state, "2024-02-30"), /valid local date/);
});

test("task feedback proceeds through distinct stages", () => {
  assert.equal(taskPhase(0).phase, "arrival");
  assert.equal(taskPhase(650).phase, "absorption");
  assert.equal(taskPhase(900).phase, "pulse");
  assert.equal(taskPhase(1400).phase, "expansion");
  assert.equal(taskPhase(1850).phase, "settled");
});

test("multiple cores have unique SVG resources and pause or settle appropriately", () => {
  const original = { document: global.document, window: global.window,
    requestAnimationFrame: global.requestAnimationFrame, cancelAnimationFrame: global.cancelAnimationFrame };
  const listeners = new Map(), motionListeners = new Set(), frames = new Map();
  let nextFrame = 0;
  const media = { matches: false, addEventListener(type, fn) { motionListeners.add(fn); }, removeEventListener(type, fn) { motionListeners.delete(fn); } };
  const node = () => ({ attrs: {}, children: [], setAttribute(key, value) { this.attrs[key] = value; }, appendChild(child) { this.children.push(child); } });
  try {
    global.document = {
      hidden: false, createElementNS() { return node(); },
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
      removeEventListener(type, fn) { listeners.get(type).delete(fn); }
    };
    global.window = { matchMedia() { return media; } };
    global.requestAnimationFrame = fn => { frames.set(++nextFrame, fn); return nextFrame; };
    global.cancelAnimationFrame = id => frames.delete(id);
    const first = node(), second = node();
    const a = createController(first), b = createController(second);
    assert.notEqual(first.children[0].children[0].attrs.id, second.children[0].children[0].attrs.id);
    a.setActive(true);
    b.setActive(true);
    assert.equal(frames.size, 2);
    global.document.hidden = true;
    for (const fn of listeners.get("visibilitychange")) fn();
    assert.equal(frames.size, 0);
    global.document.hidden = false;
    for (const fn of listeners.get("visibilitychange")) fn();
    assert.equal(frames.size, 2);
    media.matches = true;
    for (const fn of motionListeners) fn();
    assert.equal(frames.size, 0);
    a.celebrate(0, 21);
    assert.equal(Number(first.children[1].attrs.r), growthForDay(21).haloRadius);
    a.dispose(); b.dispose();
    assert.equal(listeners.get("visibilitychange").size, 0);
    assert.equal(motionListeners.size, 0);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete global[key]; else global[key] = value;
    }
  }
});
