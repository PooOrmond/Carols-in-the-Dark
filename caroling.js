class CarolingGame {
    constructor() {
        this.game = null;
        this.currentHouse = 1;
        this.totalHouses = 6;
        this.currentDifficulty = 'easy';
        this.initialSatisfaction = 50;
        this.currentSatisfaction = 50;
        this.completedHouses = 0;
        
        this.completedHouseNumbers = [];
        this.totalScore = 0;
        this.totalCompletedHouses = 0;
        
        this.scoring = {
            perfect: 100,
            good: 50,
            bad: 0
        };
        this.satisfactionRate = {
            perfect: 10,
            good: 7,
            bad: -10
        };
        
        this.audioContext = null;
        this.audioBuffers = {};
        this.currentAudio = null;
        this.currentAudioGain = null;
        this.isPlaying = false;
        
        // Simple timer-based position tracking
        this.audioStartTimestamp = 0;
        this.audioPausedTimestamp = 0;
        this.audioElapsedTime = 0;
        this.isAudioPaused = false;
        this.audioBuffer = null;
        
        this.completionCalled = false;
        this.enterKeyListener = null;
        
        this.houseSongs = {
            1: [{
                name: 'Silent Night',
                mp3: 'assets/music/easy/Silent Night.mp3',
                json: 'assets/music/easy/silent_night.json'
            }],
            2: [{
                name: 'Carol of the Bells',
                mp3: 'assets/music/easy/carol of the bells.mp3',
                json: 'assets/music/easy/carol_of_the_bells.json'
            }],
            3: [{
                name: 'Caroling Divas',
                mp3: 'assets/music/moderate/Caroling Divas.mp3',
                json: 'assets/music/moderate/caroling_divas.json'
            }],
            4: [{
                name: 'Jingle Bells Twist',
                mp3: 'assets/music/moderate/jingle bells (twist).mp3',
                json: 'assets/music/moderate/jingle_bells_(twist).json'
            }],
            5: [{
                name: 'Rockin Around',
                mp3: 'assets/music/hard/Rockin Around The Christmas Tree.mp3',
                json: 'assets/music/hard/rockin_around_the_christmas_tree.json'
            }],
            6: [{
                name: 'Arizona B',
                mp3: 'assets/music/hard/Arizona B (Christmas Version).mp3',
                json: 'assets/music/hard/arizona_b_(christmas_version).json'
            }]
        };
        
        this.houseSongHistory = {};
        this.currentSongData = null;

        this.maxLives = 3;
        this.lives = this.maxLives;
    }

    canExitVillage() {
        return this.totalScore >= 15500;
    }
    
    init(houseNumber = 1, callback) {
        this.currentHouse = houseNumber;
        this.completionCallback = callback;
        this.completionCalled = false;
        
        if (houseNumber === 1) {
            this.currentDifficulty = 'easy';
        } else if (houseNumber === 2) {
            this.currentDifficulty = 'moderate';
        } else if (houseNumber === 3) {
            this.currentDifficulty = 'hard';
        } else if (houseNumber === 4) {
            this.currentDifficulty = 'very hard';
        } else if (houseNumber === 5) {
            this.currentDifficulty = 'extreme';
        } else {
            this.currentDifficulty = 'master';
        }
        
        let satisfactionRange = 50;
        if (houseNumber >= 4) satisfactionRange = 40;
        if (houseNumber >= 6) satisfactionRange = 35;
        this.initialSatisfaction = Math.floor(Math.random() * 11) + satisfactionRange;
        this.currentSatisfaction = this.initialSatisfaction;
        
        console.log(`🎵 Starting Piano Tiles for House ${houseNumber}`);
        console.log(`Difficulty: ${this.currentDifficulty}, Initial Satisfaction: ${this.initialSatisfaction}%`);
        
        this.createFullscreenContainer();
        this.showStartScreen();
    }
    
    createFullscreenContainer() {
        const existing = document.getElementById('carolingContainer');
        if (existing) existing.remove();
        
        this.container = document.createElement('div');
        this.container.id = 'carolingContainer';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000;
            z-index: 10000;
            display: none;
            overflow: hidden;
        `;
        
        const gameDiv = document.createElement('div');
        gameDiv.id = 'carolingGame';
        gameDiv.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
        `;
        this.container.appendChild(gameDiv);
        document.body.appendChild(this.container);
        
        const header = document.createElement('div');
        header.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 20px;
            background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
            z-index: 100;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            font-family: 'Courier New', monospace;
        `;
        
        const houseCounterHTML = `
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; max-width: 60%;">
                <div style="font-size: 14px; color: #AAAAAA; margin-right: 10px; white-space: nowrap;">HOUSES:</div>
                ${[1, 2, 3, 4, 5, 6].map(num => {
                    const isCompleted = this.completedHouseNumbers.includes(num);
                    const isCurrent = this.currentHouse === num;
                    let color = '#666666';
                    let textColor = '#999999';
                    
                    if (isCompleted) {
                        color = '#00AA00';
                        textColor = '#FFFFFF';
                    } else if (isCurrent) {
                        color = '#AA0000';
                        textColor = '#FFFFFF';
                    }
                    
                    return `
                        <div style="width: 36px;height: 36px;background: ${color};border-radius: 50%;display: flex;align-items: center;justify-content: center;font-size: 18px;font-weight: bold;color: ${textColor};border: 2px solid ${isCurrent ? '#FF0000' : color};box-shadow: ${isCurrent ? '0 0 10px #FF0000' : 'none'};transition: all 0.3s ease;flex-shrink: 0;">${num}</div>
                    `;
                }).join('')}
            </div>
        `;
        
        header.innerHTML = `
            ${houseCounterHTML}
            <div style="text-align: right;">
                <div style="font-size: 16px; margin-bottom: 5px; color: #FF4444;">
                    Lives: ${this.lives} ❤️
                </div>
                <div style="font-size: 16px; margin-bottom: 5px; color: #FFFF00;">
                    Total Score: ${this.totalScore}
                </div>
                <div style="font-size: 12px; opacity: 0.8;">ESC to exit</div>
            </div>
        `;
        this.container.appendChild(header);
    }
    
    showStartScreen() {
        this.container.style.display = 'block';
        
        this.currentSongData = this.getSongForHouse(this.currentHouse);
        
        const startScreen = document.createElement('div');
        startScreen.id = 'carolingStartScreen';
        startScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: 'Courier New', monospace;
            z-index: 1000;
            text-align: center;
        `;
        
        startScreen.innerHTML = `
            <div style="font-size: 42px; margin-bottom: 20px; color: #FF9900; text-shadow: 0 0 10px #FF0000;">HOUSE ${this.currentHouse}</div>
            <div style="font-size: 28px; margin-bottom: 10px; color: #FFFFFF;">Caroling Challenge</div>
            <div style="font-size: 20px; margin-bottom: 10px; color: #AAAAAA">Difficulty: ${this.currentDifficulty.toUpperCase()}</div>
            <div style="font-size: 20px; margin-bottom: 10px; color: #FF9900;">Song: "${this.currentSongData.name}"</div>
            <div style="font-size: 18px; margin-bottom: 30px; max-width: 600px; line-height: 1.6;">
                Initial Satisfaction: <span style="color: #00FF00">${this.initialSatisfaction}%</span><br>
                Perfect hits: +10% satisfaction<br>
                Good hits: +5% satisfaction<br>
                Misses: -5% satisfaction
            </div>
            <div id="enterPrompt" style="padding: 20px 50px;background: linear-gradient(to bottom, #8b0000, #4a0000);color: white;font-size: 24px;font-weight: bold;border-radius: 50px;border: 3px solid #FF0000;text-transform: uppercase;letter-spacing: 2px;box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);animation: enterPulse 1.5s infinite;margin-bottom: 20px;">PRESS ENTER TO START</div>
            <div style="margin-top: 10px; font-size: 16px; color: #888;">Or click anywhere to start</div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes enterPulse {
                0% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 0, 0, 0.5); }
                50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(255, 0, 0, 0.8); }
                100% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 0, 0, 0.5); }
            }
        `;
        document.head.appendChild(style);
        this.container.appendChild(startScreen);
        
        this.enterKeyListener = (e) => {
            if (e.key === 'Enter' || e.code === 'Enter') {
                e.preventDefault();
                this.startGame();
            }
        };
        document.addEventListener('keydown', this.enterKeyListener);
        
        startScreen.addEventListener('click', () => {
            this.startGame();
        });
    }
    
    getSongForHouse(houseNumber) {
        const availableSongs = this.houseSongs[houseNumber];
        if (!availableSongs || availableSongs.length === 0) {
            console.error(`No songs defined for house ${houseNumber}`);
            throw new Error(`No songs available for house ${houseNumber}`);
        }
        
        let songIndex = 0;
        if (this.houseSongHistory[houseNumber] !== undefined) {
            const lastSongIndex = this.houseSongHistory[houseNumber];
            songIndex = (lastSongIndex + 1) % availableSongs.length;
        } else {
            songIndex = Math.floor(Math.random() * availableSongs.length);
        }
        
        const selectedSong = availableSongs[songIndex];
        this.houseSongHistory[houseNumber] = songIndex;
        
        console.log(`Selected song for house ${houseNumber}: ${selectedSong.name}`);
        return selectedSong;
    }
    
    async startGame() {
        if (this.enterKeyListener) {
            document.removeEventListener('keydown', this.enterKeyListener);
            this.enterKeyListener = null;
        }
        
        const startScreen = document.getElementById('carolingStartScreen');
        if (startScreen) {
            startScreen.remove();
        }
        
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'carolingLoadingScreen';
        loadingScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: 'Courier New', monospace;
            z-index: 1000;
        `;
        loadingScreen.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 20px; color: #FF9900;">Loading Caroling Game...</div>
            <div id="loadingProgress" style="width: 300px; height: 20px; background: #333; border-radius: 10px; overflow: hidden;">
                <div style="width: 0%; height: 100%; background: linear-gradient(to right, #8b0000, #ff0000); transition: width 0.3s;"></div>
            </div>
            <div id="loadingText" style="margin-top: 10px; font-size: 16px;">Preparing game...</div>
        `;
        this.container.appendChild(loadingScreen);
        
        try {
            const updateProgress = (text, percent) => {
                const progressBar = loadingScreen.querySelector('#loadingProgress div');
                const progressText = loadingScreen.querySelector('#loadingText');
                if (progressBar) progressBar.style.width = percent + '%';
                if (progressText) progressText.textContent = text;
            };
            
            updateProgress('Initializing audio...', 10);
            
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            updateProgress('Loading song data...', 30);
            
            const selectedSong = this.currentSongData;
            updateProgress(`Loading: ${selectedSong.name}...`, 50);
            
            console.log(`Loading audio from: ${selectedSong.mp3}`);
            const audioBuffer = await this.loadAudioFile(selectedSong.mp3);
            this.audioBuffers[selectedSong.name] = audioBuffer;
            
            updateProgress('Loading beat map...', 70);
            
            console.log(`Loading beat map from: ${selectedSong.json}`);
            const beatMap = await this.loadJSONFile(selectedSong.json);
            
            updateProgress('Starting game engine...', 90);
            
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.remove();
                }
                this.startPhaserGame(selectedSong, beatMap);
            }, 500);
            
        } catch (error) {
            console.error('Error starting game:', error);
            if (loadingScreen.parentNode) {
                loadingScreen.innerHTML = `
                    <div style="font-size: 24px; margin-bottom: 20px; color: #FF0000;">Error Loading Game</div>
                    <div style="margin-bottom: 20px; max-width: 600px;">
                        Could not load required game files.<br>
                        Make sure all music files are in the assets folder.
                    </div>
                    <div style="margin-bottom: 20px; color: #FF9900;">
                        Required files:<br>
                        • MP3 audio file<br>
                        • JSON beat map file
                    </div>
                    <div style="display: flex; gap: 20px;">
                        <button onclick="this.parentElement.parentElement.remove(); document.getElementById('carolingContainer').style.display='none';" style="padding: 10px 20px; background: #333; color: white; border: none; border-radius: 5px; cursor: pointer;">Exit</button>
                    </div>
                `;
            }
        }
    }
    
    async loadAudioFile(url) {
        try {
            console.log('Loading audio from:', url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Could not load audio file`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error('Error loading audio:', error);
            throw new Error(`Failed to load audio: ${error.message}`);
        }
    }
    
    async loadJSONFile(url) {
        try {
            console.log('Loading JSON from:', url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Could not load beat map`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading JSON:', error);
            throw new Error(`Failed to load beat map: ${error.message}`);
        }
    }
    
    startPhaserGame(songData, beatMap) {
        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: 'carolingGame',
            backgroundColor: '#000000',
            scene: new CarolingScene(songData, beatMap, this),
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            audio: {
                disableWebAudio: false
            },
            render: {
                pixelArt: false,
                antialias: true
            }
        };
        
        this.game = new Phaser.Game(config);
        
        this.escListener = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                
                // Pause carol audio when ESC is pressed
                this.pauseCarolAudio();
                
                console.log("ESC pressed in caroling game - paused audio");
            }
        };
        document.addEventListener('keydown', this.escListener);
    }
    
    // SIMPLE: Play audio with timer tracking
    playAudio(buffer, startTime = 0) {
        if (!this.audioContext) {
            console.error('AudioContext not initialized');
            return null;
        }
        
        this.audioBuffer = buffer;
        
        // Stop any existing audio
        if (this.currentAudio) {
            try {
                this.currentAudio.stop();
            } catch (e) {
                // Audio might already be stopped
            }
        }
        
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            const gainNode = this.audioContext.createGain();
            const carolVolume = window.audioManager ? window.audioManager.carolVolume : 0.7;
            gainNode.gain.value = carolVolume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Start from the specified time
            const startOffset = Math.max(0, startTime);
            source.start(0, startOffset);
            
            this.currentAudio = source;
            this.currentAudioGain = gainNode;
            this.isPlaying = true;
            this.isAudioPaused = false;
            
            // Set up timer tracking
            this.audioStartTimestamp = Date.now() - (startOffset * 1000);
            this.audioElapsedTime = startOffset;
            
            console.log("Carol audio started at", startOffset.toFixed(2), "seconds");
            
            source.onended = () => {
                this.isPlaying = false;
                this.resetAudioState();
                console.log("Carol audio finished playing");
            };
            
            return source;
            
        } catch (error) {
            console.error('Error playing audio:', error);
            return null;
        }
    }
    
    // SIMPLE: Pause with timer
    pauseCarolAudio() {
        if (this.currentAudio && this.currentAudioGain && this.isPlaying) {
            try {
                // Calculate elapsed time
                const now = Date.now();
                this.audioElapsedTime = (now - this.audioStartTimestamp) / 1000;
                
                console.log("Pausing carol audio at", this.audioElapsedTime.toFixed(2), "seconds");
                
                // Fade out before stopping
                this.currentAudioGain.gain.setValueAtTime(
                    this.currentAudioGain.gain.value, 
                    this.audioContext.currentTime
                );
                this.currentAudioGain.gain.exponentialRampToValueAtTime(
                    0.001, 
                    this.audioContext.currentTime + 0.3
                );
                
                setTimeout(() => {
                    if (this.currentAudio) {
                        this.currentAudio.stop();
                        this.currentAudio = null;
                        this.currentAudioGain = null;
                        this.isPlaying = false;
                        this.isAudioPaused = true;
                        console.log("Carol audio stopped, ready for resume at", 
                                  this.audioElapsedTime.toFixed(2), "seconds");
                    }
                }, 300);
            } catch (e) {
                console.warn("Error pausing carol audio:", e);
                this.isAudioPaused = true;
                this.resetAudioState();
            }
        } else {
            this.isAudioPaused = true;
            console.log("Audio already paused or not playing");
        }
    }
    
    // SIMPLE: Resume with timer
    resumeCarolAudio() {
        if (!this.audioContext) {
            console.error("AudioContext not initialized");
            return false;
        }
        
        // Resume audio context
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        if (this.isAudioPaused && this.audioBuffer) {
            console.log("Resuming carol audio from", this.audioElapsedTime.toFixed(2), "seconds");
            
            // Restart audio from saved position
            const resumed = this.playAudio(this.audioBuffer, this.audioElapsedTime);
            if (resumed) {
                this.isAudioPaused = false;
                console.log("Carol audio successfully resumed");
                return true;
            }
        } else if (this.isAudioPaused) {
            // Try to get buffer from cache
            const songName = this.currentSongData ? this.currentSongData.name : null;
            if (songName && this.audioBuffers[songName]) {
                console.log("Restoring carol audio from buffer cache");
                const resumed = this.playAudio(this.audioBuffers[songName], this.audioElapsedTime || 0);
                if (resumed) {
                    this.isAudioPaused = false;
                    return true;
                }
            }
        }
        
        console.log("Could not resume carol audio");
        return false;
    }
    
    // Stop audio completely
    stopCarolAudio() {
        if (this.currentAudio && this.currentAudioGain) {
            try {
                // Fade out before stopping
                this.currentAudioGain.gain.setValueAtTime(
                    this.currentAudioGain.gain.value, 
                    this.audioContext.currentTime
                );
                this.currentAudioGain.gain.exponentialRampToValueAtTime(
                    0.001, 
                    this.audioContext.currentTime + 0.3
                );
                
                setTimeout(() => {
                    if (this.currentAudio) {
                        this.currentAudio.stop();
                        this.resetAudioState();
                    }
                }, 300);
                console.log("Carol audio stopped with fade out");
            } catch (e) {
                console.warn("Error stopping carol audio:", e);
                this.resetAudioState();
            }
        } else if (this.currentAudio) {
            try {
                this.currentAudio.stop();
            } catch (e) {
                // Audio might already be stopped
            }
            this.resetAudioState();
            console.log("Carol audio stopped (no gain node)");
        }
    }
    
    // Reset audio state
    resetAudioState() {
        this.currentAudio = null;
        this.currentAudioGain = null;
        this.isPlaying = false;
        this.isAudioPaused = false;
        this.audioStartTimestamp = 0;
        this.audioElapsedTime = 0;
        this.audioBuffer = null;
    }
    
    // Legacy method
    stopAudio() {
        this.stopCarolAudio();
    }

    triggerGameOver() {
        console.error("GAME OVER");

        this.stopCarolAudio();

        if (this.game) {
            try { this.game.destroy(true); } catch {}
            this.game = null;
        }

        if (this.escListener) {
            document.removeEventListener('keydown', this.escListener);
            this.escListener = null;
        }

        // SHOW FINAL PROGRESS SCREEN
        const gameOverScreen = document.createElement('div');
        gameOverScreen.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.95);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: 'Courier New', monospace;
            z-index: 10001;
            text-align: center;
        `;

        gameOverScreen.innerHTML = `
            <div style="font-size:60px;color:#FF0000;margin-bottom:30px;">
                GAME OVER
            </div>

            <div style="background:rgba(100,0,0,0.6);padding:30px;border-radius:15px;">
                <div style="font-size:28px;margin-bottom:20px;">
                    Progress Summary
                </div>

                <div style="font-size:22px;margin-bottom:10px;">
                    Houses Completed: 
                    <span style="color:#00FF00">
                        ${this.completedHouseNumbers.length}/6
                    </span>
                </div>

                <div style="font-size:22px;margin-bottom:10px;">
                    Total Score:
                    <span style="color:#FFD700">
                        ${this.totalScore}
                    </span>
                </div>

                <div style="font-size:18px;color:#AAA;margin-top:20px;">
                    The village rejects your carols…
                </div>
            </div>

            <div style="margin-top:40px;font-size:18px;color:#888;">
                Returning to menu…
            </div>
        `;

        document.body.appendChild(gameOverScreen);

        setTimeout(() => {
            gameOverScreen.remove();

            if (this.container) {
                this.container.style.display = 'none';
            }

            if (this.completionCallback) {
                this.completionCallback({ gameOver: true });
            }
        }, 4000);
    }
    
    onGameComplete(success, finalSatisfaction, score, maxCombo) {
        console.log('Game completed:', { success, finalSatisfaction, score, maxCombo });

        if (success) {
            this.totalScore += score;

            if (!this.completedHouseNumbers.includes(this.currentHouse)) {
                this.completedHouseNumbers.push(this.currentHouse);
            }
        } else {
            // LOSE A LIFE
            this.lives--;

            console.warn(`Life lost! Lives remaining: ${this.lives}`);

            // If no lives left → full game over
            if (this.lives <= 0) {
                this.triggerGameOver();
                return;
            }

            // ❗ IMPORTANT:
            // Immediately return to 3D world (NO failure screen)
            this.exitGame(false, finalSatisfaction, score, maxCombo);
            return;
        }

        // Only show completion screen on SUCCESS
        this.showCompletionScreen(success, finalSatisfaction, score, maxCombo);
    }
    
    showCompletionScreen(success, finalSatisfaction, score, maxCombo) {
        const completionScreen = document.createElement('div');
        completionScreen.id = 'carolingCompletionScreen';
        completionScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: 'Courier New', monospace;
            z-index: 2000;
            text-align: center;
        `;

        const title = success ? '🎉 HOUSE COMPLETED! 🎉' : '💀 YOU FAILED! 💀';
        const titleColor = success ? '#00FF00' : '#FF0000';

        const satisfactionColor =
            finalSatisfaction >= 70 ? '#00FF00' :
            finalSatisfaction >= 40 ? '#FFFF00' :
            finalSatisfaction >= 20 ? '#FF9900' : '#FF0000';

        const canExit = this.totalScore >= 15500;

        completionScreen.innerHTML = `
            <div style="
                font-size: 48px;
                margin-bottom: 25px;
                color: ${titleColor};
                text-shadow: 0 0 20px ${titleColor}80;
            ">
                ${title}
            </div>

            <div style="font-size: 30px; margin-bottom: 10px; color: ${satisfactionColor};">
                Final Satisfaction: ${Math.round(finalSatisfaction)}%
            </div>

            <div style="font-size: 22px; margin-bottom: 5px;">
                House Score: <span style="color:#FFFF00">${score}</span>
            </div>

            <div style="font-size: 20px; margin-bottom: 25px; color:#AAAAAA;">
                Total Score: <span style="color:#FFFF00">${this.totalScore}</span>
            </div>

            ${!success ? `
                <div style="
                    background: rgba(255,0,0,0.25);
                    padding: 15px;
                    border-radius: 10px;
                    margin-bottom: 25px;
                    border: 1px solid #FF0000;
                ">
                    <div style="font-size:18px;color:#FFAAAA;">
                        ❌ You lost a life
                    </div>
                    <div style="font-size:14px;color:#FF8888;">
                        Lives remaining: ${this.lives}
                    </div>
                </div>
            ` : ''}

            ${canExit ? `
                <div style="
                    background: rgba(0,120,0,0.35);
                    padding: 18px;
                    border-radius: 12px;
                    margin-bottom: 25px;
                    border: 2px solid #00FF00;
                    box-shadow: 0 0 15px rgba(0,255,0,0.4);
                ">
                    <div style="font-size:20px;color:#00FF00;margin-bottom:8px;">
                        🎉 EXIT UNLOCKED 🎉
                    </div>
                    <div style="font-size:14px;color:#AAFFAA;line-height:1.5;">
                        You reached <b>15,500</b> points.<br>
                        You may leave at the end of the path — or risk your lives for a higher score.
                    </div>
                </div>
            ` : `
                <div style="
                    background: rgba(80,80,80,0.3);
                    padding: 15px;
                    border-radius: 10px;
                    margin-bottom: 25px;
                    border: 1px solid #666;
                ">
                    <div style="font-size:16px;color:#CCCCCC;">
                        Exit locked — Reach <b>15,500</b> total score
                    </div>
                </div>
            `}

            <div style="
                margin-top: 10px;
                font-size: 22px;
                color: #AAAAAA;
                text-shadow: 0 0 10px rgba(255,255,255,0.3);
            ">
                Press <span style="color:#FFFF00;font-weight:bold;">ENTER</span> to return to the village
            </div>

            <div style="
                margin-top: 8px;
                font-size: 16px;
                color: #888;
            ">
                Returning automatically in <span id="countdownValue">10</span> seconds
            </div>
        `;

        this.container.appendChild(completionScreen);

        let remainingTime = 10;
        const countdownEl = document.getElementById('countdownValue');

        this.exitCountdownInterval = setInterval(() => {
            remainingTime--;
            if (countdownEl) countdownEl.textContent = remainingTime;

            if (remainingTime <= 0) {
                clearInterval(this.exitCountdownInterval);
                this.exitCountdownInterval = null;
                this.exitGameWithResult(success, finalSatisfaction, score, maxCombo);
            }
        }, 1000);

        this.completionKeyListener = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                if (this.exitCountdownInterval) {
                    clearInterval(this.exitCountdownInterval);
                    this.exitCountdownInterval = null;
                }

                document.removeEventListener('keydown', this.completionKeyListener);
                this.completionKeyListener = null;

                this.exitGameWithResult(success, finalSatisfaction, score, maxCombo);
            }
        };

        document.addEventListener('keydown', this.completionKeyListener);
    }
    
    continuePlaying(bonusScore) {
        this.totalScore += bonusScore;
        
        const completionScreen = document.getElementById('carolingCompletionScreen');
        if (completionScreen && completionScreen.parentNode) {
            completionScreen.remove();
        }
        
        if (this.autoExitTimer) {
            clearTimeout(this.autoExitTimer);
            this.autoExitTimer = null;
        }
        
        setTimeout(() => {
            this.exitGameWithResult(true, this.currentSatisfaction, bonusScore, 0);
        }, 300);
    }
    
    exitGameWithResult(success, finalSatisfaction, score, maxCombo) {
        
        if (this.autoExitTimer) {
            clearTimeout(this.autoExitTimer);
            this.autoExitTimer = null;
        }
        
        const completionScreen = document.getElementById('carolingCompletionScreen');
        if (completionScreen && completionScreen.parentNode) {
            completionScreen.remove();
        }
        
        setTimeout(() => {
            this.exitGame(success, finalSatisfaction, score, maxCombo);
        }, 300);
    }
    
    exitGame(success, finalSatisfaction = 0, score = 0, maxCombo = 0) {
        if (this.exitCountdownInterval) {
            clearInterval(this.exitCountdownInterval);
            this.exitCountdownInterval = null;
        }

        if (this.completionKeyListener) {
            document.removeEventListener('keydown', this.completionKeyListener);
            this.completionKeyListener = null;
        }

        if (this.completionCalled) {
            console.log('Completion already called, skipping...');
            return;
        }
        this.completionCalled = true;
        
        console.log('Exiting caroling game with result:', { success, finalSatisfaction, score });
        
        this.stopCarolAudio();
        
        if (this.game) {
            try {
                this.game.destroy(true);
            } catch (e) {
                console.warn('Error destroying Phaser game:', e);
            }
            this.game = null;
        }
        
        if (this.escListener) {
            document.removeEventListener('keydown', this.escListener);
            this.escListener = null;
        }
        
        if (this.autoExitTimer) {
            clearTimeout(this.autoExitTimer);
            this.autoExitTimer = null;
        }
        
        if (this.container) {
            this.container.style.display = 'none';
        }
        
        if (this.completionCallback) {
            const callback = this.completionCallback;
            this.completionCallback = null;
            setTimeout(() => {
                callback({
                    success: success,
                    finalSatisfaction: finalSatisfaction,
                    score: score,
                    maxCombo: maxCombo,
                    houseNumber: this.currentHouse,
                    completedHouseNumbers: this.completedHouseNumbers,
                    totalScore: this.totalScore,
                    lives: this.lives,
                    canExit: this.canExitVillage(),
                    needRespawn: !success
                });
            }, 100);
        }
    }
    
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.remove();
        }
        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) {}
            this.audioContext = null;
        }
    }
}

