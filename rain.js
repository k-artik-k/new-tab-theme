(function () {
  const root = window.TabOS = window.TabOS || {};
  const storage = root.storage;
  const { clamp, escapeHtml } = root.utils;
  const { appendOutput } = root.core;

  let settings = storage.loadRain();
  let canvas;
  let ctx;
  let width = 0;
  let height = 0;
  let raf = null;
  let drops = [];
  let splashes = [];
  let bolts = [];
  let lastFrame = 0;
  let thunderCooldown = 240;
  let audioCtx = null;
  let noiseSource = null;
  let rainGain = null;

  function save() {
    settings.intensity = clamp(settings.intensity, 0, 100);
    settings.windDirection = clamp(settings.windDirection, 0, 360);
    settings.windSpeed = clamp(settings.windSpeed, 0, 100);
    storage.saveRain(settings);
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function ensureAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    if (audioCtx) {
      audioCtx.resume();
      return true;
    }
    audioCtx = new AudioContext();

    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 3, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.18) * 0.985;
      data[i] = last;
    }

    const low = audioCtx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1500;
    const high = audioCtx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 280;
    rainGain = audioCtx.createGain();
    rainGain.gain.value = 0;
    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    noiseSource.connect(high);
    high.connect(low);
    low.connect(rainGain);
    rainGain.connect(audioCtx.destination);
    noiseSource.start();
    return true;
  }

  function updateAudio() {
    if (!rainGain || !audioCtx) return;
    const target = settings.enabled && settings.sound ? 0.018 + settings.intensity / 1700 : 0;
    rainGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.12);
  }

  function playThunder(strength) {
    if (!settings.sound || !ensureAudio()) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(24, t + 1.2);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, t);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.08 * strength, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 1.65);
  }

  function directionToDegrees(value) {
    const map = {
      right: 0, east: 0, e: 0,
      downright: 45, se: 45,
      down: 90, south: 90, s: 90,
      downleft: 135, sw: 135,
      left: 180, west: 180, w: 180,
      upleft: 225, nw: 225,
      up: 270, north: 270, n: 270,
      upright: 315, ne: 315,
    };
    const key = String(value || '').toLowerCase();
    if (map[key] !== undefined) return map[key];
    const n = Number(value);
    return Number.isFinite(n) ? clamp(n, 0, 360) : null;
  }

  function spawnDrop() {
    const intensity = settings.intensity / 100;
    const angle = (settings.windDirection + 90) * Math.PI / 180;
    const wind = settings.windSpeed / 100;
    const speed = 8 + intensity * 14 + Math.random() * 5;
    const len = 12 + intensity * 24 + Math.random() * 18;
    drops.push({
      x: Math.random() * width,
      y: -40,
      vx: Math.cos(angle) * speed * wind * 0.42,
      vy: speed,
      len,
      alpha: 0.16 + intensity * 0.28 + Math.random() * 0.12,
      w: intensity > 0.7 ? 1.4 : 1,
    });
  }

  function makeBolt() {
    const startX = width * (0.15 + Math.random() * 0.7);
    const endY = height * (0.18 + Math.random() * 0.34);
    let x = startX;
    let y = 0;
    const points = [{ x, y }];
    while (y < endY) {
      x += (Math.random() - 0.5) * 44;
      y += 22 + Math.random() * 35;
      points.push({ x, y });
    }
    const strength = 0.45 + Math.random() * 0.55;
    bolts.push({ points, life: 10, maxLife: 10, strength });
    playThunder(strength);
  }

  function drawBolt(bolt) {
    const alpha = bolt.life / bolt.maxLife * bolt.strength;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 14;
    ctx.shadowColor = `rgba(200,230,255,${alpha})`;
    ctx.strokeStyle = `rgba(210,235,255,${alpha})`;
    ctx.beginPath();
    bolt.points.forEach((p, i) => {
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function draw(ts) {
    if (!settings.enabled) return;
    raf = requestAnimationFrame(draw);
    if (ts - lastFrame < 1000 / 50) return;
    lastFrame = ts;

    ctx.clearRect(0, 0, width, height);
    const intensity = settings.intensity / 100;
    const spawnCount = Math.round(2 + intensity * 18);
    for (let i = 0; i < spawnCount; i++) {
      if (Math.random() < 0.7) spawnDrop();
    }
    const maxDrops = 180 + Math.round(intensity * 620);
    if (drops.length > maxDrops) drops.splice(0, drops.length - maxDrops);

    thunderCooldown--;
    if (settings.thunder && settings.intensity > 30 && thunderCooldown <= 0 && Math.random() < 0.03) {
      makeBolt();
      thunderCooldown = 180 + Math.random() * 420;
    }

    drops.forEach(drop => {
      drop.x += drop.vx;
      drop.y += drop.vy;
      ctx.globalAlpha = drop.alpha;
      ctx.strokeStyle = '#9dd7e8';
      ctx.lineWidth = drop.w;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.vx * 1.8, drop.y - drop.len);
      ctx.stroke();
    });

    for (let i = drops.length - 1; i >= 0; i--) {
      if (drops[i].y > height - 5) {
        if (Math.random() < 0.2 + intensity * 0.28) {
          splashes.push({ x: drops[i].x, y: height - 3, life: 12, vx: (Math.random() - 0.5) * 3 });
        }
        drops.splice(i, 1);
      }
    }

    splashes.forEach(s => {
      ctx.globalAlpha = s.life / 18;
      ctx.strokeStyle = '#9dd7e8';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.vx, s.y - (14 - s.life));
      ctx.stroke();
      s.life--;
    });
    splashes = splashes.filter(s => s.life > 0);

    bolts.forEach(drawBolt);
    bolts.forEach(b => b.life--);
    bolts = bolts.filter(b => b.life > 0);
    ctx.globalAlpha = 1;
    updateAudio();
  }

  function setEnabled(on) {
    settings.enabled = !!on;
    save();
    updateAudio();
    if (settings.enabled) {
      canvas.style.display = 'block';
      if (!raf) raf = requestAnimationFrame(draw);
    } else {
      canvas.style.display = 'none';
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      drops = [];
      splashes = [];
      bolts = [];
      ctx.clearRect(0, 0, width, height);
    }
  }

  function setSound(on) {
    settings.sound = !!on;
    if (settings.sound && !ensureAudio()) appendOutput('audio is not supported in this browser.', 'error');
    save();
    updateAudio();
  }

  function update(patch) {
    settings = { ...settings, ...patch };
    save();
    updateAudio();
  }

  function describe() {
    return `rain ${settings.enabled ? 'on' : 'off'}, intensity ${Math.round(settings.intensity)}, wind ${Math.round(settings.windDirection)} deg @ ${Math.round(settings.windSpeed)}, sound ${settings.sound ? 'on' : 'off'}, thunder ${settings.thunder ? 'on' : 'off'}`;
  }

  function handle(words) {
    const sub = words[1];
    if (!sub || sub === 'status') {
      appendOutput(escapeHtml(describe()), 'info');
      appendOutput('use /rain on|off, /rain intensity 0-100, /rain wind <dir> <speed>, /rain sound on|off, /rain thunder on|off', 'info');
      return;
    }
    if (sub === 'on' || sub === 'off') {
      setEnabled(sub === 'on');
      appendOutput(`rain: ${sub}`, sub === 'on' ? 'success' : 'info');
      return;
    }
    if (sub === 'toggle') {
      setEnabled(!settings.enabled);
      appendOutput(`rain: ${settings.enabled ? 'on' : 'off'}`, settings.enabled ? 'success' : 'info');
      return;
    }
    if (sub === 'sound') {
      const v = words[2];
      if (!v || v === 'toggle') setSound(!settings.sound);
      else if (v === 'on' || v === 'off') setSound(v === 'on');
      else {
        appendOutput('usage: /rain sound on|off', 'error');
        return;
      }
      appendOutput(`rain sound: ${settings.sound ? 'on' : 'off'}`, settings.sound ? 'success' : 'info');
      return;
    }
    if (sub === 'thunder') {
      const v = words[2];
      if (v !== 'on' && v !== 'off') {
        appendOutput('usage: /rain thunder on|off', 'error');
        return;
      }
      update({ thunder: v === 'on' });
      appendOutput(`thunder: ${v}`, 'success');
      return;
    }
    if (sub === 'intensity') {
      const n = clamp(words[2], 0, 100);
      update({ intensity: n });
      appendOutput(`rain intensity: ${n}`, 'success');
      return;
    }
    if (sub === 'wind') {
      const direction = directionToDegrees(words[2]);
      if (direction === null) {
        appendOutput('usage: /rain wind left|right|north|south|degrees <0-100>', 'error');
        return;
      }
      const speed = words[3] === undefined ? settings.windSpeed : clamp(words[3], 0, 100);
      update({ windDirection: direction, windSpeed: speed });
      appendOutput(`rain wind: ${Math.round(direction)} deg @ ${Math.round(speed)}`, 'success');
      return;
    }
    if (sub === 'preset') {
      const presets = {
        mist: { intensity: 18, windDirection: 100, windSpeed: 8, thunder: false },
        calm: { intensity: 35, windDirection: 105, windSpeed: 16, thunder: false },
        storm: { intensity: 78, windDirection: 135, windSpeed: 48, thunder: true },
      };
      if (!presets[words[2]]) {
        appendOutput('presets: mist, calm, storm', 'error');
        return;
      }
      update(presets[words[2]]);
      setEnabled(true);
      appendOutput(`rain preset: ${words[2]}`, 'success');
      return;
    }
    appendOutput('unknown rain option.', 'error');
  }

  function init() {
    canvas = document.getElementById('rainCanvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    setEnabled(settings.enabled);
  }

  root.rain = {
    init,
    handle,
    describe,
    update,
    setEnabled,
    setSound,
    settings: () => ({ ...settings }),
  };
})();
