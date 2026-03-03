---
phase: quick-49
plan: 49
subsystem: task-list
tags: [svg-icons, dep-chips, link-type, ux]
key-files:
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
decisions:
  - Local inline SVG icon components (no external icon library) keep bundle impact zero
  - LINK_TYPE_ICONS map exported from TaskList.tsx; local copy in TaskListRow.tsx to avoid cross-file import of UI-only components
  - DepChip now takes taskNumber + dep.type (looks up icon internally) instead of pre-built label string
metrics:
  duration: "2 min"
  completed: "2026-03-03"
  tasks: 2
  files: 2
---

# Quick Task 49: Replace Dep Type Labels with SVG Icons — Summary

**One-liner:** Replaced Russian text abbreviations (ОН/НН/ОО/НО) with inline SVG icons in dep chips and the header type-switcher across TaskList and TaskListRow.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add LINK_TYPE_ICONS to TaskList.tsx and render icons in header | 25d7b98 | TaskList.tsx |
| 2 | Replace label text with SVG icon in TaskListRow DepChip | d4dd82e | TaskListRow.tsx |

## What Was Built

### TaskList.tsx
- Removed `LINK_TYPE_LABELS: Record<LinkType, string>` constant
- Added four inline SVG functional components: `DepIconFS`, `DepIconSS`, `DepIconFF`, `DepIconSF` (14x14, `currentColor` stroke)
- Added exported `LINK_TYPE_ICONS: Record<LinkType, React.FC>` map
- Header trigger button now renders active link type SVG icon via `React.createElement(LINK_TYPE_ICONS[activeLinkType])`
- Type-switcher dropdown items now render SVG icons instead of text
- Removed `linkTypeLabels={LINK_TYPE_LABELS}` prop from `<TaskListRow>` usage

### TaskListRow.tsx
- Removed `DEFAULT_LABELS: Record<LinkType, string>` constant
- Added same four inline SVG components + local `LINK_TYPE_ICONS` map
- Removed `linkTypeLabels?: Record<LinkType, string>` from `TaskListRowProps`
- Removed `linkTypeLabels` from component destructuring
- Changed `DepChipProps`: `label: string` replaced with `taskNumber: number`
- `DepChip` now renders `<><Icon />{taskNumber}</>` (icon component resolved from `LINK_TYPE_ICONS[dep.type]`)
- Updated `chips` useMemo to produce `{ dep, taskNumber }` pairs (predecessor 1-based index)
- Updated both `<DepChip>` call sites (popover list and single-chip cell) to pass `taskNumber` instead of `label`

## Verification

- TypeScript: zero errors in TaskList.tsx and TaskListRow.tsx
- No occurrences of ОН/НН/ОО/НО remain as rendered text in either file
- Pre-existing errors in `useTaskDrag.test.ts` and `components/index.ts` are unrelated to these changes

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` — exists, modified
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — exists, modified
- Commit `25d7b98` — exists (Task 1)
- Commit `d4dd82e` — exists (Task 2)
