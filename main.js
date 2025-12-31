document.addEventListener('DOMContentLoaded', () => {
    // Game instance
    let game = null;
    
    // UI Elements
    const startButton = document.getElementById('startButton');
    const menuContainer = document.getElementById('menuContainer');
    const gameContainer = document.getElementById('gameContainer');
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingProgress = document.getElementById('loadingProgress');
    
    // Audio Manager initialization
    let audioManager = null;
    
    // Initialize audio on first user interaction
    const initAudio = () => {
        if (!window.audioManager) {
            console.warn('AudioManager not found');
            return;
        }
        
        audioManager = window.audioManager;
        
        // Add click event to initialize audio
        const initAudioOnInteraction = () => {
            audioManager.init().then(() => {
                console.log('Audio initialized');
            }).catch(error => {
                console.error('Audio initialization failed:', error);
            });
            
            // Remove the event listener after first interaction
            document.removeEventListener('click', initAudioOnInteraction);
            document.removeEventListener('keydown', initAudioOnInteraction);
        };
        
        // Listen for user interaction
        document.addEventListener('click', initAudioOnInteraction);
        document.addEventListener('keydown', initAudioOnInteraction);
    };
    
    // Initialize audio when page loads
    initAudio();
    
    // Add audio to button clicks
    const addAudioToButtons = (element) => {
        const buttons = element.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                if (audioManager) audioManager.playClickSound();
            });
        });
    };
    
    // Create story introduction screen
    function createStoryScreen() {
        const storyScreen = document.createElement('div');
        storyScreen.id = 'storyScreen';
        storyScreen.style.cssText = `
            position: fixed;
            inset: 0;
            background: radial-gradient(circle at center, #0b0b1e, #000);
            display: none;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: 'Courier New', monospace;
            z-index: 10001;
        `;

        storyScreen.innerHTML = `
            <div style="
                max-width: 700px;
                background: rgba(0,0,0,0.85);
                padding: 32px;
                border-radius: 16px;
                border: 3px solid #8B0000;
                text-align: center;
            ">
                <h1 style="font-size: 40px; margin-bottom: 10px; color:#FF9900;">
                    🎄 CAROLS IN THE DARK 🎄
                </h1>

                <p style="font-size:18px; color:#CCCCCC; margin-bottom: 24px;">
                    Carol through an Aswang village.<br>
                    Each house challenges you with a piano game.
                </p>

                <div style="text-align:left; font-size:16px; line-height:1.6; margin-bottom:24px;">
                    <div>❤️ <b>Lives:</b> You have <b>3</b>. Fail = lose one.</div>
                    <div>💀 <b>Game Over:</b> When lives reach 0.</div>
                    <div>🎵 <b>Controls:</b> A S K L to hit notes.</div>
                    <div>🏆 <b>Exit:</b> Reach <b>15,500 score</b> to unlock.</div>
                    <div>⚠️ <b>Risk:</b> You may continue for higher score.</div>
                </div>

                <div style="margin-bottom: 20px; color:#AAAAAA;">
                    Press <b>ENTER</b> at doors to start caroling
                </div>

                <div style="display:flex; justify-content:center; gap:20px;">
                    <button id="startGameBtn" style="
                        padding:14px 36px;
                        font-size:18px;
                        font-weight:bold;
                        border-radius:30px;
                        border:3px solid #00FF00;
                        background: linear-gradient(#008800,#004400);
                        color:white;
                        cursor:pointer;
                    ">
                        START
                    </button>

                    <button id="skipStoryBtn" style="
                        padding:14px 36px;
                        font-size:18px;
                        border-radius:30px;
                        border:3px solid #777;
                        background:#222;
                        color:white;
                        cursor:pointer;
                    ">
                        SKIP
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(storyScreen);

        document.getElementById('startGameBtn').onclick =
        document.getElementById('skipStoryBtn').onclick = () => {
            storyScreen.style.display = 'none';
            startGameLoading();
        };

        addAudioToButtons(storyScreen);
        return storyScreen;
    }
    
    // Initialize story screen
    const storyScreen = createStoryScreen();
    let carolingGame = null;
    
    // Start game loading
    function startGameLoading() {
        // 🔁 NEW RUN — RESET CAROLING STATE
        if (!carolingGame) {
            carolingGame = new CarolingGame();
        }

        carolingGame.lives = carolingGame.maxLives;
        carolingGame.totalScore = 0;
        carolingGame.completedHouseNumbers = [];

        console.log("NEW RUN STARTED — lives reset to", carolingGame.lives);

        // Show loading screen
        menuContainer.style.display = 'none';
        loadingScreen.style.display = 'flex';

        // Start loading
        simulateLoading();

        game = new Game3D(carolingGame); // pass it if needed
        game.init().then(() => {
            environmentReady = true;
            tryStartGame();
        });
    }
    
    let loadingTimeDone = false;
    let environmentReady = false;

    function tryStartGame() {
        if (loadingTimeDone && environmentReady) {
            loadingProgress.style.width = '100%';
            loadingScreen.style.display = 'none';
            gameContainer.style.display = 'block';
        }
    }

    // Simulate loading progress
    function simulateLoading() {
        const TOTAL_TIME = 20000;
        const START = performance.now();

        function update(now) {
            const elapsed = now - START;
            const progress = Math.min((elapsed / TOTAL_TIME) * 100, 100);
            loadingProgress.style.width = `${progress}%`;

            if (elapsed < TOTAL_TIME) {
                requestAnimationFrame(update);
            } else {
                loadingTimeDone = true;
                tryStartGame();
            }
        }

        requestAnimationFrame(update);
    }
    
    // Start game with story first
    startButton.addEventListener('click', () => {
        // Initialize audio on first click
        if (audioManager) {
            audioManager.playClickSound();
            
            // Ensure audio is initialized
            audioManager.init().then(() => {
                console.log('Audio initialized from start button');
            }).catch(error => {
                console.error('Audio initialization failed:', error);
            });
        }
        
        menuContainer.style.display = 'none';
        storyScreen.style.display = 'flex';
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (game) {
            game.onResize();
        }
    });
    
    // Handle ESC key globally for audio context
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // If audio context exists and is suspended, try to resume it
            if (audioManager && audioManager.audioContext && 
                audioManager.audioContext.state === 'suspended') {
                audioManager.audioContext.resume().then(() => {
                    console.log('AudioContext resumed via ESC key');
                });
            }
        }
    });
    
    // Handle page visibility changes to resume audio
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && audioManager && audioManager.audioContext) {
            // Page became visible, try to resume audio context
            if (audioManager.audioContext.state === 'suspended') {
                audioManager.audioContext.resume().then(() => {
                    console.log('AudioContext resumed after page visibility change');
                });
            }
        }
    });
});