// direct-green-bar-fix.js
// A targeted solution specifically for the horizontal green bars

document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for THREE.js to initialize
  setTimeout(function() {
    if (!window.app || !window.app.scene) {
      console.log("Can't find app or scene for green bar fix");
      return;
    }
    
    // Find and remove the green bars from the scene
    function removeGreenBars() {
      // Look for green objects in the scene
      const greenObjects = [];
      
      // Traverse the scene to find all green objects
      window.app.scene.traverse(function(object) {
        // Check if it has a material with a green color
        if (object.material && object.material.color) {
          const color = object.material.color;
          
          // Check if it's a bright green color (like #00FF00)
          if (color.r < 0.2 && color.g > 0.8 && color.b < 0.2) {
            greenObjects.push(object);
          }
        }
        
        // Also check custom properties or names that might indicate it's a visualizer
        if ((object.name && (
            object.name.toLowerCase().includes('visual') || 
            object.name.toLowerCase().includes('bar') || 
            object.name.toLowerCase().includes('audio')))
            ||
            (object.userData && object.userData.isVisualizer)
        ) {
          if (!greenObjects.includes(object)) {
            greenObjects.push(object);
          }
        }
      });
      
      // Remove or hide all green objects found
      console.log(`Found ${greenObjects.length} green objects in the scene`);
      greenObjects.forEach(function(object) {
        // Option 1: Make them invisible (safest)
        object.visible = false;
        
        // Option 2: Remove them from their parent (more aggressive)
        if (object.parent) {
          object.parent.remove(object);
        }
      });
    }
    
    // Call immediately 
    removeGreenBars();
    
    // Also look for references to visualization bars in the app
    if (window.app.visualizationBars) {
      window.app.visualizationBars.forEach(bar => {
        if (bar) bar.visible = false;
      });
      console.log("Disabled app.visualizationBars");
    }
    
    // Disable functions that create the green bars
    const functionsToDisable = [
      'createVisualizationBars',
      'updateVisualizationBars',
      'createAudioVisualization',
      'updateAudioVisualization'
    ];
    
    functionsToDisable.forEach(funcName => {
      if (window[funcName]) {
        console.log(`Disabling ${funcName}`);
        window[funcName] = function() {};
      }
    });
    
    // Prevent green bars from being created when clicking the ball
    
    // Monitor all meshes being added to the scene
    const originalThreeObjectAdd = THREE.Object3D.prototype.add;
    THREE.Object3D.prototype.add = function(...objects) {
      // Check each object being added
      objects.forEach(object => {
        // If it's a green material, make it invisible
        if (object.material && object.material.color) {
          const color = object.material.color;
          if (color.r < 0.2 && color.g > 0.8 && color.b < 0.2) {
            object.visible = false;
          }
        }
      });
      
      // Call the original function
      return originalThreeObjectAdd.apply(this, objects);
    };
    
    // Create a MutationObserver to watch for any new elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // For DOM elements that get added
          if (node.style && (
              node.style.backgroundColor === '#00ff00' || 
              node.style.backgroundColor === 'rgb(0, 255, 0)' ||
              node.classList?.contains('green-square') ||
              node.classList?.contains('visualization-bar')
          )) {
            node.style.display = 'none';
          }
          
          // If it has child nodes, check them too
          if (node.querySelectorAll) {
            const greenElements = node.querySelectorAll('[style*="background-color: #00ff00"], [style*="background-color: rgb(0, 255, 0)"], .green-square, .visualization-bar');
            greenElements.forEach(el => {
              el.style.display = 'none';
            });
          }
        });
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Handle the existing visualization toggle to show/hide the bars properly
    const visualizationToggle = document.getElementById('toggle-visualization');
    if (visualizationToggle) {
      // Update the event listener
      visualizationToggle.addEventListener('change', function() {
        const enabled = this.checked;
        
        // Only show green bars if explicitly enabled
        if (enabled) {
          // Remove our previous fixes and let normal visualization happen
          console.log("Visualization enabled from toggle");
        } else {
          // Re-apply our fix to hide the green bars
          removeGreenBars();
          console.log("Visualization disabled from toggle");
        }
      });
    }
    
    // Now add our own keyboard shortcut to force-remove green bars for debugging
    document.addEventListener('keydown', function(e) {
      // Ctrl+Alt+G to force remove green bars
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'g') {
        removeGreenBars();
        console.log("Green bars removed via keyboard shortcut");
      }
    });
    
    console.log("Direct green bar fix applied");
  }, 1000); // Delay execution to ensure THREE.js is fully loaded
});
