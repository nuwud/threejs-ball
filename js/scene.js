// scene.js - Creates the scene, camera, and lighting
import * as THREE from 'three';

// Create the scene
function createScene() {
    const scene = new THREE.Scene();
    
    // Set background color to a deep blue/black
    scene.background = new THREE.Color(0x000510);
    
    // Add fog for depth effect (very subtle)
    scene.fog = new THREE.FogExp2(0x000510, 0.1);
    
    return scene;
}

// Setup the camera
function setupCamera() {
    // Create a perspective camera
    const fov = 75; // Field of view
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    
    // Position the camera
    camera.position.set(0, 0, 2);
    
    return camera;
}

// Setup lighting for the scene
function setupLights(app) {
    // Hemisphere light for ambient illumination
    const hemilight = new THREE.HemisphereLight(0x99BBFF, 0x000000, 1);
    hemilight.position.set(0, 1, 0).normalize();
    app.scene.add(hemilight);
    
    // Main directional light with shadows
    const light = new THREE.DirectionalLight(0xFFFFFF, 1);
    light.position.set(1, 1, 1).normalize();
    app.scene.add(light);
    
    // Secondary directional light for fill
    const light2 = new THREE.DirectionalLight(0xFF99CC, 0.5);
    light2.position.set(-1, -1, -1).normalize();
    app.scene.add(light2);
    
    // Add point light that follows mouse for highlights
    const pointLight = new THREE.PointLight(0x00FFFF, 2, 4);
    pointLight.position.set(0, 0, 2);
    app.scene.add(pointLight);
    
    // Store the point light for later access
    app.scene.userData.pointLight = pointLight;
    
    // Add a small touch sphere to show where the user is touching
    const touchSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshBasicMaterial({
            color: 0xFF00FF,
            transparent: true,
            opacity: 0.6,
            depthTest: false
        })
    );
    touchSphere.visible = false;
    app.scene.add(touchSphere);
    app.scene.userData.touchSphere = touchSphere;
}

export { createScene, setupCamera, setupLights };