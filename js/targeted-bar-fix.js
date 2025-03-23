// targeted-bar-fix.js
// A very targeted fix specifically for the createVisualizationBars function

document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for THREE.js to initialize
  setTimeout(function() {
    if (!window.app || !window.app.scene) {
      console.log("Can't find app or scene for bar fix");
      return;
    }
    
    // First approach: Directly monkey-patch the function that creates the green bars
    if (window.createVisualizationBars) {
      console.log("Found createVisualizationBars function, replacing it");
      
      // Save the original function
      const originalCreateVisualizationBars = window.createVisualizationBars;
      
      // Replace it with a dummy function that does nothing
      window.createVisualizationBars = function() {
        console.log("createVisualizationBars called but disabled");
        return null;
      };
    }
    
    // Second approach: Remove the bars if they were already created
    if (window.app.visualizationBars && window.app.visualizationBars.length > 0) {
      console.log("Found existing visualization bars, removing them");
      
      // Remove each bar from the scene
      window.app.visualizationBars.forEach(function(bar) {
        if (bar && bar.parent) {
          bar.parent.remove(bar);
        }
      });
      
      // Clear the array
      window.app.visualizationBars = [];
    }
    
    // Third approach: Use mutation observer for detection
    const observer = new MutationObserver(function() {
      // Check if visualization bars were added
      if (window.app.visualizationBars && window.app.visualizationBars.length > 0) {
        // Hide them all
        window.app.visualizationBars.forEach(function(bar) {
          if (bar) {
            bar.visible = false;
          }
        });
      }
    });
    
    // Observe changes to the window.app object
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Fourth approach: Fix the visualization.js imports
    // Find visualization.js functions that use app.visualizationType = 'bars'
    if (window.app) {
      // Prevent the bars visualization type from being set
      Object.defineProperty(window.app, 'visualizationType', {
        set: function(value) {
          console.log(`Attempted to set visualizationType to ${value}, blocking 'bars'`);
          if (value !== 'bars') {
            this._visualizationType = value;
          }
        },
        get: function() {
          return this._visualizationType || 'none';
        }
      });
      
      // Also handle the app.audioVisualization.enabled property
      if (!window.app.audioVisualization) {
        window.app.audioVisualization = { enabled: false };
      } else {
        window.app.audioVisualization.enabled = false;
      }
    }
    
    // Fifth approach: Handle the toggle in the menu
    const toggleVisualizationInput = document.getElementById('toggle-visualization');
    if (toggleVisualizationInput) {
      // Make sure it's unchecked by default
      toggleVisualizationInput.checked = false;
      
      // Change its behavior to clean up bars when turned off
      toggleVisualizationInput.addEventListener('change', function() {
        if (!this.checked && window.app.visualizationBars) {
          // Hide all bars when turned off
          window.app.visualizationBars.forEach(function(bar) {
            if (bar) bar.visible = false;
          });
        }
      });
    }
    
    console.log("Targeted bar fix applied");
  }, 500);
});
