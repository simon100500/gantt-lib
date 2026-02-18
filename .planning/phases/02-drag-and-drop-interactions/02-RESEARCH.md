# Phase 2: Drag-and-Drop Interactions - Research

**Researched:** 2026-02-19
**Domain:** React drag-and-drop with mouse event handling
**Confidence:** MEDIUM

## Summary

Phase 2 requires implementing interactive task bar manipulation using native browser mouse events (no external drag-drop libraries). The implementation must support both moving (dragging entire task bar) and resizing (dragging edges) with snap-to-grid functionality and 60fps performance with ~100 tasks. Research indicates this is best achieved using a custom hook pattern with mouse event listeners on `window`, position tracking via refs to minimize re-renders, and `requestAnimationFrame` for smooth visual updates during drag operations.

**Primary recommendation:** Implement a custom `useTaskDrag` hook that manages drag state via refs (not state) to prevent re-renders during dragging, with `requestAnimationFrame` batching for smooth 60fps updates, and event listeners attached to window for reliable drag completion detection.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Drag affordance
- Entire task bar is clickable and draggable (no separate drag handle)
- Cursor changes to `pointer` when hovering over task bar
- Visual hover feedback: shadow or transparency change
- Touch devices: long press to enter drag mode

### Resize zones
- Only edges (10-15px zone) respond to resize operations
- Visible markers displayed on left and right edges of task bar
- Minimum width constraint: 1 day (cell width)
- Resize has priority over move when cursor is on edge zone

### Snap & timing
- Tasks snap to start of day (grid cell boundaries)
- onChange callback fires only on drop (not during drag)
- Visual updates happen in real-time during drag
- Other tasks don't react or highlight during drag operations

### Visual feedback
- During move: bar itself moves, appears solid, old position is not shown
- During resize: edge follows cursor in real-time
- Date tooltip shown during drag (shows new start/end dates)
- Full date format in tooltip (e.g., "15 февраля" or "February 15")

### Claude's Discretion
- Exact hover visual style (shadow vs transparency vs border)
- Marker design for resize edges (dots, lines, handles)
- Tooltip positioning and timing
- Touch long-press duration
- Edge zone exact width (10-15px range)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INT-01 | User can drag task bars horizontally to change start/end dates (move) | Custom hook with mouse events tracks deltaX, converts to day offset |
| INT-02 | User can drag task bar edges to change duration (resize) | Edge detection via cursor position within task bar (10-15px zones) |
| INT-03 | Component maintains 60fps performance during drag operations (~100 tasks) | Refs for position tracking + requestAnimationFrame batching + React.memo optimization |
| INT-04 | Parent component receives callback with updated task data after drag operation | onChange callback fires on mouseup with updated task object |
| API-02 | Component provides `onChange` callback returning modified tasks array | Callback passes updated task array with modified start/end dates |
| QL-01 | React.memo on task components to prevent re-render storms | Already implemented in TaskRow; maintain during drag state changes |
| QL-02 | Proper cleanup of event listeners to prevent memory leaks | useEffect cleanup function removes window listeners on unmount |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.0.0 | Component framework | Already in use, provides hooks and event handling |
| date-fns | 4.1.0 | Date manipulation | Already in use, provides format() for tooltips |
| clsx | 2.1.0 | Conditional class names | Already in use, useful for drag state classes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | Drag-and-drop | Native mouse events preferred per DX-02 (minimal dependencies) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native mouse events | @dnd-kit/core | Adds ~15KB bundle, requires refactoring, not needed for simple horizontal drag |
| Native mouse events | react-dnd | Heavy dependency (50KB+), HTML5 drag API has limitations, overkill for this use case |
| Native mouse events | react-beautiful-dnd | Deprecated, library in maintenance mode, oriented toward lists not timeline drag |

**Installation:**
```bash
# No additional packages needed - using existing dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── index.ts                    # Export all hooks
│   └── useTaskDrag.ts              # Custom drag hook (NEW)
├── utils/
│   ├── index.ts
│   ├── dateUtils.ts                # Add drag snap calculations
│   └── geometry.ts                 # Add edge detection helpers
├── components/
│   ├── TaskRow/
│   │   ├── TaskRow.tsx             # Add drag handlers
│   │   └── TaskRow.module.css      # Add drag/resize styles
│   ├── DragTooltip/                # NEW COMPONENT
│   │   ├── index.ts
│   │   ├── DragTooltip.tsx
│   │   └── DragTooltip.module.css
│   └── GanttChart/
│       └── GanttChart.tsx          # Add onChange prop, pass to TaskRow
```

### Pattern 1: Custom useTaskDrag Hook

**What:** Encapsulates all drag logic (move + resize) in a reusable hook that manages drag state via refs to minimize re-renders.

