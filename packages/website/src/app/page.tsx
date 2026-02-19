'use client';

import { useState, useCallback } from 'react';
import { GanttChart, type Task } from 'gantt-lib';

const createSampleTasks = (): Task[] => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const next = (m + 1) % 12;
  const nextY = next === 0 ? y + 1 : y;
  const pad = (n: number) => String(n + 1).padStart(2, '0');
  return [
    { id: '1', name: 'Project Kickoff', startDate: `${y}-${pad(m)}-01`, endDate: `${y}-${pad(m)}-03`, color: '#10b981' },
    { id: '2', name: 'Sprint Planning', startDate: `${y}-${pad(m)}-05`, endDate: `${y}-${pad(m)}-12`, color: '#f59e0b' },
    { id: '3', name: 'Development', startDate: `${y}-${pad(m)}-10`, endDate: `${y}-${pad(m)}-25` },
    { id: '4', name: 'Code Review', startDate: `${y}-${pad(m)}-20`, endDate: `${y}-${pad(m)}-28`, color: '#ef4444' },
    { id: '5', name: 'Multi-Month Release', startDate: `${y}-${pad(m)}-25`, endDate: `${nextY}-${pad(next)}-10`, color: '#ec4899' },
    { id: '6', name: 'Documentation', startDate: `${nextY}-${pad(next)}-01`, endDate: `${nextY}-${pad(next)}-20` },
  ];
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(createSampleTasks);

  const handleChange = useCallback(
    (updated: Task[] | ((t: Task[]) => Task[])) =>
      setTasks(typeof updated === 'function' ? updated : () => updated),
    []
  );

  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>gantt-lib demo</h1>
      <p style={{ marginBottom: '2rem', color: '#6b7280' }}>
        Drag task bars to move or resize. Install: <code>npm install gantt-lib</code>
      </p>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
        <GanttChart tasks={tasks} dayWidth={24} rowHeight={36} onChange={handleChange} />
      </div>
    </main>
  );
}
