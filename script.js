// Cogmenta — reveal-on-scroll (rAF + scroll fallback; robust where IntersectionObserver stalls) + nav drawer + video motion guard
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    /* ---------- Reveal on scroll ---------- */
    var targets = Array.prototype.slice.call(document.querySelectorAll('[data-animate]'));
    targets.forEach(function (el) { el.classList.add('fade-in'); });

    function reveal() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = targets.length - 1; i >= 0; i--) {
        var el = targets[i];
        var r = el.getBoundingClientRect();
        if (r.top < vh - 40 && r.bottom > 0) {
          el.classList.add('visible');
          targets.splice(i, 1);
        }
      }
      if (targets.length === 0) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { reveal(); ticking = false; });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // initial passes (cover late layout / font load)
    requestAnimationFrame(reveal);
    setTimeout(reveal, 120);
    setTimeout(reveal, 500);
    window.addEventListener('load', reveal);

    /* ---------- Looping demo video: no autoplay under reduced motion ---------- */
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('video[autoplay]').forEach(function (v) {
        v.removeAttribute('autoplay'); v.pause();
      });
    }

    /* ---------- Marquee pause (WCAG 2.2.2) ---------- */
    var mq = document.querySelector('.marquee'), mqBtn = document.querySelector('.marquee-toggle');
    if (mq && mqBtn) {
      mqBtn.addEventListener('click', function () {
        var paused = mq.classList.toggle('is-paused');
        mqBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        mqBtn.textContent = paused ? 'Play' : 'Pause';
      });
    }

    /* ---------- Mobile nav drawer ---------- */
    var toggle = document.querySelector('.nav-toggle');
    var navLinks = document.getElementById('nav-links');
    if (!toggle || !navLinks) return;

    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }
    function open() {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      navLinks.classList.add('nav-open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      navLinks.classList.remove('nav-open');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      if (isOpen()) { close(); toggle.focus(); } else { open(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { close(); toggle.focus(); }
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { if (isOpen()) close(); });
    });

    /* ---------- Active section in nav ---------- */
    var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
    var links = {};
    navLinks.querySelectorAll('a[href^="#"]').forEach(function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });
    function spy() {
      var pos = window.scrollY + 120;
      var current = null;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= pos) current = sections[i].id;
      }
      for (var id in links) links[id].classList.toggle('nav-link-active', id === current);
    }
    var spyTicking = false;
    window.addEventListener('scroll', function () {
      if (!spyTicking) { spyTicking = true; requestAnimationFrame(function () { spy(); spyTicking = false; }); }
    }, { passive: true });
    spy();
  });
})();

