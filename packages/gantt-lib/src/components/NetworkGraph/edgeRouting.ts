import { BALL_RADIUS } from './layout';
import type { NetworkGraphNodeBox, NetworkGraphRoutingOptions } from './types';

/**
 * Routing of edges between "balls" in the reference style of a network diagram:
 * horizontal runs + short diagonals, minimal number of bends.
 *
 * Global rules (no greedy micro-adjustments — those look like glitches):
 *  - parallel horizontal runs either share a deliberate bus lane or are
 *    separated by a meaningful minimum distance — never almost-parallel;
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

export interface RoutedConnectionEdge {
  id: string;
  source: string;
  target: string;
  /** Один прямой участок между точками на окружностях. */
  d: string;
  start: Pt;
  end: Pt;
}

export interface Pt {
  x: number;
  y: number;
}

const PAD_DIAG = 22; // clearance from node boxes for diagonal windows
const CORRIDOR_CLEAR = 10; // clearance between runs and node boxes
const MIN_CORRIDOR = 6; // corridor narrower than this is not usable
const STUB_OUT = 16; // horizontal stub after leaving the source ball
const STUB_IN = 14; // horizontal stub before entering the target ball

/** Минимальный разнос параллельных полос. Это шаг поиска, а не абсолютная
 * координатная сетка: итоговая полоса остаётся привязанной к геометрии графа. */
const LANE_GRID = 26;
const MIN_BEND = 16; // never draw a diagonal shorter than this (anti-kink)
const EPS = 0.5;
/** Не уводим веер к верхней и нижней точкам круга: там стрелки теряют направление. */
const DIRECT_FAN_ARC = 0.72;

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

/** Вертикальный разнос между соседними связями в веере (как полосы в git graph) */
const FAN_STEP = 26;
/** Запас окна к перепаду (заходы у вершин) */
const WINDOW_SLACK = 56;

/** Vertical offset on the ball arc for the given slot (fan-out / fan-in spread).
 *  Слоты разнесены минимум на FAN_STEP, чтобы выходящие связи не сливались. */
function slotOffset(slot: number, count: number, r: number): number {
  if (count <= 1) return 0;
  const half = (count - 1) / 2;
  const step = Math.min(FAN_STEP, (r * 0.9) / half);
  const offset = (slot - half) * step;
  const maxOff = r * 0.95;
  return Math.min(maxOff, Math.max(-maxOff, offset));
}

function pointOnRightArc(cx: number, cy: number, r: number, dy: number): Pt {
  const clamped = Math.min(Math.abs(dy), r * 0.95);
  return { x: cx + Math.sqrt(r * r - clamped * clamped), y: cy + Math.sign(dy || 1) * clamped };
}

function pointOnLeftArc(cx: number, cy: number, r: number, dy: number): Pt {
  const clamped = Math.min(Math.abs(dy), r * 0.95);
  return { x: cx - Math.sqrt(r * r - clamped * clamped), y: cy + Math.sign(dy || 1) * clamped };
}

function pointOnHorizontalArc(
  ball: NetworkGraphNodeBox['ball'],
  side: -1 | 1,
  dy: number,
  fanArc: number
): Pt {
  const maxOffset = ball.r * fanArc;
  const offset = Math.max(-maxOffset, Math.min(maxOffset, dy));
  const x = Math.sqrt(Math.max(0, ball.r * ball.r - offset * offset));
  return { x: ball.cx + side * x, y: ball.cy + offset };
}

function directSlotOffset(slot: number, count: number, r: number, fanArc: number, fanStep: number): number {
  if (count <= 1) return 0;
  const spread = Math.min(r * fanArc, (fanStep * (count - 1)) / 2);
  return -spread + (slot / (count - 1)) * spread * 2;
}

function groupEdges(
  edges: { id: string; source: string; target: string }[],
  key: 'source' | 'target'
): Map<string, { id: string; source: string; target: string }[]> {
  const groups = new Map<string, { id: string; source: string; target: string }[]>();
  for (const edge of edges) {
    const id = edge[key];
    const group = groups.get(id) ?? [];
    group.push(edge);
    groups.set(id, group);
  }
  return groups;
}

/** Один прямой SVG-сегмент между двумя точками дуг. */
export function directLinePath(start: Pt, end: Pt): string {
  if (Math.hypot(end.x - start.x, end.y - start.y) < EPS) {
    return `M ${round(start.x)} ${round(start.y)}`;
  }
  return `M ${round(start.x)} ${round(start.y)} L ${round(end.x)} ${round(end.y)}`;
}

