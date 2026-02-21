'use client';

import React, { useMemo } from 'react';
import { Task } from '../../types';
import { calculateTaskBar } from '../../utils/geometry';
import { calculateOrthogonalPath } from '../../utils/geometry';
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
}) => {
  // Create a lookup map for task positions
  const taskPositions = useMemo(() => {
    const positions = new Map<string, { left: number; right: number; centerY: number; index: number }>();

    tasks.forEach((task, index) => {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      const { left, width } = calculateTaskBar(startDate, endDate, monthStart, dayWidth);

      positions.set(task.id, {
        left,
        right: left + width,
        centerY: index * rowHeight + rowHeight / 2,
        index,
      });
    });

    return positions;
  }, [tasks, monthStart, dayWidth, rowHeight]);

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
    }> = [];

    for (const edge of edges) {
      const predecessor = taskPositions.get(edge.predecessorId);
      const successor = taskPositions.get(edge.successorId);

      if (!predecessor || !successor) {
        continue; // Skip if task not found (shouldn't happen with validation)
      }

      // Line starts from right edge of predecessor, ends at left edge of successor
      const from = { x: predecessor.right, y: predecessor.centerY };
      const to = { x: successor.left, y: successor.centerY };

      const path = calculateOrthogonalPath(from, to, 12, 20);

      // Check if this edge is part of a cycle
      const hasCycle = cycleInfo.has(edge.predecessorId) || cycleInfo.has(edge.successorId);

      lines.push({
        id: `${edge.predecessorId}-${edge.successorId}`,
        path,
        hasCycle,
      });
    }

    return lines;
  }, [tasks, taskPositions, cycleInfo]);

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
          className="gantt-dependency-arrow"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" />
        </marker>

        {/* Red arrow marker for circular dependencies */}
        <marker
          id="arrowhead-cycle"
          className="gantt-dependency-arrow gantt-dependency-arrow-cycle"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" />
        </marker>
      </defs>

      {lines.map(({ id, path, hasCycle }) => (
        <path
          key={id}
          d={path}
          className={hasCycle ? 'gantt-dependency-path gantt-dependency-cycle' : 'gantt-dependency-path'}
          markerEnd={hasCycle ? 'url(#arrowhead-cycle)' : 'url(#arrowhead)'}
        />
      ))}
    </svg>
  );
});

DependencyLines.displayName = 'DependencyLines';

export default DependencyLines;
