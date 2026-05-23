/**
 * transition.js — Google Earth-Style Drop-In / Rise-Out
 * =======================================================
 * Cinematic camera transitions between 2D map mode and 3D explore mode.
 *
 * Drop-in:
 *   1. Fade overlay covers the 2D canvas
 *   2. 3D scene loads in background
 *   3. Camera starts 500 units above, looking straight down
 *   4. Swoops down + tilts from top-down (90°) to near-horizontal (15°)
 *   5. Character appears, controls unlock
 *
 * Rise-out:
 *   1. Controls lock
 *   2. Camera rises + tilts back to top-down
 *   3. Fade overlay, swap back to 2D
 */

import gsap from 'gsap';

/* ══════════════════════════════════════════════════════════════════
   TRANSITION MANAGER
   ══════════════════════════════════════════════════════════════════ */

export class TransitionManager {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mapCanvas — The 2D canvas element
   * @param {HTMLElement} opts.container3d — The 3D container div
   * @param {HTMLElement} opts.overlay — The transition overlay div
   * @param {import('./world3d.js').World3D} opts.world3d — 3D world instance
   * @param {import('./character.js').CharacterController} opts.character — Character controller
   * @param {import('./vehicles.js').VehicleManager} opts.vehicles — Vehicle manager
   * @param {Function} opts.onEnter3D — Callback when entering 3D mode
   * @param {Function} opts.onExit3D — Callback when exiting 3D mode
   */
  constructor(opts) {
    this.mapCanvas = opts.mapCanvas;
    this.container3d = opts.container3d;
    this.overlay = opts.overlay;
    this.world3d = opts.world3d;
    this.character = opts.character;
    this.vehicles = opts.vehicles;
    this.onEnter3D = opts.onEnter3D || (() => {});
    this.onExit3D = opts.onExit3D || (() => {});

    this._transitioning = false;
    this._in3D = false;
  }

  get isIn3D() { return this._in3D; }
  get isTransitioning() { return this._transitioning; }

  /* ── Drop Into 3D ────────────────────────────────────────── */

  async dropInto(sura) {
    if (this._transitioning || this._in3D) return;
    this._transitioning = true;

    const camera = this.world3d.camera;

    // Phase 1: Fade overlay over 2D map
    this.overlay.style.display = 'block';
    this.overlay.style.opacity = '0';
    await this._tween(this.overlay, { opacity: 1 }, 0.6);

    // Phase 2: Show 3D container, hide 2D canvas
    this.container3d.classList.remove('hidden');
    this.container3d.style.opacity = '0';
    this.mapCanvas.style.display = 'none';

    // Phase 3: Load the Surah world
    await this.world3d.loadSura(sura);

    // Position camera high above (satellite view)
    camera.position.set(0, 500, 0);
    camera.rotation.set(-Math.PI / 2, 0, 0); // looking straight down
    camera.updateProjectionMatrix();

    // Position character at origin
    this.character.setPosition(0, 1.2, 5);

    // Phase 4: Fade in 3D, fade out overlay
    await this._tween(this.container3d, { opacity: 1 }, 0.4);
    this._tween(this.overlay, { opacity: 0 }, 0.4).then(() => {
      this.overlay.style.display = 'none';
    });

    // Phase 5: Camera drop animation — the Google Earth effect
    const dropDuration = 2.8;
    const startY = 500;
    const endY = 8; // character follow distance height
    const startPitch = -Math.PI / 2; // looking down
    const endPitch = -0.35; // near horizontal

    // Animate camera drop
    await new Promise(resolve => {
      const startTime = performance.now();

      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const t = Math.min(elapsed / dropDuration, 1);
        // Ease: power2.inOut curve
        const ease = t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;

        // Interpolate height (logarithmic for Google Earth feel)
        const logT = Math.pow(ease, 1.5);
        camera.position.y = startY + (endY - startY) * logT;
        camera.position.z = 0 + 10 * logT; // drift back
        camera.position.x = 0;

        // Interpolate pitch
        camera.rotation.x = startPitch + (endPitch - startPitch) * ease;
        camera.rotation.y = 0;
        camera.rotation.z = 0;

        // Render during animation
        this.world3d.update(0.016);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });

    // Phase 6: Enable controls
    this.character.enable();
    this.vehicles.enable();
    this._in3D = true;
    this._transitioning = false;

    this.onEnter3D(sura);

    // Dispatch event
    document.dispatchEvent(new CustomEvent('mode-changed', {
      detail: { mode: '3d', sura }
    }));
  }

  /* ── Rise Back to Map ────────────────────────────────────── */

  async riseBack() {
    if (this._transitioning || !this._in3D) return;
    this._transitioning = true;

    // Phase 1: Disable controls
    this.character.disable();
    this.vehicles.disable();
    this.vehicles.switchTo('walk');

    const camera = this.world3d.camera;

    // Phase 2: Rise-up animation
    const riseDuration = 2.0;
    const startY = camera.position.y;
    const endY = 400;
    const startPitch = camera.rotation.x;
    const endPitch = -Math.PI / 2;

    await new Promise(resolve => {
      const startTime = performance.now();
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const t = Math.min(elapsed / riseDuration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        camera.position.y = startY + (endY - startY) * ease;
        camera.position.z *= (1 - ease * 0.03);
        camera.rotation.x = startPitch + (endPitch - startPitch) * ease;

        this.world3d.update(0.016);

        if (t < 1) requestAnimationFrame(animate);
        else resolve();
      };
      requestAnimationFrame(animate);
    });

    // Phase 3: Fade overlay
    this.overlay.style.display = 'block';
    this.overlay.style.opacity = '0';
    await this._tween(this.overlay, { opacity: 1 }, 0.5);

    // Phase 4: Swap visibility
    this.container3d.classList.add('hidden');
    this.mapCanvas.style.display = 'block';

    // Phase 5: Fade out overlay
    await this._tween(this.overlay, { opacity: 0 }, 0.5);
    this.overlay.style.display = 'none';

    this._in3D = false;
    this._transitioning = false;

    this.onExit3D();

    document.dispatchEvent(new CustomEvent('mode-changed', {
      detail: { mode: 'map' }
    }));
  }

  /* ── GSAP tween helper ───────────────────────────────────── */

  _tween(element, props, duration) {
    return new Promise(resolve => {
      gsap.to(element.style ? element.style : element, {
        ...props,
        duration,
        ease: 'power2.inOut',
        onComplete: resolve,
      });
    });
  }
}
