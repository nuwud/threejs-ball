/**
 * Facet Audio Fix
 * 
 * This module fixes issues with audio not responding to facet interactions
 * by directly connecting to ball events and ensuring proper initialization.
 */

// Track the last played facet to avoid repetition
let lastFacetIndex = -1;
let lastPlayTime = 0;
const MIN_TIME_BETWEEN_SOUNDS = 80; // Increased to prevent audio overload

// Debug options
const SHOW_DEBUG = true;
const FORCE_LOUD_VOLUME = false; // Set to false for more gentle sounds
const LOG_AUDIO_EVENTS = true;

// Sound customization
const USE_SOOTHING_TONES = true; // New flag for soothing tones

/**
 * Initialize the audio system and connect it to the ball
 */
export function initFacetAudio() {
    // Ensure we have the app object
    if (!window.app) {
        console.error("App not available for facet audio fix");
        return false;
    }
    
    console.log("Initializing facet audio fix with soothing tones...");
    
    // Create or get audio context
    if (!window.app.audioContext) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            window.app.audioContext = new AudioContext();
            console.log("Created new AudioContext for facet audio");
        } catch (error) {
            console.error("Failed to create AudioContext:", error);
            return false;
        }
    }
    
    // Add an indicator to show when sounds are playing
    // createAudioIndicator();
    
    // Create a test button that definitely plays a sound
    //createTestAudioButton();
    
    // Try to resume context immediately and on any user interaction
    resumeAudioContext();
    document.addEventListener('click', resumeAudioContext);
    document.addEventListener('keydown', resumeAudioContext);
    document.addEventListener('touchstart', resumeAudioContext);
    
    // Create master gain if needed
    if (!window.app.masterGain) {
        window.app.masterGain = window.app.audioContext.createGain();
        window.app.masterGain.gain.value = FORCE_LOUD_VOLUME ? 0.8 : 0.3; // Lower default volume
        window.app.masterGain.connect(window.app.audioContext.destination);
    }
    
    // Add direct event listeners for reliability
    addDirectEventListeners();
    
    // Hook into the raycaster check in main scene (as backup)
    hookIntoExistingEvents();
    
    console.log("Facet audio fix initialized successfully with soothing tones enabled");
    
    // Add message to confirm initialization
    showNotification("✅ Soothing Ball Audio Enabled");
    
    return true;
}

/**
 * Add direct event listeners for the most reliable detection
 */
function addDirectEventListeners() {
    // Add direct mouse move listener for redundancy
    document.addEventListener('mousemove', (event) => {
        // Don't process if we recently played a sound
        if (Date.now() - lastPlayTime < MIN_TIME_BETWEEN_SOUNDS) {
            return;
        }
        
        // Direct check for ball intersections
        checkBallIntersection(event);
    });
    
    // Add direct click listener for clear click sounds
    document.addEventListener('click', (event) => {
        if (window.app && checkBallIntersection(event, true)) {
            console.log("Direct click on ball detected");
            playClickSound();
        }
    });
    
    console.log("Direct event listeners added for ball interaction");
}

/**
 * Hook into existing events as backup approach
 */
function hookIntoExistingEvents() {
    // Hook into the raycaster check in main scene
    const originalOnPointerMove = window.app.onPointerMove;
    if (originalOnPointerMove) {
        window.app.onPointerMove = function(event) {
            // Call original function
            originalOnPointerMove(event);
            
            // Skip if we recently played a sound
            if (Date.now() - lastPlayTime < MIN_TIME_BETWEEN_SOUNDS) {
                return;
            }
            
            // Add our facet sound handling
            addFacetSoundHandling(event);
        };
        console.log("Hooked into pointer move events for facet audio");
    }
    
    // Also connect to pointer down for more obvious audio feedback
    const originalOnPointerDown = window.app.onPointerDown;
    if (originalOnPointerDown) {
        window.app.onPointerDown = function(event) {
            // Call original function
            originalOnPointerDown(event);
            
            // Play click sound
            playClickSound();
        };
    }
}

