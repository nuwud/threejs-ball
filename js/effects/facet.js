// effects/facet.js - Facet highlighting and interaction
import * as THREE from 'three';

// Track which facets are highlighted
let highlightedFacets = new Map();
let facetHighlightObjects = new Map();
let highlightGroup = null;

/**
 * Get normalized position within a facet
 * @param {Object} intersect - Intersection data from raycaster
 * @returns {Object} Normalized u,v coordinates (0-1) within the facet
 */
function getPositionInFacet(intersect) {
    if (!intersect || !intersect.uv) {
        return { u: 0.5, v: 0.5 }; // Default to center if no UV
    }
    
    // Return UV coordinates normalized to the facet
    return {
        u: intersect.uv.x,
        v: intersect.uv.y
    };
}

/**
 * Highlight a specific facet with a visual overlay
 * This uses a different approach than vertex coloring - 
 * it creates a small overlay mesh that floats just above the facet
 */
function highlightFacet(app, faceIndex) {
    if (!app.ballGroup) {
        console.error("Cannot highlight facet: ball not found");
        return;
    }
    
    try {
        // Create highlight group if it doesn't exist
        if (!highlightGroup) {
            highlightGroup = new THREE.Group();
            app.ballGroup.add(highlightGroup);
        }
        
        // Get geometry and mesh reference
        const mesh = app.ballGroup.userData.mesh;
        if (!mesh || !mesh.geometry) {
            console.error("Cannot highlight facet: mesh or geometry missing");
            return;
        }
        
        const geometry = mesh.geometry;
        
        // Track highlighted state
        highlightedFacets.set(faceIndex, Date.now());
        
        // If we already have a highlight object for this facet, just update it
        if (facetHighlightObjects.has(faceIndex)) {
            const highlight = facetHighlightObjects.get(faceIndex);
            highlight.material.opacity = 0.7; // Make fully visible again
            return;
        }
        
        // Get the vertices of this face
        const positionAttr = geometry.attributes.position;
        const index = geometry.index;
        
        if (!positionAttr || !index) {
            console.error("Cannot highlight facet: geometry attributes missing");
            return;
        }
        
        // Get face vertices for triangular face from index buffer
        const a = index.array[faceIndex * 3];
        const b = index.array[faceIndex * 3 + 1];
        const c = index.array[faceIndex * 3 + 2];
        
        // Get vertex positions
        const vA = new THREE.Vector3(
            positionAttr.array[a * 3],
            positionAttr.array[a * 3 + 1],
            positionAttr.array[a * 3 + 2]
        );
        
        const vB = new THREE.Vector3(
            positionAttr.array[b * 3],
            positionAttr.array[b * 3 + 1],
            positionAttr.array[b * 3 + 2]
        );
        
        const vC = new THREE.Vector3(
            positionAttr.array[c * 3],
            positionAttr.array[c * 3 + 1],
            positionAttr.array[c * 3 + 2]
        );
        
        // Create a custom geometry for this triangle
        const highlightGeo = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            vA.x, vA.y, vA.z,
            vB.x, vB.y, vB.z,
            vC.x, vC.y, vC.z
        ]);
        
        highlightGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        highlightGeo.computeVertexNormals();
        
        // Calculate face normal
        const normal = new THREE.Vector3();
        normal.crossVectors(
            vB.clone().sub(vA),
            vC.clone().sub(vA)
        ).normalize();
        
        // Generate unique color based on face index for visual variety
        const hue = (faceIndex % 100) / 100;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
        
        // Create material with glow effect
        const highlightMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        // Create highlight mesh
        const highlight = new THREE.Mesh(highlightGeo, highlightMat);
        
        // Position slightly above the surface (in the direction of the normal)
        highlight.position.x += normal.x * 0.01;
        highlight.position.y += normal.y * 0.01;
        highlight.position.z += normal.z * 0.01;
        
        // Add to highlight group
        highlightGroup.add(highlight);
        
        // Store reference for future updates
        facetHighlightObjects.set(faceIndex, highlight);
        
        // Schedule automatic fade-out
        setTimeout(() => fadeOutHighlight(app, faceIndex), 300);
    } catch (error) {
        console.error("Error highlighting facet:", error);
    }
}

/**
 * Gradually fade out a facet highlight
 */
function fadeOutHighlight(app, faceIndex) {
    const highlight = facetHighlightObjects.get(faceIndex);
    if (!highlight) return;
    
    // If this facet was recently highlighted again, don't fade it
    const lastUpdate = highlightedFacets.get(faceIndex);
    if (Date.now() - lastUpdate < 300) return;
    
    // Fade out over time
    const fadeInterval = setInterval(() => {
        highlight.material.opacity -= 0.05;
        
        if (highlight.material.opacity <= 0) {
            clearInterval(fadeInterval);
            // Remove if fully transparent
            if (highlightGroup && highlightGroup.children.includes(highlight)) {
                highlightGroup.remove(highlight);
            }
            facetHighlightObjects.delete(faceIndex);
            highlightedFacets.delete(faceIndex);
        }
    }, 30);
}

/**
 * Update all facet highlights
 * Call this in the animation loop
 */
function updateFacetHighlights(app) {
    if (!highlightGroup) return;
    
    // Make highlight group always face camera
    if (app.camera) {
        highlightGroup.quaternion.copy(app.camera.quaternion);
    }
}

export { 
    highlightFacet, 
    updateFacetHighlights,
    getPositionInFacet
};