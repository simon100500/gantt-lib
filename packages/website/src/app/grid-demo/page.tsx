// START_MODULE_CONTRACT
// PURPOSE: Exercise the SimpleGrid task list and timeline against the same controlled project.
// SCOPE: Editing, dependency chips, hierarchy moves, selection and row actions.
// END_MODULE_CONTRACT
'use client';

import { useState } from 'react';
import { GanttChart, type Task, type TaskListColumn, type TaskListColumnWidthMap, type TimelineMarker } from 'gantt-lib';

type DemoTask = Task & { owner?: string; sortOrder?: number };

const initial: DemoTask[] = [
  { id: 'phase', name: 'Подготовка и фундамент', startDate: '2026-02-02', endDate: '2026-02-18', color: '#5068a9' },
  { id: 'a', parentId: 'phase', name: 'Подготовка площадки', startDate: '2026-02-02', endDate: '2026-02-06', progress: 100, owner: 'Орлов' },
  { id: 'b', parentId: 'phase', name: 'Бетонирование фундамента', startDate: '2026-02-07', endDate: '2026-02-15', progress: 65, owner: 'Ким', dependencies: [{ taskId: 'a', type: 'FS', lag: 0 }] },
  { id: 'accept', parentId: 'phase', name: 'Приёмка основания', startDate: '2026-02-18', endDate: '2026-02-18', type: 'milestone', owner: 'Технадзор', dependencies: [{ taskId: 'a', type: 'FS', lag: 0 }, { taskId: 'b', type: 'FS', lag: 0 }] },
  { id: 'phase-b', name: 'Каркас и перекрытия', startDate: '2026-02-16', endDate: '2026-03-04', color: '#0f766e', composite: true },
  { id: 'frame-1', parentId: 'phase-b', name: 'Каркас первого этажа', startDate: '2026-02-16', endDate: '2026-02-22', progress: 35, owner: 'Ким' },
  { id: 'frame-2', parentId: 'phase-b', name: 'Каркас второго этажа', startDate: '2026-02-23', endDate: '2026-03-04', owner: 'Ким' },
  { id: 'services', name: 'Подвод инженерных сетей', startDate: '2026-02-20', endDate: '2026-02-27', owner: 'Лебедева', progress: 20 },
  ...['Вентиляция', 'Водоснабжение', 'Электрика', 'Слаботочные сети', 'Пусконаладка', 'Акт готовности'].map((name, index) => ({
    id: `engineering-${index}`, name, startDate: `2026-03-${String(2 + index).padStart(2, '0')}`, endDate: '2026-03-12', owner: 'Лебедева',
  })),
];

const ownerColumn: TaskListColumn<DemoTask> = {
  id: 'owner',
  header: 'Ответственный',
  after: 'progress',
  width: 105,
  editable: true,
  renderCell: ({ task }) => task.owner ?? '–',
  renderEditor: ({ task, updateTask, closeEditor }) => <input
    aria-label="Ответственный" defaultValue={task.owner} autoFocus
    onKeyDown={event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeEditor();
      } else if (event.key === 'Enter') {
        event.stopPropagation();
        updateTask({ owner: event.currentTarget.value.trim() });
        closeEditor();
      }
    }}
  />,
};

const withOrder = (tasks: DemoTask[]) => tasks.map((task, sortOrder) => ({ ...task, sortOrder }));
const projectRange = {
  start: new Date('2026-02-02T00:00:00Z'),
  end: new Date('2026-03-16T00:00:00Z'),
};
const timelineMarkers: TimelineMarker[] = [
  { date: '2026-02-18', color: '#2563eb', name: 'Приёмка основания' },
  { date: '2026-03-04', color: '#0f766e', name: 'Готовность каркаса' },
];

export default function GridDemo() {
  const [tasks, setTasks] = useState(() => withOrder(initial));
  const [selected, setSelected] = useState(new Set<string>());
  const [showColumnSeparators, setShowColumnSeparators] = useState(false);
  const [widths, setWidths] = useState<TaskListColumnWidthMap>({
    name: 210, startDate: 84, endDate: 86, duration: 52, progress: 44, dependencies: 108,
  });
  return (
    <main className={showColumnSeparators ? 'demo-task-list-separators' : undefined}
      style={{ maxWidth: 1600, margin: '0 auto', padding: 'clamp(12px, 3vw, 40px)', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(24px, 3vw, 34px)', letterSpacing: '-0.035em' }}>График строительства</h1>
      <p style={{ color: '#526174', margin: '0 0 20px', fontSize: '0.875rem' }}>
        Перетаскивайте за номер строки. Enter открывает редактор выбранной ячейки.
      </p>
      <button type="button" className="demo-btn demo-btn-secondary" style={{ marginBottom: 12 }}
        onClick={() => setShowColumnSeparators(value => !value)}>
        {showColumnSeparators ? 'Выключить вертикальные полосы' : 'Включить вертикальные полосы'}
      </button>
      <GanttChart
        tasks={tasks}
        timelineMarkers={timelineMarkers}
        showTaskList
        showTaskDateLabels={false}
        businessDays={false}
        rowHeight={40}
        rowContentLines={2}
        containerHeight={480}
        taskListWidth={660}
        dateRange={projectRange}
        taskListColumnWidths={widths}
        onTaskListColumnWidthsChange={setWidths}
        additionalColumns={[ownerColumn]}
        enableTaskMultiSelect
        selectedTaskIds={selected}
        onSelectedTaskIdsChange={setSelected}
        onTasksChange={updates => {
          const byId = new Map(updates.map(task => [task.id, task]));
          setTasks(current => current.map(task => byId.get(task.id) ?? task));
        }}
        onReorder={setTasks}
        enableAddTask
        onAdd={task => setTasks(current => withOrder([...current, task]))}
        onInsertAfter={(id, task) => setTasks(current => {
          const index = current.findIndex(item => item.id === id);
          return withOrder([...current.slice(0, index + 1), task, ...current.slice(index + 1)]);
        })}
        onDelete={id => setTasks(current => current.filter(task => task.id !== id))}
        renderTaskListMenu={context => ([
          ['Вставить ниже', context.insertAfter],
          ['Дублировать', context.duplicate],
          ['Повысить уровень', context.promote],
          ['Понизить уровень', context.demote],
          ['Разгруппировать', context.ungroup],
          ['Удалить', context.delete],
        ] as const).flatMap(([label, run]) => typeof run === 'function' ? [
          <button key={String(label)} type="button" className="gantt-tl-context-menu-item" onClick={() => {
            context.closeMenu();
            run();
          }}>{label}</button>,
        ] : [])}
      />
    </main>
  );
}
