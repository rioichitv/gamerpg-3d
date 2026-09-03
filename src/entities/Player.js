import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';
import { audioManager } from '../core/AudioManager.js';

export class Player {
  constructor(game, name = 'Hero_Hunter', heroClass = 'warrior') {
    this.game = game;
    this.name = name;
    this.heroClass = heroClass;

    // Stats
    this.level = 1;
    this.exp = 0;
    this.maxExp = 100;
    this.maxHp = 1000;
    this.hp = 1000;
    this.maxMp = 500;
    this.mp = 500;
    this.gold = 2500;
    this.gems = 15;
    this.enchantLevel = 3;

    // Base Combat Stats
    this.baseAtk = this.heroClass === 'warrior' ? 140 : this.heroClass === 'sorceress' ? 160 : this.heroClass === 'archer' ? 150 : 130;
    this.baseDef = 60;
    this.critRate = 0.20; // 20%
    this.moveSpeed = 9.0;

    // Skills & Cooldowns (in seconds)
    this.cooldowns = {
      dodge: 0,
      skill1: 0,
      skill2: 0,
      skill3: 0,
      skill4: 0,
      ult: 0
    };
    this.maxCooldowns = {
      dodge: 1.8,
      skill1: 4.0,
      skill2: 7.0,
      skill3: 10.0,
      skill4: 12.0,
      ult: 25.0
    };

    // State: Open South Road Spawn (z: 45) — far from fountain, fully clear
    this.position = new THREE.Vector3(0, 0, 45);
    this.vy = 0;
    this.isGrounded = true;
    this.rotationY = Math.PI; // face north toward city
    this.isMoving = false;
    this.isInvincible = false;
    this.animState = 'idle';
    this.actionLockTimer = 0;

    // Combo system
    this.comboCount = 0;
    this.comboTimer = 0;
    this.attackStep = 0;

    // 3D Model
    this.mesh = CharacterModel.create(this.heroClass, this.enchantLevel);
    this.game.engine.scene.add(this.mesh);

    // 3D Nickname Tag Billboard above Character's Head
    this.createNameTag();

    // Setup skill names and icons in UI
    this.setupClassSkills();
  }

