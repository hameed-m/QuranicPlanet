/**
 * world3d.js — Three.js 3D World for Quranic Planet
 * ===================================================
 * Manages the 3D scene: sky, terrain, lighting, landmarks, particles.
 * Each Surah has a unique biome/weather that drives the visual atmosphere.
 */

import * as THREE from 'three';
import { AyatTerrain } from './ayat-terrain.js';

/* ══════════════════════════════════════════════════════════════════
   SKY PRESETS — Maps weather types to visual atmosphere
   ══════════════════════════════════════════════════════════════════ */

const SKY_PRESETS = {
  celestial_glow:   { top: '#0A0E2A', bottom: '#1A1A3E', fog: '#0D0D2E', sun: '#FFD700', sunInt: 0.5, amb: '#2A2A5E', ambInt: 0.5 },
  hot_desert:       { top: '#87CEEB', bottom: '#F5D6A0', fog: '#E8D5B0', sun: '#FFF8E0', sunInt: 1.4, amb: '#D4AA60', ambInt: 0.5 },
  temperate:        { top: '#6BB3E0', bottom: '#A8D5A0', fog: '#B0D0A8', sun: '#FFFEF0', sunInt: 1.0, amb: '#80A080', ambInt: 0.5 },
  stormy:           { top: '#1A1A2E', bottom: '#2E2E4E', fog: '#252540', sun: '#8888AA', sunInt: 0.3, amb: '#404060', ambInt: 0.3 },
  snowy:            { top: '#C0D0E0', bottom: '#E8E8F0', fog: '#D0D0E0', sun: '#E0E0FF', sunInt: 0.6, amb: '#A0A0C0', ambInt: 0.6 },
  mystical_fog:     { top: '#2A3A4A', bottom: '#4A5A6A', fog: '#3A4A5A', sun: '#B0C0D0', sunInt: 0.4, amb: '#5A6A7A', ambInt: 0.5 },
  perpetual_spring: { top: '#7BC8F0', bottom: '#90E090', fog: '#A0D8A0', sun: '#FFFEF0', sunInt: 1.1, amb: '#80C080', ambInt: 0.6 },
  sacred_night:     { top: '#050520', bottom: '#0A1040', fog: '#080830', sun: '#C0C0FF', sunInt: 0.1, amb: '#1A1A4A', ambInt: 0.3 },
  volcanic:         { top: '#1A0A0A', bottom: '#4A1A0A', fog: '#2A0A0A', sun: '#FF4400', sunInt: 0.8, amb: '#6A2A0A', ambInt: 0.4 },
  golden_hour:      { top: '#F0A030', bottom: '#FFD070', fog: '#E8C060', sun: '#FFD700', sunInt: 1.2, amb: '#D4A040', ambInt: 0.6 },
  cosmic:           { top: '#020210', bottom: '#0A0A30', fog: '#050520', sun: '#8080FF', sunInt: 0.2, amb: '#202060', ambInt: 0.3 },
  rainy:            { top: '#404050', bottom: '#606070', fog: '#505060', sun: '#909090', sunInt: 0.3, amb: '#505060', ambInt: 0.4 },
  windy:            { top: '#7090B0', bottom: '#A0B0C0', fog: '#8098B0', sun: '#E0E0F0', sunInt: 0.8, amb: '#8098B0', ambInt: 0.5 },
  serene:           { top: '#6BB3E0', bottom: '#B0D0B0', fog: '#A0C8A0', sun: '#FFFEF0', sunInt: 0.9, amb: '#90B090', ambInt: 0.5 },
  thunderous:       { top: '#0A0A1E', bottom: '#1E1E3E', fog: '#141430', sun: '#6060AA', sunInt: 0.2, amb: '#303060', ambInt: 0.3 },
  lunar:            { top: '#050515', bottom: '#101030', fog: '#080820', sun: '#D0D0FF', sunInt: 0.15, amb: '#1A1A40', ambInt: 0.25 },
  solar:            { top: '#4A8AC0', bottom: '#FFE0A0', fog: '#E0D0A0', sun: '#FFEE80', sunInt: 1.5, amb: '#C0A060', ambInt: 0.6 },
  dawn:             { top: '#FF8040', bottom: '#FFB080', fog: '#E0A070', sun: '#FF9050', sunInt: 0.8, amb: '#C08060', ambInt: 0.5 },
  twilight:         { top: '#2A1A5A', bottom: '#8A4A8A', fog: '#5A3A6A', sun: '#FF6080', sunInt: 0.4, amb: '#6A3A6A', ambInt: 0.4 },
  calm_waters:      { top: '#60A0D0', bottom: '#80B0A0', fog: '#70A8B0', sun: '#E0F0FF', sunInt: 0.8, amb: '#6090A0', ambInt: 0.5 },
  crisp_mountain:   { top: '#4080C0', bottom: '#8AB0D0', fog: '#70A0C0', sun: '#F0F0FF', sunInt: 0.9, amb: '#6090B0', ambInt: 0.5 },
};

