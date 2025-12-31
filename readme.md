# 🎄 Carols in the Dark

**Live Demo:**  
https://pooormond.github.io/Carols-in-the-Dark/

---

## 📘 Project Overview

**Carols in the Dark** is a browser-based **3D first-person horror rhythm game** developed as a **final project requirement** for our school’s Full-Stack Development course.

The game combines:
- **3D exploration** (virtual environment)
- **Rhythm-based gameplay**
- **Immersive audio and interaction**
- **Modern web technologies**

Players explore a dark village and enter houses to perform caroling challenges. Each challenge affects the player’s score and remaining lives, encouraging strategic risk-taking and replayability.

---

## 🎯 Project Theme Alignment

This project falls under the following approved theme:

### ✅ **2D or 3D Game Development**

It also incorporates concepts from:
- **Virtual Environments**
- **Immersive Interaction Design**
- **Real-time Audio & User Feedback**

The game demonstrates interactive 3D rendering, real-time input handling, audio synchronization, and game state management — all core topics covered in the lecture modules.

---

## 🧠 Game Concept & Story

You are a lone caroler trapped in a cursed village on Christmas Eve.

- Each house contains a rhythm-based caroling challenge
- Success increases your score
- Failure costs one of your **limited lives**
- Reach **15,500 total score** to unlock the village exit
- You may escape — or continue playing at the risk of losing everything

The game encourages:
- Player decision-making
- Skill-based progression
- Immersive tension through sound and visuals

---

## 🎮 Gameplay & Controls

### 3D World Controls
- **W A S D** — Move
- **Mouse** — Look around
- **SHIFT** — Run
- **SPACE** — Jump
- **ENTER** — Enter a house
- **ESC** — Pause / Settings

### Caroling (Rhythm Game)
- **A S K L** — Hit falling notes
- **ESC** — Pause
- **ENTER** — Return to village after completion

---

## 🛠 Development Stack

### Front-End
- **HTML5**
- **CSS3**
- **Vanilla JavaScript**

### 3D & Game Engines
- **Three.js** — 3D world, player movement, environment
- **Phaser 3** — Rhythm-based mini-game system

### Audio
- **Web Audio API**
- Custom audio playback, pause/resume, and synchronization logic

### Deployment
- **GitHub Pages**

> The application is fully client-side and runs entirely in the browser.

---

## 🧩 System Architecture (High-Level)

- **3D Game (Three.js)**
  - Player movement
  - Environment rendering
  - House interaction
- **Mini-Game (Phaser)**
  - Rhythm gameplay
  - Scoring & satisfaction system
- **Game Controller**
  - Life system
  - Score tracking
  - Game state transitions
- **Audio Manager**
  - Background music
  - Caroling audio
  - Pause & resume handling

Each system is modular and communicates via controlled callbacks.

---

## 📁 Project Structure

Carols-in-the-Dark/
├── index.html
├── main.js
├── player.js
├── environment.js
├── caroling.js
├── assets/
│ ├── music/
│ ├── textures/
│ └── images/
└── README.md

---

## 🚀 Running the Project Locally

Because modern browsers restrict audio and file access on `file://`, a local server is required.

### Option 1 — VS Code Live Server
1. Install the **Live Server** extension
2. Right-click `index.html`
3. Select **Open with Live Server**

### Option 2 — Python HTTP Server
```bash
python -m http.server
Then open:
http://localhost:8000