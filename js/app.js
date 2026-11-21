/* ============================================
   CONFIG - the only line you need to edit
   ============================================ */
// Paste the "Web app" URL you get after deploying the Apps Script
// (see /apps-script/Code.gs and the README) here:
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzO56PZ7HjJ5atTfnLtM4rok3yWEJjquq86MAd298pYDsEfL6hT3nu2X4QNLwQc_z3r/exec";

const IMAGES_PATH = "images/works/";

// File extensions treated as playable local/hosted video files
const VIDEO_FILE_REGEX = /\.(mp4|webm|mov|m4v)(\?[^#]*)?(#.*)?$/i;

/* ============================================
   State
   ============================================ */
let allWorks = [];
let activeCategory = "Design";

// Popup carousel state - slides can be a mix of images and videos
let carouselSlides = [];
let carouselIndex = 0;
let carouselAlt = "";
let touchStartX = null;

/* ============================================
   Init
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  setupNav();
  setupModal();
  loadWorks();
});

/* ============================================
   Fetch + render
   ============================================ */
async function loadWorks() {
  const grid = document.getElementById("work-grid");
  try {
    const res = await fetch(SHEET_API_URL);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    // Sheet's top data row = newest. The Sheet API returns rows in sheet
    // order already, so no re-sorting is needed here.
    allWorks = Array.isArray(data) ? data : [];
    render();
  } catch (err) {
    console.error("Could not load works:", err);
    grid.innerHTML = '<p class="grid-empty">Could not load work right now.</p>';
  }
}

function render() {
  const grid = document.getElementById("work-grid");
  const emptyMsg = document.getElementById("grid-empty");
  const items = allWorks.filter(
    (w) => (w.Category || "").trim() === activeCategory
  );

  grid.querySelectorAll(".work-card").forEach((el) => el.remove());

  if (items.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  items.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "work-card";
    card.setAttribute("aria-label", `Open ${item.Title || "work"}`);

    // ThumbnailPath: "image.jpg" or "image.jpg, loop.mp4". A second,
    // video entry becomes a silent loop over the still image.
    const thumbFiles = (item.ThumbnailPath || "")
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    const stillFile = thumbFiles.find((f) => !VIDEO_FILE_REGEX.test(f)) || "";
    const loopFile = thumbFiles.find((f) => VIDEO_FILE_REGEX.test(f));

    const media = document.createElement("div");
    media.className = "work-media";

    const thumb = document.createElement("img");
    thumb.className = "work-thumb";
    thumb.loading = "lazy";
    thumb.alt = item.Title || "";
    thumb.src = stillFile ? IMAGES_PATH + stillFile : "";
    media.appendChild(thumb);

    if (loopFile) attachLoop(card, media, IMAGES_PATH + loopFile);

    const title = document.createElement("p");
    title.className = "work-title";
    title.textContent = item.Title || "Untitled";

    card.appendChild(media);
    card.appendChild(title);

    card.addEventListener("click", () => openModal(item));
    grid.appendChild(card);
  });
}

/* ============================================
   Card loops - a silent video over the still thumbnail
   Pointer devices: plays on hover or keyboard focus.
   Touch devices: plays while the card is mostly on screen.
   Never plays with reduced motion or Save-Data. Loads only when needed.
   ============================================ */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
const saveData = !!(navigator.connection && navigator.connection.saveData);

let loopObserver = null;
function getLoopObserver() {
  if (loopObserver || !("IntersectionObserver" in window)) return loopObserver;
  loopObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const ctl = entry.target._loop;
        if (!ctl) return;
        if (entry.intersectionRatio >= 0.6) ctl.play();
        else ctl.stop();
      });
    },
    { threshold: [0, 0.6] }
  );
  return loopObserver;
}

function attachLoop(card, media, src) {
  if (saveData) return;
  let video = null;

  function ensureVideo() {
    if (video) return video;
    video = document.createElement("video");
    video.className = "work-loop";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("aria-hidden", "true");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.src = src;
    video.addEventListener("playing", () => media.classList.add("is-playing"));
    media.appendChild(video);
    return video;
  }

  const ctl = {
    play() {
      if (reduceMotion.matches) return;
      const v = ensureVideo();
      const p = v.play();
      if (p && p.catch) p.catch(() => media.classList.remove("is-playing"));
    },
    stop() {
      media.classList.remove("is-playing");
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    },
  };
  card._loop = ctl;

  if (canHover.matches) {
    card.addEventListener("mouseenter", ctl.play);
    card.addEventListener("mouseleave", ctl.stop);
    card.addEventListener("focus", ctl.play);
    card.addEventListener("blur", ctl.stop);
  } else {
    const obs = getLoopObserver();
    if (obs) obs.observe(card);
  }
}

