/* ============================================================
PSYC 200 – Intro Psychology I
script.js
============================================================ */

# /* ============================================================
Header & Title System — How It Works

HTML Structure
──────────────
• <header> — fixed bar that starts full-screen and shrinks on scroll
• .header-titles — flex column inside the header holding
<h1> (course name) and <h2> (course code)
• #header-toggle — circular button (▲/▼) in the top-right corner
to manually collapse the compact header

JavaScript (initShrinkingHeader)
─────────────────────────────────
Scroll-driven lerp: hero (100vh) → compact (64px) over SCROLL_RANGE px.
Font sizes, letter-spacing, gap, background opacity, blur, and border
colour are all interpolated on every scroll event.
============================================================ */

// ── Mode Toggle ──────────────────────────────────────────────

const modeToggle    = document.getElementById(‘mode-toggle’);
const body          = document.body;
const modeIndicator = document.getElementById(‘mode-indicator’);
const labelLearning = document.getElementById(‘label-learning’);
const labelTesting  = document.getElementById(‘label-testing’);

let isTestingMode    = false;
let answersChecked   = false;

function applyMode(isTesting) {
isTestingMode  = isTesting;
answersChecked = false;

// Reset check-answer button
const checkBtn = document.getElementById(‘check-answer-btn’);
if (checkBtn) {
checkBtn.classList.remove(‘checked’);
checkBtn.disabled = false;
}

if (isTesting) {
body.classList.remove(‘learning-mode’);
body.classList.add(‘testing-mode’);
modeIndicator.textContent = ‘Testing Mode’;
labelLearning.classList.remove(‘active’);
labelTesting.classList.add(‘active’);
} else {
body.classList.remove(‘testing-mode’);
body.classList.add(‘learning-mode’);
modeIndicator.textContent = ‘Learning Mode’;
labelLearning.classList.add(‘active’);
labelTesting.classList.remove(‘active’);
}

// Re-render topic content for the new mode
renderResearchMethodologyContent();

// Refresh header colours for the new mode
if (typeof window._updateHeader === ‘function’) window._updateHeader();
}

modeToggle.addEventListener(‘change’, () => {
applyMode(modeToggle.checked);
});

// ── Check Answer ─────────────────────────────────────────────

function checkAnswers() {
if (answersChecked) return;
answersChecked = true;

const checkBtn = document.getElementById(‘check-answer-btn’);
if (checkBtn) {
checkBtn.classList.add(‘checked’);
checkBtn.disabled = true;
}

// ── Grade topic table inputs (fill-in) ───────────────────────
document.querySelectorAll(’.topic-table-input’).forEach(input => {
const answer  = input.dataset.answer || ‘’;
const userVal = input.value.trim();
const cell    = input.closest(’.table-structure-cell, .image-label’);

```
input.disabled = true;

if (userVal === '') return;

if (userVal.toLowerCase() === answer.toLowerCase()) {
  if (cell) cell.classList.add('table-cell-correct');
} else {
  if (cell) cell.classList.add('table-cell-wrong');
  const reveal = cell ? cell.querySelector('.topic-table-reveal') : null;
  if (reveal) reveal.classList.add('visible');
}
```

});

// ── Grade cloze selects (testable text paragraphs) ──────────
document.querySelectorAll(’.cloze-select’).forEach(select => {
const answer  = select.dataset.answer || ‘’;
const userVal = select.value;
const item    = select.closest(’.cloze-item’);

```
select.disabled = true;

if (userVal === '') {
  const reveal = item ? item.querySelector('.cloze-reveal') : null;
  if (reveal) reveal.classList.add('visible');
  return;
}

if (userVal === answer) {
  select.classList.add('cloze-correct');
} else {
  select.classList.add('cloze-wrong');
  const reveal = item ? item.querySelector('.cloze-reveal') : null;
  if (reveal) reveal.classList.add('visible');
}
```

});
}

document.getElementById(‘check-answer-btn’).addEventListener(‘click’, checkAnswers);

// ── Topic Sections ───────────────────────────────────────────

const TOPICS = [
{ id: ‘research-methodology’, title: ‘Research Methodology’ },
];

function renderTopics() {
const container   = document.getElementById(‘topics-container’);
const placeholder = document.getElementById(‘topics-placeholder’);
if (!container) return;

if (TOPICS.length === 0) {
if (placeholder) placeholder.style.display = ‘block’;
return;
}

if (placeholder) placeholder.style.display = ‘none’;

TOPICS.forEach(topic => {
const existing = document.getElementById(topic.id);
if (existing) return;

```
const section = document.createElement('section');
section.classList.add('topic-section');
section.id = topic.id;

const heading = document.createElement('h3');
heading.textContent = topic.title;
section.appendChild(heading);

const p = document.createElement('p');
p.classList.add('placeholder-text');
p.textContent = 'Content coming soon.';
section.appendChild(p);

container.appendChild(section);
```

});
}

// ── Testable Text (Cloze) ────────────────────────────────────

