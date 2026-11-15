"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { recordsFromState, changesBetween, createMetadata, captureChanges, mergePending, validateRemoteRecords, compareVersions, resolveRecord, pushRecord, planLegacyImport, stateFromRecords } = require("../sync-core.js");

function state() {
  return {
    tasks: [{ id: "water", name: "Water" }],
    completions: { "2026-11-15": ["water", "walk"] },
    routines: { "2026-11-15": ["water", "walk"] },
    journal: [{ id: "entry-1", text: "Hello" }],
    smoking: { startedAt: null },
    growthPoints: 5,
    name: "Alex"
  };
}

test("a completion removal creates a tombstone without changing other history", () => {
  const before = state();
  const after = structuredClone(before);
  after.completions["2026-11-15"] = ["walk"];
  const changes = changesBetween(recordsFromState(before), recordsFromState(after), 100, "device-a");
  assert.deepEqual(Object.keys(changes), ['["completion","2026-11-15","water"]']);
  assert.equal(changes['["completion","2026-11-15","water"]'].deleted, true);
  assert.equal(changes['["completion","2026-11-15","water"]'].value, null);
});

test("independent journal additions and edits become separate records", () => {
  const before = state();
  const after = structuredClone(before);
  after.journal[0].text = "Updated";
  after.journal.push({ id: "entry-2", text: "New" });
  const changes = changesBetween(recordsFromState(before), recordsFromState(after), 101, "device-a");
  assert.deepEqual(Object.keys(changes), ['["journal","entry-1"]', '["journal","entry-2"]']);
  assert.equal(changes['["journal","entry-1"]'].value.text, "Updated");
  assert.equal(changes['["journal","entry-2"]'].deleted, false);
});

test("daily oaths sync independently and round-trip alongside existing data", () => {
  const before = state();
  const after = structuredClone(before);
  after.oaths = [
    { date: "2026-11-15", text: "One day at a time", updatedAt: "2026-11-15T08:00:00Z" },
    { date: "2026-11-16", text: "Keep going", updatedAt: "2026-11-16T08:00:00Z" }
  ];
  const values = recordsFromState(after);
  const changes = changesBetween(recordsFromState(before), values, 101, "device-a");
  assert.deepEqual(Object.keys(changes), ['["oath","2026-11-15"]', '["oath","2026-11-16"]']);
  const records = Object.fromEntries(Object.entries(values).map(([record_key, value]) => [record_key, { record_key, value, deleted: false }]));
  assert.deepEqual(stateFromRecords(records).oaths, after.oaths);
  assert.deepEqual(stateFromRecords(records).journal, before.journal);
  const edited = structuredClone(after);
  edited.oaths[0].text = "A revised promise";
  assert.deepEqual(Object.keys(changesBetween(values, recordsFromState(edited), 102, "device-a")), ['["oath","2026-11-15"]']);
});

test("malformed oath records are rejected instead of replacing local data", () => {
  const values = recordsFromState(state());
  const records = Object.fromEntries(Object.entries(values).map(([record_key, value]) => [record_key, { record_key, value, deleted: false }]));
  const record_key = '["oath","2026-02-30"]';
  records[record_key] = { record_key, deleted: false, value: { date: "2026-02-30", text: "Promise", updatedAt: "2026-02-01T08:00:00Z" } };
  assert.throws(() => stateFromRecords(records), /invalid or unsupported/);
});

test("versions compare by edit time, then deterministically by device", () => {
  const earlier = { client_time: 10, writer: "b" };
  const later = { client_time: 11, writer: "a" };
  assert.equal(compareVersions(earlier, later), -1);
  assert.equal(compareVersions(later, earlier), 1);
  assert.equal(compareVersions(earlier, { client_time: 10, writer: "a" }), 1);
  assert.equal(compareVersions(earlier, { client_time: 10, writer: "b" }), 0);
  assert.throws(() => compareVersions(earlier, { client_time: "11", writer: "a" }), /invalid version/);
});

