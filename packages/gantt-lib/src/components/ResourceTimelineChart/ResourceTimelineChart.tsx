'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createCustomDayPredicate, getMultiMonthDays, parseUTCDate } from '../../utils/dateUtils';
import { layoutResourceTimelineItems } from '../../utils/resourceTimelineLayout';
import { useResourceItemDrag } from '../../hooks/useResourceItemDrag';
import type {
  ResourcePlannerChartProps,
  ResourceTimelineItem,
  ResourceTimelineResource,
  ResourceTimelineResourceMenuCommand,
} from '../../types';
import { getBusinessDaysCount } from '../../core/scheduling';
import TimeScaleHeader from '../TimeScaleHeader';
import GridBackground from '../GridBackground';
import TodayIndicator from '../TodayIndicator';
import { Input } from '../ui/Input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import './ResourceTimelineChart.css';

const DEFAULT_DAY_WIDTH = 40;
const DEFAULT_HEADER_HEIGHT = 40;
const DEFAULT_LANE_HEIGHT = 40;
const DEFAULT_ROW_HEADER_WIDTH = 240;
const DEFAULT_RESOURCE_ROW_GAP = 8;
const ITEM_OUTER_VERTICAL_INSET = 2;
const ITEM_INNER_VERTICAL_INSET = 1;
const ITEM_START_HORIZONTAL_INSET = 2;
const ITEM_END_HORIZONTAL_INSET = 1;

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
    left: geometry.left + ITEM_START_HORIZONTAL_INSET,
    top: geometry.top + topInset,
    width: Math.max(1, geometry.width - ITEM_START_HORIZONTAL_INSET - ITEM_END_HORIZONTAL_INSET),
    height: Math.max(0, geometry.height - topInset - bottomInset),
  };
};

const formatOverlapCount = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? 'наложение'
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? 'наложения'
      : 'наложений';

  return `${count} ${word}`;
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

const getRangeOverlaySegments = (
  itemStartDate: Date,
  ranges: Array<{ startDate: Date; endDate: Date }>,
  dayWidth: number
) => {
  return ranges.map((range) => {
    const startOffset = Math.max(0, Math.round(
      (Date.UTC(range.startDate.getUTCFullYear(), range.startDate.getUTCMonth(), range.startDate.getUTCDate()) -
        Date.UTC(itemStartDate.getUTCFullYear(), itemStartDate.getUTCMonth(), itemStartDate.getUTCDate())) /
        (24 * 60 * 60 * 1000)
    ));
    const endOffset = Math.max(startOffset, Math.round(
      (Date.UTC(range.endDate.getUTCFullYear(), range.endDate.getUTCMonth(), range.endDate.getUTCDate()) -
        Date.UTC(itemStartDate.getUTCFullYear(), itemStartDate.getUTCMonth(), itemStartDate.getUTCDate())) /
        (24 * 60 * 60 * 1000)
    ));

    return {
      left: Math.round(startOffset * dayWidth),
      width: Math.round((endOffset - startOffset + 1) * dayWidth),
    };
  });
};

const clampOverlaySegments = (
  segments: Array<{ left: number; width: number }>,
  maxWidth: number
) => segments.flatMap((segment) => {
  const left = Math.max(0, Math.min(segment.left, maxWidth));
  const right = Math.max(left, Math.min(segment.left + segment.width, maxWidth));
  const width = right - left;

  return width > 0 ? [{ left, width }] : [];
});

const getDurationValue = (
  startDate: Date,
  endDate: Date,
  businessDays: boolean,
  weekendPredicate: (date: Date) => boolean
): number => businessDays
  ? getBusinessDaysCount(startDate, endDate, weekendPredicate)
  : Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);

interface ResourceHeaderProps<TItem extends ResourceTimelineItem> {
  resource: ResourceTimelineResource<TItem>;
  resourceId: string;
  conflictCount: number;
  height: number;
  paddingBottom: number;
  menuCommands: Array<ResourceTimelineResourceMenuCommand<TItem>>;
}

