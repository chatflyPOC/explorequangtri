// ============================================================
//  ITINERARY.JS — Smart Itinerary Builder
// ============================================================

let selectedDays = 2;
let selectedInterests = new Set(['history']);
let selectedGroup = 'friends';

const DAY_DESCRIPTIONS = {
  1: 'Lộ trình 1 ngày — tập trung vào các điểm nổi bật nhất, khoảng 3–5 địa điểm',
  2: 'Lộ trình 2 ngày — cân bằng giữa lịch sử và thiên nhiên/biển',
  3: 'Lộ trình 3 ngày — khám phá toàn diện, bao gồm đảo Cồn Cỏ hoặc vùng núi',
  4: 'Lộ trình 4 ngày — đủ thời gian cho mọi địa điểm quan trọng',
  5: 'Lộ trình 5 ngày — trải nghiệm sâu, bao gồm vùng núi Đakrông và văn hóa dân tộc',
  6: 'Lộ trình 6 ngày — khám phá triệt để, có thể kết hợp Huế – Quảng Trị',
  7: 'Lộ trình 7 ngày — trải nghiệm đầy đủ nhất, bao gồm tour đường Trường Sơn',
};

const GROUP_TIPS = {
  solo:    'Đi một mình: linh hoạt, có thể điều chỉnh lịch tùy cảm hứng. Nên thuê hướng dẫn viên địa phương.',
  couple:  'Cặp đôi: ưu tiên địa điểm lãng mạn như hoàng hôn tại Cửa Tùng và đêm trên đảo Cồn Cỏ.',
  friends: 'Nhóm bạn: thêm các hoạt động hải sản, lặn biển, và chụp ảnh check-in.',
  family:  'Gia đình: tránh đường núi dài, ưu tiên bảo tàng, biển và nghĩa trang (phù hợp giáo dục lịch sử).',
};

// ── Step Navigation ───────────────────────────────────────

function goStep(n) {
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`step-${i}`).classList.toggle('hidden', i !== n);
    const tab = document.getElementById(`step-tab-${i}`);
    tab.classList.toggle('active', i === n);
    if (i < n) tab.classList.add('done'); else tab.classList.remove('done');
  }
  window.scrollTo({ top: 200, behavior: 'smooth' });
}

// ── Day Selection ─────────────────────────────────────────

function initDaysGrid() {
  const grid = document.getElementById('daysGrid');
  grid.innerHTML = [1,2,3,4,5,6,7].map(d => `
    <button class="day-btn ${d === selectedDays ? 'active' : ''}" onclick="selectDay(${d})">
      ${d}
      <span>${d === 1 ? 'ngày' : 'ngày'}</span>
    </button>
  `).join('');
  updateDayDesc();
}

function selectDay(d) {
  selectedDays = d;
  document.querySelectorAll('.day-btn').forEach((btn, i) => btn.classList.toggle('active', i + 1 === d));
  updateDayDesc();
}

function updateDayDesc() {
  const el = document.querySelector('#dayDescription p');
  if (el) el.textContent = DAY_DESCRIPTIONS[selectedDays] || '';
}

// ── Interest Selection ────────────────────────────────────

function toggleInterest(card) {
  const interest = card.dataset.interest;
  if (selectedInterests.has(interest)) {
    if (selectedInterests.size === 1) return; // keep at least 1
    selectedInterests.delete(interest);
    card.classList.remove('selected');
  } else {
    selectedInterests.add(interest);
    card.classList.add('selected');
  }
}

// ── Group Selection ───────────────────────────────────────

function selectGroup(card) {
  document.querySelectorAll('[data-group]').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedGroup = card.dataset.group;
}

// ── Smart Itinerary Generator ─────────────────────────────

function generateItinerary() {
  goStep(4);

  const interests = [...selectedInterests];
  const days = selectedDays;
  const group = selectedGroup;

  // Score & filter destinations
  const scored = destinations.map(d => {
    let score = d.rating;
    if (interests.includes(d.category)) score += 3;
    if (d.highlight) score += 2;
    if (group === 'family' && (d.category === 'nature' || d.category === 'history')) score += 1;
    if (group === 'couple' && (d.category === 'beach' || d.category === 'nature')) score += 1;
    if (group === 'friends' && d.category === 'beach') score += 1;
    return { ...d, score };
  }).sort((a, b) => b.score - a.score);

  // Cluster by geography into days
  const dailyPlan = buildDailyPlan(scored, days, interests);
  renderItinerary(dailyPlan, days, group);
}

