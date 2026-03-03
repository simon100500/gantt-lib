# Quick Task 52 Summary

## What was done
Created `DepIcons.tsx` as the single source of truth for all dependency type icons.

## Files changed
- `packages/gantt-lib/src/components/TaskList/DepIcons.tsx` — new file with DepIconFS/SS/FF/SF + LINK_TYPE_ICONS
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` — removed inline icon definitions, imports from DepIcons
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — removed inline icon definitions + stale comment, imports from DepIcons

## Notable fix
TaskListRow.tsx had FS and FF icons swapped relative to TaskList.tsx. Both files now use the same canonical definitions from DepIcons.tsx.

## Commit
7ad62a3
