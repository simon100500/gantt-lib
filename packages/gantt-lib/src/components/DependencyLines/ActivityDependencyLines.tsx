'use client';

// START_MODULE_CONTRACT
// PURPOSE: Render explicit activity dependencies through the existing native Gantt dependency renderer.
// CYCLE_TOPOLOGY: Detect cycles once on the full graph; viewport projection cannot change cycle membership.
// LIVE_RANGE: Exact gesture ranges take priority over chain shifts; packing follows preview overlap and resize.
// PAN_COST: Project the graph on data/geometry changes only. Pan selects cached row nodes, never repacks lanes or rebuilds edge geometry.
// SCOPE: Host-scoped activity IDs, packed lanes, FS/SS/FF/SF endpoints, lag visibility, virtualized rows and controlled/live chain geometry.
// INPUTS: Visible row tasks, explicit activity edges, row offsets/heights and optional activity preview store and controlled chain/boundary highlight.
// OUTPUTS: Native DependencyLines paths, markers, hover and lag labels; no DOM measurements or separate SVG implementation.
// DEPENDS: DependencyLines, computeActivityLanes, ActivityPreviewStore
// END_MODULE_CONTRACT
import React, { useEffect, useMemo, useReducer, useRef } from 'react';
import type { Task, TaskActivityDependency, ActivityDependencyHighlight } from '../../types';
import { ACTIVITY_LANE_BAR_HEIGHT, ACTIVITY_LANE_STEP, computeActivityLanes, shiftActivityDate } from '../../utils/activities';
import type { ActivityPreviewStore } from '../GanttChart/previewStore';
import { detectCycles } from '../../utils/dependencyUtils';
import { DependencyLines } from './DependencyLines';

type Props = {
  tasks: Task[]; renderedTaskIds: Set<string>; dependencies: readonly TaskActivityDependency[]; highlight?: ActivityDependencyHighlight;
  monthStart: Date; dayWidth: number; rowHeight: number; gridWidth: number; totalHeight: number;
  rowIndexByTaskId: Map<string, number>; rowTops: number[]; rowHeights: number[];
  showLag: boolean; previewStore?: ActivityPreviewStore;
  horizontalWindow?: { startPx: number; endPx: number };
};
const activityKey = (taskId: string, activityId: string) => JSON.stringify([taskId, activityId]);

// PAN_COST: вертикальная прокрутка меняет набор видимых строк на каждом бакете,
// но дорожки уже спроектированных строк меняться не должны. Кэш по задаче
// переживает смену окна рендера и перестраивается только при смене данных,
// геометрии или превью этой задачи.
type TaskLayoutCache = {
  activities: NonNullable<Task['activities']>;
  monthStartMs: number;
  dayWidth: number;
  overrides: Map<string, number> | undefined;
  range: { startDate: Date; endDate: Date } | undefined;
  laneCount: number;
  lanes: Map<string, number>;
  /** Raw activity ids aligned with `nodes` — lane keys are raw, node ids are host-scoped. */
  rawIds: string[];
  nodes: Task[];
};

const sameDependencies = (left: NonNullable<Task['dependencies']> | undefined, right: NonNullable<Task['dependencies']> | undefined): boolean => {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((dep, index) => {
    const other = right[index];
    return dep.taskId === other.taskId && dep.type === other.type && dep.lag === other.lag && dep.hidden === other.hidden;
  });
};

