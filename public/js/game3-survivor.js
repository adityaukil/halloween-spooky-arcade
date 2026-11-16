// Game 3: MIDNIGHT SURVIVOR: THE CURSED CARNIVAL
// Endless Roguelite Bullet-Heaven Arena Survival (Vampire Survivors Style)
// 360-degree free movement, auto-firing occult weapons, level-up perk upgrades, and endless monster swarms!

class MidnightSurvivorGame {
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

    // Player State
    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      speed: 3.2,
      radius: 16,
      health: 100,
      maxHealth: 100,
      level: 1,
      xp: 0,
      xpNeeded: 10,
      // Arsenal
      orbitingPumpkins: 2,
      orbitAngle: 0,
      scytheTimer: 0,
      scytheInterval: 90, // Frames
      batTimer: 0,
      batInterval: 120
    };

    // Controls input state
    this.keys = { w: false, a: false, s: false, d: false };
    this.mouse = { x: this.width / 2, y: this.height / 2, isDown: false };

    // Game stats
    this.score = 0;
    this.lastReportedScore = 0;
    this.kills = 0;
    this.survivalSeconds = 0;
    this.lastSecondTime = Date.now();

    // Entities
    this.enemies = [];
    this.soulGems = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;

    this.bindControls();
  }

  bindControls() {
    this.boundKeyDown = (e) => {
      if (!this.running) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || e.code === 'ArrowUp') this.keys.w = true;
      if (k === 'a' || e.code === 'ArrowLeft') this.keys.a = true;
      if (k === 's' || e.code === 'ArrowDown') this.keys.s = true;
      if (k === 'd' || e.code === 'ArrowRight') this.keys.d = true;
    };

    this.boundKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.code === 'ArrowUp') this.keys.w = false;
      if (k === 'a' || e.code === 'ArrowLeft') this.keys.a = false;
      if (k === 's' || e.code === 'ArrowDown') this.keys.s = false;
      if (k === 'd' || e.code === 'ArrowRight') this.keys.d = false;
    };

    // Mouse / touch directional follow
    if (this.canvas) {
      const updateMouse = (clientX, clientY) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (clientX - rect.left) * (this.width / (rect.width || this.width));
        this.mouse.y = (clientY - rect.top) * (this.height / (rect.height || this.height));
      };

      this.boundMouseDown = (e) => {
        if (!this.running) return;
        this.mouse.isDown = true;
        updateMouse(e.clientX, e.clientY);
      };

      this.boundMouseMove = (e) => {
        if (!this.running) return;
        updateMouse(e.clientX, e.clientY);
      };

      this.boundMouseUp = () => {
        this.mouse.isDown = false;
      };

      this.boundTouchStart = (e) => {
        if (!this.running) return;
        e.preventDefault();
        this.mouse.isDown = true;
        if (e.touches[0]) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      };

      this.boundTouchMove = (e) => {
        if (!this.running) return;
        e.preventDefault();
        if (e.touches[0]) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      };

      this.boundTouchEnd = () => {
        this.mouse.isDown = false;
      };

      this.canvas.addEventListener('mousedown', this.boundMouseDown);
      window.addEventListener('mousemove', this.boundMouseMove);
      window.addEventListener('mouseup', this.boundMouseUp);

      this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
      this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
      window.addEventListener('touchend', this.boundTouchEnd);
    }

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  destroy() {
    this.stop();
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
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
    this.kills = 0;
    this.survivalSeconds = 0;
    this.lastSecondTime = Date.now();
    this.spawnTimer = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.health = 100;
    this.player.level = 1;
    this.player.xp = 0;
    this.player.xpNeeded = 10;
    this.player.orbitingPumpkins = 2;
    this.player.speed = 3.2;

    this.enemies = [];
    this.soulGems = [];
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

    this.lastSecondTime = Date.now();

    if (window.spookyAudio) {
      window.spookyAudio.playFuneralBell();
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
    const p = this.player;

    // Survival timer
    if (Date.now() - this.lastSecondTime >= 1000) {
      this.survivalSeconds++;
      this.lastSecondTime = Date.now();
      const mult = window.spookyNetwork ? window.spookyNetwork.scoreMultiplier : 1.0;
      this.score += 25 * mult;
    }

    // Movement handling (WASD or Mouse Follow)
    let moveX = 0;
    let moveY = 0;

    if (this.keys.w) moveY -= 1;
    if (this.keys.s) moveY += 1;
    if (this.keys.a) moveX -= 1;
    if (this.keys.d) moveX += 1;

    // If mouse held down, move toward mouse position
    if (this.mouse.isDown) {
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      if (Math.hypot(dx, dy) > 20) {
        const ang = Math.atan2(dy, dx);
        moveX = Math.cos(ang);
        moveY = Math.sin(ang);
      }
    }

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      p.x += (moveX / len) * p.speed;
      p.y += (moveY / len) * p.speed;
    }

    // Keep within carnival arena
    p.x = Math.max(p.radius + 10, Math.min(this.width - p.radius - 10, p.x));
    p.y = Math.max(p.radius + 10, Math.min(this.height - p.radius - 10, p.y));

    // 1. Orbiting Jack-o'-Lanterns (Auto-rotate and damage)
    p.orbitAngle += 0.05;
    const orbitRadius = 55;

    for (let i = 0; i < p.orbitingPumpkins; i++) {
      const angle = p.orbitAngle + (i * (Math.PI * 2 / p.orbitingPumpkins));
      const ox = p.x + Math.cos(angle) * orbitRadius;
      const oy = p.y + Math.sin(angle) * orbitRadius;

      // Check collision with enemies
      this.enemies.forEach((en, eIdx) => {
        if (Math.hypot(en.x - ox, en.y - oy) < en.radius + 14) {
          this.hitEnemy(en, eIdx, 1.5);
          this.createBurst(ox, oy, '#ff7700', 3);
        }
      });
    }

    // 2. Vorpal Scythe Auto-Sweep
    p.scytheTimer++;
    if (p.scytheTimer >= p.scytheInterval) {
      p.scytheTimer = 0;
      this.fireScytheSweep();
    }

    // 3. Bat Swarm Auto-Fire
    p.batTimer++;
    if (p.batTimer >= p.batInterval) {
      p.batTimer = 0;
      this.fireBatSwarm();
    }

    // Spawn Swarm Enemies
    this.spawnTimer++;
    const spawnThreshold = Math.max(14, 55 - Math.floor(this.survivalSeconds * 0.4));
    if (this.spawnTimer >= spawnThreshold) {
      this.spawnTimer = 0;
      this.spawnSwarmEnemy();
    }

    // Update Enemies (Chase player)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      const angle = Math.atan2(p.y - en.y, p.x - en.x);
      en.x += Math.cos(angle) * en.speed;
      en.y += Math.sin(angle) * en.speed;

      // Contact damage with player
      if (Math.hypot(p.x - en.x, p.y - en.y) < p.radius + en.radius) {
        p.health -= en.damage;
        this.createBurst(p.x, p.y, '#ff0044', 8);
        if (window.spookyAudio) window.spookyAudio.playScareStinger();

        if (p.health <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Update Projectiles (Scythes & Bats)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx;
      pr.y += pr.vy;
      pr.life--;

      // Hit detection
      this.enemies.forEach((en, eIdx) => {
        if (Math.hypot(en.x - pr.x, en.y - pr.y) < en.radius + pr.radius) {
          this.hitEnemy(en, eIdx, pr.damage);
          this.createBurst(pr.x, pr.y, pr.color, 4);
        }
      });

      if (pr.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // Collect Soul Gems (XP)
    for (let i = this.soulGems.length - 1; i >= 0; i--) {
      const gem = this.soulGems[i];
      const dist = Math.hypot(p.x - gem.x, p.y - gem.y);

      // Vacuum pull
      if (dist < 110) {
        gem.x += (p.x - gem.x) * 0.12;
        gem.y += (p.y - gem.y) * 0.12;
      }

      if (dist < p.radius + 12) {
        this.collectSoulGem(gem);
        this.soulGems.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= 0.035;
      if (pt.alpha <= 0) this.particles.splice(i, 1);
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const txt = this.floatingTexts[i];
      txt.y += txt.vy;
      txt.alpha -= 0.02;
      if (txt.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  fireScytheSweep() {
    // Cast scythe projectile in facing direction or toward nearest enemy
    let target = this.getNearestEnemy();
    const targetX = target ? target.x : this.player.x + 100;
    const targetY = target ? target.y : this.player.y;
    const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x);

    this.projectiles.push({
      x: this.player.x,
      y: this.player.y,
      vx: Math.cos(angle) * 7.5,
      vy: Math.sin(angle) * 7.5,
      radius: 22,
      damage: 4,
      life: 45,
      color: '#00ffcc',
      type: 'scythe'
    });

    if (window.spookyAudio) window.spookyAudio.playSlash();
  }

  fireBatSwarm() {
    for (let i = -1; i <= 1; i++) {
      const angle = (Math.random() * Math.PI * 2);
      this.projectiles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * 5.5,
        vy: Math.sin(angle) * 5.5,
        radius: 12,
        damage: 2.5,
        life: 60,
        color: '#ff0055',
        type: 'bat'
      });
    }
    if (window.spookyAudio) window.spookyAudio.playGhostWail();
  }

  getNearestEnemy() {
    let nearest = null;
    let minDist = Infinity;
    this.enemies.forEach(en => {
      const d = Math.hypot(this.player.x - en.x, this.player.y - en.y);
      if (d < minDist) {
        minDist = d;
        nearest = en;
      }
    });
    return nearest;
  }

  spawnSwarmEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * this.width; y = -20; }
    else if (side === 1) { x = this.width + 20; y = Math.random() * this.height; }
    else if (side === 2) { x = Math.random() * this.width; y = this.height + 20; }
    else { x = -20; y = Math.random() * this.height; }

    const isBoss = this.survivalSeconds > 0 && this.survivalSeconds % 45 === 0 && !this.enemies.some(e => e.isBoss);
    const speed = isBoss ? 0.7 : (1.2 + Math.random() * 0.8 + Math.min(1.5, this.survivalSeconds * 0.015));
    const hp = isBoss ? 25 : (1 + Math.floor(this.survivalSeconds * 0.05));

    this.enemies.push({
      x,
      y,
      speed,
      hp,
      maxHp: hp,
      radius: isBoss ? 34 : 15,
      damage: isBoss ? 25 : 8,
      isBoss,
      type: isBoss ? 'nightmare' : (Math.random() > 0.5 ? 'ghoul' : 'clown')
    });
  }

  hitEnemy(en, index, damage) {
    en.hp -= damage;
    if (en.hp <= 0) {
      this.enemies.splice(index, 1);
      this.kills++;

      // Drop Soul Gem
      this.soulGems.push({
        x: en.x,
        y: en.y,
        xpVal: en.isBoss ? 8 : 1
      });

      const mult = window.spookyNetwork ? window.spookyNetwork.scoreMultiplier : 1.0;
      const pts = Math.floor((en.isBoss ? 500 : 80) * mult);
      this.score += pts;

      this.createBurst(en.x, en.y, en.isBoss ? '#ff0033' : '#00ffff', en.isBoss ? 25 : 8);

      // Stream progress
      if (this.score - this.lastReportedScore > 130) {
        const delta = Math.floor(this.score - this.lastReportedScore);
        this.lastReportedScore = this.score;
        if (window.spookyNetwork) {
          window.spookyNetwork.sendLiveProgress('survivor', Math.floor(this.score), delta);
        }
      }
    }
  }

  collectSoulGem(gem) {
    this.player.xp += gem.xpVal;
    if (window.spookyAudio) window.spookyAudio.playCandyChime();

    // Check Level Up!
    if (this.player.xp >= this.player.xpNeeded) {
      this.player.xp -= this.player.xpNeeded;
      this.player.level++;
      this.player.xpNeeded = Math.floor(this.player.xpNeeded * 1.4);

      // Upgrade Perk Choice automatically applied
      const perks = ['orbit', 'scythe', 'speed', 'heal'];
      const perk = perks[this.player.level % perks.length];

      if (perk === 'orbit') {
        this.player.orbitingPumpkins++;
        this.addFloatingText('★ LEVEL UP: +1 ORBITING PUMPKIN! ★', this.player.x, this.player.y - 25, '#ffaa00');
      } else if (perk === 'scythe') {
        this.player.scytheInterval = Math.max(45, this.player.scytheInterval - 12);
        this.addFloatingText('★ LEVEL UP: SCYTHE RAPID ATTACK! ★', this.player.x, this.player.y - 25, '#00ffcc');
      } else if (perk === 'speed') {
        this.player.speed += 0.4;
        this.addFloatingText('★ LEVEL UP: SPECTRAL SPEED BOOST! ★', this.player.x, this.player.y - 25, '#ffff00');
      } else {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 35);
        this.addFloatingText('★ LEVEL UP: HEALTH RESTORED! ★', this.player.x, this.player.y - 25, '#39ff14');
      }

      this.createBurst(this.player.x, this.player.y, '#ffff00', 25);
    }
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

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const isBloodMoon = window.spookyNetwork && window.spookyNetwork.isBloodMoonActive;

    // Abandoned Carnival Arena Background
    const bgGrad = this.ctx.createRadialGradient(this.player.x, this.player.y, 40, this.player.x, this.player.y, 400);
    bgGrad.addColorStop(0, isBloodMoon ? '#36040c' : '#140624');
    bgGrad.addColorStop(1, '#06020c');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Arena Floor Cobblestones
    this.ctx.strokeStyle = 'rgba(255, 119, 0, 0.08)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y); this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // 1. Draw Soul Gems
    this.soulGems.forEach(g => {
      this.ctx.save();
      this.ctx.fillStyle = '#00ffff';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#00ffff';
      this.ctx.beginPath();
      this.ctx.arc(g.x, g.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 2. Draw Enemies
    this.enemies.forEach(en => this.drawEnemy(en));

    // 3. Draw Projectiles
    this.projectiles.forEach(pr => {
      this.ctx.save();
      this.ctx.fillStyle = pr.color;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = pr.color;
      this.ctx.beginPath();
      this.ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 4. Draw Orbiting Jack-o'-Lanterns
    this.drawOrbitingPumpkins();

    // 5. Draw Player Character
    this.drawPlayer();

    // 6. Draw Particles
    this.particles.forEach(pt => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, pt.alpha);
      this.ctx.fillStyle = pt.color;
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 7. Draw Floating Texts
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

    // 8. Draw HUD
    this.drawHUD();
  }

  drawPlayer() {
    this.ctx.save();
    const p = this.player;

    // Lantern Spotlight Radius around Player
    const lightGrad = this.ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, 160);
    lightGrad.addColorStop(0, 'rgba(255, 170, 0, 0.14)');
    lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = lightGrad;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, 160, 0, Math.PI * 2);
    this.ctx.fill();

    // Player Cloak Body
    this.ctx.fillStyle = '#2d114d';
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Glowing Eyes
    this.ctx.fillStyle = '#00ffcc';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = '#00ffcc';
    this.ctx.fillRect(p.x - 5, p.y - 4, 3, 3);
    this.ctx.fillRect(p.x + 2, p.y - 4, 3, 3);

    this.ctx.restore();
  }

  drawOrbitingPumpkins() {
    const p = this.player;
    const orbitRadius = 55;

    for (let i = 0; i < p.orbitingPumpkins; i++) {
      const angle = p.orbitAngle + (i * (Math.PI * 2 / p.orbitingPumpkins));
      const ox = p.x + Math.cos(angle) * orbitRadius;
      const oy = p.y + Math.sin(angle) * orbitRadius;

      this.ctx.save();
      this.ctx.fillStyle = '#ff7700';
      this.ctx.shadowBlur = 14;
      this.ctx.shadowColor = '#ff5500';

      this.ctx.beginPath();
      this.ctx.arc(ox, oy, 11, 0, Math.PI * 2);
      this.ctx.fill();

      // Glowing carved face on pumpkin
      this.ctx.fillStyle = '#ffff00';
      this.ctx.fillRect(ox - 3, oy - 3, 2, 2);
      this.ctx.fillRect(ox + 1, oy - 3, 2, 2);
      this.ctx.fillRect(ox - 2, oy + 2, 4, 2);

      this.ctx.restore();
    }
  }

  drawEnemy(en) {
    this.ctx.save();
    this.ctx.translate(en.x, en.y);

    if (en.isBoss) {
      // Carnival Nightmare Boss
      this.ctx.fillStyle = '#8b0000';
      this.ctx.shadowBlur = 18;
      this.ctx.shadowColor = '#ff0033';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(-10, -6, 6, 6);
      this.ctx.fillRect(4, -6, 6, 6);

      // HP Bar
      this.ctx.fillStyle = '#222';
      this.ctx.fillRect(-20, -en.radius - 10, 40, 5);
      this.ctx.fillStyle = '#00ff88';
      this.ctx.fillRect(-20, -en.radius - 10, (en.hp / en.maxHp) * 40, 5);
    } else {
      this.ctx.fillStyle = en.type === 'clown' ? '#e03a3e' : '#2b1b3d';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Glowing red monster eyes
      this.ctx.fillStyle = '#ff0033';
      this.ctx.fillRect(-4, -3, 2, 2);
      this.ctx.fillRect(2, -3, 2, 2);
    }

    this.ctx.restore();
  }

  drawHUD() {
    this.ctx.save();

    // Score & Timer
    this.ctx.font = 'bold 24px "Creepster", cursive, sans-serif';
    this.ctx.fillStyle = '#ff9900';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = '#ff2200';
    this.ctx.fillText(`SCORE: ${Math.floor(this.score).toLocaleString()}`, 20, 36);

    const minutes = Math.floor(this.survivalSeconds / 60);
    const seconds = this.survivalSeconds % 60;
    this.ctx.font = '16px monospace';
    this.ctx.fillStyle = '#00ffff';
    this.ctx.fillText(`SURVIVED: ${minutes}:${seconds < 10 ? '0' : ''}${seconds} | KILLS: ${this.kills}`, 20, 60);

    // Controls guide
    this.ctx.font = 'bold 12px monospace';
    this.ctx.fillStyle = '#aa99bb';
    this.ctx.fillText('MOVE: WASD / Arrow Keys / Click & Hold Mouse to steer character', 20, this.height - 18);

    // Health Bar
    const barW = 200;
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(this.width - 220, 20, barW, 14);
    this.ctx.fillStyle = this.player.health > 30 ? '#ff3344' : '#880011';
    this.ctx.fillRect(this.width - 220, 20, (Math.max(0, this.player.health) / this.player.maxHealth) * barW, 14);
    this.ctx.font = 'bold 11px monospace';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(`HEALTH: ${Math.max(0, Math.round(this.player.health))}%`, this.width - 215, 32);

    // EXP Bar
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(this.width - 220, 40, barW, 12);
    this.ctx.fillStyle = '#00ffcc';
    this.ctx.fillRect(this.width - 220, 40, (this.player.xp / this.player.xpNeeded) * barW, 12);
    this.ctx.font = 'bold 10px monospace';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(`LEVEL ${this.player.level} [${this.player.xp}/${this.player.xpNeeded} XP]`, this.width - 215, 50);

    this.ctx.restore();
  }

  gameOver() {
    this.stop();
    const finalScore = Math.floor(this.score);

    if (window.spookyAudio) {
      window.spookyAudio.playScareStinger();
    }

    if (window.spookyNetwork) {
      window.spookyNetwork.submitScore('survivor', finalScore);
    }

    if (window.onSpookyGameOver) {
      window.onSpookyGameOver('survivor', finalScore);
    }
  }
}

window.MidnightSurvivorGame = MidnightSurvivorGame;
