// ===================================
// script.js — ไพ่บอกใจ Logic + AI-like Reading
// ===================================

// ===== State =====
let currentMode     = null;   // 'fortune' | 'choose'
let currentQuestion = '';
let currentTopic    = 'general';
let shuffledDeck    = [];
let selectedCards   = [];     // ไพ่ที่เลือก (โหมดเลือกเอง)
let pickedIndices   = [];     // index ใน shuffledDeck ที่ผู้ใช้เลือก

// ตำแหน่งไพ่ 3 ใบ
const POSITIONS = [
  { label: 'ต้นเหตุ', desc: 'พลังงานอดีต / ที่มาของสถานการณ์' },
  { label: 'ปัจจุบัน', desc: 'สิ่งที่กำลังเกิดขึ้นตอนนี้' },
  { label: 'แนวโน้ม', desc: 'ทิศทางที่จะเป็น / คำแนะนำ' }
];

const TOPIC_LABELS = {
  love: 'ความรัก / ความสัมพันธ์',
  work: 'การงาน / การเรียน',
  money: 'การเงิน / ทรัพย์สิน',
  general: 'ภาพรวมชีวิต'
};

// ===== Gemini AI Backend =====
// Backend บน Vercel ที่เก็บ GEMINI_API_KEY ไว้อย่างปลอดภัย
const GEMINI_BACKEND_URL = 'https://dooduan-gemini-backend.vercel.app';
let currentGeminiReading = '';

// ===== Init =====
window.addEventListener('DOMContentLoaded', () => {
  generateStars();
  setupCharCount();
});

// ===== Generate background stars =====
function generateStars() {
  const bg = document.getElementById('starsBg');
  if (!bg || bg.dataset.ready === '1') return;
  bg.dataset.ready = '1';
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
  if (!input || !counter) return;
  input.addEventListener('input', () => {
    counter.textContent = `${input.value.length} / 200`;
  });
}

// ===== AI-like topic detection =====
function detectTopic(question) {
  const q = (question || '').toLowerCase();

  const loveWords = ['รัก','แฟน','คนคุย','คุย','เขา','เธอ','คิดถึง','ชอบ','เลิก','คืนดี','กลับมา','ความสัมพันธ์','แต่งงาน','แอบชอบ','หึง','งอน'];
  const workWords = ['งาน','การงาน','เรียน','สอบ','สมัคร','โปรเจกต์','บริษัท','หัวหน้า','เพื่อนร่วมงาน','ลาออก','ย้ายงาน','ธุรกิจ','ร้าน','ยอดขาย','ลูกค้า'];
  const moneyWords = ['เงิน','การเงิน','หนี้','รายได้','ลงทุน','ซื้อ','ขาย','ผ่อน','เก็บเงิน','ค่าใช้จ่าย','กำไร','ขาดทุน','เครดิต','ยืม','จ่าย'];

  const score = words => words.reduce((n, w) => n + (q.includes(w) ? 1 : 0), 0);
  const scores = {
    love: score(loveWords),
    work: score(workWords),
    money: score(moneyWords)
  };

  if (scores.love >= scores.work && scores.love >= scores.money && scores.love > 0) return 'love';
  if (scores.work >= scores.love && scores.work >= scores.money && scores.work > 0) return 'work';
  if (scores.money > 0) return 'money';
  return 'general';
}

function getCardMeaning(card, topic) {
  const keyMap = {
    love: 'meaning_love',
    work: 'meaning_work',
    money: 'meaning_money',
    general: 'meaning_general'
  };
  return card[keyMap[topic]] || card.meaning_general || '';
}