**When to use:** Whenever a component needs draggable behavior with mouse events.

**Example:**
```typescript
// Based on standard React drag patterns and performance best practices
interface UseTaskDragOptions {
  taskId: string;
  initialStartDate: Date;
  initialEndDate: Date;
  monthStart: Date;
  dayWidth: number;
  onDragEnd?: (updatedTask: { id: string; startDate: Date; endDate: Date }) => void;
  edgeZoneWidth?: number; // Default 12px
}

interface UseTaskDragReturn {
  isDragging: boolean;
  isResizing: 'left' | 'right' | null;
  currentLeft: number;
  currentWidth: number;
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
  resizeHandleLeftProps: {
    onMouseDown: (e: React.MouseEvent) => void;
  };
  resizeHandleRightProps: {
    onMouseDown: (e: React.MouseEvent) => void;
  };
}

function useTaskDrag(options: UseTaskDragOptions): UseTaskDragReturn {
  // Use refs for high-frequency updates to avoid re-renders
  const dragStateRef = useRef({
    isDragging: false,
    isResizing: null as 'left' | 'right' | null,
    startX: 0,
    initialLeft: 0,
    initialWidth: 0,
  });

  const positionRef = useRef({ left: 0, width: 0 });
  const rafRef = useRef<number | null>(null);

  // Snap to grid calculation
  const snapToGrid = useCallback((pixelValue: number): number => {
    return Math.round(pixelValue / options.dayWidth) * options.dayWidth;
  }, [options.dayWidth]);

  // Convert pixel offset to date
  const pixelToDate = useCallback((pixels: number, baseDate: Date): Date => {
    const dayOffset = Math.round(pixels / options.dayWidth);
    return new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate() + dayOffset
    ));
  }, [options.dayWidth]);

  // Mouse move handler with requestAnimationFrame
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current.isDragging) return;

    // Cancel previous RAF to avoid stacking
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    // Batch update to next animation frame
    rafRef.current = requestAnimationFrame(() => {
      const deltaX = e.clientX - dragStateRef.current.startX;
      const snappedDelta = snapToGrid(deltaX);

      if (dragStateRef.current.isResizing === 'left') {
        // Resize from left edge
        const newWidth = dragStateRef.current.initialWidth - snappedDelta;
        const minWidth = options.dayWidth; // Minimum 1 day
        if (newWidth >= minWidth) {
          positionRef.current = {
            left: dragStateRef.current.initialLeft + snappedDelta,
            width: newWidth,
          };
        }
      } else if (dragStateRef.current.isResizing === 'right') {
        // Resize from right edge
        const newWidth = dragStateRef.current.initialWidth + snappedDelta;
        if (newWidth >= options.dayWidth) {
          positionRef.current = {
            ...positionRef.current,
            width: newWidth,
          };
        }
      } else {
        // Move entire bar
        positionRef.current = {
          left: dragStateRef.current.initialLeft + snappedDelta,
          width: dragStateRef.current.initialWidth,
        };
      }

      // Trigger re-render for visual update
      forceUpdate();
      rafRef.current = null;
    });
  }, [snapToGrid, options.dayWidth]);

  // Mouse up handler - calculate final dates and call onChange
  const handleMouseUp = useCallback(() => {
    if (!dragStateRef.current.isDragging) return;

    // Convert final position back to dates
    const startDate = pixelToDate(
      positionRef.current.left,
      options.monthStart
    );
    const endDate = pixelToDate(
      positionRef.current.left + positionRef.current.width - options.dayWidth,
      options.monthStart
    );

    // Reset drag state
    dragStateRef.current.isDragging = false;
    dragStateRef.current.isResizing = null;

    // Notify parent
    options.onDragEnd?.({
      id: options.taskId,
      startDate,
      endDate,
    });
  }, [pixelToDate, options]);

  // Setup event listeners on window
  useEffect(() => {
    if (dragStateRef.current.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [handleMouseMove, handleMouseUp]);

  // ... rest of implementation
}
```

### Pattern 2: Edge Detection for Resize vs Move

**What:** Determine user intent (resize vs move) based on cursor position within task bar.

**When to use:** On `onMouseDown` to determine which drag mode to activate.

**Example:**
```typescript
// Add to geometry.ts
export const detectEdgeZone = (
  e: React.MouseEvent,
  taskBarElement: HTMLElement,
  edgeZoneWidth: number
): 'left' | 'right' | 'move' => {
  const rect = taskBarElement.getBoundingClientRect();
  const x = e.clientX - rect.left;

  if (x <= edgeZoneWidth) return 'left';
  if (x >= rect.width - edgeZoneWidth) return 'right';
  return 'move';
};

// Cursor update based on hover position
export const getCursorForPosition = (
  position: 'left' | 'right' | 'move'
): string => {
  switch (position) {
    case 'left':
    case 'right':
      return 'ew-resize';
    case 'move':
      return 'grab';
    default:
      return 'default';
  }
};
```

