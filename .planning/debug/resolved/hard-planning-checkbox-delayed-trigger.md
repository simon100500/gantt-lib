---
status: resolved
trigger: "При включении чекбокса жёсткого планирования (hard planning) — срабатывает только со второй подвижки. Нужно чтобы работало сразу."
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:03:00Z
---

## Current Focus

hypothesis: RESOLVED.
test: n/a
expecting: n/a
next_action: n/a

## Symptoms

expected: После включения чекбокса "жёсткое планирование" — при первом же перемещении таска должно применяться жёсткое планирование (FS-каскад или аналог).
actual: После включения чекбокса — первая подвижка таска работает как будто режим ещё не включён. Только со второй подвижки режим начинает работать.
errors: Нет явных ошибок, поведение некорректное.
reproduction: 1. Открыть гантт. 2. Включить чекбокс "жёсткое планирование". 3. Попробовать переместить таск — первая подвижка игнорирует новый режим. 4. Вторая подвижка уже применяет режим корректно.
started: Предположительно — баг существует с момента реализации фичи.

## Eliminated

(none — root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-22T00:01:00Z
  checked: TaskRow.tsx arePropsEqual (lines 64-81)
  found: disableConstraints is NOT included in the comparison. The comment says "onChange, onCascadeProgress, onCascade excluded" but the exclusion of disableConstraints appears to be an oversight — it was never intentionally excluded (unlike the callback props that are excluded for performance reasons).
  implication: When blockConstraints checkbox toggles, disableConstraints prop changes in GanttChart, but arePropsEqual returns true (no relevant prop changed from its perspective), so React.memo blocks the re-render of all TaskRow instances.

- timestamp: 2026-02-22T00:01:00Z
  checked: useTaskDrag.ts handleMouseDown (line 644-648) and handleComplete (line 490)
  found: disableConstraints is captured via destructuring at hook entry (line 383), then used inside handleMouseDown callback which is inside the stale closure. cascadeChain computed at line 645 uses !disableConstraints. handleComplete at line 490 checks !disableConstraints.
  implication: Until TaskRow re-renders (and the hook re-runs its closure), the stale disableConstraints value is used.

- timestamp: 2026-02-22T00:01:00Z
  checked: Why second drag works
  found: After first drag completes, handleComplete calls onDragEnd/onCascade, which calls onChange in GanttChart, which calls setTasks with a functional updater creating a new tasks array. The new array is passed as allTasks prop to each TaskRow. arePropsEqual line 78 checks prevProps.allTasks === nextProps.allTasks — a reference comparison. The new array reference causes arePropsEqual to return false, forcing a full re-render of TaskRow with the correct (updated) disableConstraints value.
  implication: This confirms the off-by-one drag behavior exactly.

## Resolution

root_cause: arePropsEqual in TaskRow.tsx did not include disableConstraints in its comparison. React.memo suppressed TaskRow re-renders when the hard planning checkbox was toggled, leaving a stale disableConstraints value in useTaskDrag's closure. Only after the first drag triggered a task state update (changing the allTasks array reference) did TaskRow re-render with the correct value — explaining the one-drag delay.
fix: Added `prevProps.disableConstraints === nextProps.disableConstraints` to the arePropsEqual comparison in TaskRow.tsx (line 79).
verification: All 120 unit tests pass. Fix is minimal (one line) and directly targets the root cause.
files_changed:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
