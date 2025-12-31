class Game3D {
    constructor(carolingGame) {
        this.carolingGame = carolingGame;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;

        this.EYE_HEIGHT = 1.6;

        // Spawn positions
        this.INITIAL_SPAWN = new THREE.Vector3(0, this.EYE_HEIGHT, 30);

        // Victory exit position
        this.VICTORY_EXIT = new THREE.Vector3(0, this.EYE_HEIGHT, -100);

        this.player = {
            position: new THREE.Vector3(0, this.EYE_HEIGHT, 5),
            rotation: new THREE.Vector2(0, 0),
            velocity: new THREE.Vector3(),
            speed: 5,
            runSpeed: 8,
            jumpForce: 8,
            gravity: 25,
            isGrounded: true
        };

        this.keys = {};
        this.mouseSensitivity = 0.002;

        this.moveDir = new THREE.Vector3();
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();

        this.clock = new THREE.Clock();
        this.isRunning = false;

        this.collisionEnabled = true;
        this.playerRadius = 0.5;
        this.playerHeight = 1.6;
        this.tempVec = new THREE.Vector3();
        this.tempBox = new THREE.Box3();

        // DOOR PROMPT PROPERTIES
        this.doorPrompt = null;
        this.enterButton = null;
        this.nearDoor = null;
        this.enterPressed = false;
        this.enterResetTimeout = null;
        
        // CAROLING GAME INTEGRATION
        this.currentDoor = null;
        this.uiHidden = false;
        this.lastMoveTime = 0;
        
        // Game progress tracking
        this.completedHouses = new Set();
        this.failedHouses = new Set();
        this.houseFailures = {};
        
        // Death state
        this.isDead = false;
        
        this.victoryTriggered = false;
        this.exitPromptShown = false; // 🔧 FIX 1: Add exit prompt flag

        // House difficulty system
        this.houseDifficulty = {
            1: { name: "Easy", color: "#FFAA33", description: "Simple rhythm patterns" },
            2: { name: "Easy", color: "#FFAA33", description: "Simple rhythm patterns" },
            3: { name: "Easy", color: "#FFAA33", description: "Simple rhythm patterns" },
            4: { name: "Moderate", color: "#FF66AA", description: "Moderate rhythm patterns" },
            5: { name: "Hard", color: "#9966FF", description: "Complex rhythm patterns" },
            6: { name: "Hard", color: "#00FFFF", description: "Complex rhythm patterns" }
        };
        
        // HUD elements
        this.hud = null;
        this.progressBar = null;
        this.scoreDisplay = null;
        this.difficultyDisplay = null;
        
        // House order system
        this.allowedHouses = new Set([1]);
        this.unlockRequirements = {
            2: () => this.completedHouses.has(1),
            3: () => this.completedHouses.has(2),
            4: () => this.completedHouses.size >= 2,
            5: () => this.completedHouses.has(4),
            6: () => this.completedHouses.has(5)
        };

        // SETTINGS MENU PROPERTIES
        this.settingsMenu = null;
        this.isPaused = false;

        this.bindMethods();
    }

    bindMethods() {
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onPointerLockChange = this.onPointerLockChange.bind(this);
        this.handleEnterKey = this.handleEnterKey.bind(this);
        this.handleEnterPress = this.handleEnterPress.bind(this);
        this.onCarolingGameComplete = this.onCarolingGameComplete.bind(this);
        this.checkHouseAccess = this.checkHouseAccess.bind(this);
        this.showUnlockMessage = this.showUnlockMessage.bind(this);
        this.updateAllowedHouses = this.updateAllowedHouses.bind(this);
        this.toggleSettingsMenu = this.toggleSettingsMenu.bind(this);
        this.saveSettings = this.saveSettings.bind(this);
        this.loadSettings = this.loadSettings.bind(this);
        this.setupSettingsMenu = this.setupSettingsMenu.bind(this);
        this.setupSettingsListeners = this.setupSettingsListeners.bind(this);
        this.updateSettingsUI = this.updateSettingsUI.bind(this);
        this.exitToMainMenu = this.exitToMainMenu.bind(this);
        this.resumeFromSettings = this.resumeFromSettings.bind(this);
    }

    async init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();

        await this.setupEnvironment(); // ⬅ important

        this.setupEvents();
        this.setupDoorPrompt();
        this.setupSettingsMenu();
        this.setupHUD();

        if (window.audioManager) {
            setTimeout(() => {
                window.audioManager.playBackgroundMusic(true);
            }, 1000);
        }

        this.isRunning = true;
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.05);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.copy(this.player.position);
        this.camera.rotation.order = 'YXZ';
    }

    async setupEnvironment() {
        this.environment = new GameEnvironment(this.scene);
        await this.environment.createEnvironment(); // waits for glb files
    }


    setupControls() {
        this.canvas.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });
    }

    setupEvents() {
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('pointerlockchange', this.onPointerLockChange);
        window.addEventListener('resize', this.onResize);
        
        // ENTER key listener for door prompt
        document.addEventListener('keydown', this.handleEnterKey);
    }

    setupDoorPrompt() {
        this.doorPrompt = document.getElementById("doorPrompt");
        this.enterButton = document.getElementById("enterButton");
        
        if (!this.doorPrompt || !this.enterButton) {
            console.warn("Door prompt elements not found in HTML");
            return;
        }
        
        this.enterButton.addEventListener('click', () => {
            this.handleEnterPress();
        });
        
        this.hideDoorPrompt();
    }

    // SETTINGS MENU METHODS
    setupSettingsMenu() {
        this.settingsMenu = document.getElementById('settingsMenu');
        
        // Load settings
        this.loadSettings();
        
        // Setup settings event listeners
        this.setupSettingsListeners();
    }
    
    loadSettings() {
        // Apply loaded settings to game
        if (window.audioManager) {
            const settings = window.audioManager.settings;
            window.audioManager.setMusicVolume(settings.musicVolume);
            window.audioManager.setSfxVolume(settings.sfxVolume);
            window.audioManager.setCarolVolume(settings.carolVolume || 0.7);
            if (settings.muted) {
                window.audioManager.toggleMute();
            }
        }
    }
    
    setupSettingsListeners() {
        if (!this.settingsMenu || !window.audioManager) return;
        
        // Volume sliders
        const musicSlider = document.getElementById('musicVolume');
        const sfxSlider = document.getElementById('sfxVolume');
        const carolSlider = document.getElementById('carolVolume');
        const musicValue = document.getElementById('musicVolumeValue');
        const sfxValue = document.getElementById('sfxVolumeValue');
        const carolValue = document.getElementById('carolVolumeValue');
        
        if (musicSlider && musicValue) {
            musicSlider.value = window.audioManager.bgMusicVolume * 100;
            musicValue.textContent = `${Math.round(window.audioManager.bgMusicVolume * 100)}%`;
            
            musicSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                musicValue.textContent = `${value}%`;
                window.audioManager.setMusicVolume(value / 100);
            });
        }
        
        if (sfxSlider && sfxValue) {
            sfxSlider.value = window.audioManager.sfxVolume * 100;
            sfxValue.textContent = `${Math.round(window.audioManager.sfxVolume * 100)}%`;
            
            sfxSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                sfxValue.textContent = `${value}%`;
                window.audioManager.setSfxVolume(value / 100);
            });
        }
        
        // Carol volume slider
        if (carolSlider && carolValue) {
            carolSlider.value = window.audioManager.carolVolume * 100;
            carolValue.textContent = `${Math.round(window.audioManager.carolVolume * 100)}%`;
            
            carolSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                carolValue.textContent = `${value}%`;
                window.audioManager.setCarolVolume(value / 100);
                
                // Update carol game audio if it's playing
                if (this.carolingGame && this.carolingGame.currentAudioGain) {
                    this.carolingGame.currentAudioGain.gain.value = value / 100;
                }
            });
        }
        
        // Mute checkbox
        const muteCheckbox = document.getElementById('muteAudio');
        if (muteCheckbox) {
            muteCheckbox.checked = window.audioManager.isMuted;
            muteCheckbox.addEventListener('change', (e) => {
                window.audioManager.toggleMute();
            });
        }
        
        // Test sound button
        const testBtn = document.getElementById('testSound');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                window.audioManager.playClickSound();
            });
        }
        
        // Save & Resume button
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // Save settings first
                window.audioManager.saveSettings();
                // Then close settings menu
                this.toggleSettingsMenu();
            });
        }
        
        // Exit to Main Menu button
        const exitBtn = document.getElementById('exitToMenu');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                this.exitToMainMenu();
            });
        }
        
        // Close button (×)
        const closeBtn = document.getElementById('closeSettings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.toggleSettingsMenu();
            });
        }
    }
    
    updateSettingsUI() {
        if (!window.audioManager) return;
        
        // Update volume sliders
        const musicSlider = document.getElementById('musicVolume');
        const sfxSlider = document.getElementById('sfxVolume');
        const carolSlider = document.getElementById('carolVolume');
        const musicValue = document.getElementById('musicVolumeValue');
        const sfxValue = document.getElementById('sfxVolumeValue');
        const carolValue = document.getElementById('carolVolumeValue');
        const muteCheckbox = document.getElementById('muteAudio');
        
        if (musicSlider && musicValue) {
            musicSlider.value = window.audioManager.bgMusicVolume * 100;
            musicValue.textContent = `${Math.round(window.audioManager.bgMusicVolume * 100)}%`;
        }
        
        if (sfxSlider && sfxValue) {
            sfxSlider.value = window.audioManager.sfxVolume * 100;
            sfxValue.textContent = `${Math.round(window.audioManager.sfxVolume * 100)}%`;
        }
        
        if (carolSlider && carolValue) {
            carolSlider.value = window.audioManager.carolVolume * 100;
            carolValue.textContent = `${Math.round(window.audioManager.carolVolume * 100)}%`;
        }
        
        if (muteCheckbox) {
            muteCheckbox.checked = window.audioManager.isMuted;
        }
    }
    
    toggleSettingsMenu() {
        if (!this.settingsMenu) return;
        
        const isOpening = this.settingsMenu.classList.contains('hidden');
        
        if (isOpening) {
            // SHOW SETTINGS MENU
            this.settingsMenu.classList.remove('hidden');
            
            // Pause the game
            this.isRunning = false;
            this.isPaused = true;
            
            // If caroling game is active, pause it properly
            if (this.carolingGame && this.carolingGame.container && 
                this.carolingGame.container.style.display === 'block') {
                
                // Pause the Phaser game scene
                if (this.carolingGame.game && this.carolingGame.game.scene) {
                    const scene = this.carolingGame.game.scene.getScene('CarolingScene');
                    if (scene && scene.scene.isActive()) {
                        scene.scene.pause();
                    }
                }
                
                // CRITICAL: Pause audio and save position
                if (this.carolingGame.pauseCarolAudio) {
                    this.carolingGame.pauseCarolAudio();
                }
            }
            
            // Pause background music
            if (window.audioManager) {
                window.audioManager.pauseBackgroundMusic();
            }
            
            // Unlock mouse pointer
            document.exitPointerLock();
            
            // Update UI with current settings
            this.updateSettingsUI();
            
        } else {
            // HIDE SETTINGS MENU
            this.settingsMenu.classList.add('hidden');
            
            // Resume the game
            this.isRunning = true;
            this.isPaused = false;
            
            // Clear keys to prevent stuck keys
            this.keys = {};
            
            // If caroling game was active, resume it
            if (this.carolingGame && this.carolingGame.container && 
                this.carolingGame.container.style.display === 'block') {
                
                // Resume the Phaser scene
                if (this.carolingGame.game && this.carolingGame.game.scene) {
                    const scene = this.carolingGame.game.scene.getScene('CarolingScene');
                    if (scene && scene.scene.isPaused()) {
                        scene.scene.resume();
                    }
                }
                
                // CRITICAL: Resume audio from saved position
                if (this.carolingGame.resumeCarolAudio) {
                    const resumed = this.carolingGame.resumeCarolAudio();
                    if (!resumed) {
                        console.log("Audio resume failed, may need to restart");
                    }
                }
                
            } else {
                // We're in 3D game, resume mouse lock
                this.canvas.requestPointerLock();
                
                // Resume background music
                if (window.audioManager) {
                    window.audioManager.resumeBackgroundMusic();
                }
                
                // Resume 3D game animation
                this.animate();
            }
        }
    }
    
    resumeFromSettings() {
        if (this.isPaused) {
            this.isPaused = false;
            this.isRunning = true;
            
            // Request pointer lock for 3D game
            if (!this.carolingGame || !this.carolingGame.container || 
                this.carolingGame.container.style.display !== 'block') {
                this.canvas.requestPointerLock();
            }
            
            // Resume animation
            this.animate();
        }
    }
    
    exitToMainMenu() {
        // Play click sound
        if (window.audioManager) {
            window.audioManager.playClickSound();
        }
        
        // Save settings before exiting
        this.saveSettings();
        
        // Close settings menu
        this.settingsMenu.classList.add('hidden');
        
        // Stop the game
        this.stop();
        
        // Hide game container, show menu
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('menuContainer').style.display = 'flex';
        
        // Reset game state for fresh start
        this.resetGameState();
    }
    
    saveSettings() {
        if (window.audioManager) {
            window.audioManager.saveSettings();
        }
        // Don't toggle settings menu here - let the button handler do it
    }

    // Setup HUD
    setupHUD() {
        // Create HUD container
        this.hud = document.createElement('div');
        this.hud.id = 'gameHUD';
        this.hud.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 999;
            font-family: 'Courier New', monospace;
            color: white;
        `;
        
        // Crosshair
        const crosshair = document.createElement('div');
        crosshair.className = 'crosshair';
        crosshair.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            pointer-events: none;
        `;
        
        const crosshairBefore = document.createElement('div');
        crosshairBefore.style.cssText = `
            position: absolute;
            width: 2px;
            height: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.8);
        `;
        
        const crosshairAfter = document.createElement('div');
        crosshairAfter.style.cssText = `
            position: absolute;
            width: 100%;
            height: 2px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.8);
        `;
        
        crosshair.appendChild(crosshairBefore);
        crosshair.appendChild(crosshairAfter);
        
        // Progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.id = 'progressBar';
        this.progressBar.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 300px;
            height: 30px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #00FF00;
            border-radius: 15px;
            overflow: hidden;
            display: none;
        `;
        
        const progressFill = document.createElement('div');
        progressFill.id = 'progressFill';
        progressFill.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(to right, #00AA00, #00FF00);
            transition: width 0.5s ease;
        `;
        this.progressBar.appendChild(progressFill);
        
        const progressText = document.createElement('div');
        progressText.id = 'progressText';
        progressText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-weight: bold;
            font-size: 14px;
            text-shadow: 1px 1px 2px black;
        `;
        progressText.textContent = '0/6 Houses';
        this.progressBar.appendChild(progressText);
        
        // Score display
        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.id = 'scoreDisplay';
        this.scoreDisplay.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: #FFD700;
            padding: 10px 20px;
            border-radius: 10px;
            border: 2px solid #FFD700;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            display: none;
        `;
        this.scoreDisplay.innerHTML = `
            <div style="font-size: 12px; color: #AAAAAA;">SCORE</div>
            <div id="scoreValue">0</div>
        `;
        
        // Difficulty display
        this.difficultyDisplay = document.createElement('div');
        this.difficultyDisplay.id = 'difficultyDisplay';
        this.difficultyDisplay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            padding: 15px;
            border-radius: 10px;
            border: 2px solid #444444;
            min-width: 200px;
            display: none;
        `;
        
        this.hud.appendChild(crosshair);
        this.hud.appendChild(this.progressBar);
        this.hud.appendChild(this.scoreDisplay);
        this.hud.appendChild(this.difficultyDisplay);
        document.body.appendChild(this.hud);
        
        // Show HUD immediately
        this.showHUD();
    }
    
    // Show HUD elements
    showHUD() {
        if (this.progressBar) {
            this.progressBar.style.display = 'block';
            this.updateProgressDisplay();
        }
        if (this.scoreDisplay) {
            this.scoreDisplay.style.display = 'block';
            this.updateScoreDisplay();
        }
        if (this.difficultyDisplay) {
            this.difficultyDisplay.style.display = 'block';
            this.updateDifficultyDisplay();
        }
    }
    
    // Hide game UI when moving
    hideGameUI() {
        const gameUI = document.querySelector('.game-ui');
        if (gameUI) {
            gameUI.classList.add('hidden');
        }
    }

    // Show game UI when stationary
    showGameUI() {
        const gameUI = document.querySelector('.game-ui');
        if (gameUI) {
            gameUI.classList.remove('hidden');
        }
    }

    onKeyDown(e) {
        const key = e.key.toLowerCase();
        
        // ESC now only opens/closes settings menu - ALWAYS
        if (key === 'escape') {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from going to caroling game
            
            // Play click sound
            if (window.audioManager) {
                window.audioManager.playClickSound();
            }
            
            // If caroling game is active, show settings over it
            if (this.carolingGame && this.carolingGame.container && 
                this.carolingGame.container.style.display === 'block') {
                
                // Pause the caroling game
                if (this.carolingGame.game) {
                    this.carolingGame.game.scene.pause('CarolingScene');
                }
                
                // MODIFIED: Pause carol audio (not stop)
                if (this.carolingGame.pauseCarolAudio) {
                    this.carolingGame.pauseCarolAudio();
                } else if (this.carolingGame.stopCarolAudio) {
                    // Fallback
                    this.carolingGame.stopCarolAudio();
                }
                
                // Show settings menu on top of caroling game
                this.toggleSettingsMenu();
                
            } else {
                // Normal 3D game settings toggle
                this.toggleSettingsMenu();
            }
            return;
        }
        
        // Only process other keys if game is running and not paused
        if (!this.isRunning || this.isPaused) return;
        
        if (!this.keys[key]) {
            this.keys[key] = true;

            if (key === ' ' && this.player.isGrounded) {
                this.player.velocity.y = this.player.jumpForce;
                this.player.isGrounded = false;
            }
            
            // Play click sound for ENTER key
            if (window.audioManager && key === 'enter') {
                window.audioManager.playClickSound();
            }
        }

        if (key === ' ') e.preventDefault();
    }

    onKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    }

    handleEnterKey(e) {
        if (e.code === 'Enter' && this.nearDoor && !this.enterPressed) {
            e.preventDefault();
            this.handleEnterPress();
        }
    }

    checkHouseAccess(houseNumber) {
        // Check if house is already completed
        if (this.completedHouses.has(houseNumber)) {
            return { allowed: false, reason: 'already_completed' };
        }
        
        // Check if house is unlocked
        if (!this.allowedHouses.has(houseNumber)) {
            return { allowed: false, reason: 'locked' };
        }
        
        return { allowed: true, reason: '' };
    }

    handleEnterPress() {
        if (!this.nearDoor || this.enterPressed) return;
        
        // Play click sound
        if (window.audioManager) {
            window.audioManager.playClickSound();
        }
        
        // Get house number directly from door data
        const houseNumber = this.nearDoor.houseNumber;
        
        // Check house access
        const access = this.checkHouseAccess(houseNumber);
        
        if (!access.allowed) {
            if (access.reason === 'already_completed') {
                this.showMessage(`House ${houseNumber} already completed!`, '#00FF00');
            } else if (access.reason === 'locked') {
                this.showLockedHouseMessage(houseNumber);
            }
            return;
        }
        
        if (this.enterResetTimeout) {
            clearTimeout(this.enterResetTimeout);
            this.enterResetTimeout = null;
        }
        
        this.enterPressed = true;
        if (this.enterButton) {
            this.enterButton.classList.add("active");
        }
        
        // Start Caroling Game
        this.startCarolingGame(this.nearDoor);
        
        this.enterResetTimeout = setTimeout(() => {
            this.enterPressed = false;
            if (this.enterButton) {
                this.enterButton.classList.remove("active");
            }
            this.enterResetTimeout = null;
        }, 800);
    }
    
    showLockedHouseMessage(houseNumber) {
        let requirementText = '';
        if (houseNumber === 2) requirementText = "Complete House 1 first";
        else if (houseNumber === 3) requirementText = "Complete House 2 first";
        else if (houseNumber === 4) requirementText = "Complete 2 houses first";
        else if (houseNumber === 5) requirementText = "Complete House 4 first";
        else if (houseNumber === 6) requirementText = "Complete House 5 first";
        
        this.showMessage(`House ${houseNumber} Locked\n${requirementText}`, '#FFFF00');
    }
    
    showMessage(text, color = '#FFFFFF') {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: ${color};
            padding: 20px 40px;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 24px;
            z-index: 10000;
            text-align: center;
            border: 2px solid ${color};
            animation: fadeInOut 3s forwards;
            white-space: pre-line;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
        
        message.textContent = text;
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) message.remove();
            if (style.parentNode) style.remove();
        }, 3000);
    }

    startCarolingGame(door) {
        this.currentDoor = door;
        
        // Pause background music when caroling starts
        if (window.audioManager) {
            window.audioManager.pauseBackgroundMusic();
        }
        
        this.hide3DGame();
        
        // Get house number directly from door
        const houseNumber = door.houseNumber;
        
        this.carolingGame.init(houseNumber, (result) => {
            this.onCarolingGameComplete(result);
        });
    }

    hide3DGame() {
        this.canvas.style.display = 'none';
        this.hideGameUI();
        this.isRunning = false;
        this.hideDoorPrompt();
        this.keys = {};
    }

    show3DGame() {
        this.canvas.style.display = 'block';
        this.showGameUI();
        this.isRunning = true;
        this.animate();
        document.exitPointerLock();
    }

    onCarolingGameComplete(result) {
        /* =========================
        1. HANDLE GAME OVER FIRST
        ========================= */
        if (result.gameOver) {
            console.warn("GAME OVER — no lives left");

            // Stop everything and return to main menu
            this.stop();

            document.getElementById('gameContainer').style.display = 'none';
            document.getElementById('menuContainer').style.display = 'flex';

            return;
        }

        /* =========================
        2. SYNC SCORE (SINGLE SOURCE)
        CarolingGame OWNS score
        ========================= */
        this.updateScoreDisplay();

        /* =========================
        3. HANDLE SUCCESS / FAILURE
        ========================= */
        if (result.success) {
            // Mark house as completed
            this.completedHouses.add(result.houseNumber);
            this.failedHouses.delete(result.houseNumber);

            // Clear failure count for this house
            if (this.houseFailures[result.houseNumber]) {
                delete this.houseFailures[result.houseNumber];
            }

            // Update house window colors
            if (this.environment) {
                this.environment.updateHouseWindows(
                    Array.from(this.completedHouses),
                    this.failedHouses
                );
            }

            // Unlock new houses if requirements met
            this.updateAllowedHouses();

            // Notify player if exit becomes available
            if (this.carolingGame.canExitVillage()) {
                this.showMessage(
                    "EXIT UNLOCKED!\nYou may leave at the end of the path",
                    "#FFD700"
                );
            }

        } else {
            // Mark house as failed
            this.failedHouses.add(result.houseNumber);
            this.completedHouses.delete(result.houseNumber);

            // Track failure count per house
            if (!this.houseFailures[result.houseNumber]) {
                this.houseFailures[result.houseNumber] = 0;
            }
            this.houseFailures[result.houseNumber]++;

            // Update house windows
            if (this.environment) {
                this.environment.updateHouseWindows(
                    Array.from(this.completedHouses),
                    this.failedHouses
                );
            }
            // NO RESPAWN - Player stays in same position
        }

        /* =========================
        4. UPDATE HUD
        ========================= */
        this.updateProgressDisplay();
        this.updateScoreDisplay();
        this.updateDifficultyDisplay();

        /* =========================
        5. CLEAN UP CAROLING GAME
        ========================= */
        if (this.carolingGame) {
            this.carolingGame.exitGame(false);
        }

        /* =========================
        6. RESUME 3D GAME
        ========================= */
        if (window.audioManager) {
            setTimeout(() => {
                window.audioManager.resumeBackgroundMusic();
            }, 500);
        }

        this.show3DGame();
        this.currentDoor = null;
    }
    
    // Update allowed houses
    updateAllowedHouses() {
        // Check each house unlock requirement
        for (let houseNumber = 2; houseNumber <= 6; houseNumber++) {
            if (!this.allowedHouses.has(houseNumber)) {
                const requirement = this.unlockRequirements[houseNumber];
                if (requirement && requirement()) {
                    this.allowedHouses.add(houseNumber);
                    this.showUnlockMessage(houseNumber);
                }
            }
        }
    }
    
    // Show unlock message
    showUnlockMessage(houseNumber) {
        const difficultyColor = this.houseDifficulty[houseNumber].color;
        this.showMessage(`House ${houseNumber} Unlocked!\n${this.houseDifficulty[houseNumber].name} Difficulty`, difficultyColor);
    }
    
    // Reset game state
    resetGameState() {
        this.completedHouses.clear();
        this.failedHouses.clear();
        this.houseFailures = {};
        this.victoryTriggered = false;
        this.exitPromptShown = false;
        this.isDead = false;
        this.allowedHouses = new Set([1]);
        
        // Reset house windows to normal
        if (this.environment) {
            this.environment.updateHouseWindows([], new Set());
        }

        if (this.carolingGame) {
            this.carolingGame.lives = this.carolingGame.maxLives;
            this.carolingGame.totalScore = 0;
            this.carolingGame.completedHouseNumbers = [];
        }
        
        // Reset HUD
        this.updateProgressDisplay();
        this.updateScoreDisplay();
    }
    
    // Check for victory exit
    checkVictoryExit() {
        // 🔧 FIX 2: Add score requirement and prevent spamming
        if (
            this.carolingGame.totalScore < 15500 || // 🔧 FIX 2: Minimum score requirement
            this.victoryTriggered ||
            this.exitPromptShown
        ) return;

        const distanceToExit = this.player.position.distanceTo(this.VICTORY_EXIT);
        if (distanceToExit < 3) {
            this.exitPromptShown = true; // 🔧 FIX 1: Prevent multiple prompts
            this.showExitConfirmation();
        }
    }
    
    // Show exit confirmation
    showExitConfirmation() {
        const confirmationScreen = document.createElement('div');
        confirmationScreen.id = 'exitConfirmationScreen';
        confirmationScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: 'Courier New', monospace;
            z-index: 10000;
            text-align: center;
        `;
        
        confirmationScreen.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 30px; color: #00FF00;">
                ESCAPE CONFIRMATION
            </div>
            
            <div style="background: rgba(0, 100, 0, 0.5); padding: 30px; border-radius: 15px; margin-bottom: 40px; border: 3px solid #00FF00;">
                <div style="font-size: 32px; margin-bottom: 20px; color: #FFFFFF;">
                    EXIT NOW?
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; color: #00FF00; margin-bottom: 10px;">
                            ${this.completedHouses.size}/6
                        </div>
                        <div style="font-size: 20px; color: #CCCCCC;">
                            Houses Completed
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="font-size: 48px; color: ${this.failedHouses.size > 0 ? '#FF5555' : '#00FF00'}; margin-bottom: 10px;">
                            ${this.failedHouses.size}
                        </div>
                        <div style="font-size: 20px; color: #CCCCCC;">
                            Houses Failed
                        </div>
                    </div>
                </div>
                
                <div style="font-size: 32px; margin-bottom: 20px; color: #FFFF00;">
                    Total Score: ${this.carolingGame.totalScore}
                </div>
            </div>
            
            <div style="display: flex; gap: 30px; margin-bottom: 30px;">
                <button id="continuePlayingBtn" style="
                    padding: 25px 50px;
                    background: linear-gradient(to bottom, #333333, #111111);
                    color: white;
                    font-size: 24px;
                    border-radius: 50px;
                    border: 3px solid #888888;
                    cursor: pointer;
                ">
                    CONTINUE PLAYING
                </button>
                
                <button id="exitNowBtn" style="
                    padding: 25px 50px;
                    background: linear-gradient(to bottom, #008800, #004400);
                    color: white;
                    font-size: 24px;
                    border-radius: 50px;
                    border: 3px solid #00FF00;
                    cursor: pointer;
                ">
                    EXIT NOW
                </button>
            </div>
        `;
        
        document.body.appendChild(confirmationScreen);
        
        // ESC handler function
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                confirmationScreen.remove();
                // Move player slightly away from exit
                this.player.position.z += 2;
                this.exitPromptShown = false; // 🔧 FIX 1: Reset flag
                document.removeEventListener('keydown', escHandler);
            }
        };
        
        // Add event listeners
        document.getElementById('continuePlayingBtn').addEventListener('click', () => {
            document.removeEventListener('keydown', escHandler); // 🔧 FIX 2: Remove ESC listener
            confirmationScreen.remove();
            // Move player slightly away from exit
            this.player.position.z += 2;
            this.exitPromptShown = false; // 🔧 FIX 1: Reset flag
        });
        
        document.getElementById('exitNowBtn').addEventListener('click', () => {
            document.removeEventListener('keydown', escHandler); // 🔧 FIX 2: Remove ESC listener
            this.triggerVictorySequence();
            confirmationScreen.remove();
        });
        
        // Add ESC listener
        document.addEventListener('keydown', escHandler);
    }
    
    // Victory sequence
    triggerVictorySequence() {
        if (this.victoryTriggered) return;
        
        this.victoryTriggered = true;
        
        // Disable player controls
        this.keys = {};
        this.isRunning = false;
        
        // Show victory screen
        const victoryScreen = document.createElement('div');
        victoryScreen.id = 'finalVictoryScreen';
        victoryScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #0a0a2a 0%, #1a1a4a 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: 'Courier New', monospace;
            z-index: 10000;
            text-align: center;
        `;
        
        victoryScreen.innerHTML = `
            <div style="font-size: 72px; margin-bottom: 30px; color: #FFD700;">
                VICTORY!
            </div>
            
            <div style="font-size: 36px; margin-bottom: 40px; color: #FFFFFF;">
                Carols in the Dark
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.7); padding: 40px; border-radius: 20px; margin-bottom: 40px; max-width: 800px;">
                <div style="font-size: 28px; margin-bottom: 30px; color: #FF9900;">
                    MISSION COMPLETE
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-bottom: 40px;">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; color: #00FF00; margin-bottom: 10px;">
                            ${this.completedHouses.size}/6
                        </div>
                        <div style="font-size: 20px; color: #AAAAAA;">
                            Houses Completed
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="font-size: 48px; color: ${this.failedHouses.size > 0 ? '#FF5555' : '#00FF00'}; margin-bottom: 10px;">
                            ${this.failedHouses.size}
                        </div>
                        <div style="font-size: 20px; color: #AAAAAA;">
                            Houses Failed
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="font-size: 48px; color: #FFFF00; margin-bottom: 10px;">
                            ${this.carolingGame.totalScore}
                        </div>
                        <div style="font-size: 20px; color: #AAAAAA;">
                            Total Score
                        </div>
                    </div>
                </div>
                
                ${this.completedHouses.size === 6 ? `
                    <div style="background: rgba(255, 215, 0, 0.2); padding: 15px; border-radius: 10px; margin-top: 20px; border: 2px solid #FFD700;">
                        <div style="font-size: 24px; color: #FFD700; margin-bottom: 10px;">
                            PERFECT CLEAR!
                        </div>
                        <div style="font-size: 18px; color: #FFFFAA;">
                            You completed ALL 6 houses!
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div style="display: flex; gap: 30px; margin-top: 30px;">
                <button id="playAgain" style="
                    padding: 25px 50px;
                    background: linear-gradient(to bottom, #008800, #004400);
                    color: white;
                    font-size: 24px;
                    border-radius: 50px;
                    border: 3px solid #00FF00;
                    cursor: pointer;
                ">
                    PLAY AGAIN
                </button>
                
                <button id="returnToMenu" style="
                    padding: 25px 50px;
                    background: linear-gradient(to bottom, #333333, #111111);
                    color: white;
                    font-size: 24px;
                    border-radius: 50px;
                    border: 3px solid #888888;
                    cursor: pointer;
                ">
                    RETURN TO MENU
                </button>
            </div>
        `;
        
        document.body.appendChild(victoryScreen);
        
        // Add event listeners
        document.getElementById('playAgain').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('returnToMenu').addEventListener('click', () => {
            this.returnToMenu();
        });
    }
    
    restartGame() {
        // Reset game state
        this.resetGameState();
        
        // Remove victory screen
        const victoryScreen = document.getElementById('finalVictoryScreen');
        if (victoryScreen) victoryScreen.remove();
        
        // Respawn at beginning
        this.player.position.copy(this.INITIAL_SPAWN);
        this.camera.position.copy(this.INITIAL_SPAWN);
        this.player.velocity.set(0, 0, 0);
        
        // Re-enable controls
        this.isRunning = true;
        this.animate();
    }
    
    returnToMenu() {
        // Remove victory screen
        const victoryScreen = document.getElementById('finalVictoryScreen');
        if (victoryScreen) victoryScreen.remove();
        
        // Stop game and return to menu
        this.stop();
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('menuContainer').style.display = 'flex';
    }

    onMouseMove(e) {
        if (document.pointerLockElement !== this.canvas) return;

        this.player.rotation.y -= e.movementX * this.mouseSensitivity;
        this.player.rotation.x -= e.movementY * this.mouseSensitivity;

        this.player.rotation.x = THREE.MathUtils.clamp(
            this.player.rotation.x,
            -Math.PI / 2,
            Math.PI / 2
        );

        this.camera.rotation.set(
            this.player.rotation.x,
            this.player.rotation.y,
            0
        );
    }

    onPointerLockChange() {
        if (document.pointerLockElement !== this.canvas) {
            // Only clear keys if we're actually losing pointer lock (not when opening settings)
            if (!this.isPaused) {
                this.keys = {};
            }
        } else {
            // Pointer lock acquired, ensure game is running
            if (!this.isPaused) {
                this.isRunning = true;
            }
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    checkDoorInteraction() {
        if (!this.environment || !this.environment.doorPositions) {
            this.hideDoorPrompt();
            return;
        }
        
        let foundDoor = null;
        const playerPos = this.camera.position;

        for (const door of this.environment.doorPositions) {
            const housePos = door.housePosition;
            const houseRotation = door.rotationY;
            const houseWidth = door.houseWidth;
            const houseDepth = door.houseDepth;
            
            // Convert player position to house-local coordinates
            const localPlayerPos = playerPos.clone().sub(housePos);
            localPlayerPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -houseRotation);
            
            // Define the trigger area: 
            // - Starts at path edge (not house edge)
            // - Extends forward toward house
            // - Width is wider than house for easier access from path
            
            const pathEdgeDistance = 6; // How far from path center to trigger (half path width is 6)
            const triggerDepth = 10;    // How deep the trigger area is (from path to house)
            const triggerWidth = houseWidth * 1.5; // Wider than house for easier access
            
            // Check if player is in the trigger area (from path edge to house)
            const halfWidth = triggerWidth / 2;
            const inTriggerZone = localPlayerPos.z > -pathEdgeDistance && 
                                localPlayerPos.z < (triggerDepth - pathEdgeDistance);
            const withinWidth = Math.abs(localPlayerPos.x) < halfWidth;
            
            // Also check if player is facing the house somewhat
            const toHouse = new THREE.Vector3()
                .subVectors(housePos, playerPos)
                .normalize();
            const facingDot = toHouse.dot(this.camera.getWorldDirection(new THREE.Vector3()));
            
            if (inTriggerZone && withinWidth && facingDot > -0.3) { // More lenient facing check
                foundDoor = door;
                break;
            }
        }

        if (foundDoor) {
            const houseNumber = foundDoor.houseNumber;
            const difficulty = this.houseDifficulty[houseNumber];
            
            if (this.completedHouses.has(houseNumber)) {
                this.showDoorPrompt(foundDoor, houseNumber, difficulty, "✅ Completed", "#00FF00");
            } else if (this.failedHouses.has(houseNumber)) {
                const failedCount = this.houseFailures[houseNumber] || 0;
                this.showDoorPrompt(foundDoor, houseNumber, difficulty, `❌ Failed (${failedCount}x)`, "#FF0000");
            } else if (!this.allowedHouses.has(houseNumber)) {
                this.showDoorPrompt(foundDoor, houseNumber, difficulty, "🔒 Locked", "#FFFF00");
            } else {
                this.showDoorPrompt(foundDoor, houseNumber, difficulty, "Press ENTER", difficulty.color);
            }
        } else {
            this.hideDoorPrompt();
        }
        
        this.updateDifficultyDisplay();
    }

    showDoorPrompt(door, houseNumber, difficulty, status, statusColor) {
        if (this.nearDoor === door) return;

        this.nearDoor = door;
        this.doorPrompt.classList.remove("hidden");

        this.doorPrompt.innerHTML = `
            <div class="prompt-box" style="
                background: rgba(0, 0, 0, 0.9);
                border: 3px solid ${difficulty.color};
                border-radius: 15px;
                padding: 20px 25px;
                box-shadow: 0 0 20px ${difficulty.color + '80'};
                min-width: 250px;
                text-align: center;
                backdrop-filter: blur(5px);
            ">
                <div style="
                    font-size: 28px;
                    margin-bottom: 8px;
                    color: ${difficulty.color};
                    font-weight: bold;
                    text-shadow: 0 0 10px ${difficulty.color + '80'};
                ">
                    HOUSE ${houseNumber}
                </div>
                <div style="
                    font-size: 18px;
                    color: ${difficulty.color};
                    margin-bottom: 10px;
                    font-weight: bold;
                ">
                    ${difficulty.name} Difficulty
                </div>
                <div style="
                    font-size: 16px;
                    color: ${statusColor};
                    margin-bottom: 20px;
                    padding: 8px 12px;
                    background: rgba(0, 0, 0, 0.6);
                    border-radius: 8px;
                    border: 1px solid ${statusColor};
                ">
                    ${status}
                </div>
                ${!this.completedHouses.has(houseNumber) && this.allowedHouses.has(houseNumber) ? `
                    <div id="enterButton" class="enter-button" style="
                        padding: 15px 40px;
                        background: linear-gradient(135deg, ${difficulty.color}, ${this.adjustColor(difficulty.color, -30)});
                        color: white;
                        font-size: 24px;
                        font-weight: bold;
                        border-radius: 50px;
                        border: 3px solid ${difficulty.color};
                        cursor: pointer;
                        margin: 0 auto 10px auto;
                        display: inline-block;
                        box-shadow: 0 0 15px ${difficulty.color + '80'}, 
                                    0 5px 15px rgba(0, 0, 0, 0.5);
                        transition: all 0.2s ease;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        min-width: 180px;
                    ">
                        ENTER
                    </div>
                    <div style="
                        font-size: 14px;
                        color: #AAA;
                        margin-top: 8px;
                        font-style: italic;
                    ">
                        Press ENTER key
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add hover effect for the button
        const newButton = this.doorPrompt.querySelector('#enterButton');
        if (newButton) {
            newButton.addEventListener('click', () => this.handleEnterPress());
            
            // Add hover effects
            newButton.addEventListener('mouseenter', () => {
                newButton.style.transform = 'scale(1.05)';
                newButton.style.boxShadow = `0 0 25px ${difficulty.color}, 0 8px 20px rgba(0, 0, 0, 0.6)`;
            });
            
            newButton.addEventListener('mouseleave', () => {
                newButton.style.transform = 'scale(1)';
                newButton.style.boxShadow = `0 0 15px ${difficulty.color + '80'}, 0 5px 15px rgba(0, 0, 0, 0.5)`;
            });
            
            this.enterButton = newButton;
        }
    }

    // Helper function to adjust color brightness
    adjustColor(color, amount) {
        // Convert hex to RGB
        let usePound = false;
        if (color[0] === "#") {
            color = color.slice(1);
            usePound = true;
        }
        
        const num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        let g = ((num >> 8) & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;
        
        // Clamp values
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
        
        // Convert back to hex
        return (usePound ? "#" : "") + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
    }

    hideDoorPrompt() {
        if (this.nearDoor === null) return;
        
        this.nearDoor = null;
        this.doorPrompt.classList.add("hidden");
        if (this.enterButton) {
            this.enterButton.classList.remove("active");
        }
        
        if (this.enterResetTimeout) {
            clearTimeout(this.enterResetTimeout);
            this.enterResetTimeout = null;
        }
        
        this.enterPressed = false;
    }

    checkHouseCollisionSimple(newPos) {
        if (!this.collisionEnabled || !this.environment || !this.environment.houseColliders) {
            return newPos.clone();
        }
        
        const resultPos = newPos.clone();
        const playerRadius = this.playerRadius;
        const playerMargin = playerRadius * 1.2;
        
        for (const collider of this.environment.houseColliders) {
            if (newPos.distanceTo(collider.position) > Math.max(collider.width, collider.depth) + 5) {
                continue;
            }
            
            const localPos = new THREE.Vector3(
                resultPos.x - collider.position.x,
                0,
                resultPos.z - collider.position.z
            );
            
            localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -collider.rotationY);
            
            const halfWidth = collider.width / 2 + playerMargin;
            const halfDepth = collider.depth / 2 + playerMargin;
            
            const dx = Math.abs(localPos.x) - halfWidth;
            const dz = Math.abs(localPos.z) - halfDepth;
            
            if (dx < 0 && dz < 0) {
                const isCurrentHouse = this.nearDoor && this.nearDoor.house === collider.house;
                
                if (isCurrentHouse && this.nearDoor) {
                    const doorHalfWidth = collider.doorWidth / 2 + playerRadius;
                    
                    if (localPos.z > 0 && Math.abs(localPos.x) < doorHalfWidth) {
                        const doorGap = halfDepth * 0.7;
                        if (localPos.z > doorGap) {
                            localPos.z = doorGap;
                        }
                    } else {
                        if (Math.abs(dx) < Math.abs(dz)) {
                            localPos.x = localPos.x > 0 ? halfWidth : -halfWidth;
                        } else {
                            localPos.z = localPos.z > 0 ? halfDepth : -halfDepth;
                        }
                    }
                } else {
                    if (Math.abs(dx) < Math.abs(dz)) {
                        localPos.x = localPos.x > 0 ? halfWidth : -halfWidth;
                    } else {
                        localPos.z = localPos.z > 0 ? halfDepth : -halfDepth;
                    }
                }
                
                localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), collider.rotationY);
                resultPos.x = localPos.x + collider.position.x;
                resultPos.z = localPos.z + collider.position.z;
            }
        }
        
        return resultPos;
    }

    updateMovement(dt) {
        this.moveDir.set(0, 0, 0);

        if (this.keys.w) this.moveDir.z += 1;
        if (this.keys.s) this.moveDir.z -= 1;
        if (this.keys.a) this.moveDir.x -= 1;
        if (this.keys.d) this.moveDir.x += 1;

        const isMoving = this.moveDir.lengthSq() > 0;
        const currentTime = Date.now();
        
        if (isMoving) {
            this.lastMoveTime = currentTime;
            if (!this.uiHidden) {
                this.hideGameUI();
                this.uiHidden = true;
            }
        } else if (currentTime - this.lastMoveTime > 1000 && this.uiHidden) {
            this.showGameUI();
            this.uiHidden = false;
        }

        if (this.moveDir.lengthSq() > 0) this.moveDir.normalize();

        this.camera.getWorldDirection(this.forward);
        this.forward.y = 0;
        this.forward.normalize();

        this.right.crossVectors(this.forward, this.camera.up).normalize();

        const speed = this.keys.shift ? this.player.runSpeed : this.player.speed;

        const targetX = this.forward.x * this.moveDir.z + this.right.x * this.moveDir.x;
        const targetZ = this.forward.z * this.moveDir.z + this.right.z * this.moveDir.x;

        this.player.velocity.x += (targetX * speed - this.player.velocity.x) * 20 * dt;
        this.player.velocity.z += (targetZ * speed - this.player.velocity.z) * 20 * dt;

        this.player.velocity.y -= this.player.gravity * dt;

        const newPos = this.player.position.clone();
        newPos.addScaledVector(this.player.velocity, dt);

        const safePos = this.checkHouseCollisionSimple(newPos);
        
        const dx = safePos.x - newPos.x;
        const dz = safePos.z - newPos.z;
        
        if (dx !== 0 || dz !== 0) {
            this.player.velocity.x *= 0.7;
            this.player.velocity.z *= 0.7;
        }
        
        this.player.position.copy(safePos);

        if (this.player.position.y < this.EYE_HEIGHT) {
            this.player.position.y = this.EYE_HEIGHT;
            this.player.velocity.y = 0;
            this.player.isGrounded = true;
        }

        this.camera.position.copy(this.player.position);
        
        // Check for victory exit
        this.checkVictoryExit();
    }

    update(dt) {
        if (!this.isRunning || this.isPaused) return;
        
        this.updateMovement(dt);
        if (this.environment) this.environment.update(dt);
        
        this.checkDoorInteraction();
        
        // Update HUD elements
        this.updateProgressDisplay();
        this.updateScoreDisplay();
        this.updateDifficultyDisplay();
    }

    // Update progress display
    updateProgressDisplay() {
        if (!this.progressBar) return;
        
        const completed = this.completedHouses.size;
        const total = 6;
        const percentage = (completed / total) * 100;
        
        const progressFill = this.progressBar.querySelector('#progressFill');
        const progressText = this.progressBar.querySelector('#progressText');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressText) {
            progressText.textContent = `${completed}/${total} Houses`;
        }
    }
    
    // Update score display
    updateScoreDisplay() {
        if (!this.scoreDisplay) return;
        
        const scoreValue = this.scoreDisplay.querySelector('#scoreValue');
        if (scoreValue) {
            scoreValue.textContent = this.carolingGame.totalScore.toLocaleString();
        }
    }
    
    // Update difficulty display (shows current house info)
    updateDifficultyDisplay() {
        if (!this.difficultyDisplay) return;
        
        let html = `<div style="font-size: 16px; margin-bottom: 10px; color: #FFFFFF;">CURRENT HOUSE</div>`;
        
        if (this.nearDoor) {
            const houseNumber = this.nearDoor.houseNumber;
            const difficulty = this.houseDifficulty[houseNumber];
            const isCompleted = this.completedHouses.has(houseNumber);
            const isFailed = this.failedHouses.has(houseNumber);
            const isLocked = !this.allowedHouses.has(houseNumber);
            
            let statusText = "Available";
            let statusColor = "#FFFF00";
            
            if (isCompleted) {
                statusText = "Completed";
                statusColor = "#00FF00";
            } else if (isFailed) {
                statusText = "Failed";
                statusColor = "#FF0000";
            } else if (isLocked) {
                statusText = "Locked";
                statusColor = "#FF0000";
            }
            
            html += `
                <div style="text-align: center;">
                    <div style="font-size: 24px; color: ${difficulty.color}; margin-bottom: 10px;">
                        House ${houseNumber}
                    </div>
                    <div style="font-size: 18px; color: ${difficulty.color}; margin-bottom: 10px;">
                        ${difficulty.name} Difficulty
                    </div>
                    <div style="font-size: 16px; color: ${statusColor}; margin-bottom: 10px;">
                        ${statusText}
                    </div>
                    ${!isCompleted && !isFailed && !isLocked ? `
                        <div style="font-size: 14px; color: #AAAAAA; margin-top: 10px;">
                            Press ENTER to enter
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            html += `
                <div style="text-align: center; color: #888888; font-size: 14px; padding: 20px;">
                    Approach a house door<br>to see info
                </div>
            `;
        }
        
        this.difficultyDisplay.innerHTML = html;
    }

    animate() {
        if (!this.isRunning || this.isPaused) return;

        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.1);

        this.update(dt);
        this.renderer.render(this.scene, this.camera);
    }

    stop() {
        this.isRunning = false;
        this.isPaused = true;
        document.exitPointerLock();

        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        document.removeEventListener('keydown', this.handleEnterKey);
        window.removeEventListener('resize', this.onResize);

        if (this.enterResetTimeout) {
            clearTimeout(this.enterResetTimeout);
            this.enterResetTimeout = null;
        }

        if (this.enterButton) {
            const newButton = this.enterButton.cloneNode(true);
            this.enterButton.parentNode.replaceChild(newButton, this.enterButton);
        }

        if (this.carolingGame) {
            this.carolingGame.exitGame(false);
        }

        // Remove HUD
        if (this.hud && this.hud.parentNode) {
            this.hud.remove();
        }

        if (this.renderer) {
            this.renderer.dispose();
        }
    }
    
    setupRenderer() {
        this.canvas = document.getElementById('gameCanvas');
        
        // Check for WebGL2 support
        const context = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        
        // Create renderer with performance settings
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: false, // Disable for performance
            powerPreference: 'high-performance',
            precision: 'mediump' // Use medium precision
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Set pixel ratio for performance
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }
}