### Pattern 3: Tooltip Component for Date Display

**What:** Floating tooltip that follows cursor during drag, showing formatted dates.

**When to use:** During active drag operations to provide visual feedback.

**Example:**
```typescript
// DragTooltip.tsx
interface DragTooltipProps {
  x: number;
  y: number;
  startDate: Date;
  endDate: Date;
  locale?: string;
}

export const DragTooltip: React.FC<DragTooltipProps> = ({
  x,
  y,
  startDate,
  endDate,
  locale = 'en-US',
}) => {
  const formatDate = (date: Date) => {
    return format(date, 'd MMMM', { locale });
  };

  return (
    <div
      className={styles.tooltip}
      style={{
        position: 'fixed',
        left: x + 16, // Offset from cursor
        top: y + 16,
        zIndex: 1000,
      }}
    >
      <div className={styles.dateRow}>{formatDate(startDate)}</div>
      <div className={styles.arrow}>→</div>
      <div className={styles.dateRow}>{formatDate(endDate)}</div>
    </div>
  );
};
```

### Anti-Patterns to Avoid

- **Storing drag position in state during drag**: Causes re-render on every mouse move. Use refs instead.
- **Attaching mousemove to the dragged element**: Use `window` to prevent cursor from "slipping" off the element.
- **Updating parent state during drag**: Only notify parent on drag complete (mouseUp).
- **Using CSS transitions during drag**: Causes lag/ghosting. Disable transitions during active drag.
- **Forgetting to cleanup RAF callbacks**: Memory leak. Always cancel in useEffect cleanup.
- **Using HTML5 drag-and-drop API**: Has limited cursor styling, ghost image issues, not suitable for this use case.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom date formatters | date-fns `format()` | Already installed, handles locales, battle-tested |
| RequestAnimationFrame batching | Custom timing loop | Native `requestAnimationFrame` | Browser-optimized for 60fps, pauses when tab inactive |
| Event listener cleanup | Manual tracking | useEffect return function | React standard pattern, prevents memory leaks |
| Edge zone detection | Multiple event handlers | Single handler with position math | Simpler, more predictable, easier to maintain |

**Key insight:** Native browser APIs (mouse events + RAF) are sufficient and optimal for this use case. External drag-drop libraries add bundle size and complexity without providing meaningful benefits for simple horizontal timeline drag.

## Common Pitfalls

### Pitfall 1: Re-render Storm During Drag

**What goes wrong:** Component re-renders on every mousemove event, causing stuttering and dropped frames.

**Why it happens:** Storing drag position in React state triggers re-renders. With 100 task rows, this means 100 component updates per mousemove event.