function clamp01(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

/**
 * Связь с опциональной горизонтальной полкой. Snap меняет только центральный
 * участок: к окружностям линия подходит короткими плечами, а между ними идёт
 * одним горизонтальным L. При нулевых настройках сохраняется прямая связь.
 */
export function directConnectionPath(
  start: Pt,
  end: Pt,
  options: NetworkGraphRoutingOptions = {}
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const snap = clamp01(options.horizontalSnap, 0);
  const threshold = Math.max(0, options.snapThreshold ?? 0);
  if (snap <= EPS || Math.abs(dy) <= EPS || Math.abs(dy) > threshold || Math.abs(dx) < 32) {
    return directLinePath(start, end);
  }

  const direction = dx >= 0 ? 1 : -1;
  const endpointLength = Math.max(0, options.endpointLength ?? 44);
  const shoulder = Math.min(Math.abs(dx) * 0.22, endpointLength);
  const laneY = start.y + dy * (1 - snap);
  const lineStart = { x: start.x + direction * shoulder, y: laneY };
  const lineEnd = { x: end.x - direction * shoulder, y: laneY };
  const curve = clamp01(options.endpointCurve, 0.7);
  if (curve <= EPS) {
    return (
      `M ${round(start.x)} ${round(start.y)} ` +
      `L ${round(lineStart.x)} ${round(lineStart.y)} ` +
      `L ${round(lineEnd.x)} ${round(lineEnd.y)} ` +
      `L ${round(end.x)} ${round(end.y)}`
    );
  }

  const handle = shoulder * curve;
  const startControl = { x: start.x + direction * handle, y: start.y };
  const lineStartControl = { x: lineStart.x - direction * handle, y: lineStart.y };
  const lineEndControl = { x: lineEnd.x + direction * handle, y: lineEnd.y };
  const endControl = { x: end.x - direction * handle, y: end.y };
  return (
    `M ${round(start.x)} ${round(start.y)} ` +
    `C ${round(startControl.x)} ${round(startControl.y)} ${round(lineStartControl.x)} ${round(lineStartControl.y)} ${round(lineStart.x)} ${round(lineStart.y)} ` +
    `L ${round(lineEnd.x)} ${round(lineEnd.y)} ` +
    `C ${round(lineEndControl.x)} ${round(lineEndControl.y)} ${round(endControl.x)} ${round(endControl.y)} ${round(end.x)} ${round(end.y)}`
  );
}

/**
 * Простая маршрутизация для сетевого графика: одна кривая на ребро.
 * Веера сортируются по положению противоположной вершины и занимают разные
 * точки дуги — порядок связей читается уже на выходе из круга.
 */
export function routeDirectConnections(
  geom: RoutingGeometry,
  edges: { id: string; source: string; target: string }[],
  options?: NetworkGraphRoutingOptions
): RoutedConnectionEdge[] {
  const valid = edges.filter(e => geom.boxById.has(e.source) && geom.boxById.has(e.target));
  const outSlots = new Map<string, number>();
  const inSlots = new Map<string, number>();
  const outTotals = new Map<string, number>();
  const inTotals = new Map<string, number>();
  const fanArc = clamp01(options?.fanArc, DIRECT_FAN_ARC);
  const fanStep = Math.max(0, options?.fanStep ?? FAN_STEP);

  for (const [source, group] of groupEdges(valid, 'source')) {
    group.sort((a, b) => {
      const ta = geom.boxById.get(a.target)!.ball;
      const tb = geom.boxById.get(b.target)!.ball;
      return ta.cy - tb.cy || ta.cx - tb.cx || a.id.localeCompare(b.id);
    });
    outTotals.set(source, group.length);
    group.forEach((edge, index) => outSlots.set(edge.id, index));
  }
  for (const [target, group] of groupEdges(valid, 'target')) {
    group.sort((a, b) => {
      const sa = geom.boxById.get(a.source)!.ball;
      const sb = geom.boxById.get(b.source)!.ball;
      return sa.cy - sb.cy || sa.cx - sb.cx || a.id.localeCompare(b.id);
    });
    inTotals.set(target, group.length);
    group.forEach((edge, index) => inSlots.set(edge.id, index));
  }

  return valid.map(edge => {
    const source = geom.boxById.get(edge.source)!;
    const target = geom.boxById.get(edge.target)!;
    const direction: -1 | 1 = target.ball.cx >= source.ball.cx ? 1 : -1;
    const startOffset = directSlotOffset(
      outSlots.get(edge.id) ?? 0,
      outTotals.get(edge.source) ?? 1,
      source.ball.r,
      fanArc,
      fanStep
    );
    const endOffset = directSlotOffset(
      inSlots.get(edge.id) ?? 0,
      inTotals.get(edge.target) ?? 1,
      target.ball.r,
      fanArc,
      fanStep
    );
    const start = pointOnHorizontalArc(source.ball, direction, startOffset, fanArc);
    const end = pointOnHorizontalArc(target.ball, direction === 1 ? -1 : 1, endOffset, fanArc);
    return {
      ...edge,
      start,
      end,
      d: directConnectionPath(start, end, options),
    };
  });
}

function snapLane(v: number): number {
  return v;
}

/** Safe y-intervals for a horizontal run crossing the given column */
function safeIntervals(geom: RoutingGeometry, colIdx: number): Array<[number, number]> {
  const boxes = [...(geom.columnBoxes[colIdx] ?? [])].sort((a, b) => a.y - b.y);
  const intervals: Array<[number, number]> = [];
  let prevBottom = -Infinity;
  for (const b of boxes) {
    const top = b.y - CORRIDOR_CLEAR;
    // тесные ряды могут давать вырожденный (перевёрнутый) интервал — не пушим его,
    // чтобы он не отравлял пересечение интервалов нескольких колонок
    if (top >= prevBottom) intervals.push([prevBottom, top]);
    prevBottom = b.y + b.height + CORRIDOR_CLEAR;
  }
  if (-Infinity === prevBottom) prevBottom = 0;
  intervals.push([prevBottom, Infinity]);
  return intervals;
}

function isLaneSafeForColumn(geom: RoutingGeometry, colIdx: number, y: number): boolean {
  return safeIntervals(geom, colIdx).some(([a, b]) => y >= a - EPS && y <= b + EPS);
}

function bandMidpoint(a: number, b: number): number {
  // Бесконечные полосы (выше всех / ниже всех) — ближайшая сеточная полоса внутрь,
  // а не «середина бесконечности»
  if (!Number.isFinite(a)) return snapLane(b - LANE_GRID);
  if (!Number.isFinite(b)) return snapLane(a + LANE_GRID);
  const mid = snapLane((a + b) / 2);
  return Math.min(b - 1, Math.max(a + 1, mid));
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

function intersectIntervals(A: Array<[number, number]>, B: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const [a0, a1] of A) {
    for (const [b0, b1] of B) {
      const lo = Math.max(a0, b0);
      const hi = Math.min(a1, b1);
      if (hi >= lo - EPS) out.push([lo, hi]);
    }
  }
  return out;
}

function laneInIntervalsList(intervals: Array<[number, number]>, lane: number): boolean {
  return intervals.some(([a, b]) => lane >= a - EPS && lane <= b + EPS);
}

/**
 * The sweep lane of a multi-column edge: a safe lane on the FAR side of the
 * target row (beyond the target box). Sweeping past the target row keeps the
 * edge outside every sibling's descent — the nested-fan look of reference
 * network diagrams ("уйти вниз/вверх"). Returns null when no such lane exists
 * or it is out of reach of the first/last window.
 */
function sweepLane(
  geom: RoutingGeometry,
  si: number,
  ti: number,
  startY: number,
  endY: number,
  target: NetworkGraphNodeBox,
  forcedDir?: number,
  reachFirst?: number,
  reachLast?: number
): number | null {
  const dir = forcedDir || Math.sign(endY - startY) || 1;
  let feasible: Array<[number, number]> = [[-Infinity, Infinity]];
  for (let c = si + 1; c < ti; c++) {
    feasible = intersectIntervals(feasible, safeIntervals(geom, c));
    if (!feasible.length) return null;
  }
  // Дальняя сторона самого глубокого (для спуска) / самого верхнего (для подъёма)
  // ряда среди колонок, которые связь пересекает, плюс ряд цели: «ниже всех»
  let extreme: number | null = null;
  for (let c = si + 1; c < ti; c++) {
    for (const b of geom.columnBoxes[c] ?? []) {
      if (dir > 0) extreme = extreme === null ? b.y + b.height : Math.max(extreme, b.y + b.height);
      else extreme = extreme === null ? b.y : Math.min(extreme, b.y);
    }
  }
  if (dir > 0) extreme = extreme === null ? target.y + target.height : Math.max(extreme, target.y + target.height);
  else extreme = extreme === null ? target.y : Math.min(extreme, target.y);
  const farY =
    dir > 0
      ? extreme + CORRIDOR_CLEAR + LANE_GRID
      : extreme - CORRIDOR_CLEAR - LANE_GRID;
  const firstWin = reachFirst ?? geom.windows[si]?.width ?? 0;
  const lastWin = reachLast ?? geom.windows[ti - 1]?.width ?? 0;
  for (let step = 0; step < 14; step++) {
    const offsets = step === 0 ? [0] : [step * LANE_GRID, -step * LANE_GRID];
    for (const off of offsets) {
      const lane = snapLane(farY + off);
      if (!laneInIntervalsList(feasible, lane)) continue;
      if (Math.abs(lane - startY) <= firstWin && Math.abs(endY - lane) <= lastWin) {
        return lane;
      }
    }
  }
  return null;
}

/**
 * Требуемая ширина каждого окна между колонками (учитывая запас на заходы 44px):
 * для соседних колонок — перепад их связей, для много-колоночных — возможность
 * спуститься на дальнюю полосу. Используется layout'ом для компактной расстановки.
 */
export function requiredWindows(
  boxes: NetworkGraphNodeBox[],
  edges: { source: string; target: string }[]
): number[] {
  const geom = buildRoutingGeometry(boxes);
  // базовый зазор — только под стрелку и разведение шариков; основной размер
  // каждого окна определяется перепадом связей, идущих через него
  const baseGap = 34;
  const gaps = new Array(Math.max(geom.columns.length - 1, 0)).fill(baseGap);
  const setGap = (col: number, win: number) => {
    if (col >= 0 && col < gaps.length) gaps[col] = Math.max(gaps[col], win);
  };
  const colIndexOf = (id: string) => geom.colIndexOf.get(id) ?? -1;

  for (const e of edges) {
    const s = geom.boxById.get(e.source);
    const t = geom.boxById.get(e.target);
    if (!s || !t) continue;
    const si = colIndexOf(e.source);
    const ti = colIndexOf(e.target);
    if (si < 0 || ti < 0 || ti <= si) continue;

    if (ti === si + 1) {
      // соседние колонки: со «смягчённым» правилом 45° крутые связи идут
      // прямой диагональю (влезает в любой зазор), доп. ширина не нужна
      continue;
    }
    // много-колоночная связь: свип на дальнюю полосу — первый и последний
    // спуски определяют окна у источника и цели. Лимит сверху не даёт раздувать
    // колонки (длинные горизонтали обычно не нужны — хватает лестницы).
    const lane = sweepLane(geom, si, ti, s.ball.cy, t.ball.cy, t, undefined, Infinity, Infinity);
    if (lane !== null) {
      setGap(si, Math.min(MAX_SWEEP_GAP, Math.abs(lane - s.ball.cy) - 3));
      setGap(ti - 1, Math.min(MAX_SWEEP_GAP, Math.abs(t.ball.cy - lane) - 47));
    } else {
      // лестница: каждому окну хватит перепада «ряд + коридор»
      for (let j = si; j < ti; j++) setGap(j, Math.min(MAX_SWEEP_GAP, MIN_STAIR_WINDOW));
    }
  }
  return gaps.map(g => Math.round(g));
}

/**
 * Scoring weights for candidate routes. Crossings dominate everything, then
 * "dip past the target row" excursions, then bend count, then raw length.
 */
const MIN_STAIR_WINDOW = 96; // запас для редкого многоступенчатого обхода
/** Потолок разлёта много-колоночного свипа — чтобы далёкие по вертикали связи
 *  не разносили колонки на тысячи пикселей (мягкое правило 45° вместо глубоких
 *  свипов). */
const MAX_SWEEP_GAP = 220;
const CROSSING_COST = 10000;
/** Наложение линий (две связи на одной полосе с перекрытием по x) — как в git graph,
 *  у каждой линии своя полоса: наложение стоит как пересечение */
const OVERLAP_COST = 10000;
const BEYOND_COST = 12;
const BEND_COST = 40;

/**
 * Сколько горизонтальных участков кандидата ложится НА ДРУГУЮ ЛИНИЮ
 * (та же полоса, перекрытие по x). Наложение линий запрещено — это и есть
 * «каша»: две связи сливаются в одну непонятную.
 */
function countOverlaps(points: Pt[], context: Pt[][]): number {
  let count = 0;
  const horizontals: { y: number; x1: number; x2: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(points[i].y - points[i - 1].y) < EPS) {
      horizontals.push({
        y: points[i].y,
        x1: Math.min(points[i].x, points[i - 1].x),
        x2: Math.max(points[i].x, points[i - 1].x),
      });
    }
  }
  for (const other of context) {
    for (let i = 1; i < other.length; i++) {
      if (Math.abs(other[i].y - other[i - 1].y) >= EPS) continue;
      const oy = other[i].y;
      const ox1 = Math.min(other[i].x, other[i - 1].x);
      const ox2 = Math.max(other[i].x, other[i - 1].x);
      for (const h of horizontals) {
        if (Math.abs(h.y - oy) >= EPS) continue;
        if (h.x2 > ox1 + 2 && h.x1 < ox2 - 2) count++;
      }
    }
  }
  return count;
}

