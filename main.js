/* ===========================================================
   2:17 AM — Game Logic
   =========================================================== */

// ---- Game State ----
const state = {
  screen: 'title',
  clues: { cctv: false, phone: false, clock: false },
  allCluesReady: false,
  cctvViews: 0,
  phoneClicks: 0,
  clockClicks: 0,
  sequenceMode: false,
  endingShown: null,
  endingStepHandler: null,
};

// ---- DOM References ----
const titleScreen = document.getElementById('title-screen');
const gameScreen = document.getElementById('game-screen');
const endingScreen = document.getElementById('ending-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const narrativeText = document.getElementById('narrative-text');
const continuePrompt = document.getElementById('continue-prompt');
const textPanel = document.getElementById('text-panel');
const choicePanel = document.getElementById('choice-panel');
const choiceOpenDoor = document.getElementById('choice-open-door');
const choiceStayInside = document.getElementById('choice-stay-inside');
const cctvDoor = document.getElementById('cctv-door');
const cctvCorridor = document.getElementById('cctv-corridor');
const cctvEndingScene = document.getElementById('cctv-ending-scene');
const cctvOverlayText = document.getElementById('cctv-overlay-text');
const figureHead = document.getElementById('figure-head');
const roomScene = document.getElementById('room-scene');

// ---- Clue Bar Items ----
const clueItems = document.querySelectorAll('.clue-item');

// ---- Game Objects ----
const gameObjects = document.querySelectorAll('.game-object');

// ---- Opening Sequence Lines ----
const openingLines = [
  '你在一間昏暗的保安室中醒來。日光燈在頭頂不安地閃爍。',
  '牆上的時鐘停了——指針凍結在凌晨 2:17。',
  '桌上的電話突然響起。你接起來。',
  '一個低沉的聲音說：<span class="quote">「不管你聽到什麼，都不要開門。」</span>',
  '電話掛斷。門外傳來三聲沉重的敲門聲。',
  '你獨自坐在這裡。也許該看看周圍了。',
];

// ---- CCTV Interaction Texts ----
const cctvTexts = [
  '你看向監視器畫面。走廊空無一人。盡頭有一扇門，距離很遠。',
  '你再看了看畫面。走廊依然空蕩——但那扇門，似乎比上次近了一些。',
  '畫面中的門又近了。走廊裡沒有人。門只是……更近了。',
  '門非常近了。你幾乎能看清門上的紋路。畫面裡依然沒有人。',
  '那扇門近在眼前。監視器畫面開始出現雜訊。你決定不再看了。',
];

// ---- Phone Interaction Texts ----
const phoneFirstText =
  '你走近電話。它再次響起。你接起來。\n' +
  '<span class="quote">「不管你聽到什麼，都不要開門。」</span>\n' +
  '聲音和之前一樣——但這次，呼吸聲不同了。更慢。更深。像是貼著話筒。\n' +
  '你注意到電話旁壓著一張手寫字條。字跡有些發抖：\n' +
  '<span class="note-text">「如果電話響了，不要相信門外的人。」</span>';

const phoneRepeatText =
  '字條上的字跡仍在，微微發顫：\n' +
  '<span class="note-text">「如果電話響了，不要相信門外的人。」</span>';

// ---- Clock Interaction Texts ----
const clockFirstText =
  '你走向牆上的時鐘。指針停在 2:17，一動不動。\n' +
  '你將時鐘翻過來。背面刻著一行字，像是被利器颳上去的：\n' +
  '<span class="quote">「你已經開過一次門了。」</span>';

const clockRepeatText =
  '時鐘背面那行字仍在：\n' +
  '<span class="quote">「你已經開過一次門了。」</span>';

// ---- Ending A Sequence (Open the door) ----
const endingALines = [
  '你走向門口。深吸一口氣。你轉動門把，拉開了門。',
  '走廊是空的。什麼也沒有。',
  '你回到監視器畫面前。',
  '畫面中，你正坐在保安室裡，背對著門。',
  '畫面中的你，緩緩轉過頭來，看向鏡頭。',
  '<span class="quote">「你終於回來了。」</span>',
];

// ---- Ending B Sequence (Stay inside) ----
const endingBLines = [
  '你決定不開門。你退回座位，等待。',
  '電話又響了。你接起來。',
  '<span class="quote">「不管你聽到什麼，都不要開門。」</span>',
  '這一次，那個聲音聽起來……和你一模一樣。',
];

// ---- Helper: Show Text ----
function showText(html) {
  if (html === '') {
    narrativeText.innerHTML = '';
    return;
  }
  narrativeText.innerHTML = html.replace(/\n/g, '<br>');
  narrativeText.style.animation = 'none';
  void narrativeText.offsetHeight;
  narrativeText.style.animation = '';
}

// ---- Helper: Switch Screen ----
function switchScreen(target) {
  [titleScreen, gameScreen, endingScreen].forEach(s => s.classList.remove('active'));
  target.classList.add('active');
}

// ---- Clue Management ----
function discoverClue(clueName) {
  if (!state.clues[clueName]) {
    state.clues[clueName] = true;
    updateClueBar();
    checkAllClues();
  }
}

function updateClueBar() {
  clueItems.forEach(item => {
    const clue = item.dataset.clue;
    item.classList.toggle('found', state.clues[clue]);
  });
}

function allCluesFound() {
  return state.clues.cctv && state.clues.phone && state.clues.clock;
}

function checkAllClues() {
  // 所有線索都找到時，只標記「已集齊」
  // 暫時不顯示選項，等玩家讀完最後一條線索
  if (allCluesFound()) {
    state.allCluesReady = true;
  }
}

// ---- Step-by-Step Sequence Engine ----
// Plays through an array of text lines, click-to-advance.
// onStep(index) is called after each line is shown (optional).
// onComplete() is called after the last line is advanced past.
function playSteps(lines, onStep, onComplete) {
  state.sequenceMode = true;
  let step = 0;

  showText(lines[0]);
  continuePrompt.classList.remove('hidden');
  continuePrompt.textContent = '繼續 ▸';
  textPanel.classList.add('clickable');

  if (onStep) onStep(0);

  function nextStep() {
    step++;
    if (step < lines.length) {
      showText(lines[step]);
      if (onStep) onStep(step);
      if (step === lines.length - 1) {
        continuePrompt.textContent = '結束 ▸';
      }
    } else {
      state.sequenceMode = false;
      state.endingStepHandler = null;
      continuePrompt.classList.add('hidden');
      textPanel.classList.remove('clickable');
      showText('');
      if (onComplete) onComplete();
    }
  }

  state.endingStepHandler = nextStep;
}

// ---- Object Interactions ----
function handleCCTV() {
  const viewIndex = Math.min(state.cctvViews, cctvTexts.length - 1);
  showText(cctvTexts[viewIndex]);

  const scales = [0.5, 0.7, 0.9, 1.15, 1.4];
  const scale = scales[Math.min(state.cctvViews, scales.length - 1)];
  cctvDoor.style.transform = `translate(-50%, -50%) scale(${scale})`;

  state.cctvViews++;
  discoverClue('cctv');
  document.getElementById('obj-cctv').classList.add('investigated');
}

function handlePhone() {
  state.phoneClicks++;
  if (state.phoneClicks === 1) {
    showText(phoneFirstText);
  } else {
    showText(phoneRepeatText);
  }
  discoverClue('phone');
  document.getElementById('obj-phone').classList.add('investigated');
}

function handleClock() {
  state.clockClicks++;
  if (state.clockClicks === 1) {
    showText(clockFirstText);
  } else {
    showText(clockRepeatText);
  }
  discoverClue('clock');
  document.getElementById('obj-clock').classList.add('investigated');
}

// ---- Ending A: Open the Door ----
function triggerEndingA() {
  state.endingShown = 'a';
  choicePanel.classList.add('hidden');

  playSteps(
    endingALines,
    (step) => {
      // After "你回到監視器畫面前" (index 2), switch CCTV to ending scene
      if (step === 2) {
        cctvCorridor.classList.add('hidden');
        cctvEndingScene.classList.remove('hidden');
        cctvOverlayText.textContent = 'CAM 01 — 保安室';
      }
      // After "畫面中的你，緩緩轉過頭來" (index 4), trigger head turn animation
      if (step === 4) {
        figureHead.classList.add('turned');
      }
    },
    () => {
      showEndingScreen('門外無人', '你終於回來了。');
    }
  );
}

// ---- Ending B: Stay Inside ----
function triggerEndingB() {
  state.endingShown = 'b';
  choicePanel.classList.add('hidden');

  playSteps(
    endingBLines,
    null,
    () => {
      gameScreen.classList.add('fade-to-black');
      setTimeout(() => {
        showEndingScreen('凌晨 2:17', '時鐘停了。你還在這裡。');
      }, 2500);
    }
  );
}

// ---- Show Ending Screen ----
function showEndingScreen(title, subtitle) {
  gameScreen.classList.remove('fade-to-black');

  document.getElementById('ending-title').textContent = title;
  document.getElementById('ending-subtitle').textContent = subtitle;

  endingScreen.classList.add('active', 'fade-in');
  gameScreen.classList.remove('active');
}

// ---- Reset Game ----
function resetGame() {
  state.screen = 'title';
  state.clues = { cctv: false, phone: false, clock: false };
  state.allCluesReady = false;
  state.cctvViews = 0;
  state.phoneClicks = 0;
  state.clockClicks = 0;
  state.sequenceMode = false;
  state.endingShown = null;
  state.endingStepHandler = null;

  updateClueBar();
  choicePanel.classList.add('hidden');
  showText('');
  continuePrompt.classList.add('hidden');
  textPanel.classList.remove('clickable');

  gameObjects.forEach(obj => obj.classList.remove('investigated'));

  cctvDoor.style.transform = 'translate(-50%, -50%) scale(0.5)';
  cctvCorridor.classList.remove('hidden');
  cctvEndingScene.classList.add('hidden');
  cctvOverlayText.textContent = 'CAM 01 — 走廊';
  figureHead.classList.remove('turned');

  gameScreen.classList.remove('fade-to-black', 'active', 'exploring');
  endingScreen.classList.remove('active', 'fade-in');
  titleScreen.classList.add('active');
  narrativeText.innerHTML = '';
}

// ---- Start Game ----
function startGame() {
  state.screen = 'playing';
  switchScreen(gameScreen);
  gameScreen.classList.remove('exploring');

  playSteps(
    openingLines,
    (step) => {
      // Screen shake on the knocking line (index 4)
      if (step === 4) {
        roomScene.classList.add('shake');
        setTimeout(() => roomScene.classList.remove('shake'), 500);
      }
    },
    () => {
  gameScreen.classList.add('exploring');
  showText('你可以調查房間裡的東西。點擊監視器、電話或時鐘來查看。');
}
  );
}

// ---- Event Listeners ----
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);


