import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';
import { withoutDeps } from '../filters';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('GanttChart taskFilter', () => {
  it('highlights matching task list and chart rows without hiding other tasks', () => {
    const tasks: Task[] = [
      {
        id: 'a',
        name: 'No deps',
        startDate: '2026-02-01',
        endDate: '2026-02-03',
        progress: 0,
      },
      {
        id: 'b',
        name: 'Has deps',
        startDate: '2026-02-04',
        endDate: '2026-02-06',
        progress: 0,
        dependencies: [{ taskId: 'a', type: 'FS', lag: 0 }],
      },
    ];

    render(
      <GanttChart
        tasks={tasks}
        showTaskList
        taskFilter={withoutDeps()}
        rowHeight={36}
        headerHeight={36}
      />
    );

    expect(screen.getAllByText('No deps').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Has deps').length).toBeGreaterThan(0);

    const highlightedRows = Array.from(
      document.querySelectorAll('[data-filter-match="true"]')
    );
    const plainRows = Array.from(
      document.querySelectorAll('[data-filter-match="false"]')
    );

    expect(highlightedRows.length).toBeGreaterThan(0);
    expect(plainRows.length).toBeGreaterThan(0);
  });
});
