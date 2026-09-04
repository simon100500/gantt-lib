import type { NetworkGraphNodeBox } from './types';

/**
 * Routing of edges between "balls" in the reference style of a network diagram:
 * horizontal runs + 45° diagonals, minimal number of bends.
 *
 * Global rules (no greedy micro-adjustments — those look like glitches):
 *  - every horizontal run lives on a lane from a global 13px grid, so parallel
 *    edges either share the exact lane (bus) or are ≥13px apart — never almost-parallel;
 *  - a diagonal shorter than MIN_BEND is never drawn: either the lane already
 *    works, or the edge steps a full grid step away;
 *  - a run crossing a column stays inside that column's safe band (clear of all
 *    its node boxes); safe bands are computed per column, so off-grid nodes
 *    (network-simplex alignment) are handled correctly;
 *  - the ideal edge is: stub → diagonal to its corridor lane → one long run →
 *    diagonal into the target → stub (\____/ in the reference style). Extra bends
 *    appear only for multi-row edges, where each window contributes at most
 *    its width of vertical travel (a staircase through corridors).
 */

export interface RoutingWindow {
  x1: number;
  x2: number;
  width: number;
}

export interface RoutingGeometry {
  boxes: NetworkGraphNodeBox[];
  boxById: Map<string, NetworkGraphNodeBox>;
  /** Column rects (left-to-right), one per ELK layer */
  columns: { x: number; width: number }[];
  /** Node boxes grouped by column index */
  columnBoxes: NetworkGraphNodeBox[][];
  colIndexOf: Map<string, number>;
  /** Diagonal windows between consecutive columns */
  windows: RoutingWindow[];
  /** Safe y-lanes for horizontal runs (corridors between aligned rows; informational) */
  corridorLanes: number[];
}

export interface RoutedEdge {
  id: string;
  source: string;
  target: string;
  points: Pt[];
  /** true — backwards edge (cycle leftover), routed with the orthogonal fallback */
  fallback: boolean;
}

interface Pt {
  x: number;
  y: number;
}

const PAD_DIAG = 22; // clearance from node boxes for diagonal windows
const CORRIDOR_CLEAR = 10; // clearance between runs and node boxes
const MIN_CORRIDOR = 6; // corridor narrower than this is not usable
const STUB_OUT = 16; // horizontal stub after leaving the source ball
const STUB_IN = 14; // horizontal stub before entering the target ball
const SPREAD_FACTOR = 0.36; // max angular spread on the ball arc (fraction of r)
const LANE_GRID = 13; // all run lanes snapped to this grid
const MIN_BEND = 16; // never draw a diagonal shorter than this (anti-kink)
const EPS = 0.5;

export function buildRoutingGeometry(boxes: NetworkGraphNodeBox[]): RoutingGeometry {
  const boxById = new Map(boxes.map(b => [b.id, b]));

  // Cluster boxes into columns by x (same layer => same x in layered LR layout)
  const sortedByX = [...boxes].sort((a, b) => a.x - b.x);
  const columns: { x: number; width: number }[] = [];
  const columnBoxes: NetworkGraphNodeBox[][] = [];
  const colIndexOf = new Map<string, number>();
  for (const box of sortedByX) {
    const last = columns[columns.length - 1];
    if (last && Math.abs(last.x - box.x) < 1) {
      last.width = Math.max(last.width, box.width);
      columnBoxes[columnBoxes.length - 1].push(box);
      colIndexOf.set(box.id, columns.length - 1);
    } else {
      columns.push({ x: box.x, width: box.width });
      columnBoxes.push([box]);
      colIndexOf.set(box.id, columns.length - 1);
    }
  }

  const windows: RoutingWindow[] = [];
  for (let i = 0; i < columns.length - 1; i++) {
    const x1 = columns[i].x + columns[i].width + PAD_DIAG;
    const x2 = columns[i + 1].x - PAD_DIAG;
    windows.push({ x1, x2, width: Math.max(x2 - x1, 0) });
  }

  // Cluster boxes into rows by y, then put a corridor lane between consecutive rows
  const sortedByY = [...boxes].sort((a, b) => a.y - b.y);
  const rows: { top: number; bottom: number }[] = [];
  for (const box of sortedByY) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.top - box.y) < 4) {
      last.bottom = Math.max(last.bottom, box.y + box.height);
    } else {
      rows.push({ top: box.y, bottom: box.y + box.height });
    }
  }
  const corridorLanes: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const yTop = rows[i].bottom + CORRIDOR_CLEAR;
    const yBottom = rows[i + 1].top - CORRIDOR_CLEAR;
    if (yBottom - yTop >= MIN_CORRIDOR) {
      corridorLanes.push((yTop + yBottom) / 2);
    }
  }

  return { boxes, boxById, columns, columnBoxes, colIndexOf, windows, corridorLanes };
}

