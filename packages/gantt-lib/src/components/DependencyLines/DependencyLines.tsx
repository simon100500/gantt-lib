'use client';

import React, { useMemo } from 'react';
import { Task } from '../../types';
import { calculateTaskBar, calculateDependencyPath } from '../../utils/geometry';
import { getAllDependencyEdges, detectCycles } from '../../utils/dependencyUtils';
import './DependencyLines.css';

export interface DependencyLinesProps {
  /** All tasks in the chart */
  tasks: Task[];
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
}

/**
 * SVG overlay component rendering dependency lines as orthogonal paths with rounded corners
 *
 * Lines connect from the right edge of predecessor tasks to the left edge
 * of successor tasks using horizontal/vertical lines with arc rounded corners.
 * Circular dependencies are highlighted in red.
 *
 * Performance: Uses React.memo to prevent re-renders when dependencies haven't changed.
 */
export const DependencyLines: React.FC<DependencyLinesProps> = React.memo(({
  tasks,
  monthStart,
  dayWidth,
  rowHeight,
  gridWidth,
  dragOverrides,
}) => {
  // Create a lookup map for task positions and their indices
  const { taskPositions, taskIndices } = useMemo(() => {
    const positions = new Map<string, { left: number; right: number; rowTop: number }>();
    const indices = new Map<string, number>();

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
      });
    });

    return { taskPositions: positions, taskIndices: indices };
  }, [tasks, monthStart, dayWidth, rowHeight, dragOverrides]);

  // Detect cycles for highlighting
  const cycleInfo = useMemo(() => {
    const result = detectCycles(tasks);
    const cycleTaskIds = new Set(result.cyclePath || []);
    return cycleTaskIds;
  }, [tasks]);

  // Calculate all dependency line paths
  const lines = useMemo(() => {
    const edges = getAllDependencyEdges(tasks);
    const lines: Array<{
      id: string;
      path: string;
      hasCycle: boolean;
      lag: number;
      fromX: number;
      toX: number;
      fromY: number;
    }> = [];

    for (const edge of edges) {
      const predecessor = taskPositions.get(edge.predecessorId);
      const successor = taskPositions.get(edge.successorId);
      const predecessorIndex = taskIndices.get(edge.predecessorId);
      const successorIndex = taskIndices.get(edge.successorId);

      if (!predecessor || !successor || predecessorIndex === undefined || successorIndex === undefined) {
        continue; // Skip if task not found (shouldn't happen with validation)
      }

      // Determine if tasks are in reverse order (predecessor appears below successor)
      const reverseOrder = predecessorIndex > successorIndex;

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

      lines.push({
        id: `${edge.predecessorId}-${edge.successorId}-${edge.type}`,
        path,
        hasCycle,
        lag: edge.lag ?? 0,
        fromX,
        toX,
        fromY,
      });
    }

    return lines;
  }, [tasks, taskPositions, taskIndices, cycleInfo]);

  return (
    <svg
      className="gantt-dependencies-svg"
      width={gridWidth}
      height={tasks.length * rowHeight}
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
      </defs>

      {lines.map(({ id, path, hasCycle, lag, fromX, toX, fromY }) => (
        <React.Fragment key={id}>
          <path
            d={path}
            className={hasCycle ? 'gantt-dependency-path gantt-dependency-cycle' : 'gantt-dependency-path'}
            markerEnd={hasCycle ? 'url(#arrowhead-cycle)' : 'url(#arrowhead)'}
          />
          {lag !== 0 && (
            <text
              className="gantt-dependency-lag-label"
              x={(toX - 14)}
              y={fromY + 14}
              textAnchor="middle"
              fontSize="10"
              fill={hasCycle ? 'var(--gantt-dependency-cycle-color, #ef4444)' : 'var(--gantt-dependency-line-color, #666666)'}
            >
              {lag > 0 ? `+${lag}` : `${lag}`}
            </text>
          )}
        </React.Fragment>
      ))}
    </svg>
  );
});

DependencyLines.displayName = 'DependencyLines';

export default DependencyLines;
