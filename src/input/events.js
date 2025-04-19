// events.js - Handles user interactions
import * as THREE from 'three';
import { 
    ensureAudioInitialized, 
    playToneForPosition, 
    playFacetSound, 
    playClickSound, 
    playReleaseSound,
    playEnhancedFacetSound
} from '../audio/core.js';  // Updated from '../../js/audio/core.js'
import { applyDeformation, resetDeformation } from '../core/ball.js';  // Updated from './ball.js'
import { 
    createParticleExplosion,
    applySpikyEffect, 
    createMagneticTrail, 
    removeMagneticTrail, 
    createBlackholeEffect,
    toggleRainbowMode
} from '../effects/index.js';  // Updated from '../../js/effects/index.js'
import { highlightFacet, getPositionInFacet, updateFacetHighlights } from '../effects/deformation/facet.js';

// Simplified throttle function without time-based throttling
function throttle(fn, delay, options = {}) {
    return function(...args) {
        return fn.apply(this, args);
    };
}

// Set up event listeners
function setupEventListeners(app) {
    console.log("Setting up event listeners...");
    
    // Initialize the lastFacetSoundTime property
    app.lastFacetSoundTime = {};
    app.lastMousePosition = new THREE.Vector2();
    app.mouseMovementDistance = 0;
    
    // Add event listeners for mouse/touch WITHOUT throttling
    const pointerMove = onPointerMove;
    
    window.addEventListener('mousemove', e => pointerMove(e, app));
    window.addEventListener('mousedown', e => onPointerDown(e, app));
    window.addEventListener('mouseup', () => onPointerUp(app));
    window.addEventListener('wheel', e => onMouseWheel(e, app), { passive: false });
    
    window.addEventListener('touchmove', e => {
        e.preventDefault();
        pointerMove(e.touches[0], app);
    }, { passive: false });
    
    window.addEventListener('touchstart', e => {
        e.preventDefault();
        onPointerDown(e.touches[0], app);
    }, { passive: false });
    
    window.addEventListener('touchend', () => onPointerUp(app));
    
    window.addEventListener('contextmenu', e => {
        e.preventDefault();
        // Right-click trigger explosion
        ensureAudioInitialized(app);
        createParticleExplosion(app);
    });
    
    // Double click to toggle rainbow mode
    window.addEventListener('dblclick', () => {
        // Toggle rainbow mode
        const isActive = toggleRainbowMode(app);
        
        // Show status
        if (window.showStatus) {
            window.showStatus('Rainbow Mode ' + (isActive ? 'Activated' : 'Deactivated'));
        }
    });
    
    // Forward/back mouse buttons
    window.addEventListener('mousedown', e => {
        if (e.button === 3) { // Forward button (may vary by mouse)
            if (app.isMagneticMode) {
                removeMagneticTrail(app);
                app.isMagneticMode = false;
                window.showStatus && window.showStatus('Magnetic Effect Deactivated');
            } else {
                createMagneticTrail(app);
                app.isMagneticMode = true;
                window.showStatus && window.showStatus('Magnetic Effect Activated');
            }
        } else if (e.button === 4) { // Back button (may vary by mouse)
            createBlackholeEffect(app);
            window.showStatus && window.showStatus('Blackhole Effect Activated');
        }
    });
    
    console.log("Event listeners set up successfully");
}

// Check which facet (triangle) is clicked
function getFacetIndex(intersectPoint) {
    // Get the face at the intersection point
    return intersectPoint.faceIndex;
}

