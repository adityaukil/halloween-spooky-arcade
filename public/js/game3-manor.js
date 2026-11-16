// Game 3: HAUNTED MANOR: SOUL INVASION (Endless Ghost Defense & Exorcist)
// Custom High-Fidelity Canvas Vector Graphics (No Generic Emojis)
// Clean Event Listener Lifecycle & Bulletproof Restarting

class HauntedManorGame {
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

    // Ward state
    this.wardHealth = 100;
    this.maxWardHealth = 100;
    this.mana = 0;
    this.maxMana = 100;
    this.score = 0;
    this.lastReportedScore = 0;
    this.wave = 1;
    this.ghostsDefeated = 0;

    this.ghosts = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;

    this.bindControls();
  }

  bindControls() {
    if (!this.canvas) return;

    const fireAt = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / (rect.width || this.width);
      const scaleY = this.height / (rect.height || this.height);
      const targetX = (clientX - rect.left) * scaleX;
      const targetY = (clientY - rect.top) * scaleY;

      this.fireSpell(targetX, targetY);
    };

    this.boundMouseDown = (e) => {
      if (!this.running) return;
      fireAt(e.clientX, e.clientY);
    };

    this.boundTouchStart = (e) => {
      if (!this.running) return;
      e.preventDefault();
      if (e.touches[0]) {
        fireAt(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    this.boundKeyDown = (e) => {
      if (!this.running) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.triggerNova();
      }
    };

    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    window.addEventListener('keydown', this.boundKeyDown);
  }

  destroy() {
    this.stop();
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.boundMouseDown);
      this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    }
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  restart() {
    this.stop();
    this.resetState();
    this.start();
  }

  resetState() {
    this.wardHealth = 100;
    this.mana = 30;
    this.score = 0;
    this.lastReportedScore = 0;
    this.wave = 1;
    this.ghostsDefeated = 0;
    this.spawnTimer = 0;

    this.ghosts = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
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
      window.spookyAudio.playGhostWail();
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
    this.wave = 1 + Math.floor(this.ghostsDefeated / 12);

    // Spawn logic
    this.spawnTimer++;
    const spawnThreshold = Math.max(25, 95 - this.wave * 4);

    if (this.spawnTimer >= spawnThreshold) {
      this.spawnTimer = 0;
      this.spawnGhost();
    }

    // Live progress
    if (this.score - this.lastReportedScore > 150) {
      const delta = Math.floor(this.score - this.lastReportedScore);
      this.lastReportedScore = this.score;
      if (window.spookyNetwork) {
        window.spookyNetwork.sendLiveProgress('manor', Math.floor(this.score), delta);
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (Math.random() > 0.4) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          alpha: 0.8,
          color: '#00ffff'
        });
      }

      let hit = false;
      for (let j = this.ghosts.length - 1; j >= 0; j--) {
        const g = this.ghosts[j];
        const dist = Math.hypot(p.x - g.x, p.y - g.y);
        if (dist < g.radius + 12) {
          hit = true;
          this.hitGhost(g, j, p.damage);
          break;
        }
      }

      if (hit || p.y < -30 || p.x < -30 || p.x > this.width + 30) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update ghosts
    const sanctuaryY = this.height - 52;
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.y += g.vy;
      g.x += Math.sin(Date.now() * 0.004 + g.seed) * g.drift;

      if (g.y >= sanctuaryY) {
        this.wardHealth -= g.damage;
        this.addFloatingText(`-${g.damage} WARD DAMAGE!`, g.x, sanctuaryY - 20, '#ff1133');
        this.createBurst(g.x, sanctuaryY, '#ff2200', 16);
        if (window.spookyAudio) window.spookyAudio.playExplosion();
        this.ghosts.splice(i, 1);

        if (this.wardHealth <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= 0.03;
      if (pt.alpha <= 0) this.particles.splice(i, 1);
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const txt = this.floatingTexts[i];
      txt.y += txt.vy;
      txt.alpha -= 0.02;
      if (txt.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  fireSpell(targetX, targetY) {
    const originX = this.width / 2;
    const originY = this.height - 35;

    const angle = Math.atan2(targetY - originY, targetX - originX);
    const speed = 14;

    this.projectiles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: 1
    });

    if (window.spookyAudio) {
      window.spookyAudio.playGhostWail();
    }
  }

  spawnGhost() {
    const types = ['specter', 'wraith', 'poltergeist', 'boss'];
    const r = Math.random();
    let type = 'specter';

    if (this.ghostsDefeated > 0 && this.ghostsDefeated % 15 === 0 && !this.ghosts.some(g => g.type === 'boss')) {
      type = 'boss';
    } else if (r < 0.25) {
      type = 'poltergeist';
    } else if (r < 0.55) {
      type = 'wraith';
    }

    let hp = 1;
    let radius = 24;
    let speed = 1.0 + Math.min(2.5, this.wave * 0.12);
    let drift = 1.2;
    let damage = 12;

    if (type === 'wraith') {
      speed *= 1.4;
      drift = 2.4;
      damage = 15;
    } else if (type === 'poltergeist') {
      hp = 2;
      radius = 28;
      damage = 22;
    } else if (type === 'boss') {
      hp = 6 + Math.floor(this.wave * 1.5);
      radius = 44;
      speed = 0.6;
      drift = 0.8;
      damage = 40;
      this.addFloatingText('⚠️ ANCIENT PHANTOM DESCENDS! ⚠️', this.width / 2, 90, '#ff0033');
    }

    this.ghosts.push({
      type,
      x: 60 + Math.random() * (this.width - 120),
      y: -30,
      vy: speed,
      drift,
      seed: Math.random() * 100,
      hp,
      maxHp: hp,
      radius,
      damage
    });
  }

  hitGhost(ghost, index, damage) {
    ghost.hp -= damage;
    this.createBurst(ghost.x, ghost.y, '#00ffff', 8);

    if (ghost.hp <= 0) {
      this.ghosts.splice(index, 1);
      this.ghostsDefeated++;

      const mult = window.spookyNetwork ? window.spookyNetwork.scoreMultiplier : 1.0;
      let pts = ghost.type === 'boss' ? 800 : (ghost.type === 'poltergeist' ? 250 : 120);
      pts = Math.floor(pts * mult);
      this.score += pts;

      this.mana = Math.min(this.maxMana, this.mana + (ghost.type === 'boss' ? 35 : 12));

      this.addFloatingText(`+${pts}`, ghost.x, ghost.y - 10, '#00ffcc');
      this.createBurst(ghost.x, ghost.y, '#ffaa00', ghost.type === 'boss' ? 30 : 16);

      if (window.spookyAudio) {
        window.spookyAudio.playCandyChime();
      }
    }
  }

  triggerNova() {
    if (this.mana < this.maxMana) {
      this.addFloatingText('NEED 100% SOUL MANA!', this.width / 2, this.height - 80, '#ff9900');
      return;
    }

    this.mana = 0;
    this.addFloatingText('💥 HOLY PUMPKIN NOVA UNLEASHED! 💥', this.width / 2, 180, '#ffdd00');

    if (window.spookyAudio) {
      window.spookyAudio.playExplosion();
      window.spookyAudio.playBloodMoonRiser();
    }

    const mult = window.spookyNetwork ? window.spookyNetwork.scoreMultiplier : 1.0;
    let totalNovaPts = 0;

    this.ghosts.forEach(g => {
      totalNovaPts += (g.type === 'boss' ? 900 : 200) * mult;
      this.createBurst(g.x, g.y, '#ffff00', 25);
    });

    this.score += totalNovaPts;
    this.ghostsDefeated += this.ghosts.length;
    this.ghosts = [];
  }

  createBurst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
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
      vy: -1.6,
      alpha: 1.0,
      color
    });
  }

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const isBloodMoon = window.spookyNetwork && window.spookyNetwork.isBloodMoonActive;

    // Background Castle Silhouette
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, isBloodMoon ? '#33030c' : '#0a0512');
    bgGrad.addColorStop(1, isBloodMoon ? '#170105' : '#1d0f2b');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Gothic Manor Turrets
    this.ctx.fillStyle = '#060309';
    this.ctx.fillRect(180, 80, 440, 260);
    this.ctx.fillRect(150, 40, 60, 300);
    this.ctx.beginPath();
    this.ctx.moveTo(140, 40); this.ctx.lineTo(180, -20); this.ctx.lineTo(220, 40);
    this.ctx.fill();

    this.ctx.fillRect(590, 40, 60, 300);
    this.ctx.beginPath();
    this.ctx.moveTo(580, 40); this.ctx.lineTo(620, -20); this.ctx.lineTo(660, 40);
    this.ctx.fill();

    // Creepy lit windows
    const windowColor = isBloodMoon ? '#ff2222' : '#ffaa00';
    this.ctx.fillStyle = windowColor;
    [[220, 120], [280, 120], [480, 120], [540, 120], [380, 80]].forEach(([wx, wy]) => {
      this.ctx.beginPath();
      this.ctx.arc(wx + 10, wy, 10, Math.PI, 0);
      this.ctx.fillRect(wx, wy, 20, 30);
    });

    // Draw Sanctuary
    this.drawSanctuary();

    // Draw Ghosts
    this.ghosts.forEach(g => this.drawCustomGhost(g));

    // Draw Projectiles
    this.projectiles.forEach(p => {
      this.ctx.save();
      this.ctx.fillStyle = '#00ffff';
      this.ctx.shadowBlur = 14;
      this.ctx.shadowColor = '#00ffff';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw Particles
    this.particles.forEach(pt => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, pt.alpha);
      this.ctx.fillStyle = pt.color;
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw Floating Texts
    this.floatingTexts.forEach(txt => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, txt.alpha);
      this.ctx.font = 'bold 18px "Creepster", cursive, sans-serif';
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

  drawSanctuary() {
    this.ctx.save();
    const cx = this.width / 2;
    const cy = this.height - 30;

    // Glowing ward circle
    this.ctx.strokeStyle = this.wardHealth > 30 ? '#00ffaa' : '#ff2244';
    this.ctx.lineWidth = 4;
    this.ctx.shadowBlur = 16;
    this.ctx.shadowColor = this.ctx.strokeStyle;

    this.ctx.beginPath();
    this.ctx.arc(cx, cy + 30, 160, Math.PI, 0);
    this.ctx.stroke();

    // Occult runes along edge
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.5;
    [-110, -60, 0, 60, 110].forEach(rx => {
      this.ctx.beginPath();
      this.ctx.arc(cx + rx, cy - 10, 6, 0, Math.PI * 2);
      this.ctx.stroke();
    });

    // Central Exorcist Jack-o'-Lantern altar
    const aRadius = 20;
    this.ctx.fillStyle = '#ff7700';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#ffaa00';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, aRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Carved Altar Face
    this.ctx.fillStyle = '#ffe600';
    this.ctx.fillRect(cx - 8, cy - 6, 4, 4);
    this.ctx.fillRect(cx + 4, cy - 6, 4, 4);
    this.ctx.fillRect(cx - 6, cy + 3, 12, 4);

    this.ctx.restore();
  }

  // --- High-Fidelity Custom Vector Ghost Enemies ---

  drawCustomGhost(g) {
    this.ctx.save();
    this.ctx.translate(g.x, g.y);

    if (g.type === 'boss') {
      // 1. Giant Demon Specter Boss
      const bRad = g.radius;

      // Fiery Red Demon Horns & Head
      this.ctx.fillStyle = '#d50000';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = '#ff1744';

      this.ctx.beginPath();
      this.ctx.arc(0, 0, bRad * 0.7, 0, Math.PI * 2);
      this.ctx.fill();

      // Horns
      this.ctx.fillStyle = '#212121';
      this.ctx.beginPath();
      this.ctx.moveTo(-bRad * 0.5, -bRad * 0.4);
      this.ctx.quadraticCurveTo(-bRad * 0.8, -bRad * 1.1, -bRad * 0.3, -bRad * 1.2);
      this.ctx.quadraticCurveTo(-bRad * 0.4, -bRad * 0.7, -bRad * 0.2, -bRad * 0.5);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(bRad * 0.5, -bRad * 0.4);
      this.ctx.quadraticCurveTo(bRad * 0.8, -bRad * 1.1, bRad * 0.3, -bRad * 1.2);
      this.ctx.quadraticCurveTo(bRad * 0.4, -bRad * 0.7, bRad * 0.2, -bRad * 0.5);
      this.ctx.fill();

      // Glowing Demonic Eyes & Grin
      this.ctx.fillStyle = '#ffff00';
      this.ctx.fillRect(-16, -8, 10, 6);
      this.ctx.fillRect(6, -8, 10, 6);
      this.ctx.fillRect(-14, 8, 28, 8);

      // Boss HP Bar
      this.ctx.fillStyle = '#333333';
      this.ctx.fillRect(-28, -bRad - 16, 56, 7);
      this.ctx.fillStyle = '#00ff88';
      this.ctx.fillRect(-28, -bRad - 16, (g.hp / g.maxHp) * 56, 7);

    } else if (g.type === 'poltergeist') {
      // 2. Swirling Necrotic Purple Poltergeist
      this.ctx.fillStyle = '#aa00ff';
      this.ctx.shadowBlur = 14;
      this.ctx.shadowColor = '#e040fb';

      this.ctx.beginPath();
      this.ctx.arc(0, -4, 18, 0, Math.PI * 2);
      this.ctx.fill();

      // Glowing Cyan Eye Sockets
      this.ctx.fillStyle = '#00ffff';
      this.ctx.beginPath();
      this.ctx.arc(-6, -4, 4, 0, Math.PI * 2);
      this.ctx.arc(6, -4, 4, 0, Math.PI * 2);
      this.ctx.fill();

      // Teeth
      this.ctx.fillStyle = '#120024';
      this.ctx.fillRect(-8, 6, 16, 6);

    } else if (g.type === 'wraith') {
      // 3. Fast Shadow Phantom Bat
      const wingW = Math.sin(Date.now() * 0.02) * 8;
      this.ctx.fillStyle = '#1a0026';
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 8, 14, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#4a148c';
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-24, wingW - 12);
      this.ctx.lineTo(0, 8);
      this.ctx.lineTo(24, wingW - 12);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#ff0033';
      this.ctx.fillRect(-4, -4, 2, 2);
      this.ctx.fillRect(2, -4, 2, 2);

    } else {
      // 4. Classic Translucent Wailing Ghost
      this.ctx.fillStyle = 'rgba(230, 245, 255, 0.88)';
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = '#00e5ff';

      this.ctx.beginPath();
      this.ctx.arc(0, -8, 16, Math.PI, 0);
      // Floating wavy ghost skirt
      const waveOffset = Math.sin(Date.now() * 0.01 + g.seed) * 5;
      this.ctx.lineTo(16, 14);
      this.ctx.quadraticCurveTo(8, 8 + waveOffset, 0, 16);
      this.ctx.quadraticCurveTo(-8, 8 - waveOffset, -16, 14);
      this.ctx.closePath();
      this.ctx.fill();

      // Hollow dark wailing eyes & open mouth
      this.ctx.fillStyle = '#0a101d';
      this.ctx.beginPath();
      this.ctx.ellipse(-5, -6, 3, 5, 0, 0, Math.PI * 2);
      this.ctx.ellipse(5, -6, 3, 5, 0, 0, Math.PI * 2);
      this.ctx.ellipse(0, 2, 4, 7, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawHUD() {
    this.ctx.save();

    // Score & Wave
    this.ctx.font = 'bold 24px "Creepster", cursive, sans-serif';
    this.ctx.fillStyle = '#ff9900';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = '#ff2200';
    this.ctx.fillText(`SCORE: ${Math.floor(this.score).toLocaleString()}`, 20, 36);

    this.ctx.font = '16px monospace';
    this.ctx.fillStyle = '#00ffff';
    this.ctx.fillText(`WAVE: ${this.wave}`, 20, 60);

    // Ward HP Bar
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(this.width - 220, 20, 200, 16);
    this.ctx.fillStyle = this.wardHealth > 35 ? '#00ff88' : '#ff2222';
    this.ctx.fillRect(this.width - 220, 20, (this.wardHealth / this.maxWardHealth) * 200, 16);
    this.ctx.font = 'bold 12px monospace';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(`WARD INTEGRITY: ${Math.max(0, this.wardHealth)}%`, this.width - 215, 33);

    // Soul Mana / Nova Bar
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(this.width - 220, 44, 200, 14);
    this.ctx.fillStyle = this.mana >= this.maxMana ? '#ffcc00' : '#8833ff';
    this.ctx.fillRect(this.width - 220, 44, (this.mana / this.maxMana) * 200, 14);
    this.ctx.font = 'bold 11px monospace';
    this.ctx.fillStyle = '#fff';
    const novaText = this.mana >= this.maxMana ? '★ READY: SPACEBAR NOVA ★' : `MANA: ${Math.round(this.mana)}%`;
    this.ctx.fillText(novaText, this.width - 215, 55);

    this.ctx.restore();
  }

  gameOver() {
    this.stop();
    const finalScore = Math.floor(this.score);

    if (window.spookyAudio) {
      window.spookyAudio.playScareStinger();
    }

    if (window.spookyNetwork) {
      window.spookyNetwork.submitScore('manor', finalScore);
    }

    if (window.onSpookyGameOver) {
      window.onSpookyGameOver('manor', finalScore);
    }
  }
}

window.HauntedManorGame = HauntedManorGame;
