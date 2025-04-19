import { soundManager } from '../../audio/sound-manager.js'; // Assuming soundManager is exported

// ... other imports and setup ...

let isRainbowMode = false;
let lastToggleTime = 0;
const toggleCooldown = 3000; // 3 seconds cooldown

export function toggleRainbowMode(ballMaterial) {
    const now = performance.now();
    if (now - lastToggleTime < toggleCooldown) {
        console.log("Rainbow toggle cooldown active.");
        return; // Exit if called too soon
    }
    lastToggleTime = now;

    isRainbowMode = !isRainbowMode;
    if (isRainbowMode) {
        // ... existing logic to enable rainbow effect ...
        console.log("Rainbow mode activated");
        // Play sound only when activating and after cooldown
        if (soundManager && typeof soundManager.playSpecialSound === 'function') {
             // Check the global mute toggle before playing
            if (!(window.debugToggles && window.debugToggles.mute)) {
                soundManager.playSpecialSound('warmPad'); // Or appropriate sound type
            } else {
                 if (window.debugToggles && window.debugToggles.verbose) console.log("Sound muted via debug toggle (rainbow toggle).");
            }
        }
    } else {
        // ... existing logic to disable rainbow effect ...
        console.log("Rainbow mode deactivated");
    }
    // Update any UI elements if necessary
}

// ... rest of rainbow.js ...
