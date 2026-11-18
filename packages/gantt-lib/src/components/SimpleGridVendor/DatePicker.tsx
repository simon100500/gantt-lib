// START_MODULE_CONTRACT
//   PURPOSE: Optional cell calendar with vertically scrolling Russian months, adapted from gantt-lib's Calendar.
//   SCOPE: Calendar trigger, portal placement, keyboard dates and dismissal; the grid owns validation and writes.
//   DEPENDS: M-GRID-UTILS
//   LINKS: M-GRID-RUNTIME, V-M-GRID-DATE-PICKER
// END_MODULE_CONTRACT
// START_MODULE_MAP
//   CellDatePicker - isolated calendar action, leaving the cell's text editor unchanged
// END_MODULE_MAP
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays } from 'lucide-react';
import { parseGridDate } from './utils.js';
import type { SimpleGridDatePickerContext } from './types.js';

const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthAt = (date: Date, offset: number) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
const monthLabel = new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' });

export function CellDatePicker({ value, title, min, max, context, beforeOpen, onPick, onClose }: {
  value: string; title: string; min?: string; max?: string;
  context?: SimpleGridDatePickerContext;
  beforeOpen: () => boolean; onPick: (value: string) => void; onClose: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const prepend = useRef<{ height: number; top: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState<Date[]>([]);
  const [cursor, setCursor] = useState('');
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const selected = parseGridDate(value);
  const start = parseGridDate(context?.range?.start || '');
  const end = parseGridDate(context?.range?.end || '');
  const startLabel = context?.range?.startLabel || 'Начало периода';
  const endLabel = context?.range?.endLabel || 'Окончание периода';
  const markers = (context?.markers || []).map(marker => ({ ...marker, iso: parseGridDate(marker.value) }));
  const hasContext = !!context?.range || markers.length > 0;
  const allowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const close = (restore: boolean) => { setOpen(false); if (restore) onClose(); };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (!trigger.current || !panel.current) return;
      const rect = trigger.current.getBoundingClientRect();
      const { width, height } = panel.current.getBoundingClientRect();
      setPosition({ left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
        top: rect.bottom + height + 4 <= window.innerHeight - 8 ? rect.bottom + 4 : Math.max(8, rect.top - height - 4) });
    };
    place();
    const target = scroll.current?.querySelector<HTMLElement>(`[data-day="${cursor}"]`);
    if (target && scroll.current) {
      const month = target.closest<HTMLElement>('[data-month]');
      scroll.current.scrollTop = month?.offsetTop ?? 0;
      target.focus({ preventScroll: true });
    }
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  useLayoutEffect(() => {
    if (prepend.current && scroll.current) {
      scroll.current.scrollTop = scroll.current.scrollHeight - prepend.current.height + prepend.current.top;
      prepend.current = null;
    }
  }, [months]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  const moveCursor = (delta: number) => {
    const next = new Date(`${cursor}T12:00:00`);
    next.setDate(next.getDate() + delta);
    const iso = isoDay(next);
    if (!allowed(iso)) return;
    setCursor(iso);
    setMonths(previous => {
      if (monthAt(next, 0) < previous[0]) return [monthAt(next, 0), ...previous];
      if (monthAt(next, 0) > previous[previous.length - 1]) return [...previous, monthAt(next, 0)];
      return previous;
    });
  };
  useLayoutEffect(() => {
    if (!open) return;
    scroll.current?.querySelector<HTMLElement>(`[data-day="${cursor}"]`)?.focus({ preventScroll: true });
  }, [cursor, months]);
  useLayoutEffect(() => {
    const container = scroll.current;
    const day = container?.querySelector<HTMLElement>(`[data-day="${cursor}"]`);
    if (!container || !day) return;
    if (day.offsetTop < container.scrollTop) container.scrollTop = day.offsetTop;
    else if (day.offsetTop + day.offsetHeight > container.scrollTop + container.clientHeight) {
      container.scrollTop = day.offsetTop + day.offsetHeight - container.clientHeight;
    }
  }, [cursor]);

  return <>
    <button ref={trigger} type="button" className="sg-calendar-trigger" aria-label={`Открыть календарь: ${title}`}
      title="Открыть календарь" aria-haspopup="dialog" aria-expanded={open}
      onMouseDown={event => { event.preventDefault(); event.stopPropagation(); }}
      onDoubleClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
      onClick={event => {
        event.stopPropagation();
        if (open) { close(true); return; }
        if (!beforeOpen()) return;
        const initial = selected || parseGridDate(context?.initialDate || '') || isoDay(new Date());
        const bounded = min && initial < min ? min : max && initial > max ? max : initial;
        const date = new Date(`${bounded}T12:00:00`);
        setCursor(bounded); setMonths([-1, 0, 1].map(offset => monthAt(date, offset))); setOpen(true);
      }}><CalendarDays size={14} aria-hidden="true"/></button>
    {open && createPortal(<div ref={panel} className="sg-calendar" data-selection-role={context?.selectionRole} data-context={hasContext || undefined} data-sg-portal="" role="dialog" aria-label={`Календарь: ${title}`}
      style={{ ...position, position: 'fixed', zIndex: 1200 }}
      onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) close(false);
      }} onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); close(true); }
        const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        if (delta) { event.preventDefault(); moveCursor(delta); }
      }}>
      {hasContext && <div className="sg-calendar-heading">Выбор: {title.toLocaleLowerCase('ru')}</div>}
      <div className="sg-calendar-scroll" ref={scroll} onScroll={() => {
        const element = scroll.current;
        if (!element || prepend.current) return;
        if (element.scrollTop < 80) {
          prepend.current = { height: element.scrollHeight, top: element.scrollTop };
          setMonths(previous => [monthAt(previous[0], -1), ...previous]);
        } else if (element.scrollTop + element.clientHeight > element.scrollHeight - 80) {
          setMonths(previous => [...previous, monthAt(previous[previous.length - 1], 1)]);
        }
      }}>{months.map(month => <section key={isoDay(month)} data-month={isoDay(month)}>
        <div className="sg-calendar-month">{monthLabel.format(month).replace(/\s*г\.$/, '')}</div>
        <div className="sg-calendar-days">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <span className="sg-calendar-weekday" key={day}>{day}</span>)}
          {Array.from({ length: (month.getDay() + 6) % 7 }, (_, index) => <span key={`empty-${index}`}/>)}
          {Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => {
            const date = new Date(month.getFullYear(), month.getMonth(), index + 1), iso = isoDay(date);
            const labels = [iso === start ? startLabel : '', iso === end ? endLabel : '', ...markers.filter(marker => marker.iso === iso).map(marker => marker.label)].filter(Boolean);
            return <button type="button" key={iso} data-day={iso} aria-label={[date.toLocaleDateString('ru'), ...labels].join(', ')}
              title={labels.length ? labels.join(' · ') : undefined}
              data-range-start={iso === start || undefined} data-range-end={iso === end || undefined}
              data-in-range={!!start && !!end && start <= end && iso >= start && iso <= end || undefined}
              data-marked={markers.some(marker => marker.iso === iso) || undefined}
              aria-pressed={iso === selected} aria-current={iso === isoDay(new Date()) ? 'date' : undefined}
              disabled={!allowed(iso)} tabIndex={iso === cursor ? 0 : -1}
              className={`sg-calendar-day${date.getDay() === 0 || date.getDay() === 6 ? ' is-weekend' : ''}`}
              onFocus={() => setCursor(iso)} onClick={() => { onPick(iso); close(true); }}>
              {index + 1}
            </button>;
          })}
        </div>
      </section>)}</div>
    </div>, document.body)}
  </>;
}
