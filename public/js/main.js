// Main UI Controller & Arcade Hub
// Clean Game Lifecycles & Ominous "Enter If You Dare" Blood Gate

let activeGameInstance = null;
let currentGameKey = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Ambient FX Canvas
  window.ambientFx = new window.AmbientEffects('ambient-canvas');

  // 2. Initialize Socket Network
  window.spookyNetwork.connect();

  // 3. Audio & UI control bindings
  initGatekeeper();
  initAudioControls();
  initProfileControls();
  initArcadeButtons();
  initSpellControls();
  initLeaderboardTabs();
  initGameOverModal();

  console.log('🎃 Spooky Halloween Arcade successfully awakened!');
});

// "Enter If You Dare" Blood Gatekeeper
function initGatekeeper() {
  const gateModal = document.getElementById('gatekeeper-modal');
  const enterBtn = document.getElementById('btn-unseal-crypt');

  if (enterBtn && gateModal) {
    enterBtn.addEventListener('click', () => {
      // 1. Initialize Audio
      if (window.spookyAudio) {
        window.spookyAudio.ensureContext();
        window.spookyAudio.playCreakingGate();
        setTimeout(() => {
          window.spookyAudio.playFuneralBell();
          window.spookyAudio.toggleAmbient(true);
          const bgmBtn = document.getElementById('btn-toggle-bgm');
          if (bgmBtn) {
            bgmBtn.classList.add('active');
            bgmBtn.innerHTML = '🔊 Haunting Drone: ON';
          }
        }, 1200);
      }

      // 2. Hide gatekeeper with eerie animation
      gateModal.classList.add('unsealed');
      setTimeout(() => {
        gateModal.style.display = 'none';
      }, 800);
    });
  }
}

// Audio toggles
function initAudioControls() {
  const bgmBtn = document.getElementById('btn-toggle-bgm');
  const sfxBtn = document.getElementById('btn-toggle-sfx');

  if (bgmBtn) {
    bgmBtn.addEventListener('click', () => {
      const isNowOn = window.spookyAudio.toggleAmbient();
      bgmBtn.classList.toggle('active', isNowOn);
      bgmBtn.innerHTML = isNowOn ? '🔊 Haunting Drone: ON' : '🔈 Haunting Drone: OFF';
    });
  }

  if (sfxBtn) {
    sfxBtn.addEventListener('click', () => {
      window.spookyAudio.sfxEnabled = !window.spookyAudio.sfxEnabled;
      sfxBtn.classList.toggle('active', window.spookyAudio.sfxEnabled);
      sfxBtn.innerHTML = window.spookyAudio.sfxEnabled ? '⚡ Spooky SFX: ON' : '🔇 Spooky SFX: OFF';
    });
  }
}

// Profile modal & settings
function initProfileControls() {
  const editBtn = document.getElementById('btn-edit-profile');
  const modal = document.getElementById('profile-modal');
  const closeBtn = document.getElementById('btn-close-profile');
  const saveBtn = document.getElementById('btn-save-profile');
  const nameInput = document.getElementById('profile-name-input');
  const avatarOptions = document.querySelectorAll('.avatar-choice');

  let selectedAvatar = '🎃';

  avatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      avatarOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedAvatar = opt.getAttribute('data-avatar');
    });
  });

  if (editBtn && modal) {
    editBtn.addEventListener('click', () => {
      modal.classList.add('visible');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('visible');
    });
  }

  if (saveBtn && modal) {
    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim() || 'SpookyGuest';
      window.spookyNetwork.updateProfile(name, selectedAvatar);
      modal.classList.remove('visible');
      if (window.spookyAudio) window.spookyAudio.playCandyChime();
    });
  }
}

// Arcade Game Launcher
function initArcadeButtons() {
  const launchBtns = document.querySelectorAll('.btn-launch-game');
  const closeGameBtn = document.getElementById('btn-quit-game');

  launchBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const gameKey = btn.getAttribute('data-game');
      if (gameKey) {
        launchGame(gameKey);
      }
    });
  });

  if (closeGameBtn) {
    closeGameBtn.addEventListener('click', () => {
      closeGame();
    });
  }
}

