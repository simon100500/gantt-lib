// START_MODULE_CONTRACT
//   PURPOSE: Public type surface of the library: columns, nested collapsible groups with summary columns, props, editor props, validation rules and display formats.
//   SCOPE: Type declarations only, no runtime code; consumed by every other module and re-exported by M-GRID-BARREL.
//   DEPENDS: none
//   LINKS: M-GRID-BARREL, M-GRID-RUNTIME, M-GRID-EDITORS, V-M-GRID-TYPES
//   ROLE: TYPES
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT
//
// START_MODULE_MAP
//   Outline props - rowGroupKey, collapsedRowGroupKeys, stickyRowBanners, rowHeaderLabel/Style, allowRowReorder/onRowReorder
//   SimpleGridOption - autocomplete option shape (value, label, hint, icon)
//   SimpleGridEditorProps - props contract every custom cell editor receives, including chipCandidates for multiselect
//   SimpleGridValidation - per-column validation rule union (number, date, required, custom)
//   SimpleGridFormat - per-column display format union (date, number)
//   SimpleGridColumn - columnActions provides host-defined trailing header menu actions; column definition: id, title, width, kind, validation, accessors, header/cell icons, opt-in datePicker
//   SimpleGridColumnGroup - nested collapsible headers with a summary column (opt-in writable via setValue)
//   SimpleGridMerge - rectangular merged-cell range: anchor (row, col) plus rowSpan/colSpan
//   SimpleGridProps - top-level props including host-controlled inline renderRowDetails
//   SimpleGridViewState - stable viewport anchor and selection for tab navigation
//   SimpleGridColumnFilter - selected evaluated values for one column
//   SimpleGridSort - stable single-column sort direction
//   SimpleGridContextMenuContext / SimpleGridContextMenuItem - cell menu target, selection and custom actions
//   SimpleGridCellComment / SimpleGridCommentTarget - host-owned cell notes rendered as a corner marker with a hover card
//   SimpleGridCellComment - one host-owned cell note shown by the marker and hover card
//   SimpleGridCommentTarget - cell address passed to comment callbacks, including the anchor element
// END_MODULE_MAP

import type { ComponentType, CSSProperties, ReactNode } from 'react';

export interface SimpleGridOption {
  value: string;
  label: string;
  /** Secondary text (e.g. a unit) shown right-aligned in grey. */
  hint?: string;
  /** Optional leading icon in the menu and selected editor value; the editor reserves text space. */
  icon?: ReactNode;
}

/** Contract for a custom cell editor. The sheet owns the draft; the editor only reports changes. */
export interface SimpleGridEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Commit the draft (optionally an override) without moving. Used by suggestion picking. */
  commit: (value?: string) => void;
  /** Commit the draft and move in one grid operation (Tab selects the highlighted suggestion). */
  commitAndMove?: (value?: string, direction?: 'up' | 'down' | 'left' | 'right') => void;
  /** Move the active cell without committing (e.g. Enter on an unchanged derived cell). */
  move?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  /** Apply the draft to the row immediately (live) without closing; Esc restores the row. */
  applyDraft?: (value: string) => void;
  /** Abandon the edit. */
  cancel: () => void;
  /** The whole row being edited (custom editors cast it to their row type). */
  row?: unknown;
  rowIndex?: number;
  /** The column's `editorData`, passed through untouched. */
  editorData?: unknown;
  align?: 'left' | 'center' | 'right';
  placeholder?: string;
  inputMode?: 'text' | 'decimal';
  /** Allow Alt+Enter to insert a newline in the built-in text editor. */
  allowLineBreak?: boolean;
  /** Full candidate set; the built-in autocomplete editor ranks it against `value`. */
  candidates?: SimpleGridOption[];
  /** A strict list opens on activation, not only while typing (and filters exactly, not fuzzily). */
  alwaysOpen?: boolean;
  /** Strict dropdown: no free-text input, only picking from the list. */
  selectOnly?: boolean;
  /** Highlight matching text in suggestions (default true); strict dropdowns never highlight search matches. */
  highlightMatches?: boolean;
  /** Pixel height of the dropdown before it scrolls. */
  menuMaxHeight?: number;
  /** Dropdown width in pixels; when omitted the editor uses the measured cell width (a `grow` column). */
  menuWidth?: number;
  /**
   * Inline styles that put the edited text exactly where the display text sits
   * (paddings, line height, wrapping). The built-in in-place editors apply
   * them to their editable element; custom editors may ignore them.
   */
  textStyle?: CSSProperties;
  /** Existing cell rendering, retained by strict dropdowns until a choice is committed. */
  displayValue?: ReactNode;
  /**
   * Viewport point to place the caret at on mount (double-click edit). Null or
   * undefined means "caret at the end of the text" (typing, Enter, F2, chevron).
   */
  caretAt?: { x: number; y: number } | null;
  /** Labels available to the built-in multi-select editor. */
  chipCandidates?: SimpleGridOption[];
}

