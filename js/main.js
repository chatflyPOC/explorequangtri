// ============================================================
//  MAIN.JS — Map-centric homepage
//  Leaflet + MarkerCluster + Sidebar + Detail Panel
// ============================================================

// ── State ────────────────────────────────────────────────
let map, clusterGroup;
let activeCategory   = 'all';
let searchQuery      = '';
let currentDest      = null;
let sidebarCollapsed = false;
let markersById      = {};   // id → { marker, dest }
let isMobile = () => window.innerWidth <= 768;

// ── Category config ───────────────────────────────────────
const CAT_COLORS = {
  history:   '#7B3F00',
  nature:    '#1B5E20',
  beach:     '#0D47A1',
  religion:  '#4A148C',
  food:      '#B71C1C',
  stay:      '#004D40',
  transport: '#37474F',
  service:   '#263238',
};
const CAT_EMOJIS = {
  history:'🏛️', nature:'🌿', beach:'🏖️', religion:'⛩️',
  food:'🍜', stay:'🏨', transport:'🚗', service:'🏪',
};
function getCatEmoji(cat) { return CAT_EMOJIS[cat] || '📍'; }
function getCatColor(cat) { return CAT_COLORS[cat] || '#1B5E42'; }

// ── Vietnam bounding box ──────────────────────────────────
const VN_BOUNDS = L.latLngBounds(
  L.latLng(8.0,  101.8),
  L.latLng(23.5, 109.8)
);
const VN_CENTER      = [16.35, 107.5];
const VN_DEFAULT_ZOOM = 6;

// ── Leaflet init ──────────────────────────────────────────
function initMap() {
  map = L.map('map', {
    center:             VN_CENTER,
    zoom:               VN_DEFAULT_ZOOM,
    minZoom:            5,
    maxZoom:            18,
    zoomControl:        false,
    attributionControl: true,
    maxBounds:          VN_BOUNDS,
    maxBoundsViscosity: 0.9,
  });

  // Esri World Imagery — satellite, only loads tiles within Vietnam bounds
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics',
      maxZoom: 19,
      bounds:  VN_BOUNDS,
    }
  ).addTo(map);

  // Label overlay — road names, province names
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
      bounds:  VN_BOUNDS,
      opacity: 0.9,
    }
  ).addTo(map);

  // Zoom control bottom-left
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  // Marker cluster group
  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 55,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    iconCreateFunction(cluster) {
      const n    = cluster.getChildCount();
      const size = n < 6 ? 'sm' : n < 16 ? 'md' : 'lg';
      const px   = size === 'sm' ? 34 : size === 'md' ? 42 : 50;
      return L.divIcon({
        html:      `<div class="marker-cluster-custom ${size}">${n}</div>`,
        className: '',
        iconSize:   L.point(px, px),
        iconAnchor: L.point(px / 2, px / 2),
      });
    },
  });
  map.addLayer(clusterGroup);

  // Add all destination markers from data.js
  destinations.forEach(addMarker);

  // Close detail panel on bare-map click
  map.on('click', e => {
    const t = e.originalEvent.target;
    if (t.id === 'map' || t.classList.contains('leaflet-tile') ||
        t.classList.contains('leaflet-container')) {
      closeDetailPanel();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDetailPanel();
  });

  // Handle ?dest= URL param
  const params = new URLSearchParams(window.location.search);
  if (params.get('dest')) {
    const d = destinations.find(x => x.id == params.get('dest'));
    if (d) setTimeout(() => focusDestination(d), 600);
  }
}

// ── Markers ───────────────────────────────────────────────
function createMarkerIcon(dest) {
  const color    = getCatColor(dest.category);
  const emoji    = getCatEmoji(dest.category);
  const isHot    = dest.highlight;
  const size     = isHot ? 38 : 30;
  const hotClass = isHot ? ' hot' : '';
  return L.divIcon({
    className: '',
    html: `<div class="custom-marker-pin${hotClass}" style="background:${color};width:${size}px;height:${size}px;">
             <span class="marker-inner${hotClass}">${emoji}</span>
           </div>`,
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size],
    popupAnchor: [0, -size - 4],
  });
}

