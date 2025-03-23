// BUTTON REMOVER SCRIPT
// This script removes stray buttons from the Three.js ball app
// Created per user request to clean up the layout
// Author: Claude AI

// Wait for document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // 1. PREVENT BUTTONS FROM BEING CREATED
  
  // Prevent ui-components.js from creating the "Toggle Green Squares" button
  if (window.initializeUI) {
    // Replace the original function with a no-op version
    const originalInitializeUI = window.initializeUI;
    window.initializeUI = function() {
      console.log('UI initialization suppressed to prevent stray buttons');
      return null;
    };
  }
  
  // Prevent debug.js from automatically creating buttons
  if (window.debugTools) {
    // Disable the automatic creation functions
    window.debugTools.createDebugUI = function() {
      console.log('Debug UI creation suppressed');
      return null;
    };
    
    window.debugTools.addDebugButton = function() {
      console.log('Debug button creation suppressed');
      return null;
    };
  }
  
  // 2. REMOVE EXISTING BUTTONS
  
  // First, immediately remove the emergency debug button from index.html if it exists
  const emergencyDebugButton = document.getElementById('emergency-debug');
  if (emergencyDebugButton) {
    emergencyDebugButton.remove();
    console.log('Removed emergency-debug button');
  }
  
  // Next, handle the audioDebug.js audio test button (in lower right corner)
  const audioDebugPanel = document.getElementById('audio-debug-panel');
  if (audioDebugPanel) {
    audioDebugPanel.remove();
    console.log('Removed audio debug panel with test button');
  }
  
  // Remove any recovery ball buttons from debug.js
  const removeButtonsByText = function(buttonText) {
    document.querySelectorAll('button').forEach(button => {
      if (button.textContent === buttonText) {
        button.remove();
        console.log(`Removed button with text: ${buttonText}`);
      }
    });
  };
  
  removeButtonsByText('Create Recovery Ball');
  removeButtonsByText('Debug Scene');
  removeButtonsByText('Toggle Green Squares');
  
  // Remove any positioned buttons (buttons that have fixed or absolute positioning)
  document.querySelectorAll('button').forEach(button => {
    const style = window.getComputedStyle(button);
    // Skip buttons in the main menu panel
    if (button.closest('#menu-panel')) {
      return;
    }
    
    // Check for positioned buttons outside the menu panel
    if (style.position === 'fixed' || style.position === 'absolute') {
      button.remove();
      console.log('Removed positioned button:', button.id || button.textContent);
    }
  });
  
  // 3. CREATE A MUTATION OBSERVER TO CONTINUOUSLY REMOVE ANY NEW BUTTONS
  
  // This will catch any buttons that might be added dynamically after our script runs
  const buttonObserver = new MutationObserver(function(mutations) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        // Check if this is a button element or contains buttons
        if (node.tagName === 'BUTTON') {
          // Skip buttons inside the menu panel
          if (!node.closest('#menu-panel')) {
            node.remove();
            console.log('Removed dynamically added button:', node.id || node.textContent);
          }
        } else if (node.querySelectorAll) {
          // Look for buttons inside this added node
          node.querySelectorAll('button').forEach(button => {
            // Skip buttons inside the menu panel
            if (!button.closest('#menu-panel')) {
              button.remove();
              console.log('Removed dynamically added button:', button.id || button.textContent);
            }
          });
        }
      });
    });
  });
  
  // Start observing the entire document for added buttons
  buttonObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  // 4. DISABLE SPECIFIC EVENT LISTENERS THAT MIGHT SHOW BUTTONS
  
  // Remove any keyboard shortcuts that might show debug buttons
  const originalAddEventListener = document.addEventListener;
  document.addEventListener = function(type, listener, options) {
    // Pass through all non-keydown events
    if (type !== 'keydown') {
      return originalAddEventListener.call(this, type, listener, options);
    }
    
    // Create a wrapper for keydown events to filter out debug hotkeys
    const wrappedListener = function(event) {
      // Block Ctrl+Alt+D and other debug-related shortcuts
      if ((event.ctrlKey && event.altKey && event.key.toLowerCase() === 'd') ||
          (event.ctrlKey && event.key === '`')) {
        console.log('Debug keyboard shortcut blocked');
        return;
      }
      
      // Allow other keyboard events
      return listener.call(this, event);
    };
    
    // Call original with our wrapper
    return originalAddEventListener.call(this, type, wrappedListener, options);
  };
  
  console.log('Button removal script loaded and active');
});