interface CandidateRoute {
  points: Pt[];
  /** заранее посчитанные штрафы: вылет за ряд цели + ход в обратную сторону */
  penalty: number;
}

function score2(cr: number, ov: number, candidate: CandidateRoute, foreign: NetworkGraphNodeBox[]): number {
  return Math.round(
    (routeHitsBox(candidate.points, foreign) ? 1e9 : 0) +
    CROSSING_COST * cr + OVERLAP_COST * ov + candidate.penalty +
    BEND_COST * countDiagonals(candidate.points) + polylineLength(candidate.points)
  );
}

function countDiagonals(pts: Pt[]): number {
  let count = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = Math.abs(pts[i].x - pts[i - 1].x);
    const dy = Math.abs(pts[i].y - pts[i - 1].y);
    if (dy > EPS && Math.abs(dx - dy) < 0.01) count++;
  }
  return count;
}

/**
 * Итоговое качество набора маршрутов: число пересечений, число диагоналей
 * (переломов) и суммарная длина. Используется поиском расстановки вершин.
 */
export function routeQuality(pointsList: Pt[][]): { crossings: number; bends: number; length: number } {
  let crossings = 0;
  for (let i = 0; i < pointsList.length; i++) {
    for (let j = i + 1; j < pointsList.length; j++) {
      crossings += countCrossings(pointsList[i], [pointsList[j]]);
    }
  }
  let bends = 0;
  let length = 0;
  for (const pts of pointsList) {
    bends += countDiagonals(pts);
    length += polylineLength(pts);
  }
  return { crossings, bends, length };
}

function polylineLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}

function segmentsCross(p1: Pt, p2: Pt, q1: Pt, q2: Pt): boolean {
  const o1 = Math.sign((p2.y - p1.y) * (q1.x - p2.x) - (p2.x - p1.x) * (q1.y - p2.y));
  const o2 = Math.sign((p2.y - p1.y) * (q2.x - p2.x) - (p2.x - p1.x) * (q2.y - p2.y));
  const o3 = Math.sign((q2.y - q1.y) * (p1.x - q2.x) - (q2.x - q1.x) * (p1.y - q2.y));
  const o4 = Math.sign((q2.y - q1.y) * (p2.x - q2.x) - (q2.x - q1.x) * (p2.y - q2.y));
  // Строгое пересечение: касания концами и коллинеарные наложения (шина из
  // нескольких связей на одной полосе) пересечением не считаются
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
}

function countCrossings(points: Pt[], context: Pt[][]): number {
  let count = 0;
  for (const other of context) {
    for (let i = 1; i < points.length; i++) {
      for (let j = 1; j < other.length; j++) {
        if (segmentsCross(points[i - 1], points[i], other[j - 1], other[j])) count++;
      }
    }
  }
  return count;
}

/**
 * Route all edges sequentially, choosing the best candidate route for each edge
 * against the already-routed ones:
 *  1. plan waypoint lanes (far-side estimates) to order the fan slots nested;
 *  2. route edges from shortest span to longest; for each edge enumerate
 *     candidate routes (straight / direct diagonal / corridor lanes / staircase)
 *     and pick the one with fewest crossings, then least excursion past the
 *     target row, fewest bends, shortest length.
 */
