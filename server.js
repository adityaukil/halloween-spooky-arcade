const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const db = require('./database');

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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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

// REST endpoints for status & SQLite database records
app.get('/api/scores', (req, res) => {
  res.json(db.getAllLeaderboards(10));
});

app.get('/api/leaderboard/:game', (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  res.json(db.getLeaderboard(req.params.game, limit));
});

app.get('/api/plays/recent', (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
  res.json(db.getRecentPlays(req.query.game || null, limit));
});

app.get('/api/stats', (req, res) => {
  res.json({
    ...db.getStats(),
    hauntMeter,
    isBloodMoonActive,
    activeSpirits: io.engine.clientsCount
  });
});

app.get('/api/player/:name', (req, res) => {
  res.json(db.getPlayerHistory(req.params.name, 10));
});

app.get('/api/haunt-status', (req, res) => {
  res.json({
    hauntMeter,
    isBloodMoonActive,
    activeSpirits: io.engine.clientsCount,
    totalPlays: db.getStats().totalPlays
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

  // Send current state to newly connected spirit from SQLite database
  socket.emit('init_state', {
    identity: activeUsers.get(socket.id),
    scores: db.getAllLeaderboards(10),
    recentPlays: db.getRecentPlays(null, 10),
    stats: db.getStats(),
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

  // Score submission for EVERY real play - stored persistently in SQLite database!
  socket.on('submit_score', (data) => {
    const { game, score, name, avatar, details } = data || {};
    if (typeof score !== 'number' || score <= 0) return;

    const cleanGame = (game || '').toLowerCase();
    const validGames = ['soulheist', 'necromancer', 'survivor', 'tombstone', 'pumpkin', 'manor'];
    if (!validGames.includes(cleanGame)) return;

    const user = activeUsers.get(socket.id);
    const playerName = (name || (user ? user.name : 'Anonymous Ghoul')).substring(0, 16);
    const playerAvatar = avatar || (user ? user.avatar : '👻');

    // 1. Permanently record every single play in the SQLite database
    const recorded = db.recordPlay({
      name: playerName,
      avatar: playerAvatar,
      game: cleanGame,
      score,
      details,
      sessionId: socket.id
    });

    // 2. Fetch freshly calculated real-time top leaderboard & stats from database
    const updatedLeaderboard = db.getLeaderboard(cleanGame, 10);
    const stats = db.getStats();

    // 3. Confirm to the player that their play has been persisted in the database with their rank
    socket.emit('play_recorded', {
      play: recorded,
      game: cleanGame,
      rank: recorded.rank,
      totalPlays: recorded.totalPlays,
      isAllTimeRecord: recorded.isAllTimeRecord
    });

    // 4. Instantly broadcast updated leaderboard & stats to ALL connected spirits in real time
    io.emit('leaderboard_updated', {
      game: cleanGame,
      scores: updatedLeaderboard,
      newEntry: recorded,
      stats
    });

    // 5. Broadcast real-time play event for the activity feed & recent plays ticker
    io.emit('new_play_recorded', {
      play: recorded,
      stats
    });

    // 6. Broadcast celebratory horror alerts and chronicles
    if (recorded.isAllTimeRecord) {
      io.emit('spooky_alert', {
        type: 'RECORD_SMASHED',
        message: `🔥 NEW ALL-TIME RECORD! ${recorded.avatar} ${recorded.name} seized #1 in ${getGameTitle(cleanGame)} with ${recorded.score.toLocaleString()} PTS!`
      });
      addActivity(`🏆 ${recorded.avatar} ${recorded.name} broke the ALL-TIME HIGH SCORE of ${recorded.score.toLocaleString()} in ${getGameTitle(cleanGame)}!`);
    } else if (recorded.rank <= 3) {
      addActivity(`🥉 ${recorded.avatar} ${recorded.name} claimed Rank #${recorded.rank} with ${recorded.score.toLocaleString()} PTS in ${getGameTitle(cleanGame)}!`);
    } else {
      addActivity(`⚡ ${recorded.avatar} ${recorded.name} logged ${recorded.score.toLocaleString()} PTS in ${getGameTitle(cleanGame)} [Play #${recorded.id}]!`);
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
