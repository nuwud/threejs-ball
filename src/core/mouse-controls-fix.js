/**
 * Targeted mouse controls fix - RIGHT-CLICK LONG PRESS for blackhole
 */

console.log("🎯 Enhanced mouse controls with long-press blackhole loading...");

(function() {
  let isReady = false;
  let checkInterval;
  
  // Blackhole long-press state
  let rightClickPressTime = 0;
  let isRightClickPressed = false;
  let blackholeActivated = false;
  let longPressTimer = null;
  const LONG_PRESS_DURATION = 500; // ms for long press detection
  
  function checkIfReady() {
    return window.app && 
           window.app.uiBridge && 
           typeof window.app.uiBridge.createBlackholeEffect === 'function' &&
           window.THREE;
  }
  
  // Complete blackhole cleanup function
  function forceBlackholeCleanup() {
    console.log("[🌀 CLEANUP] Starting complete blackhole inventory cleanup");
    
    if (!window.app) return;
    
    // 1. Stop all audio immediately
    if (window.app._blackholeSound) {
      try {
        if (window.app._blackholeSound.gain) {
          window.app._blackholeSound.gain.gain.setValueAtTime(0, window.app._blackholeSound.ctx.currentTime);
        }
        if (window.app._blackholeSound.osc) {
          window.app._blackholeSound.osc.stop(0);
          window.app._blackholeSound.osc.disconnect();
        }
        if (window.app._blackholeSound.filter) window.app._blackholeSound.filter.disconnect();
        if (window.app._blackholeSound.gain) window.app._blackholeSound.gain.disconnect();
        window.app._blackholeSound = null;
        console.log("[🔊 CLEANUP] Direct audio cleaned");
      } catch (e) {
        console.warn("Direct audio cleanup error:", e);
        window.app._blackholeSound = null;
      }
    }
    
    // 2. Stop managed audio systems
    if (window.app.soundManager) {
      window.app.soundManager.stop('blackhole');
      console.log("[🔊 CLEANUP] SoundManager stopped");
    }
    
    if (window.app.soundSynth && typeof window.app.soundSynth.stopSpecialSound === 'function') {
      window.app.soundSynth.stopSpecialSound('blackhole');
      console.log("[🔊 CLEANUP] SoundSynth stopped");
    }
    
    // 3. Clean up all visual effects from all systems
    // effectManager.js system
    if (window.effectState && window.effectState.blackholeEffect) {
      window.app.scene.remove(window.effectState.blackholeEffect);
      window.effectState.blackholeEffect = null;
      console.log("[🌀 CLEANUP] EffectManager blackhole removed");
    }
    
    // visual/blackhole.js system (if accessible)
    if (window.app.blackholeEffect) {
      window.app.scene.remove(window.app.blackholeEffect);
      window.app.blackholeEffect = null;
      console.log("[🌀 CLEANUP] Visual blackhole removed");
    }
    
    // mouse-controls.js system
    if (window.app.blackholeCenter) {
      window.app.scene.remove(window.app.blackholeCenter);
      window.app.blackholeCenter = null;
      console.log("[🌀 CLEANUP] Mouse-controls blackhole center removed");
    }
    
    if (window.app.blackholeRing) {
      window.app.scene.remove(window.app.blackholeRing);
      window.app.blackholeRing = null;
      console.log("[🌀 CLEANUP] Blackhole ring removed");
    }
    
    if (window.app.blackholeParticles) {
      window.app.scene.remove(window.app.blackholeParticles);
      window.app.blackholeParticles = null;
      console.log("[🌀 CLEANUP] Blackhole particles removed");
    }
    
    // 4. Clean up ring particles from effectManager
    if (window.effectState && window.effectState.blackholeRingParticles) {
      for (const particle of window.effectState.blackholeRingParticles) {
        if (particle.parent) {
          particle.parent.remove(particle);
        }
      }
      window.effectState.blackholeRingParticles = [];
      console.log("[🌀 CLEANUP] Ring particles cleaned");
    }
    
    // 5. Reset all gravitational effects
    if (window.effectState) {
      window.effectState.gravitationalPull = 0;
    }
    window.app.gravitationalPull = 0;
    window.app.isBlackholeActive = false;
    
    // 6. Reset ball deformation
    if (typeof window.resetDeformation === 'function') {
      window.resetDeformation(window.app, 1.0);
    } else if (window.app.uiBridge && typeof window.app.uiBridge.resetDeformation === 'function') {
      window.app.uiBridge.resetDeformation(1.0);
    }
    
    // 7. Reset post-processing
    if (window.app.blackholeDistortionPass) {
      window.app.blackholeDistortionPass.uniforms.intensity.value = 0;
    }
    
    console.log("[🌀 CLEANUP] Complete blackhole cleanup finished");
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
          if (isRightClickPressed && !blackholeActivated) {
            console.log("[🌀 ACTIVATE] Long press detected - activating blackhole");
            blackholeActivated = true;
            
            // Force cleanup first
            forceBlackholeCleanup();
            
            // Wait a frame then create new blackhole
            setTimeout(() => {
              if (window.app.uiBridge && window.app.uiBridge.createBlackholeEffect) {
                window.app.uiBridge.createBlackholeEffect();
                console.log("[🌀 ACTIVATE] Blackhole effect created");
              }
            }, 50);
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
        if (blackholeActivated) {
          console.log("[🌀 DEACTIVATE] Deactivating blackhole on release");
          blackholeActivated = false;
          
          // Force complete cleanup
          forceBlackholeCleanup();
          
          if (window.app.showStatus) {
            window.app.showStatus('Blackhole Deactivated');
          }
        }
        
        e.preventDefault();
        e.stopPropagation();
      }
    }
    
    // Apply event listeners with capture phase
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    
    // Handle other mouse buttons as before
    document.addEventListener('mousedown', function(e) {
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
    document.addEventListener('dblclick', function(e) {
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
  
  setTimeout(function() {
    applyFixes();
    if (checkInterval) clearInterval(checkInterval);
  }, 5000);
  
  // Expose cleanup function globally for debugging
  window.forceBlackholeCleanup = forceBlackholeCleanup;
})();