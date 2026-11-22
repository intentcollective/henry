/* ============================================
   anatomy.js
   An easter egg in two layers, the way a type
   specimen is marked up. Both are named the same way,
   red, at the headline's size, on a fourth row under it.

   Letterform. On a letter's ink the cursor is a red
   circle, and the part of the letter under it is
   named: stem, bowl, loop.

   Typesetting. Everywhere else on the headline the
   cursor is a red square, and the line under it shows
   its guides, dim gray, running out to the right:
   cap height, meanline, baseline, descender. Pointing at a guide turns it white
   and names it. Pointing between guides names the
   measure (x-height, ascender, descender) and tints
   its band. The baseline and meanline also mark where
   round letters overshoot them.

   Each letter below lists its parts as
   [name, x, y, size] in the font's own units
   (1000 = the font size, y measured up from the
   baseline), taken from DM Sans's display cut at
   weight 500. The part nearest the pointer, scaled
   by its size, is the one that gets named.
   ============================================ */
const ANATOMY = {
  D: [["stem", 92, 350, 110], ["counter", 335, 350, 120], ["bowl", 570, 350, 110]],
  I: [["stem", 95, 350, 150]],
  a: [["terminal", 95, 370, 60], ["bowl", 80, 130, 80], ["counter", 245, 130, 60],
      ["stem", 450, 260, 80], ["spur", 455, 20, 45]],
  d: [["bowl", 65, 250, 90], ["counter", 285, 250, 110], ["ascender", 500, 620, 80],
      ["stem", 500, 280, 80], ["spur", 505, 15, 45]],
  e: [["eye", 275, 400, 80], ["bar", 300, 300, 60], ["aperture", 470, 205, 50],
      ["terminal", 440, 95, 55], ["bowl", 70, 250, 100]],
  f: [["terminal", 255, 670, 60], ["bar", 160, 480, 70], ["stem", 110, 220, 90]],
  g: [["ear", 455, 490, 55], ["bowl", 230, 390, 140], ["link", 110, 90, 60],
      ["loop", 280, -140, 120]],
  h: [["ascender", 90, 610, 80], ["stem", 90, 250, 90], ["shoulder", 330, 440, 90],
      ["stem", 465, 200, 80], ["counter", 280, 220, 70]],
  i: [["tittle", 106, 650, 70], ["stem", 106, 250, 90]],
  m: [["stem", 85, 250, 80], ["shoulder", 280, 440, 90], ["stem", 440, 220, 70],
      ["shoulder", 620, 440, 90], ["stem", 785, 220, 80]],
  n: [["stem", 85, 250, 90], ["shoulder", 330, 440, 100], ["stem", 460, 200, 85],
      ["counter", 270, 220, 70]],
  o: [["bowl", 45, 250, 100], ["counter", 275, 250, 120], ["bowl", 505, 250, 100],
      ["overshoot", 275, 500, 55], ["undershoot", 275, -5, 55]],
  r: [["stem", 85, 250, 90], ["shoulder", 180, 450, 60], ["terminal", 290, 475, 50]],
  s: [["terminal", 385, 400, 60], ["spine", 225, 255, 110], ["terminal", 65, 130, 60]],
  t: [["stem", 115, 330, 90], ["bar", 175, 480, 70], ["terminal", 285, 45, 60]],
  u: [["stem", 80, 300, 90], ["counter", 260, 280, 80], ["stem", 460, 290, 80],
      ["undershoot", 220, -5, 55], ["spur", 465, 20, 45]],
  v: [["arm", 120, 300, 100], ["arm", 370, 300, 100], ["vertex", 245, 25, 70]],
  y: [["arm", 120, 370, 90], ["arm", 430, 370, 90], ["crotch", 245, 75, 55],
      ["tail", 140, -140, 85]]
};

const DESCENT = 310;  // the font's descent; a letter's box ends this far below its baseline

/* The guides, in the same font units. In DM Sans the
   ascenders rise exactly to the cap height (I and l are
   both 700). */
