---
status: awaiting_human_verify
trigger: "Investigate issue: ff-lag-business-days-cascade"
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T00:52:00Z
---

## Current Focus

hypothesis: confirmed root cause in `calculateSuccessorDate()` business-days FF inversion
test: automated verification is complete; still awaiting manual browser/workflow verification
expecting: FF lag stays constant after predecessor shift across weekends; only calendar span/end dates expand as needed
next_action: run a manual browser scenario for FF+positive-lag in businessDays mode and confirm the visible TaskList/DependencyLines output matches the scheduling layer

## Symptoms

expected: При каскадной сдвижке с businessDays=true константами должны оставаться длительность в рабочих днях и lag зависимости. Для примера `[Работа1]---FF+7-->[Работа2]` после сдвига Работа1 через выходные должно остаться `FF+7`; меняется только календарное окончание задач, потому что ширина в календарных днях может вырасти из-за выходных.
actual: После сдвига предшественника через выходные lag самопроизвольно уменьшается. Пример: было `[Работа1]---FF+7-->[Работа2]`, становится `[Работа1]---FF+4-->[Работа2]`.
errors: Явных runtime-ошибок не сообщалось.
reproduction: Включить режим businessDays/"рабочие дни". Создать как минимум пару задач с FF-зависимостью и положительным lag (например +7). Сдвинуть предшественника так, чтобы его диапазон задел выходные и календарная длина полосы изменилась при сохранении той же длительности в рабочих днях. Проверить effective lag у последующей задачи после каскадного пересчёта.
started: Дефект проявился после недавних изменений по каскадному пересчёту зависимостей с учётом рабочих дней; в истории есть quick task `260320-ht7-business-days-calc`.

## Eliminated

## Evidence

- timestamp: 2026-03-20T00:10:00Z
  checked: repo-wide search for businessDays/cascade/FF/lag and quick task marker
  found: core business-days cascade logic is concentrated in packages/gantt-lib/src/utils/dependencyUtils.ts and wired from packages/gantt-lib/src/hooks/useTaskDrag.ts; no direct git-log hit for quick task string
  implication: root cause is likely in current working tree logic rather than a separately labeled commit

- timestamp: 2026-03-20T00:18:00Z
  checked: packages/gantt-lib/src/utils/dependencyUtils.ts and packages/gantt-lib/src/hooks/useTaskDrag.ts
  found: `computeLagFromDates(..., businessDays, weekendPredicate)` supports business-day lag, but `recalculateIncomingLags()` does not accept/pass those flags and `useTaskDrag.handleComplete()` calls it in hard mode when building `movedTask`
  implication: any persisted dependency lag on drag completion is recalculated in calendar days even when cascade movement was computed in business days

- timestamp: 2026-03-20T00:22:00Z
  checked: existing tests in packages/gantt-lib/src/__tests__/useTaskDrag.test.ts
  found: current drag tests cover resize cascades and lag regressions in calendar mode, but there is no regression covering businessDays lag persistence for FF
  implication: the bug could ship unnoticed because current tests assert shifted dates, not preserved working-day lag values

- timestamp: 2026-03-20T00:27:00Z
  checked: direct node execution of TS module imports
  found: ad-hoc `node` execution is blocked by ESM/TS directory import resolution in this repo setup
  implication: the fastest reliable reproduction path is a focused vitest regression rather than shell-level probing

- timestamp: 2026-03-20T00:33:00Z
  checked: new targeted regression in packages/gantt-lib/src/__tests__/dependencyUtils.test.ts run via vitest
  found: `universalCascade(..., businessDays=true)` returned successor `2026-03-11..2026-03-17` instead of `2026-03-12..2026-03-18` when preserving FF+7 across a weekend-crossing predecessor shift
  implication: the bug is in the lag→date inversion path used by cascade, specifically `calculateSuccessorDate()` under business-days mode

- timestamp: 2026-03-20T00:45:00Z
  checked: patched `calculateSuccessorDate()` FF business-days path and reran targeted tests
  found: `src/__tests__/dependencyUtils.test.ts` passes with the new regression, and adjacent `src/__tests__/useTaskDrag.test.ts` also passes unchanged
  implication: the FF business-days cascade bug is fixed at the scheduling layer without regressing existing drag behavior covered by current tests

- timestamp: 2026-03-20T00:52:00Z
  checked: user follow-up verification summary
  found: targeted automated verification also passed for `taskListDuration.test.tsx` and `dependencyLines.test.tsx`, with additional user-side UI patches to preserve business-day lag display and lag editing semantics; no manual browser verification was performed in this session
  implication: code-level confidence is high across scheduler and UI layers, but end-to-end runtime confirmation in the actual browser workflow is still pending

## Resolution

root_cause: `calculateSuccessorDate()` under `businessDays=true` uses offsets that are too small for the inclusive business-day counting used by `getBusinessDaysCount/addBusinessDays`, so cascade reconstruction loses working-day lag when a predecessor shift crosses weekends.
fix: adjusted the FF branch in `packages/gantt-lib/src/utils/dependencyUtils.ts` to map business-day lag back to dates with inclusive counting (`lag + 1` for non-negative FF, backward calculation via `subtractBusinessDays` for negative FF), and added a regression in `packages/gantt-lib/src/__tests__/dependencyUtils.test.ts` that asserts FF lag preservation across a weekend-crossing cascade.
verification: targeted `npm.cmd run test -- --run src/__tests__/dependencyUtils.test.ts` passed with the new regression; adjacent `npm.cmd run test -- --run src/__tests__/useTaskDrag.test.ts` passed after the fix; user additionally reported targeted passes for `taskListDuration.test.tsx` and `dependencyLines.test.tsx`, but no manual browser verification was performed in this session.
files_changed:
  - packages/gantt-lib/src/utils/dependencyUtils.ts
  - packages/gantt-lib/src/__tests__/dependencyUtils.test.ts
