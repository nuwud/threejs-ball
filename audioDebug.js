// Enhanced audio debugging visualization

function createAudioDebugPanel() {
    const debugPanel = document.createElement('div');
    debugPanel.style.position = 'absolute';
    debugPanel.style.bottom = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.backgroundColor = 'rgba(0,0,0,0.8)';
    debugPanel.style.color = 'white';
    debugPanel.style.padding = '10px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.fontFamily = 'monospace';
    debugPanel.style.zIndex = '1000';
    debugPanel.style.maxWidth = '300px';
    debugPanel.style.fontSize = '12px';
    debugPanel.id = 'audio-debug-panel';
    
    // Title
    const title = document.createElement('div');
    title.textContent = 'Audio Debug Panel';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.borderBottom = '1px solid #666';
    title.style.paddingBottom = '5px';
    debugPanel.appendChild(title);
    
    // Status section
    const statusSection = document.createElement('div');
    statusSection.style.marginBottom = '10px';
    
    const statusLabel = document.createElement('div');
    statusLabel.textContent = 'System Status:';
    statusLabel.style.marginBottom = '5px';
    
    const statusValue = document.createElement('div');
    statusValue.id = 'audio-status';
    statusValue.style.color = '#4CAF50';
    statusValue.textContent = 'Initializing...';
    
    statusSection.appendChild(statusLabel);
    statusSection.appendChild(statusValue);
    debugPanel.appendChild(statusSection);
    
    // Context section
    const contextInfo = document.createElement('div');
    contextInfo.id = 'context-info';
    contextInfo.style.marginBottom = '10px';
    contextInfo.style.fontSize = '11px';
    contextInfo.innerHTML = 'AudioContext: Unknown<br>Current Time: 0<br>Sample Rate: 0<br>Active Sources: 0';
    debugPanel.appendChild(contextInfo);
    
    // Master gain meter
    const meterSection = document.createElement('div');
    meterSection.style.marginBottom = '10px';
    
    const meterLabel = document.createElement('div');
    meterLabel.textContent = 'Master Gain:';
    meterLabel.style.marginBottom = '5px';
    
    const meterContainer = document.createElement('div');
    meterContainer.style.width = '100%';
    meterContainer.style.height = '20px';
    meterContainer.style.backgroundColor = '#333';
    meterContainer.style.borderRadius = '3px';
    meterContainer.style.overflow = 'hidden';
    meterContainer.style.position = 'relative';
    
    const meter = document.createElement('div');
    meter.style.height = '100%';
    meter.style.width = '0%';
    meter.style.backgroundColor = '#4CAF50';
    meter.style.transition = 'width 0.1s ease-out';
    meter.id = 'audio-gain-meter';
    
    const meterText = document.createElement('div');
    meterText.style.position = 'absolute';
    meterText.style.top = '0';
    meterText.style.left = '5px';
    meterText.style.lineHeight = '20px';
    meterText.style.color = 'white';
    meterText.style.textShadow = '1px 1px 1px rgba(0,0,0,0.5)';
    meterText.id = 'audio-gain-text';
    meterText.textContent = '0%';
    
    meterContainer.appendChild(meter);
    meterContainer.appendChild(meterText);
    
    meterSection.appendChild(meterLabel);
    meterSection.appendChild(meterContainer);
    debugPanel.appendChild(meterSection);
    
    // Controls section
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.justifyContent = 'space-between';
    controls.style.marginTop = '10px';
    
    const muteBtn = document.createElement('button');
    muteBtn.textContent = 'Mute';
    muteBtn.style.flex = '1';
    muteBtn.style.marginRight = '5px';
    muteBtn.style.padding = '5px';
    muteBtn.style.backgroundColor = '#555';
    muteBtn.style.color = 'white';
    muteBtn.style.border = 'none';
    muteBtn.style.borderRadius = '3px';
    muteBtn.style.cursor = 'pointer';
    muteBtn.onclick = () => {
        if (app.synthesizer) app.synthesizer.masterMute();
    };
    
    const unmuteBtn = document.createElement('button');
    unmuteBtn.textContent = 'Unmute';
    unmuteBtn.style.flex = '1';
    unmuteBtn.style.marginLeft = '5px';
    unmuteBtn.style.padding = '5px';
    unmuteBtn.style.backgroundColor = '#4CAF50';
    unmuteBtn.style.color = 'white';
    unmuteBtn.style.border = 'none';
    unmuteBtn.style.borderRadius = '3px';
    unmuteBtn.style.cursor = 'pointer';
    unmuteBtn.onclick = () => {
        if (app.synthesizer) app.synthesizer.masterUnmute();
    };
    
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Sound';
    testBtn.style.flex = '1';
    testBtn.style.marginLeft = '5px';
    testBtn.style.padding = '5px';
    testBtn.style.backgroundColor = '#2196F3';
    testBtn.style.color = 'white';
    testBtn.style.border = 'none';
    testBtn.style.borderRadius = '3px';
    testBtn.style.cursor = 'pointer';
    testBtn.onclick = () => {
        if (app.synthesizer) {
            // Play three different test sounds in sequence
            app.synthesizer.playWarmPad(440, 0.3);
            setTimeout(() => app.synthesizer.playClickSound(880), 300);
            setTimeout(() => app.synthesizer.playCrunchSound(120), 600);
        }
    };
    
    controls.appendChild(muteBtn);
    controls.appendChild(unmuteBtn);
    controls.appendChild(testBtn);
    
    // Add a panic button for emergency resets
    const panicBtn = document.createElement('button');
    panicBtn.textContent = 'PANIC RESET';
    panicBtn.style.width = '100%';
    panicBtn.style.marginTop = '10px';
    panicBtn.style.padding = '8px';
    panicBtn.style.backgroundColor = '#F44336';
    panicBtn.style.color = 'white';
    panicBtn.style.border = 'none';
    panicBtn.style.borderRadius = '3px';
    panicBtn.style.cursor = 'pointer';
    panicBtn.style.fontWeight = 'bold';
    panicBtn.onclick = () => {
        if (app.synthesizer && typeof app.synthesizer.panicReset === 'function') {
            app.synthesizer.panicReset();
            debugPanel.log("Panic reset triggered manually");
        }
    };
    
    // Add to controls section, after the existing buttons
    controls.appendChild(document.createElement('div')); // Spacer
    controls.appendChild(document.createElement('hr'));
    controls.appendChild(panicBtn);
    
    debugPanel.appendChild(controls);
    
    // Minimal log view
    const logView = document.createElement('div');
    logView.style.marginTop = '10px';
    logView.style.maxHeight = '100px';
    logView.style.overflowY = 'auto';
    logView.style.fontSize = '10px';
    logView.style.padding = '5px';
    logView.style.backgroundColor = 'rgba(0,0,0,0.3)';
    logView.style.borderRadius = '3px';
    logView.id = 'audio-log';
    debugPanel.appendChild(logView);
    
    // Add minimize/maximize toggle
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '−';
    toggleButton.style.position = 'absolute';
    toggleButton.style.top = '5px';
    toggleButton.style.right = '5px';
    toggleButton.style.width = '20px';
    toggleButton.style.height = '20px';
    toggleButton.style.padding = '0';
    toggleButton.style.backgroundColor = 'transparent';
    toggleButton.style.border = 'none';
    toggleButton.style.color = 'white';
    toggleButton.style.fontSize = '16px';
    toggleButton.style.cursor = 'pointer';
    
    let minimized = false;
    const childElements = Array.from(debugPanel.children).filter(el => el !== toggleButton && el !== title);
    
    toggleButton.onclick = () => {
        minimized = !minimized;
        toggleButton.textContent = minimized ? '+' : '−';
        
        childElements.forEach(el => {
            el.style.display = minimized ? 'none' : 'block';
        });
        
        debugPanel.style.height = minimized ? 'auto' : '';
    };
    
    debugPanel.appendChild(toggleButton);
    document.body.appendChild(debugPanel);
    
    // Add performance section
    const perfSection = document.createElement('div');
    perfSection.style.marginTop = '10px';
    perfSection.style.fontSize = '10px';
    
    const perfLabel = document.createElement('div');
    perfLabel.textContent = 'Audio Performance:';
    perfLabel.style.marginBottom = '5px';
    
    const perfInfo = document.createElement('div');
    perfInfo.id = 'audio-perf-info';
    perfInfo.innerHTML = 'Sound Rate: 0/s<br>Recovery Mode: Off';
    
    perfSection.appendChild(perfLabel);
    perfSection.appendChild(perfInfo);
    debugPanel.appendChild(perfSection);
    
    return {
        updateMeter: (value) => {
            const meter = document.getElementById('audio-gain-meter');
            const text = document.getElementById('audio-gain-text');
            if (meter && text) {
                const percentage = Math.min(100, value * 100);
                meter.style.width = `${percentage}%`;
                text.textContent = `${Math.round(percentage)}%`;
                
                // Change color based on level
                if (percentage > 90) {
                    meter.style.backgroundColor = '#F44336'; // Red if too loud
                } else if (percentage > 70) {
                    meter.style.backgroundColor = '#FF9800'; // Orange if getting loud
                } else {
                    meter.style.backgroundColor = '#4CAF50'; // Green otherwise
                }
            }
        },
        
        updateStatus: (status, color = '#4CAF50') => {
            const statusEl = document.getElementById('audio-status');
            if (statusEl) {
                statusEl.textContent = status;
                statusEl.style.color = color;
            }
        },
        
        updateContextInfo: (info) => {
            const contextEl = document.getElementById('context-info');
            if (contextEl && info) {
                contextEl.innerHTML = `
                    AudioContext: <span style="color:${info.contextState === 'running' ? '#4CAF50' : '#F44336'}">${info.contextState}</span><br>
                    Current Time: ${info.currentTime.toFixed(2)}s<br>
                    Sample Rate: ${info.sampleRate}Hz<br>
                    Active Sources: ${info.activeSources}
                `;
            }
        },
        
        log: (message) => {
            const logEl = document.getElementById('audio-log');
            if (logEl) {
                const entry = document.createElement('div');
                entry.textContent = `${new Date().toLocaleTimeString()} ${message}`;
                logEl.appendChild(entry);
                
                // Auto-scroll to bottom
                logEl.scrollTop = logEl.scrollHeight;
                
                // Limit entries
                while (logEl.children.length > 30) {
                    logEl.removeChild(logEl.firstChild);
                }
            }
        },
        
        updatePerformance: (info) => {
            const perfEl = document.getElementById('audio-perf-info');
            if (perfEl && info) {
                perfEl.innerHTML = `
                    Sound Rate: ${info.soundsPerSecond}/s<br>
                    Recovery Mode: <span style="color:${info.recoveryMode ? '#F44336' : '#4CAF50'}">${info.recoveryMode ? 'ON' : 'Off'}</span><br>
                    Crash Count: ${info.crashCount || 0}
                `;
            }
        }
    };
}

