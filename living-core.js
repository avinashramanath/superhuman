(function (root) {
  "use strict";

  const MAX_DAY = 21;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  const smooth = value => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const reveal = (value, start, end) => smooth((value - start) / (end - start));

  function growthForDay(day) {
    if (!Number.isFinite(day)) throw new Error("The simulated day must be a number.");
    const d = clamp(day, 0, MAX_DAY);
    const growth = d / MAX_DAY;
    return {
      day: d, growth,
      coreRadius: mix(55, 70, growth),
      haloRadius: mix(100, 177, growth),
      haloOpacity: mix(0.18, 0.82, growth),
      glowOpacity: mix(0.45, 0.96, growth),
      facetOpacity: reveal(growth, 0.05, 0.75),
      orbitOpacity: mix(0.3, 0.78, growth),
      particleOpacity: mix(0.45, 0.95, growth),
      speed: mix(0.55, 1.15, growth)
    };
  }

  function visualDayForScore(score) {
    if (!Number.isFinite(score) || score < 0) throw new Error("Growth score must be a non-negative number.");
    return Math.min(score / 150, 1) * MAX_DAY;
  }

  function dateNumber(key) {
    if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
    const time = Date.parse(`${key}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === key ? time / 86400000 : null;
  }

  function buildTimeline(state, today) {
    const end = dateNumber(today);
    if (end === null) throw new Error("A valid local date is required for playback.");
    const completions = state.completions || {};
    const routines = state.routines || {};
    const dates = [...new Set([...Object.keys(completions), ...Object.keys(routines)])]
      .filter(key => dateNumber(key) !== null && dateNumber(key) <= end).sort();
    if (!dates.length) return { start: null, end, snapshots: [], incomplete: true };
    const start = dateNumber(dates[0]);
    let actions = 0, fullDays = 0, streak = 0, bestStreak = 0, lastFull = null;
    let incomplete = dates.length < end - start + 1;
    const snapshots = dates.map(date => {
      const current = dateNumber(date);
      const completed = Array.isArray(completions[date]) ? completions[date] : [];
      actions += completed.length;
      const routine = routines[date];
      if (completed.length && !Array.isArray(routine)) incomplete = true;
      const full = Array.isArray(routine) && routine.length > 0 && routine.every(id => completed.includes(id));
      if (full) {
        fullDays++;
        streak = lastFull === current - 1 ? streak + 1 : 1;
        bestStreak = Math.max(bestStreak, streak);
        lastFull = current;
      }
      return { date, day: current, actions, fullDays, bestStreak, score: actions + fullDays * 3 + bestStreak * 2 };
    });
    return { start, end, snapshots, incomplete };
  }

  function timelineAt(timeline, progress) {
    if (timeline.start === null) return null;
    const day = timeline.start + Math.floor((timeline.end - timeline.start) * clamp(progress, 0, 1));
    let low = 0, high = timeline.snapshots.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (timeline.snapshots[middle].day <= day) low = middle + 1;
      else high = middle;
    }
    return { day, number: day - timeline.start + 1, date: new Date(day * 86400000).toISOString().slice(0, 10),
      snapshot: low ? timeline.snapshots[low - 1] : null };
  }

  function taskPhase(elapsed) {
    if (elapsed < 650) return { phase: "arrival", progress: clamp(elapsed / 650, 0, 1) };
    if (elapsed < 900) return { phase: "absorption", progress: (elapsed - 650) / 250 };
    if (elapsed < 1400) return { phase: "pulse", progress: (elapsed - 900) / 500 };
    if (elapsed < 1850) return { phase: "expansion", progress: (elapsed - 1400) / 450 };
    return { phase: "settled", progress: 1 };
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  const center = 200;
  let rendererCount = 0;
  const point = (angle, radius) => [
    center + Math.cos(angle) * radius,
    center + Math.sin(angle) * radius
  ];
  const pointString = points => points.map(p => p.map(n => n.toFixed(2)).join(",")).join(" ");
  const set = (element, attributes) => {
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  };
  const element = (parent, tag, attributes = {}) => {
    const node = document.createElementNS(SVG_NS, tag);
    set(node, attributes);
    parent.appendChild(node);
    return node;
  };

  function createRenderer(svg) {
    const prefix = `living-core-${++rendererCount}`;
    const defs = element(svg, "defs");
    const gradient = (id, stops) => {
      const node = element(defs, "radialGradient", { id: `${prefix}-${id}` });
      for (const [offset, color, opacity] of stops) element(node, "stop", { offset, "stop-color": color, "stop-opacity": opacity });
    };
    gradient("living-halo", [["0%", "#a1faff", 0.65], ["24%", "#4acfff", 0.3], ["58%", "#287fdd", 0.14], ["100%", "#1564cd", 0]]);
    gradient("living-crystal", [["0%", "#d9ffff", 0.96], ["24%", "#7df6ff", 0.83], ["65%", "#248fca", 0.58], ["100%", "#133c89", 0.78]]);
    gradient("living-heart", [["0%", "#ffffff", 1], ["22%", "#e1ffff", 0.95], ["48%", "#72f6ff", 0.62], ["100%", "#3cdfff", 0]]);
    const halo = element(svg, "circle", { cx: center, cy: center, fill: `url(#${prefix}-living-halo)` });
    const waves = Array.from({ length: 3 }, () => element(svg, "circle", {
      cx: center, cy: center, fill: "none", stroke: "#74eaff", "stroke-width": 0.8
    }));
    const orbitGroups = Array.from({ length: 4 }, (_, i) => {
      const group = element(svg, "g");
      element(group, "ellipse", { cx: center, cy: center, rx: 137 + i * 7, ry: 47 + i * 11,
        fill: "none", stroke: i % 2 ? "#72bbff" : "#6aeaff", "stroke-width": i ? 0.9 : 1.25 });
      return group;
    });
    const streams = Array.from({ length: 8 }, () => element(svg, "line", {
      stroke: "#80ecff", "stroke-width": 1, "stroke-linecap": "round"
    }));
    const fragments = Array.from({ length: 8 }, (_, i) => element(svg, "polygon", {
      fill: i % 2 ? "#78d8ff" : "#c0fbff", stroke: "#d8ffff", "stroke-width": 0.65
    }));
    const particles = Array.from({ length: 22 }, (_, i) => element(svg, "circle", {
      r: i % 5 === 0 ? 3.4 : 2 + (i % 3) * 0.5,
      fill: i % 3 === 0 ? "#efffff" : "#91eaff"
    }));
    const petals = Array.from({ length: 12 }, (_, i) => element(svg, "polygon", {
      fill: i % 2 ? "#50caff" : "#a8f4ff", stroke: "#a6f6ff", "stroke-width": 1.1
    }));
    const outerFrame = element(svg, "polygon", { fill: "none", stroke: "#b1f8ff", "stroke-width": 1.1 });
    const shell = element(svg, "polygon", { fill: `url(#${prefix}-living-crystal)`, stroke: "#b9fbff", "stroke-width": 1.5 });
    const facets = Array.from({ length: 6 }, (_, i) => element(svg, "polygon", {
      fill: i % 2 ? "#b3fbff" : "#1d86cb", "fill-opacity": i % 2 ? 0.17 : 0.24,
      stroke: "#b8fbff", "stroke-opacity": 0.55, "stroke-width": 0.8
    }));
    const innerFacets = Array.from({ length: 18 }, (_, i) => element(svg, "polygon", {
      fill: i % 3 === 0 ? "#e4ffff" : i % 3 === 1 ? "#62e9ff" : "#297fe3",
      stroke: "#c5ffff", "stroke-width": 0.65
    }));
    const shellDetail = element(svg, "polygon", { fill: "none", stroke: "#9ff9ff", "stroke-width": 1 });
    const heartGlow = element(svg, "circle", { cx: center, cy: center, r: 32, fill: `url(#${prefix}-living-heart)` });
    const heart = element(svg, "circle", { cx: center, cy: center, fill: "#f5ffff" });
    const incomingTrail = element(svg, "line", { "data-effect": "task-trail", stroke: "#9dfbff", "stroke-width": 1.5, "stroke-linecap": "round", opacity: 0 });
    const incoming = element(svg, "circle", { "data-effect": "task-arrival", r: 4, fill: "#f1ffff", opacity: 0 });
    const pulse = element(svg, "circle", { "data-effect": "task-pulse", cx: center, cy: center, fill: "none", stroke: "#c4ffff", "stroke-width": 2, opacity: 0 });
    let current = growthForDay(0);

    function renderGrowth(day) {
      current = growthForDay(day);
      const g = current.growth;
      set(halo, { r: current.haloRadius, opacity: current.haloOpacity });
      waves.forEach((wave, i) => set(wave, {
        r: mix(83 + i * 12, 118 + i * 22, g),
        opacity: (0.05 + reveal(g, i * 0.2, i * 0.2 + 0.5) * 0.24).toFixed(3)
      }));
      orbitGroups.forEach((orbit, i) => orbit.setAttribute("opacity",
        (i === 0 ? current.orbitOpacity : current.orbitOpacity * reveal(g, (i - 1) * 0.17, (i - 1) * 0.17 + 0.36)).toFixed(3)));
      const corners = Array.from({ length: 6 }, (_, i) => point(-Math.PI / 2 + i * Math.PI / 3, current.coreRadius));
      petals.forEach((petal, i) => {
        const side = Math.floor(i / 2);
        const angle = -Math.PI / 2 + side * Math.PI / 3;
        const adjacent = angle + Math.PI / 3;
        const midpoint = angle + Math.PI / 6;
        const tip = point(midpoint, current.coreRadius * mix(0.84, 1.7, g));
        const anchor = i % 2 ? point(adjacent, current.coreRadius * 0.84) : point(angle, current.coreRadius * 0.84);
        const inner = point(midpoint, current.coreRadius * mix(0.7, 0.84, g));
        petal.setAttribute("points", pointString([anchor, tip, inner]));
        petal.setAttribute("fill-opacity", (reveal(g, 0.08, 0.65) * (i % 2 ? 0.22 : 0.13)).toFixed(3));
        petal.setAttribute("stroke-opacity", (reveal(g, 0.1, 0.7) * 0.65).toFixed(3));
      });
      outerFrame.setAttribute("points", pointString(Array.from({ length: 6 }, (_, i) =>
        point(-Math.PI / 3 + i * Math.PI / 3, current.coreRadius * mix(0.82, 1.7, g)))));
      outerFrame.setAttribute("opacity", (reveal(g, 0.28, 0.85) * 0.45).toFixed(3));
      shell.setAttribute("points", pointString(corners));
      facets.forEach((facet, i) => facet.setAttribute("points", pointString([[center, center], corners[i], corners[(i + 1) % 6]])));
      innerFacets.forEach((facet, i) => {
        const side = i % 6;
        const band = Math.floor(i / 6);
        const a = -Math.PI / 2 + side * Math.PI / 3;
        const b = a + Math.PI / 3;
        const inner = mix(0.16, 0.38 + band * 0.08, g) * current.coreRadius;
        const outer = mix(0.48, 0.72 + band * 0.07, g) * current.coreRadius;
        facet.setAttribute("points", pointString([point(a, inner), point(a, outer), point(b, outer)]));
        facet.setAttribute("fill-opacity", (current.facetOpacity * (0.10 + band * 0.025)).toFixed(3));
        facet.setAttribute("stroke-opacity", (current.facetOpacity * (0.32 - band * 0.06)).toFixed(3));
      });
      shellDetail.setAttribute("points", pointString(Array.from({ length: 6 }, (_, i) =>
        point(-Math.PI / 2 + i * Math.PI / 3, current.coreRadius * mix(0.56, 1.25, g)))));
      shellDetail.setAttribute("opacity", (0.07 + reveal(g, 0.15, 0.85) * 0.45).toFixed(3));
      heartGlow.setAttribute("opacity", current.glowOpacity.toFixed(3));
      heart.setAttribute("r", mix(4.5, 7.5, g).toFixed(2));
    }

    function renderMotion(seconds, feedback) {
      const g = current.growth;
      orbitGroups.forEach((orbit, i) => orbit.setAttribute("transform",
        `rotate(${(i * 43 + seconds * current.speed * (i % 2 ? -3.2 : 4)).toFixed(2)} ${center} ${center})`));
      particles.forEach((particle, i) => {
        const angle = i * 2.399963 + seconds * current.speed * (i % 2 ? -0.22 : 0.18);
        const radius = 92 + (i % 6) * 14 + Math.sin(seconds * 0.7 + i) * 5;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius * (0.55 + (i % 3) * 0.13);
        const visible = i < 3 ? 1 : reveal(g, (i - 3) / 25, (i - 3) / 25 + 0.2);
        set(particle, { cx: x.toFixed(2), cy: y.toFixed(2), opacity: (current.particleOpacity * visible).toFixed(3) });
        if (i < streams.length) {
          const start = point(angle, current.coreRadius * 0.85);
          set(streams[i], { x1: start[0].toFixed(2), y1: start[1].toFixed(2), x2: x.toFixed(2), y2: y.toFixed(2),
            opacity: (0.28 * reveal(g, i * 0.085, i * 0.085 + 0.32)).toFixed(3) });
        }
      });
      fragments.forEach((fragment, i) => {
        const angle = i * Math.PI / 4 + seconds * (i % 2 ? -0.05 : 0.07);
        const [x, y] = point(angle, 105 + i % 3 * 18);
        const size = 3 + (i % 3);
        fragment.setAttribute("points", pointString([[x, y - size * 1.7], [x + size, y], [x, y + size * 1.7], [x - size, y]]));
        fragment.setAttribute("opacity", (0.7 * reveal(g, i * 0.08, i * 0.08 + 0.3)).toFixed(3));
      });
      set(incoming, { opacity: 0 });
      set(incomingTrail, { opacity: 0 });
      set(pulse, { opacity: 0 });
      if (!feedback) return;
      if (feedback.phase === "arrival") {
        const t = smooth(feedback.progress);
        const x = mix(338, center, t);
        const y = mix(116, center, t);
        set(incoming, { cx: x.toFixed(2), cy: y.toFixed(2), r: 4, opacity: 1 });
        set(incomingTrail, { x1: x.toFixed(2), y1: y.toFixed(2),
          x2: mix(x, 338, 0.16).toFixed(2), y2: mix(y, 116, 0.16).toFixed(2), opacity: 0.65 });
      } else if (feedback.phase === "absorption") {
        set(incoming, { cx: center, cy: center, r: mix(5, 9, feedback.progress), opacity: 1 - feedback.progress });
      } else if (feedback.phase === "pulse") {
        set(pulse, { r: mix(8, current.coreRadius * 1.2, feedback.progress), opacity: 1 - feedback.progress });
      } else if (feedback.phase === "expansion") {
        set(pulse, { r: mix(current.coreRadius * 1.2, current.haloRadius * 0.95, feedback.progress),
          opacity: 0.65 * (1 - feedback.progress) });
      }
    }
    return { renderGrowth, renderMotion };
  }

  function createController(svg) {
    const renderer = createRenderer(svg);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let active = false, frame = null, last = null, seconds = 0, day = 0, animation = null;

    function tick(timestamp) {
      frame = null;
      const delta = last === null ? 0 : Math.min(timestamp - last, 50);
      last = timestamp;
      seconds += delta / 1000;
      let feedback = null;
      if (animation) {
        animation.elapsed += delta;
        feedback = taskPhase(animation.elapsed);
        if (feedback.phase === "expansion") {
          renderer.renderGrowth(mix(animation.from, day, smooth(feedback.progress)));
        } else if (feedback.phase === "settled") {
          animation = null;
          renderer.renderGrowth(day);
          feedback = null;
        }
      }
      renderer.renderMotion(seconds, feedback);
      if (active && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
    }

    function updateMotion() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      last = null;
      if (motion.matches || !active) {
        animation = null;
        renderer.renderGrowth(day);
      }
      renderer.renderMotion(seconds, null);
      if (active && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
    }

    document.addEventListener("visibilitychange", updateMotion);
    motion.addEventListener("change", updateMotion);
    renderer.renderGrowth(day);
    renderer.renderMotion(0, null);
    return {
      setDay(next) {
        const updated = growthForDay(next).day;
        if (animation && updated === day) return;
        day = updated;
        animation = null;
        renderer.renderGrowth(day);
        if (!active || motion.matches) renderer.renderMotion(seconds, null);
      },
      celebrate(from, target) {
        day = growthForDay(target).day;
        if (!active || motion.matches) {
          renderer.renderGrowth(day);
          renderer.renderMotion(seconds, null);
          return;
        }
        animation = { from: growthForDay(from).day, elapsed: 0 };
        renderer.renderGrowth(animation.from);
      },
      setActive(next) {
        if (active === next) return;
        active = next;
        updateMotion();
      },
      dispose() {
        active = false;
        updateMotion();
        document.removeEventListener("visibilitychange", updateMotion);
        motion.removeEventListener("change", updateMotion);
      }
    };
  }

  const api = { MAX_DAY, growthForDay, visualDayForScore, buildTimeline, timelineAt, taskPhase, createController };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SuperhumanLivingCore = api;
})(globalThis);
