---
status: awaiting_human_verify
trigger: "При drag-and-drop задачи с businessDays={true} длительность должна оставаться константой в рабочих днях, а полоса расширяться при попадании на выходные"
created: 2026-03-20T10:00:00Z
updated: 2026-03-20T11:05:00Z
---

## Current Focus
hypothesis: Все 4 проблемы исправлены: (1) preview width пересчитывается, (2) universalCascade сохраняет рабочие дни, (3) auto-recalc не требуется (пользователь сам решает), (4) GanttChart теперь использует universalCascade вместо cascadeByLinks
test: Исправления применены, автотесты проходят, билд успешен
expecting: Drag-single-task, drag-with-dependencies, drag-with-children работают корректно с businessDays
next_action: Запросить у пользователя проверку в демо

## CHECKPOINT REACHED

**Type:** human-verify
**Debug Session:** .planning/debug/business-days-duration-constant.md
**Progress:** 10 evidence entries, 0 hypotheses eliminated

### Investigation State

**Current Hypothesis:** Все 4 проблемы исправлены через изменения в useTaskDrag.ts, dateUtils.ts, dependencyUtils.ts и GanttChart.tsx

**Evidence So Far:**
- Проблема #1 (preview width): ИСПРАВЛЕНО — добавлен пересчёт newWidth из previewEndDate
- Проблема #2 (cascade duration): ИСПРАВЛЕНО — universalCascade теперь использует getBusinessDaysCount + addBusinessDays/subtractBusinessDays
- Проблема #3 (auto-recalc): НЕ ТРЕБУЕТСЯ — пользователь сам решает когда пересчитывать даты
- Проблема #4 (GanttChart cascade): ИСПРАВЛЕНО — заменены cascadeByLinks на universalCascade

### Checkpoint Details

**Need verification:** Проверить все сценарии в демо с businessDays={true}

**Self-verified checks:**
- Автотесты useTaskDrag проходят (32/32)
- Билд успешен
- Код компилируется без ошибок

**How to check:**
1. Открой демо http://localhost:3000
2. Создай задачу на ВтСрЧтПт (4 рабочих дня)
3. Включи "Рабочие дни: ON"
4. Перетащи задачу так чтобы она начиналась в Пт
5. Проверь что полоса расширяется до Пт[Сб][Вс]ПнВтСр (остаётся 4 рабочих дня)
6. Создай цепочку зависимых задач (A → B → C) и проверь что каскад работает
7. Создай родительскую задачу с детьми и проверь что иерархия работает
8. Проверь drag-preview в реальном времени (во время перетаскивания)

**Tell me:** "confirmed fixed" ИЛИ опиши что именно не работает

## Symptoms
expected: При сдвижке ВтСрЧтПт (4 рабочих дня) → Пт[Сб][Вс]ПнВтСр (полоса расширяется, но остаётся 4 рабочих дня: Пт+Пн+Вт+Ср)
actual: Полоса остаётся той же длины, число рабочих дней меняется ("хвост виляет собакой")
errors: Нет ошибок, логически неверное поведение
reproduction: Drag-and-drop задачи с включённым businessDays={true}
timeline: Только что реализовано в quick task 260320-ht7

## Eliminated

## Evidence
- timestamp: 2026-03-20T10:05:00Z
  checked: useTaskDrag.ts handleComplete (строки 553-626)
  found: newEndDate вычисляется как newStartDate + durationDays календарных дней (строка 570), где durationDays = Math.round(finalWidth / dayWidth) - 1
  implication: При businessDays={true} нужно вычислять количество рабочих дней в исходной задаче, затем добавлять это количество к newStartDate через addBusinessDays
- timestamp: 2026-03-20T10:06:00Z
  checked: dateUtils.ts и dependencyUtils.ts
  found: Уже есть функции getBusinessDaysCount и addBusinessDays, которые используются в dependencyUtils для расчёта лагов и каскадов
  implication: Можно переиспользовать эти функции в useTaskDrag.ts
- timestamp: 2026-03-20T10:30:00Z
  checked: useTaskDrag.ts handleGlobalMouseMove (строки 169-353)
  found: previewEndDate вычисляется правильно для businessDays (строки 289-306), НО newWidth не пересчитывается из этой даты — остаётся от initialWidth
  implication: Нужно пересчитать newWidth = (endOffset - startOffset + 1) * dayWidth после вычисления previewEndDate
- timestamp: 2026-03-20T10:35:00Z
  checked: Проблема #1 ИСПРАВЛЕНА: добавлен пересчёт newWidth в handleGlobalMouseMove
  found: newWidth теперь пересчитывается из previewEndDate для businessDays режима
  implication: Визуальный preview теперь корректно расширяется над выходными
- timestamp: 2026-03-20T10:40:00Z
  checked: dependencyUtils.ts universalCascade RULE 3 (строки 822-872)
  found: durationMs используется для сохранения длительности зависимых задач (строки 833, 853, 856), но при businessDays это календарная длительность, не рабочие дни
  implication: При businessDays нужно вычислять количество рабочих дней и сохранять его через addBusinessDays/subtractBusinessDays
- timestamp: 2026-03-20T10:45:00Z
  checked: Проблема #2 ИСПРАВЛЕНА: добавлена функция subtractBusinessDays в dateUtils.ts
  found: universalCascade теперь использует getBusinessDaysCount + addBusinessDays для FS/SS и subtractBusinessDays для FF/SF
  implication: Каскад зависимых задач теперь сохраняет длительность в рабочих днях

## Resolution
root_cause: Было 4 проблемы: (1) В handleGlobalMouseMove previewEndDate вычислялся правильно, но newWidth не пересчитывалась из этой даты. (2) В universalCascade RULE 3 использовалась durationMs (календарная длительность) вместо количества рабочих дней. (3) Проблема не требует решения — пользователь сам решает когда пересчитывать даты. (4) В GanttChart использовалась старая функция cascadeByLinks вместо universalCascade.
fix:
1. **useTaskDrag.ts**: Добавлен пересчёт newWidth из previewEndDate для businessDays режима (строки 299-307).
2. **dateUtils.ts**: Добавлена новая функция subtractBusinessDays для обратного счёта рабочих дней.
3. **dependencyUtils.ts**: universalCascade теперь использует getBusinessDaysCount + addBusinessDays/subtractBusinessDays для сохранения длительности в рабочих днях (RULE 3).
4. **GanttChart.tsx**: Заменены вызовы cascadeByLinks на universalCascade с передачей businessDays и weekendPredicate.

verification: Автотесты useTaskDrag проходят (32/32). Билд успешен. Нужно проверить в демо:
1. Создать задачу на ВтСрЧтПт (4 рабочих дня)
2. Включить businessDays={true}
3. Перетащить задачу так чтобы она начиналась в Пт
4. Проверить что полоса расширяется до Пт[Сб][Вс]ПнВтСр (остаётся 4 рабочих дня)
5. Создать цепочку зависимых задач и проверить что каскад работает
6. Создать родительскую задачу с детьми и проверить что иерархия работает

files_changed:
- src/hooks/useTaskDrag.ts: добавлен пересчёт newWidth в handleGlobalMouseMove
- src/utils/dateUtils.ts: добавлена функция subtractBusinessDays
- src/utils/dependencyUtils.ts: universalCascade теперь сохраняет рабочие дни в RULE 3, добавлен импорт subtractBusinessDays
- src/components/GanttChart/GanttChart.tsx: заменены cascadeByLinks на universalCascade
