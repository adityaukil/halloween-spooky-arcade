// Socket.io Real-time Client Integration

class SpookyNetwork {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.identity = {
      name: 'SpookyGuest',
      avatar: '🎃'
    };
    this.scores = {
      soulheist: [],
      necromancer: [],
      survivor: []
    };
    this.hauntMeter = 30;
    this.isBloodMoonActive = false;
    this.scoreMultiplier = 1.0;
  }

  connect() {
    // Check if io is loaded from socket.io.js
    if (typeof io === 'undefined') {
      console.warn('Socket.IO client not found. Falling back to offline mode.');
      return;
    }

    this.socket = io();

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('👻 Connected to Haunted Arcade Server!');
      this.updateConnectionStatus(true);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.updateConnectionStatus(false);
    });

    // Initial state from server
    this.socket.on('init_state', (data) => {
      if (data.identity) {
        // Restore from localStorage if player previously set one
        const savedName = localStorage.getItem('spooky_name');
        const savedAvatar = localStorage.getItem('spooky_avatar');
        if (savedName) {
          this.identity.name = savedName;
          this.identity.avatar = savedAvatar || '🎃';
          this.socket.emit('set_profile', this.identity);
        } else {
          this.identity = data.identity;
        }
        this.updateProfileUI();
      }

      if (data.scores) {
        this.scores = data.scores;
        this.renderAllLeaderboards();
      }

      if (typeof data.hauntMeter === 'number') {
        this.updateHauntMeter(data.hauntMeter);
      }

      if (data.isBloodMoonActive) {
        this.setBloodMoon(true, 2.0);
      }

      if (data.activity && Array.isArray(data.activity)) {
        this.renderActivityFeed(data.activity);
      }

      if (data.activeCount) {
        this.updateActiveCount(data.activeCount);
      }
    });

    // Spirit count updates
    this.socket.on('spirit_count', (data) => {
      this.updateActiveCount(data.count);
    });

    // Leaderboard updates in real-time
    this.socket.on('leaderboard_updated', (data) => {
      if (data.game && data.scores) {
        this.scores[data.game] = data.scores;
        this.renderLeaderboard(data.game);
        
        // Audio sound chime if someone scored
        if (window.spookyAudio) {
          window.spookyAudio.playCandyChime();
        }
      }
    });

    // Haunting energy meter updates
    this.socket.on('haunt_meter_update', (data) => {
      this.updateHauntMeter(data.hauntMeter);
    });

    // Blood Moon Event Triggered
    this.socket.on('blood_moon_started', (data) => {
      this.setBloodMoon(true, data.multiplier || 2.0);
      this.showSpookyBanner(data.message, 'blood-moon-banner');
      if (window.spookyAudio) {
        window.spookyAudio.playBloodMoonRiser();
      }
    });

    this.socket.on('blood_moon_ended', (data) => {
      this.setBloodMoon(false, 1.0);
      if (typeof data.hauntMeter === 'number') {
        this.updateHauntMeter(data.hauntMeter);
      }
    });

    // Live activity ticker item
    this.socket.on('new_activity', (item) => {
      this.addActivityItem(item);
    });

    // Special announcements (e.g. record broken)
    this.socket.on('spooky_alert', (data) => {
      this.showSpookyBanner(data.message, 'record-banner');
    });

    // Remote spells cast by other players
    this.socket.on('spell_cast', (data) => {
      if (window.ambientFx) {
        window.ambientFx.addFloatingSpell(data);
      }
    });
  }

  updateProfile(name, avatar) {
    this.identity.name = (name || 'SpookyGuest').substring(0, 16);
    this.identity.avatar = avatar || '🎃';
    localStorage.setItem('spooky_name', this.identity.name);
    localStorage.setItem('spooky_avatar', this.identity.avatar);

    if (this.socket) {
      this.socket.emit('set_profile', this.identity);
    }
    this.updateProfileUI();
  }

  // Send live point gains during gameplay
  sendLiveProgress(game, score, deltaPoints) {
    if (this.socket && this.connected) {
      this.socket.emit('live_progress', { game, score, deltaPoints });
    }
  }

  // Submit high score upon game over
  submitScore(game, score) {
    if (this.socket && this.connected) {
      this.socket.emit('submit_score', {
        game,
        score,
        name: this.identity.name,
        avatar: this.identity.avatar
      });
    }
  }

  // Cast a cursed emoji or chat spell
  castSpell(spell, message = '') {
    if (this.socket && this.connected) {
      this.socket.emit('cast_spell', {
        spell,
        message,
        x: 0.2 + Math.random() * 0.6,
        y: 0.8
      });
    } else if (window.ambientFx) {
      // Local preview if disconnected
      window.ambientFx.addFloatingSpell({
        spell,
        sender: this.identity.name,
        message,
        x: 0.5,
        y: 0.8
      });
    }
  }

  // UI helpers
  updateConnectionStatus(isConnected) {
    const dot = document.getElementById('connection-status-dot');
    const text = document.getElementById('connection-status-text');
    if (dot && text) {
      if (isConnected) {
        dot.className = 'status-dot online';
        text.textContent = 'Crypt Link: Synchronized';
      } else {
        dot.className = 'status-dot offline';
        text.textContent = 'Crypt Link: Severed';
      }
    }
  }

  updateProfileUI() {
    const nameEl = document.getElementById('player-name-display');
    const avatarEl = document.getElementById('player-avatar-display');
    const nameInput = document.getElementById('profile-name-input');
    if (nameEl) nameEl.textContent = this.identity.name;
    if (avatarEl) avatarEl.textContent = this.identity.avatar;
    if (nameInput) nameInput.value = this.identity.name;
  }

  updateActiveCount(count) {
    const el = document.getElementById('live-spirits-count');
    if (el) el.textContent = `${count} ${count === 1 ? 'Spirit' : 'Spirits'} Lurking`;
  }

  updateHauntMeter(percentage) {
    this.hauntMeter = percentage;
    const bar = document.getElementById('haunt-meter-bar');
    const text = document.getElementById('haunt-meter-text');
    if (bar) bar.style.width = `${percentage}%`;
    if (text) text.textContent = `${percentage}% Haunt Energy`;
  }

  setBloodMoon(active, multiplier) {
    this.isBloodMoonActive = active;
    this.scoreMultiplier = multiplier;
    if (window.ambientFx) {
      window.ambientFx.setBloodMoon(active);
    }
    const indicator = document.getElementById('blood-moon-indicator');
    if (indicator) {
      indicator.style.display = active ? 'flex' : 'none';
    }
    const body = document.body;
    if (active) {
      body.classList.add('blood-moon-active');
    } else {
      body.classList.remove('blood-moon-active');
    }
  }

  showSpookyBanner(text, extraClass = '') {
    const banner = document.getElementById('spooky-alert-banner');
    if (!banner) return;
    banner.textContent = text;
    banner.className = `spooky-banner active ${extraClass}`;
    setTimeout(() => {
      banner.className = 'spooky-banner';
    }, 6000);
  }

  renderAllLeaderboards() {
    this.renderLeaderboard('soulheist');
    this.renderLeaderboard('necromancer');
    this.renderLeaderboard('survivor');
  }

  renderLeaderboard(gameKey) {
    const container = document.getElementById(`leaderboard-${gameKey}`);
    if (!container) return;

    const scores = this.scores[gameKey] || [];
    if (scores.length === 0) {
      container.innerHTML = '<div class="empty-list">No souls recorded yet...</div>';
      return;
    }

    container.innerHTML = scores.map((entry, idx) => {
      const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : ''));
      return `
        <div class="leaderboard-row ${rankClass}">
          <span class="rank-num">#${idx + 1}</span>
          <span class="avatar-tag">${entry.avatar || '👻'}</span>
          <span class="player-tag">${escapeHtml(entry.name)}</span>
          <span class="score-tag">${entry.score.toLocaleString()} PTS</span>
        </div>
      `;
    }).join('');
  }

  renderActivityFeed(items) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;
    feed.innerHTML = items.map(item => `
      <div class="feed-item">${escapeHtml(item.text)}</div>
    `).join('');
  }

  addActivityItem(item) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;
    const div = document.createElement('div');
    div.className = 'feed-item new';
    div.textContent = item.text;
    feed.insertBefore(div, feed.firstChild);
    while (feed.children.length > 20) {
      feed.removeChild(feed.lastChild);
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.spookyNetwork = new SpookyNetwork();