export function ActivityDependencyLines(props: Props) {
  const { tasks, dependencies, monthStart, dayWidth, previewStore } = props;
  const [previewVersion, refresh] = useReducer(value => value + 1, 0);
  useEffect(() => {
    const cleanups = tasks.filter(task => task.activities?.length).map(task => previewStore?.subscribeTask(task.id, refresh));
    return () => cleanups.forEach(cleanup => cleanup?.());
  }, [tasks, previewStore]);
  // START_BLOCK_STABLE_ACTIVITY_CYCLE_GRAPH
  const cycleTaskIds = useMemo(() => {
    const incoming = new Map<string, NonNullable<Task['dependencies']>>();
    for (const edge of dependencies) {
      const id=activityKey(edge.successorTaskId,edge.successorActivityId);
      const values=incoming.get(id) ?? [];
      values.push({taskId:activityKey(edge.predecessorTaskId,edge.predecessorActivityId),type:edge.type,lag:edge.lag ?? 0});incoming.set(id,values);
    }
    const nodes=tasks.flatMap(task=>(task.activities ?? []).map(activity=>({id:activityKey(task.id,activity.id),name:activity.name,startDate:activity.startDate,endDate:activity.endDate,dependencies:incoming.get(activityKey(task.id,activity.id))})));
    return new Set(detectCycles(nodes).cyclePath ?? []);
  }, [tasks,dependencies]);
  // END_BLOCK_STABLE_ACTIVITY_CYCLE_GRAPH
  const layoutCacheRef = useRef(new Map<string, TaskLayoutCache>());
  const layout = useMemo(() => {
    const flattened: Task[] = [], tops: number[] = [], heights: number[] = [];
    const nodesByTaskId = new Map<string, Task[]>();
    const indices = new Map<string, number>();
    const neededRows = new Set<string>();
    const incoming = new Map<string, NonNullable<Task['dependencies']>>();
    const selected = props.highlight ? new Set(props.highlight.activities.map(activity => activityKey(activity.taskId, activity.activityId))) : undefined;
    const highlightMode = props.highlight?.mode ?? 'chain';
    for (const edge of dependencies) {
      // Вертикальные (межстрочные) связи показываем и обновляем только когда
      // выделена цепочка; без выделения основная картинка — связи по строкам.
      const isCrossRow = edge.predecessorTaskId !== edge.successorTaskId;
      if (isCrossRow && !props.highlight) continue;
      if (selected) {
        const fromSelected = selected.has(activityKey(edge.predecessorTaskId, edge.predecessorActivityId));
        const toSelected = selected.has(activityKey(edge.successorTaskId, edge.successorActivityId));
        const internal = fromSelected && toSelected;
        const incoming = !fromSelected && toSelected && (highlightMode === 'chain-incoming' || highlightMode === 'chain-all');
        const outgoing = fromSelected && !toSelected && (highlightMode === 'chain-outgoing' || highlightMode === 'chain-all');
        if (!internal && !incoming && !outgoing) continue;
      }
      neededRows.add(edge.predecessorTaskId);
      neededRows.add(edge.successorTaskId);
      const id = activityKey(edge.successorTaskId, edge.successorActivityId);
      const values = incoming.get(id) ?? [];
      values.push({ taskId: activityKey(edge.predecessorTaskId, edge.predecessorActivityId), type: edge.type, lag: edge.lag ?? 0 });
      incoming.set(id, values);
    }
    const monthStartMs = monthStart.getTime();
    const cache = layoutCacheRef.current;
    for (const task of tasks) {
      if (!neededRows.has(task.id)) continue;
      const row = props.rowIndexByTaskId.get(task.id);
      if (row === undefined || !task.activities?.length) continue;
      const height = props.rowHeights[row] ?? props.rowHeight;
      if (height < props.rowHeight) continue; // Compact composite rows do not render activity bars.
      const activities = task.activities;
      const overrides = previewStore?.getTaskOverrides(task.id);
      let range: TaskLayoutCache['range'];
      for (const activity of activities) {
        const current = previewStore?.getActivityRange?.(task.id, activity.id);
        if (current) { range = current; break; }
      }
      let entry = cache.get(task.id);
      const reusable = entry
        && entry.activities === activities
        && entry.monthStartMs === monthStartMs
        && entry.dayWidth === dayWidth
        && entry.overrides === overrides
        && entry.range === range
        && entry.nodes.length === activities.length
        && entry.nodes.every((node, index) => (
          node.name === activities[index].name
          && node.startDate === activities[index].startDate
          && node.endDate === activities[index].endDate
          && sameDependencies(node.dependencies, incoming.get(node.id))
        ));
      if (!entry || !reusable) {
        // LIVE_RANGE: точный диапазон перетаскиваемой работы приоритетнее сдвига цепочки.
        const liveActivities = activities.map(activity => {
          const activityRange = previewStore?.getActivityRange?.(task.id, activity.id);
          if (activityRange) return { ...activity, startDate: activityRange.startDate, endDate: activityRange.endDate };
          const delta = overrides?.get(activity.id) ?? 0;
          if (delta === 0) return activity;
          return { ...activity, startDate: shiftActivityDate(activity.startDate, delta), endDate: shiftActivityDate(activity.endDate, delta) };
        });
        const packed = computeActivityLanes(liveActivities, monthStart, dayWidth);
        const lanes = new Map(packed.segments.map(segment => [segment.id, segment.lane]));
        const rawIds = liveActivities.map(activity => activity.id);
        const nodes = liveActivities.map(activity => ({
          id: activityKey(task.id, activity.id),
          name: activity.name,
          startDate: activity.startDate,
          endDate: activity.endDate,
          dependencies: incoming.get(activityKey(task.id, activity.id)),
        }));
        entry = { activities, monthStartMs, dayWidth, overrides, range, laneCount: packed.laneCount, lanes, rawIds, nodes };
        cache.set(task.id, entry);
      }
      const offset = Math.max(0, (height - entry.laneCount * ACTIVITY_LANE_STEP) / 2);
      nodesByTaskId.set(task.id, entry.nodes);
      entry.nodes.forEach((node, nodeIndex) => {
        const lane = entry.lanes.get(entry.rawIds[nodeIndex]) ?? 0;
        const index = flattened.length;
        flattened.push(node);
        indices.set(node.id, index);
        tops.push((props.rowTops[row] ?? row * props.rowHeight) + offset + lane * ACTIVITY_LANE_STEP + (ACTIVITY_LANE_STEP - ACTIVITY_LANE_BAR_HEIGHT) / 2);
        heights.push(ACTIVITY_LANE_BAR_HEIGHT);
      });
    }
    for (const taskId of cache.keys()) {
      if (!nodesByTaskId.has(taskId)) cache.delete(taskId);
    }
    return { flattened, nodesByTaskId, indices, tops, heights };
  }, [tasks, dependencies, props.highlight, monthStart, dayWidth, props.rowIndexByTaskId, props.rowTops, props.rowHeights, props.rowHeight, previewStore, previewVersion]);
  const rendered = useMemo(() => {
    const nodes: Task[] = [];
    for (const taskId of props.renderedTaskIds) {
      const rowNodes = layout.nodesByTaskId.get(taskId);
      if (rowNodes) nodes.push(...rowNodes);
    }
    return nodes;
  }, [layout, props.renderedTaskIds]);
  return <DependencyLines tasks={rendered} allTasks={layout.flattened} monthStart={monthStart} dayWidth={dayWidth} rowHeight={ACTIVITY_LANE_BAR_HEIGHT} gridWidth={props.gridWidth} totalHeight={props.totalHeight} rowIndexByTaskId={layout.indices} rowTops={layout.tops} rowHeights={layout.heights} horizontalWindow={props.horizontalWindow} showLag={props.showLag} cycleTaskIds={cycleTaskIds} activityEndpoints />;
}
