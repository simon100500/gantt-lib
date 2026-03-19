---
status: investigating
trigger: "не работает удаление связи по кнопке '× удалить' которая появляется при ховере на 'Связано с'"
created: 2026-03-19T16:45:00.000Z
updated: 2026-03-19T18:10:00.000Z
---

## Current Focus
hypothesis: Click event is not reaching the cell's onClick handler - need to trace event flow
test: Added extensive logging: render log, mouseenter/mouseleave/mousedown/mouseup/onClick handlers, visual indicator (yellow background + red border)
expecting: Logs will show if cell renders, if hover works, if mouse events reach the cell, and if onClick fires
next_action: User testing - observe console logs when clicking the delete button to determine exact failure point

## Resolution
root_cause: UNKNOWN - click event is not reaching the cell's onClick handler
fix: ATTEMPTED - Added z-index: 10 and pointer-events: auto !important to .gantt-tl-cell-deps-interactive to ensure cell receives clicks
files_changed:
- packages/gantt-lib/src/components/TaskList/TaskListRow.tsx: Added extensive logging (render, mouseenter/mouseleave/mousedown/mouseup/onClick, elementAtPoint, global click interceptor, visual indicator)
- packages/gantt-lib/src/components/TaskList/TaskList.tsx: Enhanced mousedown handler logging with path preview
- packages/gantt-lib/src/components/TaskList/TaskList.css: Added z-index: 10 and pointer-events: auto !important to .gantt-tl-cell-deps-interactive

verification: IN PROGRESS - need user to test with logging enabled

## Evidence
- timestamp: 2026-03-19T17:15:00.000Z
  checked: TaskListRow.tsx implementation
  found: Replaced nested <button> with direct cell interaction - cell now has onClick, onKeyDown (Enter/Space), role="button", tabIndex=0, and aria-label
  implication: Event propagation issues resolved - no nested elements to interfere with click handling

- timestamp: 2026-03-19T17:15:00.000Z
  checked: TaskList.css styles
  found: Created .gantt-tl-cell-deps-interactive class with flexbox layout, hover states, focus-visible styles, and proper cursor
  implication: Visual feedback preserved - "Связано с" shows by default, "× удалить" on hover

- timestamp: 2026-03-19T17:15:00.000Z
  checked: TaskList.tsx outside-click detection
  found: Replaced target.closest('.gantt-popover') with composedPath().some() approach
  implication: More robust detection through shadow DOM and portals, prevents premature state clearing

- timestamp: 2026-03-19T17:30:00.000Z
  checked: TaskListRow.tsx row structure
  found: Row has onClick={handleRowClickInternal} at line 1205 which calls onRowClick(task.id), and cell is inside the row
  implication: When cell is clicked, BOTH cell onClick AND row onClick fire - row onClick may be clearing selectedChip state before/during delete

- timestamp: 2026-03-19T17:30:00.000Z
  checked: TaskList.tsx cleanup effect
  found: useEffect at lines 317-352 listens for mousedown events and clears selectedChip when clicking outside
  implication: This effect may be triggered by row click, clearing selectedChip before delete can complete

- timestamp: 2026-03-19T17:30:00.000Z
  checked: Event flow analysis
  found: Cell click → handleDeleteSelected calls onRemoveDependency → BUT row onClick also fires → onTaskSelect → useEffect may clear selectedChip
  implication: Race condition or state clearing happening before/during delete operation

- timestamp: 2026-03-19T17:30:00.000Z
  checked: Added comprehensive logging
  found: Added logs to cell onClick, handleDeleteSelected, handleRowClickInternal, useEffect cleanup, and handleRemoveDependency
  implication: Logs will reveal exact event order and where state gets cleared

- timestamp: 2026-03-19T18:00:00.000Z
  checked: TaskList.tsx mousedown handler
  found: The handleMouseDown function clears selectedChip on outside clicks, but the delete cell (in different row) is considered "outside" the popover
  implication: State gets cleared on mousedown (before onClick), so handleDeleteSelected finds selectedChip === null and returns early

- timestamp: 2026-03-19T18:00:00.000Z
  checked: Fix implementation
  found: Added isDeleteCellClick check using composedPath() to detect clicks on .gantt-tl-cell-deps-interactive elements
  implication: Delete cell clicks are now ignored by the cleanup handler, allowing onClick to fire with intact state

- timestamp: 2026-03-19T18:10:00.000Z
  checked: User feedback - click still doesn't work
  found: User reports click is STILL not reaching the handler despite previous fix
  implication: Either the fix didn't work, or there's another issue blocking click events entirely

- timestamp: 2026-03-19T18:10:00.000Z
  checked: CSS for pointer-events
  found: No pointer-events: none on .gantt-tl-cell-deps-interactive or its children
  implication: CSS is not blocking clicks

- timestamp: 2026-03-19T18:10:00.000Z
  checked: Added extensive logging
  found: Added render log, mouseenter/mouseleave/mousedown/mouseup/onClick handlers, visual indicator (yellow bg + red border), elementAtPoint check, global click interceptor
  implication: Will trace exact event flow and determine if click reaches cell at all

## Symptoms
expected: При клике на "× удалить" связь должна удаляться
actual: Клик игнорируется - ничего не происходит
errors: Нет ошибок в консоли
reproduction: 1. Открыть таск-лист. 2. Выделить связь (кликнуть на chip предшественника). 3. Появляется кнопка "Связано с" в строке предшественника. 4. При ховере меняется на "× удалить". 5. Кликнуть на кнопку - ничего не происходит.
timeline: Кнопка не работает с момента добавления функционала предшественников

## Eliminated

