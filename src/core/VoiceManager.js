// WebRTC Real-Time Voice Chat Engine for P2P Party Audio

export class VoiceManager {
  constructor(game) {
    this.game = game;
    this.localStream = null;
    this.isMicOn = false;
    this.isDeafened = false;
    this.audioContext = null;
    this.analyser = null;
    this.isSpeaking = false;
    this.peerMediaCalls = new Map(); // peerId -> MediaConnection
  }

  async toggleMic() {
    if (!this.isMicOn) {
      // Turn Mic ON
      try {
        if (!this.localStream) {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false
          });
          this.setupSpeakingDetector();
        } else {
          this.localStream.getAudioTracks().forEach(track => track.enabled = true);
        }

        this.isMicOn = true;
        this.broadcastVoiceToParty();
        this.updateMicUI();
        this.game.ui.addChatMessage('🎙️ Microphone AKTIF! Rekan party dapat mendengar suara Anda.', '#34d399');
        return true;
      } catch (err) {
        console.error('[Voice] Error accessing microphone:', err);
        this.game.ui.addChatMessage('⚠️ Gagal mengakses Mikrofon. Pastikan izin mic diizinkan di browser!', '#ef4444');
        this.isMicOn = false;
        this.updateMicUI();
        return false;
      }
    } else {
      // Turn Mic OFF
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => track.enabled = false);
      }
      this.isMicOn = false;
      this.isSpeaking = false;
      this.updateMicUI();
      this.game.ui.addChatMessage('🔇 Microphone DINONAKTIFKAN (Mute).', '#fbbf24');
      return false;
    }
  }

  setupSpeakingDetector() {
    if (!this.localStream) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const buffer = new Uint8Array(this.analyser.frequencyBinCount);
      const checkVolume = () => {
        if (this.isMicOn && this.analyser) {
          this.analyser.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          const wasSpeaking = this.isSpeaking;
          this.isSpeaking = avg > 18; // speaking threshold

          if (this.isSpeaking !== wasSpeaking) {
            const micBtn = document.getElementById('btn-mic-toggle');
            if (micBtn) {
              if (this.isSpeaking) {
                micBtn.style.boxShadow = '0 0 15px #10b981, inset 0 0 8px #34d399';
              } else {
                micBtn.style.boxShadow = 'none';
              }
            }
          }
        }
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn('[Voice] Speaking detector init warning:', e);
    }
  }

  broadcastVoiceToParty() {
    if (!this.localStream || !this.game.network.peer) return;

    this.game.network.connections.forEach((conn, peerId) => {
      if (!this.peerMediaCalls.has(peerId)) {
        console.log('[Voice] Calling peer for voice stream:', peerId);
        const call = this.game.network.peer.call(peerId, this.localStream);
        if (call) {
          this.handleIncomingStream(call, peerId);
          this.peerMediaCalls.set(peerId, call);
        }
      }
    });
  }

  handleIncomingCall(call) {
    console.log('[Voice] Incoming voice call from:', call.peer);
    // Answer call with local stream (or empty stream if mic is muted)
    call.answer(this.localStream || null);
    this.handleIncomingStream(call, call.peer);
    this.peerMediaCalls.set(call.peer, call);
  }

  handleIncomingStream(call, peerId) {
    call.on('stream', (remoteStream) => {
      console.log('[Voice] Receiving audio stream from peer:', peerId);
      let audioEl = document.getElementById(`audio-peer-${peerId}`);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `audio-peer-${peerId}`;
        audioEl.autoplay = true;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
      }
      audioEl.srcObject = remoteStream;
      audioEl.play().catch(e => console.log('[Voice] Audio autoplay:', e));

      this.game.ui.addChatMessage(`🔊 Terhubung ke Voice Chat dengan rekan party!`, '#34d399');
    });

    call.on('close', () => {
      const audioEl = document.getElementById(`audio-peer-${peerId}`);
      if (audioEl) audioEl.remove();
      this.peerMediaCalls.delete(peerId);
    });
  }

  updateMicUI() {
    const micBtn = document.getElementById('btn-mic-toggle');
    const micIcon = document.getElementById('mic-icon');
    const micText = document.getElementById('mic-text');

    if (micBtn && micIcon) {
      if (this.isMicOn) {
        micBtn.style.background = 'rgba(5, 150, 105, 0.85)';
        micBtn.style.borderColor = '#34d399';
        micBtn.style.color = '#ecfdf5';
        micIcon.textContent = '🎙️';
        if (micText) micText.textContent = 'Mic ON';
      } else {
        micBtn.style.background = 'rgba(24, 24, 27, 0.8)';
        micBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        micBtn.style.color = '#d4d4d8';
        micIcon.textContent = '🔇';
        if (micText) micText.textContent = 'Mic OFF';
      }
    }
  }
}
