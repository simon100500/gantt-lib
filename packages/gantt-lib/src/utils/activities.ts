import { calculateTaskBar } from './geometry';
import { parseUTCDate } from './dateUtils';
import type { TaskActivity } from '../types';

// Шаг дорожки работ в строке: брусок 24px (как главный) + зазор 4px.
export const ACTIVITY_LANE_STEP = 28;
export const ACTIVITY_LANE_BAR_HEIGHT = 24;
// Внешний отступ пачки дорожек от границ строки.
export const ACTIVITY_LANES_PADDING = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ActivitySegment {
  id: string;
  name: string;
  color?: string;
  /** Lane index counted from the top */
  lane: number;
  /** Left offset in px from the timeline start */
  left: number;
  /** Width in px, end date inclusive */
  width: number;
  /** Обязательный технологический зазор перед стартом работы (в днях). */
  lag?: number;
}

export interface ActivityLanesLayout {
  segments: ActivitySegment[];
  laneCount: number;
}

/**
 * Pack intervals into the smallest number of lanes greedily (first fit):
 * a sequential work lands in the first lane free at its start, a concurrent
 * one opens a new lane below. Lane count therefore equals the maximum number
 * of simultaneous activities.
 */
export function packIntervals<T extends { start: number; end: number }>(
  intervals: T[]
): Array<T & { lane: number }> {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const laneEnds: number[] = [];
  return sorted.map(item => {
    let lane = 0;
    while (lane < laneEnds.length && item.start < laneEnds[lane]) {
      lane += 1;
    }
    laneEnds[lane] = item.end;
    return { ...item, lane };
  });
}

/**
 * Resolve the lane layout of one task's activities in px geometry.
 * Used both for rendering (segments) and for the row height (laneCount).
 */
export function computeActivityLanes(
  activities: TaskActivity[],
  monthStart: Date,
  dayWidth: number
): ActivityLanesLayout {
  if (activities.length === 0) {
    return { segments: [], laneCount: 0 };
  }

  const packed = packIntervals(activities.map(activity => {
    const bar = calculateTaskBar(parseUTCDate(activity.startDate), parseUTCDate(activity.endDate), monthStart, dayWidth);
    return {
      id: activity.id,
      name: activity.name,
      color: activity.color,
      lag: activity.lag,
      start: bar.left,
      end: bar.left + bar.width,
      left: bar.left,
      width: bar.width,
    };
  }));

  return {
    segments: packed.map(({ id, name, color, lag, lane, left, width }) => ({ id, name, color, lag, lane, left, width })),
    laneCount: Math.max(...packed.map(item => item.lane + 1)),
  };
}

/**
 * Row height needed to show the given number of activity lanes,
 * or 0 when the row fits its normal height (single lane or none).
 */
export function activityLanesExtraHeight(laneCount: number): number {
  if (laneCount <= 1) return 0;
  return laneCount * ACTIVITY_LANE_STEP + ACTIVITY_LANES_PADDING * 2;
}

/** Inclusive day-length helper for date-based lane counting. */
export function activitySpanMs(activity: Pick<TaskActivity, 'startDate' | 'endDate'>): { start: number; end: number } {
  return {
    start: parseUTCDate(activity.startDate).getTime(),
    end: parseUTCDate(activity.endDate).getTime() + DAY_MS,
  };
}

/** Сдвиг даты на N дней с сохранением типа (ISO-строка остаётся ISO-строкой). */
export function shiftActivityDate(value: string | Date, days: number): string | Date {
  const shifted = new Date(parseUTCDate(value).getTime() + days * DAY_MS);
  return typeof value === 'string' ? shifted.toISOString().slice(0, 10) : shifted;
}

export interface ActivityChainTask {
  id: string;
  /** Родитель строки. Вертикальная связь «та же работа этажом выше» рвётся на
   *  границе родителя: конвейер не перетекает из одной секции в другую. */
  parentId?: string;
  activityChain?: boolean | 'push';
  activities?: TaskActivity[];
}

