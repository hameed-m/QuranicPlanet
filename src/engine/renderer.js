// ═══════════════════════════════════════════════════════════════════════════════
// Quranic Planet — Map Renderer Engine
// ═══════════════════════════════════════════════════════════════════════════════
// The core visual engine that renders the interactive world map on a Canvas.
// Produces a stunning cosmic atmosphere with animated stars, bioluminescent
// ocean, glowing continents, and rich particle effects.
// ═══════════════════════════════════════════════════════════════════════════════

/* ── colour palette ────────────────────────────────────────────────────────── */
const COLORS = {
  bgTop:        '#050A18',
  bgBottom:     '#0A1628',
  oceanDeep:    '#0A2463',
  oceanTeal:    '#1B998B',
  oceanGlow:    '#00FFE0',
  gold:         '#D4AF37',
  goldBright:   '#FFD700',
  starWhite:    '#EAEAEA',
  nebulaPurple: 'rgba(74, 26, 107, 0.08)',
  nebulaTeal:   'rgba(27, 107, 109, 0.06)',
  nebulaPink:   'rgba(130, 40, 100, 0.05)',
  borderWhite:  'rgba(255, 255, 255, 0.25)',
  borderHover:  'rgba(255, 255, 255, 0.6)',
  labelColor:   '#E0D6C2',
  labelArabic:  '#D4AF37',
  shadow:       'rgba(0, 0, 0, 0.45)',
};