function parseClozeText(text, testMode) {
const nodes = [];
const clozeRegex = /{Cloze:\s*Options:\s*(.*?):\s*Answer:\s*(.*?)}/g;
let lastIndex = 0;
let match;

while ((match = clozeRegex.exec(text)) !== null) {
if (match.index > lastIndex) {
nodes.push(document.createTextNode(text.slice(lastIndex, match.index)));
}

```
const optionsRaw = match[1];
const answer     = match[2].trim();
const options    = optionsRaw.split(',').map(o => o.trim()).filter(Boolean);

if (testMode) {
  const item = document.createElement('span');
  item.classList.add('cloze-item');

  const select = document.createElement('select');
  select.classList.add('cloze-select');
  select.dataset.answer = answer;

  const blankOpt = document.createElement('option');
  blankOpt.value       = '';
  blankOpt.textContent = '—';
  select.appendChild(blankOpt);

  options.forEach(opt => {
    const optEl       = document.createElement('option');
    optEl.value       = opt;
    optEl.textContent = opt;
    select.appendChild(optEl);
  });

  item.appendChild(select);

  const reveal = document.createElement('span');
  reveal.classList.add('cloze-reveal');
  reveal.textContent = answer;
  item.appendChild(reveal);

  nodes.push(item);
} else {
  const span       = document.createElement('span');
  span.classList.add('cloze-answer');
  span.textContent = answer;
  nodes.push(span);
}

lastIndex = match.index + match[0].length;
```

}

if (lastIndex < text.length) {
nodes.push(document.createTextNode(text.slice(lastIndex)));
}

return nodes;
}

function buildTestableTextParagraph(text, testMode) {
const p = document.createElement(‘p’);
p.classList.add(‘testable-text’);
parseClozeText(text, testMode).forEach(node => p.appendChild(node));
return p;
}

function shuffleArray(arr) {
const a = […arr];
for (let i = a.length - 1; i > 0; i–) {
const j = Math.floor(Math.random() * (i + 1));
[a[i], a[j]] = [a[j], a[i]];
}
return a;
}

function buildSubsectionHeading(text) {
const h4 = document.createElement(‘h4’);
h4.classList.add(‘subsection-heading’);
h4.textContent = text;
return h4;
}

// ── Research Methodology Content ─────────────────────────────
//
// Add content data arrays here as material is introduced.
// Currently empty — content will be added when prompted.

function renderResearchMethodologyContent() {
const section = document.getElementById(‘research-methodology’);
if (!section) return;

section.querySelectorAll(’.placeholder-text, .subsection’).forEach(el => el.remove());

// Restore placeholder since no content yet
const p = document.createElement(‘p’);
p.classList.add(‘placeholder-text’);
p.textContent = ‘Content coming soon.’;
section.appendChild(p);
}

// ── Shrinking Hero Header ────────────────────────────────────

(function initShrinkingHeader() {
const header    = document.getElementById(‘site-header’);
const titles    = header.querySelector(’.header-titles’);
const h1El      = header.querySelector(‘h1’);
const h2El      = header.querySelector(‘h2’);
const indicator = document.getElementById(‘mode-indicator’);
const toggle    = document.getElementById(‘header-toggle’);
const mainEl    = document.querySelector(‘main’);

const COMPACT_H    = 64;
const SCROLL_RANGE = 300;
const H1_MIN       = 20;
const H2_MIN       = 12;

const h1Max = parseFloat(getComputedStyle(h1El).fontSize);
const h2Max = parseFloat(getComputedStyle(h2El).fontSize);

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

let isHidden = false;

function update() {
if (isHidden) return;

```
const heroH    = window.innerHeight;
const progress = clamp(window.scrollY / SCROLL_RANGE, 0, 1);
const isCompact = progress >= 0.99;

const currentH = lerp(heroH, COMPACT_H, progress);
header.style.height = currentH + 'px';

mainEl.style.marginTop = (currentH + Math.min(window.scrollY, SCROLL_RANGE)) + 'px';

h1El.style.fontSize = lerp(h1Max, H1_MIN, progress) + 'px';
h2El.style.fontSize = lerp(h2Max, H2_MIN, progress) + 'px';

h1El.style.letterSpacing  = lerp(0.05, 0.01, progress) + 'em';
titles.style.gap           = lerp(12, 3, progress) + 'px';

const isTesting = document.body.classList.contains('testing-mode');
const bgR = isTesting ? 18  : 22;
const bgG = isTesting ? 18  : 27;
const bgB = isTesting ? 31  : 34;
const bgA = lerp(0.75, 0.97, progress);
header.style.backgroundColor = `rgba(${bgR},${bgG},${bgB},${bgA})`;
header.style.backdropFilter  = `blur(${lerp(0, 14, progress)}px)`;

const borderA = lerp(0, 1, progress);
header.style.borderBottomColor = isTesting
  ? `rgba(45,43,85,${borderA})`
  : `rgba(48,54,61,${borderA})`;

if (indicator) {
  indicator.style.opacity = String(clamp(lerp(1, 0, progress * 3), 0, 1));
}

toggle.style.display = isCompact ? 'flex' : 'none';
if (isCompact) toggle.textContent = '▲';
```

}

toggle.addEventListener(‘click’, () => {
isHidden = !isHidden;
if (isHidden) {
header.classList.add(‘header-hidden’);
mainEl.style.marginTop = (COMPACT_H + Math.min(window.scrollY, SCROLL_RANGE)) + ‘px’;
toggle.textContent = ‘▼’;
toggle.title = ‘Expand header’;
} else {
header.classList.remove(‘header-hidden’);
toggle.textContent = ‘▲’;
toggle.title = ‘Collapse header’;
update();
}
});

window.addEventListener(‘scroll’, () => {
if (isHidden && window.scrollY < 10) {
isHidden = false;
header.classList.remove(‘header-hidden’);
toggle.textContent = ‘▲’;
toggle.title = ‘Collapse header’;
}
update();
}, { passive: true });

window.addEventListener(‘resize’, update, { passive: true });

window._updateHeader = update;
update();
})();

// ── Initialise ───────────────────────────────────────────────
renderTopics();
applyMode(false);
