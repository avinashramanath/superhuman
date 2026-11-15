((root, factory) => {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SuperhumanSyncCore = factory();
})(globalThis, () => {
  "use strict";

  const key = (...parts) => JSON.stringify(parts);
  const canonicalJson = value => JSON.stringify(value, (_, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
  });
  const sameValue = (left, right) => canonicalJson(left) === canonicalJson(right);
  const validDateKey = date => /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

  function recordsFromState(state) {
    const records = {};
    for (const [position, task] of state.tasks.entries()) {
      records[key("task", task.id)] = { ...task, position };
    }
    for (const [date, ids] of Object.entries(state.completions)) {
      records[key("completion-day", date)] = true;
      for (const id of ids) records[key("completion", date, id)] = true;
    }
    for (const [date, ids] of Object.entries(state.routines)) {
      records[key("routine", date)] = ids;
    }
    for (const entry of state.journal) records[key("journal", entry.id)] = entry;
    for (const oath of state.oaths || []) records[key("oath", oath.date)] = oath;
    records[key("smoking")] = state.smoking;
    records[key("growth")] = state.growthPoints;
    records[key("name")] = state.name;
    return records;
  }

  function changesBetween(before, after, time, writer) {
    const changes = {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const recordKey of keys) {
      const exists = Object.prototype.hasOwnProperty.call(after, recordKey);
      if (exists && Object.prototype.hasOwnProperty.call(before, recordKey)
        && sameValue(before[recordKey], after[recordKey])) continue;
      changes[recordKey] = {
        record_key: recordKey,
        value: exists ? after[recordKey] : null,
        deleted: !exists,
        client_time: time,
        writer
      };
    }
    return changes;
  }

  function createMetadata(writer, existingData, values) {
    if (typeof writer !== "string" || !writer) throw new Error("A sync device identifier is required.");
    return {
      version: 1,
      writer,
      clock: 0,
      bootstrap: existingData ? "legacy" : "fresh",
      legacy: existingData ? structuredClone(values) : null,
      pending: {}
    };
  }

  function captureChanges(metadata, before, after, now) {
    if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(metadata.clock)) {
      throw new Error("The device clock is invalid. Changes were not queued.");
    }
    const time = Math.max(now, metadata.clock + 1);
    if (!Number.isSafeInteger(time)) throw new Error("The device clock is invalid. Changes were not queued.");
    const changes = changesBetween(before, after, time, metadata.writer);
    if (Object.keys(changes).length === 0) return metadata;
    return { ...metadata, clock: time, pending: { ...metadata.pending, ...changes } };
  }

  function mergePending(remoteRecords, pending) {
    const merged = { ...remoteRecords };
    for (const [recordKey, local] of Object.entries(pending)) {
      if (local.record_key !== recordKey) throw new Error("A pending sync record has an invalid key.");
      const remote = remoteRecords[recordKey];
      merged[recordKey] = recordKey === key("growth") && remote && !local.deleted && !remote.deleted
        ? (local.value > remote.value ? local : remote) : resolveRecord(local, remote);
    }
    return merged;
  }

  function validateRemoteRecords(records) {
    let latestTime = 0;
    for (const [recordKey, record] of Object.entries(records)) {
      if (!record || record.record_key !== recordKey || !Number.isSafeInteger(record.revision)
        || record.revision < 1 || !Number.isSafeInteger(record.client_time) || record.client_time < 0
        || typeof record.writer !== "string" || !record.writer || typeof record.deleted !== "boolean"
        || (record.deleted ? record.value !== null : record.value === null || record.value === undefined)) {
        throw new Error("The cloud sync response contains an invalid record.");
      }
      latestTime = Math.max(latestTime, record.client_time);
    }
    return latestTime;
  }

  function compareVersions(left, right) {
    for (const record of [left, right]) {
      if (!Number.isSafeInteger(record.client_time) || record.client_time < 0
        || typeof record.writer !== "string" || !record.writer) {
        throw new Error("A sync record has an invalid version.");
      }
    }
    if (left.client_time !== right.client_time) return left.client_time < right.client_time ? -1 : 1;
    return left.writer < right.writer ? -1 : left.writer > right.writer ? 1 : 0;
  }

  function resolveRecord(local, remote) {
    if (!local) return remote;
    if (!remote) return local;
    const comparison = compareVersions(local, remote);
    if (comparison === 0 && (local.deleted !== remote.deleted || !sameValue(local.value, remote.value))) {
      throw new Error("Two sync records have the same version but different data.");
    }
    return comparison > 0 ? local : remote;
  }

  async function pushRecord(local, remote, writeRecord) {
    let current = remote || null;
    for (let attempt = 0; attempt < 8; attempt++) {
      if (current && current.record_key !== local.record_key) {
        throw new Error("The sync service returned a different record.");
      }
      let candidate = local;
      if (current && local.record_key === key("growth") && !local.deleted && !current.deleted) {
        if (local.value <= current.value) return current;
        if (compareVersions(local, current) <= 0) {
          const time = current.client_time + 1;
          if (!Number.isSafeInteger(time)) throw new Error("The cloud sync clock is invalid.");
          candidate = { ...local, client_time: time };
        }
      } else if (current && resolveRecord(local, current) === current) {
        return current;
      }
      const response = await writeRecord(candidate, current ? current.revision : 0);
      if (!response || typeof response.applied !== "boolean" || !response.record
        || response.record.record_key !== local.record_key) {
        throw new Error("The sync service returned an invalid write response.");
      }
      validateRemoteRecords({ [local.record_key]: response.record });
      if (response.applied) {
        if (response.record.revision !== (current ? current.revision : 0) + 1
          || response.record.client_time !== candidate.client_time || response.record.writer !== candidate.writer
          || response.record.deleted !== candidate.deleted || !sameValue(response.record.value, candidate.value)) {
          throw new Error("The sync service returned an inconsistent write response.");
        }
        return response.record;
      }
      current = response.record;
    }
    throw new Error("This item changed repeatedly during sync. Try again.");
  }

  function planLegacyImport(localValues, remoteRecords) {
    const uploads = {};
    const conflicts = {};
    for (const [recordKey, value] of Object.entries(localValues)) {
      const remote = remoteRecords[recordKey];
      if (!remote) {
        uploads[recordKey] = value;
      } else if (remote.deleted || !sameValue(value, remote.value)) {
        conflicts[recordKey] = { local: value, remote };
      }
    }
    return { uploads, conflicts };
  }

  function stateFromRecords(records) {
    const state = { tasks: [], completions: {}, routines: {}, journal: [], oaths: [] };
    const singletons = new Set();
    for (const record of Object.values(records)) {
      let parts;
      try {
        parts = JSON.parse(record.record_key);
      } catch {
        throw new Error("A sync record has an invalid key.");
      }
      if (!Array.isArray(parts) || parts.some(part => typeof part !== "string")) {
        throw new Error("A sync record has an invalid key.");
      }
      const [type, id, subId] = parts;
      if (key(...parts) !== record.record_key || typeof record.deleted !== "boolean") {
        throw new Error("A sync record has an invalid format.");
      }
      if (record.deleted) continue;
      const value = record.value;
      if (type === "task" && parts.length === 2 && value && typeof value === "object"
        && !Array.isArray(value) && value.id === id && typeof value.name === "string"
        && Number.isInteger(value.position) && value.position >= 0) {
        state.tasks.push(value);
      } else if (type === "completion-day" && parts.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(id)
        && value === true) {
        if (!state.completions[id]) state.completions[id] = [];
      } else if (type === "completion" && parts.length === 3 && /^\d{4}-\d{2}-\d{2}$/.test(id)
        && subId && value === true) {
        if (!state.completions[id]) state.completions[id] = [];
        state.completions[id].push(subId);
      } else if (type === "routine" && parts.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(id)
        && Array.isArray(value) && value.every(item => typeof item === "string")) {
        state.routines[id] = value;
      } else if (type === "journal" && parts.length === 2 && value && typeof value === "object"
        && !Array.isArray(value) && value.id === id) {
        state.journal.push(value);
      } else if (type === "oath" && parts.length === 2 && validDateKey(id)
        && value && typeof value === "object" && !Array.isArray(value) && value.date === id
        && typeof value.text === "string" && value.text.trim().length > 0 && value.text.length <= 3000
        && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))) {
        state.oaths.push(value);
      } else if (parts.length === 1 && type === "smoking" && value && typeof value === "object" && !Array.isArray(value)) {
        state.smoking = value;
        singletons.add(type);
      } else if (parts.length === 1 && type === "growth" && Number.isFinite(value) && value >= 0) {
        state.growthPoints = value;
        singletons.add(type);
      } else if (parts.length === 1 && type === "name" && typeof value === "string") {
        state.name = value;
        singletons.add(type);
      } else {
        throw new Error("A sync record has invalid or unsupported data.");
      }
    }
    if (singletons.size !== 3 || state.tasks.length > 25) throw new Error("The sync data is incomplete or invalid.");
    state.tasks.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    state.tasks = state.tasks.map(({ position, ...task }) => task);
    for (const ids of Object.values(state.completions)) ids.sort();
    return state;
  }

  return {
    recordsFromState, changesBetween, createMetadata, captureChanges, mergePending, validateRemoteRecords,
    compareVersions, resolveRecord, pushRecord, planLegacyImport, stateFromRecords, validDateKey
  };
});
