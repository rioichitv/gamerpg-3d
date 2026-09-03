import * as THREE from 'three';
import { audioManager } from '../core/AudioManager.js';

export class Enemy {
  constructor(game, type = 'goblin', position = new THREE.Vector3(0, 0, -15), id = null) {
    this.game = game;
    this.type = type;
    this.id = id || `enemy_${Math.random().toString(36).substr(2, 9)}`;

    this.position = position.clone();
    this.rotationY = 0;
    this.isDead = false;

    // Stats & Attributes based on Type
    this.setupStats();

    // AI State
    this.state = 'idle'; // 'idle', 'chase', 'telegraph', 'attack', 'dead'
    this.attackCooldown = 0;
    this.telegraphTimer = 0;
    this.target = null;

    // 3D Model
    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    this.game.engine.scene.add(this.mesh);

    // Floating HP bar for Elite & Boss
    if (this.isBoss) {
      this.game.ui.showBossBar(this.name, this.hp, this.maxHp);
    }
  }

  setupStats() {
    if (this.type === 'goblin') {
      this.name = 'Goblin Raider';
      this.maxHp = 450;
      this.hp = 450;
      this.atk = 45;
      this.moveSpeed = 6.0;
      this.attackRange = 2.4;
      this.expReward = 35;
      this.goldReward = 80;
      this.isBoss = false;
    } else if (this.type === 'skeleton') {
      this.name = 'Skeleton Marksman';
      this.maxHp = 380;
      this.hp = 380;
      this.atk = 60;
      this.moveSpeed = 4.5;
      this.attackRange = 12.0;
      this.expReward = 45;
      this.goldReward = 110;
      this.isBoss = false;
    } else if (this.type === 'golem') {
      this.name = 'Abyssal Stone Golem';
      this.maxHp = 2200;
      this.hp = 2200;
      this.atk = 120;
      this.moveSpeed = 3.5;
      this.attackRange = 4.5;
      this.expReward = 180;
      this.goldReward = 450;
      this.isBoss = false;
    } else if (this.type === 'boss_dragon') {
      this.name = 'The Crimson Nest Dragon';
      this.maxHp = 8500;
      this.hp = 8500;
      this.atk = 190;
      this.moveSpeed = 4.0;
      this.attackRange = 6.5;
      this.expReward = 1000;
      this.goldReward = 2000;
      this.isBoss = true;
    }
  }

  createMesh() {
    const group = new THREE.Group();

    if (this.type === 'goblin') {
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
      const clothMat = new THREE.MeshStandardMaterial({ color: 0x78350f });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), clothMat);
      body.position.y = 0.8;
      body.castShadow = true;
      group.add(body);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
      head.position.y = 1.45;
      head.castShadow = true;
      group.add(head);

