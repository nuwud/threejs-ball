/**
 * Audio debugging utilities
 */

/**
 * Tests if basic audio can play in the current browser
 * @returns {boolean} Whether the test succeeded
 */
export function testBasicAudio() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // 440 Hz (A4)
    oscillator.connect(audioContext.destination);
    oscillator.start();
    setTimeout(() => oscillator.stop(), 1000); // Stop after 1 second
    console.log('Basic audio test succeeded');
    return true;
  } catch (error) {
    console.error('Basic audio test failed:', error);
    return false;
  }
}

/**
 * Monitors the state of an audio context
 * @param {AudioContext} audioContext - The audio context to monitor
 * @param {number} duration - Duration to monitor in ms (default 30000)
 */
export function monitorAudioContextState(audioContext, duration = 30000) {
  console.log(`Initial audio context state: ${audioContext.state}`);
  
  const interval = setInterval(() => {
    console.log(`Current audio context state: ${audioContext.state}`);
    
    if (audioContext.state === 'suspended') {
      console.warn('Audio context is suspended! User interaction needed.');
    }
  }, 2000);
  
  setTimeout(() => clearInterval(interval), duration);
}

/**
 * Logs the audio node graph for debugging
 * @param {AudioNode} startNode - Starting node (usually audioContext.destination)
 * @param {Set} visited - Set of visited nodes (for recursion)
 */
export function logAudioGraph(startNode, visited = new Set()) {
  if (visited.has(startNode)) return;
  visited.add(startNode);
  
  console.log(`Node: ${startNode.constructor.name}`);
  
  if (startNode.numberOfOutputs > 0) {
    console.log(`Outputs: ${startNode.numberOfOutputs}`);
  }
  
  // Note: Web Audio API doesn't provide a way to traverse connections
  // This function is mostly helpful for manually provided nodes
}
