/**
 * visualization.js
 * Provides audio visualization for the ball effects
 */

import { getSynthesizer } from '../synthesis/synthesizer.js';
// Fix this import - no need to import these from core
// import { getAudioContext, isInitialized } from '../core.js';
import * as THREE from 'three';
// Import from synthesizer instead
import { isInitialized } from '../synthesis/synthesizer.js';

/**
 * Create an audio visualizer
 * @param {Object} options - Visualization options
 * @returns {Object} Visualization controller
 */
export function createAudioVisualizer(options = {}) {
    const defaultOptions = {
        containerElement: null,
        width: 256,
        height: 100,
        barColor: '#3498db',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        barWidth: 4,
        barSpacing: 1,
        smoothingFactor: 0.5,
        attachToElement: true,
        updateInterval: 50
    };
    
    // Merge options with defaults
    const config = { ...defaultOptions, ...options };
    
    let canvas = null;
    let canvasContext = null;
    let updateTimer = null;
    let isActive = false;
    let previousDataArray = null;
    
    /**
     * Initialize the visualizer
     * @returns {boolean} Whether initialization succeeded
     */
    function initialize() {
        if (!isInitialized()) {
            console.warn('Cannot initialize visualizer: audio system not initialized');
            return false;
        }
        
        // Create canvas if attachToElement is true
        if (config.attachToElement && config.containerElement) {
            canvas = document.createElement('canvas');
            canvas.width = config.width;
            canvas.height = config.height;
            canvas.style.display = 'block';
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            
            // Add className if provided
            if (config.className) {
                canvas.className = config.className;
            }
            
            config.containerElement.appendChild(canvas);
            canvasContext = canvas.getContext('2d');
        }
        
        return true;
    }
    
    /**
     * Start visualization updates
     */
    function start() {
        if (isActive) return;
        
        isActive = true;
        updateVisualization();
        
        // Set up periodic updates
        if (updateTimer === null) {
            updateTimer = setInterval(updateVisualization, config.updateInterval);
        }
    }
    
    /**
     * Stop visualization updates
     */
    function stop() {
        isActive = false;
        
        if (updateTimer !== null) {
            clearInterval(updateTimer);
            updateTimer = null;
        }
        
        // Clear canvas if available
        if (canvasContext && canvas) {
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    /**
     * Update the visualization
     */
    function updateVisualization() {
        if (!isActive || !isInitialized()) return;
        
        // Get analyzer data from synthesizer
        const synth = getSynthesizer();
        const analyzerData = synth ? synth.getAnalyzerData() : null;
        
        if (!analyzerData) return;
        
        // If we have a canvas, render visualization
        if (canvasContext && canvas) {
            renderVisualization(analyzerData);
        }
        
        // Store a copy of the data for external use
        previousDataArray = new Uint8Array(analyzerData);
    }
    
    /**
     * Render visualization to canvas
     * @param {Uint8Array} dataArray - Frequency data
     */
    function renderVisualization(dataArray) {
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        canvasContext.fillStyle = config.backgroundColor;
        canvasContext.fillRect(0, 0, width, height);
        
        // Apply smoothing if we have previous data
        if (previousDataArray && config.smoothingFactor > 0) {
            for (let i = 0; i < dataArray.length; i++) {
                dataArray[i] = dataArray[i] * (1 - config.smoothingFactor) + 
                              previousDataArray[i] * config.smoothingFactor;
            }
        }
        
        // Calculate number of bars
        const totalBarWidth = config.barWidth + config.barSpacing;
        const numBars = Math.min(Math.floor(width / totalBarWidth), dataArray.length);
        
        // Draw frequency bars
        canvasContext.fillStyle = config.barColor;
        
        for (let i = 0; i < numBars; i++) {
            const value = dataArray[Math.floor(i * dataArray.length / numBars)];
            const percent = value / 256;
            const barHeight = height * percent;
            
            const x = i * totalBarWidth;
            const y = height - barHeight;
            
            canvasContext.fillRect(x, y, config.barWidth, barHeight);
        }
    }
    
    /**
     * Get the raw audio data
     * @returns {Uint8Array|null} Frequency data or null if not available
     */
    function getAudioData() {
        return previousDataArray || null;
    }
    
    /**
     * Get frequencies at specified points
     * @param {number[]} points - Points to sample (0.0 to 1.0)
     * @returns {number[]} Sampled frequency values (0.0 to 1.0)
     */
    function getFrequencyAtPoints(points) {
        if (!previousDataArray) return points.map(() => 0);
        
        return points.map(point => {
            const index = Math.floor(point * previousDataArray.length);
            const clampedIndex = Math.max(0, Math.min(previousDataArray.length - 1, index));
            return previousDataArray[clampedIndex] / 256;
        });
    }
    
    /**
     * Clean up visualizer resources
     */
    function dispose() {
        stop();
        
        // Remove canvas if we created it
        if (canvas && config.attachToElement && config.containerElement) {
            try {
                config.containerElement.removeChild(canvas);
            } catch (e) {
                // Ignore removal errors
            }
        }
        
        canvas = null;
        canvasContext = null;
    }
    
    // Initialize if requested
    if (options.autoInitialize !== false) {
        initialize();
    }
    
    // Return public API
    return {
        initialize,
        start,
        stop,
        getAudioData,
        getFrequencyAtPoints,
        dispose,
        get isActive() { return isActive; }
    };
}

/**
 * Apply audio-reactive effects to the ball
 * @param {Object} ball - The ball object
 * @param {Object} options - Configuration options
 * @returns {Object} Audio-reactive controller
 */
export function createBallAudioEffects(ball, options = {}) {
    if (!ball) {
        console.error('Cannot create audio effects: no ball provided');
        return null;
    }
    
    const defaultOptions = {
        pulseStrength: 0.2,
        colorReactive: true,
        sizeReactive: true,
        updateInterval: 50
    };
    
    // Merge options with defaults
    const config = { ...defaultOptions, ...options };
    
    let updateTimer = null;
    let isActive = false;
    let originalScale = { x: 1, y: 1, z: 1 };
    let originalColor = { r: 1, g: 1, b: 1 };
    
    // Save original properties
    function saveOriginalProperties() {
        if (ball.scale) {
            originalScale = { 
                x: ball.scale.x, 
                y: ball.scale.y, 
                z: ball.scale.z 
            };
        }
        
        if (ball.material && ball.material.color) {
            originalColor = {
                r: ball.material.color.r,
                g: ball.material.color.g,
                b: ball.material.color.b
            };
        }
    }
    
    // Restore original properties
    function restoreOriginalProperties() {
        if (ball.scale) {
            ball.scale.x = originalScale.x;
            ball.scale.y = originalScale.y;
            ball.scale.z = originalScale.z;
        }
        
        if (ball.material && ball.material.color) {
            ball.material.color.r = originalColor.r;
            ball.material.color.g = originalColor.g;
            ball.material.color.b = originalColor.b;
        }
    }
    
    /**
     * Start audio-reactive effects
     */
    function start() {
        if (isActive) return;
        
        saveOriginalProperties();
        isActive = true;
        
        // Set up periodic updates
        if (updateTimer === null) {
            updateTimer = setInterval(updateEffects, config.updateInterval);
        }
    }
    
    /**
     * Stop audio-reactive effects
     */
    function stop() {
        isActive = false;
        
        if (updateTimer !== null) {
            clearInterval(updateTimer);
            updateTimer = null;
        }
        
        restoreOriginalProperties();
    }
    
    /**
     * Update effects based on audio data
     */
    function updateEffects() {
        if (!isActive || !isInitialized()) return;
        
        // Get analyzer data
        const synth = getSynthesizer();
        const analyzerData = synth ? synth.getAnalyzerData() : null;
        
        if (!analyzerData) return;
        
        // Calculate frequency bands
        const bass = getAverageFrequency(analyzerData, 0, 0.1);
        const mid = getAverageFrequency(analyzerData, 0.1, 0.5);
        const high = getAverageFrequency(analyzerData, 0.5, 1.0);
        
        // Apply size effect
        if (config.sizeReactive && ball.scale) {
            const pulseAmount = bass * config.pulseStrength;
            
            ball.scale.x = originalScale.x * (1 + pulseAmount);
            ball.scale.y = originalScale.y * (1 + pulseAmount);
            ball.scale.z = originalScale.z * (1 + pulseAmount);
        }
        
        // Apply color effect
        if (config.colorReactive && ball.material && ball.material.color) {
            // Modify color based on audio frequencies
            ball.material.color.r = originalColor.r * (1 + high * 0.5);
            ball.material.color.g = originalColor.g * (1 + mid * 0.5);
            ball.material.color.b = originalColor.b * (1 + bass * 0.5);
        }
    }
    
    /**
     * Calculate average frequency in a range
     * @param {Uint8Array} dataArray - Frequency data
     * @param {number} startPercent - Start of range (0.0 to 1.0)
     * @param {number} endPercent - End of range (0.0 to 1.0)
     * @returns {number} Average frequency (0.0 to 1.0)
     */
    function getAverageFrequency(dataArray, startPercent, endPercent) {
        const startIndex = Math.floor(startPercent * dataArray.length);
        const endIndex = Math.floor(endPercent * dataArray.length);
        
        let sum = 0;
        let count = 0;
        
        for (let i = startIndex; i < endIndex; i++) {
            sum += dataArray[i];
            count++;
        }
        
        return count > 0 ? (sum / count) / 256 : 0;
    }
    
    /**
     * Manually update effect intensity
     * @param {Object} values - Effect values
     */
    function setEffectValues(values = {}) {
        if (!isActive) return;
        
        if (values.pulse !== undefined && config.sizeReactive && ball.scale) {
            const pulseAmount = values.pulse * config.pulseStrength;
            
            ball.scale.x = originalScale.x * (1 + pulseAmount);
            ball.scale.y = originalScale.y * (1 + pulseAmount);
            ball.scale.z = originalScale.z * (1 + pulseAmount);
        }
        
        if (values.color !== undefined && config.colorReactive && ball.material && ball.material.color) {
            ball.material.color.r = originalColor.r * (1 + values.color.r || 0);
            ball.material.color.g = originalColor.g * (1 + values.color.g || 0);
            ball.material.color.b = originalColor.b * (1 + values.color.b || 0);
        }
    }
    
    /**
     * Clean up effects resources
     */
    function dispose() {
        stop();
    }
    
    // Return public API
    return {
        start,
        stop,
        setEffectValues,
        dispose,
        get isActive() { return isActive; }
    };
}

/**
 * Audio visualization functionality
 * Handles visual representation of audio data
 */

/**
 * Create visualization for sound
 * @param {Object} app - The application context
 */
export function createAudioVisualization(app) {
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

/**
 * Update audio visualization
 * @param {Object} app - The application context
 */
export function updateAudioVisualization(app) {
    if (!app.audioVisualization || !app.audioVisualization.enabled) return;

    const { analyser, dataArray } = app.audioVisualization;
    analyser.getByteFrequencyData(dataArray);

    // Implement different visualization methods based on the app's state
    if (app.visualizationType === 'scale') {
        // Scale the ball based on audio intensity
        if (app.ballGroup) {
            const avgFrequency = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const scale = 1 + (avgFrequency / 512);
            app.ballGroup.scale.set(scale, scale, scale);
        }
    } else if (app.visualizationType === 'color') {
        // Change ball color based on audio frequencies
        if (app.ballGroup) {
            const lowFreq = dataArray[1] / 255;
            const midFreq = dataArray[8] / 255;
            const highFreq = dataArray[16] / 255;

            if (app.ballGroup.children[0]?.material) {
                app.ballGroup.children[0].material.color.setRGB(
                    0.5 + highFreq * 0.5,
                    0.5 + midFreq * 0.5,
                    0.5 + lowFreq * 0.5
                );
            }
        }
    } else if (app.visualizationType === 'bars') {
        // Create or update visualization bars
        if (!app.visualizationBars && app.scene) {
            createVisualizationBars(app);
        }

        if (app.visualizationBars) {
            updateVisualizationBars(app, dataArray);
        }
    }
}

/**
 * Create visualization bars for frequency display
 * @param {Object} app - The application context 
 */
function createVisualizationBars(app) {
    const barCount = 16; // Number of frequency bars to show
    app.visualizationBars = [];

    const barGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const barMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

    for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const radius = 3;
        
        const bar = new THREE.Mesh(barGeometry, barMaterial);
        bar.position.x = Math.cos(angle) * radius;
        bar.position.z = Math.sin(angle) * radius;
        bar.position.y = 0;

        app.scene.add(bar);
        app.visualizationBars.push(bar);
    }
}

/**
 * Update visualization bars based on audio data
 * @param {Object} app - The application context
 * @param {Uint8Array} dataArray - Audio frequency data 
 */
function updateVisualizationBars(app, dataArray) {
    const bars = app.visualizationBars;
    if (!bars || !bars.length) return;

    const dataLength = dataArray.length;

    for (let i = 0; i < bars.length; i++) {
        const index = Math.floor(i * dataLength / bars.length);
        const value = dataArray[index] / 255; // Normalize to 0-1

        // Update bar height
        bars[i].scale.y = 0.1 + value * 3;

        // Center the scaling on the bar
        bars[i].position.y = (bars[i].scale.y / 2) - 0.05;

        // Update color based on intensity
        bars[i].material.color.setHSL(value * 0.3 + 0.3, 0.8, 0.5);
    }
}

/**
 * Toggle audio visualization
 * @param {Object} app - The application context
 * @param {boolean} enabled - Whether to enable visualization
 * @returns {Object} The audio visualization object
 */
export function toggleAudioVisualization(app, enabled = true) {
    if (!app.audioVisualization) {
        createAudioVisualization(app);
    }

    app.audioVisualization.enabled = enabled;
    console.log(`Audio visualization ${enabled ? 'enabled' : 'disabled'}`);
    return app.audioVisualization;
}