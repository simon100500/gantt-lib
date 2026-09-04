import ELK from 'elkjs/lib/elk.bundled.js';
import type {
  NetworkGraphEdge,
  NetworkGraphLayout,
  NetworkGraphNode,
  NetworkGraphNodeBox,
} from './types';
import { buildRoutingGeometry, polylineToPath, routeEdges, routeQuality } from './edgeRouting';

/** Габаритный бокс вершины (шарик сверху + подпись снизу) */
export const NODE_WIDTH = 152;
export const NODE_HEIGHT = 78;
export const BALL_RADIUS = 21;
/** Центр шарика относительно верха бокса */
export const BALL_OFFSET_Y = 26;
/** Первая строка подписи относительно верха бокса и шаг строк — используются при рендере */
export const LABEL_TOP = 52;
export const LABEL_LINE_HEIGHT = 12;
const LABEL_MAX_LINES = 2;
const LABEL_MAX_CHARS = 22;

/** Вертикальный шаг рядов (используется и поиском расстановки) */
export const SPACING_IN_LAYER = 40;
/** Раундов поиска перестановок вершин после ELK */
const REFINE_ROUNDS = 5;
/** Минимальная ширина окна под диагонали между колонками */
const MIN_WINDOW = 70;
/** Запас окна к перепаду для соседних колонок (стабы заходов) */
const WINDOW_SLACK = 56;
/** Шаг диагонали много-колоночной лестницы (ряд + коридор) */
const STAIR_STEP = NODE_HEIGHT + SPACING_IN_LAYER + 30;

const LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  // Слой вершины = самый длинный путь, а network simplex подтягивает вершины
  // к соседям: работа, зависящая от первой, но идущая в конце фазы, встанет в конец
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.spacing.nodeNodeBetweenLayers': '240',
  'elk.layered.spacing.nodeNode': String(SPACING_IN_LAYER),
  'elk.layered.spacing.edgeNodeBetweenLayers': '16',
};

/** Разбиение подписи на строки фиксированной ширины (без измерений DOM) */
export function wrapLabel(label: string): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= LABEL_MAX_CHARS) {
      current += ` ${word}`;
    } else if (lines.length === LABEL_MAX_LINES - 1) {
      current = current.slice(0, LABEL_MAX_CHARS - 1) + '…';
      break;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (lines.length < LABEL_MAX_LINES && current) lines.push(current);
  return lines;
}

interface PreparedEdge {
  id: string;
  source: string;
  target: string;
}

function prepareEdges(edges: NetworkGraphEdge[]): PreparedEdge[] {
  return edges.map((e, i) => ({ id: e.id ?? `e-${i}-${e.source}-${e.target}`, source: e.source, target: e.target }));
}

function route(points2: NetworkGraphNodeBox[], edges: PreparedEdge[]) {
  return routeEdges(buildRoutingGeometry(points2), edges).map(r => r.points);
}

/**
 * Переменный шаг колонок: каждый промежуток сжимается до перепада, который
 * реально нужен связям через него (соседние колонки — свой перепад,
 * много-колоночные лестницы — шаг ряда). Граф становится компактнее по
 * горизонтали без потери 45°-геометрии.
 */
