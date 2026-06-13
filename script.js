// ===================================
// script.js — ไพ่บอกใจ Logic
// ===================================

// ===== State =====
let currentMode     = null;   // 'fortune' | 'choose'
let currentQuestion = '';
let shuffledDeck    = [];
let selectedCards   = [];     // ไพ่ที่เลือก (โหมดเลือกเอง)
let pickedIndices   = [];     // index ใน shuffledDeck ที่ผู้ใช้เลือก

// ตำแหน่งไพ่ 3 ใบ
const POSITIONS = [
  { label: 'ต้นเหตุ', desc: 'พลังงานอดีต / ที่มาของสถานการณ์' },
  { label: 'ปัจจุบัน', desc: 'สิ่งที่กำลังเกิดขึ้นตอนนี้' },
  { label: 'แนวโน้ม', desc: 'ทิศทางที่จะเป็น / คำแนะนำ' }
];

// ===== Init =====
window.addEventListener('DOMContentLoaded', () => {
  generateStars();
  setupCharCount();
});

// ===== Generate background stars =====
function generateStars() {
  const bg = document.getElementById('starsBg');
  const count = window.innerWidth < 480 ? 60 : 100;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.classList.add('star');
    const size = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      --dur: ${(Math.random() * 4 + 2).toFixed(1)}s;
      --delay: ${(Math.random() * 3).toFixed(1)}s;
    `;
    bg.appendChild(s);
  }
}

// ===== Character count =====
function setupCharCount() {
  const input = document.getElementById('questionInput');
  const counter = document.getElementById('charCount');
  input.addEventListener('input', () => {
    counter.textContent = `${input.value.length} / 200`;
  });
}

// ===== Screen Navigation =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Step 1: Select Mode =====
function selectMode(mode) {
  const q = document.getElementById('questionInput').value.trim();
  if (!q) {
    showToast('✦ กรุณาพิมพ์คำถามก่อนนะคะ');
    document.getElementById('questionInput').focus();
    return;
  }
  currentMode     = mode;
  currentQuestion = q;
  selectedCards   = [];
  pickedIndices   = [];

  // แสดงหน้าสับไพ่
  document.getElementById('shuffleQuestion').textContent = `"${q}"`;
  document.getElementById('shuffleHint').textContent = 'กดปุ่มด้านล่างเพื่อสับไพ่ค่ะ';
  document.getElementById('btnShuffle').disabled = false;
  document.getElementById('btnShuffle').textContent = '🔀 สับไพ่';

  // Reset shuffle animation
  const sc = document.getElementById('shuffleCards');
  sc.classList.remove('shuffling');

  showScreen('screenShuffle');
}

// ===== Step 2: Shuffle =====
function doShuffle() {
  const btn = document.getElementById('btnShuffle');
  const sc  = document.getElementById('shuffleCards');
  const hint = document.getElementById('shuffleHint');

  // Guard: ต้องโหลด cards.js ก่อนเสมอ
  if (typeof TAROT_CARDS === 'undefined' || !Array.isArray(TAROT_CARDS) || TAROT_CARDS.length < 3) {
    showToast('✦ ไม่พบข้อมูลไพ่ กรุณาตรวจสอบไฟล์ cards.js');
    return;
  }

  btn.disabled = true;
  btn.textContent = '✨ กำลังสับไพ่...';
  sc.classList.add('shuffling');
  hint.textContent = 'กำลังเรียกพลังงานจากจักรวาล...';

  // สับไพ่จริง
  shuffledDeck = shuffleDeck(TAROT_CARDS);

  setTimeout(() => {
    sc.classList.remove('shuffling');
    hint.textContent = 'ไพ่พร้อมแล้วค่ะ ✨';

    if (currentMode === 'fortune') {
      // โหมดแม่หมอ: สุ่ม 3 ใบบนสุด
      selectedCards = shuffledDeck.slice(0, 3);
      setTimeout(() => showResultScreen(), 600);
    } else {
      // โหมดเลือกเอง: ไปหน้าเลือกไพ่
      setTimeout(() => showPickScreen(), 600);
    }
  }, 2200);
}

// ===== Step 3a (Fortune): Go directly to result =====
// (handled inside doShuffle)

// ===== Step 3b (Choose): Show pick screen =====
function showPickScreen() {
  document.getElementById('pickQuestion').textContent = `"${currentQuestion}"`;

  // Bug fix #2: ซ่อนปุ่มเปิดคำทำนายทุกครั้งที่รีเซ็ตหน้า
  const btnReveal = document.getElementById('btnReveal');
  btnReveal.classList.add('hidden');

  updatePickHint();
  resetDots();
  buildCardFan();
  showScreen('screenPick');
}

function updatePickHint() {
  const hint = document.getElementById('pickHint');
  if (pickedIndices.length >= 3) {
    // แทนที่ข้อความทั้งหมด — ไม่ต้องพึ่ง span#pickCount อีกต่อไป
    hint.textContent = 'คุณเลือกครบ 3 ใบแล้ว ✨ กดปุ่มด้านล่างเพื่อเปิดไพ่';
  } else {
    // rebuild ข้อความพร้อม span ทุกครั้ง เพื่อป้องกัน span หาย
    const n = pickedIndices.length + 1;
    hint.innerHTML = `สัมผัสไพ่ที่ดึงดูดใจคุณ — เลือกใบที่ <span id="pickCount">${n}</span> จาก 3`;
  }
}

function resetDots() {
  ['dot1','dot2','dot3'].forEach(id => {
    document.getElementById(id).className = 'dot';
  });
}

function updateDots() {
  const ids = ['dot1','dot2','dot3'];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (i < pickedIndices.length - 1) {
      el.className = 'dot done';
    } else if (i === pickedIndices.length - 1) {
      el.className = 'dot active';
    } else {
      el.className = 'dot';
    }
  });
}

// สร้างไพ่คว่ำให้เลือก — แสดงไพ่ทั้งสำรับ 78 ใบ (ใช้จาก shuffledDeck)
function buildCardFan() {
  const fan = document.getElementById('cardFan');
  fan.innerHTML = '';

  // แสดงไพ่ทั้งหมดใน shuffledDeck (สูงสุด 22 ใบสำหรับ UX ที่ดี)
  const displayCount = Math.min(shuffledDeck.length, 78);

  for (let i = 0; i < displayCount; i++) {
    const card = document.createElement('div');
    card.classList.add('fan-card');
    card.dataset.index = i;
    card.setAttribute('aria-label', `ไพ่ใบที่ ${i + 1}`);
    card.addEventListener('click', () => pickCard(i, card));
    fan.appendChild(card);
  }
}

function pickCard(idx, el) {
  if (pickedIndices.includes(idx) || pickedIndices.length >= 3) return;

  pickedIndices.push(idx);
  el.classList.add('selected');

  updateDots();
  updatePickHint();

  if (pickedIndices.length >= 3) {
    // รวบไพ่ที่เลือก
    selectedCards = pickedIndices.map(i => shuffledDeck[i]);

    // Disable ไพ่ที่เหลือ
    document.querySelectorAll('.fan-card:not(.selected)').forEach(c => c.classList.add('disabled'));

    // แสดงปุ่มเปิดคำทำนาย
    const btnReveal = document.getElementById('btnReveal');
    btnReveal.classList.remove('hidden');
    btnReveal.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ===== Step 4: Show Result =====
function goToResult() {
  if (selectedCards.length < 3) {
    showToast('✦ กรุณาเลือกไพ่ให้ครบ 3 ใบก่อนนะคะ');
    return;
  }
  showResultScreen();
}

function showResultScreen() {
  if (selectedCards.length < 3) {
    showToast('✦ ยังไม่มีไพ่ครบ 3 ใบ กรุณาสับหรือเลือกไพ่ใหม่อีกครั้ง');
    return;
  }

  document.getElementById('resultQuestion').textContent = `"${currentQuestion}"`;
  buildResultCards();
  showScreen('screenResult');
}

function buildResultCards() {
  const container = document.getElementById('cardsResult');
  container.innerHTML = '';

  // Bug fix #3: ลบ detailPanels เดิมก่อนสร้างใหม่เสมอ
  const oldPanels = document.getElementById('detailPanels');
  if (oldPanels) oldPanels.remove();

  // แสดงไพ่ 3 ใบ
  selectedCards.forEach((card, i) => {
    const pos = POSITIONS[i];

    // Card wrapper
    const col = document.createElement('div');
    col.classList.add('result-card');
    const imgHtml = card.image
      ? `<img class="tarot-card-img" src="${card.image}" alt="${card.name_en}" loading="lazy">`
      : `<div class="card-element">${card.element}</div><div class="card-number-label">${card.number}</div><div class="card-en-name">${card.name_en}</div>`;

    col.innerHTML = `
      <div class="card-position-label">${pos.label}</div>
      <div class="card-face has-image" onclick="toggleDetail(${i})" title="แตะเพื่อดูความหมายเพิ่มเติม">
        ${imgHtml}
      </div>
      <div class="card-th-name">${card.name_th.split(' / ')[0]}</div>
      <div class="card-meaning-short">${card.meaning_general}</div>
    `;
    container.appendChild(col);
  });

  // Tap hint
  const hint = document.createElement('p');
  hint.className = 'tap-hint';
  hint.style.gridColumn = '1 / -1';
  hint.textContent = '✦ แตะที่การ์ดเพื่อดูความหมายเพิ่มเติม ✦';
  container.appendChild(hint);

  // Detail panels (แสดงหลังกด) — วางนอก grid
  const detailWrap = document.createElement('div');
  detailWrap.id = 'detailPanels';
  detailWrap.style.cssText = 'width:100%; display:flex; flex-direction:column; gap:12px;';
  container.after(detailWrap);

  selectedCards.forEach((card, i) => {
    const pos = POSITIONS[i];
    const panel = document.createElement('div');
    panel.classList.add('card-detail');
    panel.id = `detail-${i}`;
    panel.innerHTML = `
      <div class="card-detail-title">✦ ${pos.label}: ${card.name_th}</div>
      <p>${card.meaning_general}</p>
      <p><strong>ความรัก:</strong> ${card.meaning_love}</p>
      <p><strong>การงาน:</strong> ${card.meaning_work}</p>
      <p><strong>การเงิน:</strong> ${card.meaning_money}</p>
      <p><strong>คำแนะนำ:</strong> ${card.meaning_advice}</p>
    `;
    detailWrap.appendChild(panel);
  });
}

// Toggle detail panel เมื่อกดการ์ด
function toggleDetail(idx) {
  const panel = document.getElementById(`detail-${idx}`);
  if (!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ===== Actions =====

// สุ่มใหม่ในโหมดเดิม
function reshuffleMode() {
  selectedCards  = [];
  pickedIndices  = [];

  // ล้าง detail panels เดิม
  const dp = document.getElementById('detailPanels');
  if (dp) dp.remove();

  // reset shuffle screen
  const sc = document.getElementById('shuffleCards');
  sc.classList.remove('shuffling');
  document.getElementById('shuffleHint').textContent = 'กดปุ่มด้านล่างเพื่อสับไพ่ค่ะ';
  document.getElementById('btnShuffle').disabled = false;
  document.getElementById('btnShuffle').textContent = '🔀 สับไพ่';
  document.getElementById('shuffleQuestion').textContent = `"${currentQuestion}"`;

  showScreen('screenShuffle');
}

// เปลี่ยนโหมด (กลับหน้าแรก แต่คงคำถามเดิม)
function switchMode() {
  selectedCards  = [];
  pickedIndices  = [];
  const dp = document.getElementById('detailPanels');
  if (dp) dp.remove();
  showScreen('screenHome');
}

// กลับหน้าแรกและล้างทุกอย่าง
function goHome() {
  currentMode     = null;
  currentQuestion = '';
  selectedCards   = [];
  pickedIndices   = [];
  shuffledDeck    = [];
  document.getElementById('questionInput').value = '';
  document.getElementById('charCount').textContent = '0 / 200';
  const dp = document.getElementById('detailPanels');
  if (dp) dp.remove();
  showScreen('screenHome');
}

// คัดลอกผลคำทำนาย
function copyResult() {
  if (!selectedCards.length) return;

  let text = `✦ ไพ่บอกใจ — คำทำนายของคุณ ✦\n\n`;
  text += `คำถาม: ${currentQuestion}\n\n`;

  selectedCards.forEach((card, i) => {
    const pos = POSITIONS[i];
    text += `${pos.label}: ${card.name_th} (${card.name_en})\n`;
    text += `${card.meaning_general}\n`;
    text += `คำแนะนำ: ${card.meaning_advice}\n\n`;
  });

  text += `—\nคำทำนายนี้เป็นแนวทางเพื่อความบันเทิงและการทบทวนตัวเองเท่านั้น`;

  navigator.clipboard.writeText(text)
    .then(() => showToast('✦ คัดลอกผลคำทำนายแล้วค่ะ'))
    .catch(() => {
      // Fallback สำหรับ browser ที่ไม่รองรับ
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✦ คัดลอกผลคำทำนายแล้วค่ะ');
    });
}

// ===== Toast =====
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
