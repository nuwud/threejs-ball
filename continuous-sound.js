/**
 * continuous-sound.js
 * 
 * This script completely replaces the discrete sound approach with a truly continuous
 * synthesizer that produces a smooth, continuous soundscape as you move over the ball.
 */

(function() {
    // Audio context and nodes
    let audioContext = null;
    let masterGain = null;
    
    // Active oscillators
    let primaryOscillator = null;
    let secondaryOscillator = null;
    let primaryGain = null;
    let secondaryGain = null;
    let filterNode = null;
    
    // Oscillator bank for facet-specific sounds
    const facetOscillators = {};
    
    // Flag to track initialization state
    let initialized = false;
    
    // Animation frame ID for continuous updates
    let animationFrameId = null;
    
    // Last known mouse position and facet
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastFacetIndex = -1;
    
    // Constants
    const CROSSFADE_TIME = 0.2; // seconds
    const FACET_FADE_TIME = 0.3; // seconds
    const BASE_FREQUENCY = 220; // A3
    
    // Oscillator types for variety
    const OSCILLATOR_TYPES = ['sine', 'triangle', 'sine', 'sawtooth'];
    
    // Current audio state
    const state = {
        isActive: false,
        volume: 0.8,
        isBallHovered: false
    };
    
    /**
     * Initialize the continuous audio system
     */
    function initialize() {
        if (initialized) return;
        
        console.log("Initializing continuous sound system...");
        
        try {
            // Create audio context and master gain
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            masterGain = audioContext.createGain();
            masterGain.gain.value = state.volume;
            masterGain.connect(audioContext.destination);
            
            // Create filter node
            filterNode = audioContext.createBiquadFilter();
            filterNode.type = 'lowpass';
            filterNode.frequency.value = 5000;
            filterNode.Q.value = 1;
            filterNode.connect(masterGain);
            
            // Create primary oscillator
            primaryOscillator = audioContext.createOscillator();
            primaryOscillator.type = 'sine';
            primaryOscillator.frequency.value = BASE_FREQUENCY;
            primaryGain = audioContext.createGain();
            primaryGain.gain.value = 0;
            primaryOscillator.connect(primaryGain);
            primaryGain.connect(filterNode);
            primaryOscillator.start();
            
            // Create secondary oscillator for smooth transitions
            secondaryOscillator = audioContext.createOscillator();
            secondaryOscillator.type = 'sine';
            secondaryOscillator.frequency.value = BASE_FREQUENCY;
            secondaryGain = audioContext.createGain();
            secondaryGain.gain.value = 0;
            secondaryOscillator.connect(secondaryGain);
            secondaryGain.connect(filterNode);
            secondaryOscillator.start();
            
            // Set up monitoring of mouse movement
            setupMouseMonitoring();
            
            // Start continuous update loop
            startContinuousUpdate();
            
            initialized = true;
            state.isActive = true;
            
            console.log("Continuous sound system initialized");
            
            // Create visual feedback
            showStatus("Continuous Sound System Active");
        } catch (error) {
            console.error("Error initializing continuous sound system:", error);
        }
    }
    
    /**
     * Set up monitoring of mouse movement for continuous sound
     */
    function setupMouseMonitoring() {
        // Store original raycaster check from events.js
        const app = window.app;
        if (!app) {
            console.warn("App not found, can't set up mouse monitoring");
            return;
        }
        
        // Set up mouse position tracking
        window.addEventListener('mousemove', (event) => {
            // Calculate normalized mouse position (-1 to 1)
            lastMouseX = (event.clientX / window.innerWidth) * 2 - 1;
            lastMouseY = -((event.clientY / window.innerHeight) * 2 - 1);
            
            // Check if mouse is over the ball using the app's raycaster
            if (app.raycaster && app.camera && app.ballGroup) {
                app.raycaster.setFromCamera(new THREE.Vector2(lastMouseX, lastMouseY), app.camera);
                
                const mesh = app.ballGroup.userData.mesh;
                if (mesh) {
                    const intersects = app.raycaster.intersectObject(mesh);
                    
                    if (intersects.length > 0) {
                        state.isBallHovered = true;
                        
                        // Get facet index
                        const facetIndex = intersects[0].faceIndex;
                        
                        // Get position within facet for more detailed control
                        const posInFacet = intersects[0].uv ? {
                            u: intersects[0].uv.x,
                            v: intersects[0].uv.y
                        } : { u: 0.5, v: 0.5 };
                        
                        // If facet changed, update facet sound
                        if (facetIndex !== lastFacetIndex) {
                            handleFacetChange(facetIndex, posInFacet);
                            lastFacetIndex = facetIndex;
                        }
                        
                        // Update primary oscillator parameters based on mouse position
                        updateMainSoundForPosition(lastMouseX, lastMouseY, posInFacet);
                    } else {
                        // Mouse not over ball
                        if (state.isBallHovered) {
                            state.isBallHovered = false;
                            fadeSoundOut(0.2); // Fade out in 0.2 seconds when leaving the ball
                        }
                    }
                }
            }
        });
        
        // Handle mousedown for more expressive sound
        window.addEventListener('mousedown', () => {
            if (state.isBallHovered && filterNode) {
                // Increase filter resonance on mouse down for emphasis
                filterNode.Q.value = 10;
                filterNode.frequency.value = 3000 + 1000 * Math.random();
            }
        });
        
        // Handle mouseup to return to normal
        window.addEventListener('mouseup', () => {
            if (filterNode) {
                // Smoothly return filter to normal
                filterNode.Q.linearRampToValueAtTime(1, audioContext.currentTime + 0.3);
                filterNode.frequency.linearRampToValueAtTime(5000, audioContext.currentTime + 0.3);
            }
        });
    }
    
    /**
     * Update primary sound based on mouse position
     */
    function updateMainSoundForPosition(x, y, posInFacet) {
        if (!primaryOscillator || !audioContext) return;
        
        // Ensure we're initialized
        if (!initialized) {
            initialize();
            return;
        }
        
        // Calculate parameters based on position
        // Map x to frequency (220Hz to 880Hz)
        const normX = (x + 1) / 2; // Normalize to 0-1
        const normY = (y + 1) / 2; // Normalize to 0-1
        
        // Create frequency curve that's more musical (pentatonic scale-like)
        const frequencyBase = BASE_FREQUENCY;
        const midiNote = Math.floor(normX * 12); // 0-12 range for an octave
        
        // Pentatonic scale intervals: 0, 2, 4, 7, 9
        const pentatonicIntervals = [0, 2, 4, 7, 9];
        const intervalIdx = midiNote % pentatonicIntervals.length;
        const octave = Math.floor(midiNote / pentatonicIntervals.length);
        const interval = pentatonicIntervals[intervalIdx] + (octave * 12);
        
        // Calculate frequency using equal temperament formula
        const frequency = frequencyBase * Math.pow(2, interval / 12);
        
        // Apply subtle detuning based on facet position
        const detune = (posInFacet.u - 0.5) * 50; // -25 to +25 cents
        
        // Smooth transition to new frequency
        const now = audioContext.currentTime;
        
        // Primary oscillator updates
        primaryOscillator.frequency.setTargetAtTime(frequency, now, 0.03);
        primaryOscillator.detune.setTargetAtTime(detune, now, 0.03);
        
        // Set volume based on Y position and hover state
        if (state.isBallHovered) {
            // Map Y to filter cutoff for brightness changes
            const cutoff = 2000 + normY * 6000;
            
            // Volume - louder at the top, softer at the bottom
            const volume = 0.05 + normY * 0.15;
            
            // Smooth transition to new values
            primaryGain.gain.setTargetAtTime(volume, now, 0.03);
            filterNode.frequency.setTargetAtTime(cutoff, now, 0.1);
        }
    }
    
    /**
     * Handle facet change event for more distinct sounds
     */
    function handleFacetChange(newFacetIndex, posInFacet) {
        if (!audioContext || !initialized) return;
        
        const now = audioContext.currentTime;
        
        // Create new oscillator for this facet if needed
        if (!facetOscillators[newFacetIndex]) {
            // Create facet-specific oscillator
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            // Set different waveform based on facet
            oscillator.type = OSCILLATOR_TYPES[newFacetIndex % OSCILLATOR_TYPES.length];
            
            // Use facet index to create harmonic relationships to the primary sound
            const harmonicRatios = [1, 4/3, 3/2, 2, 5/3, 9/5];
            const baseFreq = BASE_FREQUENCY * harmonicRatios[newFacetIndex % harmonicRatios.length];
            oscillator.frequency.value = baseFreq;
            
            // Apply unique detune for this facet
            oscillator.detune.value = (newFacetIndex * 9) % 100 - 50;
            
            // Connect and start silently
            gain.gain.value = 0;
            oscillator.connect(gain);
            gain.connect(filterNode);
            oscillator.start();
            
            // Store in facet oscillators map
            facetOscillators[newFacetIndex] = {
                oscillator: oscillator,
                gain: gain,
                active: true
            };
        }
        
        // Fade out all other facet oscillators
        Object.keys(facetOscillators).forEach(facetIdx => {
            if (parseInt(facetIdx) !== newFacetIndex && facetOscillators[facetIdx].active) {
                facetOscillators[facetIdx].gain.gain.linearRampToValueAtTime(0, now + FACET_FADE_TIME);
                facetOscillators[facetIdx].active = false;
                
                // Schedule cleanup after fade-out
                setTimeout(() => {
                    try {
                        if (facetOscillators[facetIdx]) {
                            facetOscillators[facetIdx].oscillator.stop();
                            facetOscillators[facetIdx].oscillator.disconnect();
                            facetOscillators[facetIdx].gain.disconnect();
                            delete facetOscillators[facetIdx];
                        }
                    } catch (e) {
                        console.warn('Error cleaning up facet oscillator:', e);
                    }
                }, FACET_FADE_TIME * 1000 + 100);
            }
        });
        
        // Fade in the new facet oscillator
        facetOscillators[newFacetIndex].gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        facetOscillators[newFacetIndex].active = true;
        
        // Use the crossfade technique to ensure continuity
        crossfadePrimaryOscillator(
            facetOscillators[newFacetIndex].oscillator.frequency.value,
            facetOscillators[newFacetIndex].oscillator.detune.value
        );
    }
    
    /**
     * Crossfade between primary and secondary oscillators for smooth transitions
     */
    function crossfadePrimaryOscillator(newFrequency, newDetune) {
        if (!primaryOscillator || !secondaryOscillator || !audioContext) return;
        
        const now = audioContext.currentTime;
        
        // Configure secondary oscillator with new parameters while keeping it silent
        secondaryOscillator.frequency.value = newFrequency;
        secondaryOscillator.detune.value = newDetune;
        secondaryOscillator.type = primaryOscillator.type;
        
        // Current volume level
        const currentVolume = primaryGain.gain.value;
        
        // Fade out primary while fading in secondary
        primaryGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_TIME);
        secondaryGain.gain.linearRampToValueAtTime(currentVolume, now + CROSSFADE_TIME);
        
        // Swap oscillators after crossfade
        setTimeout(() => {
            // Swap the roles of the oscillators
            const tempOsc = primaryOscillator;
            const tempGain = primaryGain;
            
            primaryOscillator = secondaryOscillator;
            primaryGain = secondaryGain;
            
            secondaryOscillator = tempOsc;
            secondaryGain = tempGain;
            
            // Reset secondary to silent
            secondaryGain.gain.value = 0;
        }, CROSSFADE_TIME * 1000);
    }
    
    /**
     * Fade sound out gradually
     */
    function fadeSoundOut(fadeTime) {
        if (!primaryGain || !audioContext) return;
        
        const now = audioContext.currentTime;
        
        // Fade out primary gain
        primaryGain.gain.linearRampToValueAtTime(0, now + fadeTime);
        
        // Fade out any active facet oscillators
        Object.keys(facetOscillators).forEach(facetIdx => {
            if (facetOscillators[facetIdx].active) {
                facetOscillators[facetIdx].gain.gain.linearRampToValueAtTime(0, now + fadeTime);
            }
        });
    }
    
    /**
     * Start continuous update loop for sound parameters
     */
    function startContinuousUpdate() {
        // Cancel any existing loop
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        // Function to continuously update sound parameters
        function updateSound() {
            if (!initialized || !state.isActive) return;
            
            // Add subtle modulation effects
            if (primaryOscillator && state.isBallHovered) {
                const now = audioContext.currentTime;
                
                // Add very subtle random detuning for more lively sound
                const randomDetune = primaryOscillator.detune.value + (Math.random() * 2 - 1);
                primaryOscillator.detune.setTargetAtTime(
                    Math.max(-50, Math.min(50, randomDetune)),
                    now,
                    0.1
                );
                
                // Add subtle filter modulation for more expressive sound
                if (filterNode) {
                    const currentFreq = filterNode.frequency.value;
                    const randomFreq = currentFreq * (1 + (Math.random() * 0.05 - 0.025));
                    filterNode.frequency.setTargetAtTime(
                        randomFreq,
                        now,
                        0.2
                    );
                }
            }
            
            // Schedule next update
            animationFrameId = requestAnimationFrame(updateSound);
        }
        
        // Start update loop
        updateSound();
    }
    
    /**
     * Show status message
     * @param {string} message - Message to display
     */
    function showStatus(message) {
        // Use the app's status function if available
        if (window.showStatus) {
            window.showStatus(message);
            return;
        }
        
        // Create a status element if it doesn't exist
        let statusElement = document.getElementById('continuous-audio-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'continuous-audio-status';
            statusElement.style.position = 'fixed';
            statusElement.style.top = '10px';
            statusElement.style.left = '10px';
            statusElement.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
            statusElement.style.color = 'black';
            statusElement.style.padding = '10px';
            statusElement.style.borderRadius = '5px';
            statusElement.style.zIndex = '9999';
            statusElement.style.fontWeight = 'bold';
            document.body.appendChild(statusElement);
        }
        
        statusElement.textContent = message;
        
        // Fade out after 3 seconds
        setTimeout(() => {
            statusElement.style.transition = 'opacity 1s';
            statusElement.style.opacity = '0';
            
            // Remove after fade
            setTimeout(() => {
                if (statusElement.parentNode) {
                    document.body.removeChild(statusElement);
                }
            }, 1000);
        }, 3000);
    }
    
    /**
     * Clean up resources
     */
    function cleanup() {
        if (!initialized) return;
        
        // Stop and disconnect all oscillators
        if (primaryOscillator) {
            primaryOscillator.stop();
            primaryOscillator.disconnect();
        }
        
        if (secondaryOscillator) {
            secondaryOscillator.stop();
            secondaryOscillator.disconnect();
        }
        
        // Clean up facet oscillators
        Object.keys(facetOscillators).forEach(facetIdx => {
            try {
                facetOscillators[facetIdx].oscillator.stop();
                facetOscillators[facetIdx].oscillator.disconnect();
                facetOscillators[facetIdx].gain.disconnect();
            } catch (e) {
                console.warn('Error cleaning up facet oscillator:', e);
            }
        });
        
        // Disconnect filter and master gain
        if (filterNode) filterNode.disconnect();
        if (masterGain) masterGain.disconnect();
        
        // Cancel animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // Reset state
        initialized = false;
        state.isActive = false;
        
        console.log("Continuous sound system cleaned up");
    }
    
    /**
     * Initialize the system when the page loads
     */
    function initOnLoad() {
        // Wait for app to be available
        if (!window.app) {
            setTimeout(initOnLoad, 500);
            return;
        }
        
        // Add initialization button to ensure user interaction for audio context
        const initButton = document.createElement('button');
        initButton.textContent = 'Enable Continuous Sound';
        initButton.style.position = 'fixed';
        initButton.style.bottom = '20px';
        initButton.style.left = '20px';
        initButton.style.zIndex = '1000';
        initButton.style.padding = '10px 20px';
        initButton.style.backgroundColor = '#00AA00';
        initButton.style.color = 'white';
        initButton.style.border = 'none';
        initButton.style.borderRadius = '5px';
        initButton.style.cursor = 'pointer';
        initButton.style.fontWeight = 'bold';
        
        initButton.addEventListener('click', () => {
            initialize();
            initButton.textContent = 'Continuous Sound Active';
            initButton.disabled = true;
            
            // Change color to indicate active state
            initButton.style.backgroundColor = '#555555';
            
            // Add volume slider
            addVolumeControl();
            
            // Fade out button after 3 seconds
            setTimeout(() => {
                initButton.style.transition = 'opacity 1s';
                initButton.style.opacity = '0.3';
                
                // Restore on hover
                initButton.addEventListener('mouseenter', () => {
                    initButton.style.opacity = '1';
                });
                
                initButton.addEventListener('mouseleave', () => {
                    initButton.style.opacity = '0.3';
                });
            }, 3000);
        });
        
        document.body.appendChild(initButton);
        
        console.log("Continuous sound system ready. Click the button to activate.");
    }
    
    /**
     * Add volume control slider
     */
    function addVolumeControl() {
        const volumeControl = document.createElement('div');
        volumeControl.style.position = 'fixed';
        volumeControl.style.bottom = '60px';
        volumeControl.style.left = '20px';
        volumeControl.style.zIndex = '1000';
        volumeControl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        volumeControl.style.padding = '10px';
        volumeControl.style.borderRadius = '5px';
        volumeControl.style.width = '200px';
        
        // Label
        const label = document.createElement('div');
        label.textContent = 'Volume';
        label.style.color = 'white';
        label.style.marginBottom = '5px';
        label.style.textAlign = 'center';
        
        // Slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = state.volume * 100;
        slider.style.width = '100%';
        
        // Update volume when slider changes
        slider.addEventListener('input', () => {
            const newVolume = slider.value / 100;
            state.volume = newVolume;
            
            if (masterGain) {
                masterGain.gain.value = newVolume;
            }
        });
        
        // Add elements to control container
        volumeControl.appendChild(label);
        volumeControl.appendChild(slider);
        
        // Add to document
        document.body.appendChild(volumeControl);
        
        // Fade out volume control after 3 seconds
        setTimeout(() => {
            volumeControl.style.transition = 'opacity 1s';
            volumeControl.style.opacity = '0.3';
            
            // Restore on hover
            volumeControl.addEventListener('mouseenter', () => {
                volumeControl.style.opacity = '1';
            });
            
            volumeControl.addEventListener('mouseleave', () => {
                volumeControl.style.opacity = '0.3';
            });
        }, 3000);
    }
    
    // Initialize when the page loads
    if (document.readyState === 'complete') {
        initOnLoad();
    } else {
        window.addEventListener('load', initOnLoad);
    }
    
    // Make functions available globally
    window.continuousAudioSystem = {
        initialize,
        cleanup,
        setVolume: (volume) => {
            state.volume = volume;
            if (masterGain) masterGain.gain.value = volume;
        },
        isActive: () => state.isActive
    };
})();
