(() => {
  'use strict';

  // --- Elementos do DOM ---
  const boardContainer = document.getElementById('boardContainer');
  const timerText = document.getElementById('timerText');
  const movesText = document.getElementById('movesText');
  const statusTitle = document.getElementById('statusTitle');
  const restartBtn = document.getElementById('restartBtn');
  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const soundIconOn = document.getElementById('soundIconOn');
  const soundIconOff = document.getElementById('soundIconOff');
  const diffButtons = document.querySelectorAll('.diff-btn');

  // Modais
  const themeBtn = document.getElementById('themeBtn');
  const themeModal = document.getElementById('themeModal');
  const closeThemeModalBtn = document.getElementById('closeThemeModalBtn');
  const themeOptionButtons = document.querySelectorAll('.theme-opt-btn');

  const victoryModal = document.getElementById('victoryModal');
  const finalTimeText = document.getElementById('finalTimeText');
  const finalMovesText = document.getElementById('finalMovesText');
  const bestRecordBadge = document.getElementById('bestRecordBadge');
  const playAgainBtn = document.getElementById('playAgainBtn');

  // --- Estado do Jogo ---
  let gridSize = 5; // Padrão 5x5 como no print do usuário
  let tiles = [];
  let board = [];
  let emptyRow = 0;
  let emptyCol = 0;
  let lastMovedValues = [];

  let moveCount = 0;
  let elapsedSeconds = 0;
  let timerInterval = null;
  let isTimerRunning = false;
  let isBusy = false;
  let isSolved = false;
  let audioEnabled = localStorage.getItem('gridshift_audio') !== 'false';

  // --- Sistema de Temas ---
  let currentTheme = localStorage.getItem('gridshift_theme') || 'tactile-ivory';

  function applyTheme(themeName) {
    currentTheme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('gridshift_theme', themeName);

    themeOptionButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.setTheme === themeName);
    });
  }

  // --- Áudio Sintetizado e Hápticos ---
  let audioCtx = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) {
        audioCtx = new AudioClass();
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
      const freq = 240 + Math.random() * 60;
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.24, audioCtx.currentTime);
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
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        const start = audioCtx.currentTime + idx * 0.09;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch (_) {}
  }

  function triggerHaptic(duration = 20) {
    if (navigator.vibrate) {
      try { navigator.vibrate(duration); } catch (_) {}
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

  // --- Construção do Tabuleiro ---
  function initGame(size) {
    gridSize = Math.max(3, Math.min(5, size));
    document.documentElement.style.setProperty('--grid-size', gridSize);
    isSolved = false;
    stopTimer();

    diffButtons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === gridSize);
    });

    moveCount = 0;
    movesText.textContent = '0';
    elapsedSeconds = 0;
    updateTimerDisplay();
    statusTitle.textContent = 'Embaralhando...';

    buildSolvedBoard();
    shuffleBoard();
  }

  function buildSolvedBoard() {
    boardContainer.innerHTML = '';
    tiles = [];
    board = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

    let val = 1;
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

        // Vincula eventos de toque e arrasto
        attachPointerHandlers(tileObj);

        boardContainer.appendChild(tileEl);
        tiles.push(tileObj);
        board[r][c] = tileObj;

        renderTilePosition(tileObj, false);
        val++;
      }
    }
  }

  function renderTilePosition(tile, animated = true, offsetPx = { x: 0, y: 0 }) {
    if (!animated) {
      tile.el.style.transition = 'none';
    } else {
      tile.el.style.transition = 'transform 0.14s cubic-bezier(0.2, 0.8, 0.35, 1)';
    }

    const cellPercent = 100;
    if (offsetPx.x !== 0 || offsetPx.y !== 0) {
      tile.el.style.transform = `translate3d(calc(${tile.col * cellPercent}% + ${offsetPx.x}px), calc(${tile.row * cellPercent}% + ${offsetPx.y}px), 0)`;
    } else {
      tile.el.style.transform = `translate3d(${tile.col * cellPercent}%, ${tile.row * cellPercent}%, 0)`;
    }

    if (!animated) {
      void tile.el.offsetHeight;
      tile.el.style.transition = '';
    }
  }

  // --- Mecânica de Arrasto Multicasas (Pointer Events) ---
  let activeDrag = null;

  function attachPointerHandlers(tile) {
    const el = tile.el;

    el.addEventListener('pointerdown', (e) => {
      if (isBusy || isSolved) return;
      initAudioContext();

      // Checa se a peça está alinhada na mesma linha ou coluna do vazio
      const isSameRow = tile.row === emptyRow;
      const isSameCol = tile.col === emptyCol;
      if (!isSameRow && !isSameCol) return;

      const rect = boardContainer.getBoundingClientRect();
      const cellSize = rect.width / gridSize;

      // Coleta todos os blocos entre esta peça e o espaço vazio
      const affectedTiles = [];
      let axis = 'x';
      let dir = 0; // +1 ou -1

      if (isSameRow) {
        axis = 'x';
        dir = emptyCol > tile.col ? 1 : -1;
        const startC = Math.min(tile.col, emptyCol + (dir === 1 ? 0 : 1));
        const endC = Math.max(tile.col, emptyCol + (dir === 1 ? -1 : 0));
        
        // Da peça até o vazio
        for (let c = tile.col; dir === 1 ? c < emptyCol : c > emptyCol; c += dir) {
          const t = board[tile.row][c];
          if (t) affectedTiles.push(t);
        }
      } else {
        axis = 'y';
        dir = emptyRow > tile.row ? 1 : -1;
        
        for (let r = tile.row; dir === 1 ? r < emptyRow : r > emptyRow; r += dir) {
          const t = board[r][tile.col];
          if (t) affectedTiles.push(t);
        }
      }

      if (affectedTiles.length === 0) return;

      try {
        el.setPointerCapture(e.pointerId);
      } catch (_) {}

      activeDrag = {
        pointerId: e.pointerId,
        tile,
        axis,
        dir,
        startX: e.clientX,
        startY: e.clientY,
        cellSize,
        affectedTiles,
        movedDistance: 0,
        isDragging: false
      };

      affectedTiles.forEach(t => t.el.classList.add('dragging'));
    });

    el.addEventListener('pointermove', (e) => {
      if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;

      const rawDelta = activeDrag.axis === 'x' 
        ? (e.clientX - activeDrag.startX) 
        : (e.clientY - activeDrag.startY);

      // Limita o movimento no sentido correto até o tamanho exato de 1 casa
      let effectiveDelta = rawDelta * activeDrag.dir;
      if (effectiveDelta < 0) effectiveDelta = 0;
      if (effectiveDelta > activeDrag.cellSize) effectiveDelta = activeDrag.cellSize;

      const displacementPx = effectiveDelta * activeDrag.dir;
      activeDrag.movedDistance = Math.abs(rawDelta);

      if (activeDrag.movedDistance > 5) {
        activeDrag.isDragging = true;
      }

      // Aplica o deslocamento visual a todas as peças afetadas no bloco
      activeDrag.affectedTiles.forEach(t => {
        const offset = activeDrag.axis === 'x' 
          ? { x: displacementPx, y: 0 } 
          : { x: 0, y: displacementPx };
        renderTilePosition(t, false, offset);
      });
    });

    const finishDrag = (e) => {
      if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;

      const drag = activeDrag;
      activeDrag = null;

      try {
        el.releasePointerCapture(e.pointerId);
      } catch (_) {}

      drag.affectedTiles.forEach(t => t.el.classList.remove('dragging'));

      // Se foi um clique seco (pouco movimento) OU o arrasto passou de 28% da casa: CONFIRMA MOVIMENTO
      const isClick = drag.movedDistance < 8;
      const rawDelta = drag.axis === 'x' ? (e.clientX - drag.startX) : (e.clientY - drag.startY);
      const isCommitted = (rawDelta * drag.dir) > (drag.cellSize * 0.28);

      if (isClick || isCommitted) {
        commitMultiTileMove(drag.affectedTiles, drag.axis, drag.dir);
      } else {
        // Cancela e volta com animação suave
        drag.affectedTiles.forEach(t => renderTilePosition(t, true));
      }
    };

    el.addEventListener('pointerup', finishDrag);
    el.addEventListener('pointercancel', finishDrag);
  }

  // Executa o deslocamento lógico das peças e conta como 1 ÚNICO MOVIMENTO
  function commitMultiTileMove(affectedTiles, axis, dir) {
    if (affectedTiles.length === 0) return;

    // Desloca de trás para frente (da peça mais próxima ao vazio para a mais distante)
    const ordered = [...affectedTiles].reverse();

    ordered.forEach(tile => {
      const targetR = axis === 'y' ? tile.row + dir : tile.row;
      const targetC = axis === 'x' ? tile.col + dir : tile.col;

      board[targetR][targetC] = tile;
      board[tile.row][tile.col] = null;

      tile.row = targetR;
      tile.col = targetC;

      renderTilePosition(tile, true);
    });

    // O novo espaço vazio fica na posição original da peça mais distante que foi movida
    const furthest = affectedTiles[0];
    emptyRow = axis === 'y' ? furthest.row - dir : furthest.row;
    emptyCol = axis === 'x' ? furthest.col - dir : furthest.col;
    board[emptyRow][emptyCol] = null;

    // Contagem de 1 ÚNICO movimento para o bloco inteiro
    moveCount++;
    movesText.textContent = String(moveCount);

    playSlideSound();
    triggerHaptic(20);

    if (checkSolvedState()) {
      handleVictory();
    }
  }

  // --- Embaralhamento 100% Solvável ---
  function shuffleBoard() {
    isBusy = true;
    lastMovedValues = [];

    const totalSteps = gridSize * 30;
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
            if (!lastMovedValues.includes(tile.value) || candidates.length === 0) {
              candidates.push(tile);
            }
          }
        }
      }

      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        instantSwapSingle(chosen);
        lastMovedValues.push(chosen.value);
        if (lastMovedValues.length > 3) lastMovedValues.shift();
      }
    }

    if (checkSolvedState()) {
      const list = getImmediateNeighbors();
      if (list.length > 0) instantSwapSingle(list[0]);
    }

    tiles.forEach(t => renderTilePosition(t, false));

    statusTitle.textContent = 'Imagem objetiva';
    isBusy = false;
    startTimer();
  }

  function getImmediateNeighbors() {
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

  function instantSwapSingle(tile) {
    const prevR = tile.row;
    const prevC = tile.col;

    board[emptyRow][emptyCol] = tile;
    board[prevR][prevC] = null;

    tile.row = emptyRow;
    tile.col = emptyCol;

    emptyRow = prevR;
    emptyCol = prevC;
  }

  function checkSolvedState() {
    if (emptyRow !== gridSize - 1 || emptyCol !== gridSize - 1) return false;

    let expected = 1;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (r === gridSize - 1 && c === gridSize - 1) return true;
        const tile = board[r][c];
        if (!tile || tile.value !== expected) return false;
        expected++;
      }
    }
    return true;
  }

  function handleVictory() {
    isSolved = true;
    stopTimer();
    statusTitle.textContent = 'Resolvido!';

    playVictorySound();
    triggerHaptic([40, 60, 80]);

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

  // --- Listeners de Eventos Gerais ---
  restartBtn.addEventListener('click', () => {
    initAudioContext();
    triggerHaptic(25);
    initGame(gridSize);
  });

  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      initAudioContext();
      const sz = parseInt(btn.dataset.size, 10);
      if (sz !== gridSize) {
        initGame(sz);
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

  // Seletor de Temas
  themeBtn.addEventListener('click', () => {
    initAudioContext();
    themeModal.classList.remove('hidden');
  });

  closeThemeModalBtn.addEventListener('click', () => {
    themeModal.classList.add('hidden');
  });

  themeOptionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.setTheme;
      applyTheme(theme);
    });
  });

  // --- Inicialização ---
  applyTheme(currentTheme);
  updateAudioIcons();
  initGame(5); // Inicia por padrão em 5x5 como no print

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