function suitEnergy(card) {
  const arcana = card.arcana || '';
  const name = (card.name_en || '').toLowerCase();
  if (arcana === 'major') return 'ไพ่ Major Arcana ใบนี้มักสะท้อนจุดเปลี่ยนสำคัญ บทเรียนใหญ่ หรือแรงผลักที่มีผลกับสถานการณ์มากกว่ารายละเอียดเล็ก ๆ';
  if (name.includes('cups')) return 'พลังของถ้วยเน้นอารมณ์ ความรู้สึก ความผูกพัน และสิ่งที่อยู่ในใจ';
  if (name.includes('swords')) return 'พลังของดาบเน้นความคิด การตัดสินใจ ความกังวล การสื่อสาร และความจริงที่ต้องมองให้ชัด';
  if (name.includes('wands')) return 'พลังของไม้เท้าเน้นแรงผลักดัน ความพยายาม เป้าหมาย งาน และการลงมือทำ';
  if (name.includes('pentacles')) return 'พลังของเหรียญเน้นความมั่นคง เงิน งาน ผลลัพธ์ที่จับต้องได้ และความอดทนระยะยาว';
  return 'ไพ่ใบนี้สะท้อนพลังงานเฉพาะของสถานการณ์ที่ควรค่อย ๆ พิจารณา';
}

function positionBridge(i, card, topic) {
  const meaning = getCardMeaning(card, topic);
  if (i === 0) {
    return `ในตำแหน่งต้นเหตุ ไพ่ใบนี้บอกว่าคำถามนี้มีรากมาจาก “${meaning}” สิ่งนี้อาจเป็นเหตุผลลึก ๆ ที่ทำให้คุณยังรู้สึกติดใจหรืออยากหาคำตอบอยู่ในตอนนี้`;
  }
  if (i === 1) {
    return `ในตำแหน่งปัจจุบัน ไพ่สะท้อนว่าพลังหลักของสถานการณ์ตอนนี้คือ “${meaning}” แปลว่าช่วงนี้ควรมองสิ่งที่เกิดขึ้นตรงหน้าให้ชัด อย่าเพิ่งรีบสรุปจากความรู้สึกเพียงอย่างเดียว`;
  }
  return `ในตำแหน่งแนวโน้ม ไพ่ชี้ว่าเรื่องนี้มีทิศทางไปสู่ “${meaning}” ผลลัพธ์ยังขึ้นอยู่กับการเลือกและการกระทำของคุณ แต่ไพ่ใบนี้ช่วยบอกจุดที่ควรระวังและสิ่งที่ควรปรับ`;
}

