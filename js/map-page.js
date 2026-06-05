// ============================================================
//  MAP-PAGE.JS — /map.html (redirect to index or standalone)
// ============================================================

// Redirect map.html to index.html since index IS now the map
if (window.location.pathname.endsWith('map.html')) {
  const params = window.location.search;
  window.location.replace('index.html' + params);
}