// On-prem scaling-law chart: exponential curve that re-scales (zooms out) as it grows;
// milestones pop in with a leader line and a callout that glides into place.
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var plot = document.querySelector('.sc-plot');
    if (!plot) return;
    var svg = plot.querySelector('.sc-svg');
    var grid = svg.querySelector('.sc-grid');
    var base = svg.querySelector('.sc-base');
    var area = svg.querySelector('.sc-area');
    var line = svg.querySelector('.sc-line');
    var tip = svg.querySelector('.sc-tip');
    var leaders = svg.querySelectorAll('.sc-leaders line');
    var pts = svg.querySelectorAll('.sc-pts circle');
    var boxes = plot.querySelectorAll('.sc-callout');
    var baseLab = plot.querySelector('.sc-baselab');
    var replay = plot.querySelector('.sc-replay');
    var NS = 'http://www.w3.org/2000/svg';

    var K = 3.4, E = Math.exp(K) - 1;          // curve shape: f(0)=0, f(1)=1
    var BASE = 0.06;                            // general model, no context
    var Y0 = 0.1, HEAD = 1.12;                  // initial view height, headroom over the tip
    var DURATION = 6000;
    var GRID = [0.0125, 0.025, 0.05, 0.1, 0.2, 0.4, 0.8];
    var MS = [
      { x: 0.36, off: 46, align: 'center' },     // Optimize
      { x: 0.64, off: 58, align: 'center' },     // Discover
      { x: 0.88, off: 46, align: 'right' }       // Coach
    ];

    function f(x) { return (Math.exp(K * x) - 1) / E; }
    function view(p) { return Math.max(Y0, f(p) * HEAD); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function smooth(t) { return t * t * (3 - 2 * t); }

    var gridLines = GRID.map(function () {
      var l = document.createElementNS(NS, 'line');
      grid.appendChild(l);
      return l;
    });

    var current = 0;

    var placed = [];
    function render(p) {
      placed = [];
      current = p;
      var W = plot.clientWidth, H = plot.clientHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var yv = view(p);
      function X(x) { return x * W; }
      function Y(y) { return H - (y / yv) * H; }

      GRID.forEach(function (g, i) {
        var y = Y(g), l = gridLines[i];
        var o = clamp((H - y) / 60, 0, 1) * clamp(y / 20, 0, 1);
        l.setAttribute('x1', 0); l.setAttribute('x2', W);
        l.setAttribute('y1', y); l.setAttribute('y2', y);
        l.style.opacity = o;
      });

      var yb = Y(BASE);
      base.setAttribute('d', 'M0 ' + yb + ' L' + W + ' ' + yb);
      baseLab.style.transform = 'translate(0,' + clamp(yb - 22, 0, H - 20) + 'px)';

      var n = Math.max(2, Math.round(180 * p)), d = 'M0 ' + Y(0);
      for (var i = 1; i <= n; i++) {
        var x = p * i / n;
        d += ' L' + X(x).toFixed(1) + ' ' + Y(f(x)).toFixed(1);
      }
      line.setAttribute('d', d);
      area.setAttribute('d', d + ' L' + X(p).toFixed(1) + ' ' + H + ' L0 ' + H + ' Z');
      tip.setAttribute('cx', X(p)); tip.setAttribute('cy', Y(f(p)));

      MS.forEach(function (m, k) {
        var box = boxes[k], pt = pts[k], ld = leaders[k];
        var on = p >= m.x;
        box.classList.toggle('on', on); pt.classList.toggle('on', on); ld.classList.toggle('on', on);
        if (!on) return;
        var px = X(m.x), py = Y(f(m.x)), bw = box.offsetWidth, bh = box.offsetHeight;
        // glide from "left of point" (while the point sits near the top) to "above point" (settled)
        var hs = f(m.x) / view(m.x), hf = f(m.x) / view(1), h = f(m.x) / yv;
        var s = smooth(hs === hf ? 1 : clamp((hs - h) / (hs - hf), 0, 1));
        var lx = px - 16 - bw, ly = py - bh / 2;
        var ax = m.align === 'right' ? px + 24 - bw : px - bw / 2, ay = py - m.off - bh;
        var bx = clamp(lx + (ax - lx) * s, 0, W - bw - 10);
        var by = clamp(ly + (ay - ly) * s, -6, H - bh);
        // keep clear of callouts already placed (lift this one above any it would overlap)
        placed.forEach(function (q) {
          if (bx < q.x + q.w + 6 && bx + bw + 6 > q.x && by < q.y + q.h + 6 && by + bh + 6 > q.y) by = Math.max(-6, q.y - bh - 8);
        });
        placed.push({ x: bx, y: by, w: bw, h: bh });
        box.style.transform = 'translate(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px)';
        var tx = (bx + bw) + (clamp(px, bx + 14, bx + bw - 14) - (bx + bw)) * s;
        var ty = (by + bh / 2) + ((by + bh) - (by + bh / 2)) * s;
        pt.setAttribute('cx', px); pt.setAttribute('cy', py);
        ld.setAttribute('x1', px); ld.setAttribute('y1', py);
        ld.setAttribute('x2', tx); ld.setAttribute('y2', ty);
      });
    }

    var raf = null;
    function play() {
      if (raf) cancelAnimationFrame(raf);
      var t0 = null;
      function step(now) {
        if (t0 === null) t0 = now;
        var t = Math.min(1, (now - t0) / DURATION);
        render(0.0001 + 0.9999 * smooth(t));
        raf = t < 1 ? requestAnimationFrame(step) : null;
      }
      raf = requestAnimationFrame(step);
    }

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var started = false;
    function check() {
      if (started) return;
      var r = plot.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.8 && r.bottom > 0) {
        started = true;
        window.removeEventListener('scroll', check);
        if (reduce) render(1); else play();
      }
    }

    render(reduce ? 1 : 0.0001);
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', function () { requestAnimationFrame(function () { render(current); }); });
    replay.addEventListener('click', function () { started = true; play(); });
    check();
    setTimeout(check, 300);
  });
})();
