'use client';

import React from 'react';
import './DependencyCreationOverlay.css';

export interface DependencyCreationDrag {
  sourceId: string;
  sourceSide: 'left' | 'right';
  source: { x: number; y: number };
  current: { x: number; y: number };
  target?: { taskId: string; side: 'left' | 'right' };
  linkType?: string;
}

interface DependencyCreationOverlayProps {
  drag: DependencyCreationDrag | null;
  width: number;
  height: number;
}

function getPath(drag: DependencyCreationDrag): string {
  const from = drag.source;
  const to = drag.current;
  const direction = to.y >= from.y ? 1 : -1;
  const bend = Math.max(18, Math.abs(to.y - from.y) * 0.45);
  const middleX = Math.round((from.x + to.x) / 2);

  if (Math.abs(to.y - from.y) < 2) {
    return `M ${Math.round(from.x)} ${Math.round(from.y)} H ${Math.round(to.x)}`;
  }

  return [
    `M ${Math.round(from.x)} ${Math.round(from.y)}`,
    `C ${Math.round(from.x)} ${Math.round(from.y + bend * direction)}, ${Math.round(to.x)} ${Math.round(to.y - bend * direction)}, ${Math.round(to.x)} ${Math.round(to.y)}`,
  ].join(' ');
}

export const DependencyCreationOverlay: React.FC<DependencyCreationOverlayProps> = ({ drag, width, height }) => {
  if (!drag) return null;

  return (
    <svg
      className="gantt-dependencyCreation-svg"
      data-testid="dependency-creation-preview"
      width={width}
      height={height}
      aria-hidden="true"
    >
      <path
        className={`gantt-dependencyCreation-path ${drag.target ? 'gantt-dependencyCreation-pathTargeted' : ''}`}
        d={getPath(drag)}
      />
      <circle className="gantt-dependencyCreation-source" cx={drag.source.x} cy={drag.source.y} r="4" />
      <circle
        className={`gantt-dependencyCreation-target ${drag.target ? 'gantt-dependencyCreation-targetValid' : ''}`}
        cx={drag.current.x}
        cy={drag.current.y}
        r="5"
      />
      {drag.linkType && (
        <text className="gantt-dependencyCreation-label" x={drag.current.x + 10} y={drag.current.y - 10}>
          {drag.linkType}
        </text>
      )}
    </svg>
  );
};

export default DependencyCreationOverlay;
