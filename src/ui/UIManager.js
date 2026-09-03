import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { audioManager } from '../core/AudioManager.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.selectedContextPlayer = null;

    this.initModals();
    this.initChat();
    this.initBlacksmith();
    this.initLottery();
    this.initPotionShop();
    this.initSkillTree();
    this.initContextMenu();
    this.initQuickPotions();
  }

  initModals() {
    this.bindModal('btn-party-toggle', 'modal-party');
    this.bindModal('btn-inventory-toggle', 'modal-inventory');
    this.bindModal('btn-forge-toggle', 'modal-forge');
    this.bindModal('btn-potion-shop-toggle', 'modal-potion-shop');
    this.bindModal('btn-skill-tree-toggle', 'modal-skill-tree');

    // Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-backdrop');
        if (modal) modal.classList.add('hidden');
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.add('hidden');
        }
      });
    });

    // Sound toggle
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const isMuted = audioManager.toggleMute();
        document.getElementById('sound-icon').textContent = isMuted ? '🔇' : '🔊';
      });
    }

    // Voice Chat Mic Toggle Button
    const micBtn = document.getElementById('btn-mic-toggle');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (this.game.voice) {
          this.game.voice.toggleMic();
        }
      });
    }

    // Key V shortcut for Voice Mic Toggle
    window.addEventListener('keydown', (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.code === 'KeyV') {
        if (this.game.voice) this.game.voice.toggleMic();
      } else if (e.code === 'Enter') {
        const chatInp = document.getElementById('chat-input');
        if (chatInp) {
          e.preventDefault();
          chatInp.focus();
        }
      }
    });

    // Party Tabs
    const tabHost = document.getElementById('tab-party-host');
    const tabJoin = document.getElementById('tab-party-join');
    const secHost = document.getElementById('party-host-section');
    const secJoin = document.getElementById('party-join-section');

    if (tabHost && tabJoin) {
      tabHost.addEventListener('click', () => {
        tabHost.style.background = 'rgba(168, 85, 247, 0.2)';
        tabHost.style.borderColor = '#a855f7';
        tabHost.style.color = '#f3e8ff';
        tabJoin.style.background = 'rgba(255, 255, 255, 0.06)';
        tabJoin.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        tabJoin.style.color = '#d1d5db';
        secHost.classList.remove('hidden');
        secJoin.classList.add('hidden');
      });

      tabJoin.addEventListener('click', () => {
        tabJoin.style.background = 'rgba(168, 85, 247, 0.2)';
        tabJoin.style.borderColor = '#a855f7';
        tabJoin.style.color = '#f3e8ff';
        tabHost.style.background = 'rgba(255, 255, 255, 0.06)';
        tabHost.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        tabHost.style.color = '#d1d5db';
        secJoin.classList.remove('hidden');
        secHost.classList.add('hidden');
      });
    }

    // Copy Party Code
    const btnCopy = document.getElementById('btn-copy-party-code');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const code = document.getElementById('my-party-code')?.textContent || '';
        navigator.clipboard?.writeText(code);
        btnCopy.textContent = '✅ Berhasil Disalin!';
        setTimeout(() => { btnCopy.textContent = 'Salin Kode Room'; }, 2000);
      });
    }

    // Start PvP Match — send all players to arena with random team split
    const btnStartPvP = document.getElementById('btn-start-pvp');
    if (btnStartPvP) {
      btnStartPvP.addEventListener('click', () => {
        const pCount = this.game.network?.partyMembers?.size || 1;
        if (pCount < 2) {
          this.addChatMessage('⚠️ Minimal 2 pemain untuk PvP! Ajak teman dulu.', '#f97316');
          return;
        }
        this.addChatMessage('⚔️ Memulai PvP — semua pemain masuk arena...', '#f97316');
        setTimeout(() => {
          this.game.network.startPvPMatch();
        }, 500);
      });
    }

    // Join Room Submit
    const btnJoinSubmit = document.getElementById('btn-join-room-submit');
    const inputJoinCode = document.getElementById('input-join-code');
    if (btnJoinSubmit && inputJoinCode) {
      btnJoinSubmit.addEventListener('click', () => {
        const code = inputJoinCode.value.trim();
        if (code) {
          this.game.network.joinRoom(code);
          document.getElementById('modal-party').classList.add('hidden');
        }
      });
    }

    // Toggle Bot Squad
    const botToggle = document.getElementById('toggle-bot-squad');
    if (botToggle) {
      botToggle.addEventListener('change', (e) => {
        this.game.network.botSquadEnabled = e.target.checked;
        this.game.toggleBotSquad(e.target.checked);
        this.game.network.updatePartyUI();
      });
    }

    // Gate Buttons
    document.querySelectorAll('.btn-enter-dungeon').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('modal-dungeon-select')?.classList.add('hidden');
        this.game.changeZone('dungeon', true);
      });
    });

    document.querySelectorAll('.btn-enter-arena').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('modal-dungeon-select')?.classList.add('hidden');
        this.game.changeZone('arena', true);
      });
    });

    const btnReturnTown = document.getElementById('btn-return-town');
    if (btnReturnTown) {
      btnReturnTown.addEventListener('click', () => {
        document.getElementById('modal-dungeon-clear')?.classList.add('hidden');
        this.game.changeZone('town', true);
      });
    }
  }

  bindModal(btnId, modalId) {
    const btn = document.getElementById(btnId);
    const modal = document.getElementById(modalId);
    if (btn && modal) {
      btn.addEventListener('click', () => {
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
          if (modalId === 'modal-inventory') this.updateInventoryUI();
          if (modalId === 'modal-skill-tree') this.updateSkillTreeUI();
        }
      });
    }
  }

  // TOKO DARAH / POTION SHOP (Irene)
  initPotionShop() {
    document.querySelectorAll('.btn-buy-potion').forEach(btn => {
      btn.addEventListener('click', () => {
        const potionType = btn.dataset.potion;
        const cost = parseInt(btn.dataset.cost, 10);
        const player = this.game.player;
        if (!player) return;

        if (player.gold < cost) {
          this.addChatMessage('⚠️ Gold tidak cukup untuk membeli ramuan!', '#ef4444');
          return;
        }

        player.gold -= cost;
        if (potionType === 'hp' || potionType === 'mega_hp') {
          player.hpPotions = (player.hpPotions || 5) + (potionType === 'mega_hp' ? 2 : 1);
        } else if (potionType === 'mp') {
          player.mpPotions = (player.mpPotions || 5) + 1;
        }

        audioManager.playChestOpen();
        this.addChatMessage(`🧪 Berhasil membeli ramuan! Sisa Gold: ${player.gold}`, '#34d399');
        this.updatePotionCounts();
      });
    });
  }

  // QUICK POTIONS (Q & E)
  initQuickPotions() {
    const btnHp = document.getElementById('btn-quick-hp');
    const btnMp = document.getElementById('btn-quick-mp');

    const useHpPotion = () => {
      const player = this.game.player;
      if (!player) return;
      if ((player.hpPotions || 5) <= 0) {
        this.addChatMessage('⚠️ Ramuan Darah habis! Beli di Toko Irene.', '#ef4444');
        return;
      }
      if (player.hp >= player.maxHp) {
        this.addChatMessage('ℹ️ HP Anda sudah penuh!', '#fbbf24');
        return;
      }
      player.hpPotions = (player.hpPotions || 5) - 1;
      player.hp = Math.min(player.maxHp, player.hp + 500);
      audioManager.playMagicCast('heal');
      this.spawnFloatingNumber(player.position, '+500 HP', 'heal');
      this.game.engine.spawnImpactParticles(player.position, 0xef4444, 20, 0.3);
      this.updatePotionCounts();
    };

    const useMpPotion = () => {
      const player = this.game.player;
      if (!player) return;
      if ((player.mpPotions || 5) <= 0) {
        this.addChatMessage('⚠️ Ramuan Mana habis! Beli di Toko Irene.', '#ef4444');
        return;
      }
      player.mpPotions = (player.mpPotions || 5) - 1;
      player.mp = Math.min(player.maxMp, player.mp + 300);
      audioManager.playMagicCast('ice');
      this.spawnFloatingNumber(player.position, '+300 MP', 'holy');
      this.updatePotionCounts();
    };

    if (btnHp) btnHp.addEventListener('click', useHpPotion);
    if (btnMp) btnMp.addEventListener('click', useMpPotion);

    window.addEventListener('keydown', (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.code === 'KeyQ') useHpPotion();
      if (e.code === 'KeyE') useMpPotion();
      if (e.code === 'KeyK') document.getElementById('btn-skill-tree-toggle')?.click();
      if (e.code === 'KeyF') this.triggerClosestInteraction();
    });
  }

  updatePotionCounts() {
    const player = this.game.player;
    if (!player) return;
    const hpCount = document.getElementById('hp-potion-count');
    const mpCount = document.getElementById('mp-potion-count');
    if (hpCount) hpCount.textContent = `x${player.hpPotions || 5}`;
    if (mpCount) mpCount.textContent = `x${player.mpPotions || 5}`;
  }

  // SKILL TREE (Stella)
  initSkillTree() {
    // Dynamic Skill List generated in updateSkillTreeUI
  }

  updateSkillTreeUI() {
    const player = this.game.player;
    if (!player) return;

    const spCount = document.getElementById('skill-sp-count');
    const list = document.getElementById('skill-tree-list');
    if (!list) return;

    if (spCount) spCount.textContent = `${player.skillPoints || 3} SP`;

    const skillData = [
      { id: 1, name: 'Skill 1 (Primary Attack)', icon: '💥', level: player.skill1Level || 1, max: 5 },
      { id: 2, name: 'Skill 2 (AoE Strike)', icon: '🌪️', level: player.skill2Level || 1, max: 5 },
      { id: 3, name: 'Skill 3 (Burst Breaker)', icon: '⚡', level: player.skill3Level || 1, max: 5 },
      { id: 4, name: 'Skill 4 (Buff & Shield)', icon: '🛡️', level: player.skill4Level || 1, max: 5 },
      { id: 5, name: 'Ultimate Skill', icon: '☄️', level: player.ultLevel || 1, max: 5 }
    ];

    let html = '';
    skillData.forEach(sk => {
      html += `
        <div class="hud-panel flex justify-between items-center" style="padding: 10px;">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${sk.icon}</span>
            <div>
              <div class="font-bold text-xs text-emerald-300">${sk.name} <span class="text-amber-400">Lv.${sk.level}/${sk.max}</span></div>
              <div class="text-[10px] text-neutral-400">Damage +${(sk.level - 1) * 20}% | Cooldown -${(sk.level - 1) * 0.4}s</div>
            </div>
          </div>
          <button class="btn-upgrade-skill btn-secondary text-xs font-bold" data-skill="${sk.id}" style="background: #059669; color: #fff; padding: 4px 12px;">
            Upgrade (1 SP)
          </button>
        </div>
      `;
    });

    list.innerHTML = html;

    list.querySelectorAll('.btn-upgrade-skill').forEach(btn => {
      btn.addEventListener('click', () => {
        const skId = parseInt(btn.dataset.skill, 10);
        if ((player.skillPoints || 3) <= 0) {
          this.addChatMessage('⚠️ Poin Skill (SP) habis! Naikkan level hero untuk dapat SP.', '#ef4444');
          return;
        }

        player.skillPoints = (player.skillPoints || 3) - 1;
        if (skId === 1) player.skill1Level = (player.skill1Level || 1) + 1;
        if (skId === 2) player.skill2Level = (player.skill2Level || 1) + 1;
        if (skId === 3) player.skill3Level = (player.skill3Level || 1) + 1;
        if (skId === 4) player.skill4Level = (player.skill4Level || 1) + 1;
        if (skId === 5) player.ultLevel = (player.ultLevel || 1) + 1;

        audioManager.playChestOpen();
        this.addChatMessage(`✨ Skill ${skId} berhasil ditingkatkan!`, '#34d399');
        this.updateSkillTreeUI();
      });
    });
  }

  // IN-GAME RIGHT CLICK CONTEXT MENU ON PLAYERS
  initContextMenu() {
    const menu = document.getElementById('player-context-menu');
    const targetNameEl = document.getElementById('ctx-target-name');

    // Right Click on 3D Canvas
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Check if clicking near remote player or bot
      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.game.engine.camera);

      let hitPlayer = null;
      this.game.remotePlayers.forEach(rp => {
        const intersects = raycaster.intersectObject(rp.mesh, true);
        if (intersects.length > 0) {
          hitPlayer = rp;
        }
      });

      if (hitPlayer) {
        this.selectedContextPlayer = hitPlayer;
        if (targetNameEl) targetNameEl.textContent = hitPlayer.name;
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.classList.remove('hidden');
      } else {
        menu.classList.add('hidden');
      }
    });

    window.addEventListener('click', (e) => {
      if (!e.target.closest('#player-context-menu')) {
        menu.classList.add('hidden');
      }
    });

    // Context Menu Buttons
    document.getElementById('btn-ctx-invite')?.addEventListener('click', () => {
      if (this.selectedContextPlayer) {
        this.addChatMessage(`👥 Mengundang ${this.selectedContextPlayer.name} ke Party!`, '#a855f7');
        this.game.network.broadcast({
          type: 'PARTY_INVITE',
          target: this.selectedContextPlayer.id,
          sender: this.game.player.name
        });
      }
      menu.classList.add('hidden');
    });

    document.getElementById('btn-ctx-duel')?.addEventListener('click', () => {
      if (this.selectedContextPlayer) {
        this.addChatMessage(`⚔️ Menantang ${this.selectedContextPlayer.name} duel 1v1 di Colosseum!`, '#ef4444');
      }
      menu.classList.add('hidden');
    });

    document.getElementById('btn-ctx-inspect')?.addEventListener('click', () => {
      if (this.selectedContextPlayer) {
        this.addChatMessage(`🔍 ${this.selectedContextPlayer.name} | Class: ${this.selectedContextPlayer.heroClass} | Senjata: +5 Greatsword`, '#38bdf8');
      }
      menu.classList.add('hidden');
    });

    document.getElementById('btn-ctx-whisper')?.addEventListener('click', () => {
      const chatInput = document.getElementById('chat-input');
      if (chatInput && this.selectedContextPlayer) {
        chatInput.value = `/w ${this.selectedContextPlayer.name} `;
        chatInput.focus();
      }
      menu.classList.add('hidden');
    });
  }

  // PROXIMITY INTERACTION (PRESS F)
  triggerClosestInteraction() {
    const player = this.game.player;
    if (!player || this.game.currentZone !== 'town') return;

    const npcs = this.game.worldMap?.npcs || [];
    let closest = null;
    let minDist = 8.0;

    npcs.forEach(npc => {
      const d = player.position.distanceTo(npc.position);
      if (d < minDist) {
        minDist = d;
        closest = npc;
      }
    });

    if (closest) {
      const type = closest.userData.type;
      if (type === 'potion') document.getElementById('btn-potion-shop-toggle')?.click();
      if (type === 'forge') document.getElementById('btn-forge-toggle')?.click();
      if (type === 'skill') document.getElementById('btn-skill-tree-toggle')?.click();
      if (type === 'quest') document.getElementById('btn-party-toggle')?.click();
    } else {
      // Check gates
      if (player.position.z < -60) {
        document.getElementById('modal-dungeon-select')?.classList.remove('hidden');
      } else if (player.position.z > 60) {
        document.getElementById('modal-dungeon-select')?.classList.remove('hidden');
      }
    }
  }

  initChat() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-chat-send');

    const sendMsg = () => {
      const text = input.value.trim();
      if (!text) return;
      const name = this.game.player?.name || 'Hero';
      this.addChatMessage(`[${name}]: ${text}`, '#e0e7ff');

      this.game.network.broadcast({
        type: 'CHAT',
        sender: name,
        message: text
      });

      input.value = '';
    };

    if (sendBtn) sendBtn.addEventListener('click', sendMsg);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMsg();
      });
    }
  }

  addChatMessage(msg, color = '#ffffff') {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    const el = document.createElement('div');
    el.style.color = color;
    el.textContent = msg;
    chatContainer.appendChild(el);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  initBlacksmith() {
    const btnForge = document.getElementById('btn-do-forge');
    if (btnForge) {
      btnForge.addEventListener('click', () => {
        const player = this.game.player;
        if (!player) return;

        const cost = 250 * (player.enchantLevel + 1);
        if (player.gold < cost) {
          this.addChatMessage('⚠️ Gold tidak cukup untuk menempa!', '#ef4444');
          return;
        }

        player.gold -= cost;
        const successChance = Math.max(0.2, 1.0 - player.enchantLevel * 0.06);

        if (Math.random() < successChance) {
          player.enchantLevel++;
          audioManager.playChestOpen();
          this.addChatMessage(`🎉 BERHASIL! Senjata ditempa menjadi +${player.enchantLevel}!`, '#10b981');
          confetti({ particleCount: 50, spread: 60 });
        } else {
          audioManager.playHitImpact(false);
          this.addChatMessage(`💥 Tempa GAGAL! Senjata tetap di +${player.enchantLevel}. Coba lagi!`, '#ef4444');
        }

        this.updateForgeUI();
        this.updateInventoryUI();
      });
    }
  }

  updateForgeUI() {
    const player = this.game.player;
    if (!player) return;

    const curPlus = document.getElementById('forge-weapon-plus');
    const curStat = document.getElementById('forge-cur-stat');
    const nextStat = document.getElementById('forge-next-stat');
    const rateEl = document.getElementById('forge-rate');
    const costEl = document.getElementById('forge-cost');

    if (curPlus) curPlus.textContent = `+${player.enchantLevel}`;
    if (curStat) curStat.textContent = `+${player.enchantLevel * 18} Physical ATK`;
    if (nextStat) nextStat.textContent = `+${(player.enchantLevel + 1) * 18} Physical ATK`;
    
    const successRate = Math.round(Math.max(0.2, 1.0 - player.enchantLevel * 0.06) * 100);
    if (rateEl) rateEl.textContent = `${successRate}%`;
    if (costEl) costEl.textContent = `${250 * (player.enchantLevel + 1)} Gold`;
  }

  updateInventoryUI() {
    const player = this.game.player;
    if (!player) return;

    document.getElementById('inv-hero-name').textContent = player.name;
    document.getElementById('stat-atk').textContent = `${player.attackPower}`;
    document.getElementById('stat-def').textContent = `${player.baseDef}`;
    document.getElementById('stat-crit').textContent = `${Math.round(player.critRate * 100)}%`;
    document.getElementById('inv-gold-amount').textContent = `${player.gold.toLocaleString()}`;
    document.getElementById('inv-gem-amount').textContent = `${player.gems}`;

    const grid = document.getElementById('inventory-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="hud-panel p-2 text-center flex flex-col items-center justify-center border-amber-500/40">
          <span class="text-xl">⚔️</span>
          <span class="text-[9px] text-amber-300 font-bold">+${player.enchantLevel} Weapon</span>
        </div>
        <div class="hud-panel p-2 text-center flex flex-col items-center justify-center">
          <span class="text-xl">🛡️</span>
          <span class="text-[9px] text-neutral-300">Dragon Armor</span>
        </div>
        <div class="hud-panel p-2 text-center flex flex-col items-center justify-center">
          <span class="text-xl">🧪</span>
          <span class="text-[9px] text-red-300">HP Potion (x${player.hpPotions || 5})</span>
        </div>
        <div class="hud-panel p-2 text-center flex flex-col items-center justify-center">
          <span class="text-xl">💧</span>
          <span class="text-[9px] text-blue-300">MP Potion (x${player.mpPotions || 5})</span>
        </div>
      `;
    }
  }

  initLottery() {
    const chests = document.querySelectorAll('.chest-box');
    chests.forEach(chest => {
      chest.addEventListener('click', () => {
        if (chest.classList.contains('opened')) return;

        chest.classList.add('opened');
        audioManager.playChestOpen();

        const rewards = [
          { name: '🔥 Ancient Dragon Heart', icon: '💎', gold: 1500 },
          { name: '⚔️ Legendary Weapon Shard', icon: '✨', gold: 1000 },
          { name: '🛡️ Dragon Scale Armor', icon: '🛡️', gold: 800 },
          { name: '💰 Bag of 2000 Gold', icon: '🪙', gold: 2000 }
        ];

        const r = rewards[Math.floor(Math.random() * rewards.length)];
        const rewardEl = chest.querySelector('.chest-reward');
        const iconEl = chest.querySelector('.chest-icon');

        if (iconEl) iconEl.textContent = r.icon;
        if (rewardEl) {
          rewardEl.classList.remove('hidden');
          rewardEl.innerHTML = `<span class="text-xs font-bold text-amber-300">${r.name}</span>`;
        }

        const player = this.game.player;
        if (player) {
          player.gold += r.gold;
          player.gems += 5;
        }

        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      });
    });
  }

  showDungeonVictory() {
    const modal = document.getElementById('modal-dungeon-clear');
    if (modal) {
      modal.classList.remove('hidden');
      audioManager.playChestOpen();
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 }
      });
    }
  }

  update(dt) {
    const player = this.game.player;
    if (!player) return;

    // HP Bar
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    const hpBar = document.getElementById('hud-hp-bar');
    const hpText = document.getElementById('hud-hp-text');
    if (hpBar) hpBar.style.width = `${hpPct}%`;
    if (hpText) hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

    // MP Bar
    const mpPct = Math.max(0, (player.mp / player.maxMp) * 100);
    const mpBar = document.getElementById('hud-mp-bar');
    if (mpBar) mpBar.style.width = `${mpPct}%`;

    // Interaction Prompt check
    const promptEl = document.getElementById('interaction-prompt');
    const titleEl = document.getElementById('interaction-title');
    if (promptEl && this.game.currentZone === 'town') {
      const npcs = this.game.worldMap?.npcs || [];
      let nearNpc = null;
      for (const npc of npcs) {
        if (player.position.distanceTo(npc.position) < 5.5) {
          nearNpc = npc;
          break;
        }
      }

      if (nearNpc) {
        promptEl.classList.remove('hidden');
        if (titleEl) titleEl.textContent = nearNpc.userData.name;
      } else if (player.position.z < -65) {
        promptEl.classList.remove('hidden');
        if (titleEl) titleEl.textContent = '🌋 Gerbang The Crimson Dragon Nest';
      } else if (player.position.z > 65) {
        promptEl.classList.remove('hidden');
        if (titleEl) titleEl.textContent = '⚔️ Gerbang Colosseum Arena PvP';
      } else {
        promptEl.classList.add('hidden');
      }
    }
  }

  showBossBar(name, curHp, maxHp) {
    const container = document.getElementById('boss-hud-container');
    const nameEl = document.getElementById('boss-hud-name');
    if (container) container.classList.remove('hidden');
    if (nameEl) nameEl.textContent = name;
    this.updateBossBar(curHp, maxHp);
  }

  updateBossBar(curHp, maxHp) {
    const hpBar = document.getElementById('boss-hud-hp-bar');
    const pctEl = document.getElementById('boss-hud-hp-pct');
    const pct = Math.max(0, (curHp / maxHp) * 100);

    if (hpBar) hpBar.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${Math.ceil(pct)}%`;
  }

  hideBossBar() {
    const container = document.getElementById('boss-hud-container');
    if (container) container.classList.add('hidden');
  }

  updateCombo(count) {
    const comboDisplay = document.getElementById('combo-display');
    const comboNum = document.getElementById('combo-number');
    if (!comboDisplay || !comboNum) return;

    if (count > 0) {
      comboDisplay.classList.remove('hidden');
      comboNum.textContent = count;
    } else {
      comboDisplay.classList.add('hidden');
    }
  }

  spawnFloatingNumber(worldPos, text, type = 'normal') {
    const screenPos = this.game.engine.toScreenPosition(worldPos);
    if (!screenPos.visible) return;

    const overlay = document.getElementById('combat-overlay');
    if (!overlay) return;

    const el = document.createElement('div');
    el.className = `floating-damage ${type}`;
    el.textContent = text;
    el.style.left = `${screenPos.x + (Math.random() - 0.5) * 30}px`;
    el.style.top = `${screenPos.y - 20 + (Math.random() - 0.5) * 20}px`;

    overlay.appendChild(el);

    setTimeout(() => {
      overlay.removeChild(el);
    }, 850);
  }
}
