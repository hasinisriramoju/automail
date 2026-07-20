/**
 * AutoMail AI — Landing Page JS
 * Scroll animations, navbar effects, interactions
 */

document.addEventListener('DOMContentLoaded', () => {

  // ─── Navbar: add .scrolled class on scroll ─────────────
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // ─── Reveal on Scroll ─────────────────────────────────
  const reveals = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
  );
  reveals.forEach(el => revealObserver.observe(el));

  // ─── Hero elements auto-reveal (above fold) ───────────
  document.querySelectorAll('.hero-left, .hero-right').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });

  // ─── Typing placeholder animation ─────────────────────
  const input = document.getElementById('hero-input');
  if (input) {
    const phrases = [
      'Enter company website or email address...',
      'razorpay.com — generate a partnership email...',
      'zepto.com — write a sales proposal...',
      'swiggy.com — craft a collab outreach...',
    ];
    let i = 0;
    setInterval(() => {
      i = (i + 1) % phrases.length;
      input.placeholder = phrases[i];
    }, 3500);
  }

  // ─── Popular tag clicks fill input ────────────────────
  document.querySelectorAll('.popular-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      if (input) {
        input.focus();
      }
    });
  });

  // ─── Smooth scroll for anchor links ───────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ─── Animate chart bars on scroll ─────────────────────
  const chartBars = document.querySelectorAll('.mock-bar');
  const chartObs = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          chartBars.forEach((bar, idx) => {
            bar.style.transition = `height 0.5s cubic-bezier(0.16,1,0.3,1) ${idx * 60}ms`;
          });
        }
      });
    },
    { threshold: 0.5 }
  );
  const mockChart = document.querySelector('.mock-chart');
  if (mockChart) chartObs.observe(mockChart);

  // ─── Feature card stagger on scroll ───────────────────
  const featureCards = document.querySelectorAll('.feature-card');
  const cardObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, idx * 80);
          cardObs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  featureCards.forEach(card => {
    card.classList.add('reveal');
    cardObs.observe(card);
  });

  // ─── Nav active link highlight ─────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  const sectionObs = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.style.color = link.getAttribute('href') === `#${entry.target.id}`
              ? 'var(--navy)' : '';
          });
        }
      });
    },
    { threshold: 0.5 }
  );
  sections.forEach(s => sectionObs.observe(s));

  // ─── Mobile menu (future) ──────────────────────────────
  // Placeholder for hamburger menu on mobile

  console.log('🚀 AutoMail AI — Landing page loaded');
});
