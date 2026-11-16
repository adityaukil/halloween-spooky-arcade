// Game 2: PUMPKIN SLASHER: FRENZY (Endless Spooky Slicer & Blade Arcade)
// Custom High-Fidelity Canvas Vector Graphics (No Generic Emojis)
// Clean Event Listener Lifecycle & Bulletproof Restarting

class PumpkinSlasherGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.running = false;
    this.animationId = null;

    this.width = 800;
    this.height = 450;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    // Blade trail
    this.bladeTrail = [];
    this.isMouseDown = false;

    // Game stats
    this.score = 0;
    this.lastReportedScore = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 75;
    this.frenzyActive = false;
    this.frenzyTimer = 0;

    this.targets = [];
    this.halves = [];
    this.splatters = [];
    this.floatingTexts = [];

    this.bindControls();
  }

  bindControls() {
    if (!this.canvas) return;

    const addPoint = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / (rect.width || this.width);
      const scaleY = this.height / (rect.height || this.height);
      const ptX = (clientX - rect.left) * scaleX;
      const ptY = (clientY - rect.top) * scaleY;

      this.bladeTrail.push({ x: ptX, y: ptY, time: Date.now() });
      if (this.bladeTrail.length > 14) this.bladeTrail.shift();

      this.checkSliceCollisions(ptX, ptY);
    };

    this.boundMouseDown = (e) => {
      if (!this.running) return;
      this.isMouseDown = true;
      this.bladeTrail = [];
      addPoint(e.clientX, e.clientY);
      if (window.spookyAudio) window.spookyAudio.playSlash();
    };

    this.boundMouseMove = (e) => {
      if (!this.running || !this.isMouseDown) return;
      addPoint(e.clientX, e.clientY);
    };

    this.boundMouseUp = () => {
      this.isMouseDown = false;
      this.bladeTrail = [];
    };

    this.boundTouchStart = (e) => {
      if (!this.running) return;
      e.preventDefault();
      this.isMouseDown = true;
      this.bladeTrail = [];
      if (e.touches[0]) {
        addPoint(e.touches[0].clientX, e.touches[0].clientY);
        if (window.spookyAudio) window.spookyAudio.playSlash();
      }
    };

    this.boundTouchMove = (e) => {
      if (!this.running || !this.isMouseDown) return;
      e.preventDefault();
      if (e.touches[0]) {
        addPoint(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    this.boundTouchEnd = () => {
      this.isMouseDown = false;
      this.bladeTrail = [];
    };

    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);

    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    window.addEventListener('touchend', this.boundTouchEnd);
  }

  destroy() {
    this.stop();
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.boundMouseDown);
      this.canvas.removeEventListener('touchstart', this.boundTouchStart);
      this.canvas.removeEventListener('touchmove', this.boundTouchMove);
    }
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('touchend', this.boundTouchEnd);
  }

  restart() {
    this.stop();
    this.resetState();
    this.start();
  }

  resetState() {
    this.score = 0;
    this.lastReportedScore = 0;
    this.lives = 3;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 75;
    this.frenzyActive = false;
    this.frenzyTimer = 0;

    this.targets = [];
    this.halves = [];
    this.splatters = [];
    this.floatingTexts = [];
    this.bladeTrail = [];
  }

  start() {
    this.stop();
    this.running = true;

    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext('2d');
    }

    if (window.spookyAudio) {
      window.spookyAudio.playSlash();
    }

    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  update() {
    // Trim blade trail
    const now = Date.now();
    this.bladeTrail = this.bladeTrail.filter(pt => now - pt.time < 140);

    // Combo cooldown
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) {
        if (this.comboCount >= 3) {
          const comboPts = this.comboCount * 75;
          this.score += comboPts;
          this.addFloatingText(`COMBO x${this.comboCount}! +${comboPts}`, this.width / 2, 160, '#ffbb00');
        }
        this.comboCount = 0;
      }
    }

    // Frenzy mode
    if (this.frenzyActive) {
      this.frenzyTimer--;
      if (this.frenzyTimer <= 0) this.frenzyActive = false;
    }

    // Target launches
    this.spawnTimer++;
    const targetInterval = this.frenzyActive ? 18 : Math.max(28, 75 - Math.floor(this.score / 600));

    if (this.spawnTimer >= targetInterval) {
      this.spawnTimer = 0;
      const batchCount = this.frenzyActive ? Math.floor(2 + Math.random() * 3) : (Math.random() < 0.35 ? 2 : 1);
      for (let i = 0; i < batchCount; i++) {
        this.launchTarget();
      }
    }

    // Stream live progress
    if (this.score - this.lastReportedScore > 120) {
      const delta = Math.floor(this.score - this.lastReportedScore);
      this.lastReportedScore = this.score;
      if (window.spookyNetwork) {
        window.spookyNetwork.sendLiveProgress('pumpkin', Math.floor(this.score), delta);
      }
    }

    // Update targets
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      t.x += t.vx;
      t.y += t.vy;
      t.vy += t.gravity;
      t.rotation += t.rotationSpeed;

      // Fallen below screen
      if (t.y > this.height + 60 && t.vy > 0) {
        if (t.type !== 'bomb' && !this.frenzyActive) {
          this.lives--;
          this.addFloatingText('MISSED! -1 LIFE', t.x, this.height - 40, '#ff3333');
          if (window.spookyAudio) window.spookyAudio.playScareStinger();

          if (this.lives <= 0) {
            this.gameOver();
            return;
          }
        }
        this.targets.splice(i, 1);
      }
    }

    // Update halves
    for (let i = this.halves.length - 1; i >= 0; i--) {
      const h = this.halves[i];
      h.x += h.vx;
      h.y += h.vy;
      h.vy += 0.45;
      h.rotation += h.rotationSpeed;
      h.alpha -= 0.018;

      if (h.alpha <= 0 || h.y > this.height + 60) {
        this.halves.splice(i, 1);
      }
    }

    // Update splatters
    for (let i = this.splatters.length - 1; i >= 0; i--) {
      const s = this.splatters[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.3;
      s.alpha -= 0.025;
      if (s.alpha <= 0) this.splatters.splice(i, 1);
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const txt = this.floatingTexts[i];
      txt.y += txt.vy;
      txt.alpha -= 0.02;
      if (txt.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  launchTarget() {
    const types = ['pumpkin', 'slime_gourd', 'eyeball', 'bomb', 'frenzy'];
    const rand = Math.random();
    let type = 'pumpkin';

    if (rand < 0.18) type = 'bomb';
    else if (rand < 0.38) type = 'slime_gourd';
    else if (rand < 0.55) type = 'eyeball';
    else if (rand < 0.65) type = 'frenzy';

    const startX = 120 + Math.random() * (this.width - 240);
    const startY = this.height + 30;

    const targetCenterX = this.width / 2 + (Math.random() - 0.5) * 200;
    const timeToApex = 38 + Math.random() * 15;
    const vx = (targetCenterX - startX) / timeToApex;
    const vy = -12.5 - Math.random() * 3.5;

    this.targets.push({
      type,
      x: startX,
      y: startY,
      vx,
      vy,
      gravity: 0.38,
      radius: 30,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.12
    });
  }

  checkSliceCollisions(ptX, ptY) {
    if (this.bladeTrail.length < 2) return;
    const p1 = this.bladeTrail[this.bladeTrail.length - 2];
    const p2 = { x: ptX, y: ptY };

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      const dist = this.distToSegment(t.x, t.y, p1.x, p1.y, p2.x, p2.y);

      if (dist < t.radius) {
        this.sliceTarget(t, i);
      }
    }
  }

  sliceTarget(t, index) {
    this.targets.splice(index, 1);

    if (t.type === 'bomb') {
      this.lives -= 2;
      this.createSplat(t.x, t.y, '#333333', 30);
      this.addFloatingText('💀 CURSED BOMB! -2 LIVES', t.x, t.y, '#ff0044');
      if (window.spookyAudio) window.spookyAudio.playExplosion();

      if (this.lives <= 0) {
        this.gameOver();
        return;
      }
      return;
    }

    const mult = window.spookyNetwork ? window.spookyNetwork.scoreMultiplier : 1.0;
    let basePts = 100;
    let splatColor = '#ff6600';

    if (t.type === 'pumpkin') {
      basePts = 100;
      splatColor = '#ff7700';
      if (window.spookyAudio) window.spookyAudio.playPumpkinSplat();
    } else if (t.type === 'slime_gourd') {
      basePts = 180;
      splatColor = '#00ff66';
      if (window.spookyAudio) window.spookyAudio.playPumpkinSplat();
    } else if (t.type === 'eyeball') {
      basePts = 250;
      splatColor = '#b700ff';
      if (window.spookyAudio) window.spookyAudio.playGhostWail();
    } else if (t.type === 'frenzy') {
      basePts = 300;
      splatColor = '#ffaa00';
      this.frenzyActive = true;
      this.frenzyTimer = 360;
      this.addFloatingText('🔥 PUMPKIN FRENZY SURGE! 🔥', this.width / 2, 200, '#ff9900');
      if (window.spookyAudio) window.spookyAudio.playCandyChime();
    }

    const earned = basePts * mult;
    this.score += earned;
    this.comboCount++;
    this.comboTimer = 22;

    this.addFloatingText(`+${earned}`, t.x, t.y - 15, splatColor);
    this.createSplat(t.x, t.y, splatColor, 20);
    this.spawnHalves(t, splatColor);
  }

  spawnHalves(t, color) {
    [-1, 1].forEach(dir => {
      this.halves.push({
        type: t.type,
        x: t.x + dir * 10,
        y: t.y,
        vx: dir * (3.5 + Math.random() * 3),
        vy: -4.5 - Math.random() * 4,
        rotation: t.rotation,
        rotationSpeed: dir * (0.12 + Math.random() * 0.1),
        radius: t.radius * 0.85,
        alpha: 1.0,
        color
      });
    });
  }

  createSplat(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
      this.splatters.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        radius: 2 + Math.random() * 4,
        alpha: 1.0,
        color
      });
    }
  }

  addFloatingText(text, x, y, color) {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -1.8,
      alpha: 1.0,
      color
    });
  }

  distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const isBloodMoon = window.spookyNetwork && window.spookyNetwork.isBloodMoonActive;

    // Background Crypt Mist
    const bgGrad = this.ctx.createRadialGradient(this.width / 2, this.height * 0.7, 50, this.width / 2, this.height * 0.5, this.width * 0.7);
    if (isBloodMoon || this.frenzyActive) {
      bgGrad.addColorStop(0, '#4a0815');
      bgGrad.addColorStop(1, '#1a0006');
    } else {
      bgGrad.addColorStop(0, '#261436');
      bgGrad.addColorStop(1, '#090410');
    }
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw Splatters
    this.splatters.forEach(s => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, s.alpha);
      this.ctx.fillStyle = s.color;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw Targets
    this.targets.forEach(t => this.drawCustomTarget(t));

    // Draw Halves
    this.halves.forEach(h => this.drawCustomHalf(h));

    // Draw Blade Trail
    this.drawBladeTrail();

    // Draw Floating Texts
    this.floatingTexts.forEach(txt => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, txt.alpha);
      this.ctx.font = 'bold 20px "Creepster", cursive, sans-serif';
      this.ctx.fillStyle = txt.color;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#000';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(txt.text, txt.x, txt.y);
      this.ctx.restore();
    });

    // Draw HUD
    this.drawHUD();
  }

  drawBladeTrail() {
    if (this.bladeTrail.length < 2) return;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(this.bladeTrail[0].x, this.bladeTrail[0].y);
    for (let i = 1; i < this.bladeTrail.length; i++) {
      this.ctx.lineTo(this.bladeTrail[i].x, this.bladeTrail[i].y);
    }
    this.ctx.strokeStyle = this.frenzyActive ? '#ff3300' : '#00ffcc';
    this.ctx.lineWidth = 6.5;
    this.ctx.lineCap = 'round';
    this.ctx.shadowBlur = 14;
    this.ctx.shadowColor = this.ctx.strokeStyle;
    this.ctx.stroke();

    // Core white-hot cut
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2.2;
    this.ctx.stroke();
    this.ctx.restore();
  }

  // --- High-Fidelity Custom Vector Targets ---

  drawCustomTarget(t) {
    this.ctx.save();
    this.ctx.translate(t.x, t.y);
    this.ctx.rotate(t.rotation);

    const r = t.radius;

    if (t.type === 'pumpkin') {
      // 1. Classic Glowing Jack-o'-Lantern
      const pGrad = this.ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      pGrad.addColorStop(0, '#ffa726');
      pGrad.addColorStop(1, '#e65100');

      this.ctx.fillStyle = pGrad;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, 0, Math.PI * 2);
      this.ctx.fill();

      // Ribs
      this.ctx.strokeStyle = '#bf360c';
      this.ctx.lineWidth = 2;
      [-12, 0, 12].forEach(off => {
        this.ctx.beginPath();
        this.ctx.ellipse(off, 0, r * 0.45, r * 0.95, 0, 0, Math.PI * 2);
        this.ctx.stroke();
      });

      // Stem
      this.ctx.fillStyle = '#2e7d32';
      this.ctx.fillRect(-3, -r - 7, 6, 8);

      // Carved glowing eyes & mouth
      this.ctx.fillStyle = '#ffea00';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#ffff00';
      this.ctx.beginPath();
      this.ctx.moveTo(-10, -5); this.ctx.lineTo(-4, -5); this.ctx.lineTo(-7, -11);
      this.ctx.moveTo(10, -5); this.ctx.lineTo(4, -5); this.ctx.lineTo(7, -11);
      this.ctx.fill();

      // Grin
      this.ctx.beginPath();
      this.ctx.arc(0, 4, 11, 0.2, Math.PI - 0.2);
      this.ctx.lineTo(0, 6);
      this.ctx.fill();

    } else if (t.type === 'slime_gourd') {
      // 2. Toxic Slime Gourd (Green Warted Pumpkin)
      const gGrad = this.ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      gGrad.addColorStop(0, '#76ff03');
      gGrad.addColorStop(1, '#1b5e20');

      this.ctx.fillStyle = gGrad;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, 0, Math.PI * 2);
      this.ctx.fill();

      // Glowing toxic eyes
      this.ctx.fillStyle = '#ccff90';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#76ff03';
      this.ctx.fillRect(-10, -6, 6, 6);
      this.ctx.fillRect(4, -6, 6, 6);

    } else if (t.type === 'eyeball') {
      // 3. Demonic Veined Eyeball
      this.ctx.fillStyle = '#f0ebeb';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, 0, Math.PI * 2);
      this.ctx.fill();

      // Red blood vessels
      this.ctx.strokeStyle = '#d50000';
      this.ctx.lineWidth = 1.4;
      [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach(ang => {
        this.ctx.beginPath();
        this.ctx.moveTo(Math.cos(ang) * (r * 0.5), Math.sin(ang) * (r * 0.5));
        this.ctx.lineTo(Math.cos(ang) * (r * 0.95), Math.sin(ang) * (r * 0.95));
        this.ctx.stroke();
      });

      // Purple Glowing Iris
      this.ctx.fillStyle = '#9c27b0';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Slit Pupil
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, r * 0.18, r * 0.38, 0, 0, Math.PI * 2);
      this.ctx.fill();

    } else if (t.type === 'bomb') {
      // 4. Cursed Skull Bomb
      this.ctx.fillStyle = '#212121';
      this.ctx.beginPath();
      this.ctx.arc(0, 2, r, 0, Math.PI * 2);
      this.ctx.fill();

      // Skull Face on bomb
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
      this.ctx.fill();

      // Black eyes
      this.ctx.fillStyle = '#ff0033';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#ff0033';
      this.ctx.beginPath();
      this.ctx.arc(-5, -2, 4, 0, Math.PI * 2);
      this.ctx.arc(5, -2, 4, 0, Math.PI * 2);
      this.ctx.fill();

      // Sizzling Fuse & Spark
      this.ctx.strokeStyle = '#8d6e63';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -r);
      this.ctx.quadraticCurveTo(8, -r - 12, 12, -r - 16);
      this.ctx.stroke();

      // Spark
      this.ctx.fillStyle = '#ffeb3b';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#ff9800';
      this.ctx.beginPath();
      this.ctx.arc(12, -r - 16, 5, 0, Math.PI * 2);
      this.ctx.fill();

    } else if (t.type === 'frenzy') {
      // 5. Blood Frenzy Burning Pumpkin
      this.ctx.fillStyle = '#ff3d00';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#ff9100';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, 0, Math.PI * 2);
      this.ctx.fill();

      // Flame aura
      this.ctx.fillStyle = '#ffea00';
      this.ctx.beginPath();
      this.ctx.moveTo(-12, -r + 4);
      this.ctx.lineTo(0, -r - 12);
      this.ctx.lineTo(12, -r + 4);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawCustomHalf(h) {
    this.ctx.save();
    this.ctx.globalAlpha = Math.max(0, h.alpha);
    this.ctx.translate(h.x, h.y);
    this.ctx.rotate(h.rotation);

    // Half circle slice showing inner pumpkin flesh
    this.ctx.fillStyle = h.color;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, h.radius, 0, Math.PI);
    this.ctx.closePath();
    this.ctx.fill();

    // Inner yellow pulp
    this.ctx.fillStyle = '#ffe082';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, h.radius * 0.7, 0, Math.PI);
    this.ctx.closePath();
    this.ctx.fill();

    // Seeds flying
    this.ctx.fillStyle = '#ffffff';
    [-8, 0, 8].forEach(off => {
      this.ctx.fillRect(off, 4, 3, 2);
    });

    this.ctx.restore();
  }

  drawHUD() {
    this.ctx.save();
    // Score
    this.ctx.font = 'bold 24px "Creepster", cursive, sans-serif';
    this.ctx.fillStyle = '#ff9900';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = '#ff2200';
    this.ctx.fillText(`SCORE: ${Math.floor(this.score).toLocaleString()}`, 20, 36);

    // Lives
    this.ctx.textAlign = 'right';
    let lifeIcons = '';
    for (let i = 0; i < this.maxLives; i++) {
      lifeIcons += i < this.lives ? '🎃 ' : '💀 ';
    }
    this.ctx.font = '22px serif';
    this.ctx.fillText(lifeIcons, this.width - 20, 36);

    if (this.frenzyActive) {
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#ff2200';
      this.ctx.font = 'bold 18px "Nosifer", cursive, sans-serif';
      this.ctx.fillText(`⚡ FRENZY MODE (${Math.ceil(this.frenzyTimer / 60)}s) ⚡`, this.width / 2, 36);
    }

    this.ctx.restore();
  }

  gameOver() {
    this.stop();
    const finalScore = Math.floor(this.score);

    if (window.spookyAudio) {
      window.spookyAudio.playScareStinger();
    }

    if (window.spookyNetwork) {
      window.spookyNetwork.submitScore('pumpkin', finalScore);
    }

    if (window.onSpookyGameOver) {
      window.onSpookyGameOver('pumpkin', finalScore);
    }
  }
}

window.PumpkinSlasherGame = PumpkinSlasherGame;
