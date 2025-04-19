/**
 * Simple menu handling script
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('menu.js loaded');
  
  // Get main menu elements
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('menu');
  const closeMenu = document.getElementById('close-menu');
  
  // Setup menu toggle
  if (hamburger && menu) {
    hamburger.addEventListener('click', () => {
      console.log('Opening menu');
      menu.classList.add('open');
    });
  }
  
  if (closeMenu && menu) {
    closeMenu.addEventListener('click', () => {
      console.log('Closing menu');
      menu.classList.remove('open');
    });
  }
  
  // Add click-away functionality
  document.addEventListener('click', (e) => {
    if (menu && menu.classList.contains('open')) {
      // Check if click is outside the menu
      if (!menu.contains(e.target) && e.target !== hamburger && !hamburger.contains(e.target)) {
        menu.classList.remove('open');
      }
    }
  });
  
  // Initialize menu controls
  initMenuControls();
});

// Initialize controls within the menu
function initMenuControls() {
  // Toggle controls
  const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const id = e.target.id;
      const enabled = e.target.checked;
      console.log(`Toggle ${id} is now ${enabled ? 'ON' : 'OFF'}`);
      
      // Handle specific toggle actions
      if (id === 'toggle-sound' || id === 'toggle-audio') {
        if (window.app) {
          window.app.soundMuted = !enabled;
        }
      } else if (id === 'toggle-wireframe') {
        // Handle wireframe toggle
      }
    });
  });
  
  // Button controls
  const buttons = document.querySelectorAll('.menu-button');
  buttons.forEach(button => {
    button.addEventListener('click', (e) => {
      const id = e.target.id;
      console.log(`Button ${id} clicked`);
      
      // Handle specific button actions
      if (id === 'test-audio') {
        playTestSound();
      } else if (id === 'reset-ball') {
        if (window.app && window.app.resetBall) {
          window.app.resetBall();
        }
      }
    });
  });
}

// Simple test sound function
function playTestSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = window.app?.audioContext || new AudioContext();
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
    
    console.log('Test sound played');
  } catch (error) {
    console.error('Could not play test sound:', error);
  }
}
