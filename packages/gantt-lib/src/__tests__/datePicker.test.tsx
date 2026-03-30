import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker } from '../components/ui/DatePicker';

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/ui/Calendar', () => ({
  Calendar: ({ onSelect }: { onSelect?: (date: Date) => void }) => (
    <div>
      <div data-testid="calendar" />
      <button type="button" onClick={() => onSelect?.(new Date(Date.UTC(2026, 2, 14)))}>
        pick-weekend
      </button>
    </div>
  ),
}));

describe('DatePicker', () => {
  it('shifts by business days and keeps focus on the input when clicking +1', () => {
    const onChange = vi.fn();

    render(
      <DatePicker
        value="2026-03-13"
        onChange={onChange}
        businessDays={true}
        isWeekend={(date) => date.getUTCDay() === 0 || date.getUTCDay() === 6}
      />
    );

    const input = screen.getByDisplayValue('13.03.26');
    const plusOneButton = screen.getByRole('button', { name: '+1' });

    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.mouseDown(plusOneButton);
    expect(document.activeElement).toBe(input);

    fireEvent.click(plusOneButton);

    expect(onChange).toHaveBeenCalledWith('2026-03-16');
    expect(document.activeElement).toBe(input);
  });

  it('keeps calendar-day shifting when business days mode is disabled', () => {
    const onChange = vi.fn();

    render(<DatePicker value="2026-03-13" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '+1' }));

    expect(onChange).toHaveBeenCalledWith('2026-03-14');
  });

  it('snaps ArrowUp to the next working day when it lands on a weekend', () => {
    const onChange = vi.fn();

    render(
      <DatePicker
        value="2026-03-13"
        onChange={onChange}
        businessDays={true}
        isWeekend={(date) => date.getUTCDay() === 0 || date.getUTCDay() === 6}
      />
    );

    const input = screen.getByDisplayValue('13.03.26');
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    expect(onChange).toHaveBeenCalledWith('2026-03-16');
  });

  it('snaps ArrowDown to the previous working day when it lands on a weekend', () => {
    const onChange = vi.fn();

    render(
      <DatePicker
        value="2026-03-16"
        onChange={onChange}
        businessDays={true}
        isWeekend={(date) => date.getUTCDay() === 0 || date.getUTCDay() === 6}
      />
    );

    const input = screen.getByDisplayValue('16.03.26');
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(onChange).toHaveBeenCalledWith('2026-03-13');
  });

  it('snaps calendar weekend selection to the next working day', () => {
    const onChange = vi.fn();

    render(
      <DatePicker
        value="2026-03-13"
        onChange={onChange}
        businessDays={true}
        isWeekend={(date) => date.getUTCDay() === 0 || date.getUTCDay() === 6}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'pick-weekend' }));

    expect(onChange).toHaveBeenCalledWith('2026-03-16');
  });

  it('shifts the date from the trigger with ArrowUp and ArrowDown', () => {
    const onChange = vi.fn();

    render(
      <DatePicker
        value="2026-03-13"
        onChange={onChange}
        businessDays={true}
        isWeekend={(date) => date.getUTCDay() === 0 || date.getUTCDay() === 6}
      />
    );

    const trigger = screen.getByRole('button', { name: '13.03.2026' });

    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(onChange).toHaveBeenNthCalledWith(1, '2026-03-16');
    expect(onChange).toHaveBeenNthCalledWith(2, '2026-03-12');
  });
});
