// events.js - Handles user interactions
import * as THREE from 'three';
import { initAudioEffects, playToneForPosition, stopTone } from './audio.js';
import { applyDeformation, resetDeformation, updateGradientColors } from './ball.js';
import { 
  createParticleExplosion, 
  applySpikyEffect, 
  createMagneticTrail, 
  removeMagneticTrail, 
  createBlackholeEffect, 
  removeBlackholeEffect
} from './effects.js';

// Set up event listeners
function setupEventListeners(app) {
    console.log("Setting up event listeners...");
    
    // Add event listeners for mouse/touch
    window.addEventListener('mousemove', e => onPointerMove(e, app));
    window.addEventListener('mousedown', e => onPointerDown(e, app));
    window.addEventListener('mouseup', () => onPointerUp(app));
    window.addEventListener('wheel', e => onMouseWheel(e, app), { passive: false });
    window.addEventListener('touchmove', e => {
        e.preventDefault();
        onPointerMove(e.touches[0], app);
    }, { passive: false });
    window.addEventListener('touchstart', e => {
        e.preventDefault();
        onPointerDown(e.touches[0], app);
    }, { passive: false });
    window.addEventListener('touchend', () => onPointerUp(app));
    window.addEventListener('contextmenu', e => e.preventDefault()); // Prevent context menu on right click
    
    // Double click to toggle rainbow mode
    window.addEventListener('dblclick', () => {
        if (window.appControls && window.appControls.toggleRainbowMode) {
            window.appControls.toggleRainbowMode();
            window.showStatus && window.showStatus('Rainbow Mode ' + (app.isRainbowMode ? 'Activated' : 'Deactivated'));
        }
    });
    
    // Forward/back mouse buttons
    window.addEventListener('mousedown', e => {
        if (e.button === 3) { // Forward button (may vary by mouse)
            if (window.appControls && window.appControls.toggleMagneticMode) {
                window.appControls.toggleMagneticMode();
                window.showStatus && window.showStatus('Magnetic Effect ' + (app.isMagneticMode ? 'Activated' : 'Deactivated'));
            }
        } else if (e.button === 4) { // Back button (may vary by mouse)
            if (window.appControls && window.appControls.createBlackholeEffect) {
                window.appControls.createBlackholeEffect();
                window.showStatus && window.showStatus('Blackhole Effect Activated');
            }
        }
    });
    
    console.log("Event listeners set up successfully");
}

