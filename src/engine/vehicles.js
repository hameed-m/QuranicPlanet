/**
 * vehicles.js — Vehicle System for Quranic Planet
 * ==================================================
 * Manage different transportation modes:
 *  - Walking (default) — just the Noor orb
 *  - Bicycle — wireframe frame + wheels, 2× speed
 *  - Motorbike — solid frame + exhaust particles, 3.5× speed
 *  - Boat — hull mesh + water wake, 2.5× speed (ocean only)
 *
 * Vehicles are simple geometric meshes that appear around the Noor orb.
 * Press 1/2/3 to switch. Each has distinct visual and speed.
 */

import * as THREE from 'three';
import { BASE_SPEED } from './character.js';

/* ══════════════════════════════════════════════════════════════════
   VEHICLE DEFINITIONS
   ══════════════════════════════════════════════════════════════════ */

/** @typedef {'walk'|'bicycle'|'motorbike'|'boat'} VehicleType */

const VEHICLES = {
  walk:      { speed: 1.0,  label: 'Walking',   icon: '🚶', key: '0' },
  bicycle:   { speed: 2.0,  label: 'Bicycle',   icon: '🚲', key: '1' },
  motorbike: { speed: 3.5,  label: 'Motorbike', icon: '🏍️', key: '2' },
  boat:      { speed: 2.5,  label: 'Boat',      icon: '🚣', key: '3' },
};

/* ══════════════════════════════════════════════════════════════════
   VEHICLE MESH BUILDERS
   ══════════════════════════════════════════════════════════════════ */

function createBicycleMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xC0C0C0,
    metalness: 0.8,
    roughness: 0.2,
    wireframe: true,
  });

  // Frame
  const frameGeo = new THREE.BoxGeometry(1.6, 0.06, 0.06);
  const frame = new THREE.Mesh(frameGeo, mat);
  frame.position.set(0, -0.3, 0);
  frame.rotation.z = -0.15;
  group.add(frame);

  // Seat post
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
  const post = new THREE.Mesh(postGeo, mat);
  post.position.set(-0.3, -0.05, 0);
  group.add(post);

  // Front wheel
  const wheelGeo = new THREE.TorusGeometry(0.3, 0.03, 8, 16);
  const frontWheel = new THREE.Mesh(wheelGeo, mat);
  frontWheel.position.set(0.7, -0.6, 0);
  frontWheel.userData.isWheel = true;
  group.add(frontWheel);

  // Back wheel
  const backWheel = new THREE.Mesh(wheelGeo, mat);
  backWheel.position.set(-0.7, -0.6, 0);
  backWheel.userData.isWheel = true;
  group.add(backWheel);

  // Handlebars
  const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6);
  const handle = new THREE.Mesh(handleGeo, mat);
  handle.position.set(0.6, -0.1, 0);
  handle.rotation.z = Math.PI / 2;
  group.add(handle);

  return group;
}

function createMotorbikeMesh() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2A2A3E,
    metalness: 0.7,
    roughness: 0.3,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xE0E0E0,
    metalness: 0.9,
    roughness: 0.1,
  });

  // Body
  const bodyGeo = new THREE.BoxGeometry(2.0, 0.4, 0.6);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, -0.4, 0);
  group.add(body);

  // Engine block
  const engineGeo = new THREE.BoxGeometry(0.5, 0.35, 0.5);
  const engine = new THREE.Mesh(engineGeo, chromeMat);
  engine.position.set(-0.2, -0.6, 0);
  group.add(engine);

  // Front wheel
  const wheelGeo = new THREE.TorusGeometry(0.35, 0.06, 8, 16);
  const frontWheel = new THREE.Mesh(wheelGeo, chromeMat);
  frontWheel.position.set(0.9, -0.7, 0);
  frontWheel.userData.isWheel = true;
  group.add(frontWheel);

  // Back wheel
  const backWheel = new THREE.Mesh(wheelGeo, chromeMat);
  backWheel.position.set(-0.9, -0.7, 0);
  backWheel.userData.isWheel = true;
  group.add(backWheel);

  // Exhaust pipe
  const exhaustGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.8, 6);
  const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaust.position.set(-0.8, -0.5, 0.3);
  exhaust.rotation.z = Math.PI / 2;
  group.add(exhaust);

  return group;
}