class CarolingScene extends Phaser.Scene {
    constructor(songData, beatMap, carolingGame) {
        super({ key: 'CarolingScene' });
        this.songData = songData;
        this.beatMap = beatMap;
        this.carolingGame = carolingGame;
        
        this.notes = [];
        this.activeNotes = new Map();
        this.keys = ['A', 'S', 'K', 'L'];
        
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.satisfaction = carolingGame.currentSatisfaction;
        this.totalNotes = 0;
        this.hitNotes = 0;
        this.missedNotes = 0;
        
        this.gameStartTime = 0;
        this.songStartTime = 0;
        this.isPlaying = false;
        this.gameOver = false;
        this.songDuration = 0;
        
        this.lanes = [];
        this.keyGuides = [];
        this.monster = null;
        this.satisfactionText = null;
        this.scoreText = null;
        this.comboText = null;
        
        this.audioSource = null;
        this.songEnded = false;
    }
    
    preload() {
        this.createNoteTextures();
        this.createMonsterTextures();
    }
    
    createNoteTextures() {
        const graphics = this.add.graphics();
        const laneColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00];
        
        laneColors.forEach((color, index) => {
            graphics.clear();
            graphics.fillStyle(color, 0.3);
            graphics.fillCircle(25, 25, 30);
            graphics.fillStyle(color, 1);
            graphics.fillCircle(25, 25, 20);
            graphics.lineStyle(3, 0xFFFFFF, 1);
            graphics.strokeCircle(25, 25, 20);
            graphics.generateTexture(`note_${index}`, 50, 50);
        });
        graphics.destroy();
    }
    
    createMonsterTextures() {
        const graphics = this.add.graphics();
        const moods = [
            { key: 'monster_happy', color: 0x00AA00, eyeColor: 0x00FF00 },
            { key: 'monster_neutral', color: 0x8B0000, eyeColor: 0xFFFF00 },
            { key: 'monster_angry', color: 0xFF4500, eyeColor: 0xFFA500 },
            { key: 'monster_furious', color: 0x8B0000, eyeColor: 0xFF0000 }
        ];
        
        moods.forEach(mood => {
            graphics.clear();
            graphics.fillStyle(mood.color, 0.3);
            graphics.fillCircle(50, 50, 45);
            graphics.fillStyle(mood.color, 1);
            graphics.fillCircle(50, 50, 40);
            
            graphics.fillStyle(mood.eyeColor, 1);
            graphics.fillCircle(35, 45, 10);
            graphics.fillCircle(65, 45, 10);

            graphics.fillStyle(mood.eyeColor, 0.4);
            graphics.fillCircle(35, 45, 18);
            graphics.fillCircle(65, 45, 18);
            
            graphics.fillStyle(mood.eyeColor, 0.5);
            graphics.fillCircle(35, 45, 15);
            graphics.fillCircle(65, 45, 15);
            
            graphics.lineStyle(6, 0x000000, 1);
            graphics.beginPath();
            if (mood.key === 'monster_happy') {
                graphics.arc(50, 60, 20, 0.2, Math.PI - 0.2, false);
            } else if (mood.key === 'monster_angry') {
                graphics.moveTo(30, 65);
                graphics.lineTo(50, 60);
                graphics.lineTo(70, 65);
            } else if (mood.key === 'monster_furious') {
                graphics.moveTo(30, 70);
                graphics.lineTo(50, 60);
                graphics.lineTo(70, 70);
            } else {
                graphics.arc(50, 65, 15, 0.1, Math.PI - 0.1, false);
            }
            graphics.strokePath();
            
            graphics.generateTexture(mood.key, 100, 100);
        });
        graphics.destroy();
    }
    
    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;
        
        this.add.rectangle(width/2, height/2, width, height, 0x000000);
        this.createLanes(width, height);
        this.createMonster(width, height);
        this.createUI(width, height);
        this.createKeyGuides(width, height);
        this.startCountdown(width, height);
    }
    
    createLanes(width, height) {
        const laneWidth = width / 4;
        const laneGap = 2;
        const effectiveWidth = laneWidth - laneGap;
        
        for (let i = 0; i < 4; i++) {
            const x = (i * laneWidth) + (laneWidth / 2);
            const lane = {
                x: x,
                width: effectiveWidth,
                color: [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00][i],
                key: this.keys[i]
            };
            
            const laneColor = lane.color;
            const alpha = 0.15;
            const r = (laneColor >> 16) & 0xFF;
            const g = (laneColor >> 8) & 0xFF;
            const b = laneColor & 0xFF;
            
            const laneBg = this.add.rectangle(
                x,
                height/2 + 100,
                effectiveWidth,
                height - 350,
                Phaser.Display.Color.GetColor(r, g, b),
                alpha
            );
            
            if (i > 0) {
                this.add.rectangle(
                    i * laneWidth,
                    height/2,
                    1,
                    height - 200,
                    0x333333
                );
            }
            
            this.lanes.push(lane);
        }
    }
    
    createMonster(width, height) {
        this.monster = this.add.sprite(width/2, 150, 'monster_neutral');
        this.monster.setScale(2.5);
        this.add.circle(width/2, 150, 100, 0xFF0000, 0.15);
    }
    
    createUI(width, height) {
        this.add.text(width/2, 250, `${this.songData.name}`, {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        this.satisfactionText = this.add.text(width/2, 320, `SATISFACTION: ${this.satisfaction}%`, {
            fontSize: '36px',
            fill: this.getSatisfactionColor(),
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5);
        
        this.scoreText = this.add.text(width/2, 60, `SCORE: ${this.score}`, {
            fontSize: '32px',
            fill: '#FFFFFF',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        this.comboText = this.add.text(width/2, 100, `COMBO: ${this.combo}`, {
            fontSize: '28px',
            fill: '#00FFFF',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 5
        }).setOrigin(0.5);
    }
    
    createKeyGuides(width, height) {
        this.lanes.forEach((lane, index) => {
            const keyGuide = this.add.circle(lane.x, height - 80, 40, 0xFFFFFF, 0.2);
            keyGuide.setStrokeStyle(3, lane.color, 0.8);
            
            const keyLabel = this.add.text(lane.x, height - 80, lane.key, {
                fontSize: '40px',
                fill: '#FFFFFF',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 4
            }).setOrigin(0.5);
            
            this.keyGuides.push({ guide: keyGuide, label: keyLabel, lane: index });
        });
    }
    
    getSatisfactionColor() {
        if (this.satisfaction >= 70) return '#00FF00';
        if (this.satisfaction >= 40) return '#FFFF00';
        if (this.satisfaction >= 20) return '#FF9900';
        return '#FF0000';
    }
    
    updateMonsterMood() {
        let texture = 'monster_neutral';
        if (this.satisfaction >= 70) texture = 'monster_happy';
        else if (this.satisfaction >= 40) texture = 'monster_neutral';
        else if (this.satisfaction >= 20) texture = 'monster_angry';
        else texture = 'monster_furious';
        
        this.monster.setTexture(texture);
        this.satisfactionText.setFill(this.getSatisfactionColor());
    }
    
    startCountdown(width, height) {
        let countdown = 3;
        const countdownText = this.add.text(width/2, height/2, '3', {
            fontSize: '120px',
            fill: '#FF0000',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 10
        }).setOrigin(0.5);
        
        const countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                countdown--;
                if (countdown > 0) {
                    countdownText.setText(countdown);
                    this.tweens.add({
                        targets: countdownText,
                        scale: { from: 1, to: 1.5 },
                        duration: 500,
                        yoyo: true
                    });
                } else {
                    countdownText.setText('GO!');
                    countdownText.setFill('#00FF00');
                    this.tweens.add({
                        targets: countdownText,
                        scale: { from: 1, to: 2 },
                        alpha: { from: 1, to: 0 },
                        duration: 500,
                        onComplete: () => {
                            countdownText.destroy();
                            this.startGame();
                        }
                    });
                }
            },
            repeat: 2
        });
    }
    
    startGame() {
        this.gameStartTime = this.time.now;
        this.isPlaying = true;
        this.setupInput();
        this.startAudio();
        this.scheduleNotes();
    }
    
    setupInput() {
        this.input.keyboard.on('keydown-A', () => this.hitNote(0));
        this.input.keyboard.on('keydown-S', () => this.hitNote(1));
        this.input.keyboard.on('keydown-K', () => this.hitNote(2));
        this.input.keyboard.on('keydown-L', () => this.hitNote(3));
        
        this.input.keyboard.on('keydown', (event) => {
            const key = event.key.toUpperCase();
            const index = this.keys.indexOf(key);
            if (index !== -1) {
                this.highlightKeyGuide(index);
            }
        });
    }
    
    highlightKeyGuide(laneIndex) {
        const guide = this.keyGuides[laneIndex];
        if (guide) {
            this.tweens.add({
                targets: [guide.guide, guide.label],
                scale: { from: 1, to: 1.2 },
                alpha: { from: 1, to: 0.8 },
                duration: 100,
                yoyo: true
            });
        }
    }
    
    startAudio() {
        if (this.carolingGame.audioBuffers[this.songData.name]) {
            this.audioSource = this.carolingGame.playAudio(this.carolingGame.audioBuffers[this.songData.name], 0);
            this.songStartTime = this.time.now;
            
            const buffer = this.carolingGame.audioBuffers[this.songData.name];
            this.songDuration = buffer.duration * 1000;
            
            if (this.audioSource) {
                this.audioSource.onended = () => {
                    this.songEnded = true;
                    this.checkGameCompletion();
                };
            }
            console.log(`Song duration: ${this.songDuration}ms`);
        } else {
            console.error('Audio buffer not found for song:', this.songData.name);
        }
    }
    
    scheduleNotes() {
        if (!this.beatMap || !this.beatMap.notes) {
            console.error('No beat map found!');
            this.endGame(false);
            return;
        }
        
        this.totalNotes = this.beatMap.notes.length;
        console.log(`Scheduling ${this.totalNotes} notes for song: ${this.songData.name}`);
        
        let lastNoteTime = 0;
        
        this.beatMap.notes.forEach((note, index) => {
            const appearTime = note.time * 1000 - 2000;
            if (appearTime > 0) {
                this.time.delayedCall(appearTime, () => {
                    this.spawnNote(note.lane, note.duration || 0.3);
                });
            } else {
                this.spawnNote(note.lane, note.duration || 0.3);
            }
            
            lastNoteTime = Math.max(lastNoteTime, note.time * 1000);
        });
        
        this.safetyTimeout = this.time.delayedCall(lastNoteTime + 5000, () => {
            if (this.isPlaying && !this.gameOver) {
                console.log('Safety timeout triggered, ending game');
                this.endGame(true);
            }
        });
    }
    
    spawnNote(lane, duration) {
        if (!this.isPlaying || this.gameOver) return;
        
        const laneObj = this.lanes[lane];
        if (!laneObj) return;
        
        const height = this.sys.game.config.height;
        const note = this.add.sprite(laneObj.x, 300, `note_${lane}`);
        note.setScale(1.0, 1.0);
        
        const noteId = Date.now() + Math.random();
        const fallDuration = 2000;
        
        const tween = this.tweens.add({
            targets: note,
            y: height - 80,
            duration: fallDuration,
            ease: 'Linear',
            onComplete: () => {
                if (note.active) {
                    this.missNote(noteId);
                }
            }
        });
        
        const noteData = {
            id: noteId,
            sprite: note,
            lane: lane,
            hit: false,
            spawnTime: this.time.now,
            tween: tween
        };
        
        this.activeNotes.set(noteId, noteData);
    }
    
    hitNote(lane) {
        if (!this.isPlaying || this.gameOver) return;
        
        let closestNote = null;
        let closestDistance = Infinity;
        let closestNoteId = null;
        
        const hitArea = 120;
        
        for (const [noteId, noteData] of this.activeNotes) {
            if (!noteData.hit && noteData.lane === lane && noteData.sprite && noteData.sprite.active) {
                const distance = Math.abs(noteData.sprite.y - (this.sys.game.config.height - 80));
                if (distance < hitArea && distance < closestDistance) {
                    closestNote = noteData;
                    closestDistance = distance;
                    closestNoteId = noteId;
                }
            }
        }
        
        if (closestNote) {
            closestNote.hit = true;
            this.hitNotes++;
            
            if (closestNote.tween) {
                closestNote.tween.stop();
            }
            
            if (closestNote.sprite && closestNote.sprite.active) {
                closestNote.sprite.destroy();
            }
            
            this.activeNotes.delete(closestNoteId);
            
            let accuracy;
            let score;
            let satisfactionChange;
            
            if (closestDistance < 30) {
                accuracy = 'PERFECT';
                score = this.carolingGame.scoring.perfect;
                satisfactionChange = this.carolingGame.satisfactionRate.perfect;
            } else if (closestDistance < 60) {
                accuracy = 'GOOD';
                score = this.carolingGame.scoring.good;
                satisfactionChange = this.carolingGame.satisfactionRate.good;
            } else {
                accuracy = 'BAD';
                score = this.carolingGame.scoring.bad;
                satisfactionChange = this.carolingGame.satisfactionRate.bad;
            }
            
            this.score += score;
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.satisfaction += satisfactionChange;
            this.satisfaction = Phaser.Math.Clamp(this.satisfaction, 0, 100);
            
            this.updateUI();
            this.showHitEffect(this.lanes[lane].x, this.sys.game.config.height - 80, accuracy);
            this.updateMonsterMood();
            
            this.checkGameCompletion();
            
            if (this.satisfaction <= 0) {
                this.endGame(false);
            }
        } else {
            this.missedNotes++;
            this.satisfaction += this.carolingGame.satisfactionRate.bad;
            this.combo = 0;

            if (this.monster) {
                this.monster.setScale(2.8);
                this.time.delayedCall(150, () => this.monster.setScale(2.5));
            }

            this.updateUI();
            this.updateMonsterMood();
            
            if (this.satisfaction <= 0) {
                this.endGame(false);
            }
        }
    }
    
    missNote(noteId) {
        const noteData = this.activeNotes.get(noteId);
        if (!noteData) return;
        
        if (noteData.sprite && noteData.sprite.active) {
            noteData.sprite.destroy();
        }
        
        this.activeNotes.delete(noteId);
        
        this.missedNotes++;
        this.satisfaction += this.carolingGame.satisfactionRate.bad;
        this.combo = 0;
        
        this.updateUI();
        this.updateMonsterMood();
        
        this.checkGameCompletion();
        
        if (this.satisfaction <= 0) {
            this.endGame(false);
        }
    }
    
    showHitEffect(x, y, accuracy) {
        const colors = {
            PERFECT: 0xFFFF00,
            GOOD: 0x00FF00,
            BAD: 0xFF0000
        };
        
        const hitCircle = this.add.circle(x, y, 60, colors[accuracy], 0.5);
        
        const hitText = this.add.text(x, y - 60, accuracy, {
            fontSize: '32px',
            fill: accuracy === 'PERFECT' ? '#FFFF00' : accuracy === 'GOOD' ? '#00FF00' : '#FF0000',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: hitCircle,
            radius: 100,
            alpha: 0,
            duration: 300,
            onComplete: () => hitCircle.destroy()
        });
        
        this.tweens.add({
            targets: hitText,
            y: hitText.y - 50,
            alpha: 0,
            duration: 500,
            onComplete: () => hitText.destroy()
        });
    }
    
    checkGameCompletion() {
        const totalProcessedNotes = this.hitNotes + this.missedNotes;
        const allNotesProcessed = totalProcessedNotes >= this.totalNotes;
        const noActiveNotes = this.activeNotes.size === 0;
        
        if (this.time.now % 2000 < 16) {
            console.log(`Game completion check: Processed ${totalProcessedNotes}/${this.totalNotes}, Active: ${this.activeNotes.size}, Song ended: ${this.songEnded}`);
        }
        
        if ((this.songEnded && allNotesProcessed && noActiveNotes) ||
            (allNotesProcessed && noActiveNotes && this.time.now > this.songStartTime + this.songDuration - 1000)) {
            
            this.time.delayedCall(500, () => {
                if (this.isPlaying && !this.gameOver) {
                    console.log('Song completed successfully!');
                    const success = this.satisfaction > 0;
                    this.endGame(success);
                }
            });
        }
    }
    
    updateUI() {
        this.scoreText.setText(`SCORE: ${this.score}`);
        this.comboText.setText(`COMBO: ${this.combo}`);
        this.satisfactionText.setText(`SATISFACTION: ${Math.round(this.satisfaction)}%`);
    }
    
    endGame(success) {
        if (this.gameOver) return;
        this.gameOver = true;
        this.isPlaying = false;
        
        if (this.safetyTimeout) {
            this.safetyTimeout.remove();
        }
        
        if (this.carolingGame.isPlaying) {
            this.carolingGame.stopCarolAudio();
        }
        
        this.tweens.killAll();
        
        for (const [noteId, noteData] of this.activeNotes) {
            if (noteData.sprite && noteData.sprite.active) {
                noteData.sprite.destroy();
            }
            if (noteData.tween) {
                noteData.tween.stop();
            }
        }
        this.activeNotes.clear();
        
        const accuracy = this.totalNotes > 0 ?
            Math.round((this.hitNotes / this.totalNotes) * 100) : 0;
        
        console.log(`Game ended. Success: ${success}, Accuracy: ${accuracy}%, Satisfaction: ${this.satisfaction}%`);
        this.carolingGame.onGameComplete(success, this.satisfaction, this.score, this.maxCombo);
    }
    
    update() {
        if (this.isPlaying && !this.gameOver) {

            // Monster breathing & jitter (psychological horror)
            if (this.monster) {
                this.monster.y += Math.sin(this.time.now * 0.004) * 0.3;
                this.monster.rotation += Math.sin(this.time.now * 0.003) * 0.002;
            }

            if (this.time.now % 1000 < 16) {
                this.checkGameCompletion();
            }
        }
    }

}