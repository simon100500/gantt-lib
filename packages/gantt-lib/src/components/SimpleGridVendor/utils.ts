// START_MODULE_CONTRACT
//   PURPOSE: Pure helpers: clipboard TSV matrix parsing, date/number parsing, validation, normalization, display formatting, fuzzy option ranking and HTML escaping.
//   SCOPE: No React, no DOM — everything unit-testable as is; consumed by M-GRID-RUNTIME and M-GRID-EDITORS.
//   DEPENDS: M-GRID-TYPES
//   LINKS: M-GRID-RUNTIME, M-GRID-EDITORS, M-GRID-TESTS, V-M-GRID-UTILS
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT
//
// START_MODULE_MAP
//   parseClipboardMatrix - split pasted text/plain into a TSV/newline matrix
//   parseGridDate - parse a raw cell string into ISO yyyy-mm-dd or null
//   parseGridMultiValue - parse selected option arrays from JSON strings
//   serializeGridMultiValue - encode selected options as JSON strings
//   parseGridNumber - parse a localized number string into a finite number or null
//   canonicalGridDecimal - normalize comma decimal separator to dot
//   normalizeGridValue - raw editor value for a column (raw input for date/number, else the value)
//   validateGridValue - validation-rule check returning an error message or null
//   formatGridValue - apply column display format to a stored value
//   SG_OPTION_HEIGHT - fixed pixel height of one autocomplete option row
//   SG_GUTTER_WIDTH - width of the row-number gutter column
//   SG_MIN_COLUMN_WIDTH - minimum resizable column width in pixels
//   fuzzyRankOptions - rank autocomplete options for a query with forgiving matching
//   GridFillDirection - sign of an autofill drag: 1 continues after the source line, -1 before it
//   extendGridFillLine - continue a fill-axis line: number/date series, text+number patterns, cyclic tiling
//   isGridCheckboxChecked - truthy check for checkbox cells (TRUE/1/да/x…)
//   evaluateGridFormula - evaluate a mini-formula (=A1, ="А"&"Б") with a cell resolver
//   formatGridCellAddress - 0-based col/row to an A1-style address (A1, AA2)
//   escapeHtml - escape a string for safe interpolation into HTML
//   createGridEvaluator - cached original-address mini-formula evaluation
//   projectGridRows - original row indexes after typed sorting and value filters
//   frozenColumnCount - size of the frozen leading-columns pane for frozenColumnIds
// END_MODULE_MAP

// Pure helpers: clipboard parsing, date/number parsing, validation,
// normalization, display formatting and the forgiving candidate search.
// No React, no DOM — everything here is unit-testable as is.

import type { SimpleGridColumn, SimpleGridColumnFilter, SimpleGridSort, SimpleGridOption, SimpleGridValidation, SimpleGridFormat } from './types.js';

// START_BLOCK_ROW_PROJECTION
/** Parse the JSON string array used by multiselect cells; malformed values are empty. */
export function parseGridMultiValue(value: string): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) return [];
    return [...new Set(parsed)];
  } catch { return []; }
}

/** Serialize selected values deterministically, using an empty string for no selection. */
export function serializeGridMultiValue(values: string[]): string {
  const unique = [...new Set(values)];
  return unique.length ? JSON.stringify(unique) : '';
}

