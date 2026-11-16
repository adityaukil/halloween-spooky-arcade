// Game 2: NECROMANCER'S RITUAL: RUNE WEAVING
// Real-Time Occult Gesture Drawing & Spell Synthesis (Brand New Modern Concept)
// Draw magical runes (Circle, Line, V-Shape, Z-Lightning, Triangle) to unleash devastating dark magic against endless undead hordes!

class NecromancerRitualGame {
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

    // Ritual Altar Center
    this.altar = {
      x: this.width / 2,
      y: this.height / 2,
      radius: 38,
      health: 100,
      maxHealth: 100
    };

    // Gesture input tracking
    this.gesturePoints = [];
    this.isDrawing = false;

    // Game stats
    this.score = 0;
    this.lastReportedScore = 0;
    this.wave = 1;
    this.enemiesDefeated = 0;
    this.comboCount = 0;
    this.comboTimer = 0;

    // Entities
    this.enemies = [];
    this.spells = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;

    this.bindControls();
  }

  bindControls() {
    if (!this.canvas) return;

    const addGesturePt = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const ptX = (clientX - rect.left) * (this.width / (rect.width || this.width));
      const ptY = (clientY - rect.top) * (this.height / (rect.height || this.height));
      this.gesturePoints.push({ x: ptX, y: ptY });
    };

    this.boundMouseDown = (e) => {
      if (!this.running) return;
      this.isDrawing = true;
      this.gesturePoints = [];
      addGesturePt(e.clientX, e.clientY);
    };

    this.boundMouseMove = (e) => {
      if (!this.running || !this.isDrawing) return;
      addGesturePt(e.clientX, e.clientY);
    };

    this.boundMouseUp = () => {
      if (!this.running || !this.isDrawing) return;
      this.isDrawing = false;
      this.recognizeAndCastGesture();
      this.gesturePoints = [];
    };

    this.boundTouchStart = (e) => {
      if (!this.running) return;
      e.preventDefault();
      this.isDrawing = true;
      this.gesturePoints = [];
      if (e.touches[0]) addGesturePt(e.touches[0].clientX, e.touches[0].clientY);
    };

    this.boundTouchMove = (e) => {
      if (!this.running || !this.isDrawing) return;
      e.preventDefault();
      if (e.touches[0]) addGesturePt(e.touches[0].clientX, e.touches[0].clientY);
    };

    this.boundTouchEnd = () => {
      if (!this.running || !this.isDrawing) return;
      this.isDrawing = false;
      this.recognizeAndCastGesture();
      this.gesturePoints = [];
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
    this.wave = 1;
    this.enemiesDefeated = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.spawnTimer = 0;

    this.altar.health = 100;
    this.enemies = [];
    this.spells = [];
    this.particles = [];
    this.floatingTexts = [];
    this.gesturePoints = [];
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

  // Real-Time Geometric Rune Recognizer
  recognizeAndCastGesture() {
    const pts = this.gesturePoints;
    if (pts.length < 5) return;

    const start = pts[0];
    const end = pts[pts.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const startEndDist = Math.hypot(dx, dy);

    // Calculate bounding box and path length
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let pathLen = 0;

    for (let i = 0; i < pts.length; i++) {
      minX = Math.min(minX, pts[i].x);
      maxX = Math.max(maxX, pts[i].x);
      minY = Math.min(minY, pts[i].y);
      maxY = Math.max(maxY, pts[i].y);
      if (i > 0) {
        pathLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      }
    }

    const boxW = maxX - minX;
    const boxH = maxY - minY;
    const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

    if (pathLen < 35) return;

    // 1. Check CIRCLE (ends close together, high roundness)
    if (startEndDist < Math.max(boxW, boxH) * 0.45 && boxW > 40 && boxH > 40) {
      this.castHellfireNova(center.x, center.y, Math.max(50, (boxW + boxH) / 2));
      return;
    }

    // 2. Check V-SHAPE (starts top left, dips down middle, ends top right)
    let lowestPt = pts[0];
    pts.forEach(p => { if (p.y > lowestPt.y) lowestPt = p; });
    if (lowestPt.y - start.y > 40 && lowestPt.y - end.y > 40 && Math.abs(start.x - end.x) > 40) {
      this.castBatSwarm(center.x, center.y);
      return;
    }

    // 3. Check STRAIGHT SLASH (Bone Cleave)
    const straightness = startEndDist / pathLen;
    if (straightness > 0.82) {
      this.castBoneCleave(start, end);
      return;
    }

    // 4. Default: Cursed Necrotic Lightning
    this.castChainLightning(center.x, center.y);
  }

  castHellfireNova(x, y, radius) {
    this.spells.push({
      type: 'nova',
      x,
      y,
      radius: 10,
      maxRadius: radius * 1.4,
      damage: 3,
      alpha: 1.0,
      color: '#ff5500'
    });

    this.onSpellCast('🔥 HELLFIRE NOVA!', x, y, '#ff7700');
    if (window.spookyAudio) window.spookyAudio.playExplosion();
  }

  castBoneCleave(start, end) {
    this.spells.push({
      type: 'cleave',
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      life: 14,
      maxLife: 14,
      color: '#00ffcc'
    });

    this.onSpellCast('🗡️ BONE CLEAVE!', (start.x + end.x) / 2, (start.y + end.y) / 2, '#00ffcc');
    if (window.spookyAudio) window.spookyAudio.playSlash();
  }

  castBatSwarm(x, y) {
    this.spells.push({
      type: 'bats',
      x,
      y,
      count: 6,
      life: 60,
      color: '#ff0055'
    });

    this.onSpellCast('🦇 VORPAL BATS!', x, y, '#ff0055');
    if (window.spookyAudio) window.spookyAudio.playGhostWail();
  }

  castChainLightning(x, y) {
    this.spells.push({
      type: 'lightning',
      x,
      y,
      radius: 140,
      life: 12,
      color: '#b700ff'
    });

    this.onSpellCast('⚡ CHAIN CURSE!', x, y, '#d500f9');
    if (window.spookyAudio) window.spookyAudio.playThunder();
  }

  onSpellCast(name, x, y, color) {
    this.comboCount++;
    this.comboTimer = 65;
    this.addFloatingText(`${name} (Combo x${this.comboCount})`, x, y - 20, color);
    this.createBurst(x, y, color, 14);
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  update() {
    this.wave = 1 + Math.floor(this.enemiesDefeated / 10);

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    // Spawn Enemies from screen edges converging to Altar
    this.spawnTimer++;
    const threshold = Math.max(22, 85 - this.wave * 4);
    if (this.spawnTimer >= threshold) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    // Update Spells & Hit Detection
    for (let i = this.spells.length - 1; i >= 0; i--) {
      const sp = this.spells[i];

      if (sp.type === 'nova') {
        sp.radius += 8;
        sp.alpha -= 0.05;

        this.enemies.forEach((en, eIdx) => {
          if (Math.hypot(en.x - sp.x, en.y - sp.y) < sp.radius + en.radius) {
            this.hitEnemy(en, eIdx, sp.damage);
          }
        });

        if (sp.radius >= sp.maxRadius || sp.alpha <= 0) {
          this.spells.splice(i, 1);
        }
      } else if (sp.type === 'cleave') {
        sp.life--;
        this.enemies.forEach((en, eIdx) => {
          if (this.distToSegment(en.x, en.y, sp.x1, sp.y1, sp.x2, sp.y2) < en.radius + 15) {
            this.hitEnemy(en, eIdx, 4);
          }
        });
        if (sp.life <= 0) this.spells.splice(i, 1);
      } else if (sp.type === 'bats') {
        sp.life--;
        // Target nearest enemies
        this.enemies.forEach((en, eIdx) => {
          if (Math.hypot(en.x - sp.x, en.y - sp.y) < 180) {
            this.hitEnemy(en, eIdx, 1);
          }
        });
        if (sp.life <= 0) this.spells.splice(i, 1);
      } else if (sp.type === 'lightning') {
        sp.life--;
        this.enemies.forEach((en, eIdx) => {
          if (Math.hypot(en.x - sp.x, en.y - sp.y) < sp.radius) {
            this.hitEnemy(en, eIdx, 2);
          }
        });
        if (sp.life <= 0) this.spells.splice(i, 1);
      }
    }

    // Update Enemies (Moving toward Altar)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      const angle = Math.atan2(this.altar.y - en.y, this.altar.x - en.x);
      en.x += Math.cos(angle) * en.speed;
      en.y += Math.sin(angle) * en.speed;

      // Reached Altar
      if (Math.hypot(en.x - this.altar.x, en.y - this.altar.y) < this.altar.radius + en.radius) {
        this.altar.health -= en.damage;
        this.createBurst(this.altar.x, this.altar.y, '#ff0033', 14);
        if (window.spookyAudio) window.spookyAudio.playExplosion();
        this.enemies.splice(i, 1);

        if (this.altar.health <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const txt = this.floatingTexts[i];
      txt.y += txt.vy;
      txt.alpha -= 0.02;
      if (txt.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;

    if (side === 0) { x = Math.random() * this.width; y = -30; }
    else if (side === 1) { x = this.width + 30; y = Math.random() * this.height; }
    else if (side === 2) { x = Math.random() * this.width; y = this.height + 30; }
    else { x = -30; y = Math.random() * this.height; }

    const isBoss = this.enemiesDefeated > 0 && this.enemiesDefeated % 15 === 0 && !this.enemies.some(e => e.isBoss);
    const speed = isBoss ? 0.6 : (1.1 + Math.min(2.0, this.wave * 0.1));
    const hp = isBoss ? (8 + this.wave * 2) : (Math.random() > 0.7 ? 3 : 1);

    this.enemies.push({
      x,
      y,
      speed,
      hp,
      maxHp: hp,
      radius: isBoss ? 36 : (hp > 1 ? 24 : 16),
      damage: isBoss ? 35 : (hp > 1 ? 18 : 10),
      isBoss,
      type: isBoss ? 'golem' : (hp > 1 ? 'wight' : 'ghoul')
    });
  }

  hitEnemy(en, index, damage) {
    en.hp -= damage;
    this.createBurst(en.x, en.y, '#ffaa00', 6);

    if (en.hp <= 0) {
      this.enemies.splice(index, 1);
      this.enemiesDefeated++;

      const mult = window.spookyNetwork ? window.spookyNetwork.scoreMultiplier : 1.0;
      const comboMult = 1.0 + (this.comboCount * 0.2);
      const basePts = en.isBoss ? 800 : (en.maxHp > 1 ? 250 : 120);
      const earned = Math.floor(basePts * comboMult * mult);

      this.score += earned;
      this.addFloatingText(`+${earned}`, en.x, en.y - 12, '#00ffcc');
      this.createBurst(en.x, en.y, en.isBoss ? '#ff0033' : '#9d00ff', en.isBoss ? 30 : 12);
      if (window.spookyAudio) window.spookyAudio.playCandyChime();

      // Progress stream
      if (this.score - this.lastReportedScore > 140) {
        const delta = Math.floor(this.score - this.lastReportedScore);
        this.lastReportedScore = this.score;
        if (window.spookyNetwork) {
          window.spookyNetwork.sendLiveProgress('necromancer', Math.floor(this.score), delta);
        }
      }
    }
  }

  createBurst(x, y, color, count = 8) {
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

    // Dark Ritual Chamber Background
    const bgGrad = this.ctx.createRadialGradient(this.width / 2, this.height / 2, 60, this.width / 2, this.height / 2, 450);
    bgGrad.addColorStop(0, isBloodMoon ? '#36030c' : '#140624');
    bgGrad.addColorStop(1, '#05010a');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 1. Draw Bloody Summoning Pentagram on ground
    this.drawPentagram();

    // 2. Draw Active Spells
    this.drawSpells();

    // 3. Draw Enemies
    this.enemies.forEach(en => this.drawEnemy(en));

    // 4. Draw Center Necromancer Altar
    this.drawAltar();

    // 5. Draw Active Rune Drawing Trail (Player's current gesture)
    this.drawGestureTrail();

    // 6. Draw Particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
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

  drawPentagram() {
    this.ctx.save();
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = 160;

    this.ctx.strokeStyle = 'rgba(230, 0, 57, 0.35)';
    this.ctx.lineWidth = 2.5;

    // Concentric ritual rings
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    this.ctx.stroke();

    // 5-Pointed Star
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawAltar() {
    this.ctx.save();
    const cx = this.altar.x;
    const cy = this.altar.y;

    // Outer obsidian altar base
    this.ctx.fillStyle = '#11051c';
    this.ctx.strokeStyle = '#9d00ff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, this.altar.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Necromancer Figure
    this.ctx.fillStyle = '#6a0dad';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 4, 14, 0, Math.PI * 2);
    this.ctx.fill();

    // Glowing skull mask
    this.ctx.fillStyle = '#00ffff';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#00ffff';
    this.ctx.fillRect(cx - 5, cy - 6, 3, 4);
    this.ctx.fillRect(cx + 2, cy - 6, 3, 4);

    this.ctx.restore();
  }

  drawGestureTrail() {
    if (this.gesturePoints.length < 2) return;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(this.gesturePoints[0].x, this.gesturePoints[0].y);
    for (let i = 1; i < this.gesturePoints.length; i++) {
      this.ctx.lineTo(this.gesturePoints[i].x, this.gesturePoints[i].y);
    }
    this.ctx.strokeStyle = '#00ffcc';
    this.ctx.lineWidth = 5;
    this.ctx.lineCap = 'round';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#00ffff';
    this.ctx.stroke();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawSpells() {
    this.spells.forEach(sp => {
      this.ctx.save();
      if (sp.type === 'nova') {
        this.ctx.globalAlpha = Math.max(0, sp.alpha);
        this.ctx.strokeStyle = sp.color;
        this.ctx.lineWidth = 6;
        this.ctx.shadowBlur = 18;
        this.ctx.shadowColor = sp.color;
        this.ctx.beginPath();
        this.ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (sp.type === 'cleave') {
        this.ctx.strokeStyle = sp.color;
        this.ctx.lineWidth = 8;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = sp.color;
        this.ctx.beginPath();
        this.ctx.moveTo(sp.x1, sp.y1);
        this.ctx.lineTo(sp.x2, sp.y2);
        this.ctx.stroke();
      }
      this.ctx.restore();
    });
  }

  drawEnemy(en) {
    this.ctx.save();
    this.ctx.translate(en.x, en.y);

    if (en.isBoss) {
      // Flesh Golem Boss
      this.ctx.fillStyle = '#4a0815';
      this.ctx.shadowBlur = 16;
      this.ctx.shadowColor = '#ff0033';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ff0033';
      this.ctx.fillRect(-12, -8, 8, 6);
      this.ctx.fillRect(4, -8, 8, 6);

      // HP Bar
      this.ctx.fillStyle = '#222';
      this.ctx.fillRect(-22, -en.radius - 12, 44, 6);
      this.ctx.fillStyle = '#00ff88';
      this.ctx.fillRect(-22, -en.radius - 12, (en.hp / en.maxHp) * 44, 6);
    } else {
      // Shambling Wight / Ghoul
      this.ctx.fillStyle = en.maxHp > 1 ? '#280f38' : '#e0d6c3';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Glowing eyes
      this.ctx.fillStyle = '#ff2200';
      this.ctx.fillRect(-5, -4, 3, 3);
      this.ctx.fillRect(2, -4, 3, 3);
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
    this.ctx.fillText(`RITUAL SCORE: ${Math.floor(this.score).toLocaleString()}`, 20, 36);

    this.ctx.font = '16px monospace';
    this.ctx.fillStyle = '#00ffff';
    this.ctx.fillText(`WAVE: ${this.wave}`, 20, 60);

    // Rune Gesture Guide Bar at bottom
    this.ctx.font = 'bold 12px monospace';
    this.ctx.fillStyle = '#aa99bb';
    this.ctx.fillText('GESTURES: ◯ Circle=Hellfire Nova  |  — Line=Bone Cleave  |  V=Vorpal Bats  |  Z=Lightning', 20, this.height - 18);

    // Altar Integrity Bar
    const barW = 200;
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(this.width - 220, 20, barW, 16);
    this.ctx.fillStyle = this.altar.health > 30 ? '#00ff88' : '#ff0033';
    this.ctx.fillRect(this.width - 220, 20, (this.altar.health / this.altar.maxHealth) * barW, 16);
    this.ctx.font = 'bold 11px monospace';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(`ALTAR HEALTH: ${Math.max(0, Math.round(this.altar.health))}%`, this.width - 215, 33);

    this.ctx.restore();
  }

  gameOver() {
    this.stop();
    const finalScore = Math.floor(this.score);

    if (window.spookyAudio) {
      window.spookyAudio.playScareStinger();
    }

    if (window.spookyNetwork) {
      window.spookyNetwork.submitScore('necromancer', finalScore);
    }

    if (window.onSpookyGameOver) {
      window.onSpookyGameOver('necromancer', finalScore);
    }
  }
}

window.NecromancerRitualGame = NecromancerRitualGame;
