// START_MODULE_CONTRACT
//   PURPOSE: Built-in cell editors: in-place text editor on the cell's own contenteditable span and autocomplete editor with fuzzy search and a virtualized list.
//   SCOPE: Editor UX only (caret placement, typing, placeholder, dropdown portal); grid state and commit flow stay in M-GRID-RUNTIME.
//   DEPENDS: M-GRID-TYPES, M-GRID-UTILS
//   LINKS: M-GRID-RUNTIME, M-GRID-TESTS, V-M-GRID-EDITORS
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT
//
// START_MODULE_MAP
//   SimpleGridTextEditor - in-place contenteditable text editor with shared text styling and caret modes
//   SimpleGridAutocompleteEditor - in-place text editor plus portaled fuzzy autocomplete dropdown
//   SimpleGridMultiSelectEditor - searchable multi-select editor with checkbox options
//   SimpleGridChipDisplay - chip renderer with measured overflow indicator and per-chip removal
// END_MODULE_MAP

// The two built-in cell editors. Both edit IN PLACE: the editable element is
// the cell's own text span (contenteditable), so the text keeps the exact
// position, font and wrapping it had in display mode — no overlay input field,
// the Excel way. The autocomplete editor adds the portaled suggestion dropdown
// on top of the same in-place text. Both receive the shared
// SimpleGridEditorProps contract, so a custom editor can mix the same
// behaviors (commit / commitAndMove / cancel).

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import type { SimpleGridEditorProps, SimpleGridOption } from './types.js';
import { SG_OPTION_HEIGHT, fuzzyRankOptions, parseGridMultiValue, serializeGridMultiValue } from './utils.js';

const MENU_OVERSCAN = 6;

/** Focus the element and place the caret after the last character. */
function placeCaretAtEnd(el: HTMLElement): void {
  el.focus();
  const doc = el.ownerDocument;
  const range = doc.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = doc.defaultView?.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Focus the element and place the caret at a viewport point (double-click edit). */
function placeCaretAtPoint(el: HTMLElement, x: number, y: number): void {
  el.focus();
  const doc = el.ownerDocument;
  const range = doc.caretRangeFromPoint?.(x, y);
  if (range && el.contains(range.startContainer)) {
    const selection = doc.defaultView?.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  } else {
    placeCaretAtEnd(el);
  }
}

/** Length of the text before `node` inside `el`, in characters. */
function textOffsetOf(el: HTMLElement, node: Node | null, offset: number): number {
  if (!node) return el.textContent?.length ?? 0;
  const doc = el.ownerDocument;
  const pre = doc.createRange();
  pre.selectNodeContents(el);
  try { pre.setEnd(node, offset); } catch { /* node outside el */ }
  return pre.toString().length;
}

/** Paste plain text at the caret of a contenteditable element, then report the new text. */
function insertPlainText(el: HTMLElement, text: string, report: (value: string) => void): void {
  const doc = el.ownerDocument;
  try {
    if (doc.execCommand('insertText', false, text)) {
      report(el.textContent ?? '');
      return;
    }
  } catch { /* jsdom / unsupported: fall through to the manual splice */ }
  // Manual splice (fallback): insert into textContent at the current selection.
  const selection = doc.defaultView?.getSelection();
  const current = el.textContent ?? '';
  let start = current.length;
  let end = start;
  if (selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0);
    start = textOffsetOf(el, range.startContainer, range.startOffset);
    end = selection.isCollapsed ? start : textOffsetOf(el, range.endContainer, range.endOffset);
  }
  const next = current.slice(0, start) + text + current.slice(end);
  el.textContent = next;
  report(next);
  placeCaretAtEnd(el);
}

/** Insert a literal newline and leave the caret after it. */
function insertLineBreak(el:HTMLElement,report:(value:string)=>void):void {
 const selection=el.ownerDocument.defaultView?.getSelection();
 const current=el.textContent??'';
 let start=current.length,end=start;
 if(selection?.rangeCount&&el.contains(selection.anchorNode)&&el.contains(selection.focusNode)){
  const range=selection.getRangeAt(0);
  start=textOffsetOf(el,range.startContainer,range.startOffset);
  end=textOffsetOf(el,range.endContainer,range.endOffset);
 }
 const next=current.slice(0,start)+'\n'+current.slice(end);
 el.textContent=next;report(next);
 const node=el.firstChild;
 if(node&&selection){const range=el.ownerDocument.createRange();range.setStart(node,start+1);range.collapse(true);selection.removeAllRanges();selection.addRange(range);}
}

