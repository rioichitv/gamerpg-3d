import * as THREE from 'three';

export class TownMap {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.npcs = [];
    this.buildGrandTown();
    this.scene.add(this.group);
  }

  buildGrandTown() {
    // 1. Massive Ground Terrain (240x240)
    const groundGeom = new THREE.PlaneGeometry(240, 240, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1f2421, // deep fantasy grass/stone
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Stone Paved Plazas and Avenues
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.8 });
    const marbleMat = new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.6, metalness: 0.2 });

    // Main North-South Royal Avenue
    const mainAvenue = new THREE.Mesh(new THREE.PlaneGeometry(24, 180), stoneMat);
    mainAvenue.rotation.x = -Math.PI / 2;
    mainAvenue.position.y = 0.02;
    mainAvenue.receiveShadow = true;
    this.group.add(mainAvenue);

    // East-West Merchant Boulevard
    const crossAvenue = new THREE.Mesh(new THREE.PlaneGeometry(180, 20), stoneMat);
    crossAvenue.rotation.x = -Math.PI / 2;
    crossAvenue.position.y = 0.02;
    crossAvenue.receiveShadow = true;
    this.group.add(crossAvenue);

    // Central Grand Octagon Plaza
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 0.1, 8), marbleMat);
    plaza.position.set(0, 0.05, 0);
    plaza.receiveShadow = true;
    this.group.add(plaza);

    // 2. Central Grand 3-Tier Fountain
    this.createGrandFountain(0, 0);

    // 3. Castle Perimeter Walls & Watchtowers
    this.createCastlePerimeter();

    // 4. Interactive NPCs in Plaza
    // NPC 1: Irene (Potion Merchant / Toko Darah)
    this.createNPC(-14, 0, -10, 'Irene [Toko Potion]', 0xec4899, 'potion');

    // NPC 2: Corin (Blacksmith / Tempa Senjata)
    this.createNPC(14, 0, -10, 'Corin [Pandai Besi]', 0x06b6d4, 'forge');

    // NPC 3: Stella (Skill Master / Upgrade Skill)
    this.createNPC(-14, 0, 10, 'Stella [Skill Master]', 0xa855f7, 'skill');

    // NPC 4: Guildmaster Roy (Quest & Party)
    this.createNPC(14, 0, 10, 'Roy [Guildmaster]', 0xf59e0b, 'quest');

    // 5. Grand North Portal (The Crimson Dragon Nest Gate)
    this.createGrandNestPortal(0, 0, -85);

    // 6. Grand South Portal (Colosseum PvP Gate)
    this.createGrandArenaPortal(0, 0, 85);

    // 7. City Architecture: Houses, Guild Halls, Market Tents, Trees & Lamps
    this.populateCityProps();
  }

  createGrandFountain(x, z) {
    const marbleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.2 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0891b2,
      emissiveIntensity: 0.6
    });

    // Tier 1 Base Basin
    const basin1 = new THREE.Mesh(new THREE.CylinderGeometry(10, 10.5, 1.2, 16), marbleMat);
    basin1.position.set(x, 0.6, z);
    basin1.castShadow = true;
    this.group.add(basin1);

    const water1 = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 0.2, 16), waterMat);
    water1.position.set(x, 1.1, z);
    this.group.add(water1);

    // Tier 2 Basin
    const basin2 = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6, 1.0, 16), marbleMat);
    basin2.position.set(x, 2.2, z);
    basin2.castShadow = true;
    this.group.add(basin2);

    const water2 = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.2, 16), waterMat);
    water2.position.set(x, 2.7, z);
    this.group.add(water2);

    // Dragon Angel Spire
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 5, 8), marbleMat);
    spire.position.set(x, 4.8, z);
    spire.castShadow = true;
    this.group.add(spire);

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 2.0
    }));
    crystal.position.set(x, 7.8, z);
    this.group.add(crystal);

    const light = new THREE.PointLight(0x38bdf8, 2, 20);
    light.position.set(x, 8.0, z);
    this.group.add(light);
  }

  createCastlePerimeter() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    const createWallSegment = (x, z, w, d) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 14, d), wallMat);
      wall.position.set(x, 7, z);
      wall.castShadow = true;
      this.group.add(wall);
    };

    const createTower = (x, z) => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 20, 12), towerMat);
      tower.position.set(x, 10, z);
      tower.castShadow = true;
      this.group.add(tower);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 7, 8), new THREE.MeshStandardMaterial({ color: 0x991b1b }));
      roof.position.set(x, 23.5, z);
      this.group.add(roof);
    };

    // North Walls (with gap for portal)
    createWallSegment(-65, -95, 80, 6);
    createWallSegment(65, -95, 80, 6);
    // South Walls
    createWallSegment(-65, 95, 80, 6);
    createWallSegment(65, 95, 80, 6);
    // West & East Walls
    createWallSegment(-105, 0, 6, 196);
    createWallSegment(105, 0, 6, 196);

    // 4 Corner Towers
    createTower(-105, -95);
    createTower(105, -95);
    createTower(-105, 95);
    createTower(105, 95);
  }

  createNPC(x, y, z, name, color, type) {
    const npcGroup = new THREE.Group();
    npcGroup.position.set(x, y, z);

    // Stylized NPC Mesh
    const robeMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.4, 8), robeMat);
    body.position.y = 0.7;
    body.castShadow = true;
    npcGroup.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), skinMat);
    head.position.y = 1.6;
    npcGroup.add(head);

    // Floating Interaction Icon / Exclamation Mark
    const iconGeom = new THREE.OctahedronGeometry(0.25);
    const iconMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const icon = new THREE.Mesh(iconGeom, iconMat);
    icon.position.y = 2.4;
    npcGroup.add(icon);

    // Name Sprite Billboard
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 38);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 2.8, 0);
    sprite.scale.set(3.2, 0.8, 1);
    npcGroup.add(sprite);

    npcGroup.userData = { type, name, position: new THREE.Vector3(x, y, z) };
    this.npcs.push(npcGroup);
    this.group.add(npcGroup);
  }

  createGrandNestPortal(x, y, z) {
    const archMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.7, metalness: 0.5 });
    
    // Dragon Horn Pillars
    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.4, 18, 8), archMat);
    pillarL.position.set(x - 10, y + 9, z);
    pillarL.castShadow = true;
    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.4, 18, 8), archMat);
    pillarR.position.set(x + 10, y + 9, z);
    pillarR.castShadow = true;
    this.group.add(pillarL, pillarR);

    // Crimson Dragon Skull / Arch Top
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(24, 3.5, 3), archMat);
    archTop.position.set(x, y + 18, z);
    this.group.add(archTop);

    // Fiery Swirling Vortex Portal
    const vortexGeom = new THREE.PlaneGeometry(16, 16);
    const vortexMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const vortex = new THREE.Mesh(vortexGeom, vortexMat);
    vortex.position.set(x, y + 8, z);
    this.group.add(vortex);

    // Glowing Lava Light
    const light = new THREE.PointLight(0xef4444, 4, 30);
    light.position.set(x, y + 8, z + 2);
    this.group.add(light);
  }

  createGrandArenaPortal(x, y, z) {
    const archMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });

    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 16, 8), archMat);
    pillarL.position.set(x - 9, y + 8, z);
    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 16, 8), archMat);
    pillarR.position.set(x + 9, y + 8, z);
    this.group.add(pillarL, pillarR);

    const archTop = new THREE.Mesh(new THREE.BoxGeometry(22, 3, 3), archMat);
    archTop.position.set(x, y + 16, z);
    this.group.add(archTop);

    const vortex = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    }));
    vortex.position.set(x, y + 7, z);
    this.group.add(vortex);

    const light = new THREE.PointLight(0x38bdf8, 3, 25);
    light.position.set(x, y + 7, z - 2);
    this.group.add(light);
  }

  populateCityProps() {
    // Street Lamps along royal avenue
    for (let z = -70; z <= 70; z += 20) {
      if (Math.abs(z) > 15) {
        this.createLamp(-14, z);
        this.createLamp(14, z);
      }
    }

    // Guild Houses & Mansions
    this.createMansion(-45, -35, 0x1e293b, 0xb91c1c);
    this.createMansion(45, -35, 0x1e293b, 0x0369a1);
    this.createMansion(-45, 35, 0x1e293b, 0x047857);
    this.createMansion(45, 35, 0x1e293b, 0xd97706);

    // Trees
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const r = 40 + (i % 3) * 15;
      const tx = Math.cos(angle) * r;
      const tz = Math.sin(angle) * r;
      if (Math.abs(tx) > 16 || Math.abs(tz) > 16) {
        this.createTree(tx, tz);
      }
    }
  }

  createMansion(x, z, wallColor, roofColor) {
    const wallGeom = new THREE.BoxGeometry(22, 12, 20);
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 });
    const building = new THREE.Mesh(wallGeom, wallMat);
    building.position.set(x, 6, z);
    building.castShadow = true;
    this.group.add(building);

    const roofGeom = new THREE.ConeGeometry(18, 8, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.5 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.set(x, 16, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.group.add(roof);
  }

  createTree(x, z) {
    const trunkGeom = new THREE.CylinderGeometry(0.4, 0.6, 5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.set(x, 2.5, z);
    trunk.castShadow = true;
    this.group.add(trunk);

    const foliageGeom = new THREE.DodecahedronGeometry(2.4);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const foliage = new THREE.Mesh(foliageGeom, foliageMat);
    foliage.position.set(x, 5.8, z);
    foliage.castShadow = true;
    this.group.add(foliage);
  }

  createLamp(x, z) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    post.position.set(x, 2.5, z);
    this.group.add(post);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    bulb.position.set(x, 5.2, z);
    this.group.add(bulb);

    const light = new THREE.PointLight(0xf59e0b, 1.2, 15);
    light.position.set(x, 5.2, z);
    this.group.add(light);
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
