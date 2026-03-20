'use client';

import React, { useMemo } from 'react';
import { Task } from '../../types';
import { calculateTaskBar, calculateDependencyPath, pixelsToDate } from '../../utils/geometry';
import { getAllDependencyEdges, detectCycles, computeLagFromDates } from '../../utils/dependencyUtils';
import type { LinkType } from '../../types';
import './DependencyLines.css';

/**
 * Calculate effective lag based on current task pixel positions.
 * Delegates to computeLagFromDates for consistent semantics.
 */
function calculateEffectiveLag(
  edge: { type: string },
  predPosition: { left: number; right: number },
  succPosition: { left: number; right: number },
  monthStart: Date,
  dayWidth: number,
  businessDays: boolean = false,
  weekendPredicate?: (date: Date) => boolean
): number {
  const predStart = pixelsToDate(predPosition.left, monthStart, dayWidth);
  const predEnd   = pixelsToDate(predPosition.right - dayWidth, monthStart, dayWidth);
  const succStart = pixelsToDate(succPosition.left, monthStart, dayWidth);
  const succEnd   = pixelsToDate(succPosition.right - dayWidth, monthStart, dayWidth);
  return computeLagFromDates(edge.type as LinkType, predStart, predEnd, succStart, succEnd, businessDays, weekendPredicate);
}

/**
 * Check if a task is hidden inside a collapsed parent.
 */
function isTaskHidden(taskId: string, collapsedParentIds: Set<string>, taskMap: Map<string, Task>): boolean {
  const task = taskMap.get(taskId);
  if (!task || !task.parentId) return false;
  return collapsedParentIds.has(task.parentId);
}

/**
 * Find the nearest visible ancestor of a hidden task.
 * Returns the ancestor task or null if the task is visible.
 */
function findVisibleAncestor(
  task: Task,
  collapsedParentIds: Set<string>,
  taskMap: Map<string, Task>
): Task | null {
  if (!task.parentId) return null;
  if (collapsedParentIds.has(task.parentId)) {
    const parent = taskMap.get(task.parentId);
    if (!parent) return null;
    // Check if parent is also hidden
    if (parent.parentId && collapsedParentIds.has(parent.parentId)) {
      return findVisibleAncestor(parent, collapsedParentIds, taskMap);
    }
    return parent;
  }
  return null;
}

/**
 * Check if two tasks share the same collapsed parent ancestor.
 * If both predecessor and successor are hidden inside the same parent,
 * the dependency line should NOT be rendered (it's internal to the collapsed group).
 */
function areBothHiddenInSameParent(
  predecessorId: string,
  successorId: string,
  collapsedParentIds: Set<string>,
  taskMap: Map<string, Task>
): boolean {
  const predTask = taskMap.get(predecessorId);
  const succTask = taskMap.get(successorId);

  if (!predTask || !succTask) return false;

  // Both must have parentIds
  if (!predTask.parentId || !succTask.parentId) return false;

  // Find the visible ancestor (collapsed parent) for each
  const predVisibleAncestor = findVisibleAncestor(predTask, collapsedParentIds, taskMap);
  const succVisibleAncestor = findVisibleAncestor(succTask, collapsedParentIds, taskMap);

  // Both must be hidden (have visible ancestors)
  if (!predVisibleAncestor || !succVisibleAncestor) return false;

  // Check if they share the same collapsed parent
  return predVisibleAncestor.id === succVisibleAncestor.id;
}

export interface DependencyLinesProps {
  /** Visible tasks only (for row calculation) */
  tasks: Task[];
  /** All tasks including hidden children (for virtual position calculation) */
  allTasks?: Task[];
  /** Set of collapsed parent IDs */
  collapsedParentIds?: Set<string>;
  /** Start of the visible range (e.g., month start) */
  monthStart: Date;
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Height of each task row in pixels */
  rowHeight: number;
  /** Total width of the grid in pixels */
  gridWidth: number;
  /** Real-time pixel overrides for task positions during drag (taskId -> {left, width}) */
  dragOverrides?: Map<string, { left: number; width: number }>;
  /** Currently selected dep chip — highlights the matching arrow in red */
  selectedDep?: { predecessorId: string; successorId: string; linkType: string } | null;
  businessDays?: boolean;
  weekendPredicate?: (date: Date) => boolean;
}

/**
 * SVG overlay component rendering dependency lines as orthogonal paths with rounded corners
 *
 * Lines connect from the right edge of predecessor tasks to the left edge
 * of successor tasks using horizontal/vertical lines with arc rounded corners.
 * Circular dependencies are highlighted in red.
 *
 * Virtual dependency links: When a task is hidden inside a collapsed parent,
 * its dependency lines render at "virtual positions" using the parent's row.
 * These virtual lines are styled with dashed strokes to indicate the hidden status.
 *
 * Performance: Uses React.memo to prevent re-renders when dependencies haven't changed.
 */
