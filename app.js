(() => {
  "use strict";

  const STORAGE_KEY = "superhuman-routine-v1";
  const SUPABASE_URL = "https://txvlnkclbbyhsymarzqn.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uVxOvQrzACpa8Ug9Sm4n3w_K5llUi7Y";
  const RECOVERY_KEY = "superhuman-pre-sync-recovery-v1";
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
  const FIRST_YEAR_QUIT_BADGES = [
    [5, "A Fresh Start", "5 smoke-free minutes", "🌱"],
    [15, "A Quiet Quarter", "15 smoke-free minutes", "🌿"],
    [30, "Half-Hour Glow", "30 smoke-free minutes", "✨"],
    [120, "Two Hours Strong", "2 smoke-free hours", "💫"],
    [180, "Three-Hour Spark", "3 smoke-free hours", "🔥"],
    [360, "Six-Hour Shift", "6 smoke-free hours", "🌤️"],
    [720, "Half-Day Horizon", "12 smoke-free hours", "🌄"],
    [1080, "Eighteen Hours Forward", "18 smoke-free hours", "🌙"]
  ].map(([minutes, title, duration, icon]) => ({
    afterMs: minutes * 60000, title, copy: `Reach ${duration}`, icon
  }));
  const firstYearDays = [
    ...Array.from({ length: 28 }, (_, index) => index + 2).filter(day => day !== 5 && day !== 10),
    ...Array.from({ length: 65 }, (_, index) => 31 + index * 5),
    365
  ];
  const quitDayThemes = ["Steady Steps", "Growing Stronger", "A Clearer Path", "Fresh Momentum", "Your Own Pace", "Keep Shining"];
  const quitDayIcons = ["🌿", "✨", "🌼", "🌤️", "💫", "🌱"];
  FIRST_YEAR_QUIT_BADGES.push(...firstYearDays.map((day, index) => ({
    afterMs: day * 86400000,
    title: day === 365 ? "One Year, Yours" : `Day ${day} · ${quitDayThemes[index % quitDayThemes.length]}`,
    copy: `Reach ${day} smoke-free days`,
    icon: day === 365 ? "🏆" : quitDayIcons[index % quitDayIcons.length]
  })));
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
  ].map(([afterMs, title, copy, icon]) => ({ afterMs, title, copy, icon }))
    .concat(FIRST_YEAR_QUIT_BADGES)
    .sort((a, b) => a.afterMs - b.afterMs);
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
  let taskDrag = null;
  let suppressTaskClickUntil = 0;
  let lastSmokeMinute = null;
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
    const indicator = $("auto-sync-status");
    const status = isError ? "error" : message.startsWith("All changes") ? "synced" : message.startsWith("Uploading") ? "uploading" : message.startsWith("Changes") ? "pending" : "syncing";
    indicator.dataset.state = status;
    indicator.title = message;
    $("auto-sync-label").textContent = isError ? message : { synced: "Synced", uploading: "Uploading", pending: "Waiting", syncing: "Syncing" }[status];
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

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function validateSyncedState(value) {
    if (!isRecord(value) || !Array.isArray(value.tasks) || value.tasks.length > MAX_TASKS
      || !isRecord(value.completions) || !isRecord(value.routines) || !Array.isArray(value.journal)
) {
      throw new Error("Synced data is incomplete or invalid; local data was not changed.");
    }
    if (value.tasks.some(task => !isRecord(task) || typeof task.id !== "string" || typeof task.name !== "string")) {
      throw new Error("Synced data contains an invalid task; local data was not changed.");
    }
    for (const [date, completed] of Object.entries(value.completions)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(completed) || completed.some(id => typeof id !== "string")) {
        throw new Error("Synced completion history is invalid; local data was not changed.");
      }
    }
    for (const [date, routine] of Object.entries(value.routines)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(routine) || routine.some(id => typeof id !== "string")) {
        throw new Error("Synced routine history is invalid; local data was not changed.");
      }
    }
    if (value.journal.some(entry => !isRecord(entry)
      || typeof entry.id !== "string"
      || typeof entry.createdAt !== "string"
      || !Number.isFinite(Date.parse(entry.createdAt))
      || typeof entry.text !== "string")) {
      throw new Error("Synced data contains an invalid journal entry; local data was not changed.");
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
    if (taskDrag) finishTaskDrag(true);
    const list = $("routine-list");
    const today = localDateKey();
    const orderedTasks = tasksByGroup(state.tasks);
    const todayRoutine = orderedTasks.map(task => task.id);
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
    $("routine-caption").textContent = `${state.tasks.length} of ${MAX_TASKS} daily tasks`;
    $("add-task-button").disabled = state.tasks.length >= MAX_TASKS;
    $("add-task-button").setAttribute("aria-label", state.tasks.length >= MAX_TASKS ? "Routine is full" : "Add a routine task");

    if (!state.tasks.length) {
      list.innerHTML = '<div class="empty-state">Your routine is a blank page. Add one small thing you would like to do today.</div>';
      return;
    }
    const groups = [];
    for (const task of orderedTasks) {
      const name = groupLabel(task.group);
      if (!groups.length || groupKey(groups[groups.length - 1][0]) !== groupKey(name)) groups.push([name, []]);
      groups[groups.length - 1][1].push(task);
    }
    list.innerHTML = groups.map(([group, tasks]) => {
      const groupDone = tasks.filter(task => completed.includes(task.id)).length;
      const groupPercent = Math.round(groupDone / tasks.length * 100);
      const groupTasks = tasks.map(task => {
        const isDone = completed.includes(task.id);
        return `<article class="task-wrap" data-id="${escapeHtml(task.id)}">
          <div class="swipe-complete"><span>✓</span> Done</div>
          <div class="task-card${isDone ? " is-done" : ""}">
            <button class="task-check${isDone ? " is-checked" : ""}" type="button" data-action="toggle" aria-pressed="${isDone}" aria-label="${isDone ? "Mark incomplete" : "Complete"} ${escapeHtml(task.name)}">${isDone ? "✓" : ""}</button>
            <div class="task-copy" role="button" tabindex="0" data-action="edit" aria-label="Edit ${escapeHtml(task.name)}">
              <span class="task-name">${escapeHtml(task.name)}</span>${isDone ? '<span class="task-detail">Done for today</span>' : ""}
            </div>
            <span class="task-icon" aria-hidden="true">${escapeHtml(task.icon || "✨")}</span>
            <button class="task-drag-handle" type="button" data-action="reorder" aria-label="Reorder ${escapeHtml(task.name)}. Hold and drag the task, or use arrow keys." ${state.tasks.length < 2 ? "disabled" : ""}>⋮⋮</button>
          </div>
        </article>`;
      }).join("");
      return `<section class="group-panel">
        <header class="group-heading">
          <div><h3 class="routine-group">${escapeHtml(group)}</h3></div>
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
      $("journal-entries").innerHTML = '<div class="journal-empty"><span aria-hidden="true">✧</span><h3>No entries yet.</h3></div>';
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

  function groupLabel(group) {
    return (group || "").trim().replace(/\s+/g, " ") || "Daily flow";
  }

  function groupKey(group) {
    return groupLabel(group).toLocaleLowerCase();
  }

  function tasksByGroup(tasks) {
    const groups = new Map();
    for (const task of tasks) {
      const key = groupKey(task.group);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(task);
    }
    return [...groups.values()].flat();
  }

  function insertTaskInGroup(tasks, task) {
    const ordered = tasksByGroup(tasks);
    const key = groupKey(task.group);
    let index = ordered.length;
    for (let i = ordered.length - 1; i >= 0; i--) {
      if (groupKey(ordered[i].group) === key) {
        task.group = ordered[i].group || "";
        index = i + 1;
        break;
      }
    }
    ordered.splice(index, 0, task);
    return ordered;
  }

  function openTaskDialog(task = null) {
    editingId = task ? task.id : null;
    selectedIcon = task ? task.icon : ICONS[0];
    $("dialog-title").textContent = task ? "Edit your task" : "Add a routine task";
    $("task-name").value = task ? task.name : "";
    const groups = [];
    for (const item of state.tasks) {
      if (!groups.some(group => groupKey(group) === groupKey(item.group))) groups.push(groupLabel(item.group));
    }
    if (!groups.some(group => groupKey(group) === groupKey(""))) groups.unshift("Daily flow");
    $("task-group").innerHTML = groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("") + '<option value="">+ New group</option>';
    $("task-group").value = groups.find(group => groupKey(group) === groupKey(task?.group));
    $("new-task-group").value = "";
    $("new-task-group").setCustomValidity("");
    $("new-task-group").hidden = true;
    $("new-task-group").required = false;
    $("delete-task-button").hidden = !task;
    $("task-name").disabled = !task && state.tasks.length >= MAX_TASKS;
    $("task-group").disabled = !task && state.tasks.length >= MAX_TASKS;
    $("task-form").querySelector('[type="submit"]').disabled = !task && state.tasks.length >= MAX_TASKS;
    $("emoji-options").innerHTML = ICONS.map(icon => `<button class="emoji-option${icon === selectedIcon ? " is-selected" : ""}" type="button" data-icon="${icon}" aria-label="${icon}" aria-pressed="${icon === selectedIcon}">${icon}</button>`).join("");
    $("task-dialog").showModal();
    if (!task) $("task-name").focus();
  }

  function moveTask(id, direction) {
    const ordered = tasksByGroup(state.tasks);
    const index = ordered.findIndex(task => task.id === id);
    if (index < 0) return;
    const target = ordered[index + direction];
    if (target) reorderTask(id, target.id, direction > 0);
  }

  function reorderTask(id, targetId, after) {
    const tasks = tasksByGroup(state.tasks);
    const from = tasks.findIndex(item => item.id === id);
    const to = tasks.findIndex(item => item.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const task = tasks.splice(from, 1)[0];
    const target = tasks.find(item => item.id === targetId);
    task.group = target.group || "";
    tasks.splice(tasks.indexOf(target) + (after ? 1 : 0), 0, task);
    state.tasks = tasks;
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

  function updateSmokeClock(updateDetails = true) {
    if (!state.smoking.startedAt) return;
    const elapsed = currentSmokeRunMs(state);
    const minutes = Math.floor(elapsed / 60000);
    if (updateDetails) lastSmokeMinute = minutes;
    $("quit-days").textContent = Math.floor(minutes / 1440);
    $("quit-hours").textContent = String(Math.floor(minutes % 1440 / 60)).padStart(2, "0");
    $("quit-minutes").textContent = String(minutes % 60).padStart(2, "0");
    $("quit-seconds").textContent = String(Math.floor(elapsed / 1000) % 60).padStart(2, "0");
    if (!updateDetails) return;
    $("quit-best").textContent = formatSmokeDuration(smokeBestRunMs(state));
    const origin = smokeTimerOrigin(state);
    $("quit-clock-caption").textContent = `Since ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(origin))}`;
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
    if (Date.now() < suppressTaskClickUntil) {
      event.preventDefault();
      return;
    }
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
    if (event.target.matches('[data-action="reorder"]') && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const id = event.target.closest(".task-wrap").dataset.id;
      moveTask(id, event.key === "ArrowUp" ? -1 : 1);
      const handle = [...$("routine-list").querySelectorAll(".task-wrap")].find(card => card.dataset.id === id)?.querySelector(".task-drag-handle");
      if (handle) handle.focus();
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && event.target.matches('[data-action="edit"]')) {
      event.preventDefault();
      const task = state.tasks.find(item => item.id === event.target.closest(".task-wrap")?.dataset.id);
      if (task) openTaskDialog(task);
    }
  });

  function startTaskDrag(card, x, y, kind, id) {
    if (taskDrag || (kind === "mouse" && state.tasks.length < 2)) return;
    const drag = { card, kind, id, x, y, currentX: x, currentY: y, active: false, target: null, after: false };
    taskDrag = drag;
    if (state.tasks.length < 2) return;
    drag.timer = setTimeout(() => {
      if (taskDrag !== drag) return;
      drag.active = true;
      card.classList.add("is-reordering");
      const rect = card.getBoundingClientRect();
      drag.offsetX = x - rect.left;
      drag.offsetY = y - rect.top;
      drag.ghost = card.cloneNode(true);
      drag.ghost.classList.remove("is-reordering");
      drag.ghost.classList.add("task-drag-ghost");
      drag.ghost.setAttribute("aria-hidden", "true");
      drag.ghost.style.width = `${rect.width}px`;
      document.body.appendChild(drag.ghost);
      if (kind === "mouse") card.setPointerCapture(id);
      updateTaskDrag(x, y);
      drag.scrollTimer = setInterval(() => {
        const speed = drag.currentY < 90 ? -14 : drag.currentY > window.innerHeight - 100 ? 14 : 0;
        if (speed) {
          window.scrollBy(0, speed);
          updateTaskDrag(drag.currentX, drag.currentY);
        }
      }, 50);
    }, 400);
  }

  function updateTaskDrag(x, y) {
    const drag = taskDrag;
    if (!drag) return;
    drag.currentX = x;
    drag.currentY = y;
    if (!drag.active) {
      if (Math.hypot(x - drag.x, y - drag.y) > 10) clearTimeout(drag.timer);
      return;
    }
    drag.ghost.style.left = `${x - drag.offsetX}px`;
    drag.ghost.style.top = `${y - drag.offsetY}px`;
    const cards = [...$("routine-list").querySelectorAll(".task-wrap")];
    let target = null;
    let distance = Infinity;
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const gap = Math.max(rect.top - y, 0, y - rect.bottom);
      if (gap < distance) {
        target = card;
        distance = gap;
      }
    }
    drag.target?.classList.remove("drop-before", "drop-after");
    drag.target = target && target !== drag.card ? target : null;
    if (drag.target) {
      const rect = drag.target.getBoundingClientRect();
      drag.after = y >= (rect.top + rect.bottom) / 2;
      drag.target.classList.add(drag.after ? "drop-after" : "drop-before");
    }
  }

  function finishTaskDrag(cancelled = false) {
    const drag = taskDrag;
    if (!drag) return;
    clearTimeout(drag.timer);
    clearInterval(drag.scrollTimer);
    drag.card.classList.remove("is-reordering");
    const surface = drag.card.querySelector(".task-card");
    surface.classList.remove("is-dragging");
    surface.style.transform = "";
    drag.target?.classList.remove("drop-before", "drop-after");
    drag.ghost?.remove();
    taskDrag = null;
    if (drag.active) suppressTaskClickUntil = Date.now() + 600;
    if (!cancelled && drag.active && drag.target) reorderTask(drag.card.dataset.id, drag.target.dataset.id, drag.after);
  }

  $("routine-list").addEventListener("contextmenu", event => {
    if (event.target.closest(".task-wrap") && !event.target.closest(".task-check")) event.preventDefault();
  });
  $("routine-list").addEventListener("touchstart", event => {
    if (event.touches.length !== 1) {
      finishTaskDrag(true);
      return;
    }
    const card = event.target.closest(".task-wrap");
    if (!card || event.target.closest(".task-check")) return;
    const touch = event.changedTouches[0];
    startTaskDrag(card, touch.clientX, touch.clientY, "touch", touch.identifier);
  }, { passive: true });
  $("routine-list").addEventListener("touchmove", event => {
    const drag = taskDrag;
    if (!drag || drag.kind !== "touch") return;
    const touch = [...event.changedTouches].find(item => item.identifier === drag.id);
    if (!touch) return;
    updateTaskDrag(touch.clientX, touch.clientY);
    if (drag.active) event.preventDefault();
    else if (Math.abs(touch.clientY - drag.y) < 30) {
      const surface = drag.card.querySelector(".task-card");
      surface.classList.add("is-dragging");
      surface.style.transform = `translateX(${Math.min(0, Math.max(-120, touch.clientX - drag.x))}px)`;
    }
  }, { passive: false });
  $("routine-list").addEventListener("touchend", event => {
    const drag = taskDrag;
    if (!drag || drag.kind !== "touch") return;
    const touch = [...event.changedTouches].find(item => item.identifier === drag.id);
    if (!touch) return;
    if (drag.active) updateTaskDrag(touch.clientX, touch.clientY);
    const swipe = !drag.active && touch.clientX - drag.x < -75 && Math.abs(touch.clientY - drag.y) < 30;
    const id = drag.card.dataset.id;
    finishTaskDrag();
    if (swipe) {
      suppressTaskClickUntil = Date.now() + 600;
      toggleTask(id, true);
    }
  });
  $("routine-list").addEventListener("touchcancel", () => finishTaskDrag(true));
  $("routine-list").addEventListener("pointerdown", event => {
    if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0 || event.target.closest(".task-check")) return;
    const card = event.target.closest(".task-wrap");
    if (card) startTaskDrag(card, event.clientX, event.clientY, "mouse", event.pointerId);
  });
  window.addEventListener("pointermove", event => {
    const drag = taskDrag;
    if (!drag || drag.kind !== "mouse" || drag.id !== event.pointerId) return;
    updateTaskDrag(event.clientX, event.clientY);
    if (drag.active) event.preventDefault();
  });
  window.addEventListener("pointerup", event => {
    const drag = taskDrag;
    if (drag && drag.kind === "mouse" && drag.id === event.pointerId) finishTaskDrag();
  });
  window.addEventListener("pointercancel", event => {
    if (taskDrag?.kind === "mouse" && taskDrag.id === event.pointerId) finishTaskDrag(true);
  });
  window.addEventListener("blur", () => finishTaskDrag(true));

  $("add-task-button").addEventListener("click", () => openTaskDialog());
  $("task-group").addEventListener("change", () => {
    const isNew = !$("task-group").value;
    $("new-task-group").hidden = !isNew;
    $("new-task-group").required = isNew;
    $("new-task-group").setCustomValidity("");
    if (isNew) $("new-task-group").focus();
  });
  $("task-form").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("task-name").value.trim();
    const selectedGroup = $("task-group").value || $("new-task-group").value;
    const group = groupKey(selectedGroup) === groupKey("") ? "" : groupLabel(selectedGroup);
    if (!$("task-group").value && !$("new-task-group").value.trim()) {
      $("new-task-group").setCustomValidity("Enter a group name.");
      $("new-task-group").reportValidity();
      return;
    }
    if (!name) return;
    if (editingId) {
      const task = state.tasks.find(item => item.id === editingId);
      if (task) {
        const moved = groupKey(task.group) !== groupKey(group);
        Object.assign(task, { name, group, icon: selectedIcon });
        if (moved) state.tasks = insertTaskInGroup(state.tasks.filter(item => item.id !== task.id), task);
      }
    } else {
      if (state.tasks.length >= MAX_TASKS) return;
      state.tasks = insertTaskInGroup(state.tasks, { id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, group, icon: selectedIcon });
    }
    save();
    $("task-dialog").close();
    render();
  });
  $("new-task-group").addEventListener("input", () => $("new-task-group").setCustomValidity(""));
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
  $("quit-settings-button").addEventListener("click", () => {
    const settings = $("quit-settings");
    settings.hidden = !settings.hidden;
    $("quit-settings-button").setAttribute("aria-expanded", String(!settings.hidden));
    if (!settings.hidden) settings.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
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
      updateSmokeClock(Math.floor(currentSmokeRunMs(state) / 60000) !== lastSmokeMinute);
    }
  }, 1000);
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(error => console.error("Offline support could not be enabled.", error)));
  }
  initializeAutoSync();
  render();
  appInitialized = true;
  scheduleAutoSync(0);
  })();
