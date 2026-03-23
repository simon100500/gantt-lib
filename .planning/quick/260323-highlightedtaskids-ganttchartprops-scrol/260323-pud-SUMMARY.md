# Quick Task 260323-pud: добавить highlightedTaskIds в GanttChartProps, реализовать scrollToRow для TaskList и поиск с прокруткой на demo page

**One-liner:** Добавлен проп highlightedTaskIds для подсветки задач и метод scrollToRow для программной прокрутки к строке задачи.

**Status:** COMPLETE (уже реализовано в предыдущих коммитах)
**Started:** 2026-03-23
**Completed:** 2026-03-23
**Duration:** 0 мин (функционал уже существовал)

---

## Deviations from Plan

**None - plan executed exactly as written.**

**Note:** При проверке обнаружено, что весь функционал из плана уже был реализован ранее в quick task `260321-dzb` (коммиты `8b12aaa`, `b034950`, `0a68ec2`). Данный план просто подтвердил наличие и работоспособность существующего кода.

---

## Tasks Completed

### Task 1: Extend GanttChart public API ✅

**Status:** Already implemented

**Файлы:**
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`

**Изменения:**
- Добавлен проп `highlightedTaskIds?: Set<string>` в `GanttChartProps` (строка 151)
- Проп прокидывается в `TaskList` через `taskListHighlightedTaskIds` (строки 298-310)
- Метод `scrollToRow(taskId: string)` уже есть в `GanttChartHandle` (строка 164)
- Реализация метода `scrollToRow` (строки 413-427):
  - Находит задачу по ID
  - Вычисляет индекс строки в `visibleTasks`
  - Применяет отступ `SCROLL_TO_ROW_CONTEXT_ROWS = 2` для контекста
  - Прокручивает контейнер с плавной анимацией
  - Выделяет задачу через `setSelectedTaskId`

**Коммиты:**
- `8b12aaa`: feat(gantt): implement search row highlight and scroll functionality
- `b034950`: feat(260321-dzb): Task 1 - rollback search and add highlightedTaskIds prop

---

### Task 2: Add regression coverage ✅

**Status:** Already implemented

**Файлы:**
- `packages/gantt-lib/src/__tests__/taskFilter.test.tsx`

**Тесты:**
1. **Тест для highlightedTaskIds** (строки 61-90):
   - Проверяет, что внешние `highlightedTaskIds` прокидываются в TaskList
   - Проверяет наличие CSS класса `[data-filter-match="true"]`
   - Подтверждает, что подсвечивается правильная задача

2. **Тест для scrollToRow** (строки 92-140):
   - Создаёт 4 задачи для проверки прокрутки
   - Проверяет вызов `scrollContainer.scrollTo` с правильными параметрами
   - Подтверждает вычисление `scrollTop` с учётом `rowHeight` и контекстных строк

**Результат:** Все тесты проходят (3/3 passed)

**Коммиты:**
- `0a68ec2`: feat(260321-dzb): Task 2 - implement scrollToRow and add search demo

---

### Task 3: Wire demo page search ✅

**Status:** Already implemented

**Файлы:**
- `packages/website/src/app/page.tsx`

**Функционал:**
1. **State для поиска** (строки 829-831):
   - `searchQuery`: текст поискового запроса
   - `activeSearchResultIndex`: индекс текущего результата
   - `ganttChartRef`: ref для доступа к методам GanttChart

2. **Вычисление результатов поиска** (строки 839-858):
   - `searchResultIds`: массив ID задач, совпадающих с запросом
   - Поиск по префиксам слов в названии задачи (case-insensitive)
   - Разбиение названия на слова и проверка каждого слова на `startsWith`

3. **Подсветка результатов** (строки 855-858):
   - `highlightedSearchTaskIds`: Set из ID найденных задач
   - Прокидывается в `GanttChart` через проп `highlightedTaskIds`

4. **Навигация по результатам** (строки 834-877, 934-949):
   - Клавиши ↑/↓ для перехода между результатами
   - Кнопки ↑/↓ в UI для навигации
   - Отображение счётчика "X / Y"

5. **Авто-прокрутка** (строки 879-882):
   - При изменении `activeSearchTaskId` вызывается `ganttChartRef.current?.scrollToRow(activeSearchTaskId)`
   - Плавная прокрутка к активному результату

6. **UI для поиска** (строки 1251-1294):
   - Input поле для ввода поискового запроса
   - Кнопки навигации ↑/↓
   - Счётчик результатов с отображением текущей позиции

**Коммиты:**
- `0a68ec2`: feat(260321-dzb): Task 2 - implement scrollToRow and add search demo
- `9600f96`: docs(260321-dzb): Fix search: highlight prop + scrollToRow method + demo search field

---

## Implementation Details

### API Design

**Prop: highlightedTaskIds**
```typescript
highlightedTaskIds?: Set<string>;
```
- Внешний проп для передачи ID задач, которые нужно подсветить
- Мёржится с ID из `taskFilter` для объединения подсветки от фильтров и поиска
- В режиме `filterMode='hide'` не применяется (все видимые задачи уже совпадают)

**Method: scrollToRow**
```typescript
scrollToRow(taskId: string): void;
```
- Императивный метод для прокрутки к задаче по ID
- Использует `scrollContainerRef` для доступа к контейнеру скролла
- Вычисляет `scrollTop` с учётом:
  - Индекса задачи в `visibleTasks`
  - `rowHeight` для вычисления позиции в пикселях
  - `SCROLL_TO_ROW_CONTEXT_ROWS = 2` для отступа сверху (контекст)
- Прокручивает с `behavior: 'smooth'` для плавной анимации
- Выделяет задачу через `setSelectedTaskId(taskId)`

### Merge Logic for highlightedTaskIds

```typescript
const taskListHighlightedTaskIds = useMemo(() => {
  // In hide mode, no highlighting needed - all visible tasks already match the filter
  if (filterMode === 'hide') {
    return new Set<string>();
  }
  if ((!highlightedTaskIds || highlightedTaskIds.size === 0) && matchedTaskIds.size === 0) {
    return new Set<string>();
  }

  const mergedHighlightedTaskIds = new Set(highlightedTaskIds ?? []);
  matchedTaskIds.forEach((taskId) => mergedHighlightedTaskIds.add(taskId));
  return mergedHighlightedTaskIds;
}, [filterMode, highlightedTaskIds, matchedTaskIds]);
```

- В режиме `filterMode='hide'` подсветка отключена (все видимые задачи — совпадения)
- В режиме `filterMode='highlight'` мёржит `highlightedTaskIds` и `matchedTaskIds`
- Это позволяет одновременно подсвечивать результаты поиска И совпадения с фильтром

---

## Testing

**Команда для запуска тестов:**
```bash
cd packages/gantt-lib
npm test -- taskFilter.test.tsx
```

**Результат:** ✓ 3 tests passed

**Покрытие:**
- ✅ Проксирование `highlightedTaskIds` в TaskList
- ✅ Подсветка правильной задачи через CSS класс
- ✅ Вызов `scrollToRow` с правильными параметрами
- ✅ Вычисление `scrollTop` с учётом контекстных строк

---

## Demo Page Verification

**URL для проверки:** `http://localhost:3000`

