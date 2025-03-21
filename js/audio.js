import * as THREE from 'three';

// Enhanced SoundSynthesizer class for better audio
class SoundSynthesizer {
    constructor(audioContext) {
        // Ensure we have a valid audio context
        this.audioContext = audioContext;
        
        // Create master gain with more conservative settings
        this.masterGain = audioContext.createGain();
        this.masterGain.gain.value = 0.2; // Reduce overall volume to prevent distortion
        this.masterGain.connect(audioContext.destination);
        
        // Create compressor with gentler settings to prevent audio cracking
        this.compressor = audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 20;
        this.compressor.ratio.value = 8;
        this.compressor.attack.value = 0.01;
        this.compressor.release.value = 0.3;
        
        this.masterGain.connect(this.compressor);
        this.compressor.connect(audioContext.destination);
        
        // Use fewer effects to reduce processing load
        this.reverb = this.createReverb();
        this.masterGain.connect(this.reverb);
        this.reverb.connect(audioContext.destination);
        
        // Store active note modules for management
        this.activeNotes = [];
        
        // Store buffers for special sounds
        this.specialSounds = {};
        
        // Audio recovery system
        this.lastAudioTime = Date.now();
        this.audioFailed = false;
        
        // Initialize special sounds
        this.initSpecialSounds();
        
        // Setup watchdog to detect audio failures
        this.setupAudioWatchdog();
    }
    
    // Setup a watchdog to detect and recover from audio failures
    setupAudioWatchdog() {
        setInterval(() => {
            // If no audio has been played for 10 seconds, check the audio system
            if (Date.now() - this.lastAudioTime > 10000 && !this.audioFailed) {
                try {
                    // Create a quick test sound
                    const testOsc = this.audioContext.createOscillator();
                    const testGain = this.audioContext.createGain();
                    testGain.gain.value = 0.01; // Extremely quiet
                    testOsc.connect(testGain);
                    testGain.connect(this.audioContext.destination);
                    testOsc.start();
                    testOsc.stop(this.audioContext.currentTime + 0.01);
                    console.log("Audio system health check passed");
                } catch (e) {
                    console.warn("Audio system health check failed:", e);
                    this.audioFailed = true;
                    this.attemptAudioRecovery();
                }
            }
        }, 10000);
    }
    
