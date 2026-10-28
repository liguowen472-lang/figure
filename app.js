(() => {
'use strict';
const $ = s => document.querySelector(s);
const CN = ['零','一','二','三','四','五','六','七','八','九','十','十一','十二'];
const ERAS = ['夏','商','周','秦','汉','魏','晋','隋','唐','宋','元','明','清'];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

let answers = new Array(QUESTIONS.length).fill(null); // 选中的选项序号
let idx = 0, locked = false, current = null, orders = []; // current = {code, pct}

/* ---------- 屏幕切换 ---------- */
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('is-active', s.id === id));
  document.body.classList.toggle('on-result', id === 's-result');
  window.scrollTo(0, 0);
}

/* ---------- 答题 ---------- */
function buildSlips() {
  $('#slips').innerHTML = QUESTIONS.map(() => '<li></li>').join('');
}
function renderQ() {
  const q = QUESTIONS[idx];
  const body = $('#quiz-body');
  body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
  $('#q-no').textContent = `第${CN[idx + 1]}问`;
  $('#q-text').textContent = q.t;
  $('#count').textContent = `${idx + 1}/${QUESTIONS.length}`;
  $('#btn-back').disabled = false;
  $('#btn-back').setAttribute('aria-label', idx === 0 ? '返回封面' : '上一问');
  $('#options').setAttribute('aria-label', q.t);
  $('#q-mark').textContent = CN[idx + 1];
  $('#options').innerHTML = orders[idx].map((i, pos) => {
    const o = q.o[i];
    return `<button class="opt${answers[idx] === i ? ' prev' : ''}" type="button" data-i="${i}" data-pos="${pos}"><b class="k">${'甲乙丙丁'[pos]}</b><span>${o[0]}</span></button>`;
  }).join('');
  [...$('#slips').children].forEach((li, i) => {
    li.classList.toggle('done', answers[i] !== null && i !== idx);
    li.classList.toggle('now', i === idx);
  });
  locked = false;
}
function choose(btn, ev) {
  if (locked) return; locked = true;
  const i = +btn.dataset.i;
  answers[idx] = i;
  const r = btn.getBoundingClientRect();
  const x = ev && ev.clientX ? ev.clientX - r.left : r.width / 2;
  const y = ev && ev.clientY ? ev.clientY - r.top : r.height / 2;
  const ink = document.createElement('i');
  ink.className = 'ink'; ink.style.left = x + 'px'; ink.style.top = y + 'px';
  btn.prepend(ink); btn.classList.add('sel');
  if (navigator.vibrate) navigator.vibrate(8);
  setTimeout(() => {
    if (idx < QUESTIONS.length - 1) { idx++; renderQ(); }
    else finish();
  }, reduce ? 120 : 420);
}

/* ---------- 计分 ---------- */
function score(ans) {
  const sums = [0, 0, 0, 0], last = [0, 0, 0, 0];
  ans.forEach((a, qi) => {
    const q = QUESTIONS[qi], v = q.o[a][1];
    sums[q.d] += v; last[q.d] = v;
  });
  let code = '';
  const pct = sums.map((s, d) => {
    const pos = s > 0 || (s === 0 && last[d] > 0);
    code += pos ? DIMS[d].a : DIMS[d].b;
    let p = Math.round(50 + s / 6 * 50);
    if (s === 0) p = pos ? 52 : 48;
    return p; // 偏向 a 的百分比
  });
  return { code, pct };
}

function finish() {
  show('s-loading');
  const el = $('#dynasty'); let k = 0;
  const t = setInterval(() => {
    el.textContent = ERAS[k++ % ERAS.length];
    el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip');
  }, 180);
  setTimeout(() => {
    clearInterval(t);
    const res = score(answers);
    store.set('hx_result', res);
    history.replaceState(null, '', location.pathname);
    renderResult(res, false);
  }, reduce ? 400 : 2400);
}

