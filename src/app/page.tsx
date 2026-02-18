'use client';

import { GanttChart, type Task } from '../components';

/**
 * Demo page showcasing the Gantt Chart component
 *
 * This page demonstrates:
 * - Single-day tasks
 * - Multi-day tasks
 * - Tasks with custom colors
 * - Tasks starting/ending today
 * - Tasks spanning across month boundaries
 */
export default function Home() {
  // Get current date for sample tasks
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDay = now.getUTCDate();

  // Create date strings for sample tasks
  const today = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const yesterday = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay - 1).padStart(2, '0')}`;
  const tomorrow = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay + 1).padStart(2, '0')}`;
  const weekStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const weekEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-07`;
  const midMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`;
  const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-28`;

  const sampleTasks: Task[] = [
    // Single-day tasks
    {
      id: '1',
      name: 'Project Kickoff',
      startDate: weekStart,
      endDate: weekStart,
      color: '#10b981', // Green
    },
    {
      id: '2',
      name: 'Today Task',
      startDate: today,
      endDate: today,
      color: '#8b5cf6', // Purple
    },
    // Multi-day tasks
    {
      id: '3',
      name: 'Sprint Planning',
      startDate: weekStart,
      endDate: weekEnd,
      color: '#f59e0b', // Amber
    },
    {
      id: '4',
      name: 'Development Phase',
      startDate: weekEnd,
      endDate: midMonth,
      color: '#3b82f6', // Blue (default)
    },
    {
      id: '5',
      name: 'Code Review',
      startDate: yesterday,
      endDate: tomorrow,
      color: '#ef4444', // Red
    },
    // Long-duration task
    {
      id: '6',
      name: 'Monthly Release',
      startDate: '2026-02-01',
      endDate: monthEnd,
      color: '#ec4899', // Pink
    },
    // Task without custom color (uses default)
    {
      id: '7',
      name: 'Documentation',
      startDate: midMonth,
      endDate: monthEnd,
    },
  ];

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Gantt Chart Library</h1>
      <p style={{ marginBottom: '2rem', color: '#6b7280' }}>
        Lightweight React/Next.js Gantt chart component library with Excel-like styling
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Demo</h2>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', backgroundColor: '#f9fafb' }}>
          <GanttChart
            tasks={sampleTasks}
            month={new Date()}
            dayWidth={40}
            rowHeight={40}
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
