'use client';

import React, { useMemo, useRef } from 'react';
import { getMultiMonthDays, parseUTCDate, formatDateRangeLabel } from '../../utils/dateUtils';
import { layoutResourceTimelineItems } from '../../utils/resourceTimelineLayout';
import { useResourceItemDrag } from '../../hooks/useResourceItemDrag';
import type { ResourcePlannerChartProps, ResourceTimelineItem } from '../../types';
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

export function ResourceTimelineChart<TItem extends ResourceTimelineItem = ResourceTimelineItem>({
  resources,
  dayWidth = DEFAULT_DAY_WIDTH,
  rowHeaderWidth = DEFAULT_ROW_HEADER_WIDTH,
  laneHeight = DEFAULT_LANE_HEIGHT,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  maxRenderedDays,
  readonly,
  disableResourceReassignment,
  renderItem,
  getItemClassName,
  onResourceItemMove,
}: ResourcePlannerChartProps<TItem>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const validItems = useMemo(() => collectValidItems(resources), [resources]);
  const dateRange = useMemo(() => {
    const days = getMultiMonthDays(validItems);
    return maxRenderedDays ? days.slice(0, maxRenderedDays) : days;
  }, [validItems, maxRenderedDays]);
  const monthStart = useMemo(() => {
    const firstDay = dateRange[0] ?? new Date();
    return new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth(), 1));
  }, [dateRange]);
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
    rows: layout.rows,
    gridElementRef: gridRef,
    readonly,
    disableResourceReassignment,
    onResourceItemMove,
  });

  return (
    <div className="gantt-container gantt-resourceTimeline">
      <div
        ref={scrollContainerRef}
        className="gantt-resourceTimeline-scrollContainer"
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
              <TimeScaleHeader days={dateRange} dayWidth={dayWidth} headerHeight={headerHeight} />
            </div>

            <div
              ref={gridRef}
              className="gantt-resourceTimeline-grid"
              style={{ width: `${gridWidth}px`, height: `${layout.totalHeight}px` }}
            >
              <GridBackground dateRange={dateRange} dayWidth={dayWidth} totalHeight={layout.totalHeight} />
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
                  const className = [
                    'gantt-resourceTimeline-item',
                    preview?.itemId === layoutItem.itemId && 'gantt-resourceTimeline-itemDragging',
                    (readonly || layoutItem.item.locked) && 'gantt-resourceTimeline-itemDisabled',
                    customClassName,
                  ].filter(Boolean).join(' ');
                  const laneCount = Math.max(1, Math.round(layoutItem.resourceRowHeight / layoutItem.height));
                  const previewStyle = preview?.itemId === layoutItem.itemId
                    ? getVisualItemGeometry({
                        left: preview.left,
                        top: preview.top,
                        width: layoutItem.width,
                        height: layoutItem.height,
                      }, layoutItem.laneIndex, laneCount)
                    : undefined;
                  const itemGeometry = getVisualItemGeometry({
                    left: layoutItem.left,
                    top: layoutItem.top,
                    width: layoutItem.width,
                    height: layoutItem.height,
                  }, layoutItem.laneIndex, laneCount);

                  return (
                    <div
                      key={layoutItem.itemId}
                      className={className}
                      data-resource-item-id={layoutItem.itemId}
                      onMouseDown={(event) => startDrag(event, layoutItem)}
                      style={{
                        left: `${itemGeometry.left}px`,
                        top: `${itemGeometry.top}px`,
                        ...previewStyle,
                        width: `${itemGeometry.width}px`,
                        height: `${itemGeometry.height}px`,
                        backgroundColor: layoutItem.item.color ?? 'var(--gantt-task-bar-default-color, #3b82f6)',
                      }}
                    >
                      <div className="gantt-resourceTimeline-itemInner">
                        {renderItem ? (
                          renderItem(layoutItem.item)
                        ) : (
                          <>
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
