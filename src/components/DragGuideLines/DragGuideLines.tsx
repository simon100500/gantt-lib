'use client';

import React from 'react';
import styles from './DragGuideLines.module.css';

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
          className={styles.guideLine}
          style={{
            left: `${left}px`,
            height: `${totalHeight}px`,
          }}
        />
      )}
      {showRightLine && (
        <div
          className={styles.guideLine}
          style={{
            left: `${left + width}px`,
            height: `${totalHeight}px`,
          }}
        />
      )}
    </>
  );
};

export default DragGuideLines;
