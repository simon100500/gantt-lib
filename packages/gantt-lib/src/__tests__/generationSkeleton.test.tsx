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
});