function compactColumns(boxes: NetworkGraphNodeBox[], edges: PreparedEdge[]): NetworkGraphNodeBox[] {
  const colIndexOf = new Map<string, number>();
  const columns: number[] = [];
  for (const b of [...boxes].sort((a, c) => a.x - c.x)) {
    if (columns.length && Math.abs(columns[columns.length - 1] - b.x) < 1) {
      colIndexOf.set(b.id, columns.length - 1);
    } else {
      columns.push(b.x);
      colIndexOf.set(b.id, columns.length - 1);
    }
  }
  const gaps = new Array(Math.max(columns.length - 1, 0)).fill(MIN_WINDOW);
  const setGap = (col: number, need: number) => {
    if (col >= 0 && col < gaps.length) gaps[col] = Math.max(gaps[col], need);
  };
  for (const e of edges) {
    const si = colIndexOf.get(e.source);
    const ti = colIndexOf.get(e.target);
    if (si === undefined || ti === undefined || ti <= si) continue;
    if (ti === si + 1) {
      const s = boxes.find(b => b.id === e.source)!;
      const t = boxes.find(b => b.id === e.target)!;
      setGap(si, Math.abs(t.ball.cy - s.ball.cy) + WINDOW_SLACK);
    } else {
      for (let j = si; j < ti; j++) setGap(j, STAIR_STEP);
    }
  }
  // Пересобираем x колонок по фактически нужным промежуткам
  const xs = [0];
  for (let j = 0; j < gaps.length; j++) xs.push(xs[j] + NODE_WIDTH + gaps[j] + 44);
  return boxes.map(b => {
    const col = colIndexOf.get(b.id) ?? 0;
    const x = xs[col];
    return { ...b, x, ball: { ...b.ball, cx: x + NODE_WIDTH / 2 } };
  });
}

/**
 * Качество расстановки: прогоняем настоящий роутер всех связей (на сжатых
 * колонках) и суммируем пересечения ≫ переломы ≫ длину.
 */
function placementScore(boxes: NetworkGraphNodeBox[], edges: PreparedEdge[]): number {
  const q = routeQuality(route(compactColumns(boxes, edges), edges));
  return 10000 * q.crossings + 40 * q.bends + q.length / 50;
}

function relocateBox(box: NetworkGraphNodeBox, y: number): NetworkGraphNodeBox {
  return { ...box, y, ball: { ...box.ball, cy: y + BALL_OFFSET_Y } };
}

/** Ряды графа (уникальные y верхушек) */
function rowTops(boxes: NetworkGraphNodeBox[]): number[] {
  const tops = [...new Set(boxes.map(b => Math.round(b.y)))].sort((a, b) => a - b);
  return tops.filter(t => tops.every(u => Math.abs(u - t) >= 8 || u === t));
}

/**
 * Куда вершину можно переставить: любой существующий ряд графа, свободный
 * промежуток между рядами и ряд ниже/выше всех (свой отдельный ряд).
 * Слоты, сталкивающиеся с соседом по колонке, отбрасываются.
 */
function placementCandidates(boxes: NetworkGraphNodeBox[], id: string): number[] {
  const self = boxes.find(b => b.id === id);
  if (!self) return [];
  const tops = rowTops(boxes.filter(b => b.id !== id));
  if (!tops.length) return [];
  const rowPitch = NODE_HEIGHT + SPACING_IN_LAYER;
  const columnMates = boxes.filter(b => b.id !== id && Math.abs(b.x - self.x) < 1);

  const slots: number[] = [...tops, tops[0] - rowPitch, tops[tops.length - 1] + rowPitch];
  for (let i = 0; i < tops.length - 1; i++) {
    const gapTop = tops[i] + NODE_HEIGHT;
    const gapBottom = tops[i + 1];
    if (gapBottom - gapTop >= NODE_HEIGHT + 24) {
      slots.push(gapTop + (gapBottom - gapTop - NODE_HEIGHT) / 2);
    }
  }
  return slots.filter(
    y =>
      Math.abs(y - self.y) > 1 &&
      !columnMates.some(m => Math.abs(m.y - y) < NODE_HEIGHT + SPACING_IN_LAYER - 4)
  );
}

function crossingsOf(boxes: NetworkGraphNodeBox[], edges: PreparedEdge[]): number {
  return routeQuality(route(compactColumns(boxes, edges), edges)).crossings;
}