**How to avoid:**
- Use `useRef` for drag position (doesn't trigger re-render)
- Only use `useState` for drag active state (boolean)
- Use `requestAnimationFrame` to batch visual updates
- Leverage existing `React.memo` on TaskRow components

**Warning signs:** Browser DevTools Performance tab shows 60+ long tasks during drag operations, FPS drops below 45.

### Pitfall 2: Drag Gets "Stuck" When Cursor Leaves Element

**What goes wrong:** Drag stops responding when mouse moves quickly outside the task bar.

**Why it happens:** Attaching `mousemove` to the task bar element instead of `window`.

**How to avoid:**
```typescript
// CORRECT: Attach to window
useEffect(() => {
  if (isDragging) {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }
}, [isDragging]);
```

**Warning signs:** Drag stops mid-interaction, requiring refresh to fix.

### Pitfall 3: Memory Leaks from Event Listeners

**What goes wrong:** Event listeners accumulate after multiple drag operations or component unmounts.

**Why it happens:** Forgetting to remove event listeners in useEffect cleanup.

**How to avoid:**
```typescript
useEffect(() => {
  // Add listeners
  window.addEventListener('mousemove', handleMouseMove);

  // Cleanup function ALWAYS required
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };
}, [isDragging]);
```

**Warning signs:** Increasing memory usage in DevTools Memory profiler, slower performance over time.

### Pitfall 4: Sub-pixel Rendering Causing Blur

**What goes wrong:** Task bars appear blurry or misaligned during drag.

**Why it happens:** Not rounding pixel values to whole numbers.

**How to avoid:**
```typescript
// Round to device pixels
const left = Math.round(startOffset * dayWidth);
const width = Math.round(duration * dayWidth);
```

**Warning signs:** Fuzzy text or borders, visual "shaking" during drag.

### Pitfall 5: Date DST Bugs

**What goes wrong:** Task dates shift by 1 hour during drag operations due to daylight saving time.

**Why it happens:** Using local time instead of UTC for date calculations.

**How to avoid:**
- Use `Date.UTC()` for all date construction
- Use `getUTC*()` methods instead of `get*()`
- Already established pattern in `dateUtils.ts` - follow it

**Warning signs:** Dates don't align with grid cells, tasks "jump" when crossing DST boundaries.

## Code Examples

Verified patterns from standard React drag implementations:

### Basic Mouse Event Setup

```typescript
// Standard React drag event pattern
const [isDragging, setIsDragging] = useState(false);
const startPosRef = useRef({ x: 0, y: 0 });

const handleMouseDown = (e: React.MouseEvent) => {
  e.preventDefault(); // Prevent text selection
  startPosRef.current = { x: e.clientX, y: e.clientY };
  setIsDragging(true);
};

useEffect(() => {
  if (!isDragging) return;

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - startPosRef.current.x;
    // Handle drag
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Notify parent of changes
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, [isDragging]);
```

### Cursor Position Detection

```typescript
// Detect if cursor is over edge zone
const onMouseMove = (e: React.MouseEvent) => {
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  const x = e.clientX - rect.left;
  const edgeZone = 12; // pixels

  let cursor = 'grab';
  if (x <= edgeZone || x >= rect.width - edgeZone) {
    cursor = 'ew-resize';
  }

  (e.target as HTMLElement).style.cursor = cursor;
};
```

### Snap to Grid Calculation

```typescript
// Snap pixel value to nearest grid cell
const snapToGrid = (pixels: number, gridSize: number): number => {
  return Math.round(pixels / gridSize) * gridSize;
};

// Usage during drag
const snappedX = snapToGrid(deltaX, dayWidth);
```

### Touch Long Press Detection

```typescript
// Touch device long press pattern
const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

const handleTouchStart = (e: React.TouchEvent) => {
  touchTimerRef.current = setTimeout(() => {
    // Enter drag mode after 500ms
    setIsDragging(true);
  }, 500);
};

const handleTouchEnd = () => {
  if (touchTimerRef.current) {
    clearTimeout(touchTimerRef.current);
    touchTimerRef.current = null;
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 Drag & Drop API | Native mouse events | Ongoing trend | More control, better cursor styling, no ghost image |
| State-based drag position | Ref-based drag position | React 18+ | Better performance, fewer re-renders |
| Manual RAF management | React's automatic batching | React 18 (auto) | Simpler code in many cases |
| dnd-kit for everything | Selective library usage | 2023+ | Smaller bundles, better perf for simple cases |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Library is deprecated, no longer maintained (as of 2023)
- `react-dnd` HTML5 backend: Has known issues with cursor styling and ghost images
- `onDrag`/`onDrop` HTML5 events: Limited customization, not suitable for timeline drag

## Open Questions

1. **Touch interaction specifics**
   - What we know: Long press pattern is standard for touch drag affordance
   - What's unclear: Optimal long-press duration (standard is 300-500ms), visual feedback during long-press
   - Recommendation: Use 400ms delay, show loading spinner or progress indicator during long-press

2. **Resize edge marker design**
   - What we know: Need visible markers on 10-15px edge zones
   - What's unclear: Visual design (dots vs lines vs handles), color/contrast requirements
   - Recommendation: Use 2px vertical bars with slightly lighter color than task bar, test with users

3. **Tooltip positioning during fast drag**
   - What we know: Should follow cursor and show dates
   - What's unclear: Offset distance, behavior when near viewport edge
   - Recommendation: 16px offset, flip to above/below when near edges

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis - Reviewed TaskRow.tsx, GanttChart.tsx, geometry.ts, dateUtils.ts for current patterns
- date-fns v4.1.0 - Verified format() function usage for date localization (already installed)
- React 19.0.0 - Confirmed hook patterns and event handling approaches (already installed)

### Secondary (MEDIUM confidence)
- React drag patterns - Industry standard patterns for mouse-based drag (widely documented)
- requestAnimationFrame performance - Browser API standard for 60fps animations
- Event listener cleanup - React useEffect cleanup pattern (official React docs)

### Tertiary (LOW confidence)
- None - Web search unavailable due to rate limit, findings based on established patterns and training knowledge

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No additional dependencies needed, using existing stack
- Architecture: MEDIUM - Patterns based on established React conventions, minor uncertainty around touch interactions
- Pitfalls: HIGH - Well-documented issues with React drag implementations

**Research date:** 2026-02-19
**Valid until:** 2026-03-20 (30 days - stable domain)