**Проверка функционала:**
1. ✅ Input поле для поиска принимает текст
2. ✅ Поиск работает по префиксам слов (case-insensitive)
3. ✅ Найденные задачи подсвечиваются жёлтым в списке задач
4. ✅ Клавиши ↑/↓ переключают между результатами
5. ✅ Счётчик показывает "X / Y" для навигации
6. ✅ Авто-прокрутка к активному результату работает
7. ✅ Прокрутка учитывает контекст (2 строки сверху)

---

## Commits

**Related commits (from previous implementation):**
- `8b12aaa`: feat(gantt): implement search row highlight and scroll functionality
- `b034950`: feat(260321-dzb): Task 1 - rollback search and add highlightedTaskIds prop
- `0a68ec2`: feat(260321-dzb): Task 2 - implement scrollToRow and add search demo
- `9600f96`: docs(260321-dzb): Fix search: highlight prop + scrollToRow method + demo search field
- `eb727b9`: fix(260321-e2z): remove headerHeight from scrollToRow calculation
- `3733258`: fix(260321-e2z): fix scrollToRow - use scrollContainerRef
- `6754e4d`: fix(260321-e2z): fix scrollToRow to account for header height
- `fdf0205`: docs(REFERENCE.md): update filter display modes and props for GanttChart

---

## Known Issues

None

---

## Self-Check: PASSED

**Проверка созданных файлов:**
- ✅ `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — существует
- ✅ `packages/gantt-lib/src/__tests__/taskFilter.test.tsx` — существует
- ✅ `packages/website/src/app/page.tsx` — существует

**Проверка коммитов:**
- ✅ `8b12aaa` — найден в git log
- ✅ `b034950` — найден в git log
- ✅ `0a68ec2` — найден в git log

**Проверка сборки:**
- ✅ `packages/gantt-lib` собирается без ошибок
- ✅ `packages/website` собирается без ошибок

**Проверка тестов:**
- ✅ Все 3 теста в `taskFilter.test.tsx` проходят
