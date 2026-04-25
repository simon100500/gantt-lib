'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createCustomDayPredicate, getMonthDays, parseUTCDate, formatDateRangeLabel } from '../../utils/dateUtils';
import { layoutResourceTimelineItems } from '../../utils/resourceTimelineLayout';
import { useResourceItemDrag } from '../../hooks/useResourceItemDrag';
import type { ResourcePlannerChartProps, ResourceTimelineItem } from '../../types';
import { getBusinessDaysCount } from '../../core/scheduling';
import TimeScaleHeader from '../TimeScaleHeader';
import GridBackground from '../GridBackground';
import TodayIndicator from '../TodayIndicator';
import './ResourceTimelineChart.css';

const DEFAULT_DAY_WIDTH = 40;
const DEFAULT_HEADER_HEIGHT = 40;
const DEFAULT_LANE_HEIGHT = 40;
const DEFAULT_ROW_HEADER_WIDTH = 240;
const ITEM_OUTER_VERTICAL_INSET = 2;
const ITEM_INNER_VERTICAL_INSET = 1;
const ITEM_HORIZONTAL_INSET = 1;

const isValidDate = (date: Date): boolean => !Number.isNaN(date.getTime());

const getResourceTimelineDays = (items: Array<{ startDate: string | Date; endDate: string | Date }>): Date[] => {
  if (items.length === 0) {
    return getMonthDays(new Date());
  }

  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const item of items) {
    const startDate = parseUTCDate(item.startDate);
    const endDate = parseUTCDate(item.endDate);

    if (!minDate || startDate.getTime() < minDate.getTime()) {
      minDate = startDate;
    }
    if (!maxDate || endDate.getTime() > maxDate.getTime()) {
      maxDate = endDate;
    }
  }

  if (!minDate || !maxDate) {
    return getMonthDays(new Date());
  }

  const startOfMonth = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1));
  const endOfMonth = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth() + 1, 0));
  const days: Date[] = [];
  const current = new Date(startOfMonth);

  while (current.getTime() <= endOfMonth.getTime()) {
    days.push(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate())));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
};

const collectValidItems = <TItem extends ResourceTimelineItem>(resources: ResourcePlannerChartProps<TItem>['resources']) => {
  return resources.flatMap((resource) =>
    resource.items.flatMap((item) => {
      try {
        const startDate = parseUTCDate(item.startDate);
        const endDate = parseUTCDate(item.endDate);

        if (!isValidDate(startDate) || !isValidDate(endDate)) {
          return [];
        }

        return [{ startDate, endDate }];
      } catch {
        return [];
      }
    })
  );
};

const getVisualItemGeometry = (
  geometry: { left: number; top: number; width: number; height: number },
  laneIndex: number,
  laneCount: number
) => {
  const topInset = laneIndex === 0 ? ITEM_OUTER_VERTICAL_INSET : ITEM_INNER_VERTICAL_INSET;
  const bottomInset = laneIndex === laneCount - 1 ? ITEM_OUTER_VERTICAL_INSET : ITEM_INNER_VERTICAL_INSET;

  return {
    left: geometry.left + ITEM_HORIZONTAL_INSET,
    top: geometry.top + topInset,
    width: Math.max(0, geometry.width - ITEM_HORIZONTAL_INSET * 2),
    height: Math.max(0, geometry.height - topInset - bottomInset),
  };
};

const getWeekendOverlaySegments = (
  startDate: Date,
  endDate: Date,
  dayWidth: number,
  weekendPredicate: (date: Date) => boolean
) => {
  const segments: Array<{ left: number; width: number }> = [];
  const current = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  let activeStartOffset: number | null = null;
  let offset = 0;

  while (current.getTime() <= endDate.getTime()) {
    const isWeekendDay = weekendPredicate(current);
    if (isWeekendDay && activeStartOffset === null) {
      activeStartOffset = offset;
    }
    if (!isWeekendDay && activeStartOffset !== null) {
      segments.push({
        left: Math.round(activeStartOffset * dayWidth),
        width: Math.round((offset - activeStartOffset) * dayWidth),
      });
      activeStartOffset = null;
    }

    current.setUTCDate(current.getUTCDate() + 1);
    offset += 1;
  }

  if (activeStartOffset !== null) {
    segments.push({
      left: Math.round(activeStartOffset * dayWidth),
      width: Math.round((offset - activeStartOffset) * dayWidth),
    });
  }

  return segments;
};

const getDurationValue = (
  startDate: Date,
  endDate: Date,
  businessDays: boolean,
  weekendPredicate: (date: Date) => boolean
): number => businessDays
  ? getBusinessDaysCount(startDate, endDate, weekendPredicate)
  : Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);

