document.documentElement.classList.add('js');
(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav-links');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const close = (restoreFocus = false) => {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Open navigation');
    nav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    if (restoreFocus) toggle.focus();
  };
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const next = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(next));
      toggle.setAttribute('aria-label', next ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('is-open', next);
      document.body.classList.toggle('nav-open', next);
      if (next) requestAnimationFrame(() => nav.querySelector('a')?.focus());
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => close(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close(true); });
    window.addEventListener('resize', () => { if (window.innerWidth > 760) close(false); }, {passive:true});
  }
  if (reduceMotion) {
    document.querySelectorAll('video[autoplay]').forEach(video => {
      video.removeAttribute('autoplay');
      video.pause();
    });
  }
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});
  const items = document.querySelectorAll('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
  }), {threshold:.1});
  items.forEach(el => io.observe(el));
})();
