import * as THREE from "three";

const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
const fov = 75;
const aspect = w / h;
const near = 0.1;
const far = 1000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 0, 2);
const scene = new THREE.Scene();

const geo = new THREE.IcosahedronGeometry(1.0, 2);
//const mat = new THREE.MeshNormalMaterial();
const mat = new THREE.MeshStandardMaterial({
    color: 0xFF00FF, // Changed to neon pink
    // color: 0x00FF00, // Changed to neon green
    emissive: 0x00FF00, // Changed to neon green
    emissiveIntensity: .3,
    emissiveMap: null,
    map: null,
    alphaMap: null,
    envMap: null,
    envMapIntensity: 1,
    reflectivity: 3,
    refractionRatio: 0.98,
    wireframe: true,
    wireframeLinewidth: 1,
    wireframeLinecap: 'round',
    wireframeLinejoin: 'round',
    skinning: false,
    morphTargets: false,
    morphNormals: false,
    lights: true,
    fog: true,
    clippingPlanes: null,
    clipIntersection: false,
    clipShadows: false,
    flatShading: true,
    depthWrite: true,
    depthTest: true,
    transparent: true,
    opacity: 0.5,
    alphaTest: 0.5,
    visible: true,
});

const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00FFFF, // Changed to neon cyan/blue
    wireframe: true,
    wireframeLinewidth: 1,
    wireframeLinecap: 'round',
    wireframeLinejoin: 'round',
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    fog: false,
    lights: false,
    clippingPlanes: null,
    clipIntersection: false,
    clipShadows: false,
    shadowMapEnabled: false,
    skinning: false,
    morphTargets: false,
    morphNormals: false,
    alphaMap: null,
    envMap: null,
    envMapIntensity: 1,
    reflectivity: 1,
    refractionRatio: 0.98,
    emissive: 0x00FFFF, // Changed to neon cyan/blue
    emissiveIntensity: 0.5,
    emissiveMap: null,
    map: null,
    alphaMap: null,
    envMap: null,
    envMapIntensity: 1,
    reflectivity: 1,
    refractionRatio: 0.98,
});
const wireGeo = new THREE.EdgesGeometry(geo);
const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
wireMesh.position.set(0, 0, 0);
wireMesh.rotation.set(0, 0, 0);
wireMesh.scale.set(1, 1, 1);
wireMesh.geometry.attributes.position.needsUpdate = true;

const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);
scene.add(wireMesh);

// Create a new hemisphere light with custom colors
const wireLight = new THREE.HemisphereLight(0x00CCFF, 0xFF6600, 1);
wireLight.position.set(0, 1, 0).normalize();
scene.add(wireLight);

// Make this light only affect the wireframe mesh
wireMesh.layers.set(1);
wireLight.layers.set(1);

// Make sure the main mesh remains visible on default layer
mesh.layers.set(0);
camera.layers.enable(0);
camera.layers.enable(1);

// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);
// const gridHelper = new THREE.GridHelper(10, 10);
// scene.add(gridHelper);
// const planeGeometry = new THREE.PlaneGeometry(10, 10);
// const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
// const plane = new THREE.Mesh(planeGeometry, planeMaterial);
// plane.rotation.x = Math.PI / 2;
// scene.add(plane);
// const ambientLight = new THREE.AmbientLight(0x404040, 1);
// ambientLight.position.set(0, 1, 0).normalize();
// scene.add(ambientLight);
// const pointLight = new THREE.PointLight(0xffffff, 1, 100);
// pointLight.position.set(0, 10, 0);
// pointLight.castShadow = true;
// pointLight.shadow.mapSize.width = 512; // default
// pointLight.shadow.mapSize.height = 512; // default
// pointLight.shadow.camera.near = 0.5; // default
// pointLight.shadow.camera.far = 500; // default
// pointLight.shadow.camera.fov = 30; // default
// pointLight.shadow.bias = -0.0001; // default
// scene.add(pointLight);
// const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.5);
// scene.add(pointLightHelper);
// const spotLight = new THREE.SpotLight(0xffffff, 1);
// spotLight.position.set(0, 10, 0);
// spotLight.castShadow = true;
// spotLight.shadow.mapSize.width = 512; // default
// spotLight.shadow.mapSize.height = 512; // default
// spotLight.shadow.camera.near = 0.5; // default
// spotLight.shadow.camera.far = 500; // default
// spotLight.shadow.camera.fov = 30; // default
// spotLight.shadow.bias = -0.0001; // default
// spotLight.shadow.camera.near = 0.5; // default
// spotLight.shadow.camera.far = 500; // default
// spotLight.shadow.camera.fov = 30; // default
// spotLight.shadow.bias = -0.0001; // default
// scene.add(spotLight);
// const spotLightHelper = new THREE.SpotLightHelper(spotLight);
// scene.add(spotLightHelper);
// const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
// directionalLight.position.set(0, 10, 0);
// directionalLight.castShadow = true;
// directionalLight.shadow.mapSize.width = 512; // default
// directionalLight.shadow.mapSize.height = 512; // default
// directionalLight.shadow.camera.near = 0.5; // default
// directionalLight.shadow.camera.far = 500; // default
// directionalLight.shadow.camera.fov = 30; // default
// directionalLight.shadow.bias = -0.0001; // default
// scene.add(directionalLight);
// const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.5);
// scene.add(directionalLightHelper);
// const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
// hemisphereLight.position.set(0, 10, 0);
// hemisphereLight.castShadow = true;
// hemisphereLight.shadow.mapSize.width = 512; // default
// hemisphereLight.shadow.mapSize.height = 512; // default
// hemisphereLight.shadow.camera.near = 0.5; // default
// hemisphereLight.shadow.camera.far = 500; // default
// hemisphereLight.shadow.camera.fov = 30; // default
// hemisphereLight.shadow.bias = -0.0001; // default
// scene.add(hemisphereLight);
// const hemisphereLightHelper = new THREE.HemisphereLightHelper(hemisphereLight, 0.5);
// scene.add(hemisphereLightHelper);

