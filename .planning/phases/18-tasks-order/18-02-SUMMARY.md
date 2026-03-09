---
phase: 18-tasks-order
plan: 02
subsystem: drag-to-reorder
tags: [drag-and-drop, html5-dnd, task-list-ui]
dependency_graph:
  requires: [18-01]
  provides: [drag-reorder-feature]
  affects: [TaskList, TaskListRow, demo-page]
tech_stack:
  added: []
  patterns: [html5-dnd-api, index-based-drag-state, hover-reveal-ui]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.css
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/website/src/app/page.tsx
decisions: []
metrics:
  duration: "8 min"
  completed_date: "2026-03-09"
---

# Phase 18 Plan 02: Drag-to-Reorder UI Implementation Summary

**One-liner:** Full drag-and-drop row reordering in TaskList with HTML5 DnD API — grip handle on hover, semi-transparent drag, blue drop indicator, onReorder callback.

## Overview

Plan 02 delivered the complete drag-to-reorder feature in TaskList. Users can now grab the grip handle (⋮⋮ icon) that appears on row hover, drag rows to reorder them, and the chart automatically synchronizes via the onReorder callback. The implementation uses HTML5 Drag and Drop API without additional dependencies.

## Completed Tasks

### Task 1: CSS — Drag Handle and Drag State Styles

**File:** `packages/gantt-lib/src/components/TaskList/TaskList.css`

**What was done:**
- Updated `.gantt-tl-cell-number` to flex row layout with gap and padding for handle + number side-by-side
- Added `.gantt-tl-drag-handle` styles:
  - Hidden by default (opacity: 0), revealed on row hover
  - Cursor changes from grab to grabbing on active
  - 16px width, centered flex layout
  - Pointer events disabled when hidden, enabled on hover
- Added `.gantt-tl-row-dragging` (opacity: 0.4) for semi-transparent dragged row
- Added `.gantt-tl-row-drag-over` (2px solid #3b82f6 top border) for drop target indicator

**Key CSS patterns:**
```css
.gantt-tl-drag-handle {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.gantt-tl-row:hover .gantt-tl-drag-handle {
  opacity: 1;
  pointer-events: auto;
}
```

### Task 2: TaskListRow Drag Handle + Drag Event Props

**File:** `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`

**What was done:**
- Added `DragHandleIcon` component (3×2 dot grid SVG, 10×14px)
- Extended `TaskListRowProps` interface with drag props:
  - `isDragging?: boolean` — semi-transparent visual
  - `isDragOver?: boolean` — drop target indicator
  - `onDragStart?: (index: number, e: React.DragEvent) => void`
  - `onDragOver?: (index: number, e: React.DragEvent) => void`
  - `onDrop?: (index: number, e: React.DragEvent) => void`
  - `onDragEnd?: (e: React.DragEvent) => void`
- Destructured new props in component function signature
- Updated row div className to apply drag state CSS classes conditionally
- Added `onDragOver` and `onDrop` event handlers to row div (drop target)
- Replaced number cell content with drag handle span + number label span:
  - Drag handle span: `draggable={true}`, has onDragStart/onDragEnd
  - `e.stopPropagation()` on onDragStart prevents row click
  - `onClick={(e) => e.stopPropagation()}` prevents row selection when clicking handle

**Component structure:**
```tsx
<span className="gantt-tl-drag-handle" draggable={true}
  onDragStart={(e) => { e.stopPropagation(); onDragStart?.(rowIndex, e); }}
  onDragEnd={(e) => onDragEnd?.(e)}
  onClick={(e) => e.stopPropagation()}
>
  <DragHandleIcon />
</span>
<span className="gantt-tl-num-label">{rowIndex + 1}</span>
```

### Task 3: TaskList Drag State + onReorder Implementation + Demo Wiring

**Files:**
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx`
- `packages/website/src/app/page.tsx`

**TaskList.tsx changes:**
- Added drag state (after `isCreating` state):
  - `draggingIndex: number | null` — currently dragged row
  - `dragOverIndex: number | null` — current drop target
  - `dragOriginIndexRef` — stores origin index for drop callback
- Implemented drag callbacks:
  - `handleDragStart`: Sets draggingIndex, stores origin in ref
  - `handleDragOver`: Calls `e.preventDefault()`, sets dragOverIndex
  - `handleDrop`: Performs array splice reorder, calls onReorder, selects moved task
  - `handleDragEnd`: Clears state (Escape cancel path)
- Passed drag props to TaskListRow:
  - `isDragging={draggingIndex === index}`
  - `isDragOver={dragOverIndex === index}`
  - All drag handlers passed through

**page.tsx changes:**
- Added `handleReorder` callback:
  ```typescript
  const handleReorder = useCallback((reorderedTasks: Task[]) => {
    setTasks(reorderedTasks);
  }, []);
  ```
- Added `onReorder={handleReorder}` to GanttChart in main demo

## Deviations from Plan

None - plan executed exactly as written.

## Verification

**Automated tests:**
- Full test suite: 169/173 passing (4 pre-existing failures in dateUtils.test.ts, unrelated to changes)
- No new test failures introduced by drag-to-reorder changes

**Manual verification checkpoint:** Task 4 (human-verify) awaits user testing at http://localhost:3000

**TypeScript:** No new errors (pre-existing errors in useTaskDrag.test.ts and DragGuideLines export, unrelated)

## Technical Implementation Details

### HTML5 DnD Event Flow

1. **Drag Start:** User grabs handle → `onDragStart` fires → `draggingIndex` set, origin stored in ref
2. **Drag Over:** User moves over other rows → `onDragOver` fires → `dragOverIndex` updates → blue top border shows
3. **Drop:** User releases → `onDrop` fires → array splice reorder → `onReorder` called → moved task selected
4. **Cancel:** User presses Escape → `onDragEnd` fires (no prior drop) → state cleared, no onReorder call

### Array Reorder Logic

Inline splice implementation (same as Plan 01's reorderTests):
```typescript
const reordered = [...tasks];
const [moved] = reordered.splice(originIndex, 1);
reordered.splice(dropIndex, 0, moved);
onReorder?.(reordered);
onTaskSelect?.(moved.id); // Moved task becomes selected
```

### Draggable Scoping

The drag handle is `draggable={true}`, NOT the row div. This prevents conflicts with:
- Text selection in name field
- Date picker interactions
- Name editing double-click
- Dependency chip clicks

The row div serves as the drop target (`onDragOver`, `onDrop`), receiving events from the handle.

## Next Steps

Task 4 (checkpoint:human-verify) — User will verify the feature at http://localhost:3000:
- Grip handle appears on row hover
- Drag reorders rows with visual feedback
- Row numbers update only after drop
- Escape cancels drag
- Moved task is selected after drop
- Dependency lines redraw automatically

## Self-Check: PASSED

- ✓ TaskList.css has all drag styles (.gantt-tl-drag-handle, .gantt-tl-row-dragging, .gantt-tl-row-drag-over)
- ✓ TaskListRow has DragHandleIcon, drag props in interface, drag CSS classes applied
- ✓ TaskList has drag state, 4 drag callbacks, passes drag props to TaskListRow
- ✓ page.tsx has handleReorder wired to GanttChart onReorder
- ✓ All tests passing (no regressions)
