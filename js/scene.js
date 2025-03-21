// scene.js - Handles scene creation and camera setup
import * as THREE from 'three';

// Create the scene
function createScene() {
    const scene = new THREE.Scene();

    // Create a touch sphere to visualize the touch point
    const touchSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.5
        })
    );
    touchSphere.visible = false;
    scene.add(touchSphere);

    // Store touchSphere reference for access from other modules
    scene.userData.touchSphere = touchSphere;

    return scene;
}

// Set up the camera
function setupCamera() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Set up the camera with field of view, aspect ratio, and clipping planes
    const fov = 75;
    const aspect = w / h;
    const near = 0.1;
    const far = 1000;

    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, 2); // Position camera 2 units away from origin

    // Create an audio listener and add it to the camera
    const listener = new THREE.AudioListener();
    camera.add(listener);

    // Store listener in camera for access from audio module
    camera.userData.listener = listener;

    return camera;
}

// Set up the lighting
function setupLights(app) {
    // Hemisphere light (sky and ground color)
    const hemilight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    hemilight.position.set(0, 1, 0).normalize();
    app.scene.add(hemilight);

    // Directional lights for shadows and highlights
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    app.scene.add(light);

    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(-1, -1, -1).normalize();
    app.scene.add(light2);

    const light3 = new THREE.DirectionalLight(0xffffff, 0.5);
    light3.position.set(0, 1, 0).normalize();
    app.scene.add(light3);

    // Add a point light that follows the mouse for interactive lighting
    const pointLight = new THREE.PointLight(0xFFFFFF, 1, 5);
    pointLight.position.set(0, 0, 2);
    app.scene.add(pointLight);

    // Store point light in scene for access from event handlers
    app.scene.userData.pointLight = pointLight;
}

export { createScene, setupCamera, setupLights };