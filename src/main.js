/**
 * Quranic Planet — Main Entry Point
 * ===================================
 * Dual-mode game:
 *   - MAP MODE:    Top-down 2D Canvas map of the planet (existing)
 *   - EXPLORE MODE: Ground-level 3D world inside a Surah (Three.js)
 *
 * "Explore Country" triggers a Google Earth-style drop from map into 3D.
 * Press M or "Back to Map" to rise back to the map.
 */

import './styles/main.css';
import { SURAS, getMeccanSuras, getMedinanSuras } from './data/suras.js';
import { enrichSuras } from './data/sura-game-data.js';
import { generateContinents } from './engine/continents.js';
import { MapRenderer } from './engine/renderer.js';
import { UIManager, createLoadingParticles } from './components/ui-manager.js';
import { World3D } from './engine/world3d.js';
import { CharacterController } from './engine/character.js';
import { VehicleManager } from './engine/vehicles.js';
import { TransitionManager } from './engine/transition.js';

/* ══════════════════════════════════════════════════════════════════
   DATA BRIDGE — convert continents.js → renderer.js format
   ══════════════════════════════════════════════════════════════════ */

function bridgeContinentData(raw) {
  const toArrayPoints = (pts) =>
    (pts || []).map(p => [p.x, p.y]);

  const buildContinent = (cont, label) => {
    const countries = (cont.countries || []).map(c => {
      const sura = SURAS.find(s => s.id === c.suraId);
      return {
        suraId: c.suraId,
        points: toArrayPoints(c.points),
        colorPrimary: (sura && sura.colorPrimary) || c.color || '#5A5A5A',
        nameEn: sura ? (sura.nameEn || sura.meaning || '') : '',
        nameAr: sura ? (sura.nameAr || '') : '',
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
      };
    });

    return {
      outline: toArrayPoints(cont.outline),
      countries,
      label,
      colorBase: label === 'Meccan' ? '#2A1F14' : '#142A1F',
      colorMid:  label === 'Meccan' ? '#3B2B1A' : '#1A3B2B',
      colorTip:  label === 'Meccan' ? '#1F170E' : '#0E1F17',
    };
  };

  return [
    buildContinent(raw.meccan, 'Meccan'),
    buildContinent(raw.medinan, 'Medinan'),
  ];
}

/* ══════════════════════════════════════════════════════════════════
   QURANIC PLANET — MAIN CLASS
   ══════════════════════════════════════════════════════════════════ */

class QuranicPlanet {
  constructor() {
    // Core
    this.canvas = null;
    this.renderer = null;      // 2D map renderer
    this.ui = null;
    this.continentData = null;

    // 3D system
    this.world3d = null;
    this.character = null;
    this.vehicles = null;
    this.transition = null;

    /** @type {'map'|'3d'} */
    this.mode = 'map';

    // 3D animation loop
    this._3dLoopId = null;
    this._3dRunning = false;
  }

  async init() {
    // Start loading particles
    createLoadingParticles();

    // Enrich sura data with game-specific properties
    enrichSuras();

    // Create UI manager
    this.ui = new UIManager(SURAS);
    this.ui.setLoadingProgress(10, 'Loading Sura data...');

    await this.sleep(300);

    // Get canvas
    this.canvas = document.getElementById('world-map');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    this.ui.setLoadingProgress(25, 'Generating the Meccan Continent...');
    await this.sleep(400);

    // Generate continent geometry
    const width = window.innerWidth;
    const height = window.innerHeight;
    const rawContinentData = generateContinents(width, height);

    this.ui.setLoadingProgress(50, 'Shaping the Medinan Continent...');
    await this.sleep(400);

    // Bridge the data format from continents.js → renderer.js
    this.continentData = bridgeContinentData(rawContinentData);

    this.ui.setLoadingProgress(65, 'Filling the Ocean of Revelation...');
    await this.sleep(300);

    // Create and initialize 2D renderer
    this.renderer = new MapRenderer(this.canvas, this.continentData);
    this.renderer.init();

    this.ui.setLoadingProgress(75, 'Preparing the 3D world...');
    await this.sleep(300);

    // Initialize 3D system
    this._init3D();

    this.ui.setLoadingProgress(85, 'Placing 114 countries...');
    await this.sleep(300);

    // Set up event connections
    this.setupEvents();

    this.ui.setLoadingProgress(95, 'Lighting the stars...');
    await this.sleep(300);

    // Start the 2D render loop
    this.renderer.startLoop();

    // Hide loading screen
    await this.ui.hideLoadingScreen();

    console.log('🌍 Quranic Planet initialized (Dual Mode)');
    console.log(`📖 ${SURAS.length} Suras loaded`);
    console.log(`🏔️ ${getMeccanSuras().length} Meccan countries`);
    console.log(`🏙️ ${getMedinanSuras().length} Medinan countries`);
    console.log('🎮 Press "Explore Country" to enter 3D mode');
  }

  /* ── 3D System Initialization ────────────────────────────── */

  _init3D() {
    const container3d = document.getElementById('world3d-container');
    const overlay = document.getElementById('transition-overlay');

    // Create 3D world
    this.world3d = new World3D(container3d);

    // Create character controller
    this.character = new CharacterController(
      this.world3d.scene,
      this.world3d.camera,
      this.world3d.webgl.domElement
    );

    // Create vehicle manager
    this.vehicles = new VehicleManager(this.character);

    // Create transition manager
    this.transition = new TransitionManager({
      mapCanvas: this.canvas,
      container3d: container3d,
      overlay: overlay,
      world3d: this.world3d,
      character: this.character,
      vehicles: this.vehicles,
      onEnter3D: (sura) => this._onEnter3D(sura),
      onExit3D: () => this._onExit3D(),
    });
  }