export interface ActivityChainShift {
  taskId: string;
  activities: TaskActivity[];
  /** Ids of the activities that were actually shifted (chain successors). */
  shiftedIds: Set<string>;
  /** Per-activity day delta applied (successor id → days). */
  deltas: Map<string, number>;
}

const CHAIN_KEY_SEPARATOR = '\u0000';
const chainKey = (taskId: string, activityId: string) => `${taskId}${CHAIN_KEY_SEPARATOR}${activityId}`;
const toDayNumber = (value: string | Date) => Math.round(parseUTCDate(value).getTime() / DAY_MS);

interface ChainGraphNode {
  taskId: string;
  activityId: string;
  startDay: number;
  durationDays: number;
  floorIdx: number;
  workIdx: number;
}

interface ChainGraph {
  /** Соседи по направлению цепочки: key → [{ key преемника, лаг преемника }] */
  successors: Map<string, Array<{ key: string; lag: number }>>;
  predecessors: Map<string, Array<{ key: string; lag: number }>>;
  info: Map<string, ChainGraphNode>;
}

/**
 * Граф невидимых связей конвейера: внутри строки работы идут друг за другом,
 * одинаковые (тот же id) работы соседних цепочных строк связаны между собой.
 * Лаг принадлежит преемнику — это его обязательный зазор перед началом, и живёт
 * он только на связи с предыдущей работой той же строки (этажа).
 */
function buildChainGraph(orderedTasks: ActivityChainTask[]): ChainGraph {
  const successors = new Map<string, Array<{ key: string; lag: number }>>();
  const predecessors = new Map<string, Array<{ key: string; lag: number }>>();
  const info = new Map<string, ChainGraphNode>();
  const link = (from: string, to: string, lag: number) => {
    const list = successors.get(from);
    if (list) {
      if (!list.some(edge => edge.key === to)) list.push({ key: to, lag });
    } else {
      successors.set(from, [{ key: to, lag }]);
    }
    const back = predecessors.get(to);
    if (back) {
      if (!back.some(edge => edge.key === from)) back.push({ key: from, lag });
    } else {
      predecessors.set(to, [{ key: from, lag }]);
    }
  };

  const flagged = orderedTasks.filter((task): task is ActivityChainTask & { activities: TaskActivity[] } =>
    Boolean(task.activityChain) && Array.isArray(task.activities) && task.activities.length > 0);
  flagged.forEach((task, floorIdx) => {
    task.activities.forEach((activity, workIdx) => {
      info.set(chainKey(task.id, activity.id), {
        taskId: task.id,
        activityId: activity.id,
        startDay: toDayNumber(activity.startDate),
        durationDays: Math.max(1, toDayNumber(activity.endDate) - toDayNumber(activity.startDate) + 1),
        floorIdx,
        workIdx,
      });
    });
    for (let i = 0; i < task.activities.length - 1; i += 1) {
      link(chainKey(task.id, task.activities[i].id), chainKey(task.id, task.activities[i + 1].id), task.activities[i + 1].lag ?? 0);
    }
  });
  for (let f = 0; f < flagged.length - 1; f += 1) {
    const current = flagged[f];
    const next = flagged[f + 1];
    // Разные родители (Корпус/Секция) — разные потоки: этажи связываются только
    // внутри своей секции. Без родителя (плоский график) поведение прежнее.
    if (current.parentId !== next.parentId) continue;
    for (const activity of current.activities) {
      const twin = next.activities.find(candidate => candidate.id === activity.id || candidate.name === activity.name);
      // Лаг работы — зазор перед ней на своём этаже (между её и предыдущей работой
      // этой же строки). Вертикальная связь «та же работа этажом выше» лага не несёт:
      // следующий этаж подхватывает ровно с окончания работы сверху.
      if (twin) link(chainKey(current.id, activity.id), chainKey(next.id, twin.id), 0);
    }
  }
  return { successors, predecessors, info };
}

function collectDownstream(graph: ChainGraph, startKey: string): Set<string> {
  const visited = new Set<string>();
  const queue = [...(graph.successors.get(startKey) ?? []).map(edge => edge.key)];
  while (queue.length > 0) {
    const key = queue.shift() as string;
    if (visited.has(key)) continue;
    visited.add(key);
    queue.push(...(graph.successors.get(key) ?? []).map(edge => edge.key));
  }
  return visited;
}