/** Vertical offset on the ball arc for the given slot (fan-out / fan-in spread) */
function slotOffset(slot: number, count: number, r: number): number {
  if (count <= 1) return 0;
  const maxOff = r * SPREAD_FACTOR;
  return -maxOff + (2 * maxOff * slot) / (count - 1);
}

function pointOnRightArc(cx: number, cy: number, r: number, dy: number): Pt {
  const clamped = Math.min(Math.abs(dy), r * 0.95);
  return { x: cx + Math.sqrt(r * r - clamped * clamped), y: cy + Math.sign(dy || 1) * clamped };
}

function pointOnLeftArc(cx: number, cy: number, r: number, dy: number): Pt {
  const clamped = Math.min(Math.abs(dy), r * 0.95);
  return { x: cx - Math.sqrt(r * r - clamped * clamped), y: cy + Math.sign(dy || 1) * clamped };
}

function snapLane(v: number): number {
  return Math.round(v / LANE_GRID) * LANE_GRID;
}

/** Safe y-intervals for a horizontal run crossing the given column */
function safeIntervals(geom: RoutingGeometry, colIdx: number): Array<[number, number]> {
  const boxes = [...(geom.columnBoxes[colIdx] ?? [])].sort((a, b) => a.y - b.y);
  const intervals: Array<[number, number]> = [];
  let prevBottom = -Infinity;
  for (const b of boxes) {
    intervals.push([prevBottom, b.y - CORRIDOR_CLEAR]);
    prevBottom = b.y + b.height + CORRIDOR_CLEAR;
  }
  intervals.push([prevBottom, Infinity]);
  return intervals;
}

function isLaneSafeForColumn(geom: RoutingGeometry, colIdx: number, y: number): boolean {
  return safeIntervals(geom, colIdx).some(([a, b]) => y >= a - EPS && y <= b + EPS);
}

function bandMidpoint(a: number, b: number): number {
  const flo = Number.isFinite(a) ? a : b - 1e4;
  const fhi = Number.isFinite(b) ? b : a + 1e4;
  return Math.min(fhi - 1, Math.max(flo + 1, snapLane((flo + fhi) / 2)));
}

/**
 * Lane for the horizontal run that will cross column colIdx.
 * Returns `from` itself when it is already safe; otherwise a grid lane inside
 * the safe band nearest to `from` (preferring bands lying towards the target).
 * The lane is always a full grid step away from `from` (never a 3px nudge).
 */
function corridorLaneFor(geom: RoutingGeometry, colIdx: number, from: number, to: number): number | null {
  const intervals = safeIntervals(geom, colIdx);
  if (!intervals.length) return null;
  if (isLaneSafeForColumn(geom, colIdx, from)) return from;

  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const dir = Math.sign(to - from) || 1;

  let bestBand: [number, number] | null = null;
  let bestCost = Infinity;
  for (const [a, b] of intervals) {
    const nearest = Math.min(Math.max(from, a), b); // closest point of the band to `from`
    let cost = Math.abs(nearest - from);
    if (Math.sign(nearest - from) !== dir) cost *= 3; // going backwards is worse
    const intersectsSpan = b >= lo - EPS && a <= hi + EPS;
    if (!intersectsSpan) cost += 1e5; // swing around only if nothing lies between
    if (cost < bestCost) {
      bestCost = cost;
      bestBand = [a, b];
    }
  }
  if (!bestBand) return null;

  let [a, b] = bestBand;
  const intersectsSpan = b >= lo - EPS && a <= hi + EPS;
  if (intersectsSpan) {
    a = Math.max(a, lo);
    b = Math.min(b, hi);
    if (b - a < LANE_GRID) {
      // the span barely clips the band — use the band part outside the span instead
      a = bestBand[0];
      b = bestBand[1];
    }
  }
  const lane = bandMidpoint(a, b);
  if (Math.abs(lane - from) < MIN_BEND) {
    // too close for a meaningful bend: step a full grid step towards the band
    const nearest = Math.min(Math.max(from, a), b);
    const stepped = snapLane(from + Math.sign(nearest - from || dir) * MIN_BEND);
    if (Math.abs(stepped - from) < MIN_BEND || stepped < a - EPS || stepped > b + EPS) {
      return from; // no meaningful move — keep the current lane
    }
    return stepped;
  }
  return lane;
}

