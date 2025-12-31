class AudioManager {
    constructor() {
        this.audioContext = null;
        this.bgMusic = null;
        this.clickSound = null;
        this.bgMusicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.carolVolume = 0.7; 
        this.isMuted = false;
        this.isBgMusicPlaying = false;
        this.settings = {
            musicVolume: 0.5,
            sfxVolume: 0.7,
            carolVolume: 0.7,
            muted: false,
            keyBindings: {
                moveForward: 'KeyW',
                moveBackward: 'KeyS',
                moveLeft: 'KeyA',
                moveRight: 'KeyD',
                jump: 'Space',
                run: 'ShiftLeft',
                interact: 'Enter'
            }
        };
        
        this.loadSettings();
    }
    
    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load audio files
            await this.loadAudioFiles();
            
            // Resume audio context (required for Chrome autoplay policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            console.log('AudioManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AudioManager:', error);
        }
    }
    
    async loadAudioFiles() {
        try {
            // Load background music
            const bgMusicResponse = await fetch('assets/sounds/background.mp3');
            const bgMusicArrayBuffer = await bgMusicResponse.arrayBuffer();
            const bgMusicBuffer = await this.audioContext.decodeAudioData(bgMusicArrayBuffer);
            
            // Load click sound
            const clickResponse = await fetch('assets/sounds/click.mp3');
            const clickArrayBuffer = await clickResponse.arrayBuffer();
            const clickBuffer = await this.audioContext.decodeAudioData(clickArrayBuffer);
            
            this.bgMusicBuffer = bgMusicBuffer;
            this.clickBuffer = clickBuffer;
            
            console.log('Audio files loaded successfully');
        } catch (error) {
            console.warn('Could not load audio files:', error);
            // Create fallback tones
            this.createFallbackSounds();
        }
    }
    
    createFallbackSounds() {
        // Create fallback background music (simple sine wave)
        const duration = 4; // seconds
        const sampleRate = this.audioContext.sampleRate;
        const frameCount = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                // Create a simple melody
                const t = i / sampleRate;
                const freq1 = 220; // A3
                const freq2 = 293.66; // D4
                const freq3 = 329.63; // E4
                const freq4 = 440; // A4
                
                // Simple Christmas melody pattern
                const note1 = Math.sin(2 * Math.PI * freq1 * t) * 0.1;
                const note2 = Math.sin(2 * Math.PI * freq2 * t) * 0.1;
                const note3 = Math.sin(2 * Math.PI * freq3 * t) * 0.1;
                const note4 = Math.sin(2 * Math.PI * freq4 * t) * 0.1;
                
                // Pattern: 1-2-3-4-3-2-1
                const pattern = Math.floor((t * 2) % 7);
                let value = 0;
                
                switch(pattern) {
                    case 0: value = note1; break;
                    case 1: value = note2; break;
                    case 2: value = note3; break;
                    case 3: value = note4; break;
                    case 4: value = note3; break;
                    case 5: value = note2; break;
                    case 6: value = note1; break;
                }
                
                // Add some harmonics
                value += Math.sin(2 * Math.PI * freq1 * 2 * t) * 0.05;
                value += Math.sin(2 * Math.PI * freq1 * 3 * t) * 0.03;
                
                channelData[i] = value;
            }
        }
        
        this.bgMusicBuffer = buffer;
        
        // Create fallback click sound
        const clickBuffer = this.audioContext.createBuffer(1, sampleRate * 0.1, sampleRate);
        const clickData = clickBuffer.getChannelData(0);
        
        // Create a short click sound
        for (let i = 0; i < clickData.length; i++) {
            const t = i / sampleRate;
            // Short decaying sine wave
            clickData[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 50);
        }
        
        this.clickBuffer = clickBuffer;
    }
    
    playBackgroundMusic(loop = true) {
        if (!this.bgMusicBuffer || this.isMuted || this.isBgMusicPlaying) return;
        
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.bgMusicBuffer;
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.isMuted ? 0 : this.bgMusicVolume * this.settings.musicVolume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.loop = loop;
            source.start();
            
            this.bgMusic = source;
            this.bgMusicGain = gainNode;
            this.isBgMusicPlaying = true;
            
            // When music ends, restart it if looping
            source.onended = () => {
                if (loop && !this.isMuted) {
                    setTimeout(() => this.playBackgroundMusic(true), 100);
                } else {
                    this.isBgMusicPlaying = false;
                }
            };
            
            console.log('Background music started');
        } catch (error) {
            console.error('Error playing background music:', error);
        }
    }
    
    stopBackgroundMusic() {
        if (this.bgMusic) {
            try {
                this.bgMusic.stop();
                this.isBgMusicPlaying = false;
                console.log('Background music stopped');
            } catch (error) {
                // Music might have already stopped
            }
            this.bgMusic = null;
        }
    }
    
    // NEW: Pause background music (fade out)
    pauseBackgroundMusic() {
        if (this.bgMusicGain && this.bgMusic) {
            this.bgMusicGain.gain.setValueAtTime(this.bgMusicGain.gain.value, this.audioContext.currentTime);
            this.bgMusicGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
            
            setTimeout(() => {
                if (this.bgMusic) {
                    this.bgMusic.stop();
                    this.bgMusic = null;
                    this.isBgMusicPlaying = false;
                }
            }, 500);
            console.log('Background music paused');
        }
    }
    
    // NEW: Resume background music (fade in)
    resumeBackgroundMusic() {
        if (!this.isBgMusicPlaying && !this.isMuted) {
            setTimeout(() => {
                this.playBackgroundMusic(true);
                
                // Fade in
                if (this.bgMusicGain) {
                    this.bgMusicGain.gain.setValueAtTime(0.001, this.audioContext.currentTime);
                    this.bgMusicGain.gain.exponentialRampToValueAtTime(this.bgMusicVolume, this.audioContext.currentTime + 0.5);
                }
            }, 500);
            console.log('Background music resumed');
        }
    }
    
    playClickSound() {
        if (!this.clickBuffer || this.isMuted) return;
        
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.clickBuffer;
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.isMuted ? 0 : this.sfxVolume * this.settings.sfxVolume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();
            
            console.log('Click sound played');
        } catch (error) {
            console.error('Error playing click sound:', error);
        }
    }
    
    setMusicVolume(volume) {
        this.bgMusicVolume = Math.max(0, Math.min(1, volume));
        this.settings.musicVolume = this.bgMusicVolume;
        
        if (this.bgMusicGain && this.bgMusic) {
            this.bgMusicGain.gain.value = this.isMuted ? 0 : this.bgMusicVolume;
        }
        
        this.saveSettings();
    }
    
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.settings.sfxVolume = this.sfxVolume;
        this.saveSettings();
    }
    
    // NEW: Set carol song volume
    setCarolVolume(volume) {
        this.carolVolume = Math.max(0, Math.min(1, volume));
        this.settings.carolVolume = this.carolVolume;
        this.saveSettings();
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.settings.muted = this.isMuted;
        
        if (this.bgMusicGain) {
            this.bgMusicGain.gain.value = this.isMuted ? 0 : this.bgMusicVolume;
        }
        
        if (this.isMuted) {
            console.log('Audio muted');
        } else {
            console.log('Audio unmuted');
        }
        
        this.saveSettings();
    }
    
    setKeyBinding(action, keyCode) {
        this.settings.keyBindings[action] = keyCode;
        this.saveSettings();
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('gameSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.settings = { ...this.settings, ...settings };
                this.bgMusicVolume = this.settings.musicVolume;
                this.sfxVolume = this.settings.sfxVolume;
                this.carolVolume = this.settings.carolVolume || 0.7; // Default if not exists
                this.isMuted = this.settings.muted;
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
    
    resetToDefaults() {
        this.settings = {
            musicVolume: 0.5,
            sfxVolume: 0.7,
            carolVolume: 0.7, // NEW: Carol song volume
            muted: false,
            keyBindings: {
                moveForward: 'KeyW',
                moveBackward: 'KeyS',
                moveLeft: 'KeyA',
                moveRight: 'KeyD',
                jump: 'Space',
                run: 'ShiftLeft',
                interact: 'Enter'
            }
        };
        
        this.bgMusicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.carolVolume = 0.7;
        this.isMuted = false;
        
        if (this.bgMusicGain) {
            this.bgMusicGain.gain.value = this.bgMusicVolume;
        }
        
        this.saveSettings();
    }
}

// Global audio manager instance
window.audioManager = new AudioManager();