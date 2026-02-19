'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { detectEdgeZone } from '../utils/geometry';

/**
 * Options for useTaskDrag hook
 */
export interface UseTaskDragOptions {
  /** Unique identifier for the task */
  taskId: string;
  /** Initial start date of the task */
  initialStartDate: Date;
  /** Initial end date of the task */
  initialEndDate: Date;
  /** Start of the visible range (e.g., month start) */
  monthStart: Date;
  /** Width of each day in pixels */
  dayWidth: number;
  /** Callback when drag operation completes */
  onDragEnd?: (result: { id: string; startDate: Date; endDate: Date }) => void;
  /** Callback for drag state changes (for parent components to render guide lines) */
  onDragStateChange?: (state: {
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
  }) => void;
  /** Width of edge zones for resize detection (default: 12px) */
  edgeZoneWidth?: number;
}

/**
 * Return value from useTaskDrag hook
 */
export interface UseTaskDragReturn {
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** Current drag mode (null when not dragging) */
  dragMode: 'move' | 'resize-left' | 'resize-right' | null;
  /** Current left position in pixels (updated during drag) */
  currentLeft: number;
  /** Current width in pixels (updated during drag) */
  currentWidth: number;
  /** Props to spread on the drag handle element */
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
}

/**
 * Custom hook for managing task drag interactions
 *
 * Uses refs for high-frequency state updates to avoid React re-renders during drag.
 * Event listeners attached to window for reliable drag completion detection.
 * requestAnimationFrame used for smooth 60fps visual updates.
 */
