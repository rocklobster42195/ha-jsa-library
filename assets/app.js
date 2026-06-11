const JSA_URL_KEY = 'jsa_base_url';
const ACTIVE_TAG_KEY = 'jsa_active_tag';

let scripts = [];
let activeTags = new Set(JSON.parse(localStorage.getItem(ACTIVE_TAG_KEY) || '[]'));
const gistMetaCache = new Map();

function parseGistRaw(rawUrl) {
  const m = rawUrl && rawUrl.match(/gist\.githubusercontent\.com\/([^/]+)\/([^/]+)\/raw/);
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
const banner = document.getElementById('setupBanner');
const jsaUrlInput = document.getElementById('jsaUrlInput');
const btnSaveUrl = document.getElementById('btnSaveUrl');

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

// Config modal
const configModal = document.getElementById('configModal');
const modalUrlInput = document.getElementById('modalUrlInput');
const btnConfig = document.getElementById('btnConfig');
const btnModalCancel = document.getElementById('btnModalCancel');
const btnModalSave = document.getElementById('btnModalSave');

btnConfig.addEventListener('click', () => {
  modalUrlInput.value = getJsaUrl();
  configModal.classList.remove('hidden');
  modalUrlInput.focus();
});
btnModalCancel.addEventListener('click', () => configModal.classList.add('hidden'));
btnModalSave.addEventListener('click', () => {
  saveJsaUrl(modalUrlInput.value);
  configModal.classList.add('hidden');
  updateBanner();
  renderGrid();
});
configModal.addEventListener('click', e => { if (e.target === configModal) configModal.classList.add('hidden'); });
modalUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnModalSave.click(); });

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

  // "All" button
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

  // Tag buttons (multi-select)
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

// Gist version fetching
async function loadGistMeta(script, card) {
  const { gist_id } = parseGistRaw(script.gist_raw);
  if (!gist_id) return;
  try {
    let data = gistMetaCache.get(gist_id);
    if (!data) {
      const res = await fetch(`https://api.github.com/gists/${gist_id}`);
      if (!res.ok) return;
      data = await res.json();
      gistMetaCache.set(gist_id, data);
    }
    if (!data.updated_at) return;
    const days = Math.floor((Date.now() - new Date(data.updated_at)) / 86400000);
    const label = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`;
    const el = card.querySelector('.card-updated');
    if (el) el.textContent = `Updated ${label}`;
  } catch {}
}

// Card rendering
function mdiClass(icon) {
  if (!icon) return 'mdi mdi-code-braces';
  return 'mdi mdi-' + icon.replace(/^mdi[:-]/, '');
}

function createCard(script) {
  const jsaUrl = getJsaUrl();
  const card = document.createElement('div');
  card.className = 'card';

  if (script.screenshot) {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = script.screenshot;
    img.alt = script.name;
    img.onerror = () => img.replaceWith(buildPlaceholder(script));
    card.appendChild(img);
  } else {
    card.appendChild(buildPlaceholder(script));
  }

  const body = document.createElement('div');
  body.className = 'card-body';
  body.innerHTML = `
    <div class="card-name">${escHtml(script.name)}</div>
    <div class="card-description">${escHtml(script.description)}</div>
    <div class="card-meta">
      <div class="card-tags">${(script.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>
      ${parseGistRaw(script.gist_raw).gist_id ? `<span class="card-updated">—</span>` : ''}
    </div>
  `;
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
    window.open(`${jsaUrl}/?import=${encodeURIComponent(script.gist_raw)}`, '_blank');
  });

  const gistLink = document.createElement('a');
  gistLink.className = 'btn-gist';
  gistLink.href = parseGistRaw(script.gist_raw).gist_url || script.gist_raw;
  gistLink.target = '_blank';
  gistLink.rel = 'noopener noreferrer';
  gistLink.title = 'View source on GitHub Gist';
  gistLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg> Source`;

  footer.appendChild(addBtn);
  footer.appendChild(gistLink);
  card.appendChild(footer);

  loadGistMeta(script, card);

  return card;
}

function buildPlaceholder(script) {
  const color = script.color || 'var(--accent)';
  const div = document.createElement('div');
  div.className = 'card-placeholder';
  div.innerHTML = `
    <div class="icon-wrap" style="background:${escHtml(color)}22; color:${escHtml(color)}">
      <i class="${mdiClass(script.icon)}" style="color:${escHtml(color)}"></i>
    </div>
    `;
  return div;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  const filtered = activeTags.size === 0
    ? scripts
    : scripts.filter(s => (s.tags || []).some(t => activeTags.has(t)));

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No scripts found.';
    grid.appendChild(empty);
    return;
  }
  filtered.forEach(s => grid.appendChild(createCard(s)));
}

async function init() {
  updateBanner();
  try {
    const res = await fetch('scripts.json');
    scripts = await res.json();
  } catch {
    scripts = [];
  }
  renderTags();
  renderGrid();
}

init();
