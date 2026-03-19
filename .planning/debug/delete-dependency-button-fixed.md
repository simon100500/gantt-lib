# Fix: Кнопка удаления связи в ячейке предшественника

## Проблема

При клике на кнопку "× удалить" в ячейке предшественника (когда выделена связь через чип) связь не удалялась — ничего не происходило.

### Воспроизведение

1. Открыть таск-лист с задачами, имеющими зависимости
2. Кликнуть на чип зависимости в строке задачи-преемника (например, "FS" или "+1")
3. В строке предшественника появляется интерактивная ячейка с текстом "Связано с"
4. При наведении текст меняется на "× удалить"
5. **Клик на кнопку не работает** — связь не удаляется

При этом удаление через popover (кнопка "Удалить связь" внутри popover) работает корректно.

---

## Root Causes (причины проблемы)

Было обнаружено **три основные причины**:

### 1. `pointer-events` на дочерних `<span>` элементах

В ячейке предшественника текст отображается через два `<span>` элемента:

```tsx
<span className="gantt-tl-dep-delete-label-default">Связано с</span>
<span className="gantt-tl-dep-delete-label-hover">× удалить</span>
```

У этих элементов не было `pointer-events: none`, поэтому клики по ним не всегда корректно передавались на родительскую ячейку.

**Fix:** Добавлено `pointer-events: none` в CSS для обоих span:

```css
.gantt-tl-dep-delete-label-default {
  display: inline;
  pointer-events: none;
}

.gantt-tl-dep-delete-label-hover {
  display: none;
  font-weight: 600;
  pointer-events: none;
}
```

---

### 2. `handleOpenChange` в `DepChip` очищал `selectedChip` при автоматическом закрытии popover

В компоненте `DepChip` функция `handleOpenChange` вызывалась Radix `Popover` при **любом** изменении состояния (включая автоматическое закрытие при потере фокуса):

```tsx
// БЫЛО (неправильно)
const handleOpenChange = useCallback(
  (open: boolean) => {
    setPopoverOpen(open);
    if (!open) {
      onChipSelect?.(null);  // ← Очищало selectedChip даже при автоматическом закрытии!
    }
  },
  [onChipSelect],
);
```

Это приводило к тому, что `selectedChip` становился `null` сразу после открытия popover, и кнопка удаления в ячейке предшественника не могла получить данные о связи.

**Fix:** Убрано автоматическое очищение `selectedChip` в `handleOpenChange`:

```tsx
// СТАЛО (правильно)
const handleOpenChange = useCallback(
  (open: boolean) => {
    setPopoverOpen(open);
    // Don't clear selectedChip on automatic popover close (e.g. focus loss, escape)
    // Only clear when user explicitly closes via chip click or trash button
  },
  [],
);
```

Теперь `selectedChip` очищается только при явных действиях пользователя:
- Клик на чип для закрытия
- Клик на кнопку "Удалить связь" в popover
- Клик на кнопку "× удалить" в ячейке предшественника

---

### 3. `e.preventDefault()` в `onMouseDown` предотвращал `onClick`

В обработчике `onMouseDown` ячейки вызывался `e.preventDefault()`:

```tsx
// БЫЛО (неправильно)
onMouseDown={(e) => {
  if (e.button === 0 && isSelectedPredecessor && !disableDependencyEditing) {
    e.stopPropagation();
    e.preventDefault();  // ← Это предотвращало последующий onClick!
    // ... удаление связи
  }
}}
```

Порядок событий мыши: `mousedown` → `mouseup` → `click`

Вызов `preventDefault()` на `mousedown` может предотвратить генерацию `click` события, поэтому `onClick` обработчик никогда не вызывался.

**Fix:** Убрано дублирование логики удаления и `preventDefault()`:

```tsx
// СТАЛО (правильно)
onMouseDown={(e) => {
  // Stop propagation on mousedown to prevent row click interference
  if (e.button === 0 && isSelectedPredecessor && !disableDependencyEditing) {
    e.stopPropagation();
  }
  // Actual deletion happens in onClick
}}

onClick={(e) => {
  e.stopPropagation();
  if (isSelectedPredecessor && !disableDependencyEditing) {
    handleDeleteSelected(e);
  }
}}
```

---

## Дополнительные изменения

### Упрощён `handleDeleteSelected`

Функция теперь использует опциональную цепочку для зависимостей `useCallback`, чтобы избежать stale closure:

```tsx
const handleDeleteSelected = useCallback(
  (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedChip) return;
    
    onRemoveDependency?.(
      selectedChip.successorId,
      selectedChip.predecessorId,
      selectedChip.linkType as LinkType,
    );
    onChipSelect?.(null);
  },
  [selectedChip?.successorId, selectedChip?.predecessorId, selectedChip?.linkType, onRemoveDependency, onChipSelect],
);
```

### Удалены отладочные `console.log`

Убраны все временные логи из:
- `TaskListRow.tsx`
- `TaskList.tsx`
- `DepChip.tsx`

---

## Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `packages/gantt-lib/src/components/TaskList/TaskList.css` | Добавлено `pointer-events: none` для `.gantt-tl-dep-delete-label-default` и `.gantt-tl-dep-delete-label-hover` |
| `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` | Исправлен `handleOpenChange` в `DepChip`, упрощён `handleDeleteSelected`, убран `preventDefault()` из `onMouseDown`, удалены логи |
| `packages/gantt-lib/src/components/TaskList/TaskList.tsx` | Удалены отладочные логи из `handleChipSelect`, `handleRemoveDependency`, `useEffect` cleanup |

---

## Проверка

После фикса:

1. ✅ Клик на чип зависимости открывает popover и устанавливает `selectedChip`
2. ✅ `selectedChip` **не очищается** автоматически при закрытии popover
3. ✅ Клик на кнопку "× удалить" в ячейке предшественника удаляет связь
4. ✅ Клик на кнопку "Удалить связь" в popover также работает
5. ✅ Клик на "×" (quick delete) внутри чипа работает
6. ✅ Escape и клик вне области корректно очищают состояние

---

## Timeline

- **2026-03-19T16:45** — Создан debug файл, начато расследование
- **2026-03-19T18:10** — Добавлены обширные логи для трассировки событий
- **2026-03-19T19:00** — Обнаружена проблема с `pointer-events` на span элементах
- **2026-03-19T19:15** — Обнаружена проблема с `handleOpenChange` и автоматическим закрытием popover
- **2026-03-19T19:30** — Обнаружена проблема с `preventDefault()` в `onMouseDown`
- **2026-03-19T19:45** — Все фиксы применены, протестированы и задокументированы