/** Cached evaluator addressed exclusively by original row and full column indexes. */
export function createGridEvaluator<T>(rows: T[], columns: SimpleGridColumn<T>[]) {
  const cache = new Map<string, string>();
  const stack = new Set<string>();
  const evaluate = (row: number, col: number): string => {
    if (row < 0 || row >= rows.length || col < 0 || col >= columns.length) return '';
    const key = `${row}:${col}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    if (stack.has(key)) return '#ЦИКЛ!';
    const column = columns[col];
    const raw = column.getValue?.(rows[row]) ?? '';
    if (!raw.startsWith('=') || raw.length < 2 || column.kind === 'checkbox') return raw;
    stack.add(key);
    const result = evaluateGridFormula(raw, (ref) => evaluate(ref.row, ref.col));
    stack.delete(key);
    cache.set(key, result);
    return result;
  };
  return evaluate;
}

/** Client view of original indexes; other-column filtering also powers menu facets. */
export function projectGridRows<T>(rows: T[], columns: SimpleGridColumn<T>[], filters: SimpleGridColumnFilter[], sort: SimpleGridSort | null, evaluate: (row: number, col: number) => string, excludeColumn?: string, outline?: {isBanner:(row:T)=>boolean; groupKey:(row:T)=>string|undefined}): number[] {
  const predicates = filters.flatMap((filter) => {
    const col = columns.findIndex((column) => column.id === filter.columnId && column.getValue);
    return col < 0 || filter.columnId === excludeColumn ? [] : [{ col, values: new Set(filter.values) }];
  });
  const indexes = rows.flatMap((value, row) => !outline?.isBanner(value) && predicates.every(({ col, values }) => values.has(evaluate(row, col))) ? [row] : []);
  const grouped = (indexes:number[]) => {
    if (!outline) return indexes;
    const groups = new Map<string | undefined, number[]>();
    for (const index of indexes) { const id=outline.groupKey(rows[index]); const group=groups.get(id)||[]; group.push(index); groups.set(id,group); }
    const banners=new Map<string|undefined,number>();rows.forEach((row,index)=>{if(outline.isBanner(row))banners.set(outline.groupKey(row),index);});
    const result:number[]=[]; const visited=new Set<string|undefined>();
    for (let index=0;index<rows.length;index++) {
      const id=outline.groupKey(rows[index]);
      if (visited.has(id)) continue;
      visited.add(id);
      const members=groups.get(id)||[];
      const banner=banners.get(id);
      if (banner!==undefined && (members.length||!predicates.length)) result.push(banner);
      result.push(...members);
    }
    return result;
  };
  const col = sort ? columns.findIndex((column) => column.id === sort.columnId && column.getValue) : -1;
  if (col < 0 || !sort) return grouped(indexes);
  const column = columns[col];
  const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
  const valueOf = (value: string): number | string => {
    if (column.format?.kind === 'date' || column.validation?.type === 'date') return parseGridDate(value) ?? value;
    if (column.kind === 'number' || column.format?.kind === 'number' || column.validation?.type === 'number') return parseGridNumber(value) ?? value;
    return value;
  };
  indexes.sort((a, b) => {
    const left = evaluate(a, col);
    const right = evaluate(b, col);
    if (!left.trim() || !right.trim()) return !left.trim() === !right.trim() ? a - b : !left.trim() ? 1 : -1;
    const l = valueOf(left);
    const r = valueOf(right);
    const compared = typeof l === 'number' && typeof r === 'number' ? l - r : collator.compare(String(l), String(r));
    return (sort.direction === 'asc' ? compared : -compared) || a - b;
  });
  return grouped(indexes);
}
// END_BLOCK_ROW_PROJECTION

/** Size of the frozen pane (Excel «freeze panes»): the leading contiguous run of
 *  visible columns covered by `frozenColumnIds`. An id hidden from the sheet
 *  resolves through the collapsed group summary that stands in for it; unknown
 *  ids are skipped, so hiding a frozen column narrows the pane instead of
 *  shifting it onto the next column. */
export function frozenColumnCount(frozenColumnIds: string[] | undefined, visibleIds: string[], summaryFor: (id: string) => string | undefined): number {
  if (!frozenColumnIds?.length) return 0;
  const positions = frozenColumnIds
    .map((id) => {
      const own = visibleIds.indexOf(id);
      if (own >= 0) return own;
      const summary = summaryFor(id);
      return summary ? visibleIds.indexOf(summary) : -1;
    })
    .filter((position) => position >= 0)
    .sort((a, b) => a - b);
  let count = 0;
  for (const position of positions) {
    if (position === count) count += 1;
    else if (position > count) break;
  }
  return Math.min(count, visibleIds.length);
}

/** Excel/TSV clipboard payload -> matrix. A single trailing newline is not an extra row. */
export function parseClipboardMatrix(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((line) => line.split('\t'));
}

const pad = (value: number) => String(value).padStart(2, '0');

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function validDate(year: number, month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** Two-digit years 00–29 → 2000–2029, 30–99 → 1930–1999 (Excel's default window). */
const SHORT_YEAR_WINDOW = 29;
const fullYear = (yy: number): number => (yy <= SHORT_YEAR_WINDOW ? 2000 + yy : 1900 + yy);

/** Accepts 12.05.2026, 12/05/2026, 12-05-2026, ISO 2026-05-12 and Excel-style short forms (15-1 → day/month of the current year, 15-1-26 → the two-digit-year window, 15 → the current month). Returns an ISO day or null. */
export function parseGridDate(value: string): string | null {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3])) ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  const full = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  if (full) {
    const day = Number(full[1]); const month = Number(full[2]); const year = Number(full[3]);
    return validDate(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : null;
  }
  const shortYear = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/.exec(trimmed);
  if (shortYear) {
    const day = Number(shortYear[1]); const month = Number(shortYear[2]); const year = fullYear(Number(shortYear[3]));
    return validDate(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : null;
  }
  const dayMonth = /^(\d{1,2})[./-](\d{1,2})$/.exec(trimmed);
  if (dayMonth) {
    const now = new Date();
    const day = Number(dayMonth[1]); const month = Number(dayMonth[2]); const year = now.getFullYear();
    return validDate(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : null;
  }
  const dayOnly = /^(\d{1,2})$/.exec(trimmed);
  if (dayOnly) {
    const now = new Date();
    const day = Number(dayOnly[1]);
    return validDate(now.getFullYear(), now.getMonth() + 1, day) ? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(day)}` : null;
  }
  return null;
}

