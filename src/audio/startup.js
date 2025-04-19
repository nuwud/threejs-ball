/**
 * Audio system startup and initialization helper
 * Provides robust audio initialization with fallbacks
 */

const MAX_RETRY_ATTEMPTS = 3;
let retryCount = 0;

/**
 * Initialize the audio system with fallbacks
 * @returns {Promise<boolean>} Whether initialization succeeded
 */
export async function initializeAudioSystem() {
  try {
    console.log("Starting audio initialization...");
    
    // Create audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.error("WebAudio not supported in this browser");
      return false;
    }
    
    // Get or create the app object
    window.app = window.app || {};
    
    // Create audio context if not exists
    if (!window.app.audioContext) {
      window.app.audioContext = new AudioContext();
      console.log("Created new AudioContext");
    }
    
    // Try to resume the audio context
    if (window.app.audioContext.state === "suspended") {
      await window.app.audioContext.resume();
      console.log("AudioContext resumed successfully");
    }
    
    // Try to initialize using different methods based on what's available
    if (typeof window.app.setupAudio === 'function') {
      console.log("Using app.setupAudio()");
      const result = await window.app.setupAudio(window.app);
      if (result) {
        return true;
      }
    }
    
    if (window.audioSystem && typeof window.audioSystem.setupEnhancedAudio === 'function') {
      console.log("Using audioSystem.setupEnhancedAudio()");
      const result = await window.audioSystem.setupEnhancedAudio(window.app);
      if (result) {
        return true;
      }
    }
    
    if (typeof window.initAudio === 'function') {
      console.log("Using global initAudio()");
      const result = await window.initAudio(window.app);
      if (result) {
        return true;
      }
    }
    
    // Fallback: Basic audio initialization
    console.log("Using fallback audio initialization");
    
    // Create basic master gain
    const masterGain = window.app.audioContext.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(window.app.audioContext.destination);
    window.app.masterGain = masterGain;
    
    window.app.audioInitialized = true;
    
    // Dispatch event indicating audio is ready
    window.dispatchEvent(new CustomEvent('audioReady'));
    
    return true;
  } catch (error) {
    console.error("Error initializing audio:", error);
    
    // Try again if under max retry attempts
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      retryCount++;
      console.log(`Retrying audio initialization (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS})...`);
      return new Promise(resolve => {
        setTimeout(async () => {
          const result = await initializeAudioSystem();
          resolve(result);
        }, 500);
      });
    }
    
    return false;
  }
}

/**
 * Handle the start experience button click
 * @param {HTMLElement} overlay - The overlay element to hide
 * @returns {Promise<boolean>} Whether start was successful
 */
export async function handleStartExperience(overlay) {
  try {
    const success = await initializeAudioSystem();
    
    if (success) {
      console.log("Audio initialized successfully, hiding overlay");
    } else {
      console.warn("Audio initialization failed, continuing without audio");
    }
    
    // Hide the overlay regardless of success
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.visibility = 'hidden';
      }, 500);
    }
    
    return success;
  } catch (error) {
    console.error("Error in handleStartExperience:", error);
    
    // Hide overlay even on error
    if (overlay) {
      overlay.style.visibility = 'hidden';
    }
    
    // Dispatch audio failed event
    window.dispatchEvent(new CustomEvent('audioFailed'));
    
    return false;
  }
}

// Make functions available globally for direct script access
window.initializeAudioSystem = initializeAudioSystem;
window.handleStartExperience = handleStartExperience;
