import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';
import { audioManager } from '../core/AudioManager.js';

export class RemotePlayer {
  constructor(game, id, name, heroClass = 'warrior', isBot = false) {
    this.game = game;
    this.id = id;
    this.name = name;
    this.heroClass = heroClass;
    this.isBot = isBot;

    this.hp = 1000;
    this.maxHp = 1000;
    this.position = new THREE.Vector3(0, 0, 0);
    this.rotationY = 0;
    this.animState = 'idle';
    this.isMoving = false;

    // AI Bot state
    this.botTarget = null;
    this.botAttackCooldown = 0;
    this.botSkillCooldown = 0;

    // 3D Mesh
    this.mesh = CharacterModel.create(this.heroClass, 3);
    this.game.engine.scene.add(this.mesh);

    // Floating Name Tag above head
    this.createNameTag();
  }

  createNameTag() {
    // 3D Billboard text or marker
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.isBot ? '#c084fc' : '#38bdf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 2.7, 0);
    sprite.scale.set(3, 0.75, 1);
    this.mesh.add(sprite);
  }

  updateSync(data) {
    if (this.isBot) return;
    this.position.set(data.x, data.y, data.z);
    this.rotationY = data.rotY;
    this.animState = data.animState;
    this.isMoving = data.isMoving;
    this.hp = data.hp;
    this.maxHp = data.maxHp;
  }

  update(dt) {
    if (this.isBot) {
      this.updateBotAI(dt);
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotationY;

    CharacterModel.updateAnimation(this.mesh, this.animState, dt, this.isMoving);
  }

  updateBotAI(dt) {
    const player = this.game.player;
    if (!player) return;

    if (this.botAttackCooldown > 0) this.botAttackCooldown -= dt;
    if (this.botSkillCooldown > 0) this.botSkillCooldown -= dt;

    // 1. Find closest active enemy
    let closestEnemy = null;
    let minDist = 25;

    this.game.enemies.forEach(enemy => {
      if (!enemy.isDead) {
        const d = this.position.distanceTo(enemy.position);
        if (d < minDist) {
          minDist = d;
          closestEnemy = enemy;
        }
      }
    });

    if (closestEnemy) {
      // Move towards enemy and attack
      const dx = closestEnemy.position.x - this.position.x;
      const dz = closestEnemy.position.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      this.rotationY = Math.atan2(dx, dz);

      const targetRange = this.heroClass === 'sorceress' || this.heroClass === 'archer' ? 7.0 : 3.0;

      if (dist > targetRange) {
        this.position.x += Math.sin(this.rotationY) * 7.5 * dt;
        this.position.z += Math.cos(this.rotationY) * 7.5 * dt;
        this.isMoving = true;
        this.animState = 'run';
      } else {
        this.isMoving = false;
        // Attack logic
        if (this.botAttackCooldown <= 0) {
          this.botAttackCooldown = 1.2;
          this.animState = 'attack1';

          const rawDmg = Math.floor(120 + Math.random() * 50);
          closestEnemy.takeDamage(rawDmg, false);
          audioManager.playHitImpact(false);
          this.game.engine.spawnImpactParticles(closestEnemy.position, 0xa855f7, 8);
        }
      }
    } else {
      // Follow main player
      const distToPlayer = this.position.distanceTo(player.position);
      if (distToPlayer > 4.5) {
        const dx = player.position.x - this.position.x;
        const dz = player.position.z - this.position.z;
        this.rotationY = Math.atan2(dx, dz);
        this.position.x += Math.sin(this.rotationY) * 8.0 * dt;
        this.position.z += Math.cos(this.rotationY) * 8.0 * dt;
        this.isMoving = true;
        this.animState = 'run';
      } else {
        this.isMoving = false;
        this.animState = 'idle';
      }
    }
  }

  destroy() {
    this.game.engine.scene.remove(this.mesh);
  }
}
