// diagnostic.js - For troubleshooting problems with the app
console.log("Loading diagnostic tools...");

// Add this to your HTML for debugging
// <script src="js/diagnostic.js"></script>

// Create a diagnostics panel
function createDiagnosticPanel() {
    // Create panel container
    const panel = document.createElement('div');
    panel.id = 'diagnostic-panel';
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.width = '300px';
    panel.style.padding = '10px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    panel.style.color = '#00FF00';
    panel.style.border = '1px solid #00FF00';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.zIndex = '10000';
    panel.style.overflowY = 'auto';
    panel.style.maxHeight = '80vh';
    
    // Create header
    const header = document.createElement('div');
    header.textContent = 'Diagnostics';
    header.style.borderBottom = '1px solid #00FF00';
    header.style.marginBottom = '10px';
    header.style.paddingBottom = '5px';
    panel.appendChild(header);
    
    // Create content container
    const content = document.createElement('div');
    content.id = 'diagnostic-content';
    panel.appendChild(content);
    
    // Add buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '10px';
    panel.appendChild(buttonContainer);
    
    // Force render button
    const renderButton = document.createElement('button');
    renderButton.textContent = 'Force Render';
    renderButton.style.marginRight = '5px';
    renderButton.style.padding = '5px';
    renderButton.style.backgroundColor = '#004400';
    renderButton.style.color = '#FFFFFF';
    renderButton.style.border = 'none';
    renderButton.style.cursor = 'pointer';
    renderButton.onclick = forceRender;
    buttonContainer.appendChild(renderButton);
    
    // Skip audio button
    const skipAudioButton = document.createElement('button');
    skipAudioButton.textContent = 'Skip Audio';
    skipAudioButton.style.marginRight = '5px';
    skipAudioButton.style.padding = '5px';
    skipAudioButton.style.backgroundColor = '#440000';
    skipAudioButton.style.color = '#FFFFFF';
    skipAudioButton.style.border = 'none';
    skipAudioButton.style.cursor = 'pointer';
    skipAudioButton.onclick = skipAudio;
    buttonContainer.appendChild(skipAudioButton);
    
    // Reset audio button
    const resetAudioButton = document.createElement('button');
    resetAudioButton.textContent = 'Reset Audio';
    resetAudioButton.style.padding = '5px';
    resetAudioButton.style.backgroundColor = '#444400';
    resetAudioButton.style.color = '#FFFFFF';
    resetAudioButton.style.border = 'none';
    resetAudioButton.style.cursor = 'pointer';
    resetAudioButton.onclick = resetAudio;
    buttonContainer.appendChild(resetAudioButton);
    
    // Add panel to body
    document.body.appendChild(panel);
    
    console.log("Diagnostic panel created");
    return panel;
}

// Get comprehensive audio system status
function getAudioStatus() {
    const status = {
        initialized: false,
        audioContextState: 'N/A',
        activeNodes: 0,
        qualityLevel: 'N/A',
        soundsPerSecond: 0,
        inFailureMode: false
    };
    
    if (!window.app) return status;
    
    // Basic info
    status.initialized = window.app.audioInitialized || false;
    
    // Audio context state
    if (window.app.audioContext) {
        status.audioContextState = window.app.audioContext.state;
    }
    
    // Try to get additional info if available
    if (window.app.audio) {
        if (window.app.audio.activeNodes) {
            status.activeNodes = window.app.audio.activeNodes;
        }
        if (window.app.audio.qualityLevel) {
            status.qualityLevel = window.app.audio.qualityLevel;
        }
        if (window.app.audio.soundsPerSecond) {
            status.soundsPerSecond = window.app.audio.soundsPerSecond;
        }
        if (window.app.audio.inFailureMode !== undefined) {
            status.inFailureMode = window.app.audio.inFailureMode;
        }
    }
    
    return status;
}

