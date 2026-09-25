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

    /* ---------- Mobile nav drawer ---------- */
    var toggle = document.querySelector('.nav-toggle');
    var navLinks = document.getElementById('nav-links');
    if (!toggle || !navLinks) return;

    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }
    function open() {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', toggle.getAttribute('data-close'));
      navLinks.classList.add('nav-open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', toggle.getAttribute('data-open'));
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

// On-prem scaling-law chart: an exponential curve that re-scales (zooms out) as it grows.
// The x-axis fills in with channels, people and process data; each milestone brings up one
// real suggestion for the domain the visitor picked.
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
    var leader = svg.querySelector('.sc-leader');
    var pts = svg.querySelectorAll('.sc-pts circle');
    var pins = plot.querySelectorAll('.sc-pin');
    var baseLab = plot.querySelector('.sc-baselab');
    var replay = plot.querySelector('.sc-replay');
    var emerge = plot.querySelector('.sc-emerge');
    var stageBox = plot.parentNode;
    var card = stageBox.querySelector('.sc-card');
    var names = card.querySelectorAll('.sc-c-name');
    var bodies = card.querySelectorAll('.sc-body');
    var NS = 'http://www.w3.org/2000/svg';

    var K = 3.4, E = Math.exp(K) - 1;          // curve shape: f(0)=0, f(1)=1
    var BASE = 0.06;                            // general model, no context
    var Y0 = 0.1, HEAD = 1.12;                  // initial view height, headroom over the tip
    var DURATION = 7000;
    var GRID = [0.0125, 0.025, 0.05, 0.1, 0.2, 0.4, 0.8];
    var MS = [0.36, 0.64, 0.88];                // Discover, Optimize, Coach
    var TRACES = 18400;                         // process-data counter target

    function f(x) { return (Math.exp(K * x) - 1) / E; }
    function view(p) { return Math.max(Y0, f(p) * HEAD); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function smooth(t) { return t * t * (3 - 2 * t); }

    var gridLines = GRID.map(function () {
      var l = document.createElementNS(NS, 'line');
      grid.appendChild(l);
      return l;
    });

    /* ---- the card: one stage x one domain at a time ---- */
    var stage = null, domain = document.querySelector('.dom-btn.is-on').getAttribute('data-domain');
    var pinned = false;                         // true once the visitor picks a stage themselves

    function paint() {
      names.forEach(function (n) { n.hidden = n.getAttribute('data-stage') !== stage; });
      bodies.forEach(function (b) {
        b.hidden = !(b.getAttribute('data-stage') === stage && b.getAttribute('data-domain') === domain);
      });
      pins.forEach(function (pn) { pn.classList.toggle('is-live', pn.getAttribute('data-stage') === stage); });
      card.classList.toggle('on', !!stage);
      leader.classList.toggle('on', !!stage);
    }
    function setStage(s, byUser) {
      if (byUser) pinned = true;
      if (s === stage) return;
      stage = s;
      paint();
    }
    pins.forEach(function (pn) {
      pn.addEventListener('click', function () { setStage(pn.getAttribute('data-stage'), true); place(); });
    });
    document.querySelectorAll('.dom-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.dom-btn').forEach(function (o) {
          o.classList.toggle('is-on', o === b);
          o.setAttribute('aria-selected', o === b ? 'true' : 'false');
          o.setAttribute('tabindex', o === b ? '0' : '-1');
        });
        domain = b.getAttribute('data-domain');
        if (!stage) stage = 'discover';
        paint();
        place();
      });
    });

    /* ---- the x-axis ---- */
    var axis = document.querySelector('.sc-axis');
    var marks = axis ? Array.prototype.slice.call(axis.querySelectorAll('[data-at]')) : [];
    var counter = axis ? axis.querySelector('[data-count]') : null;
    var db = axis ? axis.querySelector('[data-grow]') : null;   // the data icon grows with the count
    function axisAt(p) {
      if (!axis) return;
      marks.forEach(function (m) { m.classList.toggle('on', p >= +m.getAttribute('data-at')); });
      if (counter) counter.textContent = Math.round(f(p) * TRACES).toLocaleString('en-US');
      if (db) {
        db.style.transform = 'scale(' + (0.5 + 0.75 * f(p)).toFixed(3) + ')';
        db.classList.toggle('is-full', p >= 0.64);
      }
    }

    /* ---- geometry ---- */
    var current = 0, W = 0, H = 0, yv = 1;
    function X(x) { return x * W; }
    function Y(y) { return H - (y / yv) * H; }

    function place() {
      if (!stage || !W) { return; }
      var k = ['discover', 'optimize', 'coach'].indexOf(stage);
      var px = X(MS[k]), py = Y(f(MS[k]));
      var bx = card.offsetLeft, by = card.offsetTop, bw = card.offsetWidth, bh = card.offsetHeight;
      leader.setAttribute('x1', px); leader.setAttribute('y1', py);
      leader.setAttribute('x2', clamp(px, bx + 16, bx + bw - 16)); leader.setAttribute('y2', by + bh);
    }

    function render(p) {
      current = p;
      axisAt(p);
      W = plot.clientWidth; H = plot.clientHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      yv = view(p);

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

      // "emergent behavior" sits as high inside the filled wedge as its own width allows,
      // so it always reads as part of the green under the peak
      var exl = Math.max(0, (W - emerge.offsetWidth - 10) / W);
      emerge.style.top = clamp(Y(f(Math.min(exl, p))) + 7, 0, H - 26) + 'px';
      emerge.classList.toggle('on', p >= 0.9);

      MS.forEach(function (mx, k) {
        var on = p >= mx, px = X(mx), py = Y(f(mx));
        pts[k].classList.toggle('on', on);
        pts[k].setAttribute('cx', px); pts[k].setAttribute('cy', py);
        pins[k].classList.toggle('on', on);
        pins[k].style.left = px + 'px';
        pins[k].style.top = py + 'px';
        if (on && !pinned) setStage(pins[k].getAttribute('data-stage'));
      });
      place();
    }

    var raf = null;
    function play() {
      if (raf) cancelAnimationFrame(raf);
      pinned = false;
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
        if (reduce) { render(1); setStage('coach'); place(); } else play();
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
