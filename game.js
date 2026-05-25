(function () {
  const overlay = document.getElementById('gameOverlay');
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('gameScore');
  const levelEl = document.getElementById('gameLevel');
  const startScreen = document.getElementById('gameStartScreen');
  const overScreen = document.getElementById('gameOverScreen');
  const winScreen = document.getElementById('gameWinScreen');
  const finalScoreEl = document.getElementById('finalScore');
  const winScoreEl = document.getElementById('winScore');
  const hudEl = document.getElementById('gameHud');
  const healthBar = document.getElementById('healthBar');
  const healthFill = document.getElementById('healthFill');
  const bossBar = document.getElementById('bossBar');
  const bossFill = document.getElementById('bossFill');
  const leaderboardEl = document.getElementById('gameLeaderboard');
  const winLeaderboardEl = document.getElementById('winLeaderboard');
  const titleEl = document.querySelector('.game-title');
  const subtitleEl = document.getElementById('gameSubtitle');
  const controls1El = document.getElementById('gameControlsLine1');
  const controls2El = document.getElementById('gameControlsLine2');

  const C = {
    bg: '#0a0e14',
    white: '#e8e8e8',
    cream: '#f5f0e0',
    green: '#7fd962',
    blue: '#59c2ff',
    red: '#f07178',
    yellow: '#e6b450',
    cyan: '#95e6cb',
    dim: '#565b66',
    dark: '#1e2630',
  };

  let animId = null;
  let mode = 'chicken';
  let state = 'idle';
  let keys = {};
  let mouseX = 0;
  let mouseY = 0;
  let mouseActive = false;

  let score = 0;
  let wave = 1;
  let chicken;
  let bullets = [];
  let enemies = [];
  let enemyShots = [];
  let particles = [];
  let stars = [];
  let shootCooldown = 0;
  let spawnTimer = 0;
  let bossSpawned = false;
  let enemiesKilled = 0;
  let chickenDifficulty = 'medium';
  let chickenRules = null;
  const CHICKEN_DIFFICULTY = {
    easy: { hp: 12, speed: 5.8, waveKills: [8, 12, 0], spawn: 1.28, enemySpeed: 0.78, fire: 1.55, bossHp: 65, bossFire: 1.45, playerCooldown: 8, shotSpeed: 13.5, hardLock: false },
    medium: { hp: 8, speed: 5.4, waveKills: [10, 16, 0], spawn: 1, enemySpeed: 1, fire: 1, bossHp: 90, bossFire: 1, playerCooldown: 9, shotSpeed: 12.5, hardLock: false },
    hard: { hp: 3, speed: 5.1, waveKills: [14, 24, 0], spawn: 0.55, enemySpeed: 1.7, fire: 0.36, bossHp: 9999, bossFire: 0.24, playerCooldown: 13, shotSpeed: 11.2, hardLock: true },
  };

  let arcade = null;

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }

  function cancelLoop() {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
  }

  function clearCanvas() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function px(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
  }

  function drawText(text, x, y, size = 16, color = C.cyan, align = 'center') {
    ctx.fillStyle = color;
    ctx.font = `${size}px JetBrains Mono, monospace`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  function hideScreens() {
    startScreen.style.display = 'none';
    overScreen.style.display = 'none';
    winScreen.style.display = 'none';
  }

  function setGameIntro(gameMode) {
    const labels = {
      chicken: ['CHICKEN', 'DEFENDER', 'WASD / arrows move, SPACE / right-click shoot', 'choose /game chicken easy|medium|hard'],
      snake: ['SNAKE', 'CLASSIC', 'arrows / WASD to turn', 'eat blocks, avoid walls and yourself'],
      pacman: ['PACMAN', 'MAZE RUN', 'arrows / WASD to move', 'pellets, power pills, ghosts, tunnels'],
      tetris: ['TETRIS', 'BLOCK STACK', 'arrows move, UP rotate, SPACE drop', 'clear lines before the stack reaches top'],
    };
    const data = labels[gameMode] || labels.chicken;
    titleEl.textContent = `\n${data[0]}\n`;
    subtitleEl.textContent = data[1];
    controls1El.textContent = data[2];
    controls2El.textContent = data[3];
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < 70; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        s: Math.random() * 2 + 1,
        sp: Math.random() * 0.7 + 0.2,
      });
    }
  }

  function drawStars() {
    stars.forEach(star => {
      ctx.globalAlpha = 0.25 + Math.random() * 0.2;
      px(star.x, star.y, star.s, C.dark);
      ctx.globalAlpha = 1;
      star.x -= star.sp;
      if (star.x < 0) {
        star.x = canvas.width;
        star.y = Math.random() * canvas.height;
      }
    });
  }

  const chickenSprite = [
    '   WW   ',
    '  WWWW  ',
    '  WOOW  ',
    ' WWWWWW ',
    'WWWWWWWG',
    'WWWWWWGG',
    ' WWWWWG ',
    ' WW  WW ',
    '  Y  Y  ',
  ];

  function drawSprite(sprite, x, y, scale, colors) {
    sprite.forEach((row, ry) => {
      row.split('').forEach((ch, rx) => {
        if (colors[ch]) px(x + rx * scale, y + ry * scale, scale, colors[ch]);
      });
    });
  }

  function spriteSize(sprite, scale) {
    return { w: sprite[0].length * scale, h: sprite.length * scale };
  }

  function initChicken() {
    chicken = {
      x: 105,
      y: canvas.height / 2,
      speed: chickenRules.speed,
      hp: chickenRules.hp,
      maxHp: chickenRules.hp,
      iframes: 0,
      radius: 26,
      scale: 5,
    };
  }

  function drawChicken() {
    const size = spriteSize(chickenSprite, chicken.scale);
    const x = Math.floor(chicken.x - size.w / 2);
    const y = Math.floor(chicken.y - size.h / 2);
    drawSprite(chickenSprite, x, y, chicken.scale, {
      W: C.white,
      O: C.bg,
      Y: C.yellow,
      G: '#888888',
    });
    if (chicken.iframes > 0 && Math.floor(chicken.iframes / 4) % 2 === 0) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = C.red;
      ctx.fillRect(x, y, size.w, size.h);
      ctx.globalAlpha = 1;
    }
  }

  function updateChicken() {
    let dx = 0;
    let dy = 0;
    if (keys.ArrowUp || keys.w || keys.W) dy = -1;
    if (keys.ArrowDown || keys.s || keys.S) dy = 1;
    if (keys.ArrowLeft || keys.a || keys.A) dx = -1;
    if (keys.ArrowRight || keys.d || keys.D) dx = 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      chicken.x += dx / len * chicken.speed;
      chicken.y += dy / len * chicken.speed;
      mouseActive = false;
    }
    if (mouseActive) {
      const dxm = mouseX - chicken.x;
      const dym = mouseY - chicken.y;
      const dist = Math.hypot(dxm, dym);
      if (dist > 8) {
        chicken.x += dxm / dist * chicken.speed;
        chicken.y += dym / dist * chicken.speed;
      }
    }
    chicken.x = Math.max(34, Math.min(canvas.width * 0.42, chicken.x));
    chicken.y = Math.max(34, Math.min(canvas.height - 34, chicken.y));
    if (chicken.iframes > 0) chicken.iframes--;
  }

  function shootChicken() {
    if (shootCooldown > 0) return;
    bullets.push({ x: chicken.x + 26, y: chicken.y - 4, w: 12, h: 7, speed: chickenRules.shotSpeed });
    shootCooldown = chickenRules.playerCooldown;
  }

  function drawBullets() {
    bullets.forEach(b => {
      px(b.x, b.y, 4, C.white);
      px(b.x + 4, b.y - 1, 4, C.cream);
      px(b.x + 8, b.y, 4, C.cream);
    });
  }

  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].x += bullets[i].speed;
      if (bullets[i].x > canvas.width + 30) bullets.splice(i, 1);
    }
  }

  const birdSmall = [
    '  ##  ',
    ' #### ',
    '##OO##',
    ' #### ',
    '  ##  ',
  ];
  const birdMed = [
    '  ####  ',
    ' ###### ',
    '##OO####',
    '########',
    ' ###### ',
    '  ####  ',
  ];
  const bossSprite = [
    '    ########    ',
    '  ############  ',
    ' ####OO######## ',
    '################',
    '################',
    ' ############## ',
    '  ############  ',
    '   ##########   ',
    '    ########    ',
    '     ######     ',
  ];

  function spawnEnemy() {
    let enemy;
    if (wave === 3 && !bossSpawned) {
      bossSpawned = true;
      enemy = {
        type: 'boss',
        hp: chickenRules.bossHp,
        maxHp: chickenRules.bossHp,
        sprite: bossSprite,
        color: C.red,
        scale: 8,
        x: canvas.width + 140,
        y: canvas.height * 0.5 - 70,
        vx: -1.2 * chickenRules.enemySpeed,
        vy: 0,
        shootRate: Math.max(8, 36 * chickenRules.bossFire),
        shootTimer: 50,
        hitbox: 74,
      };
      bossBar.style.display = 'block';
    } else if (wave === 3) {
      return;
    } else {
      const blue = wave === 2 && Math.random() < 0.45;
      const sprite = blue ? birdMed : birdSmall;
      const scale = blue ? 5 : 5;
      const size = spriteSize(sprite, scale);
      enemy = {
        type: blue ? 'blue' : 'green',
        hp: blue ? 3 : 1,
        maxHp: blue ? 3 : 1,
        sprite,
        color: blue ? C.blue : C.green,
        scale,
        x: canvas.width + 40,
        y: Math.random() * Math.max(40, canvas.height - size.h - 80) + 40,
        vx: -(2.1 + Math.random() * 1.4) * chickenRules.enemySpeed,
        vy: (Math.random() - 0.5) * 1.7 * chickenRules.enemySpeed,
        shootRate: (blue ? 105 : 155) * chickenRules.fire,
        shootTimer: 60 + Math.random() * 100,
        hitbox: blue ? 27 : 22,
      };
    }
    enemies.push(enemy);
  }

  function enemyCenter(enemy) {
    const size = spriteSize(enemy.sprite, enemy.scale);
    return { x: enemy.x + size.w / 2, y: enemy.y + size.h / 2, w: size.w, h: size.h };
  }

  function drawEnemies() {
    enemies.forEach(enemy => {
      const col = enemy.hp > enemy.maxHp * 0.45 ? enemy.color : C.dim;
      drawSprite(enemy.sprite, Math.floor(enemy.x), Math.floor(enemy.y), enemy.scale, {
        '#': col,
        O: enemy.type === 'boss' ? C.white : C.bg,
      });
      if (enemy.type === 'boss') bossFill.style.width = `${enemy.hp / enemy.maxHp * 100}%`;
    });
  }

  function fireEnemyShot(enemy) {
    const c = enemyCenter(enemy);
    const dx = chicken.x - c.x;
    const dy = chicken.y - c.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const speed = (enemy.type === 'boss' ? 5.2 : 4.2) * (chickenDifficulty === 'hard' ? 1.38 : 1);
    enemyShots.push({
      x: c.x,
      y: c.y,
      vx: dx / len * speed,
      vy: dy / len * speed,
      r: enemy.type === 'boss' ? 7 : 5,
      damage: enemy.type === 'boss' ? (chickenDifficulty === 'easy' ? 1 : 2) : 1,
      color: enemy.type === 'boss' ? C.red : C.yellow,
    });
  }

  function damageChicken(amount) {
    if (chicken.iframes > 0) return;
    chicken.hp -= amount;
    chicken.iframes = 42;
    updateHealthBar();
    if (chicken.hp <= 0) gameOver();
  }

  function updateEnemies() {
    spawnTimer++;
    const rate = wave === 3 ? 9999 : Math.max(16, (wave === 2 ? 46 : 62) * chickenRules.spawn);
    if (spawnTimer >= rate) {
      spawnEnemy();
      spawnTimer = 0;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      const size = spriteSize(enemy.sprite, enemy.scale);

      if (enemy.type === 'boss') {
        const stopX = canvas.width - size.w - 70;
        if (enemy.x > stopX) enemy.x += enemy.vx;
        else {
          enemy.x = stopX;
          enemy.y += Math.sin(Date.now() / 260) * 1.7;
        }
      } else {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        if (enemy.y < 20 || enemy.y > canvas.height - size.h - 20) enemy.vy *= -1;
      }

      if (enemy.x < -size.w - 50) {
        enemies.splice(i, 1);
        continue;
      }

      enemy.shootTimer--;
      if (enemy.x < canvas.width - 20 && enemy.x > 0 && enemy.shootTimer <= 0) {
        fireEnemyShot(enemy);
        enemy.shootTimer = enemy.shootRate + Math.random() * 45 * chickenRules.fire;
      }

      const c = enemyCenter(enemy);
      if (Math.hypot(c.x - chicken.x, c.y - chicken.y) < enemy.hitbox + chicken.radius && chicken.iframes <= 0) {
        damageChicken(enemy.type === 'boss' ? 2 : 1);
        if (enemy.type !== 'boss') {
          spawnParticles(c.x, c.y, enemy.color);
          enemies.splice(i, 1);
        }
      }
    }
  }

  function drawEnemyShots() {
    enemyShots.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function updateEnemyShots() {
    for (let i = enemyShots.length - 1; i >= 0; i--) {
      const s = enemyShots[i];
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < -30 || s.x > canvas.width + 30 || s.y < -30 || s.y > canvas.height + 30) {
        enemyShots.splice(i, 1);
        continue;
      }
      if (Math.hypot(s.x - chicken.x, s.y - chicken.y) < s.r + chicken.radius) {
        enemyShots.splice(i, 1);
        damageChicken(s.damage);
      }
    }
  }

  function checkChickenCollisions() {
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const enemy = enemies[ei];
        const c = enemyCenter(enemy);
        if (Math.hypot(b.x - c.x, b.y - c.y) < enemy.hitbox + 8) {
          bullets.splice(bi, 1);
          enemy.hp--;
          if (enemy.hp <= 0) {
            if (enemy.type === 'boss' && chickenRules.hardLock) {
              enemy.hp = enemy.maxHp;
              score += 50;
              scoreEl.textContent = `SCORE: ${score}`;
              levelEl.textContent = 'BOSS: IMPOSSIBLE';
              spawnParticles(c.x, c.y, enemy.color);
              break;
            }
            spawnParticles(c.x, c.y, enemy.color);
            enemies.splice(ei, 1);
            score += enemy.type === 'boss' ? 300 : enemy.type === 'blue' ? 25 : 10;
            scoreEl.textContent = `SCORE: ${score}`;
            enemiesKilled++;
            if (enemy.type === 'boss') {
              gameWin();
              return;
            }
            if (wave < 3 && enemiesKilled >= chickenRules.waveKills[wave - 1]) {
              wave++;
              enemiesKilled = 0;
              levelEl.textContent = wave === 3 ? 'BOSS' : `WAVE: ${wave}`;
              if (wave === 3) spawnEnemy();
            }
          }
          break;
        }
      }
    }
  }

  function spawnParticles(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.4 + 1;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 26 + Math.random() * 22,
        maxLife: 48,
        size: Math.random() * 4 + 2,
        color,
      });
    }
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      px(p.x, p.y, p.size, p.color);
    });
    ctx.globalAlpha = 1;
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].life--;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
  }

  function updateHealthBar() {
    const pct = Math.max(0, chicken.hp / chicken.maxHp * 100);
    healthFill.style.width = `${pct}%`;
    healthFill.className = `game-health-bar-fill${pct <= 40 ? ' low' : ''}`;
  }

  function getLeaderboard() {
    return JSON.parse(localStorage.getItem('chickenLeaderboard') || '[]');
  }

  function saveToLeaderboard(points) {
    const lb = getLeaderboard();
    lb.push({ score: points, date: new Date().toLocaleDateString() });
    lb.sort((a, b) => b.score - a.score);
    if (lb.length > 10) lb.length = 10;
    localStorage.setItem('chickenLeaderboard', JSON.stringify(lb));
  }

  function renderLeaderboard(container, currentScore) {
    const lb = getLeaderboard();
    if (lb.length === 0) {
      container.innerHTML = '';
      return;
    }
    let html = '<div class="game-leaderboard-title">LEADERBOARD</div>';
    lb.forEach((entry, i) => {
      const cls = entry.score === currentScore ? ' current' : '';
      html += `<div class="game-leaderboard-row${cls}">${i + 1}. ${entry.score} - ${entry.date}</div>`;
    });
    container.innerHTML = html;
  }

  function resetChickenGame() {
    chickenRules = CHICKEN_DIFFICULTY[chickenDifficulty] || CHICKEN_DIFFICULTY.medium;
    score = 0;
    wave = 1;
    enemiesKilled = 0;
    bossSpawned = false;
    spawnTimer = 0;
    shootCooldown = 0;
    bullets = [];
    enemies = [];
    enemyShots = [];
    particles = [];
    scoreEl.textContent = 'SCORE: 0';
    levelEl.textContent = `WAVE: 1 (${chickenDifficulty.toUpperCase()})`;
    bossBar.style.display = 'none';
    resize();
    initStars();
    initChicken();
    updateHealthBar();
  }

  function chickenLoop() {
    clearCanvas();
    drawStars();
    updateChicken();
    updateBullets();
    updateEnemies();
    updateEnemyShots();
    checkChickenCollisions();
    updateParticles();
    if (shootCooldown > 0) shootCooldown--;
    if (keys[' '] || keys.Space) shootChicken();
    drawBullets();
    drawEnemies();
    drawEnemyShots();
    drawChicken();
    drawParticles();
    if (state === 'playing' && mode === 'chicken') animId = requestAnimationFrame(chickenLoop);
  }

  function playChicken() {
    state = 'playing';
    hideScreens();
    hudEl.style.display = 'flex';
    healthBar.style.display = 'block';
    resetChickenGame();
    animId = requestAnimationFrame(chickenLoop);
  }

  function gameOver() {
    state = 'over';
    cancelLoop();
    saveToLeaderboard(score);
    finalScoreEl.textContent = `SCORE: ${score}`;
    renderLeaderboard(leaderboardEl, score);
    overScreen.style.display = 'flex';
    bossBar.style.display = 'none';
  }

  function gameWin() {
    state = 'win';
    cancelLoop();
    saveToLeaderboard(score);
    winScoreEl.textContent = `SCORE: ${score}`;
    renderLeaderboard(winLeaderboardEl, score);
    winScreen.style.display = 'flex';
    bossBar.style.display = 'none';
  }

  function startChicken(difficulty = 'medium') {
    chickenDifficulty = CHICKEN_DIFFICULTY[difficulty] ? difficulty : 'medium';
    chickenRules = CHICKEN_DIFFICULTY[chickenDifficulty];
    mode = 'chicken';
    state = 'start';
    keys = {};
    mouseActive = false;
    cancelLoop();
    resize();
    initStars();
    setGameIntro('chicken');
    controls2El.textContent = chickenDifficulty === 'hard'
      ? 'hard mode is survival only; boss cannot be beaten'
      : `difficulty: ${chickenDifficulty}, 3 waves plus boss`;
    overlay.style.display = 'flex';
    startScreen.style.display = 'flex';
    overScreen.style.display = 'none';
    winScreen.style.display = 'none';
    hudEl.style.display = 'none';
    healthBar.style.display = 'none';
    bossBar.style.display = 'none';
    clearCanvas();
    drawStars();
  }

  function arcadeEnd(win = false) {
    state = 'arcade-over';
    arcade.over = true;
    arcade.win = win;
  }

  function setupSnake() {
    const w = 28;
    const h = 20;
    arcade = {
      mode: 'snake',
      gridW: w,
      gridH: h,
      snake: [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: { x: 18, y: 10 },
      lastMove: 0,
      speed: 105,
      score: 0,
    };
  }

  function placeSnakeFood() {
    let food;
    do {
      food = {
        x: Math.floor(Math.random() * arcade.gridW),
        y: Math.floor(Math.random() * arcade.gridH),
      };
    } while (arcade.snake.some(s => s.x === food.x && s.y === food.y));
    arcade.food = food;
  }

  function updateSnake(ts) {
    if (ts - arcade.lastMove < arcade.speed) return;
    arcade.lastMove = ts;
    arcade.dir = arcade.nextDir;
    const head = { x: arcade.snake[0].x + arcade.dir.x, y: arcade.snake[0].y + arcade.dir.y };
    if (head.x < 0 || head.x >= arcade.gridW || head.y < 0 || head.y >= arcade.gridH ||
      arcade.snake.some(s => s.x === head.x && s.y === head.y)) {
      arcadeEnd(false);
      return;
    }
    arcade.snake.unshift(head);
    if (head.x === arcade.food.x && head.y === arcade.food.y) {
      arcade.score += 10;
      scoreEl.textContent = `SCORE: ${arcade.score}`;
      placeSnakeFood();
    } else {
      arcade.snake.pop();
    }
  }

  function drawSnake() {
    const cell = Math.floor(Math.min(canvas.width / (arcade.gridW + 4), canvas.height / (arcade.gridH + 4)));
    const ox = Math.floor((canvas.width - arcade.gridW * cell) / 2);
    const oy = Math.floor((canvas.height - arcade.gridH * cell) / 2);
    ctx.strokeStyle = C.dark;
    ctx.strokeRect(ox - 2, oy - 2, arcade.gridW * cell + 4, arcade.gridH * cell + 4);
    arcade.snake.forEach((part, i) => {
      px(ox + part.x * cell + 1, oy + part.y * cell + 1, cell - 2, i === 0 ? C.cyan : C.green);
    });
    px(ox + arcade.food.x * cell + 2, oy + arcade.food.y * cell + 2, cell - 4, C.yellow);
  }

  const TETRIS_SHAPES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
  ];

  function cloneShape(shape) {
    return shape.map(row => row.slice());
  }

  function rotateShape(shape) {
    const out = [];
    for (let x = 0; x < shape[0].length; x++) {
      out[x] = [];
      for (let y = shape.length - 1; y >= 0; y--) out[x].push(shape[y][x]);
    }
    return out;
  }

  function setupTetris() {
    arcade = {
      mode: 'tetris',
      board: Array.from({ length: 20 }, () => Array(10).fill(0)),
      piece: null,
      x: 3,
      y: 0,
      dropAt: 0,
      dropMs: 620,
      score: 0,
    };
    spawnTetrisPiece();
  }

  function spawnTetrisPiece() {
    arcade.piece = cloneShape(TETRIS_SHAPES[Math.floor(Math.random() * TETRIS_SHAPES.length)]);
    arcade.x = 3;
    arcade.y = 0;
    if (tetrisCollides(arcade.x, arcade.y, arcade.piece)) arcadeEnd(false);
  }

  function tetrisCollides(px0, py0, shape) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const bx = px0 + x;
        const by = py0 + y;
        if (bx < 0 || bx >= 10 || by >= 20) return true;
        if (by >= 0 && arcade.board[by][bx]) return true;
      }
    }
    return false;
  }

  function mergeTetrisPiece() {
    arcade.piece.forEach((row, y) => {
      row.forEach((v, x) => {
        if (v && arcade.y + y >= 0) arcade.board[arcade.y + y][arcade.x + x] = 1;
      });
    });
    let lines = 0;
    arcade.board = arcade.board.filter(row => {
      if (row.every(Boolean)) {
        lines++;
        return false;
      }
      return true;
    });
    while (arcade.board.length < 20) arcade.board.unshift(Array(10).fill(0));
    if (lines) {
      arcade.score += lines * lines * 100;
      scoreEl.textContent = `SCORE: ${arcade.score}`;
    }
    spawnTetrisPiece();
  }

  function moveTetris(dx, dy) {
    if (!tetrisCollides(arcade.x + dx, arcade.y + dy, arcade.piece)) {
      arcade.x += dx;
      arcade.y += dy;
      return true;
    }
    return false;
  }

  function updateTetris(ts) {
    if (ts < arcade.dropAt) return;
    arcade.dropAt = ts + arcade.dropMs;
    if (!moveTetris(0, 1)) mergeTetrisPiece();
  }

  function drawTetris() {
    const cell = Math.floor(Math.min(canvas.width / 18, canvas.height / 24));
    const ox = Math.floor((canvas.width - 10 * cell) / 2);
    const oy = Math.floor((canvas.height - 20 * cell) / 2);
    ctx.strokeStyle = C.dark;
    ctx.strokeRect(ox - 2, oy - 2, 10 * cell + 4, 20 * cell + 4);
    arcade.board.forEach((row, y) => {
      row.forEach((v, x) => {
        if (v) px(ox + x * cell + 1, oy + y * cell + 1, cell - 2, C.blue);
      });
    });
    arcade.piece.forEach((row, y) => {
      row.forEach((v, x) => {
        if (v) px(ox + (arcade.x + x) * cell + 1, oy + (arcade.y + y) * cell + 1, cell - 2, C.cyan);
      });
    });
  }

  const PAC_MAP = [
    '############################',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#o####.#####.##.#####.####o#',
    '#.####.#####.##.#####.####.#',
    '#..........................#',
    '#.####.##.########.##.####.#',
    '#......##....##....##......#',
    '######.##### ## #####.######',
    '     #.##          ##.#     ',
    '######.## ###--### ##.######',
    '      .   #      #   .      ',
    '######.## ######## ##.######',
    '     #.##          ##.#     ',
    '######.## ######## ##.######',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#o..##................##..o#',
    '###.##.##.########.##.##.###',
    '#......##....##....##......#',
    '#.##########.##.##########.#',
    '#..........................#',
    '############################',
  ];

  function setupPacman() {
    const map = PAC_MAP.map(row => row.split(''));
    arcade = {
      mode: 'pacman',
      map,
      player: { x: 14, y: 17, mouth: 0 },
      dir: { x: 1, y: 0 },
      want: { x: 1, y: 0 },
      ghosts: [
        { x: 13, y: 11, startX: 13, startY: 11, color: C.red, scatter: { x: 1, y: 1 } },
        { x: 14, y: 11, startX: 14, startY: 11, color: C.green, scatter: { x: 26, y: 1 } },
        { x: 13, y: 10, startX: 13, startY: 10, color: C.blue, scatter: { x: 1, y: 21 } },
        { x: 14, y: 10, startX: 14, startY: 10, color: C.magenta || '#d2a6ff', scatter: { x: 26, y: 21 } },
      ],
      lastMove: 0,
      lastGhost: 0,
      score: 0,
      pellets: map.flat().filter(ch => ch === '.' || ch === 'o').length,
      frightened: 0,
      tick: 0,
    };
  }

  function pacWalkable(x, y) {
    const cols = arcade.map[0].length;
    const nx = (x + cols) % cols;
    return arcade.map[y] && arcade.map[y][nx] && arcade.map[y][nx] !== '#';
  }

  function updatePacman(ts) {
    if (ts - arcade.lastMove > 118) {
      arcade.lastMove = ts;
      arcade.tick++;
      arcade.player.mouth = (arcade.player.mouth + 1) % 8;
      const cols = arcade.map[0].length;
      if (pacWalkable(arcade.player.x + arcade.want.x, arcade.player.y + arcade.want.y)) arcade.dir = arcade.want;
      const nx = (arcade.player.x + arcade.dir.x + cols) % cols;
      const ny = arcade.player.y + arcade.dir.y;
      if (pacWalkable(nx, ny)) {
        arcade.player.x = nx;
        arcade.player.y = ny;
      }
      const tile = arcade.map[arcade.player.y][arcade.player.x];
      if (tile === '.' || tile === 'o') {
        arcade.map[arcade.player.y][arcade.player.x] = ' ';
        arcade.pellets--;
        arcade.score += tile === 'o' ? 50 : 10;
        if (tile === 'o') arcade.frightened = 70;
        scoreEl.textContent = `SCORE: ${arcade.score}`;
        if (arcade.pellets <= 0) arcadeEnd(true);
      }
      if (arcade.frightened > 0) arcade.frightened--;
    }
    if (ts - arcade.lastGhost > (arcade.frightened ? 245 : 185)) {
      arcade.lastGhost = ts;
      const cols = arcade.map[0].length;
      arcade.ghosts.forEach((g, idx) => {
        const choices = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .filter(([dx, dy]) => pacWalkable(g.x + dx, g.y + dy))
          .sort((a, b) => {
            const target = arcade.frightened || arcade.tick % 48 < 12 ? g.scatter : arcade.player;
            const ax = (g.x + a[0] + cols) % cols;
            const bx = (g.x + b[0] + cols) % cols;
            const da = Math.abs(ax - target.x) + Math.abs(g.y + a[1] - target.y);
            const db = Math.abs(bx - target.x) + Math.abs(g.y + b[1] - target.y);
            return da - db;
          });
        const pick = arcade.frightened
          ? choices[choices.length - 1]
          : (Math.random() < 0.82 - idx * 0.08 ? choices[0] : choices[Math.floor(Math.random() * choices.length)]);
        if (pick) {
          g.x = (g.x + pick[0] + cols) % cols;
          g.y += pick[1];
        }
      });
    }
    arcade.ghosts.forEach(g => {
      if (g.x === arcade.player.x && g.y === arcade.player.y) {
        if (arcade.frightened) {
          arcade.score += 200;
          scoreEl.textContent = `SCORE: ${arcade.score}`;
          g.x = g.startX;
          g.y = g.startY;
        } else {
          arcadeEnd(false);
        }
      }
    });
  }

  function drawPacman() {
    const rows = arcade.map.length;
    const cols = arcade.map[0].length;
    const cell = Math.floor(Math.min(canvas.width / (cols + 4), canvas.height / (rows + 4)));
    const ox = Math.floor((canvas.width - cols * cell) / 2);
    const oy = Math.floor((canvas.height - rows * cell) / 2);
    arcade.map.forEach((row, y) => {
      row.forEach((ch, x) => {
        if (ch === '#') {
          ctx.fillStyle = C.blue;
          ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
          ctx.fillStyle = C.bg;
          ctx.fillRect(ox + x * cell + 3, oy + y * cell + 3, Math.max(1, cell - 6), Math.max(1, cell - 6));
        }
        if (ch === '.') px(ox + x * cell + cell * 0.44, oy + y * cell + cell * 0.44, Math.max(2, cell * 0.12), C.cream);
        if (ch === 'o') {
          ctx.fillStyle = C.cream;
          ctx.beginPath();
          ctx.arc(ox + x * cell + cell / 2, oy + y * cell + cell / 2, cell * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
    ctx.fillStyle = C.yellow;
    const px0 = ox + arcade.player.x * cell + cell / 2;
    const py0 = oy + arcade.player.y * cell + cell / 2;
    const mouth = arcade.player.mouth < 4 ? 0.22 : 0.06;
    ctx.save();
    ctx.translate(px0, py0);
    const angle = Math.atan2(arcade.dir.y, arcade.dir.x);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, cell * 0.42, mouth * Math.PI, (2 - mouth) * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    arcade.ghosts.forEach(g => {
      ctx.fillStyle = arcade.frightened ? C.blue : g.color;
      ctx.fillRect(ox + g.x * cell + 2, oy + g.y * cell + 3, cell - 4, cell - 5);
      ctx.fillStyle = C.white;
      ctx.fillRect(ox + g.x * cell + cell * 0.28, oy + g.y * cell + cell * 0.32, 3, 3);
      ctx.fillRect(ox + g.x * cell + cell * 0.58, oy + g.y * cell + cell * 0.32, 3, 3);
    });
  }


  function setupArcade(gameMode) {
    if (gameMode === 'snake') setupSnake();
    if (gameMode === 'tetris') setupTetris();
    if (gameMode === 'pacman') setupPacman();
    scoreEl.textContent = 'SCORE: 0';
    levelEl.textContent = gameMode.toUpperCase();
  }

  function updateArcade(ts) {
    if (arcade.mode === 'snake') updateSnake(ts);
    if (arcade.mode === 'tetris') updateTetris(ts);
    if (arcade.mode === 'pacman') updatePacman(ts);
  }

  function drawArcade() {
    clearCanvas();
    if (arcade.mode === 'snake') drawSnake();
    if (arcade.mode === 'tetris') drawTetris();
    if (arcade.mode === 'pacman') drawPacman();
    if (state === 'arcade-over') {
      ctx.fillStyle = 'rgba(10,14,20,0.74)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawText(arcade.win ? 'YOU WIN' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 20, 30, arcade.win ? C.green : C.red);
      drawText('press SPACE to restart, ESC to quit', canvas.width / 2, canvas.height / 2 + 22, 13, C.cyan);
    }
  }

  function arcadeLoop(ts) {
    if (state === 'arcade') updateArcade(ts);
    drawArcade();
    if (state === 'arcade' || state === 'arcade-over') animId = requestAnimationFrame(arcadeLoop);
  }

  function startArcade(gameMode) {
    mode = gameMode;
    state = 'arcade';
    keys = {};
    mouseActive = false;
    cancelLoop();
    resize();
    setGameIntro(gameMode);
    hideScreens();
    overlay.style.display = 'flex';
    hudEl.style.display = 'flex';
    healthBar.style.display = 'none';
    bossBar.style.display = 'none';
    setupArcade(gameMode);
    animId = requestAnimationFrame(arcadeLoop);
  }

  function handleArcadeKeyDown(e) {
    if (state === 'arcade-over' && e.key === ' ') {
      startArcade(mode);
      return;
    }
    if (!arcade || state !== 'arcade') return;
    if (arcade.mode === 'snake') {
      const dir = arcade.dir;
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && dir.y !== 1) arcade.nextDir = { x: 0, y: -1 };
      if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && dir.y !== -1) arcade.nextDir = { x: 0, y: 1 };
      if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && dir.x !== 1) arcade.nextDir = { x: -1, y: 0 };
      if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && dir.x !== -1) arcade.nextDir = { x: 1, y: 0 };
    }
    if (arcade.mode === 'pacman') {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') arcade.want = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') arcade.want = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') arcade.want = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') arcade.want = { x: 1, y: 0 };
    }
    if (arcade.mode === 'tetris') {
      if (e.key === 'ArrowLeft') moveTetris(-1, 0);
      if (e.key === 'ArrowRight') moveTetris(1, 0);
      if (e.key === 'ArrowDown') moveTetris(0, 1);
      if (e.key === 'ArrowUp') {
        const rotated = rotateShape(arcade.piece);
        if (!tetrisCollides(arcade.x, arcade.y, rotated)) arcade.piece = rotated;
      }
      if (e.key === ' ') {
        while (moveTetris(0, 1)) { }
        mergeTetrisPiece();
      }
    }
  }

  function exitGame() {
    state = 'idle';
    cancelLoop();
    overlay.style.display = 'none';
    bossBar.style.display = 'none';
    healthBar.style.display = 'none';
    keys = {};
    mouseActive = false;
    const input = document.getElementById('cmdInput');
    if (input) input.focus();
  }

  function onKeyDown(e) {
    if (state === 'idle') return;
    e.preventDefault();
    keys[e.key] = true;
    if (e.key === 'Escape') {
      exitGame();
      return;
    }
    if (mode === 'chicken') {
      if (e.key === ' ' && state === 'start') playChicken();
      else if (e.key === ' ' && (state === 'over' || state === 'win')) playChicken();
    } else {
      handleArcadeKeyDown(e);
    }
  }

  function onKeyUp(e) {
    if (state === 'idle') return;
    keys[e.key] = false;
  }

  canvas.addEventListener('mousemove', e => {
    if (mode === 'chicken' && state === 'playing') {
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseActive = true;
    }
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (mode === 'chicken' && state === 'playing') shootChicken();
  });

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  addEventListener('resize', () => {
    if (state !== 'idle') resize();
  });

  window.startGame = function (gameMode = 'chicken', option = 'medium') {
    const chosen = String(gameMode || 'chicken').toLowerCase();
    if (chosen === 'chicken') startChicken(String(option || 'medium').toLowerCase());
    else startArcade(chosen);
  };
  window.exitGame = exitGame;
})();