/* ---------- 结果 ---------- */
function clauses(q) { return q.split(/[，。！？]/).map(x => x.trim()).filter(Boolean); }
function sealHTML(code, extra = '') {
  const p = PEOPLE[code];
  return `<div class="seal ${extra}" style="--c:${p.color}"><i>${p.seal}</i></div>`;
}
function renderResult(res, shared) {
  current = res;
  const p = PEOPLE[res.code];
  document.documentElement.style.setProperty('--accent', p.color);
  document.title = `我是${p.name}｜测测你是哪位历史人物`;

  const mine = store.get('hx_result', null);
  const banner = $('#shared-banner');
  if (shared) {
    banner.hidden = false;
    banner.innerHTML = `<span>好友测出了「${p.name}」，你会是谁？</span><button type="button" id="btn-me">我也测测</button>`;
    $('#btn-me').onclick = start;
    $('#r-eyebrow').textContent = 'TA 的历史人格是';
    $('#btn-invite').hidden = true; $('#btn-retry').textContent = '我也测测';
  } else {
    banner.hidden = true;
    $('#r-eyebrow').textContent = '十二问已毕 · 你是';
    $('#btn-invite').hidden = false; $('#btn-retry').textContent = '重测';
  }

  $('#r-name').textContent = p.name;
  const seal = $('#r-seal'); seal.querySelector('i').textContent = p.seal;
  seal.classList.remove('go'); void seal.offsetWidth; seal.classList.add('go');
  $('#r-meta').textContent = `${p.era} · ${p.title}`;
  $('#r-code').innerHTML = res.code.split('').map((c, d) => `<span>${c === DIMS[d].a ? DIMS[d].na : DIMS[d].nb}</span>`).join('');
  $('#r-quote').innerHTML = clauses(p.quote).map(c => `<span class="v">${c}</span>`).join('') + `<cite>${p.src}</cite>`;
  $('#r-tagline').textContent = p.tag;
  $('#r-desc').textContent = p.desc;

  $('#r-dims').innerHTML = DIMS.map((d, i) => {
    const a = res.pct[i], isA = res.code[i] === d.a, w = Math.abs(a - 50);
    const left = isA ? 50 - w : 50;
    return `<div class="dim-row">
      <span class="l ${isA ? 'on' : ''}">${d.na}</span>
      <div class="bar" role="img" aria-label="${d.na} ${a}%，${d.nb} ${100 - a}%"><i style="left:${left}%;width:0" data-w="${Math.max(w, 2)}"></i><b style="left:${isA ? left : 50 + w}%">${isA ? a : 100 - a}%</b></div>
      <span class="r ${isA ? '' : 'on'}">${d.nb}</span>
      <p class="dim-note">${isA ? d.da : d.db}</p></div>`;
  }).join('');
  requestAnimationFrame(() => setTimeout(() =>
    document.querySelectorAll('.bar i').forEach(i => i.style.width = i.dataset.w + '%'), 60));

  $('#r-talents').innerHTML = p.talents.map(t => `<li>${t}</li>`).join('');
  $('#r-weak').textContent = p.weak;
  $('#r-job').textContent = p.job;
  $('#r-city').textContent = p.city;

  $('#r-bonds').innerHTML = [['最合拍', p.match], ['宿命羁绊', p.fate]].map(([lab, [c, why]]) => {
    const q = PEOPLE[c];
    return `<button class="bond" type="button" data-code="${c}" style="--c:${q.color}">${sealHTML(c)}<div><small>${lab}</small><strong>${q.name}</strong><em>${why}</em></div></button>`;
  }).join('');

  // 好友对比
  const rel = $('#r-relation');
  if (shared && mine && mine.code) {
    const m = PEOPLE[mine.code];
    const diff = [...mine.code].filter((c, i) => c !== res.code[i]).length;
    const same = [...mine.code].map((c, i) => c === res.code[i] ? (c === DIMS[i].a ? DIMS[i].na : DIMS[i].nb) : null).filter(Boolean);
    const words = ['灵魂同频，简直是同一个人', '心意相通，只差一步', '和而不同，刚好互补', '大相径庭，却最能互相学习', '天生的对照组，见面必有火花'][diff];
    rel.hidden = false;
    rel.innerHTML = `你是 <b>${m.name}</b>，TA 是 <b>${p.name}</b>。<br>你们在 ${4 - diff} 个维度上相同${same.length ? `（${same.join('、')}）` : ''}——${words}。`;
  } else rel.hidden = true;

  // 图鉴
  const seen = new Set(store.get('hx_seen', []));
  seen.add(res.code); store.set('hx_seen', [...seen]);
  renderGallery(mine && !shared ? mine.code : (mine ? mine.code : null));
  show('s-result');
}
function renderGallery(meCode) {
  const seen = new Set(store.get('hx_seen', []));
  $('#r-gallery').innerHTML = Object.entries(PEOPLE).map(([c, p]) =>
    `<button class="g-item ${seen.has(c) ? 'seen' : ''} ${c === meCode ? 'me' : ''}" type="button" data-code="${c}" style="--c:${p.color}" aria-label="${p.name}">
      <div class="seal"><i>${p.seal}</i></div><span>${p.name}</span></button>`).join('');
  $('#r-collect').textContent = `已阅 ${seen.size}/16`;
}

