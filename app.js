/* ============================================================
   WAGD — What A Good Deal! | app.js
   Handles: JSON fetch, rendering, filters, search, checkout
   ============================================================ */

'use strict';

/* ── State ── */
const state = {
  games:          [],
  filtered:       [],
  activeFilter:   'All',
  searchQuery:    '',
  instagramHandle: 'myusername',
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
    const handle = state.instagramHandle || 'myusername';
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

  // Attach modal click to card
  DOM.dotwCard.addEventListener('click', () => Modal.open(game));

  // Ensure button doesn't trigger modal
  DOM.dotwCard.querySelector('.btn-buy').addEventListener('click', (e) => {
    e.stopPropagation();
    handleBuyNow(game);
  });
}

/* ── Render: Tags ── */
function renderTags(game) {
  const stockTag = game.stock === 'Low Stock' || game.stock === 'Low'
    ? `<span class="tag tag-stock-low">⚡ Low Stock</span>`
    : '';
  
  // Assign pulsing cyan class if highlightRegion is checked
  const regionClasses = game.highlightRegion ? 'tag tag-region tag-region-highlight' : 'tag tag-region';

  return `
    <div class="card-tags">
      ${game.platform ? `<span class="tag tag-platform">${escHtml(game.platform)}</span>` : ''}
      ${game.region   ? `<span class="${regionClasses}">🌍 ${escHtml(game.region)}</span>` : ''}
      ${stockTag}
    </div>
  `;
}

