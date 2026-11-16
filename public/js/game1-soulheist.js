// Game 1: SOUL HEIST: THE CRYPT VAULT
// Eerie Physics Stealth & Slingshot Infiltration (Brand New Modern Concept)
// Swing on phantom tethers, sneak through shadows, dodge holy spotlights, heist cursed relics across infinite vault floors!

class SoulHeistGame {
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

    // Player state (Shadow Spirit)
    this.spirit = {
      x: 100,
      y: 220,
      vx: 0,
      vy: 0,
      radius: 16,
      energy: 100,
      maxEnergy: 100,
      isTethered: false,
      tetherAnchor: null,
      tetherLength: 0,
      inLight: false,
      shadowCombo: 1.0,
      carriedRelics: 0
    };

    // Vault Floor Progression
    this.floor = 1;
    this.score = 0;
    this.lastReportedScore = 0;
    this.relicsSaved = 0;

    // Environmental elements
    this.anchors = [];
    this.spotlights = [];
    this.relics = [];
    this.particles = [];
    this.portal = { x: 720, y: 380, radius: 34, angle: 0 };

    this.mouse = { x: 0, y: 0, isDown: false };

    this.bindControls();
  }

  bindControls() {
    if (!this.canvas) return;

    const updateMouse = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (clientX - rect.left) * (this.width / (rect.width || this.width));
      this.mouse.y = (clientY - rect.top) * (this.height / (rect.height || this.height));
    };

    this.boundMouseDown = (e) => {
      if (!this.running) return;
      this.mouse.isDown = true;
      updateMouse(e.clientX, e.clientY);
      this.attachTether();
    };

    this.boundMouseMove = (e) => {
      if (!this.running) return;
      updateMouse(e.clientX, e.clientY);
    };

    this.boundMouseUp = () => {
      if (!this.running) return;
      this.mouse.isDown = false;
      this.releaseTether();
    };

    this.boundKeyDown = (e) => {
      if (!this.running) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.phantomDash();
      }
    };

    this.boundTouchStart = (e) => {
      if (!this.running) return;
      e.preventDefault();
      this.mouse.isDown = true;
      if (e.touches[0]) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
        this.attachTether();
      }
    };

    this.boundTouchMove = (e) => {
      if (!this.running) return;
      e.preventDefault();
      if (e.touches[0]) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    };

    this.boundTouchEnd = () => {
      this.mouse.isDown = false;
      this.releaseTether();
    };

    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);
    window.addEventListener('keydown', this.boundKeyDown);

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
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('touchend', this.boundTouchEnd);
  }

  restart() {
    this.stop();
    this.resetState();
    this.start();
  }

  resetState() {
    this.floor = 1;
    this.score = 0;
    this.lastReportedScore = 0;
    this.relicsSaved = 0;
    this.particles = [];

    this.spirit.x = 90;
    this.spirit.y = 220;
    this.spirit.vx = 0;
    this.spirit.vy = 0;
    this.spirit.energy = 100;
    this.spirit.isTethered = false;
    this.spirit.tetherAnchor = null;
    this.spirit.shadowCombo = 1.0;
    this.spirit.carriedRelics = 0;

    this.generateFloor(1);
  }

  start() {
    this.stop();
    this.running = true;

    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext('2d');
    }

    this.generateFloor(this.floor);

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

  generateFloor(floorNum) {
    this.spirit.x = 80;
    this.spirit.y = 120;
    this.spirit.vx = 2;
    this.spirit.vy = 0;
    this.spirit.carriedRelics = 0;

    // Place gargoyle anchor nodes across vault
    this.anchors = [
      { x: 180, y: 140, type: 'gargoyle' },
      { x: 340, y: 220, type: 'pillar' },
      { x: 500, y: 130, type: 'gargoyle' },
      { x: 300, y: 340, type: 'chain' },
      { x: 460, y: 330, type: 'pillar' },
      { x: 620, y: 240, type: 'gargoyle' }
    ];

    // Additional anchors on higher floors
    if (floorNum >= 3) {
      this.anchors.push({ x: 220, y: 240, type: 'chain' }, { x: 580, y: 120, type: 'chain' });
    }

    // Portal located on the far right
    this.portal = { x: 730, y: 370, radius: 36, angle: 0 };

    // Procedural Spotlight Wards (Sweep back and forth)
    this.spotlights = [];
    const lightCount = Math.min(5, 2 + Math.floor(floorNum * 0.7));

    for (let i = 0; i < lightCount; i++) {
      this.spotlights.push({
        x: 200 + (i * 120),
        y: 40,
        angle: Math.PI * 0.5,
        sweepSpeed: 0.015 + (Math.random() * 0.015) + (floorNum * 0.003),
        sweepRange: 0.7,
        beamLength: 380,
        beamWidth: 55 + (floorNum * 4),
        phase: Math.random() * Math.PI * 2
      });
    }

    // Cursed Relics to snatch
    this.relics = [];
    const relicTypes = ['skull', 'gem', 'scroll', 'chalice'];
    const count = 2 + Math.min(3, Math.floor(floorNum * 0.5));

    for (let i = 0; i < count; i++) {
      const type = relicTypes[i % relicTypes.length];
      const anchorRef = this.anchors[(i * 2 + 1) % this.anchors.length];
      this.relics.push({
        x: anchorRef.x + (Math.random() - 0.5) * 80,
        y: anchorRef.y + 40 + Math.random() * 40,
        type,
        collected: false,
        floatSeed: Math.random() * 10
      });
    }
  }

  attachTether() {
    // Find nearest anchor within range
    let nearest = null;
    let minDist = 220;

    this.anchors.forEach(a => {
      const d = Math.hypot(this.spirit.x - a.x, this.spirit.y - a.y);
      if (d < minDist) {
        minDist = d;
        nearest = a;
      }
    });

    if (nearest) {
      this.spirit.isTethered = true;
      this.spirit.tetherAnchor = nearest;
      this.spirit.tetherLength = Math.max(45, minDist);
      if (window.spookyAudio) window.spookyAudio.playBoneRattle();
    }
  }

  releaseTether() {
    if (this.spirit.isTethered) {
      this.spirit.isTethered = false;
      this.spirit.tetherAnchor = null;
      // Slingshot velocity boost
      this.spirit.vx *= 1.25;
      this.spirit.vy *= 1.25;
      if (window.spookyAudio) window.spookyAudio.playSlash();
    }
  }

  phantomDash() {
    if (this.spirit.energy < 25) return;
    this.spirit.energy -= 25;

    // Dash towards mouse direction
    const angle = Math.atan2(this.mouse.y - this.spirit.y, this.mouse.x - this.spirit.x);
    this.spirit.vx = Math.cos(angle) * 16;
    this.spirit.vy = Math.sin(angle) * 16;
    this.spirit.isTethered = false;

    this.createBurst(this.spirit.x, this.spirit.y, '#00ffff', 16);
    if (window.spookyAudio) window.spookyAudio.playGhostWail();
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  update() {
    const s = this.spirit;

    // Tether physics
    if (s.isTethered && s.tetherAnchor) {
      const dx = s.x - s.tetherAnchor.x;
      const dy = s.y - s.tetherAnchor.y;
      const dist = Math.hypot(dx, dy);

      if (dist > s.tetherLength) {
        // Constrain to tether rope
        const angle = Math.atan2(dy, dx);
        s.x = s.tetherAnchor.x + Math.cos(angle) * s.tetherLength;
        s.y = s.tetherAnchor.y + Math.sin(angle) * s.tetherLength;

        // Dampen radial velocity, convert to angular swing momentum
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const tangentX = -normalY;
        const tangentY = normalX;

        const tangentSpeed = s.vx * tangentX + s.vy * tangentY;
        s.vx = tangentX * tangentSpeed;
        s.vy = tangentY * tangentSpeed + 0.35; // pendulum gravity
      } else {
        s.vy += 0.28; // gravity
      }
    } else {
      // Free floating spirit aerodynamics
      s.vy += 0.22; // subtle crypt gravity
      s.vx *= 0.988; // air drag
      s.vy *= 0.988;
    }

    s.x += s.vx;
    s.y += s.vy;

    // Bounce off vault boundaries
    if (s.x < s.radius) { s.x = s.radius; s.vx *= -0.7; }
    if (s.x > this.width - s.radius) { s.x = this.width - s.radius; s.vx *= -0.7; }
    if (s.y < s.radius + 15) { s.y = s.radius + 15; s.vy *= -0.7; }
    if (s.y > this.height - s.radius - 15) { s.y = this.height - s.radius - 15; s.vy *= -0.7; }

    // Update spotlights
    let inAnyLight = false;
    this.spotlights.forEach(l => {
      l.phase += l.sweepSpeed;
      const currentAngle = l.angle + Math.sin(l.phase) * l.sweepRange;

      // Check if spirit is inside cone
      if (this.checkConeIntersection(l.x, l.y, currentAngle, l.beamLength, l.beamWidth, s.x, s.y)) {
        inAnyLight = true;
      }
    });

    s.inLight = inAnyLight;

    if (s.inLight) {
      // Sizzling in holy light!
      s.energy -= 0.65;
      s.shadowCombo = 1.0;
      this.createBurst(s.x, s.y, '#ff0044', 1);

      if (s.energy <= 0) {
        this.gameOver();
        return;
      }
    } else {
      // In darkness: recharge energy and build shadow stealth combo
      s.energy = Math.min(s.maxEnergy, s.energy + 0.15);
      s.shadowCombo = Math.min(5.0, s.shadowCombo + 0.003);

      const mult = window.spookyNetwork ? window.spookyNetwork.scoreMultiplier : 1.0;
      this.score += 0.5 * s.shadowCombo * mult;
    }

    // Check relic pickups
    this.relics.forEach(r => {
      if (!r.collected && Math.hypot(s.x - r.x, s.y - r.y) < s.radius + 18) {
        r.collected = true;
        s.carriedRelics++;
        const mult = window.spookyNetwork ? window.spookyNetwork.scoreMultiplier : 1.0;
        const pts = Math.floor(250 * s.shadowCombo * mult);
        this.score += pts;
        this.createBurst(r.x, r.y, '#ffaa00', 14);
        if (window.spookyAudio) window.spookyAudio.playCandyChime();
      }
    });

    // Check portal entrance (Advance floor!)
    this.portal.angle += 0.04;
    if (Math.hypot(s.x - this.portal.x, s.y - this.portal.y) < this.portal.radius + s.radius) {
      if (s.carriedRelics > 0) {
        // Floor Cleared!
        this.relicsSaved += s.carriedRelics;
        const floorBonus = Math.floor(1000 * this.floor * s.shadowCombo);
        this.score += floorBonus;
        this.floor++;
        this.createBurst(this.portal.x, this.portal.y, '#9d00ff', 35);
        if (window.spookyAudio) {
          window.spookyAudio.playBloodMoonRiser();
          window.spookyAudio.playFuneralBell();
        }
        this.generateFloor(this.floor);
      }
    }

    // Stream live progress to server
    if (this.score - this.lastReportedScore > 120) {
      const delta = Math.floor(this.score - this.lastReportedScore);
      this.lastReportedScore = this.score;
      if (window.spookyNetwork) {
        window.spookyNetwork.sendLiveProgress('soulheist', Math.floor(this.score), delta);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  checkConeIntersection(ox, oy, angle, len, width, tx, ty) {
    const dx = tx - ox;
    const dy = ty - oy;
    const dist = Math.hypot(dx, dy);
    if (dist > len) return false;

    const targetAngle = Math.atan2(dy, dx);
    let diff = Math.abs(targetAngle - angle);
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

    const halfWidthAngle = Math.atan2(width / 2, dist);
    return diff < halfWidthAngle;
  }

  createBurst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        alpha: 1.0,
        color
      });
    }
  }

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const isBloodMoon = window.spookyNetwork && window.spookyNetwork.isBloodMoonActive;

    // Dark Crypt Stone Vault Background
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, isBloodMoon ? '#260209' : '#07030d');
    bgGrad.addColorStop(1, isBloodMoon ? '#120104' : '#140722');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Stone Arch Vault Beams
    this.ctx.strokeStyle = '#1d0c2e';
    this.ctx.lineWidth = 14;
    for (let bx = 60; bx < this.width; bx += 180) {
      this.ctx.beginPath();
      this.ctx.moveTo(bx, 0);
      this.ctx.quadraticCurveTo(bx + 90, 80, bx + 180, 0);
      this.ctx.stroke();
    }

    // 1. Draw Inquisitor Spotlights (Searchlight Beams)
    this.spotlights.forEach(l => {
      const currentAngle = l.angle + Math.sin(l.phase) * l.sweepRange;
      const lx2 = l.x + Math.cos(currentAngle - 0.22) * l.beamLength;
      const ly2 = l.y + Math.sin(currentAngle - 0.22) * l.beamLength;
      const lx3 = l.x + Math.cos(currentAngle + 0.22) * l.beamLength;
      const ly3 = l.y + Math.sin(currentAngle + 0.22) * l.beamLength;

      const beamGrad = this.ctx.createRadialGradient(l.x, l.y, 10, l.x, l.y, l.beamLength);
      beamGrad.addColorStop(0, isBloodMoon ? 'rgba(255, 30, 60, 0.55)' : 'rgba(255, 230, 140, 0.45)');
      beamGrad.addColorStop(1, 'rgba(255, 200, 50, 0.0)');

      this.ctx.fillStyle = beamGrad;
      this.ctx.beginPath();
      this.ctx.moveTo(l.x, l.y);
      this.ctx.lineTo(lx2, ly2);
      this.ctx.lineTo(lx3, ly3);
      this.ctx.closePath();
      this.ctx.fill();

      // Spotlight lantern housing
      this.ctx.fillStyle = '#ffbb00';
      this.ctx.beginPath();
      this.ctx.arc(l.x, l.y, 8, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 2. Draw Abyssal Portal (Next Floor Gate)
    this.drawPortal();

    // 3. Draw Anchor Nodes (Gargoyles / Iron Chains)
    this.anchors.forEach(a => {
      this.drawAnchor(a);
    });

    // 4. Draw Cursed Relics
    this.relics.forEach(r => {
      if (!r.collected) this.drawRelic(r);
    });

    // 5. Draw Ectoplasmic Tether
    if (this.spirit.isTethered && this.spirit.tetherAnchor) {
      this.ctx.save();
      this.ctx.strokeStyle = '#00ffcc';
      this.ctx.lineWidth = 3;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = '#00ffff';

      this.ctx.beginPath();
      this.ctx.moveTo(this.spirit.tetherAnchor.x, this.spirit.tetherAnchor.y);
      this.ctx.lineTo(this.spirit.x, this.spirit.y);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 6. Draw Shadow Spirit Player
    this.drawSpirit();

    // 7. Draw Particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 8. Draw HUD
    this.drawHUD();
  }

  drawSpirit() {
    this.ctx.save();
    const s = this.spirit;

    // Spirit Aura (cyan in shadow, bloody red in light)
    const auraCol = s.inLight ? '#ff0033' : '#00ffcc';
    this.ctx.shadowBlur = s.inLight ? 20 : 14;
    this.ctx.shadowColor = auraCol;

    // Slingshot aim indicator when mouse held
    if (this.mouse.isDown && !s.isTethered) {
      this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(s.x, s.y);
      this.ctx.lineTo(this.mouse.x, this.mouse.y);
      this.ctx.stroke();
    }

    // Shadow Spirit Body
    this.ctx.fillStyle = s.inLight ? '#4a0815' : '#100624';
    this.ctx.beginPath();
    this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Glowing spectral mask eyes
    this.ctx.fillStyle = auraCol;
    const eyeOffset = Math.sin(Date.now() * 0.006) * 2;
    this.ctx.beginPath();
    this.ctx.arc(s.x - 5, s.y - 3 + eyeOffset, 3, 0, Math.PI * 2);
    this.ctx.arc(s.x + 5, s.y - 3 + eyeOffset, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Carried Relic indicator orbiting player
    if (s.carriedRelics > 0) {
      for (let i = 0; i < s.carriedRelics; i++) {
        const angle = (Date.now() * 0.005) + (i * (Math.PI * 2 / s.carriedRelics));
        const rx = s.x + Math.cos(angle) * 26;
        const ry = s.y + Math.sin(angle) * 26;
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = '#ffbb00';
        this.ctx.beginPath();
        this.ctx.arc(rx, ry, 5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  drawAnchor(a) {
    this.ctx.save();
    this.ctx.fillStyle = '#3f384a';
    this.ctx.strokeStyle = '#675c75';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.arc(a.x, a.y, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Occult rune center
    this.ctx.fillStyle = '#00ffcc';
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = '#00ffff';
    this.ctx.beginPath();
    this.ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawRelic(r) {
    this.ctx.save();
    const floatY = Math.sin(Date.now() * 0.004 + r.floatSeed) * 5;
    const cy = r.y + floatY;

    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = '#ffaa00';

    if (r.type === 'skull') {
      this.ctx.fillStyle = '#ffdd88';
      this.ctx.beginPath();
      this.ctx.arc(r.x, cy, 10, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#11051a';
      this.ctx.fillRect(r.x - 4, cy - 2, 3, 4);
      this.ctx.fillRect(r.x + 1, cy - 2, 3, 4);
    } else {
      // Golden Soul Gem / Relic
      this.ctx.fillStyle = '#ffcc00';
      this.ctx.beginPath();
      this.ctx.moveTo(r.x, cy - 12);
      this.ctx.lineTo(r.x + 9, cy);
      this.ctx.lineTo(r.x, cy + 12);
      this.ctx.lineTo(r.x - 9, cy);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawPortal() {
    this.ctx.save();
    const p = this.portal;
    const pGrad = this.ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.radius);
    pGrad.addColorStop(0, '#ffffff');
    pGrad.addColorStop(0.4, '#aa00ff');
    pGrad.addColorStop(1, 'rgba(40, 0, 80, 0)');

    this.ctx.fillStyle = pGrad;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Rotating Abyssal Rings
    this.ctx.strokeStyle = '#00ffff';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.radius * 0.75, p.angle, p.angle + Math.PI * 1.5);
    this.ctx.stroke();

    this.ctx.font = 'bold 11px monospace';
    this.ctx.fillStyle = '#ffbb00';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.spirit.carriedRelics > 0 ? 'DESCENT READY' : 'NEED RELIC', p.x, p.y + p.radius + 14);

    this.ctx.restore();
  }

  drawHUD() {
    this.ctx.save();

    // Score & Floor
    this.ctx.font = 'bold 24px "Creepster", cursive, sans-serif';
    this.ctx.fillStyle = '#ff9900';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = '#ff2200';
    this.ctx.fillText(`VAULT SCORE: ${Math.floor(this.score).toLocaleString()}`, 20, 36);

    this.ctx.font = '16px monospace';
    this.ctx.fillStyle = '#00ffff';
    this.ctx.fillText(`CRYPT DEPTH: FLOOR B${this.floor}`, 20, 60);

    // Stealth Multiplier
    this.ctx.fillStyle = this.spirit.inLight ? '#ff0033' : '#39ff14';
    this.ctx.fillText(`STEALTH: ${this.spirit.shadowCombo.toFixed(1)}x ${this.spirit.inLight ? '[DETECTED!]' : '[HIDDEN]'}`, 20, 82);

    // Spirit Energy Bar
    const barWidth = 200;
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(this.width - 220, 20, barWidth, 16);
    this.ctx.fillStyle = this.spirit.energy > 30 ? '#00ffcc' : '#ff0044';
    this.ctx.fillRect(this.width - 220, 20, (this.spirit.energy / this.spirit.maxEnergy) * barWidth, 16);
    this.ctx.font = 'bold 11px monospace';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(`ECTOPLASM: ${Math.round(this.spirit.energy)}%`, this.width - 215, 33);

    // Carried Relics Count
    this.ctx.fillStyle = '#ffcc00';
    this.ctx.font = 'bold 13px monospace';
    this.ctx.fillText(`RELICS IN HAND: ${this.spirit.carriedRelics}`, this.width - 215, 54);

    this.ctx.restore();
  }

  gameOver() {
    this.stop();
    const finalScore = Math.floor(this.score);

    if (window.spookyAudio) {
      window.spookyAudio.playScareStinger();
    }

    if (window.spookyNetwork) {
      window.spookyNetwork.submitScore('soulheist', finalScore);
    }

    if (window.onSpookyGameOver) {
      window.onSpookyGameOver('soulheist', finalScore);
    }
  }
}

window.SoulHeistGame = SoulHeistGame;
