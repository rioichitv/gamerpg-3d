import * as THREE from 'three';

export class DungeonMap {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.buildDungeon();
    this.scene.add(this.group);
  }

  buildDungeon() {
    // 1. Dark Volcanic Ground
    const groundGeom = new THREE.PlaneGeometry(120, 120, 16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x181111,
      roughness: 0.95,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Glowing Lava Fissures
    const lavaFissureGeom = new THREE.PlaneGeometry(8, 70);
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xf97316,
      emissiveIntensity: 1.8
    });
    const lavaL = new THREE.Mesh(lavaFissureGeom, lavaMat);
    lavaL.rotation.x = -Math.PI / 2;
    lavaL.position.set(-18, 0.02, 0);
    const lavaR = new THREE.Mesh(lavaFissureGeom, lavaMat);
    lavaR.rotation.x = -Math.PI / 2;
    lavaR.position.set(18, 0.02, 0);
    this.group.add(lavaL, lavaR);

    // 2. Obsidian Dragon Pillars
    for (let i = -30; i <= 30; i += 15) {
      this.createPillar(-25, i);
      this.createPillar(25, i);
    }

    // 3. Dungeon Perimeter Rocky Walls
    this.createWall(0, 5, -45, 100, 10, 4); // North
    this.createWall(0, 5, 45, 100, 10, 4);  // South
    this.createWall(-45, 5, 0, 4, 10, 100); // West
    this.createWall(45, 5, 0, 4, 10, 100);  // East

    // 4. Ambient Red Lava Lights
    const redLight1 = new THREE.PointLight(0xef4444, 3, 40);
    redLight1.position.set(-18, 4, -10);
    const redLight2 = new THREE.PointLight(0xef4444, 3, 40);
    redLight2.position.set(18, 4, 10);
    this.group.add(redLight1, redLight2);
  }

  createPillar(x, z) {
    const pillarGeom = new THREE.CylinderGeometry(1.2, 1.8, 12, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.8 });
    const pillar = new THREE.Mesh(pillarGeom, pillarMat);
    pillar.position.set(x, 6, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    this.group.add(pillar);

    // Torch on pillar
    const torchLight = new THREE.PointLight(0xf97316, 1.5, 15);
    torchLight.position.set(x, 6, z);
    this.group.add(torchLight);
  }

  createWall(x, y, z, w, h, d) {
    const wallGeom = new THREE.BoxGeometry(w, h, d);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
    const wall = new THREE.Mesh(wallGeom, wallMat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.group.add(wall);
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
