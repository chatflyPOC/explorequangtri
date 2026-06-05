// ============================================================
//  PLANNER.JS — Trip Planner: chọn điểm → gợi ý → chi phí
// ============================================================

// ── State ─────────────────────────────────────────────────
const plannerState = {
  selectedDests:     new Set(),
  numPeople:         2,
  numDays:           2,
  currentStep:       1,
  recoSubStep:       1,      // 1=hotel 2=transport 3=food
  selectedHotel:     null,
  selectedTransport: null,
  selectedFood:      null,
};

// ── Undecided options (always present in each sub-step) ───
const UNDECIDED = {
  hotel: {
    name: 'Chưa xác định', undecided: true,
    type: '🎲 Tự sắp xếp khi đến', icon: '🎲',
    gradient: 'linear-gradient(145deg,#1c1c2e,#2a2a40)',
    desc: 'Chưa muốn đặt trước — sẽ tự tìm chỗ ở linh hoạt theo thực tế chuyến đi.',
    highlights: ['Linh hoạt hoàn toàn','Không ràng buộc','Tuỳ ngân sách thực tế'],
    price: 'Tuỳ lựa chọn thực tế', priceNum: 0,
    location: '', phone: '', region: 'both', forGroup: 'all', matchDests: [],
  },
  transport: {
    name: 'Chưa xác định', undecided: true,
    type: '🎲 Tự sắp xếp khi đến', icon: '🎲',
    gradient: 'linear-gradient(145deg,#1c1c2e,#2a2a40)',
    desc: 'Chưa quyết định — sẽ đặt xe hoặc chọn phương tiện linh hoạt khi đến nơi.',
    highlights: ['Linh hoạt','Không đặt trước','Tự điều chỉnh theo lịch'],
    price: 'Tuỳ lựa chọn thực tế', priceNum: 0,
    unit: 'lượt', contact: '', forSize: 'all',
  },
  food: {
    name: 'Chưa xác định', undecided: true,
    type: '🎲 Tự tìm khi đến', icon: '🎲',
    gradient: 'linear-gradient(145deg,#1c1c2e,#2a2a40)',
    desc: 'Chưa chọn nhà hàng — sẽ khám phá ẩm thực địa phương tự do khi đến nơi.',
    highlights: ['Khám phá tự do','Tự chọn quán','Không ràng buộc'],
    price: 'Tuỳ lựa chọn thực tế', priceNum: 0,
    location: '', phone: '', region: 'both',
  },
};