/**
 * Check for ball intersection directly
 * @param {MouseEvent} event - Mouse event
 * @param {boolean} isClick - Whether this is a click event
 * @returns {boolean} Whether intersection was found
 */
function checkBallIntersection(event, isClick = false) {
    if (!window.app || !window.app.raycaster || !window.app.camera || !window.app.ballMesh) {
        return false;
    }
    
    try {
        // Update raycaster with current mouse position
        const mouse = { 
            x: (event.clientX / window.innerWidth) * 2 - 1,
            y: -(event.clientY / window.innerHeight) * 2 + 1
        };
        
        window.app.raycaster.setFromCamera(mouse, window.app.camera);
        const intersects = window.app.raycaster.intersectObject(window.app.ballMesh);
        
        if (intersects.length > 0) {
            // If this is a click, don't process further
            if (isClick) return true;
            
            const facetIndex = intersects[0].faceIndex;
            
            // Safely handle position data - fix the toFixed error
            let position = { u: 0.5, v: 0.5 };
            
            // Only try to access uv if it exists
            if (intersects[0].uv) {
                position = {
                    u: typeof intersects[0].uv.x === 'number' ? intersects[0].uv.x : 0.5,
                    v: typeof intersects[0].uv.y === 'number' ? intersects[0].uv.y : 0.5
                };
            }
            
            // Only play sound if it's a different facet or enough time has passed
            const now = Date.now();
            if (facetIndex !== lastFacetIndex || now - lastPlayTime > MIN_TIME_BETWEEN_SOUNDS) {
                // Log the facet detection safely
                // console.log(`Ball facet ${facetIndex} detected at position (${position.u.toFixed(2)}, ${position.v.toFixed(2)})`);
                
                // Play facet sound
                playSoothingFacetSound(facetIndex, position);
                
                // Update tracking
                lastFacetIndex = facetIndex;
                lastPlayTime = now;
                
                return true;
            }
        }
    } catch (error) {
        console.error("Error checking ball intersection:", error);
    }
    
    return false;
}

/**
 * Handle facet sound during mouse movement
 */
function addFacetSoundHandling(event) {
    // Skip if we've already confirmed the audio context is not running
    if (!window.app || !window.app.audioContext || 
        window.app.audioContext.state !== 'running' || 
        !window.app.raycaster || !window.app.camera || !window.app.ballMesh) {
        return;
    }
    
    // Check for ball intersection
    checkBallIntersection(event);
}

/**
 * Play a soothing sound for a facet using gentler oscillators and filters
 */
