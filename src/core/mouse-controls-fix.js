/**
 * Targeted mouse controls fix - RIGHT-CLICK LONG PRESS for blackhole
 */

console.log("🎯 Enhanced mouse controls with long-press blackhole loading...");

(function () {
  let isReady = false;
  let checkInterval;

  // Blackhole long-press state
  let rightClickPressTime = 0;
  let isRightClickPressed = false;
  let blackholeActivated = false;
  let longPressTimer = null;
  const LONG_PRESS_DURATION = 200; // ms for long press detection

  // Make blackholeActivated globally accessible
  window.blackholeActivated = false;

  function checkIfReady() {
    return window.app &&
      window.app.uiBridge &&
      typeof window.app.uiBridge.createBlackholeEffect === 'function' &&
      window.THREE;
  }

  // Complete blackhole cleanup function
  // function forceBlackholeCleanup() {
  //   console.log("[🌀 CLEANUP] Blackhole cleanup - returning to initial state");

  //   if (!window.app) return;

  //   // Clear blackhole state
  //   window.app.isBlackholeActive = false;
  //   window.app.blackholeActive = false; 
  //   window.app.gravitationalPull = 0;
  //   window.blackholeActivated = false;

  //   if (window.effectState) {
  //     window.effectState.blackholeEffect = null;
  //     window.effectState.isBlackholeActive = false;
  //     window.effectState.gravitationalPull = 0;
  //     window.effectState.blackholeRingParticles = [];
  //   }

  //   // Reset geometry to original shape using existing function
  //   if (typeof window.app.resetDeformation === 'function') {
  //     window.app.resetDeformation(1.0);
  //   }

  //   // Remove blackhole visuals
  //   if (window.removeBlackholeEffect) {
  //     window.removeBlackholeEffect(window.app);
  //   }

  //   // Clear interaction state
  //   window.app.isHovered = false;
  //   window.app.isDragging = false;
  //   window.app.touchPoint = null;

  //   // Let the animation loop handle the smooth return to (0,0,0)
  //   console.log("[🌀 CLEANUP] State cleared - animation loop will return ball to origin");
  // }

  // src/core/mouse-controls-fix.js
  // Replace only the forceBlackholeCleanup function:

  function forceBlackholeCleanup() {
    console.log("[🌀 CLEANUP] Restoring ball to exact initial state");
    
    if (!window.app) return;
    
    // 1. IMMEDIATELY pause auto-movement to prevent interference
    window.app._autoMovementPaused = true;
    
    // 2. Clear all blackhole state flags FIRST
    window.app.isBlackholeActive = false;
    window.app.blackholeActive = false;
    window.app.gravitationalPull = 0;
    window.blackholeActivated = false;
    
    // 3. CRITICAL: Call removeBlackholeEffect from effectManager directly
    if (window.effectManager && window.effectManager.removeBlackholeEffect) {
      console.log("[🌀 CLEANUP] Calling effectManager.removeBlackholeEffect");
      window.effectManager.removeBlackholeEffect(window.app);
    } else if (window.removeBlackholeEffect) {
      console.log("[🌀 CLEANUP] Calling window.removeBlackholeEffect");
      window.removeBlackholeEffect(window.app);
    } else {
      // Direct cleanup if functions not available
      console.log("[🌀 CLEANUP] Direct blackhole cleanup");
      if (window.effectState && window.effectState.blackholeEffect) {
        window.app.scene.remove(window.effectState.blackholeEffect);
        window.effectState.blackholeEffect = null;
      }
      
      // Stop direct audio
      if (window.app._blackholeSound) {
        try {
          if (window.app._blackholeSound.gain) {
            window.app._blackholeSound.gain.gain.setValueAtTime(0, window.app._blackholeSound.ctx.currentTime);
          }
          if (window.app._blackholeSound.osc) {
            window.app._blackholeSound.osc.stop(0);
          }
          window.app._blackholeSound = null;
        } catch (e) {
          console.warn("Error stopping blackhole sound:", e);
        }
      }
    }
    
    // 4. Clear effectState completely
    if (window.effectState) {
      window.effectState.isBlackholeActive = false;
      window.effectState.gravitationalPull = 0;
      window.effectState.blackholeRingParticles = [];
    }
    
    // 5. Reset ball to EXACT initial state from createFancyBall
    if (window.app.ballGroup) {
      window.app.ballGroup.position.set(0, 0, 0);
      window.app.ballGroup.rotation.set(0, 0, 0);
      window.app.ballGroup.scale.set(1, 1, 1);
    }
    
    // 6. Restore geometry to exact original vertices
    if (window.app.ballGeometry && window.app.originalPositions) {
      const positions = window.app.ballGeometry.attributes.position;
      
      for (let i = 0; i < positions.array.length; i++) {
        positions.array[i] = window.app.originalPositions[i];
      }
      
      positions.needsUpdate = true;
      window.app.ballGeometry.computeVertexNormals();
      
      if (window.app.wireMesh) {
        const newWireGeo = new THREE.EdgesGeometry(window.app.ballGeometry);
        window.app.wireMesh.geometry.dispose();
        window.app.wireMesh.geometry = newWireGeo;
      }
    }
    
    // 7. Reset materials to createFancyBall initial state
    if (window.app.ballGroup?.userData?.mat) {
      const mat = window.app.ballGroup.userData.mat;
      mat.emissive.set(0x000000);
      mat.emissiveIntensity = 0;
      mat.opacity = 0.8;
      mat.needsUpdate = true;
    }
    
    if (window.app.ballGroup?.userData?.wireMat) {
      const wireMat = window.app.ballGroup.userData.wireMat;
      wireMat.color.set(0x00FFFF);
      wireMat.opacity = 0.5;
      wireMat.needsUpdate = true;
    }
    
    // 8. Reset gradient to createFancyBall initial colors
    if (window.app.updateGradientTexture) {
      window.app.updateGradientTexture('#FF00FF', '#8800FF', '#00FFFF');
    }
    
    // 9. Reset all interaction state to initial values
    window.app.isHovered = false;
    window.app.isDragging = false;
    window.app.touchPoint = null;
    window.app.targetScale = 1.0;
    window.app.currentScale = 1.0;
    window.app.spikiness = 0;
    
    // 10. Reset cursor
    document.body.style.cursor = 'default';
    
    // 11. Resume auto-movement after a brief delay
    setTimeout(() => {
      window.app._autoMovementPaused = false;
      console.log("[🌀 CLEANUP] Auto-movement resumed - ball should stay at initial state");
    }, 200); // Reduced delay
    
    console.log("[🌀 CLEANUP] Ball restored to exact createFancyBall initial state");
  }

  function applyFixes() {
    if (isReady) return;

    if (!checkIfReady()) {
      console.log("App not ready yet, waiting...");
      return;
    }

    isReady = true;
    if (checkInterval) clearInterval(checkInterval);
    console.log("App is ready, applying long-press blackhole controls");

    // Remove existing event listeners
    document.removeEventListener('contextmenu', handleContextMenu, true);
    document.removeEventListener('mousedown', handleMouseDown, true);
    document.removeEventListener('mouseup', handleMouseUp, true);

    // Context menu handler
    function handleContextMenu(e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Mouse down handler - start long press detection
    function handleMouseDown(e) {
      if (e.button === 2) { // Right click
        console.log("[🖱️ PRESS] Right mouse down - starting long press detection");

        isRightClickPressed = true;
        rightClickPressTime = Date.now();

        // Clear any existing timer
        if (longPressTimer) {
          clearTimeout(longPressTimer);
        }

        // Start long press timer
        longPressTimer = setTimeout(() => {
          if (isRightClickPressed && !window.blackholeActivated) {
            window.blackholeActivated = true;
            blackholeActivated = true;
            console.log("[🌀 ACTIVATE] Long press detected - activating blackhole");

            // CREATE blackhole directly (removed the cleanup call that was preventing it from working)
            if (window.app.uiBridge && window.app.uiBridge.createBlackholeEffect) {
              window.app.uiBridge.createBlackholeEffect();
              console.log("[🌀 ACTIVATE] Blackhole effect created");
            }
          }
        }, LONG_PRESS_DURATION);

        e.preventDefault();
        e.stopPropagation();
      }
    }

    // Mouse up handler - end blackhole
    function handleMouseUp(e) {
      if (e.button === 2) { // Right click release
        console.log("[🖱️ RELEASE] Right mouse up - ending blackhole");

        isRightClickPressed = false;

        // Clear long press timer
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }

        // If blackhole was activated, deactivate it
        if (window.blackholeActivated) {
          window.blackholeActivated = false;
          blackholeActivated = false;
          console.log("[🌀 DEACTIVATE] Deactivating blackhole - restoring to initial state");

          // IMMEDIATE and complete cleanup to initial state
          forceBlackholeCleanup();

          // Use enhanced reset function if available
          if (window.app.resetToInitialState) {
            setTimeout(() => window.app.resetToInitialState(), 100);
          }

          // Show status
          if (window.app.showStatus) {
            window.app.showStatus('Blackhole Deactivated - Ball Reset to Initial State');
          }
        }

        e.preventDefault();
        return false;
      }
    }

    // Apply event listeners with capture phase
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);

    // Handle other mouse buttons as before
    document.addEventListener('mousedown', function (e) {
      if (e.button === 3) { // Side button (Back) - EXPLOSION
        console.log("SIDE BUTTON 3 - creating explosion");
        if (window.app.uiBridge && window.app.uiBridge.createExplosion) {
          e.preventDefault();
          e.stopPropagation();
          window.app.uiBridge.createExplosion();
        }
      }

      if (e.button === 4) { // Side button (Forward) - MAGNETIC
        console.log("SIDE BUTTON 4 - toggling magnetic effect");
        if (window.app.uiBridge && window.app.uiBridge.createMagneticEffect) {
          e.preventDefault();
          e.stopPropagation();
          window.app.uiBridge.createMagneticEffect();
        }
      }
    }, true);

    // Double-click for rainbow mode
    document.addEventListener('dblclick', function (e) {
      console.log("DOUBLE CLICK - toggling rainbow mode");
      if (window.app.uiBridge && window.app.uiBridge.toggleRainbowMode) {
        const currentState = window.app.isRainbowMode || false;
        window.app.uiBridge.toggleRainbowMode(!currentState);
      }
    }, true);

    console.log("✅ Long-press blackhole controls applied!");
    console.log("RIGHT-CLICK LONG PRESS → Hold to activate blackhole");
    console.log("RIGHT-CLICK RELEASE → Immediately deactivate blackhole");
  }

  // Initialize
  if (document.readyState === 'complete') {
    applyFixes();
  }

  window.addEventListener('load', applyFixes);
  checkInterval = setInterval(applyFixes, 300);

  setTimeout(function () {
    applyFixes();
    if (checkInterval) clearInterval(checkInterval);
  }, 5000);

  // Expose cleanup function globally for debugging
  window.forceBlackholeCleanup = forceBlackholeCleanup;
})();
setTimeout(() => {
  // Remove any existing right-click handlers
  const existingHandlers = document.querySelectorAll('*[onclick]');
  existingHandlers.forEach(el => {
    if (el.onclick && el.onclick.toString().includes('blackhole')) {
      el.onclick = null;
    }
  });

  console.log("🔧 Cleaned up conflicting mouse handlers");
}, 1000);