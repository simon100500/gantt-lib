'use client';

// START_MODULE_CONTRACT
// PURPOSE: Render explicit activity dependencies through the existing native Gantt dependency renderer.
// PAN_COST: Project only rows incident to a rendered edge; keep offscreen endpoint rows for boundary links, and memoize topology separately from hover/pan.
// SCOPE: Host-scoped activity IDs, packed lanes, FS/SS/FF/SF endpoints, lag visibility, virtualized rows and controlled/live chain geometry.
// INPUTS: Visible row tasks, explicit activity edges, row offsets/heights and optional activity preview store and controlled chain/boundary highlight.
// OUTPUTS: Native DependencyLines paths, markers, hover and lag labels; no DOM measurements or separate SVG implementation.
// DEPENDS: DependencyLines, computeActivityLanes, ActivityPreviewStore
// END_MODULE_CONTRACT
import React, { useEffect, useMemo, useReducer } from 'react';
import type { Task, TaskActivityDependency, ActivityDependencyHighlight } from '../../types';
import { ACTIVITY_LANE_BAR_HEIGHT, ACTIVITY_LANE_STEP, computeActivityLanes, shiftActivityDate } from '../../utils/activities';
import type { ActivityPreviewStore } from '../GanttChart/previewStore';
import { DependencyLines } from './DependencyLines';

type Props = {
  tasks: Task[]; renderedTaskIds: Set<string>; dependencies: readonly TaskActivityDependency[]; highlight?: ActivityDependencyHighlight;
  monthStart: Date; dayWidth: number; rowHeight: number; gridWidth: number; totalHeight: number;
  rowIndexByTaskId: Map<string, number>; rowTops: number[]; rowHeights: number[];
  showLag: boolean; previewStore?: ActivityPreviewStore;
  horizontalWindow?: { startPx: number; endPx: number };
};
const activityKey = (taskId: string, activityId: string) => JSON.stringify([taskId, activityId]);

export function ActivityDependencyLines(props: Props) {
  const { tasks, dependencies, monthStart, dayWidth, previewStore } = props;
  const [previewVersion, refresh] = useReducer(value => value + 1, 0);
  useEffect(() => {
    const cleanups = tasks.filter(task => task.activities?.length).map(task => previewStore?.subscribeTask(task.id, refresh));
    return () => cleanups.forEach(cleanup => cleanup?.());
  }, [tasks, previewStore]);
  const layout = useMemo(() => {
    const flattened: Task[] = [], rendered: Task[] = [], tops: number[] = [], heights: number[] = [];
    const indices = new Map<string, number>();
    const neededRows = new Set<string>();
    const incoming = new Map<string, NonNullable<Task['dependencies']>>();
    const selected = props.highlight ? new Set(props.highlight.activities.map(activity => activityKey(activity.taskId, activity.activityId))) : undefined;
    const highlightMode = props.highlight?.mode ?? 'chain';
    for (const edge of dependencies) {
      if (!props.renderedTaskIds.has(edge.predecessorTaskId) && !props.renderedTaskIds.has(edge.successorTaskId)) continue;
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
      values.push({ taskId: activityKey(edge.predecessorTaskId, edge.predecessorActivityId), type: edge.type, lag: edge.lag });
      incoming.set(id, values);
    }
    for (const task of tasks) {
      if (!neededRows.has(task.id)) continue;
      const row = props.rowIndexByTaskId.get(task.id);
      if (row === undefined || !task.activities?.length) continue;
      const height = props.rowHeights[row] ?? props.rowHeight;
      if (height < props.rowHeight) continue; // Compact composite rows do not render activity bars.
      const packed = computeActivityLanes(task.activities, monthStart, dayWidth);
      const offset = Math.max(0, (height - packed.laneCount * ACTIVITY_LANE_STEP) / 2);
      const segments = new Map(packed.segments.map(segment => [segment.id, segment]));
      for (const activity of task.activities) {
        const segment = segments.get(activity.id)!;
        const id = activityKey(task.id, activity.id), index = flattened.length;
        const delta = previewStore?.getTaskOverrides(task.id)?.get(activity.id) ?? 0;
        const node: Task = { id, name: activity.name, startDate: shiftActivityDate(activity.startDate, delta), endDate: shiftActivityDate(activity.endDate, delta), dependencies: incoming.get(id) };
        flattened.push(node);
        if (props.renderedTaskIds.has(task.id)) rendered.push(node);
        indices.set(id, index);
        tops.push((props.rowTops[row] ?? row * props.rowHeight) + offset + segment.lane * ACTIVITY_LANE_STEP + (ACTIVITY_LANE_STEP - ACTIVITY_LANE_BAR_HEIGHT) / 2);
        heights.push(ACTIVITY_LANE_BAR_HEIGHT);
      }
    }
    return { flattened, rendered, indices, tops, heights };
  }, [tasks, dependencies, props.highlight, monthStart, dayWidth, props.rowIndexByTaskId, props.rowTops, props.rowHeights, props.rowHeight, props.renderedTaskIds, previewStore, previewVersion]);
  return <DependencyLines tasks={layout.rendered} allTasks={layout.flattened} monthStart={monthStart} dayWidth={dayWidth} rowHeight={ACTIVITY_LANE_BAR_HEIGHT} gridWidth={props.gridWidth} totalHeight={props.totalHeight} rowIndexByTaskId={layout.indices} rowTops={layout.tops} rowHeights={layout.heights} horizontalWindow={props.horizontalWindow} showLag={props.showLag} activityEndpoints />;
}
