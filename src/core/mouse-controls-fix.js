/**
 * Targeted mouse controls fix - preserves working features
 * Direct connections for right-click blackhole and side buttons
 */

console.log("🎯 Targeted mouse controls fix loading...");

// Wait for document load
(function() {
  // Track application readiness
  let isReady = false;
  let checkInterval;
  
  function checkIfReady() {
    if (!window.app || !window.app.ballGroup || !window.app.uiBridge) {
      return false;
    }
    return true;
  }
  
  // Function to apply our fixes
  function applyFixes() {
    if (isReady) return; // Only apply once
    
    if (!checkIfReady()) {
      console.log("App not ready yet, waiting...");
      return;
    }
    
    isReady = true;
    if (checkInterval) clearInterval(checkInterval);
    console.log("App is ready, applying targeted mouse controls fix");
    
    // PART 1: Fix right-click for blackhole effect
    // This handler MUST run in capture phase to take precedence
    function rightClickHandler(e) {
      // Only prevent default in blackhole mode
      if (window.app.mouseControls && window.app.mouseControls.isBlackholeModeActive) {
        e.preventDefault();
        e.stopPropagation();
        
        // Try to position blackhole at clicked point in 3D space
        if (window.app.createBlackholeAtPoint) {
          // Calculate mouse position in normalized device coordinates
          const mouse = new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
          );
          
          // Update the picking ray
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, window.app.camera);
          
          // Get intersection with ball or place along ray
          const intersects = raycaster.intersectObject(window.app.ballGroup, true);
          
          if (intersects.length > 0) {
            // Create blackhole at intersection point
            console.log("Creating blackhole at intersection point");
            window.app.createBlackholeAtPoint(intersects[0].point);
          } else {
            // Create blackhole along the ray at a fixed distance
            const blackholePos = new THREE.Vector3();
            raycaster.ray.at(2, blackholePos);
            console.log("Creating blackhole along ray");
            window.app.createBlackholeAtPoint(blackholePos);
          }
        } else {
          // Fallback to toggling effect
          console.log("No createBlackholeAtPoint function, using toggle instead");
          if (window.app.uiBridge && window.app.uiBridge.createBlackholeEffect) {
            window.app.uiBridge.createBlackholeEffect();
          }
        }
        
        return false;
      } else {
        // If not in blackhole mode, just toggle the effect
        e.preventDefault();
        if (window.app.uiBridge && window.app.uiBridge.createBlackholeEffect) {
          console.log("RIGHT CLICK - activating blackhole effect");
          window.app.uiBridge.createBlackholeEffect();
        }
        return false;
      }
    }
    
    // Remove any existing contextmenu handlers and add our own
    document.removeEventListener('contextmenu', rightClickHandler, true);
    document.addEventListener('contextmenu', rightClickHandler, true);
    
    // PART 2: Direct binding for specific mouse buttons that are problematic
    function mouseButtonHandler(e) {
      if (e.button === 3) { // Side button (Back) - EXPLOSION
        console.log("SIDE BUTTON 3 - creating explosion");
        if (window.app.uiBridge && window.app.uiBridge.createExplosion) {
          e.preventDefault();
          e.stopPropagation();
          window.app.uiBridge.createExplosion();
          return false;
        }
      }
      
      if (e.button === 4) { // Side button (Forward) - MAGNETIC
        console.log("SIDE BUTTON 4 - toggling magnetic effect");
        if (window.app.uiBridge && window.app.uiBridge.createMagneticEffect) {
          e.preventDefault();
          e.stopPropagation();
          window.app.uiBridge.createMagneticEffect();
          return false;
        }
      }
    }
    
    // Remove any existing handlers and add our own 
    document.removeEventListener('mousedown', mouseButtonHandler, true);
    document.addEventListener('mousedown', mouseButtonHandler, true);
    
    // PART 3: Double-click for rainbow mode
    function doubleClickHandler(e) {
      console.log("DOUBLE CLICK - toggling rainbow mode");
      if (window.app.uiBridge && window.app.uiBridge.toggleRainbowMode) {
        const currentState = window.app.isRainbowMode || false;
        window.app.uiBridge.toggleRainbowMode(!currentState);
      }
    }
    
    // Handle double-click for rainbow
    document.removeEventListener('dblclick', doubleClickHandler, true);
    document.addEventListener('dblclick', doubleClickHandler, true);
    
    // PART 4: Ensure wheel handler for inside camera works
    function wheelHandler(e) {
      // Don't interfere with existing wheel behavior, just ensure inside mode works
      if (!window.app || !window.app.camera) return;
      
      // Get current camera position
      const cameraPos = window.app.camera.position.clone();
      const distance = cameraPos.length();
      
      // Inside/outside transition logic - only apply if crossing the threshold
      if (distance < 0.9 && (!window.app.insidePullMode)) {
        window.app.insidePullMode = true;
        console.log("Camera inside ball - switching to inside pull mode");
        
        // Make material translucent when viewing from inside
        if (window.app.ballMesh && window.app.ballMesh.material) {
          if (!window.app._originalOpacity) {
            window.app._originalOpacity = window.app.ballMesh.material.opacity || 0.8;
          }
          window.app.ballMesh.material.opacity = 0.4;
          window.app.ballMesh.material.side = THREE.BackSide;
        }
      } else if (distance >= 0.9 && window.app.insidePullMode) {
        window.app.insidePullMode = false;
        console.log("Camera outside ball - switching to outside push mode");
        
        // Restore original material properties
        if (window.app.ballMesh && window.app.ballMesh.material && window.app._originalOpacity) {
          window.app.ballMesh.material.opacity = window.app._originalOpacity;
          window.app.ballMesh.material.side = THREE.DoubleSide;
        }
      }
    }
    
    // Monitor wheel events without stopping propagation
    document.addEventListener('wheel', wheelHandler, { passive: true });
    
    // PART 5: Add simple keyboard shortcuts for testing
    function keyboardHandler(e) {
      if (!window.app || !window.app.uiBridge) return;
      
      switch(e.key.toLowerCase()) {
        case 'i': // Toggle inside/outside camera
          if (window.app.uiBridge.toggleCameraPosition) {
            window.app.uiBridge.toggleCameraPosition();
          }
          break;
        case 'e': // Explosion
          if (window.app.uiBridge.createExplosion) {
            window.app.uiBridge.createExplosion();
          }
          break;
        case 'r': // Rainbow toggle
          if (window.app.uiBridge.toggleRainbowMode) {
            const currentState = window.app.isRainbowMode || false;
            window.app.uiBridge.toggleRainbowMode(!currentState);
          }
          break;
        case 'b': // Blackhole toggle
          if (window.app.uiBridge.createBlackholeEffect) {
            window.app.uiBridge.createBlackholeEffect();
          }
          break;
        case 'm': // Magnetic effect toggle
          if (window.app.uiBridge.createMagneticEffect) {
            window.app.uiBridge.createMagneticEffect();
          }
          break;
      }
    }
    
    // Add keyboard shortcuts
    window.addEventListener('keydown', keyboardHandler);
    
    // PART 6: Direct connection from uiBridge to effect functions
    
    // Connect createBlackholeEffect to actual implementation if needed
    if (window.app.uiBridge && !window.app.uiBridge._blackholeConnected) {
      const originalCreateBlackholeEffect = window.app.uiBridge.createBlackholeEffect;
      
      window.app.uiBridge.createBlackholeEffect = function() {
        console.log("Enhanced blackhole effect triggered");
        
        // Try the original first
        if (typeof originalCreateBlackholeEffect === 'function') {
          originalCreateBlackholeEffect();
        }
        
        // Also try the direct effects implementation
        try {
          // Try multiple ways to create a blackhole
          if (typeof window.createBlackholeEffect === 'function') {
            window.createBlackholeEffect(window.app);
          } else if (window.app.createBlackholeEffect) {
            window.app.createBlackholeEffect();
          }
        } catch(e) {
          console.error("Error in enhanced blackhole effect:", e);
        }
        
        return true;
      };
      
      window.app.uiBridge._blackholeConnected = true;
    }
    
    // Similar connections for the other effects if needed
    
    console.log("✅ Mouse controls fixed successfully!");
    console.log("RIGHT-CLICK → Blackhole effect");
    console.log("SIDE BUTTON 3 → Explosion effect");
    console.log("SIDE BUTTON 4 → Magnetic effect");
    console.log("DOUBLE-CLICK → Toggle rainbow mode");
  }
  
  // Try to apply fixes now
  if (document.readyState === 'complete') {
    applyFixes();
  }
  
  // Also try when document is ready
  window.addEventListener('load', applyFixes);
  
  // And periodically check until ready
  checkInterval = setInterval(applyFixes, 300);
  
  // Final fallback
  setTimeout(function() {
    applyFixes();
    if (checkInterval) clearInterval(checkInterval);
  }, 5000);
})();