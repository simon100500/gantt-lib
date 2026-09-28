'use client';

import React from 'react';
import './DependencyCreationOverlay.css';

const LINK_TYPE_LABELS_RU: Record<string, string> = {
  FS: 'ОН',
  SS: 'НН',
  FF: 'ОО',
  SF: 'НО',
};

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

// Keep two decimals so the path meets the overlay circles at their exact
// (fractional) anchor centers — rounding to whole pixels visibly shifted the
// line tip ~1px off the port dot.
const fmt = (n: number) => Math.round(n * 100) / 100;

function getPath(drag: DependencyCreationDrag): string {
  const from = drag.source;
  const to = drag.current;
  const direction = to.y >= from.y ? 1 : -1;
  const bend = Math.max(18, Math.abs(to.y - from.y) * 0.45);

  if (Math.abs(to.y - from.y) < 2) {
    return `M ${fmt(from.x)} ${fmt(from.y)} H ${fmt(to.x)}`;
  }

  return [
    `M ${fmt(from.x)} ${fmt(from.y)}`,
    `C ${fmt(from.x)} ${fmt(from.y + bend * direction)}, ${fmt(to.x)} ${fmt(to.y - bend * direction)}, ${fmt(to.x)} ${fmt(to.y)}`,
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
          {LINK_TYPE_LABELS_RU[drag.linkType] ?? drag.linkType}
        </text>
      )}
    </svg>
  );
};

export default DependencyCreationOverlay;