/** Excel-style data validation rule. An empty value is always accepted. */
export type SimpleGridValidation =
  | { type: 'text'; maxLength?: number }
  | { type: 'number'; min?: number; max?: number; integer?: boolean }
  | { type: 'date'; min?: string; max?: string }
  | { type: 'list'; options: string[]; allowCustom?: boolean };

/** Display format; the stored value stays raw text (ISO for dates). */
export type SimpleGridFormat =
  | { kind: 'number'; decimals?: number; thousands?: boolean }
  | { kind: 'date'; pattern?: 'dd.MM.yyyy' };

/** Related dates shown as context while picking a single cell value. */
export interface SimpleGridDatePickerContext {
  /** Month to open when the edited cell is empty or invalid. Existing cell dates take priority. */
  initialDate?: string;
  range?: { start?: string; end?: string; startLabel?: string; endLabel?: string };
  markers?: { value: string; label: string }[];
  footer?: ReactNode;
  duration?: { days: number; businessDays?: boolean; linked: boolean; onToggle?: () => void };
  fixedDateEdit?: { title: string; validate: (date: string) => string | undefined };
  pinAction?: { label: string; run: () => void };
  shiftDate?: (iso: string, days: number) => string;
  isWeekend?: (iso: string) => boolean;
}

export interface SimpleGridColumn<T> {
  id: string;
  title: string;
  /** Host-defined column actions; replaces the filter trigger with a compact trailing ellipsis menu. */
  columnActions?: {id: string; label: string; icon?: ReactNode; disabled?: boolean; danger?: boolean; onSelect: () => void | Promise<void>}[];
  /** Иконка в заголовке рядом с названием (замок, подсказка, статус). */
  headerIcon?: ReactNode;
  /** Позиция headerIcon: 'before' (по умолчанию) или 'after' текста заголовка. */
  headerIconPosition?: 'before' | 'after';
  width: number;
  align?: 'left' | 'center' | 'right';
  headerContent?: ReactNode;
  minWidth?: number;
  editorStyle?: (row: T) => CSSProperties;
  placeholder?: string;
  /** Display lines inside the cell (2 enables a two-line clamp; editing stays single-line). */
  maxLines?: number;
  /** Show the whole value wrapped over as many lines as needed and let the row grow to fit. Takes precedence over `maxLines`. */
  wrap?: boolean;
  /** Allow Alt+Enter to insert a newline while editing this text column. */
  allowLineBreak?: boolean;
  /** Absorb the table's leftover width: every other column (and the row-number gutter) keeps its exact `width`. Mark the long text column. */
  grow?: boolean;
  /** Whole column is not editable (still navigable). */
  readOnly?: boolean;
  /** The header drag-handle is hidden for this column; the width stays fixed. */
  resizable?: boolean;
  /** Enter on this column jumps to the first cell of the next row (the «Кол-во → Материал» habit). */
  enterToRowStart?: boolean;
  /** Built-in cell mode: text, number, autocomplete or a checkbox (a live input toggled without an editor). */
  kind?: 'text' | 'number' | 'autocomplete' | 'multiselect' | 'checkbox';
  /** Render a multiselect value as static chips: no dropdown editor, remove buttons, or grid mutations. */
  chipsOnly?: boolean;
  getValue?: (row: T) => string;
  setValue?: (row: T, value: string, source?: 'editor') => T;
  /** A plain click on the cell, independent of its editing behavior. */
  onCellClick?: (row: T) => void;
  /** Per-row lock (a catalog unit is owned by the catalog, not typed). */
  isDisabled?: (row: T, rowIndex: number) => boolean;
  /** Per-row loading state: the cell shows an animated placeholder instead of the value
   *  and stays locked (no editing, paste, fill or checkbox toggle) until it turns false. */
  isSkeleton?: (row: T, rowIndex: number) => boolean;
  /** Full candidate set for the autocomplete; the editor does the fuzzy filtering itself. */
  getCandidates?: () => SimpleGridOption[];
  /** Visible rows in the dropdown before it scrolls (default 8). */
  menuRows?: number;
  /** Open the suggestion list as soon as the cell is activated (a pick-from-catalog dropdown). */
  openOnActivate?: boolean;
  /** Render a chevron in the cell that opens the editor (and its list) on click. */
  chevron?: boolean;
  /** Show a calendar button, optionally per row (for transposed property tables). Only the button opens the picker; ordinary editing stays text-based. */
  datePicker?: boolean | ((row: T) => boolean);
  /** Two date columns edited from one calendar, ordered from start to end. */
  datePickerPair?: readonly SimpleGridColumn<T>[];
  /** Optional related period and labelled date markers. */
  getDatePickerContext?: (row: T) => SimpleGridDatePickerContext;
  /** The column is a strict dropdown: the editor only picks from `getCandidates`, never free text. */
  selectOnly?: boolean;
  /** Highlight suggestion matches after typing starts (default true). Set false to disable; opening a list alone never highlights matches. */
  highlightMatches?: boolean;
  /** Plain Tab on this column leaves the grid instead of moving right (calls the sheet's onTabOut). */
  tabOut?: boolean;
  /** Opaque data handed to a custom editor. */
  editorData?: unknown;
  /** Custom view-mode rendering (e.g. a greyed derived value); overrides the default text span. */
  renderValue?: (row: T, rowIndex: number, openEditor: () => void) => ReactNode;
  /** Иконка в ячейках в режиме просмотра: узел или (row, rowIndex) => узел | undefined (можно помечать отдельные строки).
   * Не показывается в render/renderValue/multiselect/checkbox ячейках и на время правки скрывается. */
  icon?: ReactNode | ((row: T, rowIndex: number) => ReactNode | undefined);
  /** Позиция icon в ячейке: 'before' (по умолчанию) или 'after' значения; редактор резервирует под неё отступ. */
  iconPosition?: 'before' | 'after';
  validation?: SimpleGridValidation;
  format?: SimpleGridFormat;
  editor?: ComponentType<SimpleGridEditorProps>;
  /** Presentational column (row actions). Never navigable, never pasteable, unless `navigable` is set. */
  render?: (row: T, rowIndex: number) => ReactNode;
  /** Force a presentational column into keyboard navigation (e.g. selectable skeleton cells). */
  navigable?: boolean;
}

