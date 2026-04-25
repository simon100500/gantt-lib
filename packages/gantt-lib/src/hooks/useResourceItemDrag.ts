'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import type { ResourceTimelineItem, ResourceTimelineMove, ResourceTimelineResource } from '../types';
import { moveTaskRange } from '../core/scheduling';

interface ResourceDragRow<TItem extends ResourceTimelineItem = ResourceTimelineItem> {
  resource: ResourceTimelineResource<TItem>;
  resourceId: string;
  resourceRowTop: number;
  resourceRowHeight: number;
}

interface ResourceDragItem<TItem extends ResourceTimelineItem = ResourceTimelineItem> {
  item: TItem;
  itemId: string;
  resourceId: string;
  left: number;
  top: number;
  width: number;
  startDate: Date;
  endDate: Date;
}

interface ActiveResourceDrag<TItem extends ResourceTimelineItem = ResourceTimelineItem> {
  item: TItem;
  itemId: string;
  fromResourceId: string;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
  currentLeft: number;
  currentTop: number;
  currentWidth: number;
  dayWidth: number;
  startDate: Date;
  endDate: Date;
  monthStart: Date;
  businessDays: boolean;
  weekendPredicate?: (date: Date) => boolean;
}

export interface ResourceItemDragPreview {
  itemId: string;
  left: number;
  top: number;
  width: number;
}

export interface UseResourceItemDragOptions<TItem extends ResourceTimelineItem = ResourceTimelineItem> {
  dayWidth: number;
  monthStart: Date;
  rows: Array<ResourceDragRow<TItem>>;
  gridElementRef?: RefObject<HTMLElement | null>;
  readonly?: boolean;
  disableResourceReassignment?: boolean;
  businessDays?: boolean;
  weekendPredicate?: (date: Date) => boolean;
  onResourceItemMove?: (move: ResourceTimelineMove<TItem>) => void;
}

const snapToDay = (pixels: number, dayWidth: number): number => {
  return Math.round(pixels / dayWidth) * dayWidth;
};

const addUTCDays = (date: Date, days: number): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
};

const getDayOffset = (date: Date, monthStart: Date): number => {
  return Math.round(
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate())) /
      (24 * 60 * 60 * 1000)
  );
};

const resolveResourceMoveRange = (
  activeDrag: ActiveResourceDrag,
  nextLeft: number
): { startDate: Date; endDate: Date; left: number; width: number } => {
  const dayDelta = Math.round((nextLeft - activeDrag.initialLeft) / activeDrag.dayWidth);
  const rawStartDate = addUTCDays(activeDrag.startDate, dayDelta);
  const rawEndDate = addUTCDays(activeDrag.endDate, dayDelta);

  if (!activeDrag.businessDays || !activeDrag.weekendPredicate) {
    return {
      startDate: rawStartDate,
      endDate: rawEndDate,
      left: nextLeft,
      width: activeDrag.currentWidth,
    };
  }

  const snapDirection: 1 | -1 = rawStartDate.getTime() >= activeDrag.startDate.getTime() ? 1 : -1;
  const range = moveTaskRange(
    activeDrag.startDate,
    activeDrag.endDate,
    rawStartDate,
    true,
    activeDrag.weekendPredicate,
    snapDirection
  );
  const startOffset = getDayOffset(range.start, activeDrag.monthStart);
  const endOffset = getDayOffset(range.end, activeDrag.monthStart);

  return {
    startDate: range.start,
    endDate: range.end,
    left: Math.round(startOffset * activeDrag.dayWidth),
    width: Math.round((endOffset - startOffset + 1) * activeDrag.dayWidth),
  };
};

const resolveTargetResource = <TItem extends ResourceTimelineItem>(
  rows: Array<ResourceDragRow<TItem>>,
  clientY: number,
  gridTop: number
): ResourceTimelineResource<TItem> | null => {
  const localY = clientY - gridTop;
  return rows.find((row) =>
    localY >= row.resourceRowTop &&
    localY < row.resourceRowTop + row.resourceRowHeight
  )?.resource ?? null;
};

