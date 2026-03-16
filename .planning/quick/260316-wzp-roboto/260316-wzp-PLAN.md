---
phase: quick
plan: 260316-wzp
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/ui/ui.css
autonomous: true
requirements:
  - QUICK-260316-WZP
must_haves:
  truths:
    - "Компонент календаря использует глобальный шрифт Roboto"
    - "Все текстовые элементы календаря (дни, месяцы) отображаются шрифтом Roboto"
  artifacts:
    - path: "packages/gantt-lib/src/components/ui/ui.css"
      provides: "Стили календаря с унаследованным шрифтом"
      contains: ".gantt-cal-container, .gantt-day-btn"
  key_links:
    - from: "packages/gantt-lib/src/components/ui/ui.css"
      to: "packages/gantt-lib/src/styles.css"
      via: "font-family: inherit → --gantt-font-family"
      pattern: "font-family:\\s*inherit"
---

<objective>
Применить глобальный шрифт Roboto к компоненту календаря

Purpose: Обеспечить консистентное отображение шрифтов во всей библиотеке
Output: Компонент Calendar использует глобальный шрифт Roboto
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<!-- Текущее состояние: Calendar использует font-family: inherit -->
От packages/gantt-lib/src/components/ui/ui.css:
```css
.gantt-cal-container {
  font-family: inherit;
  background: var(--gantt-calendar-bg);
  color: var(--gantt-calendar-text);
}

.gantt-day-btn {
  font-family: inherit;
}
```

<!-- Глобальная переменная шрифта -->
От packages/gantt-lib/src/styles.css:
```css
:root {
  --gantt-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```
</context>

<tasks>

<task type="auto">
  <name>Задача: Проверить наследование шрифта в календаре</name>
  <files>packages/gantt-lib/src/components/ui/ui.css</files>
  <action>
    Проверить, что все классы календаря используют `font-family: inherit`:

    1. Проверить .gantt-cal-container - имеет font-family: inherit (строка 207)
    2. Проверить .gantt-day-btn - имеет font-family: inherit (строка 238)
    3. Проверить .gantt-cal-month-header - добавить font-family: inherit если отсутствует

    Текущее состояние показывает, что основные элементы уже используют inherit.
    Необходимо убедиться, что .gantt-cal-month-header также наследует шрифт.
  </action>
  <verify>
    <automated>grep -n "\.gantt-cal-" packages/gantt-lib/src/components/ui/ui.css | grep -A2 "month-header"</automated>
  </verify>
  <done>Все элементы календаря используют font-family: inherit для наследования глобального шрифта Roboto</done>
</task>

</tasks>

<verification>
1. Открыть демо-сайт с компонентом Calendar
2. Проверить в DevTools, что текстовые элементы календаря используют вычисленный шрифт Roboto
3. Убедиться, что дни недели, номера дней и названия месяцев отображаются шрифтом Roboto
</verification>

<success_criteria>
- Компонент Calendar наследует глобальный шрифт Roboto через font-family: inherit
- Все текстовые элементы календаря отображаются шрифтом Roboto
- Нет жестко заданных font-family в стилях календаря
</success_criteria>

<output>
After completion, create `.planning/quick/260316-wzp-roboto/260316-wzp-SUMMARY.md`
</output>