// IDs thuộc vùng Bắc QT (cũ Quảng Bình)
const NORTH_DEST_IDS = new Set([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);

// Filtered reco arrays (for re-render on select)
const currentReco = { hotels: [], transports: [], foods: [] };

// ── Featured destinations for showcase & planner ──────────
const FEATURED_QT = [
  { id: 1,  name: 'Thành Cổ Quảng Trị',          tagline: '81 ngày đêm hào hùng lịch sử',        gradient: 'linear-gradient(145deg,#3d1008,#8b2500)', icon: '🏛️', badges: ['Miễn phí','1-2 giờ','Lịch sử'], province: 'Quảng Trị' },
  { id: 3,  name: 'Địa đạo Vịnh Mốc',             tagline: 'Kỳ tích 2km đường hầm chiến tranh',    gradient: 'linear-gradient(145deg,#1a2e0a,#3d6b1c)', icon: '⛏️', badges: ['40.000đ','1.5-2 giờ','Độc đáo'], province: 'Quảng Trị' },
  { id: 2,  name: 'Cầu Hiền Lương – Sông Bến Hải', tagline: 'Nơi đất nước chia đôi 21 năm',         gradient: 'linear-gradient(145deg,#0d2a5c,#1565c0)', icon: '🌉', badges: ['Miễn phí','1 giờ','Di tích'], province: 'Quảng Trị' },
  { id: 13, name: 'Linh địa La Vang',               tagline: 'Hành hương linh thiêng Đông Nam Á',   gradient: 'linear-gradient(145deg,#3d0d5c,#7b1fa2)', icon: '⛩️', badges: ['Miễn phí','1-3 giờ','Tâm linh'], province: 'Quảng Trị' },
  { id: 10, name: 'Biển Cửa Tùng',                  tagline: '"Nữ hoàng" của các bãi biển',          gradient: 'linear-gradient(145deg,#01406b,#0277bd)', icon: '🏖️', badges: ['Miễn phí','Cả ngày','Biển đẹp'], province: 'Quảng Trị' },
  { id: 12, name: 'Đảo Cồn Cỏ',                    tagline: 'San hô hoang sơ ngoài khơi',            gradient: 'linear-gradient(145deg,#0d3a1e,#1b6b3a)', icon: '🏝️', badges: ['150k tàu','1-2 ngày','Lặn biển'], province: 'Quảng Trị' },
];

const FEATURED_QB = [
  { id: 19, name: 'Hang Sơn Đoòng',     tagline: 'Hang lớn nhất thế giới — kỳ quan đỉnh cao',  gradient: 'linear-gradient(145deg,#052210,#0d5c30)', icon: '🕳️', badges: ['3000 USD','4N3Đ','Kỳ quan'], province: 'Quảng Trị' },
  { id: 17, name: 'Động Phong Nha',      tagline: 'Di sản UNESCO — thuyền trên hang nước',      gradient: 'linear-gradient(145deg,#070e24,#1565c0)', icon: '⛵', badges: ['150.000đ','2-3 giờ','UNESCO'], province: 'Quảng Trị' },
  { id: 18, name: 'Động Thiên Đường',    tagline: 'Hang khô dài nhất châu Á — nhũ đá kỳ ảo',   gradient: 'linear-gradient(145deg,#00261c,#00695c)', icon: '💎', badges: ['250.000đ','2-4 giờ','Kỳ ảo'], province: 'Quảng Trị' },
  { id: 20, name: 'Hang Tối & Zipline',  tagline: 'Bay vào hang tối — phiêu lưu đỉnh nhất VN', gradient: 'linear-gradient(145deg,#4a1500,#bf360c)', icon: '🪂', badges: ['450.000đ','3-5 giờ','Mạo hiểm'], province: 'Quảng Trị' },
  { id: 26, name: 'Bãi Đá Nhảy',         tagline: 'Đá granit triệu năm trên bãi cát trắng',     gradient: 'linear-gradient(145deg,#3e1a0a,#6d4c41)', icon: '🪨', badges: ['Miễn phí','Nửa ngày','Hoang sơ'], province: 'Quảng Trị' },
  { id: 27, name: 'Vũng Chùa – Mộ Đại tướng', tagline: 'Nơi an nghỉ người anh hùng dân tộc',  gradient: 'linear-gradient(145deg,#1a237e,#283593)', icon: '⚔️', badges: ['Miễn phí','30-60p','Thiêng liêng'], province: 'Quảng Trị' },
];

const ALL_FEATURED = [...FEATURED_QT, ...FEATURED_QB];

// ── Recommendation data ───────────────────────────────────
const HOTELS = [
  {
    name: 'Sun Spa Resort Đồng Hới',
    type: '⭐⭐⭐⭐⭐ Resort',
    location: 'Đồng Hới, Quảng Trị',
    region: 'north',
    price: '2.000.000 – 5.000.000đ/đêm',
    priceNum: 3500,
    forGroup: 'couple',
    gradient: 'linear-gradient(145deg,#0d3a6e,#1976d2)',
    icon: '🏨',
    desc: 'Resort 5 sao sang trọng sát biển Nhật Lệ, hồ bơi vô cực, spa cao cấp. Lý tưởng khi thăm Phong Nha và các hang động vùng Bắc.',
    phone: '0232 3847 999',
    highlights: ['Hồ bơi vô cực','Spa 5 sao','Sát biển Nhật Lệ','Buffet sáng'],
    matchDests: [17,18,19,20,26,27],
  },
  {
    name: 'Phong Nha Farmstay',
    type: '⭐⭐⭐⭐ Eco Boutique',
    location: 'Sơn Trạch, Phong Nha, Quảng Trị',
    region: 'north',
    price: '800.000 – 2.000.000đ/đêm',
    priceNum: 1200,
    forGroup: 'all',
    gradient: 'linear-gradient(145deg,#1b3a1a,#2e7d32)',
    icon: '🌿',
    desc: 'Boutique eco-lodge nổi tiếng bên sông Son, cách cửa hang Phong Nha 4km. Tốt nhất để khám phá hang động vùng Bắc.',
    phone: '0232 3675 135',
    highlights: ['View sông Son','Tắm sông','Bar ngoài trời','Gần Phong Nha'],
    matchDests: [17,18,19,20],
  },
  {
    name: 'Chày Lập Ecolodge',
    type: '⭐⭐⭐⭐ Ecolodge',
    location: 'Sơn Trạch, Bố Trạch, Quảng Trị',
    region: 'north',
    price: '800.000 – 2.500.000đ/đêm',
    priceNum: 1500,
    forGroup: 'couple',
    gradient: 'linear-gradient(145deg,#0d2b0d,#1b5e20)',
    icon: '🌲',
    desc: 'National Geographic endorsed — bungalow gỗ giữa rừng, tắm sông thiên nhiên. Hoàn hảo cho cặp đôi thích thiên nhiên.',
    phone: '0232 3675 135',
    highlights: ['National Geographic','Bungalow gỗ','Tắm sông','Rừng nguyên sinh'],
    matchDests: [17,18,19,20],
  },
  {
    name: 'Khách sạn Sài Gòn Đông Hà',
    type: '⭐⭐⭐⭐ Khách sạn',
    location: 'Đông Hà, Quảng Trị',
    region: 'south',
    price: '700.000 – 2.000.000đ/đêm',
    priceNum: 900,
    forGroup: 'all',
    gradient: 'linear-gradient(145deg,#1b3a5c,#1565c0)',
    icon: '🏩',
    desc: 'Khách sạn 4 sao trung tâm Đông Hà, điểm xuất phát lý tưởng cho Thành Cổ, Vịnh Mốc, La Vang.',
    phone: '0233 3560 999',
    highlights: ['Trung tâm Đông Hà','Hồ bơi','Nhà hàng','Gần di tích'],
    matchDests: [1,2,3,10,12,13],
  },
  {
    name: 'Easy Tiger Hostel',
    type: '🌟 Hostel / Budget',
    location: 'Sơn Trạch, Phong Nha, Quảng Trị',
    region: 'north',
    price: '150.000 – 500.000đ/đêm',
    priceNum: 300,
    forGroup: 'friends',
    gradient: 'linear-gradient(145deg,#4a2400,#e65100)',
    icon: '🐯',
    desc: 'Hostel sôi động nhất Phong Nha, bar ngoài trời, đặt tour hang động ngay tại chỗ. Phù hợp nhóm bạn tiết kiệm.',
    phone: '0975 812 911',
    highlights: ['Giá rẻ nhất','Bar & Café','Đặt tour hang','Gặp gỡ bạn bè'],
    matchDests: [17,18,19,20],
  },
  {
    name: 'Resort Cửa Tùng',
    type: '⭐⭐⭐ Resort biển',
    location: 'Cửa Tùng, Vĩnh Linh, Quảng Trị',
    region: 'south',
    price: '600.000 – 1.800.000đ/đêm',
    priceNum: 900,
    forGroup: 'family',
    gradient: 'linear-gradient(145deg,#01406b,#0288d1)',
    icon: '🏖️',
    desc: 'Resort ngay sát bãi biển Cửa Tùng, phòng view biển, bể bơi. Gần Địa đạo Vịnh Mốc và Cầu Hiền Lương.',
    phone: '0233 3870 567',
    highlights: ['Ngay bãi biển','Bể bơi','Hải sản tươi','Gần Vịnh Mốc'],
    matchDests: [2,3,10,12],
  },
  {
    name: 'Nhà khách La Vang',
    type: '🕌 Nhà khách tâm linh',
    location: 'La Vang, Hải Lăng, Quảng Trị',
    region: 'south',
    price: '200.000 – 500.000đ/đêm',
    priceNum: 300,
    forGroup: 'pilgrimage',
    gradient: 'linear-gradient(145deg,#3d0d5c,#6a1b9a)',
    icon: '⛪',
    desc: 'Nhà khách ngay trong khuôn viên linh địa La Vang. Yên tĩnh, trang nghiêm, phù hợp hành hương tâm linh.',
    phone: '0233 3852 456',
    highlights: ['Sát La Vang','Giá rẻ','Yên tĩnh','Phù hợp hành hương'],
    matchDests: [13,1],
  },
];

const TRANSPORTS = [
  {
    name: 'Thuê xe máy tự lái',
    type: '🏍️ Tự do nhất',
    price: '100.000 – 200.000đ/ngày',
    priceNum: 150,
    unit: 'xe/ngày',
    forSize: 'small',
    gradient: 'linear-gradient(145deg,#1a2e0a,#33691e)',
    icon: '🏍️',
    desc: 'Cách di chuyển linh hoạt nhất. Thuê tại Đông Hà hoặc Đồng Hới (đều trong Quảng Trị), có giao xe tận nơi.',
    contact: 'Minh Tuấn: 0905 567 890',
    highlights: ['Linh hoạt 100%','Rẻ nhất','Khám phá ngõ hẻm','Phù hợp 1-2 người'],
  },
  {
    name: 'Thuê xe ô tô 4 chỗ có lái',
    type: '🚗 Thoải mái',
    price: '900.000 – 1.400.000đ/ngày',
    priceNum: 1100,
    unit: 'xe/ngày',
    forSize: 'small',
    gradient: 'linear-gradient(145deg,#0d2a5c,#1565c0)',
    icon: '🚗',
    desc: 'Xe 4 chỗ có tài xế kinh nghiệm, biết rõ các điểm tham quan, phù hợp 1-4 người.',
    contact: 'Vận chuyển QT: 0905 678 901',
    highlights: ['Có tài xế','AC mát lạnh','1-4 người','Linh hoạt lịch'],
  },
  {
    name: 'Thuê xe 7 chỗ có lái',
    type: '🚙 Nhóm vừa',
    price: '1.200.000 – 1.800.000đ/ngày',
    priceNum: 1500,
    unit: 'xe/ngày',
    forSize: 'medium',
    gradient: 'linear-gradient(145deg,#1a2e45,#1976d2)',
    icon: '🚙',
    desc: 'Lý tưởng cho nhóm 5-7 người, đặt được nhiều đồ, thoải mái đường dài.',
    contact: 'Vận chuyển QT: 0905 678 901',
    highlights: ['5-7 người','Đặt đồ nhiều','Giá chia nhóm rẻ','Thoải mái'],
  },
  {
    name: 'Thuê xe 16 chỗ có lái',
    type: '🚌 Nhóm lớn',
    price: '1.800.000 – 2.500.000đ/ngày',
    priceNum: 2000,
    unit: 'xe/ngày',
    forSize: 'large',
    gradient: 'linear-gradient(145deg,#1a0a2e,#4a148c)',
    icon: '🚌',
    desc: 'Xe limousine 16 chỗ cho đoàn 8-16 người, phù hợp gia đình đông hoặc nhóm bạn.',
    contact: 'Vận chuyển QT: 0905 678 901',
    highlights: ['8-16 người','Đoàn đông','Có mic','Chia đầu người rẻ'],
  },
  {
    name: 'Tàu hỏa từ Hà Nội/HCM',
    type: '🚂 Từ xa đến',
    price: '200.000 – 500.000đ/vé',
    priceNum: 350,
    unit: 'vé/người',
    forSize: 'all',
    gradient: 'linear-gradient(145deg,#1a0e00,#e65100)',
    icon: '🚂',
    desc: 'Ga Đồng Hới và Đông Hà là hai điểm dừng tàu Bắc-Nam tại Quảng Trị. Mua vé qua VeRail.',
    contact: 'vetau.vn · dsvn.vn',
    highlights: ['Thoải mái','Cảnh đẹp','An toàn','Giá vé tốt'],
  },
  {
    name: 'Xe ghép tour trọn gói',
    type: '🎫 Tiện nhất',
    price: '350.000 – 600.000đ/người/ngày',
    priceNum: 450,
    unit: 'người/ngày',
    forSize: 'all',
    gradient: 'linear-gradient(145deg,#1a2e1a,#2e7d32)',
    icon: '🎫',
    desc: 'Tour ghép xe và hướng dẫn viên. Không cần tự lo lịch trình, có HDV giải thích.',
    contact: 'QT Travel: 0233 3559 222',
    highlights: ['Có HDV','Không lo lịch','Gặp người mới','Phù hợp solo'],
  },
];

const FOODS = [
  {
    name: 'Nhà hàng Hải sản Cửa Việt',
    type: '🦀 Hải sản tươi sống',
    location: 'Cửa Việt, Gio Linh, Quảng Trị',
    region: 'south',
    price: '200.000 – 600.000đ/người',
    priceNum: 400,
    gradient: 'linear-gradient(145deg,#01406b,#0277bd)',
    icon: '🦞',
    desc: 'Hải sản thuyền ngư dân vừa lên bờ: tôm hùm, cua biển, cá nướng muối ớt.',
    phone: '0905 123 456',
    highlights: ['Tươi sống 100%','Cảng Cửa Việt','Giá cả phải chăng','View biển'],
  },
  {
    name: 'Nhà hàng Sông Hiếu',
    type: '🍖 Đặc sản Quảng Trị',
    location: 'Bờ sông Hiếu, Đông Hà, Quảng Trị',
    region: 'south',
    price: '150.000 – 500.000đ/người',
    priceNum: 300,
    gradient: 'linear-gradient(145deg,#2d1b00,#795548)',
    icon: '🍖',
    desc: 'Tôm nướng muối ớt, vịt nướng Quảng Trị, rượu cần dân tộc, view sông đẹp.',
    phone: '0233 3553 789',
    highlights: ['View sông Hiếu','Đặc sản địa phương','Nhóm đông','Vịt nướng ngon'],
  },
  {
    name: 'Phong Nha Farmstay Restaurant',
    type: '🥗 Farm-to-table',
    location: 'Sơn Trạch, Phong Nha, Quảng Trị',
    region: 'north',
    price: '150.000 – 350.000đ/người',
    priceNum: 250,
    gradient: 'linear-gradient(145deg,#1b3a1a,#388e3c)',
    icon: '🌿',
    desc: 'Nhà hàng theo phong cách farm-to-table bên sông Son, thực đơn tươi ngon hàng ngày.',
    phone: '0232 3675 135',
    highlights: ['Farm-to-table','View sông','Rau sạch hữu cơ','Cà phê ngon'],
  },
  {
    name: 'Easy Tiger Bar & Kitchen',
    type: '🍺 Quán backpacker',
    location: 'Sơn Trạch, Phong Nha, Quảng Trị',
    region: 'north',
    price: '80.000 – 250.000đ/người',
    priceNum: 150,
    gradient: 'linear-gradient(145deg,#4a2400,#d84315)',
    icon: '🐯',
    desc: 'Quán bar & đồ ăn nổi tiếng nhất Phong Nha, beer bia lạnh, pizza, burger, lắc đuôi.',
    phone: '0975 812 911',
    highlights: ['Giá sinh viên','Beer lạnh','Gặp gỡ bạn bè','Đặt tour hang'],
  },
  {
    name: 'Hải sản Nhật Lệ Đồng Hới',
    type: '🐟 Hải sản Quảng Trị',
    location: 'Bãi biển Nhật Lệ, Đồng Hới, Quảng Trị',
    region: 'north',
    price: '200.000 – 500.000đ/người',
    priceNum: 350,
    gradient: 'linear-gradient(145deg,#00224a,#1565c0)',
    icon: '🐟',
    desc: 'Hải sản tươi ngon từ biển Nhật Lệ, cá nướng mọi, mực chiên giòn, cơm niêu.',
    phone: '0232 3847 888',
    highlights: ['Sát biển','Hải sản tươi','Giá tốt','Không khí biển'],
  },
  {
    name: 'Bún bò Đông Hà (Quán Cô Lan)',
    type: '🍜 Ăn sáng đặc sản',
    location: 'Trần Phú, Đông Hà, Quảng Trị',
    region: 'south',
    price: '30.000 – 60.000đ/người',
    priceNum: 45,
    gradient: 'linear-gradient(145deg,#4a1500,#bf360c)',
    icon: '🍜',
    desc: 'Quán bún bò nổi tiếng nhất Đông Hà — tô bún đậm đà vị miền Trung, mở từ 6 sáng.',
    phone: '0905 234 567',
    highlights: ['Siêu ngon','Giá rẻ 35k','Ăn sáng','Đặc sản địa phương'],
  },
  {
    name: 'Chợ đêm Nhật Lệ',
    type: '🌃 Chợ đêm & Street food',
    location: 'Bãi biển Nhật Lệ, Đồng Hới, Quảng Trị',
    region: 'north',
    price: '50.000 – 150.000đ/người',
    priceNum: 100,
    gradient: 'linear-gradient(145deg,#1a0e24,#4a148c)',
    icon: '🌃',
    desc: 'Chợ đêm sôi động nhất Đồng Hới: hải sản nướng, bánh tráng trộn, nước mía, kem.',
    phone: '',
    highlights: ['Không khí sôi động','Ăn đêm','Đặc sản dân dã','Ngắm biển đêm'],
  },
];

// ── Cost estimator ────────────────────────────────────────
function estimateCost(numDests, numPeople, numDays, hotelPriceNum, transportPriceNum, foodPriceNum) {
  const admissionTotal = numDests * 80000 * numPeople;            // avg 80k admission/person
  const hotelTotal     = hotelPriceNum * 1000 * numDays * Math.ceil(numPeople / 2);
  const transportTotal = transportPriceNum * 1000 * numDays;
  const foodTotal      = foodPriceNum * 1000 * numPeople * numDays * 3;
  const subtotal       = admissionTotal + hotelTotal + transportTotal + foodTotal;
  const buffer         = subtotal * 0.12;
  return {
    admission:  admissionTotal,
    hotel:      hotelTotal,
    transport:  transportTotal,
    food:       foodTotal,
    buffer:     buffer,
    total:      subtotal + buffer,
    perPerson:  (subtotal + buffer) / numPeople,
  };
}

function formatMoney(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0','') + ' triệu';
  if (n >= 1000)    return (n / 1000).toFixed(0) + '.000';
  return n.toString();
}

// ── Detail data: images + fun facts per destination ──────
const DEST_DETAILS = {
  1: {
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=900&q=80',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900&q=80',
      'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=900&q=80',
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
      'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=900&q=80',
    ],
    funFacts: [
      'Thành xây năm 1809 thời vua Gia Long theo kiến trúc thành lũy Vauban của Pháp',
      '81 ngày đêm ác liệt (28/6–16/9/1972): hơn 10.000 chiến sĩ đã anh dũng hy sinh',
      'Mỗi 1m² đất trong thành tương đương hơn 1 viên đạn pháo trút xuống',
      'Sức nổ của bom đạn tương đương 7 quả bom nguyên tử Hiroshima trong cả mùa hè 1972',
      'Lễ thả đèn hoa đăng trên sông Thạch Hãn ngày 27/7 thu hút hàng vạn người mỗi năm',
      'Được mệnh danh là "Vùng đất không bao giờ quên" trong lịch sử kháng chiến Việt Nam',
    ],
  },
  2: {
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
      'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=900&q=80',
      'https://images.unsplash.com/photo-1520637836862-4d197d17c92a?w=900&q=80',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&q=80',
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80',
    ],
    funFacts: [
      'Cầu dài 178m bắc qua sông Bến Hải, xây năm 1928 — đường ranh giới vĩ tuyến 17',
      'Hai nửa cầu sơn hai màu suốt 21 năm: xanh (phía Bắc) và vàng (phía Nam)',
      '"Cuộc chiến loa phát thanh": hai bên đặt loa khổng lồ đối diện nhau, ai to hơn thì thắng',
      '2.000 ngày đêm (1954–1975): người thân đứng hai đầu cầu nhìn nhau mà không được gặp',
      '70 người cùng họ Đặng ở làng Hiền Lương bị chia cắt hai bờ suốt 21 năm',
      'Ngày thống nhất, nhiều gia đình phải nhận ra nhau qua ảnh cũ vì 21 năm không gặp mặt',
    ],
  },
  3: {
    images: [
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=900&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&q=80',
      'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=900&q=80',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=900&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80',
      'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=900&q=80',
    ],
    funFacts: [
      'Đường hầm dài 2km, đào hoàn toàn bằng tay trong 18 tháng (1966–1967)',
      'Hơn 300 người (60+ gia đình) sống hoàn toàn dưới lòng đất trong nhiều năm chiến tranh',
      '17 đứa trẻ được sinh ra trong lòng đất — có em sống 6 năm trước khi lần đầu thấy ánh mặt trời',
      'Đường hầm có 3 tầng sâu nhất 23m, với phòng họp, bệnh viện, trường học, bếp ăn',
      'Không một người nào trong địa đạo thiệt mạng do bom Mỹ trong suốt thời chiến',
      'National Geographic đánh giá là một trong những công trình tự tạo ấn tượng nhất thế kỷ 20',
    ],
  },
  10: {
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=900&q=80',
      'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=900&q=80',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80',
      'https://images.unsplash.com/photo-1533371452382-d45a9da51ad9?w=900&q=80',
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80',
      'https://images.unsplash.com/photo-1484821582734-6c6c9f99a672?w=900&q=80',
    ],
    funFacts: [
      'Vua Bảo Đại đặt danh hiệu "Nữ hoàng của các bãi biển" — tên gọi vẫn lưu truyền đến nay',
      'Cát đặc biệt mịn và có màu hồng nhạt độc đáo — hiếm có ở Việt Nam',
      'Nằm ở ngã ba sông Bến Hải đổ ra biển — điểm giao thoa nước ngọt và nước mặn',
      'Thời Pháp thuộc là bãi nghỉ mát độc quyền của giới thượng lưu người Pháp tại Đông Dương',
      'Hải sản đặc biệt ngon nhờ vùng nước trong lành và luồng cá đặc trưng',
      'Hoàng hôn tại Cửa Tùng được mệnh danh đẹp nhất dải đất miền Trung',
    ],
  },
  12: {
    images: [
      'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=900&q=80',
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=900&q=80',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80',
      'https://images.unsplash.com/photo-1498623116890-37e912163d5d?w=900&q=80',
      'https://images.unsplash.com/photo-1484517186945-df8151a1a871?w=900&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
    ],
    funFacts: [
      'Đảo nhỏ chỉ 4km² nhưng được mệnh danh "Hòn đảo anh hùng" vì chịu đựng 70.000 tấn bom Mỹ',
      'Rạn san hô xung quanh đảo được xếp đẹp nhất Việt Nam với hơn 300 loài cá nhiệt đới',
      'Đảo còn hoang sơ tuyệt đối: không xe cộ, không đường nhựa, điện từ năng lượng mặt trời',
      'Chỉ cách bờ 28km nhưng ít khách biết — thiên đường ẩn của những người yêu biển',
      'Nước biển xanh trong nhìn thấy đáy ở độ sâu 15m — điểm lặn tốt nhất miền Bắc Trung Bộ',
      'Chỉ có thể thăm từ tháng 4–8 vì các tháng còn lại biển động không có tàu ra đảo',
    ],
  },
  13: {
    images: [
      'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=900&q=80',
      'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=900&q=80',
      'https://images.unsplash.com/photo-1504198266287-1659872e6590?w=900&q=80',
      'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=900&q=80',
      'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=900&q=80',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900&q=80',
    ],
    funFacts: [
      'Năm 1798, Đức Mẹ được cho là đã hiện ra tại đây an ủi tín hữu Công giáo bị bách hại',
      'Là một trong những địa điểm hành hương Công giáo lớn nhất Đông Nam Á, đón 100.000+ người/năm',
      'Đại hội Hành hương La Vang tổ chức 3 năm một lần vào tháng 8, thu hút hàng triệu người',
      'Ngôi đền bị phá hủy trong chiến tranh — đang xây dựng thánh đường mới quy mô lớn hơn',
      'Tên "La Vang" theo tiếng dân tộc là cây lá vằng — loài cây thuốc chữa bệnh cho người xưa',
      'Được Giáo hoàng John Paul II đặc biệt nhắc đến trong số ít địa điểm hành hương tại Việt Nam',
    ],
  },
  17: {
    images: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
      'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=900&q=80',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=900&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80',
      'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=900&q=80',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80',
    ],
    funFacts: [
      'UNESCO công nhận Di sản Thiên nhiên Thế giới năm 2003, mở rộng năm 2015',
      'Dài hơn 8km — một trong những hang động sông dài nhất thế giới với sông ngầm chạy suốt chiều dài',
      'Nhũ đá và măng đá hình thành từ hàng triệu năm trước, một số cao đến 40m',
      'Người Chăm xưa dùng hang làm nơi thờ cúng — bằng chứng khắc chữ Chăm vẫn còn trên vách',
      'Nhiệt độ trong hang quanh năm ổn định 18–20°C dù ngoài trời nắng 40 độ',
      'Hệ thống Phong Nha–Kẻ Bàng chứa đến 300+ hang động, nhiều hang chưa có tên và chưa được khám phá',
    ],
  },
  18: {
    images: [
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
      'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=900&q=80',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=900&q=80',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80',
      'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=900&q=80',
    ],
    funFacts: [
      'Dài 31.4km — hang khô dài nhất châu Á, được phát hiện năm 2005',
      'Nhũ đá có màu sắc đặc biệt: trắng, vàng, đỏ, cam — tạo cảnh quan như "thiên đường"',
      'Nhiệt độ ổn định 20°C quanh năm với độ ẩm 90%',
      'Một số khối thạch nhũ trong hang nặng hàng tấn và cao hơn 6 tầng nhà',
      'Hệ thống chiếu sáng nghệ thuật được thiết kế bởi chuyên gia người Pháp',
      'Phần mở cho du khách chỉ là 1km trong tổng số 31km hang — 30km vẫn là bí ẩn',
    ],
  },
  19: {
    images: [
      'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=900&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=900&q=80',
      'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=900&q=80',
    ],
    funFacts: [
      'Được phát hiện năm 1991 bởi nông dân Hồ Khanh, nhưng đến 2009 mới được khám phá chính thức',
      'Lớn đến mức có thể chứa cả một tòa nhà 40 tầng New York City bên trong',
      'Có hệ sinh thái rừng nhiệt đới riêng bên trong hang — cây cối cao 30m mọc dưới lỗ thủng trần hang',
      'Mây mù hình thành ngay trong lòng hang do chênh lệch nhiệt độ — gọi là "Mây trong lòng đất"',
      'Mỗi năm chỉ nhận tối đa 1.000 du khách để bảo tồn — giá tour 3.000 USD/người',
      'National Geographic xếp Sơn Đoòng là 1 trong 25 kỳ quan thiên nhiên vĩ đại nhất thế giới',
    ],
  },
  20: {
    images: [
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=900&q=80',
      'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=900&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80',
    ],
    funFacts: [
      'Đường zipline dài 400m bay vào cửa hang tối — trải nghiệm độc nhất vô nhị trên thế giới',
      'Hang Tối có dòng sông ngầm 18°C; khách bơi xuyên hang trong bóng tối hoàn toàn',
      'Tên "Hang Tối" vì bên trong không có lỗ thủng trần — ánh sáng duy nhất là từ đèn pin',
      'Oxalis là công ty đầu tiên trên thế giới thiết kế zipline đưa du khách vào hang động',
      'Được National Geographic và CNN Travel vinh danh nhiều năm liền',
      'Dãy karst đá vôi xung quanh hang có tuổi 400 triệu năm — cổ hơn cả loài khủng long',
    ],
  },
  26: {
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=900&q=80',
      'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=900&q=80',
      'https://images.unsplash.com/photo-1484821582734-6c6c9f99a672?w=900&q=80',
      'https://images.unsplash.com/photo-1533371452382-d45a9da51ad9?w=900&q=80',
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80',
    ],
    funFacts: [
      'Đá granit hàng triệu năm tuổi nhô lên từ bãi cát trắng — hiện tượng địa chất hiếm gặp ở Đông Nam Á',
      'Tên "Đá Nhảy" vì theo truyền thuyết đá "nhảy" từ trong núi ra phía biển',
      'Sóng biển va vào đá tạo tiếng âm thanh độc đáo — người dân gọi là "tiếng hát của đá"',
      'Một trong số ít bãi biển còn giữ nguyên vẻ hoang sơ, chưa bị khai thác du lịch đại trà',
      'Mỗi cơn triều lên tạo ra những "hồ bơi" tự nhiên giữa các tảng đá — lý tưởng để tắm mình',
      'Tảng đá lớn nhất ước nặng hàng nghìn tấn nhưng nguồn gốc xuất hiện vẫn là bí ẩn địa chất',
    ],
  },
  27: {
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&q=80',
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80',
      'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=900&q=80',
      'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=900&q=80',
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=80',
    ],
    funFacts: [
      'Đại tướng Võ Nguyên Giáp chọn đây vì "đất lành, gió mát, trước có biển rộng, sau có núi cao"',
      'Vũng Chùa có nghĩa là "Vũng nước của chùa" — từ xưa đã là vùng nước yên bình và linh thiêng',
      'Mỗi ngày có hàng trăm người đến thắp hương; ngày lễ lên đến hàng chục nghìn người',
      'Đại tướng qua đời ngày 4/10/2013 hưởng thọ 103 tuổi — vị tướng huyền thoại của thế kỷ 20',
      'Từ khu mộ nhìn ra là vùng biển và đảo Yến xanh ngắt — một trong những cảnh đẹp nhất vùng Bắc Quảng Trị',
      'Người Việt Nam xếp Đại tướng Giáp cùng Hồ Chí Minh là hai nhân vật được yêu quý nhất lịch sử',
    ],
  },
};