export const useTaskDrag = (options: UseTaskDragOptions): UseTaskDragReturn => {
  const {
    taskId,
    initialStartDate,
    initialEndDate,
    monthStart,
    dayWidth,
    onDragEnd,
    onDragStateChange,
    edgeZoneWidth = 12,
  } = options;

  // High-frequency drag state (refs to avoid re-renders)
  const isDraggingRef = useRef<boolean>(false);
  const dragModeRef = useRef<'move' | 'resize-left' | 'resize-right' | null>(null);
  const startXRef = useRef<number>(0);
  const initialLeftRef = useRef<number>(0);
  const initialWidthRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  // Display state (triggers re-renders only when needed)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize-left' | 'resize-right' | null>(null);
  const [currentLeft, setCurrentLeft] = useState<number>(0);
  const [currentWidth, setCurrentWidth] = useState<number>(0);

  // Refs for latest display values (sync with state)
  const currentLeftRef = useRef<number>(0);
  const currentWidthRef = useRef<number>(0);

  // Sync display state refs
  useEffect(() => {
    currentLeftRef.current = currentLeft;
  }, [currentLeft]);

  useEffect(() => {
    currentWidthRef.current = currentWidth;
  }, [currentWidth]);

  /**
   * Calculate initial pixel position from dates
   */
  const getInitialPosition = useCallback((): { left: number; width: number } => {
    const getUTCDayDifference = (date1: Date, date2: Date): number => {
      const ms1 = Date.UTC(
        date1.getUTCFullYear(),
        date1.getUTCMonth(),
        date1.getUTCDate()
      );
      const ms2 = Date.UTC(
        date2.getUTCFullYear(),
        date2.getUTCMonth(),
        date2.getUTCDate()
      );
      return Math.round((ms1 - ms2) / (1000 * 60 * 60 * 24));
    };

    const startOffset = getUTCDayDifference(initialStartDate, monthStart);
    const duration = getUTCDayDifference(initialEndDate, initialStartDate);

    const left = Math.round(startOffset * dayWidth);
    const width = Math.round((duration + 1) * dayWidth); // +1 to include end date

    return { left, width };
  }, [initialStartDate, initialEndDate, monthStart, dayWidth]);

  /**
   * Convert pixel value to date (using UTC)
   */
  const pixelToDate = useCallback((pixels: number, baseDate: Date): Date => {
    const dayOffset = Math.round(pixels / dayWidth);
    return new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate() + dayOffset
    ));
  }, [dayWidth]);

  /**
   * Snap pixel value to grid (day boundaries)
   */
  const snapToGrid = useCallback((pixels: number): number => {
    return Math.round(pixels / dayWidth) * dayWidth;
  }, [dayWidth]);

  /**
   * Handle mouse move during drag
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || rafIdRef.current !== null) {
      return;
    }

    // Schedule update via RAF for smooth 60fps
    rafIdRef.current = requestAnimationFrame(() => {
      const deltaX = e.clientX - startXRef.current;
      const mode = dragModeRef.current;

      if (!mode) {
        rafIdRef.current = null;
        return;
      }

      let newLeft = initialLeftRef.current;
      let newWidth = initialWidthRef.current;

      switch (mode) {
        case 'move':
          // Move: both left and width change (entire bar moves)
          newLeft = snapToGrid(initialLeftRef.current + deltaX);
          break;
        case 'resize-left':
          // Resize left: left changes, width adjusts to keep right edge fixed
          const snappedLeft = snapToGrid(initialLeftRef.current + deltaX);
          newLeft = snappedLeft;
          const rightEdge = initialLeftRef.current + initialWidthRef.current;
          newWidth = Math.max(dayWidth, rightEdge - snappedLeft);
          break;
        case 'resize-right':
          // Resize right: only width changes (left edge fixed)
          const snappedWidth = snapToGrid(initialWidthRef.current + deltaX);
          newWidth = Math.max(dayWidth, snappedWidth);
          break;
      }

      // Update display state (triggers re-render)
      setCurrentLeft(newLeft);
      setCurrentWidth(newWidth);

      // Notify parent of position update
      if (onDragStateChange) {
        onDragStateChange({
          isDragging: true,
          dragMode: dragModeRef.current || null,
          left: newLeft,
          width: newWidth,
        });
      }

      rafIdRef.current = null;
    });
  }, [dayWidth, snapToGrid]);

  /**
   * Handle mouse up (drag end)
   */
  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) {
      return;
    }

    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const mode = dragModeRef.current;
    const finalLeft = currentLeftRef.current;
    const finalWidth = currentWidthRef.current;

    // Calculate new dates from final pixel values
    const dayOffset = Math.round(finalLeft / dayWidth);
    const durationDays = Math.round(finalWidth / dayWidth) - 1; // -1 because width includes end date

    const newStartDate = new Date(Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      monthStart.getUTCDate() + dayOffset
    ));

    const newEndDate = new Date(Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      monthStart.getUTCDate() + dayOffset + durationDays
    ));

    // Reset drag state
    isDraggingRef.current = false;
    dragModeRef.current = null;
    setIsDragging(false);
    setDragMode(null);

    // Notify parent of drag end
    if (onDragStateChange) {
      onDragStateChange({
        isDragging: false,
        dragMode: null,
        left: finalLeft,
        width: finalWidth,
      });
    }

    // Notify parent of drag completion
    if (onDragEnd && mode) {
      onDragEnd({
        id: taskId,
        startDate: newStartDate,
        endDate: newEndDate,
      });
    }
  }, [dayWidth, monthStart, onDragEnd, onDragStateChange, taskId]);

  /**
   * Attach/remove window event listeners based on drag state
   */
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        // Cancel any pending RAF
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  /**
   * Initialize position when dates or dayWidth changes
   */
  useEffect(() => {
    const { left, width } = getInitialPosition();
    setCurrentLeft(left);
    setCurrentWidth(width);
    initialLeftRef.current = left;
    initialWidthRef.current = width;
  }, [getInitialPosition]);

  /**
   * Handle mouse down on drag handle
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const edgeZone = detectEdgeZone(e.clientX, target, edgeZoneWidth);

    // Determine drag mode from edge zone
    let mode: 'move' | 'resize-left' | 'resize-right' | null = null;
    switch (edgeZone) {
      case 'left':
        mode = 'resize-left';
        break;
      case 'right':
        mode = 'resize-right';
        break;
      case 'move':
        mode = 'move';
        break;
    }

    if (!mode) {
      return;
    }

    // Initialize drag state
    isDraggingRef.current = true;
    dragModeRef.current = mode;
    startXRef.current = e.clientX;
    initialLeftRef.current = currentLeftRef.current;
    initialWidthRef.current = currentWidthRef.current;

    // Update display state
    setIsDragging(true);
    setDragMode(mode);

    // Notify parent of drag start
    if (onDragStateChange) {
      onDragStateChange({
        isDragging: true,
        dragMode: mode,
        left: currentLeftRef.current,
        width: currentWidthRef.current,
      });
    }
  }, [edgeZoneWidth, onDragStateChange]);

  /**
   * Get cursor style based on current position
   */
  const getCursorStyle = useCallback((): string => {
    if (isDragging) {
      return 'grabbing';
    }
    return 'grab';
  }, [isDragging]);

  return {
    isDragging,
    dragMode,
    currentLeft,
    currentWidth,
    dragHandleProps: {
      onMouseDown: handleMouseDown,
      style: {
        cursor: getCursorStyle(),
        userSelect: 'none',
      } as React.CSSProperties,
    },
  };
};