function playSoothingFacetSound(facetIndex, position) {
    // Get audio context from app
    const app = window.app;
    if (!app || !app.audioContext) return;
    
    // Check if the context is running, and try to resume if not
    if (app.audioContext.state !== 'running') {
        resumeAudioContext();
        return; // Don't try to play if not running yet
    }
    
    try {
        // if (LOG_AUDIO_EVENTS) {
        //     console.log(`Playing soothing sound for facet ${facetIndex}`);
        // }
        
        flashAudioIndicator('blue');
        
        // Create musical notes based on a pentatonic scale (pleasant, no dissonance)
        const pentatonicScale = [0, 2, 4, 7, 9, 12, 14, 16]; // Intervals in semitones
        const noteIndex = facetIndex % pentatonicScale.length;
        const octave = Math.floor(facetIndex / pentatonicScale.length) % 3;
        
        // Base frequency on A4 (440 Hz) and calculate from there
        const baseFreq = 220 * Math.pow(2, octave); // A3, A4, or A5 depending on octave
        const semitoneRatio = Math.pow(2, 1/12);
        const frequency = baseFreq * Math.pow(semitoneRatio, pentatonicScale[noteIndex]);
        
        // Vary frequency slightly based on position for subtlety
        const freqVariation = 5 * (position.u - 0.5);
        const finalFrequency = frequency + freqVariation;
        
        // Create audio nodes for a more pleasant sound
        const oscillator = app.audioContext.createOscillator();
        const filter = app.audioContext.createBiquadFilter();
        const gain = app.audioContext.createGain();
        
        // Use gentler waveforms for a more soothing sound
        const oscillatorTypes = ['sine', 'sine', 'triangle', 'sine'];
        oscillator.type = oscillatorTypes[facetIndex % oscillatorTypes.length];
        oscillator.frequency.value = finalFrequency;
        
        // Add minor detune for a more organic sound
        const detune = (position.v - 0.5) * 20; // Very subtle detuning (-10 to +10 cents)
        oscillator.detune.value = detune;
        
        // Configure filter for a soft sound
        filter.type = 'lowpass';
        filter.frequency.value = 2000 + 2000 * position.v; // Brighter toward the top
        filter.Q.value = 1; // Not too resonant
        
        // Set up gain for envelope
        gain.gain.value = 0;
        
        // Connect the audio processing chain
        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(app.masterGain || app.audioContext.destination);
        
        // Start oscillator
        oscillator.start();
        
        // Apply gentle envelope for a soothing sound
        const now = app.audioContext.currentTime;
        const volume = 0.15; // Gentler volume
        
        // Soft attack (15ms)
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.015);
        
        // Sustain briefly
        gain.gain.setValueAtTime(volume, now + 0.05);
        
        // Gradual release (250ms)
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        
        // Stop and clean up
        setTimeout(() => {
            try {
                oscillator.stop();
                oscillator.disconnect();
                filter.disconnect();
                gain.disconnect();
            } catch (e) {
                // Ignore cleanup errors
            }
        }, 350); // Slightly longer than the envelope to ensure clean cutoff
    } catch (error) {
        console.error("Error playing soothing facet sound:", error);
        flashAudioIndicator('red');
    }
}

/**
 * Play a sound directly using the Web Audio API for a facet
 * This bypasses all the complex systems and directly creates a sound
 */
function playDirectFacetSound(facetIndex, position) {
    // If soothing tones are enabled, use that instead
    if (USE_SOOTHING_TONES) {
        return playSoothingFacetSound(facetIndex, position);
    }
    
    // Get audio context from app
    const app = window.app;
    if (!app || !app.audioContext) return;
    
    // Check if the context is running, and try to resume if not
    if (app.audioContext.state !== 'running') {
        resumeAudioContext();
        return; // Don't try to play if not running yet
    }
    
    try {
        if (LOG_AUDIO_EVENTS) {
            console.log(`Playing facet sound for facet ${facetIndex}`);
        }
        
        flashAudioIndicator('blue');
        
        // Base frequency on facet index for musical variety
        const baseFreq = 220 + (facetIndex % 12) * 50;
        
        // Vary frequency based on position within facet
        const freqVariation = 30 * (position.u - 0.5);
        const frequency = baseFreq + freqVariation;
        
        // Create oscillators - using basic approach
        const oscillator = app.audioContext.createOscillator();
        const gain = app.audioContext.createGain();
        
        // Set oscillator parameters
        const oscillatorTypes = ['sine', 'triangle', 'square', 'sawtooth'];
        oscillator.type = oscillatorTypes[facetIndex % oscillatorTypes.length];
        oscillator.frequency.value = frequency;
        
        // Add detune based on facet index
        const detune = (facetIndex * 7) % 100 - 50;
        oscillator.detune.value = detune;
        
        // Set up gain - louder for testing if needed
        gain.gain.value = 0;
        
        // Connect to audio context
        oscillator.connect(gain);
        gain.connect(app.audioContext.destination); // Connect directly to destination
        
        // Start oscillator
        oscillator.start();
        
        // Apply envelope - simpler and more dramatic for testing
        const now = app.audioContext.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(FORCE_LOUD_VOLUME ? 0.3 : 0.15, now + 0.005);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        
        // Stop and clean up
        setTimeout(() => {
            try {
                oscillator.stop();
                oscillator.disconnect();
                gain.disconnect();
            } catch (e) {
                // Ignore cleanup errors
            }
        }, 200);
    } catch (error) {
        console.error("Error playing facet sound:", error);
        flashAudioIndicator('red');
    }
}

