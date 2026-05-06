'use client';

import React, { useMemo } from 'react';
import { getDayOffset, parseUTCDate } from '../../utils/dateUtils';
import type { TimelineMarker } from '../../types';
import './TimelineMarkers.css';

export interface TimelineMarkersProps {
  rangeStart: Date;
  dayWidth: number;
  totalHeight: number;
  headerHeight: number;
  markers?: TimelineMarker[];
}

const TimelineMarkers: React.FC<TimelineMarkersProps> = ({ rangeStart, dayWidth, totalHeight, headerHeight, markers = [] }) => {
  const visibleMarkers = useMemo(() => {
    return markers
      .map((marker, index) => {
        const date = parseUTCDate(marker.date);
        const offset = getDayOffset(date, rangeStart);
        const left = Math.round(offset * dayWidth);
        return {
          ...marker,
          id: `${date.getTime()}-${index}`,
          left,
        };
      })
      .filter(marker => Number.isFinite(marker.left));
  }, [markers, rangeStart, dayWidth]);

  if (visibleMarkers.length === 0) {
    return null;
  }

  return (
    <div
      className="gantt-tm-layer"
      style={{ height: `${totalHeight}px` }}
      aria-hidden="true"
    >
      {visibleMarkers.map(marker => {
        const tooltip = marker.name?.trim();
        const color = marker.color || 'var(--gantt-timeline-marker-color, #dc2626)';
        return (
          <div
            key={marker.id}
            className="gantt-tm-marker"
            style={{ left: `${marker.left}px`, color }}
            aria-label={tooltip || 'Timeline marker'}
          >
            <div className="gantt-tm-hitArea">
              <div
                className="gantt-tm-line"
                style={{ backgroundColor: color }}
              />
              {tooltip && (
                <span
                  className="gantt-tm-tooltip"
                  style={{ top: `${-headerHeight + 6}px` }}
                  role="tooltip"
                >
                  {tooltip}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimelineMarkers;
