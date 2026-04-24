'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import type { ResourceTimelineItem, ResourceTimelineMove, ResourceTimelineResource } from '../types';

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
  dayWidth: number;
  startDate: Date;
  endDate: Date;
}

export interface ResourceItemDragPreview {
  itemId: string;
  left: number;
  top: number;
}

export interface UseResourceItemDragOptions<TItem extends ResourceTimelineItem = ResourceTimelineItem> {
  dayWidth: number;
  rows: Array<ResourceDragRow<TItem>>;
  gridElementRef?: RefObject<HTMLElement | null>;
  readonly?: boolean;
  onResourceItemMove?: (move: ResourceTimelineMove<TItem>) => void;
}

const snapToDay = (pixels: number, dayWidth: number): number => {
  return Math.round(pixels / dayWidth) * dayWidth;
};

const addUTCDays = (date: Date, days: number): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
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
  rows,
  gridElementRef,
  readonly,
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

        const nextLeft = latestDrag.initialLeft + snapToDay(event.clientX - latestDrag.startX, latestDrag.dayWidth);
        const nextTop = latestDrag.initialTop + (event.clientY - latestDrag.startY);
        latestDrag.currentLeft = nextLeft;
        latestDrag.currentTop = nextTop;
        setPreview({
          itemId: latestDrag.itemId,
          left: nextLeft,
          top: nextTop,
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
      const targetResource = resolveTargetResource(rowsRef.current, event.clientY, gridTop);
      if (!targetResource) {
        return;
      }

      const dayDelta = Math.round((activeDrag.currentLeft - activeDrag.initialLeft) / activeDrag.dayWidth);
      onResourceItemMoveRef.current?.({
        item: activeDrag.item,
        itemId: activeDrag.itemId,
        fromResourceId: activeDrag.fromResourceId,
        toResourceId: targetResource.id,
        startDate: addUTCDays(activeDrag.startDate, dayDelta),
        endDate: addUTCDays(activeDrag.endDate, dayDelta),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelDrag();
    };
  }, [cancelDrag, clearRaf, gridElementRef]);

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
      dayWidth,
      startDate: layoutItem.startDate,
      endDate: layoutItem.endDate,
    };
    setPreview({
      itemId: layoutItem.itemId,
      left: layoutItem.left,
      top: layoutItem.top,
    });
  }, [dayWidth, readonly]);

  return {
    preview,
    startDrag,
    cancelDrag,
  };
};
