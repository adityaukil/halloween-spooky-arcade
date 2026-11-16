# 🎃 SpookyHallow: The Infinite Crypt Arcade

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-blueviolet.svg)](https://socket.io/)
[![Express](https://img.shields.io/badge/Express-Backend-orange.svg)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> *"You stand at the threshold of the SpookyHallow Crypt. The spirits within hunger for souls that dare to test their fate. Once the blood seal is shattered, the mist takes hold and there is no turning back."*

**SpookyHallow** is an immersive, Halloween-themed web arcade featuring **three endless, high-score based spooky games** backed by real-time bi-directional multiplayer synchronization via Socket.IO, procedural Web Audio API horror sound synthesis, and chilling "Enter If You Dare" horror visuals.

---

## 🕹️ Featured Games

### 1. 🗝️ Soul Heist: The Crypt Vault
* **Genre**: Dark Physics Stealth & Tether Slingshot Infiltration
* **Gameplay**:
  * Slingshot your phantom soul tether to gargoyle anchors scattered throughout the crypt.
  * Release to catapult across dark abysses, utilizing momentum and swing physics.
  * **Stealth & Visibility**: Dodge sweeping Holy Inquisitor searchlights that drain ectoplasm on exposure. Skulking through the dark keeps you cloaked and recharges energy.
  * **Relic Heist**: Snatch glowing cursed skulls, ancient chalices, and occult tomes.
  * **Infinite Vault Descent**: Dive into the bottom abyss portal to plunge into deeper, harder vault floors with accelerating searchlights and increased score multipliers.
* **Controls**: **Click & Drag** to aim phantom tether slingshot, release to launch.

### 2. 🔯 Necromancer's Ritual: Rune Weaving
* **Genre**: Real-Time Occult Gesture Drawing & Spell Synthesis Defense
* **Gameplay**:
  * Guard the sacred Altar of the Damned from unending waves of crypt skeletons, toxic crawlers, banshees, and behemoths.
  * **Gesture Recognition Engine**: Draw ancient runes directly on the canvas with your mouse or finger to weave dark spells:
    * **◯ Circle**: Summons **Hellfire Nova**, a radial blast wiping out nearby threats.
    * **— Straight Line**: Casts **Bone Cleave**, slicing through enemy columns.
    * **V V-Shape**: Conjures **Vorpal Bat Swarm**, hunting down fast targets.
    * **Z Zig-Zag**: Channels **Chain Lightning**, leaping between multiple foes.
  * **Runic Combos**: String together consecutive casts without altar damage to trigger catastrophic damage surges!
* **Controls**: **Click & Drag / Touch** to draw gestures directly on the screen.

### 3. 🗡️ Midnight Survivor: The Cursed Carnival
* **Genre**: Bullet-Heaven / Roguelite Horde Survivor *(Vampire Survivors style)*
* **Gameplay**:
  * 360-degree free arena navigation through mist-covered carnival grounds.
  * **Auto-Firing Occult Arsenal**:
    * *Orbiting Jack-o'-Lanterns* that incinerate surrounding fiends.
    * *Vorpal Scythes* that cleave through monster hordes in directional arcs.
    * *Homing Vampire Bats* that automatically hunt down distant enemies.
  * **Perk Synergies**: Slay 100+ simultaneous monsters, gather green soul gems for EXP, level up, and pick upgrade perks (Health Boost, Spectral Swiftness, Weapon Radius, Damage multipliers).
* **Controls**: **W A S D** / **Arrow Keys** or **Click & Hold Mouse** to steer.

---

## 🩸 Real-Time Multiplayer & Atmospheric Engine

- **Bi-directional Live Synchronization**: Real-time score streaming powers the shared global **Haunt Energy Meter**. When it reaches 100%, a server-wide **Blood Moon Surge (2x Score Multiplier)** is triggered for all connected players.
- **Crypt Leaderboards**: High scores update live across all connected clients via WebSockets with celebratory stinger alerts and sound effects.
- **Cursed Conjuration Circle**: Cast real-time floating emoji curses and whispers that materialize on all active players' screens.
- **Procedural Web Audio Engine**: Zero external audio files required! Synthesizes creaking crypt gates, funeral death bells, biological heartbeat pulses, thunder claps, and haunting drones purely through the Web Audio API.
- **Dynamic Ambient Canvas**: Animated Blood Moon, fluttering bats, creeping mist fog, lightning strikes, and blinking demonic eyes lurking in the shadows.
- **100% Procedural Vector Graphics**: High-resolution HTML5 canvas vector rendering with dynamic lighting, glowing halos, particle sparks, and tether cords.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v16.0.0 or higher recommended)
* npm (bundled with Node.js)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adityaukil/halloween-spooky-arcade.git
   cd halloween-spooky-arcade
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Play the game:**
   Open your browser and navigate to:
   * **[http://localhost:3000](http://localhost:3000)** (or [http://localhost:8080](http://localhost:8080) / [http://localhost:3001](http://localhost:3001))

---

## 📁 Project Structure

```
halloween-spooky-arcade/
├── data/
│   └── scores.json              # Persistent high scores storage
├── public/
│   ├── index.html               # Main arcade interface & game viewport
│   ├── style.css                # Spooky Halloween UI styling & themes
│   └── js/
│       ├── ambient.js           # Atmospheric background canvas (fog, bats, moon)
│       ├── audio.js             # Procedural Web Audio API sound synthesizer
│       ├── network.js           # Socket.IO client & real-time synchronization
│       ├── main.js              # Game launcher lifecycle & UI controls
│       ├── game1-soulheist.js   # Soul Heist: The Crypt Vault
│       ├── game2-necromancer.js # Necromancer's Ritual: Rune Weaving
│       └── game3-survivor.js    # Midnight Survivor: The Cursed Carnival
├── server.js                    # Express & Socket.IO multiplayer server
├── package.json
└── README.md
```

---

## 📜 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
