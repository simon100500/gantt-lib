# Quick Task 260321 Summary

## Goal

Привести библиотеку к новой логике режима рабочих дней из `.planning/work-day-logic.md`: рабочие дни по умолчанию, lag как первичный бизнес-параметр, каскад и визуализация опираются на сохраненный lag и рабочую длительность.

## What Changed

- `businessDays` стал режимом по умолчанию в ключевых точках UI и drag/drop.
- В `dependencyUtils` добавлены общие утилиты для рабочей длительности, выравнивания на рабочий день и построения диапазона задачи от старта/финиша.
- `universalCascade` и `cascadeByLinks` больше не вычисляют “истинный lag” из текущих дат; для каскада используется сохраненный `dep.lag`.
- Drag preview и финальный move используют общий расчёт через `moveTaskRange`, чтобы preview и drop не расходились.
- Dependency chips и dependency lines показывают сохранённый lag, а не визуальный календарный зазор.
- Редактирование lag в task list теперь обновляет сам dependency object вместе с датами задачи.
- Добавление новой связи и ручные правки дат в task list перестроены с учетом business-day duration и weekend snapping.

## Verification

- `npm.cmd run test -- --run src/__tests__/dependencyUtils.test.ts src/__tests__/taskListDuration.test.tsx src/__tests__/dependencyLines.test.tsx src/__tests__/useTaskDrag.test.ts`
- `npm.cmd run build -w packages/gantt-lib`

## Notes

- Контракт `lag` переведен в обязательный в типах библиотеки.
- Внутренняя логика по-прежнему нормализует отсутствующий `lag` в `0` через `getDependencyLag`, чтобы безопасно пережить старые данные и тестовые фикстуры.