function launchGame(gameKey) {
  const gameModal = document.getElementById('game-modal');
  const gameTitle = document.getElementById('game-modal-title');
  const instructions = document.getElementById('game-instructions-text');

  if (!gameModal || !gameKey) return;

  // Cleanly destroy any previous game instance and listeners
  if (activeGameInstance) {
    try {
      activeGameInstance.destroy();
    } catch (e) {
      console.warn('Error destroying previous game:', e);
    }
    activeGameInstance = null;
  }

  currentGameKey = gameKey;
  gameModal.classList.add('visible');

  // Set titles, instructions, and instantiate modern game classes
  if (gameKey === 'soulheist' || gameKey === 'tombstone') {
    gameTitle.textContent = '🗝️ SOUL HEIST: THE CRYPT VAULT';
    instructions.innerHTML = 'Controls: <b>DRAG & SLINGSHOT</b> soul tether to vault anchors. <b>AVOID</b> inquisitor searchlights! Snatch cursed relics & dive into the dark portal!';
    activeGameInstance = new window.SoulHeistGame('game-canvas');
  } else if (gameKey === 'necromancer' || gameKey === 'pumpkin') {
    gameTitle.textContent = '🔯 NECROMANCER\'S RITUAL: RUNE WEAVING';
    instructions.innerHTML = 'Controls: <b>DRAW GESTURES</b> on screen! <b>◯ Circle</b> = Hellfire Nova, <b>— Line</b> = Bone Cleave, <b>V V-Shape</b> = Bat Swarm, <b>Z Zig-Zag</b> = Chain Lightning!';
    activeGameInstance = new window.NecromancerRitualGame('game-canvas');
  } else if (gameKey === 'survivor' || gameKey === 'manor') {
    gameTitle.textContent = '🗡️ MIDNIGHT SURVIVOR: THE CURSED CARNIVAL';
    instructions.innerHTML = 'Controls: <b>W A S D</b> / <b>ARROW KEYS</b> or <b>HOLD MOUSE</b> to move. Weapons auto-fire! Slay fiends, collect soul gems, choose perk upgrades!';
    activeGameInstance = new window.MidnightSurvivorGame('game-canvas');
  }

  if (activeGameInstance) {
    activeGameInstance.start();
    // Ensure keyboard and mouse focus are on the active window
    window.focus();
  }
}

function closeGame() {
  if (activeGameInstance) {
    try {
      activeGameInstance.destroy();
    } catch (e) {
      console.warn('Error closing game:', e);
    }
    activeGameInstance = null;
  }
  const gameModal = document.getElementById('game-modal');
  if (gameModal) {
    gameModal.classList.remove('visible');
  }
}

// Global Game Over callback
window.onSpookyGameOver = function(gameKey, score) {
  const modal = document.getElementById('gameover-modal');
  const title = document.getElementById('gameover-title');
  const scoreVal = document.getElementById('gameover-score-value');
  const message = document.getElementById('gameover-message');

  if (!modal) return;

  title.textContent = '💀 REST IN PEACE 💀';
  scoreVal.textContent = `${score.toLocaleString()} POINTS`;

  const quotes = [
    'Your soul now wanders the midnight mist...',
    'The Jack-o\'-Lantern laughs in the shadows!',
    'A chilling howl echoes through the cemetery!',
    'The crypt keeper carves your tombstone with pride!',
    'The shadows claim another unwary mortal...'
  ];
  message.textContent = quotes[Math.floor(Math.random() * quotes.length)];

  modal.classList.add('visible');
};

function initGameOverModal() {
  const modal = document.getElementById('gameover-modal');
  const retryBtn = document.getElementById('btn-retry-game');
  const exitBtn = document.getElementById('btn-exit-gameover');

  if (retryBtn) {
    retryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (modal) modal.classList.remove('visible');
      const gameToPlay = currentGameKey;
      if (gameToPlay) {
        launchGame(gameToPlay);
      }
    });
  }

  if (exitBtn) {
    exitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (modal) modal.classList.remove('visible');
      closeGame();
    });
  }
}

// Spellcasting bar (broadcasts floating spooky animations to all connected players)
function initSpellControls() {
  const spellBtns = document.querySelectorAll('.spell-btn');
  const chatInput = document.getElementById('spell-chat-input');
  const sendBtn = document.getElementById('btn-cast-spell');

  spellBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const spell = btn.getAttribute('data-spell') || '🎃';
      const msg = chatInput ? chatInput.value.trim() : '';
      window.spookyNetwork.castSpell(spell, msg);
      if (chatInput) chatInput.value = '';
      if (window.spookyAudio) window.spookyAudio.playGhostWail();
    });
  });

  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', () => {
      const msg = chatInput.value.trim();
      if (!msg) return;
      window.spookyNetwork.castSpell('🎃', msg);
      chatInput.value = '';
      if (window.spookyAudio) window.spookyAudio.playGhostWail();
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendBtn.click();
      }
    });
  }
}

// Leaderboard tabs
function initLeaderboardTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const boards = document.querySelectorAll('.leaderboard-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      boards.forEach(b => {
        if (b.id === `board-${target}`) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    });
  });
}