// Function to handle mouse/touch movement for interaction
function onPointerMove(event, app) {
    if (!app || !app.mouse) return;
    
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Calculate mouse movement distance since last update
    if (app.lastMousePosition && app.lastMousePosition.x !== undefined) {
        const dx = mouseX - app.lastMousePosition.x;
        const dy = mouseY - app.lastMousePosition.y;
        app.mouseMovementDistance = Math.sqrt(dx * dx + dy * dy);
    }
    
    // Update last mouse position
    if (!app.lastMousePosition) {
        app.lastMousePosition = new THREE.Vector2();
    }
    app.lastMousePosition.x = mouseX;
    app.lastMousePosition.y = mouseY;
    
    // Store normalized device coordinates in app
    app.mouse.x = mouseX;
    app.mouse.y = mouseY;
    
    // Safety check for raycaster and camera
    if (!app.raycaster || !app.camera) return;
    
    // Update the raycaster with the new mouse position
    app.raycaster.setFromCamera(app.mouse, app.camera);
    
    // Move the point light to follow the mouse for attractive highlights
    const pointLight = app.scene?.userData?.pointLight;
    if (pointLight) {
        pointLight.position.set(app.mouse.x * 3, app.mouse.y * 3, 2);
    }
    
    // Get reference to the main mesh in the ball group
    const mesh = app.ballGroup?.userData?.mesh;
    if (!mesh) return;
    
    // Calculate objects intersecting the ray
    const intersects = app.raycaster.intersectObject(mesh);
    
    // Change appearance when hovered or touched
    if (intersects.length > 0) {
        if (!app.isHovered) {
            document.body.style.cursor = 'pointer';
            
            // Change wireframe color smoothly to magenta
            const wireMat = app.ballGroup.userData.wireMat;
            if (wireMat) {
                // Direct color set for simplicity, or use tweening library for smooth transition
                wireMat.color.set(0xFF00FF);
            }

            // Change base material color on hover (optional)
            const baseMat = app.ballGroup.userData.baseMat;
            if (baseMat) {
                 baseMat.color.set(0xAA55FF); // Example hover color
            }
            
            app.isHovered = true;
        }
        
        // Store the intersection point for deformation
        app.touchPoint = intersects[0].point.clone();
        
        // Apply deformation when hovering
        applyDeformation(app, app.touchPoint, 0.2, 0.3);
        
        // Check which facet was hit
        const facetIndex = getFacetIndex(intersects[0]);
        
        // Initialize audio on first interaction
        ensureAudioInitialized(app);
        
        // Get the normalized position within the facet for continuous sound
        const positionInFacet = getPositionInFacet(intersects[0]);
        
        // Always play a positional sound based on mouse coords 
        playToneForPosition(app, app.mouse.x, app.mouse.y);
            
        // Play a facet-specific sound
        playFacetSound(app, facetIndex, positionInFacet);
        
        // Update last facet index
        app.lastFacetIndex = facetIndex;

        // Add facet detection
        detectFacetChange(app, intersects);
    } else {
        if (app.isHovered) {
            document.body.style.cursor = 'default';
            
            // Reset wireframe color smoothly to cyan
            const wireMat = app.ballGroup?.userData?.wireMat;
            if (wireMat) {
                wireMat.color.set(0x00FFFF); // Reset wireframe color
            }

            // Reset base material color (optional)
            const baseMat = app.ballGroup.userData.baseMat;
            if (baseMat) {
                 baseMat.color.set(0x00ffff); // Reset base color
            }
            
            app.isHovered = false;
        }
        
        app.touchPoint = null;
        
        // Gradually restore the original shape
        resetDeformation(app, 0.1);
    }
    
    // Handle dragging
    if (app.isDragging && app.previousMousePosition) {
        const deltaMove = {
            x: event.clientX - app.previousMousePosition.x,
            y: event.clientY - app.previousMousePosition.y
        };
        
        // Rotate the ball based on mouse movement
        if (app.ballGroup) {
            app.ballGroup.rotation.y += deltaMove.x * 0.01;
            app.ballGroup.rotation.x += deltaMove.y * 0.01;
        }
        
        app.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
}

function onPointerDown(event, app) {
    if (!app) return;
    
    // Make sure audio is initialized on first user interaction
    ensureAudioInitialized(app);
    
    app.isDragging = true;
    app.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
    
    // Disable orbit controls while directly dragging
    if (app.controls) app.controls.enabled = false;
    
    // Check if we're clicking on the ball
    if (!app.raycaster || !app.mouse || !app.camera) return;
    
    app.raycaster.setFromCamera(app.mouse, app.camera);
    const mesh = app.ballGroup?.userData?.mesh;
    if (!mesh) return;
    
    const intersects = app.raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
        // Handle right click differently
        if (event.button === 2 || (event.touches && event.touches.length > 1)) {
            // Explode effect on right click
            createParticleExplosion(app);
            
            // Change to hot colors (optional, adjust baseMat)
            const baseMat = app.ballGroup.userData.baseMat;
            if (baseMat) {
                baseMat.color.set(0xFF5500); // Example explosion color
            }
            
            app.targetScale = 1.3;
            
            // Show status
            window.showStatus && window.showStatus('Explosion Effect Activated');
        } else {
            // Regular left click
            // Set target scale for smooth animation
            app.targetScale = 1.1;
            
            // Change color more dramatically on click (optional, adjust baseMat)
            const baseMat = app.ballGroup.userData.baseMat;
            if (baseMat) {
                baseMat.color.set(0xCC66FF); // Example click color
            }
            
            // Play click sound
            playClickSound(app);
        }
    }
}

