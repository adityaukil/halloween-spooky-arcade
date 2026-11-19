const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'spooky_arcade.db');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class ArcadeDatabase {
  constructor(dbPath = DB_PATH) {
    this.db = new DatabaseSync(dbPath);
    this.init();
  }

  init() {
    // Enable WAL mode for high performance concurrent operations
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
    } catch (e) {
      console.warn('SQLite PRAGMA warning:', e.message);
    }

    // Create table for storing every single play session
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS plays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT NOT NULL,
        player_avatar TEXT NOT NULL DEFAULT '🎃',
        game TEXT NOT NULL,
        score INTEGER NOT NULL,
        details TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_plays_game_score ON plays(game, score DESC);
      CREATE INDEX IF NOT EXISTS idx_plays_created_at ON plays(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_plays_player ON plays(player_name, game);
    `);

    // Prepare frequently used queries
    this.insertPlayStmt = this.db.prepare(`
      INSERT INTO plays (player_name, player_avatar, game, score, details, session_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    this.getRankStmt = this.db.prepare(`
      SELECT COUNT(*) + 1 AS rank FROM plays WHERE game = ? AND score > ?
    `);

    this.getTotalGamePlaysStmt = this.db.prepare(`
      SELECT COUNT(*) AS total FROM plays WHERE game = ?
    `);

    this.getTopScoreStmt = this.db.prepare(`
      SELECT MAX(score) AS maxScore FROM plays WHERE game = ?
    `);

    this.getLeaderboardStmt = this.db.prepare(`
      SELECT id, player_name AS name, player_avatar AS avatar, score, details,
             datetime(created_at, 'localtime') AS date, created_at
      FROM plays
      WHERE game = ?
      ORDER BY score DESC, id ASC
      LIMIT ?
    `);

    this.getRecentPlaysStmt = this.db.prepare(`
      SELECT id, player_name AS name, player_avatar AS avatar, game, score, details,
             datetime(created_at, 'localtime') AS date, created_at
      FROM plays
      ORDER BY id DESC
      LIMIT ?
    `);

    this.getRecentPlaysForGameStmt = this.db.prepare(`
      SELECT id, player_name AS name, player_avatar AS avatar, game, score, details,
             datetime(created_at, 'localtime') AS date, created_at
      FROM plays
      WHERE game = ?
      ORDER BY id DESC
      LIMIT ?
    `);

    this.getStatsStmt = this.db.prepare(`
      SELECT 
        COUNT(*) AS totalPlays,
        COUNT(DISTINCT player_name) AS uniquePlayers,
        COALESCE(SUM(score), 0) AS totalScore,
        COALESCE(MAX(score), 0) AS highestScore
      FROM plays
    `);

    // Migrate from legacy scores.json if table is empty
    this.migrateInitialData();
  }

  migrateInitialData() {
    const countCheck = this.db.prepare('SELECT COUNT(*) AS cnt FROM plays').get();
    if (countCheck && countCheck.cnt === 0) {
      console.log('📦 Initializing SQLite database with initial play records...');
      if (fs.existsSync(SCORES_FILE)) {
        try {
          const raw = fs.readFileSync(SCORES_FILE, 'utf8');
          const data = JSON.parse(raw);
          for (const [game, list] of Object.entries(data)) {
            if (Array.isArray(list)) {
              for (const item of list) {
                if (item.name && typeof item.score === 'number') {
                  this.insertPlayStmt.run(
                    String(item.name).substring(0, 16),
                    item.avatar || '👻',
                    game,
                    Math.floor(item.score),
                    'Initial Record',
                    'migrated'
                  );
                }
              }
            }
          }
          console.log('✅ Legacy scores successfully migrated to SQLite plays table.');
        } catch (err) {
          console.error('Error migrating legacy scores:', err);
        }
      }
    }
  }

  /**
   * Record every single play into the database
   */
  recordPlay({ name, avatar, game, score, details = '', sessionId = '' }) {
    const cleanName = (name || 'Anonymous Ghoul').substring(0, 16);
    const cleanAvatar = avatar || '👻';
    const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
    const cleanDetails = typeof details === 'object' ? JSON.stringify(details) : String(details || '');

    // Check previous top score before insert to determine if it's a new all-time high record
    const topBefore = this.getTopScoreStmt.get(game);
    const prevMaxScore = topBefore && topBefore.maxScore ? topBefore.maxScore : 0;

    // Insert into database
    const result = this.insertPlayStmt.run(
      cleanName,
      cleanAvatar,
      game,
      cleanScore,
      cleanDetails,
      sessionId
    );

    const insertedId = result.lastInsertRowid;

    // Calculate rank
    const rankInfo = this.getRankStmt.get(game, cleanScore);
    const rank = rankInfo ? rankInfo.rank : 1;

    const totalInfo = this.getTotalGamePlaysStmt.get(game);
    const totalPlays = totalInfo ? totalInfo.total : 1;

    const isAllTimeRecord = cleanScore > prevMaxScore;

    return {
      id: Number(insertedId),
      name: cleanName,
      avatar: cleanAvatar,
      game,
      score: cleanScore,
      details: cleanDetails,
      rank,
      totalPlays,
      isAllTimeRecord,
      date: new Date().toISOString()
    };
  }

  /**
   * Get Top 10 Leaderboard for a game
   */
  getLeaderboard(game, limit = 10) {
    const rows = this.getLeaderboardStmt.all(game, limit);
    return rows.map((r, idx) => ({
      id: r.id,
      rank: idx + 1,
      name: r.name,
      avatar: r.avatar,
      score: r.score,
      details: r.details,
      date: r.date
    }));
  }

  /**
   * Get all leaderboards for all supported games
   */
  getAllLeaderboards(limit = 10) {
    return {
      soulheist: this.getLeaderboard('soulheist', limit),
      necromancer: this.getLeaderboard('necromancer', limit),
      survivor: this.getLeaderboard('survivor', limit)
    };
  }

  /**
   * Get recent plays in real time
   */
  getRecentPlays(game = null, limit = 10) {
    const rows = game 
      ? this.getRecentPlaysForGameStmt.all(game, limit)
      : this.getRecentPlaysStmt.all(limit);

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      game: r.game,
      score: r.score,
      details: r.details,
      date: r.date
    }));
  }

  /**
   * Get overall arcade database statistics
   */
  getStats() {
    const overall = this.getStatsStmt.get();
    return {
      totalPlays: overall.totalPlays || 0,
      uniquePlayers: overall.uniquePlayers || 0,
      totalScore: overall.totalScore || 0,
      highestScore: overall.highestScore || 0,
      dbEngine: 'SQLite (node:sqlite ACID WAL)'
    };
  }

  /**
   * Player specific history
   */
  getPlayerHistory(playerName, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT id, game, score, details, datetime(created_at, 'localtime') AS date
      FROM plays
      WHERE player_name = ?
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(playerName, limit);
  }

  close() {
    try {
      this.db.close();
    } catch (e) {
      // ignore
    }
  }
}

// Singleton database instance
const arcadeDb = new ArcadeDatabase();

module.exports = arcadeDb;
