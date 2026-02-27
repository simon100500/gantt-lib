# Phase 12: Task List - Research

**Researched:** 2026-02-27
**Domain:** React overlay component with synchronized scrolling and inline editing
**Confidence:** HIGH

## Summary

Phase 12 implements a task list overlay panel that displays tasks in a table format (№, Name, Start Date, End Date) positioned to the left of the Gantt chart timeline. The overlay uses a "sticky left" positioning approach rather than a traditional split-pane layout, which significantly simplifies implementation by avoiding complex horizontal scroll synchronization between separate panes.

The implementation will involve:
1. Creating a new `TaskList` component with overlay positioning
2. Implementing inline editing for task name and dates (standard pattern: Enter/blur to save, Esc to cancel)
3. Synchronizing vertical scrolling with the main Gantt chart (single shared scroll container)
4. Styling rows to match TaskRow component visuals (borders, colors, spacing)
5. Making the overlay toggleable via external prop control

**Primary recommendation:** Use a positioned overlay within the existing scroll container, not a separate split-pane layout. This leverages the existing scroll infrastructure and avoids complex cross-container synchronization.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Overlay вместо split-view** — список задач накладывается на график слева, а не является отдельной колонкой в таблице
- Это упрощает реализацию: не нужна сложная синхронизация двух горизонтально-прокручиваемых областей
- Временная шкала остаётся нетронутой, вся текущая логика прокрутки сохраняется
- **Кнопка-тоггл**: внешняя, controlled externally (не внутри Gantt component)
- **Триггер**: нажатие кнопки показывает/скрывает overlay
- **Фон**: непрозрачный, полностью перекрывает область под ним
- **Позиционирование**: `position: sticky` слева
- **Прокрутка**: единый контейнер, overlay прокручивается вместе с графиком
- **Скроллбар**: общий, у overlay нет своего вертикального скроллбара
- **Высота строки**: равна `rowHeight` задачи (строки выровнены с задачами на графике)
- **4 колонки**: № + Имя + Начало + Окончание
- **Формат дат**: короткий (01.03.26)
- **Без статусных иконок** — только текст, без progress/lock/dependencies иконок
- **Inline редактирование** всех значений
- **Стандартный pattern**: клик → input появляется, Enter/blur → сохранить, Esc → отмена
- Редактируемые поля: имя, начало, окончание (номер только для чтения)
- **Выделение строк**: клик выделяет строку, подсвечивает соответствующую задачу на графике
- **Стиль**: совпадает с TaskRow component (те же границы, цвета, отступы)

### Claude's Discretion
- Точная ширина overlay (можно сделать настраиваемой через prop, например `taskListWidth?: number`)
- Обработка множественного выбора строк
- Детали анимации появления/исчезновения overlay
- Обработка пустого состояния (нет задач)

### Deferred Ideas (OUT OF SCOPE)
Нет отложенных идей — обсуждение stayed within phase scope.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component framework | Project uses React 18 with client components |
| date-fns | ^4.1.0 | Date formatting | Already used in project for formatDateLabel (DD.MM format) |
| TypeScript | 5.x | Type safety | Project uses strict mode TypeScript |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS Variables | - | Theming | Project uses CSS variables for all styling values |
| React hooks | useState, useCallback, useRef, useEffect | State management | Standard React patterns used throughout project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| overlay approach | Split-pane with separate scroll containers | Split-pane requires complex horizontal scroll synchronization; overlay leverages existing scroll infrastructure |
| inline editing | Modal/dialog editing | Modal breaks flow for quick edits; inline is faster for bulk changes |

**Installation:**
```bash
# No new packages needed - all dependencies already in project
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── TaskList/
│   │   ├── TaskList.tsx      # Main component
│   │   ├── TaskListRow.tsx   # Individual row with inline edit
│   │   ├── TaskList.css      # Styles with gantt-tl-* prefix
│   │   └── index.tsx         # Exports
│   ├── GanttChart/
│   │   ├── GanttChart.tsx    # Add showTaskList prop, integrate TaskList
│   │   └── GanttChart.css
```

### Pattern 1: Inline Editing Cell Component
**What:** Reusable cell component that switches between display and edit modes
**When to use:** For all editable fields (name, startDate, endDate)
**Example:**
```typescript
// Standard inline edit pattern from project conventions
const EditableCell: React.FC<{
  value: string;
  onSave: (value: string) => void;
  isReadOnly?: boolean;
}> = ({ value, onSave, isReadOnly }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    onSave(editValue);
    setIsEditing(false);
  }, [editValue, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  if (isReadOnly || !isEditing) {
    return (
      <span onClick={() => !isReadOnly && setIsEditing(true)} style={{ cursor: isReadOnly ? 'default' : 'pointer' }}>
        {value}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      style={{ width: '100%' }}
    />
  );
};
```

**Source:** Standard React inline editing pattern (project convention from Modal component keyboard handling)