// ── Popup gallery state ────────────────────────────────────
const galleryState = { currentIndex: 0, images: [] };

function openDestPopup(id) {
  const featured = ALL_FEATURED.find(d => d.id === id);
  const dest     = (typeof destinations !== 'undefined') ? destinations.find(d => d.id === id) : null;
  const detail   = DEST_DETAILS[id] || { images: [], funFacts: [] };

  if (!featured) return;

  // Gallery
  galleryState.images = detail.images.length ? detail.images : [
    `https://picsum.photos/seed/${id}-a/900/500`,
    `https://picsum.photos/seed/${id}-b/900/500`,
    `https://picsum.photos/seed/${id}-c/900/500`,
    `https://picsum.photos/seed/${id}-d/900/500`,
    `https://picsum.photos/seed/${id}-e/900/500`,
  ];
  galleryState.currentIndex = 0;
  renderGallery();

  // Header
  document.getElementById('popup-icon').textContent = featured.icon;
  document.getElementById('popup-icon').style.background = featured.gradient;
  document.getElementById('popup-title').textContent = featured.name;
  document.getElementById('popup-tagline').textContent = featured.tagline;
  document.getElementById('popup-province').textContent = featured.province;

  // Info chips
  const infoGrid = document.getElementById('popup-info-grid');
  if (dest) {
    infoGrid.innerHTML = [
      dest.hours       ? `<div class="popup-chip"><span>🕐</span><div><div class="chip-label">Giờ mở cửa</div><div class="chip-val">${dest.hours}</div></div></div>` : '',
      dest.admission   ? `<div class="popup-chip"><span>🎟️</span><div><div class="chip-label">Vé vào cửa</div><div class="chip-val">${dest.admission}</div></div></div>` : '',
      dest.duration    ? `<div class="popup-chip"><span>⏱️</span><div><div class="chip-label">Thời gian</div><div class="chip-val">${dest.duration}</div></div></div>` : '',
      dest.bestTime    ? `<div class="popup-chip"><span>☀️</span><div><div class="chip-label">Thời điểm đẹp</div><div class="chip-val">${dest.bestTime}</div></div></div>` : '',
      dest.address     ? `<div class="popup-chip popup-chip--full"><span>📍</span><div><div class="chip-label">Địa chỉ</div><div class="chip-val">${dest.address}</div></div></div>` : '',
    ].join('');
  } else {
    infoGrid.innerHTML = featured.badges.map(b =>
      `<div class="popup-chip"><span>✦</span><div><div class="chip-val">${b}</div></div></div>`
    ).join('');
  }

  // Description
  document.getElementById('popup-description').textContent =
    (dest && dest.description) ? dest.description : featured.tagline;

  // Fun facts
  document.getElementById('popup-facts').innerHTML =
    detail.funFacts.map(f => `<li><span class="fact-dot">✦</span>${f}</li>`).join('');

  // Tips
  const tipsEl = document.getElementById('popup-tips');
  const tips = (dest && dest.tips && dest.tips.length) ? dest.tips : [];
  tipsEl.innerHTML = tips.length
    ? tips.map(t => `<li><span class="tip-check">✓</span>${t}</li>`).join('')
    : '<li><span class="tip-check">✓</span>Liên hệ hướng dẫn viên địa phương để có trải nghiệm tốt nhất</li>';

  // Plan button state
  updatePopupPlanBtn(id);
  document.getElementById('dest-popup-overlay').dataset.destId = id;
  document.getElementById('dest-popup-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDestPopup() {
  document.getElementById('dest-popup-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function renderGallery() {
  const { images, currentIndex } = galleryState;
  const mainImg = document.getElementById('popup-img-main');
  mainImg.src = images[currentIndex];
  mainImg.onerror = function() {
    this.style.display = 'none';
    document.getElementById('popup-img-fallback').style.display = 'flex';
  };
  mainImg.onload = function() {
    this.style.display = 'block';
    document.getElementById('popup-img-fallback').style.display = 'none';
  };

  document.getElementById('gallery-counter').textContent = `${currentIndex + 1} / ${images.length}`;

  const thumbs = document.getElementById('gallery-thumbs');
  thumbs.innerHTML = images.map((src, i) => `
    <div class="gallery-thumb ${i === currentIndex ? 'active' : ''}" onclick="goToImage(${i})">
      <img src="${src}" alt="" loading="lazy" onerror="this.parentElement.style.background='#333'">
    </div>`).join('');
}

function nextImage() {
  const len = galleryState.images.length;
  galleryState.currentIndex = (galleryState.currentIndex + 1) % len;
  renderGallery();
}

function prevImage() {
  const len = galleryState.images.length;
  galleryState.currentIndex = (galleryState.currentIndex - 1 + len) % len;
  renderGallery();
}

function goToImage(i) {
  galleryState.currentIndex = i;
  renderGallery();
}

function updatePopupPlanBtn(id) {
  const btn = document.getElementById('popup-plan-btn');
  if (!btn) return;
  const isIn = plannerState.selectedDests.has(id);
  btn.textContent = isIn ? '✓ Đã thêm vào kế hoạch' : '+ Thêm vào kế hoạch';
  btn.className = isIn ? 'btn btn-outline popup-plan-btn-active' : 'btn btn-primary';
}

function toggleFromPopup() {
  const id = parseInt(document.getElementById('dest-popup-overlay').dataset.destId);
  const card = document.querySelector(`.showcase-card[data-id="${id}"]`);
  if (plannerState.selectedDests.has(id)) {
    plannerState.selectedDests.delete(id);
    card?.classList.remove('selected');
  } else {
    plannerState.selectedDests.add(id);
    card?.classList.add('selected');
  }
  updateSelectionCount();
  closeDestPopup();
}

// ── Render showcase cards ─────────────────────────────────
function renderShowcase() {
  renderRegion('showcase-qt', FEATURED_QT);
  renderRegion('showcase-qb', FEATURED_QB);
}

function renderRegion(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map(d => {
    const img = DEST_DETAILS[d.id]?.images?.[0] || '';
    return `
      <div class="showcase-card" onclick="openDestPopup(${d.id})"
           style="background:${d.gradient};" data-id="${d.id}">
        ${img ? `<img class="sc-bg-img" src="${img}" alt="" loading="lazy"
                      onload="this.classList.add('loaded')" onerror="this.remove()">` : ''}
        <div class="sc-overlay"></div>
        <div class="sc-icon">${d.icon}</div>
        <div class="sc-content">
          <h3 class="sc-name">${d.name}</h3>
          <p class="sc-tagline">${d.tagline}</p>
          <div class="sc-badges">
            ${d.badges.map(b => `<span class="sc-badge">${b}</span>`).join('')}
          </div>
        </div>
        <div class="sc-check" id="check-${d.id}">✓</div>
      </div>`;
  }).join('');
}

function toggleDestCard(card, id) {
  const isSelected = plannerState.selectedDests.has(id);
  if (isSelected) {
    plannerState.selectedDests.delete(id);
    card.classList.remove('selected');
  } else {
    plannerState.selectedDests.add(id);
    card.classList.add('selected');
  }
  updateSelectionCount();
}

function updateSelectionCount() {
  const n = plannerState.selectedDests.size;
  const el = document.getElementById('selectionCount');
  if (el) el.textContent = n > 0 ? `${n} điểm` : 'Chọn điểm';
  const bar = document.getElementById('selectionBar');
  if (bar) bar.classList.toggle('visible', n > 0 || plannerState.currentStep > 1);
  updateSmartBar();
  if (typeof renderStep1List === 'function') renderStep1List();
}

function updateSmartBar() {
  const n    = plannerState.selectedDests.size;
  const step = plannerState.currentStep;

  // Pill 1 – destinations
  const p1 = document.getElementById('pill-dests');
  p1?.classList.toggle('done', n > 0);

  // Pill 2 – trip info
  const p2     = document.getElementById('pill-trip');
  const p2Text = document.getElementById('pill-trip-text');
  const tripDone = step >= 2;
  p2?.classList.toggle('done', tripDone);
  if (p2Text) p2Text.textContent = tripDone
    ? `${plannerState.numPeople} người · ${plannerState.numDays} ngày`
    : 'Hành trình';

  // Pill 3 – services
  const p3     = document.getElementById('pill-services');
  const p3Text = document.getElementById('pill-services-text');
  const svc = [plannerState.selectedHotel, plannerState.selectedTransport, plannerState.selectedFood];
  const svcCount = svc.filter(Boolean).length;
  p3?.classList.toggle('done', svcCount > 0);
  if (p3Text) p3Text.textContent = svcCount > 0
    ? `${svcCount}/3 dịch vụ`
    : 'Dịch vụ';

  // CTA button
  const btn     = document.getElementById('startPlannerBtn');
  const btnText = document.getElementById('smartBtnText');
  if (!btn || !btnText) return;
  btn.disabled = n === 0;
  btn.classList.remove('pulse');

  if (step === 4) {
    btnText.textContent = 'Đặt lịch ngay';
    btn.classList.add('pulse');
  } else if (step === 3) {
    btnText.textContent = 'Xem tóm tắt';
  } else if (step === 2) {
    btnText.textContent = 'Xem đề xuất';
  } else {
    btnText.textContent = 'Lên kế hoạch';
  }
}

function smartBarAction() {
  const step = plannerState.currentStep;
  if (step === 2) {
    if (typeof proceedStep2 === 'function') proceedStep2();
  } else if (step === 3) {
    if (typeof proceedStep3 === 'function') proceedStep3();
  } else if (step === 4) {
    document.querySelector('.contact-cta-box')?.scrollIntoView({ behavior: 'smooth' });
  } else {
    goToPlanner();
  }
}

// ── Planner steps ─────────────────────────────────────────
function goToPlanner() {
  document.getElementById('planner-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => showStep(2), 400);
}

function showStep(n) {
  plannerState.currentStep = n;
  document.querySelectorAll('.planner-step').forEach(el => el.classList.add('hidden'));
  document.getElementById(`planner-step-${n}`)?.classList.remove('hidden');
  document.querySelectorAll('.step-indicator').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === n);
    el.classList.toggle('done',   i + 1 < n);
  });
  document.getElementById('planner-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Step 2: Group info
function initGroupStep() {
  const numPeopleInput = document.getElementById('numPeople');
  const numDaysInput   = document.getElementById('numDays');
  const displayPeople  = document.getElementById('displayPeople');
  const displayDays    = document.getElementById('displayDays');

  if (numPeopleInput) {
    numPeopleInput.addEventListener('input', function() {
      plannerState.numPeople = parseInt(this.value);
      displayPeople.textContent = this.value + ' người';
    });
  }
  if (numDaysInput) {
    numDaysInput.addEventListener('input', function() {
      plannerState.numDays = parseInt(this.value);
      displayDays.textContent = this.value + ' ngày';
    });
  }
}

// ── Sub-step navigation ───────────────────────────────────
function showSubStep(n) {
  plannerState.recoSubStep = n;

  // Show/hide panels
  [1, 2, 3].forEach(i => {
    const el = document.getElementById(`reco-substep-${i}`);
    if (el) el.hidden = (i !== n);
  });

  // Update progress indicators
  ['rsi-1','rsi-2','rsi-3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active','done');
    if (i + 1 < n)  el.classList.add('done');
    if (i + 1 === n) el.classList.add('active');
  });
  const line12 = document.getElementById('rsl-12');
  const line23 = document.getElementById('rsl-23');
  if (line12) line12.classList.toggle('done', n > 1);
  if (line23) line23.classList.toggle('done', n > 2);

  // Update next-button labels based on current selection
  updateSubStepNextBtn(n);
  updateSmartBar();
}

