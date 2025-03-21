// utils.js - Utility functions and animation loop
import * as THREE from 'three';
import { animateDeformations } from './ball.js';
import { updateAudioVisualization } from './audio.js';

// Create a full screen pass for post-processing effects
function createFullScreenPass() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            varying vec2 vUv;
            
            float random(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);
            }
            
            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                // Add subtle film grain
                float noise = random(vUv + vec2(0.1, 0.1)) * 0.05;
                color.rgb += noise;
                gl_FragColor = color;
            }
        `,
        uniforms: {
            tDiffuse: { value: null }
        }
    });
    
    return new THREE.Mesh(geometry, material);
}

// Main animation loop
function animate(app, customUpdate) {
    function loop() {
        requestAnimationFrame(loop);
        
        if (customUpdate) {
            customUpdate();
        }
        
        // Update any ongoing deformations
        animateDeformations(app);
        
        // Update audio visualization if available
        if (app.analyzer && app.scene.userData.audioVisualization) {
            updateAudioVisualization(app);
        }
        
        // Render the scene
        app.renderer.render(app.scene, app.camera);
    }
    
    // Start the animation loop
    loop();
}

// Helper function for smooth interpolation
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// Helper function for easy-in-out easing
function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Generate a random number within a range
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Calculate distance between two Vector3 points
function distance(point1, point2) {
    return point1.distanceTo(point2);
}

// Map a value from one range to another
function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export {
    animate,
    createFullScreenPass,
    lerp,
    easeInOut,
    randomRange,
    distance,
    mapRange
};