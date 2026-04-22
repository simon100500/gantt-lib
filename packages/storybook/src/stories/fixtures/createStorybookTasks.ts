import { type Task } from 'gantt-lib';

const DAY = 24 * 60 * 60 * 1000;

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const shiftDate = (isoDate: string, days: number): string => {
  const source = new Date(`${isoDate}T00:00:00.000Z`);
  return toIsoDate(new Date(source.getTime() + days * DAY));
};

export const createStorybookTasks = (anchorDate = '2026-04-20'): Task[] => {
  const planningStart = anchorDate;
  const buildStart = shiftDate(anchorDate, 3);
  const reviewDate = shiftDate(anchorDate, 8);

  return [
    {
      id: 'story-group',
      name: 'Library scaffold',
      startDate: planningStart,
      endDate: reviewDate,
      progress: 55,
      accepted: false,
      color: '#2563eb',
    },
    {
      id: 'story-planning',
      parentId: 'story-group',
      name: 'Plan Storybook surface',
      startDate: planningStart,
      endDate: shiftDate(anchorDate, 2),
      progress: 100,
      accepted: true,
      dependencies: [],
      color: '#0ea5e9',
    },
    {
      id: 'story-build',
      parentId: 'story-group',
      name: 'Render public package story',
      startDate: buildStart,
      endDate: shiftDate(anchorDate, 6),
      progress: 60,
      accepted: false,
      dependencies: [{ taskId: 'story-planning', type: 'FS', lag: 1 }],
      color: '#7c3aed',
    },
    {
      id: 'story-review',
      parentId: 'story-group',
      name: 'Static build verification',
      startDate: reviewDate,
      endDate: reviewDate,
      type: 'milestone',
      progress: 0,
      accepted: false,
      dependencies: [{ taskId: 'story-build', type: 'FS', lag: 0 }],
      color: '#f59e0b',
    },
  ];
};

export const createEmptyStorybookTasks = (): Task[] => [];
