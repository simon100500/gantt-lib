---
phase: 18-tasks-order
verified: 2026-03-09T17:57:00Z
status: gaps_found
score: 5/11 must-haves verified
gaps:
  - truth: "Drag handle (⋮⋮ grip icon) appears left of row number on row hover"
    status: passed
    reason: "CSS and DragHandleIcon SVG implemented correctly in TaskListRow.tsx"
  - truth: "Grabbing the handle and dragging reorders the row to the drop position"
    status: failed
    reason: "TaskList.tsx does NOT have drag state (draggingIndex, dragOverIndex, dragOriginIndexRef) or handlers (handleDragStart, handleDragOver, handleDrop, handleDragEnd). TaskListRow accepts drag props but TaskList doesn't provide them."
    artifacts:
      - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
        issue: "Missing drag state and handlers. Line 76 destructure onReorder but no drag state or callbacks implemented."
    missing:
      - "Add drag state: draggingIndex, dragOverIndex, dragOriginIndexRef (useState, useRef)"
      - "Add handleDragStart, handleDragOver, handleDrop, handleDragEnd callbacks"
      - "Pass drag props (isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd) to TaskListRow components"
  - truth: "The dragged row becomes semi-transparent (opacity 0.4) during drag"
    status: partial
    reason: "CSS class .gantt-tl-row-dragging exists with opacity 0.4, but TaskList never applies it (no drag state to pass isDragging prop to TaskListRow)"
    artifacts:
      - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
        issue: "isDragging prop never computed or passed to TaskListRow"
  - truth: "A blue top-border indicator shows where the row will be dropped"
    status: partial
    reason: "CSS class .gantt-tl-row-drag-over exists with blue top border, but TaskList never applies it (no dragOverIndex state)"
    artifacts:
      - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
        issue: "isDragOver prop never computed or passed to TaskListRow"
  - truth: "Row numbers update only after drop, not during drag"
    status: passed
    reason: "Row numbers use rowIndex prop which is stable during drag (drag state doesn't affect rendering until drop)"
  - truth: "Pressing Escape during drag cancels — row returns to original position, onReorder NOT called"
    status: failed
    reason: "No drag handlers implemented in TaskList, so no Escape handling exists"
    artifacts:
      - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
        issue: "handleDragEnd callback not implemented (would clear state without calling onReorder)"
  - truth: "After successful drop, the moved task becomes selected (highlighted)"
    status: failed
    reason: "No handleDrop implementation, so no onTaskSelect call after reorder"
    artifacts:
      - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
        issue: "handleDrop callback not implemented (should call onTaskSelect?.(moved.id))"
  - truth: "Dependency arrows automatically redraw to reflect new task order"
    status: passed
    reason: "Automatic — DependencyLines receives tasks array prop, re-renders when tasks order changes via onReorder callback"
  - truth: "onReorder is called once on drop with the full reordered tasks array"
    status: failed
    reason: "No handleDrop implementation in TaskList, so onReorder never called"
    artifacts:
      - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
        issue: "handleDrop callback not implemented (should splice array and call onReorder?.(reordered))"
  - truth: "reorderTasks(tasks, from, to) returns a correctly reordered array without mutating the original"
    status: passed
    reason: "reorderTasks.test.ts has 7 passing tests covering all reorder scenarios"
    evidence:
      - path: "packages/gantt-lib/src/__tests__/reorderTasks.test.ts"
        test_count: 7
        all_passed: true
  - truth: "reorderTasks is a no-op when fromIndex === toIndex"
    status: passed
    reason: "Test case 'returns unchanged array when fromIndex === toIndex' passes"
    evidence:
      - path: "packages/gantt-lib/src/__tests__/reorderTasks.test.ts"
        test_name: "returns unchanged array when fromIndex === toIndex"
        passed: true
  - truth: "reorderTasks handles boundary indices (first and last rows)"
    status: passed
    reason: "Test cases 'handles boundary: moves first to last with 2 tasks' and 'handles boundary: moves last to first with 4 tasks' pass"
    evidence:
      - path: "packages/gantt-lib/src/__tests__/reorderTasks.test.ts"
        test_count: 2
        boundary_tests_passed: true
  - truth: "GanttChart accepts onReorder prop and passes it through to TaskList"
    status: passed
    reason: "GanttChartProps interface has onReorder prop (line 117), handleReorder callback implemented (lines 407-410), onReorder passed to TaskList (line 536)"
    evidence:
      - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
        interface_prop: "onReorder?: (tasks: Task[]) => void"
        callback: "handleReorder calls onChange then onReorder"
        threaded: "onReorder={handleReorder} passed to TaskList"
  - truth: "Demo page handleReorder callback wired to GanttChart onReorder prop"
    status: failed
    reason: "packages/website/src/app/page.tsx does NOT have handleReorder callback or onReorder prop in GanttChart"
    artifacts:
      - path: "packages/website/src/app/page.tsx"
        issue: "Missing handleReorder callback and onReorder prop wiring"
    missing:
      - "Add handleReorder callback: const handleReorder = useCallback((reorderedTasks: Task[]) => { setTasks(reorderedTasks); }, []);"
      - "Add onReorder={handleReorder} to <GanttChart /> component"
