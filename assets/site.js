(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav-links');
  const close = () => {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded','false');
    nav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
  };
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const next = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(next));
      nav.classList.toggle('is-open', next);
      document.body.classList.toggle('nav-open', next);
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});
  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
  }), {threshold:.1});
  items.forEach(el => io.observe(el));
})();
