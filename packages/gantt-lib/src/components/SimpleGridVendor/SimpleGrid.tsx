import type {SimpleGridCellTableProps} from "./types";
// START_MODULE_CONTRACT
//   PURPOSE: Controlled Excel-like editable grid: table rendering, Excel-style range/row/column selection with autofill, header/gutter drag reorder of columns and rows, checkbox columns, merged cells (rowSpan/colSpan anchors with Excel-like navigation), keyboard-first in-place editing, Excel-compatible TSV clipboard, column resize, snapshot undo/redo (Ctrl+Z / Ctrl+Y) that survives host-side row transforms.
//   SCOPE: Owns grid state (selection, active cell, editing, widths, column order, collapsed groups, fill/reorder drags, undo/redo history), visible column projection and nested sticky headers with summaries (read-only unless the host supplies summaryColumn.setValue), the frozen leading-columns pane (prop frozenColumnIds); delegates cell editors to M-GRID-EDITORS, value parsing/validation/formatting (incl. checkbox canon) and fill-series rules to M-GRID-UTILS.
//   DEPENDS: M-GRID-TYPES, M-GRID-UTILS, M-GRID-EDITORS, M-GRID-CONTEXT-MENU, M-GRID-DATE-PICKER, M-GRID-COMMENTS
//   LINKS: M-GRID-BARREL, M-GRID-TESTS, V-M-GRID-RUNTIME, V-M-GRID-COMMENTS
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT
//
// START_MODULE_MAP
//   datePicker - optional per-column or per-row calendar action; ordinary text editing is unchanged, calendar picks use validation and undo
//   collapseScrollAnchor / outlineTail - preserve heading viewport position across outline toggles, reserving space at the sheet end when necessary
//   outline / rowIndexes - stable structural groups, filter-preserving banners, collapse projection and per-group sorting
//   bannerTop / constrain - measured sticky header inset and group-bounded banner displacement
//   headerLabelCharacters - automatic gutter width for host-provided sheet labels; rowHeaderWidth optionally fixes its width
//   shared selection / onNavigateOut - optional single-cell coordination and vertical boundary handoff across grids
//   SimpleGrid - controlled grid with nested collapsible headers, computed summaries, row insertion, per-key resize and viewport virtualization
//   renderRowDetails / rowDetailsAppearance - inline child area with isolated events and native flat/raised presentation
//   Row-height handle - bottom gutter-selected row only; paired bars resize/reset the entire selected row range
//   Header gestures - first drag selects whole rows/columns; a subsequent grab inside that selection reorders the block
//   dropSlot - insertion slot from the pointer position against element midpoints (reorder tracking)
//   Frozen columns - leading visible columns pinned left via sticky; one continuous viewport shadow marks their edge while scrolled; group headers and merged anchors crossing the boundary keep scrolling
//   normalizeColumnGroups - validate disjoint contiguous group trees without changing physical addresses
//   Column actions - optional per-column trailing ellipsis using shared menu placement and keyboard behavior
//   Cell context menu - opt-in commands with visible selection and original row/column indexes
//   Cell comments - native corner marker, hover card, cell-menu commands and revealCell navigation; the host owns storage and the panel
//   SimpleGridCellTable - exported multi-row panel; groups use a single-row panel over a collapsed summary, reusing normal cell editors and validation
// END_MODULE_MAP

// SimpleGrid — a controlled, Excel-like editable grid for React.
//
// Behavior contract (matching Excel where it matters):
//   Mouse: click selects, drag selects a range, Shift+click extends,
//   double click edits. The native `cursor: cell` pointer with
//   `user-select: none` keeps the grid free of the text beam.
//   Keyboard: typing starts editing, Enter commits+moves down, Ctrl+Enter
//   fills the selection, F2 edits in place, Tab/Shift+Tab walk with row wrap,
//   arrows move, Shift+arrows extend, Escape cancels, Delete/Backspace clear,
//   Ctrl/Cmd+A selects all.
//   Clipboard: copy/cut/paste of a TSV/Excel range through the system
//   clipboard (text/plain + text/html), tiled over a larger selection.
//   Data quality: per-column validation (text/number/date/list) with
//   Excel-style rejection and a red corner marker, display formatting for
//   numbers and dates, single canonical decimal separator (comma).
//   Editors: a built-in text/number editor and a virtualized suggestion/list
//   editor; any custom React component plugs in via `column.editor` and
//   receives the full row context plus the column's `editorData`.

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {resolveViewCell,useGridViewState} from './viewState';

import { SimpleGridAutocompleteEditor, SimpleGridChipDisplay, SimpleGridMultiSelectEditor, SimpleGridTextEditor } from './editors';
import type { SimpleGridColumn, SimpleGridColumnGroup, SimpleGridColumnFilter, SimpleGridSort, SimpleGridMerge, SimpleGridProps, SimpleGridEditorProps, SimpleGridContextMenuContext, SimpleGridContextMenuItem, SimpleGridCellComment, SimpleGridCommentTarget } from './types';
import { ContextMenu } from './ContextMenu';
import { CommentMarker } from './comments';
import { CellDatePicker } from './DatePicker';
import {
  SG_MIN_COLUMN_WIDTH,
  SG_OPTION_HEIGHT,
  canonicalGridDecimal,
  escapeHtml,
  createGridEvaluator,
  projectGridRows,
  extendGridFillLine,
  formatGridValue,
  frozenColumnCount,
  isGridCheckboxChecked,
  normalizeGridValue,
  parseClipboardMatrix,
  parseGridMultiValue,
  serializeGridMultiValue,
  validateGridValue,
} from './utils';

/** Nested detail grids must not contribute cells to the parent's geometry. */
function ownGridElements<E extends Element = HTMLElement>(root: HTMLElement | null, selector: string): E[] {
  return root ? Array.from(root.querySelectorAll<E>(selector)).filter(element => element.closest('[data-sg]') === root) : [];
}

interface CellIndex { row: number; navIndex: number }

interface CellRange { min: CellIndex; max: CellIndex }

// START_BLOCK_COLUMN_GROUPS
interface ColumnGroup<T> {
  definition: SimpleGridColumnGroup<T>;
  children: (string | ColumnGroup<T>)[];
  leafIds: string[];
  summaryId: string;
}

/** Validate whole top-level groups atomically; rejected trees leave the flat columns intact. */
function normalizeColumnGroups<T>(definitions: SimpleGridColumnGroup<T>[], columns: SimpleGridColumn<T>[]): ColumnGroup<T>[] {
  const positions = new Map(columns.map((column, index) => [column.id, index]));
  const owned = new Set<string>();
  const groupIds = new Set<string>();
  const summaryIds = new Set(positions.keys());
  const result: ColumnGroup<T>[] = [];
  for (const definition of definitions) {
    const localLeaves = new Set<string>();
    const localGroups = new Set<string>();
    const visiting = new Set<SimpleGridColumnGroup<T>>();
    const visit = (entry: SimpleGridColumnGroup<T>): ColumnGroup<T> | null => {
      if (!entry || visiting.has(entry) || !entry.id || groupIds.has(entry.id) || localGroups.has(entry.id)
        || !Array.isArray(entry.children) || !entry.children.length || !entry.summaryColumn
        || !Number.isFinite(entry.summaryColumn.width) || entry.summaryColumn.width <= 0
        || typeof entry.summaryColumn.getValue !== 'function') return null;
      localGroups.add(entry.id);
      visiting.add(entry);
      const children: (string | ColumnGroup<T>)[] = [];
      const leafIds: string[] = [];
      for (const child of entry.children) {
        if (typeof child === 'string') {
          if (!positions.has(child) || owned.has(child) || localLeaves.has(child)) return null;
          localLeaves.add(child);
          children.push(child);
          leafIds.push(child);
        } else {
          const nested = visit(child);
          if (!nested) return null;
          children.push(nested);
          leafIds.push(...nested.leafIds);
        }
      }
      visiting.delete(entry);
      const indexes = leafIds.map((id) => positions.get(id)!);
      if (indexes.some((index, i) => i > 0 && index !== indexes[i - 1] + 1)) return null;
      return { definition: entry, children, leafIds, summaryId: '' };
    };
    const group = visit(definition);
    if (!group) continue;
    localLeaves.forEach((id) => owned.add(id));
    localGroups.forEach((id) => groupIds.add(id));
    const assignSummary = (entry: ColumnGroup<T>) => {
      let id = `__sg_summary_${entry.definition.id}`;
      while (summaryIds.has(id)) id += '_';
      summaryIds.add(id);
      entry.summaryId = id;
      entry.children.forEach((child) => { if (typeof child !== 'string') assignSummary(child); });
    };
    assignSummary(group);
    result.push(group);
  }
  return result;
}
// END_BLOCK_COLUMN_GROUPS

// Header/cell icons sit inline on the text line. The fixed 14px cell box keeps
// the in-place editor padding predictable: 14px icon + 4px gap = 18px offset.
const SG_CELL_ICON_WIDTH = 14;
const SG_CELL_ICON_GAP = 4;

/** Icon wrapper for a header title (column, group or collapsed summary). */
const headerIconNode = (icon: ReactNode | undefined, position: 'before' | 'after' | undefined, id: string) => !icon ? null : (
  <span aria-hidden="true" className="sg-header-icon" data-testid={`sg-header-icon-${id}`}
    style={position === 'after' ? { marginLeft: SG_CELL_ICON_GAP } : { marginRight: SG_CELL_ICON_GAP }}>{icon}</span>
);

/** A live header/gutter drag: the moving ordered-index block and the hovered insertion slot. */
interface ReorderDrag {
  kind: 'col' | 'row';
  fromStart: number;
  fromEnd: number;
  drop: number;
  rowTarget?: { index: number; placement: 'before' | 'inside' | 'after' | 'end'; commit?: () => void };
}

/** One undo unit: the state before (undo) or after (redo) an operation. `null` marks the untouched side. */
interface HistoryEntry<T> {
  rows: T[] | null;
  orderIds: string[] | null;
  selection: { active: CellIndex; focus: CellIndex; activeKey?: string; focusKey?: string; activeColumn?: string; focusColumn?: string } | null;
}

// Excel's default undo depth.
const SG_HISTORY_LIMIT = 100;

// Default Excel-identity palette for selection and autofill; both are
// overridable through the `selectionColor` / `selectionFill` props.
const SG_DEFAULT_SELECTION_LINE = '#217346';
const SG_DEFAULT_SELECTION_FILL = '#e8f1ec';

// Pointer travel (px) along the axis that turns a header/gutter click into a reorder drag.
const SG_REORDER_THRESHOLD = 5;

/** Insertion slot from the pointer position against element midpoints: how many midpoints sit at or before the pointer. */
export function dropSlot(midpoints: number[], position: number): number {
  let slot = 0;
  while (slot < midpoints.length && position >= midpoints[slot]) slot += 1;
  return slot;
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height="14"
      stroke="none"
      viewBox="0 0 24 24"
      width="14"
    >
      <path d="M7 10h10l-5 5z" />
    </svg>
  );
}

const cellBase = 'align-middle border-b border-r border-[#dfe1e6] p-0';

/** Skeleton cells lock exactly like disabled ones, so every edit guard shares one predicate. */
function cellLocked<T>(row: T, rowIndex: number, column: SimpleGridColumn<T>): boolean {
  return Boolean(column.isDisabled?.(row, rowIndex) || column.isSkeleton?.(row, rowIndex));
}

/** Existing dates in the built-in editor use Russian notation; formulas and
 *  custom editors retain their raw-value contract (native date inputs need ISO). */
function formatEditingValue<T>(column: SimpleGridColumn<T> | undefined, value: string): string {
  if (value.trimStart().startsWith('=')) return value;
  if (column?.kind === 'number' || column?.validation?.type === 'number') return canonicalGridDecimal(value);
  if (!column?.editor && (column?.validation?.type === 'date' || column?.format?.kind === 'date')) {
    return formatGridValue({ kind: 'date' }, value);
  }
  return value;
}

// START_BLOCK_COLUMN_MENU
type ColumnMenuIconName = 'sort-asc' | 'sort-desc' | 'clear-filter' | 'filter';

const columnMenuIconPaths: Record<ColumnMenuIconName, string[]> = {
  'sort-asc': ['m3 16 4 4 4-4', 'M7 20V4', 'M20 8h-5', 'M15 10V6.5a2.5 2.5 0 0 1 5 0V10', 'M15 14h5l-5 6h5'],
  'sort-desc': ['m3 16 4 4 4-4', 'M7 4v16', 'M15 4h5l-5 6h5', 'M15 20v-3.5a2.5 2.5 0 0 1 5 0V20', 'M20 18h-5'],
  'clear-filter': ['M12.531 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l.427-.473', 'm16.5 3.5 5 5', 'm21.5 3.5-5 5'],
  filter: ['M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z'],
};

function ColumnMenuIcon({ name, size = 16 }: { name: ColumnMenuIconName; size?: number }) {
  return <svg aria-hidden="true" focusable="false" data-sg-menu-icon={name} width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {columnMenuIconPaths[name].map((path) => <path key={path} d={path} />)}
  </svg>;
}

/** Portalled view controls have their own draft and never dispatch grid gestures. */
function ColumnMenu<T>({ column, columns, options, selected, sort, hidden, button, close, apply, reset, changeSort, changeHidden }: {
  column?: SimpleGridColumn<T>; columns: SimpleGridColumn<T>[];
  options: { value: string; label: string }[]; selected?: string[]; sort: SimpleGridSort | null;
  hidden: Set<string>; button: HTMLElement; close: () => void;
  apply: (values: string[] | null) => void; reset: () => void;
  changeSort: (sort: SimpleGridSort | null) => void; changeHidden: (ids: string[]) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const focusSubmenuRef = useRef(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState(() => new Set(selected ?? options.map((option) => option.value)));
  const [scrollTop, setScrollTop] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const filtered = options.filter((option) => option.label.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru')));
  const matching = filtered.filter((option) => checked.has(option.value));
  const first = Math.max(0, Math.floor(scrollTop / 28) - 2);
  const shown = filtered.slice(first, first + 12);
  const finish = () => { close(); button.focus({ preventScroll: true }); };
  const place = () => {
    const rect = button.getBoundingClientRect();
    const height = panelRef.current?.offsetHeight || 430;
    setPosition({ left: Math.max(8, Math.min(rect.right - 280, window.innerWidth - 288)), top: Math.max(8, Math.min(rect.bottom + 1, window.innerHeight - height - 8)) });
  };
  useLayoutEffect(() => { place(); (searchRef.current ?? panelRef.current)?.focus({ preventScroll: true }); }, []);
  useLayoutEffect(() => {
    if (!submenuOpen || !columnsButtonRef.current || !panelRef.current) return;
    const trigger = columnsButtonRef.current.getBoundingClientRect();
    const panel = panelRef.current.getBoundingClientRect();
    const width = submenuRef.current?.offsetWidth || 240;
    const height = submenuRef.current?.offsetHeight || Math.min(columns.length * 28 + 46, window.innerHeight - 16);
    const left = panel.right + width <= window.innerWidth - 8 ? panel.right - 1 : panel.left - width + 1;
    setSubmenuPosition({ left: Math.max(8, Math.min(left, window.innerWidth - width - 8)), top: Math.max(8, Math.min(trigger.top, window.innerHeight - height - 8)) });
    if (focusSubmenuRef.current) { submenuRef.current?.querySelector<HTMLElement>('input, button')?.focus(); focusSubmenuRef.current = false; }
  }, [submenuOpen, position, columns.length]);
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!panelRef.current?.contains(event.target as Node) && !submenuRef.current?.contains(event.target as Node) && !button.contains(event.target as Node)) finish(); };
    window.addEventListener('mousedown', outside);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('mousedown', outside); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, []);
  const item = (label: string, action: () => void, icon?: ColumnMenuIconName) => <button type="button" className={`sg-menu-action${icon ? '' : ' sg-menu-action-no-icon'}`} onMouseEnter={() => setSubmenuOpen(false)} onClick={action}>{icon && <ColumnMenuIcon name={icon} />}<span>{label}</span></button>;
  return createPortal(
    <div data-sg-portal="" className="sg-column-menu" aria-label={column ? `Меню столбца ${column.title || column.id}` : 'Видимость столбцов'} role="dialog" tabIndex={-1} ref={panelRef}
      style={{ top: position.top, left: position.left }}
      onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}
      onCopy={(event) => event.stopPropagation()} onCut={(event) => event.stopPropagation()} onPaste={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); if (submenuOpen) { setSubmenuOpen(false); columnsButtonRef.current?.focus(); } else finish(); }
        if (event.key === 'Tab') {
          const focusRoot = submenuRef.current?.contains(event.target as Node) ? submenuRef.current : panelRef.current;
          const controls = [...(focusRoot?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), .sg-menu-values') ?? [])].filter((element) => element.getClientRects().length > 0);
          const index = controls.indexOf(document.activeElement as HTMLElement);
          if (event.shiftKey && index <= 0) { event.preventDefault(); controls[controls.length - 1]?.focus(); }
          else if (!event.shiftKey && index === controls.length - 1) { event.preventDefault(); controls[0]?.focus(); }
        }
      }}>
      {!column && <strong>Столбцы</strong>}
      {column?.getValue && <>
        {item('Сортировка по возрастанию', () => { changeSort({ columnId: column.id, direction: 'asc' }); finish(); }, 'sort-asc')}
        {item('Сортировка по убыванию', () => { changeSort({ columnId: column.id, direction: 'desc' }); finish(); }, 'sort-desc')}
        {sort?.columnId === column.id && item('Сбросить сортировку', () => { changeSort(null); finish(); })}
        <button className="sg-menu-action" type="button" disabled={selected === undefined} onClick={() => { reset(); finish(); }}><ColumnMenuIcon name="clear-filter" /><span>Сбросить фильтр</span></button>
      </>}
      {column && item('Скрыть столбец', () => { changeHidden([...hidden, column.id]); finish(); })}
      <button ref={columnsButtonRef} className="sg-menu-action sg-menu-action-no-icon sg-submenu-trigger" type="button" aria-haspopup="dialog" aria-expanded={submenuOpen}
        onMouseEnter={() => setSubmenuOpen(true)} onClick={() => setSubmenuOpen(true)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowRight') return;
          event.preventDefault(); event.stopPropagation();
          if (submenuOpen) submenuRef.current?.querySelector<HTMLElement>('input, button')?.focus();
          else { focusSubmenuRef.current = true; setSubmenuOpen(true); }
        }}>
        <span>Показать столбцы</span><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="m9 5 7 7-7 7z" /></svg>
      </button>
      {column?.getValue && <>
        <input ref={searchRef} className="sg-menu-search" aria-label="Поиск значений" placeholder="Поиск" value={search} onChange={(event) => { setSearch(event.target.value); setScrollTop(0); const list = panelRef.current?.querySelector('.sg-menu-values'); if (list) list.scrollTop = 0; }} />
        <label className="sg-menu-option"><input type="checkbox" checked={filtered.length > 0 && matching.length === filtered.length} disabled={!filtered.length}
          ref={(node) => { if (node) node.indeterminate = matching.length > 0 && matching.length < filtered.length; }}
          onChange={(event) => { const next = new Set(checked); filtered.forEach(({ value }) => event.target.checked ? next.add(value) : next.delete(value)); setChecked(next); }} />Выделить всё</label>
        <div className="sg-menu-values" tabIndex={0} aria-label="Значения фильтра" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          onKeyDown={(event) => {
            const directions: Record<string, number> = { ArrowDown: 28, ArrowUp: -28, PageDown: 196, PageUp: -196, Home: -filtered.length * 28, End: filtered.length * 28 };
            if (directions[event.key] !== undefined) { event.preventDefault(); event.currentTarget.scrollTop += directions[event.key]; }
          }}>
          <div style={{ height: filtered.length * 28, position: 'relative' }}>
            {shown.map((option, index) => <label className="sg-menu-option" key={option.value} style={{ position: 'absolute', top: (first + index) * 28, width: '100%' }}>
              <input type="checkbox" checked={checked.has(option.value)} onChange={(event) => { const next = new Set(checked); if (event.target.checked) next.add(option.value); else next.delete(option.value); setChecked(next); }} />
              <span title={option.label}>{option.label}</span>
            </label>)}
          </div>
          {!filtered.length && <p>Нет значений</p>}
        </div>
        <div className="sg-menu-footer">
          <button type="button" disabled={!matching.length} onClick={() => { apply(!search && matching.length === options.length ? null : matching.map((option) => option.value)); finish(); }}>ОК</button>
          <button type="button" onClick={finish}>Отмена</button>
        </div>
      </>}
      {!column?.getValue && item('Закрыть', finish)}
      {submenuOpen && createPortal(
        <div ref={submenuRef} data-sg-portal="" className="sg-column-submenu" role="dialog" aria-label="Показать столбцы" style={{ top: submenuPosition.top, left: submenuPosition.left }}
          onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); setSubmenuOpen(false); columnsButtonRef.current?.focus(); } }}>
          <div className="sg-menu-columns">
            {columns.map((entry) => <label className="sg-menu-option" key={entry.id}><input type="checkbox" checked={!hidden.has(entry.id)} onChange={(event) => changeHidden(event.target.checked ? [...hidden].filter((id) => id !== entry.id) : [...hidden, entry.id])} />{entry.title || 'Действия'}</label>)}
          </div>
          <button type="button" className="sg-menu-action sg-menu-action-no-icon" onClick={() => changeHidden([])}>Показать все</button>
        </div>, document.body,
      )}
    </div>, document.body,
  );
}
// END_BLOCK_COLUMN_MENU

