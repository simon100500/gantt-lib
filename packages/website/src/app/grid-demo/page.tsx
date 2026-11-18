// START_MODULE_CONTRACT
// PURPOSE: Demonstrate the experimental SimpleGrid task list embedded in GanttChart.
// SCOPE: Local task editing, tree collapse and Gantt bars with a single controlled task array.
// INPUTS: User edits to the embedded task list.
// OUTPUTS: An interactive local demo without persistence.
// END_MODULE_CONTRACT
'use client';
import { useState } from 'react';
import { GanttChart, type Task } from 'gantt-lib';
const initial: Task[] = [
  { id: 'phase', name: 'Строительство', startDate: '2026-02-02', endDate: '2026-03-13' },
  { id: 'a', parentId: 'phase', name: 'Подготовка площадки', startDate: '2026-02-02', endDate: '2026-02-06' },
  { id: 'b', parentId: 'phase', name: 'Фундамент', startDate: '2026-02-09', endDate: '2026-02-18' },
  { id: 'c', parentId: 'phase', name: 'Каркас', startDate: '2026-02-19', endDate: '2026-03-04' },
  { id: 'd', parentId: 'phase', name: 'Инженерные сети', startDate: '2026-03-05', endDate: '2026-03-13' },
  ...Array.from({ length: 10 }, (_, index) => ({ id: `extra-${index}`, parentId: 'phase', name: `Дополнительная работа ${index + 1}`, startDate: '2026-03-05', endDate: '2026-03-13' })),
];
export default function GridDemo() {
  const [tasks, setTasks] = useState(initial);
  return <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
    <h1>Gantt: таблица SimpleGrid</h1>
    <p>Выделяйте ячейки, вводите и вставляйте данные как в SimpleGrid. Изменения отражаются на полосах.</p>
    <GanttChart tasks={tasks} showTaskList businessDays={false} containerHeight={400} onTasksChange={updates => setTasks(current => current.map(task => updates.find(update => update.id === task.id) ?? task))} />
  </main>;
}
