---
status: awaiting_human_verify
trigger: "Implement fix for cascade-parent-successors-bug-report"
created: 2026-03-16T00:00:00Z
updated: 2026-03-16T12:00:00Z
---

## Current Focus

hypothesis: Несистемный подход (5 патчей) заменён на universalCascade с BFS и тремя правилами
test: Проверить drag g2-5 вправо и назад, drag g2 (родитель), drag g3-1 (независимая задача)
expecting: child drag сохраняется при drop, parent drag не схлопывает лаги, successor двигается
next_action: Ожидание проверки пользователем в браузере

## Symptoms

expected: Drag ребёнка → родитель расширяется, successor (g3-1) сдвигается. Drag родителя → дети двигаются вместе с правильными лагами.
actual: При drop всё возвращается. Несколько попыток патчить — каждая создаёт новый баг.
errors: Нет runtime ошибок, визуально работает, при drop — откат
reproduction: 1) Открыть демо http://localhost:3005 2) Взять ребёнка g2-5 (Уплотнение основания) 3) Сдвинуть вправо 5 дней 4) Drop 5) Всё возвращается
started: Phase 19 (Hierarchy support) — drag + dependencies комбинация

## Eliminated

- hypothesis: draggedChild не добавлялся в overrides (попытка 1)
  evidence: добавление в overrides помогло только визуально, при drop откат
  timestamp: 2026-03-16

- hypothesis: родитель не включался в cascadedTasks (попытка 2)
  evidence: добавили hierarchyCascadeTasks, но с исходными датами — откат
  timestamp: 2026-03-16

- hypothesis: getTransitiveCascadeChain включает детей с исходными датами (попытка 3)
  evidence: фильтрация помогла, но parentDeltaDays = 0
  timestamp: 2026-03-16

- hypothesis: parentDeltaDays вычислялся от startDate (попытка 4)
  evidence: Math.max(startDelta, endDelta) сломал движение назад
  timestamp: 2026-03-16

- hypothesis: endDelta достаточно для всех случаев (попытка 5)
  evidence: drag родителя схлопывал лаги детей — каждый патч создавал новый баг
  timestamp: 2026-03-16

## Evidence

- timestamp: 2026-03-16T10:00:00Z
  checked: useTaskDrag.ts handleComplete логика
  found: Сложный несистемный код с hierarchyCascadeTasks и delta-based смещением вместо constraint-based cascade
  implication: Корневая причина — отсутствие единого алгоритма обхода графа

- timestamp: 2026-03-16T10:30:00Z
  checked: cascadeByLinks в dependencyUtils.ts
  found: Уже реализован BFS с RULE 1 (children follow parent) и RULE 3 (successors by constraint). Используется для parent drag preview, но не для completion.
  implication: Можно расширить подход для всех случаев

- timestamp: 2026-03-16T11:00:00Z
  checked: Анализ flow для drag g2-5
  found: При arrivalMode 'parent-recalc' дети не должны пересчитываться через delta — иначе они сдвинутся дважды
  implication: Нужен флаг ArrivalMode в BFS для различения случаев

- timestamp: 2026-03-16T11:30:00Z
  checked: TypeScript compilation и сборка
  found: Сборка успешна, нет новых ошибок в наших файлах
  implication: Код корректен синтаксически

## Resolution

root_cause: В handleComplete использовался несистемный delta-based подход для child drag, который не учитывал parent recalculation. Каждый последующий патч создавал новый баг вместо решения корневой проблемы.

fix: |
  1. Добавлена функция universalCascade() в dependencyUtils.ts
     - BFS обход с тремя правилами
     - ArrivalMode флаг для различения: 'direct'/'child-delta'/'dependency' vs 'parent-recalc'
     - RULE 1 (children follow parent) применяется только для не-'parent-recalc' arrival
     - RULE 2 (parent recomputed from children) применяется когда ребёнок двигается
     - RULE 3 (dependency successors via calculateSuccessorDate) — всегда
  2. Заменена вся сложная логика в handleComplete на единый вызов universalCascade()
     - Удалено ~100 строк хаков с hierarchyCascadeTasks
     - Удалено delta-based смещение successors
     - Используется constraint-based repositioning для всех случаев

verification: Ожидает проверки пользователем

files_changed:
  - packages/gantt-lib/src/utils/dependencyUtils.ts
  - packages/gantt-lib/src/hooks/useTaskDrag.ts

# Баг Cascade Parent Successors: Полная История и Решение

**Дата:** 2026-03-16
**Статус:** Ожидает проверки
**Фаза:** Phase 19 (Hierarchy support)

---

## 📋 Описание Проблемы

При drag ребёнка родительской задачи:
1. **Визуально** работает: родитель расширяется, successor сдвигается
2. **При drop:** всё возвращается на место
3. **При движении назад:** лаг увеличивается вместо сохранения
4. **При drag родителя:** лаги детей схлопываются до 0

---

## 💡 КОРНЕВАЯ ПРИЧИНА

**Несистемный подход!** Каждое исправление создавало новый баг:

| Попытка | Исправление | Новый баг |
|---------|------------|-----------|
| 1 | Добавил draggedChild в overrides | Работает только визуально |
| 2 | Добавил hierarchyCascadeTasks | Дети с исходными датами |
| 3 | Отфильтровал детей | parentDeltaDays = 0 |
| 4 | Math.max(start, end) | Движение назад ломает лаг |
| 5 | Использовал endDelta | Drag родителя ломает лаги детей |

---

## 🎯 РЕШЕНИЕ: universalCascade()

### Ключевые принципы

1. **BFS обход** с флагом `ArrivalMode`
2. **Три правила:**
   - RULE 1: Children follow parent delta — только если `arrivalMode !== 'parent-recalc'`
   - RULE 2: Parent recomputed from children — когда ребёнок попадает в очередь
   - RULE 3: Dependency successors via `calculateSuccessorDate` — всегда
3. **Lag сохраняется** через `calculateSuccessorDate` с оригинальным lag

### ArrivalMode — ключевой insight

```typescript
// 'parent-recalc' — родитель пересчитан ОТ детей,
// его дети НЕ двигаются (они уже на нужных позициях)
if (arrivalMode !== 'parent-recalc') {
  // Применяем RULE 1: сдвигаем детей
}
```

Без этого флага дети смещались бы дважды при drag ребёнка.

---

## 📁 Связанные файлы

- `packages/gantt-lib/src/utils/dependencyUtils.ts` — добавлена `universalCascade()`
- `packages/gantt-lib/src/hooks/useTaskDrag.ts` — заменена логика в `handleComplete`

---

## 🔄 Статус

- [x] Диагностика завершена
- [x] universalCascade реализован в dependencyUtils.ts
- [x] handleComplete заменён на universalCascade
- [x] Сборка успешна
- [ ] Проверка в браузере всех сценариев