/* ── math helpers ──────────────────────────────────────────────────────────── */
const TAU        = Math.PI * 2;
const lerp       = (a, b, t) => a + (b - a) * t;
const clamp      = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const randRange  = (lo, hi) => lo + Math.random() * (hi - lo);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/* ── tiny AABB helper ──────────────────────────────────────────────────────── */
function polygonBounds(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MapRenderer                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

export class MapRenderer extends EventTarget {

  /* ── constructor ─────────────────────────────────────────────────────────── */
  constructor(canvas, continentData) {
    super();
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;
    /** @type {CanvasRenderingContext2D} */
    this.ctx = canvas.getContext('2d');

    // continent / country data passed in from continents.js
    this.continents = continentData || [];

    // flatten all countries for quick iteration
    this._countries = [];
    for (const cont of this.continents) {
      if (cont.countries) {
        for (const c of cont.countries) {
          c._continent = cont;
          c._bounds = polygonBounds(c.points);
          this._countries.push(c);
        }
      }
    }

    // ── camera ────────────────────────────────────────────────────────────
    this.camera = { x: 0, y: 0, zoom: 1 };
    this._cameraTarget = { x: 0, y: 0, zoom: 1 };
    this._cameraSmooth = 0.08; // lerp factor

    // ── interaction state ─────────────────────────────────────────────────
    this._hoveredCountry = null;
    this._clickedCountry = null;
    this._clickPulse = 0;       // 0‥1 pulse animation
    this._isDragging = false;
    this._dragStart = { x: 0, y: 0 };
    this._dragCamStart = { x: 0, y: 0 };
    this._mouseWorld = { x: 0, y: 0 };
    this._mouseScreen = { x: 0, y: 0 };

    // ── animation state ───────────────────────────────────────────────────
    this._time = 0;
    this._dirty = true;
    this._running = false;
    this._rafId = null;
    this._lastFrameTime = 0;

    // ── particles & stars (filled in init) ────────────────────────────────
    this._stars = [];
    this._oceanParticles = [];
    this._ambientParticles = [];
    this._nebulae = [];

    // ── off-screen layers ─────────────────────────────────────────────
    this._bgCanvas = null;
    this._bgCtx = null;
    this._bgReady = false;

    // ── logical (CSS) dimensions — the DPR-independent size ──────────
    this._logicalW = 0;
    this._logicalH = 0;

    // ── keyboard state ────────────────────────────────────────────────────
    this._keys = {};
  }

  /* ── initialisation ──────────────────────────────────────────────────────── */
  init() {
    this._resizeCanvas();
    this._createBackgroundLayer();
    this._createStars(220);
    this._createNebulae(6);
    this._createOceanParticles(120);
    this._createAmbientParticles(90);
    this._bindEvents();
    this._dirty = true;
  }

  /* ── animation loop ──────────────────────────────────────────────────────── */
  startLoop() {
    if (this._running) return;
    this._running = true;
    this._lastFrameTime = performance.now();
    this._tick();
  }

  stopLoop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /* ── public helpers ──────────────────────────────────────────────────────── */
  panTo(wx, wy, zoom) {
    this._cameraTarget.x = wx;
    this._cameraTarget.y = wy;
    if (zoom !== undefined) this._cameraTarget.zoom = clamp(zoom, 0.5, 5);
    this._dirty = true;
  }

  resetCamera() {
    this._cameraTarget = { x: 0, y: 0, zoom: 1 };
    this._dirty = true;
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  PRIVATE — Frame Loop                                                 */
  /* ═══════════════════════════════════════════════════════════════════════ */
  _tick() {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(() => this._tick());

    const now = performance.now();
    const dt = Math.min((now - this._lastFrameTime) / 1000, 0.05); // cap delta
    this._lastFrameTime = now;
    this._time += dt;

    this._updateCamera(dt);
    this._updateKeyboard(dt);
    this._updateClickPulse(dt);
    this._updateParticles(dt);

    // always re-render — animations are continuous
    this.render();
  }

  /* ── camera update ───────────────────────────────────────────────────────── */
  _updateCamera(_dt) {
    const s = this._cameraSmooth;
    this.camera.x    = lerp(this.camera.x,    this._cameraTarget.x,    s);
    this.camera.y    = lerp(this.camera.y,    this._cameraTarget.y,    s);
    this.camera.zoom = lerp(this.camera.zoom, this._cameraTarget.zoom, s);
  }

  _updateKeyboard(dt) {
    const speed = 400 / this.camera.zoom;
    if (this._keys['ArrowLeft']  || this._keys['a']) this._cameraTarget.x -= speed * dt;
    if (this._keys['ArrowRight'] || this._keys['d']) this._cameraTarget.x += speed * dt;
    if (this._keys['ArrowUp']    || this._keys['w']) this._cameraTarget.y -= speed * dt;
    if (this._keys['ArrowDown']  || this._keys['s']) this._cameraTarget.y += speed * dt;
    if (this._keys['+'] || this._keys['=']) this._cameraTarget.zoom = clamp(this._cameraTarget.zoom * 1.01, 0.5, 5);
    if (this._keys['-'])                    this._cameraTarget.zoom = clamp(this._cameraTarget.zoom * 0.99, 0.5, 5);
  }

  _updateClickPulse(dt) {
    if (this._clickPulse > 0) {
      this._clickPulse = Math.max(0, this._clickPulse - dt * 1.6);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                               */
  /* ═══════════════════════════════════════════════════════════════════════ */
  render() {
    const ctx = this.ctx;
    // Use LOGICAL (CSS) dimensions — ctx already has DPR scale transform
    const W = this._logicalW || this.canvas.width;
    const H = this._logicalH || this.canvas.height;

    ctx.clearRect(0, 0, W, H);

    this._renderBackground(ctx, W, H);
    this._renderNebulae(ctx, W, H);
    this._renderStars(ctx, W, H);

    // apply camera transform for world-space layers
    ctx.save();
    this._applyCameraTransform(ctx, W, H);

    this._renderOcean(ctx, W, H);
    this._renderContinents(ctx);
    this._renderCountries(ctx);
    this._renderHoverEffects(ctx);
    this._renderLabels(ctx);
    this._renderOceanParticles(ctx);
    this._renderAmbientParticles(ctx);

    ctx.restore();
  }

  /* ── apply camera ────────────────────────────────────────────────────────── */
  _applyCameraTransform(ctx, W, H) {
    const cx = W / 2;
    const cy = H / 2;
    ctx.translate(cx, cy);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);
  }

  /* ── 1. Background ──────────────────────────────────────────────────────── */
  _createBackgroundLayer() {
    this._bgCanvas = document.createElement('canvas');
    this._bgCanvas.width = this._logicalW || this.canvas.width;
    this._bgCanvas.height = this._logicalH || this.canvas.height;
    this._bgCtx = this._bgCanvas.getContext('2d');
    this._paintStaticBackground();
    this._bgReady = true;
  }

  _paintStaticBackground() {
    const ctx = this._bgCtx;
    const W = this._bgCanvas.width;
    const H = this._bgCanvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, COLORS.bgTop);
    grad.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  _renderBackground(ctx, W, H) {
    if (this._bgReady) {
      // re-paint if canvas resized
      if (this._bgCanvas.width !== W || this._bgCanvas.height !== H) {
        this._bgCanvas.width = W;
        this._bgCanvas.height = H;
        this._paintStaticBackground();
      }
      ctx.drawImage(this._bgCanvas, 0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, COLORS.bgTop);
      grad.addColorStop(1, COLORS.bgBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ── 1b. Nebulae (soft colour clouds) ────────────────────────────────────── */
  _createNebulae(count) {
    this._nebulae = [];
    for (let i = 0; i < count; i++) {
      this._nebulae.push({
        x: Math.random(),
        y: Math.random(),
        radius: randRange(0.15, 0.35),
        color: [COLORS.nebulaPurple, COLORS.nebulaTeal, COLORS.nebulaPink][i % 3],
        phase: Math.random() * TAU,
        speed: randRange(0.05, 0.15),
      });
    }
  }

  _renderNebulae(ctx, W, H) {
    for (const n of this._nebulae) {
      const drift = Math.sin(this._time * n.speed + n.phase) * 0.02;
      const cx = (n.x + drift) * W;
      const cy = (n.y + drift * 0.5) * H;
      const r = n.radius * Math.max(W, H);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, n.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }

  /* ── 1c. Stars ───────────────────────────────────────────────────────────── */
  _createStars(count) {
    this._stars = [];
    for (let i = 0; i < count; i++) {
      this._stars.push({
        x: Math.random(),
        y: Math.random(),
        baseRadius: randRange(0.4, 1.6),
        brightness: randRange(0.3, 1),
        twinkleSpeed: randRange(1.5, 4.5),
        twinklePhase: Math.random() * TAU,
      });
    }
  }

  _renderStars(ctx, W, H) {
    for (const s of this._stars) {
      const flicker = 0.5 + 0.5 * Math.sin(this._time * s.twinkleSpeed + s.twinklePhase);
      const alpha = s.brightness * (0.4 + 0.6 * flicker);
      const r = s.baseRadius * (0.8 + 0.2 * flicker);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.starWhite;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, r, 0, TAU);
      ctx.fill();

      // glow for brighter stars
      if (s.brightness > 0.7) {
        ctx.globalAlpha = alpha * 0.2;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, r * 3, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ── 2. Ocean of Revelation ──────────────────────────────────────────────── */
  _renderOcean(ctx, W, H) {
    // The ocean fills the entire world area behind continents.
    // We'll draw a large rectangle in world‑space, then the continents
    // overlay on top.

    const worldLeft   = -2000;
    const worldTop    = -1500;
    const worldWidth  = 4000;
    const worldHeight = 3000;

    // base ocean gradient
    const grad = ctx.createLinearGradient(worldLeft, worldTop, worldLeft, worldTop + worldHeight);
    grad.addColorStop(0, '#061539');
    grad.addColorStop(0.3, COLORS.oceanDeep);
    grad.addColorStop(0.7, '#0C2E6B');
    grad.addColorStop(1, '#071A3F');
    ctx.fillStyle = grad;
    ctx.fillRect(worldLeft, worldTop, worldWidth, worldHeight);

    // animated wave layers
    ctx.save();
    for (let layer = 0; layer < 3; layer++) {
      const amplitude = 8 + layer * 4;
      const freq = 0.008 - layer * 0.001;
      const speed = 0.6 + layer * 0.3;
      const yOffset = worldTop + 400 + layer * 350;

      ctx.beginPath();
      ctx.moveTo(worldLeft, worldTop + worldHeight);
      for (let x = worldLeft; x <= worldLeft + worldWidth; x += 6) {
        const y = yOffset +
          Math.sin(x * freq + this._time * speed) * amplitude +
          Math.sin(x * freq * 1.7 + this._time * speed * 0.7) * amplitude * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(worldLeft + worldWidth, worldTop + worldHeight);
      ctx.closePath();

      const alpha = 0.035 - layer * 0.008;
      ctx.fillStyle = `rgba(27, 153, 139, ${alpha})`;
      ctx.fill();
    }
    ctx.restore();

    // shimmer / ripple highlights
    ctx.save();
    const rippleCount = 18;
    for (let i = 0; i < rippleCount; i++) {
      const phase = (i / rippleCount) * TAU + this._time * 0.3;
      const rx = worldLeft + 300 + ((i * 197) % worldWidth);
      const ry = worldTop + 200 + Math.sin(phase) * 80 + ((i * 131) % (worldHeight - 400));
      const rr = 30 + Math.sin(phase * 1.3) * 15;
      const alpha = 0.02 + 0.02 * Math.sin(phase);

      const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
      rg.addColorStop(0, `rgba(0, 255, 224, ${alpha})`);
      rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg;
      ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
    }
    ctx.restore();
  }

  /* ── 2b. Ocean Particles (bioluminescent) ─────────────────────────────── */
  _createOceanParticles(count) {
    this._oceanParticles = [];
    for (let i = 0; i < count; i++) {
      this._oceanParticles.push({
        x: randRange(-1800, 1800),
        y: randRange(-1200, 1200),
        vx: randRange(-8, 8),
        vy: randRange(-4, 4),
        radius: randRange(1.5, 4),
        life: Math.random(),
        lifeSpeed: randRange(0.15, 0.5),
        hue: randRange(160, 195), // cyan ‑ teal range
      });
    }
  }

  _renderOceanParticles(ctx) {
    for (const p of this._oceanParticles) {
      const alpha = Math.sin(p.life * Math.PI) * 0.6;
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;

      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
      glow.addColorStop(0, `hsla(${p.hue}, 90%, 65%, 0.8)`);
      glow.addColorStop(0.5, `hsla(${p.hue}, 80%, 50%, 0.3)`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - p.radius * 3, p.y - p.radius * 3, p.radius * 6, p.radius * 6);

      ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, 0.9)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ── 3. Continents ───────────────────────────────────────────────────────── */
  _renderContinents(ctx) {
    for (const cont of this.continents) {
      if (!cont.outline || cont.outline.length < 3) continue;

      ctx.save();

      // drop shadow
      ctx.shadowColor = COLORS.shadow;
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 8;

      // build path
      const path = this._buildPath(cont.outline);

      // textured gradient fill (earth tones)
      const bounds = polygonBounds(cont.outline);
      const grad = ctx.createLinearGradient(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
      grad.addColorStop(0, cont.colorBase || '#2A1F14');
      grad.addColorStop(0.5, cont.colorMid || '#3B2B1A');
      grad.addColorStop(1, cont.colorTip || '#1F170E');
      ctx.fillStyle = grad;
      ctx.fill(path);

      // glow border
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.stroke(path);

      // inner light rim
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.stroke(path);

      ctx.restore();
    }
  }

  /* ── 4. Countries (Sura regions) ─────────────────────────────────────────── */
  _renderCountries(ctx) {
    for (const c of this._countries) {
      if (!c.points || c.points.length < 3) continue;

      const isHovered = c === this._hoveredCountry;
      const isClicked = c === this._clickedCountry && this._clickPulse > 0;
      const path = this._buildPath(c.points);

      ctx.save();

      // fill with country colour
      const baseColor = c.colorPrimary || '#3A6B35';
      ctx.fillStyle = baseColor;
      ctx.fill(path);

      // subtle noise-like texture overlay
      const bds = c._bounds;
      const texGrad = ctx.createLinearGradient(bds.minX, bds.minY, bds.maxX, bds.maxY);
      texGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
      texGrad.addColorStop(0.5, 'rgba(0,0,0,0.03)');
      texGrad.addColorStop(1, 'rgba(255,255,255,0.02)');
      ctx.fillStyle = texGrad;
      ctx.fill(path);

      // border
      ctx.lineWidth = isHovered ? 2.5 : 1;
      ctx.strokeStyle = isHovered ? COLORS.borderHover : COLORS.borderWhite;
      ctx.stroke(path);

      // click pulse
      if (isClicked) {
        const pulseAlpha = easeOutCubic(this._clickPulse) * 0.4;
        ctx.fillStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
        ctx.fill(path);
        // expanding ring
        const cx = (bds.minX + bds.maxX) / 2;
        const cy = (bds.minY + bds.maxY) / 2;
        const maxR = Math.max(bds.maxX - bds.minX, bds.maxY - bds.minY) * 0.7;
        const ringR = maxR * (1 - this._clickPulse) * 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, TAU);
        ctx.lineWidth = 2 * this._clickPulse;
        ctx.strokeStyle = `rgba(255, 215, 0, ${this._clickPulse * 0.6})`;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /* ── 4b. Hover Effects (glow layer, drawn on top) ──────────────────────── */
  _renderHoverEffects(ctx) {
    if (!this._hoveredCountry) return;
    const c = this._hoveredCountry;
    if (!c.points || c.points.length < 3) return;

    const path = this._buildPath(c.points);
    const bds = c._bounds;

    ctx.save();

    // outer glow
    ctx.shadowColor = c.colorPrimary || COLORS.gold;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.stroke(path);
    ctx.shadowBlur = 0;

    // brighten overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fill(path);

    // pulsing glow at center
    const cx = (bds.minX + bds.maxX) / 2;
    const cy = (bds.minY + bds.maxY) / 2;
    const pulse = 0.5 + 0.5 * Math.sin(this._time * 3);
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
    gr.addColorStop(0, `rgba(212, 175, 55, ${0.08 * pulse})`);
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr;
    ctx.fill(path);

    ctx.restore();
  }

  /* ── 5. Labels ───────────────────────────────────────────────────────────── */
  _renderLabels(ctx) {
    for (const c of this._countries) {
      if (!c.points || c.points.length < 3) continue;
      // only show labels when zoomed enough
      if (this.camera.zoom < 0.8) continue;

      const bds = c._bounds;
      const cx = (bds.minX + bds.maxX) / 2;
      const cy = (bds.minY + bds.maxY) / 2;
      const regionWidth = bds.maxX - bds.minX;

      // skip tiny regions at low zoom
      if (regionWidth * this.camera.zoom < 40) continue;

      const isHovered = c === this._hoveredCountry;
      const fontSize = clamp(regionWidth * 0.09, 9, 18);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // English name
      ctx.font = `${isHovered ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = isHovered ? '#FFFFFF' : COLORS.labelColor;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText(c.nameEn || '', cx, cy - fontSize * 0.5);

      // Arabic name below
      if (c.nameAr) {
        const arSize = fontSize * 1.1;
        ctx.font = `${arSize}px Amiri, serif`;
        ctx.fillStyle = isHovered ? COLORS.goldBright : COLORS.labelArabic;
        ctx.fillText(c.nameAr, cx, cy + fontSize * 0.65);
      }

      ctx.restore();
    }
  }

  /* ── 6. Ambient Particles (golden motes) ─────────────────────────────── */
  _createAmbientParticles(count) {
    this._ambientParticles = [];
    for (let i = 0; i < count; i++) {
      this._ambientParticles.push({
        x: randRange(-2000, 2000),
        y: randRange(-1500, 1500),
        vx: randRange(-6, 6),
        vy: randRange(-4, 4),
        radius: randRange(1, 3.5),
        life: Math.random(),
        lifeSpeed: randRange(0.08, 0.3),
      });
    }
  }

  _updateParticles(dt) {
    // ocean particles
    for (const p of this._oceanParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += p.lifeSpeed * dt;
      if (p.life > 1) {
        p.life = 0;
        p.x = randRange(-1800, 1800);
        p.y = randRange(-1200, 1200);
        p.vx = randRange(-8, 8);
        p.vy = randRange(-4, 4);
      }
    }
    // ambient golden motes
    for (const p of this._ambientParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // gentle sine drift
      p.x += Math.sin(this._time * 0.3 + p.y * 0.002) * 0.3;
      p.y += Math.cos(this._time * 0.2 + p.x * 0.002) * 0.2;
      p.life += p.lifeSpeed * dt;
      if (p.life > 1) {
        p.life = 0;
        p.x = randRange(-2000, 2000);
        p.y = randRange(-1500, 1500);
        p.vx = randRange(-6, 6);
        p.vy = randRange(-4, 4);
      }
    }
  }

  _renderAmbientParticles(ctx) {
    for (const p of this._ambientParticles) {
      const alpha = Math.sin(p.life * Math.PI) * 0.5;
      if (alpha <= 0) continue;

      ctx.globalAlpha = alpha;

      // soft golden glow
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
      gr.addColorStop(0, 'rgba(212, 175, 55, 0.6)');
      gr.addColorStop(0.4, 'rgba(255, 215, 0, 0.2)');
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.fillRect(p.x - p.radius * 4, p.y - p.radius * 4, p.radius * 8, p.radius * 8);

      // bright core
      ctx.fillStyle = COLORS.goldBright;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  EVENTS & INPUT                                                       */
  /* ═══════════════════════════════════════════════════════════════════════ */
  _bindEvents() {
    // resize
    this._onResize = () => {
      this._resizeCanvas();
      this._dirty = true;
    };
    window.addEventListener('resize', this._onResize);

    // mouse
    this.canvas.addEventListener('mousemove',  (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mousedown',  (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mouseup',    (e) => this._onMouseUp(e));
    this.canvas.addEventListener('mouseleave', ()  => this._onMouseLeave());
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

    // touch
    this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove',  (e) => this._onTouchMove(e),  { passive: false });
    this.canvas.addEventListener('touchend',   (e) => this._onTouchEnd(e));

    // keyboard
    window.addEventListener('keydown', (e) => { this._keys[e.key] = true; });
    window.addEventListener('keyup',   (e) => { this._keys[e.key] = false; });
  }

  /* ── coordinate conversion ───────────────────────────────────────────────── */
  _screenToWorld(sx, sy) {
    // Use logical (CSS) dimensions — mouse coords are in CSS pixels
    const W = this._logicalW || this.canvas.width;
    const H = this._logicalH || this.canvas.height;
    const wx = (sx - W / 2) / this.camera.zoom + this.camera.x;
    const wy = (sy - H / 2) / this.camera.zoom + this.camera.y;
    return { x: wx, y: wy };
  }

  /* ── mouse handlers ──────────────────────────────────────────────────────── */
  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    // Use CSS coordinates directly — no DPR multiplication
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    this._mouseScreen = { x: sx, y: sy };
    this._mouseWorld = this._screenToWorld(sx, sy);

    if (this._isDragging) {
      const dx = (sx - this._dragStart.x) / this.camera.zoom;
      const dy = (sy - this._dragStart.y) / this.camera.zoom;
      this._cameraTarget.x = this._dragCamStart.x - dx;
      this._cameraTarget.y = this._dragCamStart.y - dy;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // hit-test countries
    const prev = this._hoveredCountry;
    this._hoveredCountry = this._hitTestCountry(this._mouseWorld.x, this._mouseWorld.y);

    if (this._hoveredCountry !== prev) {
      if (prev) {
        this.dispatchEvent(new CustomEvent('country-leave', { detail: { country: prev } }));
      }
      if (this._hoveredCountry) {
        this.dispatchEvent(new CustomEvent('country-hover', { detail: { country: this._hoveredCountry } }));
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'grab';
      }
    }

    this._dirty = true;
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    this._isDragging = true;
    this._dragStart = { x: sx, y: sy };
    this._dragCamStart = { x: this._cameraTarget.x, y: this._cameraTarget.y };
    this.canvas.style.cursor = 'grabbing';
  }

  _onMouseUp(e) {
    if (e.button !== 0) return;
    const wasDragging = this._isDragging;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const dist = Math.hypot(sx - this._dragStart.x, sy - this._dragStart.y);
    this._isDragging = false;

    // treat as click if barely moved
    if (wasDragging && dist < 5) {
      const world = this._screenToWorld(sx, sy);
      const country = this._hitTestCountry(world.x, world.y);
      if (country) {
        this._clickedCountry = country;
        this._clickPulse = 1;
        // nudge camera toward clicked country
        const bds = country._bounds;
        const ccx = (bds.minX + bds.maxX) / 2;
        const ccy = (bds.minY + bds.maxY) / 2;
        this._cameraTarget.x = lerp(this._cameraTarget.x, ccx, 0.3);
        this._cameraTarget.y = lerp(this._cameraTarget.y, ccy, 0.3);
        this._cameraTarget.zoom = clamp(this._cameraTarget.zoom * 1.15, 0.5, 5);

        this.dispatchEvent(new CustomEvent('country-click', { detail: { country } }));
      }
    }

    this.canvas.style.cursor = this._hoveredCountry ? 'pointer' : 'grab';
    this._dirty = true;
  }

  _onMouseLeave() {
    this._isDragging = false;
    if (this._hoveredCountry) {
      this.dispatchEvent(new CustomEvent('country-leave', { detail: { country: this._hoveredCountry } }));
      this._hoveredCountry = null;
    }
    this.canvas.style.cursor = 'default';
    this._dirty = true;
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    this._cameraTarget.zoom = clamp(this._cameraTarget.zoom * factor, 0.5, 5);
    this._dirty = true;
  }

  /* ── touch handlers (basic pan & pinch) ──────────────────────────────────── */
  _onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const sx = t.clientX - rect.left;
      const sy = t.clientY - rect.top;
      this._isDragging = true;
      this._dragStart = { x: sx, y: sy };
      this._dragCamStart = { x: this._cameraTarget.x, y: this._cameraTarget.y };
    }
    if (e.touches.length === 2) {
      this._pinchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      this._pinchStartZoom = this._cameraTarget.zoom;
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && this._isDragging) {
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const sx = t.clientX - rect.left;
      const sy = t.clientY - rect.top;
      const dx = (sx - this._dragStart.x) / this.camera.zoom;
      const dy = (sy - this._dragStart.y) / this.camera.zoom;
      this._cameraTarget.x = this._dragCamStart.x - dx;
      this._cameraTarget.y = this._dragCamStart.y - dy;
    }
    if (e.touches.length === 2 && this._pinchStartDist) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / this._pinchStartDist;
      this._cameraTarget.zoom = clamp(this._pinchStartZoom * scale, 0.5, 5);
    }
  }

  _onTouchEnd(e) {
    if (e.touches.length < 2) {
      this._pinchStartDist = null;
    }
    if (e.touches.length === 0) {
      this._isDragging = false;
      // simple tap detection
      if (this._hoveredCountry) {
        this._clickedCountry = this._hoveredCountry;
        this._clickPulse = 1;
        this.dispatchEvent(new CustomEvent('country-click', { detail: { country: this._hoveredCountry } }));
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  HIT TESTING                                                          */
  /* ═══════════════════════════════════════════════════════════════════════ */
  _hitTestCountry(wx, wy) {
    // fast AABB then precise polygon test
    for (let i = this._countries.length - 1; i >= 0; i--) {
      const c = this._countries[i];
      const b = c._bounds;
      if (wx < b.minX || wx > b.maxX || wy < b.minY || wy > b.maxY) continue;
      if (pointInPolygon(wx, wy, c.points)) return c;
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  UTILITY                                                              */
  /* ═══════════════════════════════════════════════════════════════════════ */
  _buildPath(points) {
    const path = new Path2D();
    if (!points.length) return path;
    path.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(points[i][0], points[i][1]);
    }
    path.closePath();
    return path;
  }

  _resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement || document.body;
    const w = parent.clientWidth  || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Store logical (CSS) dimensions for camera, hit-testing, and rendering
    this._logicalW = w;
    this._logicalH = h;
  }

  /* ── clean up ────────────────────────────────────────────────────────────── */
  destroy() {
    this.stopLoop();
    window.removeEventListener('resize', this._onResize);
    // remove canvas listeners (simplest to remove canvas from DOM)
    this.canvas.style.cursor = 'default';
  }
}
