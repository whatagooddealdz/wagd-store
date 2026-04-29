/* ============================================================
   WAGD — What A Good Deal! | app.js
   Handles: JSON fetch, rendering, filters, search, checkout
   ============================================================ */

'use strict';

/* ── State ── */
const state = {
  games:           [],
  filtered:        [],
  activeFilter:    'All',
  searchQuery:     '',
  instagramHandle: 'myusername',
  modalGame:       null,
};

/* ── DOM refs ── */
const $  = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  announcementBar:  $('announcement-bar'),
  announcementText: $('announcement-text'),
  dismissBtn:       $('dismiss-announcement'),
  igNavLink:        $('ig-nav-link'),
  igMobileLink:     $('ig-mobile-link'),
  igFooterLink:     $('ig-footer-link'),
  dotwCard:         $('dotw-card'),
  gameGrid:         $('game-grid'),
  gridLoading:      $('grid-loading'),
  emptyState:       $('empty-state'),
  resultsCount:     $('results-count'),
  searchInput:      $('search-input'),
  searchClear:      $('search-clear'),
  filterBtns:       $$('.filter-btn'),
  hamburger:        $('hamburger'),
  mobileNav:        $('mobile-nav'),
  toast:            $('toast'),
  modalOverlay:     $('modal-overlay'),
  modalClose:       $('modal-close'),
};

/* ── Helpers ── */
function formatPrice(n) {
  return n.toLocaleString('fr-DZ') + ' DZD';
}

function calcDiscount(original, sale) {
  if (!original || original === sale) return null;
  return Math.round(((original - sale) / original) * 100);
}

function badgeClass(badge) {
  if (!badge) return '';
  const b = badge.toLowerCase();
  if (b.includes('sale') || b.includes('deal')) return 'sale';
  if (b.includes('new')) return 'new';
  if (b.includes('hot')) return 'hot';
  return '';
}

