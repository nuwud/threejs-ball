/**
 * Direct Audio Fix
 * 
 * This script bypasses the complex audio architecture and provides direct,
 * reliable sound generation for ball interactions.
 */

// Simple singleton audio system
const DirectAudio = {
    audioContext: null,
    mainGain: null,
    isInitialized: false,
    mouseMoveThrottleTimer: null,
    lastPlayedTime: 0,
    minTimeBetweenSounds: 80, // ms to avoid audio overload

    // Initialize the system
    init() {
        if (this.isInitialized) return true;
        
        console.log("🔊 Initializing direct audio system...");
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create main gain
            this.mainGain = this.audioContext.createGain();
            this.mainGain.gain.value = 0.5; // 50% volume
            this.mainGain.connect(this.audioContext.destination);
            
            // Resume audio context (modern browsers require user interaction)
            this._resumeContext();
            document.addEventListener('click', () => this._resumeContext());
            document.addEventListener('keydown', () => this._resumeContext());
            document.addEventListener('touchstart', () => this._resumeContext());
            
            // Add to window.app if available
            if (window.app) {
                window.app.audioContext = window.app.audioContext || this.audioContext;
                window.app.masterGain = window.app.masterGain || this.mainGain;
            }
            
            this.isInitialized = true;
            console.log("🔊 Direct audio system initialized successfully");
            
            // Add direct hooks to ball
            this._hookToBall();
            
            // Show success indicator
            // this._showStatusIndicator("Audio Ready", "green");
            
            return true;
        } catch (error) {
            console.error("❌ Failed to initialize direct audio system:", error);
            return false;
        }
    },
    
    // Resume audio context (needed for user interaction)
    _resumeContext() {
        if (!this.audioContext) return;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log("🔊 AudioContext resumed successfully");
                
                // Play a silent sound to fully activate audio
                this._playSilentSound();
            }).catch(error => {
                console.error("❌ Failed to resume AudioContext:", error);
            });
        }
    },
    
    // Play a silent sound to kick-start audio system
    _playSilentSound() {
        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            gain.gain.value = 0.001; // Nearly silent
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn("Warning: Could not play silent sound", error);
        }
    },
    
    // Connect directly to ball
    _hookToBall() {
        if (!window.app || !window.app.onPointerMove) {
            console.warn("🔊 Ball not ready, will try again in 1 second");
            setTimeout(() => this._hookToBall(), 1000);
            return;
        }
        
        console.log("🔊 Adding direct hooks to ball interaction");
        
        // Store original handler
        const originalMove = window.app.onPointerMove;
        
        // Replace with our wrapped version
        window.app.onPointerMove = (event) => {
            // Call original first
            originalMove(event);
            
            // Add our direct sound trigger
            this._handleMouseMove(event);
        };
        
        // Add click handler
        const originalDown = window.app.onPointerDown;
        window.app.onPointerDown = (event) => {
            // Call original first
            originalDown(event);
            
            // Play click sound immediately, no throttling
            this.playClickSound();
        };
        
        console.log("🔊 Direct ball hooks added successfully");
    },
    
    // Handle mouse move to trigger facet sounds
    _handleMouseMove(event) {
        // Skip if audio not available
        if (!this.audioContext || this.audioContext.state !== 'running') return;
        
        // Throttle to avoid too many sounds
        if (this.mouseMoveThrottleTimer) return;
        
        this.mouseMoveThrottleTimer = setTimeout(() => {
            this.mouseMoveThrottleTimer = null;
        }, 30); // 30ms throttle period
        
        // Only proceed if enough time has passed since last sound
        const now = Date.now();
        if (now - this.lastPlayedTime < this.minTimeBetweenSounds) return;
        
        // Check if mouse is over the ball
        if (!window.app.isHovered) return;
        
        try {
            // Calculate mouse position in normalized device coordinates
            const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Update the raycaster
            window.app.raycaster.setFromCamera({ x: mouseX, y: mouseY }, window.app.camera);
            
            // Calculate objects intersecting the ray
            const intersects = window.app.raycaster.intersectObject(window.app.ballMesh);
            
            if (intersects.length > 0) {
                // Get facet information
                const facetIndex = intersects[0].faceIndex || 0;
                const position = intersects[0].uv || { x: 0.5, y: 0.5 };
                
                // Play sound directly
                this.playDirectFacetSound(facetIndex, position);
                
                // Update last played time
                this.lastPlayedTime = now;
            }
        } catch (error) {
            console.warn("Error in mouse move handler:", error);
        }
    },
    
    // Show status indicator on screen
    // _showStatusIndicator(message, color = "green") {
    //     let indicator = document.getElementById('audio-status-indicator');
        
    //     if (!indicator) {
    //         indicator = document.createElement('div');
    //         indicator.id = 'audio-status-indicator';
    //         indicator.style.position = 'fixed';
    //         indicator.style.bottom = '20px';
    //         indicator.style.right = '20px';
    //         indicator.style.padding = '10px 15px';
    //         indicator.style.backgroundColor = 'rgba(0,0,0,0.7)';
    //         indicator.style.color = color;
    //         indicator.style.fontFamily = 'Arial, sans-serif';
    //         indicator.style.fontSize = '14px';
    //         indicator.style.fontWeight = 'bold';
    //         indicator.style.borderRadius = '4px';
    //         indicator.style.zIndex = '9999';
    //         document.body.appendChild(indicator);
    //     }
        
    //     indicator.textContent = message;
    //     indicator.style.color = color;
        
    //     // Hide after 3 seconds
    //     setTimeout(() => {
    //         indicator.style.opacity = '0';
    //         indicator.style.transition = 'opacity 0.5s ease-out';
            
    //         // Remove after fade out
    //         setTimeout(() => {
    //             if (indicator.parentNode) {
    //                 document.body.removeChild(indicator);
    //             }
    //         }, 500);
    //     }, 3000);
    // },

    // Play a direct sound for the facet with no dependencies
    playDirectFacetSound(facetIndex, position) {
        try {
            // Skip if context is not running
            if (!this.audioContext || this.audioContext.state !== 'running') return;
            
            // Log sound attempt with specific details
            console.log(`🎵 Playing facet sound for #${facetIndex} at ${position.x?.toFixed(2)},${position.y?.toFixed(2)}`);
            
            // Calculate frequency based on facet
            const baseNote = 60 + (facetIndex % 12); // Map to musical notes (C4 to B4)
            const semitoneRatio = Math.pow(2, 1/12);
            const frequency = 220 * Math.pow(semitoneRatio, baseNote - 48); // A3 = 220Hz at MIDI 57
            
            // Create oscillator for tone
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Add a filter for better sound quality
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 2000;
            filter.Q.value = 1;
            
            // Set oscillator parameters
            oscillator.type = ['sine', 'triangle', 'sawtooth', 'sine'][facetIndex % 4]; // Different waveforms for variety
            oscillator.frequency.value = frequency;
            
            // Add slight detune for more organic sound
            oscillator.detune.value = Math.random() * 20 - 10; // -10 to +10 cents
            
            // Connect nodes
            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.mainGain);
            
            // Start with zero gain and ramp up/down for clean envelope
            const now = this.audioContext.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.01); // Fast attack
            gain.gain.linearRampToValueAtTime(0, now + 0.25); // Gradual release
            
            // Start oscillator
            oscillator.start(now);
            oscillator.stop(now + 0.3); // Let it play slightly longer than envelope
            
            // Clean up after sound ends
            setTimeout(() => {
                try {
                    oscillator.disconnect();
                    filter.disconnect();
                    gain.disconnect();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, 350);
            
            return true;
        } catch (error) {
            console.error("❌ Error playing facet sound:", error);
            return false;
        }
    },
    
    // Play a click sound with no dependencies
    playClickSound() {
        try {
            // Skip if context is not running
            if (!this.audioContext || this.audioContext.state !== 'running') return;
            
            console.log("🎵 Playing click sound");
            
            // Create oscillator for tone
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Set oscillator parameters - higher pitch for click
            oscillator.type = 'triangle';
            oscillator.frequency.value = 660; // E5
            
            // Connect nodes
            oscillator.connect(gain);
            gain.connect(this.mainGain);
            
            // Start with zero gain and ramp up/down for clean envelope
            const now = this.audioContext.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.001); // Very fast attack
            gain.gain.linearRampToValueAtTime(0, now + 0.15); // Short release
            
            // Start oscillator
            oscillator.start(now);
            oscillator.stop(now + 0.2); // Let it play slightly longer than envelope
            
            // Clean up after sound ends
            setTimeout(() => {
                try {
                    oscillator.disconnect();
                    gain.disconnect();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, 250);
            
            return true;
        } catch (error) {
            console.error("❌ Error playing click sound:", error);
            return false;
        }
    },
    
    // Test the audio system
    test() {
        if (!this.isInitialized) {
            this.init();
        }
        
        // Play a sequence of test tones
        const startTime = this.audioContext.currentTime;
        const notes = [60, 64, 67, 72]; // C4, E4, G4, C5
        
        notes.forEach((note, i) => {
            setTimeout(() => {
                // Convert MIDI note to frequency
                const semitoneRatio = Math.pow(2, 1/12);
                const frequency = 440 * Math.pow(semitoneRatio, note - 69); // A4 = 440Hz at MIDI 69
                
                // Create oscillator
                const oscillator = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                oscillator.type = 'triangle';
                oscillator.frequency.value = frequency;
                
                oscillator.connect(gain);
                gain.connect(this.mainGain);
                
                // Envelope
                const now = this.audioContext.currentTime;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                
                oscillator.start(now);
                oscillator.stop(now + 0.35);
                
                // Clean up
                setTimeout(() => {
                    oscillator.disconnect();
                    gain.disconnect();
                }, 400);
                
                // Show indicator for first note
                if (i === 0) {
                    this._showStatusIndicator("Audio Test Playing", "cyan");
                }
            }, i * 300);
        });
        
        return true;
    }
};

// Initialize immediately and make globally accessible
DirectAudio.init();
window.DirectAudio = DirectAudio;

// Create test button
// setTimeout(() => {
//     const testButton = document.createElement('button');
//     testButton.textContent = 'Test Audio';
//     testButton.style.position = 'fixed';
//     testButton.style.bottom = '10px';
//     testButton.style.left = '10px';
//     testButton.style.zIndex = '9999';
//     testButton.style.padding = '8px 16px';
//     testButton.style.backgroundColor = '#2196F3';
//     testButton.style.color = 'white';
//     testButton.style.border = 'none';
//     testButton.style.borderRadius = '4px';
//     testButton.style.cursor = 'pointer';
    
//     testButton.addEventListener('click', () => {
//         DirectAudio.test();
//     });
    
//     document.body.appendChild(testButton);
// }, 1000);

// Export for module use
export default DirectAudio;