  /* ── Event Setup ─────────────────────────────────────────── */

  setupEvents() {
    // ── 2D Map Events ──────────────────────────────────────

    // Country hover
    this.renderer.addEventListener('country-hover', (e) => {
      const country = e.detail.country;
      const sura = SURAS.find(s => s.id === country.suraId);
      if (sura) {
        this.ui.updateLocation(`${sura.nameEn} (${sura.nameAr}) — Surah ${sura.id}`);
        document.body.style.cursor = 'pointer';
      }
    });

    // Country click
    this.renderer.addEventListener('country-click', (e) => {
      const country = e.detail.country;
      const sura = SURAS.find(s => s.id === country.suraId);
      if (sura) {
        this.ui.openPanel(sura);
      }
    });

    // Country leave
    this.renderer.addEventListener('country-leave', () => {
      if (!this.ui.panelOpen) {
        this.ui.updateLocation('The Ocean of Revelation');
      }
      document.body.style.cursor = 'grab';
    });

    // Navigate to sura from search
    document.addEventListener('navigate-to-sura', (e) => {
      const { suraId, zoom } = e.detail;
      const targetZoom = zoom || 2.5;

      // If zoom > 3 it's an "Explore" action → enter 3D mode
      if (targetZoom > 3) {
        this._enter3DMode(suraId);
        return;
      }

      // Otherwise pan 2D camera
      for (const cont of this.continentData) {
        const country = cont.countries.find(c => c.suraId === suraId);
        if (country && this.renderer) {
          let cx = 0, cy = 0;
          for (const [x, y] of country.points) {
            cx += x; cy += y;
          }
          cx /= country.points.length;
          cy /= country.points.length;
          this.renderer.panTo(cx, cy, targetZoom);
          break;
        }
      }
    });

    // ── 3D Mode Events ─────────────────────────────────────

    // Back to map button
    document.getElementById('btn-back-to-map')?.addEventListener('click', () => {
      this._exit3DMode();
    });

    // M key to exit 3D
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && this.mode === '3d') {
        this._exit3DMode();
      }
    });

    // Vehicle selector buttons
    document.querySelectorAll('.vehicle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.vehicle;
        if (this.vehicles) {
          this.vehicles.switchTo(type);
        }
      });
    });

    // Vehicle changed event → update UI
    document.addEventListener('vehicle-changed', (e) => {
      const { type } = e.detail;
      document.querySelectorAll('.vehicle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.vehicle === type);
      });
    });

    // Mode changed event
    document.addEventListener('mode-changed', (e) => {
      this.mode = e.detail.mode;
    });
  }

  /* ── Mode Switching ──────────────────────────────────────── */

  _enter3DMode(suraId) {
    const sura = SURAS.find(s => s.id === suraId);
    if (!sura || this.transition.isIn3D || this.transition.isTransitioning) return;

    // Close the detail panel
    this.ui.closePanel();

    // Stop 2D render loop
    this.renderer.stopLoop();

    // Start transition
    this.transition.dropInto(sura);
  }

  _exit3DMode() {
    if (!this.transition.isIn3D || this.transition.isTransitioning) return;

    // Stop 3D loop
    this._stop3DLoop();

    // Rise back to map
    this.transition.riseBack().then(() => {
      // Restart 2D loop
      this.renderer.startLoop();
    });
  }

  _onEnter3D(sura) {
    // Show 3D HUD, hide map HUD elements
    document.getElementById('hud-3d')?.classList.remove('hidden');
    document.getElementById('bottom-hud')?.classList.add('hidden');
    document.getElementById('minimap-container')?.classList.add('hidden');
    document.getElementById('compass')?.classList.add('hidden');

    // Update 3D HUD sura name
    const nameEl = document.getElementById('hud3d-sura-name');
    if (nameEl) nameEl.textContent = `${sura.nameAr} — ${sura.nameEn}`;

    // Start 3D render loop
    this._start3DLoop();
  }

  _onExit3D() {
    // Hide 3D HUD, show map HUD elements
    document.getElementById('hud-3d')?.classList.add('hidden');
    document.getElementById('bottom-hud')?.classList.remove('hidden');
    document.getElementById('minimap-container')?.classList.remove('hidden');
    document.getElementById('compass')?.classList.remove('hidden');
  }

  /* ── 3D Render Loop ──────────────────────────────────────── */

  _start3DLoop() {
    if (this._3dRunning) return;
    this._3dRunning = true;
    let last = performance.now();

    const loop = () => {
      if (!this._3dRunning) return;
      this._3dLoopId = requestAnimationFrame(loop);

      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1); // cap at 100ms
      last = now;

      // Update character (movement + camera)
      this.character.update(dt);

      // Update vehicles (animations)
      this.vehicles.update(dt);

      // Update world (particles, landmarks, render)
      this.world3d.update(dt);
    };

    this._3dLoopId = requestAnimationFrame(loop);
  }

  _stop3DLoop() {
    this._3dRunning = false;
    if (this._3dLoopId) {
      cancelAnimationFrame(this._3dLoopId);
      this._3dLoopId = null;
    }
  }

  /* ── Utility ─────────────────────────────────────────────── */

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/* ══════════════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════════════ */

const game = new QuranicPlanet();
game.init().catch(err => {
  console.error('Failed to initialize Quranic Planet:', err);
});