// const rectAreaLight = new THREE.RectAreaLight(0xffffff, 1, 10, 10);
// rectAreaLight.position.set(0, 10, 0);
// rectAreaLight.rotation.x = Math.PI / 2;
// rectAreaLight.castShadow = true;
// rectAreaLight.shadow.mapSize.width = 512; // default
// rectAreaLight.shadow.mapSize.height = 512; // default
// rectAreaLight.shadow.camera.near = 0.5; // default
// rectAreaLight.shadow.camera.far = 500; // default
// rectAreaLight.shadow.camera.fov = 30; // default
// rectAreaLight.shadow.bias = -0.0001; // default
// scene.add(rectAreaLight);
// const rectAreaLightHelper = new THREE.RectAreaLightHelper(rectAreaLight, 0.5);
// scene.add(rectAreaLightHelper);
// const light = new THREE.DirectionalLight(0xffffff, 1);
// light.position.set(1, 1, 1).normalize();
// scene.add(light);
// const light2 = new THREE.DirectionalLight(0xffffff, 1);
// light2.position.set(-1, -1, -1).normalize();
// scene.add(light2);
// const light3 = new THREE.DirectionalLight(0xffffff, 1);
// light3.position.set(0, 1, 0).normalize();
// scene.add(light3);

// const ambientLight = new THREE.AmbientLight(0x404040, 1);
// scene.add(ambientLight);

const hemilight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
hemilight.position.set(0, 1, 0).normalize();
scene.add(hemilight);


const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);
const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(-1, -1, -1).normalize();
scene.add(light2);
const light3 = new THREE.DirectionalLight(0xffffff, 1);
light3.position.set(0, 1, 0).normalize();
scene.add(light3);

function updateMeshScale() {
    mesh.scale.setScalar(Math.sin(Date.now() * 0.001) + 1);
}

function updateMeshRotation() {
    mesh.rotation.x = Math.sin(Date.now() * 0.001);
    mesh.rotation.y = Math.sin(Date.now() * 0.001);
    mesh.rotation.z = Math.sin(Date.now() * 0.001);
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;
    mesh.rotation.z += 0.01;
}

function updateMeshPosition() {
    mesh.position.x = Math.sin(Date.now() * 0.001);
    mesh.position.y = Math.cos(Date.now() * 0.001);
    mesh.position.z = Math.sin(Date.now() * 0.001);
    mesh.position.set(Math.sin(Date.now() * 0.001), Math.cos(Date.now() * 0.001), Math.sin(Date.now() * 0.001));
}

function animate(t = 0) {
    requestAnimationFrame(animate);
    updateMeshScale();
    updateMeshRotation();
    updateMeshPosition();
    renderer.render(scene, camera);
}
animate();
//const geometry = new THREE.BoxGeometry(1, 1, 1);
//const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // renderer.render(scene, camera);
//scene.add(cube);
//const animate = function () {
    //requestAnimationFrame(animate);
    //cube.rotation.x += 0.01;
    //cube.rotation.y += 0.01;
    //renderer.render(scene, camera);
//};
//animate();

// The renderer.render call below is not needed as it's already in the animate function