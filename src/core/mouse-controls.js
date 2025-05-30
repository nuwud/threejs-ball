/**
 * Enhanced mouse interaction controls for the Three.js ball
 * Provides interactive effects for different mouse buttons and wheel
 */

// Use IIFE to avoid global namespace pollution
(function() {
  // Track initialization attempts with backoff
  let initAttempts = 0;
  const MAX_ATTEMPTS = 20;
  const INITIAL_WAIT = 100;
  
  // Keep global reference to mouse wheel handler for event binding
  let globalHandleMouseWheel = null;
  
  // Wait for THREE and app to be available before proceeding
  function checkForInitialization() {
    try {
      initAttempts++;
      
      // Check that not only THREE exists but also that the app is ready with the ball
      if (typeof window.THREE === 'undefined' || !window.THREE.Vector3) {
        console.log(`THREE not yet available (attempt ${initAttempts}/${MAX_ATTEMPTS}), waiting...`);
        setTimeout(checkForInitialization, INITIAL_WAIT * Math.min(initAttempts, 10));
        return;
      }
      
      if (!window.app || !window.app.ballGroup) {
        console.log(`App or ballGroup not available (attempt ${initAttempts}/${MAX_ATTEMPTS}), waiting...`);
        setTimeout(checkForInitialization, INITIAL_WAIT * Math.min(initAttempts, 10));
        return;
      }
      
      console.log('THREE and app are fully available, initializing mouse controls');
      
      // Initialize controls
      const THREE = window.THREE;
      initMouseControls(THREE);
      
      // Setup effect buttons only after controls are initialized
      setTimeout(() => {
        if (window.app.mouseControlsInitialized) {
          setupMouseButtonEffects();
        }
      }, 500);
      
    } catch (e) {
      console.error("Error checking for initialization:", e);
      if (initAttempts < MAX_ATTEMPTS) {
        // Wait longer before retrying with backoff
        setTimeout(checkForInitialization, INITIAL_WAIT * Math.min(initAttempts, 10));
      } else {
        console.error("Maximum initialization attempts reached, giving up");
      }
    }
  }
  
  // Function to handle mouse wheel for zooming inside the ball
  function handleMouseWheel(event) {
    // Prevent default scrolling
    event.preventDefault();
    
    try {
      // If app is not available, do nothing
      if (!window.app || !window.app.camera) return;
      
      // If we're in spikiness mode, adjust spikiness
      if (window.app.mouseControls && window.app.mouseControls.isSpikinessModeActive) {
        // Calculate delta based on scroll direction
        const delta = Math.sign(event.deltaY) * 0.05;
        
        // Update spikiness value
        if (typeof window.app.spikiness === 'undefined') {
          window.app.spikiness = 0;
        }
        
        window.app.spikiness = Math.max(0, Math.min(1, window.app.spikiness + delta));
        
        // Mark as user-initiated
        window.app.userInitiatedSpikiness = true;
        
        // Apply deformation with current spikiness value
        if (window.app.applyDeformationInteraction) {
          window.app.applyDeformationInteraction(window.app.spikiness * 2);
        }
        
        return;
      }
      
      // Otherwise, handle camera zoom
      // Get current camera position
      const cameraPos = window.app.camera.position.clone();
      const distance = cameraPos.length();
      
      // Determine zoom direction
      const zoomDirection = Math.sign(event.deltaY);
      
      // Calculate new distance, clamped between 0.5 (inside) and 4.0 (far outside)
      let newDistance = distance + zoomDirection * 0.1;
      newDistance = Math.max(0.5, Math.min(4.0, newDistance));
      
      // Set new camera position in same direction but with new distance
      const newPos = cameraPos.normalize().multiplyScalar(newDistance);
      window.app.camera.position.copy(newPos);
      
      // Handle inside/outside transition
      if (newDistance < 0.9 && (!window.app.insidePullMode)) {
        // We've moved inside the ball
        window.app.insidePullMode = true;
        console.log("Camera inside ball - switching to inside pull mode");
        
        // Make material translucent when viewing from inside
        if (window.app.ballMesh && window.app.ballMesh.material) {
          if (!window.app._originalOpacity) {
            window.app._originalOpacity = window.app.ballMesh.material.opacity;
          }
          window.app.ballMesh.material.opacity = 0.4;
          window.app.ballMesh.material.side = THREE.BackSide;
        }
      } else if (newDistance >= 0.9 && window.app.insidePullMode) {
        // We've moved outside the ball
        window.app.insidePullMode = false;
        console.log("Camera outside ball - switching to outside push mode");
        
        // Restore original material properties
        if (window.app.ballMesh && window.app.ballMesh.material && window.app._originalOpacity) {
          window.app.ballMesh.material.opacity = window.app._originalOpacity;
          window.app.ballMesh.material.side = THREE.DoubleSide;
        }
      }
      
      // Update controls if they exist
      if (window.app.controls) {
        window.app.controls.update();
      }
    } catch (e) {
      console.error("Error in mouse wheel handler:", e);
    }
  }
  
  // Init mouse controls with support for all interactions
  function initMouseControls(THREE) {
    try {
      // Check if app, scene and camera are available
      if (!window.app || !window.app.scene || !window.app.camera) {
        console.warn('App, scene or camera not available for mouse controls');
        return false;
      }
      
      // Check if the ballGeometry is available
      if (!window.app.ballGeometry) {
        console.warn('Ball geometry not available for mouse controls');
        return false;
      }
      
      // Verify the geometry has attributes and position array
      if (!window.app.ballGeometry.attributes || 
          !window.app.ballGeometry.attributes.position ||
          !window.app.ballGeometry.attributes.position.array) {
        console.warn('Ball geometry does not have proper attributes');
        return false;
      }
      
      // Verify that original positions are stored
      if (!window.app.originalPositions) {
        console.log('Storing original vertex positions...');
        
        // Store original vertex positions for reset
        const posAttr = window.app.ballGeometry.attributes.position;
        window.app.originalPositions = new Float32Array(posAttr.array.length);
        
        // Copy values, not reference
        for (let i = 0; i < posAttr.array.length; i++) {
          window.app.originalPositions[i] = posAttr.array[i];
        }
      }
      
      console.log('Initializing enhanced mouse controls...');
      
      // Only initialize once
      if (window.app.mouseControlsInitialized) {
        console.log('Mouse controls already initialized');
        return true;
      }
      
      // Initialize state using the passed THREE object
      window.app.mouseControls = {
        mouse: new THREE.Vector2(),
        raycaster: new THREE.Raycaster(),
        isDragging: false,
        previousMousePosition: { x: 0, y: 0 },
        isHovered: false,
        touchPoint: null,
        isSpikinessModeActive: false,
        isBlackholeModeActive: false,
        isMagneticModeActive: false,
        deformStrength: 0.5,
        wheelSensitivity: 0.05
      };
      
      // Create visual indicator for touch point if it doesn't exist
      if (!window.app.touchSphere) {
        const touchSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 16, 16),
          new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF, 
            transparent: true, 
            opacity: 0.5 
          })
        );
        touchSphere.visible = false;
        window.app.scene.add(touchSphere);
        window.app.touchSphere = touchSphere;
      }
      
      // Create blackhole at specific point
      function createBlackholeAtPoint(point) {
        console.log('Creating blackhole at point:', point);
        
        // Remove existing blackhole
        removeBlackhole();
        
        // Create blackhole center
        const blackholeMaterial = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.8
        });
        
        const blackholeGeometry = new THREE.SphereGeometry(0.2, 32, 32);
        const blackholeCenter = new THREE.Mesh(blackholeGeometry, blackholeMaterial);
        blackholeCenter.position.copy(point);
        window.app.scene.add(blackholeCenter);
        window.app.blackholeCenter = blackholeCenter;
        
        // Create glowing ring
        const ringGeometry = new THREE.RingGeometry(0.3, 0.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0x6600FF,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(point);
        ring.lookAt(window.app.camera.position);
        window.app.scene.add(ring);
        window.app.blackholeRing = ring;
        
        // Create particles
        const particleCount = 500;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
          // Calculate particle positions in a disk around the blackhole
          const radius = 0.3 + Math.random() * 0.5;
          const angle = Math.random() * Math.PI * 2;
          const height = (Math.random() - 0.5) * 0.3;
          
          positions[i * 3] = point.x + Math.cos(angle) * radius;
          positions[i * 3 + 1] = point.y + height;
          positions[i * 3 + 2] = point.z + Math.sin(angle) * radius;
          
          // Purple/blue colors
          colors[i * 3] = 0.5 + Math.random() * 0.5; // R
          colors[i * 3 + 1] = 0; // G
          colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // B
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
          size: 0.02,
          vertexColors: true,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        window.app.scene.add(particles);
        window.app.blackholeParticles = particles;
        
        // Function to update blackhole effect
        function updateBlackholeEffect() {
          if (!window.app.blackholeCenter) return;
          
          // Import and use the effectManager's implementation if available
          try {
            import('../effects/effectManager.js')
              .then(({updateBlackholeEffect}) => {
                updateBlackholeEffect(window.app);
              });
          } catch (e) {
            console.warn('Could not import effectManager, using fallback blackhole update');
            // Minimal fallback implementation
            const time = performance.now() * 0.001;
            if (window.app.blackholeRing) {
              window.app.blackholeRing.rotation.z = time * 0.5;
            }
          }
        }
        
        // Store the update function
        window.app.updateBlackholeEffect = updateBlackholeEffect;
        
        // Add it to the animation loop if not already added
        if (!window.app.blackholeAnimationAdded) {
          const originalAnimate = window.app.animate;
          window.app.animate = function() {
            originalAnimate();
            if (window.app.updateBlackholeEffect) {
              window.app.updateBlackholeEffect();
            }
          };
          window.app.blackholeAnimationAdded = true;
        }
        
        // Set state
        window.app.isBlackholeActive = true;
        return true;
      }
      
      // Function to remove blackhole effect
      function removeBlackhole() {
        // Remove existing blackhole
        if (window.app.blackholeCenter) {
          window.app.scene.remove(window.app.blackholeCenter);
          window.app.blackholeCenter = null;
        }
        if (window.app.blackholeRing) {
          window.app.scene.remove(window.app.blackholeRing);
          window.app.blackholeRing = null;
        }
        if (window.app.blackholeParticles) {
          window.app.scene.remove(window.app.blackholeParticles);
          window.app.blackholeParticles = null;
        }
        
        // Reset state
        window.app.isBlackholeActive = false;
        return true;
      }
      
      // Make functions globally available
      window.app.createBlackholeAtPoint = createBlackholeAtPoint;
      window.app.removeBlackhole = removeBlackhole;
      window.app.handleMouseWheel = handleMouseWheel;
      globalHandleMouseWheel = handleMouseWheel;
      
      // Store the mouse wheel handler globally
      window.handleMouseWheel = handleMouseWheel;
      
      // ========= SETUP MOUSE HANDLERS =========
      window.addEventListener('mousemove', function(event) {
        // Basic fallback for onPointerMove
        if (window.app.onPointerMove) {
          window.app.onPointerMove(event);
        }
      });
      
      window.addEventListener('mousedown', function(event) {
        // If in blackhole mode and right click, create blackhole
        if (event.button === 2 && window.app.mouseControls && 
            window.app.mouseControls.isBlackholeModeActive) {
          
          event.preventDefault();
          
          // Calculate mouse position in normalized device coordinates
          const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
          );
          
          // Update the picking ray
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, window.app.camera);
          
          // Get intersection with ball or place along ray
          const intersects = raycaster.intersectObject(window.app.ballGroup, true);
          
          if (intersects.length > 0) {
            // Create blackhole at intersection point
            createBlackholeAtPoint(intersects[0].point);
          } else {
            // Create blackhole along the ray at a fixed distance
            const blackholePos = new THREE.Vector3();
            raycaster.ray.at(2, blackholePos);
            createBlackholeAtPoint(blackholePos);
          }
        }
        
        // Call original handler if available
        if (window.app.onPointerDown) {
          window.app.onPointerDown(event);
        }
      });
      
      window.addEventListener('mouseup', function(event) {
        if (window.app.onPointerUp) {
          window.app.onPointerUp(event);
        }
      });
      
      // Setup mouse wheel specifically for zooming in/out
      window.addEventListener('wheel', handleMouseWheel, { passive: false });
      
      // Mark as initialized
      window.app.mouseControlsInitialized = true;
      console.log('Mouse controls initialized successfully');
      return true;
    } catch (e) {
      console.error("Error initializing mouse controls:", e);
      return false;
    }
  }
  
  // This function sets up the mouse buttons for specific effects
  function setupMouseButtonEffects() {
    console.log("Setting up enhanced mouse button effects...");
    
    try {
      // Prevent context menu when using right-click for special effects
      window.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        console.log("Context menu prevented by mouse-controls.js");
        return false;
      });
      
      // Add event listeners for mouse buttons
      window.addEventListener('mousedown', (event) => {
        console.log(`Mouse button detected: ${event.button}`);
        
        // Map effects to specific mouse buttons
        switch (event.button) {
          case 0: // Left click
            // Regular interaction handled by main.js
            break;
            
          case 1: // Middle click/wheel - toggle camera inside mode
            event.preventDefault();
            console.log("Middle click - toggle camera inside/outside");
            if (window.app.uiBridge && window.app.uiBridge.toggleCameraPosition) {
              window.app.uiBridge.toggleCameraPosition();
            }
            break;
            
          case 2: // Right click - blackhole toggle
            event.preventDefault();
            console.log("Right click - toggle blackhole effect");
            if (window.app.uiBridge && window.app.uiBridge.createBlackholeEffect) {
              window.app.uiBridge.createBlackholeEffect();
            }
            break;
            
          case 3: // First side button (Back) - EXPLOSION EFFECT
            console.log("Side button (back) - creating explosion effect");
            if (window.app.uiBridge && window.app.uiBridge.createExplosion) {
              window.app.uiBridge.createExplosion();
            }
            break;
            
          case 4: // Second side button (Forward) - magnetic effect
            console.log("Side button (forward) - toggling magnetic trail effect");
            if (window.app.uiBridge && window.app.uiBridge.createMagneticEffect) {
              window.app.uiBridge.createMagneticEffect();
            }
            break;
        }
      }, true); // Note the 'true' parameter for capture phase
      
      // Add wheel event for zooming inside/outside the ball
      window.addEventListener('wheel', handleMouseWheel, { passive: false });
      
      console.log("Mouse button effects successfully set up");
    } catch (e) {
      console.error("Error setting up mouse button effects:", e);
    }
  }

  // Make them globally available
  window.setupMouseButtonEffects = setupMouseButtonEffects;
  window.handleMouseWheel = handleMouseWheel;

  // Start checking for initialization
  if (document.readyState === 'complete') {
    checkForInitialization();
  } else {
    window.addEventListener('load', checkForInitialization);
  }
})();
