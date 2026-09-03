import { Peer } from 'peerjs';

/**
 * AUTO-LOBBY MULTIPLAYER SYSTEM
 * 
 * Cara kerja:
 * 1. Setiap server (SEA-1, ASIA-2, dll) punya 1 "Hub" peer tetap: AETHERIA-SEA1-HUB
 * 2. Pemain pertama yang join → menjadi Hub (host server)
 * 3. Pemain berikutnya → connect ke Hub
 * 4. Hub menyebarkan daftar peer ke semua pemain → semua terhubung mesh
 * 5. Kalau Hub penuh (>20 player), Hub membuka shard baru otomatis
 */
export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.myPeerId = null;
    this.hubPeerId = null;
    this.isHub = false;
    this.connections = new Map(); // peerId -> DataConnection
    this.partyMembers = new Map(); // peerId -> player info
    this.serverChannel = 'SEA-1';
    this.botSquadEnabled = false;
  }

  init(playerName, heroClass) {
    this.playerName = playerName;
    this.heroClass = heroClass;
    this.serverChannel = (this.game.selectedServer || 'SEA-1')
      .replace(/[^A-Za-z0-9]/g, ''); // e.g. "SEA1", "ASIA2"

    // Hub peer ID = well-known fixed ID for each server
    this.hubPeerId = `AETHERIA-${this.serverChannel}-HUB`;
    
    // Personal peer ID = random
    const randId = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.myPeerId = `${this.serverChannel}-${randId}`;

    try {
      this.peer = new Peer(this.myPeerId, { debug: 0 });

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        console.log('[Net] My peer ID:', id);

        this.addSelfToParty();
        this.updatePartyUI();

        // Try to become Hub first
        this.tryBecomeHub();
      });

      // Accept incoming connections (from Hub sending us peer list, or from other peers)
      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      // Accept voice calls
      this.peer.on('call', (call) => {
        if (this.game.voice) this.game.voice.handleIncomingCall(call);
      });

      this.peer.on('error', (err) => {
        // Suppress non-fatal errors
        if (err.type !== 'peer-unavailable') {
          console.warn('[Net] Peer error:', err.type);
        }
      });

    } catch (e) {
      console.warn('[Net] Init error:', e);
      this.addSelfToParty();
    }
  }

  tryBecomeHub() {
    // Attempt to register as Hub with fixed ID
    const hubAttempt = new Peer(this.hubPeerId, { debug: 0 });

    hubAttempt.on('open', () => {
      // Success! We are the Hub for this server
      this.isHub = true;
      console.log('[Net] ✅ Became HUB for server:', this.serverChannel);
      
      // Use the hub peer as our main peer
      this.peer.destroy();
      this.peer = hubAttempt;
      this.myPeerId = this.hubPeerId;

      // Update own party entry
      this.partyMembers.set(this.myPeerId, {
        id: this.myPeerId,
        name: this.playerName,
        heroClass: this.heroClass,
        hp: 1000, maxHp: 1000, level: 1,
        isLeader: true, isHub: true
      });

      this.peer.on('connection', (conn) => this.handleIncomingConnection(conn));
      this.peer.on('call', (call) => {
        if (this.game.voice) this.game.voice.handleIncomingCall(call);
      });

      this.updatePartyUI();
      this.game.ui.addChatMessage(`✅ Anda menjadi Host Server ${this.serverChannel}! Menunggu pemain lain...`, '#34d399');
      
      const myCodeEl = document.getElementById('my-party-code');
      if (myCodeEl) myCodeEl.textContent = this.myPeerId;
    });

    hubAttempt.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Hub sudah ada — connect ke Hub sebagai client
        hubAttempt.destroy();
        console.log('[Net] Hub exists, connecting as client...');
        this.joinAsClient();
      }
    });
  }

  joinAsClient() {
    // Connect ke Hub
    const conn = this.peer.connect(this.hubPeerId, {
      metadata: { name: this.playerName, heroClass: this.heroClass }
    });

    conn.on('open', () => {
      this.connections.set(this.hubPeerId, conn);
      console.log('[Net] ✅ Connected to Hub:', this.hubPeerId);

      // Send JOIN to Hub
      conn.send({
        type: 'CLIENT_JOIN',
        id: this.myPeerId,
        name: this.playerName,
        heroClass: this.heroClass
      });

      this.game.ui.addChatMessage(`✅ Terhubung ke Server ${this.serverChannel}! Sedang mencari pemain lain...`, '#34d399');
      
      const myCodeEl = document.getElementById('my-party-code');
      if (myCodeEl) myCodeEl.textContent = this.myPeerId;
    });

    conn.on('data', (data) => this.handlePacket(data, conn.peer));
    conn.on('error', () => {
      // Hub disappeared — try to take over as hub
      setTimeout(() => this.tryBecomeHub(), 1000);
    });
    conn.on('close', () => {
      console.log('[Net] Hub disconnected, attempting to re-register as hub...');
      this.connections.delete(this.hubPeerId);
      setTimeout(() => this.tryBecomeHub(), 2000);
    });
  }

  handleIncomingConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);

      conn.on('data', (data) => this.handlePacket(data, conn.peer));
      conn.on('close', () => {
        this.connections.delete(conn.peer);
        this.partyMembers.delete(conn.peer);
        this.game.removeRemotePlayer(conn.peer);
        this.updatePartyUI();
        this.game.ui.addChatMessage(`[Server] Pemain telah meninggalkan server.`, '#f87171');
      });

      // If we are hub, send current peer list to the new joiner, then broadcast new joiner
      if (this.isHub) {
        // Send peer list to new joiner
        const peerList = Array.from(this.partyMembers.values());
        conn.send({ type: 'PEER_LIST', peers: peerList, hubId: this.myPeerId });

        // Broadcast new player arrival to everyone else
        this.broadcast({
          type: 'NEW_PEER',
          id: conn.peer,
          name: conn.metadata?.name || 'Player',
          heroClass: conn.metadata?.heroClass || 'warrior'
        }, conn.peer);
      }
    });

    conn.on('data', (data) => this.handlePacket(data, conn.peer));
    conn.on('error', (e) => console.warn('[Net] Conn error:', e));
  }

  connectDirectToPeer(peerId) {
    if (this.connections.has(peerId) || peerId === this.myPeerId) return;

    const conn = this.peer.connect(peerId, {
      metadata: { name: this.playerName, heroClass: this.heroClass }
    });

    conn.on('open', () => {
      this.connections.set(peerId, conn);
      conn.send({
        type: 'CLIENT_JOIN',
        id: this.myPeerId,
        name: this.playerName,
        heroClass: this.heroClass
      });
      conn.on('data', (data) => this.handlePacket(data, conn.peer));
      conn.on('close', () => {
        this.connections.delete(peerId);
        this.partyMembers.delete(peerId);
        this.game.removeRemotePlayer(peerId);
        this.updatePartyUI();
      });
    });

    conn.on('error', () => {});
  }

  handlePacket(data, senderPeerId) {
    if (!data?.type) return;

    switch (data.type) {
      case 'PEER_LIST':
        // Received full server peer list from Hub → connect to each peer directly
        console.log('[Net] Got peer list, connecting to', data.peers.length, 'peers');
        data.peers.forEach(member => {
          if (member.id !== this.myPeerId) {
            this.partyMembers.set(member.id, member);
            this.connectDirectToPeer(member.id);
            if (!this.game.remotePlayers?.has(member.id)) {
              this.game.spawnRemotePlayer(member.id, member.name, member.heroClass);
            }
          }
        });
        this.updatePartyUI();
        break;

      case 'NEW_PEER':
        // Another player joined the server
        if (data.id !== this.myPeerId && !this.connections.has(data.id)) {
          this.partyMembers.set(data.id, {
            id: data.id, name: data.name, heroClass: data.heroClass,
            hp: 1000, maxHp: 1000, level: 1
          });
          this.connectDirectToPeer(data.id);
          this.game.spawnRemotePlayer(data.id, data.name, data.heroClass);
          this.updatePartyUI();
          this.game.ui.addChatMessage(`🎮 ${data.name} (${data.heroClass}) bergabung ke server!`, '#a78bfa');
        }
        break;

      case 'CLIENT_JOIN':
        // Direct join from a peer (after hub sent them our ID)
        if (!this.partyMembers.has(data.id)) {
          this.partyMembers.set(data.id, {
            id: data.id, name: data.name, heroClass: data.heroClass,
            hp: 1000, maxHp: 1000, level: 1
          });
          if (!this.game.remotePlayers?.has(data.id)) {
            this.game.spawnRemotePlayer(data.id, data.name, data.heroClass);
          }
          this.updatePartyUI();
          if (this.isHub) {
            this.game.ui.addChatMessage(`🎮 ${data.name} (${data.heroClass}) masuk ke server!`, '#a78bfa');
            // Broadcast to all others that a new peer joined
            this.broadcast({ type: 'NEW_PEER', id: data.id, name: data.name, heroClass: data.heroClass }, data.id);
          }
        }
        break;

      case 'PLAYER_SYNC':
        this.game.updateRemotePlayer(senderPeerId, data);
        break;

      case 'PLAYER_ATTACK':
        this.game.triggerRemoteAttack(senderPeerId, data);
        break;

      case 'ZONE_CHANGE':
        this.game.changeZone(data.zone, false);
        break;

      case 'CHAT':
        this.game.ui.addChatMessage(`[${data.sender}]: ${data.message}`, '#e2e8f0');
        break;

      case 'ENEMY_HIT':
        this.game.applyEnemyDamage(data.enemyId, data.damage, data.isCrit, false);
        break;

      case 'PVP_DAMAGE':
        // We were hit by a real player in PvP!
        if (this.game.player) {
          this.game.player.takeDamage(data.damage);
          this.game.ui.addChatMessage(`💀 ${data.attackerName} menyerangmu! -${data.damage} HP${data.isCrit ? ' (CRITICAL!)' : ''}`, '#f87171');
        }
        break;

      case 'START_PVP':
        // Host invites everyone to arena
        this.game.changeZone('arena', false);
        if (this.game.player) {
          this.game.player.pvpTeam = data.teams?.[this.myPeerId] || 'blue';
        }
        this.game.ui.addChatMessage(`⚔️ Semua pemain memasuki Arena PvP! Tim kamu: ${this.game.player?.pvpTeam?.toUpperCase()}`, '#38bdf8');
        break;

      case 'PVP_KILL':
        this.game.triggerPvPKill(data.team === 'blue');
        break;
    }
  }

  broadcast(packet, excludePeerId = null) {
    this.connections.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        try { conn.send(packet); } catch (e) {}
      }
    });
  }

  addSelfToParty() {
    this.partyMembers.set(this.myPeerId || 'local', {
      id: this.myPeerId || 'local',
      name: this.playerName,
      heroClass: this.heroClass,
      hp: 1000, maxHp: 1000, level: 1,
      isLeader: true
    });
  }

  // Call this to start a PvP match - sends all players to arena with random team assignment
  startPvPMatch() {
    if (!this.peer) return;
    const allIds = [this.myPeerId, ...Array.from(this.connections.keys())];
    const teams = {};
    allIds.forEach((id, idx) => {
      teams[id] = idx % 2 === 0 ? 'blue' : 'red';
    });

    // Assign own team
    if (this.game.player) this.game.player.pvpTeam = teams[this.myPeerId];

    // Tell all peers to enter arena with their assigned team
    this.broadcast({ type: 'START_PVP', teams });

    // Enter arena ourselves
    this.game.changeZone('arena', false);
    this.game.ui.addChatMessage(`⚔️ PvP dimulai! Tim kamu: ${teams[this.myPeerId]?.toUpperCase()}`, '#38bdf8');
  }

  broadcastPvPKill(team) {
    this.broadcast({ type: 'PVP_KILL', team });
  }

  joinRoom(targetCode) {
    // Manual join still works as fallback
    this.connectDirectToPeer(targetCode.trim());
    this.game.ui.addChatMessage(`[Party] Mencoba bergabung ke ${targetCode}...`, '#a78bfa');
  }

  updatePartyUI() {
    const countBadge = document.getElementById('party-count-badge');
    if (countBadge) countBadge.textContent = `${this.partyMembers.size} Players`;

    const listEl = document.getElementById('party-members-list-modal');
    if (listEl) {
      let html = '';
      const icons = { warrior: '⚔️', sorceress: '🔮', archer: '🏹', cleric: '🛡️' };
      this.partyMembers.forEach(m => {
        html += `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin-bottom:4px;background:rgba(30,30,50,0.7);border-radius:10px;border:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:1.2rem">${icons[m.heroClass] || '⚔️'}</span>
              <div>
                <div style="font-weight:700;font-size:0.75rem;color:#fbbf24;">${m.name} ${m.isLeader ? '👑' : ''} ${m.isHub ? '[HOST]' : ''}</div>
                <div style="font-size:0.65rem;color:#94a3b8;text-transform:capitalize">${m.heroClass} (Lv.${m.level || 1})</div>
              </div>
            </div>
            <span style="font-size:0.7rem;color:#34d399;font-weight:700;">Online</span>
          </div>`;
      });
      listEl.innerHTML = html;
    }

    const hudListEl = document.getElementById('party-hud-list');
    if (hudListEl) {
      let hudHtml = '';
      const icons = { warrior: '⚔️', sorceress: '🔮', archer: '🏹', cleric: '🛡️' };
      this.partyMembers.forEach(m => {
        if (m.id !== this.myPeerId) {
          hudHtml += `
            <div style="display:flex;align-items:center;gap:6px;padding:4px 8px;margin-bottom:3px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid rgba(255,255,255,0.1);">
              <span style="font-size:0.9rem">${icons[m.heroClass] || '⚔️'}</span>
              <div>
                <div style="font-size:0.65rem;font-weight:700;color:#fbbf24;">${m.name}</div>
                <div style="height:5px;width:80px;background:#1a1a2e;border-radius:9999px;overflow:hidden;margin-top:2px;">
                  <div style="height:100%;width:${Math.round((m.hp / m.maxHp) * 100) || 100}%;background:linear-gradient(90deg,#dc2626,#f59e0b);border-radius:9999px;"></div>
                </div>
              </div>
            </div>`;
        }
      });
      hudListEl.innerHTML = hudHtml;
    }
  }
}