export function ResourceTimelineChart<TItem extends ResourceTimelineItem = ResourceTimelineItem>({
  resources,
  dayWidth = DEFAULT_DAY_WIDTH,
  rowHeaderWidth = DEFAULT_ROW_HEADER_WIDTH,
  laneHeight = DEFAULT_LANE_HEIGHT,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  customDays,
  isWeekend,
  businessDays = true,
  readonly,
  disableResourceReassignment,
  renderItem,
  getItemClassName,
  onResourceItemMove,
}: ResourcePlannerChartProps<TItem>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef<{ active: boolean; startX: number; startY: number; scrollX: number; scrollY: number } | null>(null);
  const validItems = useMemo(() => collectValidItems(resources), [resources]);
  const dateRange = useMemo(() => {
    return getResourceTimelineDays(validItems);
  }, [validItems]);
  const monthStart = useMemo(() => {
    const firstDay = dateRange[0] ?? new Date();
    return new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth(), 1));
  }, [dateRange]);
  const weekendPredicate = useMemo(
    () => createCustomDayPredicate({ customDays, isWeekend }),
    [customDays, isWeekend]
  );
  const gridWidth = useMemo(() => Math.round(dateRange.length * dayWidth), [dateRange.length, dayWidth]);

  const layout = useMemo(
    () => layoutResourceTimelineItems(resources, { monthStart, dayWidth, laneHeight }),
    [resources, monthStart, dayWidth, laneHeight]
  );

  const todayInRange = useMemo(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    return dateRange.some((day) => day.getTime() === today.getTime());
  }, [dateRange]);

  const itemsByResourceId = useMemo(() => {
    const map = new Map<string, typeof layout.items>();
    for (const item of layout.items) {
      const next = map.get(item.resourceId) ?? [];
      next.push(item);
      map.set(item.resourceId, next);
    }
    return map;
  }, [layout.items]);

  const { preview, startDrag } = useResourceItemDrag({
    dayWidth,
    monthStart,
    rows: layout.rows,
    gridElementRef: gridRef,
    readonly,
    disableResourceReassignment,
    businessDays,
    weekendPredicate,
    onResourceItemMove,
  });

  const handlePanStart = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('[data-resource-item-id]')) {
      return;
    }
    if (target.closest('input, button, textarea, [contenteditable]')) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    panStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollX: container.scrollLeft,
      scrollY: container.scrollTop,
    };

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    container.style.cursor = 'grabbing';
    event.preventDefault();
  }, []);

  useEffect(() => {
    const handlePanMove = (event: MouseEvent) => {
      const pan = panStateRef.current;
      const container = scrollContainerRef.current;
      if (!pan?.active || !container) {
        return;
      }

      container.scrollLeft = pan.scrollX - (event.clientX - pan.startX);
      container.scrollTop = pan.scrollY - (event.clientY - pan.startY);
    };

    const handlePanEnd = () => {
      if (!panStateRef.current?.active) {
        return;
      }

      panStateRef.current = null;
      const container = scrollContainerRef.current;
      if (container) {
        container.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
    return () => {
      window.removeEventListener('mousemove', handlePanMove);
      window.removeEventListener('mouseup', handlePanEnd);
    };
  }, []);

  return (
    <div className="gantt-container gantt-resourceTimeline">
      <div
        ref={scrollContainerRef}
        className="gantt-resourceTimeline-scrollContainer"
        style={{ cursor: 'grab' }}
        onMouseDown={handlePanStart}
      >
        <div className="gantt-resourceTimeline-scrollContent">
          <div
            className="gantt-resourceTimeline-resourceColumn"
            style={{ width: `${rowHeaderWidth}px`, minWidth: `${rowHeaderWidth}px` }}
          >
            <div
              className="gantt-resourceTimeline-corner"
              style={{ height: `${headerHeight}px` }}
            />
            {layout.rows.map((row) => (
              <div
                key={row.resourceId}
                className="gantt-resourceTimeline-resourceHeader"
                data-resource-row-id={row.resourceId}
                style={{ height: `${row.resourceRowHeight}px` }}
              >
                <span className="gantt-resourceTimeline-resourceName">{row.resource.name}</span>
              </div>
            ))}
          </div>

          <div
            className="gantt-resourceTimeline-chartSurface"
            style={{ minWidth: `${gridWidth}px` }}
          >
            <div className="gantt-resourceTimeline-stickyHeader" style={{ width: `${gridWidth}px` }}>
              <TimeScaleHeader
                days={dateRange}
                dayWidth={dayWidth}
                headerHeight={headerHeight}
                isCustomWeekend={weekendPredicate}
              />
            </div>

            <div
              ref={gridRef}
              className="gantt-resourceTimeline-grid"
              style={{ width: `${gridWidth}px`, height: `${layout.totalHeight}px` }}
            >
              <GridBackground
                dateRange={dateRange}
                dayWidth={dayWidth}
                totalHeight={layout.totalHeight}
                isCustomWeekend={weekendPredicate}
              />
              {todayInRange && <TodayIndicator monthStart={monthStart} dayWidth={dayWidth} />}

              {layout.rows.map((row) => (
                <div
                  key={row.resourceId}
                  className="gantt-resourceTimeline-row"
                  data-resource-row-id={row.resourceId}
                  style={{
                    top: `${row.resourceRowTop}px`,
                    height: `${row.resourceRowHeight}px`,
                  }}
                />
              ))}

              {Array.from(itemsByResourceId.values()).flatMap((resourceItems) =>
                resourceItems.map((layoutItem) => {
                  const customClassName = getItemClassName?.(layoutItem.item);
                  const isDraggingItem = preview?.itemId === layoutItem.itemId;
                  const className = [
                    'gantt-resourceTimeline-item',
                    isDraggingItem && 'gantt-resourceTimeline-itemDragging',
                    (readonly || layoutItem.item.locked) && 'gantt-resourceTimeline-itemDisabled',
                    customClassName,
                  ].filter(Boolean).join(' ');
                  const laneCount = Math.max(1, Math.round(layoutItem.resourceRowHeight / layoutItem.height));
                  const previewStyle = isDraggingItem
                    ? getVisualItemGeometry({
                        left: preview.left,
                        top: preview.top,
                        width: preview.width,
                        height: layoutItem.height,
                      }, layoutItem.laneIndex, laneCount)
                    : undefined;
                  const itemGeometry = getVisualItemGeometry({
                    left: layoutItem.left,
                    top: layoutItem.top,
                    width: layoutItem.width,
                    height: layoutItem.height,
                  }, layoutItem.laneIndex, laneCount);
                  const overlayStartDate = isDraggingItem
                    ? preview.startDate
                    : layoutItem.startDate;
                  const overlayEndDate = isDraggingItem
                    ? preview.endDate
                    : layoutItem.endDate;
                  const weekendOverlaySegments = businessDays
                    ? getWeekendOverlaySegments(overlayStartDate, overlayEndDate, dayWidth, weekendPredicate)
                    : [];
                  const durationValue = getDurationValue(
                    overlayStartDate,
                    overlayEndDate,
                    businessDays,
                    weekendPredicate
                  );
                  const renderContext = {
                    startDate: overlayStartDate,
                    endDate: overlayEndDate,
                    durationDays: durationValue,
                    isDragging: isDraggingItem,
                  };

                  return (
                    <div
                      key={layoutItem.itemId}
                      className={className}
                      data-resource-item-id={layoutItem.itemId}
                      onMouseDown={(event) => startDrag(event, layoutItem)}
                      style={{
                        left: `${itemGeometry.left}px`,
                        top: `${itemGeometry.top}px`,
                        width: `${itemGeometry.width}px`,
                        height: `${itemGeometry.height}px`,
                        ...previewStyle,
                        backgroundColor: layoutItem.item.color ?? 'var(--gantt-task-bar-default-color, #3b82f6)',
                      }}
                    >
                      {!readonly && !layoutItem.item.locked && (
                        <>
                          <span className="gantt-resourceTimeline-resizeHandle gantt-resourceTimeline-resizeHandleStart" />
                          <span className="gantt-resourceTimeline-resizeHandle gantt-resourceTimeline-resizeHandleEnd" />
                        </>
                      )}
                      {weekendOverlaySegments.map((segment, index) => (
                        <span
                          key={`weekend-overlay-${index}`}
                          className="gantt-resourceTimeline-weekendOverlay"
                          data-resource-weekend-overlay="true"
                          style={{
                            left: `${segment.left}px`,
                            width: `${segment.width}px`,
                          }}
                        />
                      ))}
                      <div className="gantt-resourceTimeline-itemInner">
                        {renderItem ? (
                          renderItem(layoutItem.item, renderContext)
                        ) : (
                          <>
                            <span
                              className="gantt-resourceTimeline-itemDurationChip"
                              aria-label={`${durationValue} д`}
                            >
                              {durationValue}
                            </span>
                            <span className="gantt-resourceTimeline-itemTitle">{layoutItem.item.title}</span>
                            {layoutItem.item.subtitle && (
                              <span className="gantt-resourceTimeline-itemSubtitle">{layoutItem.item.subtitle}</span>
                            )}
                            <span className="gantt-resourceTimeline-itemDates">
                              {formatDateRangeLabel(layoutItem.startDate, layoutItem.endDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResourceTimelineChart;
