import * as THREE from 'three';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0d14);
    this.scene.fog = new THREE.FogExp2(0x0c0d14, 0.015);

    // Renderer with shadow maps
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.cameraTarget = new THREE.Vector3();
    this.cameraOffset = new THREE.Vector3(0, 5, 8.5);
    this.cameraRotationAngle = 0; // Horizontal rotation angle (controlled by mouse/joystick)
    this.cameraPitch = 0.4; // Vertical pitch

    // Lighting
    this.setupLighting();

    // Particle Systems Pool
    this.particles = [];
    this.slashTrails = [];
    
    // Screen Shake state
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;
    this.shakeOffset = new THREE.Vector3();

    // Window resize handler
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xdbeafe, 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    this.sunLight.position.set(25, 45, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 120;
    const d = 40;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Accent Rim / Dungeon Light
    this.pointLight = new THREE.PointLight(0xf59e0b, 2, 30);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.pointLight);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  triggerScreenShake(intensity = 0.4) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  // PARTICLE EMITTER SYSTEM
  spawnImpactParticles(position, color = 0xfbbf24, count = 16, size = 0.25) {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y + 0.8;
      positions[i * 3 + 2] = position.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      const up = Math.random() * 5 + 1;
      velocities.push(new THREE.Vector3(Math.cos(angle) * speed, up, Math.sin(angle) * speed));
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: color,
      size: size,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geom, mat);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities: velocities,
      life: 0.45,
      maxLife: 0.45
    });
  }

  spawnSlashArc(position, rotationY, color = 0x38bdf8, scale = 1.5) {
    const shape = new THREE.RingGeometry(1.2 * scale, 1.8 * scale, 16, 1, 0, Math.PI * 0.8);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(shape, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.z = -rotationY - Math.PI * 0.4;
    mesh.position.copy(position);
    mesh.position.y += 1.0;
    this.scene.add(mesh);

    this.slashTrails.push({
      mesh: mesh,
      life: 0.2,
      maxLife: 0.2
    });
  }

  spawnTelegraphCircle(position, radius = 5, duration = 1.5, color = 0xef4444) {
    const ringGeom = new THREE.RingGeometry(0.1, radius, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    const mesh = new THREE.Mesh(ringGeom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.05, position.z);
    this.scene.add(mesh);

    this.particles.push({
      mesh: mesh,
      isTelegraph: true,
      radius: radius,
      life: duration,
      maxLife: duration
    });
  }

  update(dt, targetPosition) {
    // 1. Update Camera Position with smooth third person orbit
    if (targetPosition) {
      this.cameraTarget.lerp(targetPosition, dt * 8);

      const rad = this.cameraRotationAngle;
      const dist = 7.5;
      const cx = this.cameraTarget.x + Math.sin(rad) * dist;
      const cz = this.cameraTarget.z + Math.cos(rad) * dist;
      const cy = this.cameraTarget.y + 3.8 + this.cameraPitch * 2;

      // Screen Shake
      if (this.shakeIntensity > 0.01) {
        this.shakeOffset.set(
          (Math.random() - 0.5) * this.shakeIntensity,
          (Math.random() - 0.5) * this.shakeIntensity,
          (Math.random() - 0.5) * this.shakeIntensity
        );
        this.shakeIntensity *= this.shakeDecay;
      } else {
        this.shakeOffset.set(0, 0, 0);
      }

      this.camera.position.set(cx + this.shakeOffset.x, cy + this.shakeOffset.y, cz + this.shakeOffset.z);
      this.camera.lookAt(this.cameraTarget.x, this.cameraTarget.y + 1.2, this.cameraTarget.z);

      // Point light follows player
      this.pointLight.position.set(targetPosition.x, targetPosition.y + 3, targetPosition.z);
      this.sunLight.position.set(targetPosition.x + 25, targetPosition.y + 45, targetPosition.z + 20);
      this.sunLight.target.position.copy(targetPosition);
      this.sunLight.target.updateMatrixWorld();
    }

    // 2. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      const progress = p.life / p.maxLife;

      if (p.isTelegraph) {
        p.mesh.material.opacity = 0.2 + (1 - progress) * 0.5;
        p.mesh.scale.setScalar(0.2 + (1 - progress) * 0.8);
      } else if (p.velocities) {
        const posAttr = p.mesh.geometry.attributes.position;
        for (let j = 0; j < p.velocities.length; j++) {
          const vel = p.velocities[j];
          vel.y -= 9.8 * dt; // gravity
          posAttr.array[j * 3] += vel.x * dt;
          posAttr.array[j * 3 + 1] += vel.y * dt;
          posAttr.array[j * 3 + 2] += vel.z * dt;
        }
        posAttr.needsUpdate = true;
        p.mesh.material.opacity = Math.max(0, progress);
      }

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    // 3. Update Slash Trails
    for (let i = this.slashTrails.length - 1; i >= 0; i--) {
      const trail = this.slashTrails[i];
      trail.life -= dt;
      trail.mesh.material.opacity = (trail.life / trail.maxLife) * 0.9;
      trail.mesh.scale.multiplyScalar(1 + dt * 2);

      if (trail.life <= 0) {
        this.scene.remove(trail.mesh);
        trail.mesh.geometry.dispose();
        trail.mesh.material.dispose();
        this.slashTrails.splice(i, 1);
      }
    }

    // 4. Render
    this.renderer.render(this.scene, this.camera);
  }

  // Convert 3D world position to 2D Screen space (for floating damage text)
  toScreenPosition(worldPos) {
    const vector = worldPos.clone();
    vector.project(this.camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

    return { x, y, visible: vector.z < 1 };
  }
}
