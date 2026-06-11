const JSA_URL_KEY = 'jsa_base_url';
const ACTIVE_TAG_KEY = 'jsa_active_tag';

let scripts = [];
let activeTag = localStorage.getItem(ACTIVE_TAG_KEY) || 'all';

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

function renderTags() {
  const container = document.getElementById('tagFilter');
  container.innerHTML = '';
  getAllTags().forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn' + (tag === activeTag ? ' active' : '');
    btn.textContent = tag === 'all' ? 'All' : tag;
    btn.addEventListener('click', () => {
      activeTag = tag;
      localStorage.setItem(ACTIVE_TAG_KEY, tag);
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid();
    });
    container.appendChild(btn);
  });
}

// Card rendering
function placeholderSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>`;
}

function createCard(script) {
  const jsaUrl = getJsaUrl();
  const card = document.createElement('div');
  card.className = 'card';

  // Image / placeholder
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

  // Body
  const body = document.createElement('div');
  body.className = 'card-body';
  body.innerHTML = `
    <div class="card-name">${escHtml(script.name)}</div>
    <div class="card-description">${escHtml(script.description)}</div>
    <div class="card-tags">${(script.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>
  `;
  card.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add' + (jsaUrl ? '' : ' no-url');
  addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to JSA`;
  addBtn.title = jsaUrl ? `Import into ${jsaUrl}` : 'Configure your JSA URL first';
  addBtn.addEventListener('click', () => {
    if (!jsaUrl) {
      configModal.classList.remove('hidden');
      modalUrlInput.focus();
      return;
    }
    window.open(`${jsaUrl}/?import=${encodeURIComponent(script.gist_raw)}`, '_blank');
  });

  const gistLink = document.createElement('a');
  gistLink.className = 'btn-gist';
  gistLink.href = script.gist_url;
  gistLink.target = '_blank';
  gistLink.rel = 'noopener noreferrer';
  gistLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg> Source`;

  footer.appendChild(addBtn);
  footer.appendChild(gistLink);
  card.appendChild(footer);

  return card;
}

function buildPlaceholder(script) {
  const div = document.createElement('div');
  div.className = 'card-placeholder';
  div.innerHTML = placeholderSvg() + `<span class="tag-label">${escHtml((script.tags || ['script'])[0])}</span>`;
  return div;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  const filtered = activeTag === 'all'
    ? scripts
    : scripts.filter(s => (s.tags || []).includes(activeTag));

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No scripts found.';
    grid.appendChild(empty);
    return;
  }
  filtered.forEach(s => grid.appendChild(createCard(s)));
}

// Init
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
