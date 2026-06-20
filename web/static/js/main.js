/* Global UI behaviour: nav, scroll-reveal, counters, page transitions */
(function () {
  "use strict";

  // ---- Navbar shadow on scroll ----
  const nav = document.querySelector(".nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- Mobile nav toggle ----
  const toggle = document.querySelector(".nav__toggle");
  const links = document.querySelector(".nav__links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }

  // ---- Scroll reveal (robust: works even if IntersectionObserver is throttled) ----
  const reveals = Array.from(document.querySelectorAll(".reveal"));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function show(el) {
    if (el.classList.contains("is-visible")) return;
    el.classList.add("is-visible");
    const counter = el.matches("[data-count]") ? el : el.querySelector("[data-count]");
    if (counter) animateCount(counter);
  }
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.92 && r.bottom > 0;
  };

  if (reduced || !("IntersectionObserver" in window)) {
    reveals.forEach(show);
  } else {
    // 1) Reveal what's already on screen, on the next frame so the transition plays.
    requestAnimationFrame(() => reveals.forEach((el) => { if (inView(el)) show(el); }));
    // 2) Observe the rest for scroll-triggered reveals.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => { if (!el.classList.contains("is-visible")) io.observe(el); });
    // 3) Failsafe: if the observer never fires (background tab / throttling), reveal everything.
    setTimeout(() => reveals.forEach(show), 1800);
  }

  // ---- Animated counters ----
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.decimals && parseInt(el.dataset.decimals)) || 0;
    const suffix = el.dataset.suffix || "";
    const dur = 1100;
    const start = performance.now();
    const finalText = (decimals ? target.toFixed(decimals) : Math.round(target).toLocaleString()) + suffix;
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const val = (target * eased).toFixed(decimals);
      el.textContent = Number(val).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = finalText;
    }
    requestAnimationFrame(tick);
    // Failsafe: if rAF is throttled (background tab), still land on the final value.
    setTimeout(() => { el.textContent = finalText; }, dur + 200);
  }
  // expose for pages that count outside reveal
  window.animateCount = animateCount;

  // ---- Page transition (fade out, then navigate) ----
  const sameOrigin = (href) =>
    href && href.startsWith(location.origin) && !href.includes("#") &&
    !href.endsWith(".docx") && !href.endsWith(".pdf");

  document.addEventListener("click", (ev) => {
    const a = ev.target.closest("a");
    if (!a) return;
    const href = a.href;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    if (!sameOrigin(href) || href === location.href) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ev.preventDefault();
    document.body.classList.add("is-leaving");
    setTimeout(() => { window.location.href = href; }, 240);
  });
  // Clear the leaving state if the page is restored from bfcache
  window.addEventListener("pageshow", () => document.body.classList.remove("is-leaving"));
})();
