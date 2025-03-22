// debug.js - Debugging tools for Three.js ball

(function() {
    console.log("Debug script loaded");
    
    // Add debug UI
    function createDebugUI() {
        const debugPanel = document.createElement('div');
        debugPanel.style.position = 'fixed';
        debugPanel.style.top = '10px';
        debugPanel.style.right = '10px';
        debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugPanel.style.color = 'white';
        debugPanel.style.padding = '10px';
        debugPanel.style.borderRadius = '5px';
        debugPanel.style.zIndex = '1000';
        debugPanel.style.maxWidth = '300px';
        debugPanel.style.fontFamily = 'monospace';
        debugPanel.style.fontSize = '12px';
        debugPanel.id = 'debug-panel';
        
        debugPanel.innerHTML = `
            <h3>Three.js Debug</h3>
            <div id="debug-info"></div>
            <div style="margin-top: 10px;">
                <button id="reset-ball" style="padding: 5px; margin: 5px; cursor: pointer;">
                    Reset Ball
                </button>
                <button id="toggle-wireframe" style="padding: 5px; margin: 5px; cursor: pointer;">
                    Toggle Wireframe
                </button>
            </div>
            <div style="margin-top: 10px;">
                <button id="emergency-ball" style="padding: 5px; margin: 5px; cursor: pointer; background-color: #ff3333;">
                    Create Emergency Ball
                </button>
            </div>
        `;
        
        document.body.appendChild(debugPanel);
        
        // Add event listeners
        document.getElementById('reset-ball').addEventListener('click', resetBall);
        document.getElementById('toggle-wireframe').addEventListener('click', toggleWireframe);
        document.getElementById('emergency-ball').addEventListener('click', createEmergencyBall);
        
        // Start update loop
        updateDebugInfo();
    }
    
    // Update debug info
    function updateDebugInfo() {
        const debugInfo = document.getElementById('debug-info');
        if (!debugInfo) return;
        
        const app = window.app;
        if (!app) {
            debugInfo.innerHTML = '<p style="color: red;">App not initialized</p>';
            setTimeout(updateDebugInfo, 1000);
            return;
        }
        
        const ballExists = app.ballGroup ? "Yes" : "No";
        const wireframeExists = app.ballGroup?.userData?.wireMesh ? "Yes" : "No";
        const sceneObjects = app.scene?.children?.length || 0;
        
        debugInfo.innerHTML = `
            <p>Ball exists: <span style="color: ${ballExists === 'Yes' ? 'lime' : 'red'}">${ballExists}</span></p>
            <p>Wireframe exists: <span style="color: ${wireframeExists === 'Yes' ? 'lime' : 'red'}">${wireframeExists}</span></p>
            <p>Scene objects: ${sceneObjects}</p>
            <p>FPS: ${Math.round(1000 / (performance.now() - (window._lastFrameTime || performance.now())))} fps</p>
        `;
        
        window._lastFrameTime = performance.now();
        
        // Check ball position
        if (app.ballGroup) {
            const pos = app.ballGroup.position;
            debugInfo.innerHTML += `<p>Ball position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})</p>`;
            
            // Check if ball is outside of camera view
            if (Math.abs(pos.z) > 10) {
                debugInfo.innerHTML += `<p style="color: red;">WARNING: Ball may be out of view (z=${pos.z.toFixed(2)})</p>`;
                
                // Fix position if too far away
                if (Math.abs(pos.z) > 50) {
                    app.ballGroup.position.set(0, 0, 0);
                    debugInfo.innerHTML += `<p style="color: lime;">Auto-reset position</p>`;
                }
            }
        }
        
        setTimeout(updateDebugInfo, 500);
    }
    
    // Reset ball function
    function resetBall() {
        if (!window.app || !window.app.ballGroup) {
            console.error("Ball not found, cannot reset");
            return;
        }
        
        window.app.ballGroup.position.set(0, 0, 0);
        window.app.ballGroup.rotation.set(0, 0, 0);
        window.app.ballGroup.scale.set(1, 1, 1);
        console.log("Ball position and rotation reset");
    }
    
    // Toggle wireframe function
    function toggleWireframe() {
        if (!window.app || !window.app.ballGroup || !window.app.ballGroup.userData) {
            console.error("Ball or wireframe not found");
            return;
        }
        
        const wireMesh = window.app.ballGroup.userData.wireMesh;
        if (wireMesh) {
            wireMesh.visible = !wireMesh.visible;
            console.log("Wireframe visibility:", wireMesh.visible);
        }
    }
    
    // Emergency ball creation
    function createEmergencyBall() {
        if (!window.app || !window.app.scene) {
            console.error("Scene not found, cannot create emergency ball");
            return;
        }
        
        // Remove existing ball if present
        if (window.app.ballGroup) {
            window.app.scene.remove(window.app.ballGroup);
        }
        
        // Create a simple sphere as fallback
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xFF3333, // Red for emergency
            wireframe: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        const ballGroup = new THREE.Group();
        ballGroup.add(mesh);
        
        // Add wireframe
        const wireGeometry = new THREE.EdgesGeometry(geometry);
        const wireMaterial = new THREE.LineBasicMaterial({ 
            color: 0xFFFFFF, 
            transparent: true, 
            opacity: 0.5 
        });
        const wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
        ballGroup.add(wireMesh);
        
        // Store references
        ballGroup.userData = {
            mesh: mesh,
            wireMesh: wireMesh,
            mat: material,
            wireMat: wireMaterial,
            geo: geometry,
            wireGeo: wireGeometry,
            originalPositions: geometry.attributes.position.array.slice()
        };
        
        // Add to scene
        window.app.scene.add(ballGroup);
        window.app.ballGroup = ballGroup;
        
        console.log("Emergency ball created");
    }
    
    // Add load event listener
    window.addEventListener('load', function() {
        // Wait a bit to ensure Three.js has initialized
        setTimeout(createDebugUI, 2000);
    });
})();
