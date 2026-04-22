import type { Meta, StoryObj } from '@storybook/react';
import { HeavyDataReviewHarness } from './HeavyDataReviewHarness';

const meta = {
  title: 'Heavy data/~1000 rows',
  component: HeavyDataReviewHarness,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Rough-edge discovery surface for roughly 1000 rows, intended to make high-density rendering pressure visible before choosing follow-up work.',
      },
    },
  },
} satisfies Meta<typeof HeavyDataReviewHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Review1000Rows: Story = {
  args: {
    tier: 'around-1000',
    title: 'Heavy data / ~1000 rows review',
    description:
      'Pushes the shared heavy-data harness to the roughest dense tier so runtime diagnostics stay visible while reviewers scan for mounting and readability issues.',
    reviewFocus: 'Check that the densest story still mounts cleanly, keeps its diagnostics visible, and makes follow-up rough edges concrete.',
    viewMode: 'week',
    taskListWidth: 540,
  },
};
