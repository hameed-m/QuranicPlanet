/**
 * continents.js — Continent Geometry Generator for Quranic Planet
 * ================================================================
 * Generates two organic landmass shapes (Meccan & Medinan continents)
 * and tessellates them into Sura "countries" using Weighted Voronoi.
 *
 * Countries fill the ENTIRE continent — like a real political map.
 *
 * Usage:
 *   import { generateContinents } from './continents.js';
 *   const world = generateContinents(canvasWidth, canvasHeight);
 */

import { SURAS, getMeccanSuras, getMedinanSuras } from '../data/suras.js';

/* ══════════════════════════════════════════════════════════════════════
   §1  CONSTANTS
   ══════════════════════════════════════════════════════════════════════ */

const COASTLINE_ROUGHNESS = 0.35;
const COASTLINE_RESOLUTION = 120;

/** Minimum Voronoi weight so tiny suras still get visible cells. */
const MIN_WEIGHT = 4;

/** Colour palettes by sura type. */
const MECCAN_PALETTE = [
  '#8B6914', '#A67B2E', '#C49A3A', '#D4AF37', '#BF8C30',
  '#946B2D', '#7A5C28', '#B8860B', '#DAA520', '#CD853F',
  '#D2691E', '#C97E44', '#B8733D', '#A0522D', '#CC7A3E',
  '#D49B6A', '#C2884E', '#B07540', '#A06830', '#C09050',
];

const MEDINAN_PALETTE = [
  '#1B6B6D', '#1E7A7C', '#228B8E', '#1A5F5F', '#2D9E9E',
  '#1F8080', '#267575', '#186868', '#207070', '#2A8A8A',
  '#1C6060', '#258585', '#197272', '#216666', '#2C9090',
];

/* ══════════════════════════════════════════════════════════════════════
   §2  SEEDED PSEUDO-RANDOM & NOISE
   ══════════════════════════════════════════════════════════════════════ */

/** Deterministic PRNG (Mulberry32). Seed 1437 = Hijri year. */
function createRng(seed = 1437) {
  let s = seed | 0;
  return function rand() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Simple 1D value-noise for organic coastlines. */
function createNoise1D(rng) {
  const SIZE = 256;
  const table = Array.from({ length: SIZE }, () => rng() * 2 - 1);
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  return function noise(x) {
    const xi = Math.floor(x) & (SIZE - 1);
    const xf = x - Math.floor(x);
    return table[xi] + fade(xf) * (table[(xi + 1) & (SIZE - 1)] - table[xi]);
  };
}

/* ══════════════════════════════════════════════════════════════════════
   §3  GEOMETRY HELPERS
   ══════════════════════════════════════════════════════════════════════ */

/** 2D cross product of vectors (A→B) and (A→C). */
function cross2D(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/** Ray-casting point-in-polygon test. */
function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Line-line intersection. Returns {x, y} or null if parallel. */
function lineLineIntersect(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
  const d1x = p2x - p1x, d1y = p2y - p1y;
  const d2x = p4x - p3x, d2y = p4y - p3y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((p3x - p1x) * d2y - (p3y - p1y) * d2x) / denom;
  return { x: p1x + t * d1x, y: p1y + t * d1y };
}

/** Polygon axis-aligned bounding box. */
function polygonBounds(polygon) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Polygon centroid (average of vertices). */
function polygonCentroid(polygon) {
  let cx = 0, cy = 0;
  for (const p of polygon) { cx += p.x; cy += p.y; }
  return { x: cx / polygon.length, y: cy / polygon.length };
}

/** Signed polygon area (positive = CCW). */
function polygonSignedArea(polygon) {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return area / 2;
}

/** Proper polygon centroid using signed area formula. */
function polygonAreaCentroid(polygon) {
  const n = polygon.length;
  if (n < 3) return polygonCentroid(polygon);
  let cx = 0, cy = 0, area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const f = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    cx += (polygon[i].x + polygon[j].x) * f;
    cy += (polygon[i].y + polygon[j].y) * f;
    area += f;
  }
  area /= 2;
  if (Math.abs(area) < 1e-10) return polygonCentroid(polygon);
  cx /= (6 * area);
  cy /= (6 * area);
  return { x: cx, y: cy };
}

/* ══════════════════════════════════════════════════════════════════════
   §4  POLYGON CLIPPING (Sutherland-Hodgman variant)
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Clip a polygon to one side of a line.
 * Keeps the half-plane containing `keepPoint`.
 *
 * @param {Array<{x,y}>} polygon — Input polygon vertices
 * @param {{x,y}} lineA — First point on the dividing line
 * @param {{x,y}} lineB — Second point on the dividing line
 * @param {{x,y}} keepPoint — A reference point on the side to keep
 * @returns {Array<{x,y}>} — Clipped polygon
 */
function clipPolygonByLine(polygon, lineA, lineB, keepPoint) {
  if (polygon.length < 3) return polygon;

  const keepCross = cross2D(lineA.x, lineA.y, lineB.x, lineB.y, keepPoint.x, keepPoint.y);
  const keepSign = keepCross > 0 ? 1 : keepCross < 0 ? -1 : 0;
  if (keepSign === 0) return polygon; // degenerate — keepPoint is on the line

  const result = [];
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];

    const currCross = cross2D(lineA.x, lineA.y, lineB.x, lineB.y, curr.x, curr.y);
    const nextCross = cross2D(lineA.x, lineA.y, lineB.x, lineB.y, next.x, next.y);

    const currSide = currCross > 1e-10 ? 1 : currCross < -1e-10 ? -1 : 0;
    const nextSide = nextCross > 1e-10 ? 1 : nextCross < -1e-10 ? -1 : 0;

    // Keep vertex if on correct side or on the line
    if (currSide === keepSign || currSide === 0) {
      result.push(curr);
    }

    // If edge crosses the line, add intersection
    if (currSide !== 0 && nextSide !== 0 && currSide !== nextSide) {
      const inter = lineLineIntersect(
        curr.x, curr.y, next.x, next.y,
        lineA.x, lineA.y, lineB.x, lineB.y
      );
      if (inter) result.push(inter);
    }
  }

  return result;
}