/**
 * Multi-line (wrapped) cells keep ↑/↓ for the text: the caret moves and clamps
 * at the first/last visual line — it never disappears, and the grid is left
 * via Enter/Tab/Escape. Single-line cells stay Excel-like: ↑/↓ commit + move
 * the cell (the grid handles them).
 */
function isMultilineEditor(el: HTMLElement): boolean {
  return ['normal','pre-wrap'].includes(el.ownerDocument.defaultView?.getComputedStyle(el).whiteSpace || '');
}

/** Mark every character matched by the (possibly fuzzy) query. */
function highlightQueryFragment(label: string, query: string): ReactNode {
  const needle = query.trim();
  if (!needle) return label;
  const normalize = (text: string) => text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  const tokens = normalize(needle).split(/\s+/).filter(Boolean);
  const lower = normalize(label);
  const marked = new Array<boolean>(label.length).fill(false);
  for (const token of tokens) {
    const direct = lower.indexOf(token);
    if (direct !== -1) {
      for (let index = 0; index < token.length; index += 1) marked[direct + index] = true;
      continue;
    }
    let cursor = 0;
    for (const char of token) {
      const found = lower.indexOf(char, cursor);
      if (found === -1) break;
      marked[found] = true;
      cursor = found + 1;
    }
  }
  const parts: ReactNode[] = [];
  let buffer = '';
  let bufferMarked = false;
  const flush = () => {
    if (!buffer) return;
    parts.push(bufferMarked
      ? <mark className="rounded-sm bg-[#fff3bf] text-inherit" key={parts.length}>{buffer}</mark>
      : buffer);
    buffer = '';
  };
  for (let index = 0; index < label.length; index += 1) {
    if (marked[index] !== bufferMarked) { flush(); bufferMarked = marked[index]; }
    buffer += label[index];
  }
  flush();
  return <>{parts}</>;
}

interface InPlaceTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'decimal';
  selectOnly?: boolean;
  textStyle?: SimpleGridEditorProps['textStyle'];
  caretAt?: SimpleGridEditorProps['caretAt'];
  inputRef: RefObject<HTMLSpanElement>;
  onPaste?: (event: ReactClipboardEvent<HTMLElement>) => void;
  allowLineBreak?: boolean;
}

/**
 * The editable cell text itself: a contenteditable span styled exactly like
 * the display span (`textStyle` comes from the grid), seeded once on mount and
 * uncontrolled afterwards so React never fights the caret.
 */
function InPlaceText({ value, onChange, placeholder, inputMode, selectOnly, textStyle, caretAt, inputRef, onPaste, allowLineBreak }: InPlaceTextProps) {
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.textContent = value;
    if (caretAt) placeCaretAtPoint(el, caretAt.x, caretAt.y);
    else placeCaretAtEnd(el);
    // The seed is read once at mount; afterwards the DOM text is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span
      className="block outline-none"
      contentEditable={!selectOnly}
      data-sg-editor=""
      data-sg-placeholder={placeholder}
      data-testid="sg-editor-input"
      inputMode={inputMode}
      onInput={() => { const el = inputRef.current; if (el && !selectOnly) onChange(el.textContent ?? ''); }}
      onKeyDown={(event) => {
        if (allowLineBreak && !selectOnly && event.key === 'Enter' && event.altKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();event.stopPropagation();insertLineBreak(event.currentTarget,onChange);return;
        }
        // The grid commits on Enter/Tab; the browser must not insert a line break.
        if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); return; }
        // In a multi-line (wrapped) cell ↑/↓ belong to the text: the caret moves
        // natively and clamps at the first/last line instead of leaving the cell.
        if (!selectOnly && (event.key === 'ArrowUp' || event.key === 'ArrowDown')
          && isMultilineEditor(event.currentTarget as HTMLElement)) {
          event.stopPropagation();
        }
      }}
      onPaste={onPaste}
      ref={inputRef}
      // The beam over the edited text; a strict dropdown span stays non-text.
      style={{ cursor: selectOnly ? 'cell' : 'text', userSelect: selectOnly ? 'none' : 'text', ...textStyle }}
      suppressContentEditableWarning
      tabIndex={-1}
    />
  );
}

/** Default single-line editor: edits the cell text in place, caret at the end. */
export function SimpleGridTextEditor({ value, onChange, placeholder, inputMode, textStyle, caretAt, allowLineBreak }: SimpleGridEditorProps) {
  const inputRef = useRef<HTMLSpanElement>(null);
  return (
    <InPlaceText
      allowLineBreak={allowLineBreak}
      caretAt={caretAt}
      inputRef={inputRef}
      onChange={onChange}
      onPaste={(event) => {
        event.preventDefault();
        const el = inputRef.current;
        if (!el) return;
        const text = event.clipboardData?.getData('text/plain');
        if (text) insertPlainText(el, text, onChange);
      }}
      placeholder={placeholder}
      inputMode={inputMode}
      selectOnly={false}
      textStyle={textStyle}
      value={value}
    />
  );
}