/** Accepts a dot or a comma decimal separator and space thousand separators. */
export function parseGridNumber(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The only decimal separator the sheet stores is the comma; a typed or pasted dot is rewritten. */
export function canonicalGridDecimal(value: string): string {
  return value.includes('.') ? value.replace(/\./g, ',') : value;
}

/** Canonical form stored by the sheet (dates become ISO days, numbers use a comma decimal separator, checkboxes become TRUE/FALSE). */
export function normalizeGridValue(column: Pick<SimpleGridColumn<unknown>, 'validation' | 'kind'>, value: string): string {
  const trimmed = value.trim();
  if (column.kind === 'checkbox') {
    if (!trimmed) return trimmed;
    return isGridCheckboxChecked(trimmed) ? 'TRUE' : 'FALSE';
  }
  if (column.validation?.type === 'date') return parseGridDate(trimmed) ?? trimmed;
  if (column.validation?.type === 'number' || column.kind === 'number') return canonicalGridDecimal(trimmed);
  return trimmed;
}

/** Truthy strings a checkbox cell accepts from typing or pasted sources (TRUE/1/да/x…). */
export function isGridCheckboxChecked(value: string): boolean {
  return /^(true|1|да|yes|y|x|\+)$/i.test(value.trim());
}

/** Human-readable rejection reason, or null when the value is acceptable. */
export function validateGridValue(validation: SimpleGridValidation | undefined, value: string): string | null {
  if (!validation) return null;
  const trimmed = value.trim();
  if (!trimmed) return null; // blank is always allowed, as in Excel
  if (validation.type === 'text') {
    if (validation.maxLength !== undefined && trimmed.length > validation.maxLength) return `Не более ${validation.maxLength} символов`;
    return null;
  }
  if (validation.type === 'number') {
    const parsed = parseGridNumber(trimmed);
    if (parsed === null) return 'Введите число';
    if (validation.integer && !Number.isInteger(parsed)) return 'Введите целое число';
    if (validation.min !== undefined && parsed < validation.min) return `Значение не меньше ${validation.min}`;
    if (validation.max !== undefined && parsed > validation.max) return `Значение не больше ${validation.max}`;
    return null;
  }
  if (validation.type === 'date') {
    const parsed = parseGridDate(trimmed);
    if (!parsed) return 'Введите дату (ДД.ММ.ГГГГ)';
    if (validation.min && parsed < validation.min) return `Дата не раньше ${validation.min}`;
    if (validation.max && parsed > validation.max) return `Дата не позже ${validation.max}`;
    return null;
  }
  if (!validation.allowCustom && !validation.options.includes(trimmed)) return 'Выберите значение из списка';
  return null;
}

/** Render a stored value for display (numbers and dates only). */
export function formatGridValue(format: SimpleGridFormat | undefined, value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !format) return value;
  if (format.kind === 'date') {
    const iso = parseGridDate(trimmed);
    if (!iso) return value;
    const [year, month, day] = iso.split('-');
    return `${day}.${month}.${year}`;
  }
  const parsed = parseGridNumber(trimmed);
  if (parsed === null) return value;
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: format.decimals ?? 0,
    maximumFractionDigits: format.decimals ?? 3,
    useGrouping: format.thousands ?? false,
  }).format(parsed);
}