// Update diagnostic info
function updateDiagnostics() {
    if (!window.app) {
        console.error("App not initialized yet");
        return;
    }
    
    const content = document.getElementById('diagnostic-content');
    if (!content) return;
    
    let html = '';
    
    // Renderer
    html += '<div style="margin-bottom: 10px;">';
    html += '<strong>Renderer:</strong> ' + (window.app.renderer ? 'YES' : 'NO') + '<br>';
    if (window.app.renderer) {
        html += 'Size: ' + window.app.renderer.getSize().width + 'x' + window.app.renderer.getSize().height + '<br>';
    }
    html += '</div>';
    
    // Scene
    html += '<div style="margin-bottom: 10px;">';
    html += '<strong>Scene:</strong> ' + (window.app.scene ? 'YES' : 'NO') + '<br>';
    if (window.app.scene) {
        html += 'Objects: ' + window.app.scene.children.length + '<br>';
    }
    html += '</div>';
    
    // Camera
    html += '<div style="margin-bottom: 10px;">';
    html += '<strong>Camera:</strong> ' + (window.app.camera ? 'YES' : 'NO') + '<br>';
    if (window.app.camera) {
        html += 'Position: ' + vec3ToString(window.app.camera.position) + '<br>';
    }
    html += '</div>';
    
    // Ball
    html += '<div style="margin-bottom: 10px;">';
    html += '<strong>Ball:</strong> ' + (window.app.ballGroup ? 'YES' : 'NO') + '<br>';
    if (window.app.ballGroup) {
        html += 'Children: ' + window.app.ballGroup.children.length + '<br>';
        html += 'Position: ' + vec3ToString(window.app.ballGroup.position) + '<br>';
        html += 'Rotation: ' + vec3ToString(window.app.ballGroup.rotation) + '<br>';
    }
    html += '</div>';
    
    // Audio - Enhanced with more detailed information
    html += '<div style="margin-bottom: 10px;">';
    html += '<strong>Audio:</strong> ' + (window.app.audioInitialized ? 'YES' : 'NO') + '<br>';
    
    // Add detailed audio diagnostics
    const audioStatus = getAudioStatus();
    if (window.app.audioContext) {
        html += 'Context State: ' + audioStatus.audioContextState + '<br>';
    }
    if (window.app.soundSynth) {
        html += 'Synthesizer: YES<br>';
    } else {
        html += 'Synthesizer: NO<br>';
    }
    
    // Add new audio diagnostic info
    html += 'Active Nodes: ' + audioStatus.activeNodes + '<br>';
    html += 'Quality Level: ' + audioStatus.qualityLevel + '<br>';
    html += 'Sounds/Second: ' + audioStatus.soundsPerSecond + '<br>';
    
    if (audioStatus.inFailureMode) {
        html += '<span style="color: #FF5555;">AUDIO FAILURE MODE</span><br>';
    }
    
    html += '</div>';
    
    // Effects
    html += '<div style="margin-bottom: 10px;">';
    html += '<strong>Effects:</strong><br>';
    html += 'Rainbow Mode: ' + (window.app.isRainbowMode ? 'ON' : 'OFF') + '<br>';
    html += 'Magnetic Mode: ' + (window.app.isMagneticMode ? 'ON' : 'OFF') + '<br>';
    html += '</div>';
    
    // Interaction
    html += '<div style="margin-bottom: 10px;">';
    html += '<strong>Interaction:</strong><br>';
    html += 'Mouse: ' + vec2ToString(window.app.mouse) + '<br>';
    html += 'Dragging: ' + (window.app.isDragging ? 'YES' : 'NO') + '<br>';
    html += 'Hovered: ' + (window.app.isHovered ? 'YES' : 'NO') + '<br>';
    html += '</div>';
    
    content.innerHTML = html;
}

// Helper for vector display
function vec3ToString(vec) {
    if (!vec) return 'NULL';
    return 'X: ' + vec.x.toFixed(2) + ', Y: ' + vec.y.toFixed(2) + ', Z: ' + vec.z.toFixed(2);
}

function vec2ToString(vec) {
    if (!vec) return 'NULL';
    return 'X: ' + vec.x.toFixed(2) + ', Y: ' + vec.y.toFixed(2);
}

// Force a render
function forceRender() {
    if (!window.app || !window.app.renderer || !window.app.scene || !window.app.camera) {
        console.error("Cannot force render - missing components");
        return;
    }
    
    console.log("Forcing render...");
    
    // Create a minimal scene if needed
    if (!window.app.scene.children.length) {
        console.log("Creating minimal scene");
        
        // Create a simple box
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        window.app.scene.add(cube);
        
        // Position camera
        if (window.app.camera && window.app.camera.position.z === 0) {
            window.app.camera.position.z = 5;
        }
    }
    
    // Force render
    window.app.renderer.render(window.app.scene, window.app.camera);
    console.log("Render forced");
}