function topicIntro(topic, question) {
  const cleanQ = question.replace(/"/g, '').trim();
  const map = {
    love: `จากคำถาม “${cleanQ}” ไพ่ชุดนี้สะท้อนพลังด้านความรัก ความรู้สึก และความสัมพันธ์เป็นหลัก คำตอบอาจไม่ได้ฟันธงว่าใครคิดอย่างไร 100% แต่จะช่วยให้เห็นทิศทางของใจและสิ่งที่ควรระวัง`,
    work: `จากคำถาม “${cleanQ}” ไพ่ชุดนี้สะท้อนพลังด้านการงาน การเรียน เป้าหมาย และการตัดสินใจ ไพ่จะช่วยชี้ว่าควรวางแผนหรือระวังจุดไหนเป็นพิเศษ`,
    money: `จากคำถาม “${cleanQ}” ไพ่ชุดนี้สะท้อนพลังด้านการเงิน ความมั่นคง ค่าใช้จ่าย และการตัดสินใจเกี่ยวกับทรัพย์สิน ควรใช้คำทำนายนี้เป็นแนวทางประกอบการคิด ไม่ใช่คำตอบแทนการวางแผนจริง`,
    general: `จากคำถาม “${cleanQ}” ไพ่ชุดนี้สะท้อนภาพรวมของสถานการณ์และพลังรอบตัวคุณในช่วงนี้ คำตอบจะช่วยให้เห็นต้นเหตุ สิ่งที่กำลังเกิดขึ้น และแนวโน้มต่อไป`
  };
  return map[topic] || map.general;
}

function synthesizeAdvice(cards, topic) {
  const names = cards.map(c => c.name_th.split(' / ')[0]).join(' + ');
  const topicLine = {
    love: 'เรื่องความรักควรใช้ทั้งหัวใจและเหตุผล อย่าอ่านเพียงการกระทำเล็ก ๆ แต่ให้ดูความสม่ำเสมอและความชัดเจนของอีกฝ่ายด้วย',
    work: 'เรื่องงานควรจัดลำดับความสำคัญ วางแผนเป็นขั้น และอย่ากลัวที่จะถามหรือขอข้อมูลเพิ่มก่อนตัดสินใจ',
    money: 'เรื่องเงินควรเน้นความปลอดภัยก่อนความเสี่ยง ตรวจสอบรายจ่ายและอย่ารีบตัดสินใจจากอารมณ์ชั่วคราว',
    general: 'ภาพรวมแนะนำให้ถอยออกมามองสถานการณ์อย่างใจเย็น แล้วเลือกทางที่ทำให้คุณสบายใจและเติบโตมากขึ้น'
  };
  return `เมื่ออ่านรวมกัน (${names}) ไพ่ไม่ได้บอกให้เชื่อแบบตายตัว แต่ชวนให้คุณเห็นจุดสำคัญของเรื่องนี้: ${topicLine[topic] || topicLine.general}`;
}

function buildAiLikeReading(cards) {
  const topic = currentTopic || detectTopic(currentQuestion);
  let html = `
    <div class="card-detail open ai-reading-panel">
      <div class="card-detail-title">🔮 คำทำนายแบบ AI-like: ${TOPIC_LABELS[topic]}</div>
      <p>${topicIntro(topic, currentQuestion)}</p>
      <p><strong>สรุปพลังรวม:</strong> ${synthesizeAdvice(cards, topic)}</p>
    </div>
  `;

  cards.forEach((card, i) => {
    const pos = POSITIONS[i];
    html += `
      <div class="card-detail open ai-reading-panel">
        <div class="card-detail-title">✦ ${pos.label}: ${card.name_th}</div>
        <p>${positionBridge(i, card, topic)}</p>
        <p><strong>พลังของไพ่:</strong> ${suitEnergy(card)}</p>
        <p><strong>คำแนะนำเฉพาะใบนี้:</strong> ${card.meaning_advice || 'ค่อย ๆ พิจารณาสถานการณ์จากหลายมุม แล้วเลือกทางที่ทำให้คุณไม่ฝืนใจเกินไป'}</p>
      </div>
    `;
  });

  html += `
    <div class="card-detail open ai-reading-panel">
      <div class="card-detail-title">🌙 ข้อความฝากจากไพ่</div>
      <p>${finalMessage(cards, topic)}</p>
      <p style="opacity:.8;font-size:.9rem;">คำทำนายนี้เป็นแนวทางเพื่อความบันเทิงและการทบทวนตัวเองเท่านั้น โปรดใช้วิจารณญาณในการตัดสินใจ</p>
    </div>
  `;
  return html;
}


function buildGeminiAiPanel() {
  return `
    <div class="card-detail open ai-reading-panel" id="geminiAiPanel">
      <div class="card-detail-title">🤖 วิเคราะห์ละเอียดด้วย AI จริง</div>
      <p>ถ้าต้องการให้ AI เรียบเรียงคำทำนายใหม่จากคำถามและไพ่ 3 ใบ ให้กดปุ่มด้านล่าง ระบบจะส่งเฉพาะคำถามกับชื่อไพ่ไปยัง backend ของน้อง</p>
      <button class="btn-primary" id="btnGeminiReading" onclick="requestGeminiReading()">✨ ให้ AI วิเคราะห์ละเอียด</button>
      <div id="geminiAiResult" style="margin-top:12px;"></div>
      <p style="opacity:.75;font-size:.86rem;margin-top:10px;">หมายเหตุ: คำตอบจาก AI ใช้เพื่อความบันเทิงและการทบทวนตัวเองเท่านั้น ไม่ควรใช้แทนคำปรึกษาจากผู้เชี่ยวชาญ</p>
    </div>
  `;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatGeminiReading(text) {
  const safe = escapeHtml(text).replace(/\n/g, '<br>');
  return `<div class="gemini-reading-text" style="line-height:1.85; white-space:normal;">${safe}</div>`;
}

function buildGeminiPayload() {
  const topic = currentTopic || detectTopic(currentQuestion);
  return {
    question: currentQuestion,
    topic: TOPIC_LABELS[topic] || topic,
    detectedTopic: topic,
    cards: selectedCards.slice(0, 3).map((card, i) => ({
      position: POSITIONS[i]?.label || `ใบที่ ${i + 1}`,
      name: card.name_en || card.name || '',
      thName: card.name_th || card.thName || '',
      meaning: card.meaning_general || '',
      meaning_general: card.meaning_general || '',
      meaning_love: card.meaning_love || '',
      meaning_work: card.meaning_work || '',
      meaning_money: card.meaning_money || '',
      meaning_advice: card.meaning_advice || ''
    }))
  };
}

async function requestGeminiReading() {
  const btn = document.getElementById('btnGeminiReading');
  const box = document.getElementById('geminiAiResult');
  if (!btn || !box) return;

  if (!currentQuestion || selectedCards.length !== 3) {
    showToast('✦ ยังไม่มีคำถามหรือไพ่ครบ 3 ใบค่ะ');
    return;
  }

  btn.disabled = true;
  btn.textContent = '🌙 AI กำลังอ่านไพ่...';
  box.innerHTML = `<p style="opacity:.85;">กำลังเชื่อมต่อ AI และเรียบเรียงคำทำนาย กรุณารอสักครู่...</p>`;

  try {
    const res = await fetch(`${GEMINI_BACKEND_URL}/api/tarot-reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiPayload())
    });

    let data = {};
    try { data = await res.json(); } catch (_) {}

    if (!res.ok || !data.ok) {
      const message = data.detail || data.error || `HTTP ${res.status}`;
      throw new Error(message);
    }

    currentGeminiReading = data.reading || '';
    box.innerHTML = `
      <div style="border-top:1px solid rgba(255,255,255,.16); padding-top:12px; margin-top:8px;">
        <div class="card-detail-title">✨ คำทำนายจาก AI</div>
        ${formatGeminiReading(currentGeminiReading)}
      </div>
    `;
    showToast('✦ AI วิเคราะห์คำทำนายเสร็จแล้วค่ะ');
  } catch (err) {
    console.error(err);
    currentGeminiReading = '';
    box.innerHTML = `
      <p style="color:#ffd6d6;"><strong>ยังเรียก AI ไม่สำเร็จค่ะ</strong></p>
      <p style="opacity:.9;">สาเหตุที่เป็นไปได้: backend ยัง deploy ไม่เสร็จ, API key ผิด/หมดสิทธิ์, หรือโมเดล Gemini ใช้งานไม่ได้ชั่วคราว</p>
      <p style="opacity:.75;font-size:.86rem;">รายละเอียด: ${escapeHtml(err.message)}</p>
    `;
    showToast('✦ AI ยังตอบไม่ได้ ลองใหม่อีกครั้งนะคะ');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ ให้ AI วิเคราะห์ละเอียด';
  }
}

function finalMessage(cards, topic) {
  const last = cards[2];
  const ending = getCardMeaning(last, topic);
  if (topic === 'love') return `หัวใจของคำตอบอยู่ที่ความชัดเจนและการสื่อสาร ไพ่แนวโน้มคือ ${last.name_th.split(' / ')[0]} จึงบอกว่าเรื่องนี้จะค่อย ๆ ชัดขึ้นเมื่อคุณไม่พยายามเดาใจมากเกินไป และเลือกคุยในจังหวะที่ทั้งสองฝ่ายพร้อม`;
  if (topic === 'work') return `ไพ่แนวโน้มคือ ${last.name_th.split(' / ')[0]} ซึ่งชี้ไปที่ “${ending}” ดังนั้นควรเดินแบบมีแผน เก็บรายละเอียด และอย่ารีบตัดสินใจจากแรงกดดันชั่วคราว`;
  if (topic === 'money') return `ไพ่แนวโน้มคือ ${last.name_th.split(' / ')[0]} จึงแนะนำให้จัดการเงินอย่างรอบคอบ ถ้าเรื่องไหนยังไม่แน่ใจ ควรรอข้อมูลเพิ่มหรือแบ่งความเสี่ยงให้น้อยลง`;
  return `ไพ่แนวโน้มคือ ${last.name_th.split(' / ')[0]} ซึ่งสะท้อนว่าเรื่องนี้กำลังพาไปสู่ “${ending}” คุณยังมีส่วนเลือกทิศทางได้ ขอแค่ไม่รีบตัดสินใจในวันที่ใจยังไม่นิ่ง`;
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
  currentTopic    = detectTopic(q);
  selectedCards   = [];
  pickedIndices   = [];

  document.getElementById('shuffleQuestion').textContent = `"${q}"`;
  document.getElementById('shuffleHint').textContent = `ระบบจับหมวดคำถาม: ${TOPIC_LABELS[currentTopic]} ✨`;
  document.getElementById('btnShuffle').disabled = false;
  document.getElementById('btnShuffle').textContent = '🔀 สับไพ่';

  const sc = document.getElementById('shuffleCards');
  sc.classList.remove('shuffling');

  showScreen('screenShuffle');
}

// ===== Step 2: Shuffle =====
function doShuffle() {
  const btn = document.getElementById('btnShuffle');
  const sc  = document.getElementById('shuffleCards');
  const hint = document.getElementById('shuffleHint');

  if (typeof TAROT_CARDS === 'undefined' || !Array.isArray(TAROT_CARDS) || TAROT_CARDS.length < 3) {
    showToast('✦ ไม่พบข้อมูลไพ่ กรุณาตรวจสอบไฟล์ cards.js');
    return;
  }

  btn.disabled = true;
  btn.textContent = '✨ กำลังสับไพ่...';
  sc.classList.add('shuffling');
  hint.textContent = 'กำลังอ่านคำถามและเรียกพลังงานจากไพ่...';

  shuffledDeck = shuffleDeck(TAROT_CARDS);

  setTimeout(() => {
    sc.classList.remove('shuffling');
    hint.textContent = 'ไพ่พร้อมแล้วค่ะ ✨';

    if (currentMode === 'fortune') {
      selectedCards = shuffledDeck.slice(0, 3);
      setTimeout(() => showResultScreen(), 600);
    } else {
      setTimeout(() => showPickScreen(), 600);
    }
  }, 1800);
}

function showPickScreen() {
  document.getElementById('pickQuestion').textContent = `"${currentQuestion}"`;

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
    hint.textContent = 'คุณเลือกครบ 3 ใบแล้ว ✨ กดปุ่มด้านล่างเพื่อเปิดไพ่';
  } else {
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

function buildCardFan() {
  const fan = document.getElementById('cardFan');
  fan.innerHTML = '';

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
    selectedCards = pickedIndices.map(i => shuffledDeck[i]);
    document.querySelectorAll('.fan-card:not(.selected)').forEach(c => c.classList.add('disabled'));
    const btnReveal = document.getElementById('btnReveal');
    btnReveal.classList.remove('hidden');
    btnReveal.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

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

  currentTopic = detectTopic(currentQuestion);
  document.getElementById('resultQuestion').textContent = `"${currentQuestion}"`;
  buildResultCards();
  showScreen('screenResult');
}

function buildResultCards() {
  const container = document.getElementById('cardsResult');
  container.innerHTML = '';

  const oldPanels = document.getElementById('detailPanels');
  if (oldPanels) oldPanels.remove();

  selectedCards.forEach((card, i) => {
    const pos = POSITIONS[i];
    const topicMeaning = getCardMeaning(card, currentTopic);

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
      <div class="card-meaning-short">${topicMeaning}</div>
    `;
    container.appendChild(col);
  });

  const hint = document.createElement('p');
  hint.className = 'tap-hint';
  hint.style.gridColumn = '1 / -1';
  hint.textContent = `✦ ระบบอ่านคำถามเป็นหมวด: ${TOPIC_LABELS[currentTopic]} — แตะที่การ์ดเพื่อดูความหมายเดิม ✦`;
  container.appendChild(hint);

  const detailWrap = document.createElement('div');
  detailWrap.id = 'detailPanels';
  detailWrap.style.cssText = 'width:100%; display:flex; flex-direction:column; gap:12px;';
  container.after(detailWrap);

  // AI-like reading เปิดให้เห็นทันที
  detailWrap.innerHTML = buildAiLikeReading(selectedCards) + buildGeminiAiPanel();

  // ความหมายแยกใบแบบเดิม เก็บไว้ให้แตะเปิด/ปิดได้
  selectedCards.forEach((card, i) => {
    const pos = POSITIONS[i];
    const panel = document.createElement('div');
    panel.classList.add('card-detail');
    panel.id = `detail-${i}`;
    panel.innerHTML = `
      <div class="card-detail-title">📖 ความหมายพื้นฐาน — ${pos.label}: ${card.name_th}</div>
      <p><strong>ภาพรวม:</strong> ${card.meaning_general}</p>
      <p><strong>ความรัก:</strong> ${card.meaning_love}</p>
      <p><strong>การงาน:</strong> ${card.meaning_work}</p>
      <p><strong>การเงิน:</strong> ${card.meaning_money}</p>
      <p><strong>คำแนะนำ:</strong> ${card.meaning_advice}</p>
    `;
    detailWrap.appendChild(panel);
  });
}

function toggleDetail(idx) {
  const panel = document.getElementById(`detail-${idx}`);
  if (!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function reshuffleMode() {
  selectedCards  = [];
  pickedIndices  = [];

  const dp = document.getElementById('detailPanels');
  if (dp) dp.remove();

  const sc = document.getElementById('shuffleCards');
  sc.classList.remove('shuffling');
  document.getElementById('shuffleHint').textContent = `ระบบจับหมวดคำถาม: ${TOPIC_LABELS[currentTopic]} ✨`;
  document.getElementById('btnShuffle').disabled = false;
  document.getElementById('btnShuffle').textContent = '🔀 สับไพ่';
  document.getElementById('shuffleQuestion').textContent = `"${currentQuestion}"`;

  showScreen('screenShuffle');
}

function switchMode() {
  selectedCards  = [];
  pickedIndices  = [];
  const dp = document.getElementById('detailPanels');
  if (dp) dp.remove();
  showScreen('screenHome');
}

function goHome() {
  currentMode     = null;
  currentQuestion = '';
  currentTopic    = 'general';
  selectedCards   = [];
  pickedIndices   = [];
  shuffledDeck    = [];
  document.getElementById('questionInput').value = '';
  document.getElementById('charCount').textContent = '0 / 200';
  const dp = document.getElementById('detailPanels');
  if (dp) dp.remove();
  showScreen('screenHome');
}

function copyResult() {
  if (!selectedCards.length) return;

  const topic = currentTopic || detectTopic(currentQuestion);
  let text = `✦ ไพ่บอกใจ — คำทำนายของคุณ ✦\n\n`;
  text += `คำถาม: ${currentQuestion}\n`;
  text += `หมวดคำถาม: ${TOPIC_LABELS[topic]}\n\n`;
  text += `${topicIntro(topic, currentQuestion)}\n\n`;
  text += `สรุปพลังรวม: ${synthesizeAdvice(selectedCards, topic)}\n\n`;

  selectedCards.forEach((card, i) => {
    const pos = POSITIONS[i];
    text += `${pos.label}: ${card.name_th} (${card.name_en})\n`;
    text += `${positionBridge(i, card, topic)}\n`;
    text += `คำแนะนำ: ${card.meaning_advice}\n\n`;
  });

  text += `ข้อความฝากจากไพ่: ${finalMessage(selectedCards, topic)}\n\n`;

  if (currentGeminiReading) {
    text += `คำทำนายจาก AI:\n${currentGeminiReading}\n\n`;
  }

  text += `—\nคำทำนายนี้เป็นแนวทางเพื่อความบันเทิงและการทบทวนตัวเองเท่านั้น`;

  navigator.clipboard.writeText(text)
    .then(() => showToast('✦ คัดลอกผลคำทำนายแล้วค่ะ'))
    .catch(() => {
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

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