function addMarker(dest) {
  const marker = L.marker([dest.lat, dest.lng], {
    icon:  createMarkerIcon(dest),
    title: dest.name,
  });
  marker.bindTooltip(
    `<div style="font-family:Poppins,sans-serif;font-size:.72rem;font-weight:600;padding:2px 4px;">${dest.name}</div>`,
    { direction: 'top', offset: [0, -10], opacity: 1, className: 'custom-tooltip' }
  );
  marker.on('click', () => focusDestination(dest));
  clusterGroup.addLayer(marker);
  markersById[dest.id] = { marker, dest };
}

// ── Focus / open destination ──────────────────────────────
function focusDestination(dest) {
  currentDest = dest;
  map.flyTo([dest.lat, dest.lng], Math.max(map.getZoom(), 12), { animate: true, duration: .9 });
  openDetailPanel(dest);
  document.querySelectorAll('.place-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id == dest.id)
  );
  const item = document.querySelector(`.place-item[data-id="${dest.id}"]`);
  if (item) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Detail Panel ──────────────────────────────────────────
function openDetailPanel(dest) {
  const panel = document.getElementById('detailPanel');
  document.getElementById('detailPanelEmoji').textContent = getCatEmoji(dest.category);
  document.getElementById('detailPanelHeader').style.background =
    `linear-gradient(135deg, ${getCatColor(dest.category)}dd, ${getCatColor(dest.category)}99)`;

  const favs = getFavorites();
  document.getElementById('detailPanelBody').innerHTML = `
    <div class="flex items-center gap-2 mb-2" style="flex-wrap:wrap;">
      <span class="badge badge-primary">${CATEGORIES[dest.category]?.label || dest.category}</span>
      ${dest.highlight ? '<span class="badge badge-hot">⭐ Nổi bật</span>' : ''}
      ${dest.admission === 'Miễn phí' ? '<span class="badge badge-free">Miễn phí</span>' : ''}
    </div>
    <h2 class="detail-title">${dest.name}</h2>
    <div class="rating-row mb-3">
      <span class="stars">★★★★★</span>
      <span class="rating-score">${dest.rating}</span>
      <span class="rating-count">(${(dest.reviews || 0).toLocaleString()} đánh giá)</span>
    </div>
    <p style="font-size:.8rem;line-height:1.7;color:var(--c-text-2);margin-bottom:18px;">${dest.description || ''}</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;">
      ${infoCell('📍', 'Địa chỉ',   dest.address || '')}
      ${infoCell('🕐', 'Giờ mở cửa', dest.hours   || '')}
      ${infoCell('🎟️', 'Vào cửa',   dest.admission || '')}
      ${infoCell('⏱️', 'Tham quan', dest.duration  || '')}
      ${dest.bestTime ? infoCell('🌤️', 'Thời điểm tốt', dest.bestTime, true) : ''}
      ${dest.phone    ? infoCell('📞', 'Liên hệ', dest.phone) : ''}
    </div>

    ${dest.tips?.length ? `
    <div style="margin-bottom:14px;">
      <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--c-muted);margin-bottom:8px;">💡 Mẹo ghé thăm</div>
      <ul class="detail-tips-list">
        ${dest.tips.map(t => `<li>${t}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${dest.tags?.length ? `
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px;">
      ${dest.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
    </div>` : ''}
  `;

  document.getElementById('detailFooter').innerHTML = `
    <a href="https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}"
       target="_blank" class="btn btn-outline btn-sm">
      <i class="fas fa-directions"></i> Chỉ đường
    </a>
    <a href="itinerary.html?include=${dest.id}" class="btn btn-primary btn-sm">
      <i class="fas fa-route"></i> Thêm lộ trình
    </a>
    <button onclick="toggleFav(${dest.id}, this)"
      class="btn ${favs.includes(dest.id) ? 'btn-accent' : 'btn-outline'} btn-sm">
      ${favs.includes(dest.id) ? '❤️ Đã lưu' : '🤍 Lưu'}
    </button>
  `;

  panel.classList.add('open');
  if (isMobile()) document.getElementById('sidebar').classList.remove('mobile-open');
}

function infoCell(icon, label, value, wide = false) {
  if (!value) return '';
  return `<div style="background:var(--c-bg);border-radius:var(--r-sm);padding:9px 11px;${wide ? 'grid-column:span 2;' : ''}">
    <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--c-muted);margin-bottom:2px;">${icon} ${label}</div>
    <div style="font-size:.78rem;font-weight:600;color:var(--c-text);line-height:1.4;">${value}</div>
  </div>`;
}

function closeDetailPanel() {
  document.getElementById('detailPanel').classList.remove('open');
  document.querySelectorAll('.place-item').forEach(el => el.classList.remove('active'));
  currentDest = null;
}

// ── Sidebar rendering ─────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('sidebarList');
  const q    = searchQuery.toLowerCase();

  let filtered = destinations.filter(d => {
    const catOk = activeCategory === 'all' || d.category === activeCategory;
    const qOk   = !q || d.name.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q);
    return catOk && qOk;
  });

  // Hot first, then by rating
  filtered.sort((a, b) => {
    if (a.highlight && !b.highlight) return -1;
    if (!a.highlight && b.highlight) return 1;
    return b.rating - a.rating;
  });

  document.getElementById('sidebarCount').textContent =
    filtered.length === destinations.length
      ? `${destinations.length} địa điểm`
      : `${filtered.length} / ${destinations.length} địa điểm`;

  updateFilterCounts();
  updateMarkersVisibility(filtered.map(d => d.id));

  if (!filtered.length) {
    list.innerHTML = `
      <div style="padding:40px 20px;text-align:center;color:var(--c-muted);">
        <div style="font-size:2rem;margin-bottom:10px;">🔍</div>
        <div style="font-size:.82rem;font-weight:600;">Không tìm thấy địa điểm</div>
        <div style="font-size:.72rem;margin-top:4px;">Thử thay đổi bộ lọc hoặc từ khóa</div>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(d => `
    <div class="place-item" data-id="${d.id}" onclick="focusDestination(destinations.find(x=>x.id===${d.id}))">
      <div class="place-item-icon" style="background:${getCatColor(d.category)}20;">
        ${getCatEmoji(d.category)}
      </div>
      <div class="place-item-body">
        <div class="place-item-name">${d.name}</div>
        <div class="place-item-sub">${d.subcategory || CATEGORIES[d.category]?.label || ''}</div>
        <div class="place-item-meta">
          ${d.highlight ? '<span class="place-item-badge hot">⭐ Nổi bật</span>' : ''}
          ${d.admission === 'Miễn phí' ? '<span class="place-item-badge">Miễn phí</span>' : ''}
        </div>
      </div>
      <div class="place-item-right">
        <div class="place-item-rating"><span class="star">★</span>${d.rating}</div>
        <div class="place-item-duration">${d.duration || ''}</div>
      </div>
    </div>
  `).join('');
}

function updateFilterCounts() {
  const cats = ['all', 'history', 'beach', 'nature', 'religion'];
  cats.forEach(cat => {
    const el = document.getElementById(`cnt-${cat}`);
    if (!el) return;
    el.textContent = cat === 'all'
      ? destinations.length
      : destinations.filter(d => d.category === cat).length;
  });
}

function updateMarkersVisibility(visibleIds) {
  clusterGroup.clearLayers();
  destinations.forEach(dest => {
    if (visibleIds.includes(dest.id)) {
      clusterGroup.addLayer(markersById[dest.id].marker);
    }
  });
}

// ── Filters ───────────────────────────────────────────────
function initFilters() {
  document.getElementById('sidebarFilters').addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('#sidebarFilters .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.cat;
    renderSidebar();
    document.querySelectorAll('.map-filter-chip').forEach(c =>
      c.classList.toggle('active', c.dataset.cat === activeCategory));
  });

  document.getElementById('mapFilterBar').addEventListener('click', e => {
    const chip = e.target.closest('.map-filter-chip');
    if (!chip) return;
    document.querySelectorAll('.map-filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.cat;
    document.querySelectorAll('#sidebarFilters .filter-chip').forEach(c =>
      c.classList.toggle('active', c.dataset.cat === activeCategory));
    renderSidebar();
  });
}

// ── Search ────────────────────────────────────────────────
function initSearch() {
  const sInput = document.getElementById('sidebarSearch');
  const sBtn   = document.getElementById('sidebarSearchClear');
  sInput.addEventListener('input', function() {
    searchQuery = this.value.trim();
    sBtn.style.display = searchQuery ? 'flex' : 'none';
    renderSidebar();
  });

  const mInput   = document.getElementById('mapSearch');
  const mResults = document.getElementById('mapSearchResults');

  mInput.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    if (q.length < 2) { mResults.classList.remove('show'); return; }
    const hits = destinations.filter(d =>
      d.name.toLowerCase().includes(q) || d.tags?.some(t => t.includes(q))
    ).slice(0, 8);
    if (!hits.length) {
      mResults.innerHTML = '<div style="padding:12px 16px;font-size:.8rem;color:var(--c-muted);">Không tìm thấy kết quả</div>';
      mResults.classList.add('show');
      return;
    }
    mResults.innerHTML = hits.map(d => `
      <div class="search-result-item" onclick="focusDestination(destinations.find(x=>x.id===${d.id}));closeMapSearch()">
        <span class="search-result-icon">${getCatEmoji(d.category)}</span>
        <div>
          <div class="search-result-name">${d.name}</div>
          <div class="search-result-sub">${CATEGORIES[d.category]?.label || ''}</div>
        </div>
      </div>
    `).join('');
    mResults.classList.add('show');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.map-search-overlay')) closeMapSearch();
  });
  mInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMapSearch();
    if (e.key === 'Enter') doMapSearch();
  });
}

function doMapSearch() {
  const q = document.getElementById('mapSearch').value.trim().toLowerCase();
  if (!q) return;
  const hit = destinations.find(d => d.name.toLowerCase().includes(q));
  if (hit) { focusDestination(hit); closeMapSearch(); }
  else showToast('Không tìm thấy địa điểm phù hợp', 'ℹ️');
}

function closeMapSearch() { document.getElementById('mapSearchResults').classList.remove('show'); }

function clearSearch() {
  document.getElementById('sidebarSearch').value = '';
  document.getElementById('sidebarSearchClear').style.display = 'none';
  searchQuery = '';
  renderSidebar();
}

// ── GPS ───────────────────────────────────────────────────
function locateMe() {
  if (!navigator.geolocation) { showToast('Trình duyệt không hỗ trợ định vị', '⚠️'); return; }
  const btn = document.getElementById('gpsBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      map.flyTo([lat, lng], 14, { animate: true, duration: 1 });
      L.circleMarker([lat, lng], {
        radius: 10, fillColor: '#1565C0', fillOpacity: .9,
        color: '#fff', weight: 3, interactive: false,
      }).addTo(map)
        .bindPopup('<div style="font-family:Poppins;font-size:.78rem;font-weight:600;padding:2px 4px;">📍 Bạn đang ở đây</div>')
        .openPopup();
      btn.innerHTML = '<i class="fas fa-location-arrow"></i>';
      btn.classList.add('active');
      showToast('Đã tìm thấy vị trí của bạn', '📍');
    },
    () => {
      btn.innerHTML = '<i class="fas fa-location-arrow"></i>';
      showToast('Không thể xác định vị trí', '⚠️');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function resetMapView() {
  map.flyTo(VN_CENTER, VN_DEFAULT_ZOOM, { animate: true, duration: 1 });
}

// ── Sidebar toggle (desktop) ──────────────────────────────
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  const icon = document.getElementById('sidebarToggleIcon');
  if (icon) icon.className = sidebarCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
  setTimeout(() => map.invalidateSize(), 380);
}

function toggleMobileSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
}

// ── Favorites ─────────────────────────────────────────────
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('eqt_favs') || '[]'); } catch { return []; }
}
function saveFavorites(f) { localStorage.setItem('eqt_favs', JSON.stringify(f)); }

function toggleFav(id, btn) {
  const favs = getFavorites();
  const idx  = favs.indexOf(id);
  if (idx > -1) {
    favs.splice(idx, 1);
    if (btn) { btn.innerHTML = '🤍 Lưu'; btn.className = btn.className.replace('btn-accent', 'btn-outline'); }
    showToast('Đã xóa khỏi yêu thích', '🗑️');
  } else {
    favs.push(id);
    if (btn) { btn.innerHTML = '❤️ Đã lưu'; btn.className = btn.className.replace('btn-outline', 'btn-accent'); }
    showToast('Đã lưu vào yêu thích', '❤️');
  }
  saveFavorites(favs);
  document.getElementById('favBtn')?.classList.toggle('active', favs.length > 0);
}

function showFavorites() {
  const favs = getFavorites();
  if (!favs.length) { showToast('Chưa có địa điểm yêu thích', 'ℹ️'); return; }
  searchQuery = ''; activeCategory = 'all';
  const favDests = destinations.filter(d => favs.includes(d.id));
  updateMarkersVisibility(favDests.map(d => d.id));
  document.getElementById('sidebarCount').textContent = `${favDests.length} địa điểm yêu thích`;
  document.getElementById('sidebarList').innerHTML = favDests.map(d => `
    <div class="place-item" data-id="${d.id}" onclick="focusDestination(destinations.find(x=>x.id===${d.id}))">
      <div class="place-item-icon" style="background:${getCatColor(d.category)}20;">${getCatEmoji(d.category)}</div>
      <div class="place-item-body">
        <div class="place-item-name">${d.name}</div>
        <div class="place-item-sub">${CATEGORIES[d.category]?.label || ''}</div>
      </div>
      <div class="place-item-right">
        <div class="place-item-rating"><span class="star">★</span>${d.rating}</div>
        <div class="place-item-duration">${d.duration || ''}</div>
      </div>
    </div>
  `).join('');
  document.getElementById('favBtn')?.classList.add('active');
  if (isMobile()) toggleMobileSidebar();
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, icon = '✅') {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent  = msg;
  document.getElementById('toastIcon').textContent = icon;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Navbar ────────────────────────────────────────────────
function toggleMenu() {
  document.getElementById('navMenu')?.classList.toggle('open');
}

// ── Mobile setup ──────────────────────────────────────────
function setupMobile() {
  if (!isMobile()) return;
  const handle = document.getElementById('drawerHandle');
  if (handle) handle.style.display = '';
  setTimeout(() => {
    document.getElementById('sidebar').style.transform = 'translateY(calc(100% - 60px))';
  }, 100);
}

// ── Tooltip CSS (injected) ────────────────────────────────
function injectTooltipStyle() {
  const s = document.createElement('style');
  s.textContent = `
    .custom-tooltip.leaflet-tooltip {
      font-family: 'Poppins', sans-serif !important;
      font-size: .72rem !important; font-weight: 600 !important;
      padding: 5px 10px !important; border-radius: 8px !important;
      border: 1px solid rgba(255,255,255,.3) !important;
      background: rgba(10,14,26,.88) !important;
      backdrop-filter: blur(12px) !important;
      box-shadow: 0 4px 18px rgba(0,0,0,.55) !important;
      color: #f0f4ff !important;
    }
    .custom-tooltip.leaflet-tooltip::before { display: none; }
    .leaflet-control-attribution { font-family: 'Poppins', sans-serif !important; font-size: .6rem !important; }
    .leaflet-control-zoom a { font-family: 'Poppins', sans-serif !important; font-weight: 700 !important; }
  `;
  document.head.appendChild(s);
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectTooltipStyle();
  initMap();
  renderSidebar();
  initFilters();
  initSearch();
  setupMobile();

  window.addEventListener('resize', () => {
    setupMobile();
    map.invalidateSize();
  });

  setTimeout(() => {
    const btn = document.getElementById('navItinBtn');
    if (btn) { btn.style.display = ''; btn.classList.add('fade-in'); }
  }, 2000);

  const favs = getFavorites();
  if (favs.length) document.getElementById('favBtn')?.classList.add('active');
});