function updateSubStepNextBtn(n) {
  const map = {
    1: { sel: plannerState.selectedHotel,     btnId: 'rss-next-1', next: 'Di chuyển' },
    2: { sel: plannerState.selectedTransport, btnId: 'rss-next-2', next: 'Ăn uống' },
  };
  const cfg = map[n];
  if (!cfg) return;
  const btn = document.getElementById(cfg.btnId);
  if (!btn) return;
  if (cfg.sel) {
    const label = cfg.sel.undecided ? 'Chưa xác định' : cfg.sel.name.split(' ').slice(0,3).join(' ') + '…';
    btn.innerHTML = `✓ ${label} &nbsp;· Tiếp theo <i class="fas fa-arrow-right"></i>`;
  } else {
    btn.innerHTML = `Tiếp theo: ${cfg.next} <i class="fas fa-arrow-right"></i>`;
  }
}

// ── Region helpers ────────────────────────────────────────
function getSelectedRegions() {
  let north = 0, south = 0;
  plannerState.selectedDests.forEach(id => {
    if (NORTH_DEST_IDS.has(id)) north++; else south++;
  });
  return { north, south };
}

function sortByRegion(arr, primaryRegion) {
  return [...arr].sort((a, b) => {
    const aMatch = a.region === primaryRegion ? -1 : 1;
    const bMatch = b.region === primaryRegion ? -1 : 1;
    return aMatch - bMatch;
  });
}

