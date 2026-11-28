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
import { Button } from '../ui/Button';
import { PinIcon } from '../ui/PinIcon';
import { parseGridDate } from './utils';
import type { SimpleGridDatePickerContext } from './types';

const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthAt = (date: Date, offset: number) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
const monthLabel = new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' });
const shortDate = (iso: string) => iso.replace(/^(\d{2})(\d{2})-(\d{2})-(\d{2})$/, '$4.$3.$2');

interface DatePickerField {
  id: string;
  value: string;
  title: string;
  min?: string;
  max?: string;
  disabled: boolean;
  context?: SimpleGridDatePickerContext;
  onPick: (value: string) => void;
}

function PinButton({ field, onClick }: { field: DatePickerField; onClick: () => void }) {
  const pin = field.context?.pinAction;
  if (!pin) return null;
  const label = `${pin.label}: ${field.title.toLocaleLowerCase('ru')}`;
  return <button type="button" className="gantt-grid-date-pin" aria-label={label}
    aria-pressed={!!field.context?.fixedDateEdit} title={label} onClick={onClick}>
    <PinIcon />
  </button>;
}

function DurationLink({ days, businessDays, linked, onToggle }: NonNullable<SimpleGridDatePickerContext['duration']>) {
  const durationLabel = days === undefined ? 'Длительность не задана' : `${days} ${businessDays ? 'раб.' : 'кал.'} дн.`;
  const action = linked ? 'Отключить сохранение длительности' : 'Включить сохранение длительности';
  return <button type="button" className="gantt-grid-duration-link" aria-label="Сохранять длительность"
    aria-description={durationLabel} aria-pressed={linked} disabled={!onToggle} onClick={onToggle}
    title={onToggle ? `${action} · ${durationLabel}` : durationLabel}>
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 7H7a5 5 0 0 0 0 10h2m6-10h2a5 5 0 0 1 0 10h-2" />
      <path d={linked ? 'M8 12h8' : 'M8 12h2m4 0h2'} />
    </svg>
    <span>{days === undefined ? '–' : `${days} д`}</span>
  </button>;
}

