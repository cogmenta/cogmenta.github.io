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
});
