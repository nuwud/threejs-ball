// toggle-effect-fixes.js
// This script ensures both the visualization toggle and blackhole effect work correctly

document.addEventListener('DOMContentLoaded', function() {
  // ----- PART 1: VISUALIZATION TOGGLE FIX -----
  // Wait a bit for all scripts to load
  setTimeout(function() {
    // Get the visualization toggle
    const visualizationToggle = document.getElementById('toggle-visualization');
    
    // Make sure the toggle activates all visualization systems
    if (visualizationToggle) {
      // Remove any existing event listeners by cloning and replacing the element
      const newToggle = visualizationToggle.cloneNode(true);
      visualizationToggle.parentNode.replaceChild(newToggle, visualizationToggle);
      
      // Add a new, comprehensive event listener
      newToggle.addEventListener('change', function() {
        const enabled = this.checked;
        console.log(`Visualization toggle set to: ${enabled ? 'ON' : 'OFF'}`);
        
        // 1. Show/hide the visualization container
        const visualizationContainer = document.getElementById('visualization-container');
        if (visualizationContainer) {
          visualizationContainer.style.display = enabled ? 'block' : 'none';
        }
        
        // 2. Set the visualization property in the app
        if (window.app) {
          // Main app visualization
          if (window.app.visualization) {
            window.app.visualization.active = enabled;
          }
          
          // Enhanced visualization
          if (window.app.enhancedVisualization) {
            window.app.enhancedVisualization.active = enabled;
          }
          
          // Audio visualization
          if (window.app.audioVisualization) {
            window.app.audioVisualization.enabled = enabled;
          }
          
          // For direct visualization bars
          if (window.app.visualizationBars) {
            window.app.visualizationBars.forEach(bar => {
              if (bar) bar.visible = enabled;
            });
          }
          
          // Also set any visualization type
          window.app.visualizationType = enabled ? 'bars' : 'none';
        }
        
        // 3. Process THREE.js scene objects (green bars)
        if (window.app && window.app.scene) {
          window.app.scene.traverse(object => {
            // Look for objects that are visualizer bars (have green material)
            if (object.material && object.material.color &&
                object.material.color.g > 0.7 && 
                object.material.color.r < 0.3 && 
                object.material.color.b < 0.3) {
              // Make them visible or invisible based on toggle
              object.visible = enabled;
            }
          });
        }
        
        // 4. Try toggling functions if defined
        if (window.toggleAudioVisualization && window.app) {
          window.toggleAudioVisualization(window.app, enabled);
        }
        
        // Call these functions if we're enabling visualization
        if (enabled) {
          // Create visualization elements if they don't exist
          if (window.createVisualizationBars && 
              window.app && 
              (!window.app.visualizationBars || window.app.visualizationBars.length === 0)) {
            window.createVisualizationBars(window.app);
          }
          
          if (window.createAudioVisualization && window.app) {
            window.createAudioVisualization(window.app);
          }
        }
        
        // Update status message
        if (window.showStatus) {
          window.showStatus(`Visualization ${enabled ? 'Enabled' : 'Disabled'}`);
        }
      });
      
      // Make sure it's off by default
      newToggle.checked = false;
      
      // Trigger change event to ensure initial state is consistent
      const event = new Event('change');
      newToggle.dispatchEvent(event);
      
      console.log("Visualization toggle fixed and initialized");
    }
  }, 1000);
  
  // ----- PART 2: BLACKHOLE EFFECT FIX -----
  setTimeout(function() {
    // Get the blackhole effect button
    const blackholeButton = document.getElementById('blackhole-effect');
    
    if (blackholeButton) {
      // Remove any existing event listeners
      const newBlackholeButton = blackholeButton.cloneNode(true);
      blackholeButton.parentNode.replaceChild(newBlackholeButton, blackholeButton);
      
      // Add a new event listener that directly calls the effect
      newBlackholeButton.addEventListener('click', function() {
        console.log("Blackhole button clicked");
        
        // Try different methods to trigger the blackhole effect
        if (window.appControls && window.appControls.createBlackholeEffect) {
          console.log("Calling appControls.createBlackholeEffect()");
          window.appControls.createBlackholeEffect();
        } 
        else if (window.createBlackholeEffect) {
          console.log("Calling window.createBlackholeEffect()");
          window.createBlackholeEffect();
        }
        else if (window.app && window.app.effects && window.app.effects.createBlackholeEffect) {
          console.log("Calling app.effects.createBlackholeEffect()");
          window.app.effects.createBlackholeEffect();
        }
        
        // Show status message
        if (window.showStatus) {
          window.showStatus('Blackhole Effect Activated');
        }
      });
      
      console.log("Blackhole effect button fixed");
    }
    
    // ---- PART 3: Make sure the code for createBlackholeEffect exists and works ----
    // If there's no createBlackholeEffect function or it's broken, define our own
    if (!window.createBlackholeEffect || typeof window.createBlackholeEffect !== 'function') {
      // Create a simple blackhole effect implementation
      window.createBlackholeEffect = function() {
        console.log("Custom blackhole effect activated");
        
        if (!window.app || !window.app.ballGroup) {
          console.log("Cannot create blackhole effect: no ball found");
          return;
        }
        
        const ball = window.app.ballGroup;
        const originalScale = ball.scale.clone();
        
        // Store original material color
        const originalColor = new THREE.Color();
        if (ball.userData && ball.userData.mesh && ball.userData.mesh.material) {
          originalColor.copy(ball.userData.mesh.material.color);
        }
        
        // Animation parameters
        let time = 0;
        const duration = 2.0; // seconds
        
        function animateBlackhole() {
          time += 0.016; // Approximately 60fps
          
          const progress = Math.min(time / duration, 1.0);
          const easeInOut = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          
          // Scale down to create implosion effect
          const scale = 1.0 - easeInOut * 0.5;
          ball.scale.set(scale, scale, scale);
          
          // Change color to dark
          if (ball.userData && ball.userData.mesh && ball.userData.mesh.material) {
            const material = ball.userData.mesh.material;
            material.color.setRGB(
              originalColor.r * (1 - easeInOut) + 0 * easeInOut,
              originalColor.g * (1 - easeInOut) + 0 * easeInOut,
              originalColor.b * (1 - easeInOut) + 0 * easeInOut
            );
          }
          
          // Continue animation if duration not reached
          if (progress < 1.0) {
            requestAnimationFrame(animateBlackhole);
          } else {
            // Restore original state after a delay
            setTimeout(() => {
              // Return to original scale
              ball.scale.copy(originalScale);
              
              // Return to original color
              if (ball.userData && ball.userData.mesh && ball.userData.mesh.material) {
                ball.userData.mesh.material.color.copy(originalColor);
              }
              
              if (window.showStatus) {
                window.showStatus('Blackhole effect completed');
              }
            }, 500);
          }
        }
        
        // Start animation
        animateBlackhole();
        
        if (window.showStatus) {
          window.showStatus('Blackhole Effect Activated');
        }
      };
      
      // Also attach it to appControls if it exists
      if (window.appControls) {
        window.appControls.createBlackholeEffect = window.createBlackholeEffect;
      }
      
      console.log("Custom blackhole effect function created");
    }
  }, 1500);
  
  console.log("Toggle and effect fixes applied");
});
