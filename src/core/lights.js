import * as THREE from 'three';

// src/core/lights.js

/**
 * Creates and returns a directional light.
 * @param {number} color - The color of the light.
 * @param {number} intensity - The intensity of the light.
 * @returns {THREE.DirectionalLight} The directional light.
 */
export function createDirectionalLight(color = 0xffffff, intensity = 1) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;
    return light;
}

/**
 * Creates and returns an ambient light.
 * @param {number} color - The color of the light.
 * @param {number} intensity - The intensity of the light.
 * @returns {THREE.AmbientLight} The ambient light.
 */
export function createAmbientLight(color = 0xffffff, intensity = 0.5) {
    return new THREE.AmbientLight(color, intensity);
}

/**
 * Creates and returns a point light.
 * @param {number} color - The color of the light.
 * @param {number} intensity - The intensity of the light.
 * @param {number} distance - The maximum range of the light.
 * @param {number} decay - The rate at which the light dims.
 * @returns {THREE.PointLight} The point light.
 */
export function createPointLight(color = 0xffffff, intensity = 1, distance = 0, decay = 2) {
    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.castShadow = true;
    return light;
}

/**
 * Adds default lighting to a scene.
 * @param {THREE.Scene} scene - The scene to add lights to.
 */
export function addDefaultLights(scene) {
    const directionalLight = createDirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    const ambientLight = createAmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
}