/* ── Render: Game Card ── */
function renderCard(game) {
  const discount = calcDiscount(game.originalPrice, game.price);
  const badge = game.dealBadge;
  const bClass = badgeClass(badge);

  const card = document.createElement('article');
  card.className = 'game-card';
  card.setAttribute('aria-label', game.title);
  card.style.animationDelay = `${Math.random() * 0.15}s`;

  card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${game.image}" alt="${escHtml(game.title)} game cover" loading="lazy" />
      ${badge ? `<span class="card-badge ${bClass}">${escHtml(badge)}</span>` : ''}
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
      <button class="btn-buy" data-id="${game.id}" aria-label="Buy ${escHtml(game.title)}">
        ${game.checkoutMethod === 'google_form' ? '📋 Order Now' : '💬 Buy via DM'}
      </button>
    </div>
  `;

  // Attach modal trigger
  card.addEventListener('click', () => Modal.open(game));

  card.querySelector('.btn-buy').addEventListener('click', (e) => {
    e.stopPropagation();
    handleBuyNow(game);
  });

  return card;
}

/* ── Render: Grid ── */
function renderGrid() {
  // Clear
  DOM.gameGrid.innerHTML = '';
  DOM.emptyState.hidden = true;

  const games = state.filtered;

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
      (g.region && g.region.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  renderGrid();
}

/* exposed for inline onclick on empty state button */
window.resetFilters = function () {
  state.activeFilter = 'All';
  state.searchQuery = '';
  DOM.searchInput.value = '';
  DOM.searchClear.classList.remove('visible');
  DOM.filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'All'));
  applyFilters();
};

/* ── Event: Filters ── */
function initFilters() {
  DOM.filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.dataset.filter;
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

/* ── Modal Component ── */
const Modal = {
  el: null,
  body: null,
  backdrop: null,
  closeBtn: null,
  currentIdx: 0,
  images: [],
  activeGame: null,

  init() {
    this.el = $('game-modal');
    this.body = $('modal-body');
    this.backdrop = $('modal-backdrop');
    this.closeBtn = $('modal-close');

    if (!this.el) return;

    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !this.el.hidden) this.close();
    });
  },

  open(game) {
    this.activeGame = game;
    // Build image array, default to single legacy image if array doesn't exist
    this.images = (game.images && game.images.length > 0) ? game.images : [game.image];
    this.currentIdx = 0;
    
    this.render(game);
    
    this.el.hidden = false;
    this.el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.el.hidden = true;
    this.el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  },

  render(game) {
    const hasMultiple = this.images.length > 1;
    const badgeClassStr = badgeClass(game.dealBadge);
    const badgeHTML = game.dealBadge ? `<span class="card-badge ${badgeClassStr}">${escHtml(game.dealBadge)}</span>` : '';
    const discount = calcDiscount(game.originalPrice, game.price);

    this.body.innerHTML = `
      <div class="modal-gallery">
        <img id="modal-img" src="${this.images[this.currentIdx]}" alt="${escHtml(game.title)}" />
        ${badgeHTML}
        ${hasMultiple ? `
          <button class="modal-nav prev" onclick="Modal.prev(event)">◀</button>
          <button class="modal-nav next" onclick="Modal.next(event)">▶</button>
          <div class="modal-dots" id="modal-dots">
            ${this.images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" onclick="Modal.goTo(${i}, event)"></span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="modal-info">
        <h2>${escHtml(game.title)}</h2>
        ${renderTags(game)}
        <p class="modal-desc">${escHtml(game.description)}</p>
        
        <div class="modal-details">
          ${game.developer ? `<div><strong>Developer:</strong> ${escHtml(game.developer)}</div>` : ''}
          ${game.publisher ? `<div><strong>Publisher:</strong> ${escHtml(game.publisher)}</div>` : ''}
          ${game.releaseDate ? `<div><strong>Release:</strong> ${escHtml(game.releaseDate)}</div>` : ''}
          ${(game.genres && game.genres.length) ? `<div><strong>Genres:</strong> ${escHtml(game.genres.join(', '))}</div>` : ''}
          ${game.gameModes ? `<div><strong>Modes:</strong> ${escHtml(game.gameModes)}</div>` : ''}
          ${game.audioLanguages ? `<div><strong>Audio:</strong> ${escHtml(game.audioLanguages)}</div>` : ''}
          ${game.textLanguages ? `<div><strong>Text:</strong> ${escHtml(game.textLanguages)}</div>` : ''}
          ${game.pcFeatures ? `<div><strong>Features:</strong> ${escHtml(game.pcFeatures)}</div>` : ''}
          ${game.workingRegions ? `<div><strong>Works in:</strong> ${escHtml(game.workingRegions)}</div>` : ''}
        </div>

        <div class="modal-footer">
          <div class="card-pricing">
            <span class="price-current">${formatPrice(game.price)}</span>
            ${discount ? `
              <span class="price-original">${formatPrice(game.originalPrice)}</span>
              <span class="price-discount">-${discount}%</span>
            ` : ''}
          </div>
          <button class="btn-buy" id="modal-buy-btn">
            ${game.checkoutMethod === 'google_form' ? '📋 Order Now' : '💬 Buy via DM'}
          </button>
        </div>
      </div>
    `;

    // Attach buy listener safely via JS to avoid inline string escaping nightmares
    this.body.querySelector('#modal-buy-btn').addEventListener('click', () => {
      handleBuyNow(this.activeGame);
    });
  },

  updateImage() {
    $('modal-img').src = this.images[this.currentIdx];
    if (this.images.length > 1) {
      $$('#modal-dots .dot').forEach((d, i) => d.classList.toggle('active', i === this.currentIdx));
    }
  },

  next(e) {
    if (e) e.stopPropagation();
    this.currentIdx = (this.currentIdx + 1) % this.images.length;
    this.updateImage();
  },

  prev(e) {
    if (e) e.stopPropagation();
    this.currentIdx = (this.currentIdx - 1 + this.images.length) % this.images.length;
    this.updateImage();
  },

  goTo(idx, e) {
    if (e) e.stopPropagation();
    this.currentIdx = idx;
    this.updateImage();
  }
};

/* ── Main: Fetch & Init ── */
async function init() {
  // Init modal right away
  Modal.init();

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

    // Events
    initFilters();
    initSearch();
    initHamburger();

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