export const SG_OPTION_HEIGHT = 32;
/** Fixed width of the leading system row-number gutter; it never absorbs table slack. */
export const SG_GUTTER_WIDTH = 40;
/** Lower bound of a header resize drag. */
export const SG_MIN_COLUMN_WIDTH = 40;

function normalizeSearch(text: string): string {
  return text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
}

// Normalized haystacks are cached per option object, so re-typing does not
// re-normalize a 10 000-item dictionary on every keystroke.
const searchHaystackCache = new WeakMap<SimpleGridOption, string>();
function searchHaystack(option: SimpleGridOption): string {
  let cached = searchHaystackCache.get(option);
  if (cached === undefined) {
    cached = normalizeSearch(option.label);
    searchHaystackCache.set(option, cached);
  }
  return cached;
}

/**
 * Score one query token against a candidate: a direct substring wins, otherwise
 * the token may match as a subsequence ("шв" -> "Швеллер"). Returns null when the
 * token cannot be found at all.
 */
function searchTokenScore(haystack: string, token: string): number | null {
  const direct = haystack.indexOf(token);
  if (direct !== -1) return 1000 - direct * 4 + token.length * 8;
  let cursor = 0;
  let gaps = 0;
  let first = -1;
  for (const char of token) {
    const found = haystack.indexOf(char, cursor);
    if (found === -1) return null;
    if (first === -1) first = found;
    gaps += found - cursor;
    cursor = found + 1;
  }
  return 400 - gaps * 3 - first * 2 + token.length * 5;
}

/**
 * Very forgiving search: every whitespace-separated token must match (as a
 * substring or a subsequence), best matches first. So "шв 12" finds
 * "Швеллер 1200".
 */
