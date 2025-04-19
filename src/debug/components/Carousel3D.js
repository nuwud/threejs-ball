import * as THREE from 'three';

export class Carousel3D {
  constructor(scene, itemLabels = ['Item 1', 'Item 2', 'Item 3'], radius = 5) {
    this.scene = scene;
    this.itemLabels = itemLabels;
    this.radius = radius;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.createItems();
  }

  createItems() {
    const angleStep = (2 * Math.PI) / this.itemLabels.length;

    this.itemLabels.forEach((label, i) => {
      const angle = i * angleStep;
      const x = Math.cos(angle) * this.radius;
      const z = Math.sin(angle) * this.radius;

      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);

      cube.position.set(x, 0, z);
      cube.lookAt(0, 0, 0);

      this.group.add(cube);
    });
  }

  rotate(delta = 0.01) {
    this.group.rotation.y += delta;
  }
}