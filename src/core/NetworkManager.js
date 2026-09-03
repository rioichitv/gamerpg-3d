import { Peer } from 'peerjs';

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.myPeerId = null;
    this.roomCode = null;
    this.serverChannel = 'SEA-1'; // e.g. 'SEA-1', 'ASIA-2', 'PVP-3'
    this.isHost = false;
    this.connections = new Map(); // peerId -> DataConnection
    this.partyMembers = new Map(); // peerId -> player info
    this.botSquadEnabled = false;
  }

  init(playerName, heroClass) {
    this.playerName = playerName;
    this.heroClass = heroClass;
    this.serverChannel = this.game.selectedServer || 'SEA-1';

    // Unique peer ID with server channel prefix
    const randId = Math.floor(1000 + Math.random() * 9000);
    this.myPeerId = `${this.serverChannel}-${randId}`;
    this.roomCode = `ROOM-${this.serverChannel}-${randId}`;

    try {
      this.peer = new Peer(this.myPeerId, {
        debug: 1
      });

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        console.log('[Network] Connected to Server Realm:', this.serverChannel, 'My Peer ID:', id);

        const myCodeEl = document.getElementById('my-party-code');
        if (myCodeEl) myCodeEl.textContent = this.myPeerId;

        this.addSelfToParty();
        this.updatePartyUI();

        // Connect to server public lobby so players automatically see each other in town
        this.discoverLobbyPeers();
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('call', (call) => {
        if (this.game.voice) {
          this.game.voice.handleIncomingCall(call);
        }
      });

      this.peer.on('error', (err) => {
        console.warn('[Network] Peer warning:', err);
      });
    } catch (e) {
      console.warn('[Network] Peer init error:', e);
      this.addSelfToParty();
    }
  }

  discoverLobbyPeers() {
    // Attempt auto-peering with nearby room instances in same server
    const baseServerIds = [1000, 2000, 3000, 4000, 5000];
    baseServerIds.forEach(num => {
      const targetId = `${this.serverChannel}-${num}`;
      if (targetId !== this.myPeerId) {
        try {
          const conn = this.peer.connect(targetId, {
            metadata: { name: this.playerName, heroClass: this.heroClass }
          });
          conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.handleOutgoingConnection(conn);
          });
          conn.on('data', (data) => this.handlePacket(data, conn.peer));
        } catch (err) {}
      }
    });
  }

  addSelfToParty() {
    this.partyMembers.set(this.myPeerId || 'local_player', {
      id: this.myPeerId || 'local_player',
      name: this.playerName,
      heroClass: this.heroClass,
      hp: 1000,
      maxHp: 1000,
      level: 1,
      isLeader: true
    });
  }

  joinRoom(targetRoomCode) {
    if (!this.peer) return;
    const cleanCode = targetRoomCode.trim();
    console.log('[Network] Connecting to room:', cleanCode);
    
    const conn = this.peer.connect(cleanCode, {
      metadata: {
        name: this.playerName,
        heroClass: this.heroClass
      }
    });

    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.handleOutgoingConnection(conn);
      this.game.ui.addChatMessage(`[Party] Berhasil bergabung ke room ${cleanCode}!`, '#a855f7');
    });

    conn.on('data', (data) => {
      this.handlePacket(data, conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.partyMembers.delete(conn.peer);
      this.game.removeRemotePlayer(conn.peer);
      this.updatePartyUI();
      this.game.ui.addChatMessage(`[Party] Pemain terputus dari room.`, '#ef4444');
    });
  }

  handleOutgoingConnection(conn) {
    conn.send({
      type: 'JOIN_REQUEST',
      name: this.playerName,
      heroClass: this.heroClass
    });

    // If voice mic is on, initiate voice call
    if (this.game.voice && this.game.voice.isMicOn) {
      this.game.voice.broadcastVoiceToParty();
    }
  }

  handleIncomingConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      console.log('[Network] Peer joined:', conn.peer);
      
      conn.send({
        type: 'ROOM_WELCOME',
        hostName: this.playerName,
        zone: this.game.currentZone
      });
    });

    conn.on('data', (data) => {
      this.handlePacket(data, conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.partyMembers.delete(conn.peer);
      this.game.removeRemotePlayer(conn.peer);
      this.updatePartyUI();
    });
  }

  broadcast(packet) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(packet);
      }
    });
  }

  handlePacket(data, senderPeerId) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'JOIN_REQUEST':
        this.partyMembers.set(senderPeerId, {
          id: senderPeerId,
          name: data.name,
          heroClass: data.heroClass,
          hp: 1000,
          maxHp: 1000,
          level: 1
        });
        this.game.spawnRemotePlayer(senderPeerId, data.name, data.heroClass);
        this.updatePartyUI();
        this.game.ui.addChatMessage(`[Server] ${data.name} (${data.heroClass}) masuk ke server!`, '#a855f7');
        
        this.broadcast({
          type: 'PARTY_UPDATE',
          members: Array.from(this.partyMembers.values())
        });
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

      case 'PVP_START':
        this.game.startPvP(data.mode, false);
        break;

      case 'CHAT':
        this.game.ui.addChatMessage(`[${data.sender}]: ${data.message}`, '#ffffff');
        break;

      case 'ENEMY_HIT':
        this.game.applyEnemyDamage(data.enemyId, data.damage, data.isCrit, false);
        break;
    }
  }

  updatePartyUI() {
    const listEl = document.getElementById('party-members-list-modal');
    const hudListEl = document.getElementById('party-hud-list');
    const countBadge = document.getElementById('party-count-badge');
    
    const count = this.partyMembers.size;
    if (countBadge) countBadge.textContent = `${count} Players`;

    if (listEl) {
      let html = '';
      this.partyMembers.forEach(m => {
        html += `
          <div class="hud-panel flex items-center justify-between" style="padding: 8px 12px; margin-bottom: 4px;">
            <div class="flex items-center gap-2">
              <span class="text-xl">${m.heroClass === 'warrior' ? '⚔️' : m.heroClass === 'sorceress' ? '🔮' : m.heroClass === 'archer' ? '🏹' : '🛡️'}</span>
              <div>
                <div class="font-bold text-xs text-amber-300">${m.name} ${m.isLeader ? '👑' : ''}</div>
                <div class="text-[10px] text-neutral-400 capitalize">${m.heroClass} (Lv.${m.level || 1})</div>
              </div>
            </div>
            <span class="text-xs text-emerald-400 font-bold">Online</span>
          </div>
        `;
      });
      listEl.innerHTML = html;
    }

    if (hudListEl) {
      let hudHtml = '';
      this.partyMembers.forEach(m => {
        if (m.id !== this.myPeerId && m.id !== 'local_player') {
          hudHtml += `
            <div class="hud-panel flex items-center gap-2 text-xs" style="padding: 6px 10px; margin-bottom: 4px;">
              <span class="text-sm">${m.heroClass === 'warrior' ? '⚔️' : m.heroClass === 'sorceress' ? '🔮' : m.heroClass === 'archer' ? '🏹' : '🛡️'}</span>
              <div style="width: 90px;">
                <div class="flex justify-between text-[10px] font-bold text-amber-200">
                  <span class="truncate">${m.name}</span>
                  <span>100%</span>
                </div>
                <div style="width: 100%; height: 6px; background: #111; border-radius: 9999px; overflow: hidden; border: 1px solid #7f1d1d;">
                  <div style="height: 100%; width: 100%; background: linear-gradient(90deg, #dc2626, #f59e0b); border-radius: 9999px;"></div>
                </div>
              </div>
            </div>
          `;
        }
      });
      hudListEl.innerHTML = hudHtml;
    }
  }
}