function getRegionLabel(region) {
  return region === 'north' ? '📍 Vùng Bắc QT' : '📍 Vùng Nam QT';
}

// Step 3: Recommendations
function renderRecommendations() {
  const n = plannerState.numPeople;
  const { north, south } = getSelectedRegions();
  const primary = north >= south ? 'north' : 'south';

  let hotels = [...HOTELS];
  if (n <= 2)      hotels = hotels.filter(h => h.forGroup !== 'large');
  else if (n <= 8) hotels = hotels.filter(h => h.forGroup !== 'pilgrimage');
  hotels = sortByRegion(hotels, primary);

  let transports = [...TRANSPORTS];
  if      (n <= 2)  transports = transports.filter(t => ['small','all'].includes(t.forSize));
  else if (n <= 6)  transports = transports.filter(t => ['small','medium','all'].includes(t.forSize));
  else              transports = transports.filter(t => ['large','all'].includes(t.forSize));
  if (transports.length < 3) transports = [...TRANSPORTS];

  currentReco.hotels     = hotels;
  currentReco.transports = transports;
  currentReco.foods      = sortByRegion([...FOODS], primary);

  // Render all 3 panels
  renderRecoPanel('hotel');
  renderRecoPanel('transport');
  renderRecoPanel('food');
  renderItinerary();

  // Start from sub-step 1
  showSubStep(1);
}

