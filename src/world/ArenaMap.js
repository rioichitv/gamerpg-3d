import * as THREE from 'three';

export class ArenaMap {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.buildArena();
    this.scene.add(this.group);
  }

  buildArena() {
    // 1. Sand Arena Ground
    const groundGeom = new THREE.CylinderGeometry(35, 35, 1, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Inner Duel Ring
    const ringGeom = new THREE.RingGeometry(18, 19, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.group.add(ring);

    // 2. Colosseum Ring Pillars
    const numPillars = 12;
    for (let i = 0; i < numPillars; i++) {
      const angle = (i / numPillars) * Math.PI * 2;
      const x = Math.cos(angle) * 32;
      const z = Math.sin(angle) * 32;

      const pillarGeom = new THREE.CylinderGeometry(1.2, 1.4, 9, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
      const pillar = new THREE.Mesh(pillarGeom, pillarMat);
      pillar.position.set(x, 4.5, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.group.add(pillar);

      // Blue Arena Flame
      const flame = new THREE.PointLight(0x38bdf8, 1.5, 16);
      flame.position.set(x, 5.5, z);
      this.group.add(flame);
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