textPanel.addEventListener('click', () => {
  // 如果正在播放逐句劇情，就照常推進
  if (state.sequenceMode) {
    if (state.endingStepHandler) {
      state.endingStepHandler();
    }
    return;
  }

  // 如果所有線索都已集齊，點擊對話框才顯示選項
  if (state.allCluesReady && !state.endingShown) {
    choicePanel.classList.remove('hidden');
    showText('你已經查看了所有東西。你必須做出選擇。');
    continuePrompt.classList.add('hidden');
    textPanel.classList.remove('clickable');

    // 防止重複觸發
    state.allCluesReady = false;
  }
});


document.getElementById('obj-cctv').addEventListener('click', (e) => {
  e.stopPropagation();
  if (state.sequenceMode || state.endingShown) return;
  handleCCTV();
});

document.getElementById('obj-phone').addEventListener('click', (e) => {
  e.stopPropagation();
  if (state.sequenceMode || state.endingShown) return;
  handlePhone();
});

document.getElementById('obj-clock').addEventListener('click', (e) => {
  e.stopPropagation();
  if (state.sequenceMode || state.endingShown) return;
  handleClock();
});

choiceOpenDoor.addEventListener('click', (e) => {
  e.stopPropagation();
  triggerEndingA();
});

choiceStayInside.addEventListener('click', (e) => {
  e.stopPropagation();
  triggerEndingB();
});

// ---- Initialize ----
updateClueBar();