/* ============================================
   Nav
   ============================================ */
function setupNav() {
  const nav = document.getElementById("main-nav");
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-link");
    if (!btn) return;
    activeCategory = btn.dataset.category;
    nav.querySelectorAll(".nav-link").forEach((b) =>
      b.classList.toggle("is-active", b === btn)
    );
    render();
  });
}

/* ============================================
   MainContent -> slides
   Examples:
   "image:a.jpg,image:b.jpg,video:https://youtube.com/watch?v=xxxx"
   "galaxy_origami.mp4, origami_package1.jpg, origami_package2.jpg"
   ============================================ */
function parseSlides(mainContent) {
  return (mainContent || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const sep = entry.indexOf(":");
      const prefix = sep !== -1 ? entry.slice(0, sep).trim().toLowerCase() : "";

      if (prefix === "image" || prefix === "video") {
        const value = entry.slice(sep + 1).trim();
        return value ? { type: prefix, value } : null;
      }

      // Entry with no type prefix - infer the type: a URL or a video
      // file (.mp4 etc.) is a video, anything else is an image filename.
      if (!entry) return null;
      const isUrl = /^https?:\/\//i.test(entry);
      const isVideoFile = VIDEO_FILE_REGEX.test(entry);
      const inferredType = isUrl || isVideoFile ? "video" : "image";
      return { type: inferredType, value: entry };
    })
    .filter(Boolean);
}

function parseVideoEmbed(url) {
  if (!url) return null;

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtube.com" || host === "music.youtube.com") {
    const parts = parsed.pathname.split("/").filter(Boolean);
    let id = parsed.searchParams.get("v");
    if (!id && (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live")) {
      id = parts[1];
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === "vimeo.com") {
    const parts = parsed.pathname.split("/").filter(Boolean);
    let id = null;
    let hash = null;

    if (parts.length === 2 && /^\d+$/.test(parts[0])) {
      // Unlisted-video format: vimeo.com/ID/HASH
      id = parts[0];
      hash = parts[1];
    } else {
      for (let i = parts.length - 1; i >= 0; i--) {
        if (/^\d+$/.test(parts[i])) {
          id = parts[i];
          break;
        }
      }
    }

    if (!id) return null;
    return hash
      ? `https://player.vimeo.com/video/${id}?h=${hash}`
      : `https://player.vimeo.com/video/${id}`;
  }

  if (host === "player.vimeo.com") {
    return parsed.href; // already an embed URL
  }

  return null;
}

/* ============================================
   Modal
   ============================================ */
function setupModal() {
  const modal = document.getElementById("modal");
  const closeBtn = document.getElementById("modal-close");
  const content = document.getElementById("modal-content");

  closeBtn.addEventListener("click", closeModal);
  window.addEventListener("popstate", hideModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal-bar")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (carouselSlides.length > 1) {
      if (e.key === "ArrowLeft") showPrevSlide();
      if (e.key === "ArrowRight") showNextSlide();
    }
  });

  // Swipe-to-navigate on mobile
  content.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );
  content.addEventListener("touchend", (e) => {
    if (touchStartX === null || carouselSlides.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    const SWIPE_THRESHOLD = 40;
    if (dx > SWIPE_THRESHOLD) showPrevSlide();
    else if (dx < -SWIPE_THRESHOLD) showNextSlide();
  });
}

