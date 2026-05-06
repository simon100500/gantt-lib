'use client';

import React, { useMemo } from 'react';
import { getDayOffset, parseUTCDate } from '../../utils/dateUtils';
import type { TimelineMarker } from '../../types';
import './TimelineMarkers.css';

export interface TimelineMarkersProps {
  rangeStart: Date;
  dayWidth: number;
  totalHeight: number;
  markers?: TimelineMarker[];
  onHover?: (payload: { label: string; left: number; color: string }) => void;
  onHoverEnd?: () => void;
}

const TimelineMarkers: React.FC<TimelineMarkersProps> = ({ rangeStart, dayWidth, totalHeight, markers = [], onHover, onHoverEnd }) => {
  const visibleMarkers = useMemo(() => {
    return markers
      .map((marker, index) => {
        const date = parseUTCDate(marker.date);
        const offset = getDayOffset(date, rangeStart);
        const left = Math.round(offset * dayWidth);
        const formattedDate = `${String(date.getUTCDate()).padStart(2, '0')}.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCFullYear()).slice(-2)}`;
        return {
          ...marker,
          id: `${date.getTime()}-${index}`,
          formattedDate,
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
        const markerName = marker.name?.trim();
        const tooltip = markerName ? `${marker.formattedDate} ${markerName}` : marker.formattedDate;
        const color = marker.color || 'var(--gantt-timeline-marker-color, #dc2626)';
        return (
          <div
            key={marker.id}
            className="gantt-tm-marker"
            style={{ left: `${marker.left}px`, color }}
            aria-label={tooltip || 'Timeline marker'}
          >
            <div
              className="gantt-tm-hitArea"
              onMouseEnter={() => tooltip && onHover?.({ label: tooltip, left: marker.left, color })}
              onMouseLeave={onHoverEnd}
            >
              <div
                className="gantt-tm-line"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimelineMarkers;