/** Suggestion-list editor; a strict list opens on activation, the free autocomplete only while typing. */
export function SimpleGridAutocompleteEditor({
  value, onChange, commit, commitAndMove, placeholder, candidates, alwaysOpen, selectOnly,
  highlightMatches = true,
  menuMaxHeight = SG_OPTION_HEIGHT * 8, menuWidth, textStyle, caretAt, displayValue,
}: SimpleGridEditorProps) {
  const preserveDisplay = selectOnly && displayValue !== undefined;
  const selectedIcon = preserveDisplay ? undefined : candidates?.find(option => option.value === value)?.icon;
  const inputRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState((candidates?.length ?? 0) > 0);
  const [highlight, setHighlight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollTopRef = useRef(0);
  // The dropdown is portaled to <body> and positioned from the entire cell, so a
  // nested scroll container (a modal body) never clips it.
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) { setMenuPos(null); return undefined; }
    const place = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = (el.closest('td') ?? el).getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
      const gutter = 8;
      const width = Math.min(menuWidth ?? rect.width, Math.max(0, viewportWidth - gutter * 2));
      const left = Math.min(Math.max(gutter, rect.left), viewportWidth - gutter - width);
      const below = Math.max(0, viewportHeight - rect.bottom - gutter);
      const above = Math.max(0, rect.top - gutter);
      const openAbove = below < Math.min(menuMaxHeight, SG_OPTION_HEIGHT * 4) && above > below;
      const maxHeight = Math.min(menuMaxHeight, openAbove ? above : below);
      const height = Math.min(maxHeight, (candidates?.length ?? 0) * SG_OPTION_HEIGHT + 2);
      setMenuPos({ left, top: openAbove ? rect.top - height : rect.bottom, width, maxHeight });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, menuWidth, menuMaxHeight, candidates?.length]);

  // Fuzzy ranking everywhere; a strict dropdown (`selectOnly`) shows every option
  // and `alwaysOpen` only changes when the list appears.
  const options = useMemo(
    () => (selectOnly ? (candidates ?? []) : fuzzyRankOptions(candidates ?? [], value)),
    [candidates, value, selectOnly],
  );

  // Refs mirror the state so the capture-phase key handler never reads a stale
  // closure and the grid's own key handling can never win the race.
  const openRef = useRef(open);
  const optionsRef = useRef(options);
  const highlightRef = useRef(highlight);
  openRef.current = open;
  optionsRef.current = options;
  highlightRef.current = highlight;

  // react-select's `blockOptionHover`: a keydown blocks hover, and moving the
  // pointer over the menu releases it. Without this, hover keeps resetting the
  // keyboard highlight (the flicker) and ↑/↓ look broken.
  const blockHoverRef = useRef(false);

  const setHighlightIndex = (next: number) => {
    highlightRef.current = next;
    setHighlight(next);
  };

  const hoverOption = (index: number) => {
    if (blockHoverRef.current) return;
    setHighlightIndex(index);
  };

  useLayoutEffect(() => {
    setHighlightIndex(0);
    scrollTopRef.current = 0;
    setScrollTop(0);
    if (listRef.current) listRef.current.scrollTop = 0;
    setOpen(optionsRef.current.length > 0 && (alwaysOpen === true || value.trim().length > 0));
    // Only react to the text changing, not to every options identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Virtual window: only the visible rows are mounted, so 10 000 candidates stay fast.
  const total = options.length;
  const visibleMenuMaxHeight = menuPos?.maxHeight ?? menuMaxHeight;
  const windowSize = Math.ceil(visibleMenuMaxHeight / SG_OPTION_HEIGHT) + MENU_OVERSCAN * 2;
  const start = Math.max(0, Math.floor(scrollTop / SG_OPTION_HEIGHT) - MENU_OVERSCAN);
  const end = Math.min(total, start + windowSize);
  const windowOptions = options.slice(start, end);

  // Scroll only the list box (never scrollIntoView: it can scroll ancestors and
  // loop with hover). Indices are pure math because rows have a fixed height.
  const scrollRowIntoView = (index: number) => {
    const top = index * SG_OPTION_HEIGHT;
    const bottom = top + SG_OPTION_HEIGHT;
    let next = scrollTopRef.current;
    if (top < next) next = top;
    else if (bottom > next + visibleMenuMaxHeight) next = bottom - visibleMenuMaxHeight;
    if (next !== scrollTopRef.current) {
      scrollTopRef.current = next;
      setScrollTop(next);
      if (listRef.current) listRef.current.scrollTop = next;
    }
  };

  // Runs in the capture phase on the editor wrapper AND as a fallback on the
  // text itself, so ↑/↓ always walk the matches while the list is open.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!openRef.current) return;
    blockHoverRef.current = true; // any key wins over a hovering pointer
    const list = optionsRef.current;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && list.length) {
      event.preventDefault();
      event.stopPropagation();
      const next = (highlightRef.current + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
      setHighlightIndex(next);
      scrollRowIntoView(next);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const pick = list[highlightRef.current];
      if (pick) commit(pick.value);
      return;
    }
    // Tab selects the highlighted suggestion and walks on (react-select's tabSelectsValue).
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      const pick = list[highlightRef.current];
      commitAndMove?.(pick ? pick.value : undefined);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="relative h-full w-full" data-sg-editor data-testid="sg-editor" onKeyDownCapture={handleKeyDown} style={selectedIcon ? { display: 'flex', alignItems: 'flex-start' } : undefined}>
      {selectedIcon && <span data-testid="sg-selected-icon" aria-hidden="true" style={{ width: 14, height: textStyle?.lineHeight ?? 18, flexShrink: 0, marginRight: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>{selectedIcon}</span>}
      {preserveDisplay && displayValue}
      <InPlaceText
        caretAt={caretAt}
        inputRef={inputRef}
        onChange={onChange}
        onPaste={(event) => {
          if (selectOnly) { event.preventDefault(); return; }
          event.preventDefault();
          const el = inputRef.current;
          if (!el) return;
          const text = event.clipboardData?.getData('text/plain');
          if (text) insertPlainText(el, text, onChange);
        }}
        placeholder={placeholder}
        selectOnly={selectOnly}
        textStyle={preserveDisplay ? { ...textStyle, position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0 } : selectedIcon ? { ...textStyle, paddingLeft: 0, flex: 1, minWidth: 0 } : textStyle}
        value={value}
      />
      {open && total > 0 && menuPos && createPortal((
        <div
          className="fixed z-[80] overflow-y-auto overscroll-contain rounded-md border border-[#c7d1e0] bg-white text-[12px] shadow-[0_12px_32px_rgba(9,30,66,0.18)]"
          data-sg-portal
          data-testid="sg-options"
          onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
          onMouseMove={() => { blockHoverRef.current = false; }}
          onScroll={(event) => { const next = event.currentTarget.scrollTop; scrollTopRef.current = next; setScrollTop(next); }}
          ref={listRef}
          role="listbox"
          style={{ left: menuPos.left, top: menuPos.top, width: menuPos.width, maxHeight: menuPos.maxHeight }}
        >
          <div aria-hidden style={{ height: total * SG_OPTION_HEIGHT, position: 'relative' }} />
          {windowOptions.map((option, offset) => {
            const index = start + offset;
            return (
              <div
                aria-selected={index === highlight}
                className={`absolute inset-x-0 flex cursor-pointer items-center justify-between gap-2 px-1 ${index === highlight ? 'bg-[#e9f2ff]' : 'hover:bg-[#f1f3f6]'}`}
                data-testid={`sg-option-${index}`}
                key={option.value}
                onClick={() => commit(option.value)}
                onMouseMove={() => hoverOption(index)}
                onMouseOver={() => hoverOption(index)}
                role="option"
                style={{ top: index * SG_OPTION_HEIGHT, height: SG_OPTION_HEIGHT }}
              >
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  {option.icon ? <span className="shrink-0" style={{ width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{option.icon}</span> : null}
                  <span
                    className="min-w-0 flex-1 whitespace-normal break-words"
                    data-testid={`sg-option-label-${index}`}
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {highlightMatches && !selectOnly ? highlightQueryFragment(option.label, value) : option.label}
                  </span>
                </span>
                {option.hint && <span className="shrink-0 text-[#6b778c]" data-testid={`sg-option-hint-${index}`}>{option.hint}</span>}
              </div>
            );
          })}
        </div>
      ), document.body)}
    </div>
  );
}

/** Searchable checkbox list for cells whose stored value is a JSON string array. */
export function SimpleGridMultiSelectEditor({
  value, onChange, commit, commitAndMove, cancel, chipCandidates = [], menuMaxHeight = SG_OPTION_HEIGHT * 8,
}: SimpleGridEditorProps) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const selected = parseGridMultiValue(value);
  const options = fuzzyRankOptions(chipCandidates, query);
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => { inputRef.current?.focus(); }, []);
  useLayoutEffect(() => {
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setMenuPos({ left: rect.left, top: rect.bottom, width: rect.width });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, []);
  const toggle = (optionValue: string) => {
    onChange(serializeGridMultiValue(selected.includes(optionValue)
      ? selected.filter((item) => item !== optionValue)
      : [...selected, optionValue]));
  };
  return (
    <div className="sg-multiselect-editor" data-sg-editor data-testid="sg-multiselect-editor" ref={rootRef}
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
        else if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); commit(); }
        else if (event.key === 'Tab') { event.preventDefault(); event.stopPropagation(); commitAndMove?.(undefined, event.shiftKey ? 'left' : 'right'); }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (!options.length) return;
          event.preventDefault(); event.stopPropagation();
          setHighlight((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        } else if (event.key === ' ' && (event.target as HTMLElement).getAttribute('role') === 'option') {
          event.preventDefault(); event.stopPropagation();
          const option = options[highlight]; if (option) toggle(option.value);
        }
      }}>
      <input aria-label="Поиск вариантов" className="sg-multiselect-search" onChange={(event) => { setQuery(event.target.value); setHighlight(0); }} placeholder="Поиск…" ref={inputRef} value={query} />
      {menuPos && createPortal(<div className="sg-multiselect-menu" data-sg-portal data-testid="sg-multiselect-menu" role="listbox" aria-label="Варианты" aria-multiselectable="true" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} style={{ position: 'fixed', zIndex: 1001, left: menuPos.left, top: menuPos.top + 2, width: menuPos.width, maxHeight: menuMaxHeight, border: '1px solid #c7d1ca', boxShadow: '0 2px 4px #172b4d29' }}>
        {options.map((option, index) => (
          <button aria-selected={selected.includes(option.value)} className="sg-multiselect-option" data-highlight={index === highlight || undefined}
            key={option.value} onClick={(event) => { event.stopPropagation(); toggle(option.value); }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }} role="option" type="button">
            <span className="sg-multiselect-option-label">{option.label}</span>
            {option.hint && <span className="sg-multiselect-option-hint">{option.hint}</span>}
          </button>
        ))}
        {!options.length && <div className="sg-multiselect-empty">Нет вариантов</div>}
      </div>, document.body)}
    </div>
  );
}

