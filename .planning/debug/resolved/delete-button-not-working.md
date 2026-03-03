---
status: resolved
resolved: 2026-03-03
commit: de805d4
trigger: "delete-button-not-working"
created: 2026-03-03T00:00:00.000Z
updated: 2026-03-03T00:00:13.000Z
---

## Current Focus
hypothesis: REGRESSION FIXED - Updated onInteractOutside to check for BOTH .gantt-tl-dep-delete-label AND .gantt-tl-dep-chip-trash
test: Applied fix, build succeeded
expecting: Both delete buttons (parent "Удалить связь" and chip X) should now work
next_action: Awaiting human verification

## Extended Symptoms (NEW ISSUE)
expected: Clicking "Удалить связь" button on predecessor row should delete the selected dependency
actual: Button does nothing when clicked
errors: No errors reported
reproduction: 1) Click a dependency chip to select it, 2) See "Удалить связь" button appear on predecessor row, 3) Click that button, 4) Nothing happens
started: Same time as chip delete button issue

## Symptoms
expected: Dependency removed from both tasks and the dependency line disappears from the chart
actual: Clicking the Delete (X) button on the dependency chip produces no response at all
errors: No errors in browser console (F12)
reproduction: 1) Open the gantt chart, 2) Find a task with dependencies (shown as chips), 3) Click the Delete (X) button on the dependency chip, 4) Nothing happens
started: Recently broken - it used to work before

## Eliminated
- hypothesis: "Delete button on dependency chip has no click handler or the handler is not properly wired"
  evidence: The handler exists and is properly wired to onClick={handleTrashClick}
  timestamp: 2026-03-03T00:00:01.000Z
- hypothesis: "CSS pointer-events or overlay blocking parent delete button"
  evidence: CSS check shows cursor: pointer, no pointer-events: none, no overlays
  timestamp: 2026-03-03T00:00:07.000Z

## Evidence
- timestamp: 2026-03-03T00:00:01.000Z
  checked: TaskListRow.tsx DepChip component structure
  found: The trash button has onClick={handleTrashClick} handler that calls onRemoveDependency and onChipSelectClear
  implication: The handler is properly wired, but something is preventing it from executing
- timestamp: 2026-03-03T00:00:01.000Z
  checked: Recent commits that modified DepChip
  found: Commit a76a261 (quick-055) changed Popover from local state (popoverOpen) to controlled (isSelected) and added onOpenChange={(open) => { if (!open) onChipSelectClear(); }}
  implication: The Popover wrapper structure changed - trash button is INSIDE Popover root but OUTSIDE PopoverTrigger
- timestamp: 2026-03-03T00:00:02.000Z
  checked: Git diff d00a550..a76a261
  found: Before: open={popoverOpen} onOpenChange={setPopoverOpen} (local state). After: open={isSelected} onOpenChange={(open) => { if (!open) onChipSelectClear(); }} (clears selection)
  implication: Clicking trash button triggers Popover dismiss which calls onChipSelectClear BEFORE handleTrashClick can execute properly
- timestamp: 2026-03-03T00:00:03.000Z
  checked: Fix implementation
  found: Moved PopoverTrigger wrapper to encompass both chip span and trash button
  implication: Trash button click is now part of PopoverTrigger area, won't trigger dismiss
- timestamp: 2026-03-03T00:00:04.000Z
  checked: Build verification
  found: Build succeeded with no TypeScript errors
  implication: Fix compiles correctly, ready for testing
- timestamp: 2026-03-03T00:00:06.000Z
  checked: Parent "Удалить связь" button (gantt-tl-dep-delete-label) at lines 396-404
  found: Button has onClick={handleDeleteSelected}, handler calls e.stopPropagation(), checks selectedChip, calls onRemoveDependency
  implication: Handler looks correct, button should work
- timestamp: 2026-03-03T00:00:06.000Z
  checked: isSelectedPredecessor condition at line 303
  found: const isSelectedPredecessor = selectedChip != null && selectedChip.predecessorId === task.id
  implication: Button only shows when this row IS the predecessor of the selected chip
