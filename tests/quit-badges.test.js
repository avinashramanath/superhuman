"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const badgeDefinitions = source.slice(source.indexOf("  const FIRST_YEAR_QUIT_BADGES"), source.indexOf("  const EVOLUTION_STAGES"));
const smokeFunctions = source.slice(source.indexOf("  function smokeTimerOrigin("), source.indexOf("  function growthScore("));
const rendering = source.slice(source.indexOf("  function formatQuitCountdown("), source.indexOf("  function updateSmokeVisual("));
const day = 86400000;

function harness(bestRunMs = 0) {
  const elements = {};
  const context = {
    state: { smoking: { startedAt: null, lapses: [], bestRunMs } },
    normalizeSmoking: () => ({ startedAt: null, lapses: [], bestRunMs: 0 }),
    $: id => elements[id] || (elements[id] = {}),
    QUIT_MILESTONES: [],
    Date, Math
  };
  vm.runInNewContext(`${badgeDefinitions}\n${smokeFunctions}\n${rendering}\n` +
    "globalThis.badges = QUIT_BADGES; globalThis.newBadges = FIRST_YEAR_QUIT_BADGES;", context);
  return { context, elements };
}

test("adds exactly 100 unique badges between five minutes and one year", () => {
  const { context } = harness();
  const added = Array.from(context.newBadges);
  assert.equal(added.length, 100);
  assert.equal(new Set(added.map(badge => badge.afterMs)).size, 100);
  assert.equal(new Set(added.map(badge => badge.title)).size, 100);
  assert.equal(added[0].afterMs, 5 * 60000);
  assert.equal(added.at(-1).afterMs, 365 * day);
  assert.ok(added.every(badge => badge.afterMs > 0 && badge.afterMs <= 365 * day && badge.title && badge.copy && badge.icon));
});

test("rewards are frequent at the start and spaced throughout the first year", () => {
  const { context } = harness();
  const added = Array.from(context.newBadges);
  assert.equal(added.filter(badge => badge.afterMs < day).length, 8);
  assert.equal(added.filter(badge => badge.afterMs >= 2 * day && badge.afterMs < 30 * day).length, 26);
  const later = added.filter(badge => badge.afterMs >= 31 * day);
  assert.equal(later.length, 66);
  assert.ok(later.every((badge, index) => !index || badge.afterMs - later[index - 1].afterMs <= 14 * day));
});

test("original badges and their thresholds are retained in chronological order", () => {
  const { context } = harness();
  const badges = Array.from(context.badges);
  const originals = [
    ["First Light", 3600000], ["First Sunrise", day], ["Clear Senses", 5 * day],
    ["Open Air", 10 * day], ["A Month of Possibility", 30 * day],
    ["New Rhythm", 60 * day], ["Clear Horizon", 120 * day], ["A Brighter Season", 240 * day],
    ["Two Years, Yours", 2 * 365.25 * day], ["Renewed Horizon", 6 * 365.25 * day],
    ["The Long View", 11 * 365.25 * day], ["Lasting Freedom", 16 * 365.25 * day]
  ];
  assert.equal(badges.length, 112);
  assert.ok(badges.every((badge, index) => !index || badge.afterMs > badges[index - 1].afterMs));
  for (const [title, threshold] of originals) assert.equal(badges.find(badge => badge.title === title).afterMs, threshold);
});

test("the first badge unlocks at five minutes and advances the next badge", () => {
  const h = harness(5 * 60000 - 1);
  h.context.renderQuitJourney(0);
  assert.equal(h.elements["quit-badge-count"].textContent, "0 / 112 earned");
  assert.equal(h.elements["quit-next-badge-title"].textContent, "A Fresh Start");
  h.context.state.smoking.bestRunMs = 5 * 60000;
  h.context.renderQuitJourney(0);
  assert.equal(h.elements["quit-badge-count"].textContent, "1 / 112 earned");
  assert.match(h.elements["current-quit-badge"].innerHTML, /A Fresh Start/);
  assert.equal(h.elements["quit-next-badge-title"].textContent, "A Quiet Quarter");
});

test("an existing best run unlocks qualifying new badges even after a slip", () => {
  const h = harness(365 * day);
  h.context.state.smoking.startedAt = new Date(Date.now() - 365 * day).toISOString();
  h.context.state.smoking.lapses = [new Date().toISOString()];
  h.context.renderQuitJourney(0);
  assert.equal(h.elements["quit-badge-count"].textContent, "108 / 112 earned");
  assert.match(h.elements["current-quit-badge"].innerHTML, /One Year, Yours/);
  assert.equal(h.elements["quit-next-badge-title"].textContent, "Two Years, Yours");
  assert.equal((h.elements["quit-badge-grid"].innerHTML.match(/quit-badge is-earned/g) || []).length, 108);
});

test("all badges unlock at the original final threshold", () => {
  const h = harness(16 * 365.25 * day);
  h.context.renderQuitJourney(0);
  assert.equal(h.elements["quit-badge-count"].textContent, "112 / 112 earned");
  assert.equal(h.elements["quit-next-badge-title"].textContent, "All quit badges earned");
  assert.match(h.elements["current-quit-badge"].innerHTML, /Lasting Freedom/);
});