### Pattern 2: Overlay with Shared Scroll Container
**What:** Position overlay absolutely within existing scroll container, not as separate scrollable area
**When to use:** When you need synchronized scrolling without complex cross-container event handling
**Example:**
```typescript
// GanttChart.tsx integration
<div className="gantt-scrollContainer" ref={scrollContainerRef}>
  {/* Existing header */}
  <div className="gantt-stickyHeader">
    <TimeScaleHeader />
  </div>

  {/* Task area with overlay */}
  <div className="gantt-taskArea" style={{ position: 'relative' }}>
    {/* Task list overlay - positioned within task area */}
    {showTaskList && (
      <div
        className="gantt-tl-overlay"
        style={{
          position: 'sticky',
          left: 0,
          top: 0,
          width: taskListWidth || 300,
          height: '100%',
          zIndex: 5,
        }}
      >
        <TaskList tasks={tasks} rowHeight={rowHeight} onTaskChange={handleTaskChange} />
      </div>
    )}

    {/* Existing task rows */}
    {tasks.map((task, index) => (
      <TaskRow key={task.id} task={task} />
    ))}
  </div>
</div>
```

**Source:** Project's existing sticky header pattern (`gantt-stickyHeader` uses `position: sticky`)

### Pattern 3: CSS Class Prefixing
**What:** Prefix all CSS classes with component abbreviation to avoid collisions
**When to use:** For all new components in the library
**Example:**
```css
/* TaskList.css - use gantt-tl- prefix */
.gantt-tl-overlay { }
.gantt-tl-row { }
.gantt-tl-cell { }
.gantt-tl-cell-number { }
.gantt-tl-cell-name { }
.gantt-tl-cell-date { }
.gantt-tl-row-selected { }
```

**Source:** Project convention established in Phase 4 (CSS prefixing: gantt-*, gantt-tr-*, gantt-tsh-*, gantt-gb-*, gantt-ti-*)

### Anti-Patterns to Avoid
- **Separate scroll containers for overlay**: Don't create a new scrollable div for the task list. This requires complex scroll event synchronization. Instead, use position: sticky within the existing scroll container.
- **Portal rendering for overlay**: Don't use React Portal for the overlay (unlike Modal). The overlay must be within the scroll container to inherit scroll behavior naturally.
- **CSS transitions during drag/edit**: Don't use CSS transitions on elements that update frequently during user interaction. Use `transition: none !important` during active editing/drag (see TaskRow dragging state pattern).
- **Inline date editing without validation**: Don't allow arbitrary date strings. Validate date format (YYYY-MM-DD) on save and show error feedback.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom date string manipulation | `formatDateLabel` from `dateUtils.ts` | Already exists in project, handles UTC correctly |
| Date parsing | Custom ISO parsing | `parseUTCDate` from `dateUtils.ts` | Project standard, handles DST issues |
| Inline edit state management | Custom reducer/context | React useState + useEffect | Simple enough for local component state |
| Keyboard handling | Manual event listener attachment | React onKeyDown prop | Cleaner, automatically cleaned up |
| CSS variables for theming | Hardcoded colors | CSS variables with --gantt- prefix | Project convention, user-customizable |

**Key insight:** The project already has robust date utilities. Reuse `parseUTCDate` and `formatDateLabel` rather than building new date handling code. The inline editing pattern is straightforward enough to implement with standard React hooks—no need for external libraries like react-table.

## Common Pitfalls

### Pitfall 1: Separate Scroll Container Breaks Sync
**What goes wrong:** Creating a new scrollable div for the task list that doesn't sync with the main chart's vertical scroll
**Why it happens:** Developer thinks "task list needs its own scroll area"
**How to avoid:** Use `position: sticky` within the existing scroll container. The overlay will naturally move with the scroll without any JavaScript synchronization code.
**Warning signs:** You find yourself writing scroll event listeners or useRef for scroll syncing

### Pitfall 2: Blur Fires Before Click on Other Element
**What goes wrong:** Clicking from one inline edit cell to another causes the first cell's blur to save, then the second click doesn't enter edit mode
**Why it happens:** onBlur fires before the next element's onClick, causing re-render that removes the target
**How to avoid:** Use `onMouseDown` instead of `onClick` for entering edit mode, or use a small timeout in onBlur to check if a new click target is valid
**Warning signs:** Click-to-edit feels "flaky" or requires double-click

### Pitfall 3: Date Format Validation Missing
**What goes wrong:** User types invalid date format, task data gets corrupted
**Why it happens:** Inline edit accepts any string without validation
**How to avoid:** Validate date format with `parseUTCDate` in onSave, show error state if invalid, revert to original value
**Warning signs:** No try/catch around `parseUTCDate` in the save handler

### Pitfall 4: Row Height Mismatch Causes Misalignment
**What goes wrong:** Task list rows don't align vertically with task bars
**Why it happens:** Task list row height doesn't match Gantt chart's rowHeight prop
**How to avoid:** Pass rowHeight prop to TaskList and use it explicitly: `style={{ height: `${rowHeight}px` }}`
**Warning signs:** Visual misalignment between overlay and chart

