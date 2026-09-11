// FILE: packages/gantt-lib/src/__tests__/taskListDependencyLabels.test.tsx
// VERSION: 1.0.0
// START_MODULE_CONTRACT
// PURPOSE: Verify compact dependency labels exposed for print/export task lists.
// SCOPE: Cover predecessor numbering, Russian link abbreviations, lag signs, zero-lag omission, and the default interactive-chip path.
// INPUTS: GanttChart tasks with typed dependencies and printDependencyLabels.
// OUTPUTS: Regression evidence for the published print dependency-label contract.
// END_MODULE_CONTRACT
//
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

describe('TaskList dependency print labels', () => {
  const tasks: Task[] = [
    {
      id: 'section',
      name: 'Section',
      startDate: '2026-03-01',
      endDate: '2026-03-12',
    },
    {
      id: 'predecessor',
      parentId: 'section',
      name: 'Predecessor',
      startDate: '2026-03-02',
      endDate: '2026-03-04',
    },
    {
      id: 'successor',
      parentId: 'section',
      name: 'Successor',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      dependencies: [
        { taskId: 'predecessor', type: 'FS', lag: 5 },
        { taskId: 'section', type: 'SS', lag: 0 },
        { taskId: 'section', type: 'FF', lag: -2 },
      ],
    },
  ];

  it('renders predecessor numbers, link types, and non-zero lag as compact text', () => {
    const { container } = render(
      <GanttChart
        tasks={tasks}
        showTaskList
        showChart={false}
        disableDependencyEditing
        printDependencyLabels
      />
    );

    const dependencyLabels = Array.from(
      container.querySelectorAll('.gantt-tl-dependency-print-labels'),
    ).map((element) => element.textContent).find(Boolean);

    expect(dependencyLabels)
      .toBe('[1.1]ОН+5, [1]НН, [1]ОО-2');
    expect(container.querySelector('.gantt-tl-dep-chip')).toBeNull();
  });

  it('keeps interactive chips by default', () => {
    const { container } = render(
      <GanttChart tasks={tasks} showTaskList showChart={false} disableDependencyEditing />
    );

    expect(container.querySelector('.gantt-tl-dependency-print-labels')).toBeNull();
    expect(container.querySelector('.gantt-tl-dep-summary-chip')).not.toBeNull();
  });
});