test("records reconstruct state and retain distinct completions and journal entries", () => {
  const original = state();
  const values = recordsFromState(original);
  const records = Object.fromEntries(Object.entries(values).map(([record_key, value]) =>
    [record_key, { record_key, value, deleted: false }]));
  const restored = stateFromRecords(records);
  assert.deepEqual(restored.tasks, original.tasks);
  assert.deepEqual(restored.completions["2026-11-15"].sort(), ["walk", "water"]);
  assert.deepEqual(restored.journal, original.journal);
  assert.deepEqual(restored.smoking, original.smoking);
});

test("routines larger than 25 tasks reconstruct without dropping tasks", () => {
  const original = state();
  original.tasks = Array.from({ length: 100 }, (_, i) => ({ id: `task-${i}`, name: `Task ${i}` }));
  const records = Object.fromEntries(Object.entries(recordsFromState(original)).map(([record_key, value]) =>
    [record_key, { record_key, value, deleted: false }]));
  const restored = stateFromRecords(records);
  assert.deepEqual(restored.tasks, original.tasks);
});

test("newer deletion wins and equal-version inconsistent records fail explicitly", () => {
  const saved = { client_time: 1, writer: "device", deleted: false, value: true };
  const deletion = { client_time: 2, writer: "device", deleted: true, value: null };
  assert.equal(resolveRecord(saved, deletion), deletion);
  assert.throws(() => resolveRecord(saved, { ...saved, value: false }), /same version/);
});

test("object key order from JSONB does not create false conflicts", () => {
  const local = { client_time: 1, writer: "a", deleted: false, value: { id: "x", name: "Y" } };
  const remote = { client_time: 1, writer: "a", deleted: false, value: { name: "Y", id: "x" } };
  assert.equal(resolveRecord(local, remote), remote);
  assert.deepEqual(planLegacyImport({ task: local.value }, { task: remote }).conflicts, {});
});

test("incomplete or malformed remote data is rejected instead of replacing local data", () => {
  assert.throws(() => stateFromRecords({}), /incomplete/);
  assert.throws(() => stateFromRecords({ bad: { record_key: "bad", deleted: false } }), /invalid key/);
});

test("a stale write retries without replacing a newer concurrent edit", async () => {
  const local = { record_key: '["name"]', client_time: 2, writer: "a", deleted: false, value: "Local" };
  const prior = { ...local, client_time: 1, value: "Old", revision: 1 };
  const concurrent = { ...local, client_time: 3, value: "Remote", revision: 2 };
  let calls = 0;
  const result = await pushRecord(local, prior, async (_, revision) => {
    calls++;
    assert.equal(revision, 1);
    return { applied: false, record: concurrent };
  });
  assert.equal(calls, 1);
  assert.equal(result.value, "Remote");
});

test("a newer local edit retries against the current remote revision", async () => {
  const local = { record_key: '["name"]', client_time: 3, writer: "a", deleted: false, value: "Local" };
  const prior = { ...local, client_time: 1, value: "Old", revision: 1 };
  const concurrent = { ...local, client_time: 2, value: "Remote", revision: 2 };
  const revisions = [];
  const result = await pushRecord(local, prior, async (_, revision) => {
    revisions.push(revision);
    return revision === 1
      ? { applied: false, record: concurrent }
      : { applied: true, record: { ...local, revision: 3 } };
  });
  assert.deepEqual(revisions, [1, 2]);
  assert.equal(result.value, "Local");
});

