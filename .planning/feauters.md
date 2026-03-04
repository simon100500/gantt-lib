Давай подумаем системно. Библиотека должна получить минимум данных чтобы нарисовать всё что мы видели в прототипе.

---

## Что библиотека должна уметь делать

Из прототипа вырисовывается список задач:
- Рисовать строки с полосками на временной сетке
- Показывать разделители между группами
- Показывать теги на строках
- Рисовать прогресс внутри полоски
- Показывать заголовок с месяцами/неделями
- Обрабатывать hover и клик на полоске

---

## Основные пропсы

```typescript
interface GanttProps {

  // ─── ДАННЫЕ ────────────────────────────────────────
  rows: GanttRow[]

  // ─── ВРЕМЕННАЯ ШКАЛА ───────────────────────────────
  startDate: Date           // начало шкалы
  endDate: Date             // конец шкалы
  timeUnit: 'day' | 'week' | 'month'  // единица сетки

  // ─── РАЗМЕРЫ ───────────────────────────────────────
  rowHeight?: number        // высота строки, default 44
  labelWidth?: number       // ширина левой колонки, default 220

  // ─── КОЛОНКИ СЛЕВА ─────────────────────────────────
  columns?: ColumnDef[]     // что показывать слева кроме названия

  // ─── СОБЫТИЯ ───────────────────────────────────────
  onBarClick?: (row: GanttRow) => void
  onBarHover?: (row: GanttRow, event: MouseEvent) => void
  onBarDrop?: (row: GanttRow, newStart: Date, newEnd: Date) => void

  // ─── КАСТОМИЗАЦИЯ ──────────────────────────────────
  renderLabel?: (row: GanttRow) => ReactNode   // кастомный лейбл
  renderBar?: (row: GanttRow) => ReactNode     // кастомная полоска
  renderTooltip?: (row: GanttRow) => ReactNode // кастомный тултип

  // ─── ОПЦИИ ─────────────────────────────────────────
  todayLine?: boolean       // показывать линию «сегодня»
  showProgress?: boolean    // показывать прогресс внутри бара
  showWeekends?: boolean    // подсвечивать выходные
}
```

---

## Структура строки — GanttRow

Это главный объект. Всё остальное производно от него.

```typescript
interface GanttRow {

  // ─── ОБЯЗАТЕЛЬНЫЕ ──────────────────────────────────
  id: string
  label: string

  // ─── ТИП СТРОКИ ────────────────────────────────────
  type: 'bar'       // обычная строка с полоской
      | 'divider'   // разделитель-заголовок группы
      | 'group'     // строка-агрегат со своей полоской

  // ─── ВРЕМЕННЫЕ РАМКИ (для type='bar'|'group') ──────
  start?: Date
  end?: Date

  // ─── ОТОБРАЖЕНИЕ ───────────────────────────────────
  progress?: number          // 0–100
  color?: string             // цвет полоски
  tags?: Tag[]               // теги слева
  sublabel?: string          // мелкий текст под названием

  // ─── ИЕРАРХИЯ (опционально) ────────────────────────
  parentId?: string          // для связи с группой
  depth?: number             // уровень отступа 0,1,2...
  isCollapsed?: boolean      // свёрнута ли группа

  // ─── ДОПОЛНИТЕЛЬНЫЕ ПОЛОСКИ В СТРОКЕ ───────────────
  bars?: InlineBar[]         // несколько баров в одной строке

  // ─── МЕТАДАННЫЕ ────────────────────────────────────
  // всё что нужно приложению — секция, этаж, тип работы
  // библиотека не трогает, возвращает в коллбэках
  meta?: Record<string, any>
}
```

---

## Вспомогательные типы

```typescript
// Тег — цветная пилюля на строке
interface Tag {
  label: string
  color: string       // цвет текста
  background: string  // цвет фона
}

// Дополнительная полоска в одной строке
// (для режима когда несколько работ в одной строке)
interface InlineBar {
  id: string
  start: Date
  end: Date
  color: string
  progress?: number
  label?: string
  lane?: number       // номер дорожки, если не задан — библиотека считает сама
}

// Дополнительная колонка слева (прогресс, ответственный и т.д.)
interface ColumnDef {
  key: string
  header: string
  width: number
  render?: (row: GanttRow) => ReactNode
}
```

---

## Как это выглядит в использовании

```typescript
// Приложение строит rows из своей доменной модели
// и передаёт в библиотеку

<Gantt
  rows={[
    // Разделитель
    {
      id: 'div-sec-a',
      type: 'divider',
      label: 'Секция А',
    },

    // Обычная строка
    {
      id: 'a-1-kladka',
      type: 'bar',
      label: 'Кладка',
      start: new Date('2025-02-01'),
      end: new Date('2025-02-06'),
      color: '#2563eb',
      progress: 100,
      tags: [
        { label: 'Эт. 1', color: '#558b2f', background: '#f0f4e8' }
      ],
      meta: { section: 'А', floor: 1, workType: 'kladka' }
    },

    // Строка с несколькими полосками
    {
      id: 'a-1-group',
      type: 'group',
      label: 'Этаж 1 · все работы',
      bars: [
        { id: 'b1', start: ..., end: ..., color: '#2563eb', label: 'Кл.' },
        { id: 'b2', start: ..., end: ..., color: '#7c3aed', label: 'Ок.' },
      ]
    },
  ]}

  startDate={new Date('2025-02-01')}
  endDate={new Date('2025-06-01')}
  timeUnit="month"
  rowHeight={44}
  labelWidth={220}

  onBarClick={(row) => openDetail(row)}
  onBarDrop={(row, start, end) => updateTask(row.id, start, end)}

  renderTooltip={(row) => (
    <CustomTooltip
      work={row.meta.workType}
      floor={row.meta.floor}
      progress={row.progress}
    />
  )}

  todayLine
  showProgress
/>
```

---

## Главный принцип

Библиотека получает **плоский массив строк** — никакой вложенности, никакого дерева. Иерархия выражается через `parentId` и `depth` если нужна, но это опционально.

Всю логику группировки — кто после кого, какие теги показывать, как агрегировать прогресс — делает **приложение** до передачи в библиотеку. Библиотека просто рисует то что получила.

Это делает библиотеку простой и универсальной — она не знает ничего про секции, этажи и захватки.