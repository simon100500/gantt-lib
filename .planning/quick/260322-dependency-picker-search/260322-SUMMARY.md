# Quick Task 260322 Summary

## Implemented

- Replaced the `Выберите задачу` placeholder in dependency-pick mode with a search input and candidate list.
- Candidates are filtered by visible task number and task name, and displayed as `1.1.1. Name`.
- Preserved existing mouse workflow: rows can still be clicked directly during picking.
- Added cancel control inside the source picker and Enter-to-pick the first filtered result.

## Verification

- `npm.cmd run test -- --run src/__tests__/taskListDuration.test.tsx`
- `npm.cmd run build -w packages/gantt-lib`
