// audio/visualization.js - Audio visualization features
import * as THREE from 'three';

// Create visualization for sound
function createAudioVisualization(app) {
    if (!app.audioContext) return;
    
    // Create a circle of small cubes around the ball
    const visualizationGroup = new THREE.Group();
    const cubeCount = 32;
    const radius = 2;
    
    for (let i = 0; i < cubeCount; i++) {
        const angle = (i / cubeCount) * Math.PI * 2;
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            })
        );
        
        cube.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0
        );
        
        visualizationGroup.add(cube);
    }
    
    app.scene.add(visualizationGroup);
    
    // Store it for updates
    app.scene.userData.audioVisualization = visualizationGroup;
}

// Update audio visualization
function updateAudioVisualization(app) {
    if (!app.audioContext || !app.scene.userData.audioVisualization) return;
    
    // Get frequency data
    const analyser = app.analyser;
    if (!analyser) return;
    
    const dataArray = app.audioDataArray;
    if (!dataArray) return;
    
    // Get frequency data
    analyser.getByteFrequencyData(dataArray);
    
    // Update visualization cubes
    const visualization = app.scene.userData.audioVisualization;
    const cubes = visualization.children;
    
    for (let i = 0; i < cubes.length; i++) {
        const cube = cubes[i];
        
        // Map frequency bin to cube
        const frequencyBin = Math.floor((i / cubes.length) * dataArray.length);
        const value = dataArray[frequencyBin] / 255; // Normalize to 0-1
        
        // Scale cube based on frequency value
        cube.scale.y = 0.1 + value * 2;
        
        // Position the cube
        cube.position.y = Math.sin((i / cubes.length) * Math.PI * 2) * 2 + (value * 0.5);
        
        // Color based on frequency (optional)
        cube.material.color.setHSL(i / cubes.length, 0.8, 0.5 + value * 0.5);
    }
}

export { createAudioVisualization, updateAudioVisualization };