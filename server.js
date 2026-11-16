const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_SCORES = {
  soulheist: [
    { name: 'ShadowPhantom', score: 6450, date: '2026-10-12', avatar: '👻' },
    { name: 'CryptThief', score: 4820, date: '2026-10-12', avatar: '🗝️' },
    { name: 'GraveRobber', score: 3350, date: '2026-10-12', avatar: '💀' },
    { name: 'SpectralHex', score: 2180, date: '2026-10-12', avatar: '🔮' },
    { name: 'NightStalker', score: 1400, date: '2026-10-12', avatar: '🦇' }
  ],
  necromancer: [
    { name: 'ArchLich', score: 7800, date: '2026-10-12', avatar: '🧙‍♂️' },
    { name: 'BloodWeaver', score: 5490, date: '2026-10-12', avatar: '🩸' },
    { name: 'RuneMaster', score: 3900, date: '2026-10-12', avatar: '📜' },
    { name: 'CursedSorcerer', score: 2600, date: '2026-10-12', avatar: '⚡' },
    { name: 'OccultNovice', score: 1750, date: '2026-10-12', avatar: '🕯️' }
  ],
  survivor: [
    { name: 'VampireBane', score: 9200, date: '2026-10-12', avatar: '🧛‍♂️' },
    { name: 'CarnivalSlayer', score: 6750, date: '2026-10-12', avatar: '🎃' },
    { name: 'MidnightReaper', score: 4800, date: '2026-10-12', avatar: '🗡️' },
    { name: 'SoulHarvester', score: 3100, date: '2026-10-12', avatar: '⚰️' },
    { name: 'CryptWanderer', score: 1950, date: '2026-10-12', avatar: '🧟' }
  ],
  tombstone: [
    { name: 'GrimReaper', score: 4850, date: '2026-10-12', avatar: '💀' }
  ],
  pumpkin: [
    { name: 'JackTheSlasher', score: 5600, date: '2026-10-12', avatar: '🎃' }
  ],
  manor: [
    { name: 'GhostExorcist', score: 6200, date: '2026-10-12', avatar: '🕯️' }
  ]
};

// Load or initialize scores
let highScores = { ...DEFAULT_SCORES };
try {
  if (fs.existsSync(SCORES_FILE)) {
    const rawData = fs.readFileSync(SCORES_FILE, 'utf8');
    const parsed = JSON.parse(rawData);
    highScores = { ...DEFAULT_SCORES, ...parsed };
    for (const key of Object.keys(DEFAULT_SCORES)) {
      if (!highScores[key] || !Array.isArray(highScores[key]) || highScores[key].length === 0) {
        highScores[key] = [...DEFAULT_SCORES[key]];
      }
    }
  } else {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(DEFAULT_SCORES, null, 2));
  }
} catch (e) {
  console.error('Error loading scores, using default:', e);
}

function saveScores() {
  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(highScores, null, 2));
  } catch (err) {
    console.error('Failed to save scores:', err);
  }
}

// Global Haunting State (synchronized across all connected spirits)
let hauntMeter = 35; // 0 to 100
let isBloodMoonActive = false;
let bloodMoonTimer = null;
let liveActivity = [
  { text: '🎃 The Haunted Arcade awakens from the cemetery mist...', time: Date.now() },
  { text: '👻 GrimReaper whispers from the grave...', time: Date.now() - 30000 }
];

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// REST endpoint for status & scores
app.get('/api/scores', (req, res) => {
  res.json(highScores);
});

app.get('/api/haunt-status', (req, res) => {
  res.json({
    hauntMeter,
    isBloodMoonActive,
    activeSpirits: io.engine.clientsCount
  });
});

// Socket.io real-time multiplayer & live state synchronization
const activeUsers = new Map(); // socketId -> { name, avatar, currentGame, score }

