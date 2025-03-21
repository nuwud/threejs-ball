// simple-test.js - A minimal Three.js test with debug logging
import * as THREE from 'three';

console.log("===== SIMPLE TEST STARTING =====");
console.log("Three.js version:", THREE.REVISION);

try {
  console.log("Creating renderer...");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  console.log("Renderer created and added to DOM");

  console.log("Creating scene...");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0000ff); // Blue background to make it obvious
  console.log("Scene created");

  console.log("Creating camera...");
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;
  console.log("Camera created");

  console.log("Creating cube...");
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
  console.log("Cube created and added to scene");

  console.log("Setting up animation loop...");
  function animate() {
    requestAnimationFrame(animate);
    
    // Rotate the cube
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    
    // Render
    renderer.render(scene, camera);
  }

  console.log("Starting animation");
  animate();
  console.log("Animation loop started");
  
} catch (error) {
  console.error("ERROR:", error.message);
  console.error(error.stack);
  
  // Display error on screen
  const errorDiv = document.createElement('div');
  errorDiv.style.padding = '20px';
  errorDiv.style.color = 'red';
  errorDiv.style.backgroundColor = 'black';
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '10px';
  errorDiv.style.left = '10px';
  errorDiv.style.right = '10px';
  errorDiv.style.zIndex = '1000';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.innerHTML = `<h2>Error occurred:</h2><pre>${error.message}\n\n${error.stack}</pre>`;
  document.body.appendChild(errorDiv);
}

console.log("===== END OF SCRIPT =====");