---

# Phase 18: Tasks Order Verification Report

**Phase Goal:** Enable task row reordering with drag-and-drop — users drag rows to change order
**Verified:** 2026-03-09T17:57:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | Drag handle (⋮⋮ grip icon) appears left of row number on row hover | ✓ PASSED | DragHandleIcon SVG in TaskListRow.tsx lines 44-53, CSS .gantt-tl-drag-handle with opacity transition in TaskList.css lines 107-129 |
| 2   | Grabbing the handle and dragging reorders the row to the drop position | ✗ FAILED | TaskList.tsx missing drag state and handlers — no draggingIndex, dragOverIndex, handleDragStart, handleDragOver, handleDrop, handleDragEnd |
| 3   | The dragged row becomes semi-transparent (opacity 0.4) during drag | ⚠️ PARTIAL | CSS class .gantt-tl-row-dragging exists (line 132) but never applied — TaskList doesn't pass isDragging prop to TaskListRow |
| 4   | A blue top-border indicator shows where the row will be dropped | ⚠️ PARTIAL | CSS class .gantt-tl-row-drag-over exists (line 137) but never applied — TaskList doesn't pass isDragOver prop to TaskListRow |
| 5   | Row numbers update only after drop, not during drag | ✓ PASSED | Row numbers use stable rowIndex prop — drag state doesn't affect rendering until drop |
| 6   | Pressing Escape during drag cancels — row returns to original position, onReorder NOT called | ✗ FAILED | No handleDragEnd implementation in TaskList — no Escape handling |
| 7   | After successful drop, the moved task becomes selected (highlighted) | ✗ FAILED | No handleDrop implementation — no onTaskSelect call after reorder |
| 8   | Dependency arrows automatically redraw to reflect new task order | ✓ PASSED | Automatic — DependencyLines receives tasks array prop, re-renders when order changes |
| 9   | onReorder is called once on drop with the full reordered tasks array | ✗ FAILED | No handleDrop implementation in TaskList — onReorder never called |
| 10  | reorderTasks(tasks, from, to) returns a correctly reordered array without mutating the original | ✓ PASSED | reorderTasks.test.ts: 7/7 tests passing, verified splice logic |
| 11  | reorderTasks is a no-op when fromIndex === toIndex | ✓ PASSED | Test case passes: returns unchanged array when fromIndex === toIndex |
| 12  | reorderTasks handles boundary indices (first and last rows) | ✓ PASSED | Boundary test cases pass: first→last, last→first |
| 13  | GanttChart accepts onReorder prop and passes it through to TaskList | ✓ PASSED | GanttChartProps.onReorder (line 117), handleReorder callback (lines 407-410), passed to TaskList (line 536) |
| 14  | Demo page handleReorder callback wired to GanttChart onReorder prop | ✗ FAILED | packages/website/src/app/page.tsx missing handleReorder callback and onReorder prop |

**Score:** 5/11 core feature truths verified (45%)

