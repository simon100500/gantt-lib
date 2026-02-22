---
status: resolved
trigger: "fs-lag-changes-on-resize-left"
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:20:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED
test: all 129 tests pass including 2 new regression tests
expecting: n/a
next_action: archived

## Symptoms

expected: When stretching/resizing a parent task from the left (moving start date earlier, keeping end date fixed), FS dependency lag should remain unchanged. The child task should stay in place.
actual: The lag decreases as the parent is stretched left. It behaves as if the lag is anchored to the parent's start position rather than being a fixed delta from the parent's end.
errors: No error messages - purely visual/behavioral bug during drag resize.
reproduction: 1. Create a parent task with an FS dependency to a child task with some positive lag. 2. Resize the parent from the left (drag left edge to the left). 3. Observe the lag value - it decreases incorrectly.
timeline: Current codebase state, branch FF-SF-SS.

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-22T00:10:00Z
  checked: handleComplete in useTaskDrag.ts lines 547-611
  found: |
    On resize-left, startDate changes but endDate stays fixed.
    deltaFromStart = newStart - origStart (non-zero for resize-left).
    deltaFromEnd = newEnd - origEnd = 0 (end doesn't change).
    Line 577: deltaDays = deltaFromStart === 0 ? deltaFromEnd : deltaFromStart
      -> deltaFromStart != 0 so deltaDays = deltaFromStart (the start shift, e.g. -2)
    Line 582: chainForCompletion = deltaFromStart !== 0
      ? getSuccessorChain(taskId, allTasks, ['FS', 'SS'])   // WRONG for resize-left
      : getSuccessorChain(taskId, allTasks, ['FS'])
    Since deltaFromStart != 0, FS successors ARE included in chain.
    Then each FS successor is shifted by deltaDays (the start delta, e.g. -2 days).
    But for FS deps, successor is anchored to predecessor's END which did NOT change.
    So FS successors should not move at all during resize-left.
  implication: |
    This is the exact root cause. The code cannot distinguish resize-left from move
    because both have deltaFromStart != 0 and deltaFromEnd == 0 (for resize-left)
    or deltaFromEnd != 0 (for resize-right).
    Actually: resize-left has deltaFromStart != 0 AND deltaFromEnd == 0.
    Move has deltaFromStart != 0 AND deltaFromEnd != 0 (equal to deltaFromStart).
    So the fix is: use SS-only chain when deltaFromStart != 0 AND deltaFromEnd == 0.

- timestamp: 2026-02-22T00:12:00Z
  checked: live drag preview logic in handleGlobalMouseMove lines 270-273
  found: |
    The live preview CORRECTLY uses cascadeChainSS for resize-left:
      const activeChain =
        mode === 'resize-right' ? globalActiveDrag.cascadeChainFS :
        mode === 'resize-left'  ? globalActiveDrag.cascadeChainSS :
        /* move */                globalActiveDrag.cascadeChain;
    This is the correct behavior - SS only for resize-left.
    But handleComplete uses ['FS', 'SS'] for both move and resize-left.
  implication: |
    The live preview and completion logic are inconsistent.
    Fix must align handleComplete with the live preview logic.

## Resolution

root_cause: |
  In handleComplete (useTaskDrag.ts), the chain selection for cascade on drag completion
  cannot distinguish resize-left from move. Both have deltaFromStart != 0, so both use
  getSuccessorChain(['FS', 'SS']), causing FS successors to be incorrectly shifted by
  the predecessor's start delta on resize-left. Since FS deps anchor to the predecessor's
  END (which doesn't change during resize-left), FS successors should not move.

fix: |
  Detect resize-left as: deltaFromStart !== 0 AND deltaFromEnd === 0.
  For resize-left, use getSuccessorChain(['SS']) only (matching live preview).
  For move: deltaFromStart !== 0 AND deltaFromEnd !== 0, use ['FS', 'SS'].
  For resize-right: deltaFromStart === 0, use ['FS'].

verification: |
  All 129 tests pass (127 existing + 2 new regression tests).
  New tests verify:
    1. onCascade not called with FS successor when predecessor is resized left (no SS chain)
    2. onDragEnd called for dragged task only; FS successor task-2 dates unchanged.

files_changed:
  - packages/gantt-lib/src/hooks/useTaskDrag.ts
  - packages/gantt-lib/src/__tests__/useTaskDrag.test.ts