function createBoatMesh() {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8B6914,
    roughness: 0.7,
    metalness: 0.1,
  });

  // Hull — elongated box with tapered ends
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.5, 0);
  hullShape.quadraticCurveTo(-1.5, 0.5, -1.0, 0.5);
  hullShape.lineTo(1.0, 0.5);
  hullShape.quadraticCurveTo(1.5, 0.5, 1.5, 0);
  hullShape.quadraticCurveTo(1.5, -0.3, 1.0, -0.4);
  hullShape.lineTo(-1.0, -0.4);
  hullShape.quadraticCurveTo(-1.5, -0.3, -1.5, 0);

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.8,
    bevelEnabled: false,
  });
  const hull = new THREE.Mesh(hullGeo, woodMat);
  hull.position.set(0, -0.8, -0.4);
  hull.rotation.x = -Math.PI / 2;
  group.add(hull);

  // Mast
  const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 2, 6);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0xAA8855 });
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.set(0, 0.2, 0);
  group.add(mast);

  // Sail — triangle
  const sailGeo = new THREE.BufferGeometry();
  const verts = new Float32Array([
    0, 1.2, 0,    // top
    0, -0.6, 0,   // bottom
    0, -0.3, 0.8, // out
  ]);
  sailGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  sailGeo.computeVertexNormals();
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xFFF8E8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const sail = new THREE.Mesh(sailGeo, sailMat);
  sail.position.set(0, 0.2, 0);
  group.add(sail);

  return group;
}

/* ══════════════════════════════════════════════════════════════════
   EXHAUST PARTICLE SYSTEM (motorbike)
   ══════════════════════════════════════════════════════════════════ */

function createExhaustParticles() {
  const count = 30;
  const pos = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x888888,
    size: 0.15,
    transparent: true,
    opacity: 0.3,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.tag = 'exhaust';
  return pts;
}

/* ══════════════════════════════════════════════════════════════════
   VEHICLE MANAGER
   ══════════════════════════════════════════════════════════════════ */

export class VehicleManager {
  /**
   * @param {import('./character.js').CharacterController} character
   */
  constructor(character) {
    this.character = character;

    /** @type {VehicleType} */
    this.currentType = 'walk';

    /** The active vehicle mesh group (or null for walk). */
    this._activeMesh = null;

    /** Exhaust particles for motorbike. */
    this._exhaust = null;

    // Key listener for vehicle switching
    this._boundKeyDown = (e) => this._onKey(e);
  }

  enable() {
    window.addEventListener('keydown', this._boundKeyDown);
  }

  disable() {
    window.removeEventListener('keydown', this._boundKeyDown);
  }

  /* ── Switch vehicle ──────────────────────────────────────── */

  switchTo(type) {
    if (!VEHICLES[type] || type === this.currentType) return;

    // Remove current vehicle mesh
    this._removeMesh();

    this.currentType = type;
    this.character.speedMultiplier = VEHICLES[type].speed;

    // Create new vehicle mesh
    if (type === 'bicycle') {
      this._activeMesh = createBicycleMesh();
    } else if (type === 'motorbike') {
      this._activeMesh = createMotorbikeMesh();
      this._exhaust = createExhaustParticles();
      this._activeMesh.add(this._exhaust);
    } else if (type === 'boat') {
      this._activeMesh = createBoatMesh();
    }

    if (this._activeMesh) {
      this.character.getGroup().add(this._activeMesh);
    }

    // Dispatch event for UI
    document.dispatchEvent(new CustomEvent('vehicle-changed', {
      detail: { type, info: VEHICLES[type] }
    }));
  }

  /* ── Per-frame update ────────────────────────────────────── */

  update(dt) {
    const t = performance.now() * 0.001;

    if (!this._activeMesh) return;

    // Rotate wheels
    this._activeMesh.traverse(obj => {
      if (obj.userData.isWheel) {
        obj.rotation.x += dt * VEHICLES[this.currentType].speed * 8;
      }
    });

    // Motorbike exhaust particles
    if (this._exhaust && this.currentType === 'motorbike') {
      const arr = this._exhaust.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i]     += (Math.random() - 0.5) * 0.05;
        arr[i + 1] += dt * 0.5;
        arr[i + 2] -= dt * 2;
        if (arr[i + 2] < -3) {
          arr[i] = -0.8 + (Math.random() - 0.5) * 0.1;
          arr[i + 1] = -0.5 + (Math.random() - 0.5) * 0.1;
          arr[i + 2] = 0.3;
        }
      }
      this._exhaust.geometry.attributes.position.needsUpdate = true;
    }

    // Boat bobbing
    if (this.currentType === 'boat') {
      this._activeMesh.position.y = Math.sin(t * 2) * 0.1;
      this._activeMesh.rotation.z = Math.sin(t * 1.5) * 0.05;
    }
  }

  /* ── Internal helpers ────────────────────────────────────── */

  _removeMesh() {
    if (this._activeMesh) {
      this._activeMesh.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this.character.getGroup().remove(this._activeMesh);
      this._activeMesh = null;
      this._exhaust = null;
    }
  }

  _onKey(e) {
    if (e.code === 'Digit1') this.switchTo('bicycle');
    else if (e.code === 'Digit2') this.switchTo('motorbike');
    else if (e.code === 'Digit3') this.switchTo('boat');
    else if (e.code === 'Digit0' || e.code === 'Backquote') this.switchTo('walk');
  }

  /* ── Public API ──────────────────────────────────────────── */

  getCurrentInfo() {
    return { type: this.currentType, ...VEHICLES[this.currentType] };
  }

  dispose() {
    this.disable();
    this._removeMesh();
  }
}

export { VEHICLES };
