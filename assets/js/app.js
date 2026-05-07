/* ============================================================
   PUBG ACC MARKET — Shared App Utilities
   ============================================================ */

/* ── Theme ─────────────────────────────────────────────────── */
const Theme = {
  get() { return localStorage.getItem('theme') || 'dark'; },
  set(t) {
    localStorage.setItem('theme', t);
    document.documentElement.setAttribute('data-theme', t);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
  },
  toggle() { Theme.set(Theme.get() === 'dark' ? 'light' : 'dark'); },
  init() { Theme.set(Theme.get()); },
};

/* ── Toast Notifications ───────────────────────────────────── */
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(msg, type = 'info', duration = 4000) {
    this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-msg">${msg}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    this.container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 300);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); },
  warning(msg) { this.show(msg, 'warning'); },
};

/* ── Progress Bar ──────────────────────────────────────────── */
const Progress = {
  el: null,
  timeout: null,
  get() { return this.el || (this.el = document.getElementById('progress-bar')); },
  start() {
    const bar = this.get();
    if (!bar) return;
    bar.style.width = '30%';
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => { bar.style.width = '70%'; }, 200);
  },
  done() {
    const bar = this.get();
    if (!bar) return;
    clearTimeout(this.timeout);
    bar.style.width = '100%';
    setTimeout(() => { bar.style.width = '0%'; }, 400);
  },
  error() {
    const bar = this.get();
    if (!bar) return;
    bar.style.background = '#ef4444';
    this.done();
    setTimeout(() => {
      bar.style.background = 'linear-gradient(90deg, var(--primary), var(--primary-2), var(--accent))';
    }, 1000);
  },
};

/* ── Scroll to Top ─────────────────────────────────────────── */
function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── Animated Counters ─────────────────────────────────────── */
function animateCount(el, target, duration = 1200) {
  const start = performance.now();
  const isFloat = String(target).includes('.');
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = target * ease;
    el.textContent = isFloat ? val.toFixed(1) : Math.round(val).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCount(e.target, parseFloat(e.target.dataset.count));
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
}

/* ── Format Helpers ────────────────────────────────────────── */
const Fmt = {
  price(n) { return '₮' + Number(n).toLocaleString(); },
  date(s) {
    const d = new Date(s);
    return d.toLocaleDateString('mn-MN', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  timeAgo(s) {
    const diff = (Date.now() - new Date(s)) / 1000;
    if (diff < 60)   return 'Яг сая';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин өмнө';
    if (diff < 86400)return Math.floor(diff / 3600) + ' цаг өмнө';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' өдрийн өмнө';
    return Fmt.date(s);
  },
  initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },
  stars(rating) {
    const full  = Math.floor(rating);
    const empty = 5 - full;
    return '⭐'.repeat(full) + '☆'.repeat(empty);
  },
};

/* ── URL Params ────────────────────────────────────────────── */
const Params = {
  get(key) { return new URLSearchParams(location.search).get(key); },
  set(key, val) {
    const p = new URLSearchParams(location.search);
    val ? p.set(key, val) : p.delete(key);
    history.replaceState({}, '', '?' + p.toString());
  },
  all() { return Object.fromEntries(new URLSearchParams(location.search)); },
};

/* ── Local Wishlist (for non-logged-in users) ──────────────── */
const LocalWishlist = {
  key: 'acc_market_wishlist',
  get() { return JSON.parse(localStorage.getItem(this.key) || '[]'); },
  has(id) { return this.get().includes(id); },
  toggle(id) {
    const list = this.get();
    const idx = list.indexOf(id);
    if (idx > -1) list.splice(idx, 1); else list.push(id);
    localStorage.setItem(this.key, JSON.stringify(list));
    return idx === -1;
  },
};

/* ── Modal Control ─────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
});

/* ── Skeleton Cards ────────────────────────────────────────── */
function renderSkeletons(container, count = 8) {
  container.innerHTML = Array(count).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line w-40" style="margin-bottom:10px;height:10px;"></div>
        <div class="skeleton skeleton-line w-80"></div>
        <div class="skeleton skeleton-line w-60"></div>
        <div style="height:12px"></div>
        <div class="skeleton skeleton-line h-6 w-40"></div>
      </div>
    </div>
  `).join('');
}

/* ── Listing Card Renderer ─────────────────────────────────── */
function renderListingCard(l, wishlistIds = []) {
  const game = GAMES.find(g => g.value === l.game) || { label: l.game, icon: '🎮' };
  const img = l.images?.[0] || '';
  const isWished = wishlistIds.includes(l.id);
  const isHot = l.view_count > 50 || l.hot;
  const seller = l.profiles || {};
  const delay = Math.random() * 0.3;

  return `
    <div class="listing-card${isHot ? ' hot' : ''}" style="animation-delay:${delay.toFixed(2)}s" data-id="${l.id}">
      <div class="card-img-wrap">
        ${img
          ? `<img class="card-img" src="${img}" alt="${l.title}" loading="lazy">`
          : `<div class="card-img-placeholder">${game.icon}</div>`}
        <div class="card-badge-row">
          ${isHot ? '<span class="badge badge-hot">🔥 HOT</span>' : ''}
          ${l.status === 'sold' ? '<span class="badge badge-sold">ЗАРАГДСАН</span>' : ''}
        </div>
        <button class="card-wishlist${isWished ? ' active' : ''}"
          onclick="toggleWishlist(event,'${l.id}',this)"
          title="${isWished ? 'Хадгалалтаас хасах' : 'Хадгалах'}">
          ${isWished ? '❤️' : '🤍'}
        </button>
      </div>
      <div class="card-body">
        <div class="card-game-tag">${game.icon} ${game.label}</div>
        <div class="card-title">${l.title}</div>
        <div class="card-meta">
          ${l.level   ? `<span class="card-meta-item">🎖️ ${l.level} лев</span>` : ''}
          ${l.bind_type ? `<span class="card-meta-item">🔗 ${BIND_TYPES.find(b=>b.value===l.bind_type)?.label||l.bind_type}</span>` : ''}
          ${l.view_count ? `<span class="card-meta-item">👁 ${l.view_count}</span>` : ''}
        </div>
        <div class="card-footer">
          <span class="card-price">${Fmt.price(l.price)}</span>
          <div class="card-seller">
            <div class="card-seller-avatar">${Fmt.initials(seller.username)}</div>
            <span>${seller.username || 'Худалдагч'}${seller.verified ? ' ✓' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ── Toggle Wishlist ───────────────────────────────────────── */
async function toggleWishlist(e, listingId, btn) {
  e.preventDefault(); e.stopPropagation();
  const added = LocalWishlist.toggle(listingId);
  btn.classList.toggle('active', added);
  btn.textContent = added ? '❤️' : '🤍';
  Toast[added ? 'success' : 'info'](added ? 'Хадгаллаа' : 'Хадгалалтаас хасав');
}

/* ── Navbar Active Link ─────────────────────────────────────── */
function setActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link[href]').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    a.classList.toggle('active', href === path);
  });
}

/* ── Nav Search Redirect ────────────────────────────────────── */
function initNavSearch() {
  const input = document.getElementById('nav-search');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      location.href = `listings.html?q=${encodeURIComponent(input.value.trim())}`;
    }
  });
}

/* ── App Init ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  initScrollTop();
  initCounters();
  setActiveNav();
  initNavSearch();

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', () => Theme.toggle());
});
