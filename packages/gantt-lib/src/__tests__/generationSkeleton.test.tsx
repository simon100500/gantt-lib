import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GenerationSkeletonRows } from '../components/GenerationSkeleton';

describe('GenerationSkeletonRows', () => {
  it('renders the requested bounded number of rows for both chart surfaces', () => {
    const { container, rerender } = render(
      <GenerationSkeletonRows count={10} rowHeight={36} variant="task-list" />,
    );

    expect(container.querySelectorAll('.gantt-generation-skeleton-row')).toHaveLength(10);
    expect(container.querySelectorAll('.gantt-generation-skeleton-label')).toHaveLength(10);

    rerender(<GenerationSkeletonRows count={3.9} rowHeight={36} variant="chart" />);
    expect(container.querySelectorAll('.gantt-generation-skeleton-row')).toHaveLength(3);
    expect(container.querySelectorAll('.gantt-generation-skeleton-bar')).toHaveLength(3);
  });

  it('does not render negative or excessive counts', () => {
    const { container, rerender } = render(
      <GenerationSkeletonRows count={-1} rowHeight={36} variant="chart" />,
    );
    expect(container.querySelector('.gantt-generation-skeleton')).toBeNull();

    rerender(<GenerationSkeletonRows count={999} rowHeight={36} variant="chart" />);
    expect(container.querySelectorAll('.gantt-generation-skeleton-row')).toHaveLength(200);
  });

  it('starts chart bars at the requested day offset', () => {
    const { container } = render(
      <GenerationSkeletonRows
        count={1}
        rowHeight={36}
        variant="chart"
        chartDayWidth={32}
        chartStartDayOffset={7}
      />,
    );

    const bar = container.querySelector<HTMLElement>('.gantt-generation-skeleton-bar');
    expect(bar?.style.marginLeft).toBe('224px');
  });

  it('applies stable per-row start jitter when requested', () => {
    const { container, rerender } = render(
      <GenerationSkeletonRows
        count={3}
        rowHeight={36}
        variant="chart"
        chartDayWidth={10}
        chartStartDayOffset={20}
        chartStartJitterDays={2}
      />,
    );

    const getMargins = () => Array.from(
      container.querySelectorAll<HTMLElement>('.gantt-generation-skeleton-bar'),
      (bar) => bar.style.marginLeft,
    );
    const firstMargins = getMargins();
    expect(firstMargins.every((margin) => ['180px', '190px', '200px'].includes(margin))).toBe(true);

    rerender(
      <GenerationSkeletonRows
        count={3}
        rowHeight={36}
        variant="chart"
        chartDayWidth={10}
        chartStartDayOffset={20}
        chartStartJitterDays={2}
      />,
    );
    expect(getMargins()).toEqual(firstMargins);
  });
});
