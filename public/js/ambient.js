// Enhanced Spooky Ambient Canvas: Cursor Lantern, Creepy Eyes, Realistic Bats, Fog, Blood Moon, Lightning

class AmbientSpookyEffects {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.mouse = { x: this.width / 2, y: this.height / 2, active: false };
    this.bats = [];
    this.fogParticles = [];
    this.embers = [];
    this.floatingSpells = [];
    this.lurkingEyes = [];
    this.bloodMoonActive = false;
    this.lightningAlpha = 0;
    this.lastLightning = Date.now();

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.active = true;
      });
      this.initParticles();
      this.animate();
    }
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  initParticles() {
    // Bats
    this.bats = [];
    for (let i = 0; i < 12; i++) {
      this.bats.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.45),
        vx: 1.8 + Math.random() * 2.8,
        vy: (Math.random() - 0.5) * 1.5,
        wingPhase: Math.random() * Math.PI * 2,
        size: 11 + Math.random() * 12
      });
    }

    // Floating fog puffs
    this.fogParticles = [];
    for (let i = 0; i < 28; i++) {
      this.fogParticles.push({
        x: Math.random() * this.width,
        y: this.height - Math.random() * 320,
        radius: 90 + Math.random() * 160,
        vx: 0.25 + Math.random() * 0.45,
        alpha: 0.06 + Math.random() * 0.12
      });
    }

    // Glowing embers / souls
    this.embers = [];
    for (let i = 0; i < 40; i++) {
      this.embers.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1.5 + Math.random() * 2.5,
        vy: -0.4 - Math.random() * 0.8,
        vx: (Math.random() - 0.5) * 0.5,
        alpha: 0.3 + Math.random() * 0.7,
        color: Math.random() > 0.4 ? '#ff7700' : (Math.random() > 0.5 ? '#9900ff' : '#00ff88')
      });
    }

    // Demonic eyes lurking in the dark
    this.lurkingEyes = [];
    for (let i = 0; i < 6; i++) {
      this.spawnLurkingEye();
    }
  }

  spawnLurkingEye() {
    const isRed = Math.random() > 0.4;
    this.lurkingEyes.push({
      x: 30 + Math.random() * (this.width - 60),
      y: 60 + Math.random() * (this.height - 120),
      blinkTimer: Math.floor(Math.random() * 300),
      blinkState: 1, // 1 open, 0 closed
      life: 300 + Math.random() * 600,
      color: isRed ? '#ff0033' : '#ffaa00',
      size: 4 + Math.random() * 3
    });
  }

  setBloodMoon(active) {
    this.bloodMoonActive = active;
    if (active) {
      this.triggerLightning(1.0);
    }
  }

  triggerLightning(intensity = 0.85) {
    this.lightningAlpha = intensity;
    if (window.spookyAudio) {
      window.spookyAudio.playThunder();
    }
  }

  addFloatingSpell(spellData) {
    const startX = spellData.x ? spellData.x * this.width : Math.random() * (this.width - 100) + 50;
    const startY = spellData.y ? spellData.y * this.height : this.height - 100;

    this.floatingSpells.push({
      text: spellData.spell || '🎃',
      sender: spellData.sender || 'Spirit',
      subText: spellData.message || '',
      x: startX,
      y: startY,
      vy: -1.8 - Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 1.0,
      alpha: 1.0,
      scale: 1.0 + Math.random() * 0.6
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Random rare lightning strike
    if (Date.now() - this.lastLightning > 14000 && Math.random() < 0.006) {
      this.triggerLightning(0.75);
      this.lastLightning = Date.now();
    }

    // 1. Draw Moon
    this.drawMoon();

    // 2. Draw Lurking Eyes in darkness
    this.drawLurkingEyes();

    // 3. Draw Fog
    this.drawFog();

    // 4. Draw Bats
    this.drawBats();

    // 5. Draw Embers
    this.drawEmbers();

    // 6. Draw Floating Curses
    this.drawFloatingSpells();

    // 7. Lantern / Flashlight Vignette effect around mouse
    this.drawLanternVignette();

    // 8. Lightning Flash if active
    if (this.lightningAlpha > 0.01) {
      this.ctx.fillStyle = this.bloodMoonActive
        ? `rgba(255, 30, 30, ${this.lightningAlpha * 0.45})`
        : `rgba(220, 235, 255, ${this.lightningAlpha * 0.4})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.lightningAlpha *= 0.88;
    }
  }

  drawMoon() {
    const moonX = this.width * 0.84;
    const moonY = Math.min(180, this.height * 0.22);
    const moonRadius = Math.min(78, this.width * 0.08);

    const glowColor = this.bloodMoonActive ? 'rgba(255, 10, 30, 0.45)' : 'rgba(255, 130, 0, 0.28)';
    const coreColor = this.bloodMoonActive ? '#b70707' : '#ff9900';
    const highlightColor = this.bloodMoonActive ? '#ff4d4d' : '#ffe082';

    // Outer ominous aura
    const gradient = this.ctx.createRadialGradient(moonX, moonY, moonRadius * 0.3, moonX, moonY, moonRadius * 3.2);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(moonX, moonY, moonRadius * 3.2, 0, Math.PI * 2);
    this.ctx.fill();

    // Moon disc
    const moonGrad = this.ctx.createRadialGradient(moonX - moonRadius * 0.25, moonY - moonRadius * 0.25, moonRadius * 0.1, moonX, moonY, moonRadius);
    moonGrad.addColorStop(0, highlightColor);
    moonGrad.addColorStop(1, coreColor);

    this.ctx.fillStyle = moonGrad;
    this.ctx.beginPath();
    this.ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Dark craters & sinister silhouette
    this.ctx.fillStyle = this.bloodMoonActive ? 'rgba(50, 0, 0, 0.35)' : 'rgba(100, 45, 0, 0.25)';
    this.ctx.beginPath();
    this.ctx.arc(moonX - moonRadius * 0.35, moonY - moonRadius * 0.1, moonRadius * 0.24, 0, Math.PI * 2);
    this.ctx.arc(moonX + moonRadius * 0.32, moonY + moonRadius * 0.28, moonRadius * 0.2, 0, Math.PI * 2);
    this.ctx.arc(moonX + moonRadius * 0.1, moonY - moonRadius * 0.38, moonRadius * 0.15, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawLurkingEyes() {
    for (let i = this.lurkingEyes.length - 1; i >= 0; i--) {
      const eye = this.lurkingEyes[i];
      eye.life--;
      eye.blinkTimer--;

      if (eye.blinkTimer <= 0) {
        eye.blinkState = eye.blinkState === 1 ? 0 : 1;
        eye.blinkTimer = eye.blinkState === 1 ? (120 + Math.random() * 200) : (6 + Math.random() * 12);
      }

      if (eye.life <= 0) {
        this.lurkingEyes.splice(i, 1);
        this.spawnLurkingEye();
        continue;
      }

      if (eye.blinkState === 1) {
        this.ctx.save();
        this.ctx.fillStyle = eye.color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = eye.color;

        // Pair of demonic glowing slit eyes
        [-8, 8].forEach(offset => {
          this.ctx.beginPath();
          this.ctx.ellipse(eye.x + offset, eye.y, eye.size * 1.4, eye.size * 0.7, 0, 0, Math.PI * 2);
          this.ctx.fill();

          // Black slit pupil
          this.ctx.fillStyle = '#000000';
          this.ctx.beginPath();
          this.ctx.ellipse(eye.x + offset, eye.y, eye.size * 0.3, eye.size * 0.7, 0, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = eye.color;
        });

        this.ctx.restore();
      }
    }
  }

  drawFog() {
    this.fogParticles.forEach(p => {
      p.x += p.vx;
      if (p.x - p.radius > this.width) {
        p.x = -p.radius;
      }

      const grad = this.ctx.createRadialGradient(p.x, p.y, p.radius * 0.1, p.x, p.y, p.radius);
      const fogCol = this.bloodMoonActive ? '130, 10, 30' : '40, 20, 65';
      grad.addColorStop(0, `rgba(${fogCol}, ${p.alpha * 1.5})`);
      grad.addColorStop(1, `rgba(${fogCol}, 0)`);

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawBats() {
    this.bats.forEach(bat => {
      bat.x += bat.vx;
      bat.y += bat.vy;
      bat.wingPhase += 0.28;

      if (bat.x > this.width + 60) {
        bat.x = -60;
        bat.y = Math.random() * (this.height * 0.45);
      }
      if (bat.y < 20 || bat.y > this.height * 0.5) {
        bat.vy *= -1;
      }

      const wingY = Math.sin(bat.wingPhase) * (bat.size * 0.65);

      this.ctx.save();
      this.ctx.translate(bat.x, bat.y);
      this.ctx.fillStyle = '#0d0614';

      // Bat body
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, bat.size * 0.35, bat.size * 0.55, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Glowing red bat eyes
      this.ctx.fillStyle = '#ff0033';
      this.ctx.fillRect(bat.size * 0.15, -bat.size * 0.25, 2, 2);

      // Left wing
      this.ctx.fillStyle = '#0d0614';
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.quadraticCurveTo(-bat.size * 0.7, wingY - bat.size * 0.9, -bat.size * 1.5, wingY);
      this.ctx.quadraticCurveTo(-bat.size * 0.9, wingY + bat.size * 0.35, 0, bat.size * 0.25);
      this.ctx.fill();

      // Right wing
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.quadraticCurveTo(bat.size * 0.7, wingY - bat.size * 0.9, bat.size * 1.5, wingY);
      this.ctx.quadraticCurveTo(bat.size * 0.9, wingY + bat.size * 0.35, 0, bat.size * 0.25);
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  drawEmbers() {
    this.embers.forEach(ember => {
      ember.y += ember.vy;
      ember.x += ember.vx + Math.sin(Date.now() * 0.002 + ember.y) * 0.35;

      if (ember.y < -10) {
        ember.y = this.height + 10;
        ember.x = Math.random() * this.width;
      }

      this.ctx.save();
      this.ctx.globalAlpha = ember.alpha;
      this.ctx.fillStyle = this.bloodMoonActive ? '#ff2222' : ember.color;
      this.ctx.shadowBlur = 9;
      this.ctx.shadowColor = this.ctx.fillStyle;

      this.ctx.beginPath();
      this.ctx.arc(ember.x, ember.y, ember.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  drawFloatingSpells() {
    for (let i = this.floatingSpells.length - 1; i >= 0; i--) {
      const s = this.floatingSpells[i];
      s.x += s.vx;
      s.y += s.vy;
      s.alpha -= 0.008;

      if (s.alpha <= 0) {
        this.floatingSpells.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, s.alpha);
      this.ctx.textAlign = 'center';

      this.ctx.font = `${Math.round(30 * s.scale)}px serif`;
      this.ctx.fillText(s.text, s.x, s.y);

      this.ctx.font = '12px "Nosifer", "Creepster", cursive, sans-serif';
      this.ctx.fillStyle = '#ff8800';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#ff2200';
      const label = s.subText ? `${s.sender}: ${s.subText}` : s.sender;
      this.ctx.fillText(label, s.x, s.y + 22);

      this.ctx.restore();
    }
  }

  // Lantern of the Damned: Subtle darkness cone surrounding cursor
  drawLanternVignette() {
    if (!this.mouse.active) return;
    this.ctx.save();

    // Create lantern spotlight around mouse
    const lanternRadius = Math.min(420, this.width * 0.4);
    const grad = this.ctx.createRadialGradient(
      this.mouse.x, this.mouse.y, lanternRadius * 0.15,
      this.mouse.x, this.mouse.y, lanternRadius
    );

    // Warm faint candlelit center, fading to darkness
    grad.addColorStop(0, 'rgba(255, 140, 20, 0.06)');
    grad.addColorStop(0.5, 'rgba(30, 10, 50, 0.02)');
    grad.addColorStop(1, 'rgba(5, 2, 10, 0.28)');

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }
}

window.AmbientEffects = AmbientSpookyEffects;
