import type { Meta, StoryObj } from '@storybook/react';
import { HeavyDataReviewHarness } from './HeavyDataReviewHarness';

const meta = {
  title: 'Heavy data/~500 rows',
  component: HeavyDataReviewHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Operational dense-data review surface for roughly 500 rows, meant to expose mid-scale list/chart readability and visible-row diagnostics.',
      },
    },
  },
} satisfies Meta<typeof HeavyDataReviewHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Review500Rows: Story = {
  args: {
    tier: 'around-500',
    title: 'Heavy data / ~500 rows review',
    description:
      'Exercises the shared heavy-data harness on a realistic mid-scale board so reviewers can inspect dense chart/list rendering and rendered-task totals together.',
    reviewFocus: 'Inspect whether row density, collapsed-group counts, and rendered totals remain legible during an operational mid-scale review.',
    viewMode: 'week',
    taskListWidth: 520,
  },
};
