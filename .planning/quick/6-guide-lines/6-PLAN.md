---
phase: quick
plan: 6
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/DragGuideLines/DragGuideLines.tsx
  - src/components/DragGuideLines/DragGuideLines.module.css
  - src/components/TaskRow/TaskRow.tsx
  - src/components/GanttChart/GanttChart.tsx
autonomous: true
requirements:
  - QUICK-06

must_haves:
  truths:
    - "Vertical guide line appears at task start position during move drag"
    - "Vertical guide line appears at task end position during move drag"
    - "Vertical guide line appears at left edge during resize-left drag"
    - "Vertical guide line appears at right edge during resize-right drag"
    - "Guide lines span the full height of the calendar grid (not just the task row)"
    - "Guide lines disappear when drag operation completes"
  artifacts:
    - path: "src/components/DragGuideLines/DragGuideLines.tsx"
      provides: "Component rendering vertical drag guide lines"
      exports: ["DragGuideLines"]
    - path: "src/components/DragGuideLines/DragGuideLines.module.css"
      provides: "Styles for vertical guide lines"
      contains: ".guideLine with position: absolute and full height"
    - path: "src/components/TaskRow/TaskRow.tsx"
      provides: "TaskRow with drag state export via onDragState callback"
      contains: "onDragState prop passed to useTaskDrag"
    - path: "src/components/GanttChart/GanttChart.tsx"
      provides: "GanttChart rendering DragGuideLines component"
      contains: "DragGuideLines component with dragGuideLines prop"
  key_links:
    - from: "src/hooks/useTaskDrag.ts"
      to: "src/components/TaskRow/TaskRow.tsx"
      via: "onDragState callback"
      pattern: "onDragState.*isDragging.*dragMode"
    - from: "src/components/TaskRow/TaskRow.tsx"
      to: "src/components/GanttChart/GanttChart.tsx"
      via: "onDragState prop propagation"
      pattern: "onDragState.*handleDragState"
    - from: "src/components/GanttChart/GanttChart.tsx"
      to: "src/components/DragGuideLines/DragGuideLines.tsx"
      via: "Component render with drag state"
      pattern: "DragGuideLines.*isDragging"
---

<objective>
Add vertical guide lines that span the full calendar grid height during task drag/resize operations. This helps users orient the task relative to other tasks in the chart.

Purpose: When dragging or resizing tasks, users need visual reference lines extending across all rows to align tasks with dates on other rows. The current implementation only shows the task bar being dragged, which makes it difficult to see alignment with tasks on other rows.

Output: A DragGuideLines component that renders vertical lines at the active drag edges (left/right for move, single edge for resize) spanning the full grid height.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/TodayIndicator/TodayIndicator.tsx
@src/components/GanttChart/GanttChart.tsx
@src/components/TaskRow/TaskRow.tsx
@src/hooks/useTaskDrag.ts
</context>

<tasks>

<task type="auto">
  <name>Create DragGuideLines component</name>
  <files>src/components/DragGuideLines/DragGuideLines.tsx</files>
  <action>
Create a new DragGuideLines component that renders vertical guide lines during drag operations.

File structure to create:
- src/components/DragGuideLines/DragGuideLines.tsx
- src/components/DragGuideLines/DragGuideLines.module.css

Component interface:
```typescript
export interface DragGuideLinesProps {
  /** Whether drag is active */
  isDragging: boolean;
  /** Current drag mode */
  dragMode: 'move' | 'resize-left' | 'resize-right' | null;
  /** Left position of the task bar in pixels */
  left: number;
  /** Width of the task bar in pixels */
  width: number;
  /** Total height of the grid area (for guide line height) */
  totalHeight: number;
}
```

