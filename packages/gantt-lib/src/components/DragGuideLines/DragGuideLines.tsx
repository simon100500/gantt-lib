'use client';

import React from 'react';
import './DragGuideLines.css';

export interface DragGuideLinesProps {
  isDragging: boolean;
  dragMode: 'move' | 'resize-left' | 'resize-right' | null;
  left: number;
  width: number;
  totalHeight: number;
}

const DragGuideLines: React.FC<DragGuideLinesProps> = ({
  isDragging,
  dragMode,
  left,
  width,
  totalHeight,
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
            height: `${totalHeight}px`,
            transform: `translate3d(${left}px, 0, 0)`,
          }}
        />
      )}
      {showRightLine && (
        <div
          className="gantt-dgl-guideLine"
          style={{
            height: `${totalHeight}px`,
            transform: `translate3d(${left + width}px, 0, 0)`,
          }}
        />
      )}
    </>
  );
};

export default DragGuideLines;
