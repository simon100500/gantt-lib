---
phase: quick-62
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
autonomous: true
requirements: [QUICK-62]
must_haves:
  truths:
    - "Нажатие кнопки Today плавно прокручивает график к текущей дате"
    - "Клик по номеру задачи в task list плавно прокручивает к началу работы"
    - "Начальное позиционирование при монтировании остается мгновенным (без анимации)"
  artifacts:
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "scrollToToday и scrollToTask используют scrollTo({ behavior: 'smooth' })"
  key_links:
    - from: "scrollToToday / scrollToTask"
      to: "scrollContainerRef.current"
      via: "scrollTo({ left, behavior: 'smooth' })"
      pattern: "scrollTo\\(\\{.*behavior.*smooth"
---

<objective>
Добавить плавную анимацию прокрутки при вызове scrollToToday() и scrollToTask(taskId).

Purpose: Улучшить UX — резкий прыжок при нажатии «Сегодня» или при клике на номер задачи заменяется плавным скроллом.
Output: Изменён GanttChart.tsx — методы scrollToToday и scrollToTask используют container.scrollTo({ left, behavior: 'smooth' }) вместо прямого присвоения container.scrollLeft.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Заменить прямое присвоение scrollLeft на scrollTo с behavior: smooth</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
В функции scrollToToday (строки ~220-236) и scrollToTask (строки ~241-260) заменить строку:

  container.scrollLeft = Math.max(0, scrollLeft);

на:

  container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });

ВАЖНО: Начальное центрирование при монтировании (useEffect с пустым deps, строки ~199-215) должно остаться с прямым присвоением container.scrollLeft без анимации — иначе пользователь будет видеть медленный въезд при каждой загрузке страницы.

Итого 2 замены (в scrollToToday и scrollToTask), 1 строка остаётся как есть (в useEffect на mount).
  </action>
  <verify>
    <automated>grep -n "behavior.*smooth" packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</automated>
  </verify>
  <done>Две строки в scrollToToday и scrollToTask используют scrollTo({ left: ..., behavior: 'smooth' }). Начальный mount-скролл по-прежнему мгновенный.</done>
</task>

</tasks>

<verification>
1. grep подтверждает наличие behavior: 'smooth' в файле (2 вхождения — в scrollToToday и scrollToTask)
2. Начальный useEffect НЕ содержит behavior: 'smooth' — убедиться grep-ом что mount-scroll остался с container.scrollLeft =
3. npm run build в packages/gantt-lib проходит без ошибок TypeScript
</verification>

<success_criteria>
- scrollToToday() и scrollToTask() вызывают scrollTo({ left, behavior: 'smooth' })
- Начальный скролл при монтировании остался мгновенным (container.scrollLeft = ...)
- Сборка проходит без ошибок
</success_criteria>

<output>
After completion, create `.planning/quick/62-today/62-SUMMARY.md`
</output>
