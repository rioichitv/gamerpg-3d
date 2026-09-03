import * as THREE from 'three';

export class CharacterModel {
  static create(heroClass = 'warrior', enchantLevel = 0) {
    const group = new THREE.Group();

    // High quality PBR materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      roughness: 0.6,
      metalness: 0.05
    });

    let primaryColor, secondaryColor, accentColor, glowColor;

    if (heroClass === 'warrior') {
      primaryColor = 0x1e293b; // Dark knight steel
      secondaryColor = 0xd97706; // Gold filigree
      accentColor = 0xb91c1c; // Crimson cape
      glowColor = 0x38bdf8; // Blue enchant
    } else if (heroClass === 'sorceress') {
      primaryColor = 0x581c87; // Mystic purple
      secondaryColor = 0xc084fc; // Violet silk
      accentColor = 0xf43f5e; // Magenta ruby
      glowColor = 0xa855f7; // Purple arcana
    } else if (heroClass === 'archer') {
      primaryColor = 0x065f46; // Forest hunter green
      secondaryColor = 0xd97706; // Leather brass
      accentColor = 0x10b981; // Emerald feather
      glowColor = 0x34d399; // Nature glow
    } else if (heroClass === 'cleric') {
      primaryColor = 0xf8fafc; // Silver paladin white
      secondaryColor = 0xf59e0b; // Holy gold
      accentColor = 0x0284c7; // Sapphire tabard
      glowColor = 0xfbbf24; // Divine sunlight
    }

    const armorMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      metalness: 0.85,
      roughness: 0.25
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      metalness: 0.9,
      roughness: 0.2
    });
    const clothMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.7
    });
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.8
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 1. TORSO & CHESTPLATE (Articulated V-Shape)
    const chestGeom = new THREE.CylinderGeometry(0.38, 0.28, 0.75, 8);
    const chest = new THREE.Mesh(chestGeom, armorMat);
    chest.position.y = 1.35;
    chest.castShadow = true;
    group.add(chest);

    // Gold filigree breastplate emblem
    const emblemGeom = new THREE.BoxGeometry(0.24, 0.24, 0.42);
    const emblem = new THREE.Mesh(emblemGeom, goldTrimMat);
    emblem.position.set(0, 1.45, 0.05);
    group.add(emblem);

    // Belt & Faulds / Tassets (Waist Armor)
    const beltGeom = new THREE.CylinderGeometry(0.32, 0.35, 0.2, 8);
    const belt = new THREE.Mesh(beltGeom, leatherMat);
    belt.position.y = 0.95;
    group.add(belt);

    // Cape / Robe Back
    const capeGeom = new THREE.PlaneGeometry(0.65, 1.2, 4, 4);
    const cape = new THREE.Mesh(capeGeom, clothMat);
    cape.position.set(0, 1.2, -0.22);
    cape.rotation.x = 0.1;
    cape.castShadow = true;
    group.add(cape);

    // 2. HEAD, HELMET / HOOD & FACE
    const headGeom = new THREE.SphereGeometry(0.22, 12, 12);
    const head = new THREE.Mesh(headGeom, skinMat);
    head.position.set(0, 1.95, 0);
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), eyeMat);
    eyeL.position.set(-0.08, 1.98, 0.2);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), eyeMat);
    eyeR.position.set(0.08, 1.98, 0.2);
    group.add(eyeL, eyeR);

    // Class specific Headgear
    if (heroClass === 'warrior') {
      // Knight Winged Circlet/Visor
      const helmetGeom = new THREE.BoxGeometry(0.48, 0.28, 0.48);
      const helm = new THREE.Mesh(helmetGeom, armorMat);
      helm.position.set(0, 2.05, 0);
      group.add(helm);

      const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 4), goldTrimMat);
      wingL.position.set(-0.26, 2.15, -0.05);
      wingL.rotation.z = -0.6;
      const wingR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 4), goldTrimMat);
      wingR.position.set(0.26, 2.15, -0.05);
      wingR.rotation.z = 0.6;
      group.add(wingL, wingR);

    } else if (heroClass === 'sorceress') {
      // Sorceress Archmage Crown & Flowing Hair
      const hatGeom = new THREE.ConeGeometry(0.4, 0.85, 8);
      const hat = new THREE.Mesh(hatGeom, clothMat);
      hat.position.set(0, 2.4, -0.1);
      hat.rotation.x = -0.2;
      group.add(hat);

      const hairGeom = new THREE.CylinderGeometry(0.24, 0.35, 0.8, 8);
      const hairMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.5 });
      const hair = new THREE.Mesh(hairGeom, hairMat);
      hair.position.set(0, 1.8, -0.1);
      group.add(hair);

    } else if (heroClass === 'archer') {
      // Ranger Hunter Feather Beret
      const capGeom = new THREE.CylinderGeometry(0.28, 0.24, 0.15, 8);
      const cap = new THREE.Mesh(capGeom, clothMat);
      cap.position.set(0, 2.12, 0);
      group.add(cap);

      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 4), goldTrimMat);
      feather.position.set(-0.2, 2.3, 0);
      feather.rotation.z = -0.4;
      group.add(feather);

    } else if (heroClass === 'cleric') {
      // Holy Paladin Halo Circlet
      const haloGeom = new THREE.TorusGeometry(0.3, 0.03, 8, 24);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      const halo = new THREE.Mesh(haloGeom, haloMat);
      halo.position.set(0, 2.3, 0);
      halo.rotation.x = Math.PI / 2;
      group.add(halo);
    }

    // 3. PAULDRONS (Shoulder Guards)
    const pauldronGeom = new THREE.BoxGeometry(0.28, 0.24, 0.34);
    const leftPauldron = new THREE.Mesh(pauldronGeom, goldTrimMat);
    leftPauldron.position.set(-0.48, 1.6, 0);
    leftPauldron.castShadow = true;
    group.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(pauldronGeom, goldTrimMat);
    rightPauldron.position.set(0.48, 1.6, 0);
    rightPauldron.castShadow = true;
    group.add(rightPauldron);

    // 4. ARMS & GAUNTLETS
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.45, 1.5, 0);
    const upperArmGeom = new THREE.CylinderGeometry(0.1, 0.09, 0.4, 8);
    const leftUpperArm = new THREE.Mesh(upperArmGeom, armorMat);
    leftUpperArm.position.y = -0.2;
    leftUpperArm.castShadow = true;
    leftArmGroup.add(leftUpperArm);

    const gauntletGeom = new THREE.BoxGeometry(0.18, 0.35, 0.18);
    const leftGauntlet = new THREE.Mesh(gauntletGeom, goldTrimMat);
    leftGauntlet.position.y = -0.48;
    leftArmGroup.add(leftGauntlet);
    group.add(leftArmGroup);

    // Right Arm (Weapon Arm)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.45, 1.5, 0);
    const rightUpperArm = new THREE.Mesh(upperArmGeom, armorMat);
    rightUpperArm.position.y = -0.2;
    rightUpperArm.castShadow = true;
    rightArmGroup.add(rightUpperArm);

    const rightGauntlet = new THREE.Mesh(gauntletGeom, goldTrimMat);
    rightGauntlet.position.y = -0.48;
    rightArmGroup.add(rightGauntlet);
    group.add(rightArmGroup);

    // 5. LEGS & GREAVES (Boots)
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.2, 0.85, 0);
    const thighGeom = new THREE.CylinderGeometry(0.13, 0.11, 0.45, 8);
    const leftThigh = new THREE.Mesh(thighGeom, armorMat);
    leftThigh.position.y = -0.2;
    leftThigh.castShadow = true;
    leftLegGroup.add(leftThigh);

    const bootGeom = new THREE.BoxGeometry(0.22, 0.45, 0.28);
    const leftBoot = new THREE.Mesh(bootGeom, goldTrimMat);
    leftBoot.position.set(0, -0.55, 0.04);
    leftBoot.castShadow = true;
    leftLegGroup.add(leftBoot);
    group.add(leftLegGroup);

    // Right Leg
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.2, 0.85, 0);
    const rightThigh = new THREE.Mesh(thighGeom, armorMat);
    rightThigh.position.y = -0.2;
    rightThigh.castShadow = true;
    rightLegGroup.add(rightThigh);

    const rightBoot = new THREE.Mesh(bootGeom, goldTrimMat);
    rightBoot.position.set(0, -0.55, 0.04);
    rightBoot.castShadow = true;
    rightLegGroup.add(rightBoot);
    group.add(rightLegGroup);

    // 6. WEAPON ATTACHMENT WITH RUNES & PARTICLES
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(0, -0.55, 0.15);

    if (heroClass === 'warrior') {
      // Dragon Slayer Excalibur Greatsword
      const bladeGeom = new THREE.BoxGeometry(0.16, 1.8, 0.04);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0.95,
        roughness: 0.1,
        emissive: enchantLevel > 0 ? 0x0284c7 : 0x000000,
        emissiveIntensity: 0.4 + enchantLevel * 0.25
      });
      const blade = new THREE.Mesh(bladeGeom, bladeMat);
      blade.position.y = 0.85;
      blade.castShadow = true;
      weaponGroup.add(blade);

      const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.14), goldTrimMat);
      crossguard.position.y = 0.0;
      weaponGroup.add(crossguard);

      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), goldTrimMat);
      pommel.position.y = -0.3;
      weaponGroup.add(pommel);

      weaponGroup.rotation.x = Math.PI / 4;

    } else if (heroClass === 'sorceress') {
      // Archon Starlight Crystal Staff
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 8), goldTrimMat);
      shaft.position.y = 0.65;
      weaponGroup.add(shaft);

      const orbGeom = new THREE.OctahedronGeometry(0.2, 0);
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0x9333ea,
        emissiveIntensity: 2.5,
        roughness: 0.1
      });
      const orb = new THREE.Mesh(orbGeom, orbMat);
      orb.position.y = 1.6;
      weaponGroup.add(orb);

    } else if (heroClass === 'archer') {
      // Celestial Dragon Composite Bow
      const bowGeom = new THREE.TorusGeometry(0.7, 0.035, 8, 24, Math.PI * 0.9);
      const bow = new THREE.Mesh(bowGeom, goldTrimMat);
      bow.position.set(0, 0.45, 0);
      bow.rotation.z = Math.PI / 2;
      weaponGroup.add(bow);

    } else if (heroClass === 'cleric') {
      // Holy War Mace & Aegis Shield
      const maceShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), goldTrimMat);
      maceShaft.position.y = 0.4;
      weaponGroup.add(maceShaft);

      const maceHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), goldTrimMat);
      maceHead.position.y = 0.95;
      weaponGroup.add(maceHead);

      // Aegis Cross Shield in Left Hand
      const shieldGeom = new THREE.BoxGeometry(0.55, 0.75, 0.08);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.5
      });
      const shield = new THREE.Mesh(shieldGeom, shieldMat);
      shield.position.set(-0.25, -0.3, 0.3);
      leftArmGroup.add(shield);
    }

    rightArmGroup.add(weaponGroup);

    group.userData = {
      chest,
      head,
      leftArmGroup,
      rightArmGroup,
      leftLegGroup,
      rightLegGroup,
      weaponGroup,
      cape,
      heroClass,
      animTime: 0,
      animState: 'idle'
    };

    return group;
  }

  static updateAnimation(group, state = 'idle', dt = 0.016, isMoving = false) {
    if (!group || !group.userData) return;
    const ud = group.userData;
    ud.animTime += dt;
    const t = ud.animTime;

    const { leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup, chest, head, cape } = ud;

    if (state === 'attack1' || state === 'attack2' || state === 'attack3') {
      const slashProgress = Math.sin(t * 22);
      rightArmGroup.rotation.x = -Math.PI * 0.45 - slashProgress * 1.6;
      rightArmGroup.rotation.y = slashProgress * 0.9;
      chest.rotation.y = -slashProgress * 0.5;
      return;
    }

    if (state === 'skill') {
      rightArmGroup.rotation.x = -Math.PI * 0.85;
      leftArmGroup.rotation.x = -Math.PI * 0.65;
      chest.rotation.x = 0.2;
      return;
    }

    if (state === 'dodge') {
      group.rotation.y += dt * 25;
      rightArmGroup.rotation.x = -Math.PI * 0.5;
      leftArmGroup.rotation.x = -Math.PI * 0.5;
      return;
    }

    if (isMoving) {
      const walkSpeed = 12;
      const legAngle = Math.sin(t * walkSpeed) * 0.75;
      const armAngle = Math.sin(t * walkSpeed) * 0.6;

      leftLegGroup.rotation.x = legAngle;
      rightLegGroup.rotation.x = -legAngle;

      leftArmGroup.rotation.x = -armAngle;
      rightArmGroup.rotation.x = armAngle * 0.5;

      chest.position.y = 1.35 + Math.abs(Math.sin(t * walkSpeed * 2)) * 0.06;
      head.position.y = 1.95 + Math.abs(Math.sin(t * walkSpeed * 2)) * 0.06;

      if (cape) {
        cape.rotation.x = 0.35 + Math.sin(t * walkSpeed) * 0.15;
      }
    } else {
      const breath = Math.sin(t * 3) * 0.03;
      chest.position.y = 1.35 + breath;
      head.position.y = 1.95 + breath * 1.2;

      leftLegGroup.rotation.x = 0;
      rightLegGroup.rotation.x = 0;

      leftArmGroup.rotation.x = Math.sin(t * 2) * 0.08;
      leftArmGroup.rotation.z = 0.08;

      rightArmGroup.rotation.x = -0.2 + Math.sin(t * 2) * 0.06;
      rightArmGroup.rotation.z = -0.08;
      chest.rotation.y = 0;
      chest.rotation.x = 0;

      if (cape) {
        cape.rotation.x = 0.1 + Math.sin(t * 2) * 0.04;
      }
    }
  }
}