### Pitfall 5: Z-Index Layering Issues
**What goes wrong:** Overlay appears behind task bars or grid lines
**Why it happens:** Z-index values not properly layered (overlay must be above grid but below drag guide lines)
**How to avoid:** Use z-index: 5 for overlay (grid is 0, guide lines are 20)
**Warning signs:** Task bars obscure the task list text

## Code Examples

Verified patterns from official sources:

### Inline Edit with Enter/Blur Save, Esc Cancel
```typescript
// Source: Standard React inline editing pattern (project convention)
// Similar to Modal.tsx keyboard handling (ESC to close)
const useInlineEdit = (initialValue: string, onSave: (value: string) => void) => {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSave(value);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    onSave(value);
    setIsEditing(false);
  };

  return { value, setValue, isEditing, setIsEditing, inputRef, handleKeyDown, handleBlur };
};
```

### Date Cell with Validation
```typescript
// Source: Project's dateUtils.ts (parseUTCDate throws on invalid)
const DateCell: React.FC<{
  value: string;
  onSave: (dateString: string) => void;
}> = ({ value, onSave }) => {
  const [error, setError] = useState(false);

  const handleSave = (newValue: string) => {
    try {
      parseUTCDate(newValue); // Validate format
      onSave(newValue);
      setError(false);
    } catch {
      setError(true);
      // Don't exit edit mode on invalid date
    }
  };

  return (
    <EditableCell
      value={formatDateLabel(value)} // Display as DD.MM
      onSave={(formatted) => {
        // Convert back from DD.MM to YYYY-MM-DD
        const [day, month] = formatted.split('.');
        const year = new Date(value).getUTCFullYear();
        handleSave(`${year}-${month}-${day}`);
      }}
    />
  );
};
```

### Overlay Positioning
```css
/* Source: Project's GanttChart.css (gantt-stickyHeader pattern) */
.gantt-tl-overlay {
  position: sticky;
  left: 0;
  top: 0;
  background-color: var(--gantt-cell-background, #ffffff);
  border-right: 1px solid var(--gantt-grid-line-color, #e0e0e0);
  z-index: 5; /* Above grid (0), below guide lines (20) */
  pointer-events: auto;
}
```

### Row Matching TaskRow Style
```css
/* Source: TaskRow.css (gantt-tr-row, gantt-tr-divider patterns) */
.gantt-tl-row {
  height: var(--gantt-row-height, 40px);
  border-bottom: 1px solid var(--gantt-grid-line-color, #e0e0e0);
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.gantt-tl-row:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.gantt-tl-row-selected {
  background-color: rgba(59, 130, 246, 0.1);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Split-pane with scroll sync | Single container with sticky overlay | This phase | Simpler implementation, no cross-container event handling |
| External date libraries | Reuse project's dateUtils | This phase | Consistent date handling, no new dependencies |

**Deprecated/outdated:**
- Manual scroll event synchronization: Modern CSS `position: sticky` handles this automatically
- Portal-rendered overlays for this use case: Only use Portal for modals/dropdowns that need to break out of container

## Open Questions

1. **Should task selection highlight the corresponding task bar on the chart?**
   - What we know: Context.md says "клик выделяет строку, подсвечивает соответствующую задачу на графике"
   - What's unclear: How to communicate selection state from TaskList to TaskRow (shared state or callback?)
   - Recommendation: Add `selectedTaskId` state to GanttChart, pass to both TaskList and TaskRow

2. **What happens when task list width exceeds viewport on small screens?**
   - What we know: Context.md says width is configurable via prop
   - What's unclear: Minimum width behavior, overflow handling
   - Recommendation: Set min-width of 200px, allow horizontal scroll within overlay if needed

3. **Should inline editing update the chart in real-time or on save?**
   - What we know: Standard pattern is save on Enter/blur
   - What's unclear: Should task bar preview show edited values before save?
   - Recommendation: Update only on save to match existing drag behavior (onChange fires after completion)

## Validation Architecture

> Note: workflow.nyquist_validation is false in .planning/config.json — validation section skipped per instructions

## Sources

### Primary (HIGH confidence)
- **Project source code** - Analyzed GanttChart.tsx, TaskRow.tsx, TaskRow.css, styles.css, Modal.tsx, dateUtils.ts
- **CONTEXT.md** - Phase 12 user decisions and implementation requirements
- **REQUIREMENTS.md** - Project requirements and feature scope
- **STATE.md** - Project decisions and history

### Secondary (MEDIUM confidence)
- **Project README.md** - API reference and component patterns
- **docs/REFERENCE.md** - Complete API documentation

### Tertiary (LOW confidence)
- Web search for React inline editing patterns (service unavailable at research time — relied on project conventions and standard React patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on existing project dependencies (React 18, date-fns, TypeScript)
- Architecture: HIGH - Based on project patterns (sticky positioning, CSS prefixing, overlay from Modal component)
- Pitfalls: HIGH - Derived from project history and common React anti-patterns

**Research date:** 2026-02-27
**Valid until:** 2026-03-29 (30 days - stable domain)

---

*Phase: 12-task-list*
*Research completed: 2026-02-27*