/** Compact display of selected option labels with measured +N overflow. */
export function SimpleGridChipDisplay({ value, candidates, onRemove, readOnly = false }: {
  value: string; candidates: SimpleGridOption[]; onRemove?: (value: string) => void; readOnly?: boolean;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const chipRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [visibleCount, setVisibleCount] = useState(Number.MAX_SAFE_INTEGER);
  const selected = parseGridMultiValue(value);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const measure = () => {
      const available = root.clientWidth;
      if (!available) { setVisibleCount(selected.length); return; }
      let used = 0;
      let count = 0;
      const widths = chipRefs.current.slice(0, selected.length).map((el) => el?.getBoundingClientRect().width ?? 0);
      for (let index = 0; index < widths.length; index += 1) {
        const gap = index ? 4 : 0;
        const overflowReserve = index < widths.length - 1 ? 32 : 0;
        if (used + gap + widths[index] + overflowReserve > available) break;
        used += gap + widths[index]; count += 1;
      }
      setVisibleCount(count);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(root);
    return () => observer?.disconnect();
  }, [selected.join('\u0000')]);
  if (!selected.length) return <span className="sg-chips" data-testid="sg-chips" ref={rootRef} />;
  return (
    <span className="sg-chips" data-testid="sg-chips" ref={rootRef}>
      {selected.map((item, index) => {
        const label = candidates.find((candidate) => candidate.value === item)?.label ?? item;
        return <span aria-hidden={index >= visibleCount || undefined} className="sg-chip" data-testid="sg-chip" key={item} ref={(node) => { chipRefs.current[index] = node; }} style={index >= visibleCount ? { position: 'absolute', visibility: 'hidden' } : undefined} title={label}>
          <span className="sg-chip-label">{label}</span>
          {!readOnly && onRemove && <button aria-label={`Удалить ${label}`} className="sg-chip-remove" onClick={(event) => { event.stopPropagation(); onRemove(item); }} onMouseDown={(event) => event.stopPropagation()} type="button">×</button>}
        </span>;
      })}
      {visibleCount < selected.length && <span className="sg-chip-overflow" data-testid="sg-chip-overflow">+{selected.length - visibleCount}</span>}
    </span>
  );
}
