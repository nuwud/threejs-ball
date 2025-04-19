/**
 * Direct Ball Audio
 * 
 * A simplified, direct approach to play sounds when interacting with the ball
 * without relying on complex event systems or architecture.
 */

(function() {
    // Simple, direct audio connection to the ball
    console.log("🎵 Loading Direct Ball Audio");
    
    // Audio context
    let audioContext = null;
    let masterGain = null;
    
    // Track last played sound time to prevent overloading
    let lastSoundTime = 0;
    const MIN_TIME_BETWEEN_SOUNDS = 80; // ms
    
    // Initialize with clearer logging
    function initAudio() {
        try {
            console.log("🎵 Initializing direct ball audio...");
            
            // Create audio context if not already available
            audioContext = window.app?.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain
            masterGain = audioContext.createGain();
            masterGain.gain.value = 0.5; // 50% volume
            masterGain.connect(audioContext.destination);
            
            // Store in app object if available
            if (window.app) {
                window.app.audioContext = window.app.audioContext || audioContext;
                window.app.masterGain = window.app.masterGain || masterGain;
            }
            
            // Wire up ball events directly
            connectToBall();
            
            console.log("🎵 Direct ball audio initialized");
            
            // Add a visual indicator to show audio is active
            //showAudioStatus("Audio Ready", "#00FF00");
            
            return true;
        } catch (error) {
            console.error("❌ Error initializing direct ball audio:", error);
            return false;
        }
    }
    
    // Connect directly to the ball object
    function connectToBall() {
        // Wait for app.ballMesh to be available
        if (!window.app || !window.app.ballMesh) {
            console.log("🎵 Waiting for ball to be ready...");
            setTimeout(connectToBall, 500);
            return;
        }
        
        console.log("🎵 Ball is ready, connecting audio...");
        
        // 1. Hook directly into onPointerMove
        const originalOnPointerMove = window.app.onPointerMove;
        window.app.onPointerMove = function(event) {
            // Call original handler
            if (originalOnPointerMove) {
                originalOnPointerMove(event);
            }
            
            // Only proceed if we're hovering over the ball
            if (window.app.isHovered) {
                handleBallSound(event);
            }
        };
        
        // 2. Hook into onPointerDown for click sounds
        const originalOnPointerDown = window.app.onPointerDown;
        window.app.onPointerDown = function(event) {
            // Call original handler
            if (originalOnPointerDown) {
                originalOnPointerDown(event);
            }
            
            // Play click sound if hovering over ball
            if (window.app.isHovered) {
                playClickSound();
            }
        };
        
        console.log("🎵 Successfully connected to ball events");
    }
    
    // Direct raycasting to determine facet sound
    function handleBallSound(event) {
        if (!audioContext || !window.app.ballMesh || !window.app.raycaster || !window.app.camera) {
            return;
        }
        
        // Skip if it's too soon since last sound
        const now = Date.now();
        if (now - lastSoundTime < MIN_TIME_BETWEEN_SOUNDS) {
            return;
        }
        
        try {
            // Get normalized coordinates
            const mouse = {
                x: (event.clientX / window.innerWidth) * 2 - 1,
                y: -(event.clientY / window.innerHeight) * 2 + 1
            };
            
            // Update raycaster
            window.app.raycaster.setFromCamera(mouse, window.app.camera);
            
            // Check for intersections
            const intersects = window.app.raycaster.intersectObject(window.app.ballMesh);
            
            if (intersects.length > 0) {
                // Get facet index
                const facetIndex = intersects[0].faceIndex || 0;
                
                // Play a sound
                playFacetSound(facetIndex);
                
                // Update last played time
                lastSoundTime = now;
                
                // Flash the audio indicator
                flashAudioIndicator("#0000FF");
            }
        } catch (error) {
            console.error("❌ Error in ball sound handler:", error);
        }
    }
    
    // Play a simple facet sound directly
    function playFacetSound(facetIndex) {
        if (!audioContext) return;
        
        try {
            // Resume context if suspended
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Simple musical mapping using pentatonic scale (pleasant sound)
            const pentatonic = [0, 2, 4, 7, 9]; // Pentatonic scale intervals
            const note = pentatonic[facetIndex % pentatonic.length];
            const octave = Math.floor(facetIndex / pentatonic.length) % 3;
            
            // Calculate base frequency (A4 = 440Hz)
            const frequency = 220 * Math.pow(2, octave) * Math.pow(2, note/12);
            
            // Create oscillator and gain node
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Set oscillator parameters
            oscillator.type = ['sine', 'triangle', 'sine', 'triangle'][facetIndex % 4]; // Mostly smooth waves
            oscillator.frequency.value = frequency;
            
            // Create filter for warmer sound
            const filter = audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 2000;
            
            // Connect nodes
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain || audioContext.destination);
            
            // Set initial gain to zero to prevent clicks
            gainNode.gain.value = 0;
            
            // Start oscillator
            oscillator.start();
            
            // Apply gentle envelope for a softer sound
            const now = audioContext.currentTime;
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02); // Fast attack
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3); // Gradual decay
            
            // Clean up after sound ends
            setTimeout(() => {
                try {
                    oscillator.stop();
                    oscillator.disconnect();
                    filter.disconnect();
                    gainNode.disconnect();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, 350);
            
            console.log(`🎵 Played facet sound for facet ${facetIndex}`);
            return true;
        } catch (error) {
            console.error("❌ Error playing facet sound:", error);
            return false;
        }
    }
    
    // Play a distinct click sound
    function playClickSound() {
        if (!audioContext) return;
        
        try {
            // Resume context if suspended
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Create oscillator and gain node
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Set oscillator parameters
            oscillator.type = 'triangle';
            oscillator.frequency.value = 880; // Higher frequency for click
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(masterGain || audioContext.destination);
            
            // Set initial gain to zero
            gainNode.gain.value = 0;
            
            // Start oscillator
            oscillator.start();
            
            // Apply click envelope
            const now = audioContext.currentTime;
            gainNode.gain.linearRampToValueAtTime(0.5, now + 0.001); // Very fast attack
            gainNode.gain.linearRampToValueAtTime(0, now + 0.1); // Short decay
            
            // Clean up
            setTimeout(() => {
                try {
                    oscillator.stop();
                    oscillator.disconnect();
                    gainNode.disconnect();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, 150);
            
            console.log("🎵 Played click sound");
            flashAudioIndicator("#00FF00");
            return true;
        } catch (error) {
            console.error("❌ Error playing click sound:", error);
            return false;
        }
    }
    
    // Create visual indicator for audio status
    function createAudioIndicator() {
        // Don't create if already exists
        if (document.getElementById('direct-audio-indicator')) return;
        
        // Create indicator
        const indicator = document.createElement('div');
        indicator.id = 'direct-audio-indicator';
        indicator.style.position = 'fixed';
        indicator.style.top = '10px';
        indicator.style.right = '10px';
        indicator.style.width = '20px';
        indicator.style.height = '20px';
        indicator.style.borderRadius = '50%';
        indicator.style.backgroundColor = '#555';
        indicator.style.zIndex = '10000';
        indicator.style.transition = 'background-color 0.2s';
        indicator.style.border = '2px solid white';
        indicator.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
        
        document.body.appendChild(indicator);
        
        // Add status text
        const status = document.createElement('div');
        status.id = 'direct-audio-status';
        status.style.position = 'fixed';
        status.style.top = '10px';
        status.style.right = '40px';
        status.style.color = 'white';
        status.style.fontSize = '14px';
        status.style.fontFamily = 'monospace';
        status.style.backgroundColor = 'rgba(0,0,0,0.7)';
        status.style.padding = '2px 8px';
        status.style.borderRadius = '4px';
        status.style.zIndex = '10000';
        
        document.body.appendChild(status);
        
        return indicator;
    }
    
    // Update audio indicator color
    function flashAudioIndicator(color) {
        let indicator = document.getElementById('direct-audio-indicator');
        
        if (!indicator) {
            indicator = createAudioIndicator();
        }
        
        // Store original color
        const originalColor = indicator.style.backgroundColor;
        
        // Flash new color
        indicator.style.backgroundColor = color;
        
        // Return to original after a short delay
        setTimeout(() => {
            if (audioContext) {
                if (audioContext.state === 'running') {
                    indicator.style.backgroundColor = '#00FF00';
                } else {
                    indicator.style.backgroundColor = '#FF0000';
                }
            } else {
                indicator.style.backgroundColor = originalColor;
            }
        }, 200);
    }
    
    // Show audio status message
    function showAudioStatus(message, color = '#FFFFFF') {
        let status = document.getElementById('direct-audio-status');
        
        if (!status) {
            createAudioIndicator();
            status = document.getElementById('direct-audio-status');
        }
        
        if (status) {
            status.textContent = message;
            status.style.color = color;
        }
    }
    
    // Commenting out the test button creation
    /*
    // Create a test button
    function createTestButton() {
        // Don't create if already exists
        if (document.getElementById('test-direct-audio')) return;
        
        const button = document.createElement('button');
        button.id = 'test-direct-audio';
        button.textContent = 'Test Audio';
        button.style.position = 'fixed';
        button.style.bottom = '50px';
        button.style.right = '20px';
        button.style.zIndex = '10000';
        button.style.padding = '8px 16px';
        button.style.backgroundColor = '#3498db';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.fontWeight = 'bold';
        
        button.addEventListener('click', () => {
            // Try to resume audio context
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("🎵 AudioContext resumed");
                    showAudioStatus("Audio resumed", "#00FF00");
                }).catch(error => {
                    console.error("❌ Failed to resume audio context:", error);
                });
            }
            
            // Play test sound
            const result = playClickSound();
            
            // Update button text temporarily
            if (result) {
                button.textContent = 'Sound Played!';
                setTimeout(() => {
                    button.textContent = 'Test Audio';
                }, 1000);
            }
        });
        
        document.body.appendChild(button);
    }
    */
    
    // Try to initialize when page loads
    document.addEventListener('DOMContentLoaded', () => {
        console.log("🎵 DOM loaded, initializing audio...");
        setTimeout(() => {
            initAudio();
            // createTestButton();
        }, 1000);
    });
    
    // Also try to initialize immediately (in case DOM already loaded)
    if (document.readyState === 'complete') {
        console.log("🎵 Page already loaded, initializing audio...");
        setTimeout(() => {
            initAudio();
            // createTestButton();
        }, 1000);
    }
    
    // Make functions globally available for debugging
    window.directBallAudio = {
        init: initAudio,
        playClickSound: playClickSound,
        playFacetSound: playFacetSound
    };
})();