    // Attempt to recover from audio failure
    attemptAudioRecovery() {
        console.log("Attempting to recover audio system...");
        
        try {
            // Disconnect and recreate critical audio nodes
            this.masterGain.disconnect();
            this.compressor.disconnect();
            
            // Create new nodes
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.2;
            
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -18;
            this.compressor.knee.value = 20;
            this.compressor.ratio.value = 8;
            this.compressor.attack.value = 0.01;
            this.compressor.release.value = 0.3;
            
            // Reconnect
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.audioContext.destination);
            
            this.audioFailed = false;
            console.log("Audio system recovery successful");
        } catch (e) {
            console.error("Audio recovery failed:", e);
        }
    }
    
    // Initialize special sound effects with more efficient generation
    initSpecialSounds() {
        // Only create essential sounds to reduce memory usage
        this.createSpecialSound('click', this.createClickBuffer());
        this.createSpecialSound('explosion', this.createExplosionBuffer());
        this.createSpecialSound('rainbow', this.createRainbowBuffer());
    }
    
    // Create a special sound and store it
    createSpecialSound(name, buffer) {
        const sound = {
            buffer: buffer,
            source: null,
            isPlaying: false
        };
        this.specialSounds[name] = sound;
    }
    
    // Play a special sound with additional error handling
    playSpecialSound(name, loop = false) {
        try {
            const sound = this.specialSounds[name];
            if (!sound) return;
            
            // Record the time of audio playback attempt
            this.lastAudioTime = Date.now();
            
            // Stop if already playing
            if (sound.isPlaying && sound.source) {
                this.stopSpecialSound(name);
            }
            
            // Create a new source
            const source = this.audioContext.createBufferSource();
            source.buffer = sound.buffer;
            source.loop = loop;
            
            // Create a gain node with a safer gain ramp
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Start playing with error handling
            try {
                source.start();
                
                // Update sound status
                sound.source = source;
                sound.gainNode = gainNode;
                sound.isPlaying = true;
                
                // Handle sound end if not looping
                if (!loop) {
                    source.onended = () => {
                        sound.isPlaying = false;
                        sound.source = null;
                    };
                }
            } catch (e) {
                console.error("Error playing sound:", e);
                this.audioFailed = true;
                this.attemptAudioRecovery();
            }
        } catch (e) {
            console.error("Error in playSpecialSound:", e);
        }
    }
    
    // Stop a special sound with graceful error handling
    stopSpecialSound(name) {
        try {
            const sound = this.specialSounds[name];
            if (!sound || !sound.isPlaying || !sound.source) return;
            
            // Fade out with a safer approach
            const now = this.audioContext.currentTime;
            sound.gainNode.gain.cancelScheduledValues(now);
            sound.gainNode.gain.setValueAtTime(sound.gainNode.gain.value, now);
            sound.gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
            
            // Stop after fade out with error handling
            setTimeout(() => {
                try {
                    if (sound.source) {
                        sound.source.stop();
                    }
                } catch (e) {
                    // Ignore errors if already stopped
                }
                sound.isPlaying = false;
                sound.source = null;
            }, 60);
        } catch (e) {
            console.error("Error in stopSpecialSound:", e);
        }
    }
    
    // Create a basic reverb effect - simplified for stability
    createReverb() {
        try {
            const convolver = this.audioContext.createConvolver();
            
            // Create shorter impulse response for reverb
            const rate = this.audioContext.sampleRate;
            const length = rate * 1; // 1 second (shorter)
            const impulse = this.audioContext.createBuffer(2, length, rate);
            
            for (let channel = 0; channel < 2; channel++) {
                const impulseData = impulse.getChannelData(channel);
                
                for (let i = 0; i < length; i++) {
                    // Faster decay curve for reverb
                    impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
                }
            }
            
            convolver.buffer = impulse;
            
            // Create gain node for reverb amount - use less reverb
            const reverbGain = this.audioContext.createGain();
            reverbGain.gain.value = 0.1; // Less reverb
            
            convolver.connect(reverbGain);
            
            return reverbGain;
        } catch (e) {
            console.error("Error creating reverb:", e);
            // Return a dummy node if reverb creation fails
            const dummyGain = this.audioContext.createGain();
            dummyGain.gain.value = 0;
            return dummyGain;
        }
    }
    
    // Play a note with warm pad sound - optimized version
    playWarmPad(note, duration = 0.3) {
        try {
            // Record the time of audio playback attempt
            this.lastAudioTime = Date.now();
            
            const now = this.audioContext.currentTime;
            
            // Use fewer oscillators (2 instead of 3)
            const osc1 = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            
            // Set waveforms 
            osc1.type = 'sine';
            osc2.type = 'triangle';
            
            // Set frequencies
            osc1.frequency.value = note;
            osc2.frequency.value = note * 1.005; // Slight detuning
            
            // Create gain nodes for envelope
            const gain1 = this.audioContext.createGain();
            const gain2 = this.audioContext.createGain();
            
            // Set initial gain to 0
            gain1.gain.value = 0;
            gain2.gain.value = 0;
            
            // Connect everything
            osc1.connect(gain1);
            osc2.connect(gain2);
            
            gain1.connect(this.masterGain);
            gain2.connect(this.masterGain);
            
            // Apply envelope with shorter attack and release
            const attackTime = 0.05;
            const releaseTime = 0.3;
            
            // Attack
            gain1.gain.linearRampToValueAtTime(0.15, now + attackTime);
            gain2.gain.linearRampToValueAtTime(0.1, now + attackTime);
            
            // Release
            gain1.gain.linearRampToValueAtTime(0, now + duration + releaseTime);
            gain2.gain.linearRampToValueAtTime(0, now + duration + releaseTime + 0.05);
            
            // Start and stop oscillators
            osc1.start(now);
            osc2.start(now);
            
            const stopTime = now + duration + releaseTime + 0.1;
            osc1.stop(stopTime);
            osc2.stop(stopTime);
            
            // Track active notes
            const noteModule = { oscillators: [osc1, osc2], gains: [gain1, gain2] };
            this.activeNotes.push(noteModule);
            
            // Clean up after note finishes
            setTimeout(() => {
                const index = this.activeNotes.indexOf(noteModule);
                if (index > -1) {
                    this.activeNotes.splice(index, 1);
                }
            }, (duration + releaseTime + 0.2) * 1000);
            
            return noteModule;
        } catch (e) {
            console.error("Error playing warm pad:", e);
            return null;
        }
    }
    
    // Play a chord based on a root note - simplified version
    playChord(rootNote, duration = 0.5) {
        try {
            this.playWarmPad(rootNote, duration);
            // Add a slight delay between notes to prevent audio glitches
            setTimeout(() => {
                this.playWarmPad(rootNote * 5/4, duration);
            }, 20);
            setTimeout(() => {
                this.playWarmPad(rootNote * 3/2, duration);
            }, 40);
        } catch (e) {
            console.error("Error playing chord:", e);
        }
    }
    
    // Play sound based on position - more stable version
    playPositionSound(x, y) {
        try {
            // Map x and y to meaningful musical values with fewer options
            const pentatonicScale = [220, 277.2, 329.6];
            
            // Map x to note in scale (-1 to 1 maps to 0 to 2)
            const noteIndex = Math.floor(((x + 1) / 2) * pentatonicScale.length);
            const note = pentatonicScale[Math.min(noteIndex, pentatonicScale.length - 1)];
            
            // Map y to volume with a narrower range to prevent distortion
            const volume = ((y + 1) / 2) * 0.25 + 0.05;
            this.masterGain.gain.value = volume;
            
            // Play the note with a shorter duration
            this.playWarmPad(note, 0.15);
        } catch (e) {
            console.error("Error playing position sound:", e);
        }
    }
    
    // Play click sound - simplified
    playClickSound() {
        try {
            // Play a single note instead of a chord for better performance
            this.playWarmPad(329.6, 0.2);
        } catch (e) {
            console.error("Error playing click sound:", e);
        }
    }
    
    // Play release sound - simplified
    playReleaseSound() {
        try {
            // Play a single note instead of a chord
            this.playWarmPad(261.6, 0.15);
        } catch (e) {
            console.error("Error playing release sound:", e);
        }
    }
    
    // Stop all currently playing sounds - more robust version
    stopAllSounds() {
        try {
            // Gradually fade out master gain
            const now = this.audioContext.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
            this.masterGain.gain.linearRampToValueAtTime(0, now + 0.05);
            
            // Reset after fade out
            setTimeout(() => {
                try {
                    // Stop all active oscillators
                    this.activeNotes.forEach(noteModule => {
                        noteModule.oscillators.forEach(osc => {
                            try {
                                osc.stop();
                            } catch (e) {
                                // Ignore errors if oscillator is already stopped
                            }
                        });
                    });
                    
                    // Clear active notes
                    this.activeNotes = [];
                    
                    // Reset master gain
                    this.masterGain.gain.value = 0.2;
                } catch (e) {
                    console.error("Error in stopAllSounds cleanup:", e);
                }
            }, 60);
            
            // Stop all special sounds
            Object.keys(this.specialSounds).forEach(name => {
                this.stopSpecialSound(name);
            });
        } catch (e) {
            console.error("Error stopping all sounds:", e);
        }
    }
    
    // Create buffer for click sound (simplified version)
    createClickBuffer() {
        try {
            // Create a shorter buffer for a click sound
            const sampleRate = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(2, sampleRate * 0.2, sampleRate);
            
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                const data = buffer.getChannelData(channel);
                
                // Simple attack
                for (let i = 0; i < sampleRate * 0.01; i++) {
                    data[i] = Math.random() * i / (sampleRate * 0.01) * 0.8;
                }
                
                // Brief body
                for (let i = sampleRate * 0.01; i < sampleRate * 0.1; i++) {
                    const t = (i - sampleRate * 0.01) / (sampleRate * 0.09);
                    const x = Math.sin(i * 0.05) * 0.3 + Math.sin(i * 0.08) * 0.2;
                    data[i] = x * (1 - t) * 0.7;
                }
                
                // Short fade out
                for (let i = sampleRate * 0.1; i < sampleRate * 0.2; i++) {
                    const t = (i - sampleRate * 0.1) / (sampleRate * 0.1);
                    data[i] = (1 - t) * 0.05 * Math.sin(i * 0.02);
                }
            }
            
            return buffer;
        } catch (e) {
            console.error("Error creating click buffer:", e);
            // Return a silent buffer on error
            return this.createSilentBuffer(0.1);
        }
    }
    
    // Create an explosion sound (simplified)
    createExplosionBuffer() {
        try {
            // Create a shorter buffer for an explosion sound
            const sampleRate = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(2, sampleRate * 1, sampleRate);
            
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                const data = buffer.getChannelData(channel);
                
                // Initial burst
                for (let i = 0; i < sampleRate * 0.05; i++) {
                    const t = i / (sampleRate * 0.05);
                    data[i] = (Math.random() * 2 - 1) * (1 - t * 0.5) * 0.8;
                }
                
                // Shorter rumble
                for (let i = sampleRate * 0.05; i < sampleRate * 1; i++) {
                    const t = (i - sampleRate * 0.05) / (sampleRate * 0.95);
                    const noise = Math.random() * 2 - 1;
                    const lowFreq = Math.sin(i * 0.01) * 0.4;
                    data[i] = (noise * 0.3 + lowFreq) * Math.pow(1 - t, 1.7) * 0.6;
                }
            }
            
            return buffer;
        } catch (e) {
            console.error("Error creating explosion buffer:", e);
            return this.createSilentBuffer(0.5);
        }
    }
    
    // Create a rainbow sound (simplified)
    createRainbowBuffer() {
        try {
            // Create a shorter buffer for a shimmering sound
            const sampleRate = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(2, sampleRate * 2, sampleRate);
            
            // Fewer base frequencies 
            const frequencies = [261.6, 329.6, 523.2];
            
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                const data = buffer.getChannelData(channel);
                
                // Fill with silence first
                for (let i = 0; i < data.length; i++) {
                    data[i] = 0;
                }
                
                // Add sine waves at different frequencies
                for (const freq of frequencies) {
                    for (let i = 0; i < data.length; i++) {
                        const t = i / sampleRate;
                        // Apply overall envelope to prevent clipping
                        const envelope = Math.min(t, 1) * Math.min((2-t), 1) * 0.6;
                        data[i] += Math.sin(t * freq * Math.PI * 2) * 0.07 * envelope;
                    }
                }
            }
            
            return buffer;
        } catch (e) {
            console.error("Error creating rainbow buffer:", e);
            return this.createSilentBuffer(1);
        }
    }
    
    // Create a silent buffer (fallback for errors)
    createSilentBuffer(duration = 0.5) {
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
        return buffer;
    }
}

