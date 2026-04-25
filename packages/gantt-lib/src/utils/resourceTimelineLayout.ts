import { parseUTCDate } from './dateUtils';
import { calculateTaskBar } from './geometry';
import type { ResourceTimelineItem, ResourceTimelineResource } from '../types';

export interface ResourceTimelineLayoutOptions {
  monthStart: Date;
  dayWidth: number;
  laneHeight: number;
}

export interface ResourceTimelineLayoutRow<TItem extends ResourceTimelineItem = ResourceTimelineItem> {
  resource: ResourceTimelineResource<TItem>;
  resourceId: string;
  laneCount: number;
  conflictCount: number;
  resourceRowTop: number;
  resourceRowHeight: number;
}

export interface ResourceTimelineConflictRange {
  startDate: Date;
  endDate: Date;
  itemIds: string[];
}

export interface ResourceTimelineLayoutItem<TItem extends ResourceTimelineItem = ResourceTimelineItem> {
  item: TItem;
  itemId: string;
  resourceId: string;
  laneIndex: number;
  left: number;
  width: number;
  resourceRowTop: number;
  resourceRowHeight: number;
  top: number;
  height: number;
  startDate: Date;
  endDate: Date;
  conflictRanges: ResourceTimelineConflictRange[];
  conflictsWith: string[];
}

export interface ResourceTimelineLayoutDiagnostic {
  itemId: string;
  resourceId: string;
  reason: 'invalid-date';
}

export interface ResourceTimelineLayoutResult<TItem extends ResourceTimelineItem = ResourceTimelineItem> {
  rows: Array<ResourceTimelineLayoutRow<TItem>>;
  items: Array<ResourceTimelineLayoutItem<TItem>>;
  diagnostics: ResourceTimelineLayoutDiagnostic[];
  totalHeight: number;
}

interface ParsedResourceItem<TItem extends ResourceTimelineItem> {
  item: TItem;
  startDate: Date;
  endDate: Date;
}

const isInvalidDate = (date: Date): boolean => Number.isNaN(date.getTime());

const getUTCDayNumber = (date: Date): number => {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
};

const compareParsedItems = <TItem extends ResourceTimelineItem>(
  a: ParsedResourceItem<TItem>,
  b: ParsedResourceItem<TItem>
): number => {
  const startDiff = getUTCDayNumber(a.startDate) - getUTCDayNumber(b.startDate);
  if (startDiff !== 0) {
    return startDiff;
  }

  const endDiff = getUTCDayNumber(a.endDate) - getUTCDayNumber(b.endDate);
  if (endDiff !== 0) {
    return endDiff;
  }

  return a.item.id.localeCompare(b.item.id);
};

const getOverlapRange = <TItem extends ResourceTimelineItem>(
  left: ParsedResourceItem<TItem>,
  right: ParsedResourceItem<TItem>
): ResourceTimelineConflictRange | null => {
  const startDay = Math.max(getUTCDayNumber(left.startDate), getUTCDayNumber(right.startDate));
  const endDay = Math.min(getUTCDayNumber(left.endDate), getUTCDayNumber(right.endDate));

  if (startDay > endDay) {
    return null;
  }

  return {
    startDate: new Date(startDay * 86400000),
    endDate: new Date(endDay * 86400000),
    itemIds: [left.item.id, right.item.id],
  };
};

const mergeConflictRanges = (ranges: ResourceTimelineConflictRange[]): ResourceTimelineConflictRange[] => {
  const sortedRanges = [...ranges].sort((left, right) =>
    getUTCDayNumber(left.startDate) - getUTCDayNumber(right.startDate) ||
    getUTCDayNumber(left.endDate) - getUTCDayNumber(right.endDate)
  );
  const merged: ResourceTimelineConflictRange[] = [];

  for (const range of sortedRanges) {
    const previous = merged[merged.length - 1];
    const rangeStartDay = getUTCDayNumber(range.startDate);
    const rangeEndDay = getUTCDayNumber(range.endDate);
    if (!previous || rangeStartDay > getUTCDayNumber(previous.endDate) + 1) {
      merged.push({
        startDate: range.startDate,
        endDate: range.endDate,
        itemIds: [...range.itemIds],
      });
      continue;
    }

    if (rangeEndDay > getUTCDayNumber(previous.endDate)) {
      previous.endDate = range.endDate;
    }
    previous.itemIds = Array.from(new Set([...previous.itemIds, ...range.itemIds])).sort();
  }

  return merged;
};

