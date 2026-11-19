// Socket.io Real-time Client Integration with SQLite Database Synchronization

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
    this.recentPlays = [];
    this.stats = {
      totalPlays: 0,
      uniquePlayers: 0,
      totalScore: 0,
      highestScore: 0,
      dbEngine: 'SQLite'
    };
    this.lastRecordedPlay = null;
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
      console.log('👻 Connected to Haunted Arcade SQLite Server!');
      this.updateConnectionStatus(true);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.updateConnectionStatus(false);
    });

    // Initial state from server database
    this.socket.on('init_state', (data) => {
      if (data.identity) {
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

      if (data.recentPlays) {
        this.recentPlays = data.recentPlays;
        this.renderRecentPlays();
      }

      if (data.stats) {
        this.stats = data.stats;
        this.updateStatsUI();
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

    // Confirmation that player's run has been stored in the SQLite database
    this.socket.on('play_recorded', (data) => {
      this.lastRecordedPlay = data.play;
      if (typeof window.onPlayRecordedInDatabase === 'function') {
        window.onPlayRecordedInDatabase(data);
      }
    });

    // Leaderboard updates in real-time when any player completes a play
    this.socket.on('leaderboard_updated', (data) => {
      if (data.game && data.scores) {
        this.scores[data.game] = data.scores;
        this.renderLeaderboard(data.game);

        if (data.stats) {
          this.stats = data.stats;
          this.updateStatsUI();
        }
        
        // Audio sound chime if someone scored
        if (window.spookyAudio) {
          window.spookyAudio.playCandyChime();
        }
      }
    });

    // Real-time notification of every play stored in the database
    this.socket.on('new_play_recorded', (data) => {
      if (data.play) {
        this.recentPlays.unshift(data.play);
        if (this.recentPlays.length > 20) this.recentPlays.pop();
        this.renderRecentPlays();
      }
      if (data.stats) {
        this.stats = data.stats;
        this.updateStatsUI();
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
    this.renderAllLeaderboards();
  }

  // Send live point gains during gameplay
  sendLiveProgress(game, score, deltaPoints) {
    if (this.socket && this.connected) {
      this.socket.emit('live_progress', { game, score, deltaPoints });
    }
  }

  // Submit high score upon game over for EVERY play to be stored in the database
  submitScore(game, score, details = '') {
    if (this.socket && this.connected) {
      this.socket.emit('submit_score', {
        game,
        score,
        name: this.identity.name,
        avatar: this.identity.avatar,
        details
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
        text.textContent = 'Crypt Link: Synchronized (SQLite DB Live)';
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

  updateStatsUI() {
    const countEl = document.getElementById('db-total-plays-count');
    if (countEl && typeof this.stats.totalPlays === 'number') {
      countEl.textContent = this.stats.totalPlays.toLocaleString();
    }
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
    this.renderRecentPlays();
    this.updateStatsUI();
  }

  renderLeaderboard(gameKey) {
    const container = document.getElementById(`leaderboard-${gameKey}`);
    if (!container) return;

    const scores = this.scores[gameKey] || [];
    if (scores.length === 0) {
      container.innerHTML = '<div class="empty-list">No souls recorded in database yet...</div>';
      return;
    }

    container.innerHTML = scores.map((entry, idx) => {
      const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : ''));
      const isCurrentPlayer = entry.name === this.identity.name ? 'current-player-row' : '';
      const formattedDetails = formatDetails(entry.details);

      return `
        <div class="leaderboard-row ${rankClass} ${isCurrentPlayer}">
          <span class="rank-num">#${idx + 1}</span>
          <span class="avatar-tag">${entry.avatar || '👻'}</span>
          <div class="player-info-wrap">
            <span class="player-tag">${escapeHtml(entry.name)}${isCurrentPlayer ? ' <span style="color:var(--pumpkin-orange);font-size:0.7rem;">(YOU)</span>' : ''}</span>
            ${formattedDetails ? `<span class="row-details">${escapeHtml(formattedDetails)}</span>` : ''}
          </div>
          <span class="score-tag">${entry.score.toLocaleString()} PTS</span>
        </div>
      `;
    }).join('');
  }

  renderRecentPlays() {
    const container = document.getElementById('leaderboard-recent');
    if (!container) return;

    if (!this.recentPlays || this.recentPlays.length === 0) {
      container.innerHTML = '<div class="empty-list">Awaiting new plays to enter database...</div>';
      return;
    }

    container.innerHTML = this.recentPlays.map((entry) => {
      const isCurrentPlayer = entry.name === this.identity.name ? 'current-player-row' : '';
      const gameLabel = getGameShortName(entry.game);
      const formattedDetails = formatDetails(entry.details);

      return `
        <div class="leaderboard-row ${isCurrentPlayer}">
          <span class="play-id-tag">#${entry.id}</span>
          <span class="avatar-tag">${entry.avatar || '👻'}</span>
          <div class="player-info-wrap">
            <span class="player-tag">${escapeHtml(entry.name)} <span style="color:var(--ghost-cyan);font-size:0.7rem;">[${gameLabel}]</span></span>
            ${formattedDetails ? `<span class="row-details">${escapeHtml(formattedDetails)}</span>` : ''}
          </div>
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
    while (feed.children.length > 25) {
      feed.removeChild(feed.lastChild);
    }
  }
}

function getGameShortName(gameKey) {
  switch (gameKey) {
    case 'soulheist': return 'Vault';
    case 'necromancer': return 'Ritual';
    case 'survivor': return 'Survivor';
    case 'tombstone': return 'Runner';
    case 'pumpkin': return 'Slasher';
    case 'manor': return 'Manor';
    default: return 'Arcade';
  }
}

function formatDetails(details) {
  if (!details) return '';
  if (typeof details === 'object') {
    return Object.entries(details).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`).join(' • ');
  }
  if (typeof details === 'string' && details.startsWith('{')) {
    try {
      const obj = JSON.parse(details);
      return Object.entries(obj).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`).join(' • ');
    } catch (e) {
      return details;
    }
  }
  return details;
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