/* ══════════════════════════════════════════════════════════════════════
   §5  COASTLINE GENERATION
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Generate an organic, closed coastline using multi-octave 1D noise.
 */
function generateCoastline(cx, cy, rx, ry, opts) {
  const {
    noise,
    roughness = COASTLINE_ROUGHNESS,
    resolution = COASTLINE_RESOLUTION,
    seed = 0,
  } = opts;

  const points = [];
  const step = (Math.PI * 2) / resolution;

  for (let i = 0; i < resolution; i++) {
    const angle = i * step;
    const t = (i / resolution) * 20 + seed;

    const n1 = noise(t) * roughness;
    const n2 = noise(t * 2.5 + 100) * roughness * 0.4;
    const n3 = noise(t * 5.0 + 200) * roughness * 0.15;
    const perturbation = 1 + n1 + n2 + n3;
    const peninsulaBoost = 0.08 * Math.max(0, Math.sin(angle * 3 + seed));
    const r = perturbation + peninsulaBoost;

    points.push({
      x: cx + Math.cos(angle) * rx * r,
      y: cy + Math.sin(angle) * ry * r,
    });
  }

  return points;
}

/* ══════════════════════════════════════════════════════════════════════
   §6  SEED PLACEMENT (Golden-Angle Spiral)
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Place one seed per sura inside the continent using a golden-angle spiral.
 * Bigger suras get placed first (near center).
 */
function placeSeedsInContinent(suras, outline, center, rng) {
  const sorted = [...suras].sort((a, b) => b.words - a.words);
  const seeds = [];

  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.3998 rad ≈ 137.508°
  const bounds = polygonBounds(outline);
  const maxR = Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2 * 0.82;
  const totalSuras = sorted.length;

  for (let i = 0; i < totalSuras; i++) {
    const angle = i * goldenAngle + rng() * 0.25;
    const r = Math.sqrt((i + 0.5) / totalSuras) * maxR;

    let x = center.x + Math.cos(angle) * r;
    let y = center.y + Math.sin(angle) * r;

    // Ensure seed is inside the outline; pull toward center if not
    if (!pointInPolygon(x, y, outline)) {
      for (let t = 0.95; t > 0.05; t -= 0.05) {
        const nx = center.x + (x - center.x) * t;
        const ny = center.y + (y - center.y) * t;
        if (pointInPolygon(nx, ny, outline)) {
          x = nx; y = ny;
          break;
        }
      }
      // Final fallback: jitter near center
      if (!pointInPolygon(x, y, outline)) {
        x = center.x + (rng() - 0.5) * maxR * 0.3;
        y = center.y + (rng() - 0.5) * maxR * 0.3;
      }
    }

    seeds.push({
      x, y,
      sura: sorted[i],
      weight: Math.max(MIN_WEIGHT, Math.sqrt(sorted[i].words)),
    });
  }

  return seeds;
}

