---
status: fixing
trigger: "При drag родительской задачи 'Фундамент' — у её successor 'Бетонирование фундамента' (FF зависимость, lag=-7) лаг сбрасывается до 0."
created: 2026-03-16T00:00:00Z
updated: 2026-03-16T00:10:00Z
---

## Current Focus

hypothesis: ROOT CAUSE CONFIRMED. В universalCascade() при drag родительской задачи: RULE 1 добавляет всех детей в visited ДО обработки их dependences. Когда child с FF lag=-7 dependency обрабатывается из queue (RULE 3), его successor тоже уже в visited (через RULE 1) → SKIP. В итоге: (1) позиция child устанавливается delta-смещением (математически правильно при move), (2) НО lag в данных НЕ пересчитывается через recalculateIncomingLags. Баг в handleComplete: recalculateIncomingLags вызывается ТОЛЬКО для draggedTask (movedTask), но НЕ для cascade children. После drop, child (g3-4) получает правильные даты (delta), но его dependencies.lag НЕ пересчитывался → остаётся как был.

ВТОРАЯ ГИПОТЕЗА (более вероятная для конкретного симптома): При drag parent'а, дочерний child g3-4 попадает в cascadeResult через RULE 1 с {...child, newDates}. Его dependencies сохранены. НО при следующем render, normalizeHierarchyTasks пересчитывает даты parent'а из детей. Если где-то вызывается recalculateIncomingLags для g3-4 с НОВЫМИ датами g3-4 и СТАРЫМИ датами g3-2 — lag станет другим. Проверить нужно конкретный путь через cascadeByLinks в handleTaskChange.

ПОДТВЕРЖДЁННЫЙ БАГ (реальный механизм): Функция cascadeByLinks используется в handleTaskChange для inline editing, а ТАМ нет recalculate... Но есть путь через ДРУГОЙ handler.

РЕАЛЬНЫЙ БАГ НАЙДЕН: В handleComplete для parent drag:
movedTask создаётся с recalculateIncomingLags(draggedTaskData, newStart, newEnd, allTasks).
allTasks содержит СТАРЫЕ даты предшественников.
Для g3 (parent) dependencies=[] — OK.
НО для External successor X с {taskId:'g3', type:'FF', lag:-7}:
universalCascade RULE 3 ПРАВИЛЬНО позиционирует X.
Lag НЕ сбрасывается.

ИСТИННАЯ ПРИЧИНА: Проверить нет ли вызова recalculateIncomingLags для cascadeResult задач где-то вне видимого кода.

СТАТУС: После полного анализа кода — lag должен сохраняться. Нужно добавить тестовый кейс с FF lag=-7 в page.tsx и воспроизвести баг.

next_action: Добавить тестовую задачу с FF lag=-7 от g3 в page.tsx. Запустить. Проверить lag после drag g3.

## Symptoms

expected: При drag родителя "Фундамент" вправо — "Бетонирование фундамента" должно двигаться вместе с сохранением FF lag=-7 (конец successor = конец predecessor + lag = конец predecessor - 7 дней)
actual: lag становится 0 — "Бетонирование фундамента" выравнивается по концу родителя (lag сбрасывается с -7 до 0)
errors: Нет runtime ошибок, визуальная проблема при drag
reproduction: 1) Открыть http://localhost:3005  2) Найти задачу "Фундамент" (родительская задача)  3) Перетащить её вправо  4) При drop: lag у "Бетонирование фундамента" (FF зависимость) становится 0 вместо -7
started: После реализации universalCascade() в dependencyUtils.ts

## Eliminated

- hypothesis: "recalculateIncomingLags вызывается для cascade задач"
  evidence: В handleComplete recalculateIncomingLags вызывается ТОЛЬКО для movedTask (draggedTask), не для cascadeResult
  timestamp: 2026-03-16T00:05:00Z

- hypothesis: "universalCascade RULE 3 неправильно применяет lag"
  evidence: calculateSuccessorDate(predEnd, 'FF', -7) = predEnd - 7d — математически правильно. dep.lag ?? 0 правильно использует -7.
  timestamp: 2026-03-16T00:05:00Z

- hypothesis: "normalizeHierarchyTasks пересчитывает lag"
  evidence: normalizeHierarchyTasks только нормализует startDate/endDate, dependencies не трогает
  timestamp: 2026-03-16T00:05:00Z

## Evidence

- timestamp: 2026-03-16T00:00:00Z
  checked: universalCascade() RULE 3 в dependencyUtils.ts строки 719-754
  found: RULE 3 использует dep.lag ?? 0 и calculateSuccessorDate — математически правильно. result.push({...task, startDate, endDate}) — dependencies (с lag) сохраняются.
  implication: universalCascade не сбрасывает lag.

- timestamp: 2026-03-16T00:01:00Z
  checked: handleComplete в useTaskDrag.ts строки 1254-1279
  found: recalculateIncomingLags вызывается только для movedTask. cascadeResult задачи получают {..task, newDates} — dependencies НЕ пересчитываются.
  implication: lag в cascadeResult должен сохраняться.

- timestamp: 2026-03-16T00:02:00Z
  checked: universalCascade RULE 1 при parent drag
  found: Дети добавляются в visited ПЕРЕД обработкой. RULE 3 для siblings детей пропускает их (visited). При равномерном move, delta = constraint для FF — математически эквивалентно. НО: lag в задаче НЕ пересчитывается через recalculateIncomingLags для детей.
  implication: Lag хранится в dependencies объекте — при cascade он просто копируется через ...spread. Не сбрасывается.

- timestamp: 2026-03-16T00:03:00Z
  checked: page.tsx данные для g3-4
  found: g3-4.dependencies = [{taskId: 'g3-2', type: 'FF', lag: 0}]. Lag уже 0 в текущем коде. Либо был изменён разработчиком после бага, либо баг воспроизводится с другими данными.
  implication: Нужно воспроизвести баг с явным lag=-7 чтобы подтвердить.

- timestamp: 2026-03-16T00:08:00Z
  checked: universalCascade RULE 1 vs RULE 3 конфликт для inter-child dependencies
  found: При drag parent g3, child g3-4 (FF lag from g3-2) добавляется в visited через RULE 1. RULE 3 при обработке g3-2 пытается добавить g3-4 как successor — НО g3-4 visited → SKIP. g3-4 позиционируется delta-смещением. При равномерном move — это эквивалентно FF constraint. НО lag в data остаётся как в оригинале (не пересчитывается).
  implication: Данные сохраняются корректно. Позиция может отличаться только при resize (разный delta для start vs end).

## Resolution

root_cause: Нужна дополнительная проверка — добавить тестовый кейс и воспроизвести баг. Код кажется корректным, но данные в page.tsx уже имеют lag=0 (что может быть результатом бага).
fix: (pending)
verification: (pending)
files_changed: []
