'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import type { ResourceTimelineItem, ResourceTimelineMove, ResourceTimelineResource } from '../types';
import { buildTaskRangeFromEnd, buildTaskRangeFromStart, getBusinessDaysCount, moveTaskRange } from '../core/scheduling';

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
  mode: ResourceTimelineChangeType;
  fromResourceId: string;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
  initialWidth: number;
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

type ResourceTimelineChangeType = NonNullable<ResourceTimelineMove['changeType']>;

export interface ResourceItemDragPreview {
  itemId: string;
  left: number;
  top: number;
  width: number;
  startDate: Date;
  endDate: Date;
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
  nextLeft: number,
  nextWidth: number
): { startDate: Date; endDate: Date; left: number; width: number } => {
  const dayOffset = Math.round(nextLeft / activeDrag.dayWidth);
  const durationDays = Math.round(nextWidth / activeDrag.dayWidth);
  const rawStartDate = addUTCDays(activeDrag.monthStart, dayOffset);
  const rawEndDate = addUTCDays(rawStartDate, durationDays - 1);

  if (!activeDrag.businessDays || !activeDrag.weekendPredicate) {
    return {
      startDate: rawStartDate,
      endDate: rawEndDate,
      left: nextLeft,
      width: nextWidth,
    };
  }

  const range = (() => {
    if (activeDrag.mode === 'resize-start') {
      const snapDirection: 1 | -1 = rawStartDate.getTime() >= activeDrag.startDate.getTime() ? 1 : -1;
      const duration = getBusinessDaysCount(rawStartDate, activeDrag.endDate, activeDrag.weekendPredicate!);
      return buildTaskRangeFromEnd(activeDrag.endDate, duration, true, activeDrag.weekendPredicate, snapDirection);
    }

    if (activeDrag.mode === 'resize-end') {
      const snapDirection: 1 | -1 = rawEndDate.getTime() >= activeDrag.endDate.getTime() ? 1 : -1;
      const duration = getBusinessDaysCount(activeDrag.startDate, rawEndDate, activeDrag.weekendPredicate!);
      return buildTaskRangeFromStart(activeDrag.startDate, duration, true, activeDrag.weekendPredicate, snapDirection);
    }

    const dayDelta = Math.round((nextLeft - activeDrag.initialLeft) / activeDrag.dayWidth);
    const proposedStartDate = addUTCDays(activeDrag.startDate, dayDelta);
    const snapDirection: 1 | -1 = proposedStartDate.getTime() >= activeDrag.startDate.getTime() ? 1 : -1;
    return moveTaskRange(
      activeDrag.startDate,
      activeDrag.endDate,
      proposedStartDate,
      true,
      activeDrag.weekendPredicate,
      snapDirection
    );
  })();
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

        const snappedDelta = snapToDay(event.clientX - latestDrag.startX, latestDrag.dayWidth);
        const rightEdge = latestDrag.initialLeft + latestDrag.initialWidth;
        const nextGeometry = (() => {
          if (latestDrag.mode === 'resize-start') {
            const left = Math.min(latestDrag.initialLeft + snappedDelta, rightEdge - latestDrag.dayWidth);
            return { left, width: rightEdge - left };
          }
          if (latestDrag.mode === 'resize-end') {
            return { left: latestDrag.initialLeft, width: Math.max(latestDrag.dayWidth, latestDrag.initialWidth + snappedDelta) };
          }
          return { left: latestDrag.initialLeft + snappedDelta, width: latestDrag.initialWidth };
        })();
        const nextRange = resolveResourceMoveRange(latestDrag, nextGeometry.left, nextGeometry.width);
        const nextTop = disableResourceReassignment || latestDrag.mode !== 'move'
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
          startDate: nextRange.startDate,
          endDate: nextRange.endDate,
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
      const targetResource = disableResourceReassignment || activeDrag.mode !== 'move'
        ? rowsRef.current.find((row) => row.resourceId === activeDrag.fromResourceId)?.resource ?? null
        : resolveTargetResource(rowsRef.current, event.clientY, gridTop);
      if (!targetResource) {
        return;
      }

      const nextRange = resolveResourceMoveRange(activeDrag, activeDrag.currentLeft, activeDrag.currentWidth);
      onResourceItemMoveRef.current?.({
        item: activeDrag.item,
        itemId: activeDrag.itemId,
        taskId: activeDrag.item.taskId,
        fromResourceId: activeDrag.fromResourceId,
        toResourceId: targetResource.id,
        startDate: nextRange.startDate,
        endDate: nextRange.endDate,
        changeType: activeDrag.mode,
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

    const target = event.target as HTMLElement;
    const mode: ResourceTimelineChangeType = target.closest('.gantt-resourceTimeline-resizeHandleStart')
      ? 'resize-start'
      : target.closest('.gantt-resourceTimeline-resizeHandleEnd')
        ? 'resize-end'
        : 'move';

    event.preventDefault();
    activeDragRef.current = {
      item: layoutItem.item,
      itemId: layoutItem.itemId,
      mode,
      fromResourceId: layoutItem.resourceId,
      startX: event.clientX,
      startY: event.clientY,
      initialLeft: layoutItem.left,
      initialTop: layoutItem.top,
      initialWidth: layoutItem.width,
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
      startDate: layoutItem.startDate,
      endDate: layoutItem.endDate,
    });
  }, [businessDays, dayWidth, monthStart, readonly, weekendPredicate]);

  return {
    preview,
    startDrag,
    cancelDrag,
  };
};