function renderRecoPanel(type) {
  if (type === 'hotel') {
    renderRecoCards('reco-hotels',
      [UNDECIDED.hotel, ...currentReco.hotels], renderHotelCard);
  } else if (type === 'transport') {
    renderRecoCards('reco-transports',
      [UNDECIDED.transport, ...currentReco.transports], renderTransportCard);
  } else {
    renderRecoCards('reco-foods',
      [UNDECIDED.food, ...currentReco.foods], renderFoodCard);
  }
}

function renderRecoCards(containerId, items, renderFn) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = items.map((item, i) => renderFn(item, i)).join('');
}

function renderHotelCard(h, i) {
  const isSelected = plannerState.selectedHotel?.name === h.name;
  const regionTag  = h.undecided ? '' : `<span class="reco-region-tag">${getRegionLabel(h.region)}</span>`;
  return `
    <div class="reco-card ${isSelected ? 'reco-selected' : ''} ${h.undecided ? 'undecided-card' : ''}"
         onclick="selectReco('hotel',${i})" style="background:${h.gradient};">
      <div class="reco-check-badge">✓</div>
      <div class="reco-icon">${h.icon}</div>
      <div class="reco-body">
        <div class="reco-type">${h.type}${regionTag}</div>
        <h4 class="reco-name">${h.name}</h4>
        <p class="reco-desc">${h.desc}</p>
        <div class="reco-badges">${h.highlights.map(b=>`<span>${b}</span>`).join('')}</div>
        <div class="reco-meta">
          <span class="reco-price">💰 ${h.price}</span>
          ${h.location ? `<span class="reco-location">📍 ${h.location}</span>` : ''}
        </div>
        <div class="reco-card-footer">
          ${h.phone ? `<a href="tel:${h.phone}" class="reco-contact" onclick="event.stopPropagation()">📞 ${h.phone}</a>` : '<span></span>'}
          <button class="reco-select-btn ${isSelected ? 'selected' : ''}" onclick="event.stopPropagation();selectReco('hotel',${i})">
            ${isSelected ? '✓ Đã chọn' : 'Chọn'}
          </button>
        </div>
      </div>
    </div>`;
}

