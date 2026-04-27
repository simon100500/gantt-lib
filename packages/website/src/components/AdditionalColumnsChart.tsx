"use client";

import { useState } from "react";
import { GanttChart, type Task, type TaskListColumn, type TaskListColumnId } from "gantt-lib";

type AdditionalColumnsTask = Task & {
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
};

const columnToggleOptions: { id: TaskListColumnId; label: string }[] = [
  { id: 'duration', label: 'Duration' },
  { id: 'progress', label: 'Progress' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
];

export default function AdditionalColumnsChart() {
  const [tasks, setTasks] = useState<AdditionalColumnsTask[]>([
    { id: 'ac-1', name: 'Design API', startDate: '2026-03-27', endDate: '2026-04-03', assignee: 'Alice', priority: 'high' },
    { id: 'ac-2', name: 'Backend impl', startDate: '2026-04-01', endDate: '2026-04-15', assignee: 'Bob', priority: 'high' },
    { id: 'ac-3', name: 'Frontend impl', startDate: '2026-04-10', endDate: '2026-04-20', assignee: 'Charlie', priority: 'medium' },
    { id: 'ac-4', name: 'Write tests', startDate: '2026-04-18', endDate: '2026-04-25', assignee: 'Alice', priority: 'low' },
    { id: 'ac-5', name: 'Deploy', startDate: '2026-04-25', endDate: '2026-04-28', priority: 'medium' },
  ]);
  const [hiddenTaskListColumns, setHiddenTaskListColumns] = useState<TaskListColumnId[]>([
    'dependencies',
  ]);

  const additionalColumns: TaskListColumn<AdditionalColumnsTask>[] = [
    {
      id: 'assignee',
      header: 'Assignee',
      width: 100,
      after: 'name',
      renderCell: ({ task }) => <span>{task.assignee || '—'}</span>,
      renderEditor: ({ task, updateTask, closeEditor }) => (
        <input
          autoFocus
          defaultValue={task.assignee || ''}
          onBlur={(e) => { updateTask({ assignee: e.target.value || undefined }); closeEditor(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { updateTask({ assignee: (e.target as HTMLInputElement).value || undefined }); closeEditor(); } if (e.key === 'Escape') closeEditor(); }}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 'inherit', padding: '0 4px' }}
        />
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      width: 80,
      after: 'name',
      renderCell: ({ task }) => {
        const colors = { low: '#888', medium: '#e6a700', high: '#e53935' };
        return <span style={{ color: colors[task.priority || 'low'], fontWeight: task.priority === 'high' ? 600 : 400 }}>{task.priority || 'low'}</span>;
      },
      renderEditor: ({ task, updateTask, closeEditor }) => (
        <select
          autoFocus
          defaultValue={task.priority || 'low'}
          onBlur={(e) => { updateTask({ priority: (e.target as HTMLSelectElement).value as 'low' | 'medium' | 'high' }); closeEditor(); }}
          onChange={(e) => { updateTask({ priority: (e.target as HTMLSelectElement).value as 'low' | 'medium' | 'high' }); closeEditor(); }}
          onKeyDown={(e) => { if (e.key === 'Escape') closeEditor(); }}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 'inherit', cursor: 'pointer' }}
        >
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
      ),
    },
  ];

  const toggleHiddenColumn = (columnId: TaskListColumnId) => {
    setHiddenTaskListColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  return (
    <section className="demo-section">
      <h2 className="demo-section-title">Additional Columns</h2>
      <p className="demo-section-desc">
        <strong>Custom columns:</strong> Assignee (text) и Priority (select) — добавлены через <code>additionalColumns</code> проп.
        Переключатели ниже скрывают системные и кастомные колонки через <code>hiddenTaskListColumns</code>.
      </p>
      <div className="demo-controls" aria-label="Task list column visibility">
        {columnToggleOptions.map(column => (
          <label key={column.id} className="demo-checkbox-label">
            <input
              type="checkbox"
              checked={!hiddenTaskListColumns.includes(column.id)}
              onChange={() => toggleHiddenColumn(column.id)}
            />
            {column.label}
          </label>
        ))}
      </div>
      <div className="demo-chart-card">
        <GanttChart<AdditionalColumnsTask>
          tasks={tasks}
          dayWidth={30}
          rowHeight={40}
          containerHeight={280}
          showTaskList={true}
          showChart={true}
          taskListWidth={400}
          onTasksChange={(changed) => setTasks(prev => {
            const map = new Map(prev.map(t => [t.id, t]));
            for (const t of changed) map.set(t.id, t);
            return [...map.values()];
          })}
          additionalColumns={additionalColumns}
          hiddenTaskListColumns={hiddenTaskListColumns}
        />
      </div>
    </section>
  );
}