const calculateConflictInfo = <TItem extends ResourceTimelineItem>(
  parsedItems: Array<ParsedResourceItem<TItem>>
): Map<string, { conflictRanges: ResourceTimelineConflictRange[]; conflictsWith: string[] }> => {
  const conflictRangesByItemId = new Map<string, ResourceTimelineConflictRange[]>();
  const conflictsWithByItemId = new Map<string, Set<string>>();

  for (let i = 0; i < parsedItems.length; i++) {
    for (let j = i + 1; j < parsedItems.length; j++) {
      const left = parsedItems[i];
      const right = parsedItems[j];

      if (getUTCDayNumber(right.startDate) > getUTCDayNumber(left.endDate)) {
        break;
      }

      const overlap = getOverlapRange(left, right);
      if (!overlap) {
        continue;
      }

      const leftRanges = conflictRangesByItemId.get(left.item.id) ?? [];
      const rightRanges = conflictRangesByItemId.get(right.item.id) ?? [];
      leftRanges.push(overlap);
      rightRanges.push(overlap);
      conflictRangesByItemId.set(left.item.id, leftRanges);
      conflictRangesByItemId.set(right.item.id, rightRanges);

      const leftConflicts = conflictsWithByItemId.get(left.item.id) ?? new Set<string>();
      const rightConflicts = conflictsWithByItemId.get(right.item.id) ?? new Set<string>();
      leftConflicts.add(right.item.id);
      rightConflicts.add(left.item.id);
      conflictsWithByItemId.set(left.item.id, leftConflicts);
      conflictsWithByItemId.set(right.item.id, rightConflicts);
    }
  }

  const result = new Map<string, { conflictRanges: ResourceTimelineConflictRange[]; conflictsWith: string[] }>();
  for (const parsedItem of parsedItems) {
    result.set(parsedItem.item.id, {
      conflictRanges: mergeConflictRanges(conflictRangesByItemId.get(parsedItem.item.id) ?? []),
      conflictsWith: Array.from(conflictsWithByItemId.get(parsedItem.item.id) ?? []).sort(),
    });
  }

  return result;
};

export const layoutResourceTimelineItems = <
  TItem extends ResourceTimelineItem = ResourceTimelineItem,
>(
  resources: Array<ResourceTimelineResource<TItem>>,
  options: ResourceTimelineLayoutOptions
): ResourceTimelineLayoutResult<TItem> => {
  const rows: Array<ResourceTimelineLayoutRow<TItem>> = [];
  const items: Array<ResourceTimelineLayoutItem<TItem>> = [];
  const diagnostics: ResourceTimelineLayoutDiagnostic[] = [];
  let currentTop = 0;

  for (const resource of resources) {
    const parsedItems: Array<ParsedResourceItem<TItem>> = [];

    for (const item of resource.items) {
      try {
        const startDate = parseUTCDate(item.startDate);
        const endDate = parseUTCDate(item.endDate);

        if (isInvalidDate(startDate) || isInvalidDate(endDate)) {
          throw new Error('Invalid date');
        }

        parsedItems.push({ item, startDate, endDate });
      } catch {
        diagnostics.push({
          itemId: item.id,
          resourceId: resource.id,
          reason: 'invalid-date',
        });
      }
    }

    parsedItems.sort(compareParsedItems);

    const conflictInfoByItemId = calculateConflictInfo(parsedItems);
    const laneEndDays: number[] = [];
    const laidOutItems: Array<ResourceTimelineLayoutItem<TItem>> = [];

    for (const parsed of parsedItems) {
      const startDay = getUTCDayNumber(parsed.startDate);
      const endDay = getUTCDayNumber(parsed.endDate);
      let laneIndex = laneEndDays.findIndex((laneEndDay) => laneEndDay < startDay);

      if (laneIndex === -1) {
        laneIndex = laneEndDays.length;
        laneEndDays.push(endDay);
      } else {
        laneEndDays[laneIndex] = endDay;
      }

      const { left, width } = calculateTaskBar(parsed.startDate, parsed.endDate, options.monthStart, options.dayWidth);
      const conflictInfo = conflictInfoByItemId.get(parsed.item.id);
      laidOutItems.push({
        item: parsed.item,
        itemId: parsed.item.id,
        resourceId: resource.id,
        laneIndex,
        left,
        width,
        resourceRowTop: currentTop,
        resourceRowHeight: 0,
        top: currentTop + laneIndex * options.laneHeight,
        height: options.laneHeight,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        conflictRanges: conflictInfo?.conflictRanges ?? [],
        conflictsWith: conflictInfo?.conflictsWith ?? [],
      });
    }

    const laneCount = Math.max(1, laneEndDays.length);
    const resourceRowHeight = laneCount * options.laneHeight;
    const conflictCount = laidOutItems.filter((item) => item.conflictsWith.length > 0).length;
    const row: ResourceTimelineLayoutRow<TItem> = {
      resource,
      resourceId: resource.id,
      laneCount,
      conflictCount,
      resourceRowTop: currentTop,
      resourceRowHeight,
    };

    rows.push(row);
    items.push(...laidOutItems.map((item) => ({
      ...item,
      resourceRowHeight,
    })));
    currentTop += resourceRowHeight;
  }

  return {
    rows,
    items,
    diagnostics,
    totalHeight: currentTop,
  };
};
