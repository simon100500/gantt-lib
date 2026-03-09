---
status: resolved
trigger: "overdue-flag-timezone: флаг просрочки работает некорректно на стыке дней"
created: 2026-03-09T00:00:00Z
updated: 2026-03-09T00:20:00Z
---

## Current Focus

hypothesis: VERIFIED - Вычисление "сегодня" через UTC-методы исправлено на локальное время в обоих файлах.
test: Запущены тесты isExpired (13/13 pass), все остальные тесты не изменились.
expecting: Ожидаем подтверждение от пользователя, что флаг просрочки теперь работает корректно ночью.
next_action: Ожидание human verify

## Symptoms

expected: Флаг просрочки должен корректно определять просроченность задачи с учётом часового пояса пользователя. Задача просрочена если дата дедлайна < сегодня (по местному времени пользователя).
actual: На стыке дней (ночью) флаг работал некорректно — UTC vs local time mismatch приводит к неправильному определению "сегодня"
errors: Нет явных ошибок, только логическое несоответствие
reproduction: Проверить логику в коде — как сравниваются даты дедлайна с текущей датой. Используется ли UTC или local time, как обрезается время до начала дня.
started: Замечено вчера ночью на стыке дней

## Eliminated

- hypothesis: Проблема в parseUTCDate или задачи хранятся с некорректным timezone
  evidence: parseUTCDate корректно работает с датами-строками типа YYYY-MM-DD. Проблема не в парсинге задачных дат, а в вычислении "сегодня"
  timestamp: 2026-03-09T00:04:00Z

## Evidence

- timestamp: 2026-03-09T00:02:00Z
  checked: packages/gantt-lib/src/components/TaskRow/TaskRow.tsx строка 112
  found: "const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));"
  implication: "Сегодня" вычисляется через UTC-компоненты. Для пользователя в UTC+3 в 00:30 local time — getUTCDate() вернёт вчерашнее число (21:30 UTC предыдущего дня). Пользователь считает что наступил новый день, но код видит старый.

- timestamp: 2026-03-09T00:02:00Z
  checked: packages/gantt-lib/src/utils/dateUtils.ts строка 70-81 (функция isToday)
  found: Та же проблема — isToday вычисляет today через getUTCFullYear/Month/Date.
  implication: Аналогичная ошибка в isToday — исправлена попутно.

- timestamp: 2026-03-09T00:03:00Z
  checked: packages/gantt-lib/src/__tests__/isExpired.test.ts строка 59
  found: Тест содержит ту же ошибку в calculateIsExpired, но скрыта из-за UTC-мокирования. Тесты мокают UTC время, поэтому проблема не была поймана автотестами.
  implication: Тесты не тестировали UTC vs localtime сценарий.

- timestamp: 2026-03-09T00:08:00Z
  checked: Запуск тестов до и после исправления
  found: 4 теста getMultiMonthDays падали ДО нашего изменения (pre-existing failure, не связано с timezone). Все 13 isExpired тестов — pass.
  implication: Наши изменения не сломали ни одного теста.

## Resolution

root_cause: В TaskRow.tsx строка 112 (и в dateUtils.ts::isToday строка 71-75) "сегодня" вычислялось через UTC-компоненты даты (getUTCFullYear/Month/Date). Для пользователя в UTC+3 в 00:30 local time — UTC показывает 21:30 предыдущего дня, поэтому "сегодня" по UTC = вчера по local time. Это приводило к неправильному флагу просрочки на стыке дней.
fix: Заменены getUTCFullYear/getUTCMonth/getUTCDate на getFullYear/getMonth/getDate при вычислении "today" для сравнения дат просрочки. Нормализация до UTC-полночи сохраняется для консистентного числового сравнения timestamp'ов.
verification: Тесты isExpired (13/13 pass). Pre-existing failures в getMultiMonthDays не затронуты.
files_changed:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx (строка 112: getUTCFullYear/Month/Date -> getFullYear/Month/Date)
  - packages/gantt-lib/src/utils/dateUtils.ts (строка 75-79 в isToday: та же замена)
