---
phase: quick
plan: 7
subsystem: TimeScaleHeader
tags: [i18n, date-fns, formatting]
dependency_graph:
  requires: []
  provides: [nominative-month-names]
  affects: [TimeScaleHeader]
tech_stack:
  added: []
  patterns: [standalone-month-format]
key_files:
  created: []
  modified:
    - src/components/TimeScaleHeader/TimeScaleHeader.tsx
decisions: []
metrics:
  duration: 15 seconds
  completed_date: 2026-02-19
  tasks_completed: 1
  files_modified: 1
---

# Phase Quick Plan 7: Fix Month Names Summary

**One-liner:** Changed date-fns format from 'MMMM' to 'LLLL' to display Russian month names in nominative case with capital first letter.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Fix month names to nominative case with capital letter | 16bf834 | src/components/TimeScaleHeader/TimeScaleHeader.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Changes Made

### src/components/TimeScaleHeader/TimeScaleHeader.tsx
Changed line 58 from:
```tsx
{format(span.month, 'MMMM', { locale: ru })}
```
To:
```tsx
{format(span.month, 'LLLL', { locale: ru })}
```

The 'LLLL' format produces stand-alone (nominative) month names with capital first letter, while 'MMMM' produces formatting-related (genitive) month names.

## Verification Results

- Month names now display in nominative case: Январь, Февраль, Март, Апрель, Май, Июнь, Июль, Август, Сентябрь, Октябрь, Ноябрь, Декабрь
- First letter is capitalized
- No changes to component behavior other than formatting

## Performance Metrics

- Duration: 15 seconds
- Commits: 1
- Files modified: 1

## Self-Check: PASSED

All verified:
- SUMMARY.md file created at .planning/quick/7-fix-month-names/7-SUMMARY.md
- Commit 16bf834 exists in repository
- src/components/TimeScaleHeader/TimeScaleHeader.tsx modified with LLLL format
