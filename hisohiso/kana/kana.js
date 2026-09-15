const state = { items: [], visible: [], selected: 0, filter: 'all' };
const small = new Set(['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ']);
const voiced = new Set([...'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ']);

function videoName(glyph) {
  const script = /^[ァ-ヿ]/u.test(glyph) ? 'k' : 'h';
  const codepoints = [...glyph].map((character) => character.codePointAt(0).toString(16)).join('-');
  return `${script}-${codepoints}.mp4`;
}

function category(glyph) {
  if (/^[ァ-ヿ]/u.test(glyph)) return 'katakana';
  if ([...glyph].length > 1) return 'contracted';
  if (small.has(glyph)) return 'small';
  if (voiced.has(glyph)) return 'voiced';
  return 'basic';
}

function selectItem(index, autoplay = false) {
  const item = state.visible[index];
  if (!item) return;
  state.selected = index;
  const video = document.querySelector('#kana-video');
  video.src = `/hisohiso/kana/videos/${item.video}`;
  video.setAttribute('aria-label', `${item.glyph} 쓰기 영상`);
  document.querySelector('#selected-glyph').textContent = item.glyph;
  document.querySelector('#script-label').textContent = item.category === 'katakana' ? '가타카나' : '히라가나';
  document.querySelector('#stroke-count').textContent = item.strokeCount;
  document.querySelector('#duration').textContent = `${item.duration.toFixed(1)}초`;
  document.querySelectorAll('.kana-key').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.glyph === item.glyph)));
  document.querySelector(`[data-glyph="${item.glyph}"]`)?.scrollIntoView({ block: 'nearest' });
  if (autoplay) video.play().catch(() => {});
}

function renderGrid() {
  state.visible = state.filter === 'all' ? state.items : state.items.filter((item) => item.category === state.filter);
  const grid = document.querySelector('#kana-grid');
  grid.replaceChildren(...state.visible.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'kana-key'; button.dataset.glyph = item.glyph;
    button.setAttribute('aria-label', `${item.glyph} 쓰기 보기`); button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<strong>${item.glyph}</strong><small>${item.strokeCount}획</small>`;
    button.addEventListener('click', () => selectItem(index, true));
    return button;
  }));
  const label = document.querySelector(`[data-filter="${state.filter}"]`).textContent.replace(/\s\d+$/, '');
  document.querySelector('#kana-count').textContent = `${label} ${state.visible.length}개`;
  selectItem(0);
}

async function init() {
  const response = await fetch('/hisohiso/kana/media.json');
  if (!response.ok) throw new Error('가나 목록을 불러오지 못했습니다.');
  const media = await response.json();
  state.items = Object.entries(media).map(([glyph, value]) => ({ glyph, video: videoName(glyph), category: category(glyph), duration: value.duration, strokeCount: value.strokeCount }));
  renderGrid();
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    renderGrid();
  }));
  document.querySelector('#prev-kana').addEventListener('click', () => selectItem((state.selected - 1 + state.visible.length) % state.visible.length, true));
  document.querySelector('#next-kana').addEventListener('click', () => selectItem((state.selected + 1) % state.visible.length, true));
  document.querySelector('#replay-kana').addEventListener('click', () => { const video = document.querySelector('#kana-video'); video.currentTime = 0; video.play().catch(() => {}); });
}

init().catch((error) => { document.querySelector('#kana-grid').innerHTML = `<p class="kana-error">${error.message}</p>`; });
