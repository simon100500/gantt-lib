---
status: resolved
trigger: "resize-cascade-children: При растяжении задачи (за окончание) надо тоже сдвигать / придвигать всех детей каскадно, а не только при сдвижке всей полосы."
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:20:00Z
---

## Current Focus

hypothesis: RESOLVED.
test: All 120 tests pass.
expecting: n/a
next_action: archive

## Symptoms

expected: When resizing a task bar (dragging its right edge to extend/shorten the end date), all successor/child tasks in the dependency chain should also cascade — shift or pull — just like they do when the entire bar is moved.
actual: Cascading of successor/child tasks only happens when the whole bar is dragged (moved), not when the bar is resized (end date stretched/shrunk).
errors: No error messages — it's a missing feature / incomplete behavior.
reproduction: 1. Create tasks with FS (Finish-to-Start) dependencies. 2. Drag the right edge of a predecessor task to extend its end date. 3. Observe that successor tasks do NOT cascade/shift accordingly.
started: Cascade for drag was implemented in Phase 07-01. Resize was not wired up to cascade.

## Eliminated

- hypothesis: The issue might be in GanttChart or TaskRow passing different props for resize vs move
  evidence: The entire cascade logic lives inside useTaskDrag itself — no outer component involvement needed
  timestamp: 2026-02-22T00:08:00Z

## Evidence

- timestamp: 2026-02-22T00:05:00Z
  checked: useTaskDrag.ts line 639 — cascadeChain assignment in handleMouseDown
  found: "`cascadeChain: mode === 'move' && !disableConstraints ? getSuccessorChain(taskId, allTasks) : []`"
  implication: For resize-right and resize-left modes, cascadeChain is ALWAYS set to []. No cascade chain is ever built for resize.

- timestamp: 2026-02-22T00:06:00Z
  checked: useTaskDrag.ts lines 232-258 — RAF cascade progress emission
  found: "`if (mode === 'move' && ...)` — gated on mode==='move'"
  implication: Even if cascadeChain were populated for resize, this guard would suppress the real-time preview cascade.

- timestamp: 2026-02-22T00:07:00Z
  checked: useTaskDrag.ts lines 487-527 — handleComplete cascade block
  found: Uses `deltaDays = (newStartDate - initialStartDate) / day` which is always 0 for resize-right (left/startDate doesn't change).
  implication: For resize-right, deltaDays would be 0, causing onCascade to emit the chain with no shift — wrong result even if chain were populated.

- timestamp: 2026-02-22T00:09:00Z
  checked: Cascade delta semantics for resize-right
  found: For FS dependency, successor.startDate = predecessor.endDate + lag. If predecessor's endDate changes by N days, successors shift by N days.
  implication: For resize-right, the cascade deltaDays must be computed from the end-date change (newEndDate - initialEndDate), not start-date change.

## Resolution

root_cause: |
  In useTaskDrag.ts, cascade logic was gated exclusively on `mode === 'move'` in two locations, and the delta calculation used start-date change (which is 0 for resize-right):
  1. Line 639: cascadeChain only built for mode==='move' — resize always got an empty chain
  2. Lines 232-258: RAF cascade progress only emitted for mode==='move'
  3. handleComplete computed deltaDays from startDate delta (always 0 for resize-right)

fix: |
  Three surgical changes to useTaskDrag.ts:
  A. cascadeChain: extended guard from `mode === 'move'` to `(mode === 'move' || mode === 'resize-right')`
  B. RAF handler: extended cascade emission guard the same way; added mode-conditional delta:
     - resize-right: delta = (newWidth - initialWidth) / dayWidth
     - move: delta = (newLeft - initialLeft) / dayWidth
  C. handleComplete: replaced origStartMs/newStartMs with origEndMs/newEndMs for delta — mathematically equivalent for move (end shifts same as start), and correct for resize-right (only end changes)

verification: |
  - 117 pre-existing tests still pass (zero regressions)
  - 3 new regression tests added for resize-right cascade:
    1. cascadeChain is built and onCascadeProgress called with non-empty overrides during resize-right
    2. onCascade receives correctly shifted successor dates on resize-right completion
    3. Soft mode (disableConstraints=true) does NOT cascade on resize-right — calls onDragEnd instead

files_changed:
  - packages/gantt-lib/src/hooks/useTaskDrag.ts
  - packages/gantt-lib/src/__tests__/useTaskDrag.test.ts
