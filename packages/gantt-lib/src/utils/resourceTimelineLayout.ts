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
  resourceRowTop: number;
  resourceRowHeight: number;
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
      });
    }

    const laneCount = Math.max(1, laneEndDays.length);
    const resourceRowHeight = laneCount * options.laneHeight;
    const row: ResourceTimelineLayoutRow<TItem> = {
      resource,
      resourceId: resource.id,
      laneCount,
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
