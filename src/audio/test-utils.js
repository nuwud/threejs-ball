/**
 * Audio Test Utilities
 * Provides tools for testing and debugging audio functionality
 */

/**
 * Test all audio functionality
 * @param {Object} app - The application context
 * @returns {Object} Test results
 */
export function testAllAudioFunctions(app = window.app) {
    if (!app) {
        console.error("No app object available for testing");
        return { success: false, message: "No app object available" };
    }
    
    const results = {
        audioContext: false,
        masterGain: false,
        soundSynth: false,
        soundManager: false,
        playFacet: false,
        playClick: false
    };
    
    console.log("Beginning comprehensive audio system test...");
    
    // Test audio context
    if (app.audioContext) {
        results.audioContext = true;
        console.log(`✅ Audio context found (state: ${app.audioContext.state})`);
        
        // Try to resume if suspended
        if (app.audioContext.state === 'suspended') {
            app.audioContext.resume().then(() => {
                console.log("Audio context resumed for testing");
            }).catch(err => {
                console.warn("Could not resume audio context:", err);
            });
        }
    } else {
        console.log("❌ No audio context found");
    }
    
    // Test master gain
    if (app.masterGain) {
        results.masterGain = true;
        console.log("✅ Master gain node found");
    } else {
        console.log("❌ No master gain node found");
    }
    
    // Test sound synthesizer
    if (app.soundSynth) {
        results.soundSynth = true;
        console.log("✅ Sound synthesizer found");
        
        // Test synthesizer functions
        try {
            if (typeof app.soundSynth.createTone === 'function') {
                app.soundSynth.createTone({
                    frequency: 440,
                    volume: 0.3,
                    duration: 0.3
                });
                console.log("✅ Synthesizer createTone function works");
            } else {
                console.log("❌ Synthesizer createTone function not found");
            }
            
            if (typeof app.soundSynth.playClickSound === 'function') {
                app.soundSynth.playClickSound();
                console.log("✅ Synthesizer playClickSound function works");
                results.playClick = true;
            } else {
                console.log("❌ Synthesizer playClickSound function not found");
            }
            
            if (typeof app.soundSynth.playFacetSound === 'function') {
                app.soundSynth.playFacetSound(0, { u: 0.5, v: 0.5 });
                console.log("✅ Synthesizer playFacetSound function works");
                results.playFacet = true;
            } else {
                console.log("❌ Synthesizer playFacetSound function not found");
            }
        } catch (error) {
            console.error("Error testing synthesizer functions:", error);
        }
    } else {
        console.log("❌ No sound synthesizer found");
    }
    
    // Test global audio functions
    console.log("Testing global audio functions...");
    
    if (typeof window.playClickSound === 'function') {
        console.log("✅ Global playClickSound function found");
        window.playClickSound(app);
        results.playClick = true;
    } else {
        console.log("❌ Global playClickSound function not found");
    }
    
    if (typeof window.playFacetSound === 'function') {
        console.log("✅ Global playFacetSound function found");
        window.playFacetSound(app, 0, { u: 0.5, v: 0.5 });
        results.playFacet = true;
    } else {
        console.log("❌ Global playFacetSound function not found");
    }
    
    return {
        success: Object.values(results).some(result => result),
        results: results,
        message: "Audio system test complete"
    };
}

/**
 * Create a simple UI for testing audio
 */
export function createAudioTestUI() {
    // Create container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';
    container.style.zIndex = '9999';
    container.style.color = '#00ff00';
    container.style.fontFamily = 'monospace';
    
    // Create buttons
    const buttons = [
        { label: 'Test Audio', func: () => testAllAudioFunctions() },
        { label: 'Play Click', func: () => window.playClickSound && window.playClickSound(window.app) },
        { label: 'Play Facet', func: () => window.playFacetSound && window.playFacetSound(window.app, 0, { u: 0.5, v: 0.5 }) },
        { label: 'Resume Context', func: () => window.app?.audioContext?.resume() }
    ];
    
    // Add buttons
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.label;
        button.style.margin = '5px';
        button.style.padding = '5px 10px';
        button.style.backgroundColor = '#333';
        button.style.color = '#00ff00';
        button.style.border = '1px solid #555';
        button.style.borderRadius = '3px';
        button.style.cursor = 'pointer';
        
        button.addEventListener('click', btn.func);
        container.appendChild(button);
    });
    
    // Add log area
    const log = document.createElement('div');
    log.style.marginTop = '10px';
    log.style.height = '100px';
    log.style.overflow = 'auto';
    log.style.backgroundColor = '#111';
    log.style.padding = '5px';
    log.style.borderRadius = '3px';
    log.textContent = 'Audio test log will appear here...';
    
    container.appendChild(log);
    
    // Override console.log for this context
    const originalLog = console.log;
    console.log = function(...args) {
        originalLog.apply(console, args);
        log.innerHTML += '<br>' + args.join(' ');
        log.scrollTop = log.scrollHeight;
    };
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.style.backgroundColor = '#f00';
    closeButton.style.color = '#fff';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '3px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.width = '20px';
    closeButton.style.height = '20px';
    closeButton.style.lineHeight = '20px';
    closeButton.style.textAlign = 'center';
    closeButton.style.padding = '0';
    
    closeButton.addEventListener('click', () => {
        document.body.removeChild(container);
        console.log = originalLog;
    });
    
    container.appendChild(closeButton);
    
    // Add to document
    document.body.appendChild(container);
    
    return container;
}

// Make global for direct console access
window.testAudio = testAllAudioFunctions;
window.showAudioTestUI = createAudioTestUI;