export function routeEdges(
  geom: RoutingGeometry,
  edges: { id: string; source: string; target: string }[]
): RoutedEdge[] {
  const valid = edges.filter(e => geom.boxById.has(e.source) && geom.boxById.has(e.target));

  // Pass 1: waypoint lane per edge (far-side estimate for multi-column edges)
  const waypoint = new Map<string, number>();
  for (const e of valid) {
    const s = geom.boxById.get(e.source)!;
    const t = geom.boxById.get(e.target)!;
    const si = geom.colIndexOf.get(e.source) ?? 0;
    const ti = geom.colIndexOf.get(e.target) ?? 0;
    let wp = t.ball.cy;
    if (ti - si >= 2) {
      const down = sweepLane(geom, si, ti, s.ball.cy, t.ball.cy, t, 1);
      // цель в том же ряду — обходить можно с обеих сторон; для вложенного
      // веера берём ближнюю, чтобы порядок выхода соответствовал ходу
      const sameRow = Math.abs(t.ball.cy - s.ball.cy) < 40;
      const up = sameRow ? sweepLane(geom, si, ti, s.ball.cy, t.ball.cy, t, -1) : null;
      let lane: number | null = down;
      if (down !== null && up !== null) {
        lane = Math.abs(up - s.ball.cy) <= Math.abs(down - s.ball.cy) ? up : down;
      } else {
        lane = down ?? up;
      }
      if (lane !== null) wp = lane;
    }
    waypoint.set(e.id, wp);
  }

  // Pass 2: fan slots ordered by waypoint depth
  const outOrder = new Map<string, number>();
  const inOrder = new Map<string, number>();
  {
    const sortedOut = [...valid].sort((a, b) => {
      const sa = geom.boxById.get(a.source)!;
      const sb = geom.boxById.get(b.source)!;
      const ta = geom.boxById.get(a.target)!;
      const tb = geom.boxById.get(b.target)!;
      // при равных точках маршрута веер вкладывается по направлению хода
      return (
        sa.ball.cx - sb.ball.cx ||
        (waypoint.get(a.id) ?? 0) - (waypoint.get(b.id) ?? 0) ||
        ta.ball.cy - tb.ball.cy
      );
    });
    const sortedIn = [...valid].sort((a, b) => {
      const ta = geom.boxById.get(a.target)!;
      const tb = geom.boxById.get(b.target)!;
      const sa = geom.boxById.get(a.source)!;
      const sb = geom.boxById.get(b.source)!;
      return (
        ta.ball.cx - tb.ball.cx ||
        (waypoint.get(a.id) ?? 0) - (waypoint.get(b.id) ?? 0) ||
        sa.ball.cy - sb.ball.cy
      );
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

  // Arc points per edge (with fan-slot spread)
  const arcs = new Map<string, { start: Pt; end: Pt }>();
  for (const e of valid) {
    const s = geom.boxById.get(e.source)!;
    const t = geom.boxById.get(e.target)!;
    const dyOut = slotOffset(outOrder.get(e.id) ?? 0, outTotals.get(e.source) ?? 1, s.ball.r);
    const dyIn = slotOffset(inOrder.get(e.id) ?? 0, inTotals.get(e.target) ?? 1, t.ball.r);
    arcs.set(e.id, {
      start: pointOnRightArc(s.ball.cx, s.ball.cy, s.ball.r, dyOut),
      end: pointOnLeftArc(t.ball.cx, t.ball.cy, t.ball.r, dyIn),
    });
  }

  // Pass 3: sequential crossing-aware selection (shortest spans first)…
  const ordered = [...valid]
    .filter(e => (geom.colIndexOf.get(e.target) ?? 0) > (geom.colIndexOf.get(e.source) ?? 0))
    .sort((a, b) => {
      const spanA = (geom.colIndexOf.get(a.target) ?? 0) - (geom.colIndexOf.get(a.source) ?? 0);
      const spanB = (geom.colIndexOf.get(b.target) ?? 0) - (geom.colIndexOf.get(b.source) ?? 0);
      return spanA - spanB || (geom.colIndexOf.get(a.source) ?? 0) - (geom.colIndexOf.get(b.source) ?? 0);
    });

  const routed = new Map<string, RoutedEdge>();

  // Initial sequential pass (shortest spans first)…
  {
    const done: Pt[][] = [];
    for (const e of ordered) {
      const points = simplifyPolyline(pickBestRoute(geom, e, arcs.get(e.id)!, done));
      done.push(points);
      routed.set(e.id, { ...e, points, fallback: false });
    }
  }
  // …then improvement iterations: every edge is re-checked against the current
  // routes of all other edges (the sequential pass alone gets stuck in local
  // optima — e.g. a sibling straight that should dip into a corridor bus).
  for (let iter = 0; iter < 3; iter++) {
    let changed = false;
    for (const e of ordered) {
      const others = ordered.filter(o => o.id !== e.id).map(o => routed.get(o.id)!.points);
      const best = simplifyPolyline(pickBestRoute(geom, e, arcs.get(e.id)!, others));
      const edge = routed.get(e.id)!;
      if (polylineToPath(best) !== polylineToPath(edge.points)) {
        edge.points = best;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Backwards edges (cycle leftovers in the layered layout)
  for (const e of valid) {
    if (routed.has(e.id)) continue;
    const s = geom.boxById.get(e.source)!;
    const t = geom.boxById.get(e.target)!;
    routed.set(e.id, { ...e, points: simplifyPolyline(fallbackRoute(s.ball, t.ball)), fallback: true });
  }

  return valid.map(e => routed.get(e.id)!);
}

/**
 * Corridor route: короткий естественный заход из шарика на полосу → один
 * длинный прогон → короткий заход в шарик. Длина захода не равна перепаду по
 * y, поэтому узкие окна не раздуваются только ради 45°-геометрии.
 */
function corridorRoute(start: Pt, end: Pt, lane: number): Pt[] {
  const pts: Pt[] = [{ ...start }];

  const span = Math.max(end.x - start.x, 0);
  const lead = Math.min(56, Math.max(18, span * 0.2));
  const firstX = start.x + lead;
  const lastX = Math.max(firstX, end.x - lead);
  if (Math.abs(lane - start.y) > EPS) pts.push({ x: firstX, y: lane });
  if (lastX - firstX > EPS) pts.push({ x: lastX, y: lane });
  if (Math.abs(end.y - lane) > EPS || pts[pts.length - 1].x !== end.x) pts.push({ ...end });
  return pts;
}

/**
 * 45° minimal-bend candidates for a direct start→end connection.
 *
 * Заменяет произвольные наклонные прямые (которые выглядят как «косые» линии,
 * а не как рёбра сетевого графика) на эталонную геометрию «горизонталь + 45°»:
 *  - диагональ 45° к ряду цели, затем горизонтальный прогон (1 излом);
 *  - горизонтальный прогон, затем диагональ 45° в цель (1 излом);
 *  - если вертикальный перепад в точности равен горизонтальному пробегу —
 *    чистая диагональ 45° (0 изломов).
 * Оба направления добавляются, чтобы скор мог выбрать сторону, где диагональ
 * свободна от боксов.
 */
function addStraight45Candidates(start: Pt, end: Pt, candidates: CandidateRoute[]) {
  const dy = end.y - start.y;
  const ady = Math.abs(dy);
  if (ady < EPS) return; // чистая горизонталь — её покрывает straight-кандидат
  // A: диагональ 45° вперёд к ряду цели, затем горизонтальный прогон в цель.
  const ax = start.x + ady;
  if (ax > start.x + EPS && ax <= end.x + EPS) {
    if (ax >= end.x - EPS) {
      candidates.push({ points: [start, end], penalty: 0 }); // ровно 45°: без излома
    } else {
      candidates.push({ points: [start, { x: ax, y: end.y }, end], penalty: 0 });
    }
  }
  // B: горизонтальный прогон от источника, затем диагональ 45° в цель.
  const bx = end.x - ady;
  if (bx >= start.x - EPS && bx < end.x - EPS) {
    if (bx <= start.x + EPS) {
      candidates.push({ points: [start, end], penalty: 0 }); // ровно 45°: без излома
    } else {
      candidates.push({ points: [start, { x: bx, y: start.y }, end], penalty: 0 });
    }
  }
}

/** Компоненты отрезка строго внутри раздутого прямоугольника? */
function pointInRect(p: Pt, r: { x: number; y: number; w: number; h: number }): boolean {
  return p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
}

/** Пересекает ли отрезок прямоугольник (с запасом clearance) */
function segHitsRect(p1: Pt, p2: Pt, box: NetworkGraphNodeBox, clearance: number): boolean {
  const r = {
    x: box.x - clearance,
    y: box.y - clearance,
    w: box.width + 2 * clearance,
    h: box.height + 2 * clearance,
  };
  if (pointInRect(p1, r) || pointInRect(p2, r)) return true;
  const corners = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
  for (let i = 0; i < 4; i++) {
    if (segmentsCross(p1, p2, corners[i], corners[(i + 1) % 4])) return true;
  }
  return false;
}

/** Маршрут задевает чужие боксы (с заметным визуальным запасом)? */
function routeHitsBox(points: Pt[], foreign: NetworkGraphNodeBox[]): boolean {
  for (let i = 1; i < points.length; i++) {
    for (const b of foreign) {
      if (segHitsRect(points[i - 1], points[i], b, 12)) return true;
    }
  }
  return false;
}

/** Убирает дубли и промежуточные точки на одной прямой перед рисованием. */
function simplifyPolyline(points: Pt[]): Pt[] {
  const compact: Pt[] = [];
  for (const point of points) {
    const previous = compact[compact.length - 1];
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > EPS) {
      compact.push({ ...point });
    }
  }

  let changed = true;
  while (changed && compact.length > 2) {
    changed = false;
    for (let i = 1; i < compact.length - 1; i++) {
      const a = compact[i - 1];
      const b = compact[i];
      const c = compact[i + 1];
      const ab = { x: b.x - a.x, y: b.y - a.y };
      const bc = { x: c.x - b.x, y: c.y - b.y };
      const cross = ab.x * bc.y - ab.y * bc.x;
      const dot = ab.x * bc.x + ab.y * bc.y;
      if (Math.abs(cross) <= EPS && dot >= -EPS) {
        compact.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return compact;
}

/**
 * All candidate routes for one edge; the best (fewest crossings with `context`,
 * then least excursion, fewest bends, shortest) wins.
 */
function pickBestRoute(
  geom: RoutingGeometry,
  e: { id: string; source: string; target: string },
  arc: { start: Pt; end: Pt },
  context: Pt[][]
): Pt[] {
  const s = geom.boxById.get(e.source)!;
  const t = geom.boxById.get(e.target)!;
  const si = geom.colIndexOf.get(e.source) ?? 0;
  const ti = geom.colIndexOf.get(e.target) ?? 0;
  const start = arc.start;
  const end = arc.end;
  const dy = end.y - start.y;
  const candidates: CandidateRoute[] = [];

  // Straight: the start lane must hit the target's arc and stay clear of every
  // node box in the columns the run crosses.
  const laneOnArc = Math.abs(start.y - t.ball.cy) <= t.ball.r * 0.95;
  const startLaneClear = geom.columns.every((_, colIdx) => {
    if (colIdx <= si || colIdx >= ti) return true;
    return isLaneSafeForColumn(geom, colIdx, start.y);
  });
  if (Math.abs(dy) < EPS || (laneOnArc && startLaneClear)) {
    const snappedEnd = pointOnLeftArc(t.ball.cx, t.ball.cy, t.ball.r, start.y - t.ball.cy);
    candidates.push({ points: [start, snappedEnd], penalty: 0 });
  }

  // Точные 45°-кандидаты остаются доступными для случаев, где такой маршрут
  // действительно короче и лучше читается.
  addStraight45Candidates(start, end, candidates);

  // Свободная прямая — основной компактный вариант. Угол не обязан быть 45°:
  // это не координатная сетка, а сеть зависимостей. Если отрезок задевает
  // вершину или пересекает уже выбранный маршрут, score автоматически выберет
  // коридорный/лестничный обход.
  if (ti - si === 1) candidates.push({ points: [start, end], penalty: 0 });

  // Смягчённое правило 45°: для соседних колонок, когда перепад достаточно крутой
  // (угол ≥45°), соединяем шарики напрямую одной диагональю. Это позволяет держать
  // зазоры малыми и не тянет за собой длинные горизонтальные участки. Пологие
  // связи по-прежнему разбирает addStraight45Candidates (горизонталь / 45°).
  if (ti === si + 1 && Math.abs(dy) >= end.x - start.x - EPS) {
    candidates.push({ points: [start, end], penalty: 0 });
  }

  // Corridor lane candidates. Multi-column edges require the lane to be safe in
  // every crossed column. Short diagonal approaches keep the windows compact.
  const dir = Math.sign(dy) || 1;
  const lo = Math.min(start.y, end.y);
  const hi = Math.max(start.y, end.y);
  const firstWin = geom.windows[si]?.width ?? 0;
  const lastWin = geom.windows[ti - 1]?.width ?? 0;
  let feasible: Array<[number, number]> = [[-Infinity, Infinity]];
  for (let c = si + 1; c < ti; c++) {
    feasible = intersectIntervals(feasible, safeIntervals(geom, c));
    if (!feasible.length) break;
  }
  // коридорные кандидаты — только для связей через ≥2 колонки
  if (feasible.length && ti - si >= 2) {
    const scanFrom = snapLane(lo - lastWin);
    const scanTo = snapLane(hi + firstWin);
    for (let lane = scanFrom; lane <= scanTo + EPS; lane += LANE_GRID) {
      if (!laneInIntervalsList(feasible, lane)) continue;
      const d1 = Math.abs(lane - start.y);
      const d2 = Math.abs(end.y - lane);
      if (d1 < MIN_BEND || (d2 < MIN_BEND && d2 > EPS)) continue;
      const beyond = dir > 0 ? Math.max(0, lane - (t.y + t.height)) : Math.max(0, t.y - lane);
      const back = Math.sign(lane - start.y) === -dir ? Math.abs(lane - start.y) : 0;
      candidates.push({
        points: corridorRoute(start, end, lane),
        penalty: BEYOND_COST * (beyond + back),
      });
    }
  }

  // Staircase fallback for multi-column edges — только если коридорных
  // кандидатов нет: штраф делает его последним средством
  if (ti - si >= 2) candidates.push({ points: forwardRoute(geom, si, ti, start, end), penalty: 2000 });

  const foreign = geom.boxes.filter(b => b.id !== e.source && b.id !== e.target);

  let best: Pt[] | null = null;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const score = routeHitsBox(candidate.points, foreign)
      ? Infinity
      : CROSSING_COST * countCrossings(candidate.points, context) +
        OVERLAP_COST * countOverlaps(candidate.points, context) +
        candidate.penalty +
        BEND_COST * countDiagonals(candidate.points) +
        polylineLength(candidate.points);
    if (score < bestScore) {
      bestScore = score;
      best = candidate.points;
    }
  }
  return best ?? forwardRoute(geom, si, ti, start, end);
}

/**
 * Forward routing staircase for multi-row edges without a reachable sweep lane.
 * The edge bends only where it must — each bend lands on a safe corridor lane
 * and is at least MIN_BEND tall (no kinks).
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
    // Первый поворот начинается сразу после шарика. Ожидание границы окна
    // создаёт горизонтальный отрезок, который может пересечь соседний веер
    // из того же источника.
    const diagStartX = j === colFrom ? x : Math.max(x, win.x1);
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
  const clean = simplifyPolyline(pts);
  if (clean.length === 0) return '';
  return (
    `M ${round(clean[0].x)} ${round(clean[0].y)} ` +
    clean.slice(1).map(p => `L ${round(p.x)} ${round(p.y)}`).join(' ')
  );
}

/**
 * Плавный («curved») вариант polylineToPath: прямые участки между точками
 * маршрута сохраняются, а каждый внутренний излом скругляется квадратичной
 * кривой Безье. Получается мягкая непрерывная кривая, которая по-прежнему
 * следует полосовой маршрутизации (не задевает боксы и держит параллельные
 * связи на отдельных полосах). Концы остаются точными, чтобы стрелка
 * сохраняла направление.
 */
export function polylineToCurvePath(pts: Pt[], radius = 10): string {
  const clean = simplifyPolyline(pts);
  if (clean.length === 0) return '';
  if (clean.length < 3) return polylineToPath(clean); // без внутренних изломов — прямая
  let d = `M ${round(clean[0].x)} ${round(clean[0].y)}`;
  for (let i = 1; i < clean.length - 1; i++) {
    const p0 = clean[i - 1];
    const p1 = clean[i];
    const p2 = clean[i + 1];
    const inLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const outLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (inLen < EPS || outLen < EPS) {
      d += ` L ${round(p1.x)} ${round(p1.y)}`;
      continue;
    }
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const inX = (p1.x - p0.x) / inLen;
    const inY = (p1.y - p0.y) / inLen;
    const outX = (p2.x - p1.x) / outLen;
    const outY = (p2.y - p1.y) / outLen;
    d +=
      ` L ${round(p1.x - inX * r)} ${round(p1.y - inY * r)}` +
      ` Q ${round(p1.x)} ${round(p1.y)} ${round(p1.x + outX * r)} ${round(p1.y + outY * r)}`;
  }
  const last = clean[clean.length - 1];
  d += ` L ${round(last.x)} ${round(last.y)}`;
  return d;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
