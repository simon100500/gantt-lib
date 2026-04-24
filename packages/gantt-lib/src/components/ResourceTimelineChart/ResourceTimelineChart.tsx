'use client';

import React, { useMemo, useRef } from 'react';
import { getMultiMonthDays, parseUTCDate, formatDateRangeLabel } from '../../utils/dateUtils';
import { layoutResourceTimelineItems } from '../../utils/resourceTimelineLayout';
import type { ResourcePlannerChartProps, ResourceTimelineItem } from '../../types';
import TimeScaleHeader from '../TimeScaleHeader';
import GridBackground from '../GridBackground';
import TodayIndicator from '../TodayIndicator';
import './ResourceTimelineChart.css';

const DEFAULT_DAY_WIDTH = 40;
const DEFAULT_HEADER_HEIGHT = 40;
const DEFAULT_LANE_HEIGHT = 40;
const DEFAULT_ROW_HEADER_WIDTH = 240;

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

export function ResourceTimelineChart<TItem extends ResourceTimelineItem = ResourceTimelineItem>({
  resources,
  dayWidth = DEFAULT_DAY_WIDTH,
  rowHeaderWidth = DEFAULT_ROW_HEADER_WIDTH,
  laneHeight = DEFAULT_LANE_HEIGHT,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  maxRenderedDays,
  renderItem,
  getItemClassName,
}: ResourcePlannerChartProps<TItem>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
                    customClassName,
                  ].filter(Boolean).join(' ');

                  return (
                    <div
                      key={layoutItem.itemId}
                      className={className}
                      data-resource-item-id={layoutItem.itemId}
                      style={{
                        left: `${layoutItem.left}px`,
                        top: `${layoutItem.top}px`,
                        width: `${layoutItem.width}px`,
                        height: `${layoutItem.height}px`,
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
