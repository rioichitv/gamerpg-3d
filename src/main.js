import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { InputManager } from './core/InputManager.js';
import { audioManager } from './core/AudioManager.js';
import { NetworkManager } from './core/NetworkManager.js';
import { VoiceManager } from './core/VoiceManager.js';
import { UIManager } from './ui/UIManager.js';
import { Player } from './entities/Player.js';
import { RemotePlayer } from './entities/RemotePlayer.js';
import { Enemy } from './entities/Enemy.js';
import { Projectile } from './entities/Projectile.js';
import { TownMap } from './world/TownMap.js';
import { DungeonMap } from './world/DungeonMap.js';
import { ArenaMap } from './world/ArenaMap.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.engine = new Engine(this.canvas);
    this.input = new InputManager(this.engine);
    this.network = new NetworkManager(this);
    this.voice = new VoiceManager(this);
    this.ui = new UIManager(this);

    // Flow State
    this.authMode = 'login'; // 'login' or 'register'
    this.currentAccount = null;
    this.selectedServer = 'SEA-1';
    this.selectedClass = 'warrior';

    // Game State
    this.currentZone = 'town';
    this.worldMap = null;
    this.player = null;
    this.remotePlayers = new Map();
    this.enemies = [];
    this.projectiles = [];
    
    // Dungeon State
    this.dungeonWave = 1;
    this.lastTime = performance.now();

    this.initAuthFlow();
  }

  initAuthFlow() {
    // 1. SCREEN 1: LOGIN & REGISTER LOGIC
    const screenAuth = document.getElementById('screen-auth');
    const screenServer = document.getElementById('screen-server');
    const screenChar = document.getElementById('screen-character');
    const hud = document.getElementById('game-hud');

    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const authBtn = document.getElementById('btn-auth-submit');
    const authUser = document.getElementById('auth-username');
    const authPass = document.getElementById('auth-password');
    const authMsg = document.getElementById('auth-msg');

    tabLogin.addEventListener('click', () => {
      this.authMode = 'login';
      tabLogin.style.borderColor = '#f59e0b';
      tabLogin.style.background = 'rgba(245, 158, 11, 0.2)';
      tabLogin.style.color = '#fde68a';
      tabRegister.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      tabRegister.style.background = 'rgba(255, 255, 255, 0.06)';
      tabRegister.style.color = '#d1d5db';
      authBtn.textContent = 'Masuk ke Server';
      authMsg.textContent = '';
    });

    tabRegister.addEventListener('click', () => {
      this.authMode = 'register';
      tabRegister.style.borderColor = '#f59e0b';
      tabRegister.style.background = 'rgba(245, 158, 11, 0.2)';
      tabRegister.style.color = '#fde68a';
      tabLogin.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      tabLogin.style.background = 'rgba(255, 255, 255, 0.06)';
      tabLogin.style.color = '#d1d5db';
      authBtn.textContent = 'Daftar Akun Baru';
      authMsg.textContent = '';
    });

    authBtn.addEventListener('click', () => {
      const username = authUser.value.trim();
      const password = authPass.value.trim();

      if (!username || !password) {
        authMsg.textContent = '⚠️ Mohon isi Username dan Password!';
        authMsg.style.color = '#f87171';
        return;
      }

      // Initialize Audio
      audioManager.init();

      // Simple localStorage accounts storage
      let accounts = JSON.parse(localStorage.getItem('aetheria_accounts') || '{}');

      if (this.authMode === 'register') {
        if (accounts[username]) {
          authMsg.textContent = '⚠️ Username sudah terdaftar! Silakan Login.';
          authMsg.style.color = '#f87171';
          return;
        }
        accounts[username] = { password, lastClass: 'warrior' };
        localStorage.setItem('aetheria_accounts', JSON.stringify(accounts));
        authMsg.textContent = '✅ Akun berhasil didaftarkan! Mengalihkan...';
        authMsg.style.color = '#34d399';
      } else {
        // Login
        if (!accounts[username] || accounts[username].password !== password) {
          // Allow default admin / quick play
          if (username !== 'Hero_Hunter' && (!accounts[username] || accounts[username].password !== password)) {
            authMsg.textContent = '⚠️ Username atau Password salah!';
            authMsg.style.color = '#f87171';
            return;
          }
        }
        authMsg.textContent = '✅ Login berhasil! Membuka Server Realm...';
        authMsg.style.color = '#34d399';
      }

      this.currentAccount = username;

      // Transition to Screen 2: Server Selection
      setTimeout(() => {
        screenAuth.classList.add('hidden');
        screenServer.classList.remove('hidden');
      }, 400);
    });

    // 2. SCREEN 2: SERVER SELECTION LOGIC
    const serverItems = document.querySelectorAll('.server-item');
    serverItems.forEach(item => {
      item.addEventListener('click', () => {
        serverItems.forEach(s => s.classList.remove('active'));
        item.classList.add('active');
        this.selectedServer = item.dataset.server;
      });
    });

    const btnServerConnect = document.getElementById('btn-server-connect');
    btnServerConnect.addEventListener('click', () => {
      // Transition to Screen 3: Character Selection
      screenServer.classList.add('hidden');
      screenChar.classList.remove('hidden');
    });

    // 3. SCREEN 3: CHARACTER SELECTION LOGIC
    const classButtons = document.querySelectorAll('.class-card-btn');
    const classTitle = document.getElementById('class-preview-title');
    const classDesc = document.getElementById('class-preview-desc');

    const classDescriptions = {
      warrior: {
        title: '⚔️ Warrior (Swordmaster)',
        desc: 'Ahli pertempuran jarak dekat bertempo tinggi. Menguasai kombo tebasan Cyclone Slash, Rising Slash, dan jurus pamungkas pedang cahaya Infinity Edge.'
      },
      sorceress: {
        title: '🔮 Sorceress (Elementalist)',
        desc: 'Penyihir elemen dahsyat. Membakar musuh dengan Fireball Burst, membekukan area dengan Ice Blizzard, dan memanggil komet Black Hole Meteor.'
      },
      archer: {
        title: '🏹 Archer (Bowmaster)',
        desc: 'Pemanah lincah berdaya jangkau luas. Mampu menembakkan panah ganda, hujan panah Arrow Shower, dan badai panah Spiral Vortex Rain.'
      },
      cleric: {
        title: '🛡️ Cleric (Paladin)',
        desc: 'Ksatria suci dengan tameng pelindung tebal. Menghantam musuh dengan Holy Smite, memulihkan HP rekan tim, dan memanggil Heaven\'s Judgment.'
      }
    };

    classButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        classButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedClass = btn.dataset.class;

        const info = classDescriptions[this.selectedClass];
        if (info) {
          classTitle.textContent = info.title;
          classDesc.textContent = info.desc;
        }
      });
    });

    // Enter World Button
    const btnEnterWorld = document.getElementById('btn-enter-world');
    btnEnterWorld.addEventListener('click', () => {
      const nickInput = document.getElementById('char-nickname-input');
      const customNick = nickInput?.value.trim() || this.currentAccount || 'Hero_Hunter';

      screenChar.classList.add('hidden');
      hud.classList.remove('hidden');

      // Initialize Game Engine & Scene with custom nickname
      this.startGame(customNick);
    });
  }

  startGame(customNick = 'Hero_Hunter') {
    const playerName = customNick;

    // 1. Play Town BGM
    audioManager.playBGM('town');

    // 2. Update HUD Profile
    document.getElementById('hud-player-name').textContent = playerName;
    const avatarMap = { warrior: '⚔️', sorceress: '🔮', archer: '🏹', cleric: '🛡️' };
    document.getElementById('hud-class-avatar').textContent = avatarMap[this.selectedClass] || '⚔️';

    // 3. Spawn Local Player
    this.player = new Player(this, playerName, this.selectedClass);

    // 4. Initialize Network (PeerJS room for multiplayer)
    this.network.init(playerName, this.selectedClass);

    // 5. Build Initial Town Map
    this.changeZone('town', false);

    // 6. Start Animation Loop (Solo player with 0 follower bots)
    this.startLoop();

    this.ui.addChatMessage(`🎉 Selamat datang di ${this.selectedServer} Prairie Haven, ${playerName}!`, '#fbbf24');
  }

  toggleBotSquad(enable) {
    if (enable) {
      if (!this.remotePlayers.has('bot_mage')) {
        const botMage = new RemotePlayer(this, 'bot_mage', 'Stella [Mage]', 'sorceress', true);
        botMage.position.set(-3, 0, -2);
        this.remotePlayers.set('bot_mage', botMage);
      }
      if (!this.remotePlayers.has('bot_cleric')) {
        const botCleric = new RemotePlayer(this, 'bot_cleric', 'Cedric [Cleric]', 'cleric', true);
        botCleric.position.set(3, 0, -2);
        this.remotePlayers.set('bot_cleric', botCleric);
      }
    } else {
      ['bot_mage', 'bot_cleric'].forEach(id => {
        const bot = this.remotePlayers.get(id);
        if (bot) {
          bot.destroy();
          this.remotePlayers.delete(id);
        }
      });
    }
  }

  changeZone(newZone, broadcast = true) {
    this.currentZone = newZone;

    // Clear old enemies & map
    this.enemies.forEach(e => this.engine.scene.remove(e.mesh));
    this.enemies = [];
    this.projectiles.forEach(p => p.destroy());
    this.projectiles = [];

    if (this.worldMap) {
      this.worldMap.destroy();
    }

    const zoneBadge = document.getElementById('zone-badge');
    const objectiveText = document.getElementById('objective-text');

    if (newZone === 'town') {
      this.worldMap = new TownMap(this.engine.scene);
      this.player.position.set(0, 0, 45);
      this.player.rotationY = Math.PI;
      audioManager.playBGM('town');
      this.ui.hideBossBar();
      this.hidePvPHUD();

      if (zoneBadge) zoneBadge.innerHTML = '🏛️ Prairie Haven (Town)';
      if (objectiveText) objectiveText.textContent = 'Kunjungi Gerbang Utara (Dungeon) atau Gerbang Selatan (PvP Arena)!';

    } else if (newZone === 'dungeon') {
      this.worldMap = new DungeonMap(this.engine.scene);
      this.player.position.set(0, 0, 35);
      audioManager.playBGM('dungeon');
      this.hidePvPHUD();

      if (zoneBadge) zoneBadge.innerHTML = '🌋 The Crimson Dragon Nest';
      if (objectiveText) objectiveText.textContent = 'Tahap 1: Kalahkan semua monster penjaga gerbang!';

      this.dungeonWave = 1;
      this.spawnDungeonWave(1);

    } else if (newZone === 'arena') {
      this.worldMap = new ArenaMap(this.engine.scene);
      this.player.position.set(0, 0, 18);
      audioManager.playBGM('dungeon');
      this.ui.hideBossBar();

      if (zoneBadge) zoneBadge.innerHTML = '⚔️ Colosseum Arena (PvP)';
      if (objectiveText) objectiveText.textContent = 'Arena Pertarungan PvP 3v3 Tim! Kumpulkan 5 Kill untuk Menang.';

      this.startPvP('3v3', broadcast);
    }

    if (broadcast && this.network) {
      this.network.broadcast({
        type: 'ZONE_CHANGE',
        zone: newZone
      });
    }
  }

  // MULTI-STAGE DUNGEON SPAWN SYSTEM
  spawnDungeonWave(waveNumber) {
    const objectiveText = document.getElementById('objective-text');

    if (waveNumber === 1) {
      this.ui.addChatMessage('⚔️ [DUNGEON STAGE 1] Gerbang Luar: Kawanan Goblin & Skeleton Menyerang!', '#ef4444');
      if (objectiveText) objectiveText.textContent = 'Tahap 1: Kalahkan 6 Goblin & 4 Skeleton Marksmen!';
      
      this.enemies.push(new Enemy(this, 'goblin', new THREE.Vector3(-10, 0, -5)));
      this.enemies.push(new Enemy(this, 'goblin', new THREE.Vector3(10, 0, -5)));
      this.enemies.push(new Enemy(this, 'goblin', new THREE.Vector3(-6, 0, -12)));
      this.enemies.push(new Enemy(this, 'goblin', new THREE.Vector3(6, 0, -12)));
      this.enemies.push(new Enemy(this, 'skeleton', new THREE.Vector3(-16, 0, -20)));
      this.enemies.push(new Enemy(this, 'skeleton', new THREE.Vector3(16, 0, -20)));
      this.enemies.push(new Enemy(this, 'skeleton', new THREE.Vector3(0, 0, -22)));

    } else if (waveNumber === 2) {
      this.ui.addChatMessage('🔥 [DUNGEON STAGE 2] Fissure Magma: 2x Abyssal Stone Golem Bangkit!', '#f97316');
      if (objectiveText) objectiveText.textContent = 'Tahap 2: Hancurkan 2 Mini-Boss Abyssal Stone Golem!';
      
      this.enemies.push(new Enemy(this, 'golem', new THREE.Vector3(-12, 0, -15)));
      this.enemies.push(new Enemy(this, 'golem', new THREE.Vector3(12, 0, -15)));
      this.enemies.push(new Enemy(this, 'goblin', new THREE.Vector3(-8, 0, -8)));
      this.enemies.push(new Enemy(this, 'goblin', new THREE.Vector3(8, 0, -8)));

    } else if (waveNumber === 3) {
      this.ui.addChatMessage('🐉 [FINAL RAID BOSS] THE CRIMSON DRAGON NEST TELAH MUNCUL DARI LAVA!', '#ef4444');
      if (objectiveText) objectiveText.textContent = 'Tahap Akhir: Kalahkan Boss Naga Merah!';
      audioManager.playBossRoar();
      this.engine.triggerScreenShake(1.0);
      
      // Spawn The Crimson Dragon Final Boss
      const dragonBoss = new Enemy(this, 'boss_dragon', new THREE.Vector3(0, 0, -18));
      this.enemies.push(dragonBoss);
    }
  }

  // PVP 3V3 / 1V1 ARENA BATTLE SYSTEM
  startPvP(mode = '3v3', broadcast = true) {
    this.pvpMode = mode;
    this.pvpScore = { red: 0, blue: 0 };
    this.showPvPHUD();

    this.ui.addChatMessage(`⚔️ PERTARUNGAN PVP ${mode.toUpperCase()} DIMULAI! Tim Pertama Mencapai 5 Kill Menang!`, '#38bdf8');

    // Spawn Enemy Team Gladiators (Team Red)
    const enemy1 = new Enemy(this, 'goblin', new THREE.Vector3(-8, 0, -14));
    enemy1.name = 'Gladiator_Ares [Red]';
    enemy1.maxHp = 900;
    enemy1.hp = 900;
    enemy1.atk = 65;
    this.enemies.push(enemy1);

    const enemy2 = new Enemy(this, 'skeleton', new THREE.Vector3(8, 0, -14));
    enemy2.name = 'Gladiator_Artemis [Red]';
    enemy2.maxHp = 750;
    enemy2.hp = 750;
    enemy2.atk = 75;
    this.enemies.push(enemy2);

    const enemy3 = new Enemy(this, 'golem', new THREE.Vector3(0, 0, -20));
    enemy3.name = 'Gladiator_Titan [Red]';
    enemy3.maxHp = 1600;
    enemy3.hp = 1600;
    enemy3.atk = 90;
    this.enemies.push(enemy3);
  }

  showPvPHUD() {
    let pvpScoreBox = document.getElementById('pvp-score-box');
    if (!pvpScoreBox) {
      pvpScoreBox = document.createElement('div');
      pvpScoreBox.id = 'pvp-score-box';
      pvpScoreBox.className = 'hud-panel pointer-events-auto flex items-center gap-3';
      pvpScoreBox.style.cssText = 'position: fixed; top: 70px; left: 50%; transform: translateX(-50%); z-index: 25; padding: 8px 18px; border-color: #3b82f6;';
      pvpScoreBox.innerHTML = `
        <span class="font-cinzel text-xs font-bold text-blue-400">TIM BIRU: <b id="pvp-score-blue" class="text-white text-base">0</b></span>
        <span class="text-xs text-neutral-400 font-bold">VS</span>
        <span class="font-cinzel text-xs font-bold text-red-400">TIM MERAH: <b id="pvp-score-red" class="text-white text-base">0</b></span>
      `;
      document.getElementById('game-hud')?.appendChild(pvpScoreBox);
    }
    pvpScoreBox.classList.remove('hidden');
  }

  hidePvPHUD() {
    const pvpScoreBox = document.getElementById('pvp-score-box');
    if (pvpScoreBox) pvpScoreBox.classList.add('hidden');
  }

  triggerPvPKill(isBlueTeam = true) {
    if (isBlueTeam) {
      this.pvpScore.blue++;
      const el = document.getElementById('pvp-score-blue');
      if (el) el.textContent = this.pvpScore.blue;
    } else {
      this.pvpScore.red++;
      const el = document.getElementById('pvp-score-red');
      if (el) el.textContent = this.pvpScore.red;
    }

    if (this.pvpScore.blue >= 5 || this.pvpScore.red >= 5) {
      const winner = this.pvpScore.blue >= 5 ? 'TIM BIRU (AZURE SENTINELS)' : 'TIM MERAH (CRIMSON KNIGHTS)';
      this.ui.addChatMessage(`🏆 PERTANDINGAN SELESAI! ${winner} MERAIH KEMENANGAN! +2000 Gold & 10 Honor Gems`, '#34d399');
      if (this.player) {
        this.player.gold += 2000;
        this.player.gems += 10;
      }
      setTimeout(() => {
        this.changeZone('town', true);
      }, 3000);
    }
  }

  triggerDungeonVictory() {
    this.ui.hideBossBar();
    this.ui.addChatMessage('🏆 SELAMAT! NEST TELAH DITAKLUKKAN!', '#10b981');
    setTimeout(() => {
      this.ui.showDungeonVictory();
    }, 1200);
  }

  spawnProjectile(startPos, rotationY, type) {
    const proj = new Projectile(this, startPos, rotationY, type);
    this.projectiles.push(proj);
  }

  removeProjectile(proj) {
    const idx = this.projectiles.indexOf(proj);
    if (idx !== -1) this.projectiles.splice(idx, 1);
  }

  removeEnemy(enemyId) {
    const idx = this.enemies.findIndex(e => e.id === enemyId);
    if (idx !== -1) this.enemies.splice(idx, 1);

    if (this.currentZone === 'dungeon' && this.enemies.length === 0) {
      if (this.dungeonWave < 3) {
        this.dungeonWave++;
        setTimeout(() => this.spawnDungeonWave(this.dungeonWave), 1500);
      }
    }
  }

  spawnRemotePlayer(peerId, name, heroClass) {
    if (this.remotePlayers.has(peerId)) return;
    const remote = new RemotePlayer(this, peerId, name, heroClass, false);
    this.remotePlayers.set(peerId, remote);
  }

  updateRemotePlayer(peerId, data) {
    const remote = this.remotePlayers.get(peerId);
    if (remote) {
      remote.updateSync(data);
    }
  }

  removeRemotePlayer(peerId) {
    const remote = this.remotePlayers.get(peerId);
    if (remote) {
      remote.destroy();
      this.remotePlayers.delete(peerId);
    }
  }

  startLoop() {
    const animate = (currentTime) => {
      requestAnimationFrame(animate);

      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      this.lastTime = currentTime;

      // 1. Update Player
      if (this.player) {
        this.player.update(dt);
        
        // Town Portal Detection on Grand Map
        if (this.currentZone === 'town') {
          if (this.player.position.z < -78 && Math.abs(this.player.position.x) < 16) {
            document.getElementById('modal-dungeon-select')?.classList.remove('hidden');
          } else if (this.player.position.z > 78 && Math.abs(this.player.position.x) < 16) {
            document.getElementById('modal-dungeon-select')?.classList.remove('hidden');
          }
        }
      }

      // 2. Update Remote Players & Bots
      this.remotePlayers.forEach(remote => remote.update(dt));

      // 3. Update Enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        this.enemies[i].update(dt);
      }

      // 4. Update Projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        this.projectiles[i].update(dt);
      }

      // 5. Update UI & HUD
      this.ui.update(dt);

      // 6. Update 3D Engine & Camera
      this.engine.update(dt, this.player ? this.player.position : null);
    };

    requestAnimationFrame(animate);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
