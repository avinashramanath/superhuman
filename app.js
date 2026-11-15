(() => {
  "use strict";

  const STORAGE_KEY = "superhuman-routine-v1";
  const SUPABASE_URL = "https://txvlnkclbbyhsymarzqn.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uVxOvQrzACpa8Ug9Sm4n3w_K5llUi7Y";
  const RECOVERY_KEY = "superhuman-pre-sync-recovery-v1";
  const SYNC_ENDPOINT = `${SUPABASE_URL}/functions/v1/superhuman-sync`;
  const SYNC_MAX_PLAINTEXT_BYTES = 2.75 * 1024 * 1024;
  const MAX_TASKS = 25;
  const ICONS = [
    "💧", "🫧", "🌊", "🧘", "🪷", "🧠", "📖", "✍️", "🎧", "🎨",
    "🏃", "🚴", "🏋️", "🧗", "🕺", "🥗", "🍎", "🍵", "🌿", "🌱",
    "☀️", "🌙", "⭐", "✨", "💫", "🔥", "⚡", "🔮", "💎", "🪐",
    "🛏️", "🧹", "🪴", "🧺", "🧼", "🪥", "💊", "🩺", "🧴", "🚶",
    "🐕", "🐈", "📵", "💻", "📝", "💰", "🙏", "💌", "🎯", "🛁",
    "🌈", "🧩", "☕", "🫶", "🌻", "🏊", "🛒", "📦", "🕯️", "🎲"
  ];
  const SEED_TASKS = [
    { id: "water", name: "Drink a glass of water", group: "Morning", icon: "💧" },
    { id: "stretch", name: "Stretch for five minutes", group: "Mind & body", icon: "🧘" },
    { id: "read", name: "Read a few pages", group: "Mind & body", icon: "📖" },
    { id: "walk", name: "Get outside for a walk", group: "Move", icon: "🏃" },
    { id: "reset", name: "Reset your space", group: "Home", icon: "🌿" }
  ];
  const BADGES = [
    ...[
      [1, "First signal", "Log your first completed task", "🌱"],
      [5, "Finding rhythm", "Complete 5 routine tasks", "🎵"],
      [10, "Double digits", "Complete 10 routine tasks", "✨"],
      [25, "Quarter century", "Complete 25 routine tasks", "🌟"],
      [50, "Momentum maker", "Complete 50 routine tasks", "⚡"],
      [100, "Century club", "Complete 100 routine tasks", "💎"],
      [250, "Built different", "Complete 250 routine tasks", "🔥"],
      [500, "Half a thousand", "Complete 500 routine tasks", "🌠"],
      [1000, "A thousand moments", "Complete 1,000 routine tasks", "🏆"],
      [2500, "Lightkeeper", "Complete 2,500 routine tasks", "🕯️"]
    ].map(([count, title, copy, icon]) => ({
      id: `tasks-${count}`, title, copy, icon, test: s => totalCompletions(s) >= count
    })),
    ...[
      [1, "First full orbit", "Complete every task in one day", "☀️"],
      [7, "Seven days, showing up", "Complete 7 full routine days", "🌈"],
      [21, "Three-week rhythm", "Complete 21 full routine days", "🪐"],
      [50, "Steady current", "Complete 50 full routine days", "🌊"],
      [100, "A hundred mornings", "Complete 100 full routine days", "🌌"],
      [250, "A season of showing up", "Complete 250 full routine days", "🍂"],
      [365, "A year of your own", "Complete 365 full routine days", "☀️"]
    ].map(([count, title, copy, icon]) => ({
      id: `days-${count}`, title, copy, icon, test: s => fullDays(s) >= count
    })),
    ...[
      [2, "Two-day spark", "Build a 2-day full-routine streak", "✨"],
      [3, "Three in a row", "Build a 3-day full-routine streak", "🔥"],
      [5, "On the current", "Build a 5-day full-routine streak", "🌊"],
      [7, "One-week wonder", "Build a 7-day full-routine streak", "🏅"],
      [10, "Double-digit streak", "Build a 10-day full-routine streak", "⚡"],
      [14, "Two-week orbit", "Build a 14-day full-routine streak", "🛰️"],
      [21, "Superhuman", "Build a 21-day full-routine streak", "👑"],
      [30, "Unstoppable", "Build a 30-day full-routine streak", "💫"],
      [50, "Half-century hero", "Build a 50-day full-routine streak", "💎"],
      [60, "Two months of trust", "Build a 60-day full-routine streak", "🌙"],
      [75, "Steady as sunrise", "Build a 75-day full-routine streak", "🌅"],
      [90, "A season in motion", "Build a 90-day full-routine streak", "🧭"],
      [100, "Centennial", "Build a 100-day full-routine streak", "🌌"],
      [150, "A hundred and fifty", "Build a 150-day full-routine streak", "🪷"],
      [200, "Two hundred strong", "Build a 200-day full-routine streak", "🦋"],
      [365, "Year of momentum", "Build a 365-day full-routine streak", "👑"]
    ].map(([count, title, copy, icon]) => ({
      id: `streak-${count}`, title, copy, icon, test: s => bestStreak(s) >= count
    }))
  ];
  const QUIT_MILESTONES = [
    { afterMs: 20 * 60000, title: "A gentler heartbeat", label: "20 minutes", copy: "Your pulse and blood pressure begin returning toward normal.", icon: "💓" },
    { afterMs: 8 * 3600000, title: "More oxygen", label: "8 hours", copy: "Oxygen levels can return toward normal as carbon monoxide falls.", icon: "🌬️" },
    { afterMs: 12 * 3600000, title: "A clearer breath", label: "12 hours", copy: "Carbon monoxide levels in your blood continue to drop.", icon: "🫁" },
    { afterMs: 2 * 86400000, title: "Senses waking up", label: "2 days", copy: "Taste and smell can begin to improve.", icon: "🌼" },
    { afterMs: 30.4375 * 86400000, title: "A brighter current", label: "1–3 months", copy: "Circulation and energy levels can improve.", icon: "🌱" },
    { afterMs: 9 * 30.4375 * 86400000, title: "Room to breathe", label: "1–9 months", copy: "Coughing and shortness of breath can decrease.", icon: "🕊️" },
    { afterMs: 365.25 * 86400000, title: "A year of care", label: "1 year", copy: "Coronary heart disease risk is about half that of someone who continues to smoke.", icon: "❤️" },
    { afterMs: 5 * 365.25 * 86400000, title: "Five years forward", label: "5 years", copy: "The risk of some smoking-related cancers can fall over time.", icon: "🌅" },
    { afterMs: 10 * 365.25 * 86400000, title: "A decade of change", label: "10 years", copy: "Lung cancer death risk can be about half that of someone who continues to smoke.", icon: "🌄" },
    { afterMs: 15 * 365.25 * 86400000, title: "A lasting horizon", label: "15 years", copy: "Coronary heart disease risk can approach that of someone who never smoked.", icon: "🌈" }
  ];
  const QUIT_BADGES = [
    [3600000, "First Light", "Reach your first smoke-free hour", "✨"],
    [86400000, "First Sunrise", "Reach 1 smoke-free day", "🌅"],
    [5 * 86400000, "Clear Senses", "Reach 5 smoke-free days", "🌼"],
    [10 * 86400000, "Open Air", "Reach 10 smoke-free days", "🕊️"],
    [30 * 86400000, "A Month of Possibility", "Reach 30 smoke-free days", "🦋"],
    [60 * 86400000, "New Rhythm", "Reach 60 smoke-free days", "🌿"],
    [120 * 86400000, "Clear Horizon", "Reach 120 smoke-free days", "🌄"],
    [240 * 86400000, "A Brighter Season", "Reach 240 smoke-free days", "🌷"],
    [2 * 365.25 * 86400000, "Two Years, Yours", "Reach 2 smoke-free years", "💛"],
    [6 * 365.25 * 86400000, "Renewed Horizon", "Reach 6 smoke-free years", "🌠"],
    [11 * 365.25 * 86400000, "The Long View", "Reach 11 smoke-free years", "💎"],
    [16 * 365.25 * 86400000, "Lasting Freedom", "Reach 16 smoke-free years", "👑"]
  ].map(([afterMs, title, copy, icon]) => ({ afterMs, title, copy, icon }));
  const EVOLUTION_STAGES = [
    { title: "A new signal" },
    { title: "Ignition" },
    { title: "Signal found" },
    { title: "In orbit" },
    { title: "Radiant" },
    { title: "Superhuman" }
  ];

  const $ = id => document.getElementById(id);
  let appInitialized = false;
  let state = loadState();
  let autoSync = null;
  let autoSyncTimer = null;
  let storageBlocked = false;
  let selectedIcon = ICONS[0];
  let editingId = null;
  let toastTimer = null;
  let deferredInstall = null;
  let cravingInterval = null;
  let journalEditingId = null;
  let journalSelectedMood = "steady";
  let journalDeleteId = null;
  const JOURNAL_MOODS = {
    steady: ["◉", "Steady"],
    hopeful: ["✦", "Hopeful"],
    proud: ["↗", "Proud"],
    tender: ["☾", "Tender"],
    heavy: ["·", "Heavy"],
    calm: ["〰", "Calm"],
    joyful: ["☀", "Joyful"],
    anxious: ["〽", "Anxious"],
    tired: ["☁", "Tired"],
    grateful: ["♡", "Grateful"],
    frustrated: ["⌁", "Frustrated"],
    curious: ["✧", "Curious"]
  };

  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const normalized = normalizeStoredState(saved);
      if (normalized) return normalized;
    } catch (error) {
      console.error("Could not read the saved routine.", error);
    }
    return { tasks: SEED_TASKS.map(task => ({ ...task })), completions: {}, routines: {}, smoking: normalizeSmoking(), growthPoints: 0, journal: [], name: "Alex" };
  }

  function normalizeStoredState(saved) {
    if (!isRecord(saved) || !Array.isArray(saved.tasks) || !isRecord(saved.completions)) return null;
    if (saved.tasks.length > MAX_TASKS
      || saved.tasks.some(task => !isRecord(task) || typeof task.id !== "string" || typeof task.name !== "string")
      || (saved.routines !== undefined && !isRecord(saved.routines))
      || (saved.journal !== undefined && (!Array.isArray(saved.journal) || saved.journal.some(entry =>
        !isRecord(entry) || typeof entry.id !== "string" || typeof entry.createdAt !== "string"
        || typeof entry.text !== "string")))
      || (saved.growthPoints !== undefined && (!Number.isFinite(saved.growthPoints) || saved.growthPoints < 0))
      || (saved.name !== undefined && typeof saved.name !== "string")) return null;
    return {
      tasks: saved.tasks,
      completions: saved.completions,
      routines: isRecord(saved.routines) ? saved.routines : {},
      smoking: normalizeSmoking(saved.smoking),
      growthPoints: Number.isFinite(saved.growthPoints) && saved.growthPoints >= 0 ? saved.growthPoints : 0,
      journal: (saved.journal || []).map(({ photoKey, ...entry }) => entry),
      name: typeof saved.name === "string" ? saved.name : "Alex"
    };
  }

  function normalizeSmoking(value) {
    const smoke = value && typeof value === "object" ? value : {};
    return {
      startedAt: typeof smoke.startedAt === "string" && Number.isFinite(Date.parse(smoke.startedAt)) ? smoke.startedAt : null,
      cigarettesPerDay: Number.isFinite(smoke.cigarettesPerDay) && smoke.cigarettesPerDay > 0 ? smoke.cigarettesPerDay : null,
      packPrice: Number.isFinite(smoke.packPrice) && smoke.packPrice > 0 ? smoke.packPrice : null,
      cigarettesPerPack: Number.isFinite(smoke.cigarettesPerPack) && smoke.cigarettesPerPack > 0 ? smoke.cigarettesPerPack : 20,
      lapses: Array.isArray(smoke.lapses) ? smoke.lapses.filter(item => typeof item === "string" && Number.isFinite(Date.parse(item))).sort() : [],
      bestRunMs: Number.isFinite(smoke.bestRunMs) && smoke.bestRunMs > 0 ? smoke.bestRunMs : 0
    };
  }

  function save() {
    if (storageBlocked) {
      showToast("Saved data needs attention; changes were not saved.");
      return false;
    }
    try {
      if (autoSync) autoSync.saveLocal(state, appInitialized);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("Could not save your routine.", error);
      showToast("Couldn't save changes on this device.");
      return false;
    }
  }

  async function createLocalRecoveryBackup() {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(state));
  }

  async function restoreLocalRecovery() {
    const backup = localStorage.getItem(RECOVERY_KEY);
    if (!backup) throw new Error("No pre-sync recovery copy exists on this device.");
    let restored;
    try {
      restored = validateSyncedState(JSON.parse(backup));
    } catch (error) {
      console.error("Could not read the local recovery copy.", error);
      throw new Error("The pre-sync recovery copy is invalid; nothing was restored.");
    }
    const previous = state;
    state = restored;
    if (!save()) {
      state = previous;
      throw new Error("The recovery copy could not be saved on this device.");
    }
    render();
  }

  function validSyncMetadata(value) {
    if (!isRecord(value) || value.version !== 1
      || typeof value.writer !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.writer)
      || !Number.isSafeInteger(value.clock) || value.clock < 0
      || !["fresh", "legacy", "ready"].includes(value.bootstrap)
      || !isRecord(value.pending)
      || (value.bootstrap === "legacy" && !isRecord(value.legacy))) return false;
    return Object.entries(value.pending).every(([key, record]) =>
      isRecord(record) && record.record_key === key && record.writer === value.writer
      && Number.isSafeInteger(record.client_time) && record.client_time >= 0
      && typeof record.deleted === "boolean"
      && (record.deleted ? record.value === null : record.value !== undefined && record.value !== null));
  }

  function setAutoSyncStatus(message, isError = false) {
    $("auto-sync-status").textContent = message;
    $("auto-sync-status").dataset.error = String(isError);
    $("auto-sync-status").hidden = !isError;
  }

  function scheduleAutoSync(delay = 1500) {
    if (!autoSync) return;
    clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(() => autoSync.run(), delay);
  }

  function initializeAutoSync() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw === null ? null : JSON.parse(raw);
      if (raw !== null && !normalizeStoredState(saved)) {
        throw new Error("Saved local data is invalid. No changes were made.");
      }
      if (saved) validateSyncedState(normalizeStoredState(saved));
      let metadata = saved && saved._sync;
      if (saved && Object.prototype.hasOwnProperty.call(saved, "_sync") && !validSyncMetadata(metadata)) {
        throw new Error("Saved sync data is invalid. No changes were made.");
      }
      if (!metadata) metadata = SuperhumanSyncCore.createMetadata(crypto.randomUUID(), saved !== null, SuperhumanSyncCore.recordsFromState(state));
      const transport = SuperhumanSyncTransport.createTransport(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
      autoSync = SuperhumanAutoSync.create({
        state,
        metadata,
        transport,
        now: () => Date.now(),
        persist: (nextState, nextMetadata) => localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...nextState, _sync: nextMetadata })),
        createRecoveryBackup: createLocalRecoveryBackup,
        validateState: validateSyncedState,
        onState: nextState => { state = nextState; render(); },
        onPending: () => {
          setAutoSyncStatus("Changes are waiting to sync.");
          scheduleAutoSync();
        },
        onStatus: setAutoSyncStatus,
        onError: error => console.error("Automatic sync failed.", error)
      });
    } catch (error) {
      storageBlocked = true;
      console.error("Could not safely initialize automatic sync.", error);
      setAutoSyncStatus(error instanceof Error ? error.message : "Could not initialize automatic sync.", true);
    }
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
      throw new Error("The encrypted backup contains invalid data.");
    }
    const padded = value + "=".repeat((4 - value.length % 4) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function setSyncStatus(message, isError = false) {
    $("sync-status").textContent = message;
    $("sync-status").dataset.error = String(isError);
  }

  function syncCodeIsValid(code = $("sync-code").value.trim()) {
    return /^[A-Za-z0-9_-]{43}$/.test(code);
  }

  function updateSyncControls() {
    const busy = $("sync-dialog").dataset.busy === "true";
    const valid = syncCodeIsValid();
    $("copy-sync-code").disabled = !valid || busy;
    $("upload-sync").disabled = !valid || busy;
    $("restore-sync").disabled = !valid || busy;
    $("delete-sync").disabled = !valid || busy;
    $("generate-sync-code").disabled = busy;
  }

  async function deriveSyncCredentials() {
    if (!syncCodeIsValid()) throw new Error("Enter a valid 43-character sync code, or generate one here.");
    if (!crypto?.subtle) throw new Error("This browser does not support secure encrypted sync.");

    const code = $("sync-code").value.trim();
    const raw = base64ToBytes(code.replace(/-/g, "+").replace(/_/g, "/"));
    if (raw.length !== 32) throw new Error("The sync code is invalid.");
    const material = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveBits"]);
    raw.fill(0);
    const derived = new Uint8Array(await crypto.subtle.deriveBits({
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode("superhuman-sync-v1"),
      info: new TextEncoder().encode("Superhuman private sync")
    }, material, 512));
    const encryptionKey = await crypto.subtle.importKey(
      "raw",
      derived.slice(0, 32),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    const identifierDigest = await crypto.subtle.digest("SHA-256", derived.slice(32));
    const syncId = [...new Uint8Array(identifierDigest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
    derived.fill(0);
    return { encryptionKey, syncId };
  }

  async function requestSync(action, credentials, encryptedBlob) {
    const body = { action, syncId: credentials.syncId };
    if (encryptedBlob) body.encryptedBlob = encryptedBlob;
    const response = await fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body)
    });
    let result;
    try {
      result = await response.json();
    } catch (error) {
      console.error("The private sync service returned an unreadable response.", error);
      throw new Error("The private sync service returned an unreadable response. Try again.");
    }
    if (!response.ok) {
      throw new Error(typeof result.error === "string" ? result.error : `Sync failed (${response.status}). Try again.`);
    }
    return result;
  }

  async function createBackupDocument() {
    return { version: 2, state: structuredClone(state) };
  }

  async function createEncryptedBackup(encryptionKey) {
    const plaintext = new TextEncoder().encode(JSON.stringify(await createBackupDocument()));
    if (plaintext.byteLength > SYNC_MAX_PLAINTEXT_BYTES) {
      throw new Error("This backup is too large to sync in one encrypted transfer. Use the independent file backup instead.");
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encryptionKey, plaintext);
    return { v: 1, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
  }

  async function decryptBackup(encryptedBlob, encryptionKey) {
    if (!encryptedBlob || encryptedBlob.v !== 1 || typeof encryptedBlob.iv !== "string" || typeof encryptedBlob.ciphertext !== "string") {
      throw new Error("The cloud backup has an unsupported format.");
    }
    const iv = base64ToBytes(encryptedBlob.iv);
    const ciphertext = base64ToBytes(encryptedBlob.ciphertext);
    if (iv.length !== 12 || ciphertext.length > SYNC_MAX_PLAINTEXT_BYTES + 16) {
      throw new Error("The cloud backup is invalid or too large.");
    }

    let plaintext;
    try {
      plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, encryptionKey, ciphertext);
    } catch (error) {
      console.error("The cloud backup could not be decrypted with this sync code.", error);
      throw new Error("This backup could not be decrypted. Check that you entered the original sync code.");
    }
    let document;
    try {
      document = JSON.parse(new TextDecoder().decode(plaintext));
    } catch (error) {
      console.error("The decrypted sync backup is not valid JSON.", error);
      throw new Error("The decrypted backup is damaged and was not restored.");
    }
    if (!isRecord(document) || ![1, 2].includes(document.version) || !isRecord(document.state)) {
      throw new Error("The cloud backup has an unsupported format.");
    }
    return document;
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function validateSyncedState(value) {
    if (!isRecord(value) || !Array.isArray(value.tasks) || value.tasks.length > MAX_TASKS
      || !isRecord(value.completions) || !isRecord(value.routines) || !Array.isArray(value.journal)
) {
      throw new Error("The backup data is incomplete or invalid; nothing was restored.");
    }
    if (value.tasks.some(task => !isRecord(task) || typeof task.id !== "string" || typeof task.name !== "string")) {
      throw new Error("The backup contains an invalid routine task; nothing was restored.");
    }
    for (const [date, completed] of Object.entries(value.completions)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(completed) || completed.some(id => typeof id !== "string")) {
        throw new Error("The backup contains invalid completion history; nothing was restored.");
      }
    }
    for (const [date, routine] of Object.entries(value.routines)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(routine) || routine.some(id => typeof id !== "string")) {
        throw new Error("The backup contains invalid routine history; nothing was restored.");
      }
    }
    if (value.journal.some(entry => !isRecord(entry)
      || typeof entry.id !== "string"
      || typeof entry.createdAt !== "string"
      || !Number.isFinite(Date.parse(entry.createdAt))
      || typeof entry.text !== "string")) {
      throw new Error("The backup contains an invalid journal entry; nothing was restored.");
    }
    return {
      tasks: value.tasks.map(task => ({ ...task })).slice(0, MAX_TASKS),
      completions: value.completions,
      routines: value.routines,
      smoking: normalizeSmoking(value.smoking),
      growthPoints: Number.isFinite(value.growthPoints) && value.growthPoints >= 0 ? value.growthPoints : 0,
      journal: value.journal.map(({ photoKey, ...entry }) => entry),
      name: typeof value.name === "string" ? value.name : "Alex"
    };
  }

  async function restoreEncryptedBackup(document) {
    const nextState = validateSyncedState(document.state);
    const previousState = state;
    state = nextState;
    if (!save()) {
      state = previousState;
      throw new Error("The backup could not be saved on this device. Free some browser storage and try again.");
    }
    render();
  }

  async function runSyncOperation(operation) {
    if ($("sync-dialog").dataset.busy === "true") return;
    $("sync-dialog").dataset.busy = "true";
    updateSyncControls();
    try {
      await operation();
    } catch (error) {
      console.error("Private sync failed.", error);
      setSyncStatus(error instanceof Error ? error.message : "Private sync failed. Try again.", true);
    } finally {
      $("sync-dialog").dataset.busy = "false";
      updateSyncControls();
    }
  }

  function formattedSyncTime(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
      : "just now";
  }

  function completionFor(dateKey) {
    return Array.isArray(state.completions[dateKey]) ? state.completions[dateKey] : [];
  }

  function totalCompletions(s) {
    return Object.values(s.completions).reduce((sum, completed) => sum + (Array.isArray(completed) ? completed.length : 0), 0);
  }

  function fullDays(s) {
    return Object.entries(s.completions).filter(([date, completed]) => {
      const routine = s.routines?.[date] || s.tasks.map(task => task.id);
      return routine.length > 0 && routine.every(id => completed.includes(id));
    }).length;
  }

  function smokeTimerOrigin(s) {
    const smoking = s.smoking || normalizeSmoking();
    return smoking.lapses.length ? smoking.lapses[smoking.lapses.length - 1] : smoking.startedAt;
  }

  function currentSmokeRunMs(s, now = Date.now()) {
    const origin = smokeTimerOrigin(s);
    return origin ? Math.max(0, now - Date.parse(origin)) : 0;
  }

  function smokeBestRunMs(s) {
    return Math.max(s.smoking?.bestRunMs || 0, currentSmokeRunMs(s));
  }

  function growthScore(s) {
    return Math.max(s.growthPoints || 0, totalCompletions(s) + fullDays(s) * 3 + bestStreak(s) * 2);
  }

  function isFullDay(s, date) {
    const routine = s.routines?.[date] || s.tasks.map(task => task.id);
    return routine.length > 0 && routine.every(id => (s.completions[date] || []).includes(id));
  }

  function streakAt(s, today = localDateKey()) {
    let cursor = new Date(`${today}T12:00:00`);
    const todayComplete = isFullDay(s, localDateKey(cursor));
    if (!todayComplete) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (isFullDay(s, localDateKey(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function bestStreak(s) {
    const dates = Object.keys(s.completions).sort();
    let best = 0;
    let current = 0;
    let previous = null;
    for (const key of dates) {
      const date = new Date(`${key}T12:00:00`);
      const routine = s.routines?.[key] || s.tasks.map(task => task.id);
      const complete = routine.length > 0 && routine.every(id => (s.completions[key] || []).includes(id));
      if (!complete) { current = 0; previous = date; continue; }
      if (previous) {
        const difference = Math.round((date - previous) / 86400000);
        current = difference === 1 ? current + 1 : 1;
      } else current = 1;
      best = Math.max(best, current);
      previous = date;
    }
    return best;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function render() {
    renderDate();
    renderRoutine();
    renderEvolution();
    renderBetterStats();
    renderHistory();
    renderBadges();
    renderSmoking();
    renderJournal();
  }

  function renderDate() {
    $("today-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase();
  }

  function renderRoutine() {
    const list = $("routine-list");
    const today = localDateKey();
    const todayRoutine = state.tasks.map(task => task.id);
    if (JSON.stringify(state.routines[today]) !== JSON.stringify(todayRoutine)) {
      state.routines[today] = todayRoutine;
      save();
    }
    const completed = completionFor(localDateKey());
    const doneCount = state.tasks.filter(task => completed.includes(task.id)).length;
    const percent = state.tasks.length ? Math.round(doneCount / state.tasks.length * 100) : 0;
    $("completed-count").textContent = doneCount;
    $("total-count").textContent = state.tasks.length;
    $("progress-percent").textContent = `${percent}%`;
    $("progress-ring").setAttribute("aria-label", `${percent}% complete`);
    $("progress-fill").style.width = `${percent}%`;
    $("progress-message").textContent = percent === 100 && state.tasks.length ? "You showed up for yourself today. Beautiful work." : doneCount ? "You're building momentum. Keep your own pace." : "Small steps count. Let's get started.";
    $("routine-caption").textContent = `${state.tasks.length} of ${MAX_TASKS} daily tasks`;
    $("add-task-button").disabled = state.tasks.length >= MAX_TASKS;
    $("add-task-button").setAttribute("aria-label", state.tasks.length >= MAX_TASKS ? "Routine is full" : "Add a routine task");

    if (!state.tasks.length) {
      list.innerHTML = '<div class="empty-state">Your routine is a blank page. Add one small thing you would like to do today.</div>';
      return;
    }
    const groups = new Map();
    for (const task of state.tasks) {
      const name = (task.group || "").trim() || "Daily flow";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(task);
    }
    list.innerHTML = [...groups.entries()].map(([group, tasks]) => {
      const groupDone = tasks.filter(task => completed.includes(task.id)).length;
      const groupPercent = Math.round(groupDone / tasks.length * 100);
      const groupTasks = tasks.map(task => {
        const index = state.tasks.indexOf(task);
        const siblings = tasks;
        const siblingIndex = siblings.indexOf(task);
        const isDone = completed.includes(task.id);
        return `<article class="task-wrap" data-id="${escapeHtml(task.id)}">
          <div class="swipe-complete"><span>✓</span> Done</div>
          <div class="task-card${isDone ? " is-done" : ""}" data-index="${index}">
            <button class="task-check${isDone ? " is-checked" : ""}" type="button" data-action="toggle" aria-pressed="${isDone}" aria-label="${isDone ? "Mark incomplete" : "Complete"} ${escapeHtml(task.name)}">${isDone ? "✓" : ""}</button>
            <div class="task-copy" role="button" tabindex="0" data-action="edit" aria-label="Edit ${escapeHtml(task.name)}">
              <span class="task-name">${escapeHtml(task.name)}</span><span class="task-detail">${isDone ? "Done for today" : "Tap to edit"}</span>
            </div>
            <span class="task-icon" aria-hidden="true">${escapeHtml(task.icon || "✨")}</span>
            ${state.reordering ? `<div class="task-actions"><button type="button" data-action="up" aria-label="Move up in ${escapeHtml(group)}" ${siblingIndex === 0 ? "disabled" : ""}>↑</button><button type="button" data-action="down" aria-label="Move down in ${escapeHtml(group)}" ${siblingIndex === siblings.length - 1 ? "disabled" : ""}>↓</button></div>` : ""}
          </div>
        </article>`;
      }).join("");
      return `<section class="group-panel">
        <header class="group-heading">
          <div><p class="group-kicker">ROUTINE GROUP</p><h3 class="routine-group">${escapeHtml(group)}</h3></div>
          <span class="group-count">${groupDone}<i>/</i>${tasks.length}</span>
          <div class="group-track"><span style="width:${groupPercent}%"></span></div>
        </header>
        <div class="group-tasks">${groupTasks}</div>
      </section>`;
    }).join("");
  }

  function renderEvolution() {
    const record = bestStreak(state);
    const score = growthScore(state);
    if (score > (state.growthPoints || 0)) {
      state.growthPoints = score;
      save();
    }
    const stages = [0, 5, 15, 35, 75, 150];
    let stageIndex = stages.reduce((current, threshold, index) => score >= threshold ? index : current, 0);
    const stage = EVOLUTION_STAGES[stageIndex];
    const next = stages[stageIndex + 1];
    $("evolution-card").dataset.stage = stageIndex;
    $("evolution-card").style.setProperty("--core-aura", `${5 + Math.min(15, score / 10)}px`);
    $("evolution-title").textContent = stage.title;
    $("evolution-copy").textContent = score
      ? `${totalCompletions(state)} small actions and ${fullDays(state)} full days have added to your light. Every restart counts.`
      : "Every action adds a little more light. Nothing you've built disappears.";
    $("best-streak").textContent = record;
    const progress = next ? Math.round((score - stages[stageIndex]) / (next - stages[stageIndex]) * 100) : 100;
    $("evolution-fill").style.width = `${progress}%`;
    $("evolution-next").textContent = next
      ? `${next - score} more growth points to ${EVOLUTION_STAGES[stageIndex + 1].title}`
      : "Your core has reached full radiance · keep growing";
    $("orb-description").textContent = `${stage.title}. ${totalCompletions(state)} routine actions, ${fullDays(state)} full days, and a best streak of ${record} days have shaped this progress being.`;
  }

  function renderBetterStats() {
    const todayDone = completionFor(localDateKey()).length;
    $("better-stats").innerHTML = `
      <article class="better-stat"><span class="better-stat-icon">✳</span><strong>${totalCompletions(state)}</strong><span>little actions completed</span></article>
      <article class="better-stat"><span class="better-stat-icon">☀</span><strong>${fullDays(state)}</strong><span>full routine days</span></article>
      <article class="better-stat"><span class="better-stat-icon">↗</span><strong>${streakAt(state)}</strong><span>current day run</span></article>
      <article class="better-stat"><span class="better-stat-icon">✦</span><strong>${bestStreak(state)}</strong><span>longest day run</span></article>`;
    $("evolution-card").style.setProperty("--daily-pulse", `${Math.min(1, todayDone / Math.max(1, state.tasks.length))}`);
  }

  async function renderJournal() {
    const entries = [...(state.journal || [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    $("journal-entry-count").textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;
    $("journal-today-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
    $("journal-char-count").textContent = `${$("journal-text").value.length} / 3000`;
    $("journal-error").hidden = true;
    if (!entries.length) {
      $("journal-entries").innerHTML = '<div class="journal-empty"><span aria-hidden="true">✧</span><h3>Your first page is waiting.</h3><p>A sentence or a small thing you noticed. It all belongs here.</p></div>';
      return;
    }

    const cards = [];
    for (const entry of entries) {
      const date = new Date(entry.createdAt);
      const mood = JOURNAL_MOODS[entry.mood] || JOURNAL_MOODS.steady;
      const text = entry.text ? `<p class="journal-entry-text">${escapeHtml(entry.text)}</p>` : "";
      cards.push(`<article class="journal-entry-card" data-entry-id="${escapeHtml(entry.id)}">
        <header class="journal-entry-header"><div><p class="journal-entry-date">${new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(date)}</p><span class="journal-entry-time">${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)}</span></div><span class="journal-mood mood-${escapeHtml(entry.mood)}"><i>${mood[0]}</i>${escapeHtml(mood[1])}</span></header>
        ${text}
        <footer class="journal-entry-actions"><button type="button" data-journal-action="edit">Edit page</button><button type="button" data-journal-action="delete">Delete</button></footer>
      </article>`);
    }
    $("journal-entries").innerHTML = cards.join("");
  }

  function renderHistory() {
    const dates = Object.keys(state.completions).sort().reverse();
    const todayKey = localDateKey();
    const streak = streakAt(state);
    const best = bestStreak(state);
    $("history-stats").innerHTML = `
      <div class="stat-card"><strong>${streak}</strong><span>current run</span></div>
      <div class="stat-card"><strong>${best}</strong><span>best run ✦</span></div>
      <div class="stat-card"><strong>${fullDays(state)}</strong><span>full routine days</span></div>
      <div class="stat-card"><strong>${totalCompletions(state)}</strong><span>tasks completed</span></div>`;
    const todayComplete = isFullDay(state, todayKey);
    const yesterday = new Date(`${todayKey}T12:00:00`);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = localDateKey(yesterday);
    const yesterdayComplete = isFullDay(state, yesterdayKey);
    const hasTodayCheckIn = completionFor(todayKey).length > 0;
    $("streak-guidance").textContent = todayComplete
      ? `Today's full routine is registered. Your ${streak}-day run is active.`
      : yesterdayComplete
        ? `Your ${streak}-day run is ready. Finish today's routine to keep it going.`
        : hasTodayCheckIn
          ? `Today isn't a full routine day yet. No streak day is registered until every task is done. Your best run of ${best} stays yours.`
          : best
            ? `No full routine was recorded yesterday, so the current run is paused. Your best of ${best} days and earned badges stay yours.`
            : "A streak day registers when you finish the whole routine. Missed days never erase your milestones.";
    const keys = Array.from({ length: 14 }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      return localDateKey(date);
    });
    $("history-list").innerHTML = keys.map(key => {
      const completed = completionFor(key);
      const count = completed.length;
      const date = new Date(`${key}T12:00:00`);
      const label = key === todayKey ? "Today" : new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
      const totalAtTime = (state.routines?.[key] || state.tasks.map(task => task.id)).length;
      const amount = totalAtTime ? Math.min(100, Math.round(count / totalAtTime * 100)) : 0;
      const hasCheckIn = Object.prototype.hasOwnProperty.call(state.completions, key);
      const isComplete = totalAtTime > 0 && count >= totalAtTime;
      const status = isComplete ? "Full routine" : hasCheckIn ? (count ? `${count} / ${totalAtTime} done` : "A pause") : "No check-ins";
      return `<div class="history-row${hasCheckIn && !isComplete ? " is-paused" : ""}"><div class="history-day">${label}<span class="history-date">${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)}</span></div><div class="history-result"><span class="history-count">${status}</span><span class="history-bar"><span style="width:${amount}%"></span></span></div></div>`;
    }).join("") + (dates.length > 14 ? `<p class="form-note" style="margin:12px 0 0">Showing the most recent 14 days.</p>` : "");
    const nextMilestone = [3, 7, 14, 21, 30, 50, 100].find(target => best < target);
    $("next-milestone-title").textContent = nextMilestone ? `${nextMilestone}-day best run` : "Century streak";
    $("next-milestone-copy").textContent = nextMilestone
      ? `${nextMilestone - best} more consecutive full ${nextMilestone - best === 1 ? "day" : "days"} to set this record. Your current run is ${streak}.`
      : "Your 100-day record is extraordinary. Keep building at your own pace.";
  }

  function renderBadges() {
    const unlocked = BADGES.filter(badge => badge.test(state));
    $("badge-summary").innerHTML = `<strong>${unlocked.length} <span> / ${BADGES.length}</span></strong><span>badges earned</span>`;
    $("badge-grid").innerHTML = BADGES.map(badge => {
      const earned = badge.test(state);
      return `<article class="badge-card${earned ? "" : " is-locked"}"><span class="badge-symbol" aria-hidden="true">${badge.icon}</span><h2>${badge.title}</h2><p>${badge.copy}</p></article>`;
    }).join("");
  }

  function showToast(message) {
    $("toast-message").textContent = message;
    $("toast").classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("is-visible"), 4500);
  }

  function toggleTask(id, done) {
    const today = localDateKey();
    const current = completionFor(today);
    const wasDone = current.includes(id);
    if (wasDone === done) return;
    state.completions[today] = done ? [...current, id] : current.filter(item => item !== id);
    if (done) {
      $("evolution-card").classList.remove("is-pulsing");
      void $("evolution-card").offsetWidth;
      $("evolution-card").classList.add("is-pulsing");
      setTimeout(() => $("evolution-card").classList.remove("is-pulsing"), 850);
    }
    save();
    render();
  }

  function openTaskDialog(task = null) {
    editingId = task ? task.id : null;
    selectedIcon = task ? task.icon : ICONS[0];
    $("dialog-title").textContent = task ? "Edit your task" : "Add a routine task";
    $("task-name").value = task ? task.name : "";
    $("task-group").value = task ? task.group : "";
    $("delete-task-button").hidden = !task;
    $("task-form-note").textContent = `${state.tasks.length} of ${MAX_TASKS} tasks in your routine.`;
    $("task-form-note").hidden = !task && state.tasks.length >= MAX_TASKS;
    $("task-name").disabled = !task && state.tasks.length >= MAX_TASKS;
    $("task-group").disabled = !task && state.tasks.length >= MAX_TASKS;
    $("task-form").querySelector('[type="submit"]').disabled = !task && state.tasks.length >= MAX_TASKS;
    $("group-options").innerHTML = [...new Set(state.tasks.map(item => item.group).filter(Boolean))].map(group => `<option value="${escapeHtml(group)}"></option>`).join("");
    $("emoji-options").innerHTML = ICONS.map(icon => `<button class="emoji-option${icon === selectedIcon ? " is-selected" : ""}" type="button" data-icon="${icon}" aria-label="${icon}" aria-pressed="${icon === selectedIcon}">${icon}</button>`).join("");
    $("task-dialog").showModal();
    if (!task) $("task-name").focus();
  }

  function moveTask(id, direction) {
    const index = state.tasks.findIndex(task => task.id === id);
    if (index < 0) return;
    const group = (state.tasks[index].group || "").trim();
    const siblings = state.tasks.filter(task => (task.group || "").trim() === group);
    const siblingIndex = siblings.findIndex(task => task.id === id);
    const targetSibling = siblings[siblingIndex + direction];
    if (!targetSibling) return;
    const target = state.tasks.findIndex(task => task.id === targetSibling.id);
    [state.tasks[index], state.tasks[target]] = [state.tasks[target], state.tasks[index]];
    save();
    render();
  }

  function switchView(name) {
    for (const button of document.querySelectorAll(".nav-item")) {
      const current = button.dataset.view === name;
      button.classList.toggle("is-current", current);
      if (current) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    for (const view of document.querySelectorAll(".view")) {
      const current = view.id === `${name}-view`;
      view.hidden = !current;
      view.classList.toggle("is-active", current);
    }
    document.body.classList.toggle("quit-mode", name === "quit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toLocalDateTimeValue(isoDate = new Date().toISOString()) {
    const date = new Date(isoDate);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function formatSmokeDuration(milliseconds) {
    const totalMinutes = Math.floor(Math.max(0, milliseconds) / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor(totalMinutes % 1440 / 60);
    const minutes = totalMinutes % 60;
    return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function formatQuitCountdown(milliseconds) {
    const days = Math.ceil(Math.max(0, milliseconds) / 86400000);
    if (days >= 365) {
      const years = Math.floor(days / 365.25);
      const months = Math.floor((days - years * 365.25) / 30.4375);
      return `~${years}y${months ? ` ${months}mo` : ""}`;
    }
    if (days >= 60) {
      const months = Math.floor(days / 30.4375);
      const remainingDays = Math.ceil(days - months * 30.4375);
      return `~${months}mo${remainingDays ? ` ${remainingDays}d` : ""}`;
    }
    const totalMinutes = Math.ceil(Math.max(0, milliseconds) / 60000);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return `${hours}h${minutes ? ` ${minutes}m` : ""}`;
    const wholeDays = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${wholeDays}d${remainingHours ? ` ${remainingHours}h` : ""}`;
  }

  function renderQuitJourney(elapsed) {
    const bestRun = smokeBestRunMs(state);
    const earned = QUIT_BADGES.filter(badge => bestRun >= badge.afterMs);
    const currentBadge = earned.at(-1);
    const nextBadge = QUIT_BADGES.find(badge => bestRun < badge.afterMs);
    const nextMilestone = QUIT_MILESTONES.find(milestone => elapsed < milestone.afterMs);
    const featuredBadge = currentBadge || nextBadge || QUIT_BADGES[QUIT_BADGES.length - 1];
    $("current-quit-badge").innerHTML = `
      <span class="current-quit-badge-icon" aria-hidden="true">${featuredBadge.icon}</span>
      <p class="quit-kicker">${currentBadge ? "YOUR LATEST EARNED BADGE" : "YOUR FIRST BADGE IS AHEAD"}</p>
      <h2>${featuredBadge.title}</h2>
      <p>${currentBadge ? `${currentBadge.copy}. This badge stays yours, even after a restart.` : "Every smoke-free moment brings this one closer."}</p>`;
    $("quit-next-milestone-title").textContent = nextMilestone ? `${nextMilestone.title} · ${nextMilestone.label}` : "All milestones reached";
    $("quit-next-milestone-time").textContent = nextMilestone ? formatQuitCountdown(nextMilestone.afterMs - elapsed) : "Every step is yours";
    $("quit-next-milestone-copy").textContent = nextMilestone ? nextMilestone.copy : "Your smoke-free journey has passed every milestone in this timeline.";
    $("quit-next-badge-title").textContent = nextBadge ? nextBadge.title : "All quit badges earned";
    $("quit-next-badge-time").textContent = nextBadge ? formatQuitCountdown(nextBadge.afterMs - bestRun) : "A remarkable journey";
    $("quit-next-badge-copy").textContent = nextBadge ? nextBadge.copy : "You have reached the final quit badge. Your progress stays yours.";
    $("quit-badge-count").textContent = `${earned.length} / ${QUIT_BADGES.length} earned`;
    $("quit-badge-grid").innerHTML = QUIT_BADGES.map(badge => {
      const unlocked = bestRun >= badge.afterMs;
      return `<article class="quit-badge${unlocked ? " is-earned" : " is-locked"}">
        <span aria-hidden="true">${badge.icon}</span>
        <h4>${badge.title}</h4>
        <p>${badge.copy}</p>
        <small>${unlocked ? "Earned" : formatQuitCountdown(badge.afterMs - bestRun)}</small>
      </article>`;
    }).join("");
  }

  function updateSmokeVisual(elapsed) {
    const reached = QUIT_MILESTONES.filter(milestone => elapsed >= milestone.afterMs);
    const milestone = reached.at(-1);
    const stage = state.smoking.startedAt ? reached.length : 0;
    const hero = $("quit-hero");
    const previousStage = hero.dataset.stage;
    hero.dataset.stage = stage;
    hero.style.setProperty("--ember-aura", `${5 + Math.min(17, elapsed / (365.25 * 86400000) * 2)}px`);
    hero.style.setProperty("--ember-opacity", String(.45 + Math.min(.55, elapsed / (365.25 * 86400000))));
    if (previousStage !== String(stage)) {
      hero.classList.remove("is-evolving");
      void hero.offsetWidth;
      hero.classList.add("is-evolving");
      setTimeout(() => hero.classList.remove("is-evolving"), 900);
    }
    $("quit-stage-title").textContent = milestone?.title || (state.smoking.startedAt ? "A first clear moment" : "Ready when you are");
    $("quit-stage-copy").textContent = milestone?.copy || (state.smoking.startedAt
      ? "Your smoke-free journey has begun. Every minute is part of it."
      : "Start your smoke-free timer whenever you feel ready. There is no perfect moment.");
    $("quit-kicker").textContent = state.smoking.startedAt ? "YOUR SMOKE-FREE EMBER" : "YOUR NEXT CHAPTER";
    $("quit-orb-desc").textContent = state.smoking.startedAt
      ? `${milestone?.title || "Your smoke-free journey has begun"}. Smoke-free for ${formatSmokeDuration(elapsed)} since your last check-in. Your best run remains saved through a slip.`
      : "A warm geometric light, ready to grow with your smoke-free journey.";
  }

  function updateSmokeClock() {
    if (!state.smoking.startedAt) return;
    const elapsed = currentSmokeRunMs(state);
    const minutes = Math.floor(elapsed / 60000);
    $("quit-days").textContent = Math.floor(minutes / 1440);
    $("quit-hours").textContent = String(Math.floor(minutes % 1440 / 60)).padStart(2, "0");
    $("quit-minutes").textContent = String(minutes % 60).padStart(2, "0");
    $("quit-best").textContent = formatSmokeDuration(smokeBestRunMs(state));
    $("quit-lapses").textContent = state.smoking.lapses.length;
    const origin = smokeTimerOrigin(state);
    $("quit-clock-caption").textContent = `Since ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(origin))}. No rush. Just this moment.`;
    const estimatedCigarettes = state.smoking.cigarettesPerDay
      ? Math.floor(elapsed / 86400000 * state.smoking.cigarettesPerDay)
      : 0;
    $("quit-saved-stat").hidden = !state.smoking.cigarettesPerDay;
    $("quit-saved").textContent = estimatedCigarettes;
    const estimatedSavings = state.smoking.packPrice && state.smoking.cigarettesPerDay
      ? estimatedCigarettes / state.smoking.cigarettesPerPack * state.smoking.packPrice
      : null;
    $("quit-saved-money-stat").hidden = estimatedSavings === null;
    $("quit-saved-money").textContent = estimatedSavings === null ? "0" : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(estimatedSavings);
    updateSmokeVisual(elapsed);
    renderQuitJourney(elapsed);
  }

  function renderSmoking() {
    const smoking = state.smoking;
    const active = Boolean(smoking.startedAt);
    $("quit-start-panel").hidden = active;
    $("quit-active-panel").hidden = !active;
    const setupForm = $("quit-setup-form");
    if (!setupForm.dataset.initialized) {
      $("quit-start-time").value = toLocalDateTimeValue();
      setupForm.dataset.initialized = "true";
    }
    if (!active) {
      updateSmokeVisual(0);
      return;
    }
    updateSmokeClock();
    $("quit-history-list").innerHTML = smoking.lapses.length
      ? smoking.lapses.slice().reverse().map((timestamp, index) => {
        const when = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
        return `<div class="quit-history-row"><span><strong>Restart ${smoking.lapses.length - index}</strong><small>${when}</small></span><span class="restart-mark">↗</span></div>`;
      }).join("")
      : '<p class="quit-empty-history">No slips logged. Your history is yours to fill—without pressure.</p>';
    if (!$("quit-edit-form").dataset.initialized) {
      $("edit-quit-start-time").value = toLocalDateTimeValue(smoking.startedAt);
      $("edit-cigarettes-per-day").value = smoking.cigarettesPerDay || "";
      $("edit-pack-price").value = smoking.packPrice || "";
      $("edit-cigarettes-per-pack").value = smoking.cigarettesPerPack;
      $("quit-edit-form").dataset.initialized = "true";
    }
  }

  function readSmokingSettings(prefix = "") {
    const cigarettesRaw = $(`${prefix}cigarettes-per-day`).value;
    const priceRaw = $(`${prefix}pack-price`).value;
    const packRaw = $(`${prefix}cigarettes-per-pack`).value;
    const cigarettes = cigarettesRaw === "" ? null : Number(cigarettesRaw);
    const price = priceRaw === "" ? null : Number(priceRaw);
    const pack = packRaw === "" ? 20 : Number(packRaw);
    if ((cigarettes !== null && (!Number.isFinite(cigarettes) || cigarettes < 1 || cigarettes > 100)) ||
        (price !== null && (!Number.isFinite(price) || price <= 0)) ||
        (!Number.isFinite(pack) || pack < 1 || pack > 100)) {
      return null;
    }
    return { cigarettesPerDay: cigarettes, packPrice: price, cigarettesPerPack: pack };
  }

  function startCravingPause() {
    clearInterval(cravingInterval);
    let remaining = 120;
    $("craving-button").hidden = true;
    $("craving-timer").hidden = false;
    $("craving-countdown").textContent = "02:00";
    $("craving-countdown").setAttribute("aria-label", "2 minutes remaining");
    cravingInterval = setInterval(() => {
      remaining--;
      const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
      const seconds = String(remaining % 60).padStart(2, "0");
      $("craving-countdown").textContent = `${minutes}:${seconds}`;
      $("craving-countdown").setAttribute("aria-label", `${remaining} seconds remaining`);
      if (remaining <= 0) {
        clearInterval(cravingInterval);
        cravingInterval = null;
        $("craving-countdown").textContent = "You made space.";
        $("craving-timer").querySelector("span").textContent = "Whatever happens next, you did this moment.";
      }
    }, 1000);
  }

  function clearJournalEditor() {
    journalEditingId = null;
    journalSelectedMood = "steady";
    $("journal-text").value = "";
    $("journal-form-title").textContent = "A note to yourself";
    $("journal-save-button").textContent = "Save entry";
    $("journal-cancel-edit").hidden = true;
    $("journal-error").hidden = true;
    $("journal-error").textContent = "";
    for (const button of $("mood-picker").querySelectorAll("[data-mood]")) {
      const selected = button.dataset.mood === "steady";
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    $("journal-char-count").textContent = "0 / 3000";
  }

  async function editJournalEntry(id) {
    const entry = state.journal.find(item => item.id === id);
    if (!entry) return;
    journalEditingId = id;
    journalSelectedMood = JOURNAL_MOODS[entry.mood] ? entry.mood : "steady";
    $("journal-text").value = entry.text;
    $("journal-form-title").textContent = "Revisit this page";
    $("journal-save-button").textContent = "Save changes";
    $("journal-cancel-edit").hidden = false;
    $("journal-error").hidden = true;
    $("journal-char-count").textContent = `${entry.text.length} / 3000`;
    for (const button of $("mood-picker").querySelectorAll("[data-mood]")) {
      const selected = button.dataset.mood === journalSelectedMood;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    $("journal-text").focus();
    $("journal-view").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("routine-list").addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const card = button.closest(".task-wrap");
    if (!card) return;
    if (button.dataset.swiped) {
      delete button.dataset.swiped;
      return;
    }
    const task = state.tasks.find(item => item.id === card.dataset.id);
    if (!task) return;
    switch (button.dataset.action) {
      case "toggle": toggleTask(task.id, !completionFor(localDateKey()).includes(task.id)); break;
      case "edit": openTaskDialog(task); break;
      case "up": moveTask(task.id, -1); break;
      case "down": moveTask(task.id, 1); break;
    }
  });

  $("routine-list").addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches('[data-action="edit"]')) {
      event.preventDefault();
      const task = state.tasks.find(item => item.id === event.target.closest(".task-wrap")?.dataset.id);
      if (task) openTaskDialog(task);
    }
  });

  $("routine-list").addEventListener("touchstart", event => {
    const card = event.target.closest(".task-card");
    if (!card || event.target.closest(".task-actions, .task-check")) return;
    const touch = event.changedTouches[0];
    card.dataset.touchX = touch.clientX;
    card.dataset.touchY = touch.clientY;
    card.classList.add("is-dragging");
  }, { passive: true });

  $("routine-list").addEventListener("touchmove", event => {
    const card = event.target.closest(".task-card.is-dragging");
    if (!card || card.dataset.touchX === undefined) return;
    const touch = event.changedTouches[0];
    const delta = Math.min(0, Math.max(-120, touch.clientX - Number(card.dataset.touchX)));
    if (Math.abs(touch.clientY - Number(card.dataset.touchY)) < 30) card.style.transform = `translateX(${delta}px)`;
  }, { passive: true });

  $("routine-list").addEventListener("touchend", event => {
    const card = event.target.closest(".task-card.is-dragging");
    if (!card) return;
    const delta = event.changedTouches[0].clientX - Number(card.dataset.touchX || 0);
    card.classList.remove("is-dragging");
    card.style.transform = "";
    if (delta < -75) {
      card.dataset.swiped = "true";
      toggleTask(card.closest(".task-wrap").dataset.id, true);
      setTimeout(() => delete card.dataset.swiped, 500);
    }
    delete card.dataset.touchX;
    delete card.dataset.touchY;
  }, { passive: true });

  $("add-task-button").addEventListener("click", () => openTaskDialog());
  $("manage-button").addEventListener("click", () => {
    state.reordering = !state.reordering;
    $("manage-button").textContent = state.reordering ? "Done" : "Edit routine";
    renderRoutine();
  });
  $("task-form").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("task-name").value.trim();
    const group = $("task-group").value.trim();
    if (!name) return;
    if (editingId) {
      const task = state.tasks.find(item => item.id === editingId);
      if (task) Object.assign(task, { name, group, icon: selectedIcon });
    } else {
      if (state.tasks.length >= MAX_TASKS) return;
      state.tasks.push({ id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, group, icon: selectedIcon });
    }
    save();
    $("task-dialog").close();
    render();
  });
  $("delete-task-button").addEventListener("click", () => {
    if (!editingId) return;
    state.tasks = state.tasks.filter(task => task.id !== editingId);
    save();
    $("task-dialog").close();
    render();
  });
  $("emoji-options").addEventListener("click", event => {
    const button = event.target.closest("[data-icon]");
    if (!button) return;
    selectedIcon = button.dataset.icon;
    for (const option of $("emoji-options").querySelectorAll(".emoji-option")) {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    }
  });
  document.querySelectorAll(".close-dialog").forEach(button => button.addEventListener("click", () => $("task-dialog").close()));
  document.querySelector(".bottom-nav").addEventListener("click", event => {
    const button = event.target.closest("[data-view]");
    if (button) switchView(button.dataset.view);
  });
  $("journal-text").addEventListener("input", () => {
    $("journal-char-count").textContent = `${$("journal-text").value.length} / 3000`;
  });
  $("mood-picker").addEventListener("click", event => {
    const button = event.target.closest("[data-mood]");
    if (!button) return;
    journalSelectedMood = button.dataset.mood;
    for (const option of $("mood-picker").querySelectorAll("[data-mood]")) {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    }
  });
  $("journal-cancel-edit").addEventListener("click", () => {
    clearJournalEditor();
  });
  $("journal-entry-form").addEventListener("submit", async event => {
    event.preventDefault();
    const text = $("journal-text").value.trim();
    if (!text) {
      $("journal-error").textContent = "Write a little note before saving.";
      $("journal-error").hidden = false;
      return;
    }
    const button = $("journal-save-button");
    button.disabled = true;
    button.textContent = "Saving…";
    $("journal-error").hidden = true;
    const previousJournal = state.journal;
    try {
      const existing = journalEditingId ? state.journal.find(entry => entry.id === journalEditingId) : null;
      const now = new Date().toISOString();
      const next = {
        id: existing?.id || `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        text,
        mood: journalSelectedMood
      };
      state.journal = existing
        ? state.journal.map(entry => entry.id === existing.id ? next : entry)
        : [next, ...(state.journal || [])];
      if (!save()) {
        state.journal = previousJournal;
        throw new Error("Your entry could not be saved on this device. Free some browser storage and try again.");
      }
      clearJournalEditor();
      await renderJournal();
    } catch (error) {
      console.error("Could not save your journal entry.", error);
      $("journal-error").textContent = error instanceof Error ? error.message : "Could not save the journal entry. Try again.";
      $("journal-error").hidden = false;
      button.textContent = journalEditingId ? "Save changes" : "Save entry";
    } finally {
      button.disabled = false;
      if (!journalEditingId) button.textContent = "Save entry";
    }
  });
  $("journal-entries").addEventListener("click", event => {
    const button = event.target.closest("[data-journal-action]");
    const card = button?.closest("[data-entry-id]");
    if (!button || !card) return;
    if (button.dataset.journalAction === "edit") {
      editJournalEntry(card.dataset.entryId).catch(error => {
        console.error("Could not edit this journal entry.", error);
        $("journal-error").textContent = error instanceof Error ? error.message : "Could not open this entry for editing.";
        $("journal-error").hidden = false;
      });
    } else {
      journalDeleteId = card.dataset.entryId;
      $("journal-delete-dialog").showModal();
    }
  });
  const closeJournalDeleteDialog = () => {
    journalDeleteId = null;
    $("journal-delete-dialog").close();
  };
  $("close-journal-delete").addEventListener("click", closeJournalDeleteDialog);
  $("cancel-journal-delete").addEventListener("click", closeJournalDeleteDialog);
  $("confirm-journal-delete").addEventListener("click", async () => {
    const entry = state.journal.find(item => item.id === journalDeleteId);
    if (!entry) {
      closeJournalDeleteDialog();
      return;
    }
    const button = $("confirm-journal-delete");
    button.disabled = true;
    try {
      const previousJournal = state.journal;
      state.journal = state.journal.filter(item => item.id !== entry.id);
      if (!save()) {
        state.journal = previousJournal;
        throw new Error("Your entry could not be removed from this device. Free some browser storage and try again.");
      }
      if (journalEditingId === entry.id) clearJournalEditor();
      closeJournalDeleteDialog();
      await renderJournal();
    } catch (error) {
      console.error("Could not delete the journal entry.", error);
      $("journal-error").textContent = error instanceof Error ? error.message : "Could not delete the entry.";
      $("journal-error").hidden = false;
      closeJournalDeleteDialog();
    } finally {
      button.disabled = false;
    }
  });
  $("backup-nav-button").addEventListener("click", () => {
    updateSyncControls();
    $("sync-dialog").showModal();
  });
  $("close-sync-dialog").addEventListener("click", () => $("sync-dialog").close());
  $("export-file-backup").addEventListener("click", async () => {
    const button = $("export-file-backup");
    const status = $("file-backup-status");
    button.disabled = true;
    try {
      status.textContent = "Preparing your unencrypted backup file…";
      const backup = await createBackupDocument();
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `superhuman-backup-${localDateKey()}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = "Backup download started. Store the file somewhere safe.";
    } catch (error) {
      console.error("Could not export the backup file.", error);
      status.textContent = error instanceof Error ? error.message : "Could not export the backup file.";
    } finally {
      button.disabled = false;
    }
  });
  $("import-file-backup").addEventListener("click", () => $("backup-file").click());
  $("backup-file").addEventListener("change", async () => {
    const input = $("backup-file");
    const file = input.files[0];
    if (!file) return;
    if (!window.confirm("Restore this backup file? It replaces this device's current data and will sync the restored changes.")) {
      input.value = "";
      return;
    }
    const button = $("import-file-backup");
    const status = $("file-backup-status");
    button.disabled = true;
    try {
      status.textContent = "Reading your backup file…";
      const backup = JSON.parse(await file.text());
      if (!isRecord(backup) || ![1, 2].includes(backup.version) || !isRecord(backup.state)) {
        throw new Error("This file is not a supported Superhuman backup.");
      }
      await restoreEncryptedBackup(backup);
      status.textContent = "Backup file restored on this device.";
    } catch (error) {
      console.error("Could not restore the backup file.", error);
      status.textContent = error instanceof Error ? error.message : "Could not restore the backup file.";
    } finally {
      input.value = "";
      button.disabled = false;
    }
  });
  $("restore-local-recovery").addEventListener("click", async () => {
    if (!window.confirm("Restore the local pre-sync copy? This replaces this device's current data and will sync the restored changes.")) return;
    const button = $("restore-local-recovery");
    button.disabled = true;
    try {
      await restoreLocalRecovery();
      setSyncStatus("The pre-sync copy was restored on this device.");
    } catch (error) {
      console.error("Could not restore the local recovery copy.", error);
      setSyncStatus(error instanceof Error ? error.message : "Could not restore the local recovery copy.", true);
    } finally {
      button.disabled = false;
    }
  });
              $("sync-code").addEventListener("input", updateSyncControls);
  $("generate-sync-code").addEventListener("click", () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    $("sync-code").value = bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    bytes.fill(0);
    updateSyncControls();
    setSyncStatus("A new private code was generated. Save it before leaving this page; it will not be stored by the app.");
  });
  $("copy-sync-code").addEventListener("click", async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable in this browser.");
      await navigator.clipboard.writeText($("sync-code").value.trim());
      setSyncStatus("Sync code copied. Keep it private and store it somewhere safe.");
    } catch (error) {
      console.error("Could not copy the private sync code.", error);
      setSyncStatus(error instanceof Error ? error.message : "Could not copy the sync code.", true);
    }
  });
  $("upload-sync").addEventListener("click", () => {
    if (!window.confirm("Upload this device's routine, quit history, and journal? This replaces the cloud backup for this sync code; it does not merge devices.")) return;
    runSyncOperation(async () => {
      setSyncStatus("Encrypting your data on this device…");
      const credentials = await deriveSyncCredentials();
      const encryptedBlob = await createEncryptedBackup(credentials.encryptionKey);
      const result = await requestSync("put", credentials, encryptedBlob);
      setSyncStatus(`Encrypted backup uploaded ${formattedSyncTime(result.updatedAt)}.`);
    });
  });
  $("restore-sync").addEventListener("click", () => {
    if (!window.confirm("Restore the cloud backup to this device? This replaces this device's routine, quit history, and journal.")) return;
    runSyncOperation(async () => {
      setSyncStatus("Checking for an encrypted cloud backup…");
      const credentials = await deriveSyncCredentials();
      const result = await requestSync("get", credentials);
      if (!result.exists) throw new Error("No cloud backup was found for this sync code.");
      const document = await decryptBackup(result.encrypted_blob, credentials.encryptionKey);
      await restoreEncryptedBackup(document);
      setSyncStatus(`Cloud backup restored from ${formattedSyncTime(result.updated_at)}. Local data was kept intact until the restore completed.`);
    });
  });
  $("delete-sync").addEventListener("click", () => {
    if (!window.confirm("Permanently delete the encrypted cloud backup for this sync code? Data saved on this device will remain unchanged.")) return;
    runSyncOperation(async () => {
      const credentials = await deriveSyncCredentials();
      const result = await requestSync("delete", credentials);
      setSyncStatus(result.deleted ? "The encrypted cloud backup was deleted. Data on this device was not changed." : "No cloud backup was found for this sync code.");
    });
  });
  for (const id of ["quit-start-time", "edit-quit-start-time"]) {
    $(id).addEventListener("input", event => event.currentTarget.setCustomValidity(""));
  }

  $("quit-setup-form").addEventListener("submit", event => {
    event.preventDefault();
    const settings = readSmokingSettings();
    const startValue = $("quit-start-time").value;
    const startDate = new Date(startValue);
    if (!settings) {
      showToast("Check your optional daily and pack details.");
      return;
    }
    if (!startValue || !Number.isFinite(startDate.getTime()) || startDate.getTime() > Date.now()) {
      $("quit-start-time").setCustomValidity("Choose a start time that is not in the future.");
      $("quit-start-time").reportValidity();
      return;
    }
    $("quit-start-time").setCustomValidity("");
    state.smoking = { ...normalizeSmoking(), ...settings, startedAt: startDate.toISOString(), lapses: [], bestRunMs: 0 };
    save();
    render();
  });
  $("quit-edit-form").addEventListener("submit", event => {
    event.preventDefault();
    const settings = readSmokingSettings("edit-");
    const startValue = $("edit-quit-start-time").value;
    const startDate = new Date(startValue);
    const latestLapse = state.smoking.lapses.at(-1);
    if (!settings) {
      showToast("Check your daily and pack details.");
      return;
    }
    if (!startValue || !Number.isFinite(startDate.getTime()) ||
        startDate.getTime() > Date.now() ||
        (latestLapse && startDate.getTime() > Date.parse(latestLapse))) {
      $("edit-quit-start-time").setCustomValidity("The start must be in the past and no later than any saved restart.");
      $("edit-quit-start-time").reportValidity();
      return;
    }
    $("edit-quit-start-time").setCustomValidity("");
    state.smoking.bestRunMs = Math.max(state.smoking.bestRunMs, currentSmokeRunMs(state));
    state.smoking = { ...state.smoking, ...settings, startedAt: startDate.toISOString() };
    save();
    render();
  });
  $("log-slip-button").addEventListener("click", () => $("lapse-dialog").showModal());
  $("close-lapse-dialog").addEventListener("click", () => $("lapse-dialog").close());
  $("cancel-lapse").addEventListener("click", () => $("lapse-dialog").close());
  $("confirm-lapse").addEventListener("click", () => {
    const elapsed = currentSmokeRunMs(state);
    state.smoking.bestRunMs = Math.max(state.smoking.bestRunMs, elapsed);
    state.smoking.lapses.push(new Date().toISOString());
    state.smoking.lapses.sort();
    save();
    $("lapse-dialog").close();
    render();
  });
  $("craving-button").addEventListener("click", startCravingPause);
  $("craving-done").addEventListener("click", () => {
    clearInterval(cravingInterval);
    cravingInterval = null;
    $("craving-timer").hidden = true;
    $("craving-button").hidden = false;
    $("craving-timer").querySelector("span").textContent = "Easy breath in. Slow breath out.";
  });
  $("quit-edit-details").addEventListener("toggle", () => {
    if (!$("quit-edit-details").open || !$("quit-edit-form").dataset.initialized) return;
    $("edit-quit-start-time").value = toLocalDateTimeValue(state.smoking.startedAt);
    $("edit-quit-start-time").setCustomValidity("");
    $("edit-cigarettes-per-day").value = state.smoking.cigarettesPerDay || "";
    $("edit-pack-price").value = state.smoking.packPrice || "";
    $("edit-cigarettes-per-pack").value = state.smoking.cigarettesPerPack;
  });
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstall = event;
    $("install-button").hidden = false;
  });
  $("install-button").addEventListener("click", async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    $("install-button").hidden = true;
  });
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        const nextState = normalizeStoredState(saved);
        if (!nextState || !validSyncMetadata(saved._sync)) {
          throw new Error("Data changed in another tab without compatible sync information. Reload after closing the other tab.");
        }
        state = nextState;
        if (autoSync) autoSync.replaceFromStorage(state, saved._sync);
        render();
        scheduleAutoSync();
      } catch (error) {
        storageBlocked = true;
        console.error("Could not safely read data from another tab.", error);
        setAutoSyncStatus(error instanceof Error ? error.message : "Could not read data from another tab.", true);
      }
    }
  });
  window.addEventListener("online", () => scheduleAutoSync(0));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleAutoSync(0);
  });
  setInterval(() => {
    if (!document.hidden) scheduleAutoSync(0);
  }, 30000);
      setInterval(() => {
    if (state.smoking.startedAt) {
      updateSmokeClock();
      renderBadges();
    }
  }, 30000);
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(error => console.error("Offline support could not be enabled.", error)));
  }
  initializeAutoSync();
  render();
  appInitialized = true;
  scheduleAutoSync(0);
  })();