/* ══════════════════════════════════════════════════════════════════════
   §7  WEIGHTED VORONOI TESSELLATION
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Compute weighted Voronoi cells for all seeds, clipped to the continent outline.
 *
 * For each seed Si with weight Wi, its cell is the set of points where
 * d(p, Si)/Wi ≤ d(p, Sj)/Wj  for all j ≠ i.
 *
 * The boundary between Si and Sj is a straight line (shifted perpendicular bisector),
 * so each cell is a convex polygon — the intersection of the continent outline with
 * a set of half-planes.
 */
function computeVoronoiCells(seeds, outline) {
  const cells = [];

  for (let i = 0; i < seeds.length; i++) {
    let cell = outline.map(p => ({ x: p.x, y: p.y })); // deep copy

    for (let j = 0; j < seeds.length; j++) {
      if (i === j || cell.length < 3) continue;

      const si = seeds[i], sj = seeds[j];

      // Weighted midpoint: ratio pushes boundary toward the lighter seed
      const wi = si.weight, wj = sj.weight;
      const ratio = wi / (wi + wj); // > 0.5 means Si is heavier → boundary closer to Sj

      const mid = {
        x: si.x + (sj.x - si.x) * ratio,
        y: si.y + (sj.y - si.y) * ratio,
      };

      // Perpendicular bisector direction (rotate Si→Sj by 90°)
      const dx = sj.x - si.x;
      const dy = sj.y - si.y;
      const lineA = mid;
      const lineB = { x: mid.x - dy, y: mid.y + dx };

      // Clip cell to the side containing Si
      cell = clipPolygonByLine(cell, lineA, lineB, si);
    }

    cells.push({
      points: cell,
      seed: seeds[i],
      sura: seeds[i].sura,
      suraId: seeds[i].sura.id,
    });
  }

  return cells;
}

/* ══════════════════════════════════════════════════════════════════════
   §8  LLOYD RELAXATION
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Perform Lloyd relaxation: move each seed to its cell centroid, then recompute.
 * This produces more uniform, organic-looking cells.
 *
 * @param {Array} seeds — Current seed positions
 * @param {Array<{x,y}>} outline — Continent outline
 * @param {number} iterations — Number of relaxation passes
 * @returns {Array} — Relaxed seeds (mutated in place)
 */
function lloydRelax(seeds, outline, iterations = 2) {
  for (let iter = 0; iter < iterations; iter++) {
    const cells = computeVoronoiCells(seeds, outline);

    for (let i = 0; i < seeds.length; i++) {
      const cell = cells[i];
      if (cell.points.length < 3) continue;

      // Move seed toward cell centroid, but keep it inside the outline
      const centroid = polygonAreaCentroid(cell.points);
      if (pointInPolygon(centroid.x, centroid.y, outline)) {
        seeds[i].x = centroid.x;
        seeds[i].y = centroid.y;
      }
    }
  }

  return seeds;
}

/* ══════════════════════════════════════════════════════════════════════
   §9  COLOUR ASSIGNMENT
   ══════════════════════════════════════════════════════════════════════ */

function pickCountryColour(sura) {
  if (sura.type === 'meccan') {
    return MECCAN_PALETTE[sura.juz % MECCAN_PALETTE.length];
  }
  return MEDINAN_PALETTE[sura.juz % MEDINAN_PALETTE.length];
}

/* ══════════════════════════════════════════════════════════════════════
   §10  OCEAN DATA
   ══════════════════════════════════════════════════════════════════════ */

