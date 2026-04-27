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
const DEFAULT_ROW_HEADER_WIDTH = 420;
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

const RESOURCE_TYPE_OPTIONS = ['Люди', 'Оборудование', 'Материалы', 'Другое'] as const;
const RESOURCE_SCOPE_OPTIONS = ['Shared', 'Project'] as const;
const RESOURCE_SCOPE_LABELS: Record<string, string> = {
  Shared: 'Общий',
  Project: 'Проект',
};

interface ResourceHeaderProps<TItem extends ResourceTimelineItem> {
  resource: ResourceTimelineResource<TItem>;
  resourceId: string;
  rowIndex: number;
  conflictCount: number;
  workedDays: number;
  assignmentCount: number;
  height: number;
  paddingBottom: number;
  menuCommands: Array<ResourceTimelineResourceMenuCommand<TItem>>;
  onResourceChange?: (resource: ResourceTimelineResource<TItem>) => void;
  onConflictBadgeClick?: (resourceId: string) => void;
}

const ResourceTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'Люди') {
    return (
      <svg className="gantt-resourceTimeline-resourceTypeIcon gantt-resourceTimeline-resourceTypeIconPeople" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (type === 'Оборудование') {
    return (
      <svg className="gantt-resourceTimeline-resourceTypeIcon gantt-resourceTimeline-resourceTypeIconEquipment" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
        <path d="m18 15 4-4" />
        <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
      </svg>
    );
  }

  if (type === 'Материалы') {
    return (
      <svg className="gantt-resourceTimeline-resourceTypeIcon gantt-resourceTimeline-resourceTypeIconMaterials" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 22v-8" />
        <path d="M2.336 8.89 10 14l11.715-7.029" />
        <path d="M22 14a2 2 0 0 1-.971 1.715l-10 6a2 2 0 0 1-2.138-.05l-6-4A2 2 0 0 1 2 16v-6a2 2 0 0 1 .971-1.715l10-6a2 2 0 0 1 2.138.05l6 4A2 2 0 0 1 22 8z" />
      </svg>
    );
  }

  return (
    <svg className="gantt-resourceTimeline-resourceTypeIcon gantt-resourceTimeline-resourceTypeIconOther" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
};

const ResourceHeader = <TItem extends ResourceTimelineItem>({
  resource,
  resourceId,
  rowIndex,
  conflictCount,
  workedDays,
  assignmentCount,
  height,
  paddingBottom,
  menuCommands,
  onResourceChange,
  onConflictBadgeClick,
}: ResourceHeaderProps<TItem>) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const [draftName, setDraftName] = useState(resource.name);
  const visibleCommands = useMemo(
    () => menuCommands.filter((command) => command.isVisible?.(resource) ?? true),
    [menuCommands, resource]
  );
  const hasMenu = visibleCommands.length > 0;
  const type = resource.type ?? 'Другое';
  const scope = resource.scope ?? 'Project';
  const scopeLabel = RESOURCE_SCOPE_LABELS[scope] ?? scope;

  useEffect(() => {
    setDraftName(resource.name);
  }, [resource.name]);

  const applyResourcePatch = useCallback((patch: Partial<ResourceTimelineResource<TItem>>) => {
    onResourceChange?.({ ...resource, ...patch });
  }, [onResourceChange, resource]);

  const handleNameCommit = useCallback(() => {
    const nextName = draftName.trim();
    if (!nextName) {
      setDraftName(resource.name);
      return;
    }
    if (nextName !== resource.name) {
      applyResourcePatch({ name: nextName } as Partial<ResourceTimelineResource<TItem>>);
    }
  }, [applyResourcePatch, draftName, resource.name]);

  const handleNameKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setDraftName(resource.name);
      event.currentTarget.blur();
    }
  }, [resource.name]);

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
      <span className="gantt-resourceTimeline-resourceNumber">{rowIndex + 1}</span>
      <span className="gantt-resourceTimeline-resourceName">
        <Popover open={typeMenuOpen} onOpenChange={setTypeMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="gantt-resourceTimeline-resourceTypeIconButton"
              disabled={!onResourceChange}
              aria-label={`Тип ресурса ${resource.name}: ${type}`}
              title={type}
              onClick={(event) => {
                event.stopPropagation();
                setTypeMenuOpen((open) => !open);
              }}
            >
              <ResourceTypeIcon type={type} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="gantt-resourceTimeline-resourceOptionMenu" portal={true} align="start">
            {RESOURCE_TYPE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`gantt-resourceTimeline-resourceOption${type === option ? ' gantt-resourceTimeline-resourceOptionActive' : ''}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setTypeMenuOpen(false);
                  applyResourcePatch({ type: option } as Partial<ResourceTimelineResource<TItem>>);
                }}
              >
                <span className="gantt-resourceTimeline-resourceOptionIcon">
                  <ResourceTypeIcon type={option} />
                </span>
                {option}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <textarea
          className="gantt-resourceTimeline-resourceNameInput"
          value={draftName}
          disabled={!onResourceChange}
          aria-label={`Название ресурса ${resource.name}`}
          rows={2}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={handleNameCommit}
          onKeyDown={handleNameKeyDown}
          onClick={(event) => event.stopPropagation()}
        />
      </span>
      <Popover open={scopeMenuOpen} onOpenChange={setScopeMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`gantt-resourceTimeline-resourceScopeChip gantt-resourceTimeline-resourceScope${scope === 'Shared' ? 'Shared' : 'Project'}`}
            disabled={!onResourceChange}
            aria-label={`Доступность ресурса ${resource.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setScopeMenuOpen((open) => !open);
            }}
          >
            <span>{scopeLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="gantt-resourceTimeline-resourceOptionMenu" portal={true} align="start">
          {RESOURCE_SCOPE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`gantt-resourceTimeline-resourceOption${scope === option ? ' gantt-resourceTimeline-resourceOptionActive' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                setScopeMenuOpen(false);
                applyResourcePatch({ scope: option } as Partial<ResourceTimelineResource<TItem>>);
              }}
            >
              <span className={`gantt-resourceTimeline-resourceOptionScopeDot gantt-resourceTimeline-resourceScope${option}`} />
              {RESOURCE_SCOPE_LABELS[option] ?? option}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <span
        className="gantt-resourceTimeline-resourceAssignments"
        aria-label={`Назначения ресурса ${resource.name}: ${assignmentCount}, ${workedDays} дн.`}
      >
        <span className="gantt-resourceTimeline-resourceWorkedDays">{workedDays} дн.</span>
        <span className="gantt-resourceTimeline-resourceAssignmentCount">
          <svg className="gantt-resourceTimeline-resourceAssignmentIcon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <rect width="15" height="5" x="4" y="5" rx="2" />
            <rect width="10" height="5" x="4" y="14" rx="2" />
          </svg>
          <span>{assignmentCount}</span>
        </span>
      </span>
      <span className="gantt-resourceTimeline-resourceActions">
        {conflictCount > 0 && (
          <button
            type="button"
            className="gantt-resourceTimeline-conflictBadge"
            aria-label={formatOverlapCount(conflictCount)}
            title={formatOverlapCount(conflictCount)}
            onClick={(event) => {
              event.stopPropagation();
              onConflictBadgeClick?.(resourceId);
            }}
          >
            {conflictCount}
          </button>
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
      </span>
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
      <span className="gantt-resourceTimeline-resourceNumber">+</span>
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
  onResourceItemMenuClick,
  activeResourceItemId,
  onResourceItemMove,
  onResourceChange,
  onAddResource,
  enableAddResource = true,
  resourceMenuCommands = [],
}: ResourcePlannerChartProps<TItem>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef<{ active: boolean; startX: number; startY: number; scrollX: number; scrollY: number } | null>(null);
  const conflictNavigationIndexRef = useRef<Map<string, number>>(new Map());
  const conflictHighlightTimeoutRef = useRef<number | null>(null);
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [activeConflictItemId, setActiveConflictItemId] = useState<string | null>(null);
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
  const effectiveRowHeaderWidth = Math.max(rowHeaderWidth, DEFAULT_ROW_HEADER_WIDTH);
  const workedDaysByResourceId = useMemo(() => {
    const map = new Map<string, number>();
    for (const resource of resources) {
      const workedDays = resource.items.reduce((sum, item) => {
        try {
          const startDate = parseUTCDate(item.startDate);
          const endDate = parseUTCDate(item.endDate);
          if (!isValidDate(startDate) || !isValidDate(endDate)) {
            return sum;
          }
          return sum + getDurationValue(startDate, endDate, businessDays, weekendPredicate);
        } catch {
          return sum;
        }
      }, 0);
      map.set(resource.id, workedDays);
    }
    return map;
  }, [businessDays, resources, weekendPredicate]);

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

  const conflictItemsByResourceId = useMemo(() => {
    const map = new Map<string, typeof layout.items>();
    for (const item of layout.items) {
      if (item.conflictRanges.length === 0) {
        continue;
      }

      const next = map.get(item.resourceId) ?? [];
      next.push(item);
      map.set(item.resourceId, next);
    }

    for (const items of map.values()) {
      items.sort((left, right) =>
        left.top - right.top ||
        left.left - right.left ||
        left.itemId.localeCompare(right.itemId)
      );
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
      type: 'Другое',
      scope: 'Project',
      items: [] as TItem[],
    });
    setIsCreatingResource(false);
  }, [onAddResource]);

  const handleCancelNewResource = useCallback(() => setIsCreatingResource(false), []);

  const handleConflictBadgeClick = useCallback((resourceId: string) => {
    const conflictItems = conflictItemsByResourceId.get(resourceId) ?? [];
    if (conflictItems.length === 0) {
      return;
    }

    const currentIndex = conflictNavigationIndexRef.current.get(resourceId) ?? 0;
    const target = conflictItems[currentIndex % conflictItems.length];
    conflictNavigationIndexRef.current.set(resourceId, (currentIndex + 1) % conflictItems.length);

    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        left: Math.max(0, Math.round(target.left - dayWidth * 2)),
        top: Math.max(0, Math.round(target.top - laneHeight)),
        behavior: 'smooth',
      });
    }

    setActiveConflictItemId(target.itemId);
    if (conflictHighlightTimeoutRef.current) {
      window.clearTimeout(conflictHighlightTimeoutRef.current);
    }
    conflictHighlightTimeoutRef.current = window.setTimeout(() => {
      setActiveConflictItemId((current) => current === target.itemId ? null : current);
      conflictHighlightTimeoutRef.current = null;
    }, 1600);
  }, [conflictItemsByResourceId, dayWidth, laneHeight]);

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

  useEffect(() => {
    return () => {
      if (conflictHighlightTimeoutRef.current) {
        window.clearTimeout(conflictHighlightTimeoutRef.current);
      }
    };
  }, []);

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
            style={{ width: `${effectiveRowHeaderWidth}px`, minWidth: `${effectiveRowHeaderWidth}px` }}
          >
            <div
              className="gantt-resourceTimeline-corner"
              style={{ height: `${headerHeight + 0.5}px` }}
            >
              <span className="gantt-resourceTimeline-resourceHeaderCell gantt-resourceTimeline-resourceHeaderNumber">#</span>
              <span className="gantt-resourceTimeline-resourceHeaderCell gantt-resourceTimeline-resourceHeaderName">Название</span>
              <span className="gantt-resourceTimeline-resourceHeaderCell">Доступность</span>
              <span className="gantt-resourceTimeline-resourceHeaderCell">Назначения</span>
              <span className="gantt-resourceTimeline-resourceHeaderCell gantt-resourceTimeline-resourceHeaderActions" aria-label="Действия" />
            </div>
            {layout.rows.map((row, rowIndex) => (
              <ResourceHeader
                key={row.resourceId}
                resource={row.resource}
                resourceId={row.resourceId}
                rowIndex={rowIndex}
                conflictCount={row.conflictCount}
                workedDays={workedDaysByResourceId.get(row.resourceId) ?? 0}
                assignmentCount={row.resource.items.length}
                height={row.resourceRowHeight + DEFAULT_RESOURCE_ROW_GAP}
                paddingBottom={DEFAULT_RESOURCE_ROW_GAP}
                menuCommands={resourceMenuCommands}
                onResourceChange={onResourceChange}
                onConflictBadgeClick={handleConflictBadgeClick}
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
                  const hasItemMenu = Boolean(onResourceItemMenuClick);
                  const isActiveItem = activeResourceItemId === layoutItem.itemId;
                  const className = [
                    'gantt-resourceTimeline-item',
                    hasItemMenu && 'gantt-resourceTimeline-itemHasMenu',
                    isActiveItem && 'gantt-resourceTimeline-itemActive',
                    isDraggingItem && 'gantt-resourceTimeline-itemDragging',
                    activeConflictItemId === layoutItem.itemId && 'gantt-resourceTimeline-itemConflictActive',
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
                      {hasItemMenu && (
                        <button
                          type="button"
                          className="gantt-resourceTimeline-itemMenuButton"
                          aria-label="Действия назначения"
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onResourceItemMenuClick?.(layoutItem.item);
                          }}
                        >
                          <span aria-hidden="true">⋮</span>
                        </button>
                      )}
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
