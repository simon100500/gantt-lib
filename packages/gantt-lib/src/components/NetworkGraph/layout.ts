import ELK from 'elkjs/lib/elk.bundled.js';
import type {
  NetworkGraphEdge,
  NetworkGraphLayout,
  NetworkGraphNode,
  NetworkGraphNodeBox,
} from './types';
import { buildRoutingGeometry, polylineToCurvePath, requiredWindows, routeEdges } from './edgeRouting';

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

/** Минимальный зазор между вершинами одного слоя. Это не координатная сетка:
 * ELK сохраняет естественное положение рядов, а значение лишь не даёт боксам
 * слипаться. */
export const SPACING_IN_LAYER = 54;
const MIN_COLUMN_GAP = 34;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Мягкий масштаб дат: достаточно заметный, чтобы две работы в одном ELK-
 * слое не слипались, но всё ещё компактнее полноценной шкалы Ганта. */
const SCHEDULE_PX_PER_DAY = 4;

const LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  // Слой вершины = самый длинный путь, а network simplex подтягивает вершины
  // к соседям: работа, зависящая от первой, но идущая в конце фазы, встанет в конец
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.spacing.nodeNodeBetweenLayers': '180',
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
 * Сохраняем вертикальную работу ELK без насильственного выравнивания в ряды.
 * Это делает граф менее «табличным»: соседние ветки могут идти на разных
 * высотах, а маршрутизатор сам ищет свободные коридоры между боксами.
 */
function normalizeVerticalPlacement(boxes: NetworkGraphNodeBox[]): NetworkGraphNodeBox[] {
  const minY = Math.min(...boxes.map(b => b.y), 0);
  return boxes.map(b => relocateBox(b, Math.max(0, b.y - minY)));
}

/**
 * Переменный шаг колонок: каждый промежуток сжимается до перепада, который
 * реально нужен связям через него (соседние колонки — свой перепад,
 * много-колоночные лестницы — небольшой запас). Граф становится компактнее
 * по горизонтали без потери читаемых обходов.
 */
function getColumnIndex(boxes: NetworkGraphNodeBox[]): Map<string, number> {
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
  return colIndexOf;
}

function compactColumns(boxes: NetworkGraphNodeBox[], edges: PreparedEdge[], nodes: NetworkGraphNode[]): NetworkGraphNodeBox[] {
  const colIndexOf = getColumnIndex(boxes);
  const columnCount = Math.max(1, ...Array.from(colIndexOf.values(), col => col + 1));
  // Ширины окон считает роутер (ему видны перепады и свипы)
  const windows = requiredWindows(boxes, edges);
  // Пересобираем x колонок по фактически нужным промежуткам
  const xs = [0];
  for (let j = 0; j < windows.length; j++) xs.push(xs[j] + NODE_WIDTH + windows[j]);

  const structuralX = new Map<string, number>();
  for (const b of boxes) structuralX.set(b.id, xs[colIndexOf.get(b.id) ?? 0] ?? 0);

  const datedNodes = nodes
    .map(n => ({ id: n.id, time: toTime(n.startDate) }))
    .filter((n): n is { id: string; time: number } => n.time !== null);
  const times = datedNodes.map(n => n.time);
  const dateSpan = Math.max(...times, 0) - Math.min(...times, 0);
  const useSchedule = datedNodes.length >= 2 && dateSpan > 0;

  if (!useSchedule) {
    return boxes.map(b => {
      const x = structuralX.get(b.id) ?? 0;
      return { ...b, x, ball: { ...b.ball, cx: x + NODE_WIDTH / 2 } };
    });
  }

  // Сохраняем ширину структурного графа: даты задают порядок и относительное
  // положение, но не могут раздуть холст до «пиксель-в-день» масштаба.
  const timeMin = Math.min(...times);
  const structuralSpan = xs[columnCount - 1] ?? 0;
  const scheduleSpan = (dateSpan / DAY_MS) * SCHEDULE_PX_PER_DAY;
  const timeSpan = Math.max(structuralSpan, scheduleSpan);
  const desiredX = new Map<string, number>();
  const timeById = new Map(datedNodes.map(n => [n.id, n.time]));
  for (const b of boxes) {
    const time = timeById.get(b.id);
    const x = time === undefined
      ? structuralX.get(b.id) ?? 0
      : ((time - timeMin) / dateSpan) * timeSpan;
    desiredX.set(b.id, x);
  }

  const xById = new Map(desiredX);
  const rows = new Map<number, NetworkGraphNodeBox[]>();
  for (const b of boxes) {
    const row = Math.round(b.y);
    const rowBoxes = rows.get(row) ?? [];
    rowBoxes.push(b);
    rows.set(row, rowBoxes);
  }

  // Даты — мягкое ограничение. Сначала сохраняем их положение, затем слегка
  // двигаем только конфликтующие вершины вправо, чтобы боксы и зависимости не
  // пересекались. Несколько проходов проталкивают изменение по цепочке.
  for (let pass = 0; pass < boxes.length; pass++) {
    let changed = false;
    for (const edge of edges) {
      const sourceX = xById.get(edge.source);
      const targetX = xById.get(edge.target);
      if (sourceX === undefined || targetX === undefined) continue;
      const minTargetX = sourceX + NODE_WIDTH + MIN_COLUMN_GAP;
      if (targetX < minTargetX) {
        xById.set(edge.target, minTargetX);
        changed = true;
      }
    }
    for (const rowBoxes of rows.values()) {
      rowBoxes.sort((a, b) => (xById.get(a.id) ?? 0) - (xById.get(b.id) ?? 0));
      let right = -Infinity;
      for (const b of rowBoxes) {
        const x = xById.get(b.id) ?? 0;
        const safeX = Math.max(x, right + MIN_COLUMN_GAP);
        if (safeX !== x) {
          xById.set(b.id, safeX);
          changed = true;
        }
        right = safeX + NODE_WIDTH;
      }
    }
    if (!changed) break;
  }

  return boxes.map(b => {
    const x = xById.get(b.id) ?? 0;
    return { ...b, x, ball: { ...b.ball, cx: x + NODE_WIDTH / 2 } };
  });
}

function toTime(value: string | Date | undefined): number | null {
  if (value === undefined) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
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
    const x = child?.x ?? i * (NODE_WIDTH + 250);
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

  // Сохраняем естественную вертикальную раскладку ELK и сжимаем только
  // горизонтальные промежутки до реально нужных перепадов.
  const placed = normalizeVerticalPlacement(boxes);
  const compact = compactColumns(placed, prepared, nodes);

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
      d: polylineToCurvePath(r.points),
    })),
    width,
    height,
  };
}