  createNameTag() {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    // Background pill badge
    ctx.fillStyle = 'rgba(10, 10, 18, 0.75)';
    ctx.beginPath();
    ctx.roundRect(16, 16, 352, 64, 32);
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Text: [Lv.1] Nickname
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`[Lv.${this.level}] ${this.name}`, 192, 58);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    this.nameTagSprite = new THREE.Sprite(spriteMat);
    this.nameTagSprite.position.set(0, 2.75, 0);
    this.nameTagSprite.scale.set(3.4, 0.85, 1);
    this.mesh.add(this.nameTagSprite);
  }

  get attackPower() {
    // Weapon enchant bonus: +18 atk per enchant level
    const enchantBonus = this.enchantLevel * 18;
    return this.baseAtk + enchantBonus;
  }

  setupClassSkills() {
    const skillData = {
      warrior: [
        { name: 'Cyclone Slash', icon: '🌪️', cost: 30 },
        { name: 'Rising Slash', icon: '⚔️', cost: 45 },
        { name: 'Moonlight Splitter', icon: '🌙', cost: 60 },
        { name: 'Iron Skin', icon: '🛡️', cost: 50 },
        { name: 'Infinity Edge', icon: '☄️', cost: 120 }
      ],
      sorceress: [
        { name: 'Fireball Burst', icon: '🔥', cost: 35 },
        { name: 'Ice Blizzard', icon: '❄️', cost: 50 },
        { name: 'Poison Cloud', icon: '🧪', cost: 60 },
        { name: 'Teleport Warp', icon: '✨', cost: 40 },
        { name: 'Black Hole Meteor', icon: '☄️', cost: 130 }
      ],
      archer: [
        { name: 'Twin Shot', icon: '🏹', cost: 25 },
        { name: 'Arrow Shower', icon: '🌧️', cost: 50 },
        { name: 'Piercing Comet', icon: '💫', cost: 65 },
        { name: 'Eagle Eye Buff', icon: '👁️', cost: 40 },
        { name: 'Spiral Vortex Rain', icon: '🌪️', cost: 120 }
      ],
      cleric: [
        { name: 'Holy Bolt', icon: '⚡', cost: 30 },
        { name: 'Divine Smite', icon: '🔨', cost: 55 },
        { name: 'Healing Aura', icon: '💚', cost: 70 },
        { name: 'Guardian Shield', icon: '🛡️', cost: 50 },
        { name: 'Heaven\'s Judgment', icon: '☀️', cost: 140 }
      ]
    };

    const skills = skillData[this.heroClass] || skillData.warrior;
    
    const setElText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setElText('name-skill-1', skills[0].name);
    setElText('icon-skill-1', skills[0].icon);
    setElText('m-btn-skill-1', skills[0].icon);

    setElText('name-skill-2', skills[1].name);
    setElText('icon-skill-2', skills[1].icon);
    setElText('m-btn-skill-2', skills[1].icon);

    setElText('name-skill-3', skills[2].name);
    setElText('icon-skill-3', skills[2].icon);
    setElText('m-btn-skill-3', skills[2].icon);

    setElText('name-skill-4', skills[3].name);
    setElText('icon-skill-4', skills[3].icon);
    setElText('m-btn-skill-4', skills[3].icon);

    setElText('name-skill-ult', skills[4].name);
    setElText('icon-skill-ult', skills[4].icon);
    setElText('m-btn-ult', skills[4].icon);
  }

  update(dt) {
    // 1. Update Cooldowns
    for (const key in this.cooldowns) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] -= dt;
        const pct = Math.max(0, (this.cooldowns[key] / this.maxCooldowns[key]) * 100);
        const cdOverlay = document.getElementById(`cd-${key}`);
        if (cdOverlay) cdOverlay.style.height = `${pct}%`;
      }
    }

    // 2. Combo expiration timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.game.ui.updateCombo(0);
      }
    }

    // 3. Natural HP & MP regeneration
    if (this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + 6 * dt);
    }
    if (this.mp < this.maxMp) {
      this.mp = Math.min(this.maxMp, this.mp + 15 * dt);
    }

    // 4. Handle Movement & Action Lock
    if (this.actionLockTimer > 0) {
      this.actionLockTimer -= dt;
      if (this.actionLockTimer <= 0) {
        this.animState = 'idle';
        this.isInvincible = false;
      }
    }

    const input = this.game.input;
    input.update();

    if (this.actionLockTimer <= 0) {
      // Process Actions
      if (input.consumeAction('jump') && this.isGrounded) {
        this.executeJump();
      } else if (input.consumeAction('dodge')) {
        this.executeDodge();
      } else if (input.consumeAction('attack')) {
        this.executeAttack();
      } else if (input.consumeAction('skill1')) {
        this.executeSkill(1);
      } else if (input.consumeAction('skill2')) {
        this.executeSkill(2);
      } else if (input.consumeAction('skill3')) {
        this.executeSkill(3);
      } else if (input.consumeAction('skill4')) {
        this.executeSkill(4);
      } else if (input.consumeAction('ult')) {
        this.executeSkill('ult');
      }
    }

    // 5. Jump Physics & Gravity
    if (!this.isGrounded) {
      this.vy -= 28.0 * dt; // gravity
      this.position.y += this.vy * dt;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.vy = 0;
        this.isGrounded = true;
        audioManager.playLand();
      }
    }

    // 6. Flawless Camera-Relative WASD Movement (W: Forward, S: Backward, D: Right, A: Left)
    if (this.actionLockTimer <= 0) {
      const camAngle = this.game.engine.cameraRotationAngle;
      
      // Camera Basis Vectors on XZ Plane
      const camForwardX = -Math.sin(camAngle);
      const camForwardZ = -Math.cos(camAngle);
      const camRightX = Math.cos(camAngle);
      const camRightZ = -Math.sin(camAngle);

      let forwardInput = 0;
      let rightInput = 0;

      if (input.joystickActive) {
        forwardInput = -input.moveVector.z; // up on screen is positive forward
        rightInput = input.moveVector.x;
      } else {
        if (input.keys['KeyW'] || input.keys['ArrowUp']) forwardInput += 1;
        if (input.keys['KeyS'] || input.keys['ArrowDown']) forwardInput -= 1;
        if (input.keys['KeyD'] || input.keys['ArrowRight']) rightInput += 1;
        if (input.keys['KeyA'] || input.keys['ArrowLeft']) rightInput -= 1;
      }

      let worldVx = camForwardX * forwardInput + camRightX * rightInput;
      let worldVz = camForwardZ * forwardInput + camRightZ * rightInput;
      const len = Math.hypot(worldVx, worldVz);

      if (len > 0.05) {
        worldVx /= len;
        worldVz /= len;

        const nextX = this.position.x + worldVx * this.moveSpeed * dt;
        const nextZ = this.position.z + worldVz * this.moveSpeed * dt;

        // Attempt direct movement; if blocked, try sliding along X or Z axis
        if (!this.checkObstacleCollision(nextX, nextZ)) {
          this.position.x = nextX;
          this.position.z = nextZ;
        } else {
          this.trySlideMovement(this.position.x, this.position.z, worldVx, worldVz, this.moveSpeed, dt);
        }

        // Instant & smooth rotation towards movement direction
        this.rotationY = Math.atan2(worldVx, worldVz);

        this.isMoving = true;
        if (this.animState === 'idle' && this.isGrounded) this.animState = 'run';
      } else {
        this.isMoving = false;
        if (this.actionLockTimer <= 0 && this.isGrounded) this.animState = 'idle';
      }
    }

    // Clamp position within grand city boundaries (-98 to 98)
    this.position.x = Math.max(-98, Math.min(98, this.position.x));
    this.position.z = Math.max(-98, Math.min(98, this.position.z));

    // Update 3D Mesh
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotationY;

    CharacterModel.updateAnimation(this.mesh, this.animState, dt, this.isMoving);

    // Sync to network
    this.syncNetwork();
  }

  executeJump() {
    this.vy = 11.5; // Jump strength
    this.isGrounded = false;
    audioManager.playJump();
  }

  checkObstacleCollision(x, z) {
    if (this.game.currentZone !== 'town') return false;

    // 1. Central Fountain platform — use generous radius so player cannot enter
    const distToFountain = Math.hypot(x, z);
    if (distToFountain < 13.5) return true;

    // 2. NPCs — tight radius
    const npcPositions = [
      { x: -14, z: -8 },
      { x: 14, z: -8 },
      { x: -14, z: 8 },
      { x: 14, z: 8 }
    ];
    for (const npc of npcPositions) {
      if (Math.hypot(x - npc.x, z - npc.z) < 1.8) return true;
    }

    // NOTE: Buildings removed from collision — too aggressive, caused sticking

    return false;
  }

  // Try to slide along wall instead of full stop
  trySlideMovement(curX, curZ, worldVx, worldVz, speed, dt) {
    const nx = curX + worldVx * speed * dt;
    const nz = curZ;
    if (!this.checkObstacleCollision(nx, nz)) {
      this.position.x = nx;
      return;
    }
    const nx2 = curX;
    const nz2 = curZ + worldVz * speed * dt;
    if (!this.checkObstacleCollision(nx2, nz2)) {
      this.position.z = nz2;
    }
  }

  executeAttack() {
    this.attackStep = (this.attackStep % 3) + 1;
    this.animState = `attack${this.attackStep}`;
    this.actionLockTimer = 0.28;

    audioManager.playSlash();
    this.game.engine.spawnSlashArc(this.position, this.rotationY, this.heroClass === 'sorceress' ? 0xc084fc : 0x38bdf8);

    // Check hit on enemies in front
    this.checkHitCone(3.8, Math.PI * 0.6, 1.0);
  }

  executeDodge() {
    if (this.cooldowns.dodge > 0) return;
    this.cooldowns.dodge = this.maxCooldowns.dodge;
    this.animState = 'dodge';
    this.actionLockTimer = 0.45;
    this.isInvincible = true;

    audioManager.playDodge();

    // Dash forward
    const dashDist = 4.5;
    this.position.x += Math.sin(this.rotationY) * dashDist;
    this.position.z += Math.cos(this.rotationY) * dashDist;
  }

  executeSkill(slot) {
    const cdKey = slot === 'ult' ? 'ult' : `skill${slot}`;
    if (this.cooldowns[cdKey] > 0) return;

    const manaCost = slot === 'ult' ? 120 : 35;
    if (this.mp < manaCost) {
      this.game.ui.addChatMessage('⚠️ Mana tidak cukup!', '#f87171');
      return;
    }

    this.mp -= manaCost;
    this.cooldowns[cdKey] = this.maxCooldowns[cdKey];
    this.animState = 'skill';
    this.actionLockTimer = 0.55;

    this.game.engine.triggerScreenShake(slot === 'ult' ? 0.7 : 0.35);

    if (slot === 'ult') {
      audioManager.playMagicCast('lightning');
      audioManager.playHitImpact(true);
      this.game.engine.spawnImpactParticles(this.position, 0xf59e0b, 40, 0.45);
      this.checkHitCone(9.0, Math.PI * 2, 4.0); // 360 degree giant wipe
      this.game.ui.addChatMessage(`💥 ${this.name} melepaskan ULTIMATE SKILL!`, '#fbbf24');
    } else if (slot === 1) {
      audioManager.playMagicCast('fire');
      this.game.spawnProjectile(this.position, this.rotationY, 'fire');
      this.checkHitCone(5.5, Math.PI * 0.8, 1.8);
    } else if (slot === 2) {
      audioManager.playMagicCast('ice');
      this.game.spawnProjectile(this.position, this.rotationY, 'ice');
      this.checkHitCone(6.0, Math.PI * 0.8, 2.2);
    } else if (slot === 3) {
      audioManager.playMagicCast('lightning');
      this.checkHitCone(6.5, Math.PI * 1.0, 2.5);
    } else if (slot === 4) {
      // Buff / Heal
      audioManager.playMagicCast('heal');
      this.hp = Math.min(this.maxHp, this.hp + 350);
      this.game.ui.spawnFloatingNumber(this.position, '+350 HP', 'heal');
      this.game.engine.spawnImpactParticles(this.position, 0x34d399, 25, 0.3);
    }
  }

  checkHitCone(radius, coneAngle, damageMultiplier = 1.0) {
    const enemies = this.game.enemies;
    let hitAny = false;

    // --- Hit AI enemies ---
    enemies.forEach(enemy => {
      if (enemy.isDead) return;
      const dx = enemy.position.x - this.position.x;
      const dz = enemy.position.z - this.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= radius) {
        const angleToEnemy = Math.atan2(dx, dz);
        let angleDiff = Math.abs(angleToEnemy - this.rotationY);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

        if (angleDiff <= coneAngle / 2) {
          hitAny = true;
          const isCrit = Math.random() < this.critRate;
          const rawDamage = Math.floor(this.attackPower * damageMultiplier * (isCrit ? 1.75 : 1.0) * (0.9 + Math.random() * 0.2));

          enemy.takeDamage(rawDamage, isCrit);
          audioManager.playHitImpact(isCrit);
          this.game.engine.spawnImpactParticles(enemy.position, isCrit ? 0xf59e0b : 0xffffff, 12);

          this.comboCount++;
          this.comboTimer = 3.5;
          this.game.ui.updateCombo(this.comboCount);

          this.game.network.broadcast({
            type: 'ENEMY_HIT',
            enemyId: enemy.id,
            damage: rawDamage,
            isCrit: isCrit
          });
        }
      }
    });

    // --- PvP: Hit real remote players when in arena ---
    if (this.game.currentZone === 'arena') {
      this.game.remotePlayers.forEach((remotePlayer, peerId) => {
        if (remotePlayer.isBot || remotePlayer.isDead) return;

        // Don't hit same-team players (team Blue vs Red)
        if (remotePlayer.pvpTeam && remotePlayer.pvpTeam === this.pvpTeam) return;

        const dx = remotePlayer.position.x - this.position.x;
        const dz = remotePlayer.position.z - this.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist <= radius) {
          const angleToTarget = Math.atan2(dx, dz);
          let angleDiff = Math.abs(angleToTarget - this.rotationY);
          while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

          if (angleDiff <= coneAngle / 2) {
            hitAny = true;
            const isCrit = Math.random() < this.critRate;
            const rawDamage = Math.floor(this.attackPower * damageMultiplier * (isCrit ? 1.75 : 1.0) * (0.9 + Math.random() * 0.2));

            // Show visual hit on remote player
            this.game.ui.spawnFloatingNumber(remotePlayer.position, `${isCrit ? '💥CRIT! ' : ''}${rawDamage}`, isCrit ? 'critical' : 'normal');
            this.game.engine.spawnImpactParticles(remotePlayer.position, isCrit ? 0xf59e0b : 0xff4444, 14);
            audioManager.playHitImpact(isCrit);

            this.comboCount++;
            this.comboTimer = 3.5;
            this.game.ui.updateCombo(this.comboCount);

            // Send PVP_DAMAGE to the targeted player over the network
            const targetConn = this.game.network.connections.get(peerId);
            if (targetConn && targetConn.open) {
              targetConn.send({
                type: 'PVP_DAMAGE',
                attackerId: this.game.network.myPeerId,
                attackerName: this.name,
                damage: rawDamage,
                isCrit: isCrit
              });
            }

            // Track PvP kill locally if remote HP reaches 0
            remotePlayer.pvpHp = (remotePlayer.pvpHp ?? remotePlayer.maxHp) - rawDamage;
            if (remotePlayer.pvpHp <= 0) {
              remotePlayer.pvpHp = remotePlayer.maxHp; // Reset for respawn
              this.game.triggerPvPKill(true);
              this.game.ui.addChatMessage(`⚔️ ${this.name} mengalahkan ${remotePlayer.name} dalam PvP!`, '#fbbf24');
            }
          }
        }
      });
    }

    if (hitAny) {
      this.game.engine.triggerScreenShake(0.15);
    }
  }

  takeDamage(amount) {
    if (this.isInvincible || this.hp <= 0) return;
    const reducedDamage = Math.max(10, Math.floor(amount * (100 / (100 + this.baseDef))));
    this.hp = Math.max(0, this.hp - reducedDamage);

    this.game.ui.spawnFloatingNumber(this.position, `-${reducedDamage}`, 'normal');
    audioManager.playHitImpact(false);
    this.game.engine.triggerScreenShake(0.4);

    if (this.hp <= 0) {
      this.game.ui.addChatMessage('💀 Anda telah gugur dalam pertempuran! Respawn...', '#ef4444');
      setTimeout(() => {
        this.hp = this.maxHp;
        this.position.set(0, 0, 25);
        this.rotationY = Math.PI;
      }, 2000);
    }
  }

  syncNetwork() {
    if (!this.game.network) return;
    this.game.network.broadcast({
      type: 'PLAYER_SYNC',
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
      rotY: this.rotationY,
      animState: this.animState,
      hp: this.hp,
      maxHp: this.maxHp,
      isMoving: this.isMoving
    });
  }
}
