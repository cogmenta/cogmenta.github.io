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
          el.dispatchEvent(new CustomEvent('fx:visible'));
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

// FX — motion accents in the spirit of originkit-style demos, rebuilt natively on the kit's
// tokens: a cursor-reactive dot grid behind the hero, a focus-reveal headline, orbit/slide/
// magnetic buttons, spotlight cards, decoding labels, a count-up readout and light cables
// behind Technology (the CTA aurora is CSS-only). Every hook is injected here, so the markup
// stays clean and the page reads the same without JS. Reduced motion turns it all off.
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var fine = mq('(hover: hover) and (pointer: fine)');
  var TAU = Math.PI * 2;

  /* colours come from the kit tokens on the element, so every band and theme keeps its own */
  function token(el, name, fallback) {
    var v = getComputedStyle(el).getPropertyValue(name).trim();
    return rgb(v) || rgb(fallback);
  }
  function rgb(c) {
    var m;
    if ((m = /^#([0-9a-f]{3})$/i.exec(c))) return m[1].split('').map(function (h) { return parseInt(h + h, 16); });
    if ((m = /^#([0-9a-f]{6})/i.exec(c))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    if ((m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c))) return [+m[1], +m[2], +m[3]];
    return null;
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
  function onVisible(el, fn) {
    if (!el) return;
    if (el.classList.contains('visible')) fn();
    else el.addEventListener('fx:visible', fn, { once: true });
  }
  function inView(el, margin) {
    var r = el.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
    return r.bottom > -(margin || 0) && r.top < vh + (margin || 0);
  }

  /* ---------- hero: dot grid that repels and lights up around the cursor ---------- */
  function dotGrid() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var c = document.createElement('canvas');
    c.className = 'fx-grid'; c.setAttribute('aria-hidden', 'true');
    hero.insertBefore(c, hero.firstChild);
    var ctx = c.getContext('2d');
    var GAP = 26, RADIUS = 160, PUSH = 12;
    var base = token(hero, '--cg-loop-outer', '#0B1F3A'), acc = token(hero, '--cg-accent', '#1FA89A');
    var W = 0, H = 0, dots = [], mx = -1e4, my = -1e4, raf = null;

    function size() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = hero.clientWidth; H = hero.clientHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      var ox = ((W % GAP) / 2) + GAP / 2, oy = ((H % GAP) / 2) + GAP / 2;
      for (var y = oy; y < H; y += GAP) for (var x = ox; x < W; x += GAP) dots.push({ x: x, y: y, dx: 0, dy: 0, s: 0 });
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var settled = true;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i], vx = d.x - mx, vy = d.y - my, dist = Math.sqrt(vx * vx + vy * vy);
        var t = dist < RADIUS ? 1 - dist / RADIUS : 0;
        t = t * t * (3 - 2 * t);
        var tx = t ? vx / dist * t * PUSH : 0, ty = t ? vy / dist * t * PUSH : 0;
        d.dx += (tx - d.dx) * 0.16; d.dy += (ty - d.dy) * 0.16; d.s += (t - d.s) * 0.16;
        if (Math.abs(tx - d.dx) > 0.04 || Math.abs(ty - d.dy) > 0.04 || Math.abs(t - d.s) > 0.005) settled = false;
        ctx.fillStyle = rgba(mix(base, acc, d.s), 0.11 + d.s * 0.75);
        ctx.beginPath(); ctx.arc(d.x + d.dx, d.y + d.dy, 1.15 + d.s * 1.7, 0, TAU); ctx.fill();
      }
      return settled;
    }
    function loop() { raf = draw() ? null : requestAnimationFrame(loop); }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }

    if (fine) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top; kick();
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { mx = my = -1e4; kick(); });
    }
    window.addEventListener('resize', function () { requestAnimationFrame(size); });
    size();
  }

  /* ---------- headline: split into words so each can snap into focus ---------- */
  function focusReveal() {
    var h = document.querySelector('.hero-title');
    if (!h) return;
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { walk(n); return; }
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          var w = document.createElement('span');
          w.className = 'fx-w'; w.style.setProperty('--i', i++); w.textContent = p;
          frag.appendChild(w);
        });
        node.replaceChild(frag, n);
      });
    })(h);
  }

  /* ---------- buttons: comet ring on the primary, slide-fill on the outline, magnetic pull on both ---------- */
  function buttons() {
    var scope = document.querySelectorAll('.hero-actions, .cta-actions, .hiring');
    var mags = [];
    scope.forEach(function (box) {
      box.querySelectorAll('.cg-btn').forEach(function (b) {
        b.classList.add(b.classList.contains('cg-btn--outline') ? 'fx-slide' : 'fx-orbit');
        if (fine) { b.classList.add('fx-mag'); mags.push(b); }
      });
    });
    if (!mags.length) return;
    var px = 0, py = 0, ticking = false;
    function apply() {
      ticking = false;
      for (var i = 0; i < mags.length; i++) {
        var r = mags[i].getBoundingClientRect();
        var dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        var near = Math.abs(dx) < r.width / 2 + 40 && Math.abs(dy) < r.height / 2 + 40;
        // a gentle lean, capped so neighbouring buttons never overlap
        var lx = Math.max(-8, Math.min(8, dx * 0.12)), ly = Math.max(-6, Math.min(6, dy * 0.12));
        mags[i].style.transform = near ? 'translate(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px)' : '';
      }
    }
    document.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
  }

  /* ---------- cards: a spotlight follows the cursor across the whole grid ---------- */
  function spotlight() {
    document.querySelectorAll('.hooks, .steps, .papers').forEach(function (host) {
      var cards = Array.prototype.filter.call(host.children, function (el) { return el.matches('.hook, .step, .paper'); });
      cards.forEach(function (card) {
        card.classList.add('fx-spot');
        var fill = document.createElement('i'), ring = document.createElement('i');
        fill.className = 'fx-spot-fill'; ring.className = 'fx-spot-ring';
        card.appendChild(fill); card.appendChild(ring);
      });
      host.addEventListener('pointermove', function (e) {
        cards.forEach(function (card) {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--fx-x', (e.clientX - r.left).toFixed(0) + 'px');
          card.style.setProperty('--fx-y', (e.clientY - r.top).toFixed(0) + 'px');
        });
      }, { passive: true });
      host.addEventListener('pointerenter', function () { host.classList.add('fx-lit'); });
      host.addEventListener('pointerleave', function () { host.classList.remove('fx-lit'); });
    });
  }

  /* ---------- labels: mono eyebrows decode from glyph noise as they enter ---------- */
  function decode(el) {
    var text = el.textContent;
    if (!text.trim()) return;
    var live = document.createElement('span'), sr = document.createElement('span');
    live.className = 'fx-scr'; live.setAttribute('aria-hidden', 'true'); live.textContent = text;
    sr.className = 'visually-hidden'; sr.textContent = text;
    el.textContent = ''; el.appendChild(live); el.appendChild(sr);
    var GLYPHS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ#%&<>/_', n = text.length, t0 = null, D = 720;
    function glyph(ch) {
      if (/[A-Za-z0-9]/.test(ch)) return GLYPHS[Math.random() * GLYPHS.length | 0];
      var code = ch.charCodeAt(0);
      if (code >= 0xAC00 && code <= 0xD7A3) return String.fromCharCode(0xAC00 + (Math.random() * 11172 | 0));
      return ch;
    }
    function step(now) {
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / D), k = Math.floor(p * (n + 2)), out = '';
      for (var i = 0; i < n; i++) out += i < k ? text[i] : glyph(text[i]);
      live.textContent = p < 1 ? out : text;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- readout: the numbers count up when the row enters ---------- */
  function countUp(el) {
    var node = el.firstChild;
    if (!node || node.nodeType !== 3) return;
    var end = node.nodeValue, re = /\d+(?:\.\d+)?/g, t0 = null, D = 1400;
    function step(now) {
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / D), k = 1 - Math.pow(1 - p, 3);
      node.nodeValue = p < 1 ? end.replace(re, function (m) {
        var dec = (m.split('.')[1] || '').length;
        return (parseFloat(m) * k).toFixed(dec);
      }) : end;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- technology: light cables drift behind the copy, pulses travel along them ---------- */
  function cables() {
    var sec = document.querySelector('.section--navy');
    if (!sec) return;
    var c = document.createElement('canvas');
    c.className = 'fx-cables'; c.setAttribute('aria-hidden', 'true');
    sec.insertBefore(c, sec.firstChild);
    var ctx = c.getContext('2d');
    var acc = token(sec, '--cg-accent', '#35C4B5'), fg = token(sec, '--cg-fg', '#FFFFFF');
    var N = 6, SEG = 90, TAIL = 0.11, W = 0, H = 0, lines = [], raf = null, last = 0;
    for (var i = 0; i < N; i++) {
      lines.push({
        y: (i + 0.5) / N, amp: 34 + Math.random() * 52, ph: Math.random() * TAU,
        sp: 0.00007 + Math.random() * 0.00005,
        pulses: [{ t: Math.random() * 1.2 - 0.1, v: 0.00005 + Math.random() * 0.00004 }]
      });
      if (i % 2) lines[i].pulses.push({ t: Math.random() * 1.2 - 0.1, v: 0.00004 + Math.random() * 0.00003 });
    }
    function at(l, u, now) {
      return [u * W, l.y * H
        + Math.sin(u * 3.1 + l.ph + now * l.sp) * l.amp
        + Math.sin(u * 7.3 - l.ph * 2 - now * l.sp * 1.6) * l.amp * 0.35];
    }
    function size() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = sec.clientWidth; H = sec.clientHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now(), 0);
    }
    function draw(now, dt) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i], k, p;
        ctx.beginPath();
        for (k = 0; k <= SEG; k++) { p = at(l, k / SEG, now); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.strokeStyle = rgba(fg, 0.075); ctx.lineWidth = 1; ctx.stroke();
        for (var j = 0; j < l.pulses.length; j++) {
          var pu = l.pulses[j];
          pu.t += pu.v * dt; if (pu.t > 1 + TAIL) pu.t = -0.05;
          var head = at(l, pu.t, now), tail = at(l, pu.t - TAIL, now);
          var g = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
          g.addColorStop(0, rgba(acc, 0)); g.addColorStop(1, rgba(acc, 0.95));
          ctx.beginPath();
          for (k = 0; k <= 24; k++) { p = at(l, pu.t - TAIL + TAIL * k / 24, now); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
          ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.stroke();
          var halo = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], 18);
          halo.addColorStop(0, rgba(acc, 0.5)); halo.addColorStop(1, rgba(acc, 0));
          ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(head[0], head[1], 18, 0, TAU); ctx.fill();
          ctx.fillStyle = rgba(fg, 0.95); ctx.beginPath(); ctx.arc(head[0], head[1], 1.6, 0, TAU); ctx.fill();
        }
      }
    }
    function loop(now) {
      raf = null;
      if (document.hidden || !inView(sec, 80)) { last = 0; return; }
      var dt = last ? Math.min(64, now - last) : 16; last = now;
      draw(now, dt);
      raf = requestAnimationFrame(loop);
    }
    function wake() { if (!raf && !document.hidden && inView(sec, 80)) raf = requestAnimationFrame(loop); }
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', function () { requestAnimationFrame(size); wake(); });
    document.addEventListener('visibilitychange', wake);
    size(); wake();
  }

  ready(function () {
    if (!document.querySelector('.hero')) return;
    focusReveal();
    if (reduce) return;
    dotGrid();
    buttons();
    if (fine) spotlight();
    document.querySelectorAll('.eyebrow').forEach(function (el) { onVisible(el, function () { decode(el); }); });
    onVisible(document.querySelector('.readout'), function () {
      document.querySelectorAll('.readout-val').forEach(countUp);
    });
    cables();
  });
})();
