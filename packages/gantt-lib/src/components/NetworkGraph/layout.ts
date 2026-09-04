import ELK from 'elkjs/lib/elk.bundled.js';
import type {
  NetworkGraphEdge,
  NetworkGraphLayout,
  NetworkGraphNode,
  NetworkGraphNodeBox,
} from './types';
import { buildRoutingGeometry, polylineToPath, routeEdges } from './edgeRouting';

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

/** Вертикальный шаг рядов (используется и выравниванием рядов) */
export const SPACING_IN_LAYER = 40;
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

function relocateBox(box: NetworkGraphNodeBox, y: number): NetworkGraphNodeBox {
  return { ...box, y, ball: { ...box.ball, cy: y + BALL_OFFSET_Y } };
}

/**
 * Выравнивание верхнего ряда в одну линию: узлы у верхней кромки схлопываются
 * в общий y. Остальные вершины остаются там, где их поставил ELK — его
 * микросмещения (например, цель длинной связи чуть ниже ряда) нужны роутеру
 * для чистых заходов без пересечений.
 */
function alignTopRow(boxes: NetworkGraphNodeBox[]): NetworkGraphNodeBox[] {
  const minY = Math.min(...boxes.map(b => b.y));
  return boxes.map(b => (b.y - minY <= 40 ? relocateBox(b, minY) : b));
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
 * Positioning of the graph (left to right) via elkjs layered, row alignment
 * (верхний ряд — одна линия) and per-gap column compression.
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

  // Выравниваем верхний ряд в одну линию…
  const aligned = alignTopRow(boxes);
  // …и сжимаем горизонтальные промежутки до реально нужных перепадов
  const compact = compactColumns(aligned, prepared);

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