// Sound manager with improved error handling
const soundManager = {
    sounds: {},
    
    // Initialize all sounds
    init: function() {
        console.log("Initializing sound manager with synthesized sounds...");
        
        // Create references for the synthesized sounds
        this.sounds = {
            hover: { type: 'synth', name: 'hover' },
            click: { type: 'special', name: 'click' },
            explosion: { type: 'special', name: 'explosion' },
            spike: { type: 'synth', name: 'spike' },
            rainbow: { type: 'special', name: 'rainbow' }
        };
        
        // Add event listener for page visibility changes
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        console.log("Sound manager initialized with synthesized sounds");
    },
    
    // Handle page visibility changes
    handleVisibilityChange: function() {
        if (document.visibilityState === 'hidden') {
            // Page is hidden, stop all sounds
            if (window.app && window.app.soundSynth) {
                window.app.soundSynth.stopAllSounds();
            }
        } else {
            // Page is visible again, resume audio context if needed
            if (window.app && window.app.audioContext && 
                window.app.audioContext.state === 'suspended') {
                window.app.audioContext.resume().catch(e => {
                    console.warn("Error resuming audio context:", e);
                });
            }
        }
    },
    
    // Play a sound using the synthesizer with error handling
    play: function(name, loop = false) {
        try {
            if (!window.app || !window.app.soundSynth) return;
            
            // Resume audio context if it's suspended
            if (window.app.audioContext.state === 'suspended') {
                window.app.audioContext.resume().catch(e => {
                    console.warn("Error resuming audio context:", e);
                });
            }
            
            const sound = this.sounds[name];
            if (!sound) return;
            
            // Use the appropriate synthesizer method
            if (sound.type === 'special') {
                window.app.soundSynth.playSpecialSound(sound.name, loop);
                return;
            }
            
            // For synth sounds
            switch(sound.name) {
                case 'hover':
                    window.app.soundSynth.playWarmPad(440, 0.2);
                    break;
                case 'spike':
                    window.app.soundSynth.playWarmPad(330, 0.3);
                    break;
                default:
                    window.app.soundSynth.playClickSound();
            }
        } catch (e) {
            console.error("Error playing sound:", e);
        }
    },
    
    // Stop a sound
    stop: function(name) {
        try {
            if (!window.app || !window.app.soundSynth) return;
            
            const sound = this.sounds[name];
            if (!sound) return;
            
            if (sound.type === 'special') {
                window.app.soundSynth.stopSpecialSound(sound.name);
            }
        } catch (e) {
            console.error("Error stopping sound:", e);
        }
    },
    
    // Simplified attachToObject and setFrequency methods
    attachToObject: function(name, object) {
        console.log("Audio attached to object:", name);
    },
    
    setFrequency: function(name, value) {
        console.log("Audio frequency set:", name, value);
    }
};

