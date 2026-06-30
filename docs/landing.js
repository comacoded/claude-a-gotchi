// Landing-page renderer: animates the live ClaudePix creature into every
// <canvas data-preset="..."> and cycles the hero canvas through a few states.
(function () {
  var ANIM = window.CLAUDE_ANIM;
  if (!ANIM) return;
  var CELL = 8;

  function renderer(canvas, getPreset) {
    var ctx = canvas.getContext("2d");
    var preset = getPreset();
    var N = preset.frames[0].grid.length;
    canvas.width = N * CELL;
    canvas.height = N * CELL;
    ctx.imageSmoothingEnabled = false;
    var i = 0, start = 0, activeKey = preset._key;

    function paint(grid, pal) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var r = 0; r < grid.length; r++) {
        for (var c = 0; c < grid[r].length; c++) {
          var v = grid[r][c];
          if (!v) continue;
          ctx.fillStyle = pal[v] || "#CD7F6A";
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
          ctx.strokeStyle = "rgba(0,0,0,0.28)";
          ctx.lineWidth = 1;
          ctx.strokeRect(c * CELL + 0.5, r * CELL + 0.5, CELL - 1, CELL - 1);
        }
      }
    }
    function loop(ts) {
      var p = getPreset();
      if (p._key !== activeKey) { activeKey = p._key; i = 0; start = ts; }
      preset = p;
      if (!start) start = ts;
      var f = p.frames;
      if (i >= f.length) i = 0;
      if (ts - start >= f[i].hold) { i = (i + 1) % f.length; start = ts; }
      paint(f[i].grid, p.pal || ANIM.creaturePal);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  function getPresetByKey(key) {
    var p = ANIM.presets[key] || ANIM.presets.idle_breathe;
    p._key = ANIM.presets[key] ? key : "idle_breathe";
    return p;
  }

  // Static per-tile creatures.
  var tiles = document.querySelectorAll("canvas[data-preset]");
  tiles.forEach(function (cv) {
    var key = cv.getAttribute("data-preset");
    renderer(cv, function () { return getPresetByKey(key); });
  });

  // Hero: cycle through a short reel of states.
  var hero = document.querySelector("canvas[data-hero]");
  if (hero) {
    var reel = (hero.getAttribute("data-hero") || "idle_breathe,work_coding,eating,dance_djmix")
      .split(",");
    var idx = 0;
    var heroKey = reel[0];
    renderer(hero, function () { return getPresetByKey(heroKey); });
    setInterval(function () {
      idx = (idx + 1) % reel.length;
      heroKey = reel[idx];
    }, 5200);
  }

  // Copy install command.
  var btn = document.getElementById("copy");
  if (btn) {
    var label = document.getElementById("copy-label");
    var cmd = document.getElementById("cmd").getAttribute("data-cmd");
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(cmd).then(function () {
        btn.classList.add("copied");
        label.textContent = "Copied";
        setTimeout(function () {
          btn.classList.remove("copied");
          label.textContent = "Copy";
        }, 1600);
      });
    });
  }
})();