const GUIDES = [
  ["cap height", 700],
  ["meanline", 496],
  ["baseline", 0],
  ["descender", -200]
];
const MEASURES = [            // [name, from, to]
  ["ascender", 496, 700],
  ["x-height", 0, 496],
  ["descender", -200, 0]
];
const MEANLINE = 496;
const OVERSHOOT = 12;         // round letters pass the baseline and meanline by this much

/* Each letter's ink [xMin, xMax, yMin, yMax], and which
   guides it overshoots (b = baseline, m = meanline). The
   box is what counts as "on the letter". */
const INK = {
  D: [45, 628, 0, 700, ""],     I: [45, 145, 0, 700, ""],
  a: [30, 477, -12, 508, "bm"], d: [25, 545, -12, 700, "b"],
  e: [25, 514, -12, 508, "bm"], f: [10, 299, 0, 700, ""],
  g: [37, 531, -212, 508, "m"], h: [45, 505, 0, 700, ""],
  i: [40, 173, 0, 712, ""],     m: [40, 825, 0, 508, "m"],
  n: [40, 500, 0, 508, "m"],    o: [25, 525, -12, 508, "bm"],
  r: [40, 323, 0, 508, "m"],    s: [15, 434, -12, 508, "bm"],
  t: [5, 332, 0, 620, ""],      u: [35, 495, -12, 496, "b"],
  v: [5, 487, 0, 496, ""],      y: [5, 537, -200, 496, ""]
};