// Setup audio system with improved error handling
function setupAudio(app) {
    try {
        // Try to reuse existing audio context if available
        if (app.audioContext) {
            if (app.audioContext.state === 'suspended') {
                app.audioContext.resume().catch(e => {
                    console.warn("Error resuming audio context:", e);
                });
            }
            return app.soundSynth;
        }
        
        // Initialize Web Audio API
        app.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create sound synthesizer
        app.soundSynth = new SoundSynthesizer(app.audioContext);
        
        // Create analyzer for visualization
        app.analyser = app.audioContext.createAnalyser();
        app.analyser.fftSize = 128; // Smaller FFT size for better performance
        app.audioDataArray = new Uint8Array(app.analyser.frequencyBinCount);
        
        // Connect analyzer
        app.soundSynth.masterGain.connect(app.analyser);
        
        console.log("Audio system initialized");
        return app.soundSynth;
    } catch (e) {
        console.error("Web Audio API not supported:", e);
        return null;
    }
}

// Initialize Web Audio API synthesizer with better error handling
function initSynthesizer() {
    try {
        // Create a global audio context that will be used throughout the app
        const context = new (window.AudioContext || window.webkitAudioContext)();
        
        // Set up for global app access
        if (window.app) {
            window.app.audioContext = context;
            window.app.soundSynth = new SoundSynthesizer(context);
            
            // Setup analyzer
            window.app.analyser = context.createAnalyser();
            window.app.analyser.fftSize = 128;
            window.app.audioDataArray = new Uint8Array(window.app.analyser.frequencyBinCount);
            window.app.soundSynth.masterGain.connect(window.app.analyser);
        }
        
        console.log("Audio synthesizer initialized");
    } catch (e) {
        console.error("Web Audio API initialization error:", e);
    }
}