/**
 * Правило длинных связей: цель связи, перепрыгивающей ≥2 колонки, уходит
 * отдельным рядом ниже всех — тогда её путь идёт по свободному пространству
 * («Благоустройство» ниже всех). Перестановка принимается, только если не
 * добавляет пересечений. Возвращает набор утопленных вершин (их подстройка
 * больше не двигает — оценка длины иначе тащит их обратно в ряд).
 */
function applyLongEdgeSinkRule(
  boxes: NetworkGraphNodeBox[],
  edges: PreparedEdge[]
): { boxes: NetworkGraphNodeBox[]; sunk: Set<string> } {
  let current = boxes.map(b => ({ ...b }));
  const sunk = new Set<string>();
  const columnXs = Array.from(new Set(current.map(b => Math.round(b.x)))).sort((a, b) => a - b);
  const colIndexOf = (id: string) => {
    const box = current.find(b => b.id === id)!;
    return columnXs.findIndex(x => Math.abs(x - box.x) < 1);
  };
  const inEdges = new Map<string, PreparedEdge[]>();
  for (const e of edges) {
    if (!inEdges.has(e.target)) inEdges.set(e.target, []);
    inEdges.get(e.target)!.push(e);
  }
  const longTargets = new Set<string>();
  // Ряды — кластеры верхушек с допуском: ELK ставит вершины «между рядами»
  const bands = Array.from(new Set(current.map(b => Math.round(b.y))))
    .sort((a, b) => a - b)
    .reduce<number[]>((acc, y) => {
      if (!acc.length || y - acc[acc.length - 1] > 40) acc.push(y);
      return acc;
    }, []);
  const rowIndexOf = (y: number) =>
    bands.reduce((best, top, i) => (Math.abs(top - y) < Math.abs(bands[best] - y) ? i : best), 0);
  for (const [target, preds] of inEdges) {
    // Топим вершину с несколькими входами, среди которых есть длинная связь,
    // когда вершина стоит не глубже источников: снизу её входы приходят
    // чистым спуском по свободному месту, без объездов и подъёмов.
    if (preds.length < 2) continue;
    if (!preds.some(e => (colIndexOf(e.target) ?? 0) - (colIndexOf(e.source) ?? 0) >= 2)) continue;
    const t = current.find(b => b.id === target);
    if (!t) continue;
    const maxSourceRow = Math.max(
      ...preds.map(e => rowIndexOf(current.find(b => b.id === e.source)!.y))
    );
    if (rowIndexOf(t.y) <= maxSourceRow) longTargets.add(target);
  }
  const baseCrossings = crossingsOf(current, edges);
  const rowPitch = NODE_HEIGHT + SPACING_IN_LAYER;

  // Шаг 1: источники длинных связей якорим в самый глубокий ряд — тогда длинный
  // путь цели идёт по нижнему свободному коридору, а не режет ряды посередине.
  const longSources = new Set<string>();
  for (const e of edges) {
    if ((colIndexOf(e.target) ?? 0) - (colIndexOf(e.source) ?? 0) >= 2) longSources.add(e.source);
  }
  for (const id of longSources) {
    const self = current.find(b => b.id === id);
    if (!self) continue;
    const deepest = Math.max(...current.map(b => b.y));
    if (Math.abs(deepest - self.y) < 1) continue;
    // свободный слот в глубоком ряду своей колонки
    let y = deepest;
    while (
      current.some(
        b => b.id !== id && Math.abs(b.x - self.x) < 1 && Math.abs(b.y - y) < NODE_HEIGHT + SPACING_IN_LAYER - 4
      )
    ) {
      y += rowPitch;
    }
    if (Math.abs(y - self.y) < 1) continue;
    const trial = current.map(b => (b.id === id ? relocateBox(b, y) : b));
    if (crossingsOf(trial, edges) <= baseCrossings) current = trial;
  }

  for (const id of longTargets) {
    const self = current.find(b => b.id === id);
    if (!self) continue;
    let y = Math.max(...current.map(b => b.y)) + rowPitch;
    while (
      current.some(
        b => b.id !== id && Math.abs(b.x - self.x) < 1 && Math.abs(b.y - y) < NODE_HEIGHT + SPACING_IN_LAYER - 4
      )
    ) {
      y += rowPitch;
    }
    const trial = current.map(b => (b.id === id ? relocateBox(b, y) : b));
    if (crossingsOf(trial, edges) <= baseCrossings) {
      current = trial;
      sunk.add(id);
    }
  }
  return { boxes: current, sunk };
}