io.on('connection', (socket) => {
  // Generate random spooky identity for guest
  const defaultAvatars = ['🎃', '👻', '🧙‍♀️', '🦇', '💀', '🧛‍♂️', '🕷️', '🧟'];
  const guestName = 'Spirit_' + Math.floor(100 + Math.random() * 900);
  const guestAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

  activeUsers.set(socket.id, {
    name: guestName,
    avatar: guestAvatar,
    currentGame: 'lobby',
    score: 0
  });

  // Send current state to newly connected spirit
  socket.emit('init_state', {
    identity: activeUsers.get(socket.id),
    scores: highScores,
    hauntMeter,
    isBloodMoonActive,
    activity: liveActivity.slice(0, 10),
    activeCount: io.engine.clientsCount
  });

  // Broadcast updated spirit count
  io.emit('spirit_count', { count: io.engine.clientsCount });

  // Update profile
  socket.on('set_profile', (data) => {
    const user = activeUsers.get(socket.id);
    if (user && data.name) {
      user.name = data.name.substring(0, 16);
      if (data.avatar) user.avatar = data.avatar;
      socket.emit('profile_updated', user);
      
      addActivity(`🕯️ ${user.avatar} ${user.name} stepped out from the shadows.`);
    }
  });

  // Live game status update (e.g. while player is playing, their live score increases)
  socket.on('live_progress', (data) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    user.currentGame = data.game;
    user.score = data.score;

    // Add haunting energy! (Every point contributes to the shared global Haunt Meter)
    const pointsGained = Math.max(0, Number(data.deltaPoints) || 0);
    if (pointsGained > 0) {
      increaseHauntEnergy(pointsGained * 0.02);
    }
  });

  // Score submission when game ends (or milestone reached)
  socket.on('submit_score', (data) => {
    const { game, score, name, avatar } = data;
    if (!highScores[game] || typeof score !== 'number' || score <= 0) return;

    const playerName = (name || 'Anonymous Ghoul').substring(0, 16);
    const playerAvatar = avatar || '👻';

    const entry = {
      name: playerName,
      score: Math.floor(score),
      date: new Date().toISOString().split('T')[0],
      avatar: playerAvatar
    };

    // Insert into leaderboard if top 10
    const list = highScores[game];
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    if (list.length > 10) list.pop();

    saveScores();

    // Broadcast updated leaderboard immediately to all clients!
    io.emit('leaderboard_updated', {
      game,
      scores: highScores[game],
      newEntry: entry
    });

    // Check if new #1 high score!
    if (list[0].name === entry.name && list[0].score === entry.score) {
      io.emit('spooky_alert', {
        type: 'RECORD_SMASHED',
        message: `🔥 NEW RECORD! ${entry.avatar} ${entry.name} seized #1 in ${getGameTitle(game)} with ${entry.score.toLocaleString()} PTS!`
      });
      addActivity(`🏆 ${entry.avatar} ${entry.name} set a NEW HIGH SCORE of ${entry.score.toLocaleString()} in ${getGameTitle(game)}!`);
    } else {
      addActivity(`⚡ ${entry.avatar} ${entry.name} conquered ${entry.score.toLocaleString()} PTS in ${getGameTitle(game)}!`);
    }

    // Boost haunting energy upon game finish
    increaseHauntEnergy(5);
  });

  // Send cursed emoji / spell to all connected players
  socket.on('cast_spell', (data) => {
    const user = activeUsers.get(socket.id);
    const spell = data.spell || '🎃';
    const message = data.message ? data.message.substring(0, 40) : '';

    io.emit('spell_cast', {
      sender: user ? user.name : 'Unknown Spirit',
      avatar: user ? user.avatar : '👻',
      spell,
      message,
      x: data.x || Math.random(),
      y: data.y || Math.random()
    });

    if (message) {
      addActivity(`💬 ${user.avatar} ${user.name}: "${message}"`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    activeUsers.delete(socket.id);
    io.emit('spirit_count', { count: io.engine.clientsCount });
  });
});

function getGameTitle(gameKey) {
  switch (gameKey) {
    case 'soulheist': return 'Soul Heist: Crypt Vault';
    case 'necromancer': return 'Necromancer: Rune Ritual';
    case 'survivor': return 'Midnight Survivor';
    case 'tombstone': return 'Tombstone Dash';
    case 'pumpkin': return 'Pumpkin Slasher';
    case 'manor': return 'Haunted Manor';
    default: return 'Spooky Arcade';
  }
}

function addActivity(text) {
  const item = { text, time: Date.now() };
  liveActivity.unshift(item);
  if (liveActivity.length > 25) liveActivity.pop();
  io.emit('new_activity', item);
}

function increaseHauntEnergy(amount) {
  hauntMeter = Math.min(100, hauntMeter + amount);
  io.emit('haunt_meter_update', { hauntMeter: Math.round(hauntMeter) });

  if (hauntMeter >= 100 && !isBloodMoonActive) {
    triggerBloodMoon();
  }
}

function triggerBloodMoon() {
  isBloodMoonActive = true;
  io.emit('blood_moon_started', {
    duration: 30000,
    multiplier: 2.0,
    message: '🌕🩸 BLOOD MOON RISES! ALL SCORE MULTIPLIERS ARE DOUBLED FOR 30 SECONDS! 🩸🌕'
  });

  addActivity('🩸 BLOOD MOON EVENT HAS COMMENCED! Spooky souls surge across all realms!');

  clearTimeout(bloodMoonTimer);
  bloodMoonTimer = setTimeout(() => {
    isBloodMoonActive = false;
    hauntMeter = 15; // Reset back to low
    io.emit('blood_moon_ended', { hauntMeter });
    addActivity('🌘 The Blood Moon recedes into midnight gloom...');
  }, 30000);
}

// Periodically slowly lower haunt meter if no activity to keep it dynamic
setInterval(() => {
  if (!isBloodMoonActive && hauntMeter > 10) {
    hauntMeter = Math.max(10, hauntMeter - 0.5);
    io.emit('haunt_meter_update', { hauntMeter: Math.round(hauntMeter) });
  }
}, 5000);

const PORTS = process.env.PORT ? [parseInt(process.env.PORT)] : [3000, 3001, 8080, 5000];

// Bind primary server
const primaryPort = PORTS[0];
server.listen(primaryPort, () => {
  console.log(`🎃👻 Spooky Halloween Arcade running on http://localhost:${primaryPort}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${primaryPort} is in use.`);
  } else {
    console.error(`Error on port ${primaryPort}:`, err);
  }
});

// Bind additional ports for easy alternative access
PORTS.slice(1).forEach((altPort) => {
  const altServer = http.createServer(app);
  io.attach(altServer);
  altServer.listen(altPort, () => {
    console.log(`🎃👻 Spooky Halloween Arcade also running on http://localhost:${altPort}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${altPort} is in use.`);
    } else {
      console.error(`Error on port ${altPort}:`, err);
    }
  });
});
