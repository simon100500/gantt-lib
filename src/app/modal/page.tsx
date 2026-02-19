'use client';

import { useState } from 'react';
import { GanttChart, type Task } from '@/components';
import { Modal } from '@/components/Modal/Modal';
import styles from './modal.module.css';

/**
 * Generate sample tasks for the modal demo
 */
const generateSampleTasks = (): Task[] => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const nextMonth = (currentMonth + 1) % 12;
  const nextMonthYear = nextMonth === 0 ? currentYear + 1 : currentYear;

  return [
    {
      id: '1',
      name: 'Проект 1',
      startDate: new Date(Date.UTC(currentYear, currentMonth, 1)).toISOString(),
      endDate: new Date(Date.UTC(currentYear, currentMonth, 5)).toISOString(),
      color: '#3b82f6',
    },
    {
      id: '2',
      name: 'Проект 2',
      startDate: new Date(Date.UTC(currentYear, currentMonth, 3)).toISOString(),
      endDate: new Date(Date.UTC(currentYear, currentMonth, 10)).toISOString(),
      color: '#10b981',
    },
    {
      id: '3',
      name: 'Проект 3',
      startDate: new Date(Date.UTC(currentYear, currentMonth, 8)).toISOString(),
      endDate: new Date(Date.UTC(nextMonthYear, nextMonth, 15)).toISOString(),
      color: '#f59e0b',
    },
    {
      id: '4',
      name: 'Проект 4',
      startDate: new Date(Date.UTC(nextMonthYear, nextMonth, 5)).toISOString(),
      endDate: new Date(Date.UTC(nextMonthYear, nextMonth, 12)).toISOString(),
      color: '#8b5cf6',
    },
  ] as Task[];
};

/**
 * Modal demo page - demonstrates Gantt chart usage inside a modal container
 */
export default function ModalPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(generateSampleTasks);

  const handleTasksChange = (updatedTasks: Task[] | ((currentTasks: Task[]) => Task[])) => {
    setTasks(typeof updatedTasks === 'function' ? updatedTasks : () => updatedTasks);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Modal Demo</h1>
        <p className={styles.description}>
          Click the button below to open a Gantt chart in a modal window
        </p>

        <button
          className={styles.button}
          onClick={() => setIsOpen(true)}
        >
          Open Modal
        </button>

        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <GanttChart
            tasks={tasks}
            dayWidth={30}
            rowHeight={40}
            onChange={handleTasksChange}
          />
        </Modal>
      </div>
    </div>
  );
}
