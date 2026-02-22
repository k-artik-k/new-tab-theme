// ── ROCKET GAME ── Space Defender (Horizontal / Green Pixel) ──
(function () {
  const overlay = document.getElementById('gameOverlay');
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('gameScore');
  const levelEl = document.getElementById('gameLevel');
  const startScreen = document.getElementById('gameStartScreen');
  const overScreen = document.getElementById('gameOverScreen');
  const finalScoreEl = document.getElementById('finalScore');
  const hudEl = document.getElementById('gameHud');

  let animId, gameState = 'idle', score, level, levelTimer;
  let rocket, bullets, aliens, particles, stars;
  let keys = {};
  let shootCooldown = 0;
  let alienSpawnTimer = 0;
  let alienSpeed, alienSpawnRate, bulletSpeed;
  let highScore = parseInt(localStorage.getItem('rocketHighScore') || '0');

  // ── Single green palette ──
  const G = {
    bg: '#0a0e14',
    bright: '#7fd962',
    mid: '#4d8c3a',
    dim: '#2a5a1e',
    dark: '#1a3a12',
    glow: 'rgba(127,217,98,0.4)',
  };

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ── Star field ──
  function initStars() {
    stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        s: Math.random() * 2 + 1,
        speed: Math.random() * 1.5 + 0.5,
      });
    }
  }

  function drawStars() {
    stars.forEach(s => {
      ctx.fillStyle = G.dim;
      ctx.globalAlpha = 0.3 + Math.random() * 0.2;
      ctx.fillRect(s.x, s.y, s.s, s.s);
      ctx.globalAlpha = 1;
      // Stars scroll left (horizontal movement)
      s.x -= s.speed;
      if (s.x < 0) { s.x = canvas.width; s.y = Math.random() * canvas.height; }
    });
  }

  // ── Pixel helper ──
  function px(x, y, size, color) {
    ctx.fillStyle = color || G.bright;
    ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
  }

  // ── Rocket (pixel art, faces RIGHT) ──
  function initRocket() {
    rocket = {
      x: 60,
      y: canvas.height / 2,
      speed: 5,
    };
  }

  function drawRocket() {
    const bx = Math.floor(rocket.x);
    const by = Math.floor(rocket.y);
    const s = 3; // pixel size

    // Rocket body (facing right) — pixel grid
    const sprite = [
      '     ##    ',
      '   #####   ',
      ' ########  ',
      '##########>',
      '##########>',
      ' ########  ',
      '   #####   ',
      '     ##    ',
    ];

    const ox = bx - 16;
    const oy = by - 12;
    sprite.forEach((row, ry) => {
      [...row].forEach((ch, rx) => {
        if (ch === '#') px(ox + rx * s, oy + ry * s, s, G.bright);
        if (ch === '>') px(ox + rx * s, oy + ry * s, s, G.mid);
      });
    });

    // Engine flame (flickering)
    const flameLen = 4 + Math.floor(Math.random() * 6);
    for (let i = 0; i < flameLen; i++) {
      const fy = by - 3 + Math.floor(Math.random() * 6);
      const fx = ox - i * s - s;
      const c = i < 2 ? G.bright : i < 4 ? G.mid : G.dim;
      if (Math.random() > 0.3) px(fx, fy, s, c);
    }
  }

  function updateRocket() {
    if (keys['ArrowUp'] || keys['w']) rocket.y -= rocket.speed;
    if (keys['ArrowDown'] || keys['s']) rocket.y += rocket.speed;
    if (keys['ArrowLeft'] || keys['a']) rocket.x -= rocket.speed;
    if (keys['ArrowRight'] || keys['d']) rocket.x += rocket.speed;
    rocket.x = Math.max(20, Math.min(canvas.width * 0.4, rocket.x));
    rocket.y = Math.max(20, Math.min(canvas.height - 20, rocket.y));
  }

  // ── Bullets (go RIGHT) ──
  function shoot() {
    if (shootCooldown > 0) return;
    bullets.push({ x: rocket.x + 18, y: rocket.y, w: 8, h: 2 });
    shootCooldown = 8;
  }

  function drawBullets() {
    ctx.shadowColor = G.bright;
    ctx.shadowBlur = 4;
    bullets.forEach(b => {
      px(b.x, b.y - 1, 2, G.bright);
      px(b.x + 2, b.y - 1, 2, G.bright);
      px(b.x + 4, b.y - 1, 2, G.mid);
      px(b.x + 6, b.y - 1, 2, G.dim);
    });
    ctx.shadowBlur = 0;
  }

  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].x += bulletSpeed;
      if (bullets[i].x > canvas.width + 10) bullets.splice(i, 1);
    }
  }

  // ── Aliens (come from RIGHT, pixel art) ──
  const alienSprites = [
    // Type 0: simple
    [' ## ',
     '####',
     '# #',
     '####',
     ' ## '],
    // Type 1: medium
    [' #### ',
     '# ## #',
     '######',
     ' #  # ',
     '######',
     '# ## #',
     ' #### '],
    // Type 2: big
    ['  ####  ',
     ' ###### ',
     '## ## ##',
     '########',
     '# #### #',
     '########',
     '## ## ##',
     ' ###### ',
     '  ####  '],
  ];

  function spawnAlien() {
    const type = level >= 5 ? Math.floor(Math.random() * 3) :
                 level >= 3 ? Math.floor(Math.random() * 2) : 0;
    const hp = type === 2 ? 3 : type === 1 ? 2 : 1;
    const size = type === 2 ? 3 : type === 1 ? 3 : 3;
    const sprite = alienSprites[type];
    const spriteH = sprite.length * size;
    aliens.push({
      x: canvas.width + 20,
      y: Math.random() * (canvas.height - spriteH - 40) + 20,
      type,
      hp,
      maxHp: hp,
      size,
      vx: -(alienSpeed + Math.random() * 0.5),
      vy: (Math.random() - 0.5) * 1.5,
      hitbox: spriteH * 0.45,
      sprite,
    });
  }

  function drawAliens() {
    aliens.forEach(a => {
      const ax = Math.floor(a.x);
      const ay = Math.floor(a.y);
      const s = a.size;
      const color = a.hp === a.maxHp ? G.bright :
                    a.hp > 1 ? G.mid : G.dim;

      a.sprite.forEach((row, ry) => {
        [...row].forEach((ch, rx) => {
          if (ch === '#') px(ax + rx * s, ay + ry * s, s, color);
        });
      });

      // Health bar for multi-hp
      if (a.maxHp > 1) {
        const bw = a.sprite[0].length * s;
        ctx.fillStyle = G.dark;
        ctx.fillRect(ax, ay - 5, bw, 2);
        ctx.fillStyle = G.bright;
        ctx.fillRect(ax, ay - 5, bw * (a.hp / a.maxHp), 2);
      }
    });
  }

  function updateAliens() {
    alienSpawnTimer++;
    if (alienSpawnTimer >= alienSpawnRate) {
      spawnAlien();
      alienSpawnTimer = 0;
    }

    for (let i = aliens.length - 1; i >= 0; i--) {
      const a = aliens[i];
      a.x += a.vx;
      a.y += a.vy;
      // Bounce vertically
      if (a.y < 10 || a.y > canvas.height - 40) a.vy *= -1;

      // Passed left edge = game over
      if (a.x < -30) {
        gameOver();
        return;
      }

      // Collision with rocket
      const cx = a.x + (a.sprite[0].length * a.size) / 2;
      const cy = a.y + (a.sprite.length * a.size) / 2;
      const dx = cx - rocket.x;
      const dy = cy - rocket.y;
      if (Math.sqrt(dx * dx + dy * dy) < a.hitbox + 12) {
        gameOver();
        return;
      }
    }
  }

  // ── Collisions ──
  function checkCollisions() {
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ai = aliens.length - 1; ai >= 0; ai--) {
        const a = aliens[ai];
        const cx = a.x + (a.sprite[0].length * a.size) / 2;
        const cy = a.y + (a.sprite.length * a.size) / 2;
        const dx = b.x - cx;
        const dy = b.y - cy;
        if (Math.sqrt(dx * dx + dy * dy) < a.hitbox + 4) {
          bullets.splice(bi, 1);
          a.hp--;
          if (a.hp <= 0) {
            spawnParticles(cx, cy);
            aliens.splice(ai, 1);
            score += a.maxHp * 10;
            scoreEl.textContent = `SCORE: ${score}`;
          }
          break;
        }
      }
    }
  }

  // ── Particles (all green) ──
  function spawnParticles(x, y) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 20,
        maxLife: 45,
        size: Math.random() * 4 + 2,
      });
    }
  }

  function drawParticles() {
    particles.forEach(p => {
      const t = p.life / p.maxLife;
      ctx.fillStyle = t > 0.6 ? G.bright : t > 0.3 ? G.mid : G.dim;
      ctx.globalAlpha = t;
      px(p.x, p.y, p.size, ctx.fillStyle);
    });
    ctx.globalAlpha = 1;
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ── Difficulty ──
  function updateDifficulty() {
    levelTimer++;
    if (levelTimer >= 600) {
      level++;
      levelTimer = 0;
      levelEl.textContent = `LEVEL: ${level}`;
      alienSpeed = 1.5 + level * 0.3;
      alienSpawnRate = Math.max(15, 55 - level * 5);
      bulletSpeed = 9 + level * 0.3;
      rocket.speed = 5 + level * 0.15;
    }
  }

  // ── Game loop ──
  function gameLoop() {
    ctx.fillStyle = G.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawStars();
    updateRocket();
    updateBullets();
    updateAliens();
    checkCollisions();
    updateParticles();
    updateDifficulty();

    if (shootCooldown > 0) shootCooldown--;
    if (keys[' '] || keys['Space']) shoot();

    drawBullets();
    drawAliens();
    drawRocket();
    drawParticles();

    if (gameState === 'playing') {
      animId = requestAnimationFrame(gameLoop);
    }
  }

  // ── Game states ──
  function resetGame() {
    score = 0;
    level = 1;
    levelTimer = 0;
    alienSpeed = 1.5;
    alienSpawnRate = 55;
    bulletSpeed = 9;
    alienSpawnTimer = 0;
    shootCooldown = 0;
    bullets = [];
    aliens = [];
    particles = [];
    scoreEl.textContent = 'SCORE: 0';
    levelEl.textContent = 'LEVEL: 1';
    resize();
    initStars();
    initRocket();
  }

  function play() {
    gameState = 'playing';
    startScreen.style.display = 'none';
    overScreen.style.display = 'none';
    hudEl.style.display = 'flex';
    resetGame();
    animId = requestAnimationFrame(gameLoop);
  }

  function gameOver() {
    gameState = 'over';
    cancelAnimationFrame(animId);
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('rocketHighScore', String(highScore));
    }
    finalScoreEl.textContent = `SCORE: ${score}  |  BEST: ${highScore}`;
    overScreen.style.display = 'flex';
  }

  function exitGame() {
    gameState = 'idle';
    cancelAnimationFrame(animId);
    overlay.style.display = 'none';
    keys = {};
    document.getElementById('cmdInput').focus();
  }

  // ── Input ──
  function onKeyDown(e) {
    if (gameState === 'idle') return;
    e.preventDefault();
    keys[e.key] = true;

    if (e.key === 'Escape') { exitGame(); return; }

    if (e.key === ' ') {
      if (gameState === 'start') play();
      else if (gameState === 'over') play();
    }
  }

  function onKeyUp(e) {
    if (gameState === 'idle') return;
    keys[e.key] = false;
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // ── Public API ──
  window.startGame = function () {
    overlay.style.display = 'flex';
    gameState = 'start';
    startScreen.style.display = 'flex';
    overScreen.style.display = 'none';
    hudEl.style.display = 'none';
    resize();
    initStars();
    ctx.fillStyle = G.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStars();
  };

  window.exitGame = exitGame;

  window.addEventListener('resize', () => {
    if (gameState !== 'idle') resize();
  });
})();
