---
status: resolved
trigger: "delete-dependency-button"
created: 2026-03-17T00:00:00.000Z
updated: 2026-03-19T19:45:00.000Z
resolved: 2026-03-19T19:45:00.000Z
---

## ROOT CAUSE FOUND

Three root causes were identified and fixed:

### 1. Missing `pointer-events: none` on child `<span>` elements
- **Evidence**: The predecessor delete button has two span elements for text labels
- **Fix**: Added `pointer-events: none` to `.gantt-tl-dep-delete-label-default` and `.gantt-tl-dep-delete-label-hover` in TaskList.css

### 2. `handleOpenChange` in `DepChip` was clearing `selectedChip` on automatic popover close
- **Evidence**: Radix Popover's `handleOpenChange` was called on ANY state change (including automatic close)
- **Fix**: Removed automatic `onChipSelect(null)` call from `handleOpenChange` - now only clears on explicit user actions

### 3. Missing `onClick` handler (was only `onMouseDown`)
- **Evidence**: Click events were not properly handled on the predecessor delete button
- **Fix**: The button now uses `onClick={handleDeleteSelected}` for proper event handling

### Additional Changes
- Simplified `handleDeleteSelected` to use optional chaining for dependencies (avoids stale closure)

## Applied Fixes

| File | Change |
|------|--------|
| `packages/gantt-lib/src/components/TaskList/TaskList.css` | Added `pointer-events: none` to `.gantt-tl-dep-delete-label-default` and `.gantt-tl-dep-delete-label-hover` |
| `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` | Fixed `handleOpenChange` in `DepChip`, simplified `handleDeleteSelected` with optional chaining |

## Verification Checklist
- [x] Клик на чип зависимости открывает popover и устанавливает `selectedChip`
- [x] `selectedChip` **не очищается** автоматически при закрытии popover
- [x] Клик на кнопку "× удалить" в ячейке предшественника удаляет связь
- [x] Клик на кнопку "Удалить связь" в popover работает
- [x] Клик на "×" (quick delete) внутри чипа работает
- [x] Escape и клик вне области корректно очищают состояние

## Timeline
- **2026-03-17T00:00** — Initial investigation
- **2026-03-17T01:00** — User clarification received
- **2026-03-19T16:45** — Debug session continued
- **2026-03-19T18:10** — Added extensive logging for event tracing
- **2026-03-19T19:00** — Discovered `pointer-events` issue
- **2026-03-19T19:15** — Discovered `handleOpenChange` issue
- **2026-03-19T19:30** — Discovered `onClick`/`onMouseDown` issue
- **2026-03-19T19:45** — All fixes applied and tested
