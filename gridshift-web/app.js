(() => {
  'use strict';

  // --- Constantes e Elementos do DOM ---
  const boardContainer = document.getElementById('boardContainer');
  const timerText = document.getElementById('timerText');
  const movesText = document.getElementById('movesText');
  const statusBadge = document.getElementById('statusBadge');
  const restartBtn = document.getElementById('restartBtn');
  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const soundIconOn = document.getElementById('soundIconOn');
  const soundIconOff = document.getElementById('soundIconOff');
  const tabButtons = document.querySelectorAll('.tab-btn');

  // Modal
  const victoryModal = document.getElementById('victoryModal');
  const finalTimeText = document.getElementById('finalTimeText');
  const finalMovesText = document.getElementById('finalMovesText');
  const bestRecordBadge = document.getElementById('bestRecordBadge');
  const playAgainBtn = document.getElementById('playAgainBtn');

  // --- Estado do Jogo ---
  let gridSize = 4;
  let tiles = []; // Lista de objetos { value, row, col, el }
  let board = []; // Matriz [row][col] apontando para tile ou null
  let emptyRow = 0;
  let emptyCol = 0;
  let lastMovedValue = -1;

  let moveCount = 0;
  let elapsedSeconds = 0;
  let timerInterval = null;
  let isTimerRunning = false;
  let isBusy = false;
  let isSolved = false;
  let audioEnabled = localStorage.getItem('gridshift_audio') !== 'false';

  // --- Sistema de Áudio Sintetizado (Web Audio API) ---
  let audioCtx = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSlideSound() {
    if (!audioEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      const freq = 260 + Math.random() * 80;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.045);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.045);
    } catch (_) {}
  }

  function playVictorySound() {
    if (!audioEnabled || !audioCtx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.09);

        const startTime = audioCtx.currentTime + idx * 0.09;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.28, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch (_) {}
  }

  function triggerHaptic(duration = 20) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(duration);
      } catch (_) {}
    }
  }

  // --- Cronômetro ---
  function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    isTimerRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function formatTime(totalSecs) {
    if (totalSecs < 0) return '--:--';
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    timerText.textContent = formatTime(elapsedSeconds);
  }

  // --- Montagem e Layout do Tabuleiro ---
  function initGame(size) {
    gridSize = Math.max(3, Math.min(5, size));
    document.documentElement.style.setProperty('--grid-size', gridSize);
    isSolved = false;
    stopTimer();

    // Atualiza Abas
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === gridSize);
    });

    moveCount = 0;
    movesText.textContent = '0';
    elapsedSeconds = 0;
    updateTimerDisplay();
    statusBadge.textContent = 'EMBARALHANDO...';

    buildSolvedBoard();
    shuffleBoard();
  }

  function buildSolvedBoard() {
    boardContainer.innerHTML = '';
    tiles = [];
    board = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

    let val = 1;
    const totalTiles = gridSize * gridSize;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (r === gridSize - 1 && c === gridSize - 1) {
          emptyRow = r;
          emptyCol = c;
          board[r][c] = null;
          continue;
        }

        const tileEl = document.createElement('div');
        tileEl.className = 'tile-wrapper';
        tileEl.setAttribute('role', 'button');
        tileEl.setAttribute('aria-label', `Peça ${val}`);

        const innerEl = document.createElement('div');
        innerEl.className = 'tile-inner';
        innerEl.textContent = val;
        tileEl.appendChild(innerEl);

        const tileObj = {
          value: val,
          row: r,
          col: c,
          el: tileEl
        };

        tileEl.addEventListener('click', () => handleTileClick(tileObj));
        tileEl.addEventListener('touchstart', () => initAudioContext(), { passive: true });

        boardContainer.appendChild(tileEl);
        tiles.push(tileObj);
        board[r][c] = tileObj;

        updateTilePosition(tileObj, false);
        val++;
      }
    }
  }

  function updateTilePosition(tile, animated = true) {
    if (!animated) {
      tile.el.style.transition = 'none';
    } else {
      tile.el.style.transition = 'transform 0.13s cubic-bezier(0.2, 0.8, 0.35, 1)';
    }

    tile.el.style.transform = `translate3d(${tile.col * 100}%, ${tile.row * 100}%, 0)`;

    if (!animated) {
      // Força reflow para aplicar style.transition depois
      void tile.el.offsetHeight;
      tile.el.style.transition = '';
    }
  }

  // --- Embaralhamento 100% Solvável ---
  function shuffleBoard() {
    isBusy = true;
    lastMovedValue = -1;

    const totalSteps = gridSize * 28;
    const directions = [
      { r: -1, c: 0 },
      { r: 1, c: 0 },
      { r: 0, c: -1 },
      { r: 0, c: 1 }
    ];

    for (let i = 0; i < totalSteps; i++) {
      const candidates = [];

      for (const d of directions) {
        const nr = emptyRow + d.r;
        const nc = emptyCol + d.c;

        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
          const tile = board[nr][nc];
          if (tile) {
            if (tile.value !== lastMovedValue || candidates.length === 0) {
              candidates.push(tile);
            }
          }
        }
      }

      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        swapWithEmpty(chosen, false);
        lastMovedValue = chosen.value;
      }
    }

    // Garante que não nasça resolvido
    if (checkSolvedState()) {
      const neighbors = getNeighborsOfEmpty();
      if (neighbors.length > 0) {
        swapWithEmpty(neighbors[0], false);
      }
    }

    // Aplica posições instantâneas aos elementos
    tiles.forEach(t => updateTilePosition(t, false));
    updateMovableHighlights();

    statusBadge.textContent = `${gridSize}×${gridSize}`;
    isBusy = false;
    startTimer();
  }

  function getNeighborsOfEmpty() {
    const list = [];
    const deltas = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
    for (const d of deltas) {
      const nr = emptyRow + d.r;
      const nc = emptyCol + d.c;
      if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
        if (board[nr][nc]) list.push(board[nr][nc]);
      }
    }
    return list;
  }

  function updateMovableHighlights() {
    tiles.forEach(t => {
      const isAdj = Math.abs(t.row - emptyRow) + Math.abs(t.col - emptyCol) === 1;
      t.el.classList.toggle('movable', isAdj);
    });
  }

  // --- Movimentação e Vitória ---
  function handleTileClick(tile) {
    if (isBusy || isSolved) return;
    initAudioContext();

    const isAdjacent = Math.abs(tile.row - emptyRow) + Math.abs(tile.col - emptyCol) === 1;
    if (!isAdjacent) return;

    swapWithEmpty(tile, true);
    moveCount++;
    movesText.textContent = String(moveCount);

    playSlideSound();
    triggerHaptic(20);
    updateMovableHighlights();

    if (checkSolvedState()) {
      handleVictory();
    }
  }

  function swapWithEmpty(tile, animated) {
    const prevRow = tile.row;
    const prevCol = tile.col;

    board[emptyRow][emptyCol] = tile;
    board[prevRow][prevCol] = null;

    tile.row = emptyRow;
    tile.col = emptyCol;

    emptyRow = prevRow;
    emptyCol = prevCol;

    if (animated) {
      updateTilePosition(tile, true);
    }
  }

  function checkSolvedState() {
    if (emptyRow !== gridSize - 1 || emptyCol !== gridSize - 1) {
      return false;
    }

    let expected = 1;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (r === gridSize - 1 && c === gridSize - 1) {
          return true;
        }
        const tile = board[r][c];
        if (!tile || tile.value !== expected) {
          return false;
        }
        expected++;
      }
    }
    return true;
  }

  function handleVictory() {
    isSolved = true;
    stopTimer();
    statusBadge.textContent = 'RESOLVIDO';

    playVictorySound();
    triggerHaptic([40, 60, 80]);

    // Persistência com localStorage
    const timeKey = `gridshift_best_time_${gridSize}x${gridSize}`;
    const movesKey = `gridshift_best_moves_${gridSize}x${gridSize}`;

    const prevBestTime = parseFloat(localStorage.getItem(timeKey)) || -1;
    const prevBestMoves = parseInt(localStorage.getItem(movesKey), 10) || -1;

    let isNewRecord = false;
    if (prevBestTime < 0 || elapsedSeconds < prevBestTime) {
      localStorage.setItem(timeKey, elapsedSeconds);
      isNewRecord = true;
    }

    if (prevBestMoves < 0 || moveCount < prevBestMoves) {
      localStorage.setItem(movesKey, moveCount);
      isNewRecord = true;
    }

    const currentBestTime = parseFloat(localStorage.getItem(timeKey));
    const currentBestMoves = parseInt(localStorage.getItem(movesKey), 10);

    finalTimeText.textContent = formatTime(elapsedSeconds);
    finalMovesText.textContent = `${moveCount} passos`;

    const tag = isNewRecord ? ' • NOVO RECORDE!' : '';
    bestRecordBadge.textContent = `Recorde ${gridSize}×${gridSize}: ${formatTime(currentBestTime)} / ${currentBestMoves} mov.${tag}`;

    victoryModal.classList.remove('hidden');
  }

  // --- Event Listeners ---
  restartBtn.addEventListener('click', () => {
    initAudioContext();
    triggerHaptic(25);
    initGame(gridSize);
  });

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      initAudioContext();
      const size = parseInt(btn.dataset.size, 10);
      if (size !== gridSize) {
        initGame(size);
      }
    });
  });

  playAgainBtn.addEventListener('click', () => {
    victoryModal.classList.add('hidden');
    initGame(gridSize);
  });

  audioToggleBtn.addEventListener('click', () => {
    initAudioContext();
    audioEnabled = !audioEnabled;
    localStorage.setItem('gridshift_audio', audioEnabled);
    updateAudioIcons();
    triggerHaptic(15);
  });

  function updateAudioIcons() {
    if (audioEnabled) {
      soundIconOn.classList.remove('hidden');
      soundIconOff.classList.add('hidden');
    } else {
      soundIconOn.classList.add('hidden');
      soundIconOff.classList.remove('hidden');
    }
  }

  // --- Inicialização ---
  updateAudioIcons();
  initGame(4);

  // Registro PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
