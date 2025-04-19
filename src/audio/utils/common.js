// audio/utils.js - Audio utility functions
import * as THREE from 'three';
import { listener } from './core.js';

// Create a noise generator
function createNoiseGenerator(audioContext) {
    // Create audio buffer for noise
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Fill the buffer with noise
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    // Create buffer source
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noise.start();
    
    return noise;
}

// Sound manager for handling 3D sound effects
const soundManager = {
    sounds: {},
    
    // Initialize all sounds
    init: function() {
        // Create sound effects
        this.createSound('hover', 'https://assets.codepen.io/729648/hover.mp3');
        this.createSound('click', 'https://assets.codepen.io/729648/click.mp3');
        this.createSound('explosion', 'https://assets.codepen.io/729648/explosion.mp3');
        this.createSound('spike', 'https://assets.codepen.io/729648/spike.mp3');
        this.createSound('rainbow', 'https://assets.codepen.io/729648/rainbow.mp3');
        this.createSound('blackhole', 'https://assets.codepen.io/729648/blackhole.mp3');
        this.createSound('magnetic', 'https://assets.codepen.io/729648/magnetic.mp3');
        
        // Create positional sounds (these will come from the ball's location)
        this.createPositionalSound('deform', 'https://assets.codepen.io/729648/deform.mp3');
    },
    
    // Create a global sound
    createSound: function(name, url) {
        const sound = new THREE.Audio(listener);
        
        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setVolume(0.5);
        });
        
        this.sounds[name] = sound;
    },
    
    // Create a positional sound
    createPositionalSound: function(name, url) {
        const sound = new THREE.PositionalAudio(listener);
        
        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setRefDistance(3); // The distance at which the volume reduction starts
            sound.setVolume(0.5);
        });
        
        this.sounds[name] = sound;
    },
    
    // Play a sound
    play: function(name, loop = false) {
        const sound = this.sounds[name];
        if (sound && sound.buffer) {
            // Don't restart if it's already playing
            if (!sound.isPlaying) {
                sound.setLoop(loop);
                sound.play();
            }
        }
    },
    
    // Stop a sound
    stop: function(name) {
        const sound = this.sounds[name];
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    },
    
    // Attach a positional sound to an object
    attachToObject: function(name, object) {
        const sound = this.sounds[name];
        if (sound && !object.children.includes(sound)) {
            object.add(sound);
        }
    },
    
    // Set the frequency of an oscillator
    setFrequency: function(name, value) {
        const sound = this.sounds[name];
        if (sound && sound.source && sound.source.frequency) {
            sound.source.frequency.value = value;
        }
    }
};

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
    if (!app.analyser || !app.audioDataArray) return;
    
    // Get frequency data
    app.analyser.getByteFrequencyData(app.audioDataArray);
    
    // Update visualization cubes
    const visualization = app.scene.userData.audioVisualization;
    const cubes = visualization.children;
    
    for (let i = 0; i < cubes.length; i++) {
        const cube = cubes[i];
        
        // Map frequency bin to cube
        const frequencyBin = Math.floor((i / cubes.length) * app.audioDataArray.length);
        const value = app.audioDataArray[frequencyBin] / 255; // Normalize to 0-1
        
        // Scale cube based on frequency value
        cube.scale.y = 0.1 + value * 2;
        
        // Position the cube
        cube.position.y = Math.sin((i / cubes.length) * Math.PI * 2) * 2 + (value * 0.5);
        
        // Color based on frequency (optional)
        cube.material.color.setHSL(i / cubes.length, 0.8, 0.5 + value * 0.5);
    }
}

export { createNoiseGenerator, soundManager, createAudioVisualization, updateAudioVisualization };