function shiftsFromDeltas(
  orderedTasks: ActivityChainTask[],
  deltasByTask: Map<string, Map<string, number>>,
): ActivityChainShift[] {
  const shifts: ActivityChainShift[] = [];
  for (const task of orderedTasks) {
    const deltas = deltasByTask.get(task.id);
    if (!deltas || deltas.size === 0) continue;
    shifts.push({
      taskId: task.id,
      shiftedIds: new Set(deltas.keys()),
      deltas,
      activities: (task.activities ?? []).map(activity => deltas.has(activity.id)
        ? {
          ...activity,
          startDate: shiftActivityDate(activity.startDate, deltas.get(activity.id)!),
          endDate: shiftActivityDate(activity.endDate, deltas.get(activity.id)!),
        }
        : activity),
    });
  }
  return shifts;
}

/**
 * ОН-конвейер (жёсткий режим): работы едут вслед за изменённой.
 * Рёбра цепочки: внутри строки работы идут друг за другом (окончание–начало),
 * одинаковые (тот же id или имя) работы соседних строк-этажей связаны между собой.
 * Весь конвейер ниже изменённой работы сдвигается на ту же дельту (жёстко, без пересчёта).
 * Возвращает только реально изменившиеся задачи; сама изменённая работа не сдвигается.
 */
export function shiftActivityChain(
  orderedTasks: ActivityChainTask[],
  draggedTaskId: string,
  draggedActivityId: string,
  deltaDays: number,
): ActivityChainShift[] {
  if (deltaDays === 0) return [];

  const graph = buildChainGraph(orderedTasks);
  const shifted = collectDownstream(graph, chainKey(draggedTaskId, draggedActivityId));
  if (shifted.size === 0) return [];

  const deltasByTask = new Map<string, Map<string, number>>();
  for (const key of shifted) {
    const node = graph.info.get(key)!;
    const set = deltasByTask.get(node.taskId);
    if (set) set.set(node.activityId, deltaDays);
    else deltasByTask.set(node.taskId, new Map([[node.activityId, deltaDays]]));
  }
  return shiftsFromDeltas(orderedTasks, deltasByTask);
}

/**
 * Ограничение старта работы входящими связями конвейера: минимальный день начала
 * и работы-предшественники, которые этот минимум задают. Используется и для
 * жёсткого ограничения перетаскивания, и для визуальной подсказки «почему не едет».
 */
export interface ActivityStartConstraint {
  /** Минимально допустимый день старта (включительно). */
  minStartDay: number;
  /** Дельта в днях от текущего старта до минимума (может быть отрицательной). */
  minStartDelta: number;
  /** Предшественники, задающие минимум (несколько при равном ограничении). */
  blockers: Array<{ taskId: string; activityId: string }>;
  /** Зазор ограничивающей связи (в днях). */
  lag: number;
}

export function activityStartConstraint(
  orderedTasks: ActivityChainTask[],
  taskId: string,
  activityId: string,
): ActivityStartConstraint | null {
  const graph = buildChainGraph(orderedTasks);
  const key = chainKey(taskId, activityId);
  const node = graph.info.get(key);
  if (!node) return null;
  const candidates: Array<{ taskId: string; activityId: string; min: number; lag: number }> = [];
  let minStart = Number.NEGATIVE_INFINITY;
  for (const pred of graph.predecessors.get(key) ?? []) {
    const predNode = graph.info.get(pred.key);
    if (!predNode) continue;
    const min = predNode.startDay + predNode.durationDays + pred.lag;
    candidates.push({ taskId: predNode.taskId, activityId: predNode.activityId, min, lag: pred.lag });
    if (min > minStart) minStart = min;
  }
  if (!Number.isFinite(minStart)) return null;
  const blockers = candidates.filter(candidate => candidate.min === minStart);
  return {
    minStartDay: minStart,
    minStartDelta: minStart - node.startDay,
    blockers: blockers.map(({ taskId: blockerTaskId, activityId: blockerActivityId }) => ({
      taskId: blockerTaskId,
      activityId: blockerActivityId,
    })),
    lag: Math.max(0, ...blockers.map(blocker => blocker.lag)),
  };
}