function showToast(msg, duration = 3500) {
  const t = DOM.toast;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

/* ── Announcement Bar ── */
function initAnnouncement(text) {
  DOM.announcementText.textContent = text;
  const dismissed = sessionStorage.getItem('wagd_announce_dismissed');
  if (dismissed) {
    DOM.announcementBar.classList.add('dismissed');
  }
  DOM.dismissBtn.addEventListener('click', () => {
    DOM.announcementBar.classList.add('dismissed');
    sessionStorage.setItem('wagd_announce_dismissed', '1');
  });
}

/* ── Instagram links ── */
function setInstagramLinks(handle) {
  const url = `https://www.instagram.com/${handle}/`;
  [DOM.igNavLink, DOM.igMobileLink, DOM.igFooterLink].forEach(el => {
    if (el) el.href = url;
  });
  state.instagramHandle = handle;
}

/* ── Checkout ── */
function handleBuyNow(game) {
  if (game.checkoutMethod === 'google_form' && game.checkoutLink) {
    window.open(game.checkoutLink, '_blank', 'noopener,noreferrer');
    showToast('📋 Opening order form… Fill in your CCP details & upload receipt.');
  } else {
    // Instagram DM
    const handle = state.instagramHandle || 'whatagooddeal.dz';
    const igUrl = `https://ig.me/m/${handle}`;
    window.open(igUrl, '_blank', 'noopener,noreferrer');
    showToast(`💬 Opening Instagram DM… Message us to buy "${game.title}"!`);
  }
}

/* ── Render: Deal of the Week ── */
function renderDotw(game) {
  if (!game) {
    DOM.dotwCard.innerHTML = '<p class="dotw-loading">No deal featured this week. Check back Friday!</p>';
    return;
  }

  const discount = calcDiscount(game.originalPrice, game.price);

  DOM.dotwCard.innerHTML = `
    <div class="dotw-img-wrap">
      <img src="${game.image}" alt="${escHtml(game.title)} cover" loading="lazy" />
    </div>
    <div class="dotw-info">
      <div class="dotw-meta">
        ${renderTags(game)}
      </div>
      <h2 class="dotw-title">${escHtml(game.title)}</h2>
      <p class="dotw-desc">${escHtml(game.description)}</p>
      <div class="dotw-pricing">
        <span class="dotw-price">${formatPrice(game.price)}</span>
        ${game.originalPrice && game.originalPrice !== game.price
          ? `<span class="dotw-original">${formatPrice(game.originalPrice)}</span>
             <span class="dotw-save">SAVE ${discount}%</span>`
          : ''}
      </div>
      <button class="btn-buy dotw-btn" data-id="${game.id}" aria-label="Buy ${escHtml(game.title)}">
        ${game.checkoutMethod === 'google_form' ? '📋 Order via Form' : '💬 DM to Buy'}
      </button>
    </div>
  `;

  DOM.dotwCard.querySelector('.btn-buy').addEventListener('click', () => handleBuyNow(game));
}

/* ── Render: Tags ── */
function renderTags(game) {
  const stockTag    = game.stock === 'Low Stock'
    ? `<span class="tag tag-stock-low">⚡ Low Stock</span>`
    : '';
  const regionClass = game.highlightRegion
    ? 'tag tag-region tag-region-highlight'
    : 'tag tag-region';
  return `
    <div class="card-tags">
      ${game.platform ? `<span class="tag tag-platform">${escHtml(game.platform)}</span>` : ''}
      ${game.region   ? `<span class="${regionClass}">🌍 ${escHtml(game.region)}</span>` : ''}
      ${stockTag}
    </div>
  `;
}

/* ── Render: Game Card ── */
function renderCard(game) {
  const discount   = calcDiscount(game.originalPrice, game.price);
  const badge      = game.dealBadge;
  const bClass     = badgeClass(badge);
  const oos        = !!game.isOutOfStock;
  // Support both single image string and images array — first image is cover
  const coverImg   = Array.isArray(game.images) && game.images.length
    ? game.images[0]
    : (game.image || '');

  const card = document.createElement('article');
  card.className = `game-card${oos ? ' out-of-stock' : ''}`;
  card.setAttribute('aria-label', game.title);
  card.style.animationDelay = `${Math.random() * 0.15}s`;
  card.style.cursor = 'pointer';

  card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${escHtml(coverImg)}" alt="${escHtml(game.title)} game cover" loading="lazy" />
      ${badge ? `<span class="card-badge ${bClass}">${escHtml(badge)}</span>` : ''}
      ${oos    ? `<div class="badge-oos">Out of Stock</div>` : ''}
    </div>
    <div class="card-body">
      <h3 class="card-title">${escHtml(game.title)}</h3>
      <p class="card-desc">${escHtml(game.description)}</p>
      ${renderTags(game)}
      <div class="card-pricing">
        <span class="price-current">${formatPrice(game.price)}</span>
        ${discount
          ? `<span class="price-original">${formatPrice(game.originalPrice)}</span>
             <span class="price-discount">-${discount}%</span>`
          : ''}
      </div>
      <button class="btn-buy" data-id="${game.id}" aria-label="Buy ${escHtml(game.title)}"
        ${oos ? 'disabled' : ''}>
        ${oos ? '⛔ Out of Stock' : (game.checkoutMethod === 'google_form' ? '📋 Order Now' : '💬 Buy via DM')}
      </button>
    </div>
  `;

  // Buy button stops propagation so it never triggers modal
  card.querySelector('.btn-buy').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!oos) handleBuyNow(game);
  });

  // Clicking anywhere else on the card opens modal
  card.addEventListener('click', () => openModal(game));

  return card;
}

/* ── Render: Grid ── */
function renderGrid() {
  // Clear
  DOM.gameGrid.innerHTML = '';
  DOM.emptyState.hidden = true;

  // Out-of-stock games always sink to the bottom
  const games = [...state.filtered].sort((a, b) => {
    if (!!a.isOutOfStock === !!b.isOutOfStock) return 0;
    return a.isOutOfStock ? 1 : -1;
  });

  if (games.length === 0) {
    DOM.emptyState.hidden = false;
    DOM.resultsCount.textContent = '';
    return;
  }

  const total = state.games.length;
  DOM.resultsCount.textContent = games.length === total
    ? `Showing all ${total} games`
    : `Showing ${games.length} of ${total} games`;

  const fragment = document.createDocumentFragment();
  games.forEach(g => fragment.appendChild(renderCard(g)));
  DOM.gameGrid.appendChild(fragment);
}

/* ── Filter & Search ── */
function applyFilters() {
  const q = state.searchQuery.toLowerCase().trim();
  const f = state.activeFilter;

  state.filtered = state.games.filter(g => {
    const matchFilter = f === 'All' || g.category === f;
    const matchSearch = !q ||
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      (g.platform && g.platform.toLowerCase().includes(q)) ||
      (g.region   && g.region.toLowerCase().includes(q)) ||
      (Array.isArray(g.genres) && g.genres.join(' ').toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  renderGrid();
}
/* exposed for inline onclick on empty state button */
window.resetFilters = function () {
  state.activePlatform = 'All';
  state.activeGenre    = 'All';
  state.searchQuery    = '';
  DOM.searchInput.value = '';
  DOM.searchClear.classList.remove('visible');
  DOM.filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'All'));
  document.querySelectorAll('#filters-genre .filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === 'All'));
  applyFilters();
};

/* ── Build genre filter pills from JSON data ── */
function buildGenreFilters(games) {
  if (!DOM.filtersGenre) return;
  const allGenres = new Set();
  games.forEach(g => (g.genres || []).forEach(genre => allGenres.add(genre)));
  if (allGenres.size === 0) { DOM.filtersGenre.style.display = 'none'; return; }

  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.dataset.filter = 'All';
  allBtn.dataset.filterType = 'genre';
  allBtn.textContent = 'All Genres';
  DOM.filtersGenre.appendChild(allBtn);

  [...allGenres].sort().forEach(genre => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = genre;
    btn.dataset.filterType = 'genre';
    btn.textContent = genre;
    DOM.filtersGenre.appendChild(btn);
  });

  DOM.filtersGenre.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    DOM.filtersGenre.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeGenre = btn.dataset.filter;
    applyFilters();
  });
}

/* ── Event: Filters ── */
function initFilters() {
  DOM.filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activePlatform = btn.dataset.filter;
      applyFilters();
    });
  });
}

/* ── Event: Search ── */
function initSearch() {
  let debounceTimer;

  DOM.searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = DOM.searchInput.value;
    DOM.searchClear.classList.toggle('visible', val.length > 0);
    debounceTimer = setTimeout(() => {
      state.searchQuery = val;
      applyFilters();
    }, 200);
  });

  DOM.searchClear.addEventListener('click', () => {
    DOM.searchInput.value = '';
    DOM.searchClear.classList.remove('visible');
    state.searchQuery = '';
    DOM.searchInput.focus();
    applyFilters();
  });

  DOM.searchClear.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') DOM.searchClear.click();
  });
}

/* ── Event: Hamburger ── */
function initHamburger() {
  DOM.hamburger.addEventListener('click', () => {
    const open = DOM.hamburger.classList.toggle('open');
    DOM.hamburger.setAttribute('aria-expanded', open);
    DOM.mobileNav.classList.toggle('open', open);
    DOM.mobileNav.setAttribute('aria-hidden', !open);
  });

  // Close on nav link click
  $$('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      DOM.hamburger.classList.remove('open');
      DOM.mobileNav.classList.remove('open');
      DOM.hamburger.setAttribute('aria-expanded', false);
      DOM.mobileNav.setAttribute('aria-hidden', true);
    });
  });
}

/* ── Escape HTML ── */
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

/* ── Modal ── */
function openModal(game) {
  state.modalGame = game;
  const o = DOM.modalOverlay;
  const discount = calcDiscount(game.originalPrice, game.price);
  const oos = !!game.isOutOfStock;
  const regionClass = game.highlightRegion ? 'tag tag-region tag-region-highlight' : 'tag tag-region';

  // Cover image
  $('modal-img').src = game.image;
  $('modal-img').alt = game.title + ' cover';

  // Pricing
  $('modal-pricing').innerHTML = `
    <span class="modal-price-current">${formatPrice(game.price)}</span>
    ${discount ? `<span class="modal-price-original">${formatPrice(game.originalPrice)}</span>
                  <span class="modal-price-save">SAVE ${discount}%</span>` : ''}
  `;

  // Buy button
  const buyBtn = $('modal-buy-btn');
  buyBtn.textContent = oos ? '⛔ Out of Stock'
    : (game.checkoutMethod === 'google_form' ? '📋 Order via Form' : '💬 DM to Buy');
  buyBtn.disabled = oos;
  buyBtn.onclick  = oos ? null : () => handleBuyNow(game);

  // Badges
  const badgeHtml = [
    game.dealBadge ? `<span class="card-badge ${badgeClass(game.dealBadge)}" style="position:static">${escHtml(game.dealBadge)}</span>` : '',
    oos ? `<span class="card-badge sale" style="position:static">OUT OF STOCK</span>` : '',
  ].join('');
  $('modal-badges').innerHTML = badgeHtml;

  // Title + desc
  $('modal-title').textContent = game.title;
  $('modal-desc').textContent  = game.description;

  // Tags
  $('modal-tags').innerHTML = `
    ${game.platform ? `<span class="tag tag-platform">${escHtml(game.platform)}</span>` : ''}
    ${game.region   ? `<span class="${regionClass}">🌍 ${escHtml(game.region)}</span>` : ''}
    ${game.stock === 'Low Stock' ? `<span class="tag tag-stock-low">⚡ Low Stock</span>` : ''}
  `;

  // Accordion sections
  const sections = [];
  if (game.genres?.length)  sections.push({ title: '🎭 Genres',     content: game.genres.map(g => `<span class="acc-pill">${escHtml(g)}</span>`).join('') });
  if (game.developer || game.publisher || game.releaseDate) {
    const rows = [
      game.developer   ? `<div class="acc-row"><strong>Developer</strong>${escHtml(game.developer)}</div>`   : '',
      game.publisher   ? `<div class="acc-row"><strong>Publisher</strong>${escHtml(game.publisher)}</div>`   : '',
      game.releaseDate ? `<div class="acc-row"><strong>Release</strong>${escHtml(game.releaseDate)}</div>`   : '',
    ].join('');
    sections.push({ title: '🏢 Developer Info', content: rows });
  }
  if (game.audioLanguages || game.textLanguages) {
    const rows = [
      game.audioLanguages ? `<div class="acc-row"><strong>Audio</strong>${escHtml(game.audioLanguages)}</div>` : '',
      game.textLanguages  ? `<div class="acc-row"><strong>Text</strong>${escHtml(game.textLanguages)}</div>`  : '',
    ].join('');
    sections.push({ title: '🌐 Languages', content: rows });
  }
  if (game.gameModes)   sections.push({ title: '👥 Game Modes',   content: game.gameModes.split(',').map(m => `<span class="acc-pill">${escHtml(m.trim())}</span>`).join('') });
  if (game.pcFeatures)  sections.push({ title: '🖥️ PC Features',  content: game.pcFeatures.split(',').map(f => `<span class="acc-pill">${escHtml(f.trim())}</span>`).join('') });
  if (game.workingRegions) sections.push({ title: '✅ Working Regions', content: `<div class="acc-row">${escHtml(game.workingRegions)}</div>` });

  const accordion = $('modal-accordion');
  accordion.innerHTML = sections.map((s, i) => `
    <div class="accordion-item${i === 0 ? ' open' : ''}">
      <button class="accordion-trigger" onclick="toggleAccordion(this)">
        ${s.title} <span class="acc-arrow">▶</span>
      </button>
      <div class="accordion-body">
        <div class="accordion-content">${s.content}</div>
      </div>
    </div>
  `).join('');

  // Show
  o.hidden = false;
  requestAnimationFrame(() => o.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const o = DOM.modalOverlay;
  o.classList.remove('open');
  document.body.style.overflow = '';
  o.addEventListener('transitionend', () => { o.hidden = true; }, { once: true });
}

function toggleAccordion(trigger) {
  trigger.closest('.accordion-item').classList.toggle('open');
}

/* ── Modal ── */
let sliderIndex = 0;

function openModal(game) {
  state.modalGame = game;
  const oos        = !!game.isOutOfStock;
  const discount   = calcDiscount(game.originalPrice, game.price);
  const regionClass = game.highlightRegion
    ? 'tag tag-region tag-region-highlight'
    : 'tag tag-region';

  // Build images array — support legacy single `image` field
  const images = Array.isArray(game.images) && game.images.length
    ? game.images
    : (game.image ? [game.image] : []);
  sliderIndex = 0;

  // ── Slider ──────────────────────────────────────────────
  const sliderHtml = images.length > 1
    ? `<div class="modal-slider">
         <img class="modal-slide-img" id="modal-slide-img" src="${escHtml(images[0])}" alt="${escHtml(game.title)}" />
         <div class="slider-controls">
           <button class="slider-btn" id="slider-prev" onclick="slideModal(-1)">‹</button>
           <span class="slider-counter" id="slider-counter">1 / ${images.length}</span>
           <button class="slider-btn" id="slider-next" onclick="slideModal(1)">›</button>
         </div>
         <div class="slider-dots" id="slider-dots">
           ${images.map((_, i) => `<button class="slider-dot${i === 0 ? ' active' : ''}" onclick="goSlide(${i})"></button>`).join('')}
         </div>
       </div>`
    : `<div class="modal-slider">
         <img class="modal-slide-img" src="${escHtml(images[0] || '')}" alt="${escHtml(game.title)}" />
       </div>`;

  // ── Pricing ─────────────────────────────────────────────
  const pricingHtml = `
    <span class="modal-price-current">${formatPrice(game.price)}</span>
    ${discount
      ? `<span class="modal-price-original">${formatPrice(game.originalPrice)}</span>
         <span class="modal-price-save">SAVE ${discount}%</span>`
      : ''}
  `;

  // ── Badges ──────────────────────────────────────────────
  const badgeHtml = [
    game.dealBadge ? `<span class="card-badge ${badgeClass(game.dealBadge)}" style="position:static">${escHtml(game.dealBadge)}</span>` : '',
    oos            ? `<span class="card-badge sale" style="position:static">OUT OF STOCK</span>` : '',
  ].join('');

  // ── Tags ────────────────────────────────────────────────
  const tagsHtml = [
    game.platform ? `<span class="tag tag-platform">${escHtml(game.platform)}</span>` : '',
    game.region   ? `<span class="${regionClass}">🌍 ${escHtml(game.region)}</span>` : '',
    game.stock === 'Low Stock' ? `<span class="tag tag-stock-low">⚡ Low Stock</span>` : '',
  ].join('');

  // ── Accordion sections ───────────────────────────────────
  const sections = [];
  if (game.genres?.length) {
    sections.push({
      title:   '🎭 Genres',
      content: game.genres.map(g => `<span class="acc-pill">${escHtml(g)}</span>`).join(''),
    });
  }
  if (game.developer || game.publisher || game.releaseDate) {
    sections.push({
      title: '🏢 Developer Info',
      content: [
        game.developer   ? `<div class="acc-row"><strong>Developer</strong>${escHtml(game.developer)}</div>`   : '',
        game.publisher   ? `<div class="acc-row"><strong>Publisher</strong>${escHtml(game.publisher)}</div>`   : '',
        game.releaseDate ? `<div class="acc-row"><strong>Release</strong>${escHtml(game.releaseDate)}</div>`   : '',
      ].join(''),
    });
  }
  if (game.audioLanguages || game.textLanguages) {
    sections.push({
      title: '🌐 Languages',
      content: [
        game.audioLanguages ? `<div class="acc-row"><strong>Audio</strong>${escHtml(game.audioLanguages)}</div>` : '',
        game.textLanguages  ? `<div class="acc-row"><strong>Text</strong>${escHtml(game.textLanguages)}</div>`  : '',
      ].join(''),
    });
  }
  if (game.gameModes) {
    sections.push({
      title:   '👥 Game Modes',
      content: game.gameModes.split(',').map(m => `<span class="acc-pill">${escHtml(m.trim())}</span>`).join(''),
    });
  }
  if (game.pcFeatures) {
    sections.push({
      title:   '🖥️ PC Features',
      content: game.pcFeatures.split(',').map(f => `<span class="acc-pill">${escHtml(f.trim())}</span>`).join(''),
    });
  }
  if (game.workingRegions) {
    sections.push({
      title:   '✅ Working Regions',
      content: `<div class="acc-row">${escHtml(game.workingRegions)}</div>`,
    });
  }

  const accordionHtml = sections.map((s, i) => `
    <div class="accordion-item${i === 0 ? ' open' : ''}">
      <button class="accordion-trigger" onclick="toggleAccordion(this)">
        ${s.title} <span class="acc-arrow">▶</span>
      </button>
      <div class="accordion-body">
        <div class="accordion-content">${s.content}</div>
      </div>
    </div>
  `).join('');

  // ── Inject HTML into modal shell ─────────────────────────
  const panel = document.getElementById('modal-panel');
  panel.innerHTML = `
    <button class="modal-close" id="modal-close-btn" aria-label="Close">✕</button>
    <div class="modal-inner">
      <div class="modal-img-col">
        ${sliderHtml}
        <div class="modal-pricing">${pricingHtml}</div>
        <button class="btn-buy modal-buy-btn" id="modal-buy-btn" ${oos ? 'disabled' : ''}>
          ${oos ? '⛔ Out of Stock' : (game.checkoutMethod === 'google_form' ? '📋 Order via Form' : '💬 DM to Buy')}
        </button>
      </div>
      <div class="modal-info-col">
        <div class="modal-badges">${badgeHtml}</div>
        <h2 class="modal-title">${escHtml(game.title)}</h2>
        <p class="modal-desc">${escHtml(game.description)}</p>
        <div class="modal-tags">${tagsHtml}</div>
        <div class="accordion">${accordionHtml}</div>
      </div>
    </div>
  `;

  // Wire close button and buy button after innerHTML is set
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  if (!oos) {
    document.getElementById('modal-buy-btn').addEventListener('click', () => handleBuyNow(game));
  }

  // Show overlay
  const overlay = DOM.modalOverlay;
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('open'));
  document.body.style.overflow = 'hidden';

  // Store images array for slider functions
  overlay._images = images;
}

function closeModal() {
  const overlay = DOM.modalOverlay;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  overlay.addEventListener('transitionend', () => { overlay.hidden = true; }, { once: true });
}

function slideModal(direction) {
  const images = DOM.modalOverlay._images;
  if (!images || images.length < 2) return;
  sliderIndex = (sliderIndex + direction + images.length) % images.length;
  _updateSlider(images);
}

function goSlide(index) {
  const images = DOM.modalOverlay._images;
  if (!images) return;
  sliderIndex = index;
  _updateSlider(images);
}

function _updateSlider(images) {
  const img     = document.getElementById('modal-slide-img');
  const counter = document.getElementById('slider-counter');
  const dots    = document.querySelectorAll('.slider-dot');
  if (img)     img.src = images[sliderIndex];
  if (counter) counter.textContent = `${sliderIndex + 1} / ${images.length}`;
  dots.forEach((d, i) => d.classList.toggle('active', i === sliderIndex));
}

function toggleAccordion(trigger) {
  trigger.closest('.accordion-item').classList.toggle('open');
}

/* ── Main: Fetch & Init ── */
async function init() {
  try {
    const res = await fetch('./games.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Announcement
    if (data.announcement) initAnnouncement(data.announcement);

    // IG links
    if (data.instagramHandle) setInstagramLinks(data.instagramHandle);

    // Store games
    state.games    = data.games || [];
    state.filtered = [...state.games];

    // Deal of the week
    const dotw = state.games.find(g => g.isDealOfTheWeek);
    renderDotw(dotw || null);

    // Grid
    DOM.gridLoading?.remove();
    renderGrid();

    // Build dynamic genre filters
    buildGenreFilters(state.games);

    // Events
    initFilters();
    initSearch();
    initHamburger();

    // Modal close events
    DOM.modalClose.addEventListener('click', closeModal);
    DOM.modalOverlay.addEventListener('click', (e) => {
      if (e.target === DOM.modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !DOM.modalOverlay.hidden) closeModal();
    });

  } catch (err) {
    console.error('WAGD: Failed to load games.json →', err);

    // Friendly error in grid
    if (DOM.gameGrid) {
      DOM.gameGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 24px;color:var(--text-muted);">
          <p style="font-size:32px;margin-bottom:12px;">⚠️</p>
          <p>Could not load catalog. Make sure <code>games.json</code> is in the same folder.</p>
          <p style="margin-top:8px;font-size:12px;color:var(--text-dim)">${err.message}</p>
        </div>
      `;
    }
    if (DOM.dotwCard) {
      DOM.dotwCard.innerHTML = '<p class="dotw-loading">Failed to load deal.</p>';
    }

    // Still init UI
    initFilters();
    initSearch();
    initHamburger();
  }
}

/* ── Kick off ── */
document.addEventListener('DOMContentLoaded', init);
