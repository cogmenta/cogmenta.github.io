// Cogmenta — reveal-on-scroll (rAF + scroll fallback; robust where IntersectionObserver stalls) + nav drawer
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
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(function () { spy(); ticking = false; }); }
    }, { passive: true });
    spy();
  });
})();
