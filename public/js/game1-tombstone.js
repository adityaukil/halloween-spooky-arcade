// Game 1: TOMBSTONE DASH (Endless Graveyard Runner & Jumper)
// Custom High-Fidelity Canvas Vector Graphics (No Generic Emojis)
// Clean Event Listener Lifecycle & Bulletproof Restarting

class TombstoneDashGame {
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

    // Player state
    this.groundY = 360;
    this.player = {
      x: 90,
      y: 312,
      baseY: 312,
      vy: 0,
      jumpForce: -13.5,
      gravity: 0.65,
      isGrounded: true,
      jumpCount: 0,
      maxJumps: 2,
      isDucking: false,
      width: 44,
      height: 48,
      shieldActive: false,
      invulnerableTimer: 0,
      phaseActive: false,
      phaseTimer: 0
    };

    // Environment & speed
    this.baseSpeed = 5.2;
    this.speed = 5.2;
    this.distance = 0;
    this.score = 0;
    this.lastReportedScore = 0;
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.itemTimer = 0;

    // Distant scenery
    this.scenery = [];
    for (let i = 0; i < 15; i++) {
      this.scenery.push({
        x: Math.random() * this.width,
        y: this.groundY - 15 - Math.random() * 25,
        type: Math.random() > 0.5 ? 'tomb' : 'cross',
        scale: 0.6 + Math.random() * 0.5
      });
    }

