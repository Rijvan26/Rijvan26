/*
 * universe.js: the contribution "universe" card, a 3D terrain of the contribution calendar with the top repos orbiting it.
 * Ported from Git3D Universe v1.2.1 (MIT, Copyright (c) 2026 Sandeep Komal Pothu; repository SandeepKomal/Git3D-Universe)
 * and reworked to fit this project:
 *  - two colour styles: "neon" is Git3D's own radium palettes (aurora at night, daylight by day), "theme" derives every
 *    colour from the profile's theme so the universe follows the chosen template;
 *  - all motion is CSS (orbits, the near/far layer swap, the planets swelling as they come closer), so a still picture
 *    and prefers-reduced-motion show the same scene, and the animated file only adds classes and keyframes;
 *  - the data comes from the same model as every other card (no extra token or workflow), shorter windows get bigger
 *    cells, and there is no date stamp so a quiet day changes nothing.
 * ReadmeUniverse.buildUniverse({ name, login, weeks: [[{ date, count }]], repos: [{ name, stars }] }, palette, { animate, style })
 */
(function (root, factory) {
  var core = (typeof module === "object" && module.exports) ? require("./core.js") : root.ReadmeCore;
  var api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ReadmeUniverse = api;
})(typeof self !== "undefined" ? self : this, function (core) {
  "use strict";

  // The terrain is the hero: it runs corner to corner, rising from bottom-left to top-right, and the two cards sit in
  // the empty corners it leaves.
  var W = 1280, H = 760, CX = 640, CY = 452;
  var YAW = -24, PITCH = 50, PLATE_PAD = 14, PLATE_DEPTH = 30, MAX_BAR = 290;
  var RINGS = [440, 515, 590], FLAT = 0.2;
  var SANS = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Inter,Helvetica,Arial,sans-serif";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var mix = core.mixHex;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]; });
  }
  function r1(n) { return Math.round(n * 10) / 10; }

  /** Brightens (k > 1) or darkens (k < 1) a colour, for the lit and shaded faces of a bar. */
  function shade(hex, k) {
    var ch = [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); });
    return "#" + ch.map(function (v) {
      var o = k >= 1 ? v + (255 - v) * (k - 1) : v * k;
      return ("0" + Math.max(0, Math.min(255, Math.round(o))).toString(16)).slice(-2);
    }).join("");
  }

  /* ---------- colours ---------- */
  // Git3D Universe's radium (neon) palettes, as released in v1.2.
  var NEON = {
    dark: {
      dark: true, bgInner: "#0e0b22", bgMid: "#07061a", bgOuter: "#030308",
      plateTop: "#0d0b20", plateEdge: "#3a2b8f", plateSide: "#070614",
      ramp: ["#16133a", "#00b7ff", "#39ff14", "#bc13fe", "#ff10f0"], peak: "#e6ff00",
      ink: "#f2f4ff", mute: "#a6abcf", rule: "#241f4f", ring: "#00b7ff", ringHi: "#d9f7ff", glow: "#ff10f0",
      cellEdge: "#4b3fb0", nebulaA: "#ff10f0", nebulaB: "#00b7ff", grid: "#2a2470",
      planets: ["#ff10f0", "#39ff14", "#00b7ff", "#e6ff00", "#bc13fe", "#00fff0", "#ff7a00"],
      floor: ["#141137", "#161642", "#141b44", "#18143f", "#1e1242", "#141137"],
      shadow: "#000000", neonEdges: true, stars: true
    },
    light: {
      dark: false, bgInner: "#ffffff", bgMid: "#f5f6fc", bgOuter: "#e9ebf5",
      plateTop: "#eceefa", plateEdge: "#c4c9e6", plateSide: "#d5d9ef",
      ramp: ["#e2e5f5", "#0091ff", "#1fc700", "#a100ff", "#ff00b8"], peak: "#ff6a00",
      ink: "#141433", mute: "#5d6285", rule: "#d9dcef", ring: "#0091ff", ringHi: "#ffffff", glow: "#ff00b8",
      cellEdge: "#c3c8e6", nebulaA: "#ffd1f3", nebulaB: "#cfe8ff", grid: "#cdd2ec",
      planets: ["#ff00b8", "#1fc700", "#0091ff", "#ff6a00", "#a100ff", "#00b8c7", "#e0b800"],
      floor: ["#e6e9fa", "#e3effb", "#e1f6f0", "#ece6fa", "#f8e6f4", "#e6e9fa"],
      shadow: "#7d84b3", neonEdges: false, stars: false
    }
  };

  /** The same colour tokens, derived from the profile palette so the universe matches whatever theme is chosen. */
  function themeTokens(p) {
    var L = p.light, b = p.bg1, ink = p.ink, a1 = p.a1, a2 = p.a2;
    return {
      dark: !L,
      bgOuter: b, bgMid: p.native ? b : mix(b, p.bg2, 0.6), bgInner: p.native ? b : p.bg2,
      plateTop: mix(b, ink, L ? 0.05 : 0.07), plateEdge: mix(b, a1, L ? 0.4 : 0.45), plateSide: L ? mix(b, ink, 0.14) : mix(b, "#000000", 0.35),
      ramp: L ? [mix(b, ink, 0.09), mix(b, a1, 0.35), mix(b, a1, 0.65), a1, a2]
              : [mix(b, ink, 0.12), mix(b, a1, 0.4), a1, mix(a1, a2, 0.5), a2],
      peak: L ? mix(a2, "#000000", 0.15) : mix(a2, "#ffffff", 0.45),
      ink: ink, mute: mix(b, ink, 0.62), rule: mix(b, ink, 0.14),
      ring: a1, ringHi: L ? "#ffffff" : mix(a1, "#ffffff", 0.7), glow: a1,
      cellEdge: mix(b, L ? ink : a1, L ? 0.22 : 0.45),
      nebulaA: L ? mix(b, a2, 0.3) : a2, nebulaB: L ? mix(b, a1, 0.3) : a1, grid: mix(b, L ? ink : a1, L ? 0.12 : 0.3),
      planets: [a2, a1, mix(a1, a2, 0.5), mix(a1, L ? "#000000" : "#ffffff", 0.3), mix(a2, L ? "#000000" : "#ffffff", 0.3), mix(a1, "#000000", 0.25), mix(a2, "#000000", 0.25)],
      floor: [0, 1, 2, 1, 0].map(function (k) { return mix(b, [ink, a1, a2][k], L ? (k ? 0.1 : 0.07) : (k ? 0.14 : 0.1)); }),
      shadow: L ? mix(b, ink, 0.45) : "#000000", neonEdges: false, stars: !L
    };
  }

  /** Colour tokens for a style ("neon" or "theme"), plus the frame that sits the card on the README page. */
  function tokens(p, style) {
    var t = style === "theme" ? themeTokens(p) : Object.assign({}, NEON[p.light ? "light" : "dark"]);
    t.line = p.native ? p.line : mix(t.bgOuter, t.ink, 0.18);
    t.radius = p.native ? 12 : 18;
    return t;
  }

  /* ---------- numbers ---------- */
  function stats(weeks) {
    var days = [].concat.apply([], weeks), longest = 0, run = 0, peak = { date: null, count: 0 };
    days.forEach(function (d) {
      if (d.count > 0) { run++; if (run > longest) longest = run; } else run = 0;
      if (d.count > peak.count) peak = d;
    });
    var cur = 0, i = days.length - 1;
    if (i >= 0 && days[i].count === 0) i--;               // today may simply not have happened yet
    for (; i >= 0 && days[i].count > 0; i--) cur++;
    return {
      total: days.reduce(function (n, d) { return n + d.count; }, 0),
      active: days.filter(function (d) { return d.count > 0; }).length,
      current: cur, longest: longest, peak: peak, max: peak.count, days: days.length,
      weekly: weeks.map(function (w) { return w.reduce(function (n, d) { return n + d.count; }, 0); })
    };
  }
  /** A day's colour level (0 to 4) relative to the busiest day. */
  function levelOf(count, max) {
    if (count <= 0 || max <= 0) return 0;
    var r = count / max;
    return r < 0.2 ? 1 : r < 0.45 ? 2 : r < 0.75 ? 3 : 4;
  }
  /** A day's colour level from the quartiles of the active days, so one very busy day doesn't flatten all the others. */
  function levelByRank(count, q) {
    if (count <= 0) return 0;
    return count <= q[0] ? 1 : count <= q[1] ? 2 : count <= q[2] ? 3 : 4;
  }
  function quartiles(days) {
    var c = days.map(function (d) { return d.count; }).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; });
    function at(q) { return c.length ? c[Math.min(c.length - 1, Math.floor(q * c.length))] : 0; }
    return [at(0.25), at(0.5), at(0.75)];
  }

  /* ---------- 3D: rotate around the vertical axis, tilt toward the viewer, project to 2D ---------- */
  function projector(cx, cy) {
    var yaw = YAW * Math.PI / 180, pitch = PITCH * Math.PI / 180;
    var cyw = Math.cos(yaw), syw = Math.sin(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
    function project(u, v, h) {
      var x = u * cyw - v * syw, depth = u * syw + v * cyw;
      return { x: cx + x, y: cy + depth * sp - (h || 0) * cp, depth: depth };
    }
    project.facing = function (nu, nv) { return nu * syw + nv * cyw; };
    return project;
  }
  var LIGHT = (function () { var l = [-0.45, 0.9], n = Math.hypot(l[0], l[1]); return [l[0] / n, l[1] / n]; })();
  function prismFaces(P, u, v, size, height) {
    var u1 = u + size, v1 = v + size, faces = [];
    [
      { n: [0, 1], pts: [P(u, v1, 0), P(u1, v1, 0), P(u1, v1, height), P(u, v1, height)] },
      { n: [1, 0], pts: [P(u1, v, 0), P(u1, v1, 0), P(u1, v1, height), P(u1, v, height)] },
      { n: [-1, 0], pts: [P(u, v, 0), P(u, v1, 0), P(u, v1, height), P(u, v, height)] },
      { n: [0, -1], pts: [P(u, v, 0), P(u1, v, 0), P(u1, v, height), P(u, v, height)] }
    ].forEach(function (s) {
      if (P.facing(s.n[0], s.n[1]) <= 0) return;
      var lit = Math.max(0, s.n[0] * LIGHT[0] + s.n[1] * LIGHT[1]);
      faces.push({ pts: s.pts, shade: 0.42 + 0.45 * lit });
    });
    faces.push({ pts: [P(u, v, height), P(u1, v, height), P(u1, v1, height), P(u, v1, height)], shade: 1.16, top: true });
    return faces;
  }
  function pts(list) { return list.map(function (q) { return r1(q.x) + "," + r1(q.y); }).join(" "); }
  function poly(list, fill, extra) { return '<polygon points="' + pts(list) + '" fill="' + fill + '"' + (extra || "") + "/>"; }

  function lcg(seed) {
    return function () { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  }
  function hashName(name) {
    var h = 2166136261, s = String(name);
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  /** "2026-06-03" -> "Jun 3" */
  function shortDate(iso) {
    var m = String(iso).split("-").map(Number);
    return m[1] >= 1 && m[1] <= 12 && m[2] ? MONTHS[m[1] - 1] + " " + m[2] : String(iso);
  }
  /** Colour of the floor band at position f (0..1) through the year. */
  function floorAt(stops, f) {
    var x = Math.max(0, Math.min(1, f)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x));
    return mix(stops[i], stops[i + 1], x - i);
  }

  /* ---------- backdrop ---------- */
  function starfield() {
    var rand = lcg(99), out = "";
    for (var i = 0; i < 150; i++) {
      var big = rand() < 0.08;
      out += '<circle cx="' + r1(rand() * W) + '" cy="' + r1(rand() * H) + '" r="' + (big ? 1.4 : 0.7) + '" fill="#fff" opacity="' + r1(0.12 + rand() * 0.45) + '"/>';
    }
    return out;
  }
  function nebula() {
    return '<ellipse cx="' + W * 0.8 + '" cy="' + H * 0.2 + '" rx="420" ry="220" fill="url(#unebA)"/><ellipse cx="' + W * 0.28 + '" cy="' + H * 0.82 + '" rx="460" ry="200" fill="url(#unebB)"/>';
  }
  /** A ground-plane grid around the plate, faded out radially. */
  function floorGrid(weekCount, cell, P, t) {
    var halfU = weekCount * cell / 2 + 260, halfV = 7 * cell / 2 + 300, step = cell * 2, h = -PLATE_DEPTH, d = "", u, v, a, b;
    for (u = -Math.floor(halfU / step) * step; u <= halfU; u += step) { a = P(u, -halfV, h); b = P(u, halfV, h); d += "M" + r1(a.x) + "," + r1(a.y) + "L" + r1(b.x) + "," + r1(b.y); }
    for (v = -Math.floor(halfV / step) * step; v <= halfV; v += step) { a = P(-halfU, v, h); b = P(halfU, v, h); d += "M" + r1(a.x) + "," + r1(a.y) + "L" + r1(b.x) + "," + r1(b.y); }
    return '<path d="' + d + '" fill="none" stroke="' + t.grid + '" stroke-width=".6" opacity="' + (t.dark ? ".55" : ".5") + '" mask="url(#ugridMask)"/>';
  }

  /* ---------- terrain ---------- */
  function terrain(weeks, st, t, P, cell) {
    var gap = cell * 3.4 / 22, size = cell - gap, n = weeks.length;
    var u0 = -n * cell / 2, v0 = -7 * cell / 2, cells = [], bars = "", peakTop = null, jitter = lcg(7);
    var q = quartiles([].concat.apply([], weeks).filter(Boolean));
    // bigger cells (a shorter window) sit closer to the cards, so their bars stay lower to keep clear of them
    var maxBar = MAX_BAR * Math.min(1, Math.pow(22 / cell, 0.75));
    weeks.forEach(function (week, i) {
      week.forEach(function (day, j) {
        if (!day) return;                                   // padding before the first day
        var u = u0 + i * cell + gap / 2, v = v0 + j * cell + gap / 2;
        cells.push({ u: u, v: v, day: day, week: i, row: j, depth: P(u, v, 0).depth });
      });
    });
    cells.sort(function (a, b) { return a.depth - b.depth; });
    cells.forEach(function (c) {
      var u = c.u, v = c.v, day = c.day, isPeak = st.peak.date === day.date && day.count > 0;
      if (day.count === 0) {
        // empty days take the floor band, with a little per-cell variation for texture
        var band = floorAt(t.floor, (c.week + c.row / 7) / Math.max(1, n - 1));
        bars += poly([P(u, v), P(u + size, v), P(u + size, v + size), P(u, v + size)], shade(band, t.dark ? 0.9 + jitter() * 0.2 : 0.97 + jitter() * 0.06),
          ' opacity="' + (t.dark ? ".9" : ".95") + '" stroke="' + t.cellEdge + '" stroke-width=".6" stroke-opacity="' + (t.dark ? ".7" : ".55") + '"');
        return;
      }
      var base = isPeak ? t.peak : t.ramp[levelByRank(day.count, q)];
      var height = 6 + Math.pow(day.count / st.max, 0.6) * maxBar;
      prismFaces(P, u, v, size, height).forEach(function (f) {
        var edge = !f.top ? "" : t.neonEdges
          ? ' stroke="' + mix(base, "#ffffff", 0.45) + '" stroke-width="1" stroke-opacity=".95"'       // a neon tube around each bar top
          : ' stroke="' + t.cellEdge + '" stroke-width=".6" stroke-opacity=".62"';
        bars += poly(f.pts, shade(base, f.shade), edge + (f.top && isPeak ? ' filter="url(#uglow)"' : ""));
      });
      if (isPeak) peakTop = P(u + size / 2, v + size / 2, height);
    });

    // the plate is a slab under the calendar; only the faces turned toward the viewer are drawn
    var U0 = u0 - PLATE_PAD, U1 = -u0 + PLATE_PAD, V0 = v0 - PLATE_PAD, V1 = -v0 + PLATE_PAD;
    var top = [P(U0, V0), P(U1, V0), P(U1, V1), P(U0, V1)];
    var bottom = [P(U0, V0, -PLATE_DEPTH), P(U1, V0, -PLATE_DEPTH), P(U1, V1, -PLATE_DEPTH), P(U0, V1, -PLATE_DEPTH)];
    var sides = [
      { n: [0, 1], i: [3, 2], k: 1 }, { n: [-1, 0], i: [0, 3], k: 0.8 }, { n: [1, 0], i: [2, 1], k: 0.8 }, { n: [0, -1], i: [1, 0], k: 1 }
    ].filter(function (s) { return P.facing(s.n[0], s.n[1]) > 0; }).map(function (s) {
      return poly([top[s.i[0]], top[s.i[1]], bottom[s.i[1]], bottom[s.i[0]]], shade(t.plateSide, s.k));
    }).join("");
    var plate =
      '<polygon points="' + pts(bottom.map(function (q) { return { x: q.x + 6, y: q.y + 22 }; })) + '" fill="' + t.shadow + '" opacity="' + (t.dark ? ".75" : ".35") + '" filter="url(#usoft)"/>' +
      sides +
      '<polygon points="' + pts(top) + '" fill="url(#uplate)" stroke="' + t.plateEdge + '" stroke-width="1"/>' +
      '<polyline points="' + pts([top[0], top[3], top[2]]) + '" fill="none" stroke="url(#urim)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';

    // month ticks along the front edge, below the slab
    var months = "", prev = -1;
    weeks.forEach(function (week, i) {
      var first = week.filter(Boolean)[0], m = first ? Number(String(first.date).slice(5, 7)) : 0;
      if (!m || m === prev) return;
      var leading = prev === -1;
      prev = m;
      if (leading && Number(String(first.date).slice(8, 10)) > 14) return;     // a partial first month
      var a = P(u0 + i * cell, V1, -PLATE_DEPTH);
      months += '<line x1="' + r1(a.x) + '" y1="' + r1(a.y + 4) + '" x2="' + r1(a.x) + '" y2="' + r1(a.y + 10) + '" stroke="' + t.mute + '" stroke-opacity=".6"/>' +
        '<text x="' + r1(a.x) + '" y="' + r1(a.y + 24) + '" text-anchor="middle" font-size="12" letter-spacing=".4" fill="' + t.mute + '">' + MONTHS[m - 1] + "</text>";
    });
    return { plate: plate, bars: bars, months: months, peakTop: peakTop };
  }

  /** A light beam rising from the busiest day, with a callout at its tip. */
  function beacon(peakTop, st, t) {
    if (!peakTop) return "";
    // the callout stays clear of the top-left card when the busiest day sits under it
    var x = r1(peakTop.x), y0 = r1(peakTop.y - 2), y1 = r1(Math.max(peakTop.x < 520 ? Math.min(302, peakTop.y - 24) : 44, peakTop.y - 64));
    var label = shortDate(st.peak.date) + " · " + st.max, w = 26 + label.length * 6.4;
    return "<g>" +
      '<linearGradient id="ubeam" gradientUnits="userSpaceOnUse" x1="0" y1="' + y0 + '" x2="0" y2="' + y1 + '"><stop offset="0" stop-color="' + t.peak + '" stop-opacity=".95"/><stop offset="1" stop-color="' + t.peak + '" stop-opacity="0"/></linearGradient>' +
      '<line x1="' + x + '" y1="' + y0 + '" x2="' + x + '" y2="' + y1 + '" stroke="url(#ubeam)" stroke-width="7" opacity=".25"/>' +
      '<line x1="' + x + '" y1="' + y0 + '" x2="' + x + '" y2="' + y1 + '" stroke="url(#ubeam)" stroke-width="1.5"/>' +
      '<rect x="' + r1(x - 11) + '" y="' + r1(y1 - 22) + '" width="' + r1(w) + '" height="20" rx="10" fill="' + t.bgOuter + '" fill-opacity=".72" stroke="' + t.peak + '" stroke-opacity=".55"/>' +
      '<circle cx="' + x + '" cy="' + r1(y1 - 12) + '" r="3" fill="' + t.peak + '"/>' +
      '<text x="' + r1(x + 8) + '" y="' + r1(y1 - 8) + '" font-size="11" font-weight="600" fill="' + t.ink + '">' + esc(label) + "</text></g>";
  }

  /* ---------- planets ---------- */
  /**
   * A lit sphere: a gradient with a highlight toward the scene light, tilted cloud bands and a storm spot clipped to the
   * disc, a terminator shadow, a specular glint and an atmosphere rim; the lead planet also gets a banded ring that
   * passes behind and in front of the body. Returns the defs once and the body to draw (each planet is drawn twice).
   */
  function sphere(i, r, color, seed, ringed, t) {
    var rand = lcg(seed % 100000 + 1), id = "upl" + i, light = mix(color, "#ffffff", 0.55);
    var defs = '<radialGradient id="' + id + 'b" cx="50%" cy="50%" r="50%" fx="33%" fy="30%">' +
      '<stop offset="0" stop-color="' + light + '"/><stop offset=".28" stop-color="' + shade(color, 1.12) + '"/>' +
      '<stop offset=".62" stop-color="' + color + '"/><stop offset=".88" stop-color="' + shade(color, 0.42) + '"/>' +
      '<stop offset="1" stop-color="' + shade(color, 0.2) + '"/></radialGradient>' +
      '<radialGradient id="' + id + 'a" r="50%"><stop offset=".7" stop-color="' + color + '" stop-opacity="0"/>' +
      '<stop offset=".79" stop-color="' + shade(color, 1.3) + '" stop-opacity="' + (t.neonEdges ? 0.7 : 0.38) + '"/><stop offset=".88" stop-color="' + color + '" stop-opacity="' + (t.neonEdges ? 0.28 : 0.1) + '"/>' +
      '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="' + id + 'c"><circle r="' + r1(r) + '"/></clipPath>';

    var tilt = -14 + rand() * 10, bands = "", n = 3 + Math.floor(rand() * 3);
    for (var k = 0; k < n; k++) {
      var y = r1(-r + ((k + 0.5) * 2 * r) / n + (rand() - 0.5) * r * 0.2), h = r1(r * (0.1 + rand() * 0.16));
      bands += '<ellipse cx="0" cy="' + y + '" rx="' + r1(r * 1.5) + '" ry="' + h + '" fill="' + (k % 2 ? shade(color, 0.62) : mix(color, "#ffffff", 0.35)) + '" opacity="' + r1(0.18 + rand() * 0.16) + '"/>';
    }
    var spotY = r1((rand() - 0.5) * r * 0.9);
    var spot = '<ellipse cx="' + r1((rand() - 0.5) * r) + '" cy="' + spotY + '" rx="' + r1(r * 0.26) + '" ry="' + r1(r * 0.12) + '" fill="' + shade(color, 0.55) + '" opacity=".45"/>';
    function arc(rx, ry, sweep, width, op, tone) {
      return '<path d="M' + r1(-rx) + ',0 A' + r1(rx) + "," + r1(ry) + " 0 0," + sweep + " " + r1(rx) + ',0" fill="none" stroke="' + tone + '" stroke-opacity="' + op + '" stroke-width="' + width + '"/>';
    }
    function ringSet(sweep, f) {
      return '<g transform="rotate(-18)">' +
        arc(r * 1.55, r * 0.36, sweep, r1(r * 0.16), r1(0.55 * f), mix(color, "#ffffff", 0.4)) +
        arc(r * 1.85, r * 0.43, sweep, r1(r * 0.2), r1(0.75 * f), shade(color, 1.2)) +
        arc(r * 2.15, r * 0.5, sweep, r1(r * 0.08), r1(0.45 * f), mix(color, "#ffffff", 0.6)) + "</g>";
    }
    var body =
      '<circle r="' + r1(r * 1.28) + '" fill="url(#' + id + 'a)"/>' +
      (ringed ? ringSet(1, 0.75) : "") +
      '<circle r="' + r1(r) + '" fill="url(#' + id + 'b)"/>' +
      '<g clip-path="url(#' + id + 'c)"><g transform="rotate(' + r1(tilt) + ')">' + bands + spot + "</g>" +
      (ringed ? '<ellipse cx="0" cy="' + r1(r * 0.18) + '" rx="' + r1(r * 1.9) + '" ry="' + r1(r * 0.12) + '" fill="#000" opacity=".28" transform="rotate(-18)"/>' : "") +
      "</g>" +
      '<circle r="' + r1(r) + '" fill="url(#uplTerm)"/>' +
      '<ellipse cx="' + r1(-r * 0.36) + '" cy="' + r1(-r * 0.42) + '" rx="' + r1(r * 0.3) + '" ry="' + r1(r * 0.17) + '" fill="url(#uplSpec)" transform="rotate(-38 ' + r1(-r * 0.36) + " " + r1(-r * 0.42) + ')"/>' +
      '<path d="M' + r1(r * Math.cos(3.5)) + "," + r1(r * Math.sin(3.5)) + " A" + r1(r) + "," + r1(r) + " 0 0,1 " + r1(r * Math.cos(5.1)) + "," + r1(r * Math.sin(5.1)) + '" fill="none" stroke="#ffffff" stroke-opacity=".3" stroke-width=".7" stroke-linecap="round"/>' +
      (ringed ? ringSet(0, 1) : "");
    return { defs: defs, body: body };
  }

  /**
   * Planets orbit in a plane that passes behind the terrain on its far side and in front of it on its near side. Each
   * ring is split into a far and a near arc, and each planet is drawn twice, once per layer: exactly one copy is visible
   * at a time, so a planet and its name switch layers together and are never cut in two (Git3D v1.2.1). Only the near
   * copy carries the name.
   *
   * The ellipse is a circle squashed by scale(1 FLAT): the planet's group turns around the centre, then turns back by the
   * same angle and is un-squashed, so the planet stays upright and round. The still picture is the fixed angle, the
   * visibility attribute and the scale (bigger when near); with motion on, CSS animations take over all three from that
   * same point, and prefers-reduced-motion falls back to the still picture.
   */
  function orbits(repos, t, animate) {
    function arcPath(R, sweep) { return "M" + (CX - R) + "," + CY + " A" + R + "," + r1(R * FLAT) + " 0 0," + sweep + " " + (CX + R) + "," + CY; }
    function ringPath(R, i, sweep) {
      var d = arcPath(R, sweep), near = !sweep;
      var glow = '<path d="' + d + '" fill="none" stroke="' + t.ring + '" stroke-width="' + (near ? 7 : 5) + '" stroke-opacity="' + (near ? 0.1 : 0.05) + '" stroke-linecap="round"/>';
      return glow + (i === 2
        ? '<path d="' + d + '" fill="none" stroke="url(#uringFade)" stroke-width="' + (near ? 2.2 : 1.6) + '" stroke-dasharray="0.1 9" stroke-linecap="round" opacity="' + (near ? 1 : 0.55) + '"/>'
        : '<path d="' + d + '" fill="none" stroke="url(#uringFade)" stroke-width="' + (near ? 1.8 : 1.3) + '" opacity="' + (near ? 1 : 0.55) + '"/>' +
          '<path d="' + d + '" fill="none" stroke="' + t.ringHi + '" stroke-width=".6" stroke-opacity="' + (near ? 0.55 : 0.25) + '"/>');
    }

    // normalise repo fields so unexpected API values can't break the geometry
    var list = (repos || []).slice(0, 6).map(function (r) {
      return { name: String(r && r.name != null ? r.name : ""), stars: Math.max(0, Math.floor(Number(r && r.stars)) || 0) };
    });
    var maxStars = Math.max.apply(null, [1].concat(list.map(function (r) { return r.stars; })));
    var defs = "", far = "", near = "";
    list.forEach(function (repo, i) {
      var ring = i % RINGS.length, R = RINGS[ring], radius = 14 + 10 * Math.sqrt(repo.stars / maxStars);
      var color = t.planets[i % t.planets.length];
      var name = esc(repo.name.length > 18 ? repo.name.slice(0, 17) + "…" : repo.name);
      var starsLabel = repo.stars > 0 ? '<tspan fill="' + t.mute + '" font-weight="500"> ★' + repo.stars + "</tspan>" : "";
      var dur = 52 + ring * 20 + i * 3, phase = (i / list.length + ring * 0.17) % 1, deg = r1(phase * 360);
      // rotating clockwise from the right goes through the near half first: the planet is in front while sin(angle) > 0
      var s = Math.sin(deg * Math.PI / 180), inFront = s > 0, swell = r1((1 + 0.18 * s) * 100) / 100;
      var sp = sphere(i, radius, color, hashName(repo.name), i === 0, t);
      defs += sp.defs;
      var timing = animate ? ' style="animation-duration:' + dur + "s" + (phase ? ";animation-delay:" + r1(-dur * phase) + "s" : "") + '"' : "";
      function cls(name) { return animate ? ' class="' + name + '"' : ""; }
      function copy(side) {
        var shown = side === "near" ? inFront : !inFront;
        return '<g transform="translate(' + CX + " " + CY + ") scale(1 " + FLAT + ')"' + cls("u-" + side) + (shown ? "" : ' visibility="hidden"') + timing + ">" +
          "<g" + cls("u-orbit") + ' transform="rotate(' + deg + ')"' + timing + '><g transform="translate(' + R + ' 0)">' +
          "<g" + cls("u-back") + ' transform="rotate(' + (-deg) + ')"' + timing + '><g transform="scale(1 ' + r1(1 / FLAT * 1000) / 1000 + ')">' +
          "<g" + cls("u-swell") + ' transform="scale(' + swell + ')"' + timing + ">" +
          '<ellipse cx="0" cy="' + r1(radius + 7) + '" rx="' + r1(radius * 1.15) + '" ry="' + r1(radius * 0.28) + '" fill="#000" opacity=".3" filter="url(#usoft4)"/>' +
          sp.body +
          (side === "near" ? '<text y="' + r1(-radius - 11) + '" text-anchor="middle" font-size="12" font-weight="600" fill="' + t.ink + '" paint-order="stroke" stroke="' + t.bgOuter + '" stroke-width="3" stroke-linejoin="round">' + name + starsLabel + "</text>" : "") +
          "</g></g></g></g></g></g>";
      }
      far += copy("far");
      near += copy("near");
    });
    return {
      back: RINGS.map(function (R, i) { return ringPath(R, i, 1); }).join("") + far,
      front: RINGS.map(function (R, i) { return ringPath(R, i, 0); }).join("") + near,
      defs: defs
    };
  }

  /* ---------- cards ---------- */
  /** Top-left card: identity, four headline numbers in a row, and a sparkline. */
  function panel(d, st, t) {
    var x = 40, y = 36, w = 440, h = 236, col = (w - 56) / 4;
    function stat(i, value, label) {
      return '<text x="' + r1(x + 28 + i * col) + '" y="' + (y + 138) + '" font-size="26" font-weight="700" letter-spacing="-0.5" fill="' + t.ink + '">' + esc(value) + "</text>" +
        '<text x="' + r1(x + 28 + i * col) + '" y="' + (y + 156) + '" font-size="11.5" fill="' + t.mute + '">' + esc(label) + "</text>";
    }
    var series = st.weekly.slice(-26), topv = Math.max.apply(null, [1].concat(series));
    var sx0 = x + 28, sw = w - 56, sy0 = y + h - 18, sh = 30, step = sw / Math.max(1, series.length - 1);
    var line = series.map(function (v, i) { return r1(sx0 + i * step) + "," + r1(sy0 - v / topv * sh); });
    var area = sx0 + "," + sy0 + " " + line.join(" ") + " " + r1(sx0 + sw) + "," + sy0;
    var last = (line[line.length - 1] || sx0 + "," + sy0).split(",");
    var span = st.days >= 360 ? "last 12 months" : "last " + st.days + " days";
    return "<g>" +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="22" fill="url(#uglassFill)" stroke="url(#uglassEdge)"/>' +
      '<rect x="' + (x + 28) + '" y="' + (y + 26) + '" width="18" height="3" rx="1.5" fill="' + t.glow + '"/>' +
      '<text x="' + (x + 52) + '" y="' + (y + 31) + '" font-size="9.5" font-weight="700" letter-spacing="1.6" fill="' + t.glow + '">CONTRIBUTION OBSERVATORY</text>' +
      '<text x="' + (x + 28) + '" y="' + (y + 62) + '" font-size="24" font-weight="700" letter-spacing="-0.3" fill="' + t.ink + '">' + esc(d.name) + "</text>" +
      '<text x="' + (x + 28) + '" y="' + (y + 82) + '" font-size="13" fill="' + t.mute + '">@' + esc(d.login) + " · " + span + "</text>" +
      '<line x1="' + (x + 28) + '" x2="' + (x + w - 28) + '" y1="' + (y + 100) + '" y2="' + (y + 100) + '" stroke="' + t.rule + '"/>' +
      stat(0, st.total.toLocaleString("en-US"), "contributions") +
      stat(1, String(st.active), "active days") +
      stat(2, st.current + " d", "current streak") +
      stat(3, st.longest + " d", "longest streak") +
      '<text x="' + (x + 28) + '" y="' + (y + 184) + '" font-size="11" fill="' + t.mute + '">Weekly activity · last ' + series.length + " weeks</text>" +
      '<polygon points="' + area + '" fill="url(#usparkFill)"/>' +
      '<polyline points="' + line.join(" ") + '" fill="none" stroke="' + t.glow + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="3.2" fill="' + t.glow + '" stroke="' + t.bgOuter + '" stroke-width="1.5"/>' +
      "</g>";
  }

  /** Bottom-right card: the intensity ramp drawn as tiny prisms that echo the terrain, and the peak day. */
  function legend(st, t) {
    var w = 340, h = 128, x = W - 40 - w, y = H - 28 - h, ramp = "";
    t.ramp.forEach(function (color, i) {
      var P = projector(x + 42 + i * 26, y + 72), size = 12;
      if (i === 0) {
        ramp += poly([P(-size / 2, -size / 2), P(size / 2, -size / 2), P(size / 2, size / 2), P(-size / 2, size / 2)], color, ' stroke="' + t.cellEdge + '" stroke-width=".6"');
        return;
      }
      prismFaces(P, -size / 2, -size / 2, size, i * 9).forEach(function (f) {
        ramp += poly(f.pts, shade(color, f.shade), f.top ? ' stroke="' + t.cellEdge + '" stroke-width=".45" stroke-opacity=".62"' : "");
      });
    });
    var px = x + 196;
    var peak = st.peak.date
      ? '<text x="' + px + '" y="' + (y + 70) + '" font-size="20" font-weight="700" fill="' + t.ink + '">' + esc(shortDate(st.peak.date)) + "</text>" +
        '<text x="' + px + '" y="' + (y + 88) + '" font-size="11" fill="' + t.mute + '">' + st.max + " contributions</text>"
      : '<text x="' + px + '" y="' + (y + 70) + '" font-size="12" fill="' + t.mute + '">No activity yet</text>';
    return "<g>" +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="18" fill="url(#uglassFill)" stroke="url(#uglassEdge)"/>' +
      '<text x="' + (x + 28) + '" y="' + (y + 28) + '" font-size="11" fill="' + t.mute + '">Daily intensity</text>' + ramp +
      '<text x="' + (x + 28) + '" y="' + (y + 96) + '" font-size="10" fill="' + t.mute + '" opacity=".8">less</text>' +
      '<text x="' + (x + 162) + '" y="' + (y + 96) + '" font-size="10" fill="' + t.mute + '" opacity=".8" text-anchor="end">more</text>' +
      '<line x1="' + (x + 178) + '" x2="' + (x + 178) + '" y1="' + (y + 18) + '" y2="' + (y + 96) + '" stroke="' + t.rule + '"/>' +
      '<circle cx="' + (px + 4) + '" cy="' + (y + 24) + '" r="4" fill="' + t.peak + '" filter="url(#uglow)"/>' +
      '<text x="' + (px + 14) + '" y="' + (y + 28) + '" font-size="11" fill="' + t.mute + '">Peak day</text>' + peak +
      '<text x="' + (x + 28) + '" y="' + (y + h - 12) + '" font-size="10" fill="' + t.mute + '" opacity=".8">Planets: top repositories · size by stars</text>' +
      "</g>";
  }

  /** Days (oldest first, starting on `start`) as Sunday-to-Saturday weeks, with null padding before the first day. */
  function toWeeks(daily, start) {
    var startMs = Date.parse(start + "T00:00:00Z"), offset = isNaN(startMs) ? 0 : new Date(startMs).getUTCDay(), weeks = [];
    for (var i = -offset; i < daily.length; i += 7) {
      var week = [];
      for (var j = 0; j < 7; j++) {
        var k = i + j;
        week.push(k < 0 || k >= daily.length ? null : { date: isNaN(startMs) ? String(k) : new Date(startMs + k * 86400000).toISOString().slice(0, 10), count: daily[k] });
      }
      weeks.push(week);
    }
    return weeks;
  }

  /** The planets swell on the near side and shrink on the far side: twelve samples of 1 + 0.18 sin(angle). */
  function swellFrames() {
    var out = "";
    for (var k = 0; k <= 12; k++) out += r1(k / 12 * 1000) / 10 + "%{transform:scale(" + r1((1 + 0.18 * Math.sin(2 * Math.PI * k / 12)) * 100) / 100 + ")}";
    return out;
  }

  /** opts.style: "neon" (Git3D Universe's radium palettes, the default) or "theme" (colours from the profile palette). */
  function buildUniverse(d, p, opts) {
    var animate = !(opts && opts.animate === false), t = tokens(p, opts && opts.style);
    var weeks = d.weeks, st = stats(weeks.map(function (w) { return w.filter(Boolean); }));
    // a year of data uses Git3D's cell size; a shorter window gets bigger cells so the terrain still fills the scene
    var cell = Math.min(34, 22 * 53 / Math.max(13, weeks.length));
    var P = projector(CX, CY), land = terrain(weeks, st, t, P, cell), orbit = orbits(d.repos, t, animate);
    var label = d.name + ": " + st.total + " contributions, longest streak " + st.longest + " days";
    var desc = "3D contribution terrain for @" + d.login + ": " + st.total + " contributions over " + st.active + " active days, current streak " +
      st.current + " days, longest streak " + st.longest + " days" + (st.peak.date ? ", busiest day " + st.peak.date + " with " + st.max + " contributions." : ".");
    var motion = animate
      ? // explicit start frames: without them a loop would start from the element's own fixed angle, and the orbit would
      // drift out of step with the near/far swap that shares its timing
      "<style>@keyframes uorb{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes uback{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}" +
        "@keyframes unear{0%{visibility:visible}50%,100%{visibility:hidden}}@keyframes ufar{0%,49.9%{visibility:hidden}50%,100%{visibility:visible}}" +
        "@keyframes uswell{" + swellFrames() + "}" +
        ".u-orbit{animation:uorb linear infinite}.u-back{animation:uback linear infinite}" +
        ".u-near{animation:unear linear infinite}.u-far{animation:ufar linear infinite}.u-swell{animation:uswell linear infinite}" +
        "@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>"
      : "";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(label) + '" font-family="' + SANS + '" text-rendering="geometricPrecision">' +
      "<title>" + esc(label) + "</title><desc>" + esc(desc) + "</desc>" +
      "<defs>" +
      '<radialGradient id="ubg" cx="62%" cy="58%" r="85%"><stop offset="0" stop-color="' + t.bgInner + '"/><stop offset=".55" stop-color="' + t.bgMid + '"/><stop offset="1" stop-color="' + t.bgOuter + '"/></radialGradient>' +
      '<radialGradient id="unebA"><stop offset="0" stop-color="' + t.nebulaA + '" stop-opacity="' + (t.dark ? 0.28 : 0.6) + '"/><stop offset="1" stop-color="' + t.nebulaA + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="unebB"><stop offset="0" stop-color="' + t.nebulaB + '" stop-opacity="' + (t.dark ? 0.22 : 0.55) + '"/><stop offset="1" stop-color="' + t.nebulaB + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="ugridFade" cx="50%" cy="58%" r="52%"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<mask id="ugridMask"><rect width="' + W + '" height="' + H + '" fill="url(#ugridFade)"/></mask>' +
      '<linearGradient id="uglassFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="' + (t.dark ? 0.09 : 0.85) + '"/><stop offset="1" stop-color="#fff" stop-opacity="' + (t.dark ? 0.03 : 0.45) + '"/></linearGradient>' +
      '<linearGradient id="uglassEdge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + (t.dark ? "#fff" : t.plateEdge) + '" stop-opacity=".35"/><stop offset="1" stop-color="' + t.ring + '" stop-opacity=".35"/></linearGradient>' +
      '<linearGradient id="usparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + t.glow + '" stop-opacity=".35"/><stop offset="1" stop-color="' + t.glow + '" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="uplate" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + shade(t.plateTop, 0.85) + '"/><stop offset="1" stop-color="' + shade(t.plateTop, 1.08) + '"/></linearGradient>' +
      '<linearGradient id="urim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + t.glow + '" stop-opacity=".9"/><stop offset=".6" stop-color="' + t.glow + '" stop-opacity=".45"/><stop offset="1" stop-color="' + t.glow + '" stop-opacity=".1"/></linearGradient>' +
      '<linearGradient id="uringFade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + t.ring + '" stop-opacity=".4"/><stop offset=".5" stop-color="' + t.ring + '" stop-opacity=".95"/><stop offset="1" stop-color="' + t.ring + '" stop-opacity=".4"/></linearGradient>' +
      '<linearGradient id="uplTerm" x1=".15" y1=".1" x2=".95" y2=".95"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></linearGradient>' +
      '<radialGradient id="uplSpec"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="ufloorGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="' + t.glow + '" stop-opacity="' + (t.dark ? 0.25 : 0.18) + '"/><stop offset="1" stop-color="' + t.glow + '" stop-opacity="0"/></radialGradient>' +
      '<filter id="usoft4" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>' +
      '<filter id="uglow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="usoft" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="12"/></filter>' +
      '<clipPath id="uclip"><rect width="' + W + '" height="' + H + '" rx="' + t.radius + '"/></clipPath>' +
      orbit.defs +
      "</defs>" + motion +
      '<g clip-path="url(#uclip)">' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#ubg)"/>' +
      nebula() +
      (t.stars ? starfield() : "") +
      floorGrid(weeks.length, cell, P, t) +
      '<ellipse cx="' + CX + '" cy="' + CY + '" rx="660" ry="280" fill="url(#ufloorGlow)"/>' +
      orbit.back + land.plate + land.bars + land.months + beacon(land.peakTop, st, t) + orbit.front +
      panel(d, st, t) +
      legend(st, t) +
      "</g>" +
      '<rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" rx="' + (t.radius - 0.5) + '" fill="none" stroke="' + t.line + '"' + (p.native ? "" : ' stroke-width="1.5"') + "/>" +
      "</svg>";
  }

  return { buildUniverse: buildUniverse, toWeeks: toWeeks, stats: stats, levelOf: levelOf, levelByRank: levelByRank, NEON: NEON };
});
