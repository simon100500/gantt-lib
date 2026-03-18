import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { expired } from '../filters';
import type { Task } from '../types';

describe('expired filter', () => {
  let originalDate: DateConstructor;

  beforeEach(() => {
    originalDate = global.Date;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  function mockToday(mockDate: Date) {
    // @ts-expect-error test Date mock
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockDate);
        } else {
          // @ts-expect-error pass-through
          super(...args);
        }
      }

      static now() {
        return mockDate.getTime();
      }
    };
  }

  it('treats overdue as behind expected progress, not just past end date', () => {
    mockToday(new Date(Date.UTC(2026, 2, 4, 12, 0, 0)));

    const onTrackTask: Task = {
      id: '1',
      name: 'On track',
      startDate: '2026-02-23',
      endDate: '2026-03-04',
      progress: 95,
    };

    const behindTask: Task = {
      id: '2',
      name: 'Behind',
      startDate: '2026-03-01',
      endDate: '2026-03-04',
      progress: 0,
    };

    const filter = expired();

    expect(filter(onTrackTask)).toBe(false);
    expect(filter(behindTask)).toBe(true);
  });
});