/** A contiguous group of physical column ids or nested groups. Invalid groups
 * are ignored. Collapsing replaces the children with a computed summary. */
export interface SimpleGridColumnGroup<T> {
  id: string;
  title: string;
  /** Иконка рядом с названием группы — показывается и в заголовке сводной колонки после сворачивания. */
  headerIcon?: ReactNode;
  /** Позиция headerIcon: 'before' (по умолчанию) или 'after' текста заголовка. */
  headerIconPosition?: 'before' | 'after';
  children: (string | SimpleGridColumnGroup<T>)[];
  /** Double-click a collapsed summary to edit this row's underlying cells in a compact panel. */
  rowEditor?: boolean;
  /** Independent widths shared by this group's row editors; the host can persist them. */
  rowEditorWidths?: Record<string, number>;
  onRowEditorWidthsChange?: (widths: Record<string, number>) => void;
  /** Plain text is used for copying; renderValue can show an icon and a count.
   * By default a summary is read-only and never participates in formulas. When the
   * host supplies `setValue`, the collapsed summary becomes writable: autofill,
   * paste and Delete apply that rule (the summary still has no inline editor). */
  summaryColumn: {
    width: number;
    getValue: (row: T) => string;
    /** Enables writes on the collapsed summary (autofill/paste/clear); omit for read-only. */
    setValue?: (row: T, value: string) => T;
    /** Copies all source-row data represented by this summary into the target row during grid copy/paste or autofill. */
    copyFrom?: (target: T, source: T) => T;
    /** Per-row lock for the writable summary (e.g. a row whose form has no such section). */
    isDisabled?: (row: T, rowIndex: number) => boolean;
    renderValue?: (row: T, rowIndex: number) => ReactNode;
    align?: 'left' | 'right';
    resizable?: boolean;
  };
}

