// Fade-in on scroll — any element with [data-animate] gets the treatment.
// Add data-animate to new elements in HTML; no JS changes needed.
document.addEventListener('DOMContentLoaded', () => {
  const targets = document.querySelectorAll('[data-animate]');

  targets.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach(el => observer.observe(el));

  // ---- Mobile nav drawer ----
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (!toggle || !navLinks) return;

  function openDrawer() {
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    navLinks.classList.add('nav-open');
    document.body.classList.add('nav-drawer-open');
  }

  function closeDrawer() {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    navLinks.classList.remove('nav-open');
    document.body.classList.remove('nav-drawer-open');
  }

  function isDrawerOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  toggle.addEventListener('click', () => {
    if (isDrawerOpen()) {
      closeDrawer();
      toggle.focus();
    } else {
      openDrawer();
    }
  });

  // Escape closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDrawerOpen()) {
      closeDrawer();
      toggle.focus();
    }
  });

  // Close drawer when a nav link is clicked (smooth scroll to section)
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (isDrawerOpen()) closeDrawer();
    });
  });

  // Focus trap inside drawer when open
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !isDrawerOpen()) return;

    const focusable = [toggle, ...navLinks.querySelectorAll('a')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
});
