const JSA_URL_KEY  = 'jsa_base_url';
const ACTIVE_TAG_KEY = 'jsa_active_tag';
const JSA_SORT_KEY = 'jsa_sort';
const JSA_VIEW_KEY = 'jsa_view';

let scripts = [];
let activeTags = (() => { try { return new Set(JSON.parse(localStorage.getItem(ACTIVE_TAG_KEY) || '[]')); } catch { localStorage.removeItem(ACTIVE_TAG_KEY); return new Set(); } })();
let sortMode   = localStorage.getItem(JSA_SORT_KEY) || 'default';
let viewMode   = localStorage.getItem(JSA_VIEW_KEY) || 'grid';
let searchQuery = '';
const gistMetaCache = new Map();

function parseGistRaw(rawUrl) {
  if (!rawUrl) return {};
  const m = rawUrl.match(/gist\.githubusercontent\.com\/([^/]+)\/([^/]+)\/raw/) ||
            rawUrl.match(/gist\.github\.com\/([^/]+)\/([^/]+)/);
  if (!m) return {};
  return {
    gist_id: m[2],
    gist_url: `https://gist.github.com/${m[1]}/${m[2]}`
  };
}

function getJsaUrl() {
  return (localStorage.getItem(JSA_URL_KEY) || '').replace(/\/$/, '');
}

function saveJsaUrl(url) {
  url = url.trim().replace(/\/$/, '');
  if (url) localStorage.setItem(JSA_URL_KEY, url);
  else localStorage.removeItem(JSA_URL_KEY);
}

// Setup banner
const banner     = document.getElementById('setupBanner');
const jsaUrlInput = document.getElementById('jsaUrlInput');
const btnSaveUrl  = document.getElementById('btnSaveUrl');

function updateBanner() {
  if (getJsaUrl()) banner.classList.add('hidden');
  else banner.classList.remove('hidden');
}

btnSaveUrl.addEventListener('click', () => {
  saveJsaUrl(jsaUrlInput.value);
  updateBanner();
  renderGrid();
});
document.getElementById('btnBannerClose').addEventListener('click', () => banner.classList.add('hidden'));
jsaUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnSaveUrl.click(); });

// Config button → show banner
document.getElementById('btnConfig').addEventListener('click', () => {
  banner.classList.remove('hidden');
  jsaUrlInput.value = getJsaUrl();
  jsaUrlInput.focus();
});

// Search
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  renderGrid();
});

// Sort buttons
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    sortMode = btn.dataset.sort;
    localStorage.setItem(JSA_SORT_KEY, sortMode);
    updateSortUI();
    if (sortMode === 'newest') await loadAllGistMetas();
    renderGrid();
  });
});

function updateSortUI() {
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === sortMode));
}

// View toggle
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    viewMode = btn.dataset.view;
    localStorage.setItem(JSA_VIEW_KEY, viewMode);
    updateViewUI();
  });
});

function updateViewUI() {
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === viewMode));
  const grid = document.getElementById('grid');
  grid.classList.toggle('view-list', viewMode === 'list');
  grid.classList.toggle('view-grid', viewMode === 'grid');
}

// Tag filter
function getAllTags() {
  const set = new Set();
  scripts.forEach(s => (s.tags || []).forEach(t => set.add(t)));
  return ['all', ...Array.from(set).sort()];
}

function saveTags() {
  localStorage.setItem(ACTIVE_TAG_KEY, JSON.stringify([...activeTags]));
}

function renderTags() {
  const container = document.getElementById('tagFilter');
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'tag-btn' + (activeTags.size === 0 ? ' active' : '');
  allBtn.textContent = 'All';
  allBtn.addEventListener('click', () => {
    activeTags.clear();
    saveTags();
    renderTags();
    renderGrid();
  });
  container.appendChild(allBtn);

  getAllTags().slice(1).forEach(tag => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tag-btn' + (activeTags.has(tag) ? ' active' : '');
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      if (activeTags.has(tag)) activeTags.delete(tag);
      else activeTags.add(tag);
      saveTags();
      renderTags();
      renderGrid();
    });
    container.appendChild(btn);
  });
}