function buildDailyPlan(scored, days, interests) {
  const plan = [];
  const used = new Set();

  // Max destinations per day based on duration estimates
  const maxPerDay = Math.min(5, Math.ceil(8 / avgDuration(scored)));

  for (let d = 0; d < days; d++) {
    const dayDests = [];

    // Pick a seed destination for this day
    const seed = scored.find(s => !used.has(s.id));
    if (!seed) break;
    used.add(seed.id);
    dayDests.push(seed);

    // Fill with geographically close destinations
    const remaining = scored.filter(s => !used.has(s.id));
    const nearby = remaining.sort((a, b) =>
      distance(seed, a) - distance(seed, b)
    ).slice(0, maxPerDay - 1);

    nearby.forEach(n => {
      if (dayDests.length < maxPerDay) {
        dayDests.push(n);
        used.add(n.id);
      }
    });

    // Sort day's destinations by latitude (north to south = logical driving order)
    dayDests.sort((a, b) => b.lat - a.lat);

    plan.push(dayDests);
  }

  return plan;
}

function avgDuration(dests) {
  const avg = dests.slice(0, 8).reduce((sum, d) => {
    const match = d.duration.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 2);
  }, 0) / Math.min(8, dests.length);
  return avg || 2;
}

function distance(a, b) {
  const dlat = a.lat - b.lat;
  const dlng = a.lng - b.lng;
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

// ── Render Itinerary ──────────────────────────────────────

function renderItinerary(plan, days, group) {
  const out = document.getElementById('itineraryOutput');
  const groupTip = GROUP_TIPS[group] || '';

  const totalDests = plan.reduce((s, d) => s + d.length, 0);

  out.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
      <div>
        <h2 style="margin-bottom:8px;">Lộ trình ${days} ngày của bạn</h2>
        <p style="color:var(--text-muted);">
          ${totalDests} địa điểm · Sở thích: ${[...selectedInterests].join(', ')} · Nhóm: ${groupLabel(group)}
        </p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="window.print()">
          <i class="fas fa-print"></i> In / PDF
        </button>
        <button class="btn btn-outline btn-sm" onclick="shareItinerary()">
          <i class="fas fa-share-alt"></i> Chia sẻ
        </button>
        <button class="btn btn-primary btn-sm" onclick="goStep(1)">
          <i class="fas fa-redo"></i> Tạo lại
        </button>
      </div>
    </div>

    ${groupTip ? `
    <div style="background:rgba(26,107,92,.08);border-left:4px solid var(--primary);padding:12px 16px;border-radius:0 var(--radius-sm) var(--radius-sm) 0;margin-bottom:24px;font-size:.875rem;color:var(--text);">
      💡 <strong>Gợi ý cho ${groupLabel(group)}:</strong> ${groupTip}
    </div>` : ''}

    ${plan.map((dayDests, i) => renderDay(dayDests, i + 1)).join('')}

    <div class="print-section">
      <h4 style="margin-bottom:12px;">📋 Checklist trước khi đi</h4>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:.85rem;">
        ${['Đặt khách sạn / resort','Đặt xe hoặc thuê xe máy','Kiểm tra dự báo thời tiết','Mang đủ tiền mặt','Tải bản đồ offline','Mang kem chống nắng','Giày thoải mái để đi bộ','Adapter / sạc dự phòng'].map(item => `
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" style="accent-color:var(--primary);"> ${item}
          </label>
        `).join('')}
      </div>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="services.html" class="btn btn-outline">
        <i class="fas fa-concierge-bell"></i> Tìm dịch vụ và liên hệ
      </a>
    </div>
  `;
}

function groupLabel(g) {
  const m = { solo: 'Một mình', couple: 'Cặp đôi', friends: 'Nhóm bạn', family: 'Gia đình' };
  return m[g] || g;
}

function renderDay(dests, dayNum) {
  const startHour = 7;
  let currentTime = startHour * 60; // minutes from midnight

  const items = [];

  // Breakfast
  items.push({ type: 'food', time: currentTime, name: 'Ăn sáng', note: 'Bún bò, bánh mì hoặc phở tại quán địa phương gần khách sạn', icon: '🌅' });
  currentTime += 45;

  dests.forEach((dest, idx) => {
    // Travel time between locations
    if (idx > 0) {
      const prev = dests[idx - 1];
      const travelMin = Math.round(distance(prev, dest) * 120); // rough estimate
      const travelMins = Math.max(15, Math.min(travelMin, 90));
      items.push({ type: 'travel', time: currentTime, name: `Di chuyển đến ${dest.name}`, note: `Khoảng ${travelMins} phút di chuyển`, icon: '🚗' });
      currentTime += travelMins;
    }

    // Lunch break
    if (currentTime >= 11 * 60 && currentTime < 12 * 60 && !items.some(i => i.name === 'Ăn trưa')) {
      items.push({ type: 'food', time: currentTime, name: 'Ăn trưa', note: 'Thưởng thức ẩm thực địa phương tại nhà hàng gần khu vực', icon: '🍜' });
      currentTime += 75;
    }

    const durationMins = getDurationMins(dest.duration);
    items.push({ type: 'visit', time: currentTime, dest, name: dest.name, note: dest.bestTime ? `Lưu ý: ${dest.bestTime}` : '', icon: getCatEmoji(dest.category) });
    currentTime += durationMins;

    // Lunch break (after morning visits)
    if (currentTime >= 12 * 60 && currentTime < 14 * 60 && !items.some(i => i.name === 'Ăn trưa')) {
      items.push({ type: 'food', time: currentTime, name: 'Ăn trưa', note: 'Dừng chân ăn trưa — thử đặc sản địa phương', icon: '🍜' });
      currentTime += 75;
    }
  });

  // Dinner
  if (currentTime < 19 * 60) currentTime = 18 * 60;
  items.push({ type: 'food', time: currentTime, name: 'Ăn tối', note: 'Bữa tối tại nhà hàng địa phương — thử hải sản hoặc đặc sản Quảng Trị', icon: '🌙' });

  return `
    <div class="itin-day">
      <div class="itin-day-header">
        <div class="itin-day-num">N${dayNum}</div>
        <div>
          <h3 style="margin-bottom:4px;">Ngày ${dayNum}</h3>
          <p style="font-size:.85rem;color:var(--text-muted);">
            ${dests.map(d => d.name).join(' → ')}
          </p>
        </div>
      </div>
      <div class="itin-timeline">
        ${items.map(item => renderTimelineItem(item)).join('')}
      </div>
    </div>
  `;
}

function renderTimelineItem(item) {
  const timeStr = minutesToTime(item.time);
  const isVisit = item.type === 'visit';

  return `
    <div class="itin-item type-${item.type}">
      <div class="itin-time">${timeStr}</div>
      <div class="itin-name">
        <span style="margin-right:6px;">${item.icon}</span>
        ${item.name}
        ${isVisit && item.dest ? `<span class="badge badge-neutral" style="margin-left:8px;font-size:.7rem;">${item.dest.admission}</span>` : ''}
      </div>
      ${isVisit && item.dest ? `
        <div style="font-size:.82rem;color:var(--text-muted);margin-top:3px;">${item.dest.address}</div>
        <div style="font-size:.82rem;color:var(--text-muted);">⏱ ${item.dest.duration} · ⭐ ${item.dest.rating}</div>
      ` : ''}
      ${item.note ? `<div class="itin-tip">💡 ${item.note}</div>` : ''}
      ${isVisit && item.dest && item.dest.tips && item.dest.tips[0] ? `
        <div class="itin-tip" style="margin-top:4px;">→ ${item.dest.tips[0]}</div>
      ` : ''}
    </div>
  `;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
}

function getDurationMins(durationStr) {
  if (!durationStr) return 90;
  const match = durationStr.match(/(\d+)/);
  return match ? parseInt(match[1]) * 60 : 90;
}

function getCatEmoji(cat) {
  const m = { history:'🏛️', nature:'🌿', beach:'🏖️', religion:'⛩️', food:'🍜', stay:'🏨', transport:'🚗', service:'🏪' };
  return m[cat] || '📍';
}

// ── Load Template ─────────────────────────────────────────

function loadTemplate(templateKey) {
  const tpl = itineraryTemplates[templateKey];
  if (!tpl) return;

  goStep(4);

  const out = document.getElementById('itineraryOutput');
  const byDay = {};
  (tpl.schedule || []).forEach(item => {
    const d = item.day || 1;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(item);
  });

  const days = Object.keys(byDay).length || 1;

  out.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
      <div>
        <h2 style="margin-bottom:8px;">${tpl.title}</h2>
        <p style="color:var(--text-muted);">${tpl.description}</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="window.print()">
          <i class="fas fa-print"></i> In / PDF
        </button>
        <button class="btn btn-primary btn-sm" onclick="goStep(1)">
          <i class="fas fa-redo"></i> Tùy chỉnh
        </button>
      </div>
    </div>

    ${Object.keys(byDay).map(dayKey => {
      const items = byDay[dayKey];
      return `
        <div class="itin-day">
          <div class="itin-day-header">
            <div class="itin-day-num">N${dayKey}</div>
            <div>
              <h3 style="margin-bottom:4px;">Ngày ${dayKey}</h3>
              <p style="font-size:.85rem;color:var(--text-muted);">
                ${items.filter(i => i.destId).map(i => {
                  const d = destinations.find(x => x.id === i.destId);
                  return d ? d.name : '';
                }).filter(Boolean).join(' → ')}
              </p>
            </div>
          </div>
          <div class="itin-timeline">
            ${items.map(item => {
              const dest = item.destId ? destinations.find(d => d.id === item.destId) : null;
              const typeClass = item.type === 'visit' ? 'visit' : item.type === 'lunch' || item.type === 'breakfast' || item.type === 'dinner' ? 'food' : 'travel';
              const icon = dest ? getCatEmoji(dest.category) : (item.type.includes('lunch') || item.type.includes('dinner') || item.type.includes('breakfast') ? '🍜' : '🚗');
              return `
                <div class="itin-item type-${typeClass}">
                  <div class="itin-time">${item.time}</div>
                  <div class="itin-name">${icon} ${dest ? dest.name : item.note}</div>
                  ${dest ? `
                    <div style="font-size:.82rem;color:var(--text-muted);margin-top:2px;">${dest.address} · ⏱ ${dest.duration}</div>
                    <div style="font-size:.82rem;color:var(--text-muted);">🎟 ${dest.admission} · ⭐ ${dest.rating}</div>
                    ${dest.tips && dest.tips[0] ? `<div class="itin-tip">💡 ${dest.tips[0]}</div>` : ''}
                  ` : `
                    ${item.note && dest === null ? `<div class="itin-note">${item.note}</div>` : ''}
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}

    <div style="text-align:center;margin-top:24px;">
      <a href="services.html" class="btn btn-outline">
        <i class="fas fa-concierge-bell"></i> Tìm dịch vụ và liên hệ
      </a>
    </div>
  `;
}

// ── Share ─────────────────────────────────────────────────

function shareItinerary() {
  if (navigator.share) {
    navigator.share({
      title: 'Lộ trình du lịch Quảng Trị',
      text: 'Lộ trình du lịch Quảng Trị được tạo bởi ExploreQuảngTrị.com',
      url: window.location.href,
    });
  } else {
    navigator.clipboard.writeText(window.location.href);
    showToast('Đã sao chép đường dẫn!', '🔗');
  }
}

function showToast(msg, icon = '✅') {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.querySelector('.toast-icon').textContent = icon;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Navbar ────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 10);
});
function toggleMenu() { document.getElementById('navMenu')?.classList.toggle('open'); }

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDaysGrid();

  // Select first interest by default
  const histCard = document.querySelector('[data-interest="history"]');
  if (histCard) histCard.classList.add('selected');

  // Check URL params
  const params = new URLSearchParams(window.location.search);
  const days = params.get('days');
  if (days) {
    selectedDays = parseInt(days);
    initDaysGrid();
    goStep(1);
  }
  const template = params.get('template');
  if (template) loadTemplate(template);
});