// Call this after audio initialization
function setupAudioDebug() {
    const debugPanel = createAudioDebugPanel();
    
    // Store panel in app for access from other components
    app.audioDebugPanel = debugPanel;
    
    // Update the meter periodically
    let lastState = {};
    
    const updateDebugInfo = () => {
        if (app.synthesizer) {
            try {
                // Update meter
                if (app.synthesizer.masterGain) {
                    debugPanel.updateMeter(app.synthesizer.masterGain.gain.value);
                }
                
                // Update context info
                const currentState = app.synthesizer.getState();
                
                // Only update if something changed
                if (JSON.stringify(currentState) !== JSON.stringify(lastState)) {
                    debugPanel.updateContextInfo(currentState);
                    lastState = currentState;
                }
                
                // Update status based on context state
                if (app.audioContext) {
                    let statusText = 'Unknown';
                    let statusColor = '#F44336';
                    
                    switch (app.audioContext.state) {
                        case 'running':
                            statusText = 'Running';
                            statusColor = '#4CAF50';
                            break;
                        case 'suspended':
                            statusText = 'Suspended - Click to resume';
                            statusColor = '#FF9800';
                            break;
                        case 'closed':
                            statusText = 'Closed - Reload page';
                            statusColor = '#F44336';
                            break;
                    }
                    
                    debugPanel.updateStatus(statusText, statusColor);
                }
                
                // Add performance monitoring
                if (app.synthesizer.soundsInLastSecond !== undefined) {
                    debugPanel.updatePerformance({
                        soundsPerSecond: app.synthesizer.soundsInLastSecond,
                        recoveryMode: app.synthesizer.recoveryMode || false,
                        crashCount: app.synthesizer.crashCount || 0
                    });
                }
            } catch (e) {
                debugPanel.log(`Error updating debug: ${e.message}`);
            }
        }
    };
    
    // Update initially
    updateDebugInfo();
    
    // Setup periodic updates
    const updateInterval = setInterval(updateDebugInfo, 200);
    
    // Setup click handler to resume audio context if suspended
    document.addEventListener('click', function resumeAudioContext() {
        if (app.audioContext && app.audioContext.state === 'suspended') {
            app.audioContext.resume().then(() => {
                debugPanel.log('AudioContext resumed by user action');
            });
        }
    }, { once: false });
    
    // Log audio events
    const originalPlayWarmPad = app.synthesizer.playWarmPad;
    app.synthesizer.playWarmPad = function(frequency, duration) {
        debugPanel.log(`Playing pad: ${frequency}Hz, ${duration}s`);
        return originalPlayWarmPad.apply(this, arguments);
    };
    
    // Double-click anywhere on the debugPanel to trigger panic reset
    debugPanel.panel.addEventListener('dblclick', (e) => {
        if (app.synthesizer && typeof app.synthesizer.panicReset === 'function') {
            app.synthesizer.panicReset();
            debugPanel.log("Panic reset triggered by double-click");
        }
    });
    
    // Return control object
    return {
        panel: debugPanel,
        stopUpdates: () => clearInterval(updateInterval)
    };
}
