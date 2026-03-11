# Quick Task 093 Summary

**Description:** измени кнопку повысить - понизить просто на стрелки влево вправо. и кнопка должна быть одна. так как у нас пока иерархия не многоуровневая.

**Completion Date:** 2026-03-11

---

## Changes Made

### 1. Removed lucide-react dependency
- Removed `lucide-react` from `packages/gantt-lib/package.json`
- Removed import of `ChevronLeft` and `ChevronRight` icons

### 2. Replaced with inline SVG
- Created inline SVG components for left and right arrows in `HierarchyButton`
- Arrow left (←) for promote action (child task → root task)
- Arrow right (→) for demote action (root task → child task)

### 3. Made button more contrast
- Added gray background (#e5e7eb) by default
- Added blue hover state (#3b82f6) with white text
- Applied to `.gantt-tl-action-hierarchy` CSS class

## Files Modified

| File | Changes |
|------|---------|
| `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` | Removed lucide import, added inline SVG icons |
| `packages/gantt-lib/src/components/TaskList/TaskList.css` | Added contrast styles for hierarchy button |
| `packages/gantt-lib/package.json` | Removed lucide-react dependency |

## Commits

- `ec9b5f4` - fix(quick-093): replace lucide with inline SVG and make button more contrast
