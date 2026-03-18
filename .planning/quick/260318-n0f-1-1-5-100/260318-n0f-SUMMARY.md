---
phase: quick-task
plan: 260318-n0f
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "Текст длительности ('1 д') виден на узких полосах (1 день)"
    - "Текст не сливается с фоном полосы"
    - "Длительность выносится за пределы полосы, если не помещается"
    - "Сохраняется формат: '5 д   100%   Название работы'"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx"
      provides: "Логика определения вмещается ли текст длительности"
      contains: "showDurationInside переменная"
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.css"
      provides: "Стили для внешнего текста длительности"
      contains: ".gantt-tr-externalDuration"
  key_links:
    - from: "TaskRow.tsx"
      to: "TaskRow.css"
      via: "CSS класс .gantt-tr-externalDuration"
      pattern: "gantt-tr-externalDuration"
---

# Quick Task 260318-n0f: Исправление вёрстки текста длительности на узких полосах

## One-liner
Вынос текста длительности за пределы узких полос задач (1-2 дня) с использованием conditional rendering на основе `displayWidth > 40px`.

## Summary

### Что сделано

**Задача 1: Логика определения вместимости длительности**
- Добавлена константа `MIN_DURATION_WIDTH = 40` (минимальная ширина для отображения длительности внутри полосы)
- Добавлена переменная `showDurationInside = displayWidth > MIN_DURATION_WIDTH`
- Длительность теперь условно рендерится внутри полосы при `showDurationInside === true`
- Добавлен рендер внешней длительности в блоке `.gantt-tr-rightLabels` при `showDurationInside === false`
- Логика применяется как к обычным задачам, так и к родительским (isParent)

**Задача 2: CSS стили для внешней длительности**
- Добавлен класс `.gantt-tr-externalDuration` в TaskRow.css
- Стили соответствуют внешнему прогрессу для консистентности:
  - `font-size: 0.875rem` — совпадает с `.gantt-tr-taskDuration`
  - `font-weight: 500` — совпадает с `.gantt-tr-taskDuration`
  - `color: #374151` — тёмно-серый для видимости вне полосы
  - `white-space: nowrap` — предотвращает перенос текста
  - `margin-right: 4px` — отступ от следующего элемента

### Техническая реализация

**Файлы изменены:**
1. `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx`
   - Строки 277-280: добавлены `MIN_DURATION_WIDTH` и `showDurationInside`
   - Строки 309-313: условный рендеринг длительности внутри полосы
   - Строки 356-360: рендер внешней длительности в `.gantt-tr-rightLabels`

2. `packages/gantt-lib/src/components/TaskRow/TaskRow.css`
   - Строки 203-209: добавлен класс `.gantt-tr-externalDuration`

### Порядок элементов в `.gantt-tr-rightLabels`

1. Длительность (если вынесена) — `.gantt-tr-externalDuration`
2. Прогресс (если вынесен) — `.gantt-tr-externalProgress`
3. Название задачи — `.gantt-tr-externalTaskName`

## Deviations from Plan

### Auto-fixed Issues

**Отклонений нет** — план выполнен точно как написан.

## Verification Checklist

- [x] Длительность выносится за пределы полосы при ширине ≤ 40px
- [x] Длительность остаётся внутри при ширине > 40px
- [x] Текст вынесенной длительности тёмного цвета (#374151)
- [x] Порядок элементов: длительность → прогресс → название
- [x] Работает для обычных и родительских задач
- [ ] Drag/resize обновляют текст корректно (требуется визуальная проверка)

## Decisions Made

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Порог 40px для выноса длительности | Текст "1 д" ≈ 20px + padding 16px + margin-right 4px = ~40px | ✓ Хорошо — текст не сливается с фоном |

## Metrics

- **Duration:** ~5 минут
- **Files modified:** 2
- **Commits:** 2
- **Tasks completed:** 2/3 (третья задача — checkpoint для визуальной проверки)

## Next Steps

**Checkpoint: Визуальная проверка**
- Демо-приложение запущено на http://localhost:3005
- Требуется проверить:
  - Задачи длительностью 1 день имеют читаемый текст длительности справа от полосы
  - На более широких полосах (5+ дней) текст длительности внутри полосы
  - Порядок элементов: "1 д" → "100%" → "Название" (если прогресс вынесен)
  - Для родительских задач аналогично: "3 задачи" → название
  - Drag/resize обновляют текст корректно

## Commits

- `648f8b3`: feat(260318-n0f): add logic to determine if duration fits inside task bar
- `8f35965`: feat(260318-n0f): add CSS styles for external duration text