/**
 * Play a gentle click sound
 */
function playClickSound() {
    const app = window.app;
    if (!app || !app.audioContext) return;
    
    // Check if the context is running, and try to resume if not
    if (app.audioContext.state !== 'running') {
        resumeAudioContext();
        return; // Don't try to play if not running yet
    }
    
    try {
        // if (LOG_AUDIO_EVENTS) {
        //     console.log("Playing click sound");
        // }
        
        flashAudioIndicator('green');
        
        // Create audio nodes for a more pleasant click
        const oscillator = app.audioContext.createOscillator();
        const filter = app.audioContext.createBiquadFilter();
        const gain = app.audioContext.createGain();
        
        // Configure for a soft click
        oscillator.type = 'triangle'; // Softer than square wave
        oscillator.frequency.value = 440; // A4, more musical
        
        // Add filter for a softer sound
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;
        
        gain.gain.value = 0;
        
        // Connect
        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(app.masterGain || app.audioContext.destination);
        
        oscillator.start();
        
        // Quick but not harsh envelope
        const now = app.audioContext.currentTime;
        const volume = FORCE_LOUD_VOLUME ? 0.35 : 0.2;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        // Stop and clean up
        setTimeout(() => {
            try {
                oscillator.stop();
                oscillator.disconnect();
                filter.disconnect();
                gain.disconnect();
            } catch (e) {
                // Ignore cleanup errors
            }
        }, 200);
    } catch (error) {
        console.error("Error playing click sound:", error);
        flashAudioIndicator('red');
    }
}

/**
 * Resume the audio context to overcome browser autoplay restrictions
 */
function resumeAudioContext() {
    if (window.app && window.app.audioContext) {
        if (window.app.audioContext.state === 'suspended') {
            window.app.audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully");
                flashAudioIndicator('green');
                
                // Play a very short "silent" sound to fully activate audio
                const oscillator = window.app.audioContext.createOscillator();
                const gain = window.app.audioContext.createGain();
                gain.gain.value = 0.01; // Very quiet
                oscillator.connect(gain);
                gain.connect(window.app.audioContext.destination);
                oscillator.start();
                oscillator.stop(window.app.audioContext.currentTime + 0.01);
            }).catch(error => {
                console.error("Failed to resume AudioContext:", error);
                flashAudioIndicator('red');
            });
        } else {
            if (LOG_AUDIO_EVENTS) {
                console.log("AudioContext already running");
            }
        }
    }
}

/**
 * Create a visual indicator for audio events
 */
/*
function createAudioIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'audio-indicator';
    indicator.style.position = 'fixed';
    indicator.style.top = '10px';
    indicator.style.right = '10px';
    indicator.style.width = '20px';
    indicator.style.height = '20px';
    indicator.style.borderRadius = '50%';
    indicator.style.backgroundColor = '#555';
    indicator.style.zIndex = '9999';
    indicator.style.transition = 'background-color 0.2s';
    
    const status = document.createElement('div');
    status.id = 'audio-status';
    status.style.position = 'fixed';
    status.style.top = '12px';
    status.style.right = '40px';
    status.style.color = 'white';
    status.style.fontSize = '14px';
    status.style.fontFamily = 'monospace';
    status.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    status.style.padding = '2px 8px';
    status.style.borderRadius = '4px';
    status.style.zIndex = '9999';
    status.textContent = 'Audio: Initializing';
    
    document.body.appendChild(indicator);
    document.body.appendChild(status);
}
*/

/**
 * Flash the audio indicator to show activity
 */