// Function to handle mouse/touch movement for interaction
function onPointerMove(event, app) {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    app.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    app.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the raycaster with the new mouse position
    app.raycaster.setFromCamera(app.mouse, app.camera);
    
    // Move the point light to follow the mouse for attractive highlights
    const pointLight = app.scene.userData.pointLight;
    if (pointLight) {
        pointLight.position.set(app.mouse.x * 3, app.mouse.y * 3, 2);
    }
    
    // Get reference to the main mesh in the ball group
    const mesh = app.ballGroup.userData.mesh;
    
    // Calculate objects intersecting the ray
    const intersects = app.raycaster.intersectObject(mesh);
    
    // Change appearance when hovered or touched
    if (intersects.length > 0) {
        if (!app.isHovered) {
            document.body.style.cursor = 'pointer';
            
            // Change wireframe color smoothly to magenta
            const wireMat = app.ballGroup.userData.wireMat;
            wireMat.color.set(0xFF00FF);
            
            // Smoothly change gradient colors for hover state
            updateGradientColors(app, '#FF77FF', '#AA55FF', '#55FFFF');
            
            app.isHovered = true;
        }
        
        // Store the intersection point for deformation
        app.touchPoint = intersects[0].point.clone();
        
        // Apply deformation when hovering
        applyDeformation(app, app.touchPoint, 0.2, 0.3);
        
        // Check which facet was hit
        const facetIndex = getFacetIndex(intersects[0]);
        
        // Only trigger sound when crossing facet boundaries
        if (facetIndex !== app.lastFacetIndex) {
            // Initialize audio on first interaction
            if (!app.audioContext) {
                initAudioEffects(app);
            }
            
            if (app.soundSynth) {
                // Play a facet-specific sound
                app.soundSynth.playFacetSound(facetIndex, 0.6);
                
                // Also play a positional sound based on mouse coords
                app.soundSynth.playPositionSound(app.mouse.x, app.mouse.y);
            }
            
            // Update last facet index
            app.lastFacetIndex = facetIndex;
        }
    } else {
        if (app.isHovered) {
            document.body.style.cursor = 'default';
            
            // Reset wireframe color smoothly to cyan
            const wireMat = app.ballGroup.userData.wireMat;
            wireMat.color.set(0x00FFFF);
            
            // Reset gradient colors
            updateGradientColors(app, '#FF00FF', '#8800FF', '#00FFFF');
            
            app.isHovered = false;
        }
        
        app.touchPoint = null;
        
        // Gradually restore the original shape
        resetDeformation(app, 0.1);
    }
    
    // Handle dragging
    if (app.isDragging) {
        const deltaMove = {
            x: event.clientX - app.previousMousePosition.x,
            y: event.clientY - app.previousMousePosition.y
        };
        
        // Rotate the ball based on mouse movement
        app.ballGroup.rotation.y += deltaMove.x * 0.01;
        app.ballGroup.rotation.x += deltaMove.y * 0.01;
        
        app.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
}

// Check which facet (triangle) is clicked
function getFacetIndex(intersectPoint) {
    // Get the face at the intersection point
    return intersectPoint.faceIndex;
}

function onPointerDown(event, app) {
    // Make sure audio is initialized on first user interaction
    if (!app.audioContext) {
        initAudioEffects(app);
    }
    
    app.isDragging = true;
    app.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
    
    // Disable orbit controls while directly dragging
    if (app.controls) app.controls.enabled = false;
    
    // Check if we're clicking on the ball
    app.raycaster.setFromCamera(app.mouse, app.camera);
    const mesh = app.ballGroup.userData.mesh;
    const intersects = app.raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
        // Handle right click differently
        if (event.button === 2 || (event.touches && event.touches.length > 1)) {
            // Explode effect on right click
            createParticleExplosion(app);
            
            // Change to hot colors
            updateGradientColors(app, '#FF5500', '#FF0000', '#FFFF00');
            
            app.targetScale = 1.3;
            
            // Play explosion sound
            if (app.soundSynth) {
                app.soundSynth.playSpecialSound('explosion');
            }
            
            // Show status
            window.showStatus && window.showStatus('Explosion Effect Activated');
        } else {
            // Regular left click
            // Set target scale for smooth animation
            app.targetScale = 1.1;
            
            // Change color more dramatically on click
            updateGradientColors(app, '#FFAAFF', '#CC66FF', '#66FFFF');
            
            // Play click sound
            if (app.soundSynth) {
                app.soundSynth.playClickSound();
            }
        }
    }
}

function onPointerUp(app) {
    app.isDragging = false;
    
    // Re-enable orbit controls
    if (app.controls) app.controls.enabled = true;
    
    // Reset target scale for smooth animation
    app.targetScale = 1.0;
    
    // Reset colors if not hovering
    if (!app.isHovered) {
        updateGradientColors(app, '#FF00FF', '#8800FF', '#00FFFF');
    }
    
    // Play release sound
    if (app.soundSynth) {
        app.soundSynth.playReleaseSound();
    }
}

// Handle mouse wheel scroll
function onMouseWheel(event, app) {
    // Only affect the ball if we're hovering over it
    if (app.isHovered) {
        // Prevent default scroll behavior
        event.preventDefault();
        
        // Determine scroll direction
        const delta = Math.sign(event.deltaY);
        
        // Adjust spikiness
        app.spikiness += delta * 0.05;
        
        // Clamp to a reasonable range
        app.spikiness = Math.max(0, Math.min(2, app.spikiness));
        
        // Apply spiky deformation
        if (app.spikiness > 0) {
            applySpikyEffect(app, app.spikiness);
            
            // Play spike sound
            if (app.soundSynth) {
                app.soundSynth.playSpecialSound('spike');
            }
            
            // Show status
            window.showStatus && window.showStatus(`Spikiness: ${Math.round(app.spikiness * 100)}%`);
        } else {
            // If spikiness is 0, reset to original shape
            resetDeformation(app, 0.5);
            
            // Show status
            window.showStatus && window.showStatus('Spikes Reset');
        }
    }
}

export { setupEventListeners };