// Gist meta fetching
async function fetchGistMeta(gist_id) {
  if (gistMetaCache.has(gist_id)) return gistMetaCache.get(gist_id);
  try {
    const res = await fetch(`https://api.github.com/gists/${gist_id}`);
    if (!res.ok) return null;
    const data = await res.json();
    gistMetaCache.set(gist_id, data);
    return data;
  } catch { return null; }
}

async function loadAllGistMetas() {
  await Promise.allSettled(scripts.map(s => {
    const { gist_id } = parseGistRaw(s.gist_raw);
    if (!gist_id) return;
    return fetchGistMeta(gist_id);
  }));
}

async function loadGistMeta(script, card) {
  const { gist_id } = parseGistRaw(script.gist_raw);
  if (!gist_id) return;
  const data = await fetchGistMeta(gist_id);
  if (!data) return;

  const el = card.querySelector('.card-updated');
  if (el) {
    const parts = [];
    if (data.history) parts.push(`v${data.history.length}`);
    if (data.updated_at) {
      const days = Math.floor((Date.now() - new Date(data.updated_at)) / 86400000);
      const label = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`;
      parts.push(`Updated ${label}`);
    }
    if (parts.length) el.textContent = parts.join(' · ');
  }

  const badge = card.querySelector('.card-new-badge');
  if (badge && data.updated_at) {
    const isNew = (Date.now() - new Date(data.updated_at)) < 7 * 86400000;
    if (isNew) badge.classList.remove('hidden');
  }
}

// Card rendering
function mdiClass(icon) {
  if (!icon) return 'mdi mdi-code-braces';
  return 'mdi mdi-' + icon.replace(/^mdi[:-]/, '');
}

function buildPlaceholder(script) {
  const color = script.color || 'var(--accent)';
  const div = document.createElement('div');
  div.className = 'card-placeholder';
  div.innerHTML = `<div class="icon-wrap" style="background:${escHtml(color)}22"><i class="${mdiClass(script.icon)}" style="color:${escHtml(color)}"></i></div>`;
  return div;
}

function carouselArrow(dir) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `carousel-arrow carousel-arrow--${dir}`;
  btn.innerHTML = dir === 'prev'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="15 18 9 12 15 6"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="9 18 15 12 9 6"/></svg>`;
  return btn;
}

function buildImageSection(shots, script) {
  const wrap = document.createElement('div');
  wrap.className = 'card-image-wrap';

  if (shots.length === 0) {
    wrap.appendChild(buildPlaceholder(script));
  } else if (shots.length === 1) {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = shots[0];
    img.alt = script.name;
    img.onerror = () => img.replaceWith(buildPlaceholder(script));
    wrap.appendChild(img);
  } else {
    const track = document.createElement('div');
    track.className = 'carousel-track';
    shots.forEach((src, i) => {
      const img = document.createElement('img');
      img.className = 'card-image' + (i === 0 ? ' active' : '');
      img.src = src;
      img.alt = `${script.name} ${i + 1}`;
      img.loading = 'lazy';
      track.appendChild(img);
    });
    wrap.appendChild(track);

    let idx = 0;
    const imgs = () => track.querySelectorAll('.card-image');
    const dots = () => wrap.querySelectorAll('.carousel-dot');

    function go(delta) {
      idx = (idx + delta + shots.length) % shots.length;
      imgs().forEach((el, i) => el.classList.toggle('active', i === idx));
      dots().forEach((el, i) => el.classList.toggle('active', i === idx));
    }

    const prev = carouselArrow('prev');
    const next = carouselArrow('next');
    prev.addEventListener('click', e => { e.stopPropagation(); go(-1); });
    next.addEventListener('click', e => { e.stopPropagation(); go(1); });
    wrap.appendChild(prev);
    wrap.appendChild(next);

    const dotsEl = document.createElement('div');
    dotsEl.className = 'carousel-dots';
    shots.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', e => { e.stopPropagation(); go(i - idx); });
      dotsEl.appendChild(dot);
    });
    wrap.appendChild(dotsEl);

    let touchX = 0;
    wrap.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  if (script.pinned) {
    const pin = document.createElement('span');
    pin.className = 'card-pin-badge';
    pin.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg> Featured`;
    wrap.appendChild(pin);
  }

  const newBadge = document.createElement('span');
  newBadge.className = 'card-new-badge hidden';
  newBadge.textContent = 'New';
  wrap.appendChild(newBadge);

  return wrap;
}

const ICON_CLIPBOARD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`;
const ICON_CHECK     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>`;

function createCard(script) {
  const jsaUrl = getJsaUrl();
  const card = document.createElement('div');
  card.className = 'card' + (script.pinned ? ' card--pinned' : '');

  const shots = [].concat(script.screenshot).filter(Boolean);
  card.appendChild(buildImageSection(shots, script));

  const body = document.createElement('div');
  body.className = 'card-body';

  const nameEl = document.createElement('div');
  nameEl.className = 'card-name';
  nameEl.textContent = script.name;
  body.appendChild(nameEl);

  if (script.author) {
    const authorEl = document.createElement('div');
    authorEl.className = 'card-author';
    authorEl.innerHTML = `<img class="card-author-avatar" src="https://github.com/${escHtml(script.author)}.png?size=32" alt="" loading="lazy" /><a href="https://github.com/${escHtml(script.author)}" target="_blank" rel="noopener noreferrer">@${escHtml(script.author)}</a>`;
    body.appendChild(authorEl);
  }

  const descEl = document.createElement('div');
  descEl.className = 'card-description';
  descEl.textContent = script.description;
  body.appendChild(descEl);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.innerHTML = `
    <div class="card-tags">${(script.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>
    ${parseGistRaw(script.gist_raw).gist_id ? `<span class="card-updated"></span>` : ''}
  `;
  body.appendChild(meta);
  card.appendChild(body);

  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add';
  addBtn.disabled = !jsaUrl;
  addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to JSA`;
  addBtn.title = jsaUrl ? `Import into ${jsaUrl}` : 'Set your JSA URL first (top right)';
  addBtn.addEventListener('click', () => {
    window.open(`${jsaUrl}/#import=${encodeURIComponent(script.gist_raw)}`, '_blank');
  });

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn-copy';
  copyBtn.title = 'Copy import URL';
  copyBtn.innerHTML = ICON_CLIPBOARD;
  copyBtn.addEventListener('click', () => {
    const url = jsaUrl
      ? `${jsaUrl}/?import=${encodeURIComponent(script.gist_raw)}`
      : script.gist_raw;
    navigator.clipboard.writeText(url).then(() => {
      copyBtn.innerHTML = ICON_CHECK;
      setTimeout(() => { copyBtn.innerHTML = ICON_CLIPBOARD; }, 1500);
    });
  });

  const gistLink = document.createElement('a');
  gistLink.className = 'btn-gist';
  gistLink.href = parseGistRaw(script.gist_raw).gist_url || script.gist_raw;
  gistLink.target = '_blank';
  gistLink.rel = 'noopener noreferrer';
  gistLink.title = 'View source on GitHub Gist';
  gistLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg> Source`;

  footer.appendChild(addBtn);
  footer.appendChild(copyBtn);
  footer.appendChild(gistLink);
  card.appendChild(footer);

  loadGistMeta(script, card);

  return card;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function applySortToRest(arr) {
  if (sortMode === 'alpha') {
    return [...arr].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (sortMode === 'newest') {
    return [...arr].sort((a, b) => {
      const aData = gistMetaCache.get(parseGistRaw(a.gist_raw).gist_id);
      const bData = gistMetaCache.get(parseGistRaw(b.gist_raw).gist_id);
      const aDate = aData?.updated_at ? new Date(aData.updated_at) : new Date(0);
      const bDate = bData?.updated_at ? new Date(bData.updated_at) : new Date(0);
      return bDate - aDate;
    });
  }
  return arr;
}

function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  const query = searchQuery.toLowerCase();

  let filtered = scripts
    .filter(s => activeTags.size === 0 || [...activeTags].every(t => (s.tags || []).includes(t)))
    .filter(s => !query || s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query));

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No scripts found.';
    grid.appendChild(empty);
    return;
  }

  const pinned = filtered.filter(s => s.pinned);
  const rest   = applySortToRest(filtered.filter(s => !s.pinned));

  [...pinned, ...rest].forEach(s => grid.appendChild(createCard(s)));
}

async function init() {
  updateBanner();
  updateSortUI();
  updateViewUI();
  try {
    const res = await fetch('scripts.json');
    scripts = await res.json();
  } catch {
    scripts = [];
  }
  if (sortMode === 'newest') await loadAllGistMetas();
  renderTags();
  renderGrid();
}

init();
