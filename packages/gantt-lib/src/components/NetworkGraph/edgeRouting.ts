import type { NetworkGraphNodeBox } from './types';

/**
 * Routing of edges between "balls" in the reference style of a network diagram:
 * horizontal segments, 45° diagonals, long horizontal runs in corridors between rows.
 *
 * Principles:
 *  - edges exit the ball on the right arc, enter the ball on the left arc (small angular spread so
 *    parallel edges do not merge into one line);
 *  - diagonals live only in the windows between columns of nodes;
 *  - horizontal middle runs live only in corridors between rows, so they never cross nodes.
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
const CORRIDOR_CLEAR = 10; // clearance from rows for horizontal corridor lanes
const MIN_CORRIDOR = 6; // corridor narrower than this is not usable
const STUB_OUT = 16; // horizontal stub after leaving the source ball
const STUB_IN = 14; // horizontal stub before entering the target ball
const SPREAD_FACTOR = 0.36; // max angular spread on the ball arc (fraction of r)
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

/**
 * Safe y-intervals for a horizontal run crossing the given column:
 * everything not occupied by the column's node boxes (plus clearance).
 */
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

function laneInIntervals(
  intervals: Array<[number, number]>,
  lo: number,
  hi: number,
  fromY: number
): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const [a, b] of intervals) {
    const ia = Math.max(lo, a);
    const ib = Math.min(hi, b);
    if (ib < ia - EPS) continue;
    const lane = (ia + ib) / 2;
    const dist = Math.abs(lane - fromY);
    if (best === null || dist < bestDist) {
      best = lane;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * A horizontal lane is safe for a run crossing column colIdx if it does not
 * pass through any node box of that column.
 */
function isLaneSafeForColumn(geom: RoutingGeometry, colIdx: number, y: number): boolean {
  return safeIntervals(geom, colIdx).some(([a, b]) => y >= a - EPS && y <= b + EPS);
}

/**
 * Pick a lane for the horizontal run that crosses column colIdx.
 * Prefers the current lane (no jog), then a safe lane between fromY and toY,
 * then the nearest safe lane on either side (wide swing around the row).
 */
function safeRunLane(geom: RoutingGeometry, colIdx: number, fromY: number, toY: number): number | null {
  const intervals = safeIntervals(geom, colIdx);
  if (isLaneSafeForColumn(geom, colIdx, fromY)) return fromY;

  const lo = Math.min(fromY, toY);
  const hi = Math.max(fromY, toY);
  const inside = laneInIntervals(
    intervals.filter(([a, b]) => b >= lo - EPS && a <= hi + EPS),
    lo,
    hi,
    fromY
  );
  if (inside !== null) return inside;

  // Nothing between the lanes: swing to the nearest safe band on either side
  let best: number | null = null;
  let bestCost = Infinity;
  const dir = Math.sign(toY - fromY) || 1;
  for (const [a, b] of intervals) {
    const finiteB = Number.isFinite(b) ? b : a + 10000;
    const finiteA = Number.isFinite(a) ? a : b - 10000;
    const candidate = Math.abs(finiteA - fromY) <= Math.abs(finiteB - fromY) ? finiteA : finiteB;
    const toward = Math.sign(candidate - fromY) === dir ? 1 : 3;
    const cost = Math.abs(candidate - fromY) * toward;
    if (cost < bestCost) {
      bestCost = cost;
      best = candidate;
    }
  }
  return best;
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
 * Forward routing through column windows and row corridors.
 * start is on the source's right arc, end is on the target's left arc
 * (both approximately horizontal attachment points).
 */
function forwardRoute(geom: RoutingGeometry, colFrom: number, colTo: number, start: Pt, end: Pt): Pt[] {
  const pts: Pt[] = [{ ...start }];
  let cur: Pt = { ...start };
  let x = start.x + STUB_OUT;
  pts.push({ x, y: cur.y });

  for (let j = colFrom; j < colTo; j++) {
    const win = geom.windows[j];
    if (!win || win.width <= 0) continue;

    const need = end.y - cur.y;
    if (Math.abs(need) < EPS) break;
    const dir = Math.sign(need);

    const isLast = j === colTo - 1;
    let d: number;
    let diagStartX: number;

    if (isLast) {
      // Final diagonal lands exactly on the target's arc lane
      d = Math.min(Math.abs(need), win.width);
      diagStartX = end.x - STUB_IN - d;
      if (diagStartX < x) diagStartX = x;
    } else {
      // Move to a lane that is safe for the horizontal run crossing column j+1
      const lane = safeRunLane(geom, j + 1, cur.y, end.y);
      const targetY = lane !== null ? lane : cur.y + dir * win.width;
      d = Math.min(Math.abs(targetY - cur.y), win.width);
      diagStartX = win.x1;
    }

    if (d < EPS) continue;

    if (diagStartX > x + EPS) {
      // Horizontal run along the current (safe) lane up to the diagonal start
      pts.push({ x: diagStartX, y: cur.y });
    } else {
      diagStartX = x; // no room to run, start the diagonal right away
    }

    cur = { x: diagStartX + d, y: cur.y + dir * d };
    pts.push(cur);
    x = cur.x;
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
