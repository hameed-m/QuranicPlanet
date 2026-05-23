/**
 * ayat-terrain.js — Quranic Verse Ground Texture
 * ================================================
 * Renders Ayat (verses) of a Surah as beautiful Arabic calligraphy
 * on the ground plane. The player literally walks on the Word of God.
 *
 * Text is fetched from api.quran.com and rendered onto an off-screen
 * Canvas, then applied as a CanvasTexture to a subdivided PlaneGeometry.
 */

import * as THREE from 'three';

/** Terrain dimensions in world units. */
const TERRAIN_SIZE = 300;
/** Texture resolution (power of 2). */
const TEX_SIZE = 4096;
/** Text padding & layout. */
const MARGIN = 80;
const LINE_HEIGHT = 72;
const FONT_SIZE = 52;

/* ══════════════════════════════════════════════════════════════════
   FALLBACK AYAT — used when API is unavailable
   ══════════════════════════════════════════════════════════════════ */

const FALLBACK_AYAT = [
  'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
  'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
  'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
  'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
  'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
  'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
];

/* ══════════════════════════════════════════════════════════════════
   BIOME GROUND COLOURS — tinted by Surah theme
   ══════════════════════════════════════════════════════════════════ */

const BIOME_GROUND = {
  default:     { base: '#1E1A14', text: '#3B321E', accent: '#C9A84C' },
  desert:      { base: '#2A2010', text: '#4A3818', accent: '#D4AF37' },
  garden:      { base: '#0E1E0E', text: '#1A3A1A', accent: '#4ADE80' },
  ocean:       { base: '#0A1428', text: '#142A4A', accent: '#38BDF8' },
  night:       { base: '#0A0A18', text: '#14142A', accent: '#A78BFA' },
  volcanic:    { base: '#1E0A0A', text: '#3A1414', accent: '#FB923C' },
  paradise:    { base: '#0E1E14', text: '#1A3A24', accent: '#34D399' },
  cosmic:      { base: '#08081A', text: '#101030', accent: '#818CF8' },
  mountain:    { base: '#14181E', text: '#2A3040', accent: '#94A3B8' },
  sacred:      { base: '#1A1408', text: '#342A10', accent: '#FCD34D' },
};

/** Map sura weather to a ground colour scheme. */
function getGroundPalette(sura) {
  const w = sura.weather || '';
  if (w.includes('desert') || w.includes('hot'))       return BIOME_GROUND.desert;
  if (w.includes('spring') || w.includes('temperate'))  return BIOME_GROUND.garden;
  if (w.includes('water') || w.includes('rainy'))       return BIOME_GROUND.ocean;
  if (w.includes('night') || w.includes('lunar'))       return BIOME_GROUND.night;
  if (w.includes('volcanic'))                           return BIOME_GROUND.volcanic;
  if (w.includes('cosmic') || w.includes('thunder'))    return BIOME_GROUND.cosmic;
  if (w.includes('mountain') || w.includes('snowy'))    return BIOME_GROUND.mountain;
  if (w.includes('golden') || w.includes('dawn') || w.includes('celestial'))
    return BIOME_GROUND.sacred;
  return BIOME_GROUND.default;
}

/* ══════════════════════════════════════════════════════════════════
   AYAT TERRAIN CLASS
   ══════════════════════════════════════════════════════════════════ */

export class AyatTerrain {
  constructor(scene) {
    /** @type {THREE.Scene} */
    this.scene = scene;
    this.groundMesh = null;
    this._textCanvas = null;
  }

  /* ── Load Ayat and build terrain ─────────────────────────────── */

  async loadAyat(sura) {
    // Dispose previous
    if (this.groundMesh) {
      this.groundMesh.geometry.dispose();
      this.groundMesh.material.dispose();
      this.scene.remove(this.groundMesh);
    }

    // Fetch Ayat text
    let ayatTexts;
    try {
      ayatTexts = await this._fetchAyat(sura.id);
    } catch (e) {
      console.warn('Could not fetch Ayat, using fallback:', e.message);
      ayatTexts = FALLBACK_AYAT;
    }

    // Render text to canvas
    const palette = getGroundPalette(sura);
    const texture = this._renderTextTexture(ayatTexts, palette, sura);

    // Create ground mesh
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 128, 128);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.groundMesh = new THREE.Mesh(geo, mat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.groundMesh.userData.tag = 'ground';
    this.scene.add(this.groundMesh);
  }

  /* ── Fetch Ayat from Quran API ───────────────────────────────── */

  async _fetchAyat(suraId) {
    const url = `https://api.quran.com/api/v4/quran/text-uthmani?chapter_number=${suraId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    return (data.verses || []).map(v => v.text_uthmani);
  }

  /* ── Render Arabic text onto a Canvas ────────────────────────── */

  _renderTextTexture(ayatTexts, palette, sura) {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_SIZE;
    canvas.height = TEX_SIZE;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = palette.base;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    // Subtle grid/border pattern
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    const gridSize = TEX_SIZE / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * gridSize, 0);
      ctx.lineTo(i * gridSize, TEX_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * gridSize);
      ctx.lineTo(TEX_SIZE, i * gridSize);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Ornamental border
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.3;
    ctx.strokeRect(MARGIN / 2, MARGIN / 2, TEX_SIZE - MARGIN, TEX_SIZE - MARGIN);
    ctx.globalAlpha = 1;

    // Surah title (top center)
    ctx.font = `bold ${FONT_SIZE + 12}px Amiri, 'Traditional Arabic', serif`;
    ctx.fillStyle = palette.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.direction = 'rtl';
    const title = `سُورَةُ ${sura.nameAr}`;
    ctx.fillText(title, TEX_SIZE / 2, MARGIN);

    // Decorative line under title
    ctx.beginPath();
    ctx.moveTo(TEX_SIZE * 0.25, MARGIN + LINE_HEIGHT + 10);
    ctx.lineTo(TEX_SIZE * 0.75, MARGIN + LINE_HEIGHT + 10);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Bismillah (except Surah 9)
    let y = MARGIN + LINE_HEIGHT * 2;
    if (sura.id !== 9) {
      ctx.font = `${FONT_SIZE}px Amiri, 'Traditional Arabic', serif`;
      ctx.fillStyle = palette.accent;
      ctx.globalAlpha = 0.7;
      ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', TEX_SIZE / 2, y);
      ctx.globalAlpha = 1;
      y += LINE_HEIGHT * 1.5;
    }

    // Render Ayat
    ctx.font = `${FONT_SIZE}px Amiri, 'Traditional Arabic', serif`;
    ctx.fillStyle = palette.text;
    ctx.textAlign = 'center';

    const maxWidth = TEX_SIZE - MARGIN * 2;

    for (let i = 0; i < ayatTexts.length; i++) {
      const ayah = `﴿${ayatTexts[i]}﴾ ﴿${i + 1}﴾`;

      // Word-wrap long ayat
      const lines = this._wrapText(ctx, ayah, maxWidth);

      for (const line of lines) {
        if (y > TEX_SIZE - MARGIN) {
          // Reset to top to tile (the texture repeats)
          y = MARGIN + LINE_HEIGHT * 2;
          ctx.globalAlpha = 0.5; // dimmer on wrap
        }
        ctx.fillText(line, TEX_SIZE / 2, y);
        y += LINE_HEIGHT;
      }

      // Small gap between ayat
      y += LINE_HEIGHT * 0.3;
    }

    // Create Three.js texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3); // tile 3×3 across terrain
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8;

    this._textCanvas = canvas;
    return texture;
  }

  /* ── Text word-wrap helper ───────────────────────────────────── */

  _wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';

    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}