Implementation:
```tsx
'use client';

import React from 'react';
import styles from './DragGuideLines.module.css';

export interface DragGuideLinesProps {
  isDragging: boolean;
  dragMode: 'move' | 'resize-left' | 'resize-right' | null;
  left: number;
  width: number;
  totalHeight: number;
}

const DragGuideLines: React.FC<DragGuideLinesProps> = ({
  isDragging,
  dragMode,
  left,
  width,
  totalHeight,
}) => {
  if (!isDragging || !dragMode) {
    return null;
  }

  // Determine which lines to show based on drag mode
  const showLeftLine = dragMode === 'move' || dragMode === 'resize-left';
  const showRightLine = dragMode === 'move' || dragMode === 'resize-right';

  return (
    <>
      {showLeftLine && (
        <div
          className={styles.guideLine}
          style={{
            left: `${left}px`,
            height: `${totalHeight}px`,
          }}
        />
      )}
      {showRightLine && (
        <div
          className={styles.guideLine}
          style={{
            left: `${left + width}px`,
            height: `${totalHeight}px`,
          }}
        />
      )}
    </>
  );
};

export default DragGuideLines;
```

CSS (DragGuideLines.module.css):
```css
.guideLine {
  position: absolute;
  top: 0;
  width: 2px;
  background-color: var(--gantt-drag-guide-line-color, #3b82f6);
  z-index: 20;
  pointer-events: none;
  opacity: 0.6;
}
```
  </action>
  <verify>
TypeScript compilation: npx tsc --noEmit
File exists: src/components/DragGuideLines/DragGuideLines.tsx
File exists: src/components/DragGuideLines/DragGuideLines.module.css
  </verify>
  <done>
DragGuideLines component renders vertical lines at left and left+width positions
Lines only render when isDragging=true and dragMode is set
showLeftLine is true for 'move' and 'resize-left' modes
showRightLine is true for 'move' and 'resize-right' modes
CSS uses position: absolute, z-index: 20, pointer-events: none
  </done>
</task>

<task type="auto">
  <name>Add drag state callback to useTaskDrag and TaskRow</name>
  <files>src/hooks/useTaskDrag.ts, src/components/TaskRow/TaskRow.tsx</files>
  <action>
First, update useTaskDrag.ts to support drag state callback:

Add to UseTaskDragOptions interface:
```typescript
export interface UseTaskDragOptions {
  // ... existing props ...
  /** Callback for drag state changes (for parent components to render guide lines) */
  onDragStateChange?: (state: {
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
  }) => void;
}
```

Add the callback to the hook options destructuring:
```typescript
export const useTaskDrag = (options: UseTaskDragOptions): UseTaskDragReturn => {
  const {
    // ... existing destructuring ...
    onDragStateChange,
    edgeZoneWidth = 12,
  } = options;
```

Call the callback when drag state changes:

1. In handleMouseDown, after setting initial drag state:
```typescript
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
```

2. In handleMouseMove, during RAF update:
```typescript
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
```

3. In handleMouseUp, after resetting drag state:
```typescript
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
```

Second, update TaskRow.tsx to propagate the callback:

1. Add onDragStateChange to TaskRowProps interface:
```typescript
export interface TaskRowProps {
  // ... existing props ...
  /** Callback when task drag state changes (for rendering guide lines) */
  onDragStateChange?: (state: {
    isDragging: boolean;
    dragMode: 'move' | 'resize-left' | 'resize-right' | null;
    left: number;
    width: number;
  }) => void;
}
```

2. Pass it to useTaskDrag:
```typescript
const {
  isDragging,
  dragMode,
  currentLeft,
  currentWidth,
  dragHandleProps,
} = useTaskDrag({
  taskId: task.id,
  initialStartDate: taskStartDate,
  initialEndDate: taskEndDate,
  monthStart,
  dayWidth,
  onDragEnd: handleDragEnd,
  onDragStateChange,  // Add this
  edgeZoneWidth: 20,
});
```
  </action>
  <verify>
TypeScript compilation: npx tsc --noEmit
useTaskDrag has onDragStateChange in options interface
useTaskDrag calls onDragStateChange in handleMouseDown
useTaskDrag calls onDragStateChange in handleMouseMove
useTaskDrag calls onDragStateChange in handleMouseUp
TaskRow has onDragStateChange in props interface
TaskRow passes onDragStateChange to useTaskDrag
  </verify>
  <done>
onDragStateChange callback is wired from TaskRow -> useTaskDrag
Callback fires on drag start with isDragging: true
Callback fires during drag with updated left/width
Callback fires on drag end with isDragging: false
  </done>
</task>

<task type="auto">
  <name>Integrate DragGuideLines in GanttChart</name>
  <files>src/components/GanttChart/GanttChart.tsx</files>
  <action>