function computeOcean(meccanRight, medinanLeft, canvasHeight) {
  const centreX = (meccanRight + medinanLeft) / 2;
  return {
    bounds: {
      left: meccanRight,
      right: medinanLeft,
      top: 0,
      bottom: canvasHeight,
    },
    centreX,
    width: medinanLeft - meccanRight,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   §11  MAIN EXPORT — generateContinents()
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Generate all continent geometry and country placements.
 */
export function generateContinents(canvasWidth, canvasHeight) {
  const rng = createRng(1437);
  const noise = createNoise1D(rng);

  /* ── Layout proportions ──────────────────────────────────────────── */
  const MECCAN_WIDTH_RATIO = 0.55;
  const GAP_RATIO = 0.14;
  const MEDINAN_WIDTH_RATIO = 0.31;
  const margin = canvasWidth * 0.02;

  // Meccan continent (left, ~55%)
  const meccanCx = margin + (canvasWidth * MECCAN_WIDTH_RATIO) / 2;
  const meccanCy = canvasHeight / 2;
  const meccanRx = (canvasWidth * MECCAN_WIDTH_RATIO) / 2 - margin;
  const meccanRy = canvasHeight * 0.42;

  // Medinan continent (right, ~31%)
  const medinanLeft = canvasWidth * (MECCAN_WIDTH_RATIO + GAP_RATIO);
  const medinanCx = medinanLeft + (canvasWidth * MEDINAN_WIDTH_RATIO) / 2;
  const medinanCy = canvasHeight / 2;
  const medinanRx = (canvasWidth * MEDINAN_WIDTH_RATIO) / 2 - margin;
  const medinanRy = canvasHeight * 0.40;

  /* ── Generate coastlines ─────────────────────────────────────────── */
  const meccanOutline = generateCoastline(meccanCx, meccanCy, meccanRx, meccanRy, {
    noise, roughness: 0.35, resolution: COASTLINE_RESOLUTION, seed: 0,
  });
  const medinanOutline = generateCoastline(medinanCx, medinanCy, medinanRx, medinanRy, {
    noise, roughness: 0.22, resolution: Math.round(COASTLINE_RESOLUTION * 0.85), seed: 50,
  });

  /* ── Place seeds ─────────────────────────────────────────────────── */
  let meccanSeeds = placeSeedsInContinent(
    getMeccanSuras(), meccanOutline, { x: meccanCx, y: meccanCy }, rng
  );
  let medinanSeeds = placeSeedsInContinent(
    getMedinanSuras(), medinanOutline, { x: medinanCx, y: medinanCy }, rng
  );

  /* ── Lloyd relaxation for quality (2 passes) ─────────────────────── */
  meccanSeeds = lloydRelax(meccanSeeds, meccanOutline, 2);
  medinanSeeds = lloydRelax(medinanSeeds, medinanOutline, 2);

  /* ── Final Voronoi tessellation ──────────────────────────────────── */
  const meccanCells = computeVoronoiCells(meccanSeeds, meccanOutline);
  const medinanCells = computeVoronoiCells(medinanSeeds, medinanOutline);

  /* ── Build country objects ───────────────────────────────────────── */
  const buildCountry = (cell) => {
    if (cell.points.length < 3) return null;
    const centroid = polygonAreaCentroid(cell.points);
    const bounds = polygonBounds(cell.points);
    return {
      suraId: cell.suraId,
      sura: cell.sura,
      x: centroid.x,
      y: centroid.y,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
      points: cell.points,
      color: pickCountryColour(cell.sura),
      labelPos: { x: centroid.x, y: centroid.y },
    };
  };

  const meccanCountries = meccanCells.map(buildCountry).filter(Boolean);
  const medinanCountries = medinanCells.map(buildCountry).filter(Boolean);

  /* ── Ocean data ──────────────────────────────────────────────────── */
  const meccanBounds = polygonBounds(meccanOutline);
  const medinanBounds = polygonBounds(medinanOutline);
  const ocean = computeOcean(meccanBounds.maxX, medinanBounds.minX, canvasHeight);

  return {
    meccan: {
      outline: meccanOutline,
      countries: meccanCountries,
      centre: { x: meccanCx, y: meccanCy },
      bounds: meccanBounds,
    },
    medinan: {
      outline: medinanOutline,
      countries: medinanCountries,
      centre: { x: medinanCx, y: medinanCy },
      bounds: medinanBounds,
    },
    ocean,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   §12  UTILITY EXPORTS
   ══════════════════════════════════════════════════════════════════════ */

export function hitTestCountry(px, py, world) {
  const allCountries = [...world.meccan.countries, ...world.medinan.countries];
  for (const country of allCountries) {
    if (pointInPolygon(px, py, country.points)) return country;
  }
  return null;
}

export function hitTestContinent(px, py, world) {
  if (pointInPolygon(px, py, world.meccan.outline)) return 'meccan';
  if (pointInPolygon(px, py, world.medinan.outline)) return 'medinan';
  return 'ocean';
}

export { pointInPolygon };
