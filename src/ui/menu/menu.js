/**
 * Interactive menu system for Three.js Ball
 */
class MenuSystem {
    constructor(app) {
        this.setApp(app);
    }

    setApp(app) {
        this.app = app;
        this.statusTimeout = null;
        this.initElements();
        this.attachEventListeners();
    }

    initElements() {
        this.hamburger = document.getElementById('hamburger');
        this.menu = document.getElementById('menu');
        this.volumeSlider = document.getElementById('volume-slider');
        this.audioToggle = document.getElementById('toggle-sound'); // Updated to match HTML
        this.testAudioBtn = document.getElementById('test-audio');
        
        // Log missing elements for debugging
        if (!this.audioToggle) console.warn('Audio toggle element not found (toggle-sound)');
        if (!this.testAudioBtn) console.warn('Test audio button not found (test-audio)');
        if (!this.volumeSlider) console.warn('Volume slider not found (volume-slider)');
    }

    attachEventListeners() {
        // Leave hamburger menu logic untouched - it works fine
        
        // Audio controls - updated to match HTML IDs
        const audioToggle = document.getElementById('toggle-sound');
        if (audioToggle) {
            audioToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.app.uiBridge.toggleAudio(enabled);
            });
        }

        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const level = e.target.value / 100;
                this.app.uiBridge.setVolume(level);
            });
        }

        // Test audio button
        const testAudioBtn = document.getElementById('test-audio');
        if (testAudioBtn) {
            testAudioBtn.addEventListener('click', () => {
                console.log('Test audio button clicked');
                this.playTestSound();
            });
        }

        // Ball controls
        const resetButton = document.getElementById('reset-ball');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                console.log('Reset ball button clicked');
                this.app.uiBridge.resetBall();
            });
        }

        const wireframeToggle = document.getElementById('toggle-wireframe');
        if (wireframeToggle) {
            wireframeToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.app.uiBridge.toggleWireframe(enabled);
            });
        }

        // Rainbow mode toggle
        const rainbowToggle = document.getElementById('toggle-rainbow');
        if (rainbowToggle) {
            rainbowToggle.addEventListener('change', (e) => {
                this.app.uiBridge?.toggleRainbowMode?.(e.target.checked);
            });
        }

        // Blackhole toggle
        const blackholeToggle = document.getElementById('toggle-blackhole');
        if (blackholeToggle) {
            blackholeToggle.addEventListener('change', (e) => {
                this.app.uiBridge?.toggleBlackholeEffect?.(e.target.checked);
            });
        }

        // Magnetic toggle
        const magneticToggle = document.getElementById('toggle-magnetic');
        if (magneticToggle) {
            magneticToggle.addEventListener('change', (e) => {
                this.app.uiBridge?.toggleMagneticMode?.(e.target.checked);
            });
        }

        // Plane visibility toggle
        const planeToggle = document.getElementById('toggle-plane');
        if (planeToggle) {
            planeToggle.addEventListener('change', (e) => {
                this.app.uiBridge?.togglePlaneVisibility?.(e.target.checked);
            });
        }

        // Special effects buttons
        const explosionBtn = document.getElementById('trigger-explosion');
        if (explosionBtn) {
            explosionBtn.addEventListener('click', () => {
                this.app.uiBridge?.createExplosion?.();
            });
        }

        const blackholeBtn = document.getElementById('trigger-blackhole');
        if (blackholeBtn) {
            blackholeBtn.addEventListener('click', () => {
                this.app.uiBridge.createBlackholeEffect();
            });
        }

        const magneticBtn = document.getElementById('trigger-magnetic');
        if (magneticBtn) {
            magneticBtn.addEventListener('click', () => {
                this.app.uiBridge.createMagneticEffect();
            });
        }

        // Audio visualization toggle
        const visualizationToggle = document.getElementById('toggle-visualization');
        if (visualizationToggle) {
            visualizationToggle.addEventListener('change', (e) => {
                this.app.uiBridge?.toggleAudioVisualization?.(e.target.checked);
            });
        }

        // Spikiness slider
        const spikinessSlider = document.getElementById('spikiness-slider');
        if (spikinessSlider) {
            spikinessSlider.addEventListener('input', (e) => {
                const value = e.target.value / 100 * 2; // Scale to 0-2 range
                if (this.app.uiBridge.setSpikiness) {
                    this.app.uiBridge.setSpikiness(value);
                }
            });
        }

        // Color inputs
        const innerColorInput = document.getElementById('inner-color');
        const middleColorInput = document.getElementById('middle-color');
        const outerColorInput = document.getElementById('outer-color');

        const updateColors = () => {
            if (this.app.updateGradientTexture) {
                this.app.updateGradientTexture(
                    innerColorInput.value,
                    middleColorInput.value,
                    outerColorInput.value
                );
            }
        };

        if (innerColorInput && middleColorInput && outerColorInput) {
            innerColorInput.addEventListener('input', updateColors);
            middleColorInput.addEventListener('input', updateColors);
            outerColorInput.addEventListener('input', updateColors);
        }

        // Set up menu open handler to sync toggle states
        if (this.menu && this.hamburger) {
            this.hamburger.addEventListener('click', () => {
                // Update toggle states when menu opens
                this.syncToggleStates();
            });
        }
    }

    // Enhanced syncToggleStates method for better two-way sync
    syncToggleStates() {
        if (!this.app.uiBridge) return;
        
        // Wireframe toggle
        const wireframeToggle = document.getElementById('toggle-wireframe');
        if (wireframeToggle && this.app.ballGroup?.userData?.wireMesh) {
            wireframeToggle.checked = this.app.ballGroup.userData.wireMesh.visible;
        }
        
        // Rainbow toggle
        const rainbowToggle = document.getElementById('toggle-rainbow');
        if (rainbowToggle) {
            rainbowToggle.checked = this.app.uiBridge.isRainbowMode;
        }
        
        // Audio toggle
        const audioToggle = document.getElementById('toggle-sound');
        if (audioToggle) {
            audioToggle.checked = this.app.uiBridge.isSoundEnabled;
        }
        
        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider && this.app.masterGain) {
            volumeSlider.value = this.app.masterGain.gain.value * 100;
        }
        
        // Audio visualization toggle
        const visualizationToggle = document.getElementById('toggle-visualization');
        if (visualizationToggle && this.app.audioVisualization) {
            visualizationToggle.checked = this.app.audioVisualization.enabled;
        }
        
        // Spikiness slider
        const spikinessSlider = document.getElementById('spikiness-slider');
        if (spikinessSlider && this.app.spikiness !== undefined) {
            spikinessSlider.value = this.app.spikiness * 50; // Convert from 0-2 range to 0-100
        }
        
        // Update color inputs
        const innerColorInput = document.getElementById('inner-color');
        const middleColorInput = document.getElementById('middle-color');
        const outerColorInput = document.getElementById('outer-color');
        
        try {
            // Try to fetch stored values from localStorage
            const innerColor = localStorage.getItem('ballInnerColor');
            const middleColor = localStorage.getItem('ballMiddleColor');
            const outerColor = localStorage.getItem('ballOuterColor');
            
            if (innerColor && innerColorInput) innerColorInput.value = innerColor;
            if (middleColor && middleColorInput) middleColorInput.value = middleColor;
            if (outerColor && outerColorInput) outerColorInput.value = outerColor;
        } catch (e) {
            console.warn('Could not access localStorage for color settings');
        }
    }

    playTestSound() {
        if (!this.app.audioContext) {
            console.warn('Audio context not available');
            return;
        }
        
        try {
            const ctx = this.app.audioContext;
            
            // If audio is suspended, try to resume it
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    console.log('AudioContext resumed, playing test sound');
                    this._createTestSound(ctx);
                }).catch(err => {
                    console.error('Failed to resume audio context:', err);
                });
            } else {
                this._createTestSound(ctx);
            }
        } catch (error) {
            console.error('Error playing test sound:', error);
        }
    }
    
    _createTestSound(ctx) {
        // Create oscillator for a pleasant test tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = 440; // A4 note
        
        gain.gain.value = 0.2;
        
        osc.connect(gain);
        gain.connect(this.app.masterGain || ctx.destination);
        
        // Simple envelope
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        osc.start();
        osc.stop(now + 0.6);
        
        console.log('Test sound played');
    }
}

// Expose MenuSystem globally for fallback in main.js
window.MenuSystem = MenuSystem;

// Initialize when DOM is loaded, but only if window.app is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.menuSystem = new MenuSystem(window.app);
        console.log('Menu system initialized');
    }
});

// Listen for 'sceneReady' event as a backup to DOMContentLoaded
window.addEventListener('sceneReady', () => {
    if (window.app) {
        window.menuSystem = new MenuSystem(window.app);
        console.log('Menu system initialized via sceneReady');
    }
});

function init() {
    // ...existing code...
    if (window.app.plane) window.app.plane.visible = false;
    // ...existing code...
}

// Define effectState before using it
const effectState = window.effectState || {};

setTimeout(() => {
    if (effectState.particleSystem) {
        app.scene.remove(effectState.particleSystem);
        effectState.particleSystem.geometry.dispose();
        effectState.particleSystem.material.dispose();
        effectState.particleSystem = null;
        if (app.ballGroup) app.ballGroup.visible = true; // Restore ball
        // ...existing code...
    }
}, 3000);