function flashAudioIndicator(color) {
    if (!SHOW_DEBUG) return;
    
    const indicator = document.getElementById('audio-indicator');
    if (!indicator) return;
    
    // Store original color
    const originalColor = indicator.style.backgroundColor;
    
    // Set new color
    indicator.style.backgroundColor = color;
    
    // Reset after short delay
    setTimeout(() => {
        if (window.app && window.app.audioContext) {
            if (window.app.audioContext.state === 'running') {
                indicator.style.backgroundColor = 'green';
            } else if (window.app.audioContext.state === 'suspended') {
                indicator.style.backgroundColor = 'orange';
            } else {
                indicator.style.backgroundColor = 'red';
            }
        } else {
            indicator.style.backgroundColor = originalColor;
        }
    }, 100);
}

/**
 * Create a test button to play a definite sound
 */
// function createTestAudioButton() {
//     if (!SHOW_DEBUG) return;
    
//     // Create button
//     const button = document.createElement('button');
//     button.id = 'test-audio-button';
//     button.textContent = 'Test Audio';
//     button.style.position = 'fixed';
//     button.style.bottom = '10px';
//     button.style.right = '10px';
//     button.style.padding = '8px 16px';
//     button.style.backgroundColor = '#28a745';
//     button.style.color = 'white';
//     button.style.border = 'none';
//     button.style.borderRadius = '4px';
//     button.style.cursor = 'pointer';
//     button.style.zIndex = '9999';
    
//     // Add click event
//     button.addEventListener('click', () => {
//         resumeAudioContext();
        
//         // Play a definite sound regardless of other systems
//         const app = window.app;
//         if (app && app.audioContext) {
//             const ctx = app.audioContext;
            
//             try {
//                 // Create oscillator for a clear test tone
//                 const osc = ctx.createOscillator();
//                 const gain = ctx.createGain();
                
//                 osc.type = 'square';
//                 osc.frequency.value = 440; // A4 - clearly audible
                
//                 gain.gain.value = 0;
                
//                 osc.connect(gain);
//                 gain.connect(ctx.destination);
                
//                 osc.start();
                
//                 // Envelope
//                 const now = ctx.currentTime;
//                 gain.gain.setValueAtTime(0, now);
//                 gain.gain.linearRampToValueAtTime(0.5, now + 0.01); // Loud!
//                 gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
                
//                 // Cleanup
//                 setTimeout(() => {
//                     try {
//                         osc.stop();
//                         osc.disconnect();
//                         gain.disconnect();
//                     } catch (e) {
//                         // Ignore
//                     }
//                 }, 1100);
                
//                 // Update button to show success
//                 button.textContent = 'Sound Played!';
//                 button.style.backgroundColor = '#28a745';
//                 setTimeout(() => {
//                     button.textContent = 'Test Audio';
//                 }, 2000);
                
//                 console.log("Test sound played successfully");
                
//             } catch (error) {
//                 console.error("Failed to play test sound:", error);
//                 button.textContent = 'Audio Failed';
//                 button.style.backgroundColor = '#dc3545';
//                 setTimeout(() => {
//                     button.textContent = 'Test Audio';
//                     button.style.backgroundColor = '#28a745';
//                 }, 2000);
//             }
//         }
//     });
    
//     // Add to document
//     document.body.appendChild(button);
// }

/**
 * Show a notification message
 */
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '50%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.padding = '15px 25px';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = '#3aff8a';
    notification.style.borderRadius = '8px';
    notification.style.fontFamily = 'Arial, sans-serif';
    notification.style.fontSize = '18px';
    notification.style.fontWeight = 'bold';
    notification.style.zIndex = '10000';
    notification.style.textAlign = 'center';
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Fade in
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.style.opacity = '1', 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 500);
    }, 2000);
}

// Initialize automatically but with a longer delay to ensure app is ready
setTimeout(() => {
    if (window.app && !document.getElementById('audio-indicator')) {
        console.log("Initializing facet audio from timeout");
        initFacetAudio();
    }
}, 1000); // Increased to 1000ms

// Make available globally
window.initFacetAudio = initFacetAudio;
window.testAudio = () => {
    resumeAudioContext();
    playClickSound();
};