/**
 * Route all edges. Returns paths in the same order as the input edges.
 * Edges that point backwards in the layered layout (cycle leftovers) get a
 * chamfered orthogonal fallback around the sides.
 */
export function routeEdges(
  geom: RoutingGeometry,
  edges: { id: string; source: string; target: string }[]
): RoutedEdge[] {
  const valid = edges.filter(e => geom.boxById.has(e.source) && geom.boxById.has(e.target));

  // Fan-out/fan-in slots: edges of a node sorted by the other endpoint's position,
  // so the angular spread follows the natural direction of each edge and
  // parallel edges never merge into one line.
  const outOrder = new Map<string, number>();
  const inOrder = new Map<string, number>();
  {
    const sortedOut = [...valid].sort((a, b) => {
      const ta = geom.boxById.get(a.target)!;
      const tb = geom.boxById.get(b.target)!;
      return ta.ball.cy - tb.ball.cy || ta.ball.cx - tb.ball.cx;
    });
    const sortedIn = [...valid].sort((a, b) => {
      const sa = geom.boxById.get(a.source)!;
      const sb = geom.boxById.get(b.source)!;
      return sa.ball.cy - sb.ball.cy || sa.ball.cx - sb.ball.cx;
    });
    const outCount = new Map<string, number>();
    const inCount = new Map<string, number>();
    for (const e of sortedOut) {
      const n = outCount.get(e.source) ?? 0;
      outOrder.set(e.id, n);
      outCount.set(e.source, n + 1);
    }
    for (const e of sortedIn) {
      const n = inCount.get(e.target) ?? 0;
      inOrder.set(e.id, n);
      inCount.set(e.target, n + 1);
    }
  }

  const outTotals = new Map<string, number>();
  const inTotals = new Map<string, number>();
  for (const e of valid) {
    outTotals.set(e.source, (outTotals.get(e.source) ?? 0) + 1);
    inTotals.set(e.target, (inTotals.get(e.target) ?? 0) + 1);
  }

  return valid.map(e => {
    const s = geom.boxById.get(e.source)!;
    const t = geom.boxById.get(e.target)!;
    const si = geom.colIndexOf.get(e.source) ?? 0;
    const ti = geom.colIndexOf.get(e.target) ?? 0;

    if (ti <= si) {
      return { ...e, points: fallbackRoute(s.ball, t.ball), fallback: true };
    }

    const dyOut = slotOffset(outOrder.get(e.id) ?? 0, outTotals.get(e.source) ?? 1, s.ball.r);
    const dyIn = slotOffset(inOrder.get(e.id) ?? 0, inTotals.get(e.target) ?? 1, t.ball.r);

    const start = pointOnRightArc(s.ball.cx, s.ball.cy, s.ball.r, dyOut);
    let end = pointOnLeftArc(t.ball.cx, t.ball.cy, t.ball.r, dyIn);

    // Straight lane: the start lane must hit the target's arc and stay clear of
    // every node box in the columns the run crosses.
    const dy = end.y - start.y;
    const laneOnArc = Math.abs(start.y - t.ball.cy) <= t.ball.r * 0.95;
    const startLaneClear = geom.columns.every((_, colIdx) => {
      if (colIdx <= si || colIdx >= ti) return true; // own box remainder / target box remainder
      return isLaneSafeForColumn(geom, colIdx, start.y);
    });
    if (Math.abs(dy) < EPS || (laneOnArc && startLaneClear)) {
      end = pointOnLeftArc(t.ball.cx, t.ball.cy, t.ball.r, start.y - t.ball.cy);
      return { ...e, points: [start, end], fallback: false };
    }

    return { ...e, points: forwardRoute(geom, si, ti, start, end), fallback: false };
  });
}

