// utils.js - Utility functions and animation loop
import * as THREE from 'three';
import { animateDeformations } from '../effects/deformation/core.js';
import { updateAudioVisualization } from '../audio/visualization/core.js';

// Create a full screen pass for post-processing effects
function createFullScreenPass() {
    // const geometry = new THREE.PlaneGeometry(2, 2);
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

// Add to your common.js file
function ensureVisibility(app) {
  if (!app.ball) {
    console.warn('Ball not found in app object');
    return;
  }
  
  // Fix common visibility issues
  if (app.ball.material) {
    app.ball.material.transparent = false;
    app.ball.material.opacity = 1.0;
    app.ball.material.visible = true;
    app.ball.material.needsUpdate = true;
  }
  
  // Ensure proper positioning
  if (!app.ball.parent) {
    console.warn('Ball not in scene graph, adding to scene');
    app.scene.add(app.ball);
  }
  
  // Reset scale if it's too small
  if (app.ball.scale.x < 0.1) {
    console.warn('Ball scale too small, resetting');
    app.ball.scale.set(1, 1, 1);
  }
  
  // Ensure camera can see the ball
  const distanceToBall = app.camera.position.distanceTo(
    app.ball.position || new THREE.Vector3()
  );
  
  if (distanceToBall > 100 || distanceToBall < 0.1) {
    console.warn('Camera position may be incorrect, resetting');
    app.camera.position.set(0, 0, 5);
    app.camera.lookAt(app.ball.position || new THREE.Vector3());
  }
}

export {
    animate,
    createFullScreenPass,
    lerp,
    easeInOut,
    randomRange,
    distance,
    mapRange,
    ensureVisibility  // Add this to exports
};