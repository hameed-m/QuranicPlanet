/**
 * character.js — The "Noor" (نور) Player Character
 * ===================================================
 * A glowing sphere of divine light that explores the Quranic world.
 * Culturally respectful: no human depiction — just radiant light.
 *
 * Features:
 *  - Glowing icosahedron core + outer glow ring
 *  - Particle trail that follows movement
 *  - Point light that illuminates nearby Ayat
 *  - WASD movement relative to camera direction
 *  - Third-person orbit camera (mouse drag to rotate)
 *  - Smooth spring-physics follow camera
 */

import * as THREE from 'three';

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════════ */

const CHAR_HEIGHT = 1.2;       // how high Noor floats above ground
const CAM_DEFAULT_DIST = 12;   // default camera distance
const CAM_MIN_DIST = 4;
const CAM_MAX_DIST = 40;
const CAM_PITCH_MIN = 0.05;    // nearly horizontal
const CAM_PITCH_MAX = Math.PI / 2 - 0.05; // nearly overhead
const CAM_SMOOTH = 0.08;       // camera lerp factor
const MOUSE_SENSITIVITY = 0.003;

/** Base walk speed (units/sec). Vehicles multiply this. */
export const BASE_SPEED = 8;

/* ══════════════════════════════════════════════════════════════════
   GLOW SHADER — Fresnel-based outer aura
   ══════════════════════════════════════════════════════════════════ */

const GLOW_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const GLOW_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = 1.0 - dot(vNormal, vViewDir);
    fresnel = pow(fresnel, 3.0) * uIntensity;
    gl_FragColor = vec4(uColor, fresnel * 0.7);
  }
