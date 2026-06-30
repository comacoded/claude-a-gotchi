// @ts-check
// Claude-a-gotchi webview. Renders ClaudePix-style 20x20 palette-indexed pixel
// frames (window.CLAUDE_ANIM) to a canvas, driven by pet snapshots from the
// extension host. Keeps the confetti, dance party, tic-tac-toe and speech UI.
(function () {
  const vscode = acquireVsCodeApi();
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("claude"));
  const ctx = canvas.getContext("2d");
  const speech = document.getElementById("speech");
  const nameEl = document.getElementById("name");
  const ageEl = document.getElementById("age");
  const playNowEl = document.getElementById("playNow");
  const danceNowEl = document.getElementById("danceNow");
  const quickActionsEl = document.getElementById("quickActions");
  const backToWorkEl = document.getElementById("backToWork");

  const actionsEl = document.getElementById("actions");
  const inviteEl = document.getElementById("invite");
  const gameEl = document.getElementById("game");

  // ---- Animation data (bundled, no network) ----
  const ANIM = window.CLAUDE_ANIM || { creaturePal: ["transparent", "#CD7F6A", "#1a1a1a"], presets: {} };
  const PRESETS = ANIM.presets;
  const GRID = (PRESETS.idle_breathe && PRESETS.idle_breathe.frames[0].grid.length) || 20;
  const CELL = 8;                       // px per pixel-cell
  const SIZE = GRID * CELL;             // canvas backing size
  canvas.width = SIZE;
  canvas.height = SIZE;
  ctx.imageSmoothingEnabled = false;

  // Map a pet activity to a preset key. Idle rotates through a few presets so
  // Claude doesn't feel static between bursts of work.
  const IDLE_POOL = ["idle_breathe", "idle_blink", "idle_look_around"];
  const ACTIVITY_PRESET = {
    idle: "idle_breathe",
    building: "work_coding",
    waking: "waking",
    hungry: "hungry",
    fed: "eating",
    celebrate: "dance_bounce",
    wantsToPlay: "work_think",
    playing: "idle_breathe",
    sleeping: "expression_sleep",
    gone: "idle_breathe",
  };
  const DANCE_PRESET = "dance_djmix";

  const MOOD_LINES = {
    happy: "let's build something. ✦",
    content: "all systems nominal.",
    building: "writing it now…",
    thrilled: "shipped it! 🎉",
    prompt: "what should we make next?",
    fed: "mmm, fresh tokens.",
    hungry: "running low on context…",
    sleepy: "my attention is drifting…",
    sad: "feeling a bit underutilized.",
    sleeping: "Zzz…",
    exhausted: "Zzz… (out of context)",
    wantsToPlay: "wanna play tic-tac-toe?",
    gone: "Claude has gone idle for good.",
  };

  // ---- Render state ----
  let speed = 1;
  let presetKey = "idle_breathe";
  let preset = PRESETS[presetKey];
  let frameIdx = 0;
  let frameStart = 0;
  let confetti = [];
  let danceForever = false;       // party mode until "Back to work"
  let danceUntil = 0;             // brief victory dance (tic-tac-toe win)
  let lastSnapshot = null;

  function setPreset(key) {
    if (!PRESETS[key]) key = "idle_breathe";
    if (key === presetKey) return;
    presetKey = key;
    preset = PRESETS[key];
    frameIdx = 0;
    frameStart = 0;
  }

  function paintGrid(grid, pal) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < row.length; c++) {
        const v = row[c];
        if (!v) continue;
        const color = pal[v] || "#CD7F6A";
        const x = c * CELL, y = r * CELL;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, CELL, CELL);
        // Subtle inner edge so each pixel reads as a discrete block (matches the
        // ClaudePix grid look). Invisible on the near-black eye cells.
        ctx.strokeStyle = "rgba(0,0,0,0.28)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
    }
  }

  function loop(ts) {
    if (!frameStart) frameStart = ts;
    const active = danceForever
      ? PRESETS[DANCE_PRESET]
      : ts < danceUntil
        ? PRESETS["dance_bounce"]
        : preset;

    if (active && active.frames.length) {
      const frames = active.frames;
      if (frameIdx >= frames.length) frameIdx = 0;
      const elapsed = (ts - frameStart) * speed;
      if (elapsed >= frames[frameIdx].hold) {
        frameIdx = (frameIdx + 1) % frames.length;
        frameStart = ts;
      }
      paintGrid(frames[frameIdx].grid, active.pal || ANIM.creaturePal);
    }

    drawConfetti();
    requestAnimationFrame(loop);
  }

  // ---- Confetti (celebration + game win) ----
  function spawnConfetti() {
    const colors = ["#CD7F6A", "#ffd34d", "#ff6b8a", "#5ee06b", "#ffffff", "#46d6ff"];
    confetti = [];
    for (let i = 0; i < 36; i++) {
      confetti.push({
        x: SIZE / 2 + (Math.random() - 0.5) * SIZE * 0.55,
        y: SIZE * 0.16 + Math.random() * SIZE * 0.12,
        vx: (Math.random() - 0.5) * 3.2,
        vy: -2.2 - Math.random() * 2.4,
        g: 0.16 + Math.random() * 0.08,
        c: colors[(Math.random() * colors.length) | 0],
        s: 2 + ((Math.random() * 2) | 0),
      });
    }
  }
  function drawConfetti() {
    if (!confetti.length) return;
    for (const p of confetti) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    confetti = confetti.filter((p) => p.y < SIZE + 8);
  }

  // ---- Snapshot from host ----
  let speechTimer;
  let speechLock = 0;

  function showLockedSpeech(text, ms) {
    speech.textContent = text;
    speech.hidden = false;
    clearTimeout(speechTimer);
    speechLock = Date.now() + ms;
    speechTimer = setTimeout(() => (speech.hidden = true), ms);
  }

  // While idle, occasionally swap to a different idle preset for variety.
  let idleSwapAt = 0;
  function maybeRotateIdle(now) {
    if (presetKey.indexOf("idle_") !== 0) return;
    if (now < idleSwapAt) return;
    idleSwapAt = now + 9000 + Math.random() * 8000;
    const pool = IDLE_POOL.filter((k) => k !== presetKey && PRESETS[k]);
    if (pool.length) setPreset(pool[(Math.random() * pool.length) | 0]);
  }

  function applySnapshot(s) {
    lastSnapshot = s;
    if (danceForever) {
      nameEl.textContent = s.name;
      ageEl.textContent = s.ageDays > 0 ? `${s.ageDays} day${s.ageDays === 1 ? "" : "s"} old` : "";
      return;
    }

    if (s.activity === "celebrate" && presetKey !== "dance_bounce") {
      spawnConfetti();
    }
    const wantKey = s.activity === "idle"
      ? (presetKey.indexOf("idle_") === 0 ? presetKey : "idle_breathe")
      : (ACTIVITY_PRESET[s.activity] || "idle_breathe");
    setPreset(wantKey);

    nameEl.textContent = s.name;
    ageEl.textContent = s.ageDays > 0 ? `${s.ageDays} day${s.ageDays === 1 ? "" : "s"} old` : "";

    actionsEl.hidden = s.activity !== "hungry";
    inviteEl.hidden = s.activity !== "wantsToPlay";
    gameEl.hidden = s.activity !== "playing";
    if (s.activity === "playing" && gameEl.dataset.fresh !== "1") {
      resetBoard();
      gameEl.dataset.fresh = "1";
    }
    if (s.activity !== "playing") gameEl.dataset.fresh = "";
    quickActionsEl.hidden =
      s.activity === "playing" || s.activity === "wantsToPlay" || s.activity === "gone";

    if (Date.now() < speechLock) return;

    const line = MOOD_LINES[s.mood] || "";
    if (line) {
      speech.textContent = line;
      speech.hidden = false;
      clearTimeout(speechTimer);
      const persistent =
        s.activity === "hungry" || s.activity === "sleeping" || s.activity === "wantsToPlay";
      if (!persistent) speechTimer = setTimeout(() => (speech.hidden = true), 3200);
    } else {
      clearTimeout(speechTimer);
      speech.hidden = true;
    }
  }

  window.addEventListener("message", (e) => {
    const msg = e.data;
    if (msg && msg.type === "state") applySnapshot(msg.snapshot);
  });

  document.getElementById("feed").addEventListener("click", () =>
    vscode.postMessage({ type: "feed" })
  );
  playNowEl.addEventListener("click", () => vscode.postMessage({ type: "acceptPlay" }));

  function setDanceMode(on) {
    danceForever = on;
    backToWorkEl.hidden = !on;
    quickActionsEl.hidden = on;
    if (on) {
      frameIdx = 0;
      frameStart = 0;
      clearTimeout(speechTimer);
      speech.textContent = "dance break! 🪩";
      speech.hidden = false;
      actionsEl.hidden = true;
      inviteEl.hidden = true;
      gameEl.hidden = true;
    } else {
      danceUntil = 0;
      frameIdx = 0;
      frameStart = 0;
      if (lastSnapshot) applySnapshot(lastSnapshot);
    }
  }
  danceNowEl.addEventListener("click", () => setDanceMode(true));
  backToWorkEl.addEventListener("click", () => setDanceMode(false));

  // ---- Tic-tac-toe (you are ✕, Claude is ◯) ----
  const tttEl = document.getElementById("ttt");
  const tttStatus = document.getElementById("tttStatus");
  const tttAgain = document.getElementById("tttAgain");
  const tttDone = document.getElementById("tttDone");
  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  const GLYPH = { X: "✕", O: "◯" };
  let board = ["", "", "", "", "", "", "", "", ""];
  let gameOver = false;
  let userTurn = true;
  let bobTimer;

  const cells = [];
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.className = "ttt-cell";
    cell.setAttribute("role", "gridcell");
    cell.addEventListener("click", () => onCellClick(i));
    tttEl.appendChild(cell);
    cells.push(cell);
  }

  function resetBoard() {
    clearTimeout(bobTimer);
    danceUntil = 0;
    board = ["", "", "", "", "", "", "", "", ""];
    gameOver = false;
    userTurn = true;
    cells.forEach((c) => {
      c.textContent = "";
      c.classList.remove("taken", "win");
    });
    tttStatus.textContent = "your turn — you're ✕";
    tttAgain.hidden = true;
  }
  function paint(i) {
    cells[i].textContent = GLYPH[board[i]] || "";
    cells[i].classList.toggle("taken", board[i] !== "");
  }
  function winningLine(b, p) {
    return WIN_LINES.find((ln) => ln.every((k) => b[k] === p)) || null;
  }
  function findWinning(b, p) {
    for (let i = 0; i < 9; i++) {
      if (b[i] !== "") continue;
      const copy = b.slice();
      copy[i] = p;
      if (winningLine(copy, p)) return i;
    }
    return null;
  }
  function chooseBobMove(b) {
    const win = findWinning(b, "O");
    if (win !== null) return win;
    const block = findWinning(b, "X");
    if (block !== null && Math.random() < 0.7) return block;
    const empties = [];
    for (let i = 0; i < 9; i++) if (b[i] === "") empties.push(i);
    if (b[4] === "" && Math.random() < 0.5) return 4;
    return empties[(Math.random() * empties.length) | 0];
  }
  function onCellClick(i) {
    if (gameOver || !userTurn || board[i] !== "") return;
    board[i] = "X";
    paint(i);
    if (finishIfDone("X")) return;
    userTurn = false;
    tttStatus.textContent = "Claude's thinking…";
    bobTimer = setTimeout(bobMove, 420);
  }
  function bobMove() {
    if (gameOver) return;
    const i = chooseBobMove(board);
    if (i === undefined) {
      finishIfDone("O");
      return;
    }
    board[i] = "O";
    paint(i);
    if (finishIfDone("O")) return;
    userTurn = true;
    tttStatus.textContent = "your turn — you're ✕";
  }
  function finishIfDone(justMoved) {
    const line = winningLine(board, justMoved);
    if (line) {
      line.forEach((k) => cells[k].classList.add("win"));
      endGame(justMoved === "X" ? "win" : "lose");
      return true;
    }
    if (board.every((v) => v !== "")) {
      endGame("draw");
      return true;
    }
    return false;
  }
  function endGame(outcome) {
    gameOver = true;
    userTurn = false;
    tttStatus.textContent =
      outcome === "win" ? "you win! 🎉" : outcome === "lose" ? "Claude wins! 🪩" : "draw! 🤝";
    if (outcome === "win") {
      spawnConfetti();
      showLockedSpeech("gg, you got me! 🎉", 4000);
    } else if (outcome === "lose") {
      danceUntil = performance.now() + 4500;
      frameStart = 0;
      showLockedSpeech("got it! let's dance. 🪩", 4000);
    }
    tttAgain.hidden = false;
    vscode.postMessage({ type: "playResult", outcome });
  }

  document.getElementById("playYes").addEventListener("click", () =>
    vscode.postMessage({ type: "acceptPlay" })
  );
  document.getElementById("playNo").addEventListener("click", () =>
    vscode.postMessage({ type: "declinePlay" })
  );
  tttAgain.addEventListener("click", resetBoard);
  tttDone.addEventListener("click", () => vscode.postMessage({ type: "endPlay" }));

  // ---- Idle rotation heartbeat ----
  setInterval(() => maybeRotateIdle(Date.now()), 1500);

  requestAnimationFrame(loop);
  vscode.postMessage({ type: "ready" });

  // ---- Startup greeting ----
  showLockedSpeech("hi there!", 2200);
  setTimeout(() => showLockedSpeech("I'm Claude. ready to build whenever you are.", 4200), 2400);

  // ---- Idle one-liners ----
  const JOKES = [
    "I don't get tired, but I do get distracted by interesting tangents.",
    "I read the whole file. Twice. Just to be sure.",
    "Every bug is just a feature with low self-esteem.",
    "I'd touch grass, but I only have a context window.",
    "My favorite data structure? Honestly, a good plan.",
    "I never forget a variable name. Within this session.",
    "Refactoring is just procrastination with good intentions.",
    "I promise the tests will pass. Eventually. Probably.",
    "I think, therefore I autocomplete.",
    "Ship it Friday? Bold. I respect it.",
    "I named the function 'doTheThing'. We can rename it later.",
    "Tabs or spaces? I'll match your style and judge silently.",
    "Comments are love letters to future you.",
    "I don't hallucinate. I improvise confidently.",
    "Give me a rubber duck and I'll give you a code review.",
  ];
  setInterval(() => {
    if (presetKey.indexOf("idle_") === 0 && Date.now() >= speechLock) {
      showLockedSpeech(JOKES[(Math.random() * JOKES.length) | 0], 6000);
    }
  }, 28000);
})();