function onPointerUp(app) {
    if (!app) return;
    
    app.isDragging = false;
    
    // Re-enable orbit controls
    if (app.controls) app.controls.enabled = true;
    
    // Reset target scale for smooth animation
    app.targetScale = 1.0;
    
    // Reset colors if not hovering (use baseMat and wireMat)
    if (!app.isHovered) {
        const baseMat = app.ballGroup?.userData?.baseMat;
        const wireMat = app.ballGroup?.userData?.wireMat;
        if (baseMat) {
            baseMat.color.set(0x00ffff); // Reset base color
        }
        if (wireMat) {
            wireMat.color.set(0x00ffff); // Reset wireframe color
        }
    }
    
    // Play release sound
    playReleaseSound(app);
}

// Handle mouse wheel scroll
function onMouseWheel(event, app) {
    if (!app) return;
    
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
            
            // Play spike sound if available
            ensureAudioInitialized(app);
            if (app.soundSynth && app.soundSynth.playSpecialSound) {
                app.soundSynth.playSpecialSound('spike');
            } else if (app.soundSynth) {
                // Fallback to click sound if no special sound function
                playClickSound(app);
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

/**
 * Detect when the pointer moves to a new facet
 */
function detectFacetChange(app, intersects) {
    // Safety check
    if (!app || !intersects || !Array.isArray(intersects) || intersects.length === 0) {
        return false;
    }
    
    // Only proceed if facet highlighting is enabled
    if (app.enableFacetHighlighting) {
        const intersect = intersects[0];
        if (intersect && intersect.face) {
            const faceIndex = intersect.faceIndex;
            
            // Only trigger when crossing to a new facet
            if (app.lastFacetIndex !== faceIndex) {
                const oldFacetIndex = app.lastFacetIndex;
                app.lastFacetIndex = faceIndex;
                
                try {
                    // Get position within the facet for better audio mapping
                    const positionInFacet = getPositionInFacet(intersect);
                    
                    // Emit facet-change event for audio and visual feedback
                    if (app.ballGroup && app.ballGroup.emit) {
                        app.ballGroup.emit('facetChange', { 
                            oldFacet: oldFacetIndex,
                            newFacet: faceIndex,
                            point: intersect.point,
                            position: positionInFacet
                        });
                    }
                    
                    // Highlight the facet visually
                    highlightFacet(app, faceIndex);
                    
                    // Generate facet-specific sound with louder volume
                    playFacetSound(app, faceIndex, positionInFacet);
                    
                } catch (error) {
                    console.error("Error in facet change detection:", error);
                }
                
                return true; // Facet changed
            }
        }
    }
    return false; // No facet change
}

function handleIntersection(app, intersects) {
    // Safety check
    if (!app || !intersects || !Array.isArray(intersects) || intersects.length === 0) {
        return false;
    }
    
    // Replace the original sound playing code with enhanced version
    if (intersects.length > 0) {
        const facet = {
            index: intersects[0].faceIndex,
            object: intersects[0].object
        };
        // Use the enhanced sound function instead of the original one
        playEnhancedFacetSound(app, facet);
        
        // ...rest of the handler...
    }
    
    return false; // No facet change
}

export { setupEventListeners, detectFacetChange, updateFacetHighlights };