(function () {
  const headline = document.querySelector(".hero-headline");
  if (!headline) return;

  // Wrap every letter in its own span so it can be measured
  headline.querySelectorAll(".hero-line > span").forEach((line) => {
    line.innerHTML = [...line.textContent]
      .map((c) => (c === " " ? " " : `<span class="ch">${c}</span>`))
      .join("");
  });

  // Over the headline the cursor becomes a red mark: a
  // circle on a letter, a square on the typesetting layer.
  // Both 12px, outlined, so a guide shows through the square.
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "anatomy");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<circle class="mark mark-letter" r="5"></circle>' +
                  '<rect class="mark mark-guide" width="10" height="10"></rect>';
  headline.appendChild(svg);
  const circle = svg.querySelector(".mark-letter");
  const square = svg.querySelector(".mark-guide");

  // The guides are drawn behind the letters
  const guides = document.createElementNS(NS, "svg");
  guides.setAttribute("class", "anatomy-guides");
  guides.setAttribute("aria-hidden", "true");
  headline.prepend(guides);

  // The name, red, at the headline's own size, on a fourth
  // row under it, flush left, as if it continues the
  // statement. One place and one size for every name, so it
  // never covers the line being read.
  const name = document.createElement("span");
  name.className = "anatomy-name";
  name.setAttribute("aria-hidden", "true");
  headline.appendChild(name);

  const lines = [...headline.querySelectorAll(".hero-line")];

  const unit = () => parseFloat(getComputedStyle(headline).fontSize) / 1000;

  // The letter part under the pointer, if the pointer is on
  // a letter's ink (inside its ink box, counters included)
  function partAt(e) {
    // Rows of a wrapped line overlap, so a descender can lie
    // under the next row's box; check every letter there.
    const u = unit();
    for (const ch of document.elementsFromPoint(e.clientX, e.clientY)) {
      if (!ch.classList.contains("ch") || !headline.contains(ch)) continue;
      const parts = ANATOMY[ch.textContent];
      const ink = INK[ch.textContent];
      if (!parts || !ink) continue;
      const r = ch.getBoundingClientRect();
      const px = (e.clientX - r.left) / u;
      const py = (r.bottom - DESCENT * u - e.clientY) / u;
      if (px < ink[0] || px > ink[1] || py < ink[2] || py > ink[3]) continue;
      let best = "", bestD = Infinity;
      parts.forEach((p) => {
        const d = Math.hypot(px - p[1], py - p[2]) / p[3];
        if (d < bestD) { bestD = d; best = p[0]; }
      });
      return best;
    }
    return null;
  }

  // The headline line nearest the pointer, and the row of
  // it under the pointer (a line can wrap on narrow screens)
  function rowAt(y) {
    let line = lines[0], lineD = Infinity;
    lines.forEach((l) => {
      const r = l.getBoundingClientRect();
      const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (d < lineD) { lineD = d; line = l; }
    });
    const rows = new Map();
    line.querySelectorAll(".ch").forEach((ch) => {
      const t = Math.round(ch.getBoundingClientRect().top);
      if (!rows.has(t)) rows.set(t, []);
      rows.get(t).push(ch);
    });
    // A row's middle is halfway between its cap height and
    // its descender, so the pointer goes to the nearer row
    const u = unit();
    let row = null, rowD = Infinity;
    rows.forEach((chars) => {
      const r = chars[0].getBoundingClientRect();
      const mid = r.bottom - DESCENT * u - 250 * u;
      const d = Math.abs(y - mid);
      if (d < rowD) { rowD = d; row = chars; }
    });
    return row;
  }

  function el(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  const NEAR = 7;   // px from a guide that counts as pointing at it

  // Draws the guides of the row under the pointer, dim, and
  // returns what the pointer is on: a guide, a measure, or
  // nothing. When `active` is false (the pointer is on a
  // letter), the guides are only drawn.
  function drawGuides(e, active) {
    const box = headline.getBoundingClientRect();
    const u = unit();
    const chars = rowAt(e.clientY);
    const first = chars[0].getBoundingClientRect();
    const base = first.bottom - DESCENT * u - box.top;    // baseline, in headline px
    const yOf = (units) => base - units * u;
    const x0 = first.left - box.left;
    const x1 = box.width;
    const py = (base + box.top - e.clientY) / u;          // pointer, in font units

    let hit = null;
    if (active) {
      const g = GUIDES.find((g) => Math.abs(py - g[1]) * u <= NEAR);
      if (g) hit = { kind: "guide", name: g[0], at: g[1] };
      else {
        const m = MEASURES.find((m) => py > m[1] && py < m[2]);
        if (m) hit = { kind: "measure", name: m[0], from: m[1], to: m[2] };
      }
    }

    guides.replaceChildren();
    if (hit && hit.kind === "measure") {
      guides.appendChild(el("rect", {
        class: "band", x: x0, width: x1 - x0,
        y: yOf(hit.to), height: (hit.to - hit.from) * u
      }));
    }
    GUIDES.forEach((g) => {
      const on = hit && hit.kind === "guide" && hit.name === g[0];
      guides.appendChild(el("line", {
        class: on ? "guide is-on" : "guide",
        x1: x0, x2: x1, y1: yOf(g[1]), y2: yOf(g[1])
      }));
    });

    // Overshoot: where round letters pass the baseline or
    // the meanline, a short mark at their true edge
    const flag = hit && { baseline: "b", meanline: "m" }[hit.name];
    if (flag) {
      const y = flag === "b" ? yOf(-OVERSHOOT) : yOf(MEANLINE + OVERSHOOT);
      chars.forEach((ch) => {
        const ink = INK[ch.textContent];
        if (!ink || !ink[4].includes(flag)) return;
        const left = ch.getBoundingClientRect().left - box.left;
        guides.appendChild(el("line", {
          class: "overshoot", x1: left + ink[0] * u, x2: left + ink[1] * u, y1: y, y2: y
        }));
      });
    }
    return hit;
  }

  let shown = null;

  function hide() {
    svg.classList.remove("is-on", "is-guide");
    name.classList.remove("is-on");
    guides.replaceChildren();
    shown = null;
  }

  function show(e) {
    const box = headline.getBoundingClientRect();
    const x = e.clientX - box.left, y = e.clientY - box.top;
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    square.setAttribute("x", x - 5);
    square.setAttribute("y", y - 5);
    svg.classList.add("is-on");

    // On a letter's ink, the letter part. Anywhere else, the
    // guide or measure under the pointer.
    const part = partAt(e);
    const hit = drawGuides(e, !part);
    svg.classList.toggle("is-guide", !part);
    const text = part || (hit && hit.name) || "";
    if (text !== shown) { shown = text; name.textContent = text; }
    name.classList.toggle("is-on", !!text);
  }

  headline.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") show(e); });
  headline.addEventListener("pointerdown", show);
  headline.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
  document.addEventListener("pointerdown", (e) => { if (!headline.contains(e.target)) hide(); });
})();