// Skip audio initialization
function skipAudio() {
    console.log("Skipping audio initialization");
    window.app.audioInitialized = true;
}

// Reset audio system
function resetAudio() {
    console.log("Attempting to reset audio system");
    
    if (!window.app) {
        console.error("App not available, cannot reset audio");
        return;
    }
    
    // Resume audio context if suspended
    if (window.app.audioContext && window.app.audioContext.state === 'suspended') {
        window.app.audioContext.resume()
            .then(() => console.log("Audio context resumed"))
            .catch(err => console.error("Failed to resume audio context:", err));
    }
    
    // Attempt to reset any failure modes
    if (window.app.audio && typeof window.app.audio.reset === 'function') {
        window.app.audio.reset();
        console.log("Audio system reset called");
    } else {
        console.log("No audio.reset() method available");
    }
    
    // Force audio initialization flag
    window.app.audioInitialized = true;
    
    console.log("Audio system reset complete");
}

// Initialize diagnostics
function initDiagnostics() {
    console.log("Initializing diagnostics");
    
    // Create panel
    const panel = createDiagnosticPanel();
    
    // Update diagnostics regularly
    setInterval(updateDiagnostics, 1000);
    
    // Override console methods for logging to panel
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.log = function() {
        originalConsoleLog.apply(console, arguments);
        addLogMessage('log', arguments);
    };
    
    console.error = function() {
        originalConsoleError.apply(console, arguments);
        addLogMessage('error', arguments);
    };
    
    console.warn = function() {
        originalConsoleWarn.apply(console, arguments);
        addLogMessage('warn', arguments);
    };
    
    // Create log container
    const logContainer = document.createElement('div');
    logContainer.id = 'diagnostic-logs';
    logContainer.style.marginTop = '20px';
    logContainer.style.borderTop = '1px solid #00FF00';
    logContainer.style.paddingTop = '10px';
    logContainer.style.maxHeight = '200px';
    logContainer.style.overflowY = 'auto';
    panel.appendChild(logContainer);
    
    // Add heading
    const logHeading = document.createElement('div');
    logHeading.textContent = 'Console Logs';
    logHeading.style.marginBottom = '5px';
    logContainer.appendChild(logHeading);
    
    // Create log content
    const logContent = document.createElement('div');
    logContent.id = 'diagnostic-log-content';
    logContainer.appendChild(logContent);
    
    console.log("Diagnostics initialized");
}

// Add a log message to the panel
function addLogMessage(type, args) {
    const logContent = document.getElementById('diagnostic-log-content');
    if (!logContent) return;
    
    // Create log entry
    const entry = document.createElement('div');
    entry.style.marginBottom = '2px';
    entry.style.wordBreak = 'break-word';
    
    // Set color based on type
    if (type === 'error') {
        entry.style.color = '#FF5555';
    } else if (type === 'warn') {
        entry.style.color = '#FFFF55';
    } else {
        entry.style.color = '#AAFFAA';
    }
    
    // Build message
    let message = '';
    for (let i = 0; i < args.length; i++) {
        if (typeof args[i] === 'object') {
            try {
                message += JSON.stringify(args[i]) + ' ';
            } catch (e) {
                message += args[i] + ' ';
            }
        } else {
            message += args[i] + ' ';
        }
    }
    
    // Add timestamp
    const now = new Date();
    const timestamp = now.getHours().toString().padStart(2, '0') + ':' +
                     now.getMinutes().toString().padStart(2, '0') + ':' +
                     now.getSeconds().toString().padStart(2, '0');
    
    entry.textContent = `[${timestamp}] ${message}`;
    
    // Add to log content
    logContent.insertBefore(entry, logContent.firstChild);
    
    // Limit number of entries
    while (logContent.children.length > 50) {
        logContent.removeChild(logContent.lastChild);
    }
}

// Listen for app initialization
document.addEventListener('DOMContentLoaded', function() {
    // Wait for app to be created
    const checkForApp = setInterval(function() {
        if (window.app) {
            clearInterval(checkForApp);
            console.log("App detected, initializing diagnostics");
            initDiagnostics();
        }
    }, 500);
    
    // Fallback in case app isn't created
    setTimeout(function() {
        if (!window.app) {
            console.error("App not detected after timeout");
            window.app = {
                scene: null,
                camera: null,
                renderer: null,
                audioInitialized: false
            };
            initDiagnostics();
        }
    }, 5000);
});

console.log("Diagnostic tools loaded");