// quick-fix-combined.js - All-in-one solution
// This file does not use ES6 modules to ensure compatibility

// Wait for document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Three.js
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000510);
  
  // Create camera
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 2);
  
  // Create renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  
  // Create ball group
  const ballGroup = new THREE.Group();
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
  const ball = new THREE.Mesh(geometry, material);
  ballGroup.add(ball);
  
  // Tracking variables
  const mouse = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let isDragging = false;
  
  // Window resize handler
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Mouse/Touch event handlers
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
  
  // Touch handlers for mobile devices
  function onTouchStart(event) {
    // Prevent default behavior to avoid scrolling
    event.preventDefault();
    
    if (event.touches.length === 1) {
      isDragging = true;
      
      // Store the initial touch position
      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      
      // Update the mouse position for raycasting
      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    }
  }
  
  function onTouchMove(event) {
    // Prevent default behavior to avoid scrolling
    event.preventDefault();
    
    if (event.touches.length === 1 && isDragging) {
      const touch = event.touches[0];
      
      // Calculate movement delta
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      
      // Update rotation
      ballGroup.rotation.y += deltaX * 0.01;
      ballGroup.rotation.x += deltaY * 0.01;
      
      // Update touch start position
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      
      // Update the mouse position for raycasting
      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    }
  }
  
  function onTouchEnd() {
    isDragging = false;
  }
  
  // Animation loop
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
  
  // Add event listeners
  window.addEventListener('resize', onWindowResize);
  // Mouse events
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  // Touch events
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
  
  // Initialize touch tracking variables
  let touchStartX = 0;
  let touchStartY = 0;
  
  // Start animation
  animate();
  
  console.log("Three.js ball application initialized successfully");
  
  // Handle instructions toggle button
  const instructionsButton = document.getElementById('instructions-button');
  const instructions = document.getElementById('instructions');
  
  if (instructionsButton && instructions) {
    instructionsButton.addEventListener('click', function() {
      if (instructions.style.display === 'none' || instructions.style.display === '') {
        instructions.style.display = 'block';
      } else {
        instructions.style.display = 'none';
      }
    });
  }
});