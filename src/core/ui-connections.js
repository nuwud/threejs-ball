/**
 * UI Connections for Three.js Ball
 * Connects UI elements to ball interactions
 */

(function() {
  // Track initialization attempts
  let initAttempts = 0;
  const MAX_ATTEMPTS = 10;
  
  function connectUIElements() {
    if (!window.app || !window.app.uiBridge) {
      initAttempts++;
      if (initAttempts > MAX_ATTEMPTS) {
        console.error('Failed to connect UI elements after maximum attempts');
        return;
      }
      
      console.log(`App or uiBridge not available (attempt ${initAttempts}/${MAX_ATTEMPTS})`);
      setTimeout(connectUIElements, 500);
      return;
    }

    console.log('Connecting UI elements to ball interactions...');
    
    // Prevent duplicate initialization
    if (window.app.uiConnectionsInitialized) {
      console.log('UI connections already initialized');
      return;
    }
    
    // Connect Spikiness Slider
    const spikinessSlider = document.getElementById('spikiness-slider');
    if (spikinessSlider) {
      spikinessSlider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        console.log('Setting spikiness intensity to', value);
        window.app.spikiness = value;
        
        // Update spikiness indicator if available
        const spikinessValue = document.getElementById('spikiness-value');
        if (spikinessValue) {
          spikinessValue.textContent = `${Math.round(value * 100)}%`;
        }
        
        // Store in localStorage
        try { localStorage.setItem('ballSpikiness', value); } catch(e) {}
      });
      
      // Set initial value from localStorage if available
      const storedSpikiness = localStorage.getItem('ballSpikiness');
      if (storedSpikiness) {
        const value = parseFloat(storedSpikiness);
        spikinessSlider.value = value;
        window.app.spikiness = value;
        
        // Update spikiness indicator if available
        const spikinessValue = document.getElementById('spikiness-value');
        if (spikinessValue) {
          spikinessValue.textContent = `${Math.round(value * 100)}%`;
        }
      }
      
      console.log('Spikiness slider connected');
    }

    // Connect Spikiness Mode Toggle
    const spikinessModeToggle = document.getElementById('toggle-spikiness-mode');
    if (spikinessModeToggle) {
      spikinessModeToggle.addEventListener('change', (event) => {
        const isActive = event.target.checked;
        console.log('Spikiness mode ' + (isActive ? 'enabled' : 'disabled'));
        window.app.mouseControls.isSpikinessModeActive = isActive;
        
        // Show instructions tooltip when enabled
        if (isActive) {
          showTooltip('Left-click to push out, right-click to pull in, mouse wheel to adjust intensity');
        } else {
          // Reset deformation when disabled
          if (typeof window.app.resetDeformation === 'function') {
            window.app.resetDeformation(0.2);
          }
        }
        
        // Store in localStorage
        try { localStorage.setItem('ballSpikinessModeActive', isActive); } catch(e) {}
      });
      
      // Set initial state from localStorage
      const storedActive = localStorage.getItem('ballSpikinessModeActive');
      if (storedActive === 'true' && window.app.mouseControls) {
        spikinessModeToggle.checked = true;
        window.app.mouseControls.isSpikinessModeActive = true;
      }
      
      console.log('Spikiness mode toggle connected');
    } else {
      // If no dedicated toggle exists, use the slider label as toggle
      const sliderLabel = document.querySelector('label[for="spikiness-slider"]');
      if (sliderLabel) {
        sliderLabel.style.cursor = 'pointer';
        sliderLabel.addEventListener('click', (event) => {
          if (window.app.mouseControls) {
            window.app.mouseControls.isSpikinessModeActive = !window.app.mouseControls.isSpikinessModeActive;
            const isActive = window.app.mouseControls.isSpikinessModeActive;
            
            console.log('Spikiness mode ' + (isActive ? 'enabled' : 'disabled'));
            
            // Show instructions tooltip when enabled
            if (isActive) {
              showTooltip('Left-click to push out, right-click to pull in, mouse wheel to adjust intensity');
            } else {
              // Reset deformation when disabled
              if (typeof window.app.resetDeformation === 'function') {
                window.app.resetDeformation(0.2);
              }
            }
            
            // Store in localStorage
            try { localStorage.setItem('ballSpikinessModeActive', isActive); } catch(e) {}
          }
        });
        
        console.log('Spikiness label toggle connected');
      }
    }

    // Connect Blackhole Toggle
    const blackholeToggle = document.getElementById('toggle-blackhole');
    if (blackholeToggle) {
      blackholeToggle.addEventListener('change', (event) => {
        const isActive = event.target.checked;
        console.log('Blackhole mode ' + (isActive ? 'enabled' : 'disabled'));
        
        if (window.app.mouseControls) {
          window.app.mouseControls.isBlackholeModeActive = isActive;
          
          // Show instructions tooltip when enabled
          if (isActive) {
            showTooltip('Right-click anywhere to create a blackhole that pulls the ball');
          } else {
            // Remove any active blackhole when disabled
            if (window.app.removeBlackhole) {
              window.app.removeBlackhole();
            }
          }
        }
        
        // Store in localStorage
        try { localStorage.setItem('ballBlackholeActive', isActive); } catch(e) {}
      });
      
      // Set initial state from localStorage
      const storedActive = localStorage.getItem('ballBlackholeActive');
      if (storedActive === 'true' && window.app.mouseControls) {
        blackholeToggle.checked = true;
        window.app.mouseControls.isBlackholeModeActive = true;
      }
      
      console.log('Blackhole toggle connected');
    }

    // Connect Magnetic Trails Toggle
    const magneticToggle = document.getElementById('toggle-magnetic');
    if (magneticToggle) {
      magneticToggle.addEventListener('change', (event) => {
        const isActive = event.target.checked;
        console.log('Magnetic trail mode ' + (isActive ? 'enabled' : 'disabled'));
        
        if (window.app.mouseControls) {
          window.app.mouseControls.isMagneticModeActive = isActive;
          
          // Create or remove trail based on state
          if (isActive) {
            if (window.app.createMagneticTrail) {
              window.app.createMagneticTrail();
              showTooltip('Hover over the ball to create magnetic trails');
            }
          } else {
            if (window.app.removeMagneticTrail) {
              window.app.removeMagneticTrail();
            }
          }
        }
        
        // Store in localStorage
        try { localStorage.setItem('ballMagneticActive', isActive); } catch(e) {}
      });
      
      // Set initial state from localStorage
      const storedActive = localStorage.getItem('ballMagneticActive');
      if (storedActive === 'true' && window.app.mouseControls) {
        magneticToggle.checked = true;
        window.app.mouseControls.isMagneticModeActive = true;
        // Create trail if mode is active
        if (window.app.createMagneticTrail) {
          setTimeout(() => window.app.createMagneticTrail(), 100);
        }
      }
      
      console.log('Magnetic toggle connected');
    }
    
    // Connect Explosion Button
    const explosionButton = document.getElementById('trigger-explosion');
    if (explosionButton) {
      explosionButton.addEventListener('click', () => {
        console.log('Explosion triggered');
        
        // Get ball position for explosion center
        const ballPos = new THREE.Vector3();
        if (window.app.ballGroup) {
          window.app.ballGroup.getWorldPosition(ballPos);
        }
        
        if (window.app.createExplosion) {
          window.app.createExplosion(ballPos);
        }
      });
      
      console.log('Explosion button connected');
    }
    
    // Connect Reset Ball Button
    const resetButton = document.getElementById('reset-ball');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        console.log('Resetting ball');
        
        if (window.app.uiBridge && window.app.uiBridge.resetBall) {
          window.app.uiBridge.resetBall();
        }
      });
      
      console.log('Reset button connected');
    }

    // Add this to activate modes based on localStorage settings
    const storedMagneticActive = localStorage.getItem('ballMagneticActive');
    if (storedMagneticActive === 'true' && window.app.mouseControls) {
      window.app.mouseControls.isMagneticModeActive = true;
      if (window.app.createMagneticTrail) {
        setTimeout(() => window.app.createMagneticTrail(), 500);
      }
    }

    const storedBlackholeActive = localStorage.getItem('ballBlackHoleActive');
    if (storedBlackholeActive === 'true' && window.app.mouseControls) {
      window.app.mouseControls.isBlackholeModeActive = true;
    }

    // Find the toggle button
    const deformModeToggleButton = document.getElementById('deform-mode-toggle');
    
    if (deformModeToggleButton) {
        deformModeToggleButton.addEventListener('click', function() {
            if (window.app && window.app.uiBridge && window.app.uiBridge.toggleDeformationMode) {
                const mode = window.app.uiBridge.toggleDeformationMode();
                
                // Update button appearance based on mode
                if (mode) {
                    deformModeToggleButton.classList.add('active');
                    deformModeToggleButton.querySelector('.label').textContent = 'Mode: Internal Pull';
                } else {
                    deformModeToggleButton.classList.remove('active');
                    deformModeToggleButton.querySelector('.label').textContent = 'Mode: External Push';
                }
            }
        });
    }
    
    // Initialize button state
    if (deformModeToggleButton && window.app && window.app.insidePullMode) {
        deformModeToggleButton.classList.toggle('active', window.app.insidePullMode);
        deformModeToggleButton.querySelector('.label').textContent = 
            window.app.insidePullMode ? 'Mode: Internal Pull' : 'Mode: External Push';
    }

    // Connect inside camera button
    const insideCameraButton = document.getElementById('inside-camera-button');
    if (insideCameraButton) {
      insideCameraButton.addEventListener('click', function() {
        if (window.app && window.app.uiBridge) {
          const isInside = window.app.uiBridge.toggleCameraPosition();
          this.classList.toggle('active', isInside);
          
          // If we're now inside, also ensure inside pull mode is active
          if (isInside && window.app.uiBridge.toggleDeformationMode) {
            // Make sure inside pull mode is active
            if (!window.app.insidePullMode) {
              window.app.uiBridge.toggleDeformationMode();
            }
          }
        }
      });
    }
    
    // Mark as initialized
    window.app.uiConnectionsInitialized = true;
    console.log('UI connections initialized successfully');
  }

  // Wait for app to be ready, then try to initialize
  console.log('UI connections script loaded, will initialize when app is ready');
  setTimeout(connectUIElements, 1000);
})();