/**
 * Минимальная дельта перетаскивания (в днях), при которой начало работы не
 * нарушает входящие связи конвейера (конец предыдущей + лаг). null — входящих нет.
 */
export function activityChainMinStartDelta(
  orderedTasks: ActivityChainTask[],
  taskId: string,
  activityId: string,
): number | null {
  return activityStartConstraint(orderedTasks, taskId, activityId)?.minStartDelta ?? null;
}

export interface ActivityChainPushResult {
  shifts: ActivityChainShift[];
  draggedDeltaDays: number;
}

/**
 * Режим «выталкивания» (принцип «как можно раньше»), асимметрично:
 *  — предок ушёл влево → последователь подтягивается за ним (промежуток заполняется),
 *    но не левее своих других связей;
 *  — предок ушёл вправо → последователь стоит (зазор тянется), пока конец предка
 *    не пересёк его старт — тогда выталкивается;
 *  — лаг преемника — минимальный зазор: при заполнении и выталкивании держится
 *    ровно «конец предка + лаг» (постоянный, например технология).
 * Пересчёт каскадом вниз по цепочке от изменённой работы; работы вне достижимого
 * подмножества не трогаются. Ограничение старта самой изменённой работы —
 * на вызывающем (activityChainMinStartDelta).
 */
export function pushActivityChain(
  orderedTasks: ActivityChainTask[],
  draggedTaskId: string,
  draggedActivityId: string,
  requestedDeltaDays: number,
): ActivityChainPushResult {
  const graph = buildChainGraph(orderedTasks);
  const draggedKey = chainKey(draggedTaskId, draggedActivityId);
  if (!graph.info.has(draggedKey)) {
    return { shifts: [], draggedDeltaDays: requestedDeltaDays };
  }
  const downstream = collectDownstream(graph, draggedKey);
  if (downstream.size === 0) {
    return { shifts: [], draggedDeltaDays: requestedDeltaDays };
  }

  const newStart = new Map<string, number>();
  const dragged = graph.info.get(draggedKey)!;
  newStart.set(draggedKey, dragged.startDay + requestedDeltaDays);
  const endOfDay = (key: string) => {
    const node = graph.info.get(key)!;
    return (newStart.get(key) ?? node.startDay) + node.durationDays;
  };

  const order = [...downstream]
    .map(key => ({ key, node: graph.info.get(key)! }))
    .sort((a, b) => a.node.workIdx - b.node.workIdx || a.node.floorIdx - b.node.floorIdx);
  for (const { key, node } of order) {
    let earliest = Number.NEGATIVE_INFINITY;
    let oldEarliest = Number.NEGATIVE_INFINITY;
    for (const pred of graph.predecessors.get(key) ?? []) {
      const predNode = graph.info.get(pred.key)!;
      earliest = Math.max(earliest, endOfDay(pred.key) + pred.lag);
      oldEarliest = Math.max(oldEarliest, predNode.startDay + predNode.durationDays + pred.lag);
    }
    let nextStart: number;
    if (earliest > node.startDay) {
      nextStart = earliest; // коллизия — выталкивание
    } else if (earliest < oldEarliest) {
      nextStart = earliest; // предок ушёл влево — заполняем промежуток
    } else {
      nextStart = node.startDay; // предок вправо в пределах запаса — зазор тянется
    }
    newStart.set(key, nextStart);
  }

  const deltasByTask = new Map<string, Map<string, number>>();
  for (const key of downstream) {
    const node = graph.info.get(key)!;
    const delta = (newStart.get(key) ?? node.startDay) - node.startDay;
    if (delta === 0) continue;
    const set = deltasByTask.get(node.taskId);
    if (set) set.set(node.activityId, delta);
    else deltasByTask.set(node.taskId, new Map([[node.activityId, delta]]));
  }
  return { shifts: shiftsFromDeltas(orderedTasks, deltasByTask), draggedDeltaDays: requestedDeltaDays };
}
