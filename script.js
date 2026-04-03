// --- 資料結構 ---
const SUITS = [
  { id: 'S', symbol: '♠', color: 'black' },
  { id: 'H', symbol: '♥', color: 'red' },
  { id: 'D', symbol: '♦', color: 'red' },
  { id: 'C', symbol: '♣', color: 'black' }
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let deck = [];
let unitPrice = 10;
let isDarkMode = false;

// --- 初始化 ---
function init() {
  buildDeck();
  loadSettings();
  renderDeck();
  attachEvents();
  updateDashboard();
}

function buildDeck() {
  deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit.id}-${rank}`,
        suit: suit,
        rank: rank,
        selected: false
      });
    }
  }
}

function loadSettings() {
  const savedPrice = localStorage.getItem('unitPrice');
  if (savedPrice) {
    unitPrice = Number(savedPrice);
    document.getElementById('input-unit-price').value = unitPrice;
  }
  
  const savedTheme = localStorage.getItem('isDarkMode');
  if (savedTheme === 'true') {
    isDarkMode = true;
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

// --- 邏輯計算 ---
function getCardValue(card) {
  if (card.rank === 'A') return 1;
  // J, Q, K 皆為 15 點 (根據開發需求文件 core rules 規定)
  if (['J', 'Q', 'K'].includes(card.rank)) return 15;
  return Number(card.rank); // 2~10 代表面值 2~10 點
}

function calculateState() {
  const selectedCards = deck.filter(c => c.selected);
  const count = selectedCards.length;
  const totalPoints = selectedCards.reduce((sum, c) => sum + getCardValue(c), 0);
  const diff = totalPoints - 100;
  const moneyDiff = diff * unitPrice;
  
  return {
    selectedCards,
    count,
    totalPoints,
    diff,
    moneyDiff
  };
}

// --- 介面更新 ---
function renderDeck() {
  const container = document.getElementById('deck-container');
  container.innerHTML = '';
  
  deck.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = `poker-card ${card.suit.color} ${card.selected ? 'selected' : ''}`;
    cardEl.dataset.id = card.id;
    
    cardEl.innerHTML = `
      <div class="card-top">${card.rank}</div>
      <div class="card-center">${card.suit.symbol}</div>
      <div class="card-bottom">${card.rank}</div>
      <div class="selected-overlay">✓</div>
    `;
    
    // 綁定點擊事件
    cardEl.addEventListener('click', () => toggleCard(card.id));
    container.appendChild(cardEl);
  });
}

function toggleCard(cardId) {
  const card = deck.find(c => c.id === cardId);
  if (card) {
    card.selected = !card.selected;
    
    // 快速切換該實體牌 UI 的 class，不需整個重繪，增加效能和流暢度
    const cardEl = document.querySelector(`.poker-card[data-id="${cardId}"]`);
    if (cardEl) {
      if (card.selected) cardEl.classList.add('selected');
      else cardEl.classList.remove('selected');
    }
    
    // 重新計算與更新儀表板
    updateDashboard();
  }
}

function updateDashboard() {
  const state = calculateState();
  
  // 1. 更新小元件數字
  document.getElementById('val-cards-count').textContent = state.count;
  document.getElementById('val-total-points').textContent = state.totalPoints;
  // 差額若為正，加上 + 符號
  document.getElementById('val-diff').textContent = (state.diff > 0 ? '+' : '') + state.diff;
  
  // 2. 更新最終結果區卡片
  const resultCard = document.getElementById('final-result-card');
  const resultAmount = document.getElementById('final-amount');
  const resultHint = document.getElementById('final-hint');
  
  // 清除預設與狀態 classes
  resultCard.className = 'final-result-card'; 
  
  if (state.count === 0) {
    resultAmount.textContent = '請先選牌';
    resultHint.textContent = '目前尚未選擇任何牌';
  } else {
    if (state.diff > 0) {
      resultCard.classList.add('win');
      resultAmount.textContent = `贏 +${state.moneyDiff}`;
      resultHint.textContent = `恭喜！超過基準，多出 ${Math.abs(state.diff)} 點`;
    } else if (state.diff < 0) {
      resultCard.classList.add('lose');
      resultAmount.textContent = `輸 ${state.moneyDiff}`;
      resultHint.textContent = `再接再厲，距離 100 點還差 ${Math.abs(state.diff)} 點`;
    } else {
      resultCard.classList.add('tie');
      resultAmount.textContent = `剛好 0`;
      resultHint.textContent = `太神啦！精準命中 100 點！`;
    }
  }
  
  // 3. 渲染已選牌的摘要 (小標籤與統計)
  renderSelectedSummary(state.selectedCards);
}

function renderSelectedSummary(selectedCards) {
  const listEl = document.getElementById('selected-cards-list');
  const statsEl = document.getElementById('selected-stats');
  
  if (selectedCards.length === 0) {
    listEl.innerHTML = '<div class="empty-state">尚未選擇任何牌</div>';
    statsEl.innerHTML = '';
    return;
  }
  
  // 渲染縮小版的牌卡標籤
  listEl.innerHTML = '';
  selectedCards.forEach(c => {
    const minCard = document.createElement('div');
    minCard.className = `mini-card ${c.suit.color}`;
    minCard.textContent = `${c.suit.symbol}${c.rank}`;
    minCard.title = '點擊取消選取';
    minCard.addEventListener('click', () => toggleCard(c.id));
    listEl.appendChild(minCard);
  });
  
  // 計算特殊牌型統計資訊
  const rankCount = {};
  selectedCards.forEach(c => {
    rankCount[c.rank] = (rankCount[c.rank] || 0) + 1;
  });
  
  statsEl.innerHTML = '';
  let highCardCount = 0;
  for (const rank in rankCount) {
    if (['J', 'Q', 'K'].includes(rank)) highCardCount += rankCount[rank];
  }
  
  if (highCardCount > 0) {
    statsEl.innerHTML += `<div class="stat-badge">J/Q/K(15點): ${highCardCount}張</div>`;
  }
  if (rankCount['A'] > 0) {
    statsEl.innerHTML += `<div class="stat-badge">A(1點): ${rankCount['A']}張</div>`;
  }
}

// --- 事件綁定 ---
function attachEvents() {
  const unitPriceInput = document.getElementById('input-unit-price');
  
  // 監聽每點金額改變並即刻存放入 LocalStorage
  unitPriceInput.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    // 預防輸入空值、負數或非數字，如果有就預設為 0
    if (isNaN(val) || val < 0) {
      val = 0;
    }
    unitPrice = val;
    localStorage.setItem('unitPrice', unitPrice);
    updateDashboard(); // 面板上的金額需要重算
  });
  
  // 一鍵清空
  document.getElementById('btn-clear').addEventListener('click', () => {
    deck.forEach(c => c.selected = false);
    renderDeck(); // 重洗畫面，消除所有 selected class
    updateDashboard();
    showToast('已清空所有選牌');
  });
  
  // 複製結果
  document.getElementById('btn-copy').addEventListener('click', () => {
    const state = calculateState();
    if (state.count === 0) {
      showToast('⚠️ 目前沒有可複製的結果，請先選牌');
      return;
    }
    
    let resultText = '';
    if (state.diff > 0) resultText = `贏 ${state.moneyDiff} 元！`;
    else if (state.diff < 0) resultText = `輸 ${Math.abs(state.moneyDiff)} 元`;
    else resultText = `完美平手 (剛好 100 點)！`;
    
    const moneyDiffSign = state.diff > 0 ? '+' : '';
    const textToCopy = `【麻將撲克牌結算】\n` +
      `已選 ${state.count} 張牌，總點數 ${state.totalPoints}\n` +
      `（差額 ${moneyDiffSign}${state.diff}，每點 ${unitPrice} 元）\n` +
      `結果：${resultText}`;
      
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('📋 結算結果已成功複製到剪貼簿！');
    }).catch(err => {
      showToast('複製失敗，可能需要授權或請手動複製結果');
    });
  });
  
  // 深色模式切換
  document.getElementById('btn-theme').addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('isDarkMode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      showToast('已切換為深色模式 🌙');
    } else {
      document.documentElement.removeAttribute('data-theme');
      showToast('已切換為亮色模式 ☀️');
    }
  });
}

// --- 工具函數 ---
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // 淡出與自我銷毀
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 500); // 對應 transition 0.5s
  }, 3000);
}

// 確保 DOM 都載入後啟動程式
document.addEventListener('DOMContentLoaded', init);
