import * as THREE from 'three';
import { gsap } from 'gsap';

export class TetrahedronTrigger {
  constructor(scene, onActivate) {
    this.scene = scene;
    this.onActivate = onActivate;

    // Create tetrahedron geometry
    const geometry = new THREE.TetrahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x333333,
      emissive: 0x111111,
      roughness: 0.5,
      metalness: 0.8,
    });
    this.mesh = new THREE.Mesh(geometry, material);

    // Add rotation animation
    this.mesh.rotationSpeed = 0.01;
    scene.add(this.mesh);

    // Add interaction
    this.addInteraction();
  }

  addInteraction() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('mousemove', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.scene.camera);
      const intersects = raycaster.intersectObject(this.mesh);

      if (intersects.length > 0) {
        gsap.to(this.mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.2 });
      } else {
        gsap.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
      }
    });

    window.addEventListener('click', () => {
      const intersects = raycaster.intersectObject(this.mesh);
      if (intersects.length > 0 && this.onActivate) {
        this.onActivate();
      }
    });
  }

  update() {
    this.mesh.rotation.y += this.mesh.rotationSpeed;
  }
}