    this.bindControls();
  }

  bindControls() {
    this.boundKeydown = (e) => {
      if (!this.running) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        this.jump();
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.duck(true);
      }
    };

    this.boundKeyup = (e) => {
      if (!this.running) return;
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.duck(false);
      }
    };

    this.boundCanvasClick = (e) => {
      if (!this.running) return;
      this.jump();
    };

    this.boundTouch = (e) => {
      if (!this.running) return;
      e.preventDefault();
      this.jump();
    };

    window.addEventListener('keydown', this.boundKeydown);
    window.addEventListener('keyup', this.boundKeyup);
    if (this.canvas) {
      this.canvas.addEventListener('mousedown', this.boundCanvasClick);
      this.canvas.addEventListener('touchstart', this.boundTouch, { passive: false });
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('keydown', this.boundKeydown);
    window.removeEventListener('keyup', this.boundKeyup);
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.boundCanvasClick);
      this.canvas.removeEventListener('touchstart', this.boundTouch);
    }
  }

  restart() {
    this.stop();
    this.resetState();
    this.start();
  }

  resetState() {
    this.score = 0;
    this.lastReportedScore = 0;
    this.distance = 0;
    this.speed = this.baseSpeed;
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.itemTimer = 0;

    this.player.y = this.player.baseY;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.jumpCount = 0;
    this.player.isDucking = false;
    this.player.shieldActive = false;
    this.player.phaseActive = false;
    this.player.invulnerableTimer = 0;
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
      window.spookyAudio.playBoneRattle();
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

  jump() {
    if (this.player.jumpCount < this.player.maxJumps) {
      this.player.vy = this.player.jumpForce;
      this.player.jumpCount++;
      this.player.isGrounded = false;
      this.createBurst(this.player.x + 20, this.player.y + 40, '#ff7700', 8);
      if (window.spookyAudio) {
        window.spookyAudio.playBoneRattle();
      }
    }
  }

  duck(state) {
    this.player.isDucking = state;
    if (state) {
      this.player.height = 28;
      this.player.y = this.player.baseY + 16;
    } else {
      this.player.height = 48;
      if (this.player.isGrounded) {
        this.player.y = this.player.baseY;
      }
    }
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  update() {
    // Endless speed acceleration
    this.distance += this.speed * 0.05;
    this.speed = this.baseSpeed + Math.min(9.5, this.distance * 0.016);

    const mult = window.spookyNetwork ? window.spookyNetwork.scoreMultiplier : 1.0;
    this.score += (this.speed * 0.1) * mult;

    // Stream live progress to charge shared Haunt Meter
    if (this.score - this.lastReportedScore > 100) {
      const delta = Math.floor(this.score - this.lastReportedScore);
      this.lastReportedScore = this.score;
      if (window.spookyNetwork) {
        window.spookyNetwork.sendLiveProgress('tombstone', Math.floor(this.score), delta);
      }
    }

    // Player physics
    this.player.vy += this.player.gravity;
    this.player.y += this.player.vy;

    const currentBaseY = this.player.isDucking ? (this.groundY - 32) : (this.groundY - 48);

    if (this.player.y >= currentBaseY) {
      this.player.y = currentBaseY;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.jumpCount = 0;
    }

    // Powerup Timers
    if (this.player.phaseTimer > 0) {
      this.player.phaseTimer--;
      if (this.player.phaseTimer <= 0) this.player.phaseActive = false;
    }
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer--;
    }

    // Spawn Obstacles
    this.spawnTimer += this.speed;
    const spawnThreshold = Math.max(160, 420 - (this.speed * 18));
    if (this.spawnTimer > spawnThreshold) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    // Spawn Collectibles
    this.itemTimer += this.speed;
    if (this.itemTimer > 290) {
      this.itemTimer = 0;
      this.spawnCollectible();
    }

    // Update Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed;

      if (this.checkCollision(this.player, obs)) {
        if (this.player.phaseActive || this.player.invulnerableTimer > 0) {
          this.createBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, '#00ffcc', 10);
        } else if (this.player.shieldActive) {
          this.player.shieldActive = false;
          this.player.invulnerableTimer = 60;
          this.obstacles.splice(i, 1);
          this.createBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, '#ffcc00', 16);
          if (window.spookyAudio) window.spookyAudio.playExplosion();
          continue;
        } else {
          this.gameOver();
          return;
        }
      }

      if (obs.x + obs.width < -60) {
        this.obstacles.splice(i, 1);
      }
    }

    // Update Collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.x -= this.speed;
      item.floatY = Math.sin(Date.now() * 0.005 + item.x) * 6;

      if (this.checkCollision(this.player, { x: item.x, y: item.y + item.floatY, width: item.size, height: item.size })) {
        this.collectItem(item);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (item.x < -40) {
        this.collectibles.splice(i, 1);
      }
    }

    // Scenery update
    this.scenery.forEach(s => {
      s.x -= this.speed * 0.35;
      if (s.x < -60) s.x = this.width + 50 + Math.random() * 80;
    });

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.035;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  spawnObstacle() {
    const types = ['tombstone', 'skeleton_hand', 'flying_bat', 'cursed_skull'];
    const type = types[Math.floor(Math.random() * types.length)];

    let obs = {
      type,
      x: this.width + 40,
      width: 38,
      height: 48,
      y: this.groundY - 48
    };

    if (type === 'tombstone') {
      obs.width = 40;
      obs.height = 54;
      obs.y = this.groundY - obs.height;
    } else if (type === 'skeleton_hand') {
      obs.width = 34;
      obs.height = 44;
      obs.y = this.groundY - obs.height;
    } else if (type === 'flying_bat') {
      obs.width = 44;
      obs.height = 36;
      obs.y = this.groundY - 84; // Aerial duck obstacle!
    } else if (type === 'cursed_skull') {
      obs.width = 38;
      obs.height = 42;
      obs.y = this.groundY - obs.height;
    }

    this.obstacles.push(obs);
  }

  spawnCollectible() {
    const r = Math.random();
    let type = 'candy_corn';
    if (r > 0.85) type = 'potion_phase';
    else if (r > 0.70) type = 'shield_pumpkin';
    else if (r > 0.40) type = 'soul_orb';

    this.collectibles.push({
      type,
      x: this.width + 30,
      y: this.groundY - (Math.random() > 0.5 ? 40 : 100),
      size: 28,
      floatY: 0
    });
  }

  collectItem(item) {
    const mult = window.spookyNetwork ? window.spookyNetwork.scoreMultiplier : 1.0;
    if (item.type === 'candy_corn') {
      this.score += 75 * mult;
      this.createBurst(item.x, item.y, '#ffaa00', 12);
      if (window.spookyAudio) window.spookyAudio.playCandyChime();
    } else if (item.type === 'soul_orb') {
      this.score += 200 * mult;
      this.createBurst(item.x, item.y, '#00ffff', 16);
      if (window.spookyAudio) window.spookyAudio.playGhostWail();
    } else if (item.type === 'shield_pumpkin') {
      this.player.shieldActive = true;
      this.score += 150 * mult;
      this.createBurst(item.x, item.y, '#ff5500', 18);
      if (window.spookyAudio) window.spookyAudio.playCandyChime();
    } else if (item.type === 'potion_phase') {
      this.player.phaseActive = true;
      this.player.phaseTimer = 240;
      this.score += 300 * mult;
      this.createBurst(item.x, item.y, '#b700ff', 24);
      if (window.spookyAudio) window.spookyAudio.playGhostWail();
    }
  }

  checkCollision(p, o) {
    return (
      p.x < o.x + o.width &&
      p.x + p.width > o.x &&
      p.y < o.y + o.height &&
      p.y + p.height > o.y
    );
  }

  createBurst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.5) * 7,
        alpha: 1.0,
        color
      });
    }
  }

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const isBloodMoon = window.spookyNetwork && window.spookyNetwork.isBloodMoonActive;

    // Atmospheric Sky Gradient
    const sky = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
    if (isBloodMoon) {
      sky.addColorStop(0, '#2d020a');
      sky.addColorStop(1, '#5a0a1c');
    } else {
      sky.addColorStop(0, '#0c0514');
      sky.addColorStop(1, '#241038');
    }
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, this.width, this.groundY);

    // Weathered Tombs & Crosses in the background
    this.scenery.forEach(s => {
      this.ctx.fillStyle = isBloodMoon ? '#3f0c18' : '#1b0d2b';
      if (s.type === 'tomb') {
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, 14 * s.scale, Math.PI, 0);
        this.ctx.lineTo(s.x + 14 * s.scale, this.groundY);
        this.ctx.lineTo(s.x - 14 * s.scale, this.groundY);
        this.ctx.fill();
      } else {
        const w = 4 * s.scale;
        const h = 26 * s.scale;
        this.ctx.fillRect(s.x - w / 2, this.groundY - h, w, h);
        this.ctx.fillRect(s.x - 12 * s.scale, this.groundY - h * 0.7, 24 * s.scale, w);
      }
    });

    // Misty Ground
    const groundGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, isBloodMoon ? '#3b000f' : '#140c1d');
    groundGrad.addColorStop(1, '#050208');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Glowing Ectoplasm Ground Line
    this.ctx.strokeStyle = isBloodMoon ? '#ff2255' : '#00ff99';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();

    // Draw Obstacles
    this.obstacles.forEach(obs => this.drawCustomObstacle(obs));

    // Draw Collectibles
    this.collectibles.forEach(item => this.drawCustomCollectible(item));

    // Draw Player
    this.drawCustomPlayer();

    // Draw Particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw HUD
    this.drawHUD();
  }

  // --- High-Fidelity Custom Vector Drawing ---

  drawCustomPlayer() {
    this.ctx.save();
    const p = this.player;

    if (p.phaseActive) {
      this.ctx.globalAlpha = 0.55 + Math.sin(Date.now() * 0.02) * 0.3;
      this.ctx.shadowBlur = 18;
      this.ctx.shadowColor = '#00ffff';
    } else if (p.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      this.ctx.globalAlpha = 0.4;
    }

    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;

    // Shield Halo
    if (p.shieldActive) {
      this.ctx.strokeStyle = '#ffaa00';
      this.ctx.lineWidth = 3;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = '#ff6600';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // 1. Tattered Dark Cloak / Robe
    this.ctx.fillStyle = p.phaseActive ? '#3a0859' : '#180a26';
    this.ctx.beginPath();
    this.ctx.moveTo(cx, p.y + 12);
    // Left cloth drape
    this.ctx.quadraticCurveTo(p.x - 8, cy, p.x - 2, p.y + p.height);
    // Jagged bottom hem
    this.ctx.lineTo(cx - 8, p.y + p.height - 6);
    this.ctx.lineTo(cx, p.y + p.height);
    this.ctx.lineTo(cx + 8, p.y + p.height - 6);
    // Right cloth drape
    this.ctx.lineTo(p.x + p.width + 2, p.y + p.height);
    this.ctx.quadraticCurveTo(p.x + p.width + 8, cy, cx, p.y + 12);
    this.ctx.fill();

    // 2. High-Fidelity Carved Jack-o'-Lantern Head
    const headRadius = p.isDucking ? 14 : 17;
    const headY = p.isDucking ? p.y + 12 : p.y + 14;

    // Pumpkin body gradient (deep orange to bright glow)
    const pGrad = this.ctx.createRadialGradient(cx, headY, headRadius * 0.2, cx, headY, headRadius);
    pGrad.addColorStop(0, '#ffa726');
    pGrad.addColorStop(1, '#e65100');

    this.ctx.fillStyle = pGrad;
    this.ctx.beginPath();
    this.ctx.arc(cx, headY, headRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Pumpkin vertical ribs
    this.ctx.strokeStyle = '#bf360c';
    this.ctx.lineWidth = 1.2;
    [-7, 0, 7].forEach(offset => {
      this.ctx.beginPath();
      this.ctx.ellipse(cx + offset, headY, headRadius * 0.45, headRadius * 0.95, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    });

    // Witchy Green Stem
    this.ctx.fillStyle = '#2e7d32';
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 2, headY - headRadius);
    this.ctx.quadraticCurveTo(cx - 4, headY - headRadius - 6, cx - 1, headY - headRadius - 8);
    this.ctx.lineTo(cx + 2, headY - headRadius - 8);
    this.ctx.lineTo(cx + 3, headY - headRadius);
    this.ctx.fill();

    // Carved Glowing Yellow Eyes & Sinister Smile
    this.ctx.fillStyle = '#ffeb3b';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = '#ffea00';

    // Left eye (Triangle)
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 8, headY - 2);
    this.ctx.lineTo(cx - 3, headY - 2);
    this.ctx.lineTo(cx - 6, headY - 7);
    this.ctx.fill();

    // Right eye (Triangle)
    this.ctx.beginPath();
    this.ctx.moveTo(cx + 8, headY - 2);
    this.ctx.lineTo(cx + 3, headY - 2);
    this.ctx.lineTo(cx + 6, headY - 7);
    this.ctx.fill();

    // Jagged toothy mouth
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 9, headY + 3);
    this.ctx.lineTo(cx - 6, headY + 7);
    this.ctx.lineTo(cx - 3, headY + 4);
    this.ctx.lineTo(cx, headY + 8);
    this.ctx.lineTo(cx + 3, headY + 4);
    this.ctx.lineTo(cx + 6, headY + 7);
    this.ctx.lineTo(cx + 9, headY + 3);
    this.ctx.lineTo(cx + 6, headY + 4);
    this.ctx.lineTo(cx + 3, headY + 2);
    this.ctx.lineTo(cx, headY + 4);
    this.ctx.lineTo(cx - 3, headY + 2);
    this.ctx.lineTo(cx - 6, headY + 4);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawCustomObstacle(obs) {
    this.ctx.save();
    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;

    if (obs.type === 'tombstone') {
      // 1. Weathered Gothic Tombstone with cracks & cross
      this.ctx.fillStyle = '#423d4c';
      this.ctx.beginPath();
      this.ctx.arc(cx, obs.y + 14, obs.width / 2, Math.PI, 0);
      this.ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
      this.ctx.lineTo(obs.x, obs.y + obs.height);
      this.ctx.fill();

      // Stone highlight & cracks
      this.ctx.strokeStyle = '#2b2633';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      // Carved Crack
      this.ctx.beginPath();
      this.ctx.moveTo(cx + 4, obs.y + 10);
      this.ctx.lineTo(cx - 2, obs.y + 22);
      this.ctx.lineTo(cx + 2, obs.y + 32);
      this.ctx.stroke();

      // Carved Cross
      this.ctx.fillStyle = '#1e1a24';
      this.ctx.fillRect(cx - 2, obs.y + 16, 4, 18);
      this.ctx.fillRect(cx - 8, obs.y + 20, 16, 4);

      // R.I.P engraving
      this.ctx.font = 'bold 9px monospace';
      this.ctx.fillStyle = '#8a8296';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('R.I.P', cx, obs.y + 44);

    } else if (obs.type === 'skeleton_hand') {
      // 2. Clawing Skeletal Hand bursting from dirt mound
      // Dirt mound
      this.ctx.fillStyle = '#2b1b0d';
      this.ctx.beginPath();
      this.ctx.ellipse(cx, obs.y + obs.height, obs.width * 0.6, 8, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Bone arm & wrist
      this.ctx.fillStyle = '#e8dec8';
      this.ctx.fillRect(cx - 4, obs.y + 16, 8, obs.height - 16);

      // Clawing fingers
      [-9, -4, 2, 8].forEach(off => {
        this.ctx.beginPath();
        this.ctx.moveTo(cx + off, obs.y + 16);
        this.ctx.lineTo(cx + off - 2, obs.y + 6);
        this.ctx.lineTo(cx + off + 2, obs.y);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#e8dec8';
        this.ctx.stroke();
      });

    } else if (obs.type === 'flying_bat') {
      // 3. Flying Gothic Vampire Bat (Aerial Obstacle)
      const wingFlap = Math.sin(Date.now() * 0.02) * 12;

      this.ctx.fillStyle = '#140308';
      // Body
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy, 7, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Left Wing
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.quadraticCurveTo(cx - 14, cy - 16 + wingFlap, cx - 24, cy + wingFlap);
      this.ctx.quadraticCurveTo(cx - 12, cy + 6 + wingFlap, cx, cy + 6);
      this.ctx.fill();

      // Right Wing
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.quadraticCurveTo(cx + 14, cy - 16 + wingFlap, cx + 24, cy + wingFlap);
      this.ctx.quadraticCurveTo(cx + 12, cy + 6 + wingFlap, cx, cy + 6);
      this.ctx.fill();

      // Glowing Red Eyes
      this.ctx.fillStyle = '#ff0033';
      this.ctx.fillRect(cx - 3, cy - 4, 2, 2);
      this.ctx.fillRect(cx + 1, cy - 4, 2, 2);

    } else if (obs.type === 'cursed_skull') {
      // 4. Fiery Cursed Demon Skull
      // Skull cranium
      this.ctx.fillStyle = '#dcd2be';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy - 4, 14, 0, Math.PI * 2);
      this.ctx.fill();

      // Cheekbones & Jaw
      this.ctx.fillRect(cx - 8, cy + 4, 16, 10);

      // Hollow Glowing Eye Sockets
      this.ctx.fillStyle = '#ff1100';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#ff3300';
      this.ctx.beginPath();
      this.ctx.arc(cx - 5, cy - 3, 4, 0, Math.PI * 2);
      this.ctx.arc(cx + 5, cy - 3, 4, 0, Math.PI * 2);
      this.ctx.fill();

      // Teeth
      this.ctx.fillStyle = '#1a181c';
      this.ctx.fillRect(cx - 6, cy + 8, 3, 4);
      this.ctx.fillRect(cx - 1, cy + 8, 3, 4);
      this.ctx.fillRect(cx + 4, cy + 8, 3, 4);
    }

    this.ctx.restore();
  }

  drawCustomCollectible(item) {
    this.ctx.save();
    const cx = item.x + item.size / 2;
    const cy = item.y + item.floatY + item.size / 2;

    if (item.type === 'candy_corn') {
      // Glossy 3-tier Candy Corn
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - 14);
      this.ctx.lineTo(cx + 11, cy + 11);
      this.ctx.lineTo(cx - 11, cy + 11);
      this.ctx.closePath();

      // Yellow bottom
      this.ctx.fillStyle = '#ffcc00';
      this.ctx.fill();

      // Orange center
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - 14);
      this.ctx.lineTo(cx + 7, cy + 2);
      this.ctx.lineTo(cx - 7, cy + 2);
      this.ctx.fillStyle = '#ff6600';
      this.ctx.fill();

      // White tip
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - 14);
      this.ctx.lineTo(cx + 4, cy - 5);
      this.ctx.lineTo(cx - 4, cy - 5);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();

    } else if (item.type === 'soul_orb') {
      // Swirling Cyan Soul Orb with ethereal aura
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#00ffff';
      const soulGrad = this.ctx.createRadialGradient(cx, cy, 2, cx, cy, 11);
      soulGrad.addColorStop(0, '#ffffff');
      soulGrad.addColorStop(0.5, '#00e5ff');
      soulGrad.addColorStop(1, '#006064');

      this.ctx.fillStyle = soulGrad;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      this.ctx.fill();

    } else if (item.type === 'shield_pumpkin') {
      // Glowing Jack Shield emblem
      this.ctx.fillStyle = '#ff7700';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#ff9900';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

    } else if (item.type === 'potion_phase') {
      // Glowing Witch Potion Flask
      this.ctx.fillStyle = '#b700ff';
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = '#d500f9';

      // Flask bulb
      this.ctx.beginPath();
      this.ctx.arc(cx, cy + 3, 10, 0, Math.PI * 2);
      this.ctx.fill();

      // Neck & Cork
      this.ctx.fillStyle = '#795548';
      this.ctx.fillRect(cx - 3, cy - 12, 6, 6);
    }

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

    // Speed meter
    this.ctx.font = '14px monospace';
    this.ctx.fillStyle = '#00ffcc';
    this.ctx.fillText(`VELOCITY: ${(this.speed).toFixed(1)}x`, 20, 60);

    // Status Badges
    const badgeX = this.width - 20;
    this.ctx.textAlign = 'right';

    if (this.player.phaseActive) {
      this.ctx.fillStyle = '#00ffff';
      this.ctx.font = 'bold 15px monospace';
      this.ctx.fillText(`PHANTOM PHASE (${Math.ceil(this.player.phaseTimer / 60)}s)`, badgeX, 36);
    } else if (this.player.shieldActive) {
      this.ctx.fillStyle = '#ffaa00';
      this.ctx.font = 'bold 15px monospace';
      this.ctx.fillText('JACK SHIELD ACTIVE', badgeX, 36);
    }

    if (window.spookyNetwork && window.spookyNetwork.isBloodMoonActive) {
      this.ctx.fillStyle = '#ff2222';
      this.ctx.font = 'bold 16px "Nosifer", cursive, monospace';
      this.ctx.fillText('🩸 2X BLOOD MOON SURGE! 🩸', this.width / 2, 36);
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
      window.spookyNetwork.submitScore('tombstone', finalScore);
    }

    if (window.onSpookyGameOver) {
      window.onSpookyGameOver('tombstone', finalScore);
    }
  }
}

window.TombstoneDashGame = TombstoneDashGame;