const ResourceHeader = <TItem extends ResourceTimelineItem>({
  resource,
  resourceId,
  conflictCount,
  height,
  paddingBottom,
  menuCommands,
}: ResourceHeaderProps<TItem>) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleCommands = useMemo(
    () => menuCommands.filter((command) => command.isVisible?.(resource) ?? true),
    [menuCommands, resource]
  );
  const hasMenu = visibleCommands.length > 0;

  const handleCommandClick = (
    command: ResourceTimelineResourceMenuCommand<TItem>,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (command.closeOnSelect !== false) {
      setMenuOpen(false);
    }
    command.onSelect(resource);
  };

  return (
    <div
      className={`gantt-resourceTimeline-resourceHeader${menuOpen ? ' gantt-resourceTimeline-resourceHeaderMenuOpen' : ''}`}
      data-resource-row-id={resourceId}
      style={{
        height: `${height}px`,
        paddingBottom: `${paddingBottom}px`,
      }}
    >
      <span className="gantt-resourceTimeline-resourceName">{resource.name}</span>
      {conflictCount > 0 && (
        <span
          className="gantt-resourceTimeline-conflictBadge"
          aria-label={formatOverlapCount(conflictCount)}
          title={formatOverlapCount(conflictCount)}
        >
          {conflictCount}
        </span>
      )}
      {hasMenu && (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className="gantt-resourceTimeline-resourceMenuButton"
              type="button"
              aria-label="Действия ресурса"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
            >
              <span aria-hidden="true">⋮</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="gantt-resourceTimeline-resourceMenu" portal={true} align="end">
            {visibleCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                className={`gantt-resourceTimeline-resourceMenuItem${command.danger ? ' gantt-resourceTimeline-resourceMenuItemDanger' : ''}`}
                disabled={command.isDisabled?.(resource) ?? false}
                onClick={(event) => handleCommandClick(command, event)}
              >
                {command.icon}
                {command.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

interface NewResourceRowProps {
  height: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const NewResourceRow: React.FC<NewResourceRowProps> = ({ height, onConfirm, onCancel }) => {
  const [nameValue, setNameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleCancel = () => {
    confirmedRef.current = true;
    onCancel();
  };

  const handleConfirm = () => {
    const name = nameValue.trim();
    if (!name) {
      handleCancel();
      return;
    }

    confirmedRef.current = true;
    onConfirm(name);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleConfirm();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  };

  const handleBlur = () => {
    if (!confirmedRef.current) {
      handleConfirm();
    }
  };

  return (
    <div
      className="gantt-resourceTimeline-resourceHeader gantt-resourceTimeline-resourceHeaderNew"
      style={{
        height: `${height}px`,
        paddingBottom: `${DEFAULT_RESOURCE_ROW_GAP}px`,
      }}
    >
      <Input
        ref={inputRef}
        value={nameValue}
        onChange={(event) => setNameValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Название ресурса"
        className="gantt-resourceTimeline-resourceInput"
      />
    </div>
  );
};

export function ResourceTimelineChart<TItem extends ResourceTimelineItem = ResourceTimelineItem>({
  resources,
  dayWidth = DEFAULT_DAY_WIDTH,
  viewMode = 'day',
  rowHeaderWidth = DEFAULT_ROW_HEADER_WIDTH,
  laneHeight = DEFAULT_LANE_HEIGHT,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  containerHeight,
  allowVerticalPan = false,
  customDays,
  isWeekend,
  businessDays = true,
  readonly,
  disableResourceReassignment,
  renderItem,
  getItemClassName,
  onResourceItemClick,
  onResourceItemMove,
  onAddResource,
  enableAddResource = true,
  resourceMenuCommands = [],
}: ResourcePlannerChartProps<TItem>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef<{ active: boolean; startX: number; startY: number; scrollX: number; scrollY: number } | null>(null);
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const validItems = useMemo(() => collectValidItems(resources), [resources]);
  const dateRange = useMemo(() => getMultiMonthDays(validItems), [validItems]);
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
    () => layoutResourceTimelineItems(resources, {
      monthStart,
      dayWidth,
      laneHeight,
      rowGap: DEFAULT_RESOURCE_ROW_GAP,
    }),
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

  const canAddResource = enableAddResource && Boolean(onAddResource);
  const resourceAddRowHeight = laneHeight + DEFAULT_RESOURCE_ROW_GAP;
  const displayTotalHeight = layout.totalHeight + (canAddResource ? resourceAddRowHeight : 0);
  const handleConfirmNewResource = useCallback((name: string) => {
    onAddResource?.({
      id: crypto.randomUUID(),
      name,
      items: [] as TItem[],
    });
    setIsCreatingResource(false);
  }, [onAddResource]);

  const handleCancelNewResource = useCallback(() => setIsCreatingResource(false), []);

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
      if (allowVerticalPan) {
        container.scrollTop = pan.scrollY - (event.clientY - pan.startY);
      }
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
  }, [allowVerticalPan]);

  return (
    <div className="gantt-container gantt-resourceTimeline">
      <div
        ref={scrollContainerRef}
        className="gantt-resourceTimeline-scrollContainer"
        style={{
          cursor: 'grab',
          height: containerHeight ?? 'auto',
          overflowY: containerHeight === undefined ? undefined : 'auto',
        }}
        data-allow-vertical-pan={allowVerticalPan ? 'true' : 'false'}
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
              <ResourceHeader
                key={row.resourceId}
                resource={row.resource}
                resourceId={row.resourceId}
                conflictCount={row.conflictCount}
                height={row.resourceRowHeight + DEFAULT_RESOURCE_ROW_GAP}
                paddingBottom={DEFAULT_RESOURCE_ROW_GAP}
                menuCommands={resourceMenuCommands}
              />
            ))}
            {canAddResource && (
              isCreatingResource ? (
                <NewResourceRow
                  height={resourceAddRowHeight}
                  onConfirm={handleConfirmNewResource}
                  onCancel={handleCancelNewResource}
                />
              ) : (
                <button
                  className="gantt-resourceTimeline-addResourceButton"
                  type="button"
                  style={{ height: `${resourceAddRowHeight}px` }}
                  onClick={() => setIsCreatingResource(true)}
                >
                  + Добавить ресурс
                </button>
              )
            )}
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
                viewMode={viewMode}
                isCustomWeekend={weekendPredicate}
              />
            </div>

            <div
              ref={gridRef}
              className="gantt-resourceTimeline-grid"
              style={{ width: `${gridWidth}px`, height: `${displayTotalHeight}px` }}
            >
              <GridBackground
                dateRange={dateRange}
                dayWidth={dayWidth}
                totalHeight={displayTotalHeight}
                viewMode={viewMode}
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
                    height: `${row.resourceRowHeight + DEFAULT_RESOURCE_ROW_GAP}px`,
                  }}
                />
              ))}

              {canAddResource && (
                <div
                  className="gantt-resourceTimeline-row gantt-resourceTimeline-rowNew"
                  data-resource-add-row="true"
                  style={{
                    top: `${layout.totalHeight}px`,
                    height: `${resourceAddRowHeight}px`,
                  }}
                />
              )}

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
                    ? clampOverlaySegments(
                        getWeekendOverlaySegments(overlayStartDate, overlayEndDate, dayWidth, weekendPredicate),
                        itemGeometry.width
                      )
                    : [];
                  const conflictOverlaySegments = clampOverlaySegments(
                    getRangeOverlaySegments(
                      overlayStartDate,
                      isDraggingItem ? [] : layoutItem.conflictRanges,
                      dayWidth
                    ),
                    itemGeometry.width
                  );
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
                      data-resource-item-tooltip={layoutItem.item.title}
                      onMouseDown={(event) => startDrag(event, layoutItem)}
                      onClick={() => onResourceItemClick?.(layoutItem.item)}
                      onKeyDown={(event) => {
                        if (!onResourceItemClick) {
                          return;
                        }
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onResourceItemClick(layoutItem.item);
                        }
                      }}
                      role={onResourceItemClick ? 'button' : undefined}
                      tabIndex={onResourceItemClick ? 0 : undefined}
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
                      {conflictOverlaySegments.map((segment, index) => (
                        <span
                          key={`conflict-overlay-${index}`}
                          className="gantt-resourceTimeline-conflictOverlay"
                          data-resource-conflict-overlay="true"
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
                          <div className="gantt-resourceTimeline-defaultItemContent">
                            <div className="gantt-resourceTimeline-defaultItemMain">
                              <span
                                className="gantt-resourceTimeline-itemDurationChip"
                                aria-label={`${durationValue} д`}
                              >
                                {durationValue}
                              </span>
                              <span className="gantt-resourceTimeline-itemTitle">{layoutItem.item.title}</span>
                            </div>
                            {layoutItem.item.subtitle && (
                              <span className="gantt-resourceTimeline-itemSubtitle">{layoutItem.item.subtitle}</span>
                            )}
                          </div>
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