`;

/* ══════════════════════════════════════════════════════════════════
   CHARACTER CONTROLLER
   ══════════════════════════════════════════════════════════════════ */

export class CharacterController {
  /**
   * @param {THREE.Scene} scene — The 3D scene to add the character to
   * @param {THREE.Camera} camera — The perspective camera to control
   * @param {HTMLElement} domElement — The canvas element for mouse events
   */
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    // ── State ───────────────────────────────────────────────
    this.position = new THREE.Vector3(0, CHAR_HEIGHT, 0);
    this.velocity = new THREE.Vector3();
    this.speedMultiplier = 1.0; // changed by vehicles

    // ── Camera orbit ────────────────────────────────────────
    this._yaw = 0;            // horizontal angle (radians)
    this._pitch = 0.5;        // vertical angle (radians)
    this._distance = CAM_DEFAULT_DIST;
    this._camPos = new THREE.Vector3(); // current smooth position
    this._camTarget = new THREE.Vector3(); // target position

    // ── Input state ─────────────────────────────────────────
    this._keys = {};
    this._mouseDown = false;
    this._mouseBtn = -1;
    this._lastMouse = { x: 0, y: 0 };
    this.enabled = false;

    // ── Visual meshes ───────────────────────────────────────
    this._group = new THREE.Group();
    this._createNoorOrb();
    this._createParticleTrail();
    this._createPointLight();
    scene.add(this._group);

    // ── Bind event handlers ─────────────────────────────────
    this._boundKeyDown = (e) => this._onKeyDown(e);
    this._boundKeyUp = (e) => this._onKeyUp(e);
    this._boundMouseDown = (e) => this._onMouseDown(e);
    this._boundMouseUp = (e) => this._onMouseUp(e);
    this._boundMouseMove = (e) => this._onMouseMove(e);
    this._boundWheel = (e) => this._onWheel(e);
    this._boundContext = (e) => e.preventDefault();
  }

  /* ── Enable / Disable controls ──────────────────────────── */

  enable() {
    this.enabled = true;
    this._keys = {};
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    this.domElement.addEventListener('mousedown', this._boundMouseDown);
    window.addEventListener('mouseup', this._boundMouseUp);
    window.addEventListener('mousemove', this._boundMouseMove);
    this.domElement.addEventListener('wheel', this._boundWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this._boundContext);
  }

  disable() {
    this.enabled = false;
    this._keys = {};
    this._mouseDown = false;
    window.removeEventListener('keydown', this._boundKeyDown);
    window.removeEventListener('keyup', this._boundKeyUp);
    this.domElement.removeEventListener('mousedown', this._boundMouseDown);
    window.removeEventListener('mouseup', this._boundMouseUp);
    window.removeEventListener('mousemove', this._boundMouseMove);
    this.domElement.removeEventListener('wheel', this._boundWheel);
    this.domElement.removeEventListener('contextmenu', this._boundContext);
  }

  /* ── Visual creation ─────────────────────────────────────── */

  _createNoorOrb() {
    // Core sphere — bright emissive gold
    const coreGeo = new THREE.IcosahedronGeometry(0.35, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      emissive: 0xFFD700,
      emissiveIntensity: 1.2,
      metalness: 0.3,
      roughness: 0.1,
    });
    this._core = new THREE.Mesh(coreGeo, coreMat);
    this._group.add(this._core);

    // Outer glow — Fresnel shader
    const glowGeo = new THREE.IcosahedronGeometry(0.7, 3);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xFFD700) },
        uIntensity: { value: 2.0 },
      },
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    this._glow = new THREE.Mesh(glowGeo, glowMat);
    this._group.add(this._glow);

    // Outer ring — flat torus
    const ringGeo = new THREE.TorusGeometry(0.6, 0.04, 8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFD700,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.5,
    });
    this._ring = new THREE.Mesh(ringGeo, ringMat);
    this._ring.rotation.x = Math.PI / 2;
    this._group.add(this._ring);
  }

  _createParticleTrail() {
    const count = 60;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 1] = -Math.random() * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xFFD700,
      size: 0.12,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._trail = new THREE.Points(geo, mat);
    this._group.add(this._trail);
  }

  _createPointLight() {
    this._light = new THREE.PointLight(0xFFD700, 2, 15, 2);
    this._light.position.set(0, 0.5, 0);
    this._group.add(this._light);
  }

  /* ── Per-frame update ────────────────────────────────────── */

  update(dt) {
    if (!this.enabled) return;

    const t = performance.now() * 0.001;

    // ── Movement ──────────────────────────────────────────
    const speed = BASE_SPEED * this.speedMultiplier * dt;

    // Forward direction from camera (projected onto XZ plane)
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    if (this._keys['KeyW'] || this._keys['ArrowUp'])    move.add(forward);
    if (this._keys['KeyS'] || this._keys['ArrowDown'])  move.sub(forward);
    if (this._keys['KeyD'] || this._keys['ArrowRight']) move.add(right);
    if (this._keys['KeyA'] || this._keys['ArrowLeft'])  move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      // Boost
      if (this._keys['ShiftLeft'] || this._keys['ShiftRight']) {
        move.multiplyScalar(1.8);
      }
      this.position.add(move);
    }

    // Gentle float on Y axis
    this.position.y = CHAR_HEIGHT + Math.sin(t * 2) * 0.15;

    // Clamp to terrain bounds
    const halfTerrain = 140;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -halfTerrain, halfTerrain);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -halfTerrain, halfTerrain);

    // ── Update group position ─────────────────────────────
    this._group.position.copy(this.position);

    // ── Animate visuals ───────────────────────────────────
    this._core.rotation.y = t * 1.5;
    this._core.rotation.x = Math.sin(t) * 0.3;
    this._glow.rotation.y = -t * 0.8;
    this._glow.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    this._ring.rotation.z = t * 0.6;
    this._light.intensity = 2 + Math.sin(t * 4) * 0.5;

    // Trail particles drift downward
    const arr = this._trail.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= dt * 1.5;
      if (arr[i + 1] < -3) {
        arr[i]     = (Math.random() - 0.5) * 0.3;
        arr[i + 1] = 0;
        arr[i + 2] = (Math.random() - 0.5) * 0.3;
      }
    }
    this._trail.geometry.attributes.position.needsUpdate = true;

    // ── Camera follow ─────────────────────────────────────
    this._updateCamera();
  }

  /* ── Camera orbit calculation ────────────────────────────── */

  _updateCamera() {
    // Spherical offset from character
    const offset = new THREE.Vector3(
      Math.sin(this._yaw) * Math.cos(this._pitch) * this._distance,
      Math.sin(this._pitch) * this._distance,
      Math.cos(this._yaw) * Math.cos(this._pitch) * this._distance
    );

    this._camTarget.copy(this.position).add(offset);

    // Smooth lerp
    this._camPos.lerp(this._camTarget, CAM_SMOOTH + 0.05);
    this.camera.position.copy(this._camPos);

    // Look at character (slightly above center)
    const lookTarget = this.position.clone();
    lookTarget.y += 0.5;
    this.camera.lookAt(lookTarget);
  }

  /* ── Input handlers ──────────────────────────────────────── */

  _onKeyDown(e) {
    if (!this.enabled) return;
    this._keys[e.code] = true;
  }

  _onKeyUp(e) {
    if (!this.enabled) return;
    this._keys[e.code] = false;
  }

  _onMouseDown(e) {
    if (!this.enabled) return;
    this._mouseDown = true;
    this._mouseBtn = e.button;
    this._lastMouse.x = e.clientX;
    this._lastMouse.y = e.clientY;
  }

  _onMouseUp() {
    this._mouseDown = false;
    this._mouseBtn = -1;
  }

  _onMouseMove(e) {
    if (!this.enabled || !this._mouseDown) return;

    const dx = e.clientX - this._lastMouse.x;
    const dy = e.clientY - this._lastMouse.y;
    this._lastMouse.x = e.clientX;
    this._lastMouse.y = e.clientY;

    // Orbit camera (any mouse button)
    this._yaw -= dx * MOUSE_SENSITIVITY;
    this._pitch += dy * MOUSE_SENSITIVITY;
    this._pitch = THREE.MathUtils.clamp(this._pitch, CAM_PITCH_MIN, CAM_PITCH_MAX);
  }

  _onWheel(e) {
    if (!this.enabled) return;
    e.preventDefault();
    this._distance += e.deltaY * 0.02;
    this._distance = THREE.MathUtils.clamp(this._distance, CAM_MIN_DIST, CAM_MAX_DIST);
  }

  /* ── Public API ──────────────────────────────────────────── */

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this._group.position.copy(this.position);
    // Snap camera instantly
    this._camPos.copy(this.position).add(
      new THREE.Vector3(0, this._distance * 0.6, this._distance)
    );
  }

  getGroup() {
    return this._group;
  }

  dispose() {
    this.disable();
    this._group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    this.scene.remove(this._group);
  }
}
