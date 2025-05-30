// effects/trail.js - Motion trail effect
import * as THREE from 'three';

console.log("[🌀 EFFECT] blackhole.js loaded");
export function createTrailEffect(app) {
      console.log("[🌀 EFFECT] createBlackholeEffect called");

    // Create particle system for trail
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Initialize particles at origin
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        
        // Color gradient from magenta to cyan
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = i / particleCount;
        colors[i * 3 + 2] = 1.0;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create material for particles
    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    // Create particle system
    const pointsSystem = new THREE.Points(particles, material);
    app.scene.add(pointsSystem);
    
    // Store for updates
    app.trailEffect = {
        system: pointsSystem,
        positions: positions,
        colors: colors,
        count: particleCount,
        index: 0,
        lastMousePosition: new THREE.Vector3()
    };
}

export function updateTrailEffect(app) {
    if (!app.trailEffect) return;
    
    const trail = app.trailEffect;
    const positions = trail.positions;
    
    // Get current mouse position in 3D space
    const mousePosition = new THREE.Vector3(
        app.mouse.x * 5, 
        app.mouse.y * 5, 
        0
    );
    
    // Only update if mouse has moved
    if (mousePosition.distanceTo(trail.lastMousePosition) > 0.01) {
        // Update particle positions
        trail.index = (trail.index + 1) % trail.count;
        
        // Move oldest particle to current mouse position
        positions[trail.index * 3] = mousePosition.x;
        positions[trail.index * 3 + 1] = mousePosition.y;
        positions[trail.index * 3 + 2] = mousePosition.z;
        
        // Update buffer attribute
        trail.system.geometry.attributes.position.needsUpdate = true;
        
        // Save current position
        trail.lastMousePosition.copy(mousePosition);
    }
}