/** A rectangular merged-cell range. The top-left cell (`row`/`col`, 0-based
 *  physical indexes) is the anchor — it owns the value and the column's
 *  behavior; the rest of the rectangle renders as part of it (native
 *  rowSpan/colSpan). Merges are positional: they are not remapped on row or
 *  column reorder. */
export interface SimpleGridMerge {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

/** One host-owned note attached to a cell. The grid only presents it: storage,
 *  authorship and editing stay with the host. */
export interface SimpleGridCellComment {
  id: string;
  text: string;
  author?: string;
  /** ISO timestamp; the card shows the time for today and the date otherwise. */
  createdAt?: string;
  /** The note is a task and keeps its own done state. */
  task?: boolean;
  /** The task is done or the note is resolved; the marker turns grey. */
  resolved?: boolean;
}

/** Cell address passed to host comment callbacks. */
export interface SimpleGridCommentTarget<T> {
  row: T;
  /** Stable row identity from the `rowKey` prop. */
  rowKey: string;
  columnId: string;
  columnTitle?: string;
  value: string;
  /** Cell element, so the host can anchor its comment panel next to the cell. */
  anchor?: HTMLElement | null;
}

/** A viewport anchor is the row under column headers and the column after the frozen pane.
 * Offsets preserve a partially visible cell. Keys survive row/column reordering. */
export interface SimpleGridViewState {
  viewport?: {rowKey?:string;rowIndex:number;columnId:string;offsetTop:number;offsetLeft:number};
  selection?: {active:{rowKey?:string;rowIndex:number;columnId:string};focus:{rowKey?:string;rowIndex:number;columnId:string}} | null;
}

export type SimpleGridRowDropPlacement = 'before' | 'inside' | 'end';

export interface SimpleGridProps<T> {
  rows: T[];
  columns: SimpleGridColumn<T>[];
  /** Nested headers over contiguous ranges in columns. Groups use the normal renderer. */
  columnGroups?: SimpleGridColumnGroup<T>[];
  collapsedGroupIds?: string[];
  defaultCollapsedGroupIds?: string[];
  onCollapsedGroupIdsChange?: (ids: string[]) => void;
  rowKey: (row: T) => string;
  onChange: (rows: T[], editedColumnId?: string) => void | boolean;
  /** Transient edited row, including the current draft; null when editing ends. */
  onEditPreview?: (row: T | null, columnId?: string) => void;
  createRow: () => T;
  readOnly?: boolean;
  /** Cell menu: true for built-in commands, an array for custom commands, or a
   * factory to customize context.defaultItems. False/omitted keeps the browser menu. */
  contextMenu?: boolean | SimpleGridContextMenuItem<T>[] | ((context: SimpleGridContextMenuContext<T>) => SimpleGridContextMenuItem<T>[]);
  rowHeight?: number;
  /** Individual minimum heights (at least 22px), indexed by rowKey. */
  rowHeights?: Record<string, number>;
  defaultRowHeights?: Record<string, number>;
  /** Called once after resize/reset of the gutter-selected row range; does not change row data. */
  onRowHeightsChange?: (heights: Record<string, number>) => void;
  /** Render only the viewport plus overscan in both axes (default false).
   * Uses rowHeight/rowHeights (minimum 22px) and declared column widths, including grow columns.
   * Wrapping/multiline columns and merged cells fall back to the normal renderer. */
  virtualize?: boolean;
  /** Height of the grid's own scroll viewport when virtualize is enabled (default 560px). */
  viewportHeight?: number;
  /** Show the row-number gutter and its controls (default true). False removes its width too. */
  showRowHeaders?: boolean;
  /** Show column headers, including group headers and their controls (default true). */
  showColumnHeaders?: boolean;
  /** Optional host controls in the system top-left header, beside the row-selection checkbox. */
  cornerContent?: ReactNode;
  /** Keep the row-number gutter fixed at the left edge on horizontal scroll (default true). */
  freezeRowHeader?: boolean;
  /** Show selection checkboxes beside row numbers (default false). */
  rowSelectionMode?: boolean;
  rowSelectionLabel?: (row: T, rowIndex: number) => string;
  selectAllRowsLabel?: string;
  /** Row identities selected independently of cell ranges and checkbox data columns. */
  selectedRowKeys?: string[];
  defaultSelectedRowKeys?: string[];
  onSelectedRowKeysChange?: (keys: string[]) => void;
  /** Hidden column ids. A host can control these from an external checkbox menu; values, widths and full order are preserved. */
  hiddenColumnIds?: string[];
  defaultHiddenColumnIds?: string[];
  onHiddenColumnIdsChange?: (ids: string[]) => void;
  /** Selected evaluated (unformatted) values. An empty values list hides all rows. */
  columnFilters?: SimpleGridColumnFilter[];
  defaultColumnFilters?: SimpleGridColumnFilter[];
  onColumnFiltersChange?: (filters: SimpleGridColumnFilter[]) => void;
  sort?: SimpleGridSort | null;
  defaultSort?: SimpleGridSort | null;
  onSortChange?: (sort: SimpleGridSort | null) => void;
  ariaLabel?: string;
  /** Start editing the first editable cell (or `columnId`) with this seed when the grid mounts. */
  initialEdit?: {columnId?: string; rowIndex?: number; value: string} | null;
  /** Select the first editable cell (or `columnId`) when the grid mounts; the editor stays closed. */
  initialFocus?: {columnId?: string; rowIndex?: number} | null;
  /** Restore a viewport/selection without focusing or animated scrolling. A new object requests a new position. */
  viewState?: SimpleGridViewState | null;
  /** Snapshot at scroll end and unmount, never on a timer. Store in a ref for tab navigation. */
  onViewStateChange?: (state:SimpleGridViewState) => void;
  /** Grids in this scope share a single selection; activating a peer clears this grid. */
  selectionScope?: string;
  /** Keep selection to one cell, including Shift and pointer gestures. */
  singleCellSelection?: boolean;
  /** Return true when the host handled vertical navigation past the first/last row. */
  onNavigateOut?: (direction: 'up' | 'down') => boolean;
  /** Called when Tab is pressed on a column flagged `tabOut` (focus leaves the grid). */
  onTabOut?: () => void;
  /**
   * Called after a header resize drag (or a double-click reset) with the width
   * overrides relative to the declared `column.width`, so the host can persist
   * them. Resizing works without it — the widths live in the grid state.
   */
  onColumnWidthsChange?: (widths: Record<string, number>) => void;
  /** Initial resize overrides, keyed by column id. */
  defaultColumnWidths?: Record<string, number>;
  columnWidths?: Record<string, number>;
  /**
   * Called after a header drag-and-drop reorder with the new order of column
   * ids. Works without it — the order lives in the grid state; new columns
   * appended to `columns` always land at the end.
   */
  onColumnOrderChange?: (columnIds: string[]) => void;
  /** Полноширинная строка-разделитель: если callback вернул узел, строка
   *  рисуется одной ячейкой после отдельного гуттера номеров.
   *  Такие строки остаются в rows/onChange, но не участвуют в навигации,
   *  редактировании, autofill и буфере обмена; гуттер поддерживает обычное выделение и перенос строк. */
  rowBanner?: (row: T, rowIndex: number) => ReactNode;
  /** Stable sheet labels; null hides the label. A descendant with data-sg-row-drag-handle starts direct reorder. */
  rowHeaderLabel?: (row: T, rowIndex: number) => ReactNode;
  /** Optional explicit label-gutter width in pixels, excluding selection checkboxes. */
  rowHeaderWidth?: number;
  /** Host-provided gutter accents; selection and resize behavior stay native. */
  /** Transparent color layered over cell backgrounds, preserving selection and active cells. */
  rowFill?: (row: T, rowIndex: number) => string | undefined;
  rowHeaderStyle?: (row: T, rowIndex: number) => CSSProperties;
  /** Stable outline identity. Sorting stays within each group; filters keep its banner. */
  rowGroupKey?: (row: T) => string | undefined;
  /** Hidden outline members; headings remain in the projection and keep filter context. */
  collapsedRowGroupKeys?: string[];
  /** Pin group banners below the measured column headers, bounded by their group. */
  stickyRowBanners?: boolean;
  /** Disable drag reorder when the host projects a filtered list. */
  allowRowReorder?: boolean;
  /** Override reorder persistence (includes hidden members when dragging a collapsed banner). */
  onRowReorder?: (rows: T[], movedKeys: string[]) => void;
  /** Host resolves a row drop: before the lower row of a gap, inside a row, or at the end. */
  rowDropTarget?: (row: T, target: T, placement: SimpleGridRowDropPlacement) => (() => void) | undefined;
  getRowScrollContainer?: () => HTMLElement | null;
  allowRowInsert?: boolean;
  onPasteOverflow?: () => void;
  rowClassName?: (row: T, rowIndex: number) => string | undefined;
  rowAttributes?: (row: T, rowIndex: number) => Record<`data-${string}`, string | undefined>;
  onActiveRowChange?: (row: T) => void;
  /** Row window owned by the shared Gantt viewport. */
  visibleRowIndices?: readonly number[];
  onRevealRow?: (index: number) => void;
    /** Optional detail content directly after a data row. Return null when collapsed.
     * The host owns expansion state. Details have no data-row index and are excluded
     * from parent selection, editing and clipboard. Nested grids own their events.
     * Uses natural document height (no row virtualization while this callback is set).
     * Do not combine with vertical merged cells spanning the expanded parent row. */
    renderRowDetails?: (row: T, rowIndex: number) => ReactNode;
    /** Native inline expansion presentation: raised draws shadows outside the
     * actual parent top and detail bottom, with square corners and no overlays. */
    rowDetailsAppearance?: 'flat' | 'raised';
  /** Цвет внешней рамки выделения, угловой ручки autofill и пунктира цели (по умолчанию Excel-зелёный #217346). */
  selectionColor?: string;
  /** Цвет заливки выделенных ячеек и подсветки выбранных строк/колонок (по умолчанию #e8f1ec). */
  selectionFill?: string;
  /** Объединённые ячейки: прямоугольники с якорем в левом-верхнем углу. Позиционные (индексы), при реордере не следуют за данными; невалидные и перекрывающиеся диапазоны отбрасываются. */
  mergedCells?: SimpleGridMerge[];
  /** Закреплённые столбцы (Excel «закрепить области»): ведущая непрерывная серия
   *  видимых столбцов из этого списка остаётся на месте при горизонтальной
   *  прокрутке, остальное уезжает под неё. Скрытый столбец разрешается через
   *  свернутую группу-заменитель; незнакомые id пропускаются. Заголовок группы и
   *  объединённая ячейка, пересекающие границу закрепления, остаются в прокрутке. */
  frozenColumnIds?: string[];
  /** Cell notes rendered as a corner marker with a hover card. The host owns
   *  storage, authorship, editing and the full comment panel. */
  cellComments?: (row: T, columnId: string) => readonly SimpleGridCellComment[] | undefined;
  /** Adds «Добавить комментарий» to the cell menu. */
  onCellCommentAdd?: (target: SimpleGridCommentTarget<T>) => void;
  /** Opens the host comment panel for the cell; a comment is passed when the
   *  user activates a specific note in the hover card. */
  onCellCommentOpen?: (target: SimpleGridCommentTarget<T>, comment?: SimpleGridCellComment) => void;
  /** Scrolls to and highlights a cell, e.g. after navigating from a comment list.
   *  Change `token` to repeat the reveal for the same cell. */
  revealCell?: { rowKey: string; columnId: string; token?: number } | null;
}

export interface SimpleGridColumnFilter {
  columnId: string;
  values: string[];
}

export interface SimpleGridSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

export type SimpleGridContextMenuItem<T> =
  | { id: string; separator: true }
  | {
    id: string;
    label: string;
    icon?: ReactNode;
    shortcut?: string;
    disabled?: boolean;
    /** Presentation only; the host owns authorization for custom mutations. */
    danger?: boolean;
    /** Nested menu commands, optionally displayed as a compact colour palette. */
    submenu?: SimpleGridContextMenuItem<T>[];
    submenuLayout?: 'grid' | 'palette';
    onSelect: (context: SimpleGridContextMenuContext<T>) => void | Promise<void>;
  };

export interface SimpleGridContextMenuContext<T> {
  row: T;
  /** Index in the original rows prop, even after filtering/sorting. */
  rowIndex: number;
  /** Zero-based row position in the visible grid. */
  visibleRowIndex: number;
  column: SimpleGridColumn<T>;
  /** Index in the columns prop; -1 for a computed group summary. */
  columnIndex: number;
  value: string;
  readOnly: boolean;
  /** Selection in visible order, excluding hidden rows/columns. */
  selection: { rows: T[]; rowIndexes: number[]; columnIds: string[]; values: string[][] };
  defaultItems: SimpleGridContextMenuItem<T>[];
  /** Reuses grid validation, cell locks and undo history. */
  fillSelection: (value: string) => boolean;
  clearSelection: () => void;
}

/** A portaled grid anchored to a host cell. The caller owns rows and persistence.
 * Outside click closes after committing blur; Escape closes the panel when no cell editor consumes it. */
export interface SimpleGridCellTableProps<T> {
  title: string;
  anchor: HTMLElement;
  rows: T[];
  columns: SimpleGridColumn<T>[];
  rowKey: SimpleGridProps<T>['rowKey'];
  createRow: SimpleGridProps<T>['createRow'];
  onChange: SimpleGridProps<T>['onChange'];
  onClose: () => void;
  /** Show the row-number gutter and allow its usual drag reordering. */
  showRowHeaders?: boolean;
  rowHeaderLabel?: SimpleGridProps<T>['rowHeaderLabel'];
  allowRowReorder?: boolean;
  onRowReorder?: SimpleGridProps<T>['onRowReorder'];
  onEditPreview?: SimpleGridProps<T>['onEditPreview'];
  onColumnWidthsChange?: SimpleGridProps<T>['onColumnWidthsChange'];
  defaultColumnWidths?: Record<string, number>;
  readOnly?: boolean;
  selectionColor?: string;
  selectionFill?: string;
  footer?: ReactNode;
  /** Seed the first editable cell when the panel opens (summary typing). */
  initialEdit?: {columnId?: string; rowIndex?: number; value: string};
  /** Select the first editable cell instead of the panel itself (summary Enter). */
  initialFocus?: {columnId?: string; rowIndex?: number};
}
