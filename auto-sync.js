((root, factory) => {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./sync-core.js"));
  else root.SuperhumanAutoSync = factory(root.SuperhumanSyncCore);
})(globalThis, core => {
  "use strict";

  function create(options) {
    let current = structuredClone(options.state);
    let metadata = structuredClone(options.metadata);
    let savedValues = core.recordsFromState(current);
    let generation = 0;
    let running = false;
    let rerun = false;
    let conflicts = {};

    function persist(nextState, nextMetadata) {
      options.persist(nextState, nextMetadata);
      current = structuredClone(nextState);
      metadata = nextMetadata;
      savedValues = core.recordsFromState(current);
    }

    function saveLocal(nextState, trackChanges = true) {
      const values = core.recordsFromState(nextState);
      let nextMetadata = trackChanges
        ? core.captureChanges(metadata, savedValues, values, options.now())
        : metadata;
      if (!trackChanges && metadata.bootstrap === "legacy" && !metadata.backupComplete) {
        nextMetadata = { ...metadata, legacy: structuredClone(values) };
      }
      const changed = trackChanges && nextMetadata !== metadata;
      persist(nextState, nextMetadata);
      if (changed) {
        generation++;
        if (running) rerun = true;
        options.onPending();
      }
    }

    function replaceFromStorage(nextState, nextMetadata) {
      current = structuredClone(nextState);
      metadata = structuredClone(nextMetadata);
      savedValues = core.recordsFromState(current);
      generation++;
      if (running) rerun = true;
    }

    function stageValues(values, skipPending = true, minimumTime = 0) {
      const next = structuredClone(metadata);
      for (const [recordKey, value] of Object.entries(values)) {
        if (skipPending && next.pending[recordKey]) continue;
        const time = Math.max(options.now(), next.clock + 1, minimumTime);
        if (!Number.isSafeInteger(time)) throw new Error("The sync clock is invalid.");
        next.clock = time;
        next.pending[recordKey] = {
          record_key: recordKey, value: structuredClone(value), deleted: false,
          client_time: time, writer: next.writer
        };
      }
      return next;
    }

    async function bootstrap(remote) {
      if (metadata.bootstrap === "ready") return true;
      if (metadata.bootstrap === "legacy" && !metadata.backupComplete) {
        await options.createRecoveryBackup();
        persist(current, { ...metadata, backupComplete: true });
      }

      if (metadata.bootstrap === "fresh") {
        const next = Object.keys(remote).length === 0 ? stageValues(savedValues) : structuredClone(metadata);
        next.bootstrap = "ready";
        next.legacy = null;
        persist(current, next);
        return true;
      }

      if (metadata.bootstrap !== "legacy" || !metadata.legacy) {
        throw new Error("The saved sync setup is invalid. Local data was not changed.");
      }
      const plan = core.planLegacyImport(metadata.legacy, remote);
      conflicts = {};
      for (const [recordKey, conflict] of Object.entries(plan.conflicts)) {
        if (!metadata.pending[recordKey]) conflicts[recordKey] = conflict;
      }
      if (Object.keys(conflicts).length) {
        options.onConflicts(conflicts);
        options.onStatus("Open Sync to resolve older data conflicts.", true);
        return false;
      }
      const next = stageValues(plan.uploads);
      next.bootstrap = "ready";
      next.legacy = null;
      persist(current, next);
      options.onConflicts({});
      return true;
    }

    function resolveConflict(recordKey, choice) {
      const conflict = conflicts[recordKey];
      if (!conflict || (choice !== "local" && choice !== "remote")) {
        throw new Error("That sync conflict is no longer available.");
      }
      const next = structuredClone(metadata);
      if (choice === "local") {
        const minimum = conflict.remote.client_time + 1;
        if (!Number.isSafeInteger(minimum)) throw new Error("The cloud record has an invalid timestamp.");
        const staged = stageValues({ [recordKey]: conflict.local }, false, minimum);
        next.clock = staged.clock;
        next.pending = staged.pending;
      }
      delete next.legacy[recordKey];
      persist(current, next);
      delete conflicts[recordKey];
      options.onConflicts(conflicts);
      options.onPending();
    }

    async function syncOnce() {
      options.onStatus("Syncing…", false);
      let remote = await options.transport.readRecords();
      const observedTime = core.validateRemoteRecords(remote);
      if (!await bootstrap(remote)) return;
      options.validateState(core.stateFromRecords(core.mergePending(remote, metadata.pending)));
      if (observedTime > metadata.clock) persist(current, { ...metadata, clock: observedTime });
      for (const [recordKey, pending] of Object.entries(metadata.pending)) {
        const saved = await core.pushRecord(pending, remote[recordKey], options.transport.writeRecord);
        remote[recordKey] = saved;
        const latest = metadata.pending[recordKey];
        const acknowledged = latest && latest.client_time === pending.client_time && latest.writer === pending.writer;
        if (acknowledged || saved.client_time > metadata.clock) {
          const next = structuredClone(metadata);
          if (acknowledged) delete next.pending[recordKey];
          next.clock = Math.max(next.clock, saved.client_time);
          persist(current, next);
        }
      }
      remote = await options.transport.readRecords();
      const latestTime = core.validateRemoteRecords(remote);
      const version = generation;
      const merged = core.mergePending(remote, metadata.pending);
      const nextState = options.validateState(core.stateFromRecords(merged));
      if (generation !== version) {
        rerun = true;
        return;
      }
      if (current.reordering) nextState.reordering = current.reordering;
      persist(nextState, { ...metadata, clock: Math.max(metadata.clock, latestTime) });
      options.onState(structuredClone(nextState));
      options.onConflicts({});
      options.onStatus(Object.keys(metadata.pending).length ? "Changes are waiting to sync." : "All changes synced.", false);
    }

    async function run() {
      if (running) {
        rerun = true;
        return;
      }
      running = true;
      try {
        do {
          rerun = false;
          await syncOnce();
        } while (rerun);
      } catch (error) {
        options.onError(error);
        options.onStatus(error instanceof Error ? error.message : "Cloud sync failed.", true);
      } finally {
        running = false;
      }
    }

    return { saveLocal, replaceFromStorage, resolveConflict, run };
  }

  return { create };
});
