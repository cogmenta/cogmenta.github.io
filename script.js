// Fade-in on scroll
document.addEventListener('DOMContentLoaded', () => {
  const targets = document.querySelectorAll(
    '.card, .feature, .arch-step, .industry, .stat, .section-label, .section-title, .section-desc, .stealth-badge, .hero-title, .hero-subtitle, .hero-actions, .cta-title, .cta-text, .cta-actions, .vision-equation, .vision-tagline, .vision-desc, .phase-card, .outcome-hero, .outcome-big-stat, .outcome-context, .team-member, .team-hiring, .team-hero-title, .team-hero-subtitle'
  );

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