      // Red glowing eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), eyeMat);
      eyeL.position.set(-0.15, 1.5, 0.26);
      const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), eyeMat);
      eyeR.position.set(0.15, 1.5, 0.26);
      group.add(eyeL, eyeR);

    } else if (this.type === 'skeleton') {
      const boneMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 6), boneMat);
      body.position.y = 1.0;
      body.castShadow = true;
      group.add(body);

      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), boneMat);
      skull.position.y = 1.7;
      skull.castShadow = true;
      group.add(skull);

    } else if (this.type === 'golem') {
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.2 });
      const lavaMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.8 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 1.4), rockMat);
      torso.position.y = 2.2;
      torso.castShadow = true;
      group.add(torso);

      const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), lavaMat);
      core.position.set(0, 2.2, 0.6);
      group.add(core);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.8), rockMat);
      head.position.y = 3.6;
      group.add(head);

    } else if (this.type === 'boss_dragon') {
      // THE CRIMSON DRAGON (High-detail procedural Boss)
      const scaleMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4, metalness: 0.3 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.7 });
      const fireMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xef4444, emissiveIntensity: 1.5 });

      // Body / Torso
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 5.0), scaleMat);
      body.position.y = 3.2;
      body.castShadow = true;
      group.add(body);

      // Neck & Head
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 2.8, 8), scaleMat);
      neck.position.set(0, 4.8, 2.4);
      neck.rotation.x = Math.PI / 4;
      group.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.6), scaleMat);
      head.position.set(0, 6.0, 3.6);
      head.castShadow = true;
      group.add(head);

      // Horns
      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 6), hornMat);
      hornL.position.set(-0.8, 7.0, 3.0);
      hornL.rotation.x = -Math.PI / 4;
      hornL.rotation.z = -0.3;
      const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 6), hornMat);
      hornR.position.set(0.8, 7.0, 3.0);
      hornR.rotation.x = -Math.PI / 4;
      hornR.rotation.z = 0.3;
      group.add(hornL, hornR);

      // Fiery Eyes
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), fireMat);
      eyeL.position.set(-0.6, 6.2, 4.7);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), fireMat);
      eyeR.position.set(0.6, 6.2, 4.7);
      group.add(eyeL, eyeR);

      // Giant Wings
      const wingGeom = new THREE.BoxGeometry(5.5, 0.1, 3.5);
      const wingL = new THREE.Mesh(wingGeom, scaleMat);
      wingL.position.set(-3.5, 4.8, 0.5);
      wingL.rotation.z = 0.3;
      wingL.rotation.y = -0.2;
      const wingR = new THREE.Mesh(wingGeom, scaleMat);
      wingR.position.set(3.5, 4.8, 0.5);
      wingR.rotation.z = -0.3;
      wingR.rotation.y = 0.2;
      group.add(wingL, wingR);

      // Tail
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, 4.5, 8), scaleMat);
      tail.position.set(0, 2.5, -3.8);
      tail.rotation.x = -Math.PI / 3;
      group.add(tail);
    }

    return group;
  }

  takeDamage(amount, isCrit = false) {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);

    this.game.ui.spawnFloatingNumber(this.position, `${isCrit ? 'CRIT! ' : ''}${amount}`, isCrit ? 'critical' : 'normal');

    if (this.isBoss) {
      this.game.ui.updateBossBar(this.hp, this.maxHp);
    }

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.state = 'dead';

    // Particle burst on death
    this.game.engine.spawnImpactParticles(this.position, this.isBoss ? 0xef4444 : 0x10b981, this.isBoss ? 50 : 20, 0.4);

    // Reward player
    const player = this.game.player;
    if (player) {
      player.exp += this.expReward;
      player.gold += this.goldReward;
      this.game.ui.addChatMessage(`✨ Mengalahkan ${this.name}! +${this.goldReward} Gold & +${this.expReward} EXP`, '#fbbf24');
    }

    // Death fade & remove
    setTimeout(() => {
      this.game.engine.scene.remove(this.mesh);
      this.game.removeEnemy(this.id);

      if (this.isBoss) {
        this.game.triggerDungeonVictory();
      } else if (this.game.currentZone === 'arena') {
        this.game.triggerPvPKill(true);
      }
    }, 400);
  }

  update(dt) {
    if (this.isDead) return;
    const player = this.game.player;
    if (!player) return;

    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);

    this.rotationY = Math.atan2(dx, dz);
    this.mesh.rotation.y = this.rotationY;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (this.state === 'telegraph') {
      this.telegraphTimer -= dt;
      if (this.telegraphTimer <= 0) {
        // Unleash telegraph AoE attack!
        this.state = 'attack';
        this.attackCooldown = 3.0;

        if (this.isBoss) {
          audioManager.playBossRoar();
          this.game.engine.spawnImpactParticles(this.position, 0xef4444, 45, 0.5);
          // Check if player in circle
          if (dist < 8.0) {
            player.takeDamage(this.atk * 1.8);
          }
        } else {
          // Golem slam
          audioManager.playHitImpact(true);
          if (dist < 5.0) {
            player.takeDamage(this.atk * 1.4);
          }
        }
        this.state = 'idle';
      }
      return;
    }

    // Boss Telegraph Chance
    if (this.isBoss && this.attackCooldown <= 0 && dist < 16.0) {
      if (Math.random() < 0.35) {
        this.state = 'telegraph';
        this.telegraphTimer = 1.4;
        this.game.engine.spawnTelegraphCircle(player.position, 7.5, 1.4, 0xef4444);
        audioManager.playBossRoar();
        this.game.ui.addChatMessage('⚠️ BOS NAGA MEMPERSIAPKAN SERANGAN API MEMATIKAN! HINDARI LINGKARAN MERAH!', '#f87171');
        return;
      }
    }

    // Chase & Normal Attack logic
    if (dist > this.attackRange) {
      this.position.x += Math.sin(this.rotationY) * this.moveSpeed * dt;
      this.position.z += Math.cos(this.rotationY) * this.moveSpeed * dt;
    } else {
      // Melee attack range
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.isBoss ? 1.8 : 1.2;
        player.takeDamage(this.atk);
      }
    }

    this.mesh.position.copy(this.position);
  }
}
