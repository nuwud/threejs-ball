import * as THREE from 'three';

/**
 * Updates visual elements based on audio data
 * This function now works with both real analyzer data and our
 * simulated data from the no-throttle audio fix
 */
export function updateVisualFromAudio(app, audioData) {
    if (!app.ballGroup || !audioData) return;
    
    // Get frequency data
    const frequencyData = audioData;
    
    // Calculate average values for different frequency bands
    const bassBand = getAverageFrequency(frequencyData, 0, 10);
    const midBand = getAverageFrequency(frequencyData, 10, 40);
    const highBand = getAverageFrequency(frequencyData, 40, frequencyData.length - 1);
    
    // Apply to ball scale - subtle pulsing based on bass
    const bassScale = 1 + (bassBand / 255) * 0.2;
    app.ballGroup.scale.set(bassScale, bassScale, bassScale);
    
    // Apply to wireframe color if it exists
    const wireMesh = app.ballGroup.userData.wireMesh;
    if (wireMesh && wireMesh.material) {
        // Use mid frequencies to affect hue
        const hue = (midBand / 255) * 0.3;
        wireMesh.material.color.setHSL(hue, 0.8, 0.5);
    }
    
    // Apply to main ball material if it exists
    const mainMesh = app.ballGroup.userData.mesh;
    if (mainMesh && mainMesh.material) {
        // Check if we should update material based on audio levels
        const shouldUpdateEmissive = highBand > 100; // Only light up on loud high frequencies
        
        if (shouldUpdateEmissive) {
            // Calculate emissive color intensity based on high frequencies
            const emissiveIntensity = (highBand / 255) * 0.15;
            
            // Use a complementary color to the wireframe
            const emissiveHue = ((midBand / 255) * 0.3 + 0.5) % 1.0;
            
            // Create an emissive color
            const emissiveColor = new THREE.Color();
            emissiveColor.setHSL(emissiveHue, 0.9, 0.5);
            
            // Apply adjusted emissive properties
            if (!mainMesh.material._origEmissiveIntensity) {
                // Store original values first time
                mainMesh.material._origEmissiveIntensity = mainMesh.material.emissiveIntensity || 0;
                mainMesh.material._origEmissive = mainMesh.material.emissive 
                    ? mainMesh.material.emissive.clone() 
                    : new THREE.Color(0x000000);
            }
            
            // Apply the new emissive color
            mainMesh.material.emissive = emissiveColor;
            mainMesh.material.emissiveIntensity = emissiveIntensity;
        } else if (mainMesh.material._origEmissive) {
            // Restore original values
            mainMesh.material.emissive.copy(mainMesh.material._origEmissive);
            mainMesh.material.emissiveIntensity = mainMesh.material._origEmissiveIntensity;
        }
    }
    
    // Make the function available globally for the no-throttle fix
    window.updateVisualFromAudio = updateVisualFromAudio;
}

/**
 * Gets the average value of a frequency range
 */
function getAverageFrequency(data, startIndex, endIndex) {
    let sum = 0;
    let count = 0;
    
    for (let i = startIndex; i < endIndex && i < data.length; i++) {
        sum += data[i];
        count++;
    }
    
    return count > 0 ? sum / count : 0;
}

/**
 * Create visualization helper that integrates with both 
 * normal audio analyzer and our no-throttle system
 */
export function createAudioVisualization(app) {
    // Create fake audio data if needed for no-throttle mode
    if (!app.fakeAudioData) {
        app.fakeAudioData = new Uint8Array(64);
    }
    
    // Start decay loop for visualization
    startVisualizationDecayLoop(app);
    
    return {
        update: function(audioData) {
            updateVisualFromAudio(app, audioData);
        }
    };
}

/**
 * Start a loop to decay audio visualization when no sound is playing
 */
function startVisualizationDecayLoop(app) {
    // Create interval to gradually decay visualization
    const decayInterval = setInterval(() => {
        if (app.fakeAudioData) {
            // Decay all frequency bands
            for (let i = 0; i < app.fakeAudioData.length; i++) {
                app.fakeAudioData[i] *= 0.9; // 10% decay per step
            }
            
            // Update visuals with decaying data
            updateVisualFromAudio(app, app.fakeAudioData);
        }
    }, 100); // Update every 100ms
    
    // Store reference to interval for cleanup
    app.visualizationDecayInterval = decayInterval;
}
