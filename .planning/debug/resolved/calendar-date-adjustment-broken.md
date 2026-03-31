---
status: verifying
trigger: "После внедрения businessDays режима кнопки календаря +1/+7 не работают — поле даты не меняется, полоса сдвигается некорректно"
created: 2025-03-20T12:00:00Z
updated: 2025-03-20T12:00:00Z
---

## Current Focus
hypothesis: DatePicker использует addDays (календарные дни) вместо addBusinessDays для кнопок +1/+7, когда включён режим businessDays
test: DatePicker не получает проп businessDays из TaskListRow и не имеет логики для бизнес-дней
expecting: Нужно добавить проп businessDays в DatePicker и изменить handleDayShift
next_action: Добавить проп businessDays в DatePicker и реализовать логику бизнес-дней

## Symptoms
expected: При нажатии +1/+7 в календаре дата должна сдвигаться на 1/7 дней, полоса перемещаться корректно
actual: Поле даты не меняется, полоса сдвигается некорректно
errors: Нет явных ошибок
reproduction: Нажать кнопку +1 или +7 в DatePicker календаре с включённым businessDays={true}
timeline: Началось после изменений для businessDays в useTaskDrag.ts

## Eliminated

## Evidence
- timestamp: 2025-03-20T12:00:00Z
  checked: DatePicker.tsx
  found: handleDayShift использует addDays из date-fns (календарные дни)
  implication: Не учитывает businessDays режим

- timestamp: 2025-03-20T12:00:00Z
  checked: TaskListRow.tsx
  found: DatePicker не получает проп businessDays, хотя TaskListRow имеет его
  implication: DatePicker не знает о бизнес-днях

- timestamp: 2025-03-20T12:00:00Z
  checked: dateUtils.ts
  found: Есть addBusinessDays и subtractBusinessDays функции
  implication: Можно использовать их в DatePicker

## Resolution
root_cause: DatePicker использует addDays (календарные дни) вместо addBusinessDays для кнопок +1/+7
fix: Добавлен проп businessDays в DatePicker и изменён handleDayShift для использования addBusinessDays/subtractBusinessDays
verification: Сборка прошла успешно, требуется проверка в демо
files_changed: ["src/components/ui/DatePicker.tsx", "src/components/TaskList/TaskListRow.tsx"]
