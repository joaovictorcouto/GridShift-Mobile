(() => {
  'use strict';

  // ==========================================================================
  // ELEMENTOS DO DOM
  // ==========================================================================

  // Telas
  const screenMenu = document.getElementById('screenMenu');
  const screenSelect = document.getElementById('screenSelect');
  const screenGame = document.getElementById('screenGame');

  // Menu Principal
  const btnContinueGame = document.getElementById('btnContinueGame');
  const btnPlayMenu = document.getElementById('btnPlayMenu');
  const btnSelectLevel = document.getElementById('btnSelectLevel');
  const btnOpenRecords = document.getElementById('btnOpenRecords');
  const menuThemeBtn = document.getElementById('menuThemeBtn');
  const menuAudioBtn = document.getElementById('menuAudioBtn');

  // Tela de Seleção
  const btnBackToMenu = document.getElementById('btnBackToMenu');
  const gridSizePicker = document.getElementById('gridSizePicker');
  const diffTierPicker = document.getElementById('diffTierPicker');
  const levelGridContainer = document.getElementById('levelGridContainer');
  const selectedLevelLabel = document.getElementById('selectedLevelLabel');
  const sumLevelTitle = document.getElementById('sumLevelTitle');
  const sumLevelRecord = document.getElementById('sumLevelRecord');
  const btnStartGame = document.getElementById('btnStartGame');

  // Tela de Jogo
  const btnGameBack = document.getElementById('btnGameBack');
  const gameLevelPill = document.getElementById('gameLevelPill');
  const btnGameAudio = document.getElementById('btnGameAudio');
  const btnPauseGame = document.getElementById('btnPauseGame');
  const btnPauseGameBottom = document.getElementById('btnPauseGameBottom');
  const gameSubheadTitle = document.getElementById('gameSubheadTitle');
  const gameTimerText = document.getElementById('gameTimerText');
  const gameMovesText = document.getElementById('gameMovesText');
  const boardContainer = document.getElementById('boardContainer');
  const btnRestartLevel = document.getElementById('btnRestartLevel');

  // Modal de Pausa
  const pauseModal = document.getElementById('pauseModal');
  const btnResumeGame = document.getElementById('btnResumeGame');
  const btnPauseRestart = document.getElementById('btnPauseRestart');
  const btnPauseExit = document.getElementById('btnPauseExit');

  // Modal de Vitória
  const victoryModal = document.getElementById('victoryModal');
  const victorySubtitle = document.getElementById('victorySubtitle');
  const finalTimeText = document.getElementById('finalTimeText');
  const finalMovesText = document.getElementById('finalMovesText');
  const badgeTimeRecord = document.getElementById('badgeTimeRecord');
  const badgeMovesRecord = document.getElementById('badgeMovesRecord');
  const bestRecordBadge = document.getElementById('bestRecordBadge');
  const btnNextLevel = document.getElementById('btnNextLevel');
  const btnPlayAgain = document.getElementById('btnPlayAgain');
  const btnVictoryMenu = document.getElementById('btnVictoryMenu');

  // Modal de Recordes
  const recordsModal = document.getElementById('recordsModal');
  const recordsFilterBar = document.querySelector('.records-filter-bar');
  const recordsListContainer = document.getElementById('recordsListContainer');
  const btnCloseRecords = document.getElementById('btnCloseRecords');

  // Modal de Temas
  const themeModal = document.getElementById('themeModal');
  const btnCloseTheme = document.getElementById('btnCloseTheme');
  const themeOptionButtons = document.querySelectorAll('.theme-opt-btn');

  // ==========================================================================
  // ESTADO DA APLICAÇÃO
  // ==========================================================================

  const DIFFICULTIES = [
    { id: 'easy', label: 'Fácil', stepsMult: 4 },
    { id: 'medium', label: 'Médio', stepsMult: 8 },
    { id: 'hard', label: 'Difícil', stepsMult: 15 },
    { id: 'expert', label: 'Expert', stepsMult: 25 }
  ];

  let selectedSize = 5;
  let selectedDiff = 'easy';
  let selectedLevel = 1; // 1 a 10

  // Estado da Partida Ativa
  let currentGame = null; // { size, diff, level, boardInitial, boardCurrent, moves, seconds, emptyRow, emptyCol }
  let isTimerRunning = false;
  let timerInterval = null;
  let isBusy = false;
  let isSolved = false;
  let isPaused = false;

  let tiles = []; // Objetos visuais { value, row, col, el }
  let boardMatrix = []; // [row][col]

  let audioEnabled = localStorage.getItem('gridshift_audio') !== 'false';
  let currentTheme = localStorage.getItem('gridshift_theme') || 'tactile-ivory';

  // ==========================================================================
  // NAVEGAÇÃO DE TELAS
  // ==========================================================================

  function switchScreen(screen) {
    [screenMenu, screenSelect, screenGame].forEach(s => s.classList.remove('active'));
    
    if (screen === 'menu') {
      updateContinueButtonVisibility();
      screenMenu.classList.add('active');
    } else if (screen === 'select') {
      renderLevelGrid();
      updateLevelSummary();
      screenSelect.classList.add('active');
    } else if (screen === 'game') {
      screenGame.classList.add('active');
    }
  }

  function updateContinueButtonVisibility() {
    const saved = localStorage.getItem('gridshift_saved_session');
    if (saved) {
      btnContinueGame.classList.remove('hidden');
    } else {
      btnContinueGame.classList.add('hidden');
    }
  }

  // ==========================================================================
  // GERADOR DETERMINÍSTICO DE FASES (100% Solvável e Repetível)
  // ==========================================================================

  // PRNG Mulberry32 determinístico
  function createPRNG(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateDeterministicLevel(size, diffId, levelIndex) {
    const diffObj = DIFFICULTIES.find(d => d.id === diffId) || DIFFICULTIES[0];
    const diffIndex = DIFFICULTIES.indexOf(diffObj);
    const totalSteps = size * diffObj.stepsMult + (levelIndex * 2);

    // Semente única e reprodutível por (tamanho, dificuldade, fase)
    const seed = (size * 100000) + (diffIndex * 10000) + (levelIndex * 7919) + 42;
    const rng = createPRNG(seed);

    // Inicia no estado resolvido
    const grid = [];
    let val = 1;
    for (let r = 0; r < size; r++) {
      grid[r] = [];
      for (let c = 0; c < size; c++) {
        if (r === size - 1 && c === size - 1) {
          grid[r][c] = 0; // 0 representa o espaço vazio
        } else {
          grid[r][c] = val++;
        }
      }
    }

    let emptyR = size - 1;
    let emptyC = size - 1;
    let lastMovedVal = -1;

    const directions = [
      { r: -1, c: 0 },
      { r: 1, c: 0 },
      { r: 0, c: -1 },
      { r: 0, c: 1 }
    ];

    // Embaralha através de movimentos reversos válidos
    for (let i = 0; i < totalSteps; i++) {
      const candidates = [];
      for (const d of directions) {
        const nr = emptyR + d.r;
        const nc = emptyC + d.c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const tileVal = grid[nr][nc];
          if (tileVal !== lastMovedVal || candidates.length === 0) {
            candidates.push({ r: nr, c: nc, val: tileVal });
          }
        }
      }

      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(rng() * candidates.length)];
        grid[emptyR][emptyC] = chosen.val;
        grid[chosen.r][chosen.c] = 0;
        emptyR = chosen.r;
        emptyC = chosen.c;
        lastMovedVal = chosen.val;
      }
    }

    // Garante que não inicia resolvido
    if (isGridSolved(grid, size)) {
      const cand = [];
      for (const d of directions) {
        const nr = emptyR + d.r;
        const nc = emptyC + d.c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          cand.push({ r: nr, c: nc, val: grid[nr][nc] });
        }
      }
      if (cand.length > 0) {
        grid[emptyR][emptyC] = cand[0].val;
        grid[cand[0].r][cand[0].c] = 0;
        emptyR = cand[0].r;
        emptyC = cand[0].c;
      }
    }

    // Converte para snapshot serializável 1D
    const snapshot = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        snapshot.push(grid[r][c]);
      }
    }

    return {
      size,
      diffId,
      levelIndex,
      snapshot,
      emptyRow: emptyR,
      emptyCol: emptyC
    };
  }

  function isGridSolved(grid, size) {
    if (grid[size - 1][size - 1] !== 0) return false;
    let expected = 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r === size - 1 && c === size - 1) return true;
        if (grid[r][c] !== expected++) return false;
      }
    }
    return true;
  }

  // ==========================================================================
  // RENDERIZAÇÃO DA SELEÇÃO DE FASES
  // ==========================================================================

  function renderLevelGrid() {
    levelGridContainer.innerHTML = '';
    const diffObj = DIFFICULTIES.find(d => d.id === selectedDiff) || DIFFICULTIES[0];

    for (let i = 1; i <= 10; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-btn';
      if (i === selectedLevel) btn.classList.add('active');

      const rec = getLevelRecord(selectedSize, selectedDiff, i);
      if (rec && rec.completed) {
        btn.classList.add('completed');
      }

      btn.textContent = i;
      btn.addEventListener('click', () => {
        initAudioContext();
        selectedLevel = i;
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateLevelSummary();
      });

      levelGridContainer.appendChild(btn);
    }
  }

  function updateLevelSummary() {
    const diffObj = DIFFICULTIES.find(d => d.id === selectedDiff) || DIFFICULTIES[0];
    selectedLevelLabel.textContent = `Fase ${selectedLevel}`;
    sumLevelTitle.textContent = `${selectedSize}×${selectedSize} • ${diffObj.label} (Fase ${selectedLevel})`;

    const rec = getLevelRecord(selectedSize, selectedDiff, selectedLevel);
    if (rec && rec.completed) {
      sumLevelRecord.textContent = `Melhor: ${formatTime(rec.bestTime)} / ${rec.bestMoves} passos ★`;
    } else {
      sumLevelRecord.textContent = `Ainda não concluída`;
    }
  }

  // ==========================================================================
  // INICIALIZAÇÃO DA PARTIDA E TABULEIRO TOUCH
  // ==========================================================================

  function startSelectedGame(restoreExisting = false) {
    if (restoreExisting) {
      const saved = JSON.parse(localStorage.getItem('gridshift_saved_session') || '{}');
      if (saved && saved.size) {
        selectedSize = saved.size;
        selectedDiff = saved.diff;
        selectedLevel = saved.level;
        currentGame = saved;
      }
    }

    if (!restoreExisting) {
      const levelData = generateDeterministicLevel(selectedSize, selectedDiff, selectedLevel);
      currentGame = {
        size: selectedSize,
        diff: selectedDiff,
        level: selectedLevel,
        initialSnapshot: [...levelData.snapshot],
        currentSnapshot: [...levelData.snapshot],
        emptyRow: levelData.emptyRow,
        emptyCol: levelData.emptyCol,
        moves: 0,
        seconds: 0
      };
      saveActiveSession();
    }

    buildGameBoard();
    switchScreen('game');

    const diffObj = DIFFICULTIES.find(d => d.id === currentGame.diff) || DIFFICULTIES[0];
    gameLevelPill.textContent = `${currentGame.size}×${currentGame.size} • Fase ${currentGame.level} (${diffObj.label})`;
    gameSubheadTitle.textContent = 'Imagem objetiva';

    gameMovesText.textContent = String(currentGame.moves);
    gameTimerText.textContent = formatTime(currentGame.seconds);

    isPaused = false;
    isSolved = false;
    startTimer();
  }

  function buildGameBoard() {
    const size = currentGame.size;
    document.documentElement.style.setProperty('--grid-size', size);
    boardContainer.innerHTML = '';
    tiles = [];
    boardMatrix = Array.from({ length: size }, () => Array(size).fill(null));

    let idx = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = currentGame.currentSnapshot[idx++];
        if (val === 0) {
          currentGame.emptyRow = r;
          currentGame.emptyCol = c;
          boardMatrix[r][c] = null;
        } else {
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

          attachMultiTilePointer(tileObj);

          boardContainer.appendChild(tileEl);
          tiles.push(tileObj);
          boardMatrix[r][c] = tileObj;

          renderTileTransform(tileObj, false);
        }
      }
    }
  }

  function renderTileTransform(tile, animated = true, offsetPx = { x: 0, y: 0 }) {
    if (!animated) {
      tile.el.style.transition = 'none';
    } else {
      tile.el.style.transition = 'transform 0.14s cubic-bezier(0.2, 0.8, 0.35, 1)';
    }

    const pct = 100;
    if (offsetPx.x !== 0 || offsetPx.y !== 0) {
      tile.el.style.transform = `translate3d(calc(${tile.col * pct}% + ${offsetPx.x}px), calc(${tile.row * pct}% + ${offsetPx.y}px), 0)`;
    } else {
      tile.el.style.transform = `translate3d(${tile.col * pct}%, ${tile.row * pct}%, 0)`;
    }

    if (!animated) {
      void tile.el.offsetHeight;
      tile.el.style.transition = '';
    }
  }

  // ==========================================================================
  // ARRASTO MULTICASAS (Pointer Events no iPad e Desktop)
  // ==========================================================================

  let activeDrag = null;

  function attachMultiTilePointer(tile) {
    const el = tile.el;

    el.addEventListener('pointerdown', (e) => {
      if (isBusy || isSolved || isPaused) return;
      initAudioContext();

      const emptyR = currentGame.emptyRow;
      const emptyC = currentGame.emptyCol;
      const isSameRow = tile.row === emptyR;
      const isSameCol = tile.col === emptyC;
      if (!isSameRow && !isSameCol) return;

      const rect = boardContainer.getBoundingClientRect();
      const cellSize = rect.width / currentGame.size;

      const affectedTiles = [];
      let axis = 'x';
      let dir = 0;

      if (isSameRow) {
        axis = 'x';
        dir = emptyC > tile.col ? 1 : -1;
        for (let c = tile.col; dir === 1 ? c < emptyC : c > emptyC; c += dir) {
          const t = boardMatrix[tile.row][c];
          if (t) affectedTiles.push(t);
        }
      } else {
        axis = 'y';
        dir = emptyR > tile.row ? 1 : -1;
        for (let r = tile.row; dir === 1 ? r < emptyR : r > emptyR; r += dir) {
          const t = boardMatrix[r][tile.col];
          if (t) affectedTiles.push(t);
        }
      }

      if (affectedTiles.length === 0) return;

      try { el.setPointerCapture(e.pointerId); } catch (_) {}

      activeDrag = {
        pointerId: e.pointerId,
        tile,
        axis,
        dir,
        startX: e.clientX,
        startY: e.clientY,
        cellSize,
        affectedTiles,
        movedDistance: 0
      };

      affectedTiles.forEach(t => t.el.classList.add('dragging'));
    });

    el.addEventListener('pointermove', (e) => {
      if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;

      const rawDelta = activeDrag.axis === 'x' 
        ? (e.clientX - activeDrag.startX) 
        : (e.clientY - activeDrag.startY);

      let effectiveDelta = rawDelta * activeDrag.dir;
      if (effectiveDelta < 0) effectiveDelta = 0;
      if (effectiveDelta > activeDrag.cellSize) effectiveDelta = activeDrag.cellSize;

      const displacementPx = effectiveDelta * activeDrag.dir;
      activeDrag.movedDistance = Math.abs(rawDelta);

      activeDrag.affectedTiles.forEach(t => {
        const offset = activeDrag.axis === 'x' 
          ? { x: displacementPx, y: 0 } 
          : { x: 0, y: displacementPx };
        renderTileTransform(t, false, offset);
      });
    });

    const endDrag = (e) => {
      if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;

      const drag = activeDrag;
      activeDrag = null;

      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      drag.affectedTiles.forEach(t => t.el.classList.remove('dragging'));

      const isClick = drag.movedDistance < 8;
      const rawDelta = drag.axis === 'x' ? (e.clientX - drag.startX) : (e.clientY - drag.startY);
      const isCommitted = (rawDelta * drag.dir) > (drag.cellSize * 0.28);

      if (isClick || isCommitted) {
        commitMultiTileShift(drag.affectedTiles, drag.axis, drag.dir);
      } else {
        drag.affectedTiles.forEach(t => renderTileTransform(t, true));
      }
    };

    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  function commitMultiTileShift(affectedTiles, axis, dir) {
    if (affectedTiles.length === 0) return;

    // Desloca em ordem reversa para o vazio
    const ordered = [...affectedTiles].reverse();
    ordered.forEach(t => {
      const targetR = axis === 'y' ? t.row + dir : t.row;
      const targetC = axis === 'x' ? t.col + dir : t.col;

      boardMatrix[targetR][targetC] = t;
      boardMatrix[t.row][t.col] = null;

      t.row = targetR;
      t.col = targetC;
      renderTileTransform(t, true);
    });

    const furthest = affectedTiles[0];
    currentGame.emptyRow = axis === 'y' ? furthest.row - dir : furthest.row;
    currentGame.emptyCol = axis === 'x' ? furthest.col - dir : furthest.col;
    boardMatrix[currentGame.emptyRow][currentGame.emptyCol] = null;

    // 1 ÚNICO movimento contabilizado para o bloco empurrado
    currentGame.moves++;
    gameMovesText.textContent = String(currentGame.moves);

    playSlideSound();
    triggerHaptic(20);

    syncCurrentSnapshot();
    saveActiveSession();

    if (checkBoardSolved()) {
      handleLevelVictory();
    }
  }

  function syncCurrentSnapshot() {
    const size = currentGame.size;
    const snap = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const t = boardMatrix[r][c];
        snap.push(t ? t.value : 0);
      }
    }
    currentGame.currentSnapshot = snap;
  }

  function checkBoardSolved() {
    const size = currentGame.size;
    if (currentGame.emptyRow !== size - 1 || currentGame.emptyCol !== size - 1) {
      return false;
    }
    let expected = 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r === size - 1 && c === size - 1) return true;
        const t = boardMatrix[r][c];
        if (!t || t.value !== expected++) return false;
      }
    }
    return true;
  }

  // ==========================================================================
  // REINICIAR FASE (Retorno exato ao estado determinístico inicial)
  // ==========================================================================

  function restartCurrentLevel() {
    initAudioContext();
    triggerHaptic(25);

    // Restaura o snapshot inicial determinístico da fase
    currentGame.currentSnapshot = [...currentGame.initialSnapshot];
    currentGame.moves = 0;
    currentGame.seconds = 0;

    gameMovesText.textContent = '0';
    gameTimerText.textContent = '00:00';
    gameSubheadTitle.textContent = 'Imagem objetiva';

    isSolved = false;
    isPaused = false;

    buildGameBoard();
    saveActiveSession();
    startTimer();
  }

  // ==========================================================================
  // SISTEMA DE PAUSA
  // ==========================================================================

  function pauseGame() {
    if (isPaused || isSolved) return;
    isPaused = true;
    stopTimer();
    pauseModal.classList.remove('hidden');
    saveActiveSession();
  }

  function resumeGame() {
    if (!isPaused) return;
    isPaused = false;
    pauseModal.classList.add('hidden');
    startTimer();
  }

  function exitGameToMenu() {
    pauseModal.classList.add('hidden');
    stopTimer();
    saveActiveSession();
    switchScreen('menu');
  }

  // ==========================================================================
  // VITÓRIA E RECORDE DETERMINÍSTICO
  // ==========================================================================

  function handleLevelVictory() {
    isSolved = true;
    stopTimer();
    gameSubheadTitle.textContent = 'Fase Concluída!';

    playVictorySound();
    triggerHaptic([40, 60, 80]);

    // Limpa a partida salva, pois foi concluída
    localStorage.removeItem('gridshift_saved_session');
    updateContinueButtonVisibility();

    // Salva recorde da fase
    const size = currentGame.size;
    const diff = currentGame.diff;
    const level = currentGame.level;
    const timeSpent = currentGame.seconds;
    const movesMade = currentGame.moves;

    const prevRecord = getLevelRecord(size, diff, level);
    let isNewTime = false;
    let isNewMoves = false;

    if (!prevRecord || !prevRecord.completed) {
      isNewTime = true;
      isNewMoves = true;
    } else {
      if (timeSpent < prevRecord.bestTime) isNewTime = true;
      if (movesMade < prevRecord.bestMoves) isNewMoves = true;
    }

    const bestTime = (prevRecord && prevRecord.completed) ? Math.min(prevRecord.bestTime, timeSpent) : timeSpent;
    const bestMoves = (prevRecord && prevRecord.completed) ? Math.min(prevRecord.bestMoves, movesMade) : movesMade;

    saveLevelRecord(size, diff, level, {
      completed: true,
      bestTime,
      bestMoves
    });

    // Atualiza modal de vitória
    finalTimeText.textContent = formatTime(timeSpent);
    finalMovesText.textContent = `${movesMade} passos`;

    badgeTimeRecord.classList.toggle('hidden', !isNewTime);
    badgeMovesRecord.classList.toggle('hidden', !isNewMoves);

    const diffObj = DIFFICULTIES.find(d => d.id === diff) || DIFFICULTIES[0];
    victorySubtitle.textContent = `${size}×${size} • Fase ${level} (${diffObj.label})`;
    bestRecordBadge.textContent = `Recorde da Fase: ${formatTime(bestTime)} / ${bestMoves} passos ★`;

    victoryModal.classList.remove('hidden');
  }

  function proceedNextLevel() {
    victoryModal.classList.add('hidden');
    if (selectedLevel < 10) {
      selectedLevel++;
    } else {
      // Se terminou a fase 10, avança de dificuldade
      const currIdx = DIFFICULTIES.findIndex(d => d.id === selectedDiff);
      if (currIdx < DIFFICULTIES.length - 1) {
        selectedDiff = DIFFICULTIES[currIdx + 1].id;
        selectedLevel = 1;
      }
    }
    startSelectedGame(false);
  }

  // ==========================================================================
  // PERSISTÊNCIA EM LOCALSTORAGE
  // ==========================================================================

  function getLevelRecordKey(size, diff, level) {
    return `gridshift_rec_${size}x${size}_${diff}_lvl${level}`;
  }

  function getLevelRecord(size, diff, level) {
    try {
      const data = localStorage.getItem(getLevelRecordKey(size, diff, level));
      return data ? JSON.parse(data) : null;
    } catch (_) { return null; }
  }

  function saveLevelRecord(size, diff, level, recordObj) {
    try {
      localStorage.setItem(getLevelRecordKey(size, diff, level), JSON.stringify(recordObj));
    } catch (_) {}
  }

  function saveActiveSession() {
    if (!currentGame || isSolved) {
      localStorage.removeItem('gridshift_saved_session');
    } else {
      try {
        localStorage.setItem('gridshift_saved_session', JSON.stringify(currentGame));
      } catch (_) {}
    }
  }

  // ==========================================================================
  // QUADRO DE RECORDES
  // ==========================================================================

  let recordFilterSize = 5;

  function renderRecordsModal(size) {
    recordFilterSize = size;
    document.querySelectorAll('.rec-filter').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.recSize, 10) === size);
    });

    recordsListContainer.innerHTML = '';
    let hasAny = false;

    DIFFICULTIES.forEach(d => {
      for (let lvl = 1; lvl <= 10; lvl++) {
        const rec = getLevelRecord(size, d.id, lvl);
        if (rec && rec.completed) {
          hasAny = true;
          const row = document.createElement('div');
          row.className = 'record-item-row';
          row.innerHTML = `
            <span class="record-item-name">Fase ${lvl} • ${d.label}</span>
            <span class="record-item-stats">⏱ ${formatTime(rec.bestTime)}  |  👣 ${rec.bestMoves} mov. ★</span>
          `;
          recordsListContainer.appendChild(row);
        }
      }
    });

    if (!hasAny) {
      recordsListContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 24px 0; font-size: 0.9rem;">
          Nenhum recorde registrado para ${size}×${size} ainda.<br>Complete fases para registrar seus tempos!
        </div>
      `;
    }
  }

  // ==========================================================================
  // CRONÔMETRO
  // ==========================================================================

  function startTimer() {
    stopTimer();
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      if (isPaused || isSolved || !currentGame) return;
      currentGame.seconds++;
      gameTimerText.textContent = formatTime(currentGame.seconds);
      // Salva a cada 5 segundos para persistência segura
      if (currentGame.seconds % 5 === 0) saveActiveSession();
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
    if (totalSecs < 0 || isNaN(totalSecs)) return '00:00';
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ==========================================================================
  // ÁUDIO SINTETIZADO E HÁPTICOS
  // ==========================================================================

  let audioCtx = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) audioCtx = new AudioClass();
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

  function toggleAudio() {
    initAudioContext();
    audioEnabled = !audioEnabled;
    localStorage.setItem('gridshift_audio', audioEnabled);
    updateAudioIcons();
    triggerHaptic(15);
  }

  function updateAudioIcons() {
    document.querySelectorAll('.audio-btn').forEach(btn => {
      const on = btn.querySelector('.sound-on');
      const off = btn.querySelector('.sound-off');
      if (on && off) {
        on.classList.toggle('hidden', !audioEnabled);
        off.classList.toggle('hidden', audioEnabled);
      }
    });
  }

  // ==========================================================================
  // SISTEMA DE TEMAS
  // ==========================================================================

  function applyTheme(themeName) {
    currentTheme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('gridshift_theme', themeName);

    themeOptionButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.setTheme === themeName);
    });
  }

  // ==========================================================================
  // EVENT LISTENERS GLOBAIS
  // ==========================================================================

  // Menu Principal
  btnPlayMenu.addEventListener('click', () => {
    initAudioContext();
    switchScreen('select');
  });

  btnContinueGame.addEventListener('click', () => {
    initAudioContext();
    startSelectedGame(true);
  });

  btnSelectLevel.addEventListener('click', () => {
    initAudioContext();
    switchScreen('select');
  });

  btnOpenRecords.addEventListener('click', () => {
    initAudioContext();
    renderRecordsModal(selectedSize);
    recordsModal.classList.remove('hidden');
  });

  menuThemeBtn.addEventListener('click', () => {
    initAudioContext();
    themeModal.classList.remove('hidden');
  });

  menuAudioBtn.addEventListener('click', toggleAudio);

  // Tela de Seleção
  btnBackToMenu.addEventListener('click', () => {
    initAudioContext();
    switchScreen('menu');
  });

  gridSizePicker.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudioContext();
      gridSizePicker.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = parseInt(btn.dataset.size, 10);
      renderLevelGrid();
      updateLevelSummary();
    });
  });

  diffTierPicker.querySelectorAll('.diff-card').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudioContext();
      diffTierPicker.querySelectorAll('.diff-card').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDiff = btn.dataset.diff;
      renderLevelGrid();
      updateLevelSummary();
    });
  });

  btnStartGame.addEventListener('click', () => {
    initAudioContext();
    startSelectedGame(false);
  });

  // Tela de Jogo
  btnGameBack.addEventListener('click', () => {
    initAudioContext();
    pauseGame();
  });

  btnGameAudio.addEventListener('click', toggleAudio);

  btnPauseGame.addEventListener('click', () => {
    initAudioContext();
    pauseGame();
  });

  if (btnPauseGameBottom) {
    btnPauseGameBottom.addEventListener('click', () => {
      initAudioContext();
      pauseGame();
    });
  }

  btnRestartLevel.addEventListener('click', () => {
    restartCurrentLevel();
  });

  // Modal de Pausa
  btnResumeGame.addEventListener('click', () => {
    initAudioContext();
    resumeGame();
  });

  btnPauseRestart.addEventListener('click', () => {
    pauseModal.classList.add('hidden');
    restartCurrentLevel();
  });

  btnPauseExit.addEventListener('click', () => {
    initAudioContext();
    exitGameToMenu();
  });

  // Modal de Vitória
  btnNextLevel.addEventListener('click', () => {
    initAudioContext();
    proceedNextLevel();
  });

  btnPlayAgain.addEventListener('click', () => {
    victoryModal.classList.add('hidden');
    restartCurrentLevel();
  });

  btnVictoryMenu.addEventListener('click', () => {
    victoryModal.classList.add('hidden');
    switchScreen('menu');
  });

  // Modal de Recordes
  recordsFilterBar.querySelectorAll('.rec-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudioContext();
      const sz = parseInt(btn.dataset.recSize, 10);
      renderRecordsModal(sz);
    });
  });

  btnCloseRecords.addEventListener('click', () => {
    recordsModal.classList.add('hidden');
  });

  // Modal de Temas
  themeOptionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.setTheme);
    });
  });

  btnCloseTheme.addEventListener('click', () => {
    themeModal.classList.add('hidden');
  });

  // ==========================================================================
  // INICIALIZAÇÃO
  // ==========================================================================

  applyTheme(currentTheme);
  updateAudioIcons();
  updateContinueButtonVisibility();
  switchScreen('menu');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let reg of registrations) {
        reg.unregister();
      }
    });
    if (window.caches) {
      caches.keys().then(names => {
        for (let name of names) caches.delete(name);
      });
    }
  }
})();