**Breakdown:**
- ✓ PASSED: 5 truths (drag handle UI, row numbers stable, deps redraw, reorderTests logic, GanttChart API)
- ⚠️ PARTIAL: 2 truths (CSS classes exist but not wired)
- ✗ FAILED: 7 truths (no drag state/handlers, no demo wiring)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/gantt-lib/src/__tests__/reorderTasks.test.ts` | Unit tests for reorderTasks pure function | ✓ VERIFIED | 7/7 tests passing, covers all reorder scenarios (first→last, last→first, no-op, boundaries, immutability) |
| `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` | onReorder prop in GanttChartProps, handleReorder callback, prop threaded to TaskList | ✓ VERIFIED | Interface line 117, callback lines 407-410, passed to TaskList line 536 |
| `packages/gantt-lib/src/components/TaskList/TaskList.tsx` | drag state (draggingIndex, dragOverIndex, dragOriginIndexRef), handleDragStart/Over/Drop/End callbacks, onReorder prop implementation | ✗ STUB | onReorder prop destructured (line 76) but NO drag state or handlers implemented — this is the critical gap |
| `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` | drag handle element in number cell, isDragging/isDragOver CSS class application, onDragOver/onDrop on row div | ✓ VERIFIED | DragHandleIcon lines 44-53, drag props interface lines 194-205, drag handle span lines 464-475, row div with drag classes lines 444-456 |
| `packages/gantt-lib/src/components/TaskList/TaskList.css` | .gantt-tl-drag-handle, .gantt-tl-row-dragging, .gantt-tl-row-drag-over CSS classes | ✓ VERIFIED | Drag handle styles lines 107-129, dragging opacity line 132, drag-over border line 137 |
| `packages/website/src/app/page.tsx` | handleReorder callback wired to GanttChart onReorder prop | ✗ MISSING | No handleReorder callback found, no onReorder prop in GanttChart component |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| GanttChart handleReorder | TaskList onReorder | `onReorder={handleReorder}` prop | ✓ WIRED | GanttChart.tsx line 536 passes handleReorder to TaskList |
| TaskListRow drag handle (draggable span) | TaskList handleDragStart | `onDragStart` prop | ✗ NOT_WIRED | TaskListRow accepts onDragStart prop (line 199) but TaskList doesn't provide it |
| TaskListRow row div | TaskList handleDrop | `onDrop` prop | ✗ NOT_WIRED | TaskListRow accepts onDrop prop (line 202) and has onDrop handler (line 456) but TaskList doesn't provide it |
| TaskList handleDrop | onReorder callback | splice reorder + `onReorder?.(reordered)` | ✗ NOT_WIRED | handleDrop not implemented in TaskList |
| Demo page handleReorder | GanttChart onReorder | `onReorder={handleReorder}` prop | ✗ NOT_WIRED | Demo page doesn't have handleReorder callback or onReorder prop |

### Requirements Coverage

**Phase 18 Requirement IDs:** none (UI feature, no new library API requirements)

No requirements to track — this is a pure UI feature phase.

### Anti-Patterns Found

| File | Issue | Severity | Impact |
| ---- | ----- | -------- | ------ |
| None | No TODO/FIXME/placeholder comments found | — | Clean codebase |

### Human Verification Required

**Status:** BLOCKED — Cannot proceed to human verification until automated gaps are closed.

**Required human tests (after gaps fixed):**
1. **Drag handle visibility** — Hover over any task row, verify grip handle (⋮⋮ icon) appears left of row number
2. **Drag reordering** — Drag a row by grip handle to different position, verify row numbers update after drop
3. **Visual feedback** — During drag, verify dragged row is semi-transparent and blue top-border shows on drop target
4. **Escape cancel** — Start dragging, press Escape, verify row returns to original position without changes
5. **Selection after drop** — After drop, verify moved row is highlighted (selected state)
6. **Dependency redraw** — After reorder, verify dependency arrows redraw for new task order
7. **Console verification** — Add console.log in handleReorder, verify it fires once on drop

### Gaps Summary

**Phase 18 is INCOMPLETE.** The plan was partially executed:

**What Works (Plan 01 - API Foundation):**
- ✓ reorderTests unit tests implemented and passing (7/7)
- ✓ GanttChart onReorder prop added and threaded to TaskList
- ✓ TaskListRow drag props interface defined
- ✓ DragHandleIcon SVG component created
- ✓ CSS styles for drag handle and states implemented

**What's Missing (Plan 02 - Drag UI):**
- ✗ TaskList drag state NOT implemented (draggingIndex, dragOverIndex, dragOriginIndexRef)
- ✗ TaskList drag handlers NOT implemented (handleDragStart, handleDragOver, handleDrop, handleDragEnd)
- ✗ TaskList drag props NOT passed to TaskListRow (isDragging, isDragOver, all drag callbacks)
- ✗ Demo page handleReorder callback NOT implemented
- ✗ Demo page onReorder prop NOT wired to GanttChart

**Root Cause:** Plan 02 Task 3 was documented as complete in 18-02-SUMMARY.md but the actual implementation is missing from TaskList.tsx. The SUMMARY claims "TaskList has drag state, 4 drag callbacks, passes drag props to TaskListRow" but the code shows none of this exists.

**Impact:** The drag-to-reorder feature is NON-FUNCTIONAL. Users cannot drag rows to reorder them. The UI elements (drag handle, CSS) exist but are not wired to any behavior.

**Next Steps:**
1. Implement TaskList drag state and handlers (Plan 02 Task 3 Step 4-6)
2. Wire demo page handleReorder callback (Plan 02 Task 3 page.tsx changes)
3. Re-run verification to confirm all 11 truths pass
4. Conduct human verification checkpoint

---

_Verified: 2026-03-09T17:57:00Z_
_Verifier: Claude (gsd-verifier)_