test("legacy data with unknown timestamps is merged only when it does not conflict", () => {
  const local = { '["name"]': "Alex", '["journal","1"]': { text: "local" }, '["journal","2"]': { text: "new" } };
  const remote = {
    '["name"]': { value: "Alex", deleted: false },
    '["journal","1"]': { value: { text: "cloud" }, deleted: false },
    '["journal","3"]': { value: { text: "another" }, deleted: false }
  };
  const plan = planLegacyImport(local, remote);
  assert.deepEqual(Object.keys(plan.uploads), ['["journal","2"]']);
  assert.deepEqual(Object.keys(plan.conflicts), ['["journal","1"]']);
  assert.equal(plan.conflicts['["journal","1"]'].local.text, "local");
  assert.equal(plan.conflicts['["journal","1"]'].remote.value.text, "cloud");
});

test("a remote tombstone conflicts with an existing legacy value", () => {
  const local = { '["completion","2026-11-15","water"]': true };
  const remote = { '["completion","2026-11-15","water"]': { value: null, deleted: true } };
  const plan = planLegacyImport(local, remote);
  assert.deepEqual(Object.keys(plan.conflicts), Object.keys(local));
  assert.deepEqual(plan.uploads, {});
});

test("pending changes persist separately and get monotonic device versions", () => {
  const before = recordsFromState(state());
  const metadata = createMetadata("device", true, before);
  const after = { ...before, '["name"]': "First" };
  const first = captureChanges(metadata, before, after, 100);
  const second = captureChanges(first, after, { ...after, '["name"]': "Second" }, 100);
  assert.equal(first.pending['["name"]'].client_time, 100);
  assert.equal(second.pending['["name"]'].client_time, 101);
  assert.equal(metadata.pending['["name"]'], undefined);
  assert.equal(metadata.legacy['["name"]'], "Alex");
});

test("merging a pending edit does not drop unrelated remote records", () => {
  const local = { record_key: '["name"]', client_time: 2, writer: "a", deleted: false, value: "Local" };
  const remote = {
    '["name"]': { ...local, client_time: 1, value: "Old" },
    '["journal","1"]': { record_key: '["journal","1"]', client_time: 1, writer: "b", deleted: false, value: {} }
  };
  const result = mergePending(remote, { '["name"]': local });
  assert.equal(result['["name"]'].value, "Local");
  assert.equal(result['["journal","1"]'], remote['["journal","1"]']);
});

test("lifetime growth never decreases when a later device has a lower score", async () => {
  const local = { record_key: '["growth"]', client_time: 5, writer: "a", deleted: false, value: 100 };
  const remote = { ...local, client_time: 10, value: 50, revision: 1 };
  assert.equal(mergePending({ '["growth"]': remote }, { '["growth"]': local })['["growth"]'].value, 100);
  let written;
  const result = await pushRecord(local, remote, async (record, revision) => {
    written = record;
    return { applied: true, record: { ...record, revision: revision + 1 } };
  });

  assert.equal(result.value, 100);
  assert.equal(written.client_time, 11);
  const lower = { ...local, value: 20, client_time: 20 };
  assert.equal(mergePending({ '["growth"]': result }, { '["growth"]': lower })['["growth"]'].value, 100);
  assert.equal(await pushRecord(lower, result, async () => { throw new Error("must not write"); }), result);
});

test("remote record envelopes are validated before they affect the local clock", () => {
  const record = { record_key: "x", value: true, deleted: false, writer: "a", client_time: 12, revision: 1 };
  assert.equal(validateRemoteRecords({ x: record }), 12);
  assert.throws(() => validateRemoteRecords({ x: { ...record, client_time: "12" } }), /invalid record/);
  assert.throws(() => validateRemoteRecords({ x: { ...record, revision: 0 } }), /invalid record/);
});

test("a write is not acknowledged when the service returns inconsistent or invalid data", async () => {
  const local = { record_key: '["name"]', client_time: 2, writer: "a", deleted: false, value: "Local" };
  await assert.rejects(pushRecord(local, null, async () => ({
    applied: true, record: { ...local, value: "Other", revision: 1 }
  })), /inconsistent write response/);
  await assert.rejects(pushRecord(local, null, async () => ({
    applied: false, record: { ...local, client_time: "2", revision: 1 }
  })), /invalid record/);
});
