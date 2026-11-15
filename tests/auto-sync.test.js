"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../sync-core.js");
const { create } = require("../auto-sync.js");

function initialState() {
  return {
    tasks: [{ id: "water", name: "Water" }],
    completions: {}, routines: {}, journal: [],
    smoking: { startedAt: null, lapses: [] }, growthPoints: 0, name: "Alex"
  };
}

function cloud() {
  const records = {};
  let online = true;
  return {
    setOnline(value) { online = value; },
    get records() { return records; },
    async readRecords() {
      if (!online) throw new Error("Offline");
      return structuredClone(records);
    },
    async writeRecord(record, expected) {
      if (!online) throw new Error("Offline");
      const current = records[record.record_key];
      if ((current?.revision || 0) !== expected) return { applied: false, record: structuredClone(current) };
      const next = { ...structuredClone(record), revision: expected + 1 };
      records[record.record_key] = next;
      return { applied: true, record: structuredClone(next) };
    }
  };
}

function device(transport, writer, seed, existingData = false) {
  let savedState = structuredClone(seed);
  let savedMetadata = core.createMetadata(writer, existingData, core.recordsFromState(seed));
  let clock = 100;
  let conflicts = {};
  let status = "";
  let backups = 0;
  const engine = create({
    state: savedState,
    metadata: savedMetadata,
    transport,
    now: () => clock++,
    persist(state, metadata) { savedState = structuredClone(state); savedMetadata = structuredClone(metadata); },
    async createRecoveryBackup() { backups++; },
    validateState: state => state,
    onState() {},
    onPending() {},
    onConflicts(value) { conflicts = value; },
    onStatus(message) { status = message; },
    onError() {}
  });
  return {
    engine,
    edit(change) { const next = structuredClone(savedState); change(next); engine.saveLocal(next); },
    get state() { return savedState; },
    get meta() { return savedMetadata; },
    get status() { return status; },
    get conflicts() { return conflicts; },
    get backups() { return backups; }
  };
}

test("fresh devices merge independent offline edits without overwriting established cloud data", async () => {
  const server = cloud();
  const first = device(server, "a", initialState());
  await first.engine.run();
  const differentSeed = initialState();
  differentSeed.tasks[0].name = "Different default";
  const second = device(server, "b", differentSeed);
  await second.engine.run();
  assert.equal(second.state.tasks[0].name, "Water");
  server.setOnline(false);
  first.edit(state => { state.completions["2026-11-15"] = ["water"]; });
  second.edit(state => { state.journal.push({ id: "one", text: "hello", createdAt: "2026-11-15T00:00:00.000Z" }); });
  await first.engine.run();
  assert.match(first.status, /Offline/);
  assert.equal(Object.keys(first.meta.pending).length, 2);
  server.setOnline(true);
  await first.engine.run();
  await second.engine.run();
  await first.engine.run();
  assert.deepEqual(first.state.completions["2026-11-15"], ["water"]);
  assert.equal(first.state.journal[0].text, "hello");
  assert.equal(second.state.completions["2026-11-15"][0], "water");
  first.edit(state => { state.completions["2026-11-15"] = []; });
  await first.engine.run();
  await second.engine.run();
  assert.deepEqual(second.state.completions["2026-11-15"], []);
});

test("legacy conflicts stop until a choice, after a recovery copy is created", async () => {
  const server = cloud();
  const first = device(server, "a", initialState());
  await first.engine.run();
  const legacyState = initialState();
  legacyState.name = "Legacy";
  const second = device(server, "b", legacyState, true);
  await second.engine.run();
  assert.equal(second.backups, 1);
  assert.equal(second.conflicts['["name"]'].remote.value, "Alex");
  assert.equal(server.records['["name"]'].value, "Alex");
  second.engine.resolveConflict('["name"]', "local");
  await second.engine.run();
  assert.equal(server.records['["name"]'].value, "Legacy");
  assert.equal(second.state.name, "Legacy");
});

test("an edit made while a write is in flight stays queued and reaches the cloud", async () => {
  const server = cloud();
  const first = device(server, "a", initialState());
  await first.engine.run();
  let release;
  let started;
  const began = new Promise(resolve => { started = resolve; });
  const originalWrite = server.writeRecord;
  server.writeRecord = async (record, expected) => {
    if (record.record_key === '["name"]' && record.value === "First") {
      started();
      await new Promise(resolve => { release = resolve; });
    }
    return originalWrite.call(server, record, expected);
  };
  first.edit(state => { state.name = "First"; });
  const syncing = first.engine.run();
  await began;
  first.edit(state => { state.name = "Second"; });
  release();
  await syncing;
  assert.equal(first.state.name, "Second");
  assert.equal(server.records['["name"]'].value, "Second");
  assert.deepEqual(first.meta.pending, {});
});

test("invalid remote data does not acknowledge or replace pending local edits", async () => {
  const server = cloud();
  const first = device(server, "a", initialState());
  await first.engine.run();
  first.edit(state => { state.name = "Pending"; });
  server.records["bad"] = { record_key: "bad", client_time: 1, writer: "b", revision: 1, deleted: false, value: true };
  await first.engine.run();
  assert.equal(first.state.name, "Pending");
  assert.equal(first.meta.pending['["name"]'].value, "Pending");
  assert.match(first.status, /invalid key/);
});
