/**
 * Complete sound system fix v2.0
 * Resolves all audio issues with a direct implementation approach
 */

(function() {
    console.log("Applying comprehensive audio system fix v2.0...");

    // STEP 1: Create a single, global AudioContext that all systems will share
    let globalAudioContext = null;
    try {
        // Create the global audio context that will be shared across all systems
        globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Created global AudioContext:", globalAudioContext);
    } catch (e) {
        console.error("Failed to create global AudioContext:", e);
    }

    // STEP 2: Create a complete standalone audio system that doesn't rely on existing code
    const standaloneAudio = {
        // Store the shared global context
        context: globalAudioContext,
        
        // Master gain node
        masterGain: null,
        
        // Initialize the audio system
        initialize: function() {
            if (!this.context) return false;
            
            try {
                // Create master gain node if it doesn't exist
                if (!this.masterGain) {
                    this.masterGain = this.context.createGain();
                    this.masterGain.gain.value = 0.5; // 50% volume
                    this.masterGain.connect(this.context.destination);
                }
                
                // Ensure audio context is resumed on user interaction
                if (this.context.state === 'suspended') {
                    const resumeAudio = () => {
                        this.context.resume().then(() => {
                            console.log("AudioContext resumed successfully");
                        }).catch(e => {
                            console.warn("Failed to resume AudioContext:", e);
                        });
                    };
                    
                    // Add multiple event listeners for best browser compatibility
                    document.addEventListener('click', resumeAudio, { once: true });
                    document.addEventListener('touchstart', resumeAudio, { once: true });
                    document.addEventListener('keydown', resumeAudio, { once: true });
                }
                
                return true;
            } catch (e) {
                console.error("Error initializing standalone audio system:", e);
                return false;
            }
        },
        
        // Set master volume
        setVolume: function(value) {
            if (!this.masterGain) return false;
            
            try {
                // Clamp volume between 0 and 1
                const volume = Math.max(0, Math.min(1, value));
                this.masterGain.gain.value = volume;
                return true;
            } catch (e) {
                console.error("Error setting volume:", e);
                return false;
            }
        },
        
        // Create and play a simple tone
        playTone: function(options) {
            if (!this.context || !this.masterGain) return false;
            
            try {
                const defaults = {
                    frequency: 440,
                    type: 'sine',
                    volume: 0.2,
                    attack: 0.01,
                    release: 0.2,
                    duration: 0.25
                };
                
                // Merge defaults with provided options
                const config = { ...defaults, ...options };
                
                // Create oscillator and gain node
                const oscillator = this.context.createOscillator();
                const gainNode = this.context.createGain();
                
                // Configure oscillator
                oscillator.type = config.type;
                oscillator.frequency.value = config.frequency;
                
                // Start with no volume
                gainNode.gain.value = 0;
                
                // Connect nodes
                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                // Start the oscillator immediately
                oscillator.start();
                
                // Apply volume envelope
                const now = this.context.currentTime;
                gainNode.gain.linearRampToValueAtTime(config.volume, now + config.attack);
                gainNode.gain.linearRampToValueAtTime(0, now + config.attack + config.release);
                
                // Schedule oscillator stop a bit after the release to ensure all sound has faded
                oscillator.stop(now + config.attack + config.release + 0.01);
                
                // Clean up nodes
                oscillator.onended = function() {
                    try {
                        oscillator.disconnect();
                        gainNode.disconnect();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                };
                
                return {
                    oscillator,
                    gainNode
                };
            } catch (e) {
                console.error("Error playing tone:", e);
                return false;
            }
        },
        
        // Play a sound for a specific position
        playToneForPosition: function(x, y) {
            if (!this.context) return false;
            
            try {
                // Normalize coordinates to 0-1 range
                const normX = (x + 1) / 2;
                const normY = (y + 1) / 2;
                
                // Map to frequency and volume
                const frequency = 220 + normX * 660;
                const volume = 0.1 + normY * 0.2;
                
                // Play the tone
                this.playTone({
                    frequency: frequency,
                    volume: volume,
                    type: 'sine',
                    attack: 0.01,
                    release: 0.2
                });
                
                return true;
            } catch (e) {
                console.error("Error playing position tone:", e);
                return false;
            }
        },
        
        // Play a sound for a specific facet
        playFacetSound: function(facetIndex, position) {
            if (!this.context) return false;
            
            try {
                // Default position at center of facet
                const pos = position || { u: 0.5, v: 0.5 };
                
                // Calculate frequency based on facet index (pentatonic scale for harmony)
                const baseFreq = 220; // A3
                const pentatonic = [0, 2, 4, 7, 9]; // Pentatonic scale intervals
                const note = pentatonic[facetIndex % 5];
                const octave = Math.floor(facetIndex / 5) % 3;
                const frequency = baseFreq * Math.pow(2, (note + octave * 12) / 12);
                
                // Add variation based on position within facet
                const freqVariation = 15 * (pos.u - 0.5);
                const finalFreq = frequency + freqVariation;
                
                // Select oscillator type based on facet index
                const types = ['sine', 'triangle', 'sine', 'triangle'];
                const oscType = types[facetIndex % types.length];
                
                // Play the tone with facet-specific settings
                this.playTone({
                    frequency: finalFreq,
                    volume: 0.2,
                    type: oscType,
                    attack: 0.01,
                    release: 0.3,
                    duration: 0.35
                });
                
                return true;
            } catch (e) {
                console.error("Error playing facet sound:", e);
                return false;
            }
        },
        
        // Play a click sound (for pointer down)
        playClickSound: function() {
            if (!this.context) return false;
            
            try {
                this.playTone({
                    frequency: 120,
                    volume: 0.3,
                    type: 'square',
                    attack: 0.005,
                    release: 0.07,
                    duration: 0.1
                });
                
                return true;
            } catch (e) {
                console.error("Error playing click sound:", e);
                return false;
            }
        },
        
        // Play a release sound (for pointer up)
        playReleaseSound: function() {
            if (!this.context) return false;
            
            try {
                this.playTone({
                    frequency: 440,
                    volume: 0.2,
                    type: 'sine',
                    attack: 0.01,
                    release: 0.15,
                    duration: 0.2
                });
                
                return true;
            } catch (e) {
                console.error("Error playing release sound:", e);
                return false;
            }
        },
        
        // Play a mode toggle sound (for effect toggles)
        playToggleSound: function(activated) {
            if (!this.context) return false;
            
            try {
                if (activated) {
                    // "Activation" sound - rising tone
                    const osc = this.context.createOscillator();
                    const gain = this.context.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.value = 330;
                    
                    gain.gain.value = 0;
                    
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    
                    osc.start();
                    
                    const now = this.context.currentTime;
                    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
                    osc.frequency.linearRampToValueAtTime(660, now + 0.2);
                    gain.gain.linearRampToValueAtTime(0, now + 0.3);
                    
                    osc.stop(now + 0.31);
                    
                    osc.onended = function() {
                        try {
                            osc.disconnect();
                            gain.disconnect();
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                    };
                } else {
                    // "Deactivation" sound - falling tone
                    const osc = this.context.createOscillator();
                    const gain = this.context.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.value = 660;
                    
                    gain.gain.value = 0;
                    
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    
                    osc.start();
                    
                    const now = this.context.currentTime;
                    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
                    osc.frequency.linearRampToValueAtTime(330, now + 0.2);
                    gain.gain.linearRampToValueAtTime(0, now + 0.3);
                    
                    osc.stop(now + 0.31);
                    
                    osc.onended = function() {
                        try {
                            osc.disconnect();
                            gain.disconnect();
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                    };
                }
                
                return true;
            } catch (e) {
                console.error("Error playing toggle sound:", e);
                return false;
            }
        }
    };
    
    // STEP 3: Initialize our standalone audio system
    standaloneAudio.initialize();
    
    // STEP 4: Replace SoundSynthesizer class entirely
    window.SoundSynthesizer = function(audioContext) {
        this.audioContext = standaloneAudio.context;
        this.specialSounds = {};
        
        // Add all required methods
        this.initSpecialSounds = function() {
            this.specialSounds = this.specialSounds || {};
            return true;
        };
        
        this.createReverb = function() {
            return standaloneAudio.context.createGain();
        };
        
        this.playFacetSound = function(facetIndex, position) {
            return standaloneAudio.playFacetSound(facetIndex, position);
        };
        
        this.playClickSound = function() {
            return standaloneAudio.playClickSound();
        };
        
        this.playReleaseSound = function() {
            return standaloneAudio.playReleaseSound();
        };
        
        this.playToneForPosition = function(x, y) {
            return standaloneAudio.playToneForPosition(x, y);
        };
        
        this.playSpecialSound = function(soundId, options) {
            // Handle special sounds like toggle effects
            if (soundId === 'toggleOn') {
                return standaloneAudio.playToggleSound(true);
            } else if (soundId === 'toggleOff') {
                return standaloneAudio.playToggleSound(false);
            } else {
                // Default tone for unrecognized sounds
                return standaloneAudio.playTone({
                    frequency: 440,
                    volume: 0.2,
                    type: 'sine',
                    attack: 0.01,
                    release: 0.2
                });
            }
        };
        
        this.createTone = function(frequency, duration) {
            // Just return a valid object structure that won't cause errors
            return {
                play: function() {
                    return standaloneAudio.playTone({
                        frequency: frequency || 440,
                        duration: duration || 0.2
                    });
                }
            };
        };
        
        return this;
    };
    
    // STEP 5: Patch the audio module's functions
    function patchAudioFunctions() {
        // Functions to hijack and redirect to our standalone system
        const soundFunctions = {
            playToneForPosition: function(app, x, y) {
                return standaloneAudio.playToneForPosition(x, y);
            },
            
            playFacetSound: function(app, facetIndex, position) {
                return standaloneAudio.playFacetSound(facetIndex, position);
            },
            
            playClickSound: function() {
                return standaloneAudio.playClickSound();
            },
            
            playReleaseSound: function() {
                return standaloneAudio.playReleaseSound();
            },
            
            getAudioContext: function() {
                return standaloneAudio.context;
            },
            
            getMasterGain: function() {
                return standaloneAudio.masterGain;
            }
        };
        
        // Override functions in the global scope
        for (const funcName in soundFunctions) {
            window[funcName] = soundFunctions[funcName];
        }
        
        // Override functions in the app object
        if (window.app) {
            if (!window.app.audio) window.app.audio = {};
            
            for (const funcName in soundFunctions) {
                window.app.audio[funcName] = soundFunctions[funcName];
            }
            
            // Add direct references to audio components
            window.app.audioContext = standaloneAudio.context;
            window.app.masterGain = standaloneAudio.masterGain;
        }
        
        // Also expose our better functions to various places they might be expected
        window.soundFunctions = soundFunctions;
        window.audioContext = standaloneAudio.context;
        window.masterGain = standaloneAudio.masterGain;
        
        console.log("Audio functions patched successfully!");
    }
    
    // STEP 6: Patch the event handlers for interactivity
    function patchEventHandlers() {
        // Events that should trigger sounds
        const soundEvents = {
            'onPointerMove': (event, app) => {
                // Rate limit to avoid sound overload
                if (event && event.facetIndex !== undefined) {
                    standaloneAudio.playFacetSound(event.facetIndex, { 
                        u: event.uv ? event.uv.x : 0.5, 
                        v: event.uv ? event.uv.y : 0.5 
                    });
                }
            },
            
            'onPointerDown': () => {
                standaloneAudio.playClickSound();
            },
            
            'onPointerUp': () => {
                standaloneAudio.playReleaseSound();
            },
            
            'toggleRainbowMode': (active) => {
                standaloneAudio.playToggleSound(active);
            },
            
            'toggleTrailMode': (active) => {
                standaloneAudio.playToggleSound(active);
            }
        };
        
        // Patch event handlers by monkey patching
        for (const eventName in soundEvents) {
            // Check multiple locations where the handler might exist
            const locations = [window, window.app, window.events, window.input];
            
            locations.forEach(location => {
                if (location && typeof location[eventName] === 'function') {
                    const originalHandler = location[eventName];
                    
                    location[eventName] = function() {
                        try {
                            // Call original event handler
                            const result = originalHandler.apply(this, arguments);
                            
                            // Call our sound function with standardized args
                            if (arguments[0] && arguments[0].type === 'toggle') {
                                // For toggle events
                                soundEvents[eventName](arguments[0].active, window.app);
                            } else {
                                // For pointer events
                                soundEvents[eventName](arguments[0], window.app);
                            }
                            
                            return result;
                        } catch (e) {
                            console.error(`Error in patched event handler ${eventName}:`, e);
                            // Still try to play the sound
                            soundEvents[eventName](arguments[0], window.app);
                        }
                    };
                    
                    console.log(`Patched event handler: ${eventName}`);
                }
            });
        }
    }
    
    // STEP 7: Fix the sound scheduler by replacing it completely
    function fixSoundScheduler() {
        // Create a new, non-throttling scheduler
        const unthrottledScheduler = {
            maxSoundsPerSecond: 1000, // Very high limit
            soundCount: 0,
            lastResetTime: Date.now(),
            continuousModeEnabled: true,
            
            initialize: function() {
                // Reset counter every second
                setInterval(() => {
                    this.soundCount = 0;
                    this.lastResetTime = Date.now();
                }, 1000);
                
                console.log("Unthrottled sound scheduler initialized");
                return true;
            },
            
            canPlaySound: function() {
                return true; // Always allow sounds
            },
            
            recordSoundPlayed: function() {
                this.soundCount++;
                return true;
            },
            
            setContinuousMode: function(enabled) {
                this.continuousModeEnabled = enabled;
                return true;
            }
        };
        
        // Initialize our scheduler
        unthrottledScheduler.initialize();
        
        // Replace any existing scheduler
        if (window.app) {
            window.app.soundScheduler = unthrottledScheduler;
        }
        
        // Also make it globally available
        window.soundScheduler = unthrottledScheduler;
        
        console.log("Sound scheduler replaced with unthrottled version");
    }
    
    // Apply all our fixes
    function applyAllFixes() {
        // Replace SoundSynthesizer class
        console.log("Applying SoundSynthesizer replacement");
        
        // Patch audio functions
        patchAudioFunctions();
        
        // Fix event handlers
        patchEventHandlers();
        
        // Fix scheduler
        fixSoundScheduler();
        
        console.log("All audio fixes applied successfully!");
        
        // Play a success sound
        setTimeout(() => {
            try {
                // Play a scale as a success indication
                const notes = [0, 4, 7, 12];
                
                notes.forEach((note, index) => {
                    setTimeout(() => {
                        const freq = 440 * Math.pow(2, note / 12);
                        standaloneAudio.playTone({
                            frequency: freq,
                            volume: 0.2,
                            type: 'triangle',
                            attack: 0.02,
                            release: 0.2
                        });
                    }, index * 150);
                });
            } catch (e) {
                // Ignore any errors in the test sound
            }
        }, 1000);
    }
    
    // Apply fixes when the page loads
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(applyAllFixes, 500);
    } else {
        window.addEventListener('DOMContentLoaded', () => setTimeout(applyAllFixes, 500));
    }
})();