function renderTransportCard(t, i) {
  const isSelected = plannerState.selectedTransport?.name === t.name;
  return `
    <div class="reco-card ${isSelected ? 'reco-selected' : ''} ${t.undecided ? 'undecided-card' : ''}"
         onclick="selectReco('transport',${i})" style="background:${t.gradient};">
      <div class="reco-check-badge">✓</div>
      <div class="reco-icon">${t.icon}</div>
      <div class="reco-body">
        <div class="reco-type">${t.type}</div>
        <h4 class="reco-name">${t.name}</h4>
        <p class="reco-desc">${t.desc}</p>
        <div class="reco-badges">${t.highlights.map(b=>`<span>${b}</span>`).join('')}</div>
        <div class="reco-meta">
          <span class="reco-price">💰 ${t.price}</span>
          ${t.unit && !t.undecided ? `<span class="reco-unit">/ ${t.unit}</span>` : ''}
        </div>
        <div class="reco-card-footer">
          ${t.contact ? `<span class="reco-contact">📞 ${t.contact}</span>` : '<span></span>'}
          <button class="reco-select-btn ${isSelected ? 'selected' : ''}" onclick="event.stopPropagation();selectReco('transport',${i})">
            ${isSelected ? '✓ Đã chọn' : 'Chọn'}
          </button>
        </div>
      </div>
    </div>`;
}

function renderFoodCard(f, i) {
  const isSelected = plannerState.selectedFood?.name === f.name;
  const regionTag  = f.undecided ? '' : `<span class="reco-region-tag">${getRegionLabel(f.region)}</span>`;
  return `
    <div class="reco-card ${isSelected ? 'reco-selected' : ''} ${f.undecided ? 'undecided-card' : ''}"
         onclick="selectReco('food',${i})" style="background:${f.gradient};">
      <div class="reco-check-badge">✓</div>
      <div class="reco-icon">${f.icon}</div>
      <div class="reco-body">
        <div class="reco-type">${f.type}${regionTag}</div>
        <h4 class="reco-name">${f.name}</h4>
        <p class="reco-desc">${f.desc}</p>
        <div class="reco-badges">${f.highlights.map(b=>`<span>${b}</span>`).join('')}</div>
        <div class="reco-meta">
          <span class="reco-price">💰 ${f.price}</span>
          ${f.location ? `<span class="reco-location">📍 ${f.location}</span>` : ''}
        </div>
        <div class="reco-card-footer">
          ${f.phone ? `<a href="tel:${f.phone}" class="reco-contact" onclick="event.stopPropagation()">📞 ${f.phone}</a>` : '<span></span>'}
          <button class="reco-select-btn ${isSelected ? 'selected' : ''}" onclick="event.stopPropagation();selectReco('food',${i})">
            ${isSelected ? '✓ Đã chọn' : 'Chọn'}
          </button>
        </div>
      </div>
    </div>`;
}

// ── Selection handler ─────────────────────────────────────
function selectReco(type, idx) {
  // idx 0 = undecided, idx 1+ = from currentReco arrays
  const allHotels     = [UNDECIDED.hotel,     ...currentReco.hotels];
  const allTransports = [UNDECIDED.transport, ...currentReco.transports];
  const allFoods      = [UNDECIDED.food,      ...currentReco.foods];

  if (type === 'hotel') {
    const item = allHotels[idx];
    plannerState.selectedHotel = (plannerState.selectedHotel?.name === item.name) ? null : item;
    renderRecoPanel('hotel');
    updateSubStepNextBtn(1);
  } else if (type === 'transport') {
    const item = allTransports[idx];
    plannerState.selectedTransport = (plannerState.selectedTransport?.name === item.name) ? null : item;
    renderRecoPanel('transport');
    updateSubStepNextBtn(2);
  } else {
    const item = allFoods[idx];
    plannerState.selectedFood = (plannerState.selectedFood?.name === item.name) ? null : item;
    renderRecoPanel('food');
  }
  updateSmartBar();
}

// kept for backward compat (smart bar calls this indirectly)
function updateRecoTabHeaders() { updateSmartBar(); }
function showRecoPanel() {}

