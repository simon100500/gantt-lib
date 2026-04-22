import type { Meta, StoryObj } from '@storybook/react';
import { HeavyDataReviewHarness } from './HeavyDataReviewHarness';

const meta = {
  title: 'Heavy data/~100 rows',
  component: HeavyDataReviewHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Comfortable dense-data inspection surface for roughly 100 rows, intended for baseline readability and diagnostic sanity checks.',
      },
    },
  },
} satisfies Meta<typeof HeavyDataReviewHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Review100Rows: Story = {
  args: {
    tier: 'around-100',
    title: 'Heavy data / ~100 rows review',
    description:
      'Use the shared heavy-data harness on the lightest dense tier to verify row-count diagnostics, collapse math, and basic scanability before denser reviews.',
    reviewFocus: 'Confirm the review badges and initial collapsed-group behavior stay easy to inspect at the smallest heavy-data tier.',
    viewMode: 'week',
    taskListWidth: 500,
  },
};
