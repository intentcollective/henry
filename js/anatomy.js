/* ============================================
   anatomy.js
   An easter egg. Over the headline the cursor becomes
   a red ring, and the part of the letter under it is
   named in red on a line below, the way a type
   specimen labels anatomy.

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

(function () {
  const headline = document.querySelector(".hero-headline");
  if (!headline) return;

  // Wrap every letter in its own span so it can be measured
  headline.querySelectorAll(".hero-line > span").forEach((line) => {
    line.innerHTML = [...line.textContent]
      .map((c) => (c === " " ? " " : `<span class="ch">${c}</span>`))
      .join("");
  });

  // Over the headline the cursor becomes a red ring
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "anatomy");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<circle class="ring" r="8"></circle>';
  headline.appendChild(svg);
  const ring = svg.querySelector(".ring");

  // The part's name, on its own line under the headline,
  // flush right with the margin
  const name = document.createElement("span");
  name.className = "anatomy-name";
  name.setAttribute("aria-hidden", "true");
  headline.appendChild(name);

  function partAt(e) {
    const ch = e.target.closest ? e.target.closest(".ch") : null;
    const parts = ch && ANATOMY[ch.textContent];
    if (!parts) return "";
    const u = parseFloat(getComputedStyle(headline).fontSize) / 1000;
    const r = ch.getBoundingClientRect();
    const px = (e.clientX - r.left) / u;
    const py = (r.bottom - DESCENT * u - e.clientY) / u;
    let best = "", bestD = Infinity;
    parts.forEach((p) => {
      const d = Math.hypot(px - p[1], py - p[2]) / p[3];
      if (d < bestD) { bestD = d; best = p[0]; }
    });
    return best;
  }

  function hide() {
    svg.classList.remove("is-on");
    name.classList.remove("is-on");
  }

  function show(e) {
    const box = headline.getBoundingClientRect();
    ring.setAttribute("cx", e.clientX - box.left);
    ring.setAttribute("cy", e.clientY - box.top);
    svg.classList.add("is-on");
    name.textContent = partAt(e);
    name.classList.toggle("is-on", !!name.textContent);
  }

  headline.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") show(e); });
  headline.addEventListener("pointerdown", show);
  headline.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
  document.addEventListener("pointerdown", (e) => { if (!headline.contains(e.target)) hide(); });
})();
