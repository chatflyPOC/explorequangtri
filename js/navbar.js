/* ============================================================
   NAVBAR.JS — Shared navigation for all pages
   Auto-detects current page, sets active link, handles scroll + menu
   ============================================================ */
(function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  const isHome = page === '' || page === 'index.html';

  /* ── Navigation items ── */
  const NAV = [
    { href: 'index.html',        label: '🏠 Trang Chủ',      id: 'home' },
    { href: 'index.html#planner-section', label: '✨ Lập Kế Hoạch', id: 'planner',
      onclick: isHome
        ? "document.getElementById('planner-section')?.scrollIntoView({behavior:'smooth'});return false;"
        : null },
    { href: 'destinations.html', label: '📍 Địa Điểm',       id: 'destinations' },
    { href: 'blog.html',         label: '✍️ Review & Blog',  id: 'blog' },
    { href: 'services.html',     label: '🛎️ Dịch Vụ',        id: 'services' },
  ];

  const activeId = {
    'index.html':        'home',
    '':                  'home',
    'destinations.html': 'destinations',
    'blog.html':         'blog',
    'services.html':     'services',
    'itinerary.html':    'planner',
    'tips.html':         'home',
    'map.html':          'home',
    'post.html':         'blog',
  }[page] || '';

  const links = NAV.map(n => {
    const isActive = n.id === activeId;
    const onclick  = n.onclick ? ` onclick="${n.onclick}"` : '';
    return `<a href="${n.href}" class="nav-link${isActive ? ' active' : ''}"${onclick}>${n.label}</a>`;
  }).join('');

  /* ── CTA button ── */
  const cta = isHome
    ? `<a href="https://zalo.me/0337788044" target="_blank" rel="noopener" class="btn btn-accent btn-sm navbar-cta">
         <i class="fas fa-headset"></i> Tư vấn miễn phí
       </a>`
    : `<a href="index.html#planner-section" class="btn btn-accent btn-sm navbar-cta">
         <i class="fas fa-magic"></i> Lập kế hoạch
       </a>`;

  /* ── Build & inject navbar ── */
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.id = 'navbar';
  nav.innerHTML = `
    <a href="index.html" class="navbar-brand">
      <div class="navbar-logo">🗺️</div>
      <div class="navbar-name">Explore<span>Quảng Trị</span></div>
    </a>
    <div class="navbar-nav" id="navMenu">${links}</div>
    <div class="navbar-right">
      ${cta}
      <button class="hamburger" id="hamburger" aria-label="Menu" onclick="toggleMenu()">
        <span></span><span></span><span></span>
      </button>
    </div>`;

  /* Insert as first child of body */
  document.body.insertBefore(nav, document.body.firstChild);

  /* ── Scroll — add .scrolled shadow ── */
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Mobile menu toggle ── */
  window.toggleMenu = function () {
    const menu = document.getElementById('navMenu');
    const btn   = document.getElementById('hamburger');
    if (!menu) return;
    menu.classList.toggle('open');
    btn?.classList.toggle('open');
  };

  /* Close menu on outside click */
  document.addEventListener('click', e => {
    if (!nav.contains(e.target)) {
      document.getElementById('navMenu')?.classList.remove('open');
      document.getElementById('hamburger')?.classList.remove('open');
    }
  });
})();