export function fuzzyRankOptions(options: SimpleGridOption[], query: string): SimpleGridOption[] {
  const needle = normalizeSearch(query.trim());
  if (!needle) return options;
  const tokens = needle.split(/\s+/).filter(Boolean);
  const scored: Array<{ option: SimpleGridOption; score: number }> = [];
  for (const option of options) {
    const haystack = searchHaystack(option);
    let total = 0;
    let matched = true;
    for (const token of tokens) {
      const score = searchTokenScore(haystack, token);
      if (score === null) { matched = false; break; }
      total += score;
    }
    if (matched) scored.push({ option, score: total });
  }
  scored.sort((left, right) => right.score - left.score);
  return scored.map((entry) => entry.option);
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 0-based column/row to an A1-style address: (0,0) → «A1», (26,1) → «AA2». */
export function formatGridCellAddress(colIndex: number, rowIndex: number): string {
  let rest = colIndex;
  let letters = '';
  do {
    letters = String.fromCharCode(65 + (rest % 26)) + letters;
    rest = Math.floor(rest / 26) - 1;
  } while (rest >= 0);
  return `${letters}${rowIndex + 1}`;
}

function parseCellRef(token: string): { col: number; row: number } | null {
  const match = /^([A-Za-z]+)([0-9]+)$/.exec(token);
  if (!match) return null;
  let col = 0;
  for (const char of match[1].toUpperCase()) col = col * 26 + (char.charCodeAt(0) - 64);
  return { col: col - 1, row: Number(match[2]) - 1 };
}

/**
 * Evaluate a mini-formula («=A1», '="А"&"Б"', '=B3&" — "&C4'): operands are
 * A1-style cell references (resolved through `resolve`, which returns the
 * evaluated value of the referenced cell), "string literals" and number
 * literals, joined by `&`. Anything unparseable comes back verbatim, so a
 * half-typed formula never swallows the user's text.
 */
export function evaluateGridFormula(formula: string, resolve: (ref: { col: number; row: number }) => string): string {
  const src = formula.slice(1);
  let pos = 0;
  const skipSpaces = () => { while (pos < src.length && src[pos] === ' ') pos += 1; };
  const parseOperand = (): string | null => {
    skipSpaces();
    if (pos >= src.length) return null;
    if (src[pos] === '"') {
      const end = src.indexOf('"', pos + 1);
      if (end === -1) return null;
      const out = src.slice(pos + 1, end);
      pos = end + 1;
      return out;
    }
    const ref = /^[A-Za-z]+\d+/.exec(src.slice(pos));
    if (ref) {
      const parsed = parseCellRef(ref[0]);
      pos += ref[0].length;
      return parsed ? resolve(parsed) : null;
    }
    const num = /^\d+(?:[.,]\d+)?/.exec(src.slice(pos));
    if (num) {
      pos += num[0].length;
      return num[0];
    }
    return null;
  };
  let acc = parseOperand();
  if (acc === null) return formula;
  for (;;) {
    skipSpaces();
    if (pos >= src.length) return acc;
    if (src[pos] !== '&') return formula;
    pos += 1;
    const right = parseOperand();
    if (right === null) return formula;
    acc += right;
  }
}

/** Sign of an autofill drag: `1` continues after the source line (down/right), `-1` before it (up/left). */
export type GridFillDirection = 1 | -1;

// 1e10 keeps a linear extrapolation like 0.1+0.2 free of binary float tails
// while preserving every meaningful decimal of realistic cell values.
function roundFillNumber(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

function formatFillNumber(value: number): string {
  return canonicalGridDecimal(String(roundFillNumber(value)));
}

function fillIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day) + days * 86400000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const daysBetween = (left: string, right: string): number => {
  const [ly, lm, ld] = left.split('-').map(Number);
  const [ry, rm, rd] = right.split('-').map(Number);
  return (Date.UTC(ry, rm - 1, rd) - Date.UTC(ly, lm - 1, ld)) / 86400000;
};

/**
 * Continue one source line (the values of a row or a column along the fill
 * axis) by `count` cells beyond it; returns exactly `count` values ordered
 * from the source edge outward. Excel-like rules: a purely numeric line
 * extrapolates a linear series (a single value continues with step +1), a
 * purely date line (ISO days) continues by whole days, a uniform
 * "text + number" pattern increments the number keeping the text parts and
 * the zero padding, anything else tiles the source cyclically.
 */
export function extendGridFillLine(source: string[], count: number, direction: GridFillDirection): string[] {
  if (count <= 0) return [];
  const values = source.length > 0 ? source : [''];
  const step = (first: number, last: number, length: number) => (length > 1 ? (last - first) / (length - 1) : 1);

  const numbers = values.map(parseGridNumber);
  if (numbers.every((parsed): parsed is number => parsed !== null)) {
    const stride = step(numbers[0], numbers[numbers.length - 1], numbers.length);
    return Array.from({ length: count }, (_, index) => {
      // The series continues beyond the last source cell (or before the first
      // one when filling up/left), never re-covers the source itself.
      const distance = direction === 1 ? numbers.length - 1 + index + 1 : -(index + 1);
      return formatFillNumber(numbers[0] + stride * distance);
    });
  }

  const dates = values.map(parseGridDate);
  if (dates.every((parsed): parsed is string => parsed !== null)) {
    const stride = dates.length > 1 ? daysBetween(dates[0], dates[dates.length - 1]) / (dates.length - 1) : 1;
    return Array.from({ length: count }, (_, index) => {
      const distance = direction === 1 ? dates.length - 1 + index + 1 : -(index + 1);
      return fillIsoDate(dates[0], Math.round(stride * distance));
    });
  }

  const patterns = values.map((value) => /^(.*?)(\d+)(.*)$/.exec(value));
  if (patterns.every((match) => match !== null)) {
    const [pre, post] = [patterns[0]![1], patterns[0]![3]];
    if (patterns.every((match) => match![1] === pre && match![3] === post)) {
      const digits = patterns.map((match) => match![2]);
      const nums = digits.map(Number);
      const width = Math.max(...digits.map((digit) => digit.length));
      const stride = step(nums[0], nums[nums.length - 1], nums.length);
      return Array.from({ length: count }, (_, index) => {
        const distance = direction === 1 ? nums.length - 1 + index + 1 : -(index + 1);
        const next = Math.round(nums[0] + stride * distance);
        return `${pre}${String(Math.abs(next)).padStart(width, '0')}${post}`;
      });
    }
  }

  // Anything else tiles the source cyclically, reading backwards when filling up/left.
  return Array.from({ length: count }, (_, index) => {
    const length = values.length;
    const offset = direction === 1 ? index : (length - 1 - (index % length) + length) % length;
    return values[offset % length];
  });
}
