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
const LABEL_MAX_LINES = 2;
const LABEL_MAX_CHARS = 22;
/** Первая строка подписи относительно верха бокса и шаг строк — используются при рендере */
export const LABEL_TOP = 52;
export const LABEL_LINE_HEIGHT = 12;

/** Шаг колонок/рядов — синхронизирован с шириной окон под диагонали в edgeRouting.
 *  Окно 196px вмещает спуск на соседний ряд и свип-полосу под ним,
 *  шаг рядов 40 оставляет коридоры под полосы на сетке 13px. */
const SPACING_BETWEEN_LAYERS = 240;
const SPACING_IN_LAYER = 40;

const LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  // Слой вершины = самый длинный путь, а network simplex подтягивает вершины
  // к соседям: работа, зависящая от первой, но идущая в конце фазы, встанет в конец
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.spacing.nodeNodeBetweenLayers': String(SPACING_BETWEEN_LAYERS),
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

/**
 * Positioning of the graph (left to right) via elkjs layered + 45° edge routing.
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

  const elk = new ELK();
  const result = await elk.layout({
    id: 'root',
    layoutOptions: LAYOUT_OPTIONS,
    children: nodes.map(n => ({
      id: n.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: cleanEdges.map((e, i) => ({
      id: e.id ?? `e-${i}-${e.source}-${e.target}`,
      sources: [e.source],
      targets: [e.target],
    })),
  });

  const boxes: NetworkGraphNodeBox[] = nodes.map((n, i) => {
    const child = result.children?.find(c => c.id === n.id);
    const x = child?.x ?? i * (NODE_WIDTH + SPACING_BETWEEN_LAYERS);
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

  const geometry = buildRoutingGeometry(boxes);
  const routed = routeEdges(
    geometry,
    cleanEdges.map((e, i) => ({ id: e.id ?? `e-${i}-${e.source}-${e.target}`, source: e.source, target: e.target }))
  );

  const width = Math.max(0, ...boxes.map(b => b.x + b.width));
  const height = Math.max(0, ...boxes.map(b => b.y + b.height));

  return {
    nodes: boxes,
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