- timestamp: 2026-03-03T00:00:06.000Z
  checked: CSS for gantt-tl-dep-delete-label
  found: cursor: pointer, no pointer-events: none, normal display properties
  implication: No CSS blocking clicks
- timestamp: 2026-03-03T00:00:07.000Z
  checked: Parent div onClick handler
  found: onClick={isPicking && !isSourceRow ? handlePredecessorPick : undefined}
  implication: When picking mode is active, parent cell click triggers handlePredecessorPick, but button's stopPropagation should prevent this
- timestamp: 2026-03-03T00:00:07.000Z
  checked: Added logging to handleDeleteSelected
  found: Added console.log statements to track handler execution and selectedChip state
  implication: Will reveal if handler is called and what selectedChip value is when clicked
- timestamp: 2026-03-03T00:00:09.000Z
  checked: User reports NO console logs when clicking "Удалить связь" button
  found: handleDeleteSelected handler is NOT being called at all - click is intercepted before reaching the handler
  implication: Something is blocking the click event from reaching the button's onClick handler
- timestamp: 2026-03-03T00:00:09.000Z
  checked: Z-index values and Radix Popover behavior
  found: Popover has z-index: 1000 (higher than TaskList z-index: 15). Radix creates a dismiss overlay when open that covers viewport to detect outside clicks
  implication: When chip is selected (Popover open), the dismiss overlay covers the entire page including the "Удалить связь" button on the predecessor row
- timestamp: 2026-03-03T00:00:10.000Z
  checked: Radix Popover onOpenChange handler on line 103
  found: `onOpenChange={(open) => { if (!open) onChipSelectClear(); }}` - When clicking outside (delete button), Popover fires onOpenChange(false) which calls onChipSelectClear() BEFORE the button's onClick can fire
  implication: Race condition - Popover dismiss clears selectedChip, button disappears, and onClick handler never executes
- timestamp: 2026-03-03T00:00:10.000Z
  checked: Radix UI documentation for preventing outside dismiss
  found: Can use onInteractOutside on PopoverContent to check click target and call event.preventDefault() to prevent dismiss
  implication: Fix: Use onInteractOutside to check if clicking .gantt-tl-dep-delete-label and prevent dismiss
- timestamp: 2026-03-03T00:00:11.000Z
  checked: Fix implementation and build verification
  found: 1) Added onInteractOutside prop to PopoverContent wrapper, 2) Modified DepChip to use onInteractOutside with check for .gantt-tl-dep-delete-label, 3) Build succeeded with no TypeScript errors
  implication: Fix is compiled and ready for testing
- timestamp: 2026-03-03T00:00:12.000Z
  checked: User verification - Parent delete button now works
  found: Parent "Удалить связь" button fix was successful, but chip trash button (X) stopped working
  implication: REGRESSION - onInteractOutside only checks .gantt-tl-dep-delete-label, not .gantt-tl-dep-chip-trash
- timestamp: 2026-03-03T00:00:13.000Z
  checked: Chip trash button class name
  found: Chip trash button has class "gantt-tl-dep-chip-trash" at line 115
  implication: Need to add this selector to onInteractOutside check
- timestamp: 2026-03-03T00:00:13.000Z
  checked: Updated onInteractOutside handler
  found: Added || target?.closest?.('.gantt-tl-dep-chip-trash') to the check alongside .gantt-tl-dep-delete-label
  implication: Both delete buttons are now protected from Popover dismiss
- timestamp: 2026-03-03T00:00:13.000Z
  checked: Build verification
  found: Build succeeded with no TypeScript errors
  implication: Fix compiles correctly, ready for testing

## Resolution
root_cause: REGRESSION - The onInteractOutside handler only checked for .gantt-tl-dep-delete-label (parent delete button), but the chip trash button has class .gantt-tl-dep-chip-trash. Clicking the chip trash button triggered Popover dismiss BEFORE onClick could fire.
fix: Updated onInteractOutside handler to check for BOTH .gantt-tl-dep-delete-label AND .gantt-tl-dep-chip-trash selectors
verification: Build succeeded. Awaiting human verification that both delete buttons work.
files_changed:
  - packages/gantt-lib/src/components/ui/Popover.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