Update GanttChart.tsx to:
1. Import DragGuideLines component
2. Track drag state from the currently dragged task
3. Render DragGuideLines at the taskArea level

1. Add import at top:
```typescript
import DragGuideLines from '../DragGuideLines';
```

2. Add state for tracking drag guide lines (after other state declarations):
```typescript
// Track drag state for guide lines
const [dragGuideLines, setDragGuideLines] = useState<{
  isDragging: boolean;
  dragMode: 'move' | 'resize-left' | 'resize-right' | null;
  left: number;
  width: number;
} | null>(null);
```

3. Create handler for drag state changes:
```typescript
const handleDragStateChange = useCallback((state: {
  isDragging: boolean;
  dragMode: 'move' | 'resize-left' | 'resize-right' | null;
  left: number;
  width: number;
}) => {
  if (state.isDragging) {
    setDragGuideLines(state);
  } else {
    setDragGuideLines(null);
  }
}, []);
```

4. Pass handleDragStateChange to TaskRow component:
```typescript
{tasks.map((task) => (
  <TaskRow
    key={task.id}
    task={task}
    monthStart={monthStart}
    dayWidth={dayWidth}
    rowHeight={rowHeight}
    onChange={handleTaskChange}
    onDragStateChange={handleDragStateChange}
  />
))}
```

5. Render DragGuideLines inside taskArea (after TodayIndicator, before TaskRow loop):
```typescript
{/* Drag guide lines - rendered during drag/resize operations */}
{dragGuideLines && (
  <DragGuideLines
    isDragging={dragGuideLines.isDragging}
    dragMode={dragGuideLines.dragMode}
    left={dragGuideLines.left}
    width={dragGuideLines.width}
    totalHeight={totalGridHeight}
  />
)}
```

The component should be placed inside the taskArea div, after GridBackground and TodayIndicator, to ensure guide lines appear above the grid but are positioned at the taskArea level (so they span all rows).
  </action>
  <verify>
TypeScript compilation: npx tsc --noEmit
DragGuideLines imported in GanttChart
dragGuideLines state exists
handleDragStateChange callback exists
onDragStateChange passed to TaskRow
DragGuideLines rendered conditionally when dragGuideLines is not null
  </verify>
  <done>
DragGuideLines component renders inside taskArea
Guide lines appear when dragging any task
Guide lines disappear when drag ends
Lines span full grid height (totalGridHeight passed as prop)
  </done>
</task>

</tasks>

<verification>
Overall verification steps after completing all tasks:

1. TypeScript check: npx tsc --noEmit (no errors)

2. Visual verification - Move drag:
   - Create multiple tasks on different rows
   - Drag a task by the middle (move mode)
   - Verify TWO blue vertical lines appear (at task start and end)
   - Verify lines extend from top to bottom of the task area (all rows)
   - Verify lines follow the task as you drag
   - Verify lines disappear when you release mouse

3. Visual verification - Resize drag:
   - Drag a task by the left edge (resize-left mode)
   - Verify ONE blue vertical line appears at the left edge
   - Verify the line follows the left edge as you resize
   - Drag a task by the right edge (resize-right mode)
   - Verify ONE blue vertical line appears at the right edge
   - Verify the line follows the right edge as you resize

4. Visual consistency:
   - Guide lines should be semi-transparent blue (similar to drag shadow)
   - Lines should be thin (2px) and crisp
   - Lines should not interfere with mouse events (pointer-events: none)
   - Lines should appear above grid lines (z-index: 20)

5. Edge cases:
   - Multiple tasks: dragging one task should only show that task's guide lines
   - Task at edge of grid: guide lines should be visible at grid boundaries
   - Rapid drag: lines should update smoothly at 60fps (use existing RAF mechanism)
</verification>

<success_criteria>
- Vertical blue guide lines appear during task drag/resize operations
- Move mode shows two guide lines (left and right edges)
- Resize-left mode shows one guide line at left edge
- Resize-right mode shows one guide line at right edge
- Guide lines span the full height of the calendar grid (all rows)
- Guide lines update smoothly during drag (60fps)
- Guide lines disappear when drag completes
- No TypeScript errors
- No visual artifacts or performance issues
</success_criteria>

<output>
After completion, create `.planning/quick/6-guide-lines/6-SUMMARY.md`
</output>
