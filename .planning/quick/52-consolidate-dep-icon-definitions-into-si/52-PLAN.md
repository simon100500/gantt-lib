# Quick Task 52: consolidate dep icon definitions into single shared location

## Task
Extract DepIconFS/SS/FF/SF + LINK_TYPE_ICONS from TaskList.tsx and TaskListRow.tsx into a shared DepIcons.tsx file.

## Tasks
1. Create `DepIcons.tsx` with canonical icon components and `LINK_TYPE_ICONS` export
2. Update `TaskList.tsx` to remove inline definitions and import from `./DepIcons`
3. Update `TaskListRow.tsx` to remove inline definitions and import from `./DepIcons`