export function SimpleGrid<T>({
  rows: sourceRows,
  columns: columnsProp,
  columnGroups,
  collapsedGroupIds,
  defaultCollapsedGroupIds = [],
  onCollapsedGroupIdsChange,
  rowKey,
  onChange,
  createRow,
  readOnly = false,
  contextMenu = false,
  rowHeight = 22,
  rowHeights,
  defaultRowHeights = {},
  onRowHeightsChange,
  virtualize = false,
  viewportHeight = 560,
  showRowHeaders = true,
  showColumnHeaders = true,
  cornerContent,
  freezeRowHeader = true,
  rowSelectionMode = false,
  rowSelectionLabel,
  selectAllRowsLabel = 'Выбрать все строки',
  selectedRowKeys,
  defaultSelectedRowKeys = [],
  onSelectedRowKeysChange,
  hiddenColumnIds,
  defaultHiddenColumnIds = [],
  onHiddenColumnIdsChange,
  columnFilters,
  defaultColumnFilters = [],
  onColumnFiltersChange,
  sort,
  defaultSort = null,
  onSortChange,
  ariaLabel,
  initialEdit,
  initialFocus,
  viewState,
  onViewStateChange,
  onTabOut,
  onColumnWidthsChange,
  defaultColumnWidths = {},
  columnWidths,
  onEditPreview,
  onColumnOrderChange,
  rowBanner,
  rowHeaderLabel,
  rowHeaderWidth,
  selectionScope,
  singleCellSelection = false,
  onNavigateOut,
  rowHeaderStyle,
  rowFill,
  rowGroupKey,
  collapsedRowGroupKeys,
  stickyRowBanners = false,
  allowRowReorder = true,
  onRowReorder,
  rowDropTarget,
  getRowScrollContainer,
  allowRowInsert = true,
  onPasteOverflow,
  rowClassName,
  rowAttributes,
  onActiveRowChange,
  visibleRowIndices,
  onRevealRow,
  renderRowDetails,
  rowDetailsAppearance = 'flat',
  selectionColor = SG_DEFAULT_SELECTION_LINE,
  selectionFill = SG_DEFAULT_SELECTION_FILL,
  mergedCells,
  frozenColumnIds,
  cellComments,
  onCellCommentAdd,
  onCellCommentOpen,
  revealCell,
}: SimpleGridProps<T>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rowNumberMeasureRef = useRef<HTMLSpanElement>(null);
  const gutterMeasurementRef = useRef<{ scrollKey: string; width: number } | null>(null);
  const [numberGutterWidth, setGutterWidth] = useState(24);
  const gutterWidth = showRowHeaders ? (rowHeaderWidth === undefined ? numberGutterWidth : Math.max(24, rowHeaderWidth)) + (rowSelectionMode ? 24 : 0) : 0;
  const [internalSelectedRowKeys, setInternalSelectedRowKeys] = useState(defaultSelectedRowKeys);
  const [internalHidden, setInternalHidden] = useState(defaultHiddenColumnIds);
  const [internalCollapsedGroups, setInternalCollapsedGroups] = useState(defaultCollapsedGroupIds);
  const [internalFilters, setInternalFilters] = useState(defaultColumnFilters);
  const [internalSort, setInternalSort] = useState(defaultSort);
  const filters = columnFilters ?? internalFilters;
  const appliedSort = sort === undefined ? internalSort : sort;
  const [menu, setMenu] = useState<{ columnId: string | null; button: HTMLElement } | null>(null);
  const [columnActionMenu, setColumnActionMenu] = useState<{columnId: string; button: HTMLElement; x: number; y: number} | null>(null);
  const actionColumn = columnActionMenu ? columnsProp.find(column => column.id === columnActionMenu.columnId) : undefined;
  const [rowMenu, setRowMenu] = useState<{ key: string; x: number; y: number } | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);
  const [cellMenu, setCellMenu] = useState<{ row: number; navIndex: number; x: number; y: number } | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const cellMenuTargetRef = useRef<{rowKey:string;columnId:string}|null>(null);
  const pendingInsertedKey = useRef<string | null>(null);
  // START_BLOCK_ROW_HEIGHTS
  const [internalRowHeights, setInternalRowHeights] = useState(defaultRowHeights);
  const [heightPreview, setHeightPreview] = useState<{ keys: Set<string>; height: number } | null>(null);
  const heightOverrides = rowHeights ?? internalRowHeights;
  const heightOverridesRef = useRef(heightOverrides);
  heightOverridesRef.current = heightOverrides;
  const resizeCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => resizeCleanup.current?.(), []);
  const commitRowHeights = (next: Record<string, number>) => {
    if (rowHeights === undefined) setInternalRowHeights(next);
    onRowHeightsChange?.({ ...next });
  };
  const getRowHeight = (key: string) => {
    const value = heightPreview?.keys.has(key) ? heightPreview.height : heightOverrides[key];
    const minimum = rowHeights ? 1 : 22;
    return Math.max(minimum, Number.isFinite(value) ? value : (Number.isFinite(rowHeight) ? rowHeight : 22));
  };
  // END_BLOCK_ROW_HEIGHTS
  const presentRowKeys = useMemo(() => sourceRows.map(rowKey), [sourceRows, rowKey]);
  const selectedRows = useMemo(() => {
    const requested = new Set(selectedRowKeys ?? internalSelectedRowKeys);
    return new Set(presentRowKeys.filter((key) => requested.has(key)));
  }, [presentRowKeys, selectedRowKeys, internalSelectedRowKeys]);
  const rowSelectionAnchor = useRef<string | null>(null);
  const selectAllRowsRef = useRef<HTMLInputElement>(null);
  const updateSelectedRows = (keys: string[]) => {
    if (selectedRowKeys === undefined) setInternalSelectedRowKeys(keys);
    onSelectedRowKeysChange?.(keys);
  };
  const toggleSelectedRow = (rowIndex: number, checked: boolean, extend: boolean) => {
    const next = new Set(selectedRows);
    const anchorIndex = rowSelectionAnchor.current === null ? -1 : visibleRowKeys.indexOf(rowSelectionAnchor.current);
    const first = extend && anchorIndex >= 0 ? Math.min(anchorIndex, rowIndex) : rowIndex;
    const last = extend && anchorIndex >= 0 ? Math.max(anchorIndex, rowIndex) : rowIndex;
    for (let index = first; index <= last; index += 1) {
      if (checked) next.add(visibleRowKeys[index]);
      else next.delete(visibleRowKeys[index]);
    }
    if (!extend || anchorIndex < 0) rowSelectionAnchor.current = visibleRowKeys[rowIndex];
    updateSelectedRows(presentRowKeys.filter((key) => next.has(key)));
  };

  // Column order dragged by header grabs; `null` keeps the props order. Known
  // ids follow the saved order, columns added by the host land at the end.
  const [orderIds, setOrderIds] = useState<string[] | null>(null);
  const physicalColumns = useMemo(() => {
    if (!orderIds) return columnsProp;
    const byId = new Map(columnsProp.map((column) => [column.id, column]));
    const ordered = orderIds.map((id) => byId.get(id)).filter((column): column is SimpleGridColumn<T> => Boolean(column));
    const seen = new Set(ordered.map((column) => column.id));
    return [...ordered, ...columnsProp.filter((column) => !seen.has(column.id))];
  }, [columnsProp, orderIds]);

  // START_BLOCK_COLUMN_GROUPS
  const groups = useMemo(() => normalizeColumnGroups(columnGroups ?? [], columnsProp), [columnGroups, columnsProp]);
  const allGroups = useMemo(() => {
    const list: ColumnGroup<T>[] = [];
    const visit = (group: ColumnGroup<T>) => {
      list.push(group);
      group.children.forEach((child) => { if (typeof child !== 'string') visit(child); });
    };
    groups.forEach(visit);
    return list;
  }, [groups]);
  const collapsedGroups = useMemo(() => new Set(collapsedGroupIds ?? internalCollapsedGroups), [collapsedGroupIds, internalCollapsedGroups]);
  const summaryGroups = useMemo(() => new Map(allGroups.map((group) => [group.summaryId, group])), [allGroups]);
  const [groupRowPreview, setGroupRowPreview] = useState<T | null>(null);
  const [groupRowWidths, setGroupRowWidths] = useState<Record<string, Record<string, number>>>({});
  // Summaries append to the physical array, so A1 references keep their original indexes.
  const columns = useMemo(() => allGroups.length ? [...physicalColumns, ...allGroups.map((group): SimpleGridColumn<T> => ({
    ...group.definition.summaryColumn, id: group.summaryId, title: group.definition.title, readOnly: !group.definition.summaryColumn.setValue,
    getValue: (row) => group.definition.summaryColumn.getValue(groupRowPreview && rowKey(groupRowPreview) === rowKey(row) ? groupRowPreview : row),
    renderValue: group.definition.summaryColumn.renderValue ? (row, index) => group.definition.summaryColumn.renderValue!(groupRowPreview && rowKey(groupRowPreview) === rowKey(row) ? groupRowPreview : row, index) : undefined,
  }))] : physicalColumns, [physicalColumns, allGroups, groupRowPreview, rowKey]);
  const manuallyHidden = useMemo(() => new Set(hiddenColumnIds ?? internalHidden), [hiddenColumnIds, internalHidden]);
  const columnProjection = useMemo(() => {
    const visibleIds: string[] = [];
    const paths = new Map<string, ColumnGroup<T>[]>();
    const positions = new Map(physicalColumns.map((column, index) => [column.id, index]));
    const visit = (group: ColumnGroup<T>, parents: ColumnGroup<T>[]) => {
      if (collapsedGroups.has(group.definition.id)) {
        visibleIds.push(group.summaryId);
        paths.set(group.summaryId, parents);
        return;
      }
      const path = [...parents, group];
      const children = [...group.children].sort((a, b) => {
        const first = (child: string | ColumnGroup<T>) => typeof child === 'string' ? positions.get(child)! : Math.min(...child.leafIds.map((id) => positions.get(id)!));
        return first(a) - first(b);
      });
      for (const child of children) {
        if (typeof child !== 'string') visit(child, path);
        else if (!manuallyHidden.has(child)) { visibleIds.push(child); paths.set(child, path); }
      }
    };
    const owner = new Map(groups.flatMap((group) => group.leafIds.map((id) => [id, group] as const)));
    const emitted = new Set<ColumnGroup<T>>();
    for (const column of physicalColumns) {
      const group = owner.get(column.id);
      if (group) { if (!emitted.has(group)) { emitted.add(group); visit(group, []); } }
      else if (!manuallyHidden.has(column.id)) { visibleIds.push(column.id); paths.set(column.id, []); }
    }
    return { visibleIds, paths };
  }, [physicalColumns, groups, collapsedGroups, manuallyHidden]);
  const hiddenColumns = useMemo(() => {
    const visible = new Set(columnProjection.visibleIds);
    return new Set(columns.filter((column) => !visible.has(column.id)).map((column) => column.id));
  }, [columns, columnProjection]);
  // END_BLOCK_COLUMN_GROUPS
  // START_BLOCK_ROW_PROJECTION
  const sourceEvaluator = useMemo(() => createGridEvaluator(sourceRows, physicalColumns), [sourceRows, physicalColumns]);
  const outline = useMemo(() => {
    if(!rowGroupKey||!rowBanner)return undefined;
    const keys=new Set<string>();sourceRows.forEach((row,index)=>{if(rowBanner(row,index))keys.add(rowKey(row));});
    return {groupKey:rowGroupKey,isBanner:(row:T)=>keys.has(rowKey(row))};
  }, [rowGroupKey,rowBanner,sourceRows,rowKey]);
  const rowIndexes = useMemo(() => {
    const projected=projectGridRows(sourceRows, physicalColumns, filters, appliedSort, sourceEvaluator,undefined,outline);
    if(!outline||!collapsedRowGroupKeys?.length)return projected;
    const collapsed=new Set(collapsedRowGroupKeys);
    return projected.filter(index=>outline.isBanner(sourceRows[index])||!collapsed.has(outline.groupKey(sourceRows[index])||''));
  }, [sourceRows, physicalColumns, filters, appliedSort, sourceEvaluator,outline,collapsedRowGroupKeys]);
  const rows = useMemo(() => rowIndexes.map((index) => sourceRows[index]), [sourceRows, rowIndexes]);
  const headerLabelCharacters=useMemo(()=>rowHeaderLabel?sourceRows.reduce((max,row,index)=>{const label=rowHeaderLabel(row,index);return typeof label==='number'||typeof label==='string'?Math.max(max,String(label).length):max;},1):0,[sourceRows,rowHeaderLabel]);
  const rowViewProjected = filters.some((filter) => physicalColumns.some((column) => column.id === filter.columnId && column.getValue))
    || Boolean(appliedSort && physicalColumns.some((column) => column.id === appliedSort.columnId && column.getValue));
  const projected = Boolean(outline&&collapsedRowGroupKeys?.length)||rowViewProjected;
  const sourceIndex = (index: number) => rowIndexes[index] ?? sourceRows.length + Math.max(0, index - rows.length);
  const visibleRowKeys = useMemo(() => rows.map(rowKey), [rows, rowKey]);
  // Full-width banner rows (prop `rowBanner`): the host draws them as one
  // spanning cell after the standard row gutter. They stay outside navigation, editing,
  // autofill and the clipboard — but keep flowing through rows/onChange.
  const bannerKeys = useMemo(() => {
    const keys = new Set<string>();
    if (rowBanner) rows.forEach((row, index) => { if (rowBanner(row, index)) keys.add(rowKey(row)); });
    return keys;
  }, [rowBanner, rows, rowKey]);
  const visibleSelectedCount = visibleRowKeys.filter((key) => selectedRows.has(key)).length;
  useLayoutEffect(() => {
    if (selectAllRowsRef.current) selectAllRowsRef.current.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < visibleRowKeys.length;
  }, [rowSelectionMode, visibleSelectedCount, visibleRowKeys.length]);
  const updateHidden = (ids: string[]) => {
    if (hiddenColumnIds === undefined) setInternalHidden(ids);
    onHiddenColumnIdsChange?.(ids);
  };
  const updateFilters = (next: SimpleGridColumnFilter[]) => {
    if (columnFilters === undefined) setInternalFilters(next);
    onColumnFiltersChange?.(next);
  };
  const updateSort = (next: SimpleGridSort | null) => {
    if (sort === undefined) setInternalSort(next);
    onSortChange?.(next);
  };
  // END_BLOCK_ROW_PROJECTION
  const visibleCols = useMemo(() => {
    const positions = new Map(columns.map((column, index) => [column.id, index]));
    return columnProjection.visibleIds.map((id) => positions.get(id)!);
  }, [columns, columnProjection]);
  const navCols = useMemo(() => visibleCols.filter((index) => !(columns[index].render && !columns[index].navigable)), [columns, visibleCols]);
  const navIndexOf = useCallback((columnIndex: number) => navCols.indexOf(columnIndex), [navCols]);
  const navigationIdsInOrder = useCallback((ids: string[]) => {
    const position = (id: string) => {
      const group = summaryGroups.get(id);
      return group ? Math.min(...group.leafIds.map((leaf) => ids.indexOf(leaf))) : ids.indexOf(id);
    };
    return navCols.map((index) => columns[index].id).sort((a, b) => position(a) - position(b));
  }, [navCols, columns, summaryGroups]);

  // Merged-cell rectangles (prop `mergedCells`): anchors and covered cells
  // keyed by «row:col» of physical columns. Invalid or overlapping ranges are
  // dropped silently — the first valid one wins; spans clamp to the sheet.
  const merges = useMemo(() => {
    const anchors = new Map<string, { rowSpan: number; colSpan: number }>();
    const covered = new Map<string, { row: number; col: number }>();
    for (const merge of mergedCells ?? []) {
      if (projected) break;
      const row = Math.floor(merge.row);
      const col = Math.floor(merge.col);
      if (row < 0 || col < 0 || row >= rows.length || col >= physicalColumns.length) continue;
      const rowSpan = Math.max(1, Math.min(Math.floor(merge.rowSpan) || 1, rows.length - row));
      const colSpan = Math.max(1, Math.min(Math.floor(merge.colSpan) || 1, physicalColumns.length - col));
      // Keep physical addresses stable; restore this merge when its columns are shown.
      if (columns.slice(col, col + colSpan).some((column) => hiddenColumns.has(column.id))) continue;
      if (anchors.has(`${row}:${col}`)) continue;
      let clash = false;
      for (let r = row; r < row + rowSpan && !clash; r += 1) {
        for (let c = col; c < col + colSpan && !clash; c += 1) {
          if (anchors.has(`${r}:${c}`) || covered.has(`${r}:${c}`)) clash = true;
        }
      }
      if (clash) continue;
      anchors.set(`${row}:${col}`, { colSpan, rowSpan });
      for (let r = row; r < row + rowSpan; r += 1) {
        for (let c = col; c < col + colSpan; c += 1) {
          if (r === row && c === col) continue;
          covered.set(`${r}:${c}`, { col, row });
        }
      }
    }
    return { anchors, covered };
  }, [columns, physicalColumns.length, hiddenColumns, mergedCells, projected, rows.length]);

  // `active` is the start cell of the selection: it stays white, it is the edit
  // target and the anchor Excel keeps while the range grows. `focus` is the
  // moving corner (the same as `active` for a single cell).
  const [active, setActive] = useState<CellIndex | null>(()=>resolveViewCell(viewState?.selection?.active,visibleRowKeys,navCols.map(index=>columns[index].id)));
  const activeRowKey = active ? visibleRowKeys[active.row] : undefined;
  const notifiedRowKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (notifiedRowKey.current === activeRowKey) return;
    notifiedRowKey.current = activeRowKey;
    if (active && rows[active.row]) onActiveRowChange?.(rows[active.row]);
  }, [active, activeRowKey, onActiveRowChange, rows]);
  const [groupRowEditor, setGroupRowEditor] = useState<{ key: string; groupId: string; anchor: HTMLElement; seed?: { columnId: string; value: string }; focus?: { columnId: string } } | null>(null);
  useEffect(() => { if (!groupRowEditor) setGroupRowPreview(null); }, [groupRowEditor]);
  useEffect(() => {
    if (groupRowEditor && (!collapsedGroups.has(groupRowEditor.groupId) || !sourceRows.some((row) => rowKey(row) === groupRowEditor.key))) setGroupRowEditor(null);
  }, [groupRowEditor, collapsedGroups, sourceRows, rowKey]);
  const [focus, setFocus] = useState<CellIndex | null>(()=>resolveViewCell(viewState?.selection?.focus,visibleRowKeys,navCols.map(index=>columns[index].id)));
  const viewRestore=useGridViewState(wrapperRef,{state:viewState,onChange:onViewStateChange,keys:visibleRowKeys,ids:navCols.map(index=>columns[index].id),active,focus});
  const previousViewState=useRef(viewState);
  useLayoutEffect(()=>{
    if(previousViewState.current===viewState)return;
    previousViewState.current=viewState;
    if(!viewState?.selection)return;
    const ids=navCols.map(index=>columns[index].id);
    setActive(resolveViewCell(viewState.selection.active,visibleRowKeys,ids));
    setFocus(resolveViewCell(viewState.selection.focus,visibleRowKeys,ids));
  },[viewState,visibleRowKeys,navCols,columns]);
  // The clipboard source stays independent of the current paste destination.
  const [copiedRange, setCopiedRange] = useState<CellRange | null>(null);
  const copiedRowsRef = useRef<{ rows: T[]; columnIds: string[] } | null>(null);
  const clipboardLayout = JSON.stringify([visibleRowKeys, navCols.map((index) => columns[index].id)]);
  // Only a gutter selection exposes row-height handles, even in a one-column grid.
  const [gutterSelection, setGutterSelection] = useState<{ active: CellIndex; focus: CellIndex } | null>(null);
  const [columnSelection, setColumnSelection] = useState<{ active: CellIndex; focus: CellIndex } | null>(null);
  const headerGrabCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => headerGrabCleanup.current?.(), []);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  // A host commonly recreates its rows array on unrelated renders. Keep the
  // copied row snapshot (Excel clipboard semantics) across those updates; only
  // invalidate it when the visible row/column layout changes.
  useEffect(() => { setCopiedRange(null); }, [sourceRows, editing]);
  useEffect(() => { copiedRowsRef.current = null; }, [clipboardLayout]);
  const [searchStarted, setSearchStarted] = useState(false);
  const [draft, setDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const editPreviewRef = useRef(onEditPreview);
  editPreviewRef.current = onEditPreview;
  useEffect(() => {
    const preview = editPreviewRef.current;
    if (!preview) return;
    const column = active && editing ? columns[navCols[active.navIndex]] : undefined;
    const row = active && editing ? rows[active.row] : undefined;
    if (row && column?.setValue) {
      const value = normalizeGridValue(column, draft);
      preview(validateGridValue(column.validation, value) ? null : column.setValue(row, value), column.id);
    } else {
      preview(null);
    }
    // Only draft/selection transitions emit previews; host renders must not replay them.
  }, [editing, draft, active?.row, active?.navIndex]);
  // Row snapshot taken when editing starts, so a live-applied draft can be rolled
  // back on Escape without flipping the amount source.
  const editSnapshotRef = useRef<{ row: number; value: T } | null>(null);
  // Viewport point for the caret of the next editor mount: double-click puts the
  // caret at the clicked character (Excel edit mode), every other path leaves it
  // at the end of the text.
  const caretRequestRef = useRef<{ x: number; y: number } | null>(null);

  // Autofill drag started from the corner handle: the source range is frozen at
  // mousedown, the hovered target updates during the drag and lands on mouseup.
  const [fillTarget, setFillTarget] = useState<CellRange | null>(null);
  const fillDragRef = useRef<{ source: CellRange } | null>(null);
  const fillTargetRef = useRef<CellRange | null>(null);
  // Whether the pointer truly moved since the last scroll: a wheel scroll drags
  // cells under a still cursor, and the synthetic mouseovers must not stretch
  // the drag selection (or the fill target) without a real pointer move.
  const pointerMovedRef = useRef(false);

  // Header/gutter grab turned into a reorder drag (column/row move).
  const reorderRef = useRef<ReorderDrag | null>(null);
  const [reorder, setReorder] = useState<ReorderDrag | null>(null);

  // Undo/redo stacks (Excel-style, one combined history). Entries hold array
  // references — structural sharing keeps snapshots cheap. The mirrors let
  // window-level drag handlers and undo read the latest state without
  // re-subscribing.
  const historyRef = useRef<{ undo: HistoryEntry<T>[]; redo: HistoryEntry<T>[] }>({ undo: [], redo: [] });
  const rowsRef = useRef(sourceRows);
  rowsRef.current = sourceRows;
  const orderIdsRef = useRef(orderIds);
  orderIdsRef.current = orderIds;
  const columnsPropRef = useRef(columnsProp);
  columnsPropRef.current = columnsProp;
  const activeRef = useRef(active);
  activeRef.current = active;
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const skipProjectionRemapRef = useRef(false);
  // While an editor is open, live-applied drafts (applyDraft) mutate rows
  // without history entries; the whole edit commits as one unit against this
  // pre-edit snapshot.
  const editBaselineRef = useRef<T[] | null>(null);
  const editAppliedRef = useRef(false);

  const captureSelection = useCallback((): HistoryEntry<T>['selection'] => {
    const a = activeRef.current;
    const f = focusRef.current;
    return a && f ? { active: a, focus: f, activeKey: rows[a.row] && rowKey(rows[a.row]), focusKey: rows[f.row] && rowKey(rows[f.row]), activeColumn: columns[navCols[a.navIndex]]?.id, focusColumn: columns[navCols[f.navIndex]]?.id } : null;
  }, [rows, rowKey, columns, navCols]);

  const snapshotOf = useCallback((kind: 'rows' | 'order'): HistoryEntry<T> => ({
    rows: kind === 'rows' ? editBaselineRef.current ?? rowsRef.current : null,
    // The effective order, not the raw state: `null` means "props order", and
    // undoing the first reorder must restore it as an explicit list.
    orderIds: kind === 'order' ? orderIdsRef.current ?? columnsPropRef.current.map((column) => column.id) : null,
    selection: captureSelection(),
  }), [captureSelection]);

  /** Record the pre-op state and drop the redo branch — call right before a mutating onChange/setOrderIds. */
  const pushUndoSnapshot = useCallback((kind: 'rows' | 'order', snapshot = snapshotOf(kind)) => {
    const stack = historyRef.current;
    stack.undo.push(snapshot);
    if (stack.undo.length > SG_HISTORY_LIMIT) stack.undo.shift();
    stack.redo = [];
  }, [snapshotOf]);

  // The grid only emits snapshots; the host may transform them (normalize,
  // append service rows) — the history survives such round-trips, and an undo
  // restores the last state the grid produced, reverting any foreign host
  // edits made in between.
  const emit = useCallback((next: T[], editedColumnId?: string, sourceRowsDirect = false) => {
    const mapped = !projected || sourceRowsDirect ? next : sourceRows.slice();
    if (projected && !sourceRowsDirect) {
      next.forEach((row, index) => {
        if (index < rowIndexes.length) mapped[rowIndexes[index]] = row;
        else mapped.push(row);
      });
    }
    if (onChange(mapped, editedColumnId) === false) return false;
    rowsRef.current = mapped;
    return true;
  }, [onChange, projected, sourceRows, rowIndexes]);

  /** Commit a data mutation with one undo unit; structural edits use source rows directly. */
  const emitRows = useCallback((next: T[], sourceRowsDirect = false, editedColumnId?: string) => {
    const snapshot = snapshotOf('rows');
    if (emit(next, editedColumnId, sourceRowsDirect)) pushUndoSnapshot('rows', snapshot);
  }, [emit, pushUndoSnapshot, snapshotOf]);

  /** Put the selection back where an operation found it, clamped to the sheet. */
  const restoreSelection = useCallback((snap: HistoryEntry<T>['selection'], keys: string[], order = columns) => {
    const rowCount = keys.length;
    if (!navCols.length || !rowCount) { setActive(null); setFocus(null); return; }
    if (!snap) return;
    const ids = navigationIdsInOrder(order.map((column) => column.id));
    const clamp = (cell: CellIndex, key?: string, columnId?: string): CellIndex => {
      const row = key === undefined ? -1 : keys.indexOf(key);
      let col = columnId === undefined ? -1 : ids.indexOf(columnId);
      if (col < 0 && columnId) {
        const summary = summaryGroups.get(columnId);
        col = ids.findIndex((id) => summaryGroups.get(id)?.leafIds.includes(columnId)
          || (summary && (summary.leafIds.includes(id) || summaryGroups.get(id)?.leafIds.some((leaf) => summary.leafIds.includes(leaf)))));
      }
      return { row: row >= 0 ? row : Math.max(0, Math.min(cell.row, rowCount - 1)), navIndex: col >= 0 ? col : Math.max(0, Math.min(cell.navIndex, navCols.length - 1)) };
    };
    setActive(clamp(snap.active, snap.activeKey, snap.activeColumn));
    setFocus(clamp(snap.focus, snap.focusKey, snap.focusColumn));
  }, [navCols.length, columns, navigationIdsInOrder, summaryGroups]);

  const applyHistoryEntry = useCallback((entry: HistoryEntry<T>) => {
    skipProjectionRemapRef.current = true;
    if (entry.rows) onChange(entry.rows);
    if (entry.orderIds) {
      setOrderIds(entry.orderIds);
      onColumnOrderChange?.(entry.orderIds.slice());
    }
    const targetRows = entry.rows ?? sourceRows;
    const targetColumns = entry.orderIds ? [...physicalColumns].sort((a, b) => entry.orderIds!.indexOf(a.id) - entry.orderIds!.indexOf(b.id)) : physicalColumns;
    const keys = projectGridRows(targetRows, targetColumns, filters, appliedSort, createGridEvaluator(targetRows, targetColumns)).map((index) => rowKey(targetRows[index]));
    restoreSelection(entry.selection, keys, targetColumns);
  }, [onChange, onColumnOrderChange, restoreSelection, physicalColumns, filters, appliedSort, sourceRows, rowKey]);

  const runUndo = useCallback(() => {
    const stack = historyRef.current;
    const entry = stack.undo.pop();
    if (!entry) return;
    stack.redo.push(snapshotOf(entry.rows !== null ? 'rows' : 'order'));
    if (stack.redo.length > SG_HISTORY_LIMIT) stack.redo.shift();
    applyHistoryEntry(entry);
  }, [applyHistoryEntry, snapshotOf]);

  const runRedo = useCallback(() => {
    const stack = historyRef.current;
    const entry = stack.redo.pop();
    if (!entry) return;
    stack.undo.push(snapshotOf(entry.rows !== null ? 'rows' : 'order'));
    if (stack.undo.length > SG_HISTORY_LIMIT) stack.undo.shift();
    applyHistoryEntry(entry);
  }, [applyHistoryEntry, snapshotOf]);

  // Column widths dragged by the header handles, relative to `column.width`.
  // Preview at most once per animation frame; notify the host only on completion.
  // The ref mirrors the state so the window-level drag listeners always read
  // the latest map without re-subscribing on every move.
  const [widthOverrides, setWidthOverrides] = useState<Record<string, number>>(() => ({...columnWidths ?? defaultColumnWidths}));
  const widthOverridesRef = useRef<Record<string, number>>(widthOverrides);
  useLayoutEffect(() => {
    if (!columnWidths) return;
    widthOverridesRef.current = columnWidths;
    setWidthOverrides(columnWidths);
  }, [columnWidths]);
  // Both halves of a boundary share one marker, including during a drag.
  const updateResizeGeometry = useRef<(() => void) | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [hoveredResizeColumn, setHoveredResizeColumn] = useState<string | null>(null);
  const commitWidthOverrides = useCallback((map: Record<string, number>) => {
    widthOverridesRef.current = map;
    setWidthOverrides(map);
    onColumnWidthsChange?.({ ...map });
  }, [onColumnWidthsChange]);

  const resizeColumnsFor = useCallback((columnId: string) => {
    const nav = navCols.findIndex((index) => columns[index].id === columnId);
    const isHeaderRange = active !== null && focus !== null && columnSelection?.active === active && columnSelection.focus === focus
      && Math.min(active.row, focus.row) === 0 && Math.max(active.row, focus.row) === rows.length - 1
      && nav >= Math.min(active.navIndex, focus.navIndex) && nav <= Math.max(active.navIndex, focus.navIndex);
    return (isHeaderRange ? navCols.slice(Math.min(active.navIndex, focus.navIndex), Math.max(active.navIndex, focus.navIndex) + 1).map((index) => columns[index])
      : columns.filter((column) => column.id === columnId)).filter((column) => column.resizable !== false);
  }, [active, focus, columnSelection, navCols, columns, rows.length]);

  const beginColumnResize = useCallback((columnId: string, event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (reorderRef.current) return;
    headerGrabCleanup.current?.();
    resizeCleanup.current?.();
    const targets = resizeColumnsFor(columnId);
    if (!targets.length) return;
    const pointerId = 'pointerId' in event ? event.pointerId : undefined;
    const moveEventName = pointerId === undefined ? 'mousemove' : 'pointermove';
    const upEventName = pointerId === undefined ? 'mouseup' : 'pointerup';
    const initialWidths = widthOverridesRef.current;
    const declared = columns.find((column) => column.id === columnId)?.width ?? 0;
    // A grow column can be wider than its declared minimum. Resize from the
    // painted edge, not from the declaration, so the first move cannot jump.
    const header = ownGridElements(wrapperRef.current, 'thead th[data-column-index]')
      .find((element) => columns[Number(element.dataset.columnIndex)]?.id === columnId);
    const measured = header?.getBoundingClientRect().width ?? 0;
    const startWidth = measured > 0 ? measured : widthOverridesRef.current[columnId] ?? declared;
    const start = { id: columnId, startX: event.clientX, startWidth };
    document.body.style.cursor = 'col-resize';
    setResizingColumn(columnId);
    // Nonvirtual tables can preview native column geometry without rendering cells.
    // Cache DOM targets once per gesture; the frame itself only writes styles.
    const root = wrapperRef.current;
    const table = root?.querySelector<HTMLTableElement>(':scope > table');
    const nativePreview = !!table && !root?.hasAttribute('data-sg-virtual');
    const colElements = table ? Array.from(table.querySelectorAll<HTMLElement>(':scope > colgroup > col')) : [];
    const frozenElements = ownGridElements(root, '[data-sg-frozen-position]');
    const originalStyles = nativePreview ? [table!, ...colElements, ...frozenElements].map(element => ({element, width:element.style.width, minWidth:element.style.minWidth, left:element.style.left})) : [];
    const paintWidthPreview = () => {
      const map = widthOverridesRef.current;
      if (!nativePreview) { setWidthOverrides(map); return; }
      const offsets = [gutterWidth];
      visibleCols.forEach((index, position) => {
        const column = columns[index];
        const width = map[column.id] ?? column.width;
        const col = colElements[position + Number(showRowHeaders)];
        if (col) col.style.width = column.grow && map[column.id] === undefined ? '' : `${width}px`;
        offsets.push(offsets[position] + width);
      });
      table!.style.width = `${offsets[offsets.length - 1]}px`;
      table!.style.minWidth = visibleCols.some(index => columns[index].grow && map[columns[index].id] === undefined) ? '100%' : '';
      frozenElements.forEach(element => { element.style.left = `${offsets[Number(element.dataset.sgFrozenPosition)]}px`; });
      updateResizeGeometry.current?.();
    };
    let frame: number | null = null;
    const onMove = (moveEvent: MouseEvent) => {
      if (pointerId !== undefined && (moveEvent as PointerEvent).pointerId !== pointerId) return;
      const requested = Math.round(start.startWidth + (moveEvent.clientX - start.startX));
      const map = { ...widthOverridesRef.current };
      targets.forEach(column => { map[column.id] = Math.max(column.minWidth ?? SG_MIN_COLUMN_WIDTH, requested); });
      if (targets.every(column => widthOverridesRef.current[column.id] === map[column.id])) return;
      // Preview locally once per frame; persistence belongs to the completed drag.
      widthOverridesRef.current = map;
      if (frame === null) frame = requestAnimationFrame(() => {
        frame = null;
        paintWidthPreview();
      });
    };
    const cleanup = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      originalStyles.forEach(({element, width, minWidth, left}) => { element.style.width=width; element.style.minWidth=minWidth; element.style.left=left; });
      document.body.style.cursor = '';
      window.removeEventListener(moveEventName, onMove);
      window.removeEventListener(upEventName, onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onUp);
      resizeCleanup.current = null;
    };
    const onUp = (upEvent: Event) => {
      if (upEvent.type === 'pointerup' && (upEvent as PointerEvent).pointerId !== pointerId) return;
      cleanup();
      setResizingColumn(null);
      // An override equal to the declared width is no override at all.
      const map = { ...widthOverridesRef.current };
      targets.forEach((column) => { if (map[column.id] === column.width) delete map[column.id]; });
      commitWidthOverrides(map);
    };
    const onCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      cleanup();
      widthOverridesRef.current = initialWidths;
      setWidthOverrides(initialWidths);
      setResizingColumn(null);
    };
    resizeCleanup.current = cleanup;
    window.addEventListener(moveEventName, onMove);
    window.addEventListener(upEventName, onUp);
    if (pointerId !== undefined) window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onUp);
  }, [columns, commitWidthOverrides, resizeColumnsFor, visibleCols, gutterWidth, showRowHeaders]);

  const resetColumnWidth = useCallback((columnId: string) => {
    const targets = resizeColumnsFor(columnId);
    if (targets.every((column) => widthOverridesRef.current[column.id] === undefined)) return;
    const map = { ...widthOverridesRef.current };
    targets.forEach((column) => { delete map[column.id]; });
    commitWidthOverrides(map);
  }, [commitWidthOverrides, resizeColumnsFor]);

  // START_BLOCK_VIRTUAL_VIEWPORT
  // Physical data indexes never depend on what is currently mounted. Spacer
  // rows/columns preserve native table geometry; an open editor stays mounted.
  const virtual = virtualize && !renderRowDetails && groups.length === 0 && merges.anchors.size === 0 && bannerKeys.size === 0
    && !visibleCols.some((index) => columns[index].wrap || (columns[index].maxLines ?? 1) > 1);
  const fixedRowHeight = Math.max(22, Number.isFinite(rowHeight) ? rowHeight : 22);
  const rowOffsets = useMemo(() => {
    // Retain the constant-height fast path for large unmodified sheets.
    if (!heightPreview && !Object.keys(heightOverrides).length) return null;
    const offsets = [0];
    for (const row of rows) offsets.push(offsets[offsets.length - 1] + getRowHeight(rowKey(row)));
    return offsets;
  }, [rows, rowKey, heightOverrides, heightPreview, fixedRowHeight]);
  const rowTop = (index: number) => rowOffsets ? rowOffsets[index] : index * fixedRowHeight;
  const rowAtOffset = (offset: number) => {
    if (!rowOffsets) return Math.max(0, Math.min(rows.length - 1, Math.floor(offset / fixedRowHeight)));
    let low = 0;
    let high = rows.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (rowOffsets[middle + 1] <= offset) low = middle + 1;
      else high = middle;
    }
    return Math.max(0, Math.min(rows.length - 1, low));
  };
  const virtualHeight = Math.max(100, viewportHeight);
  const [viewport, setViewport] = useState({ top: 0, left: 0, width: 800, height: virtualHeight });
  const [horizontallyScrolled, setHorizontallyScrolled] = useState(false);
  const frozenShadowRef = useRef<HTMLDivElement | null>(null);
  const [bannerTop,setBannerTop]=useState(0);
  const collapseSignature=JSON.stringify([...(collapsedRowGroupKeys||[])].sort());
  const previousCollapseSignature=useRef(collapseSignature);
  const collapseScrollAnchor=useRef<{key:string;top:number;scroller:HTMLElement}|null>(null);
  const outlineTail=useRef(0);
  const captureCollapseScroll=(target:EventTarget|null)=>{
    const root=wrapperRef.current;if(!root||!rowGroupKey||!(target instanceof Element))return;
    if(!target.closest('button[aria-expanded]')||target.closest('[data-sg]')!==root)return;
    let scroller:HTMLElement|null=root;
    while(scroller&&scroller!==document.body){if(/^(auto|scroll|overlay)$/.test(getComputedStyle(scroller).overflowY))break;scroller=scroller.parentElement;}
    scroller=scroller&&scroller!==document.body?scroller:document.scrollingElement as HTMLElement;
    if(!scroller)return;
    const viewportTop=scroller===document.scrollingElement?0:scroller.getBoundingClientRect().top+scroller.clientTop;
    const headerBottom=Math.max(viewportTop,...ownGridElements<HTMLElement>(root,'thead th').map(header=>header.getBoundingClientRect().bottom));
    const banners=ownGridElements<HTMLElement>(root,'.sg-row-banner');
    const banner=target.closest<HTMLElement>('.sg-row-banner')||(
      target.closest('[data-sg-corner-content]')?banners.find(row=>row.closest('tbody')!.getBoundingClientRect().bottom>headerBottom):undefined);
    const row=banner&&rows[Number(banner.dataset.rowIndex)];if(!banner||!row)return;
    collapseScrollAnchor.current={key:rowKey(row),top:Math.max(headerBottom,banner.getBoundingClientRect().top),scroller};
  };
  useLayoutEffect(()=>{
    const changed=previousCollapseSignature.current!==collapseSignature;
    previousCollapseSignature.current=collapseSignature;
    const anchor=collapseScrollAnchor.current;collapseScrollAnchor.current=null;
    const root=wrapperRef.current;if(!root)return;
    if(!rowGroupKey){outlineTail.current=0;root.style.paddingBottom='';return;}
    if(!changed)return;
    if(!anchor){outlineTail.current=0;root.style.paddingBottom='';return;}
    const banner=ownGridElements<HTMLElement>(root,'.sg-row-banner').find(element=>{
      const row=rows[Number(element.dataset.rowIndex)];return row&&rowKey(row)===anchor.key;
    });
    if(!banner)return;
    const {scroller}=anchor;
    // Use the natural row position, not its sticky cell, so a pinned header
    // becomes the scroll anchor rather than disappearing above the viewport.
    const desired=Math.max(0,scroller.scrollTop+banner.getBoundingClientRect().top-anchor.top);
    const baseHeight=scroller.scrollHeight-outlineTail.current;
    outlineTail.current=Math.max(0,Math.ceil(desired+scroller.clientHeight-baseHeight));
    root.style.paddingBottom=outlineTail.current?`${outlineTail.current}px`:'';
    scroller.scrollTop=desired;
  },[collapseSignature,rowGroupKey,rows,rowKey]);
  useLayoutEffect(()=>{
    const root=wrapperRef.current;if(!root||!stickyRowBanners)return;
    let frame:number|null=null;
    const constrain=()=>{
      frame=null;
      let scroller:HTMLElement|null=root;
      while(scroller&&scroller!==document.body){const overflow=getComputedStyle(scroller).overflowY;if(overflow==='auto'||overflow==='scroll'||overflow==='overlay')break;scroller=scroller.parentElement;}
      const top=scroller&&scroller!==document.body?scroller.getBoundingClientRect().top+scroller.clientTop:0;
      const headers=ownGridElements<HTMLElement>(root,'thead th');
      const inset=Math.max(0,...headers.map(header=>(parseFloat(header.style.top)||0)+header.getBoundingClientRect().height));
      const banners=ownGridElements<HTMLElement>(root,'.sg-row-banner');
      const positions=banners.map(banner=>{
        const cells=Array.from(banner.children) as HTMLElement[];
        const bottom=banner.closest('tbody')!.getBoundingClientRect().bottom;
        return {cells,push:Math.min(0,bottom-top-inset-banner.getBoundingClientRect().height)};
      });
      positions.forEach(({cells,push})=>cells.forEach(cell=>{cell.style.transform=push<0?`translateY(${push}px)`:'';}));
    };
    const schedule=()=>{if(frame===null)frame=requestAnimationFrame(constrain);};
    const measure=()=>{
      const headers=ownGridElements<HTMLElement>(root,'thead th');
      const top=Math.max(0,...headers.map(header=>(parseFloat(header.style.top)||0)+header.getBoundingClientRect().height));
      setBannerTop(previous=>previous===top?previous:top);
      schedule();
    };
    measure();
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
    ownGridElements<HTMLElement>(root,'thead th').forEach(header=>observer?.observe(header));
    observer?.observe(root);
    ownGridElements<HTMLElement>(root,'tbody').forEach(body=>observer?.observe(body));
    window.addEventListener('resize',measure);
    window.addEventListener('scroll',schedule,true);
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',schedule,true);if(frame!==null)cancelAnimationFrame(frame);ownGridElements<HTMLElement>(root,'.sg-row-banner > td').forEach(cell=>{cell.style.transform='';});};
  },[stickyRowBanners,columns,showColumnHeaders,visibleRowKeys]);
  // Hosts may own scrolling instead of the grid wrapper (for example agen7).
  useLayoutEffect(() => {
    const updateFrozenScroll = () => {
      let element: HTMLElement | null = wrapperRef.current;
      let scrolled = false;
      while (element) {
        if (element.scrollLeft > 0) scrolled = true;
        element = element.parentElement;
      }
      setHorizontallyScrolled(scrolled);
    };
    updateFrozenScroll();
    window.addEventListener('scroll', updateFrozenScroll, true);
    return () => window.removeEventListener('scroll', updateFrozenScroll, true);
  }, []);
  const scrollFrameRef = useRef<number | null>(null);
  const readViewport = useCallback(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const next = { top: root.scrollTop, left: root.scrollLeft, width: root.clientWidth || 800, height: root.clientHeight || virtualHeight };
    setViewport((previous) => previous.top === next.top && previous.left === next.left
      && previous.width === next.width && previous.height === next.height ? previous : next);
  }, [virtualHeight]);
  useLayoutEffect(() => {
    if (!virtual) return;
    readViewport();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(readViewport) : null;
    if (wrapperRef.current) observer?.observe(wrapperRef.current);
    window.addEventListener('resize', readViewport);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', readViewport);
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    };
  }, [readViewport, virtual]);
  const handleViewportScroll = () => {
    if (!virtual || scrollFrameRef.current !== null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      readViewport();
    });
  };
  // Size the non-resizable gutter from numbers actually visible on screen,
  // excluding overscan, a pinned offscreen editor, and rows behind the header.
  // Hold the largest measurement at one scroll position: a wider gutter can
  // introduce a scrollbar and hide a digit-boundary row, causing resize oscillation.
  // Reserve two digits for tables with 10+ rows. Grow ten rows before a new
  // digit boundary, and shrink only twenty rows away to avoid scroll jitter.
  const measureGutterWidth = useCallback(() => {
    const root = wrapperRef.current;
    if (!root) return;
    if(headerLabelCharacters){
      const digitWidth=rowNumberMeasureRef.current?.getBoundingClientRect().width||7;
      const width=Math.max(30,Math.ceil(headerLabelCharacters*digitWidth)+17);
      setGutterWidth(previous=>previous===width?previous:width);return;
    }
    let top = 0;
    let bottom = window.innerHeight;
    const scrollPositions = [rows.length, window.scrollY];
    let ancestor: HTMLElement | null = root;
    while (ancestor && ancestor !== document.body) {
      scrollPositions.push(ancestor.scrollTop);
      const style = getComputedStyle(ancestor);
      if (/(auto|scroll|hidden|clip|overlay)/.test(style.overflowY)) {
        const rect = ancestor.getBoundingClientRect();
        top = Math.max(top, rect.top + ancestor.clientTop);
        bottom = Math.min(bottom, rect.top + ancestor.clientTop + ancestor.clientHeight);
      }
      ancestor = ancestor.parentElement;
    }
    const header = ownGridElements(root, 'thead th')[0];
    if (header) top = Math.max(top, header.getBoundingClientRect().bottom);
    if (bottom <= top) return;
    const mountedRows = ownGridElements<HTMLTableRowElement>(root, 'tbody tr[data-row-index]');
    // Rows are ordered, including the separately retained editor row. Find the
    // last candidate by geometry rather than inspecting every rendered cell.
    let low = 0;
    let high = mountedRows.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (mountedRows[middle].getBoundingClientRect().top < bottom) low = middle + 1;
      else high = middle;
    }
    const last = mountedRows[low - 1];
    if (!last || last.getBoundingClientRect().bottom <= top) return;
    const number = Number(last.dataset.rowIndex) + 1;
    const digitWidth = rowNumberMeasureRef.current?.getBoundingClientRect().width || 7;
    const maxNumber = Math.max(1, rows.length);
    const minDigits = maxNumber >= 10 ? 2 : 1;
    const upcomingDigits = Math.max(minDigits, String(Math.min(maxNumber, number + 10)).length);
    const lastMeasurement = gutterMeasurementRef.current;
    const previousDigits = lastMeasurement ? Math.min(String(maxNumber).length, Math.round((lastMeasurement.width - 17) / digitWidth)) : minDigits;
    const digits = previousDigits > upcomingDigits && number + 20 >= 10 ** (previousDigits - 1) ? previousDigits : upcomingDigits;
    const requiredWidth = Math.max(24, Math.ceil(digits * digitWidth) + 17);
    const scrollKey = scrollPositions.join(':');
    const width = lastMeasurement?.scrollKey === scrollKey ? Math.max(lastMeasurement.width, requiredWidth) : requiredWidth;
    gutterMeasurementRef.current = { scrollKey, width };
    setGutterWidth((previous) => previous === width ? previous : width);
  }, [rows.length,headerLabelCharacters]);
  useLayoutEffect(() => {
    measureGutterWidth();
  }, [columns, draft, editing, gutterWidth, measureGutterWidth, rows, viewport, widthOverrides]);
  useEffect(() => {
    let frame: number | null = null;
    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => { frame = null; measureGutterWidth(); });
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (wrapperRef.current) observer?.observe(wrapperRef.current);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [measureGutterWidth]);
  const columnOffsets = useMemo(() => {
    const offsets = [gutterWidth];
    for (const index of visibleCols) offsets.push(offsets[offsets.length - 1] + (widthOverrides[columns[index].id] ?? columns[index].width));
    return offsets;
  }, [columns, gutterWidth, visibleCols, widthOverrides]);
  // START_BLOCK_FROZEN_COLUMNS
  // Frozen pane (prop `frozenColumnIds`): the leading contiguous run of visible
  // columns stays put on horizontal scroll, Excel «freeze panes» style. Sticky
  // offsets carry the row-number gutter, the pane's left neighbour.
  const frozenCount = useMemo(() => frozenColumnCount(frozenColumnIds, visibleCols.map((index) => columns[index].id),
    (id) => [...summaryGroups.values()].find((group) => group.leafIds.includes(id))?.summaryId),
  [frozenColumnIds, visibleCols, columns, summaryGroups]);
  const frozenLefts = useMemo(() => Array.from({ length: frozenCount }, (_, position) => columnOffsets[position]), [columnOffsets, frozenCount]);
  // One overlay spans the visible sheet, including group rows. Measuring a sticky
  // edge cell also supports hosts that own scrolling, without per-row shadows.
  useLayoutEffect(() => {
    const root = wrapperRef.current;
    const shadow = frozenShadowRef.current;
    if (!root || !shadow || !frozenCount) return;
    const update = () => {
      const columnId = columns[visibleCols[frozenCount - 1]].id;
      const edge = ownGridElements(root, 'thead th[data-column-index], tbody td[data-sg-frozen-position]')
        .find((element) => element.style.position === 'sticky' &&
          (element.dataset.testid === `sg-colheader-${columnId}` ||
           element.dataset.testid?.endsWith(`-${columnId}`)));
      if (!edge) { shadow.style.display = 'none'; return; }
      const rect = root.getBoundingClientRect();
      let top = Math.max(0, rect.top);
      let bottom = Math.min(window.innerHeight, rect.bottom);
      let right = window.innerWidth;
      let left = 0;
      let ancestor: HTMLElement | null = root;
      while (ancestor) {
        const style = getComputedStyle(ancestor);
        const bounds = ancestor.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
          top = Math.max(top, bounds.top + ancestor.clientTop);
          bottom = Math.min(bottom, bounds.top + ancestor.clientTop + ancestor.clientHeight);
        }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
          left = Math.max(left, bounds.left + ancestor.clientLeft);
          right = Math.min(right, bounds.left + ancestor.clientLeft + ancestor.clientWidth);
        }
        ancestor = ancestor.parentElement;
      }
      const x = edge.getBoundingClientRect().right;
      const shadowHeight = Math.max(0, bottom - top);
      const shadowWidth = Math.max(0, Math.min(10, right - x));
      // Expanded details span the whole sheet, so the frozen-pane seam must
      // stop above them and resume below rather than crossing their contents.
      const holes = ownGridElements(root, 'tr[data-sg-row-details]').map(detail => {
        const rect = detail.getBoundingClientRect();
        const start = Math.max(0, rect.top - top), end = Math.min(shadowHeight, rect.bottom - top);
        return end > start ? `M0 ${start} H${shadowWidth} V${end} H0 Z` : '';
      }).filter(Boolean);
      Object.assign(shadow.style, {
        display: bottom > top && x >= left && x < right ? 'block' : 'none',
        left: `${x}px`, top: `${top}px`, height: `${Math.max(0, bottom - top)}px`,
        width: `${shadowWidth}px`,
        clipPath: holes.length ? `path(evenodd, 'M0 0 H${shadowWidth} V${shadowHeight} H0 Z ${holes.join(' ')}')` : '',
      });
    };
    update();
    updateResizeGeometry.current = update;
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    let ancestor: HTMLElement | null = root;
    while (ancestor) { observer?.observe(ancestor); ancestor = ancestor.parentElement; }
    return () => {
      if (updateResizeGeometry.current === update) updateResizeGeometry.current = null;
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [horizontallyScrolled, frozenCount, columns, visibleCols, columnOffsets, rows, renderRowDetails]);
  // END_BLOCK_FROZEN_COLUMNS
  const renderedColumns = useMemo(() => {
    if (!virtual) return visibleCols.map((index, position) => ({ index, width: columnOffsets[position + 1] - columnOffsets[position], key: columns[index].id }));
    const indexes = new Set<number>();
    if(viewRestore.restoring.current&&viewRestore.columnId){const index=visibleCols.findIndex(index=>columns[index].id===viewRestore.columnId);if(index>=0)indexes.add(index);}
    for (let index = 0; index < visibleCols.length; index += 1) {
      if (columnOffsets[index + 1] >= viewport.left - 240 && columnOffsets[index] <= viewport.left + viewport.width + 240) indexes.add(index);
    }
    if (editing && active) {
      const index = visibleCols.indexOf(navCols[active.navIndex]);
      if (index >= 0) indexes.add(index);
    }
    const entries: { index: number | null; width: number; key: string }[] = [];
    let previous = 0;
    for (const index of [...indexes].sort((a, b) => a - b)) {
      if (index > previous) entries.push({ index: null, width: columnOffsets[index] - columnOffsets[previous], key: `gap-${index}` });
      const physical = visibleCols[index];
      entries.push({ index: physical, width: columnOffsets[index + 1] - columnOffsets[index], key: columns[physical].id });
      previous = index + 1;
    }
    if (previous < visibleCols.length) entries.push({ index: null, width: columnOffsets[visibleCols.length] - columnOffsets[previous], key: 'gap-end' });
    return entries;
  }, [active, columnOffsets, columns, editing, navCols, viewport.left, viewport.width, virtual, visibleCols, viewState]);
  const headerRows = useMemo(() => {
    // `start`/`end` are the covered visible-column range: a group header or a
    // merged anchor crossing the frozen boundary must stay in the scroll flow.
    type HeaderEntry = { index: number | null; width: number; key: string; group?: ColumnGroup<T>; colSpan?: number; rowSpan?: number; start?: number; end?: number };
    const levels = Math.max(1, ...visibleCols.map((index) => (columnProjection.paths.get(columns[index].id)?.length ?? 0) + 1));
    const result: HeaderEntry[][] = Array.from({ length: levels }, () => []);
    for (let level = 0; level < levels; level += 1) {
      let position = 0;
      for (const entry of renderedColumns) {
        if (entry.index === null) { if (level === 0) result[level].push({ ...entry, start: position, end: position }); continue; }
        const visiblePosition = position;
        position += 1;
        const path = columnProjection.paths.get(columns[entry.index].id) ?? [];
        if (level > path.length) continue;
        if (level === path.length) result[level].push({ ...entry, rowSpan: levels - level, start: visiblePosition, end: visiblePosition + 1 });
        else {
          const group = path[level];
          const previous = result[level][result[level].length - 1];
          if (previous?.group === group) { previous.colSpan! += 1; previous.width += entry.width; previous.end = visiblePosition + 1; }
          else result[level].push({ index: null, width: entry.width, key: `group-${group.definition.id}`, group, colSpan: 1, start: visiblePosition, end: visiblePosition + 1 });
        }
      }
    }
    return result;
  }, [renderedColumns, visibleCols, columnProjection, columns]);
  const renderedRows = useMemo(() => {
    if (!virtual && !visibleRowIndices) return rows.map((_, index) => ({ index, height: 0, key: `row-${index}` }));
    const start = Math.max(0, rowAtOffset(viewport.top) - 4);
    const end = Math.min(rows.length, rowAtOffset(viewport.top + viewport.height) + 5);
    const indexes = new Set<number>();
    if(viewRestore.restoring.current&&viewRestore.rowIndex!==undefined&&viewRestore.rowIndex<rows.length)indexes.add(viewRestore.rowIndex);
    if (visibleRowIndices) visibleRowIndices.forEach(index => indexes.add(index));
    else for (let index = start; index < end; index += 1) indexes.add(index);
    if (editing && active && active.row < rows.length) indexes.add(active.row);
    const entries: { index: number | null; height: number; key: string }[] = [];
    let previous = 0;
    for (const index of [...indexes].sort((a, b) => a - b)) {
      if (index > previous) entries.push({ index: null, height: rowTop(index) - rowTop(previous), key: `gap-${index}` });
      entries.push({ index, height: rowTop(index + 1) - rowTop(index), key: `row-${index}` });
      previous = index + 1;
    }
    if (previous < rows.length) entries.push({ index: null, height: rowTop(rows.length) - rowTop(previous), key: 'gap-end' });
    return entries;
  }, [active, editing, fixedRowHeight, rowOffsets, rows, viewport.height, viewport.top, virtual, viewState, visibleRowIndices]);
  // END_BLOCK_VIRTUAL_VIEWPORT

  const focusGrid = useCallback(() => {
    // The sheet is already under the cursor or the keyboard focus: letting the
    // browser scroll ancestors to "reveal" the tall wrapper jumps the page and
    // drags other cells under a still pointer mid-drag.
    wrapperRef.current?.focus({ preventScroll: true });
  }, []);

  /** Excel-style reveal for selected cells: a cell hidden (or half hidden
   *  behind the sticky header) scrolls until its top edge clears the header. */
  const scrollCellIntoView = useCallback((rowIndex: number, navIndex: number) => {
    if (onRevealRow) {
      onRevealRow(rowIndex);
      return;
    }
    if (virtual && wrapperRef.current) {
      const root = wrapperRef.current;
      const visibleIndex = visibleCols.indexOf(navCols[navIndex]);
      if (visibleIndex < 0) return;
      const top = rowTop(rowIndex);
      const bottom = rowTop(rowIndex + 1);
      const height = (root.clientHeight || virtualHeight) - (showColumnHeaders ? 24 : 0);
      const width = root.clientWidth || viewport.width;
      if (top < root.scrollTop) root.scrollTop = top;
      else if (bottom > root.scrollTop + height) root.scrollTop = Math.max(0, bottom - height);
      const left = columnOffsets[visibleIndex];
      const right = columnOffsets[visibleIndex + 1];
      const gutter = freezeRowHeader ? gutterWidth : 0;
      // The frozen pane owns the left edge: reveal past it, not past the gutter.
      const leftBound = gutter + (frozenCount ? columnOffsets[frozenCount] - gutter : 0);
      if (left < root.scrollLeft + leftBound) root.scrollLeft = Math.max(0, left - leftBound);
      else if (right > root.scrollLeft + width) root.scrollLeft = Math.max(0, right - width);
      readViewport();
      return;
    }
    const column = columns[navCols[navIndex]];
    const cell = column && wrapperRef.current
      ? ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${rowIndex}-${column.id}"]`)[0]
      : null;
    if (!(cell instanceof HTMLElement)) return;
    cell.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    // Frozen columns: scrollIntoView only clears the scrollport edge — it cannot
    // know the sticky pane overlays the left side. Reveal past the pane.
    if (frozenCount > 0) {
      let ancestor: HTMLElement | null = cell.parentElement;
      while (ancestor && ancestor !== document.body) {
        const overflowX = getComputedStyle(ancestor).overflowX;
        if ((overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') && ancestor.scrollWidth > ancestor.clientWidth + 1) {
          const edge = ancestor.getBoundingClientRect().left + ancestor.clientLeft + columnOffsets[frozenCount];
          const overlap = edge - cell.getBoundingClientRect().left;
          if (overlap > 0) ancestor.scrollLeft = Math.max(0, ancestor.scrollLeft - overlap);
          break;
        }
        ancestor = ancestor.parentElement;
      }
    }
    // scrollIntoView stops at the clip edge: it cannot know the sticky header
    // overlays the top of the viewport. The th elements are sticky, not thead:
    // measure their painted position, then reduce scrollTop to move the cell down.
    const headers = ownGridElements(wrapperRef.current, 'thead th');
    if (!headers?.length) return;
    const headerRects = Array.from(headers, (header) => header.getBoundingClientRect()).filter((rect) => rect.height > 0);
    if (!headerRects.length) return;
    const pinned=ownGridElements<HTMLElement>(wrapperRef.current,'.sg-row-banner > td').map(element=>element.getBoundingClientRect()).filter(rect=>rect.top<=Math.max(...headerRects.map(rect=>rect.bottom))+1);
    const headerBottom = Math.max(...headerRects.map((rect) => rect.bottom),...pinned.map(rect=>rect.bottom));
    const overlap = headerBottom - cell.getBoundingClientRect().top;
    if (overlap <= 0) return;
    let ancestor: HTMLElement | null = cell.parentElement;
    while (ancestor && ancestor !== document.body) {
      const overflowY = getComputedStyle(ancestor).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && ancestor.scrollHeight > ancestor.clientHeight + 1) {
        ancestor.scrollTop = Math.max(0, ancestor.scrollTop - overlap);
        return;
      }
      ancestor = ancestor.parentElement;
    }
    window.scrollBy(0, -overlap);
  }, [columnOffsets, columns, fixedRowHeight, rowOffsets, freezeRowHeader, frozenCount, gutterWidth, navCols, readViewport, viewport.width, virtual, virtualHeight, visibleCols, showColumnHeaders, onRevealRow]);

  // START_BLOCK_CELL_COMMENT_REVEAL
  // Host navigation (a comment card, a search result) asks the grid to bring a
  // concrete cell into view. The token repeats the reveal for the same address.
  const revealSignature = revealCell
    ? `${revealCell.rowKey}\u0000${revealCell.columnId}\u0000${revealCell.token ?? 0}`
    : '';
  useEffect(() => {
    if (!revealCell) return;
    const rowIndex = rows.findIndex((row) => rowKey(row) === revealCell.rowKey);
    if (rowIndex < 0) return;
    const navIndex = navCols.findIndex((columnIndex) => columns[columnIndex]?.id === revealCell.columnId);
    if (navIndex < 0) return;
    const target = { row: rowIndex, navIndex };
    setActive(target);
    setFocus(target);
    setGutterSelection(null);
    setColumnSelection(null);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const highlight = () => {
      scrollCellIntoView(rowIndex, navIndex);
      const node = ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${rowIndex}-${revealCell.columnId}"]`)[0];
      if (!(node instanceof HTMLElement)) return false;
      node.setAttribute('data-comment-reveal', '');
      timers.push(setTimeout(() => node.removeAttribute('data-comment-reveal'), 1800));
      return true;
    };
    // Virtual sheets render the row only after the scroll state settles.
    timers.push(setTimeout(() => { if (!highlight()) timers.push(setTimeout(highlight, 60)); }, 0));
    focusGrid();
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [revealSignature]);
  // END_BLOCK_CELL_COMMENT_REVEAL

  useEffect(() => {
    if (!dragging) return;
    pointerMovedRef.current = false; // a drag starts at the pointer: no move yet
    const stop = () => setDragging(false);
    const onMove = () => { pointerMovedRef.current = true; };
    const onScroll = () => { pointerMovedRef.current = false; };
    const onLeave = () => stop(); // button released (or lost) outside the window: don't leave the drag stuck
    window.addEventListener('mouseup', stop);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onScroll, true); // capture: the page, the host's scroll areas, any ancestor
    document.documentElement.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll, true);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, [dragging]);

  const selection = useMemo(() => {
    if (!active || !focus) return null;
    if (singleCellSelection) return { min: active, max: active };
    return {
      min: { row: Math.min(active.row, focus.row), navIndex: Math.min(active.navIndex, focus.navIndex) },
      max: { row: Math.max(active.row, focus.row), navIndex: Math.max(active.navIndex, focus.navIndex) },
    };
  }, [active, focus, singleCellSelection]);

  const inSelection = useCallback((rowIndex: number, navIndex: number) => (
    navIndex >= 0 && selection !== null
    && rowIndex >= selection.min.row && rowIndex <= selection.max.row
    && navIndex >= selection.min.navIndex && navIndex <= selection.max.navIndex
  ), [selection]);

  // Mini-formulas: «=A1&"Б"» is stored verbatim and evaluated lazily for
  // display. The memo lives per render; the stack breaks reference cycles.
  const evaluator = useCallback((row: number, col: number) => col >= physicalColumns.length
    ? columns[col]?.getValue?.(rows[row]) ?? '' : sourceEvaluator(rowIndexes[row], col), [sourceEvaluator, rowIndexes, physicalColumns.length, columns, rows]);

  const cellEditable = useCallback((columnIndex: number, rowIndex: number) => {
    const column = columns[columnIndex];
    if (!column || readOnly || column.readOnly || column.chipsOnly || !column.setValue) return false;
    if (summaryGroups.has(column.id)) return false; // a summary is aggregated: writable via fill/paste, never inline-edited
    if (bannerKeys.has(rowKey(rows[rowIndex]))) return false; // banner rows render no editable cells
    return !cellLocked(rows[rowIndex], sourceIndex(rowIndex), column);
  }, [bannerKeys, rowKey, columns, readOnly, rows, summaryGroups]);

  /** Write one value into a cell. `preview` is a custom editor's live apply:
   *  it mutates data without a history entry — the whole edit records one undo
   *  unit at commit, against the pre-edit snapshot. */
  const applyValue = useCallback((target: CellIndex, value: string, preview = false) => {
    const column = columns[navCols[target.navIndex]];
    const row = rows[target.row];
    if (!column?.setValue || column.chipsOnly || !row) return;
    if (bannerKeys.has(rowKey(row))) return; // banner rows never accept cell writes
    const normalized = normalizeGridValue(column, value);
    if ((column.getValue?.(row) ?? '') === normalized) {
      if (!preview && editAppliedRef.current) {
        // The value is already in place from a live-applied draft; the commit
        // still records the edit as one undo unit against the pre-edit rows.
        pushUndoSnapshot('rows');
        editAppliedRef.current = false;
        editBaselineRef.current = null;
      }
      return;
    }
    if (preview) editAppliedRef.current = true;
    else emitRows(rows.map((item, index) => (index === target.row ? column.setValue!(item, normalized, 'editor') : item)), false, column.id);
  }, [bannerKeys, rowKey, columns, emitRows, navCols, rows]);

  /** Flip a checkbox cell (kind: 'checkbox') without opening any editor. */
  const toggleCheckbox = useCallback((rowIndex: number, navIndex: number) => {
    const column = columns[navCols[navIndex]];
    const row = rows[rowIndex];
    if (!column?.setValue || column.readOnly || readOnly) return;
    if (cellLocked(row, sourceIndex(rowIndex), column)) return;
    const checked = isGridCheckboxChecked(column.getValue?.(row) ?? '');
    applyValue({ row: rowIndex, navIndex }, checked ? 'FALSE' : 'TRUE');
  }, [applyValue, columns, navCols, readOnly, rows]);

  /** Write one value into every editable cell of the selection (Ctrl+Enter / fill). */
  const fillSelection = useCallback((value: string): boolean => {
    if (!selection) return false;
    const targets: Array<{ row: number; columnIndex: number; normalized: string }> = [];
    for (let rowIndex = selection.min.row; rowIndex <= selection.max.row; rowIndex += 1) {
      if (bannerKeys.has(rowKey(rows[rowIndex]))) continue; // banner rows carry no fillable cells
      for (let navIndex = selection.min.navIndex; navIndex <= selection.max.navIndex; navIndex += 1) {
        const columnIndex = navCols[navIndex];
        const column = columns[columnIndex];
        if (!column?.setValue || column.readOnly || column.chipsOnly || readOnly) continue;
        if (merges.covered.has(`${rowIndex}:${columnIndex}`)) continue;
        if (cellLocked(rows[rowIndex], sourceIndex(rowIndex), column)) continue;
        const normalized = normalizeGridValue(column, value);
        const error = validateGridValue(column.validation, normalized);
        if (error) { setEditError(`${column.title || 'Ячейка'}: ${error}`); return false; }
        targets.push({ row: rowIndex, columnIndex, normalized });
      }
    }
    if (!targets.length) return false;
    const next = rows.slice();
    for (const target of targets) next[target.row] = columns[target.columnIndex].setValue!(next[target.row], target.normalized);
    emitRows(next);
    return true;
  }, [bannerKeys, rowKey, columns, emitRows, merges, navCols, readOnly, rows, selection]);

  const commitEdit = useCallback((override?: string, fill = false): boolean => {
    if (!editing || !active) return false;
    const column = columns[navCols[active.navIndex]];
    const raw = override ?? draftRef.current;
    const normalized = normalizeGridValue(column, raw);
    const error = validateGridValue(column.validation, normalized);
    if (error) { setEditError(error); return false; } // Excel "Stop": keep the editor open
    if (fill) {
      if (!fillSelection(normalized)) return false;
    } else {
      applyValue(active, normalized);
    }
    editBaselineRef.current = null;
    editAppliedRef.current = false;
    setEditing(false);
    setEditError(null);
    editSnapshotRef.current = null;
    return true;
  }, [active, applyValue, columns, editing, fillSelection, navCols]);

  /** Abandon the edit: roll a live-applied draft back to the row snapshot, drop the error. */
  const cancelEdit = useCallback(() => {
    const snapshot = editSnapshotRef.current;
    if (editAppliedRef.current && snapshot && rows[snapshot.row] !== snapshot.value) {
      // A rollback, not a user operation: it never enters the undo history.
      emit(rows.map((row, index) => (index === snapshot.row ? snapshot.value : row)));
    }
    editSnapshotRef.current = null;
    editBaselineRef.current = null;
    editAppliedRef.current = false;
    setEditing(false);
    setEditError(null);
  }, [emit, rows]);

  const previousRowSelectionMode = useRef(rowSelectionMode);
  useEffect(() => {
    const entering = rowSelectionMode && !previousRowSelectionMode.current;
    previousRowSelectionMode.current = rowSelectionMode;
    if (!entering) return;
    if (editing && !commitEdit()) cancelEdit();
    setDragging(false);
    fillDragRef.current = null;
    fillTargetRef.current = null;
    setFillTarget(null);
    reorderRef.current = null;
    setReorder(null);
  }, [rowSelectionMode, editing, commitEdit, cancelEdit]);

  const startEditingCell = useCallback((rowIndex: number, navIndex: number, seed: string, replace = false) => {
    const column = columns[navCols[navIndex]];
    if (!column || column.kind === 'checkbox') return false; // a checkbox cell has no text editor
    if (!cellEditable(navCols[navIndex], rowIndex)) return false;
    scrollCellIntoView(rowIndex, navIndex);
    const numeric = column.kind === 'number' || column.validation?.type === 'number';
    editSnapshotRef.current = { row: rowIndex, value: rows[rowIndex] };
    editBaselineRef.current = sourceRows;
    editAppliedRef.current = false;
    caretRequestRef.current = null; // caret at the end of the text
    setSearchStarted(replace);
    setDraft(replace ? (numeric ? canonicalGridDecimal(seed) : seed) : formatEditingValue(column, seed));
    setEditError(null);
    setEditing(true);
    return true;
  }, [cellEditable, columns, navCols, rows, scrollCellIntoView, sourceRows]);

  const startEditing = useCallback((seed: string, replace = false) => {
    if (!active) return;
    startEditingCell(active.row, active.navIndex, seed, replace);
  }, [active, startEditingCell]);

  // A host can seed an editor on mount (summary typing opens the row panel and
  // puts the typed character into its first editable field).
  const initialEditRef = useRef(initialEdit);
  useEffect(() => {
    const request = initialEditRef.current;
    if (!request) return;
    initialEditRef.current = null;
    if (!rows.length || !navCols.length) return;
    const targetRow=Math.max(0,Math.min(rows.length-1,request.rowIndex??0));
    const columnIndex = request.columnId
      ? columns.findIndex((column) => column.id === request.columnId)
      : navCols.find((index) => cellEditable(index, targetRow));
    const navIndex = navCols.indexOf(columnIndex ?? -1);
    if (columnIndex === undefined || columnIndex < 0 || navIndex < 0) return;
    setActive({ row: targetRow, navIndex });
    setFocus({ row: targetRow, navIndex });
    startEditingCell(targetRow, navIndex, request.value, true);
  }, []);

  // Enter on a collapsed summary opens the row panel with its first editable
  // cell selected, not edited — the caret is ready, the editor opens on typing.
  const initialFocusRef = useRef(initialFocus);
  useEffect(() => {
    const request = initialFocusRef.current;
    initialFocusRef.current = null;
    if (!request || initialEdit || viewState?.selection || !rows.length || !navCols.length) return;
    const targetRow=Math.max(0,Math.min(rows.length-1,request.rowIndex??0));
    const columnIndex = request.columnId
      ? columns.findIndex((column) => column.id === request.columnId)
      : navCols.find((index) => cellEditable(index, targetRow));
    const navIndex = navCols.indexOf(columnIndex ?? -1);
    if (columnIndex === undefined || columnIndex < 0 || navIndex < 0) return;
    setActive({ row: targetRow, navIndex });
    setFocus({ row: targetRow, navIndex });
    focusGrid();
  }, []);

  const toggleGroup = (group: ColumnGroup<T>) => {
    if (editing && !commitEdit()) return;
    const next = new Set(collapsedGroups);
    if (next.has(group.definition.id)) next.delete(group.definition.id);
    else next.add(group.definition.id);
    const ids = [...next];
    if (collapsedGroupIds === undefined) setInternalCollapsedGroups(ids);
    onCollapsedGroupIdsChange?.(ids);
    focusGrid();
  };
  const groupToggle = (group: ColumnGroup<T>, side: 'left' | 'right' = 'right') => (
    <button type="button" className={`sg-group-toggle${side === 'left' ? ' sg-group-toggle-left' : ''}`}
      aria-label={`${collapsedGroups.has(group.definition.id) ? 'Развернуть' : 'Свернуть'} группу ${group.definition.title}`}
      aria-expanded={!collapsedGroups.has(group.definition.id)} data-testid={`sg-group-toggle-${group.definition.id}${side === 'left' ? '-left' : ''}`}
      onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); toggleGroup(group); }}>
      <span aria-hidden="true">{collapsedGroups.has(group.definition.id) ? '+' : '−'}</span>
    </button>
  );
  const previousVisibilityRef = useRef({ hidden: hiddenColumns, navIds: navCols.map((index) => columns[index].id), summaryGroups, finish: () => {} });
  useLayoutEffect(() => {
    const previous = previousVisibilityRef.current;
    const navIds = navCols.map((index) => columns[index].id);
    previousVisibilityRef.current = { hidden: hiddenColumns, navIds, summaryGroups, finish: () => { if (editing && !commitEdit()) cancelEdit(); } };
    if (previous.hidden.size === hiddenColumns.size && [...previous.hidden].every((id) => hiddenColumns.has(id))) return;
    const remap = (cell: CellIndex | null): CellIndex | null => {
      if (!cell || !navIds.length) return null;
      const oldId = previous.navIds[cell.navIndex];
      let index = navIds.indexOf(oldId);
      if (index < 0) {
        const oldSummary = previous.summaryGroups.get(oldId);
        index = navIds.findIndex((id) => {
          const summary = summaryGroups.get(id);
          return summary?.leafIds.includes(oldId) || (oldSummary && (oldSummary.leafIds.includes(id)
            || summary?.leafIds.some((leaf) => oldSummary.leafIds.includes(leaf))));
        });
      }
      return { ...cell, navIndex: index >= 0 ? index : Math.min(cell.navIndex, navIds.length - 1) };
    };
    // A toggle can already have committed the editor before changing visibility.
    // Do not replay its stale closure and add a duplicate undo entry.
    if (editing) previous.finish();
    setActive(remap);
    setFocus(remap);
    setDragging(false);
    fillDragRef.current = null;
    setFillTarget(null);
    reorderRef.current = null;
    setReorder(null);
  }, [cancelEdit, commitEdit, editing, columns, hiddenColumns, navCols, summaryGroups]);

  const previousProjectionRef = useRef({ keys: visibleRowKeys, filters, sort: appliedSort, finish: () => {} });
  useLayoutEffect(() => {
    const previous = previousProjectionRef.current;
    previousProjectionRef.current = { keys: visibleRowKeys, filters, sort: appliedSort, finish: () => { if (editing && !commitEdit()) cancelEdit(); } };
    if (skipProjectionRemapRef.current) { skipProjectionRemapRef.current = false; return; }
    const changed = previous.keys.length !== visibleRowKeys.length || previous.keys.some((key, index) => key !== visibleRowKeys[index]);
    const settingsChanged = previous.filters !== filters || previous.sort !== appliedSort;
    // Local reorders remap their own selection; external inserts/deletes must follow row keys too.
    if (!projected && !settingsChanged && previous.keys.length === visibleRowKeys.length) return;
    if (!changed && !settingsChanged) return;
    if (settingsChanged) previous.finish();
    const remap = (cell: CellIndex | null) => {
      if (!cell || !visibleRowKeys.length || !navCols.length) return null;
      const index = visibleRowKeys.indexOf(previous.keys[cell.row]);
      return { ...cell, row: index >= 0 ? index : Math.min(cell.row, visibleRowKeys.length - 1) };
    };
    setActive(remap);
    setFocus(remap);
    setDragging(false);
    fillDragRef.current = null;
    fillTargetRef.current = null;
    setFillTarget(null);
    reorderRef.current = null;
    setReorder(null);
    if (changed) { setEditing(false); editSnapshotRef.current = null; }
  }, [visibleRowKeys, filters, appliedSort, projected, editing, commitEdit, cancelEdit, navCols.length]);

  // START_BLOCK_SHARED_SELECTION
  useEffect(() => {
    if (!selectionScope) return;
    const activatePeer = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-sg]') : null;
      if (!target || target === wrapperRef.current || target.getAttribute('data-sg-selection-scope') !== selectionScope) return;
      if (editing && !commitEdit()) cancelEdit();
      setActive(null); setFocus(null); setGutterSelection(null); setColumnSelection(null);
      setCopiedRange(null); setDragging(false); setEditing(false); setEditError(null);
    };
    document.addEventListener('mousedown', activatePeer, true);
    document.addEventListener('focusin', activatePeer, true);
    return () => { document.removeEventListener('mousedown', activatePeer, true); document.removeEventListener('focusin', activatePeer, true); };
  }, [selectionScope, editing, commitEdit, cancelEdit]);
  // END_BLOCK_SHARED_SELECTION

  // START_BLOCK_ROW_ACTIONS
  const closeRowMenu = useCallback(() => {
    setRowMenu(null);
    focusGrid();
  }, [focusGrid]);
  const openRowMenu = (rowIndex: number, x: number, y: number) => {
    if (!rows[rowIndex] || (editing && !commitEdit())) return;
    setMenu(null);
    setCellMenu(null);
    setDragging(false);
    fillDragRef.current = null;
    fillTargetRef.current = null;
    setFillTarget(null);
    reorderRef.current = null;
    setReorder(null);
    setRowMenu({ key: rowKey(rows[rowIndex]), x, y });
  };
  useLayoutEffect(() => {
    if (!rowMenu || !rowMenuRef.current) return;
    const panel = rowMenuRef.current;
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(rowMenu.x, window.innerWidth - rect.width - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(rowMenu.y, window.innerHeight - rect.height - 8))}px`;
    panel.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [rowMenu]);
  useEffect(() => {
    if (!rowMenu) return;
    const outside = (event: MouseEvent) => {
      if (!rowMenuRef.current?.contains(event.target as Node)) setRowMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRowMenu(); }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [rowMenu, closeRowMenu]);
  useEffect(() => {
    if (rowMenu && !presentRowKeys.includes(rowMenu.key)) closeRowMenu();
  }, [rowMenu, presentRowKeys, closeRowMenu]);
  useLayoutEffect(() => {
    const key = pendingInsertedKey.current;
    if (key === null || !presentRowKeys.includes(key)) return;
    pendingInsertedKey.current = null;
    const index = visibleRowKeys.indexOf(key);
    if (index < 0 || !navCols.length) return;
    const cell = { row: index, navIndex: 0 };
    setActive(cell);
    setFocus(cell);
    scrollCellIntoView(index, 0);
  }, [presentRowKeys, visibleRowKeys, navCols.length, scrollCellIntoView]);
  const insertRow = (below: boolean) => {
    if (!rowMenu || readOnly || (editing && !commitEdit())) return;
    const current = rowsRef.current;
    const index = current.findIndex((row) => rowKey(row) === rowMenu.key);
    if (index < 0) { closeRowMenu(); return; }
    const row = createRow();
    const next = current.slice();
    next.splice(index + (below ? 1 : 0), 0, row);
    pendingInsertedKey.current = rowKey(row);
    emitRows(next, true);
    closeRowMenu();
  };
  const resetRowHeight = (key: string) => {
    const next = { ...heightOverridesRef.current };
    delete next[key];
    commitRowHeights(next);
  };
  const selectedHeightKeys = (rowIndex: number) => {
    const isGutterRange = gutterSelection?.active === active && gutterSelection?.focus === focus
      && selection !== null && selection.min.navIndex === 0 && selection.max.navIndex === navCols.length - 1
      && rowIndex >= selection.min.row && rowIndex <= selection.max.row;
    return new Set((isGutterRange ? rows.slice(selection.min.row, selection.max.row + 1) : [rows[rowIndex]]).map(rowKey));
  };
  const resetSelectedRowHeights = (rowIndex: number) => {
    const next = { ...heightOverridesRef.current };
    selectedHeightKeys(rowIndex).forEach((key) => { delete next[key]; });
    commitRowHeights(next);
  };
  const beginRowResize = (event: ReactMouseEvent<HTMLDivElement>, rowIndex: number) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (editing && !commitEdit()) return;
    resizeCleanup.current?.();
    headerGrabCleanup.current?.();
    setRowMenu(null);
    setDragging(false);
    fillDragRef.current = null;
    setFillTarget(null);
    reorderRef.current = null;
    setReorder(null);
    const key = rowKey(rows[rowIndex]);
    const keys = selectedHeightKeys(rowIndex);
    const measured = event.currentTarget.closest('tr')?.getBoundingClientRect().height ?? 0;
    const startHeight = measured || getRowHeight(key);
    const startY = event.clientY;
    let height = startHeight;
    let moved = false;
    const root = wrapperRef.current;
    const nativePreview = !!root && !root.hasAttribute('data-sg-virtual');
    const previewRows = nativePreview ? ownGridElements(root, 'tbody tr[data-row-index]')
      .filter(element => keys.has(rowKey(rows[Number(element.dataset.rowIndex)])))
      .map(element => ({element, height:element.style.height})) : [];
    let frame: number | null = null;
    // Mark the gesture once; subsequent native previews do not render cells.
    setHeightPreview({keys, height:startHeight});
    const cursor = document.body.style.cursor;
    document.body.style.cursor = 'row-resize';
    const cleanup = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previewRows.forEach(({element, height}) => { element.style.height=height; });
      document.body.style.cursor = cursor;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('keydown', cancel);
      window.removeEventListener('blur', blur);
      resizeCleanup.current = null;
    };
    const finish = (apply: boolean) => {
      cleanup();
      setHeightPreview(null);
      if (apply && moved) {
        const presentKeys = new Set(rowsRef.current.map(rowKey));
        const next = { ...heightOverridesRef.current };
        let changed = false;
        keys.forEach((key) => { if (presentKeys.has(key)) { next[key] = height; changed = true; } });
        if (changed) commitRowHeights(next);
      }
    };
    const move = (moveEvent: MouseEvent) => {
      height = Math.max(22, Math.round(startHeight + moveEvent.clientY - startY));
      moved = height !== startHeight;
      if (frame === null) frame = requestAnimationFrame(() => {
        frame = null;
        if (nativePreview) {
          previewRows.forEach(({element}) => { element.style.height=`${height}px`; });
          updateResizeGeometry.current?.();
        } else setHeightPreview({keys, height});
      });
    };
    const up = () => finish(true);
    const blur = () => finish(false);
    const cancel = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); keyEvent.stopPropagation(); finish(false); }
    };
    resizeCleanup.current = cleanup;
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('keydown', cancel);
    window.addEventListener('blur', blur);
  };
  // END_BLOCK_ROW_ACTIONS

  const openMenu = (columnId: string | null, button: HTMLElement) => {
    setCellMenu(null);
    setRowMenu(null);
    if (editing && !commitEdit()) cancelEdit();
    setDragging(false);
    fillDragRef.current = null;
    fillTargetRef.current = null;
    setFillTarget(null);
    reorderRef.current = null;
    setReorder(null);
    setMenu((previous) => previous?.columnId === columnId ? null : { columnId, button });
  };
  const menuColumn = menu?.columnId ? columns.find((column) => column.id === menu.columnId) : undefined;
  const menuOptions = useMemo(() => {
    if (!menuColumn?.getValue) return [];
    const col = columns.indexOf(menuColumn);
    const values = new Set(projectGridRows(sourceRows, columns, filters, null, sourceEvaluator, menuColumn.id,outline).filter(index=>!outline?.isBanner(sourceRows[index])).map((row) => sourceEvaluator(row, col)));
    return [...values].map((value) => ({ value, label: value === '' ? '(Пустые)' : formatGridValue(menuColumn.format, value) }));
  }, [menuColumn, sourceRows, columns, filters, sourceEvaluator,outline]);

  const applyMove = useCallback((row: number, navIndex: number, extend = false) => {
    let to = { row, navIndex };
    // Leaving a merged cell: a step that stays inside its own rectangle jumps
    // past the far edge in the movement direction (Excel exits a 3-column
    // merge with a single ArrowRight). A target covered by somebody's merge
    // lands on its anchor.
    if (!extend && active) {
      const activeCol = navCols[active.navIndex];
      const own = activeCol === undefined ? null
        : merges.covered.get(`${active.row}:${activeCol}`) ?? (merges.anchors.has(`${active.row}:${activeCol}`) ? { col: activeCol, row: active.row } : null);
      const span = own ? merges.anchors.get(`${own.row}:${own.col}`) : undefined;
      if (own && span) {
        const minNav = navIndexOf(own.col);
        let maxNav = minNav;
        for (let c = own.col + 1; c < own.col + span.colSpan; c += 1) {
          const nav = navIndexOf(c);
          if (nav > maxNav) maxNav = nav;
        }
        const maxRow = own.row + span.rowSpan - 1;
        if (to.row >= own.row && to.row <= maxRow && to.navIndex >= minNav && to.navIndex <= maxNav) {
          if (to.row > active.row) to = { navIndex: to.navIndex, row: maxRow + 1 };
          else if (to.row < active.row) to = { navIndex: to.navIndex, row: own.row - 1 };
          else if (to.navIndex > active.navIndex) to = { navIndex: maxNav + 1, row: to.row };
          else if (to.navIndex < active.navIndex) to = { navIndex: minNav - 1, row: to.row };
        }
      }
    }
    if (!extend && active && (to.row < 0 || to.row >= rows.length) && onNavigateOut?.(to.row < 0 ? 'up' : 'down')) return;
    const target = {
      row: Math.max(0, Math.min(rows.length - 1, to.row)),
      navIndex: Math.max(0, Math.min(navCols.length - 1, to.navIndex)),
    };
    const nextCol = navCols[target.navIndex];
    const covered = nextCol === undefined ? undefined : merges.covered.get(`${target.row}:${nextCol}`);
    if (covered) {
      const nav = navIndexOf(covered.col);
      if (nav >= 0) {
        target.row = covered.row;
        target.navIndex = nav;
      }
    }
    // Banner rows own no cell: a move lands on the nearest real row past them.
    if (bannerKeys.size) {
      const direction = Math.sign(to.row - (active?.row ?? to.row)) || 1;
      for (let guard = rows.length; guard > 0 && bannerKeys.has(rowKey(rows[target.row])); guard -= 1) {
        const step = target.row + direction;
        target.row = step >= 0 && step < rows.length ? step : target.row - direction;
      }
    }
    if (extend && !singleCellSelection) {
      setFocus(target);
    } else {
      setActive(target);
      setFocus(target);
    }
    scrollCellIntoView(target.row, target.navIndex);
    focusGrid();
  }, [active, bannerKeys, rowKey, focusGrid, navCols, navIndexOf, merges, rows, scrollCellIntoView, onNavigateOut, singleCellSelection]);

  /** Move right/left from the active cell, optionally wrapping to the next row (Tab). */
  const moveHorizontal = useCallback((delta: number, wrap: boolean) => {
    if (!active) return;
    let row = active.row;
    let navIndex = active.navIndex + delta;
    if (navIndex < 0) {
      if (wrap) { navIndex = navCols.length - 1; row -= 1; } else { navIndex = 0; }
    } else if (navIndex >= navCols.length) {
      if (wrap) { navIndex = 0; row += 1; } else { navIndex = navCols.length - 1; }
    }
    applyMove(row, navIndex);
  }, [active, applyMove, navCols.length]);

  /** Move the active cell without touching its value (custom editors control Enter/Tab). */
  const moveActive = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!active) return;
    if (direction === 'down') applyMove(active.row + 1, active.navIndex);
    else if (direction === 'up') applyMove(active.row - 1, active.navIndex);
    else if (direction === 'right') moveHorizontal(1, true);
    else moveHorizontal(-1, true);
  }, [active, applyMove, moveHorizontal]);

  const selectAll = useCallback(() => {
    setActive({ row: 0, navIndex: 0 });
    setFocus({ row: rows.length - 1, navIndex: navCols.length - 1 });
    focusGrid();
  }, [focusGrid, navCols.length, rows.length]);

  /** Clear every editable cell of the selection (Delete / cut). */
  const clearSelection = useCallback(() => {
    if (!selection || readOnly) return;
    const next = rows.slice();
    let changed = false;
    for (let rowIndex = selection.min.row; rowIndex <= selection.max.row; rowIndex += 1) {
      if (bannerKeys.has(rowKey(rows[rowIndex]))) continue; // banner rows carry no clearable cells
      for (let navIndex = selection.min.navIndex; navIndex <= selection.max.navIndex; navIndex += 1) {
        const columnIndex = navCols[navIndex];
        const column = columns[columnIndex];
        if (!column?.setValue || column.readOnly || column.chipsOnly) continue;
        if (merges.covered.has(`${rowIndex}:${columnIndex}`)) continue;
        if (cellLocked(next[rowIndex], sourceIndex(rowIndex), column)) continue;
        next[rowIndex] = column.setValue(next[rowIndex], '');
        changed = true;
      }
    }
    if (changed) emitRows(next);
  }, [bannerKeys, rowKey, columns, emitRows, merges, navCols, readOnly, rows, selection]);

  const selectionMatrix = useCallback((): string[][] => {
    if (!selection) return [];
    const matrix: string[][] = [];
    for (let rowIndex = selection.min.row; rowIndex <= selection.max.row; rowIndex += 1) {
      if (bannerKeys.has(rowKey(rows[rowIndex]))) continue; // banner rows contribute no copied line
      const line: string[] = [];
      for (let navIndex = selection.min.navIndex; navIndex <= selection.max.navIndex; navIndex += 1) {
        line.push(evaluator(rowIndex, navCols[navIndex]));
      }
      matrix.push(line);
    }
    return matrix;
  }, [bannerKeys, rowKey, evaluator, navCols, rows, selection]);

  const handleCopy = useCallback((event: ReactClipboardEvent<HTMLDivElement>) => {
    if (editing || !selection || readOnly) return; // while editing the input owns the clipboard
    const matrix = selectionMatrix();
    if (!matrix.length) return;
    copiedRowsRef.current = {
      rows: Array.from({ length: selection.max.row - selection.min.row + 1 }, (_, offset) => rows[selection.min.row + offset])
        .filter((row) => row && !bannerKeys.has(rowKey(row))),
      columnIds: Array.from({ length: selection.max.navIndex - selection.min.navIndex + 1 }, (_, offset) => columns[navCols[selection.min.navIndex + offset]]?.id).filter((id): id is string => !!id),
    };
    const text = matrix.map((line) => line.join('\t')).join('\n');
    const html = `<table>${matrix.map((line) => `<tr>${line.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</table>`;
    event.clipboardData?.setData('text/plain', text);
    event.clipboardData?.setData('text/html', html);
    event.preventDefault();
    setCopiedRange({ min: { ...selection.min }, max: { ...selection.max } });
  }, [bannerKeys, rowKey, columns, editing, navCols, readOnly, rows, selection, selectionMatrix]);

  const handleCut = useCallback((event: ReactClipboardEvent<HTMLDivElement>) => {
    if (editing || !selection || readOnly) return;
    handleCopy(event);
    setCopiedRange(null);
    clearSelection();
  }, [clearSelection, editing, handleCopy, readOnly, selection]);

  const handlePaste = useCallback((event: ReactClipboardEvent<HTMLDivElement>) => {
    if (editing || readOnly || !active || !rows.length || !navCols.length || !event.clipboardData) return;
    setCopiedRange(null);
    const text = event.clipboardData.getData('text/plain');
    if (!text) return;
    event.preventDefault();
    const matrix = parseClipboardMatrix(text);
    const origin = selection ? selection.min : active;
    const spanRows = selection ? selection.max.row - selection.min.row + 1 : 1;
    const spanCols = selection ? selection.max.navIndex - selection.min.navIndex + 1 : 1;
    const clipRows = matrix.length;
    const clipCols = matrix[0]?.length ?? 0;
    // A larger target selection is tiled with the clipboard block (Excel habit);
    // a clipboard larger than the selection still expands past it.
    const tileRows = spanRows > clipRows;
    const tileCols = spanCols > clipCols;
    const blockRows = tileRows ? spanRows : Math.max(spanRows, clipRows);
    const blockCols = tileCols ? spanCols : Math.max(spanCols, clipCols);
    if (!allowRowInsert && origin.row + blockRows > rows.length) {
      onPasteOverflow?.();
      return;
    }
    if (!navCols.slice(origin.navIndex, origin.navIndex + blockCols).some((index) => {
      const column = columns[index];
      return column.setValue && !column.readOnly && !column.chipsOnly;
    })) return;
    const next = rows.slice();
    for (let r = 0; r < blockRows; r += 1) {
      const targetRow = origin.row + r;
      if (targetRow < next.length && bannerKeys.has(rowKey(next[targetRow]))) continue; // banner rows are not paste targets
      while (next.length <= targetRow) next.push(createRow());
      for (let c = 0; c < blockCols; c += 1) {
        const columnIndex = navCols[origin.navIndex + c];
        if (columnIndex === undefined) break;
        const column = columns[columnIndex];
        if (!column.setValue || column.readOnly || column.chipsOnly) continue;
        if (merges.covered.has(`${targetRow}:${columnIndex}`)) continue;
        if (cellLocked(next[targetRow], sourceIndex(targetRow), column)) continue;
        const copied = copiedRowsRef.current;
        const sourceRow = copied?.rows[r % copied.rows.length];
        const sourceColumnId = copied?.columnIds[c % copied.columnIds.length];
        const copyFrom = summaryGroups.get(column.id)?.definition.summaryColumn.copyFrom;
        if (copyFrom && sourceRow && sourceColumnId === column.id) {
          next[targetRow] = copyFrom(next[targetRow], sourceRow);
          continue;
        }
        const source = tileRows || tileCols
          ? matrix[r % clipRows]?.[c % (clipCols || 1)] ?? ''
          : matrix[r]?.[c] ?? '';
        const normalized = normalizeGridValue(column, source);
        if (column.kind === 'multiselect') {
          const choices = new Set((column.getCandidates?.() ?? []).map((candidate) => candidate.value));
          const pastedValues = parseGridMultiValue(normalized);
          if ((normalized && !pastedValues.length) || pastedValues.some((item) => !choices.has(item))) {
            setEditError(`${column.title || 'Ячейка'}: вставленные значения отсутствуют в списке`);
            return;
          }
        }
        const error = validateGridValue(column.validation, normalized);
        if (error) { setEditError(`${column.title || 'Ячейка'}: ${error}`); return; } // Excel rejects the whole paste
        next[targetRow] = column.setValue(next[targetRow], normalized);
      }
    }
    emitRows(next);
    setActive({ ...origin });
    setFocus({ row: origin.row + blockRows - 1, navIndex: Math.min(navCols.length - 1, origin.navIndex + blockCols - 1) });
    setEditError(null);
  }, [active, allowRowInsert, bannerKeys, rowKey, columns, createRow, emitRows, editing, merges, navCols, onPasteOverflow, readOnly, rows, selection, summaryGroups]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (active && ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu')) {
      if (contextMenu && editing) return;
      event.preventDefault();
      const rect = ownGridElements(wrapperRef.current, `[data-testid="sg-rowheader-${active.row}"]`)[0]?.getBoundingClientRect();
      if (contextMenu && !editing) {
        const cellRect = ownGridElements(wrapperRef.current, '[data-testid]')
          .find((element) => element.dataset.testid === `sg-cell-${active.row}-${columns[navCols[active.navIndex]]?.id}`)?.getBoundingClientRect();
        openCellMenu(active.row, active.navIndex, cellRect?.left ?? 8, cellRect?.bottom ?? 8);
      } else openRowMenu(active.row, rect?.right ?? 8, rect?.bottom ?? 8);
      return;
    }
    // Layout-independent by key letter: z/y plus their Russian-layout
    // equivalents (Ctrl+Я / Ctrl+Н); Shift+variant always means redo.
    if ((event.ctrlKey || event.metaKey) && !event.altKey && ['z', 'y', 'я', 'н'].includes(event.key.toLowerCase())) {
      if (editing) return; // the input keeps its native text undo
      event.preventDefault();
      if (event.shiftKey || ['y', 'н'].includes(event.key.toLowerCase())) runRedo();
      else runUndo();
      return;
    }
    if (!navCols.length || !rows.length) return;
    if (!active) {
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'F2'].includes(event.key)) {
        event.preventDefault();
        applyMove(0, 0);
      }
      return;
    }
    const column = columns[navCols[active.navIndex]];
    const value = column?.getValue?.(rows[active.row]) ?? '';
    const extend = event.shiftKey;
    const isCheckbox = column?.kind === 'checkbox';

    if ((event.ctrlKey || event.metaKey) && !event.altKey && ['a', 'ф'].includes(event.key.toLowerCase())) {
      if (editing) return; // the input keeps its own select-all
      event.preventDefault();
      selectAll();
      return;
    }
    if (virtual && !editing && ['Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
      event.preventDefault();
      const base = extend ? (focus ?? active) : active;
      const pageRows = Math.max(1, Math.floor(((wrapperRef.current?.clientHeight || virtualHeight) - (showColumnHeaders ? 24 : 0)) / fixedRowHeight));
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        const direction = event.key === 'PageDown' ? 1 : -1;
        const target = rowOffsets ? rowAtOffset(rowTop(base.row) + direction * ((wrapperRef.current?.clientHeight || virtualHeight) - (showColumnHeaders ? 24 : 0))) : base.row + direction * pageRows;
        applyMove(target === base.row ? base.row + direction : target, base.navIndex, extend);
      } else {
        const end = event.key === 'End';
        const row = event.ctrlKey || event.metaKey ? (end ? rows.length - 1 : 0) : base.row;
        applyMove(row, end ? navCols.length - 1 : 0, extend);
      }
      return;
    }
    if (isCheckbox && !editing) {
      // A checkbox cell has no editor: Space toggles, Enter toggles and walks down.
      if (event.key === ' ' || event.key === 'Enter' || event.key === 'F2' || (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey)) {
        event.preventDefault();
        toggleCheckbox(active.row, active.navIndex);
        if (event.key === 'Enter') applyMove(active.row + 1, active.navIndex);
        return;
      }
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (editing) { if (commitEdit(undefined, true)) focusGrid(); }
      else if (cellEditable(navCols[active.navIndex], active.row)) fillSelection(value);
      return;
    }
    // A collapsed summary has no cell to edit: Enter opens its row panel and
    // selects the first editable field. Enter again inside the panel must keep
    // the panel open (committing a value only moves the inner grid).
    if ((event.key === 'Enter' || event.key === 'F2') && !editing) {
      const summaryColumn = columns[navCols[active.navIndex]];
      const summaryGroup = summaryColumn ? summaryGroups.get(summaryColumn.id) : undefined;
      if (summaryGroup?.definition.rowEditor) {
        const leaf = summaryGroup.leafIds.find((id) => cellEditable(columns.findIndex((column) => column.id === id), active.row));
        const anchor = leaf ? ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${active.row}-${summaryColumn.id}"]`)[0] : null;
        if (leaf && anchor) {
          event.preventDefault();
          const key = rowKey(rows[active.row]);
          setGroupRowEditor((previous) => previous && previous.key === key && previous.groupId === summaryGroup.definition.id
            ? previous
            : { key, groupId: summaryGroup.definition.id, anchor, focus: { columnId: leaf } });
          return;
        }
      }
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (editing) {
        if (commitEdit()) applyMove(active.row + 1, column?.enterToRowStart ? 0 : active.navIndex);
      } else startEditing(value);
      return;
    }
    if (event.key === 'F2') {
      event.preventDefault();
      startEditing(value);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      if (editing && !commitEdit()) return;
      // A `tabOut` column hands focus back to the form instead of moving right.
      if (!event.shiftKey && column?.tabOut) { onTabOut?.(); return; }
      const base = active;
      let navIndex = base.navIndex + (extend ? -1 : 1);
      let row = base.row;
      if (navIndex < 0) { navIndex = navCols.length - 1; row -= 1; }
      else if (navIndex >= navCols.length) { navIndex = 0; row += 1; }
      applyMove(row, navIndex);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (copiedRange) { setCopiedRange(null); return; }
      if (reorderRef.current) { reorderRef.current = null; setReorder(null); return; } // a reorder drag dies without moving anything
      if (fillDragRef.current) { cancelFillDrag(); return; } // an autofill drag dies without touching the data
      if (editing) { setEditing(false); setEditError(null); focusGrid(); }
      else { setActive(null); setFocus(null); }
      return;
    }
    if (event.key.startsWith('Arrow')) {
      if (editing && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) return; // leave the caret alone
      event.preventDefault();
      if (editing && !commitEdit()) return;
      const base = extend ? (focus ?? active) : active;
      if (event.key === 'ArrowDown') applyMove(base.row + 1, base.navIndex, extend);
      else if (event.key === 'ArrowUp') applyMove(base.row - 1, base.navIndex, extend);
      else if (event.key === 'ArrowLeft') applyMove(base.row, base.navIndex - 1, extend);
      else applyMove(base.row, base.navIndex + 1, extend);
      return;
    }
    if (!editing && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      clearSelection();
      return;
    }
    if (!editing && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
      if (!active) return;
      const activeColumn = columns[navCols[active.navIndex]];
      const activeGroup = activeColumn ? summaryGroups.get(activeColumn.id) : undefined;
      if (activeGroup?.definition.rowEditor) {
        // Typing into a collapsed summary opens the row panel and seeds its
        // first editable field: the summary itself has no cell to write to.
        const leaf = activeGroup.leafIds.find((id) => cellEditable(columns.findIndex((column) => column.id === id), active.row));
        const anchor = leaf ? ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${active.row}-${activeColumn.id}"]`)[0] : null;
        if (leaf && anchor) {
          event.preventDefault();
          setGroupRowEditor({ key: rowKey(rows[active.row]), groupId: activeGroup.definition.id, anchor, seed: { columnId: leaf, value: event.key } });
          return;
        }
      }
      if (cellEditable(navCols[active.navIndex], active.row)) { event.preventDefault(); startEditing(event.key, true); }
    }
  };

  const handleCellMouseDown = (event: ReactMouseEvent<HTMLTableCellElement>, rowIndex: number, navIndex: number) => {
    if ((event.target as HTMLElement).closest('[data-sg-checkbox]')) return; // the checkbox owns the whole click
    if ((event.target as HTMLElement).closest('[data-sg-editor]') || ((event.target as HTMLElement).closest('[data-sg-portal]') && !wrapperRef.current?.contains(event.target as Node))) return;
    if (navIndex < 0 || event.button !== 0) return;
    event.preventDefault();
    // A failed commit no longer traps the user: clicking another cell drops the
    // invalid draft (mouse-away cancels), then the clicked cell is selected.
    if (editing && !commitEdit()) cancelEdit();
    if (event.shiftKey && active && !singleCellSelection) {
      setFocus({ row: rowIndex, navIndex });
    } else {
      setActive({ row: rowIndex, navIndex });
      setFocus({ row: rowIndex, navIndex });
    }
    setEditing(false);
    setEditError(null);
    setDragging(!singleCellSelection);
    scrollCellIntoView(rowIndex, navIndex);
    focusGrid();
  };

  const handleCellMouseOver = (rowIndex: number, navIndex: number) => {
    if (fillDragRef.current) { if (pointerMovedRef.current) updateFillTarget(rowIndex, navIndex); return; }
    if (!dragging || navIndex < 0 || !pointerMovedRef.current) return; // a scroll moved the cells, not the pointer
    setFocus({ row: rowIndex, navIndex });
  };

  // Safety net for hosts that swallow the first mousedown: a click still selects.
  const handleCellClick = (event: ReactMouseEvent<HTMLTableCellElement>, rowIndex: number, navIndex: number) => {
    if (navIndex < 0) return;
    if ((event.target as HTMLElement).closest('[data-sg-editor]') || ((event.target as HTMLElement).closest('[data-sg-portal]') && !wrapperRef.current?.contains(event.target as Node))) return;
    // The browser's click follows mousedown. It must preserve the Shift anchor
    // instead of collapsing the range just established by mousedown.
    if (event.shiftKey && active && !singleCellSelection) {
      setFocus({ row: rowIndex, navIndex });
      scrollCellIntoView(rowIndex, navIndex);
      focusGrid();
      return;
    }
    const column = columns[navCols[navIndex]];
    if (!pointerMovedRef.current) {
      if (event.detail <= 1) column?.onCellClick?.(rows[rowIndex]);
      if (column?.openOnActivate && cellEditable(navCols[navIndex], rowIndex)) {
        startEditingAt(rowIndex, navIndex);
        return;
      }
    }
    if (active?.row === rowIndex && active?.navIndex === navIndex) return;
    setActive({ row: rowIndex, navIndex });
    setFocus({ row: rowIndex, navIndex });
    scrollCellIntoView(rowIndex, navIndex);
    focusGrid();
  };

  /** Select one whole row. */
  const selectRow = (rowIndex: number) => {
    const nextActive = { row: rowIndex, navIndex: 0 };
    const nextFocus = { row: rowIndex, navIndex: navCols.length - 1 };
    setActive(nextActive);
    setFocus(nextFocus);
    setGutterSelection({ active: nextActive, focus: nextFocus });
  };

  /** Select one whole column (presentational columns carry no selection). */
  const selectColumn = (columnIndex: number) => {
    const nav = navIndexOf(columnIndex);
    if (nav < 0) return;
    const nextActive = { row: 0, navIndex: nav };
    const nextFocus = { row: rows.length - 1, navIndex: nav };
    setActive(nextActive);
    setFocus(nextFocus);
    setColumnSelection({ active: nextActive, focus: nextFocus });
  };

  /** The first gesture across headers selects; only a later grab of that selection moves it. */
  const startHeaderSelection = (kind: 'col' | 'row', anchor: number) => {
    headerGrabCleanup.current?.();
    const root = wrapperRef.current;
    const selector = kind === 'col' ? 'thead [data-testid^="sg-colheader-"]' : 'tbody [data-testid^="sg-rowheader-"]';
    const update = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(selector) : null;
      const header = target && target.closest('[data-sg]') === root ? target : ownGridElements(root, selector).find((element) => {
        const rect = element.getBoundingClientRect();
        return kind === 'col' ? event.clientX >= rect.left && event.clientX < rect.right
          : event.clientY >= rect.top && event.clientY < rect.bottom;
      });
      if (!header || header.hasAttribute('data-sg-system')) return;
      const index = kind === 'col' ? Number(header.getAttribute('data-column-index'))
        : Number(header.closest('tr')?.getAttribute('data-row-index'));
      const nav = kind === 'col' ? navIndexOf(index) : navCols.length - 1;
      if (nav < 0) return;
      const nextActive = kind === 'col' ? { row: 0, navIndex: navIndexOf(anchor) } : { row: anchor, navIndex: 0 };
      const nextFocus = kind === 'col' ? { row: rows.length - 1, navIndex: nav } : { row: index, navIndex: nav };
      setActive(nextActive);
      setFocus(nextFocus);
      (kind === 'col' ? setColumnSelection : setGutterSelection)({ active: nextActive, focus: nextFocus });
    };
    const cleanup = () => {
      window.removeEventListener('mousemove', update);
      window.removeEventListener('mouseup', cleanup);
      window.removeEventListener('blur', cleanup);
      window.removeEventListener('keydown', cancel);
      headerGrabCleanup.current = null;
    };
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') cleanup(); };
    headerGrabCleanup.current = cleanup;
    window.addEventListener('mousemove', update);
    window.addEventListener('mouseup', cleanup);
    window.addEventListener('blur', cleanup);
    window.addEventListener('keydown', cancel);
  };

  /** A grab of an already selected header block becomes a reorder after the travel threshold. */
  const startReorderGrab = (
    kind: 'col' | 'row',
    block: { fromStart: number; fromEnd: number },
    start: number,
    onClick: () => void,
    pointerId?: number,
  ) => {
    headerGrabCleanup.current?.();
    let moved = false;
    let pointer: { x: number; y: number } | undefined;
    let scrollFrame: number | undefined;
    const scroller = kind === 'row' ? getRowScrollContainer?.() : null;
    const moveEventName = pointerId === undefined ? 'mousemove' : 'pointermove';
    const upEventName = pointerId === undefined ? 'mouseup' : 'pointerup';
    const scrollRowsAtEdge = () => {
      if (!pointer || !scroller || !reorderRef.current) return;
      const bounds = scroller.getBoundingClientRect();
      const headerBottom = wrapperRef.current?.querySelector('thead th')?.getBoundingClientRect().bottom ?? bounds.top;
      const bottom = bounds.top + scroller.clientHeight;
      const edge = 26;
      const delta = pointer.y < headerBottom + edge ? Math.max(-16, (pointer.y - headerBottom - edge) / 2)
        : pointer.y > bottom - edge ? Math.min(16, (pointer.y - bottom + edge) / 2) : 0;
      if (delta && pointer.y >= bounds.top && pointer.y <= bounds.bottom) {
        scroller.scrollTop += delta;
        updateDropFromPointer(kind, pointer.x, pointer.y);
      }
      scrollFrame = requestAnimationFrame(scrollRowsAtEdge);
    };
    const axis = kind === 'col' ? 'clientX' : 'clientY';
    const onMove = (moveEvent: MouseEvent) => {
      if (pointerId !== undefined && (moveEvent as PointerEvent).pointerId !== pointerId) return;
      pointer = { x: moveEvent.clientX, y: moveEvent.clientY };
      if (!moved) {
        if (Math.abs(moveEvent[axis] - start) < SG_REORDER_THRESHOLD) return;
        moved = true;
        const drag: ReorderDrag = { kind, ...block, drop: block.fromStart };
        reorderRef.current = drag;
        setHoveredResizeColumn(null);
        setReorder(drag);
        if (scroller) scrollFrame = requestAnimationFrame(scrollRowsAtEdge);
      }
      // The insertion line follows the raw pointer position — anywhere on the
      // page, not only over the header/gutter strip — clamped by the grid edges.
      updateDropFromPointer(kind, moveEvent.clientX, moveEvent.clientY);
    };
    const onUp = (event: MouseEvent) => {
      if (pointerId !== undefined && (event as PointerEvent).pointerId !== pointerId) return;
      cleanup();
      if (moved) {
        updateDropFromPointer(kind, event.clientX, event.clientY);
        finishReorder(kind);
      }
      else onClick();
    };
    const cleanup = () => {
      if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
      window.removeEventListener(moveEventName, onMove);
      window.removeEventListener(upEventName, onUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', onKey);
      headerGrabCleanup.current = null;
    };
    const cancel = () => { cleanup(); reorderRef.current = null; setReorder(null); };
    const onPointerCancel = (event: PointerEvent) => { if (event.pointerId === pointerId) cancel(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel(); };
    headerGrabCleanup.current = cleanup;
    window.addEventListener(moveEventName, onMove);
    window.addEventListener(upEventName, onUp);
    if (pointerId !== undefined) window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', onKey);
  };

  const beginRowGrab = (event: ReactMouseEvent<HTMLTableCellElement>, rowIndex: number, pointerId?: number) => {
    if (!navCols.length) return;
    if (event.button !== 0) return;
    event.preventDefault();
    if (editing && !commitEdit()) cancelEdit();
    setEditing(false);
    setEditError(null);
    if (event.shiftKey && active && !singleCellSelection) {
      const nextFocus = { row: rowIndex, navIndex: focus?.navIndex ?? navCols.length - 1 };
      setFocus(nextFocus);
      if (gutterSelection?.active === active && gutterSelection.focus === focus) {
        setGutterSelection({ active, focus: nextFocus });
      }
      focusGrid();
      return;
    }
    // A grab inside a genuine row selection (it spans every column) moves the
    // whole block; a cell/column selection never turns a gutter grab into one.
    const inBlock = gutterSelection?.active === active && gutterSelection?.focus === focus
      && selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row
      && selection.min.navIndex === 0 && selection.max.navIndex === navCols.length - 1;
    const directHandle=event.target instanceof Element&&Boolean(event.target.closest('[data-sg-row-drag-handle]'));
    if (!inBlock) selectRow(rowIndex);
    focusGrid();
    if ((inBlock||directHandle) && (!readOnly || rowDropTarget) && !rowViewProjected && (!rowSelectionMode||directHandle) && allowRowReorder) {
      const start=directHandle||rowDropTarget?rowIndex:selection!.min.row;
      let end=directHandle||rowDropTarget?rowIndex:selection!.max.row;
      for(let index=start;index<=end;index++){
        if(rowGroupKey&&bannerKeys.has(rowKey(rows[index]))){const id=rowGroupKey(rows[index]);while(end+1<rows.length&&rowGroupKey(rows[end+1])===id)end++;}
      }
      startReorderGrab('row', { fromStart: start, fromEnd: end }, event.clientY, () => selectRow(rowIndex), pointerId);
    } else startHeaderSelection('row', rowIndex);
  };

  const beginColumnGrab = (event: ReactMouseEvent<HTMLTableCellElement>, columnIndex: number) => {
    if (event.button !== 0) return;
    const grabbed = columns[columnIndex];
    // A system (presentational) column is pinned: its header never starts a
    // reorder and never selects a column.
    if (grabbed.render && !grabbed.navigable) return;
    const nav = navIndexOf(columnIndex);
    event.preventDefault();
    if (editing && !commitEdit()) cancelEdit();
    setEditing(false);
    setEditError(null);
    if (event.shiftKey && active && nav >= 0) {
      const nextFocus = { row: focus?.row ?? active.row, navIndex: nav };
      setFocus(nextFocus);
      if (columnSelection?.active === active && columnSelection.focus === focus) {
        setColumnSelection({ active, focus: nextFocus });
      }
      focusGrid();
      return;
    }
    // A grab inside a genuine column selection (it spans every row) moves the
    // whole block; a cell/row selection never turns a header grab into one.
    const inBlock = columnSelection?.active === active && columnSelection?.focus === focus
      && selection !== null && nav >= 0 && nav >= selection.min.navIndex && nav <= selection.max.navIndex
      && selection.min.row === 0 && selection.max.row === rows.length - 1;
    if (!inBlock) selectColumn(columnIndex);
    focusGrid();
    if (inBlock) {
      const block = { fromStart: visibleCols.indexOf(navCols[selection.min.navIndex]), fromEnd: visibleCols.indexOf(navCols[selection.max.navIndex]) };
      startReorderGrab('col', block, event.clientX, () => selectColumn(columnIndex));
    } else startHeaderSelection('col', columnIndex);
  };

  /** Track the insertion line from the raw pointer position via element midpoints of this grid. */
  const updateDropFromPointer = (kind: 'col' | 'row', x: number, y: number) => {
    const drag = reorderRef.current;
    const root = wrapperRef.current;
    if (!drag || drag.kind !== kind || !root) return;
    if (kind === 'row' && rowDropTarget) {
      const targets = ownGridElements(root, 'tbody tr[data-row-index]');
      const headerBottom = root.querySelector('thead th')?.getBoundingClientRect().bottom ?? -Infinity;
      const scroller = getRowScrollContainer?.();
      const viewportBottom = scroller?.clientHeight ? scroller.getBoundingClientRect().top + scroller.clientHeight : Infinity;
      let rowTarget: ReorderDrag['rowTarget'];
      if (y >= headerBottom && y <= viewportBottom) {
        for (const element of targets) {
          const rect = element.getBoundingClientRect();
          if (y < rect.top || y > rect.bottom) continue;
          const index = Number(element.getAttribute('data-row-index'));
          const offset = (y - rect.top) / rect.height;
          const placement = offset < 0.28 ? 'before' : offset > 0.72 ? 'after' : 'inside';
          if (drag.rowTarget?.index === index && drag.rowTarget.placement === placement) return;
          rowTarget = { index, placement, commit: rowDropTarget(rows[drag.fromStart], rows[index], placement) };
          break;
        }
        const last = targets[targets.length - 1];
        if (!rowTarget && last && Number(last.getAttribute('data-row-index')) === rows.length - 1
          && y > last.getBoundingClientRect().bottom) {
          const index = rows.length - 1;
          if (drag.rowTarget?.placement === 'end') return;
          rowTarget = { index, placement: 'end', commit: rowDropTarget(rows[drag.fromStart], rows[index], 'end') };
        }
      }
      if (rowTarget || drag.rowTarget) {
        const next = { ...drag, rowTarget };
        reorderRef.current = next;
        setReorder(next);
      }
      return;
    }
    const mids: number[] = [];
    // All-columns insertion indexes matching `mids` one to one: system
    // (presentational) headers contribute no insertion edge of their own.
    const slots: number[] = [];
    if (kind === 'col') {
      // Row-spanning leaves occur in different header rows: DOM order is not
      // their left-to-right order. Use the same projection as the body.
      const headers = ownGridElements(root, 'thead [data-testid^="sg-colheader-"]')
        .sort((a, b) => visibleCols.indexOf(Number(a.getAttribute('data-column-index'))) - visibleCols.indexOf(Number(b.getAttribute('data-column-index'))));
      headers.forEach((cell) => {
        if (cell.hasAttribute('data-sg-system')) return;
        const rect = cell.getBoundingClientRect();
        mids.push(rect.left + rect.width / 2);
        slots.push(visibleCols.indexOf(Number(cell.getAttribute('data-column-index'))));
      });
    } else {
      ownGridElements(root, 'tbody tr[data-testid^="sg-row-"]').forEach((row) => {
        const rect = row.getBoundingClientRect();
        mids.push(rect.top + rect.height / 2);
        slots.push(Number(row.getAttribute('data-row-index')));
      });
    }
    const slot = dropSlot(mids, kind === 'col' ? x : y);
    const drop = slots.length ? slots[slot] ?? slots[slots.length - 1] + 1 : 0;
    if (drop !== drag.drop) {
      const next = { ...drag, drop };
      reorderRef.current = next;
      setReorder(next);
    }
  };

  const finishReorder = (kind: 'col' | 'row') => {
    const drag = reorderRef.current;
    reorderRef.current = null;
    setReorder(null);
    if (!drag || drag.kind !== kind) return;
    if (kind === 'row' && rowDropTarget) {
      drag.rowTarget?.commit?.();
      return;
    }
    const len = drag.fromEnd - drag.fromStart + 1;
    if (drag.drop > drag.fromStart && drag.drop <= drag.fromEnd) return; // dropped back inside the block: no move
    const insertAt = drag.drop > drag.fromEnd ? drag.drop - len : drag.drop;
    if (insertAt === drag.fromStart) return;
    if (kind === 'col') {
      const visibleIds = visibleCols.map((index) => columns[index].id);
      const moved = visibleIds.slice(drag.fromStart, drag.fromEnd + 1);
      const parentOf = (id: string) => {
        const path = columnProjection.paths.get(id) ?? [];
        return path[path.length - 1];
      };
      if (moved.some((id) => parentOf(id) !== parentOf(moved[0]))) return;
      const leaves = (id: string) => summaryGroups.get(id)?.leafIds ?? [id];
      const movingIds = new Set(moved.flatMap(leaves));
      const ids = physicalColumns.map((column) => column.id).filter((id) => !movingIds.has(id));
      const moving = physicalColumns.map((column) => column.id).filter((id) => movingIds.has(id));
      const targetId = visibleIds[drag.drop];
      const targetLeaves = targetId ? new Set(leaves(targetId)) : null;
      const targetIndex = targetLeaves ? ids.findIndex((id) => targetLeaves.has(id)) : ids.length;
      ids.splice(targetIndex < 0 ? ids.length : targetIndex, 0, ...moving);
      // A summary moves all its leaves; insertion cannot split another group.
      if (allGroups.some((group) => {
        const indexes = ids.flatMap((id, index) => group.leafIds.includes(id) ? [index] : []);
        return indexes.length !== group.leafIds.length || indexes.some((index, i) => index !== indexes[0] + i);
      })) return;
      if (ids.every((id, index) => id === physicalColumns[index].id)) return;
      pushUndoSnapshot('order');
      // System columns are pinned: whatever the drop point, they end up last.
      const systemIds = new Set(columns.filter((column) => column.render && !column.navigable).map((column) => column.id));
      const ordered = [...ids.filter((id) => !systemIds.has(id)), ...ids.filter((id) => systemIds.has(id))];
      setOrderIds(ordered);
      onColumnOrderChange?.(ordered.slice());
      // The selection follows the moved columns, matched by column id.
      const nextNavIds = navigationIdsInOrder(ordered);
      const newNavIndex = (id: string) => nextNavIds.indexOf(id);
      const remap = (cell: CellIndex): CellIndex => {
        const id = columns[navCols[cell.navIndex]]?.id;
        return id ? { ...cell, navIndex: Math.max(0, newNavIndex(id)) } : cell;
      };
      if (active && focus) {
        const nextActive = remap(active), nextFocus = remap(focus);
        setActive(nextActive); setFocus(nextFocus);
        setColumnSelection({ active: nextActive, focus: nextFocus });
      }
    } else {
      const next = rows.slice();
      const moving = next.splice(drag.fromStart, len);
      next.splice(insertAt, 0, ...moving);
      if(outline&&collapsedRowGroupKeys?.length){
        const movingKeys=new Set(moving.map(rowKey));
        const groups=new Set(moving.filter(outline.isBanner).map(outline.groupKey));
        const fullMoving=sourceRows.filter(row=>movingKeys.has(rowKey(row))||groups.has(outline.groupKey(row)));
        const fullKeys=new Set(fullMoving.map(rowKey));
        const rest=sourceRows.filter(row=>!fullKeys.has(rowKey(row)));
        const target=next.slice(insertAt+moving.length).find(row=>!fullKeys.has(rowKey(row)));
        const destination=target?rest.findIndex(row=>rowKey(row)===rowKey(target)):rest.length;
        rest.splice(destination,0,...fullMoving);
        if(onRowReorder)onRowReorder(rest,fullMoving.map(rowKey));else onChange(rest);
      }else if(onRowReorder)onRowReorder(next,moving.map(rowKey));else emitRows(next);
      // The gutter selection follows the moved rows, matched by rowKey.
      const remapRow = (rowIndex: number) => {
        const key = rowKey(rows[rowIndex]);
        const idx = next.findIndex((row) => rowKey(row) === key);
        return idx === -1 ? rowIndex : idx;
      };
      if (active && focus) {
        const nextActive = { ...active, row: remapRow(active.row) }, nextFocus = { ...focus, row: remapRow(focus.row) };
        setActive(nextActive); setFocus(nextFocus);
        setGutterSelection({ active: nextActive, focus: nextFocus });
      }
    }
  };

  /** Which edge of this column/row wears the insertion line during a reorder drag. */
  const reorderMark = (kind: 'col' | 'row', index: number, lastIndex: number): 'left' | 'right' | 'top' | 'bottom' | null => {
    if (!reorder || reorder.kind !== kind) return null;
    if (kind === 'row' && rowDropTarget) return null;
    if (reorder.drop > reorder.fromStart && reorder.drop <= reorder.fromEnd) {
      return index === reorder.fromStart ? (kind === 'col' ? 'left' : 'top') : null; // no-op drop: the line rests at the block start
    }
    if (index === reorder.drop) return kind === 'col' ? 'left' : 'top';
    return index === lastIndex && reorder.drop === lastIndex + 1 ? (kind === 'col' ? 'right' : 'bottom') : null;
  };

  const reorderMarkOverlay = (mark: 'left' | 'right' | 'top' | 'bottom' | null) => {
    if (!mark) return null;
    const style: CSSProperties = mark === 'left' ? { background: selectionColor, bottom: -1, left: -2, top: -1, width: 3 }
      : mark === 'right' ? { background: selectionColor, bottom: -1, right: -2, top: -1, width: 3 }
        : mark === 'top' ? { background: selectionColor, height: 3, left: -1, right: -1, top: -2 }
          : { background: selectionColor, bottom: -2, height: 3, left: -1, right: -1 };
    return <div aria-hidden="true" className="pointer-events-none absolute z-20" data-testid="sg-reorder-mark" style={style} />;
  };

  const cancelFillDrag = useCallback(() => {
    fillDragRef.current = null;
    fillTargetRef.current = null;
    setFillTarget(null);
  }, []);

  /** Track the fill target while the handle drag hovers over body cells. */
  const updateFillTarget = (rowIndex: number, navIndex: number) => {
    const drag = fillDragRef.current;
    if (!drag || navIndex < 0) return;
    const { min, max } = drag.source;
    let next: CellRange | null = null;
    if (rowIndex > max.row) next = { min: { row: max.row + 1, navIndex: min.navIndex }, max: { row: rowIndex, navIndex: max.navIndex } };
    else if (rowIndex < min.row) next = { min: { row: rowIndex, navIndex: min.navIndex }, max: { row: min.row - 1, navIndex: max.navIndex } };
    else if (navIndex > max.navIndex) next = { min: { row: min.row, navIndex: max.navIndex + 1 }, max: { row: max.row, navIndex } };
    else if (navIndex < min.navIndex) next = { min: { row: min.row, navIndex }, max: { row: max.row, navIndex: min.navIndex - 1 } };
    fillTargetRef.current = next;
    setFillTarget(next); // null while hovering the source itself: no fill on release
  };

  /** Write the autofilled values of `target` from the frozen `source` range. */
  const applyFill = useCallback((source: CellRange, target: CellRange, series: boolean): boolean => {
    if (readOnly) return false;
    const vertical = target.max.row > source.max.row ? 1 : target.min.row < source.min.row ? -1 : 0;
    const horizontal = target.max.navIndex > source.max.navIndex ? 1 : target.min.navIndex < source.min.navIndex ? -1 : 0;
    const lineValues = (rowIndex: number, navIndex: number, axis: 'row' | 'col'): string[] => {
      const line: string[] = [];
      if (axis === 'col') {
        for (let row = source.min.row; row <= source.max.row; row += 1) line.push(columns[navCols[navIndex]]?.getValue?.(rows[row]) ?? '');
      } else {
        for (let nav = source.min.navIndex; nav <= source.max.navIndex; nav += 1) line.push(columns[navCols[nav]]?.getValue?.(rows[rowIndex]) ?? '');
      }
      return line;
    };
    const fillLine = (values: string[], count: number, direction: 1 | -1): string[] => {
      if (series) {
        // Ctrl continues from the nearest source edge by one, rather than
        // inferring a stride from a multi-cell source range.
        const edge = direction === 1 ? values[values.length - 1] : values[0];
        return extendGridFillLine([edge ?? ''], count, direction);
      }
      // A plain drag copies the source unchanged; multi-cell sources tile.
      return Array.from({ length: count }, (_, index) => values[direction === 1 ? index % values.length : values.length - 1 - (index % values.length)] ?? '');
    };
    const writes: Array<{ row: number; columnIndex: number; normalized: string; sourceRow?: T; copyFrom?: (target: T, source: T) => T }> = [];
    const planCell = (rowIndex: number, navIndex: number, raw: string, next: T[], sourceRow?: T) => {
      const columnIndex = navCols[navIndex];
      const column = columns[columnIndex];
      const copyFrom = summaryGroups.get(column?.id || '')?.definition.summaryColumn.copyFrom;
      if (!column?.setValue || column.readOnly || column.chipsOnly) return;
      if (bannerKeys.has(rowKey(next[rowIndex]))) return; // a fill never crosses into banner rows
      if (merges.covered.has(`${rowIndex}:${columnIndex}`)) return;
      if (cellLocked(next[rowIndex], sourceIndex(rowIndex), column)) return;
      const normalized = normalizeGridValue(column, raw);
      const error = validateGridValue(column.validation, normalized);
      if (error) { setEditError(`${column.title || 'Ячейка'}: ${error}`); throw new Error(error); } // Excel rejects the whole fill
      writes.push({ row: rowIndex, columnIndex, normalized, ...(copyFrom && sourceRow ? { sourceRow, copyFrom } : {}) });
    };
    try {
      if (vertical !== 0) {
        const count = target.max.row - target.min.row + 1;
        const next = rows.slice();
        for (let navIndex = source.min.navIndex; navIndex <= source.max.navIndex; navIndex += 1) {
          const filled = fillLine(lineValues(-1, navIndex, 'col'), count, vertical);
          for (let index = 0; index < count; index += 1) {
            const row = vertical === 1 ? source.max.row + 1 + index : source.min.row - 1 - index;
            if (row < 0 || row >= next.length) continue;
            const sourceHeight = source.max.row - source.min.row + 1;
            const sourceOffset = vertical === 1 ? index % sourceHeight : sourceHeight - 1 - (index % sourceHeight);
            planCell(row, navIndex, filled[index], next, rows[source.min.row + sourceOffset]);
          }
        }
        for (const write of writes) {
          const column = columns[write.columnIndex];
          next[write.row] = write.sourceRow && write.copyFrom ? write.copyFrom(next[write.row], write.sourceRow) : column.setValue!(next[write.row], write.normalized);
        }
        if (writes.length) emitRows(next);
      } else if (horizontal !== 0) {
        const count = target.max.navIndex - target.min.navIndex + 1;
        const next = rows.slice();
        for (let rowIndex = source.min.row; rowIndex <= source.max.row; rowIndex += 1) {
          const filled = fillLine(lineValues(rowIndex, -1, 'row'), count, horizontal);
          for (let index = 0; index < count; index += 1) {
            const navIndex = horizontal === 1 ? source.max.navIndex + 1 + index : source.min.navIndex - 1 - index;
            if (navIndex < 0 || navIndex >= navCols.length) continue;
            planCell(rowIndex, navIndex, filled[index], next);
          }
        }
        for (const write of writes) {
          const column = columns[write.columnIndex];
          next[write.row] = column.setValue!(next[write.row], write.normalized);
        }
        if (writes.length) emitRows(next);
      }
      return writes.length > 0; // nothing written (e.g. readonly cells only): the selection stays as is
    } catch {
      return false; // the error message is already on the sheet
    }
  }, [bannerKeys, rowKey, columns, emitRows, merges, navCols, readOnly, rows, summaryGroups]);

  const endFillDrag = useCallback((series: boolean) => {
    const drag = fillDragRef.current;
    const target = fillTargetRef.current;
    fillDragRef.current = null;
    fillTargetRef.current = null;
    setFillTarget(null);
    if (!drag || !target || !applyFill(drag.source, target, series)) return;
    // Excel marks the whole filled block (source + target) as the selection,
    // anchored on the side the series continues from.
    const union = {
      min: { row: Math.min(drag.source.min.row, target.min.row), navIndex: Math.min(drag.source.min.navIndex, target.min.navIndex) },
      max: { row: Math.max(drag.source.max.row, target.max.row), navIndex: Math.max(drag.source.max.navIndex, target.max.navIndex) },
    };
    const vertical = target.max.row > drag.source.max.row ? 1 : target.min.row < drag.source.min.row ? -1 : 0;
    const horizontal = target.max.navIndex > drag.source.max.navIndex ? 1 : target.min.navIndex < drag.source.min.navIndex ? -1 : 0;
    const anchor = vertical < 0
      ? { row: union.max.row, navIndex: union.min.navIndex }
      : horizontal < 0
        ? { row: union.min.row, navIndex: union.max.navIndex }
        : { row: union.min.row, navIndex: union.min.navIndex };
    setActive(anchor);
    setFocus({
      row: anchor.row === union.min.row ? union.max.row : union.min.row,
      navIndex: anchor.navIndex === union.min.navIndex ? union.max.navIndex : union.min.navIndex,
    });
  }, [applyFill]);

  /** Autofill drag: freeze the source range, track the hovered target, land on mouseup. */
  const beginFillDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || readOnly || !selection) return;
    event.preventDefault();
    event.stopPropagation();
    if (editing && !commitEdit()) cancelEdit();
    fillDragRef.current = { source: { min: { ...selection.min }, max: { ...selection.max } } };
    fillTargetRef.current = null;
    pointerMovedRef.current = false;
    setFillTarget(null);
    setEditing(false);
    setEditError(null);
    focusGrid();
    const onMove = () => { pointerMovedRef.current = true; };
    const onScroll = () => { pointerMovedRef.current = false; };
    const onUp = (upEvent: MouseEvent) => {
      endFillDrag(upEvent.ctrlKey);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll, true);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onScroll, true);
  };

  /** Open the editor (and its dropdown) for a specific cell, e.g. from the in-cell chevron. */
  const startEditingAt = (rowIndex: number, navIndex: number) => {
    const columnIndex = navCols[navIndex];
    if (columnIndex === undefined) return;
    if (columns[columnIndex]?.kind === 'checkbox') return; // a checkbox cell has no text editor
    if (!cellEditable(columnIndex, rowIndex)) return;
    const column = columns[columnIndex];
    scrollCellIntoView(rowIndex, navIndex);
    setActive({ row: rowIndex, navIndex });
    setFocus({ row: rowIndex, navIndex });
    editSnapshotRef.current = { row: rowIndex, value: rows[rowIndex] };
    caretRequestRef.current = null; // caret at the end of the text
    setSearchStarted(false);
    setDraft(formatEditingValue(column, column.getValue?.(rows[rowIndex]) ?? ''));
    setEditError(null);
    setEditing(true);
    focusGrid();
  };

  const handleCellDoubleClick = (rowIndex: number, navIndex: number, caretX?: number, caretY?: number) => {
    if (navIndex < 0) return;
    if (columns[navCols[navIndex]]?.kind === 'checkbox') return; // single clicks already toggle; dblclick must not flip twice
    if (editing && !commitEdit()) cancelEdit();
    const columnIndex = navCols[navIndex];
    scrollCellIntoView(rowIndex, navIndex);
    setActive({ row: rowIndex, navIndex });
    setFocus({ row: rowIndex, navIndex });
    const group = summaryGroups.get(columns[columnIndex]?.id);
    if (group?.definition.rowEditor && group.leafIds.some((id) => cellEditable(columns.findIndex((column) => column.id === id), rowIndex))) {
      const anchor = ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${rowIndex}-${columns[columnIndex].id}"]`)[0];
      if (anchor) setGroupRowEditor({ key: rowKey(rows[rowIndex]), groupId: group.definition.id, anchor });
      return;
    }
    if (cellEditable(columnIndex, rowIndex)) {
      // Excel edit mode: the caret lands on the double-clicked character.
      caretRequestRef.current = caretX === undefined || caretY === undefined ? null : { x: caretX, y: caretY };
      setSearchStarted(false);
      setDraft(formatEditingValue(columns[columnIndex], columns[columnIndex].getValue?.(rows[rowIndex]) ?? ''));
      setEditError(null);
      setEditing(true);
    }
  };

  const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && rowMenuRef.current?.contains(next)) return;
    if (next && wrapperRef.current?.contains(next)) return;
    // Focus left the grid: commit a valid value, otherwise drop the invalid draft
    // so a click outside the cell clears the error instead of trapping the user.
    if (editing && !commitEdit()) cancelEdit();
  };

  // START_BLOCK_CELL_CONTEXT_MENU
  // Provider refreshes may replace arrays without changing the cell under the menu.
  useEffect(() => {
    if (!cellMenu) return;
    const target = cellMenuTargetRef.current;
    const row = rows[cellMenu.row];
    const column = columns[navCols[cellMenu.navIndex]];
    if (!target || !row || !column || rowKey(row) !== target.rowKey || column.id !== target.columnId || (!contextMenu && !onCellCommentAdd && !onCellCommentOpen)) setCellMenu(null);
  }, [cellMenu, rows, columns, navCols, rowKey, contextMenu, onCellCommentAdd, onCellCommentOpen]);
  const closeCellMenu = useCallback((restoreFocus: boolean) => {
    setCellMenu(null);
    if (restoreFocus) focusGrid();
  }, [focusGrid]);
  const openCellMenu = (row: number, navIndex: number, x: number, y: number) => {
    if ((!contextMenu && !onCellCommentAdd && !onCellCommentOpen) || navIndex < 0 || !rows[row] || editing) return;
    cellMenuTargetRef.current = {rowKey: rowKey(rows[row]), columnId: columns[navCols[navIndex]].id};
    setMenu(null);
    setRowMenu(null);
    setMenuError(null);
    setDragging(false);
    fillDragRef.current = null;
    fillTargetRef.current = null;
    setFillTarget(null);
    reorderRef.current = null;
    setReorder(null);
    if (!inSelection(row, navIndex) || !selection || selection.max.row >= rows.length || selection.max.navIndex >= navCols.length) {
      const target = { row, navIndex };
      setActive(target); setFocus(target);
      setGutterSelection(null); setColumnSelection(null);
    }
    setCellMenu({ row, navIndex, x, y });
  };
  let cellMenuContext: SimpleGridContextMenuContext<T> | null = null;
  let cellMenuItems: SimpleGridContextMenuItem<T>[] = [];
  if (cellMenu && (contextMenu || onCellCommentAdd || onCellCommentOpen) && selection && selection.max.row < rows.length
    && selection.max.navIndex < navCols.length) {
    const column = columns[navCols[cellMenu.navIndex]];
    const row = rows[cellMenu.row];
    if (column && row) {
      const selectedColumns = navCols.slice(selection.min.navIndex, selection.max.navIndex + 1);
      const canClear = !readOnly && rows.slice(selection.min.row, selection.max.row + 1).some((_, offset) =>
        selectedColumns.some((index) => cellEditable(index, selection.min.row + offset)));
      const defaultItems: SimpleGridContextMenuItem<T>[] = [
        { id: 'copy', label: 'Копировать', shortcut: 'Ctrl+C', disabled: !navigator.clipboard?.writeText, onSelect: async () => {
          await navigator.clipboard.writeText(selectionMatrix().map((line) => line.join('\t')).join('\n'));
          setCopiedRange({ min: { ...selection.min }, max: { ...selection.max } });
        } },
        { id: 'edit', label: 'Редактировать', shortcut: 'F2', disabled: !cellEditable(navCols[cellMenu.navIndex], cellMenu.row) || column.kind === 'checkbox',
          onSelect: () => startEditingAt(cellMenu.row, cellMenu.navIndex) },
        { id: 'clear', label: 'Очистить выделение', shortcut: 'Delete', disabled: !canClear, onSelect: clearSelection },
        { id: 'selection-separator', separator: true },
        { id: 'select-all', label: 'Выделить всё', shortcut: 'Ctrl+A', onSelect: selectAll },
      ];
      // Cell notes are a native command: the host owns storage and the panel,
      // the grid only prepares the exact address and opens a callback.
      const cellNotes = cellComments?.(row, column.id) ?? [];
      const commentTarget: SimpleGridCommentTarget<T> = {
        row, rowKey: rowKey(row), columnId: column.id, columnTitle: column.title, value: column.getValue?.(row) ?? '',
        anchor: ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${cellMenu.row}-${column.id}"]`)[0] ?? null,
      };
      const commentItems: SimpleGridContextMenuItem<T>[] = [];
      if (onCellCommentAdd || onCellCommentOpen) {
        commentItems.push({ id: 'comment-separator', separator: true });
        if (onCellCommentAdd) commentItems.push({
          id: 'comment-add', label: 'Добавить комментарий',
          onSelect: () => onCellCommentAdd(commentTarget),
        });
        if (onCellCommentOpen) commentItems.push({
          id: 'comment-open', label: cellNotes.length ? `Комментарии (${cellNotes.length})` : 'Комментарии',
          onSelect: () => onCellCommentOpen(commentTarget),
        });
      }
      const items = [...defaultItems, ...commentItems];
      cellMenuContext = {
        row, rowIndex: sourceIndex(cellMenu.row), visibleRowIndex: cellMenu.row, column,
        columnIndex: columnsProp.findIndex((item) => item.id === column.id),
        value: column.getValue?.(row) ?? '', readOnly: !cellEditable(navCols[cellMenu.navIndex], cellMenu.row),
        selection: { rows: rows.slice(selection.min.row, selection.max.row + 1),
          rowIndexes: rowIndexes.slice(selection.min.row, selection.max.row + 1),
          columnIds: selectedColumns.map((index) => columns[index].id), values: selectionMatrix() },
        defaultItems, fillSelection, clearSelection,
      };
      const produced = typeof contextMenu === 'function' ? contextMenu(cellMenuContext)
        : Array.isArray(contextMenu) ? contextMenu : items;
      // A custom menu built without defaultItems still receives the comment
      // commands: they are part of the grid contract, not of the host's list.
      const hasCommentCommand = produced.some((item) => item.id === 'comment-add' || item.id === 'comment-open');
      cellMenuItems = hasCommentCommand ? produced : [...produced, ...commentItems];
    }
  }
  // END_BLOCK_CELL_CONTEXT_MENU

  // Exactly like react-datasheet-grid's `.dsg-container`: the native `cell`
  // cursor (the thick white cross) plus `user-select: none` so dragging a range
  // never starts a text selection. Inputs are not overridden, so no I-beam.
  const wrapperStyle: CSSProperties = {
    cursor: 'cell', userSelect: 'none',
    ...(rowGroupKey?{overflowAnchor:'none',paddingBottom:outlineTail.current||undefined}:{}),
    ...(virtual ? { overflow: 'auto', height: virtualHeight, overflowAnchor: 'none', '--sg-row-height': `${fixedRowHeight - 1}px` } : {}),
  };

  return (
    <div
      aria-label={ariaLabel}
      aria-rowcount={virtual || visibleRowIndices ? rows.length + Number(showColumnHeaders) : undefined}
      aria-colcount={virtual ? visibleCols.length + Number(showRowHeaders) : undefined}
      className="relative w-full rounded-md outline-none"
      data-sg
      data-sg-selection-scope={selectionScope}
      data-sg-row-headers={showRowHeaders ? undefined : 'hidden'}
      data-sg-column-headers={showColumnHeaders ? undefined : 'hidden'}
        data-sg-groups={groups.length ? '' : undefined}
      data-sg-virtual={virtual ? '' : undefined}
      data-testid="sg"
      onBlur={handleBlur}
      onCopy={handleCopy}
      onClickCapture={event=>captureCollapseScroll(event.target)}
      onCut={handleCut}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onScroll={handleViewportScroll}
      ref={wrapperRef}
      role="grid"
      style={wrapperStyle}
      tabIndex={0}
    >
      {horizontallyScrolled && frozenCount > 0 && createPortal(
        <div ref={frozenShadowRef} data-testid="sg-frozen-shadow" aria-hidden="true"
          style={{ position: 'fixed', pointerEvents: 'none', zIndex: 41,
            background: 'linear-gradient(to right, rgba(23, 43, 77, 0.14), rgba(23, 43, 77, 0.04) 45%, transparent)' }} />,
        document.body,
      )}
      {groupRowEditor && (() => {
        const group = allGroups.find((entry) => entry.definition.id === groupRowEditor.groupId);
        const rowIndex = sourceRows.findIndex((row) => rowKey(row) === groupRowEditor.key);
        if (!group || rowIndex < 0 || !collapsedGroups.has(group.definition.id)) return null;
        const details = physicalColumns.filter((column) => group.leafIds.includes(column.id)).map((column) => ({
          ...column, grow: false, openOnActivate: false,
          editor: column.editor ? (props: SimpleGridEditorProps) => { const Editor = column.editor!; return <Editor {...props} rowIndex={rowIndex}/>; } : undefined,
          isDisabled: column.isDisabled ? (row: T) => column.isDisabled!(row, rowIndex) : undefined,
          isSkeleton: column.isSkeleton ? (row: T) => column.isSkeleton!(row, rowIndex) : undefined,
          render: column.render ? (row: T) => column.render!(row, rowIndex) : undefined,
          renderValue: column.renderValue ? (row: T, _index: number, openEditor: () => void) => column.renderValue!(row, rowIndex, openEditor) : column.getValue && column.kind !== 'multiselect' ? (row: T) => {
            const value = column.getValue!(row);
            const display = column.kind !== 'checkbox' && value.startsWith('=') && value.length > 1
              ? sourceEvaluator(rowIndex, physicalColumns.indexOf(column)) : value;
            return <span className="sg-group-detail-value" style={{display:'block',whiteSpace:'normal',overflowWrap:'anywhere',wordBreak:'normal'}}>{formatGridValue(column.format, display)}</span>;
          } : undefined,
          // The panel shows one row: per-row icon factories see the original row index.
          icon: typeof column.icon === 'function' ? (row: T) => (column.icon as (r: T, index: number) => ReactNode | undefined)(row, rowIndex) : column.icon,
        }));
        return <SimpleGridCellTable title={group.definition.title} anchor={groupRowEditor.anchor} rows={[sourceRows[rowIndex]]}
          defaultColumnWidths={group.definition.rowEditorWidths ?? groupRowWidths[group.definition.id]}
          columns={details} rowKey={rowKey} createRow={createRow} selectionColor={selectionColor} selectionFill={selectionFill}
          initialEdit={groupRowEditor.seed}
          initialFocus={groupRowEditor.focus}
          onEditPreview={setGroupRowPreview}
          onColumnWidthsChange={(widths) => {
            setGroupRowWidths((previous) => ({...previous, [group.definition.id]: widths}));
            group.definition.onRowEditorWidthsChange?.(widths);
          }}
          onChange={(next) => { if (next[0]) emitRows(sourceRows.map((row) => rowKey(row) === groupRowEditor.key ? next[0] : row), true); }}
          readOnly={readOnly} onClose={() => { setGroupRowPreview(null); setGroupRowEditor(null); focusGrid(); }}/>;
      })()}
      {menuError && <div role="alert" className="sg-context-error">{menuError}</div>}
      {cellMenu && cellMenuContext && <ContextMenu x={cellMenu.x} y={cellMenu.y} items={cellMenuItems} onClose={closeCellMenu}
        onSelect={(item) => {
          const context = cellMenuContext!;
          closeCellMenu(true);
          try {
            Promise.resolve(item.onSelect(context)).catch(() => setMenuError('Не удалось выполнить команду. Для копирования можно использовать Ctrl+C.'));
          } catch {
            setMenuError('Не удалось выполнить команду контекстного меню.');
          }
        }} />}
      {rowMenu && createPortal(
        <div data-sg-portal="" className="sg-row-menu" role="menu" aria-label="Действия со строкой" ref={rowMenuRef}
          style={{ left: rowMenu.x, top: rowMenu.y }}
          onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); closeRowMenu(); return; }
            const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
              buttons[next]?.focus();
            }
          }}>
          <button type="button" role="menuitem" disabled={readOnly} onClick={() => insertRow(false)}>Вставить выше</button>
          <button type="button" role="menuitem" disabled={readOnly} onClick={() => insertRow(true)}>Вставить ниже</button>
          <button type="button" role="menuitem" onClick={() => { resetRowHeight(rowMenu.key); closeRowMenu(); }}>Сбросить высоту</button>
        </div>, document.body)}
      {columnActionMenu && actionColumn?.columnActions && <ContextMenu ariaLabel={`Действия столбца ${actionColumn.title}`} x={columnActionMenu.x} y={columnActionMenu.y} items={actionColumn.columnActions}
        onClose={restore => {if(restore)columnActionMenu.button.focus(); setColumnActionMenu(null);}}
        onSelect={item => {const action=actionColumn.columnActions?.find(action=>action.id===item.id);setColumnActionMenu(null);columnActionMenu.button.focus();if(action&&!action.disabled)void action.onSelect();}} />}
      {menu && <ColumnMenu key={menu.columnId ?? 'columns'} column={menuColumn} columns={physicalColumns} options={menuOptions}
        selected={filters.find((filter) => filter.columnId === menu.columnId)?.values} sort={appliedSort}
        hidden={manuallyHidden} button={menu.button} close={() => setMenu(null)}
        apply={(values) => updateFilters([...filters.filter((filter) => filter.columnId !== menu.columnId), ...(values === null || !menu.columnId ? [] : [{ columnId: menu.columnId, values }])])}
        reset={() => updateFilters(filters.filter((filter) => filter.columnId !== menu.columnId))}
        changeSort={updateSort} changeHidden={updateHidden} />}
      {!visibleCols.length && <button type="button" className="sg-columns-restore" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onClick={(event) => openMenu(null, event.currentTarget)}>Столбцы ▾</button>}
      <span aria-hidden="true" className="pointer-events-none absolute text-[11px]" data-sg-row-number-measure="" ref={rowNumberMeasureRef}
        style={{ visibility: 'hidden', top: 0, left: 0, padding: 0, fontWeight: 400, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>0</span>
      <table className="w-full table-fixed border-separate border-spacing-0 text-[12px] text-[#172b4d]"
        // Native fixed table layout needs an explicit total: when all columns
        // become fixed, width:100% otherwise redistributes their widths. Keep
        // grow's declared minimum even when the remaining columns overflow.
        style={{
          width: columnOffsets[visibleCols.length],
          minWidth: !virtual && visibleCols.some((index) => columns[index].grow && widthOverrides[columns[index].id] === undefined) ? '100%' : undefined,
        }}>
        <colgroup>
          {showRowHeaders && <col style={{ width: gutterWidth }} />}
          {renderedColumns.map((entry) => {
            if (entry.index === null) return <col key={entry.key} style={{ width: entry.width }} />;
            const column = columns[entry.index];
            const width = widthOverrides[column.id];
            // A grow column absorbs the slack until the user pins an explicit width on it.
            return <col key={column.id} style={!virtual && width === undefined && column.grow ? undefined : { width: width ?? column.width }} />;
          })}
        </colgroup>
        {showColumnHeaders && <thead>
          {headerRows.map((headerRow, level) => (<tr key={level} style={{ height: 24 }}>
            {showRowHeaders && level === 0 && <th rowSpan={headerRows.length}
              className="sticky top-0 border-b border-l border-r border-t border-[#dfe1e6] bg-[#f7f8fa]"
              style={{ left: freezeRowHeader ? 0 : undefined, zIndex: freezeRowHeader ? 40 : 30,
                textAlign: rowSelectionMode ? 'left' : undefined, paddingLeft: rowSelectionMode ? 5 : undefined }}
            >
              <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
              {rowSelectionMode && (
                <input
                  ref={selectAllRowsRef}
                  aria-label={selectAllRowsLabel}
                  onKeyDown={(event) => event.stopPropagation()}
                  type="checkbox"
                  checked={visibleRowKeys.length > 0 && visibleSelectedCount === visibleRowKeys.length}
                  disabled={visibleRowKeys.length === 0}
                  style={{ width: 14, height: 14, margin: 0, verticalAlign: 'middle', accentColor: selectionColor, cursor: 'pointer' }}
                  onChange={(event) => { const next = new Set(selectedRows); visibleRowKeys.forEach((key) => event.target.checked ? next.add(key) : next.delete(key)); updateSelectedRows(presentRowKeys.filter((key) => next.has(key))); }}
                />
              )}
              {cornerContent&&<span data-sg-corner-content="" style={{display:'inline-flex',alignItems:'center'}} onMouseDown={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}>{cornerContent}</span>}
              </span>
            </th>}
            {headerRow.map((entry) => {
              if (entry.group) {
                const definition = entry.group.definition;
                const groupIcon = headerIconNode(definition.headerIcon, definition.headerIconPosition, definition.id);
                // A group fully inside the frozen pane sticks with it; one crossing
                // the boundary keeps scrolling (a half-stuck span would lie).
                const groupFrozen = frozenCount > 0 && entry.start !== undefined && entry.end !== undefined && entry.end <= frozenCount;
                return <th key={entry.key} colSpan={entry.colSpan} scope="colgroup"
                  className="sg-group-header" data-testid={`sg-group-header-${definition.id}`} data-sg-frozen-position={groupFrozen ? entry.start : undefined}
                  style={{ position: 'sticky', top: level * 24, zIndex: groupFrozen ? 32 : 30,
                    ...(groupFrozen ? { left: frozenLefts[entry.start!] } : {}) }}>
                  <span className="sg-column-header-content">
                    <span className="sg-column-title" title={definition.title}>
                      {definition.headerIconPosition === 'after' ? <>{definition.title}{groupIcon}</> : <>{groupIcon}{definition.title}</>}
                      {entry.width > 100 && groupToggle(entry.group, 'left')}
                    </span>
                    {groupToggle(entry.group)}
                  </span>
                </th>;
              }
              if (entry.index === null) return <th aria-hidden="true" key={entry.key} style={{ padding: 0, border: 0, background: '#f7f8fa', position: 'sticky', top: 0, zIndex: 30 }} />;
              const columnIndex = entry.index;
              const column = columns[columnIndex];
              const visibleIndex = visibleCols.indexOf(columnIndex);
              const prev = visibleIndex > 0 ? columns[visibleCols[visibleIndex - 1]] : null;
              const isLast = columnIndex === visibleCols[visibleCols.length - 1];
              const headerNav = navIndexOf(columnIndex);
              const headerSelected = headerNav >= 0 && selection !== null
                && headerNav >= selection.min.navIndex && headerNav <= selection.max.navIndex;
              // The grab zone straddles the border: 6px in this header + 6px in the
              // next one (sticky siblings would paint over a protruding handle, so
              // the right half of the previous border lives in this th).
              const resizeHandle = (targetId: string, targetTitle: string, side: 'left' | 'right', extraWidth: string) => (
                <div
                  aria-label={`Изменить ширину колонки ${targetTitle || targetId}`}
                  className={`absolute inset-y-0 ${side}-0 z-20 ${extraWidth} cursor-col-resize`}
                  data-resizing={resizingColumn === targetId ? 'true' : undefined}
                  data-testid={side === 'right' ? `sg-resize-${targetId}` : `sg-resize-${targetId}-left`}
                  onDoubleClick={(event) => { event.stopPropagation(); if (!reorderRef.current) resetColumnWidth(targetId); }}
                  onMouseDown={(event) => beginColumnResize(targetId, event)}
                  onPointerDown={event => { if (event.pointerType !== 'mouse') beginColumnResize(targetId, event); }}
                  onMouseEnter={(event) => { if (!reorderRef.current && event.buttons === 0) setHoveredResizeColumn(targetId); }}
                  onMouseLeave={() => setHoveredResizeColumn((previous) => previous === targetId ? null : previous)}
                  role="separator"
                  style={{ pointerEvents: reorder ? 'none' : undefined, touchAction: 'none' }}
                  title="Потяните, чтобы изменить ширину; двойной клик — исходная"
                />
              );
              const systemColumn = Boolean(column.render && !column.navigable);
              const headerFrozen = frozenCount > 0 && entry.start !== undefined && entry.start < frozenCount;
              return (
                <th
                  rowSpan={entry.rowSpan} scope="col"
                  className={`sticky top-0 ${systemColumn ? '' : 'cursor-grab'} border-b border-r border-t border-[#dfe1e6] px-1.5 text-[11px] font-semibold tracking-wide text-[#6b778c] ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                  data-sg-system={systemColumn ? '' : undefined}
                  data-column-index={columnIndex}
                  data-column-id={column.id}
                  data-sg-frozen-position={headerFrozen ? entry.start : undefined}
                  data-testid={`sg-colheader-${column.id}`}
                  key={column.id}
                  onMouseDown={(event) => beginColumnGrab(event, columnIndex)}
                  // Above the entire editing/fill-corner td stacking contexts (20/25),
                  // above frozen body cells (26), under the frozen corner (40).
                  style={{
                    top: level * 24,
                    ...(headerFrozen ? { left: frozenLefts[entry.start!] } : {}),
                    background: headerSelected ? selectionFill : '#f7f8fa',
                    borderBottom: headerSelected ? `1px solid ${selectionColor}` : undefined,
                    cursor: reorder?.kind === 'col' ? 'grabbing' : systemColumn ? 'default'
                      : headerSelected && columnSelection?.active === active && columnSelection.focus === focus ? 'grab' : 'cell',
                    zIndex: headerFrozen ? 32 : resizingColumn === column.id || hoveredResizeColumn === column.id ? 31 : 30,
                  }}
                >
                  <span className="sg-column-header-content">
                    <span className="sg-column-title" title={column.title}>
                      {(() => {
                        // A collapsed summary speaks for its group: it repeats the group's icon.
                        const summaryGroup = summaryGroups.get(column.id);
                        const icon = headerIconNode(summaryGroup ? summaryGroup.definition.headerIcon : column.headerIcon,
                          (summaryGroup ? summaryGroup.definition.headerIconPosition : column.headerIconPosition) ?? 'before', column.id);
                        const title = column.headerContent ?? column.title;
                        return (summaryGroup ? summaryGroup.definition.headerIconPosition : column.headerIconPosition) === 'after'
                          ? <>{title}{icon}</> : <>{icon}{title}</>;
                      })()}
                    </span>
                    {summaryGroups.has(column.id) ? groupToggle(summaryGroups.get(column.id)!) : <>
                    {appliedSort?.columnId === column.id && <span aria-label={appliedSort.direction === 'asc' ? 'По возрастанию' : 'По убыванию'}>{appliedSort.direction === 'asc' ? ' ↑' : ' ↓'}</span>}
                    {column.columnActions?.length ? <button type="button" className="sg-column-menu-button sg-column-actions-button" aria-label={`Действия столбца ${column.title || column.id}`} aria-haspopup="menu" aria-expanded={columnActionMenu?.columnId === column.id}
                      data-testid={`sg-actions-${column.id}`} title="Действия столбца"
                      onMouseDown={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
                      onClick={event => {event.stopPropagation(); const button = event.currentTarget; const rect = button.getBoundingClientRect(); setMenu(null); setColumnActionMenu(previous => previous?.columnId === column.id ? null : {columnId: column.id, button, x: rect.right - 200, y: rect.bottom + 4});}}><span aria-hidden="true">⋯</span></button> : <>                    <button type="button" className="sg-column-menu-button" aria-label={`Меню столбца ${column.title || column.id}`} aria-haspopup="dialog" aria-expanded={Boolean(menu && menu.columnId === column.id)}
                      data-testid={`sg-menu-${column.id}`} data-filtered={filters.some((filter) => filter.columnId === column.id) ? 'true' : undefined}
                      onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}
                      title={filters.some((filter) => filter.columnId === column.id) ? 'Фильтр применён — изменить или сбросить' : 'Сортировка и фильтр'}
                      onClick={(event) => { event.stopPropagation(); openMenu(column.id, event.currentTarget); }}>{filters.some((filter) => filter.columnId === column.id) ? <ColumnMenuIcon name="filter" size={14} /> : <span aria-hidden="true">▾</span>}</button></>}

                    </>}
                  </span>
                  {prev && prev.resizable !== false ? resizeHandle(prev.id, prev.title || prev.id, 'left', 'w-1.5') : null}
                  {column.resizable === false ? null : resizeHandle(column.id, column.title || column.id, 'right', isLast ? 'w-3' : 'w-1.5')}
                  {!reorder && column.resizable !== false && (resizingColumn === column.id || hoveredResizeColumn === column.id) && (
                    <div aria-hidden="true" data-testid={`sg-resize-marker-${column.id}`}
                      style={{ position: 'absolute', pointerEvents: 'none', top: '50%', right: -6, width: 10, height: 14,
                        transform: 'translateY(-50%)', display: 'flex', justifyContent: 'space-between', zIndex: 21 }}>
                      {[0, 1].map((bar) => <span key={bar} style={{ width: 2, height: '100%', borderRadius: 1,
                        background: resizingColumn === column.id ? '#4c9aff' : '#97a0af' }} />)}
                    </div>
                  )}
                  {reorderMarkOverlay(reorderMark('col', visibleCols.indexOf(columnIndex), visibleCols.length - 1))}
                </th>
              );
            })}
          </tr>))}
        </thead>}
          {(() => {
            const grouped = Boolean(renderRowDetails) && rowDetailsAppearance === 'raised' && !rowGroupKey;
            const RowContainer = grouped ? 'tbody' : Fragment;
            // A selection covering the whole sheet width (a row selection, Ctrl+A)
            // also paints the system (presentational) cells — Excel paints the
            // whole row; partial column ranges keep them untouched.
            const fullWidthSelection = selection !== null && selection.min.navIndex === 0 && selection.max.navIndex === navCols.length - 1;
            const bodyRows = renderedRows.map((entry) => {
              if (entry.index === null) return (
                <tr aria-hidden="true" key={entry.key} data-sg-row-spacer="">
                  <td colSpan={renderedColumns.length + Number(showRowHeaders)} style={{ height: entry.height, padding: 0, border: 0, lineHeight: 0, fontSize: 0 }} />
                </tr>
              );
              const rowIndex = entry.index;
              const row = rows[rowIndex];
              // A banner row renders as one full-width cell; it hosts no
              // editable cells; its gutter uses the ordinary row selection/reorder gesture.
              if (bannerKeys.has(rowKey(row))) return (
                <RowContainer key={rowKey(row)}><tr data-testid={`sg-row-${rowIndex}`} data-row-index={rowIndex} className="sg-row-banner" key={rowKey(row)}>
                  {showRowHeaders && <td data-testid={`sg-rowheader-${rowIndex}`} className={`${cellBase} border-l text-center text-[11px] text-[#6b778c]`}
                    onMouseDown={(event) => beginRowGrab(event, rowIndex)}
                    title={rowViewProjected||!allowRowReorder ? 'Перемещение строк недоступно при сортировке или фильтрации' : undefined}
                    style={{...rowHeaderStyle?.(row,sourceIndex(rowIndex)),background: selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row ? selectionFill : rowHeaderStyle?.(row,sourceIndex(rowIndex))?.background||'#f7f8fa',position: stickyRowBanners||freezeRowHeader ? 'sticky' : 'relative',top:stickyRowBanners?bannerTop:undefined,left: freezeRowHeader ? 0 : undefined,zIndex:stickyRowBanners?29: freezeRowHeader ? 28 : undefined,fontVariantNumeric: 'tabular-nums',cursor: reorder?.kind === 'row' ? 'grabbing' : 'cell'}}>
                    {rowHeaderLabel?rowHeaderLabel(row,sourceIndex(rowIndex)):rowIndex+1}
                    {reorderMarkOverlay(reorderMark('row', rowIndex, rows.length - 1))}
                  </td>}
                  <td colSpan={renderedColumns.length} style={{ padding: 0, border: 0, position: stickyRowBanners?'sticky':'relative',top:stickyRowBanners?bannerTop:undefined,zIndex:stickyRowBanners?28:undefined, '--sg-row-banner-left': `${freezeRowHeader ? gutterWidth : 0}px` } as CSSProperties}>
                    {rowBanner!(row, sourceIndex(rowIndex))}
                    {reorderMarkOverlay(reorderMark('row', rowIndex, rows.length - 1))}
                  </td>
                </tr></RowContainer>
              );
              const rowTint = rowFill?.(row, sourceIndex(rowIndex));
              const rowTintImage = rowTint ? `linear-gradient(${rowTint}, ${rowTint})` : undefined;
              const rowChecked = rowSelectionMode && selectedRows.has(rowKey(row));
              const canResizeRow = fullWidthSelection && gutterSelection?.active === active && gutterSelection.focus === focus
                && selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row;
              const details = renderRowDetails?.(row, sourceIndex(rowIndex));
              const hasDetails = details != null && details !== false;
              return (
            <RowContainer key={rowKey(row)} {...(grouped ? {'data-sg-row-surface':hasDetails ? 'raised' : 'flat'} : {})}>
            <tr {...rowAttributes?.(row, sourceIndex(rowIndex))} className={rowClassName?.(row, sourceIndex(rowIndex))}
              data-sg-row-drop={reorder?.rowTarget?.index === rowIndex && reorder.rowTarget.commit
                ? reorder.rowTarget.placement === 'end' ? 'after' : reorder.rowTarget.placement : undefined}
              data-sg-row-dragging={reorder?.kind === 'row' && reorder.fromStart === rowIndex ? '' : undefined}
              data-sg-row-expanded={hasDetails ? rowDetailsAppearance : undefined} data-testid={`sg-row-${rowIndex}`} data-row-index={rowIndex} aria-rowindex={virtual || visibleRowIndices ? rowIndex + 1 + Number(showColumnHeaders) : undefined} key={rowKey(row)}
              style={{ height: getRowHeight(rowKey(row)), ...(virtual ? { '--sg-row-height': `${getRowHeight(rowKey(row)) - 1}px` } : {}) } as CSSProperties}>
              {showRowHeaders && <td
                className={`${cellBase} cursor-grab border-l text-center text-[11px] text-[#6b778c]`}
                data-testid={`sg-rowheader-${rowIndex}`}
                onContextMenu={allowRowInsert ? (event) => { event.preventDefault(); event.stopPropagation(); openRowMenu(rowIndex, event.clientX, event.clientY); } : undefined}
                onMouseDown={(event) => beginRowGrab(event, rowIndex)}
                onPointerDown={event => {
                  if (event.pointerType !== 'mouse' && event.target instanceof Element
                    && event.target.closest('[data-sg-row-drag-handle]')) beginRowGrab(event, rowIndex, event.pointerId);
                }}
                title={rowViewProjected||!allowRowReorder ? 'Перемещение строк недоступно при сортировке или фильтрации' : undefined}
                style={{
                  ...rowHeaderStyle?.(row,sourceIndex(rowIndex)),
                  fontVariantNumeric: 'tabular-nums',
                  background: rowChecked || (selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row) ? selectionFill : rowHeaderStyle?.(row,sourceIndex(rowIndex))?.background||'#f7f8fa',
                  cursor: rowSelectionMode ? 'default' : reorder?.kind === 'row' ? 'grabbing'
                    : canResizeRow && !readOnly && !projected ? 'grab' : 'cell',
                  borderRight: selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row ? `1px solid ${selectionColor}` : undefined,
                  position: freezeRowHeader ? 'sticky' : 'relative',
                  left: freezeRowHeader ? 0 : undefined,
                  // Cover editors/fill handles (20/25), but stay under column headers (30).
                  zIndex: canResizeRow ? 29 : freezeRowHeader ? 28 : undefined,
                }}
              >
                <span className="flex h-full items-center justify-center"
                  style={rowSelectionMode ? { justifyContent: 'flex-start', paddingLeft: 5 } : undefined}>
                  {rowSelectionMode && (
                    <input
                      aria-label={rowSelectionLabel?.(row, sourceIndex(rowIndex))
                        ?? `Выбрать строку ${rowIndex + 1}`}
                      onMouseDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      checked={rowChecked}
                      type="checkbox"
                      style={{ width: 14, height: 14, margin: '0 8px 0 0', accentColor: selectionColor, cursor: 'pointer', flexShrink: 0 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSelectedRow(rowIndex, event.currentTarget.checked, event.shiftKey);
                      }}
                      onChange={() => {}}
                    />
                  )}
                  <span>{rowHeaderLabel?rowHeaderLabel(row,sourceIndex(rowIndex)):rowIndex+1}</span>
                </span>
                {canResizeRow && rowIndex === selection?.max.row && <div className="sg-row-resize" data-testid={`sg-row-resize-${rowIndex}`} title="Потяните для изменения высоты выделенных строк; двойной клик — сброс"
                  data-resizing={heightPreview?.keys.has(rowKey(row)) ? 'true' : undefined}
                  onMouseDown={(event) => beginRowResize(event, rowIndex)}
                  onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); resetSelectedRowHeights(rowIndex); }}>
                  <span /><span />
                </div>}
                {reorderMarkOverlay(reorderMark('row', rowIndex, rows.length - 1))}
              </td>}
              {renderedColumns.map((columnEntry) => {
                if (columnEntry.index === null) return <td aria-hidden="true" key={columnEntry.key} style={{ padding: 0, border: 0 }} />;
                const columnIndex = columnEntry.index;
                const column = columns[columnIndex];
                // A covered cell renders as part of its merged anchor (rowSpan/colSpan live on the anchor td).
                if (merges.covered.has(`${rowIndex}:${columnIndex}`)) return null;
                const span = merges.anchors.get(`${rowIndex}:${columnIndex}`);
                const navIndex = navIndexOf(columnIndex);
                const isActive = navIndex >= 0 && active?.row === rowIndex && active?.navIndex === navIndex;
                const isEditing = isActive && editing;
                const rowSpan = span?.rowSpan ?? 1;
                const colSpan = span?.colSpan ?? 1;
                // A merged anchor crossing the frozen boundary keeps scrolling:
                // a half-stuck span would cover the scrolling sheet.
                const visiblePosition = visibleCols.indexOf(columnIndex);
                const mergeCrossesFreeze = visiblePosition >= 0 && visiblePosition < frozenCount
                  && visiblePosition + colSpan - 1 >= frozenCount;
                const frozenCell = visiblePosition >= 0 && visiblePosition < frozenCount && !mergeCrossesFreeze;
                const selected = navIndex >= 0
                  ? !isActive && inSelection(rowIndex, navIndex)
                  // A system cell paints only when the selection covers the whole width.
                  : fullWidthSelection && selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row;
                const inRange = !selected && !isActive ? false : inSelection(rowIndex, navIndex);
                const inFillTarget = !inRange && fillTarget !== null
                  && rowIndex >= fillTarget.min.row && rowIndex <= fillTarget.max.row
                  && navIndex >= fillTarget.min.navIndex && navIndex <= fillTarget.max.navIndex;
                const isFillCorner = !readOnly && !isEditing && selection !== null
                  && rowIndex === selection.max.row && navIndex === selection.max.navIndex;
                // Excel draws one solid line around the whole range. The line is an
                // absolutely positioned overlay inside the perimeter cells, so
                // the first row's top edge cannot be covered by the sticky header.
                // Inner joins span the grid lines to keep range edges continuous;
                // a real td border would change the content box and row height.
                const frameEdges = (range: CellRange, width: string, kind: 'solid' | 'dashed'): CSSProperties => ({
                  top: rowIndex === range.min.row ? 0 : -1,
                  left: navIndex === range.min.navIndex ? 0 : -1,
                  right: navIndex === range.max.navIndex ? 0 : -1,
                  bottom: rowIndex === range.max.row ? 0 : -1,
                  borderTop: rowIndex === range.min.row ? `${width} ${kind} ${selectionColor}` : undefined,
                  borderBottom: rowIndex === range.max.row ? `${width} ${kind} ${selectionColor}` : undefined,
                  borderLeft: navIndex === range.min.navIndex ? `${width} ${kind} ${selectionColor}` : undefined,
                  borderRight: navIndex === range.max.navIndex ? `${width} ${kind} ${selectionColor}` : undefined,
                });
                const value = column.getValue?.(row) ?? '';
                // Mini-formulas: the display (and copy/validation) sees the
                // evaluated value; the editor and storage keep the raw «=…» text.
                const display = column.kind !== 'checkbox' && value.startsWith('=') && value.length > 1
                  ? evaluator(rowIndex, columnIndex)
                  : value;
                const invalid = !isEditing && validateGridValue(column.validation, display);
                const isList = column.validation?.type === 'list';
                const isCheckbox = column.kind === 'checkbox';
                const isSkeletonCell = !isCheckbox && (column.isSkeleton?.(row, sourceIndex(rowIndex)) ?? false);
                const isNumber = column.kind === 'number' || column.validation?.type === 'number';
                const maxLines = column.maxLines ?? 1;
                const wrapped = column.wrap === true || column.allowLineBreak === true;
                const Editor = column.editor ?? (column.kind === 'multiselect'
                  ? SimpleGridMultiSelectEditor
                  : column.kind === 'autocomplete' || isList ? SimpleGridAutocompleteEditor : SimpleGridTextEditor);
                // The in-place editor text must sit exactly where the display text
                // sits: same paddings (px-2, or pl-2/pr-7 under a chevron), same
                // line metrics — minus the ellipsis/clamp, so the caret and the
                // whole value stay visible while editing.
                // Right pad reserves room for the chevron; the left pad (4px) must
                // always match the display span or the text jumps sideways on edit.
                // Vertically both anchor to the first line (span padding-top 3,
                // ~14px line): the chevron button is h-5 at top-0 so its glyph
                // lands on that line instead of floating mid-cell.
                const hasCalendar = (typeof column.datePicker === 'function' ? column.datePicker(row) : !!column.datePicker) && !column.render && cellEditable(columnIndex, rowIndex);
                const gutterPad = column.chevron || hasCalendar ? 26 : 4;
                // View-mode cell icon: static node or per-row factory; custom
                // renders, chips and checkboxes style themselves.
                const cellIcon = !column.icon || column.render || column.renderValue
                  || column.kind === 'multiselect' || column.kind === 'checkbox' ? null
                  : typeof column.icon === 'function' ? column.icon(row, sourceIndex(rowIndex)) : column.icon;
                const cellIconNode = cellIcon ? (
                  <span aria-hidden="true" className="sg-cell-icon" data-testid={`sg-cell-icon-${rowIndex}-${column.id}`}
                    style={column.iconPosition === 'after' ? { marginLeft: SG_CELL_ICON_GAP } : { marginRight: SG_CELL_ICON_GAP }}>{cellIcon}</span>
                ) : null;
                // While editing the icon is hidden, so the editor reserves its
                // box: leading icon shifts the text right by 18px; a trailing
                // icon matters only for right-aligned columns (eats the right pad).
                const iconPadLeft = cellIconNode && column.iconPosition !== 'after' ? SG_CELL_ICON_WIDTH + SG_CELL_ICON_GAP : 0;
                const iconPadRight = cellIconNode && column.iconPosition === 'after' && column.align === 'right' ? SG_CELL_ICON_WIDTH + SG_CELL_ICON_GAP : 0;
                const editingTextStyle: CSSProperties = wrapped
                  ? { lineHeight: '15px', overflowWrap: 'anywhere', padding: `3px 4px`, paddingLeft: 4 + iconPadLeft, paddingRight: gutterPad + iconPadRight, whiteSpace: 'pre-wrap' }
                  : maxLines > 1
                    ? { lineHeight: '14px', overflowWrap: 'anywhere', padding: `2px 4px`, paddingLeft: 4 + iconPadLeft, paddingRight: gutterPad + iconPadRight, whiteSpace: 'pre-wrap' }
                    : { height: '100%', overflow: 'hidden', padding: `3px 4px`, paddingLeft: 4 + iconPadLeft, paddingRight: gutterPad + iconPadRight, whiteSpace: 'nowrap' };
                const candidates = isList
                  ? (column.validation as { options: string[] }).options.map((option) => ({ value: option, label: option }))
                  : column.getCandidates?.() ?? [];
                const cellNotes = cellComments?.(row, column.id) ?? [];
                const hasCellNotes = cellNotes.length > 0;
                const commentTarget: SimpleGridCommentTarget<T> = {
                  row, rowKey: rowKey(row), columnId: column.id, columnTitle: column.title, value: column.getValue?.(row) ?? '',
                };
                return (
                  <td
                    className={cellBase}
                    colSpan={span?.colSpan}
                    data-active={isActive ? 'true' : undefined}
                    data-editing={isEditing ? 'true' : undefined}
                    data-comment={hasCellNotes ? '' : undefined}
                    data-comment-row={hasCellNotes ? rowKey(row) : undefined}
                    data-comment-column={hasCellNotes ? column.id : undefined}
                    data-selected={selected ? 'true' : undefined}
                    data-fill-target={inFillTarget ? 'true' : undefined}
                    data-invalid={invalid ? 'true' : undefined}
                    data-calendar={hasCalendar ? 'true' : undefined}
                    data-testid={`sg-cell-${rowIndex}-${column.id}`}
                    data-column-id={column.id}
                    data-sg-align={column.align}
                    data-sg-frozen-position={frozenCell ? visiblePosition : undefined}
                    aria-colindex={virtual ? visibleCols.indexOf(columnIndex) + 1 + Number(showRowHeaders) : undefined}
                    key={frozenCell ? `${column.id}:${rowIndex}` : column.id}
                    onDoubleClick={(event) => handleCellDoubleClick(rowIndex, navIndex, event.clientX, event.clientY)}
                    onClick={(event) => handleCellClick(event, rowIndex, navIndex)}
                    onMouseDown={(event) => handleCellMouseDown(event, rowIndex, navIndex)}
                    onContextMenu={(event) => {
                      if (!contextMenu || navIndex < 0 || editing) return;
                      event.preventDefault(); event.stopPropagation();
                      openCellMenu(rowIndex, navIndex, event.clientX, event.clientY);
                    }}
                    onMouseOver={() => handleCellMouseOver(rowIndex, navIndex)}
                    rowSpan={span?.rowSpan}
                    style={{
                      background: `${rowTintImage ? rowTintImage + ' ' : ''}${selected || (rowChecked && !isActive) ? selectionFill : '#fff'}`,
                      cursor: isEditing ? 'text' : undefined,
                      position: frozenCell ? 'sticky' : 'relative',
                      ...(frozenCell ? { left: frozenLefts[visiblePosition] } : {}),
                      textAlign: column.align ?? 'left',
                      // Values anchor to the top edge: text top-left, numbers top-right.
                      verticalAlign: 'top',
                      scrollMarginLeft: freezeRowHeader ? gutterWidth : undefined,
                      // Keep scrolling cells and their selection overlays in a lower
                      // stacking context than frozen cells, so a range frame cannot
                      // paint over the pinned pane. Editors/fill handles stay above
                      // the sheet; frozen cells still cover the scrolling sheet.
                      zIndex: isEditing ? (frozenCell ? 27 : 20) : isFillCorner ? (frozenCell ? 27 : 25) : frozenCell ? 26 : 0,
                    }}
                  >
                    {column.render ? column.render(row, sourceIndex(rowIndex)) : isCheckbox ? (
                      <label
                        className="flex h-full cursor-pointer items-center px-1.5"
                        data-sg-checkbox=""
                        data-testid={`sg-checkbox-${rowIndex}-${column.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          aria-label={column.title || column.id}
                          checked={isGridCheckboxChecked(value)}
                          className="h-3.5 w-3.5 cursor-pointer accent-[#217346]"
                          disabled={!column.setValue || column.readOnly || readOnly || cellLocked(row, sourceIndex(rowIndex), column) || undefined}
                          onChange={(event) => applyValue({ row: rowIndex, navIndex }, event.target.checked ? 'TRUE' : 'FALSE')}
                          type="checkbox"
                        />
                      </label>
                    ) : isSkeletonCell ? (
                      <span aria-hidden="true" className="sg-skeleton" data-testid={`sg-skeleton-${rowIndex}-${column.id}`}/>
                    ) : isEditing ? (
                      <>
                        <Editor
                          align={column.align}
                          displayValue={column.selectOnly ? column.renderValue?.(row, sourceIndex(rowIndex), () => {}) : undefined}
                          alwaysOpen={isList || Boolean(column.openOnActivate)}
                          applyDraft={(next) => { setSearchStarted(true); setDraft(isNumber ? canonicalGridDecimal(next) : next); if (active) applyValue(active, next, true); }}
                          cancel={() => { cancelEdit(); focusGrid(); }}
                          allowLineBreak={column.allowLineBreak===true&&!isNumber}
                          caretAt={caretRequestRef.current}
                          candidates={candidates}
                          chipCandidates={candidates}
                          commit={(override) => { if (commitEdit(override)) focusGrid(); }}
                          commitAndMove={(override, direction = 'right') => {
                            if (!commitEdit(override)) return;
                            if (direction === 'right') moveHorizontal(1, true);
                            else if (direction === 'left') moveHorizontal(-1, true);
                            else if (direction === 'up') applyMove(active.row - 1, active.navIndex);
                            else applyMove(active.row + 1, active.navIndex);
                          }}
                          editorData={column.editorData}
                          highlightMatches={column.highlightMatches !== false && searchStarted}
                          inputMode={isNumber ? 'decimal' : 'text'}
                          menuMaxHeight={column.menuRows ? column.menuRows * SG_OPTION_HEIGHT : undefined}
                          menuWidth={column.grow ? widthOverrides[column.id] : widthOverrides[column.id] ?? column.width}
                          move={moveActive}
                          onChange={(next) => { setSearchStarted(true); setDraft(isNumber ? canonicalGridDecimal(next) : next); setEditError(null); }}
                          placeholder={column.placeholder}
                          row={row}
                          rowIndex={sourceIndex(rowIndex)}
                          selectOnly={column.selectOnly}
                          textStyle={{ ...editingTextStyle, ...column.editorStyle?.(row) }}
                          value={draft}
                        />
                      </>
                    ) : column.renderValue ? (
                      column.renderValue(row, sourceIndex(rowIndex), () => startEditingAt(rowIndex, navIndex))
                    ) : column.kind === 'multiselect' ? (
                      <SimpleGridChipDisplay
                        candidates={candidates}
                        onRemove={!column.chipsOnly && column.setValue && !column.readOnly && !readOnly && !cellLocked(row, sourceIndex(rowIndex), column)
                          ? (item) => applyValue({ row: rowIndex, navIndex }, serializeGridMultiValue(parseGridMultiValue(value).filter((selectedItem) => selectedItem !== item)))
                          : undefined}
                        readOnly={column.chipsOnly || column.readOnly || readOnly || cellLocked(row, sourceIndex(rowIndex), column)}
                        value={display}
                      />
                    ) : (
                      <span
                        className={`block ${wrapped ? '' : 'h-full overflow-hidden'} ${column.chevron ? 'pl-1 pr-[26px]' : 'px-1'}`}
                        data-testid={`sg-display-${rowIndex}-${column.id}`}
                        style={wrapped ? {
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                          lineHeight: '15px',
                          paddingTop: 3,
                          paddingBottom: 3,
                        } : maxLines > 1 ? {
                          display: '-webkit-box',
                          WebkitLineClamp: maxLines,
                          WebkitBoxOrient: 'vertical',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                          lineHeight: '14px',
                          paddingTop: 2,
                          paddingBottom: 2,
                        } : {
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          paddingTop: 3,
                          paddingBottom: 3,
                        }}
                        title={display || undefined}
                      >
                        {cellIconNode && column.iconPosition !== 'after' && cellIconNode}
                        {formatGridValue(column.format, display)}
                        {cellIconNode && column.iconPosition === 'after' && cellIconNode}
                      </span>
                    )}
                    {hasCellNotes && !isEditing && <CommentMarker comments={cellNotes} target={commentTarget}
                      testId={`sg-comment-marker-${rowIndex}-${column.id}`} onOpen={onCellCommentOpen}/>}
                    {hasCalendar && <CellDatePicker value={isEditing ? draft : display} title={column.title}
                      context={column.getDatePickerContext?.(row)}
                      min={column.validation?.type === 'date' ? column.validation.min : undefined}
                      max={column.validation?.type === 'date' ? column.validation.max : undefined}
                      beforeOpen={() => {
                        if (editing && !commitEdit()) return false;
                        setActive({ row: rowIndex, navIndex }); setFocus({ row: rowIndex, navIndex });
                        return true;
                      }}
                      onPick={next => {
                        const error = validateGridValue(column.validation, next);
                        if (error) { setEditError(error); return; }
                        applyValue({ row: rowIndex, navIndex }, next);
                      }} onClose={focusGrid}/>}
                    {!hasCalendar && !isEditing && !column.render && column.chevron && (
                      <button
                        aria-label="Открыть список"
                        className="absolute right-0.5 top-0 grid h-5 w-5 cursor-pointer place-items-center rounded p-0 text-[#98a2b3] hover:bg-[#f1f3f6] hover:text-[#6b778c]"
                        data-testid={`sg-chevron-${rowIndex}-${column.id}`}
                        onClick={(event) => { event.stopPropagation(); startEditingAt(rowIndex, navIndex); }}
                        onMouseDown={(event) => event.stopPropagation()}
                        type="button"
                      >
                        <ChevronDownIcon />
                      </button>
                    )}
                    {isActive && editError && (
                      <div
                        className="absolute left-0 top-full z-40 mt-0.5 w-max max-w-[260px] rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 shadow-sm"
                        data-testid="sg-error"
                        role="alert"
                      >
                        {editError}
                      </div>
                    )}
                    {invalid && (
                      <span
                        className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[7px] border-t-[7px] border-l-transparent border-t-red-500"
                        data-testid={`sg-invalid-${rowIndex}-${column.id}`}
                        style={hasCellNotes ? { right: 10 } : undefined}
                        title={invalid}
                      />
                    )}
                    {isFillCorner && (
                      <div
                        aria-hidden="true"
                        className="absolute z-30 h-[7px] w-[7px] cursor-crosshair"
                        data-testid={`sg-fill-${rowIndex}-${column.id}`}
                        // The click must not collapse the selection to the corner cell.
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={beginFillDrag}
                        style={{ background: selectionColor, border: '1px solid #fff', right: -3, bottom: -3 }}
                      />
                    )}
                    {inRange && selection && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute"
                        data-testid={`sg-frame-${rowIndex}-${column.id}`}
                        // Above cell backgrounds; the sticky header also covers the parent td's layer.
                        style={{ ...frameEdges(selection, '1px', 'solid'), zIndex: 1 }}
                      />
                    )}
                    {inFillTarget && fillTarget && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute"
                        data-testid={`sg-marquee-${rowIndex}-${column.id}`}
                        style={{ ...frameEdges(fillTarget, '1px', 'dashed'), zIndex: 1 }}
                      />
                    )}
                    {copiedRange && navIndex >= 0
                      && rowIndex <= copiedRange.max.row && rowIndex + rowSpan - 1 >= copiedRange.min.row
                      && navIndex <= copiedRange.max.navIndex && navIndex + colSpan - 1 >= copiedRange.min.navIndex && (
                      <div
                        aria-hidden="true"
                        className="sg-copy-marquee pointer-events-none absolute"
                        data-testid={`sg-copy-${rowIndex}-${column.id}`}
                        style={{
                          top: rowIndex <= copiedRange.min.row ? 0 : -1,
                          left: navIndex <= copiedRange.min.navIndex ? 0 : -1,
                          right: navIndex + colSpan - 1 >= copiedRange.max.navIndex ? 0 : -1,
                          bottom: rowIndex + rowSpan - 1 >= copiedRange.max.row ? 0 : -1,
                          '--sg-copy-color': selectionColor,
                          '--sg-copy-top': rowIndex <= copiedRange.min.row ? '1px' : '0px',
                          '--sg-copy-bottom': rowIndex + rowSpan - 1 >= copiedRange.max.row ? '1px' : '0px',
                          '--sg-copy-left': navIndex <= copiedRange.min.navIndex ? '1px' : '0px',
                          '--sg-copy-right': navIndex + colSpan - 1 >= copiedRange.max.navIndex ? '1px' : '0px',
                          zIndex: 1,
                        } as CSSProperties}
                      />
                    )}
                    {reorderMarkOverlay(reorderMark('col', visibleCols.indexOf(columnIndex), visibleCols.length - 1))}
                    {reorderMarkOverlay(reorderMark('row', rowIndex, rows.length - 1))}
                  </td>
                );
              })}
            </tr>
            {hasDetails && <tr data-sg-row-details="" data-sg-details-appearance={rowDetailsAppearance} data-parent-row-key={rowKey(row)}>
              <td colSpan={renderedColumns.length + Number(showRowHeaders)} style={{padding:0,border:0}}>
                <div data-sg-details-content="" style={{cursor:'default',userSelect:'text'}}
                  onMouseDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}
                  onContextMenu={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}
                  onCopy={event=>event.stopPropagation()} onCut={event=>event.stopPropagation()}
                  onPaste={event=>event.stopPropagation()} onBlur={event=>event.stopPropagation()}>
                  {details}
                </div>
              </td>
            </tr>}
            </RowContainer>
            );
            });
            if(rowGroupKey){
              const bodies:{id:string|undefined;nodes:ReactNode[]}[]=[];
              bodyRows.forEach((node,index)=>{const entry=renderedRows[index];const id=entry.index===null?undefined:rowGroupKey(rows[entry.index]);let body=bodies[bodies.length-1];if(!body||body.id!==id){body={id,nodes:[]};bodies.push(body);}body.nodes.push(node);});
              return bodies.map((body,index)=><tbody key={`${body.id||'ungrouped'}:${index}`} data-sg-outline-group={body.id}>{body.nodes}</tbody>);
            }
            return grouped ? bodyRows : <tbody>{bodyRows}</tbody>;
          })()}
      </table>
    </div>
  );
}

/** An anchored multi-row grid, also used by collapsed groups for their single-row editor. */
export function SimpleGridCellTable<T>({title, anchor, rows, columns, rowKey, createRow, onChange, onEditPreview, onColumnWidthsChange, defaultColumnWidths, onClose, readOnly, showRowHeaders = false, rowHeaderLabel, allowRowReorder, onRowReorder, selectionColor = "#1E68F5", selectionFill = "#eef4ff", footer, initialEdit, initialFocus}: SimpleGridCellTableProps<T>) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [position, setPosition] = useState({left: 8, top: 8});
  useLayoutEffect(() => {
    const place = () => {
      if (!anchor.isConnected) { closeRef.current(); return; }
      const rect = anchor.getBoundingClientRect();
      // Measure the actual nested table: resizing its columns also resizes the dropdown.
      const width = panel.current?.getBoundingClientRect().width || columns.reduce((sum, column) => sum + column.width, 0);
      const height = panel.current?.getBoundingClientRect().height || 48;
      const below = rect.bottom;
      const top = below + height <= window.innerHeight - 8 ? below : Math.max(8, rect.top - height);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setPosition((previous) => previous.left === left && previous.top === top ? previous : {left, top});
    };
    place();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    const table = panel.current?.querySelector('table');
    if (table) observer?.observe(table);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => { observer?.disconnect(); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [anchor, columns]);
  useEffect(() => {
    if (!initialEdit && !initialFocus) panel.current?.focus();
    const outside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || panel.current?.contains(target) || anchor.contains(target) || target.closest('[data-sg-portal]')) return;
      // Blur commits the focused editor before the strip is removed.
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && panel.current?.contains(focused)) focused.blur();
      closeRef.current();
    };
    document.addEventListener('click', outside);
    return () => document.removeEventListener('click', outside);
  }, [anchor, initialEdit, initialFocus]);
  return createPortal(<div ref={panel} data-sg-portal="" data-testid="sg-group-row-editor" data-single-row={rows.length<=1?true:undefined}
    className="sg-group-row-editor" role="group" aria-label={`${title}: редактирование таблицы`} tabIndex={-1} style={{...position,font:window.getComputedStyle(anchor).font}}
    onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}
    onCopy={(event) => event.stopPropagation()} onCut={(event) => event.stopPropagation()} onPaste={(event) => event.stopPropagation()}
    onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); } }}>
    <div className="sg-group-row-editor-scroll"><SimpleGrid rows={rows} columns={columns} rowKey={rowKey} createRow={createRow} onChange={onChange}
      onEditPreview={onEditPreview} onColumnWidthsChange={onColumnWidthsChange} defaultColumnWidths={defaultColumnWidths}
      initialEdit={initialEdit} initialFocus={initialFocus}
      showRowHeaders={showRowHeaders} rowHeaderLabel={rowHeaderLabel} allowRowReorder={allowRowReorder} onRowReorder={onRowReorder} rowHeight={30} readOnly={readOnly} selectionColor={selectionColor} selectionFill={selectionFill} ariaLabel={`${title}: поля строки`}/></div>
    {footer && <div className="sg-cell-table-footer">{footer}</div>}
  </div>, document.body);
}
