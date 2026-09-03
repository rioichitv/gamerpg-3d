import * as THREE from 'three';
import { audioManager } from '../core/AudioManager.js';

export class Projectile {
  constructor(game, startPos, rotationY, type = 'fire') {
    this.game = game;
    this.type = type;
    this.position = startPos.clone();
    this.position.y += 1.2;
    this.rotationY = rotationY;
    
    this.speed = type === 'ice' ? 18 : 24;
    this.life = 2.0;
    this.isDead = false;

    // 3D Mesh
    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotationY;
    this.game.engine.scene.add(this.mesh);
  }

  createMesh() {
    const group = new THREE.Group();

    if (this.type === 'fire') {
      const coreGeom = new THREE.SphereGeometry(0.35, 8, 8);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xef4444,
        emissiveIntensity: 2.0
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      group.add(core);

      // Point light attached
      const light = new THREE.PointLight(0xf97316, 2, 8);
      group.add(light);
    } else if (this.type === 'ice') {
      const spikeGeom = new THREE.ConeGeometry(0.2, 1.2, 6);
      const spikeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9
      });
      const spike = new THREE.Mesh(spikeGeom, spikeMat);
      spike.rotation.x = Math.PI / 2;
      group.add(spike);
    } else {
      // Arrow
      const arrowGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
      const arrowMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
      const arrow = new THREE.Mesh(arrowGeom, arrowMat);
      arrow.rotation.x = Math.PI / 2;
      group.add(arrow);
    }

    return group;
  }

  update(dt) {
    if (this.isDead) return;

    this.life -= dt;
    this.position.x += Math.sin(this.rotationY) * this.speed * dt;
    this.position.z += Math.cos(this.rotationY) * this.speed * dt;
    this.mesh.position.copy(this.position);

    // Hit detection against enemies
    const enemies = this.game.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.isDead && this.position.distanceTo(enemy.position) < 2.2) {
        // Explode
        this.explode(enemy);
        break;
      }
    }

    if (this.life <= 0 && !this.isDead) {
      this.destroy();
    }
  }

  explode(hitEnemy) {
    this.isDead = true;
    const player = this.game.player;
    const baseDmg = player ? player.attackPower * 1.5 : 180;
    const isCrit = Math.random() < 0.25;
    const damage = Math.floor(baseDmg * (isCrit ? 1.8 : 1.0));

    hitEnemy.takeDamage(damage, isCrit);
    audioManager.playHitImpact(isCrit);

    this.game.engine.spawnImpactParticles(
      this.position,
      this.type === 'fire' ? 0xf59e0b : 0x38bdf8,
      20,
      0.35
    );

    this.destroy();
  }

  destroy() {
    this.isDead = true;
    this.game.engine.scene.remove(this.mesh);
    this.game.removeProjectile(this);
  }
}