/**
 * Forward routing. The edge bends only where it must:
 *  - one bend into a safe corridor lane right after the source,
 *  - one bend out of it right before the target,
 *  - intermediate bends only when a multi-row edge staircases through corridors
 *    (each bend ≥ MIN_BEND, lanes on the global grid — no kinks).
 */
function forwardRoute(geom: RoutingGeometry, colFrom: number, colTo: number, start: Pt, end: Pt): Pt[] {
  const pts: Pt[] = [{ ...start }];
  let curY = start.y;
  let x = start.x + STUB_OUT;
  pts.push({ x, y: curY });

  for (let j = colFrom; j < colTo; j++) {
    const win = geom.windows[j];
    if (!win || win.width <= 0) continue;

    const need = end.y - curY;
    if (Math.abs(need) < EPS) break;
    const dir = Math.sign(need);
    const isLast = j === colTo - 1;

    if (isLast) {
      // Final diagonal lands exactly on the target's arc lane (single-window
      // edges get a single clean 45° diagonal here).
      const d = Math.min(Math.abs(need), win.width);
      let diagStartX = end.x - STUB_IN - d;
      if (diagStartX < x) diagStartX = x;
      pts.push({ x: diagStartX, y: curY });
      curY += dir * d;
      pts.push({ x: diagStartX + d, y: curY });
      x = diagStartX + d;
      break;
    }

    const lane = corridorLaneFor(geom, j + 1, curY, end.y);
    if (lane === null) continue;
    const dSigned = lane - curY;
    if (Math.abs(dSigned) < MIN_BEND) continue; // lane already good — straight run

    const d = Math.min(Math.abs(dSigned), win.width);
    const diagStartX = Math.max(x, win.x1);
    pts.push({ x: diagStartX, y: curY });
    curY += Math.sign(dSigned) * d;
    pts.push({ x: diagStartX + d, y: curY });
    x = diagStartX + d;
  }

  pts.push({ ...end });
  return pts;
}

/**
 * Fallback for edges that point backwards in the layered layout
 * (cycle leftovers): orthogonal detour with 45° chamfered corners.
 */
function fallbackRoute(s: { cx: number; cy: number; r: number }, t: { cx: number; cy: number; r: number }): Pt[] {
  const out = 24;
  const below = t.cy >= s.cy;
  const midY = below ? Math.max(s.cy, t.cy) + 60 : Math.min(s.cy, t.cy) - 60;
  const midX = Math.max(s.cx + s.r, t.cx + t.r) + out;

  return chamferPolyline([
    { x: s.cx + s.r, y: s.cy },
    { x: midX, y: s.cy },
    { x: midX, y: t.cy },
    { x: t.cx + t.r + out, y: t.cy },
    { x: t.cx - t.r, y: t.cy },
  ]);
}

/**
 * Replace every 90° corner of a polyline with a 45° cut.
 * Used by the fallback router; the forward router produces 45° segments directly.
 */
export function chamferPolyline(pts: Pt[], radius = 10): Pt[] {
  if (pts.length < 3) return pts;

  const result: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];

    const v1 = { x: b.x - a.x, y: b.y - a.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const l1 = Math.hypot(v1.x, v1.y);
    const l2 = Math.hypot(v2.x, v2.y);

    if (l1 < EPS || l2 < EPS) continue; // skip duplicate points

    const rEff = Math.min(radius, l1 / 2, l2 / 2);
    result.push(
      { x: b.x - (v1.x / l1) * rEff, y: b.y - (v1.y / l1) * rEff },
      { x: b.x + (v2.x / l2) * rEff, y: b.y + (v2.y / l2) * rEff }
    );
  }
  result.push(pts[pts.length - 1]);
  return result;
}

export function polylineToPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  return (
    `M ${round(pts[0].x)} ${round(pts[0].y)} ` +
    pts.slice(1).map(p => `L ${round(p.x)} ${round(p.y)}`).join(' ')
  );
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
