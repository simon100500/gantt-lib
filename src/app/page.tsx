'use client';

import { useState } from 'react';
import { GanttChart, type Task } from '../components';

/**
 * Generate 100 tasks for performance testing
 *
 * Performance Testing Instructions:
 * 1. Open Chrome DevTools Performance tab (F12 -> Performance)
 * 2. Click "Start recording" (circle icon)
 * 3. Drag a task for 5-10 seconds
 * 4. Click "Stop recording"
 * 5. Verify FPS stays near 60fps (look for green bar in FPS meter)
 * 6. Check for long tasks (>16.6ms indicates frame drops)
 * 7. Look at "Main" thread for rendering work
 *
 * Expected results:
 * - FPS should stay at or near 60fps during drag
 * - No individual tasks should exceed 16.6ms
 * - Only the dragged task should re-render (verified with React DevTools Profiler)
 */
const generate100Tasks = (): Task[] => {
  const tasks: Task[] = [];
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  for (let i = 0; i < 100; i++) {
    const startDay = Math.floor(Math.random() * 25); // Days 0-24
    const duration = Math.floor(Math.random() * 5) + 1; // 1-5 days

    tasks.push({
      id: `task-${i}`,
      name: `Task ${i + 1}`,
      startDate: new Date(Date.UTC(currentYear, currentMonth, startDay + 1)).toISOString(),
      endDate: new Date(Date.UTC(currentYear, currentMonth, startDay + duration)).toISOString(),
      color: i % 3 === 0 ? '#3b82f6' : i % 3 === 1 ? '#10b981' : undefined,
    });
  }
  return tasks;
};

/**
 * Original 7 sample tasks for clear demo
 */
const generateSampleTasks = (): Task[] => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDay = now.getUTCDate();

  const today = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const yesterday = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay - 1).padStart(2, '0')}`;
  const tomorrow = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay + 1).padStart(2, '0')}`;
  const weekStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const weekEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-07`;
  const midMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`;
  const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-28`;

  return [
    {
      id: '1',
      name: 'Project Kickoff',
      startDate: weekStart,
      endDate: weekStart,
      color: '#10b981',
    },
    {
      id: '2',
      name: 'Today Task',
      startDate: today,
      endDate: today,
      color: '#8b5cf6',
    },
    {
      id: '3',
      name: 'Sprint Planning',
      startDate: weekStart,
      endDate: weekEnd,
      color: '#f59e0b',
    },
    {
      id: '4',
      name: 'Development Phase',
      startDate: weekEnd,
      endDate: midMonth,
    },
    {
      id: '5',
      name: 'Code Review',
      startDate: yesterday,
      endDate: tomorrow,
      color: '#ef4444',
    },
    {
      id: '6',
      name: 'Monthly Release',
      startDate: '2026-02-01',
      endDate: monthEnd,
      color: '#ec4899',
    },
    {
      id: '7',
      name: 'Documentation',
      startDate: midMonth,
      endDate: monthEnd,
    },
  ] as Task[];
};

/**
 * Demo page showcasing the Gantt Chart component
 *
 * This page demonstrates:
 * - Single-day tasks
 * - Multi-day tasks
 * - Tasks with custom colors
 * - Tasks starting/ending today
 * - Tasks spanning across month boundaries
 * - Drag-and-drop task editing
 * - Performance with 100 tasks
 */
export default function Home() {
  // Use 100 tasks for performance testing (requirement INT-03: 60fps with ~100 tasks)
  // Set use100Tasks to false to see the original 7-task demo
  const use100Tasks = true;

  const [tasks, setTasks] = useState<Task[]>(() =>
    use100Tasks ? generate100Tasks() : generateSampleTasks()
  );

  // Handle task updates from drag/resize operations
  const handleTasksChange = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Gantt Chart Library</h1>
      <p style={{ marginBottom: '2rem', color: '#6b7280' }}>
        Lightweight React/Next.js Gantt chart component library with Excel-like styling
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
          Demo ({use100Tasks ? '100 tasks - Performance Mode' : '7 tasks - Sample Mode'})
        </h2>
        {use100Tasks && (
          <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Open Chrome DevTools Performance tab and drag a task to verify 60fps performance.
            See code comments for detailed testing instructions.
          </p>
        )}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', backgroundColor: '#f9fafb' }}>
          <GanttChart
            tasks={tasks}
            month={new Date()}
            dayWidth={40}
            rowHeight={40}
            onChange={handleTasksChange}
          />
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Features</h2>
        <ul style={{ lineHeight: '1.75', color: '#374151' }}>
          <li>Monthly calendar grid with date headers</li>
          <li>Task bars positioned by start/end dates</li>
          <li>Task names displayed on bars</li>
          <li>Vertical today indicator line</li>
          <li>Excel-like grid lines and cell styling</li>
          <li>CSS variables for color customization</li>
          <li>UTC-safe date handling</li>
          <li>React.memo optimization for performance</li>
          <li>Drag-and-drop with 60fps performance (100+ tasks)</li>
        </ul>
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Usage</h2>
        <pre style={{
          backgroundColor: '#1f2937',
          color: '#f3f4f6',
          padding: '1rem',
          borderRadius: '8px',
          overflowX: 'auto',
          fontSize: '0.875rem'
        }}>
{`import { GanttChart, type Task } from '@/components';

const tasks: Task[] = [
  {
    id: '1',
    name: 'My Task',
    startDate: '2026-02-01',
    endDate: '2026-02-05',
    color: '#3b82f6'
  }
];

<GanttChart tasks={tasks} />`}
        </pre>
      </section>
    </main>
  );
}
