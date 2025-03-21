// audio.js - Handles audio and sound effects
import * as THREE from 'three';

// Setup audio system
function setupAudio(app) {
    const listener = app.camera.userData.listener;

    // Sound manager object to handle all audio
    const soundManager = {
        sounds: {},

        // Initialize all sounds
        init: function () {
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
        createSound: function (name, url) {
            const sound = new THREE.Audio(listener);

            // Load a sound and set it as the Audio object's buffer
            const audioLoader = new THREE.AudioLoader();
            audioLoader.load(url, function (buffer) {
                sound.setBuffer(buffer);
                sound.setVolume(0.5);
            });

            this.sounds[name] = sound;
        },

        // Create a positional sound
        createPositionalSound: function (name, url) {
            const sound = new THREE.PositionalAudio(listener);

            // Load a sound and set it as the Audio object's buffer
            const audioLoader = new THREE.AudioLoader();
            audioLoader.load(url, function (buffer) {
                sound.setBuffer(buffer);
                sound.setRefDistance(3); // The distance at which the volume reduction starts
                sound.setVolume(0.5);
            });

            this.sounds[name] = sound;
        },

        // Play a sound
        play: function (name, loop = false) {
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
        stop: function (name) {
            const sound = this.sounds[name];
            if (sound && sound.isPlaying) {
                sound.stop();
            }
        },

        // Attach a positional sound to an object
        attachToObject: function (name, object) {
            const sound = this.sounds[name];
            if (sound && !object.children.includes(sound)) {
                object.add(sound);
            }
        },

        // Set the frequency of an oscillator
        setFrequency: function (name, value) {
            const sound = this.sounds[name];
            if (sound && sound.source && sound.source.frequency) {
                sound.source.frequency.value = value;
            }
        }
    };

    return soundManager;
}

// Initialize Web Audio API synthesizer
function initAudioEffects(app) {
    let audioContext;
    let oscillator;
    let gainNode;
    let analyzer;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create gain node (for volume control)
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Start silent
        gainNode.connect(audioContext.destination);

        // Create oscillator (for tone generation)
        oscillator = audioContext.createOscillator();
        oscillator.type = 'sine'; // Sine wave
        oscillator.frequency.value = 440; // A4 note
        oscillator.connect(gainNode);
        oscillator.start();

        // Create an analyzer node
        analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Connect the analyzer to the audio context
        gainNode.connect(analyzer);

        // Store references in app
        app.audioContext = audioContext;
        app.oscillator = oscillator;
        app.gainNode = gainNode;
        app.analyzer = analyzer;
        app.audioDataArray = dataArray;

        console.log("Audio synthesizer initialized");
    } catch (e) {
        console.error("Web Audio API not supported or error initializing:", e);
    }
}

export {
    setupAudio,
    initAudioEffects,
    playToneForPosition,
    stopTone,
    createAudioVisualization,
    updateAudioVisualization
};

// Map a value to a frequency range (for mouse movement)
function mapToFrequency(value, min, max, freqMin = 220, freqMax = 880) {
    return freqMin + ((value - min) / (max - min)) * (freqMax - freqMin);
}

// Play a tone based on position
function playToneForPosition(app, x, y) {
    if (!app.audioContext || !app.oscillator || !app.gainNode) return;

    // Map x position to frequency
    const frequency = mapToFrequency(x, -1, 1, 220, 880);
    app.oscillator.frequency.value = frequency;

    // Map y position to volume
    const volume = mapToFrequency(y, -1, 1, 0, 0.2);
    app.gainNode.gain.value = volume;
}

// Stop playing the tone
function stopTone(app) {
    if (!app.audioContext || !app.gainNode) return;

    // Ramp down to avoid clicks
    app.gainNode.gain.setTargetAtTime(0, app.audioContext.currentTime, 0.1);
}

// Create visualization for sound
function createAudioVisualization(app) {
    if (!app.analyzer) return;

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
    if (!app.analyzer || !app.audioDataArray || !app.scene.userData.audioVisualization) return;

    // Get frequency data
    app.analyzer.getByteFrequencyData(app.audioDataArray);

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