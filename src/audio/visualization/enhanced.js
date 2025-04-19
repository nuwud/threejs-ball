/**
 * Enhanced audio visualization that's more visually appealing
 * and can be easily toggled on/off
 */

import * as THREE from 'three';

/**
 * Create an improved audio visualization system
 * @param {Object} app - The application context
 * @returns {Object} Visualization controller
 */
export function createEnhancedVisualization(app) {
    if (!app || !app.scene || !app.audioContext) {
        console.error('Cannot create visualization: app prerequisites missing');
        return null;
    }

    // Create visualization elements
    const visualContainer = document.getElementById('visualization-container');
    let analyser = null;
    let dataArray = null;
    let visualizationBars = [];
    let isActive = false;

    // Visualization configuration
    const config = {
        barCount: 32,
        barSpacing: 4,
        barWidth: 8,
        barColor: '#00DFDF',
        barColorGradient: true,
        smoothingTimeConstant: 0.8,
        fftSize: 256
    };

    /**
     * Initialize the visualization system
     */
    function initialize() {
        if (!app.audioContext) {
            console.error('Cannot initialize visualization: no audio context');
            return false;
        }

        // Set up audio analyser
        analyser = app.audioContext.createAnalyser();
        analyser.fftSize = config.fftSize;
        analyser.smoothingTimeConstant = config.smoothingTimeConstant;

        // Connect to audio source if available
        const source = app.soundManager?.sourceNode || null;
        if (source) {
            source.connect(analyser);
            analyser.connect(app.audioContext.destination);
        } else {
            console.warn('No audio source found for visualization');
        }

        // Create data array for frequency analysis
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // Create HTML-based visualization (sleeker and less intrusive than THREE.js objects)
        createHTMLVisualization();

        return true;
    }

    /**
     * Create HTML-based visualization bars
     */
    function createHTMLVisualization() {
        // Clear any existing visualization
        if (visualContainer) {
            visualContainer.innerHTML = '';

            // Create container for bars
            const barsContainer = document.createElement('div');
            barsContainer.className = 'visualization-bars';
            barsContainer.style.display = 'flex';
            barsContainer.style.alignItems = 'flex-end';
            barsContainer.style.justifyContent = 'center';
            barsContainer.style.height = '100%';
            barsContainer.style.width = '100%';
            barsContainer.style.gap = `${config.barSpacing}px`;

            // Create individual bars
            for (let i = 0; i < config.barCount; i++) {
                const bar = document.createElement('div');
                bar.className = 'visualization-bar';
                bar.style.width = `${config.barWidth}px`;
                bar.style.height = '2px';
                bar.style.backgroundColor = config.barColor;
                bar.style.transition = 'height 0.05s ease';
                bar.style.borderRadius = '2px 2px 0 0';
                bar.style.transformOrigin = 'bottom';

                barsContainer.appendChild(bar);
                visualizationBars.push(bar);
            }

            visualContainer.appendChild(barsContainer);
        }
    }

    /**
     * Start the visualization
     */
    function start() {
        if (isActive) return;

        isActive = true;

        // Make sure container is visible
        if (visualContainer) {
            visualContainer.style.display = 'block';
        }

        // Start update loop
        update();
    }

    /**
     * Stop the visualization
     */
    function stop() {
        isActive = false;

        // Hide the container
        if (visualContainer) {
            visualContainer.style.display = 'none';
        }
    }

    /**
     * Update the visualization (called every animation frame)
     */
    function update() {
        if (!isActive) return;

        // Get frequency data
        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            updateHTMLVisualization(dataArray);
        }

        // Continue update loop
        requestAnimationFrame(update);
    }

    /**
     * Update HTML-based visualization with new data
     * @param {Uint8Array} data - Frequency data array
     */
    function updateHTMLVisualization(data) {
        if (!visualizationBars.length || !data) return;

        const dataLength = data.length;

        for (let i = 0; i < visualizationBars.length; i++) {
            // Calculate the data index to use (logarithmic distribution gives better visual effect)
            const dataIndex = Math.floor(Math.pow(i / visualizationBars.length, 2) * dataLength);

            // Get normalized value (0-1)
            const value = data[dataIndex] / 255;

            // Apply value to bar height (with minimum height of 2px)
            const height = Math.max(2, value * 60);
            visualizationBars[i].style.height = `${height}px`;

            // Apply color gradient if enabled
            if (config.barColorGradient) {
                const hue = 180 + value * 20; // Cyan/blue range
                const saturation = 80 + value * 20;
                const lightness = 40 + value * 30;
                visualizationBars[i].style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            }
        }
    }

    /**
     * Safely connect to a new audio source
     * @param {AudioNode} source - Audio source node to visualize
     */
    function connectSource(source) {
        if (!analyser || !source) return;

        // Disconnect existing connections
        try {
            analyser.disconnect();
        } catch (e) {
            // Ignore, may not be connected
        }

        // Connect new source
        source.connect(analyser);
        analyser.connect(app.audioContext.destination);
    }

    /**
     * Clean up resources when visualization is no longer needed
     */
    function dispose() {
        stop();

        // Disconnect analyser
        if (analyser) {
            try {
                analyser.disconnect();
            } catch (e) {
                // Ignore, may not be connected
            }
        }

        // Clear HTML elements
        if (visualContainer) {
            visualContainer.innerHTML = '';
        }

        // Clear references
        visualizationBars = [];
        analyser = null;
        dataArray = null;
    }

    // Initialize and return public API
    initialize();

    return {
        start,
        stop,
        connectSource,
        dispose,
        get isActive() { return isActive; },
        set active(value) {
            if (value) {
                start();
            } else {
                stop();
            }
        }
    };
}