export const useResourceItemDrag = <TItem extends ResourceTimelineItem = ResourceTimelineItem>({
  dayWidth,
  monthStart,
  rows,
  gridElementRef,
  readonly,
  disableResourceReassignment,
  businessDays = false,
  weekendPredicate,
  onResourceItemMove,
}: UseResourceItemDragOptions<TItem>) => {
  const activeDragRef = useRef<ActiveResourceDrag<TItem> | null>(null);
  const rowsRef = useRef(rows);
  const onResourceItemMoveRef = useRef(onResourceItemMove);
  const rafRef = useRef<number | null>(null);
  const [preview, setPreview] = useState<ResourceItemDragPreview | null>(null);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    onResourceItemMoveRef.current = onResourceItemMove;
  }, [onResourceItemMove]);

  const clearRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cancelDrag = useCallback(() => {
    clearRaf();
    activeDragRef.current = null;
    setPreview(null);
  }, [clearRaf]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const activeDrag = activeDragRef.current;
      if (!activeDrag || rafRef.current !== null) {
        return;
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const latestDrag = activeDragRef.current;
        if (!latestDrag) {
          return;
        }

        const snappedLeft = latestDrag.initialLeft + snapToDay(event.clientX - latestDrag.startX, latestDrag.dayWidth);
        const nextRange = resolveResourceMoveRange(latestDrag, snappedLeft);
        const nextTop = disableResourceReassignment
          ? latestDrag.initialTop
          : latestDrag.initialTop + (event.clientY - latestDrag.startY);
        latestDrag.currentLeft = nextRange.left;
        latestDrag.currentWidth = nextRange.width;
        latestDrag.currentTop = nextTop;
        setPreview({
          itemId: latestDrag.itemId,
          left: nextRange.left,
          top: nextTop,
          width: nextRange.width,
        });
      });
    };

    const handleMouseUp = (event: MouseEvent) => {
      const activeDrag = activeDragRef.current;
      if (!activeDrag) {
        return;
      }

      clearRaf();
      activeDragRef.current = null;
      setPreview(null);

      const gridTop = gridElementRef?.current?.getBoundingClientRect().top ?? 0;
      const targetResource = disableResourceReassignment
        ? rowsRef.current.find((row) => row.resourceId === activeDrag.fromResourceId)?.resource ?? null
        : resolveTargetResource(rowsRef.current, event.clientY, gridTop);
      if (!targetResource) {
        return;
      }

      const nextRange = resolveResourceMoveRange(activeDrag, activeDrag.currentLeft);
      onResourceItemMoveRef.current?.({
        item: activeDrag.item,
        itemId: activeDrag.itemId,
        fromResourceId: activeDrag.fromResourceId,
        toResourceId: targetResource.id,
        startDate: nextRange.startDate,
        endDate: nextRange.endDate,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelDrag();
    };
  }, [cancelDrag, clearRaf, disableResourceReassignment, gridElementRef]);

  const startDrag = useCallback((
    event: ReactMouseEvent<HTMLElement>,
    layoutItem: ResourceDragItem<TItem>
  ) => {
    if (readonly || layoutItem.item.locked || event.button !== 0) {
      return;
    }

    event.preventDefault();
    activeDragRef.current = {
      item: layoutItem.item,
      itemId: layoutItem.itemId,
      fromResourceId: layoutItem.resourceId,
      startX: event.clientX,
      startY: event.clientY,
      initialLeft: layoutItem.left,
      initialTop: layoutItem.top,
      currentLeft: layoutItem.left,
      currentTop: layoutItem.top,
      currentWidth: layoutItem.width,
      dayWidth,
      startDate: layoutItem.startDate,
      endDate: layoutItem.endDate,
      monthStart,
      businessDays,
      weekendPredicate,
    };
    setPreview({
      itemId: layoutItem.itemId,
      left: layoutItem.left,
      top: layoutItem.top,
      width: layoutItem.width,
    });
  }, [businessDays, dayWidth, monthStart, readonly, weekendPredicate]);

  return {
    preview,
    startDrag,
    cancelDrag,
  };
};
