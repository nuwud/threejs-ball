// Debug helper utility

// Commenting out the debug panel creation
/*
export function createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.position = 'fixed';
    panel.style.bottom = '10px';
    panel.style.left = '10px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    panel.style.color = '#00ff00';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.zIndex = '1000';
    panel.style.maxWidth = '300px';
    panel.style.maxHeight = '200px';
    panel.style.overflow = 'auto';
    
    document.body.appendChild(panel);
    
    return {
        log: function(message) {
            const line = document.createElement('div');
            line.textContent = `> ${message}`;
            panel.appendChild(line);
            
            // Keep only the last 10 lines
            while (panel.children.length > 10) {
                panel.removeChild(panel.firstChild);
            }
        },
        
        updateStatus: function(appState) {
            panel.innerHTML = `
                <div style="margin-bottom: 5px; font-weight: bold;">Debug Status</div>
                <div>Scene: ${appState.scene ? '✓' : '✗'}</div>
                <div>Camera: ${appState.camera ? '✓' : '✗'}</div>
                <div>Renderer: ${appState.renderer ? '✓' : '✗'}</div>
                <div>Ball: ${appState.ballGroup ? '✓' : '✗'}</div>
                <div>Audio: ${appState.audioInitialized ? '✓' : '✗'}</div>
                <div>FPS: ${Math.round(appState.fps || 0)}</div>
            `;
        }
    };
}
*/

// Add this to main.js to enable debug panel
// import { createDebugPanel } from '../utils/debug-helper.js';
// const debugPanel = createDebugPanel();
// In animation loop: debugPanel.updateStatus(window.app);