/* ══════════════════════════════════════════════════════════════════
   GRADIENT SKY SHADER
   ══════════════════════════════════════════════════════════════════ */

const SKY_VERTEX = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  varying vec3 vWorldPos;
  void main() {
    float h = normalize(vWorldPos).y;
    float t = max(pow(max(h, 0.0), 0.6), 0.0);
    gl_FragColor = vec4(mix(uBottom, uTop, t), 1.0);
  }
`;

/* ══════════════════════════════════════════════════════════════════
   WORLD3D CLASS
   ══════════════════════════════════════════════════════════════════ */

export class World3D {
  constructor(container) {
    /** @type {HTMLElement} */
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.webgl = null;
    this.ayatTerrain = null;
    this.currentSura = null;
    this._clock = new THREE.Clock();
    this._disposed = false;

    this._init();
  }

  /* ── Initialization ──────────────────────────────────────────── */

  _init() {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 12000);
    this.camera.position.set(0, 200, 0); // start high for drop-in

    // WebGL Renderer
    this.webgl = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.webgl.setSize(this.container.clientWidth, this.container.clientHeight);
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.0;
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.webgl.domElement);

    // Ayat terrain renderer
    this.ayatTerrain = new AyatTerrain(this.scene);

    // Resize
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
  }

  /* ── Load a Surah's world ───────────────────────────────────── */

  async loadSura(sura) {
    this.currentSura = sura;
    this._clearScene();

    const weather = sura.weather || 'serene';
    const preset = SKY_PRESETS[weather] || SKY_PRESETS.serene;

    // Sky dome
    this._createSky(preset);

    // Fog
    this.scene.fog = new THREE.FogExp2(new THREE.Color(preset.fog).getHex(), 0.004);

    // Lighting
    this._setupLighting(preset, sura);

    // Stars for night/cosmic weathers
    if (['sacred_night', 'cosmic', 'lunar', 'celestial_glow'].includes(weather)) {
      this._createStars();
    }

    // Ground terrain with Ayat
    await this.ayatTerrain.loadAyat(sura);

    // Landmarks
    this._placeLandmarks(sura);

    // Ambient particles
    this._createAmbientParticles(sura);
  }

  /* ── Sky ─────────────────────────────────────────────────────── */

  _createSky(preset) {
    const geo = new THREE.SphereGeometry(5000, 32, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTop:    { value: new THREE.Color(preset.top) },
        uBottom: { value: new THREE.Color(preset.bottom) },
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.userData.tag = 'sky';
    this.scene.add(sky);
  }

  /* ── Lighting ────────────────────────────────────────────────── */

  _setupLighting(preset, sura) {
    // Ambient
    this.scene.add(new THREE.AmbientLight(
      new THREE.Color(preset.amb).getHex(),
      preset.ambInt
    ));

    // Hemisphere (sky + ground bounce)
    this.scene.add(new THREE.HemisphereLight(
      new THREE.Color(preset.top).getHex(),
      new THREE.Color(preset.bottom).getHex(),
      0.3
    ));

    // Directional sun/moon
    const sun = new THREE.DirectionalLight(
      new THREE.Color(preset.sun).getHex(),
      preset.sunInt
    );
    sun.position.set(80, 120, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    this.scene.add(sun);
  }

  /* ── Stars (night skies) ─────────────────────────────────────── */

  _createStars() {
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4500 + Math.random() * 400;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.8,
    });
    const stars = new THREE.Points(geo, mat);
    stars.userData.tag = 'stars';
    this.scene.add(stars);
  }

  /* ── Landmarks ───────────────────────────────────────────────── */

  _placeLandmarks(sura) {
    const names = sura.landmarks || [];
    if (!names.length) return;

    const primary = new THREE.Color(sura.colorPrimary || '#D4AF37');

    for (let i = 0; i < names.length; i++) {
      const angle = (i / names.length) * Math.PI * 2 + 0.5;
      const r = 35 + (i % 3) * 20;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const h = 6 + (i % 4) * 2;

      // Pillar
      const pillarGeo = new THREE.CylinderGeometry(0.4, 0.7, h, 8);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: primary,
        emissive: primary,
        emissiveIntensity: 0.25,
        metalness: 0.9,
        roughness: 0.15,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, h / 2, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);

      // Glow orb on top
      const orbGeo = new THREE.IcosahedronGeometry(0.6, 2);
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: primary,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(x, h + 0.8, z);
      orb.userData.tag = 'landmark-orb';
      orb.userData.baseY = h + 0.8;
      this.scene.add(orb);

      // Point light
      const light = new THREE.PointLight(primary.getHex(), 1.5, 25, 2);
      light.position.set(x, h + 1.5, z);
      this.scene.add(light);

      // Floating text label (sprite)
      const label = this._createTextSprite(names[i], '#FFD700');
      label.position.set(x, h + 3.5, z);
      label.scale.set(12, 3, 1);
      this.scene.add(label);
    }
  }

  _createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = 'bold 36px Inter, Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    return new THREE.Sprite(mat);
  }

  /* ── Ambient particles ───────────────────────────────────────── */

  _createAmbientParticles(sura) {
    const count = 250;
    const pos = new Float32Array(count * 3);
    const col = new THREE.Color(sura.colorPrimary || '#FFD700');

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 250;
      pos[i * 3 + 1] = Math.random() * 30 + 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 250;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: col,
      size: 0.35,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pts = new THREE.Points(geo, mat);
    pts.userData.tag = 'ambient';
    this.scene.add(pts);
  }

  /* ── Per-frame update ────────────────────────────────────────── */

  update(dt) {
    if (this._disposed) return;
    const t = performance.now() * 0.001;

    // Bobbing landmark orbs
    this.scene.traverse(obj => {
      if (obj.userData.tag === 'landmark-orb') {
        obj.position.y = obj.userData.baseY + Math.sin(t * 2 + obj.position.x) * 0.3;
        obj.rotation.y = t * 0.5;
      }
    });

    // Drift ambient particles
    this.scene.traverse(obj => {
      if (obj.userData.tag === 'ambient') {
        const arr = obj.geometry.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i]     += Math.cos(t * 0.4 + i) * 0.005;
          arr[i + 1] += Math.sin(t * 0.3 + i * 0.7) * 0.003;
          arr[i + 2] += Math.sin(t * 0.5 + i * 0.3) * 0.005;
        }
        obj.geometry.attributes.position.needsUpdate = true;
      }
    });

    // Render
    this.webgl.render(this.scene, this.camera);
  }

  /* ── Resize ──────────────────────────────────────────────────── */

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.webgl.setSize(w, h);
  }

  /* ── Cleanup ─────────────────────────────────────────────────── */

  _clearScene() {
    const dispose = (obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    };
    while (this.scene.children.length) {
      const c = this.scene.children[0];
      c.traverse(dispose);
      this.scene.remove(c);
    }
  }

  dispose() {
    this._disposed = true;
    window.removeEventListener('resize', this._onResize);
    this._clearScene();
    this.webgl.dispose();
    this.webgl.domElement.remove();
  }
}
