import * as THREE from 'three';

export function updateVisualFromAudio(app, audioData) {
    if (!app.ballGroup || !audioData) return;
    
    // Get frequency data
    const frequencyData = audioData;
    
    // Calculate average values for different frequency bands
    const bassBand = getAverageFrequency(frequencyData, 0, 10);
    const midBand = getAverageFrequency(frequencyData, 10, 40);
    
    // Apply to ball scale - subtle pulsing based on bass
    const bassScale = 1 + (bassBand / 255) * 0.2;
    app.ballGroup.scale.set(bassScale, bassScale, bassScale);
    
    // Apply to wireframe color if it exists
    const wireMesh = app.ballGroup.userData.wireMesh;
    if (wireMesh && wireMesh.material) {
        const hue = (midBand / 255) * 0.3;
        wireMesh.material.color.setHSL(hue, 0.8, 0.5);
    }
}

function getAverageFrequency(data, startIndex, endIndex) {
    let sum = 0;
    for (let i = startIndex; i < endIndex && i < data.length; i++) {
        sum += data[i];
    }
    return sum / (endIndex - startIndex);
}