function openModal(item) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");
  content.innerHTML = "";

  carouselSlides = parseSlides(item.MainContent);
  carouselIndex = 0;
  carouselAlt = item.Title || "";

  const carouselWrap = document.createElement("div");
  carouselWrap.className = "carousel-wrap";

  const slideHolder = document.createElement("div");
  slideHolder.className = "carousel-slide";
  slideHolder.id = "carousel-slide";
  carouselWrap.appendChild(slideHolder);

  content.appendChild(carouselWrap);

  renderSlide();

  if (carouselSlides.length > 1) {
    carouselWrap.classList.add("has-arrows");
    const count = document.createElement("p");
    count.className = "carousel-count";
    count.id = "carousel-count";
    count.setAttribute("aria-live", "polite");
    carouselWrap.appendChild(count);
    buildCarouselArrows(carouselWrap);
    updateCount();
  }

  const title = document.createElement("p");
  title.className = "modal-title";
  title.textContent = item.Title || "";
  content.appendChild(title);

  const desc = document.createElement("p");
  desc.className = "modal-description";
  linkify(desc, item.Description || "");
  content.appendChild(desc);

  modal.hidden = false;
  modal.scrollTop = 0;
  document.body.style.overflow = "hidden";

  // Give the open project its own history step, so the browser's
  // back button closes the project instead of leaving the site.
  history.pushState({ modal: true }, "");
}

// Close button, Escape and backdrop all go through history, so the
// extra step added in openModal() is used up and back works normally.
function closeModal() {
  if (history.state && history.state.modal) {
    history.back(); // triggers popstate -> hideModal()
  } else {
    hideModal();
  }
}

function hideModal() {
  const modal = document.getElementById("modal");
  if (modal.hidden) return;
  modal.hidden = true;
  document.getElementById("modal-content").innerHTML = "";
  carouselSlides = [];
  document.body.style.overflow = "";
}

/* ============================================
   Carousel - renders whichever slide type is current
   (loops both directions)
   ============================================ */
function renderSlide() {
  const holder = document.getElementById("carousel-slide");
  if (!holder || carouselSlides.length === 0) return;

  const slide = carouselSlides[carouselIndex];
  const token = ++slideToken;
  updateCount();

  const { el, ready } = buildSlide(slide);

  // The current work stays on screen until the next one has loaded and
  // has its size, then they swap in a single frame. A click that comes
  // before then wins, and the slower slide is dropped.
  ready.then(() => {
    if (token !== slideToken || !holder.isConnected) return;
    fitToScreen(el, slide.value);
    holder.replaceChildren(el);
    watchSlide(el);
    preloadNeighbors();
  });
}

let slideToken = 0;