export function CellDatePicker({ fields, initialFieldId, beforeOpen, onClose, triggerLabel, advanceToEmptyField }: {
  fields: DatePickerField[]; initialFieldId: string;
  beforeOpen: () => boolean; onClose: () => void; triggerLabel?: string;
  advanceToEmptyField?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const prepend = useRef<{ height: number; top: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [fieldId, setFieldId] = useState(initialFieldId);
  const [months, setMonths] = useState<Date[]>([]);
  const [cursor, setCursor] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string>();
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const openingField = fields.find(field => field.id === initialFieldId)!;
  const field = fields.find(field => field.id === fieldId) ?? openingField;
  const { title, min, max, context } = field;
  const shiftDate = context?.shiftDate;
  const activeDate = drafts[field.id] ?? parseGridDate(field.value);
  const fixedDateEdit = context?.fixedDateEdit;
  const today = isoDay(new Date());
  const start = parseGridDate(context?.range?.start || '');
  const end = parseGridDate(context?.range?.end || '');
  const startLabel = context?.range?.startLabel || 'Начало периода';
  const endLabel = context?.range?.endLabel || 'Окончание периода';
  const markers = (context?.markers || []).map(marker => ({ ...marker, iso: parseGridDate(marker.value) }));
  const allowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const close = (restore: boolean) => { setOpen(false); if (restore) onClose(); };
  const changeDraft = (id: string, value?: string) => setDrafts(previous => ({ ...previous, [id]: value }));
  const pick = (iso: string) => {
    field.onPick(iso);
    changeDraft(field.id);
    const next = advanceToEmptyField && iso && fields.find(candidate => candidate.id !== field.id && !candidate.value && !candidate.disabled);
    if (next) showField(next, iso);
    if (fields.length === 1) close(true);
  };
  const selectDate = (iso: string) => {
    if (fixedDateEdit) {
      changeDraft(field.id, iso);
      setError(undefined);
    } else {
      pick(iso);
    }
  };
  const applyFixedDate = () => {
    if (!activeDate || !fixedDateEdit) return;
    const message = fixedDateEdit.validate(activeDate);
    if (message) {
      setError(message);
      return;
    }
    pick(activeDate);
  };

  const showField = (next: DatePickerField, savedDraft?: string) => {
    if (next.disabled) return;
    const initial = savedDraft || parseGridDate(next.value) || parseGridDate(next.context?.initialDate || '') || today;
    const bounded = next.min && initial < next.min ? next.min : next.max && initial > next.max ? next.max : initial;
    const date = new Date(`${bounded}T12:00:00`);
    prepend.current = null;
    setFieldId(next.id);
    setError(undefined);
    setCursor(bounded);
    setMonths([-1, 0, 1].map(offset => monthAt(date, offset)));
  };

  const togglePin = (next: DatePickerField) => {
    next.context?.pinAction?.run();
    changeDraft(next.id);
    if (next.id === field.id) setError(undefined);
    if (fields.length === 1) close(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (!trigger.current || !panel.current) return;
      const rect = trigger.current.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = panel.current;
      setPosition({ left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
        top: rect.bottom + height + 4 <= window.innerHeight - 8 ? rect.bottom + 4 : Math.max(8, rect.top - height - 4) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, field.id, error, fixedDateEdit?.title, context?.footer]);

  useLayoutEffect(() => {
    if (!open || !scroll.current) return;
    const month = scroll.current.querySelector(`[data-day="${cursor}"]`)?.closest<HTMLElement>('[data-month]');
    scroll.current.scrollTop = month?.offsetTop ?? 0;
  }, [open, field.id]);

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
  }, [cursor, field.id]);

  return <>
    <button ref={trigger} type="button" className={triggerLabel ? 'gantt-unscheduled-picker' : 'sg-calendar-trigger'} aria-label={triggerLabel ?? `Открыть календарь: ${openingField.title}`}
      title="Открыть календарь" aria-haspopup="dialog" aria-expanded={open}
      onMouseDown={event => { event.preventDefault(); event.stopPropagation(); }}
      onDoubleClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
      onClick={event => {
        event.stopPropagation();
        if (open) { close(true); return; }
        if (!beforeOpen()) return;
        setDrafts({});
        showField(openingField);
        setOpen(true);
      }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 5h2m4 0h2"/></svg>{triggerLabel}</button>
    {open && createPortal(<div ref={panel} className="gantt-popover gantt-grid-date-picker" data-sg-portal="" role="dialog" aria-label={`Календарь: ${title}`}
      style={{ ...position, position: 'fixed', zIndex: 1200 }}
      onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) close(false);
      }} onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); close(true); }
        const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        if (delta && event.target instanceof Element && event.target.closest('[data-day]')) {
          event.preventDefault(); moveCursor(delta);
        }
      }}>
      {fields.length > 1 ? <div className="gantt-grid-date-boundaries" role="group" aria-label="Границы задачи">
        {fields.map((next, index) => <React.Fragment key={next.id}>
          {index === 1 && context?.duration && <DurationLink {...context.duration} />}
          <div className="gantt-grid-date-boundary" data-active={next.id === field.id || undefined}>
            <button type="button" className="gantt-grid-date-boundary-select" disabled={next.disabled}
              aria-label={`${next.title}, ${shortDate(drafts[next.id] ?? next.value) || '–'}`} aria-pressed={next.id === field.id}
              title={next.context?.fixedDateEdit?.title ?? next.title}
              onClick={() => { if (next.id !== field.id) showField(next, drafts[next.id]); }}>
              <span>{next.title}</span>
              <strong>{shortDate(drafts[next.id] ?? next.value)}</strong>
            </button>
            <PinButton field={next} onClick={() => togglePin(next)} />
          </div>
        </React.Fragment>)}
      </div> : <div className="gantt-datepicker-fixed-title">{fixedDateEdit?.title ?? title}</div>}
      {shiftDate && <div className="gantt-datepicker-input-row">
        {[-7, -1, 1, 7].map(days => {
          const date = activeDate ? shiftDate(activeDate, days) : undefined;
          return <button key={days} type="button" className="gantt-datepicker-shift-btn" disabled={!date || !allowed(date)}
            onClick={() => { if (date) selectDate(date); }}>{days > 0 ? `+${days}` : days}</button>;
        })}
      </div>}
      <div className="gantt-cal-container" ref={scroll} onScroll={() => {
        const element = scroll.current;
        if (!element || prepend.current) return;
        if (element.scrollTop < 80) {
          prepend.current = { height: element.scrollHeight, top: element.scrollTop };
          setMonths(previous => [monthAt(previous[0], -1), ...previous]);
        } else if (element.scrollTop + element.clientHeight > element.scrollHeight - 80) {
          setMonths(previous => [...previous, monthAt(previous[previous.length - 1], 1)]);
        }
      }}>{months.map(month => <section className="gantt-cal-month" key={isoDay(month)} data-month={isoDay(month).slice(0, 7)}>
        <div className="gantt-cal-month-header">{monthLabel.format(month).replace(/\s*г\.$/, '')}</div>
        <div className="gantt-cal-month-days">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <span className="gantt-cal-weekday" key={day}>{day}</span>)}
          {Array.from({ length: (month.getDay() + 6) % 7 }, (_, index) => <span className="gantt-cal-empty-day" key={`empty-${index}`}/>)}
          {Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => {
            const date = new Date(month.getFullYear(), month.getMonth(), index + 1), iso = isoDay(date);
            const labels = [iso === start ? startLabel : '', iso === end ? endLabel : '', ...markers.filter(marker => marker.iso === iso).map(marker => marker.label)].filter(Boolean);
            const classes = ['gantt-day-btn', iso === activeDate && 'selected', iso === today && 'today',
              iso < today && 'past', (context?.isWeekend?.(iso) ?? (date.getDay() === 0 || date.getDay() === 6)) && 'weekend',
              !allowed(iso) && 'disabled'].filter(Boolean).join(' ');
            return <button type="button" key={iso} data-day={iso} aria-label={[date.toLocaleDateString('ru'), ...labels].join(', ')}
              title={labels.length ? labels.join(' · ') : undefined}
              data-range-start={iso === start || undefined} data-range-end={iso === end || undefined}
              data-in-range={!!start && !!end && start <= end && iso >= start && iso <= end || undefined}
              data-marked={markers.some(marker => marker.iso === iso) || undefined}
              aria-pressed={iso === activeDate} aria-current={iso === today ? 'date' : undefined}
              disabled={!allowed(iso)} tabIndex={iso === cursor ? 0 : -1}
              className={classes}
              onFocus={() => setCursor(iso)} onClick={() => selectDate(iso)}>
              {index + 1}
            </button>;
          })}
        </div>
      </section>)}</div>
      {(context?.footer || context?.clearable || (fields.length === 1 && context?.pinAction) || fixedDateEdit) && <div className="gantt-datepicker-footer">
        {context?.footer}
        {context?.clearable && <Button type="button" variant="ghost" size="sm" className="gantt-grid-clear-date"
          disabled={!activeDate} onClick={() => pick('')}>Очистить дату</Button>}
        {error && <div className="gantt-datepicker-fixed-error" role="alert">{error}</div>}
        {((fields.length === 1 && context?.pinAction) || fixedDateEdit) && <div className="gantt-datepicker-fixed-actions">
          {fields.length === 1 && <PinButton field={field} onClick={() => togglePin(field)} />}
          {fixedDateEdit && <>
            <Button type="button" variant="ghost" size="sm" onClick={() => close(true)}>Отмена</Button>
            <Button type="button" size="sm" onClick={applyFixedDate}>Применить</Button>
          </>}
        </div>}
      </div>}
    </div>, document.body)}
  </>;
}
