// quick-fix.js - A simplified version to get the 3D ball rendering
import * as THREE from 'three';

// Initialize
let scene, camera, renderer, ball;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let isDragging = false;
let ballGroup;

function init() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000510);
  
  // Create camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 2);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  
  // Create ball
  createBall();
  
  // Add event listeners
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  
  // Start animation
  animate();
  
  console.log("Basic Three.js application initialized successfully");
}

function createBall() {
  // Create a group to hold the ball
  ballGroup = new THREE.Group();
  scene.add(ballGroup);
  
  // Create the ball geometry (icosahedron for better triangle distribution)
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  
  // Create material with nice shading
  const material = new THREE.MeshPhongMaterial({
    color: 0x00aaff,
    shininess: 60,
    flatShading: true
  });
  
  // Create the ball mesh
  ball = new THREE.Mesh(geometry, material);
  ballGroup.add(ball);
  
  console.log("Ball created successfully");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Handle ball rotation when dragging
  if (isDragging) {
    // Rotate ball based on mouse movement
    ballGroup.rotation.y += event.movementX * 0.01;
    ballGroup.rotation.x += event.movementY * 0.01;
  }
}

function onMouseDown(event) {
  isDragging = true;
}

function onMouseUp(event) {
  isDragging = false;
}

function animate() {
  requestAnimationFrame(animate);
  
  // Simple rotation if not being controlled
  if (!isDragging) {
    ballGroup.rotation.y += 0.005;
  }
  
  // Check for interactions with the ball
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(ball);
  
  if (intersects.length > 0) {
    // Change color when hovered
    ball.material.color.set(0x00ffff);
  } else {
    // Return to original color
    ball.material.color.set(0x00aaff);
  }
  
  // Render the scene
  renderer.render(scene, camera);
}

// Initialize the application
init();