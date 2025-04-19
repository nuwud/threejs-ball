// complete-visualizer-fix.js
// A comprehensive solution to hide ALL green visualizers by default
// and only show them when the toggle in the hamburger menu is enabled

document.addEventListener('DOMContentLoaded', function() {
  // 1. First, let's handle the visualization toggles from the previous fix
  
  // Make sure visualization container is hidden by default
  const visualizationContainer = document.getElementById('visualization-container');
  if (visualizationContainer) {
    visualizationContainer.style.display = 'none';
  }
  
  // Make sure checkbox is unchecked by default
  const toggleVisualizationInput = document.getElementById('toggle-visualization');
  if (toggleVisualizationInput) {
    toggleVisualizationInput.checked = false;
  }
  
  // 2. Now let's also handle the green squares from ui-components.js
  
  // First, override the toggleGreenSquares function to always hide squares
  if (window.toggleGreenSquares) {
    const originalToggleGreenSquares = window.toggleGreenSquares;
    window.toggleGreenSquares = function() {
      // Only show if visualization is enabled
      const visualizationEnabled = document.getElementById('toggle-visualization')?.checked || false;
      if (!visualizationEnabled) {
        // Hide all green squares
        const greenSquares = document.querySelectorAll('.green-square');
        greenSquares.forEach(square => {
          square.style.display = 'none';
        });
        return false;
      } else {
        // Use original function when visualization is enabled
        return originalToggleGreenSquares();
      }
    };
  }
  
  // 3. Override the createVisualizationBars function to respect the toggle
  if (window.app) {
    // Store the original functions if they exist
    const originalCreateVisualizationBars = window.createVisualizationBars;
    const originalUpdateVisualizationBars = window.updateVisualizationBars;
    
    // Override with functions that check the toggle state
    window.createVisualizationBars = function(app) {
      const visualizationEnabled = document.getElementById('toggle-visualization')?.checked || false;
      if (!visualizationEnabled) {
        // Skip creating bars if disabled
        return;
      }
      
      // Call original function if visualization is enabled
      if (originalCreateVisualizationBars) {
        originalCreateVisualizationBars(app);
      }
    };
    
    window.updateVisualizationBars = function(app, dataArray) {
      const visualizationEnabled = document.getElementById('toggle-visualization')?.checked || false;
      if (!visualizationEnabled) {
        // Skip updating bars if disabled
        return;
      }
      
      // Call original function if visualization is enabled
      if (originalUpdateVisualizationBars) {
        originalUpdateVisualizationBars(app, dataArray);
      }
    };
  }
  
  // 4. Handle the horizontal green bars shown in the screenshot
  // These appear to be created as audio visualizers within Three.js
  
  // Create a style to hide all visualization elements by default
  const style = document.createElement('style');
  style.textContent = `
    /* Hide all visualization elements by default */
    .visualization-bar, .green-square, .audio-visualizer {
      display: none !important;
    }
    
    /* Hide any green elements that might be visualization bars */
    [style*="background-color: #00ff00"], 
    [style*="background-color:rgb(0,255,0)"], 
    [style*="background: #00ff00"],
    [style*="background:#00ff00"] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  
  // 5. Add a mechanism to show visualizers only when the toggle is checked
  const updateVisualizationVisibility = function() {
    const visualizationEnabled = document.getElementById('toggle-visualization')?.checked || false;
    
    // Update the style to show or hide visualization elements
    if (visualizationEnabled) {
      style.textContent = `
        /* Show visualization elements */
        .visualization-bar, .green-square, .audio-visualizer {
          display: block !important;
        }
      `;
    } else {
      style.textContent = `
        /* Hide visualization elements */
        .visualization-bar, .green-square, .audio-visualizer {
          display: none !important;
        }
        
        /* Hide any green elements that might be visualization bars */
        [style*="background-color: #00ff00"], 
        [style*="background-color:rgb(0,255,0)"], 
        [style*="background: #00ff00"],
        [style*="background:#00ff00"] {
          display: none !important;
        }
      `;
    }
    
    // Also update any THREE.js visualization objects
    if (window.app) {
      // Handle various visualization types
      if (window.app.visualizationBars) {
        const visible = visualizationEnabled;
        window.app.visualizationBars.forEach(bar => {
          if (bar && bar.visible !== undefined) {
            bar.visible = visible;
          }
        });
      }
      
      // Handle THREE.js mesh visualizers
      if (window.app.scene) {
        window.app.scene.traverse(object => {
          // Look for objects that might be visualizers (green materials)
          if (object.material && object.material.color && 
              object.material.color.g > 0.9 && object.material.color.r < 0.2 && object.material.color.b < 0.2) {
            object.visible = visualizationEnabled;
          }
          
          // Look for objects that have "visualizer" in their name
          if (object.name && object.name.toLowerCase().includes('visual')) {
            object.visible = visualizationEnabled;
          }
        });
      }
    }
  };
  
  // Connect toggle to update visualization visibility
  if (toggleVisualizationInput) {
    toggleVisualizationInput.addEventListener('change', updateVisualizationVisibility);
  }
  
  // Run once on page load to ensure initial state is correct
  updateVisualizationVisibility();
  
  // 6. Override the audio visualization creation in THREE.js scene
  // This is for when visualizers are created programmatically
  
  // Watch for three.js scene changes
  const originalAddChild = THREE?.Object3D?.prototype?.add;
  if (originalAddChild) {
    THREE.Object3D.prototype.add = function(...objects) {
      const visualizationEnabled = document.getElementById('toggle-visualization')?.checked || false;
      
      // Check if any of the objects look like visualizers
      objects.forEach(object => {
        // Check if it's a green object (likely a visualizer)
        if (object.material && object.material.color && 
            object.material.color.g > 0.9 && object.material.color.r < 0.2 && object.material.color.b < 0.2) {
          // Make it invisible by default unless visualization is enabled
          object.visible = visualizationEnabled;
        }
        
        // Also check based on object name
        if (object.name && (
            object.name.toLowerCase().includes('visual') || 
            object.name.toLowerCase().includes('bar') ||
            object.name.toLowerCase().includes('audio')
        )) {
          object.visible = visualizationEnabled;
        }
      });
      
      // Call the original function
      return originalAddChild.apply(this, objects);
    };
  }
  
  console.log('All visualization elements (including green bars) set to disabled by default');
});