// Create a simpler audio visualization
function createAudioVisualization(app) {
    if (!app.scene) return;
    
    try {
        // Create a simpler circle of fewer cubes
        const visualizationGroup = new THREE.Group();
        const cubeCount = 16; // Fewer cubes
        const radius = 2;
        
        // Create a single geometry and material to be reused
        const cubeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const cubeMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.6
        });
        
        for (let i = 0; i < cubeCount; i++) {
            const angle = (i / cubeCount) * Math.PI * 2;
            const cube = new THREE.Mesh(cubeGeo, cubeMat.clone());
            
            cube.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0
            );
            
            visualizationGroup.add(cube);
        }
        
        app.scene.add(visualizationGroup);
        
        // Store it for updates
        app.scene.userData.audioVisualization = visualizationGroup;
    } catch (e) {
        console.error("Error creating audio visualization:", e);
    }
}

// Update audio visualization with better error handling
function updateAudioVisualization(app) {
    try {
        if (!app.audioContext || 
            !app.scene || 
            !app.scene.userData.audioVisualization || 
            !app.analyser || 
            !app.audioDataArray) return;
        
        // Get frequency data
        app.analyser.getByteFrequencyData(app.audioDataArray);
        
        // Update visualization cubes
        const visualization = app.scene.userData.audioVisualization;
        const cubes = visualization.children;
        
        for (let i = 0; i < cubes.length; i++) {
            try {
                const cube = cubes[i];
                
                // Map frequency bin to cube - use a simpler mapping
                const frequencyBin = Math.floor((i / cubes.length) * app.audioDataArray.length);
                const value = app.audioDataArray[frequencyBin] / 255; // Normalize to 0-1
                
                // Apply smoother scaling to prevent jerky visualization
                cube.scale.y = 0.08 + value * 1.2;
                
                // Smoother position updates
                const yPos = Math.sin((i / cubes.length) * Math.PI * 2) * 2;
                cube.position.y = yPos + (value * 0.3);
                
                // Simpler color updates - avoid creating new colors every frame
                cube.material.color.setHSL(i / cubes.length, 0.7, 0.4 + value * 0.3);
            } catch (e) {
                // Skip this cube if there's an error
                continue;
            }
        }
    } catch (e) {
        console.error("Error updating audio visualization:", e);
    }
}

// Create a listener for 3D audio
const listener = new THREE.AudioListener();

// Simplified function to setup audio analyzer
function setupAudioAnalyzer() {
    // This is now handled in the initSynthesizer function
    console.log("Audio analyzer setup is handled automatically");
}

// Play tone based on position with better error handling
function playToneForPosition(app, x, y) {
    try {
        if (!app.soundSynth) return;
        app.soundSynth.playPositionSound(x, y);
    } catch (e) {
        console.error("Error playing tone for position:", e);
    }
}

// Stop tone with better error handling
function stopTone(app) {
    try {
        if (!app.soundSynth) return;
        app.soundSynth.stopAllSounds();
    } catch (e) {
        console.error("Error stopping tone:", e);
    }
}

// Map a value to a frequency range
function mapToFrequency(value, min, max, freqMin = 220, freqMax = 660) {
    return freqMin + ((value - min) / (max - min)) * (freqMax - freqMin);
}

// Export all needed functions and variables
export {
    listener,
    soundManager,
    initSynthesizer,
    setupAudioAnalyzer,
    createAudioVisualization,
    updateAudioVisualization,
    playToneForPosition,
    stopTone,
    mapToFrequency,
    setupAudio,
    SoundSynthesizer
};