// Resolves when the element is ready to draw at its real size, or after
// a few seconds so a slow or broken file never blocks the popup.
function whenReady(promise) {
  return Promise.race([
    promise.catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
}

function buildSlide(slide) {
  if (slide.type === "video" && VIDEO_FILE_REGEX.test(slide.value)) {
    // Video file: local (in images/works/) or a full URL to an mp4
    const video = document.createElement("video");
    const autoplay = /#autoplay$/i.test(slide.value);
    const file = slide.value.replace(/#(autoplay|full)$/i, "");
    video.src = /^https?:\/\//i.test(file) ? file : IMAGES_PATH + file;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    // Silent motion pieces start on their own and loop, muted.
    // Mark them with "#autoplay" after the file name in MainContent.
    if (autoplay) {
      video.muted = true;
      video.loop = true;
      video.autoplay = !reduceMotion.matches;
      video.setAttribute("muted", "");
    }
    const ready = new Promise((resolve) => {
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener("error", resolve, { once: true });
    });
    return { el: video, ready: whenReady(ready) };
  }

  if (slide.type === "video") {
    // YouTube / Vimeo embed. Its box has a fixed shape, so it can swap in
    // right away and the player draws itself inside.
    const embedSrc = parseVideoEmbed(slide.value);
    const wrap = document.createElement("div");
    wrap.className = "video-embed";
    if (embedSrc) {
      // No autoplay param -> loads with a click-to-play poster frame.
      const iframe = document.createElement("iframe");
      iframe.src = embedSrc;
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
    }
    return { el: wrap, ready: Promise.resolve() };
  }

  const img = document.createElement("img");
  img.src = IMAGES_PATH + slide.value.replace(/#full$/i, "");
  img.alt = carouselAlt;
  return { el: img, ready: whenReady(img.decode()) };
}

// Loads the slides on either side in the background, so most clicks
// swap at once. Only images are fetched ahead; videos stay on demand.
const preloaded = new Map();

function preloadNeighbors() {
  const n = carouselSlides.length;
  if (n < 2) return;
  [carouselIndex + 1, carouselIndex - 1].forEach((i) => {
    const slide = carouselSlides[(i + n) % n];
    if (slide.type !== "image") return;
    const src = IMAGES_PATH + slide.value.replace(/#full$/i, "");
    if (preloaded.has(src)) return;
    const img = new Image();
    img.src = src;
    img.decode().catch(() => {});
    preloaded.set(src, img);
  });
}

/* The slide count, for example "3 / 11", tells people there is more to
   see, which matters most on phones where swiping is invisible. */
function updateCount() {
  const count = document.getElementById("carousel-count");
  if (count) count.textContent = `${carouselIndex + 1} / ${carouselSlides.length}`;
}

/* The arrows sit just outside the current work, centered on its height,
   so they follow each slide's own edges. The work's position is measured
   whenever its size changes (an image loading, the window resizing). */
let slideObserver = null;

function watchSlide(media) {
  if (slideObserver) slideObserver.disconnect();
  if (!media) return;
  placeArrows();
  if ("ResizeObserver" in window) {
    slideObserver = new ResizeObserver(placeArrows);
    slideObserver.observe(media);
  }
}

function placeArrows() {
  const wrap = document.querySelector(".carousel-wrap.has-arrows");
  const media = wrap && wrap.querySelector("#carousel-slide > *");
  if (!media) return;
  const w = wrap.getBoundingClientRect();
  const m = media.getBoundingClientRect();
  wrap.style.setProperty("--media-left", `${m.left - w.left}px`);
  wrap.style.setProperty("--media-right", `${m.right - w.left}px`);
  wrap.style.setProperty("--media-mid", `${m.top - w.top + m.height / 2}px`);
}

window.addEventListener("resize", placeArrows);

/* Web addresses in a description become links. They are written as
   plain text in the Sheet, with or without https:// (for example
   "intentcollective.design/data"), and keep exactly that wording.
   Text is added as text nodes, so nothing in the Sheet runs as HTML. */
const LINK_REGEX = /(?<![@\w.\/])(?:https?:\/\/[^\s]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:design|com|org|net|edu|io|co|art|studio)(?:\/[^\s]*)?)/gi;

function linkify(el, text) {
  let last = 0;
  for (const match of text.matchAll(LINK_REGEX)) {
    // Leave sentence punctuation after an address outside the link.
    const label = match[0].replace(/[.,;:!?)\]"'”’]+$/, "");
    const start = match.index;
    el.append(text.slice(last, start));
    const a = document.createElement("a");
    a.href = /^https?:\/\//i.test(label) ? label : "https://" + label;
    a.textContent = label;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "text-link";
    el.append(a);
    last = start + label.length;
  }
  el.append(text.slice(last));
}

/* Every image and video file in the popup is shown whole: as wide as
   the popup allows, but never taller than the screen, and centered.
   Its proportion is read before it is shown, so it never appears at
   the wrong size, and small files still scale up to fill the space. A file marked "#full" in MainContent keeps
   the full popup width and scrolls instead, for long diagrams whose
   detail would get too small. */
function fitToScreen(el, value) {
  if (/#full$/i.test(value)) return;
  const w = el.tagName === "VIDEO" ? el.videoWidth : el.naturalWidth;
  const h = el.tagName === "VIDEO" ? el.videoHeight : el.naturalHeight;
  if (!w || !h) return;
  el.style.setProperty("--ratio", w / h);
  el.classList.add("is-fit");
}

function buildCarouselArrows(wrap) {
  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "modal-arrow modal-arrow-prev";
  prev.setAttribute("aria-label", "Previous");
  prev.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7 12 1v12z"/></svg>';
  prev.addEventListener("click", showPrevSlide);

  const next = document.createElement("button");
  next.type = "button";
  next.className = "modal-arrow modal-arrow-next";
  next.setAttribute("aria-label", "Next");
  next.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M12 7 2 1v12z"/></svg>';
  next.addEventListener("click", showNextSlide);

  wrap.appendChild(prev);
  wrap.appendChild(next);
}

function showPrevSlide() {
  if (carouselSlides.length <= 1) return;
  carouselIndex = (carouselIndex - 1 + carouselSlides.length) % carouselSlides.length;
  renderSlide();
}

function showNextSlide() {
  if (carouselSlides.length <= 1) return;
  carouselIndex = (carouselIndex + 1) % carouselSlides.length;
  renderSlide();
}