/* ---------- 弹层 ---------- */
let lastFocus = null;
function openSheet(html) {
  lastFocus = document.activeElement;
  $('#sheet-body').innerHTML = html;
  $('#sheet-mask').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#sheet-close').focus();
}
function closeSheet() {
  $('#sheet-mask').hidden = true;
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}
function personSheet(code) {
  const p = PEOPLE[code];
  const seen = new Set(store.get('hx_seen', [])); seen.add(code); store.set('hx_seen', [...seen]);
  const me = store.get('hx_result', null);
  if (document.body.classList.contains('on-result')) renderGallery(me && me.code);
  const tags = code.split('').map((c, d) => c === DIMS[d].a ? DIMS[d].na : DIMS[d].nb).join(' · ');
  openSheet(`<div style="--c:${p.color}">
    <p class="eyebrow">${p.era} · ${p.title}</p>
    <h3 id="sheet-title">${p.name}</h3>
    <p class="s-meta">${tags}</p>
    <p class="s-tag">${p.tag}</p>
    <p>${p.desc}</p>
    <p class="s-quote">${p.quote}<br><small>—— ${p.src}</small></p>
    <p class="s-code">若生于今世：${p.job} · 宜居 ${p.city}</p></div>`);
}

/* ---------- 分享卡 ---------- */
const mImg = new Image(); mImg.src = 'assets/mountains.jpg';
function wrap(ctx, text, x, y, maxW, lh) {
  let line = '', lines = [];
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch;
  }
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + lines.length * lh;
}
function drawCard() {
  const res = current, p = PEOPLE[res.code];
  const cv = $('#card-canvas'), ctx = cv.getContext('2d'), W = 1080, H = 1600;
  const F = getComputedStyle(document.body).fontFamily;
  ctx.fillStyle = '#F3EDE2'; ctx.fillRect(0, 0, W, H);
  // 纸纹
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(90,75,55,${Math.random() * .05})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  // 山
  if (mImg.complete && mImg.naturalWidth) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .85;
    const h = 480, w = mImg.naturalWidth * h / mImg.naturalHeight;
    ctx.drawImage(mImg, W - w, H - h, w, h); ctx.restore();
    const g = ctx.createLinearGradient(0, H - 480, 0, H - 280);
    g.addColorStop(0, '#F3EDE2'); g.addColorStop(1, 'rgba(243,237,226,0)');
    ctx.fillStyle = g; ctx.fillRect(0, H - 481, W, 200);
  }
  // 边框
  ctx.strokeStyle = 'rgba(31,29,26,.25)'; ctx.lineWidth = 2; ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5F594F'; ctx.font = `30px ${F}`;
  ctx.fillText('我 的 历 史 人 格', 110, 170);
  // 名字
  ctx.fillStyle = p.color; ctx.font = `800 ${p.name.length > 2 ? 190 : 220}px ${F}`;
  ctx.fillText(p.name, 100, 400);
  const nw = ctx.measureText(p.name).width;
  // 印章
  const sx = Math.min(100 + nw + 30, W - 230), sy = 260, s = 130;
  ctx.save(); ctx.translate(sx + s / 2, sy + s / 2); ctx.rotate(-.14);
  ctx.fillStyle = '#B23A2E'; ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = 'rgba(247,237,228,.9)'; ctx.lineWidth = 4; ctx.strokeRect(-s / 2 + 9, -s / 2 + 9, s - 18, s - 18);
  ctx.fillStyle = '#F7EDE4'; ctx.font = `700 78px ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(p.seal, 0, 4); ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5F594F'; ctx.font = `36px ${F}`;
  ctx.fillText(`${p.era} · ${p.title}`, 108, 480);
  // 标语
  ctx.fillStyle = '#1F1D1A'; ctx.font = `700 56px ${F}`;
  let y = wrap(ctx, `「${p.tag}」`, 96, 600, W - 96 - 100 - clauses(p.quote).length * 60, 76);
  // 描述
  const cols0 = clauses(p.quote).length;
  ctx.fillStyle = '#3A3630'; ctx.font = `34px ${F}`;
  y = wrap(ctx, p.desc, 110, y + 30, W - 110 - 120 - cols0 * 60, 58);
  // 竖排诗句
  ctx.fillStyle = p.color; ctx.font = `40px ${F}`;
  const cols = clauses(p.quote); let qx = W - 130, maxY = 0;
  cols.forEach(c => { let qy = 590; for (const ch of c) { ctx.fillText(ch, qx, qy); qy += 50; } maxY = Math.max(maxY, qy); qx -= 60; });
  ctx.fillRect(W - 82, 560, 2, maxY - 590);
  // 维度
  y = Math.max(y + 40, 1060);
  ctx.font = `30px ${F}`;
  DIMS.forEach((d, i) => {
    const isA = res.code[i] === d.a, a = res.pct[i], yy = y + i * 62;
    ctx.fillStyle = isA ? '#1F1D1A' : '#8A8378'; ctx.fillText(d.na, 110, yy);
    ctx.fillStyle = isA ? '#8A8378' : '#1F1D1A'; ctx.fillText(d.nb, 760, yy);
    ctx.fillStyle = '#E2D9C8'; ctx.fillRect(210, yy - 14, 520, 8);
    const w = Math.abs(a - 50) / 50 * 260; ctx.fillStyle = p.color;
    ctx.fillRect(isA ? 470 - w : 470, yy - 14, Math.max(w, 6), 8);
    ctx.fillStyle = '#1F1D1A'; ctx.fillRect(469, yy - 22, 2, 24);
  });
  // 页脚
  ctx.fillStyle = '#1F1D1A'; ctx.font = `700 36px ${F}`;
  ctx.fillText('测测你是哪位历史人物', 110, H - 150);
  ctx.fillStyle = '#5F594F'; ctx.font = `26px ${F}`;
  ctx.fillText(location.host ? location.host + location.pathname.replace(/index\.html$/, '') : '十二问 · 十六位人物', 110, H - 105);
  return cv.toDataURL('image/png');
}
function shareCard() {
  const url = drawCard();
  const p = PEOPLE[current.code];
  openSheet(`<p class="eyebrow" id="sheet-title">分享卡</p>
    <img class="card-img" src="${url}" alt="${p.name} 结果卡">
    <p class="center">手机端：长按图片保存到相册</p>
    <div class="row"><a class="btn btn-primary" href="${url}" download="我是${p.name}.png" style="display:inline-grid;place-items:center;text-decoration:none">下载图片</a></div>`);
}
async function invite() {
  const p = PEOPLE[current.code];
  const url = `${location.origin}${location.pathname}?r=${current.code}&p=${current.pct.join('-')}`;
  const text = `我测出来是「${p.name}」——${p.tag}。你会是哪位历史人物？`;
  if (navigator.share) { try { await navigator.share({ title: '测测你是哪位历史人物', text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast('链接已复制，发给好友吧'); }
  catch { prompt('复制下面的链接发给好友', url); }
}
let tt;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2000); }

/* ---------- 入口 ---------- */
function start() {
  answers = new Array(QUESTIONS.length).fill(null); idx = 0;
  orders = QUESTIONS.map(q => { const a = q.o.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; });
  document.documentElement.style.removeProperty('--accent');
  history.replaceState(null, '', location.pathname);
  show('s-quiz'); renderQ();
}
function galleryFromCover() {
  const me = store.get('hx_result', null), seen = new Set(store.get('hx_seen', []));
  openSheet(`<p class="eyebrow" id="sheet-title">人物图鉴 · 已阅 ${seen.size}/16</p><div class="gallery" style="margin-top:16px">${
    Object.entries(PEOPLE).map(([c, p]) => `<button class="g-item ${seen.has(c) ? 'seen' : ''} ${me && me.code === c ? 'me' : ''}" type="button" data-code="${c}" style="--c:${p.color}"><div class="seal"><i>${p.seal}</i></div><span>${p.name}</span></button>`).join('')
  }</div>${me ? `<div class="row" style="margin-top:24px"><button class="btn btn-ghost" type="button" id="btn-mine">查看我的结果</button></div>` : ''}`);
  const b = $('#btn-mine'); if (b) b.onclick = () => { closeSheet(); renderResult(me, false); };
}

buildSlips();
$('#btn-start').onclick = start;
$('#btn-back').onclick = () => { if (idx === 0) show('s-cover'); else { idx--; renderQ(); } };
$('#options').addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) choose(b, e); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#sheet-mask').hidden) return closeSheet();
  if ($('#s-quiz').classList.contains('is-active') && /^[1-4]$/.test(e.key)) {
    const b = $(`#options .opt[data-pos="${+e.key - 1}"]`); if (b) choose(b);
  }
});
document.addEventListener('click', e => {
  const t = e.target.closest('.bond, .g-item'); if (t) personSheet(t.dataset.code);
});
$('#sheet-close').onclick = closeSheet;
$('#sheet-mask').addEventListener('click', e => { if (e.target.id === 'sheet-mask') closeSheet(); });
$('#btn-card').onclick = shareCard;
$('#btn-invite').onclick = invite;
$('#btn-retry').onclick = start;
$('#btn-gallery-cover').onclick = galleryFromCover;

// 分享链接 ?r=CODE&p=60-40-...
const qs = new URLSearchParams(location.search), rc = qs.get('r');
if (rc && PEOPLE[rc]) {
  let pct = (qs.get('p') || '').split('-').map(Number);
  if (pct.length !== 4 || pct.some(isNaN)) pct = rc.split('').map((c, d) => c === DIMS[d].a ? 75 : 25);
  renderResult({ code: rc, pct }, true);
}
})();
