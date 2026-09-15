const state = { media: {}, script: 'hiragana', selectedGlyph: 'あ' };

const sections = [
  { id: 'basic', title: '기본 가나', rows: [
    ['あ','い','う','え','お'], ['か','き','く','け','こ'], ['さ','し','す','せ','そ'],
    ['た','ち','つ','て','と'], ['な','に','ぬ','ね','の'], ['は','ひ','ふ','へ','ほ'],
    ['ま','み','む','め','も'], ['や','ゆ','よ'], ['ら','り','る','れ','ろ'], ['わ','を'], ['ん'],
  ]},
  { id: 'voiced', title: '탁음', rows: [
    ['が','ぎ','ぐ','げ','ご'], ['ざ','じ','ず','ぜ','ぞ'], ['だ','ぢ','づ','で','ど'], ['ば','び','ぶ','べ','ぼ'],
  ]},
  { id: 'semi-voiced', title: '반탁음', rows: [['ぱ','ぴ','ぷ','ぺ','ぽ']] },
  { id: 'contracted', title: '요음', rows: [
    ['きゃ','きゅ','きょ'], ['ぎゃ','ぎゅ','ぎょ'], ['しゃ','しゅ','しょ'], ['じゃ','じゅ','じょ'],
    ['ちゃ','ちゅ','ちょ'], ['にゃ','にゅ','にょ'], ['ひゃ','ひゅ','ひょ'], ['びゃ','びゅ','びょ'],
    ['ぴゃ','ぴゅ','ぴょ'], ['みゃ','みゅ','みょ'], ['りゃ','りゅ','りょ'],
  ]},
  { id: 'sokuon', title: '촉음', rows: [['っ']] },
  { id: 'small', title: '작은 글자', rows: [['ぁ','ぃ','ぅ','ぇ','ぉ']] },
];

function toKatakana(glyph) {
  return String.fromCodePoint(...[...glyph].map((character) => character.codePointAt(0) + 0x60));
}

function shownGlyph(hiragana) { return state.script === 'hiragana' ? hiragana : toKatakana(hiragana); }
function videoName(glyph) {
  const prefix = state.script === 'hiragana' ? 'h' : 'k';
  return `${prefix}-${[...glyph].map((character) => character.codePointAt(0).toString(16)).join('-')}.mp4`;
}
function playable(glyph) { return Boolean(state.media[glyph]); }
function playableGlyphs() {
  return sections.flatMap((section) => section.rows.flat()).map(shownGlyph).filter(playable);
}

function selectGlyph(glyph, autoplay = false) {
  const item = state.media[glyph];
  if (!item) return;
  state.selectedGlyph = glyph;
  const video = document.querySelector('#kana-video');
  video.src = `/hisohiso/kana/videos/${videoName(glyph)}`;
  video.setAttribute('aria-label', `${glyph} 쓰기 영상`);
  document.querySelector('#selected-glyph').textContent = glyph;
  document.querySelector('#script-label').textContent = state.script === 'hiragana' ? '히라가나' : '가타카나';
  document.querySelector('#stroke-count').textContent = item.strokeCount;
  document.querySelector('#duration').textContent = `${item.duration.toFixed(1)}초`;
  document.querySelectorAll('.kana-key').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.glyph === glyph)));
  if (autoplay) video.play().catch(() => {});
}

function createKey(glyph) {
  const button = document.createElement('button');
  const item = state.media[glyph];
  button.type = 'button'; button.className = 'kana-key'; button.dataset.glyph = glyph;
  button.disabled = !item; button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', item ? `${glyph} 쓰기 보기` : `${glyph} 영상 준비 중`);
  button.innerHTML = `<strong>${glyph}</strong><small>${item ? `${item.strokeCount}획` : '준비 중'}</small>`;
  if (item) button.addEventListener('click', () => selectGlyph(glyph, true));
  return button;
}

function renderSections() {
  const container = document.querySelector('#kana-sections');
  container.replaceChildren(...sections.map((section) => {
    const article = document.createElement('article'); article.className = 'kana-section'; article.dataset.section = section.id;
    const heading = document.createElement('header'); heading.innerHTML = `<h2>${section.title}</h2>`;
    const available = section.rows.flat().map(shownGlyph).filter(playable).length;
    heading.innerHTML += `<p>${available}개 영상</p>`; article.append(heading);
    section.rows.forEach((row) => {
      const rowElement = document.createElement('div'); rowElement.className = `kana-row kana-row--${row.length}`;
      row.map(shownGlyph).forEach((glyph) => rowElement.append(createKey(glyph)));
      article.append(rowElement);
    });
    return article;
  }));
  const playableCount = playableGlyphs().length;
  document.querySelector('#kana-count').textContent = `${state.script === 'hiragana' ? '히라가나' : '가타카나'} ${playableCount}개 영상`;
  const first = playableGlyphs()[0];
  if (first) selectGlyph(first);
}

function changeScript(script) {
  state.script = script;
  document.querySelectorAll('[data-script]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.script === script)));
  renderSections();
}

async function init() {
  const response = await fetch('/hisohiso/kana/media.json');
  if (!response.ok) throw new Error('가나 목록을 불러오지 못했습니다.');
  state.media = await response.json(); renderSections();
  document.querySelectorAll('[data-script]').forEach((button) => button.addEventListener('click', () => changeScript(button.dataset.script)));
  document.querySelector('#prev-kana').addEventListener('click', () => { const items = playableGlyphs(); const index = items.indexOf(state.selectedGlyph); selectGlyph(items[(index - 1 + items.length) % items.length], true); });
  document.querySelector('#next-kana').addEventListener('click', () => { const items = playableGlyphs(); const index = items.indexOf(state.selectedGlyph); selectGlyph(items[(index + 1) % items.length], true); });
  document.querySelector('#replay-kana').addEventListener('click', () => { const video = document.querySelector('#kana-video'); video.currentTime = 0; video.play().catch(() => {}); });
}

init().catch((error) => { document.querySelector('#kana-sections').innerHTML = `<p class="kana-error">${error.message}</p>`; });
