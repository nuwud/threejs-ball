// ...existing code...

function ensureAudioInitialized() {
    // Prevent multiple initializations
    if (app.audioInitialized) {
        console.log("Audio already initialized, skipping");
        return;
    }
    
    try {
        // Create audio context first
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn("AudioContext not supported in this browser");
            return;
        }
        
        app.audioContext = new AudioContext();
        
        // Setup synth with our context
        setupAudio();
        
        // Only setup analyzer if audio initialized successfully
        if (app.synthesizer) {
            setupAudioAnalyzer();
        }
        
        app.audioInitialized = true;
        console.log("Audio system initialized successfully");
    } catch (error) {
        console.error("Failed to initialize audio:", error);
        // Set an error flag to prevent further attempts
        app.audioInitializationFailed = true;
    }
}

// Add a global audio safety layer - wrap all audio calls to handle errors
function safePlaySound(soundFunction, ...args) {
    try {
        if (!app.synthesizer || !app.audioInitialized || app.audioInitializationFailed) {
            return null;
        }
        
        // Use Function.prototype.apply to handle method calls
        return app.synthesizer[soundFunction].apply(app.synthesizer, args);
    } catch (error) {
        console.warn(`Error in safePlaySound(${soundFunction}):`, error);
        
        // Try to recover
        if (app.synthesizer && typeof app.synthesizer.enterRecoveryMode === 'function') {
            app.synthesizer.enterRecoveryMode();
        }
        
        return null;
    }
}

// Replace your direct calls to synthesizer with this safer version
// For example, instead of app.synthesizer.playWarmPad(440, 0.3), use:
// safePlaySound('playWarmPad', 440, 0.3);

// Add a way to handle and recover from audio errors
function setupAudioErrorHandling() {
    // Global error handler for unhandled audio errors
    window.addEventListener('error', function(event) {
        // Check if error relates to audio
        const errorStr = event.message || '';
        if (errorStr.includes('audio') || 
            errorStr.includes('AudioContext') || 
            errorStr.includes('AudioNode')) {
            
            console.error('Audio-related error caught:', event.message);
            
            // Trigger recovery mode
            if (app.synthesizer && typeof app.synthesizer.enterRecoveryMode === 'function') {
                app.synthesizer.enterRecoveryMode();
            }
            
            // Prevent default handling
            event.preventDefault();
        }
    });
    
    // Setup periodic health check
    setInterval(() => {
        if (app.synthesizer && app.audioContext) {
            // Check if context is still functioning
            if (app.audioContext.state === 'running') {
                // Check for leaking audio nodes (too many active sources)
                if (app.synthesizer.activeSources.size > 30) {
                    console.warn('Potential audio node leak detected, cleaning up');
                    app.synthesizer.emergencyCleanup();
                }
            } else if (app.audioContext.state === 'suspended') {
                // Auto-resume suspended context
                app.audioContext.resume().catch(e => {
                    console.warn('Failed to auto-resume audio context:', e);
                });
            }
        }
    }, 5000);
}

function setupAudio() {
    try {
        // Create synthesizer with existing context
        app.synthesizer = new SoundSynthesizer(app.audioContext);
        
        // Enable debug in development
        if (process.env.NODE_ENV !== 'production') {
            app.synthesizer.setDebugMode(true);
            setupAudioDebug();
        }
        
        // Test audio system with a gentle sound
        setTimeout(() => {
            if (app.synthesizer) {
                // Play a very quiet test sound to ensure everything works
                const testSound = app.synthesizer.playWarmPad(440, 0.3);
                // Fade it out quickly
                setTimeout(() => testSound.triggerRelease(), 200);
            }
        }, 500);
        
        // Add error handling
        setupAudioErrorHandling();
        
    } catch (error) {
        console.error("Error setting up audio synthesizer:", error);
        throw error; // Re-throw to be caught by ensureAudioInitialized
    }
}

function initOnFirstClick() {
    // ...existing code...
    
    // Only initialize audio if not already initialized or failed
    if (!app.audioInitialized && !app.audioInitializationFailed) {
        ensureAudioInitialized();
    }
    
    // ...existing code...
}

// Add a safety check function
function safePlaySound(soundFunction, ...args) {
    try {
        if (app.synthesizer && app.audioInitialized && !app.audioInitializationFailed) {
            return app.synthesizer[soundFunction](...args);
        }
    } catch (error) {
        console.warn(`Error playing ${soundFunction}:`, error);
    }
    return null;
}

// ...existing code...
