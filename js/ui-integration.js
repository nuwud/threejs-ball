/**
 * UI Integration Module
 * Connects the new UI with the existing app functionality
 */

import { createEnhancedVisualization } from './audio-visualization.js';

/**
 * Initialize the new UI system
 * @param {Object} app - The application context
 */
export function initializeNewUI(app) {
    if (!app) {
        console.error('Cannot initialize UI: app object missing');
        return;
    }

    console.log('Initializing new UI system...');

    // Create enhanced visualization
    const visualization = createEnhancedVisualization(app);
    app.visualization = visualization;

    // Connect UI controls to functionality
    connectUIControls(app);

    // Check for settings in localStorage and apply them
    loadSettings(app);

    console.log('New UI system initialized');
}

/**
 * Connect UI controls to app functionality
 * @param {Object} app - The application context
 */
function connectUIControls(app) {
    // Ball controls
    connectToggleControl('toggle-wireframe', app, (checked) => {
        if (app.ballGroup?.userData?.wireMesh) {
            app.ballGroup.userData.wireMesh.visible = checked;
            return checked;
        }
        return false;
    });

    connectToggleControl('toggle-rainbow', app, (checked) => {
        if (app.isRainbowMode !== undefined) {
            app.isRainbowMode = checked;
            return checked;
        }
        return false;
    });

    connectToggleControl('toggle-spiky', app, (checked) => {
        if (app.isSpikyMode !== undefined) {
            app.isSpikyMode = checked;
            return checked;
        }
        return false;
    });

    connectToggleControl('toggle-facet', app, (checked) => {
        if (app.isFacetHighlighting !== undefined) {
            app.isFacetHighlighting = checked;
            return checked;
        }
        return false;
    });

    connectToggleControl('toggle-trail', app, (checked) => {
        if (app.isTrailEnabled !== undefined) {
            app.isTrailEnabled = checked;
            return checked;
        }
        return false;
    });

    // Audio controls
    connectToggleControl('toggle-audio', app, (checked) => {
        if (app.audioContext) {
            if (checked) {
                if (app.audioContext.state === 'suspended') {
                    app.audioContext.resume();
                }
            } else {
                if (app.audioContext.state === 'running') {
                    app.audioContext.suspend();
                }
            }
            return checked;
        }
        return false;
    });

    connectToggleControl('toggle-continuous', app, (checked) => {
        if (app.soundScheduler && app.soundScheduler.setContinuousMode) {
            app.soundScheduler.setContinuousMode(checked);
            return checked;
        }
        return false;
    });

    connectToggleControl('toggle-visualization', app, (checked) => {
        if (app.visualization) {
            app.visualization.active = checked;
            return checked;
        }
        return false;
    });

    // Volume slider
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider && app.soundManager) {
        volumeSlider.addEventListener('input', () => {
            const volume = volumeSlider.value / 100;
            if (app.soundManager.setVolume) {
                app.soundManager.setVolume(volume);
            }
            // Save to settings
            saveSettings(app);
        });
    }

    // Collapsible sections
    const collapsibleHeaders = document.querySelectorAll('.section-header');
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const expandIcon = header.querySelector('.expand-icon');

            // Toggle visibility
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                expandIcon.textContent = '+';
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
                expandIcon.textContent = '−';
            }
        });
    });

    // Handle special functions (reset ball, effects, etc.)
    handleSpecialFunctions(app);
}

/**
 * Connect a toggle input to app functionality
 * @param {string} id - Element ID for the toggle
 * @param {Object} app - The application context
 * @param {Function} handler - Function to call when toggle changes
 */
function connectToggleControl(id, app, handler) {
    const toggle = document.getElementById(id);
    if (!toggle) return;

    // Set initial state if available in app
    const initialState = getInitialState(id, app);
    if (initialState !== undefined) {
        toggle.checked = initialState;
    }

    // Add event listener
    toggle.addEventListener('change', () => {
        const result = handler(toggle.checked);
        // If handler returns a different value, update the toggle
        if (result !== undefined && result !== toggle.checked) {
            toggle.checked = result;
        }
        // Save settings
        saveSettings(app);
    });
}

/**
 * Get initial state for a toggle based on app state
 * @param {string} id - Toggle ID
 * @param {Object} app - The application context
 * @returns {boolean|undefined} Initial state or undefined
 */
function getInitialState(id, app) {
    switch (id) {
        case 'toggle-wireframe':
            return app.ballGroup?.userData?.wireMesh?.visible || false;
        case 'toggle-rainbow':
            return app.isRainbowMode || false;
        case 'toggle-spiky':
            return app.isSpikyMode || false;
        case 'toggle-facet':
            return app.isFacetHighlighting || false;
        case 'toggle-trail':
            return app.isTrailEnabled || false;
        case 'toggle-audio':
            return app.audioContext?.state !== 'suspended';
        case 'toggle-continuous':
            return app.soundScheduler?.continuousMode || false;
        case 'toggle-visualization':
            return false; // Start with visualization off
        default:
            return undefined;
    }
}

/**
 * Handle special function buttons
 * @param {Object} app - The application context
 */