/**
 * Дополнительный обход графа после ELK: перебираем перестановки вершин по рядам
 * и оставляем лучшую по фактической прокладке всех связей.
 */
function refineNodePositions(
  boxes: NetworkGraphNodeBox[],
  edges: PreparedEdge[],
  frozen: Set<string> = new Set()
): NetworkGraphNodeBox[] {
  let current = boxes.map(b => ({ ...b }));
  let score = placementScore(current, edges);
  for (let round = 0; round < REFINE_ROUNDS; round++) {
    let improved = false;
    for (const box of current) {
      if (frozen.has(box.id)) continue;
      let bestY: number | null = null;
      let bestScore = score;
      for (const y of placementCandidates(current, box.id)) {
        const trial = current.map(b => (b.id === box.id ? relocateBox(b, y) : b));
        const s = placementScore(trial, edges);
        if (s < bestScore - 1) {
          bestScore = s;
          bestY = y;
        }
      }
      if (bestY !== null) {
        current = current.map(b => (b.id === box.id ? relocateBox(b, bestY) : b));
        score = bestScore;
        improved = true;
      }
    }
    if (!improved) break;
  }
  return current;
}

/**
 * Positioning of the graph (left to right) via elkjs layered, then a placement
 * refinement over the routed result, then per-gap column compression.
 * Pure data-in/data-out: no DOM.
 */
export async function computeNetworkLayout(
  nodes: NetworkGraphNode[],
  edges: NetworkGraphEdge[]
): Promise<NetworkGraphLayout> {
  const nodeIds = new Set(nodes.map(n => n.id));
  const cleanEdges = edges.filter(
    e => e.source !== e.target && nodeIds.has(e.source) && nodeIds.has(e.target)
  );
  const prepared = prepareEdges(cleanEdges);

  const elk = new ELK();
  const result = await elk.layout({
    id: 'root',
    layoutOptions: LAYOUT_OPTIONS,
    children: nodes.map(n => ({
      id: n.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: prepared.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });

  const boxes: NetworkGraphNodeBox[] = nodes.map((n, i) => {
    const child = result.children?.find(c => c.id === n.id);
    const x = child?.x ?? i * (NODE_WIDTH + 240);
    const y = child?.y ?? i * NODE_HEIGHT;
    return {
      id: n.id,
      label: n.label,
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      ball: { cx: x + NODE_WIDTH / 2, cy: y + BALL_OFFSET_Y, r: BALL_RADIUS },
      labelLines: wrapLabel(n.label),
    };
  });

  // Обход после ELK: цели длинных связей уходят рядом ниже всех…
  const { boxes: sunk, sunk: sunkIds } = applyLongEdgeSinkRule(boxes, prepared);
  // …затем тонкая подстройка рядов вокруг них по фактической прокладке связей
  const refined = refineNodePositions(sunk, prepared, sunkIds);
  // …и сжатие горизонтальных промежутков до реально нужных перепадов
  const compact = compactColumns(refined, prepared);

  const geometry = buildRoutingGeometry(compact);
  const routed = routeEdges(geometry, prepared);

  const width = Math.max(0, ...compact.map(b => b.x + b.width));
  const height = Math.max(0, ...compact.map(b => b.y + b.height));

  return {
    nodes: compact,
    edges: routed.map(r => ({
      id: r.id,
      source: r.source,
      target: r.target,
      d: polylineToPath(r.points),
    })),
    width,
    height,
  };
}
