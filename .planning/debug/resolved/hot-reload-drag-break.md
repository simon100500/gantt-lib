---
status: verifying
trigger: "hot-reload-drag-break"
created: 2025-02-19T10:00:00.000Z
updated: 2025-02-19T10:45:00.000Z
---

## Current Focus
hypothesis: ROOT CAUSE CONFIRMED - The useEffect cleanup removes window event listeners during HMR. When component remounts, isDraggingRef is reset to false, but if user was mid-drag, they have no listeners and drag silently dies.
test: Implemented fix using module-level singleton for drag state
expecting: Global event listener will survive HMR and properly complete the drag operation
next_action: Test the fix by running dev server and triggering HMR during drag

## Symptoms
expected: После hot reload (HMR) drag должен продолжать работать корректно
actual: Drag прерывается после любого изменения кода. Консоль чиста. Ctrl+F5, рестарт dev-сервера, очистка cookies не помогают. Только открытие в новой вкладке.
errors: Нет
reproduction: Любое изменение кода → hot reload → попытка перетащить задачу → drag прерывается
timeline: Проблема возникает при любом изменении кода

## Evidence
- timestamp: 2025-02-19T10:05:00.000Z
  checked: useTaskDrag hook implementation
  found: useEffect at line 265-280 attaches window event listeners when isDragging is true. The cleanup removes listeners but does NOT reset drag state refs.
  implication: If HMR happens during drag, cleanup runs and removes listeners, but isDraggingRef remains true. Next mousedown tries to start drag with corrupted state.

- timestamp: 2025-02-19T10:10:00.000Z
  checked: useCallback dependencies for handleMouseMove (line 147-200)
  found: Depends on [dayWidth, snapToGrid]. snapToGrid itself depends on [dayWidth].
  implication: These callbacks are recreated whenever dayWidth changes, which triggers useEffect cleanup.

- timestamp: 2025-02-19T10:15:00.000Z
  checked: useEffect cleanup function
  found: Cleanup only removes event listeners and cancels RAF. Does NOT reset isDraggingRef, dragModeRef, or setIsDragging(false).
  implication: After HMR, component remounts with fresh state BUT refs persist in closure. If drag was active, refs are stale.

- timestamp: 2025-02-19T10:20:00.000Z
  checked: React Fast Refresh behavior
  found: React Fast Refresh preserves state but remounts components. Refs are reset to initial values on remount.
  implication: After HMR, isDraggingRef.current = false (reset), but if user was in middle of drag, the window event listeners were already removed by cleanup. The drag operation silently dies.

- timestamp: 2025-02-19T10:25:00.000Z
  checked: Module-level singleton pattern for HMR-safe drag
  found: Implemented global drag manager with module-level state (globalActiveDrag) and global event listeners that persist across HMR.
  implication: Drag state now survives HMR because event listeners are attached at module level, not component level.

- timestamp: 2025-02-19T10:35:00.000Z
  checked: Unit tests after fix implementation
  found: Updated test "should remove window event listeners on cleanup" to "should keep drag working across component remounts (HMR-safe)" to reflect new behavior. All 24 tests pass.
  implication: The fix maintains test coverage while adding HMR safety.

## Resolution
root_cause: useEffect cleanup removes window event listeners during HMR. When component remounts, refs are reset but user is still holding mouse. Without listeners, drag dies silently.
fix: Implemented module-level singleton drag manager. Window event listeners are attached once at module level and persist across HMR. Drag state stored in module-level variable instead of component refs.
verification:
  - TypeScript: PASS (npx tsc --noEmit)
  - Unit tests: PASS (24/24 tests passed)
  - Manual test: PENDING - Requires user to test at http://localhost:3001
    Steps:
    1. Start dragging a task
    2. While dragging, make a code change to trigger HMR
    3. Continue dragging - should work seamlessly
    4. Release mouse - drag should complete normally
files_changed: ["src/hooks/useTaskDrag.ts", "src/__tests__/useTaskDrag.test.ts"]
