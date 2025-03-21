// Create a gradient texture for the faces
function createGradientTexture(colorStart, colorMid, colorEnd) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    
    const context = canvas.getContext('2d');
    
    // Create gradient
    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    
    // Add gradient colors
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(0.5, colorMid);
    gradient.addColorStop(1, colorEnd);
    
    // Fill with gradient
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Create the ball mesh
function createBall() {
    // Create an icosahedron geometry with subdivision level 4 for smoother deformation
    const geo = new THREE.IcosahedronGeometry(1.0, 4);
    
    // Initial gradient colors
    const colorStart = '#FF00FF'; // Neon pink at center
    const colorMid = '#8800FF';   // Purple in middle
    const colorEnd = '#00FFFF';   // Cyan at edges
    
    const gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);
    
    // Create a material for the main mesh with physically based rendering
    const mat = new THREE.MeshPhysicalMaterial({
        color: 0xFFFFFF,
        map: gradientTexture,
        transparent: true,
        opacity: 0.8,
        metalness: 0.2,
        roughness: 0.3,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
        side: THREE.DoubleSide
    });
    
    // Create a second material specifically for wireframe effect
    const wireMat = new THREE.MeshBasicMaterial({
        color: 0x00FFFF,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    
    // Create a wireframe geometry based on the edges of the icosahedron
    const wireGeo = new THREE.EdgesGeometry(geo);
    
    // Create a line segments mesh using the wireframe geometry and material
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    
    // Create the main mesh using the icosahedron geometry and material
    const mesh = new THREE.Mesh(geo, mat);
    
    // Group both meshes for easier interaction
    ballGroup = new THREE.Group();
    ballGroup.add(mesh);
    ballGroup.add(wireMesh);
    
    // Store additional information in userData for later access
    ballGroup.userData = {
        mesh: mesh,
        wireMesh: wireMesh,
        mat: mat,
        wireMat: wireMat,
        geo: geo,
        wireGeo: wireGeo,
        colorStart: colorStart,
        colorMid: colorMid,
        colorEnd: colorEnd
    };
    
    scene.add(ballGroup);
}

// Update window size
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
}

// Check which facet (triangle) is clicked
function getFacetIndex(mesh, intersectPoint) {
    // Get the face at the intersection point
    const facesIndex = intersectPoint.faceIndex;
    
    // The facet index is just the face index for simple geometry
    return facesIndex;
}