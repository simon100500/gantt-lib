'use client';

import React from 'react';
import './DragGuideLines.css';

// START_MODULE_CONTRACT
// PURPOSE: Show drag boundaries only across the visible Gantt viewport.
// SCOPE: Render left/right guides at the active bar edges using viewport top and height.
// DEPENDS: GanttChart
// LINKS: GanttChart
// ROLE: RUNTIME
// MAP_MODE: EXPORTS
// END_MODULE_CONTRACT

export interface DragGuideLinesProps {
  isDragging: boolean;
  dragMode: 'move' | 'resize-left' | 'resize-right' | null;
  left: number;
  width: number;
  totalHeight: number;
  top?: number;
}

const DragGuideLines: React.FC<DragGuideLinesProps> = ({
  isDragging,
  dragMode,
  left,
  width,
  totalHeight,
  top = 0,
}) => {
  if (!isDragging || !dragMode) {
    return null;
  }

  // Determine which lines to show based on drag mode
  const showLeftLine = dragMode === 'move' || dragMode === 'resize-left';
  const showRightLine = dragMode === 'move' || dragMode === 'resize-right';

  return (
    <>
      {showLeftLine && (
        <div
          className="gantt-dgl-guideLine"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            height: `${totalHeight}px`,
          }}
        />
      )}
      {showRightLine && (
        <div
          className="gantt-dgl-guideLine"
          style={{
            left: `${left + width}px`,
            top: `${top}px`,
            height: `${totalHeight}px`,
          }}
        />
      )}
    </>
  );
};

export default DragGuideLines;