// Step 4: Summary & Cost
function renderSummary() {
  const dests = ALL_FEATURED.filter(d => plannerState.selectedDests.has(d.id));
  const n     = plannerState.numPeople;
  const days  = plannerState.numDays;

  const hotel     = plannerState.selectedHotel     || UNDECIDED.hotel;
  const transport = plannerState.selectedTransport || UNDECIDED.transport;
  const food      = plannerState.selectedFood      || UNDECIDED.food;

  const cost = estimateCost(dests.length, n, days, hotel.priceNum, transport.priceNum, food.priceNum);

  // Destinations summary
  const destList = document.getElementById('summary-dests');
  if (destList) {
    destList.innerHTML = dests.map(d => `
      <div class="summary-dest-item">
        <span style="font-size:1.3rem;">${d.icon}</span>
        <div>
          <div style="font-weight:600;font-size:.875rem;">${d.name}</div>
          <div style="font-size:.75rem;color:rgba(255,255,255,.7);">${d.province} · ${d.badges[0]}</div>
        </div>
      </div>`).join('');
  }

  // Selections summary
  const selEl = document.getElementById('summary-selections');
  if (selEl) {
    const selItem = (icon, label, chosen) => {
      const isUndecided = chosen.undecided;
      return `
        <div class="summary-sel-item">
          <span class="sel-icon">${chosen.icon || icon}</span>
          <div>
            <div class="sel-label">${label}</div>
            <div class="sel-name ${isUndecided ? 'sel-default' : ''}">${chosen.name}</div>
            ${isUndecided ? '<div class="sel-price" style="font-style:italic;opacity:.6;">Tự sắp xếp khi đến</div>'
                          : `<div class="sel-price">💰 ${chosen.price}</div>`}
          </div>
          ${isUndecided ? '<span class="sel-check" style="opacity:.4;">🎲</span>'
                        : '<span class="sel-check">✓</span>'}
        </div>`;
    };
    selEl.innerHTML =
      selItem('🏨', 'Lưu trú',   hotel) +
      selItem('🚗', 'Di chuyển', transport) +
      selItem('🍜', 'Ăn uống',   food);
  }

  // Cost breakdown
  const costEl = document.getElementById('cost-breakdown');
  if (costEl) {
    const hotelRow     = hotel.undecided     ? '<em style="opacity:.6;">Chưa xác định</em>' : `${formatMoney(cost.hotel)}đ`;
    const transportRow = transport.undecided ? '<em style="opacity:.6;">Chưa xác định</em>' : `${formatMoney(cost.transport)}đ`;
    const foodRow      = food.undecided      ? '<em style="opacity:.6;">Chưa xác định</em>' : `${formatMoney(cost.food)}đ`;
    costEl.innerHTML = `
      <div class="cost-row"><span>🎟️ Vé tham quan</span><span>${formatMoney(cost.admission)}đ</span></div>
      <div class="cost-row"><span>🏨 Lưu trú ${days} đêm</span><span>${hotelRow}</span></div>
      <div class="cost-row"><span>🚗 Di chuyển ${days} ngày</span><span>${transportRow}</span></div>
      <div class="cost-row"><span>🍜 Ăn uống (3 bữa/ngày)</span><span>${foodRow}</span></div>
      <div class="cost-row"><span>🔧 Chi phí phát sinh (+12%)</span><span>${formatMoney(cost.buffer)}đ</span></div>
      <div class="cost-total"><span>💰 Ước tính tối thiểu</span><span>${formatMoney(cost.total)}đ</span></div>
      <div class="cost-per-person">~ ${formatMoney(cost.perPerson)}đ / người</div>
      <p style="font-size:.72rem;opacity:.7;margin-top:8px;">*Không tính các mục "Chưa xác định" — chi phí thực tế sẽ cao hơn</p>`;
  }
}

// ── Switch reco panels ─────────────────────────────────────
function showRecoPanel(tab) {
  document.querySelectorAll('.reco-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.reco-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector(`.reco-tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(`reco-panel-${tab}`)?.classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════════
//  ITINERARY GENERATOR
// ═══════════════════════════════════════════════════════════

let itinData = [];
let itinActiveDay = 1;

function calcDist(a, b) {
  if (!a?.lat || !b?.lat) return 30;
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}

function nearestNeighbor(items) {
  if (items.length <= 1) return items;
  const result = [items[0]], pool = items.slice(1);
  while (pool.length) {
    const last = result[result.length - 1];
    let best = 0, bestD = Infinity;
    pool.forEach((d, i) => { const dist = calcDist(last, d); if (dist < bestD) { bestD = dist; best = i; } });
    result.push(pool.splice(best, 1)[0]);
  }
  return result;
}

function parseDurH(str) {
  if (!str) return 1.5;
  const m = str.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 1.5;
}

function minToTime(m) {
  return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
}

function generateItinerary() {
  const ids = [...plannerState.selectedDests];
  const numDays = plannerState.numDays;
  if (!ids.length) return [];

  const destData = ids.map(id => {
    const f    = ALL_FEATURED.find(d => d.id === id);
    const full = (typeof destinations !== 'undefined') ? destinations.find(d => d.id === id) : null;
    return { id, name: f?.name || '', icon: f?.icon || '📍',
      lat: full?.lat || null, lng: full?.lng || null,
      durationStr: full?.duration || '1-2 giờ', durationH: parseDurH(full?.duration),
      address: full?.address || '', region: NORTH_DEST_IDS.has(id) ? 'north' : 'south' };
  });

  const south = nearestNeighbor(destData.filter(d => d.region === 'south'));
  const north = nearestNeighbor(destData.filter(d => d.region === 'north'));
  const total = south.length + north.length;

  let dS = south.length === 0 ? 0 : Math.max(1, Math.round(numDays * south.length / total));
  let dN = north.length === 0 ? 0 : Math.max(1, numDays - dS);
  if (dS + dN > numDays) dS = numDays - dN;

  const dayGroups = [];
  if (south.length) {
    const perDay = Math.ceil(south.length / Math.max(1, dS));
    for (let i = 0; i < dS; i++) { const s = south.slice(i*perDay, (i+1)*perDay); if (s.length) dayGroups.push({ region: 'south', dests: s }); }
  }
  if (north.length) {
    const perDay = Math.ceil(north.length / Math.max(1, dN));
    for (let i = 0; i < dN; i++) { const s = north.slice(i*perDay, (i+1)*perDay); if (s.length) dayGroups.push({ region: 'north', dests: s }); }
  }
  while (dayGroups.length < numDays) dayGroups.push({ region: 'free', dests: [] });

  return dayGroups.map((g, idx) => {
    let t = 8 * 60;
    const items = [];
    let hadLunch = false;

    g.dests.forEach((dest, i) => {
      items.push({ type: 'visit', time: minToTime(t), dest, end: minToTime(Math.round(t + dest.durationH * 60)) });
      t += dest.durationH * 60;

      if (!hadLunch && t >= 12 * 60 && i < g.dests.length - 1) {
        hadLunch = true;
        t = Math.ceil(t / 60) * 60;
        items.push({ type: 'lunch', time: minToTime(t) });
        t += 75;
      }

      if (i < g.dests.length - 1) {
        const km  = calcDist(dest, g.dests[i+1]);
        const min = Math.max(15, Math.round(km / 55 * 60));
        items.push({ type: 'drive', km: Math.round(km), minutes: min });
        t += min;
      }
    });

    if (!g.dests.length) items.push({ type: 'free' });
    return { dayNum: idx + 1, region: g.region, items };
  });
}

function renderItinerary() {
  itinData = generateItinerary();
  itinActiveDay = 1;
  const sec = document.getElementById('itin-section');
  if (!sec) return;
  if (!itinData.length) { sec.hidden = true; return; }
  sec.hidden = false;

  const regionLabel = r => ({ south: '🏛️ Vùng Nam', north: '🕳️ Vùng Bắc', free: '🌿 Tự do' })[r] || '';

  document.getElementById('itin-day-tabs').innerHTML = itinData.map((d, i) =>
    `<button class="itin-day-btn ${i===0?'active':''}" onclick="showItinDay(${i+1})">
       Ngày ${d.dayNum} <span class="itin-day-tag ${d.region}">${regionLabel(d.region)}</span>
     </button>`
  ).join('');

  showItinDay(1);
}

function showItinDay(n) {
  itinActiveDay = n;
  document.querySelectorAll('.itin-day-btn').forEach((b, i) => b.classList.toggle('active', i+1 === n));
  const day = itinData[n - 1];
  const tl  = document.getElementById('itin-timeline');
  if (!day) return;

  tl.innerHTML = day.items.map(item => {
    if (item.type === 'visit') {
      const addr = item.dest.address ? ' · ' + item.dest.address.split(',').slice(-2).join(',').trim() : '';
      return `
        <div class="itin-item">
          <div class="itin-time-col">
            <div class="itin-time">${item.time}</div>
            <div class="itin-time-end">${item.end}</div>
          </div>
          <div class="itin-connector"><div class="itin-dot"></div><div class="itin-line"></div></div>
          <div class="itin-content">
            <span class="itin-icon">${item.dest.icon}</span>
            <div>
              <div class="itin-name">${item.dest.name}</div>
              <div class="itin-meta">⏱️ ${item.dest.durationStr}${addr}</div>
            </div>
          </div>
        </div>`;
    }
    if (item.type === 'drive') return `<div class="itin-drive">🚗 Di chuyển · ~${item.minutes} phút · ${item.km} km</div>`;
    if (item.type === 'lunch') return `<div class="itin-drive">🍜 Dừng ăn trưa · ~75 phút (${item.time})</div>`;
    if (item.type === 'free')  return `<div class="itin-free"><span>🌿</span><p>Ngày tự do — nghỉ ngơi hoặc khám phá tự phát theo ý thích</p></div>`;
    return '';
  }).join('');
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderShowcase();
  initGroupStep();
  updateSelectionCount();
});