export const DependencyLines: React.FC<DependencyLinesProps> = React.memo(({
  tasks,
  allTasks,
  collapsedParentIds = new Set(),
  monthStart,
  dayWidth,
  rowHeight,
  gridWidth,
  dragOverrides,
  selectedDep,
  businessDays = false,
  weekendPredicate,
}) => {
  // Use allTasks for virtual position calculation if provided, otherwise use tasks
  const tasksForPositions = allTasks ?? tasks;

  // Create a lookup map for task positions and their indices
  const { taskPositions, taskIndices, hiddenTaskIds } = useMemo(() => {
    const positions = new Map<string, { left: number; right: number; rowTop: number; isVirtual: boolean }>();
    const indices = new Map<string, number>();
    const hidden = new Set<string>();
    const taskMap = new Map(tasksForPositions.map(t => [t.id, t]));
    const visibleTaskMap = new Map(tasks.map(t => [t.id, t]));

    // First pass: Calculate positions for visible tasks (existing logic)
    tasks.forEach((task, index) => {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      const computed = calculateTaskBar(startDate, endDate, monthStart, dayWidth);

      // Use real-time pixel override if available (during drag)
      const override = dragOverrides?.get(task.id);
      const resolvedLeft = override?.left ?? computed.left;
      const resolvedWidth = override?.width ?? computed.width;

      indices.set(task.id, index);
      positions.set(task.id, {
        left: resolvedLeft,
        right: resolvedLeft + resolvedWidth,
        rowTop: index * rowHeight,
        isVirtual: false,
      });
    });

    // Second pass: Calculate virtual positions for hidden tasks
    if (allTasks && collapsedParentIds.size > 0) {
      for (const task of allTasks) {
        // Skip if already processed (visible task)
        if (positions.has(task.id)) continue;

        // Check if task is hidden inside a collapsed parent
        if (!isTaskHidden(task.id, collapsedParentIds, taskMap)) continue;

        hidden.add(task.id);

        // Find the visible ancestor (collapsed parent)
        const visibleAncestor = findVisibleAncestor(task, collapsedParentIds, taskMap);
        if (!visibleAncestor) continue;

        // Get the ancestor's row position
        const ancestorPosition = positions.get(visibleAncestor.id);
        if (!ancestorPosition) continue;

        // Calculate horizontal position from task's dates
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.endDate);
        const computed = calculateTaskBar(startDate, endDate, monthStart, dayWidth);

        // Use real-time pixel override if available (during drag)
        const override = dragOverrides?.get(task.id);
        const resolvedLeft = override?.left ?? computed.left;
        const resolvedWidth = override?.width ?? computed.width;

        // Store virtual position using ancestor's rowTop
        positions.set(task.id, {
          left: resolvedLeft,
          right: resolvedLeft + resolvedWidth,
          rowTop: ancestorPosition.rowTop,
          isVirtual: true,
        });
      }
    }

    return { taskPositions: positions, taskIndices: indices, hiddenTaskIds: hidden };
  }, [tasks, tasksForPositions, allTasks, collapsedParentIds, monthStart, dayWidth, rowHeight, dragOverrides]);

  // Detect cycles for highlighting (use allTasks for accurate cycle detection)
  const cycleInfo = useMemo(() => {
    const tasksForCycleDetection = allTasks ?? tasks;
    const result = detectCycles(tasksForCycleDetection);
    const cycleTaskIds = new Set(result.cyclePath || []);
    return cycleTaskIds;
  }, [tasks, allTasks]);

  // Calculate all dependency line paths (use allTasks if available)
  const lines = useMemo(() => {
    const tasksForEdges = allTasks ?? tasks;
    const edges = getAllDependencyEdges(tasksForEdges);
    const lines: Array<{
      id: string;
      path: string;
      hasCycle: boolean;
      lag: number;
      fromX: number;
      toX: number;
      fromY: number;
      reverseOrder: boolean;
      isVirtual: boolean;
    }> = [];

    for (const edge of edges) {
      const predecessor = taskPositions.get(edge.predecessorId);
      const successor = taskPositions.get(edge.successorId);
      const predecessorIndex = taskIndices.get(edge.predecessorId);
      const successorIndex = taskIndices.get(edge.successorId);

      if (!predecessor || !successor) {
        continue; // Skip if task not found (shouldn't happen with validation)
      }

      // Check if both tasks are hidden inside the same collapsed parent
      // If so, skip rendering this line (it's internal to the collapsed group)
      if (allTasks && collapsedParentIds.size > 0) {
        const taskMap = new Map(allTasks.map(t => [t.id, t]));
        if (areBothHiddenInSameParent(edge.predecessorId, edge.successorId, collapsedParentIds, taskMap)) {
          continue;
        }
      }

      // Check if either endpoint is virtual (hidden task)
      const isVirtual = predecessor.isVirtual || successor.isVirtual;

      // Determine if tasks are in reverse order (predecessor appears below successor)
      // For virtual tasks, use the predecessor's rowTop for comparison
      let reverseOrder = false;
      if (predecessorIndex !== undefined && successorIndex !== undefined) {
        reverseOrder = predecessorIndex > successorIndex;
      } else {
        // One or both are virtual - use rowTop for comparison
        reverseOrder = predecessor.rowTop > successor.rowTop;
      }

      // Calculate direction-specific Y coordinates
      let fromY: number;
      let toY: number;

      if (reverseOrder) {
        // Arrow goes UP: exit from top of parent bar, enter at bottom of child bar
        fromY = predecessor.rowTop + 10;               // 8px from top of parent bar
        toY = successor.rowTop + rowHeight - 6;        // 8px from bottom of child bar
      } else {
        // Arrow goes DOWN: exit from bottom of parent bar, enter at top of child bar
        fromY = predecessor.rowTop + rowHeight - 10;   // 8px from bottom of parent bar
        toY = successor.rowTop + 6;                    // 8px from top of child bar
      }

      // Determine connection points based on link type:
      // FS: right → left
      // SS: left  → left
      // FF: right → right
      // SF: left  → right
      const fromX = (edge.type === 'SS' || edge.type === 'SF')
        ? predecessor.left
        : predecessor.right;

      const toX = (edge.type === 'FF' || edge.type === 'SF')
        ? successor.right
        : successor.left;

      const arrivesFromRight = edge.type === 'FF' || edge.type === 'SF';

      const from = { x: fromX, y: fromY };
      const to = { x: toX, y: toY };

      const path = calculateDependencyPath(from, to, arrivesFromRight);

      // Check if this edge is part of a cycle
      const hasCycle = cycleInfo.has(edge.predecessorId) || cycleInfo.has(edge.successorId);

      // Calculate effective lag from actual positions (always, not just during drag)
      const lag = calculateEffectiveLag(edge, predecessor, successor, monthStart, dayWidth, businessDays, weekendPredicate);

      lines.push({
        id: `${edge.predecessorId}-${edge.successorId}-${edge.type}`,
        path,
        hasCycle,
        lag,
        fromX,
        toX,
        fromY,
        reverseOrder,
        isVirtual,
      });
    }

    return lines;
  }, [tasks, allTasks, taskPositions, taskIndices, cycleInfo, monthStart, dayWidth, dragOverrides, businessDays, weekendPredicate]);

  // Calculate SVG height based on visible tasks (not all tasks)
  const svgHeight = tasks.length * rowHeight;

  return (
    <svg
      className="gantt-dependencies-svg"
      width={gridWidth}
      height={svgHeight}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Arrow marker for dependency lines */}
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          markerUnits="userSpaceOnUse"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill="var(--gantt-dependency-line-color, #666666)"
          />
        </marker>

        {/* Red arrow marker for circular dependencies */}
        <marker
          id="arrowhead-cycle"
          markerWidth="8"
          markerHeight="6"
          markerUnits="userSpaceOnUse"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill="var(--gantt-dependency-cycle-color, #ef4444)"
          />
        </marker>

        {/* Red arrow marker for selected dependency */}
        <marker
          id="arrowhead-selected"
          markerWidth="8"
          markerHeight="6"
          markerUnits="userSpaceOnUse"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill="#ef4444"
          />
        </marker>
      </defs>

      {lines.map(({ id, path, hasCycle, lag, fromX, toX, fromY, reverseOrder, isVirtual }) => {
        const isSelected =
          selectedDep != null &&
          id === `${selectedDep.predecessorId}-${selectedDep.successorId}-${selectedDep.linkType}`;

        let pathClassName = 'gantt-dependency-path';
        if (isSelected) pathClassName += ' gantt-dependency-selected';
        else if (hasCycle) pathClassName += ' gantt-dependency-cycle';
        if (isVirtual && !isSelected) pathClassName += ' gantt-dependency-virtual';

        let markerEnd: string;
        if (isSelected) markerEnd = 'url(#arrowhead-selected)';
        else if (hasCycle) markerEnd = 'url(#arrowhead-cycle)';
        else markerEnd = 'url(#arrowhead)';

        const lagColor = isSelected
          ? '#ef4444'
          : hasCycle
            ? 'var(--gantt-dependency-cycle-color, #ef4444)'
            : 'var(--gantt-dependency-line-color, #666666)';

        return (
          <React.Fragment key={id}>
            <path
              d={path}
              className={pathClassName}
              markerEnd={markerEnd}
            />
            {lag !== 0 && (
              <text
                className="gantt-dependency-lag-label"
                x={lag < 0 ? toX + 14 : toX - 14}
                y={reverseOrder ? fromY - 4 : fromY + 12}
                textAnchor="middle"
                fontSize="10"
                fill={lagColor}
              >
                {lag > 0 ? `+${lag}` : `${lag}`}
              </text>
            )}
          </React.Fragment>
        );
      })}
    </svg>
  );
});

DependencyLines.displayName = 'DependencyLines';

export default DependencyLines;
