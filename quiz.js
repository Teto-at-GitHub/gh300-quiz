// GH-300 GitHub Copilot Certification Quiz — Engine
// Questions are loaded from questions.json via fetch in index.html

const KEYS = ['A', 'B', 'C', 'D', 'E'];
const EXAM_SIZE = 50;

let ALL_QUESTIONS = [];
let pool, current, selected, submitted, results;

// ── Bootstrap ──────────────────────────────────────────────────────────────

async function loadQuestions() {
  try {
    const res = await fetch('./questions.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ALL_QUESTIONS = await res.json();
    init();
  } catch (err) {
    document.getElementById('root').innerHTML = `
      <div style="padding:2rem;border:1px solid var(--danger-bg);border-radius:10px;background:var(--danger-bg);color:var(--danger)">
        <strong>Could not load questions.</strong><br>
        <span style="font-size:0.85rem;opacity:0.8">
          This quiz requires a local server — <code>fetch()</code> doesn't work over <code>file://</code>.<br><br>
          Run one of:<br>
          &nbsp;&nbsp;<code>python -m http.server 8080</code><br>
          &nbsp;&nbsp;<code>npx serve .</code><br>
          then open <a href="http://localhost:8080" style="color:var(--danger)">localhost:8080</a>
        </span>
      </div>`;
  }
}

// ── Core helpers ───────────────────────────────────────────────────────────

function sample(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function pct(n, d) {
  return d === 0 ? 0 : Math.round(n / d * 100);
}

function colorCls(p) {
  return p >= 80 ? 'pct-good' : p >= 60 ? 'pct-ok' : 'pct-bad';
}

// ── Quiz flow ──────────────────────────────────────────────────────────────

function init() {
  pool = sample(ALL_QUESTIONS, EXAM_SIZE);
  current = 0;
  selected = [];
  submitted = false;
  results = [];
  renderQ();
}

function renderQ() {
  const q = pool[current];
  submitted = false;
  selected = [];
  const prog = pct(current, EXAM_SIZE);

  document.getElementById('root').innerHTML = `
    <div class="progress-row">
      <span class="q-counter">${current + 1} / ${EXAM_SIZE}</span>
      <span class="category-pill">${q.cat}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style="width:${prog}%"></div>
    </div>
    <div class="question-card">
      <p class="question-text">${q.q}</p>
      ${q.multi ? '<div class="multi-note">✦ Select all that apply</div>' : ''}
    </div>
    <div class="options" id="opts"></div>
    <div class="action-row">
      <button class="btn btn-accent" id="sbtn" disabled onclick="submit()">Confirm</button>
      <button class="btn" id="nbtn" style="display:none" onclick="next()">
        ${current === EXAM_SIZE - 1 ? 'See results →' : 'Next →'}
      </button>
    </div>
    <div id="expbox"></div>
  `;

  const opts = document.getElementById('opts');
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.id = 'opt' + i;
    b.innerHTML = `<span class="opt-key">${KEYS[i]}</span><span>${o}</span>`;
    b.onclick = () => toggle(i, q.multi);
    opts.appendChild(b);
  });
}

function toggle(i, multi) {
  if (submitted) return;
  if (!multi) {
    selected = [i];
    document.querySelectorAll('.opt').forEach(b => b.classList.remove('selected'));
    document.getElementById('opt' + i).classList.add('selected');
  } else {
    if (selected.includes(i)) {
      selected = selected.filter(x => x !== i);
      document.getElementById('opt' + i).classList.remove('selected');
    } else {
      selected.push(i);
      document.getElementById('opt' + i).classList.add('selected');
    }
  }
  document.getElementById('sbtn').disabled = selected.length === 0;
}

function submit() {
  if (!selected.length) return;
  submitted = true;
  const q = pool[current];
  const isOk = q.correct.length === selected.length && q.correct.every(c => selected.includes(c));
  results.push({ q, selected: [...selected], isOk });

  q.opts.forEach((_, i) => {
    const b = document.getElementById('opt' + i);
    b.disabled = true;
    if (q.correct.includes(i) && selected.includes(i))       b.className = 'opt correct';
    else if (q.correct.includes(i) && !selected.includes(i)) b.className = 'opt missed';
    else if (!q.correct.includes(i) && selected.includes(i)) b.className = 'opt incorrect';
  });

  document.getElementById('expbox').innerHTML =
    `<div class="explanation"><strong>${isOk ? '✓ Correct' : '✗ Incorrect'}</strong> — ${q.exp}</div>`;
  document.getElementById('sbtn').style.display = 'none';
  document.getElementById('nbtn').style.display = '';
}

function next() {
  current++;
  if (current >= pool.length) { renderScore(); return; }
  renderQ();
}

// ── Score screen ───────────────────────────────────────────────────────────

function renderScore() {
  const total = results.length;
  const correct = results.filter(r => r.isOk).length;
  const p = pct(correct, total);

  const cats = [...new Set(ALL_QUESTIONS.map(q => q.cat))];
  const tiles = cats.map(c => {
    const cqs = results.filter(r => r.q.cat === c);
    if (!cqs.length) return '';
    const cp = pct(cqs.filter(r => r.isOk).length, cqs.length);
    return `
      <div class="cat-tile">
        <div class="cat-tile-name">${c}</div>
        <div class="cat-tile-pct ${colorCls(cp)}">${cp}%</div>
        <div class="cat-tile-sub">${cqs.filter(r => r.isOk).length}/${cqs.length}</div>
      </div>`;
  }).join('');

  const wrong = results.filter(r => !r.isOk);
  const review = wrong.map(r => {
    const cl = r.q.correct.map(i => KEYS[i]).join(', ');
    const yl = r.q.selected.map(i => KEYS[i]).join(', ') || '—';
    return `
      <div class="review-item">
        <p class="review-q-text">${r.q.q}</p>
        <p class="review-ans">Your answer: ${yl}</p>
        <p class="review-correct">Correct: ${cl}</p>
        <p class="review-exp">${r.q.exp}</p>
      </div>`;
  }).join('');

  document.getElementById('root').innerHTML = `
    <div class="score-screen">
      <div class="score-hero">
        <div class="score-num">${p}<span style="font-size:2rem;color:var(--text-hint)">%</span></div>
        <div class="score-denom">${correct} correct out of ${total}</div>
        <div class="pass-badge ${p >= 70 ? 'pass' : 'fail'}">${p >= 70 ? 'Pass ✓' : 'Below pass mark ✗'}</div>
      </div>
      <div class="breakdown-grid">${tiles}</div>
      <div class="score-actions">
        <button class="btn btn-accent" onclick="init()">New exam (resample) →</button>
      </div>
      ${wrong.length
        ? `<div class="review-header" style="margin-top:2rem">Questions to review (${wrong.length})</div>${review}`
        : '<p style="text-align:center;color:var(--success);margin-top:1.5rem;font-size:0.9rem">Perfect score — nothing to review!</p>'
      }
    </div>`;
}