function handleSpecialFunctions(app) {
    // Reset ball
    const resetBtn = document.getElementById('reset-ball');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (app.ballGroup) {
                app.ballGroup.position.set(0, 0, 0);
                app.ballGroup.rotation.set(0, 0, 0);
                app.ballGroup.scale.set(1, 1, 1);
                showStatus('Ball Reset to Default');
            }
        });
    }

    // Special effects buttons
    const effectButtons = {
        'magnetic-effect': () => {
            if (app.controls && app.controls.createMagneticEffect) {
                app.controls.createMagneticEffect();
                return 'Magnetic Effect Activated';
            }
            return null;
        },
        'blackhole-effect': () => {
            if (app.controls && app.controls.createBlackholeEffect) {
                app.controls.createBlackholeEffect();
                return 'Blackhole Effect Activated';
            }
            return null;
        },
        'explosion-effect': () => {
            if (app.controls && app.controls.createExplosion) {
                app.controls.createExplosion();
                return 'Explosion Effect Activated';
            }
            return null;
        },
        'test-audio': () => {
            if (app.soundManager && app.soundManager.playTestSound) {
                app.soundManager.playTestSound();
                return 'Test Sound Played';
            }
            return null;
        }
    };

    // Add event listeners to effect buttons
    Object.keys(effectButtons).forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => {
                const statusMessage = effectButtons[id]();
                if (statusMessage) {
                    showStatus(statusMessage);
                }
            });
        }
    });

    // Emergency and recovery controls
    const emergencyBtn = document.getElementById('emergency-ball');
    if (emergencyBtn && window.debugTools && window.debugTools.createEmergencyBall) {
        emergencyBtn.addEventListener('click', () => {
            window.debugTools.createEmergencyBall();
            showStatus('Emergency Ball Created');
        });
    }

    const recoveryBtn = document.getElementById('recovery-ball');
    if (recoveryBtn && window.createRecoveryBall) {
        recoveryBtn.addEventListener('click', () => {
            window.createRecoveryBall();
            showStatus('Recovery Ball Created');
        });
    }

    // Debug tools
    const debugAudioBtn = document.getElementById('debug-audio');
    if (debugAudioBtn && window.debugAudioSystem) {
        debugAudioBtn.addEventListener('click', () => {
            window.debugAudioSystem(app);
            showStatus('Audio Debug Activated');
        });
    }

    const debugPanelBtn = document.getElementById('show-debug-panel');
    if (debugPanelBtn && window.initDebug) {
        debugPanelBtn.addEventListener('click', () => {
            window.initDebug();
            showStatus('Debug Panel Shown');
        });
    }
}

/**
 * Show status message
 * @param {string} message - Status message to display
 */
function showStatus(message) {
    const statusElement = document.getElementById('status-message');
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.classList.add('visible');

    setTimeout(() => {
        statusElement.classList.remove('visible');
    }, 2000);
}

/**
 * Save current settings to localStorage
 * @param {Object} app - The application context
 */
function saveSettings(app) {
    try {
        const settings = {
            wireframe: document.getElementById('toggle-wireframe')?.checked || false,
            rainbow: document.getElementById('toggle-rainbow')?.checked || false,
            spiky: document.getElementById('toggle-spiky')?.checked || false,
            facet: document.getElementById('toggle-facet')?.checked || false,
            trail: document.getElementById('toggle-trail')?.checked || false,
            audio: document.getElementById('toggle-audio')?.checked || true,
            continuous: document.getElementById('toggle-continuous')?.checked || false,
            visualization: document.getElementById('toggle-visualization')?.checked || false,
            volume: document.getElementById('volume-slider')?.value || 70
        };

        localStorage.setItem('ballAppSettings', JSON.stringify(settings));
        console.log('Settings saved');
    } catch (e) {
        console.warn('Failed to save settings:', e);
    }
}

/**
 * Load settings from localStorage
 * @param {Object} app - The application context
 */
function loadSettings(app) {
    try {
        const settingsJson = localStorage.getItem('ballAppSettings');
        if (!settingsJson) return;

        const settings = JSON.parse(settingsJson);

        // Apply settings to toggles
        if (settings.wireframe !== undefined) {
            const toggle = document.getElementById('toggle-wireframe');
            if (toggle) {
                toggle.checked = settings.wireframe;
                toggle.dispatchEvent(new Event('change'));
            }
        }

        if (settings.rainbow !== undefined) {
            const toggle = document.getElementById('toggle-rainbow');
            if (toggle) {
                toggle.checked = settings.rainbow;
                toggle.dispatchEvent(new Event('change'));
            }
        }

        if (settings.spiky !== undefined) {
            const toggle = document.getElementById('toggle-spiky');
            if (toggle) {
                toggle.checked = settings.spiky;
                toggle.dispatchEvent(new Event('change'));
            }
        }

        if (settings.facet !== undefined) {
            const toggle = document.getElementById('toggle-facet');
            if (toggle) {
                toggle.checked = settings.facet;
                toggle.dispatchEvent(new Event('change'));
            }
        }

        if (settings.trail !== undefined) {
            const toggle = document.getElementById('toggle-trail');
            if (toggle) {
                toggle.checked = settings.trail;
                toggle.dispatchEvent(new Event('change'));
            }
        }

        if (settings.audio !== undefined) {
            const toggle = document.getElementById('toggle-audio');
            if (toggle) {
                toggle.checked = settings.audio;
                toggle.dispatchEvent(new Event('change'));
            }
        }

        if (settings.continuous !== undefined) {
            const toggle = document.getElementById('toggle-continuous');
            if (toggle) {
                toggle.checked = settings.continuous;
                toggle.dispatchEvent(new Event('change'));
            }
        }

        if (settings.visualization !== undefined) {
            const toggle = document.getElementById('toggle-visualization');
            if (toggle) {
                toggle.checked = settings.visualization;
                toggle.dispatchEvent(new Event('change'));
            }
        }

        if (settings.volume !== undefined) {
            const slider = document.getElementById('volume-slider');
            if (slider) {
                slider.value = settings.volume;
                slider.dispatchEvent(new Event('input'));
            }
        }

        console.log('Settings loaded');
    } catch (e) {
        console.warn('Failed to load settings:', e);
    }
}

// Export the initialization function
export default initializeNewUI;