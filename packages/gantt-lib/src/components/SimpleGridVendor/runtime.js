// src/components/SimpleGridVendor/SimpleGrid.tsx
import {
  Fragment as Fragment4,
  useCallback,
  useEffect as useEffect4,
  useLayoutEffect as useLayoutEffect6,
  useMemo as useMemo2,
  useRef as useRef6,
  useState as useState5
} from "react";
import { createPortal as createPortal5 } from "react-dom";

// src/components/SimpleGridVendor/viewState.ts
import { useLayoutEffect, useRef } from "react";
function resolveViewCell(cell, keys, ids) {
  if (!cell || !keys.length || !ids.length) return null;
  const row = cell.rowKey === void 0 ? -1 : keys.indexOf(cell.rowKey), column = ids.indexOf(cell.columnId);
  return { row: row < 0 ? Math.max(0, Math.min(cell.rowIndex, keys.length - 1)) : row, navIndex: column < 0 ? 0 : column };
}
var own = (root, selector) => Array.from(root.querySelectorAll(selector)).filter((node) => node.closest("[data-sg]") === root);
function owners(root) {
  const list = [];
  for (let node = root; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (/auto|scroll|overlay/.test(style.overflow + " " + style.overflowX + " " + style.overflowY)) list.push(node);
  }
  return list;
}
function boundary(root, list) {
  const first = list[0], rect = first?.getBoundingClientRect();
  let top = rect ? rect.top + first.clientTop : 0, left = rect ? rect.left + first.clientLeft : 0;
  for (const node of list) {
    const box = node.getBoundingClientRect();
    top = Math.max(top, box.top + node.clientTop);
    left = Math.max(left, box.left + node.clientLeft);
  }
  const headers = own(root, "thead th");
  for (const header of headers) {
    const box = header.getBoundingClientRect();
    top = Math.max(top, box.bottom);
    if (header.style.left) left = Math.max(left, box.right);
  }
  return { top, left };
}
function useGridViewState(rootRef, options) {
  const latest = useRef(options);
  latest.current = options;
  const restoring = useRef(Boolean(options.state?.viewport));
  const correctRef = useRef(() => 0);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !options.state && !options.onChange) return;
    const list = owners(root), target = options.state?.viewport;
    const original = list.map((node) => ({ anchor: node.style.overflowAnchor, behavior: node.style.scrollBehavior }));
    let frame = null, passes = 0, stable = 0;
    restoring.current = Boolean(target);
    list.forEach((node) => {
      node.style.overflowAnchor = "none";
      node.style.scrollBehavior = "auto";
    });
    const stop = () => {
      restoring.current = false;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
    const correct = () => {
      if (!restoring.current || !target) return 0;
      const config = latest.current, index = target.rowKey === void 0 ? -1 : config.keys.indexOf(target.rowKey);
      const rowIndex = index < 0 ? Math.max(0, Math.min(target.rowIndex, config.keys.length - 1)) : index;
      const row = own(root, `tr[data-row-index="${rowIndex}"]`)[0];
      const column = own(root, 'thead th[data-testid^="sg-colheader-"]').find((node) => node.dataset.testid === `sg-colheader-${target.columnId}`);
      const edge = boundary(root, list);
      const dy = row ? row.getBoundingClientRect().top - edge.top - target.offsetTop : 0;
      const dx = column && !column.hasAttribute("data-sg-frozen-position") ? column.getBoundingClientRect().left - edge.left - target.offsetLeft : 0;
      const vertical = list.find((node) => node.scrollHeight > node.clientHeight + 1), horizontal = list.find((node) => node.scrollWidth > node.clientWidth + 1);
      if (vertical && Math.abs(dy) > 0.25) vertical.scrollTop += dy;
      if (horizontal && Math.abs(dx) > 0.25) horizontal.scrollLeft += dx;
      return Math.max(Math.abs(dy), Math.abs(dx));
    };
    correctRef.current = correct;
    const settle = () => {
      frame = null;
      const error = correct();
      stable = error <= 0.5 ? stable + 1 : 0;
      if (++passes < 6 && stable < 2 && restoring.current) frame = requestAnimationFrame(settle);
      else stop();
    };
    if (target) {
      correct();
      frame = requestAnimationFrame(settle);
    } else list.forEach((node) => {
      node.scrollTop = 0;
      node.scrollLeft = 0;
    });
    const capture = () => {
      const config = latest.current;
      if (restoring.current || !config.onChange) return;
      const edge = boundary(root, list), rows = own(root, "tr[data-row-index]");
      let low = 0, high = rows.length;
      while (low < high) {
        const mid = low + high >>> 1;
        if (rows[mid].getBoundingClientRect().bottom <= edge.top + 0.25) low = mid + 1;
        else high = mid;
      }
      const row = rows[low];
      const column = own(root, 'thead th[data-testid^="sg-colheader-"]').find((node) => !node.hasAttribute("data-sg-frozen-position") && node.getBoundingClientRect().right > edge.left + 0.25);
      const address = (cell) => ({ rowIndex: cell.row, rowKey: config.keys[cell.row], columnId: config.ids[cell.navIndex] });
      config.onChange({ viewport: row && column ? { rowIndex: Number(row.dataset.rowIndex), rowKey: config.keys[Number(row.dataset.rowIndex)], columnId: column.dataset.testid.slice("sg-colheader-".length), offsetTop: row.getBoundingClientRect().top - edge.top, offsetLeft: column.getBoundingClientRect().left - edge.left } : void 0, selection: config.active && config.focus ? { active: address(config.active), focus: address(config.focus) } : null });
    };
    const cancel = () => stop();
    list.forEach((node) => {
      node.addEventListener("scrollend", capture, { passive: true });
      node.addEventListener("wheel", cancel, { passive: true });
    });
    root.addEventListener("pointerdown", cancel);
    root.addEventListener("keydown", cancel);
    return () => {
      capture();
      stop();
      correctRef.current = () => 0;
      list.forEach((node, index) => {
        node.removeEventListener("scrollend", capture);
        node.removeEventListener("wheel", cancel);
        node.style.overflowAnchor = original[index].anchor;
        node.style.scrollBehavior = original[index].behavior;
      });
      root.removeEventListener("pointerdown", cancel);
      root.removeEventListener("keydown", cancel);
    };
  }, [options.state, rootRef]);
  useLayoutEffect(() => {
    correctRef.current();
  });
  const request = options.state?.viewport;
  const keyIndex = request?.rowKey === void 0 ? -1 : options.keys.indexOf(request.rowKey);
  return { restoring, rowIndex: request ? keyIndex < 0 ? request.rowIndex : keyIndex : void 0, columnId: request?.columnId };
}

// src/components/SimpleGridVendor/editors.tsx
import {
  useLayoutEffect as useLayoutEffect2,
  useMemo,
  useRef as useRef2,
  useState
} from "react";
import { createPortal } from "react-dom";

// src/components/SimpleGridVendor/utils.ts
function parseGridMultiValue(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) return [];
    return [...new Set(parsed)];
  } catch {
    return [];
  }
}
function serializeGridMultiValue(values) {
  const unique = [...new Set(values)];
  return unique.length ? JSON.stringify(unique) : "";
}
function createGridEvaluator(rows, columns) {
  const cache = /* @__PURE__ */ new Map();
  const stack = /* @__PURE__ */ new Set();
  const evaluate = (row, col) => {
    if (row < 0 || row >= rows.length || col < 0 || col >= columns.length) return "";
    const key = `${row}:${col}`;
    const cached = cache.get(key);
    if (cached !== void 0) return cached;
    if (stack.has(key)) return "#\u0426\u0418\u041A\u041B!";
    const column = columns[col];
    const raw = column.getValue?.(rows[row]) ?? "";
    if (!raw.startsWith("=") || raw.length < 2 || column.kind === "checkbox") return raw;
    stack.add(key);
    const result = evaluateGridFormula(raw, (ref) => evaluate(ref.row, ref.col));
    stack.delete(key);
    cache.set(key, result);
    return result;
  };
  return evaluate;
}
function projectGridRows(rows, columns, filters, sort, evaluate, excludeColumn, outline) {
  const predicates = filters.flatMap((filter) => {
    const col2 = columns.findIndex((column2) => column2.id === filter.columnId && column2.getValue);
    return col2 < 0 || filter.columnId === excludeColumn ? [] : [{ col: col2, values: new Set(filter.values) }];
  });
  const indexes = rows.flatMap((value, row) => !outline?.isBanner(value) && predicates.every(({ col: col2, values }) => values.has(evaluate(row, col2))) ? [row] : []);
  const grouped = (indexes2) => {
    if (!outline) return indexes2;
    const groups = /* @__PURE__ */ new Map();
    for (const index of indexes2) {
      const id = outline.groupKey(rows[index]);
      const group = groups.get(id) || [];
      group.push(index);
      groups.set(id, group);
    }
    const banners = /* @__PURE__ */ new Map();
    rows.forEach((row, index) => {
      if (outline.isBanner(row)) banners.set(outline.groupKey(row), index);
    });
    const result = [];
    const visited = /* @__PURE__ */ new Set();
    for (let index = 0; index < rows.length; index++) {
      const id = outline.groupKey(rows[index]);
      if (visited.has(id)) continue;
      visited.add(id);
      const members = groups.get(id) || [];
      const banner = banners.get(id);
      if (banner !== void 0 && (members.length || !predicates.length)) result.push(banner);
      result.push(...members);
    }
    return result;
  };
  const col = sort ? columns.findIndex((column2) => column2.id === sort.columnId && column2.getValue) : -1;
  if (col < 0 || !sort) return grouped(indexes);
  const column = columns[col];
  const collator = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });
  const valueOf = (value) => {
    if (column.format?.kind === "date" || column.validation?.type === "date") return parseGridDate(value) ?? value;
    if (column.kind === "number" || column.format?.kind === "number" || column.validation?.type === "number") return parseGridNumber(value) ?? value;
    return value;
  };
  indexes.sort((a, b) => {
    const left = evaluate(a, col);
    const right = evaluate(b, col);
    if (!left.trim() || !right.trim()) return !left.trim() === !right.trim() ? a - b : !left.trim() ? 1 : -1;
    const l = valueOf(left);
    const r = valueOf(right);
    const compared = typeof l === "number" && typeof r === "number" ? l - r : collator.compare(String(l), String(r));
    return (sort.direction === "asc" ? compared : -compared) || a - b;
  });
  return grouped(indexes);
}
function frozenColumnCount(frozenColumnIds, visibleIds, summaryFor) {
  if (!frozenColumnIds?.length) return 0;
  const positions = frozenColumnIds.map((id) => {
    const own2 = visibleIds.indexOf(id);
    if (own2 >= 0) return own2;
    const summary = summaryFor(id);
    return summary ? visibleIds.indexOf(summary) : -1;
  }).filter((position) => position >= 0).sort((a, b) => a - b);
  let count = 0;
  for (const position of positions) {
    if (position === count) count += 1;
    else if (position > count) break;
  }
  return Math.min(count, visibleIds.length);
}
function parseClipboardMatrix(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => line.split("	"));
}
var pad = (value) => String(value).padStart(2, "0");
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}
function validDate(year, month, day) {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}
var SHORT_YEAR_WINDOW = 29;
var fullYear = (yy) => yy <= SHORT_YEAR_WINDOW ? 2e3 + yy : 1900 + yy;
function parseGridDate(value) {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3])) ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  const full = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  if (full) {
    const day = Number(full[1]);
    const month = Number(full[2]);
    const year = Number(full[3]);
    return validDate(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : null;
  }
  const shortYear = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/.exec(trimmed);
  if (shortYear) {
    const day = Number(shortYear[1]);
    const month = Number(shortYear[2]);
    const year = fullYear(Number(shortYear[3]));
    return validDate(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : null;
  }
  const dayMonth = /^(\d{1,2})[./-](\d{1,2})$/.exec(trimmed);
  if (dayMonth) {
    const now = /* @__PURE__ */ new Date();
    const day = Number(dayMonth[1]);
    const month = Number(dayMonth[2]);
    const year = now.getFullYear();
    return validDate(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : null;
  }
  const dayOnly = /^(\d{1,2})$/.exec(trimmed);
  if (dayOnly) {
    const now = /* @__PURE__ */ new Date();
    const day = Number(dayOnly[1]);
    return validDate(now.getFullYear(), now.getMonth() + 1, day) ? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(day)}` : null;
  }
  return null;
}
function parseGridNumber(value) {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
function canonicalGridDecimal(value) {
  return value.includes(".") ? value.replace(/\./g, ",") : value;
}
function normalizeGridValue(column, value) {
  const trimmed = value.trim();
  if (column.kind === "checkbox") {
    if (!trimmed) return trimmed;
    return isGridCheckboxChecked(trimmed) ? "TRUE" : "FALSE";
  }
  if (column.validation?.type === "date") return parseGridDate(trimmed) ?? trimmed;
  if (column.validation?.type === "number" || column.kind === "number") return canonicalGridDecimal(trimmed);
  return trimmed;
}
function isGridCheckboxChecked(value) {
  return /^(true|1|да|yes|y|x|\+)$/i.test(value.trim());
}
function validateGridValue(validation, value) {
  if (!validation) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (validation.type === "text") {
    if (validation.maxLength !== void 0 && trimmed.length > validation.maxLength) return `\u041D\u0435 \u0431\u043E\u043B\u0435\u0435 ${validation.maxLength} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`;
    return null;
  }
  if (validation.type === "number") {
    const parsed = parseGridNumber(trimmed);
    if (parsed === null) return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043B\u043E";
    if (validation.integer && !Number.isInteger(parsed)) return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E";
    if (validation.min !== void 0 && parsed < validation.min) return `\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 ${validation.min}`;
    if (validation.max !== void 0 && parsed > validation.max) return `\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${validation.max}`;
    return null;
  }
  if (validation.type === "date") {
    const parsed = parseGridDate(trimmed);
    if (!parsed) return "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0434\u0430\u0442\u0443 (\u0414\u0414.\u041C\u041C.\u0413\u0413\u0413\u0413)";
    if (validation.min && parsed < validation.min) return `\u0414\u0430\u0442\u0430 \u043D\u0435 \u0440\u0430\u043D\u044C\u0448\u0435 ${validation.min}`;
    if (validation.max && parsed > validation.max) return `\u0414\u0430\u0442\u0430 \u043D\u0435 \u043F\u043E\u0437\u0436\u0435 ${validation.max}`;
    return null;
  }
  if (!validation.allowCustom && !validation.options.includes(trimmed)) return "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430";
  return null;
}
function formatGridValue(format, value) {
  const trimmed = value.trim();
  if (!trimmed || !format) return value;
  if (format.kind === "date") {
    const iso = parseGridDate(trimmed);
    if (!iso) return value;
    const [year, month, day] = iso.split("-");
    return `${day}.${month}.${year}`;
  }
  const parsed = parseGridNumber(trimmed);
  if (parsed === null) return value;
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: format.decimals ?? 0,
    maximumFractionDigits: format.decimals ?? 3,
    useGrouping: format.thousands ?? false
  }).format(parsed);
}
var SG_OPTION_HEIGHT = 32;
var SG_MIN_COLUMN_WIDTH = 40;
function normalizeSearch(text) {
  return text.toLocaleLowerCase("ru-RU").replace(/ё/g, "\u0435");
}
var searchHaystackCache = /* @__PURE__ */ new WeakMap();
function searchHaystack(option) {
  let cached = searchHaystackCache.get(option);
  if (cached === void 0) {
    cached = normalizeSearch(option.label);
    searchHaystackCache.set(option, cached);
  }
  return cached;
}
function searchTokenScore(haystack, token) {
  const direct = haystack.indexOf(token);
  if (direct !== -1) return 1e3 - direct * 4 + token.length * 8;
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
function fuzzyRankOptions(options, query) {
  const needle = normalizeSearch(query.trim());
  if (!needle) return options;
  const tokens = needle.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const option of options) {
    const haystack = searchHaystack(option);
    let total = 0;
    let matched = true;
    for (const token of tokens) {
      const score = searchTokenScore(haystack, token);
      if (score === null) {
        matched = false;
        break;
      }
      total += score;
    }
    if (matched) scored.push({ option, score: total });
  }
  scored.sort((left, right) => right.score - left.score);
  return scored.map((entry) => entry.option);
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function parseCellRef(token) {
  const match = /^([A-Za-z]+)([0-9]+)$/.exec(token);
  if (!match) return null;
  let col = 0;
  for (const char of match[1].toUpperCase()) col = col * 26 + (char.charCodeAt(0) - 64);
  return { col: col - 1, row: Number(match[2]) - 1 };
}
function evaluateGridFormula(formula, resolve) {
  const src = formula.slice(1);
  let pos = 0;
  const skipSpaces = () => {
    while (pos < src.length && src[pos] === " ") pos += 1;
  };
  const parseOperand = () => {
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
  for (; ; ) {
    skipSpaces();
    if (pos >= src.length) return acc;
    if (src[pos] !== "&") return formula;
    pos += 1;
    const right = parseOperand();
    if (right === null) return formula;
    acc += right;
  }
}
function roundFillNumber(value) {
  return Math.round(value * 1e10) / 1e10;
}
function formatFillNumber(value) {
  return canonicalGridDecimal(String(roundFillNumber(value)));
}
function fillIsoDate(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day) + days * 864e5);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
var daysBetween = (left, right) => {
  const [ly, lm, ld] = left.split("-").map(Number);
  const [ry, rm, rd] = right.split("-").map(Number);
  return (Date.UTC(ry, rm - 1, rd) - Date.UTC(ly, lm - 1, ld)) / 864e5;
};
function extendGridFillLine(source, count, direction) {
  if (count <= 0) return [];
  const values = source.length > 0 ? source : [""];
  const step = (first, last, length) => length > 1 ? (last - first) / (length - 1) : 1;
  const numbers = values.map(parseGridNumber);
  if (numbers.every((parsed) => parsed !== null)) {
    const stride = step(numbers[0], numbers[numbers.length - 1], numbers.length);
    return Array.from({ length: count }, (_, index) => {
      const distance = direction === 1 ? numbers.length - 1 + index + 1 : -(index + 1);
      return formatFillNumber(numbers[0] + stride * distance);
    });
  }
  const dates = values.map(parseGridDate);
  if (dates.every((parsed) => parsed !== null)) {
    const stride = dates.length > 1 ? daysBetween(dates[0], dates[dates.length - 1]) / (dates.length - 1) : 1;
    return Array.from({ length: count }, (_, index) => {
      const distance = direction === 1 ? dates.length - 1 + index + 1 : -(index + 1);
      return fillIsoDate(dates[0], Math.round(stride * distance));
    });
  }
  const patterns = values.map((value) => /^(.*?)(\d+)(.*)$/.exec(value));
  if (patterns.every((match) => match !== null)) {
    const [pre, post] = [patterns[0][1], patterns[0][3]];
    if (patterns.every((match) => match[1] === pre && match[3] === post)) {
      const digits = patterns.map((match) => match[2]);
      const nums = digits.map(Number);
      const width = Math.max(...digits.map((digit) => digit.length));
      const stride = step(nums[0], nums[nums.length - 1], nums.length);
      return Array.from({ length: count }, (_, index) => {
        const distance = direction === 1 ? nums.length - 1 + index + 1 : -(index + 1);
        const next = Math.round(nums[0] + stride * distance);
        return `${pre}${String(Math.abs(next)).padStart(width, "0")}${post}`;
      });
    }
  }
  return Array.from({ length: count }, (_, index) => {
    const length = values.length;
    const offset = direction === 1 ? index : (length - 1 - index % length + length) % length;
    return values[offset % length];
  });
}

// src/components/SimpleGridVendor/editors.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var MENU_OVERSCAN = 6;
function placeCaretAtEnd(el) {
  el.focus();
  const doc = el.ownerDocument;
  const range = doc.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = doc.defaultView?.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
function placeCaretAtPoint(el, x, y) {
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
function textOffsetOf(el, node, offset) {
  if (!node) return el.textContent?.length ?? 0;
  const doc = el.ownerDocument;
  const pre = doc.createRange();
  pre.selectNodeContents(el);
  try {
    pre.setEnd(node, offset);
  } catch {
  }
  return pre.toString().length;
}
function insertPlainText(el, text, report) {
  const doc = el.ownerDocument;
  try {
    if (doc.execCommand("insertText", false, text)) {
      report(el.textContent ?? "");
      return;
    }
  } catch {
  }
  const selection = doc.defaultView?.getSelection();
  const current = el.textContent ?? "";
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
function insertLineBreak(el, report) {
  const selection = el.ownerDocument.defaultView?.getSelection();
  const current = el.textContent ?? "";
  let start = current.length, end = start;
  if (selection?.rangeCount && el.contains(selection.anchorNode) && el.contains(selection.focusNode)) {
    const range = selection.getRangeAt(0);
    start = textOffsetOf(el, range.startContainer, range.startOffset);
    end = textOffsetOf(el, range.endContainer, range.endOffset);
  }
  const next = current.slice(0, start) + "\n" + current.slice(end);
  el.textContent = next;
  report(next);
  const node = el.firstChild;
  if (node && selection) {
    const range = el.ownerDocument.createRange();
    range.setStart(node, start + 1);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
function isMultilineEditor(el) {
  return ["normal", "pre-wrap"].includes(el.ownerDocument.defaultView?.getComputedStyle(el).whiteSpace || "");
}
function highlightQueryFragment(label, query) {
  const needle = query.trim();
  if (!needle) return label;
  const normalize = (text) => text.toLocaleLowerCase("ru-RU").replace(/ё/g, "\u0435");
  const tokens = normalize(needle).split(/\s+/).filter(Boolean);
  const lower = normalize(label);
  const marked = new Array(label.length).fill(false);
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
  const parts = [];
  let buffer = "";
  let bufferMarked = false;
  const flush = () => {
    if (!buffer) return;
    parts.push(bufferMarked ? /* @__PURE__ */ jsx("mark", { className: "rounded-sm bg-[#fff3bf] text-inherit", children: buffer }, parts.length) : buffer);
    buffer = "";
  };
  for (let index = 0; index < label.length; index += 1) {
    if (marked[index] !== bufferMarked) {
      flush();
      bufferMarked = marked[index];
    }
    buffer += label[index];
  }
  flush();
  return /* @__PURE__ */ jsx(Fragment, { children: parts });
}
function InPlaceText({ value, onChange, placeholder, inputMode, selectOnly, textStyle, caretAt, inputRef, onPaste, allowLineBreak }) {
  useLayoutEffect2(() => {
    const el = inputRef.current;
    if (!el) return;
    el.textContent = value;
    if (caretAt) placeCaretAtPoint(el, caretAt.x, caretAt.y);
    else placeCaretAtEnd(el);
  }, []);
  return /* @__PURE__ */ jsx(
    "span",
    {
      className: "block outline-none",
      contentEditable: !selectOnly,
      "data-sg-editor": "",
      "data-sg-placeholder": placeholder,
      "data-testid": "sg-editor-input",
      inputMode,
      onInput: () => {
        const el = inputRef.current;
        if (el && !selectOnly) onChange(el.textContent ?? "");
      },
      onKeyDown: (event) => {
        if (allowLineBreak && !selectOnly && event.key === "Enter" && event.altKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          event.stopPropagation();
          insertLineBreak(event.currentTarget, onChange);
          return;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          return;
        }
        if (!selectOnly && (event.key === "ArrowUp" || event.key === "ArrowDown") && isMultilineEditor(event.currentTarget)) {
          event.stopPropagation();
        }
      },
      onPaste,
      ref: inputRef,
      style: { cursor: selectOnly ? "cell" : "text", userSelect: selectOnly ? "none" : "text", ...textStyle },
      suppressContentEditableWarning: true,
      tabIndex: -1
    }
  );
}
function SimpleGridTextEditor({ value, onChange, placeholder, inputMode, textStyle, caretAt, allowLineBreak }) {
  const inputRef = useRef2(null);
  return /* @__PURE__ */ jsx(
    InPlaceText,
    {
      allowLineBreak,
      caretAt,
      inputRef,
      onChange,
      onPaste: (event) => {
        event.preventDefault();
        const el = inputRef.current;
        if (!el) return;
        const text = event.clipboardData?.getData("text/plain");
        if (text) insertPlainText(el, text, onChange);
      },
      placeholder,
      inputMode,
      selectOnly: false,
      textStyle,
      value
    }
  );
}
function SimpleGridAutocompleteEditor({
  value,
  onChange,
  commit,
  commitAndMove,
  placeholder,
  candidates,
  alwaysOpen,
  selectOnly,
  highlightMatches = true,
  menuMaxHeight = SG_OPTION_HEIGHT * 8,
  menuWidth,
  textStyle,
  caretAt,
  displayValue
}) {
  const preserveDisplay = selectOnly && displayValue !== void 0;
  const selectedIcon = preserveDisplay ? void 0 : candidates?.find((option) => option.value === value)?.icon;
  const inputRef = useRef2(null);
  const listRef = useRef2(null);
  const [open, setOpen] = useState((candidates?.length ?? 0) > 0);
  const [highlight, setHighlight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollTopRef = useRef2(0);
  const [menuPos, setMenuPos] = useState(null);
  useLayoutEffect2(() => {
    if (!open) {
      setMenuPos(null);
      return void 0;
    }
    const place = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = (el.closest("td") ?? el).getBoundingClientRect();
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
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, menuWidth, menuMaxHeight, candidates?.length]);
  const options = useMemo(
    () => selectOnly ? candidates ?? [] : fuzzyRankOptions(candidates ?? [], value),
    [candidates, value, selectOnly]
  );
  const openRef = useRef2(open);
  const optionsRef = useRef2(options);
  const highlightRef = useRef2(highlight);
  openRef.current = open;
  optionsRef.current = options;
  highlightRef.current = highlight;
  const blockHoverRef = useRef2(false);
  const setHighlightIndex = (next) => {
    highlightRef.current = next;
    setHighlight(next);
  };
  const hoverOption = (index) => {
    if (blockHoverRef.current) return;
    setHighlightIndex(index);
  };
  useLayoutEffect2(() => {
    setHighlightIndex(0);
    scrollTopRef.current = 0;
    setScrollTop(0);
    if (listRef.current) listRef.current.scrollTop = 0;
    setOpen(optionsRef.current.length > 0 && (alwaysOpen === true || value.trim().length > 0));
  }, [value]);
  const total = options.length;
  const visibleMenuMaxHeight = menuPos?.maxHeight ?? menuMaxHeight;
  const windowSize = Math.ceil(visibleMenuMaxHeight / SG_OPTION_HEIGHT) + MENU_OVERSCAN * 2;
  const start = Math.max(0, Math.floor(scrollTop / SG_OPTION_HEIGHT) - MENU_OVERSCAN);
  const end = Math.min(total, start + windowSize);
  const windowOptions = options.slice(start, end);
  const scrollRowIntoView = (index) => {
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
  const handleKeyDown = (event) => {
    if (!openRef.current) return;
    blockHoverRef.current = true;
    const list = optionsRef.current;
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && list.length) {
      event.preventDefault();
      event.stopPropagation();
      const next = (highlightRef.current + (event.key === "ArrowDown" ? 1 : -1) + list.length) % list.length;
      setHighlightIndex(next);
      scrollRowIntoView(next);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      const pick = list[highlightRef.current];
      if (pick) commit(pick.value);
      return;
    }
    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      const pick = list[highlightRef.current];
      commitAndMove?.(pick ? pick.value : void 0);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "relative h-full w-full", "data-sg-editor": true, "data-testid": "sg-editor", onKeyDownCapture: handleKeyDown, style: selectedIcon ? { display: "flex", alignItems: "flex-start" } : void 0, children: [
    selectedIcon && /* @__PURE__ */ jsx("span", { "data-testid": "sg-selected-icon", "aria-hidden": "true", style: { width: 14, height: textStyle?.lineHeight ?? 18, flexShrink: 0, marginRight: 4, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }, children: selectedIcon }),
    preserveDisplay && displayValue,
    /* @__PURE__ */ jsx(
      InPlaceText,
      {
        caretAt,
        inputRef,
        onChange,
        onPaste: (event) => {
          if (selectOnly) {
            event.preventDefault();
            return;
          }
          event.preventDefault();
          const el = inputRef.current;
          if (!el) return;
          const text = event.clipboardData?.getData("text/plain");
          if (text) insertPlainText(el, text, onChange);
        },
        placeholder,
        selectOnly,
        textStyle: preserveDisplay ? { ...textStyle, position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0 } : selectedIcon ? { ...textStyle, paddingLeft: 0, flex: 1, minWidth: 0 } : textStyle,
        value
      }
    ),
    open && total > 0 && menuPos && createPortal(/* @__PURE__ */ jsxs(
      "div",
      {
        className: "fixed z-[80] overflow-y-auto overscroll-contain rounded-md border border-[#c7d1e0] bg-white text-[12px] shadow-[0_12px_32px_rgba(9,30,66,0.18)]",
        "data-sg-portal": true,
        "data-testid": "sg-options",
        onMouseDown: (event) => {
          event.preventDefault();
          event.stopPropagation();
        },
        onMouseMove: () => {
          blockHoverRef.current = false;
        },
        onScroll: (event) => {
          const next = event.currentTarget.scrollTop;
          scrollTopRef.current = next;
          setScrollTop(next);
        },
        ref: listRef,
        role: "listbox",
        style: { left: menuPos.left, top: menuPos.top, width: menuPos.width, maxHeight: menuPos.maxHeight },
        children: [
          /* @__PURE__ */ jsx("div", { "aria-hidden": true, style: { height: total * SG_OPTION_HEIGHT, position: "relative" } }),
          windowOptions.map((option, offset) => {
            const index = start + offset;
            return /* @__PURE__ */ jsxs(
              "div",
              {
                "aria-selected": index === highlight,
                className: `absolute inset-x-0 flex cursor-pointer items-center justify-between gap-2 px-1 ${index === highlight ? "bg-[#e9f2ff]" : "hover:bg-[#f1f3f6]"}`,
                "data-testid": `sg-option-${index}`,
                onClick: () => commit(option.value),
                onMouseMove: () => hoverOption(index),
                onMouseOver: () => hoverOption(index),
                role: "option",
                style: { top: index * SG_OPTION_HEIGHT, height: SG_OPTION_HEIGHT },
                children: [
                  /* @__PURE__ */ jsxs("span", { className: "flex min-w-0 flex-1 items-center gap-1", children: [
                    option.icon ? /* @__PURE__ */ jsx("span", { className: "shrink-0", style: { width: 14, display: "flex", alignItems: "center", justifyContent: "center" }, children: option.icon }) : null,
                    /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: "min-w-0 flex-1 whitespace-normal break-words",
                        "data-testid": `sg-option-label-${index}`,
                        style: { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
                        children: highlightMatches && !selectOnly ? highlightQueryFragment(option.label, value) : option.label
                      }
                    )
                  ] }),
                  option.hint && /* @__PURE__ */ jsx("span", { className: "shrink-0 text-[#6b778c]", "data-testid": `sg-option-hint-${index}`, children: option.hint })
                ]
              },
              option.value
            );
          })
        ]
      }
    ), document.body)
  ] });
}
function SimpleGridMultiSelectEditor({
  value,
  onChange,
  commit,
  commitAndMove,
  cancel,
  chipCandidates = [],
  menuMaxHeight = SG_OPTION_HEIGHT * 8
}) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef2(null);
  const [menuPos, setMenuPos] = useState(null);
  const selected = parseGridMultiValue(value);
  const options = fuzzyRankOptions(chipCandidates, query);
  const inputRef = useRef2(null);
  useLayoutEffect2(() => {
    inputRef.current?.focus();
  }, []);
  useLayoutEffect2(() => {
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setMenuPos({ left: rect.left, top: rect.bottom, width: rect.width });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, []);
  const toggle = (optionValue) => {
    onChange(serializeGridMultiValue(selected.includes(optionValue) ? selected.filter((item) => item !== optionValue) : [...selected, optionValue]));
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "sg-multiselect-editor",
      "data-sg-editor": true,
      "data-testid": "sg-multiselect-editor",
      ref: rootRef,
      onKeyDownCapture: (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancel();
        } else if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          commit();
        } else if (event.key === "Tab") {
          event.preventDefault();
          event.stopPropagation();
          commitAndMove?.(void 0, event.shiftKey ? "left" : "right");
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          if (!options.length) return;
          event.preventDefault();
          event.stopPropagation();
          setHighlight((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
        } else if (event.key === " " && event.target.getAttribute("role") === "option") {
          event.preventDefault();
          event.stopPropagation();
          const option = options[highlight];
          if (option) toggle(option.value);
        }
      },
      children: [
        /* @__PURE__ */ jsx("input", { "aria-label": "\u041F\u043E\u0438\u0441\u043A \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432", className: "sg-multiselect-search", onChange: (event) => {
          setQuery(event.target.value);
          setHighlight(0);
        }, placeholder: "\u041F\u043E\u0438\u0441\u043A\u2026", ref: inputRef, value: query }),
        menuPos && createPortal(/* @__PURE__ */ jsxs("div", { className: "sg-multiselect-menu", "data-sg-portal": true, "data-testid": "sg-multiselect-menu", role: "listbox", "aria-label": "\u0412\u0430\u0440\u0438\u0430\u043D\u0442\u044B", "aria-multiselectable": "true", onClick: (event) => event.stopPropagation(), onMouseDown: (event) => event.stopPropagation(), style: { position: "fixed", zIndex: 1001, left: menuPos.left, top: menuPos.top + 2, width: menuPos.width, maxHeight: menuMaxHeight, border: "1px solid #c7d1ca", boxShadow: "0 2px 4px #172b4d29" }, children: [
          options.map((option, index) => /* @__PURE__ */ jsxs(
            "button",
            {
              "aria-selected": selected.includes(option.value),
              className: "sg-multiselect-option",
              "data-highlight": index === highlight || void 0,
              onClick: (event) => {
                event.stopPropagation();
                toggle(option.value);
              },
              onMouseDown: (event) => {
                event.preventDefault();
                event.stopPropagation();
              },
              role: "option",
              type: "button",
              children: [
                /* @__PURE__ */ jsx("span", { className: "sg-multiselect-option-label", children: option.label }),
                option.hint && /* @__PURE__ */ jsx("span", { className: "sg-multiselect-option-hint", children: option.hint })
              ]
            },
            option.value
          )),
          !options.length && /* @__PURE__ */ jsx("div", { className: "sg-multiselect-empty", children: "\u041D\u0435\u0442 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432" })
        ] }), document.body)
      ]
    }
  );
}
function SimpleGridChipDisplay({ value, candidates, onRemove, readOnly = false }) {
  const rootRef = useRef2(null);
  const chipRefs = useRef2([]);
  const [visibleCount, setVisibleCount] = useState(Number.MAX_SAFE_INTEGER);
  const selected = parseGridMultiValue(value);
  useLayoutEffect2(() => {
    const root = rootRef.current;
    if (!root) return void 0;
    const measure = () => {
      const available = root.clientWidth;
      if (!available) {
        setVisibleCount(selected.length);
        return;
      }
      let used = 0;
      let count = 0;
      const widths = chipRefs.current.slice(0, selected.length).map((el) => el?.getBoundingClientRect().width ?? 0);
      for (let index = 0; index < widths.length; index += 1) {
        const gap = index ? 4 : 0;
        const overflowReserve = index < widths.length - 1 ? 32 : 0;
        if (used + gap + widths[index] + overflowReserve > available) break;
        used += gap + widths[index];
        count += 1;
      }
      setVisibleCount(count);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(root);
    return () => observer?.disconnect();
  }, [selected.join("\0")]);
  if (!selected.length) return /* @__PURE__ */ jsx("span", { className: "sg-chips", "data-testid": "sg-chips", ref: rootRef });
  return /* @__PURE__ */ jsxs("span", { className: "sg-chips", "data-testid": "sg-chips", ref: rootRef, children: [
    selected.map((item, index) => {
      const label = candidates.find((candidate) => candidate.value === item)?.label ?? item;
      return /* @__PURE__ */ jsxs("span", { "aria-hidden": index >= visibleCount || void 0, className: "sg-chip", "data-testid": "sg-chip", ref: (node) => {
        chipRefs.current[index] = node;
      }, style: index >= visibleCount ? { position: "absolute", visibility: "hidden" } : void 0, title: label, children: [
        /* @__PURE__ */ jsx("span", { className: "sg-chip-label", children: label }),
        !readOnly && onRemove && /* @__PURE__ */ jsx("button", { "aria-label": `\u0423\u0434\u0430\u043B\u0438\u0442\u044C ${label}`, className: "sg-chip-remove", onClick: (event) => {
          event.stopPropagation();
          onRemove(item);
        }, onMouseDown: (event) => event.stopPropagation(), type: "button", children: "\xD7" })
      ] }, item);
    }),
    visibleCount < selected.length && /* @__PURE__ */ jsxs("span", { className: "sg-chip-overflow", "data-testid": "sg-chip-overflow", children: [
      "+",
      selected.length - visibleCount
    ] })
  ] });
}

// src/components/SimpleGridVendor/ContextMenu.tsx
import { useEffect, useLayoutEffect as useLayoutEffect3, useRef as useRef3, useState as useState2 } from "react";
import { createPortal as createPortal2 } from "react-dom";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function ContextMenu({ x, y, items, onClose, onSelect, ariaLabel = "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441 \u044F\u0447\u0435\u0439\u043A\u0430\u043C\u0438" }) {
  const ref = useRef3(null);
  const subRef = useRef3(null);
  const [submenu, setSubmenu] = useState2(null);
  const openSubmenu = (item, element, focus = false) => {
    if (!item.submenu) return;
    const rect = element.getBoundingClientRect(), width = item.submenuLayout === "palette" ? 166 : 210;
    const left = rect.right + width <= window.innerWidth - 8 ? rect.right - 2 : Math.max(8, rect.left - width + 2);
    const height = item.submenuLayout === "grid" ? 136 : item.submenuLayout === "palette" ? 132 : Math.min(item.submenu.length * 40 + 16, window.innerHeight - 16);
    setSubmenu({ id: item.id, left, top: Math.max(8, Math.min(rect.top - 4, window.innerHeight - height - 8)) });
    if (focus) requestAnimationFrame(() => subRef.current?.querySelector("button:not(:disabled)")?.focus());
  };
  useLayoutEffect3(() => {
    const panel = ref.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
    panel.focus({ preventScroll: true });
  }, [x, y]);
  useEffect(() => {
    const outside = (event) => {
      if (!(event.target instanceof Node) || !ref.current?.contains(event.target) && !subRef.current?.contains(event.target)) onClose(false);
    };
    const dismiss = (event) => {
      if (!(event.target instanceof Node) || !ref.current?.contains(event.target) && !subRef.current?.contains(event.target)) onClose(false);
    };
    document.addEventListener("mousedown", outside);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("blur", dismiss);
    };
  }, [onClose]);
  if (!items.some((item) => !("separator" in item))) return null;
  return createPortal2(/* @__PURE__ */ jsx2(
    "div",
    {
      ref,
      "data-sg-portal": "",
      className: "sg-context-menu",
      role: "menu",
      "aria-label": ariaLabel,
      tabIndex: -1,
      style: { left: x, top: y },
      onMouseDown: (event) => event.stopPropagation(),
      onClick: (event) => event.stopPropagation(),
      onContextMenu: (event) => event.preventDefault(),
      onKeyDown: (event) => {
        event.stopPropagation();
        if (event.key === "Escape" || event.key === "Tab") {
          event.preventDefault();
          onClose(true);
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const buttons = Array.from(ref.current?.querySelectorAll("button:not(:disabled)") ?? []);
        if (!buttons.length) return;
        const index = buttons.indexOf(document.activeElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : index < 0 ? event.key === "ArrowDown" ? 0 : buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].focus();
      },
      children: items.map((item) => "separator" in item ? /* @__PURE__ */ jsx2("div", { role: "separator", className: "sg-context-separator" }, item.id) : /* @__PURE__ */ jsxs2("div", { className: `sg-context-entry${item.submenu ? " sg-context-entry-submenu" : ""}`, onMouseEnter: (event) => item.submenu ? openSubmenu(item, event.currentTarget) : setSubmenu(null), children: [
        /* @__PURE__ */ jsxs2(
          "button",
          {
            type: "button",
            role: "menuitem",
            tabIndex: -1,
            disabled: item.disabled,
            className: `sg-context-action${item.danger ? " sg-context-danger" : ""}`,
            "data-submenu-trigger": item.submenu ? item.id : void 0,
            "aria-haspopup": item.submenu ? "menu" : void 0,
            "aria-expanded": item.submenu ? submenu?.id === item.id : void 0,
            onKeyDown: (event) => {
              if (item.submenu && event.key === "ArrowRight") {
                event.preventDefault();
                event.stopPropagation();
                openSubmenu(item, event.currentTarget.parentElement, true);
              }
            },
            onClick: (event) => item.submenu ? openSubmenu(item, event.currentTarget.parentElement, true) : onSelect(item),
            children: [
              /* @__PURE__ */ jsx2("span", { className: "sg-context-icon", "aria-hidden": "true", children: item.icon }),
              /* @__PURE__ */ jsx2("span", { children: item.label }),
              item.shortcut && /* @__PURE__ */ jsx2("span", { className: "sg-context-shortcut", children: item.shortcut }),
              item.submenu && /* @__PURE__ */ jsx2("span", { className: "sg-context-submenu-arrow", "aria-hidden": "true", children: "\u203A" })
            ]
          }
        ),
        item.submenu && submenu?.id === item.id && createPortal2(/* @__PURE__ */ jsx2(
          "div",
          {
            ref: subRef,
            "data-sg-portal": "",
            className: `sg-context-submenu${item.submenuLayout === "grid" ? " sg-context-submenu-grid" : item.submenuLayout === "palette" ? " sg-context-submenu-palette" : ""}`,
            role: "menu",
            "aria-label": item.label,
            style: { left: submenu.left, top: submenu.top },
            onMouseDown: (event) => event.stopPropagation(),
            onClick: (event) => event.stopPropagation(),
            onKeyDown: (event) => {
              event.stopPropagation();
              if (event.key === "Escape" || event.key === "ArrowLeft") {
                event.preventDefault();
                setSubmenu(null);
                ref.current?.querySelector(`[data-submenu-trigger="${item.id}"]`)?.focus();
                return;
              }
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const buttons = Array.from(subRef.current?.querySelectorAll("button:not(:disabled)") || []);
              const index = buttons.indexOf(document.activeElement);
              const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : index < 0 ? event.key === "ArrowDown" ? 0 : buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
              buttons[next]?.focus();
            },
            children: item.submenu.map((child) => "separator" in child ? /* @__PURE__ */ jsx2("div", { role: "separator", className: "sg-context-separator" }, child.id) : /* @__PURE__ */ jsx2("div", { className: "sg-context-entry", children: /* @__PURE__ */ jsxs2("button", { type: "button", role: "menuitem", tabIndex: -1, disabled: child.disabled, className: `sg-context-action${child.danger ? " sg-context-danger" : ""}`, onClick: () => onSelect(child), children: [
              /* @__PURE__ */ jsx2("span", { className: "sg-context-icon", "aria-hidden": "true", children: child.icon }),
              /* @__PURE__ */ jsx2("span", { children: child.label })
            ] }) }, child.id))
          }
        ), document.body)
      ] }, item.id))
    }
  ), document.body);
}

// src/components/SimpleGridVendor/comments.tsx
import { useEffect as useEffect2, useLayoutEffect as useLayoutEffect4, useRef as useRef4, useState as useState3 } from "react";
import { createPortal as createPortal3 } from "react-dom";
import { Fragment as Fragment2, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var HOVER_DELAY = 180;
var CLOSE_DELAY = 160;
var CARD_WIDTH = 300;
var CARD_GAP = 6;
function commentTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = /* @__PURE__ */ new Date();
  return date.toDateString() === now.toDateString() ? date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : date.toLocaleDateString("ru-RU");
}
function commentMarkerLabel(comments) {
  const open = comments.filter((comment) => !comment.resolved).length;
  const tasks = comments.filter((comment) => comment.task && !comment.resolved).length;
  const count = `${comments.length} ${comments.length % 10 === 1 && comments.length % 100 !== 11 ? "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439" : comments.length % 10 >= 2 && comments.length % 10 <= 4 && (comments.length % 100 < 10 || comments.length % 100 >= 20) ? "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u044F" : "\u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0435\u0432"}`;
  return `\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438 \u043A \u044F\u0447\u0435\u0439\u043A\u0435: ${count}${open ? "" : ", \u0432\u0441\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u044B"}${tasks ? `, \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0437\u0430\u0434\u0430\u0447: ${tasks}` : ""}`;
}
function CommentMarker({
  comments,
  target,
  testId,
  onOpen
}) {
  const marker = useRef4(null);
  const card = useRef4(null);
  const openTimer = useRef4(null);
  const closeTimer = useRef4(null);
  const [open, setOpen] = useState3(false);
  const [position, setPosition] = useState3({ top: 0, left: 0, above: false });
  const clearTimers = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  useEffect2(() => clearTimers, []);
  useEffect2(() => {
    if (!open) return;
    const dismiss = () => setOpen(false);
    const escape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const outside = (event) => {
      const node = event.target;
      if (marker.current?.contains(node) || card.current?.contains(node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);
  useLayoutEffect4(() => {
    if (!open || !marker.current) return;
    const anchor = marker.current.getBoundingClientRect();
    const height = card.current?.getBoundingClientRect().height ?? 180;
    const above = anchor.bottom + CARD_GAP + height > window.innerHeight - 8 && anchor.top - CARD_GAP - height > 8;
    setPosition({
      top: above ? Math.max(8, anchor.top - CARD_GAP - height) : anchor.bottom + CARD_GAP,
      left: Math.max(8, Math.min(anchor.right - CARD_WIDTH, window.innerWidth - CARD_WIDTH - 8)),
      above
    });
  }, [open]);
  const enter = () => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), HOVER_DELAY);
  };
  const leave = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };
  const resolved = comments.every((comment) => comment.resolved);
  const hasTask = comments.some((comment) => comment.task && !comment.resolved);
  const visible = comments.slice(0, 3);
  const hidden = comments.length - visible.length;
  return /* @__PURE__ */ jsxs3(Fragment2, { children: [
    /* @__PURE__ */ jsx3(
      "button",
      {
        ref: marker,
        "aria-label": commentMarkerLabel(comments),
        className: "sg-comment-marker",
        "data-resolved": resolved ? "" : void 0,
        "data-task": hasTask ? "" : void 0,
        "data-testid": testId,
        onClick: (event) => {
          event.preventDefault();
          event.stopPropagation();
          clearTimers();
          setOpen(false);
          onOpen?.(target);
        },
        onKeyDown: (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          onOpen?.(target);
        },
        onMouseDown: (event) => event.stopPropagation(),
        onMouseEnter: enter,
        onMouseLeave: leave,
        tabIndex: -1,
        title: commentMarkerLabel(comments),
        type: "button"
      }
    ),
    open && createPortal3(
      /* @__PURE__ */ jsxs3(
        "div",
        {
          ref: card,
          "aria-label": `\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438 \u043A \u044F\u0447\u0435\u0439\u043A\u0435 ${target.columnTitle || target.columnId}`,
          className: "sg-comment-card",
          "data-above": position.above ? "" : void 0,
          "data-sg-portal": "",
          role: "dialog",
          style: { top: position.top, left: position.left, width: CARD_WIDTH },
          onMouseEnter: clearTimers,
          onMouseLeave: leave,
          children: [
            /* @__PURE__ */ jsxs3("div", { className: "sg-comment-card-heading", children: [
              /* @__PURE__ */ jsx3("strong", { children: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438" }),
              /* @__PURE__ */ jsx3("span", { children: comments.length })
            ] }),
            /* @__PURE__ */ jsxs3("div", { className: "sg-comment-card-list", children: [
              visible.map((comment) => /* @__PURE__ */ jsxs3("article", { className: "sg-comment-card-item", "data-resolved": comment.resolved ? "" : void 0, children: [
                /* @__PURE__ */ jsxs3("div", { className: "sg-comment-card-meta", children: [
                  /* @__PURE__ */ jsx3("strong", { children: comment.author || "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A" }),
                  comment.createdAt && /* @__PURE__ */ jsx3("time", { dateTime: comment.createdAt, children: commentTime(comment.createdAt) })
                ] }),
                /* @__PURE__ */ jsx3("p", { children: comment.text }),
                (comment.task || comment.resolved) && /* @__PURE__ */ jsxs3("div", { className: "sg-comment-card-badges", children: [
                  comment.task && /* @__PURE__ */ jsx3("span", { className: "sg-comment-badge", children: comment.resolved ? "\u0417\u0430\u0434\u0430\u0447\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0430" : "\u0417\u0430\u0434\u0430\u0447\u0430" }),
                  comment.resolved && !comment.task && /* @__PURE__ */ jsx3("span", { className: "sg-comment-badge is-done", children: "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" })
                ] })
              ] }, comment.id)),
              hidden > 0 && /* @__PURE__ */ jsxs3("div", { className: "sg-comment-card-more", children: [
                "\u0415\u0449\u0451 ",
                hidden
              ] })
            ] }),
            onOpen && /* @__PURE__ */ jsx3("button", { className: "sg-comment-card-action", onClick: () => {
              setOpen(false);
              onOpen(target);
            }, type: "button", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C" })
          ]
        }
      ),
      document.body
    )
  ] });
}

// src/components/SimpleGridVendor/DatePicker.tsx
import { useEffect as useEffect3, useLayoutEffect as useLayoutEffect5, useRef as useRef5, useState as useState4 } from "react";
import { createPortal as createPortal4 } from "react-dom";

// ../../../../node_modules/lucide-react/dist/esm/createLucideIcon.js
import { forwardRef as forwardRef2, createElement as createElement2 } from "react";

// ../../../../node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.js
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();

// ../../../../node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.js
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

// ../../../../node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.js
var toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);

// ../../../../node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.js
var toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

// ../../../../node_modules/lucide-react/dist/esm/Icon.js
import { forwardRef, createElement } from "react";

// ../../../../node_modules/lucide-react/dist/esm/defaultAttributes.js
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

// ../../../../node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.js
var hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
  return false;
};

// ../../../../node_modules/lucide-react/dist/esm/Icon.js
var Icon = forwardRef(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => createElement(
    "svg",
    {
      ref,
      ...defaultAttributes,
      width: size,
      height: size,
      stroke: color,
      strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
      className: mergeClasses("lucide", className),
      ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
      ...rest
    },
    [
      ...iconNode.map(([tag, attrs]) => createElement(tag, attrs)),
      ...Array.isArray(children) ? children : [children]
    ]
  )
);

// ../../../../node_modules/lucide-react/dist/esm/createLucideIcon.js
var createLucideIcon = (iconName, iconNode) => {
  const Component = forwardRef2(
    ({ className, ...props }, ref) => createElement2(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className
      ),
      ...props
    })
  );
  Component.displayName = toPascalCase(iconName);
  return Component;
};

// ../../../../node_modules/lucide-react/dist/esm/icons/calendar-days.js
var __iconNode = [
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
  ["path", { d: "M3 10h18", key: "8toen8" }],
  ["path", { d: "M8 14h.01", key: "6423bh" }],
  ["path", { d: "M12 14h.01", key: "1etili" }],
  ["path", { d: "M16 14h.01", key: "1gbofw" }],
  ["path", { d: "M8 18h.01", key: "lrp35t" }],
  ["path", { d: "M12 18h.01", key: "mhygvu" }],
  ["path", { d: "M16 18h.01", key: "kzsmim" }]
];
var CalendarDays = createLucideIcon("calendar-days", __iconNode);

// src/components/SimpleGridVendor/DatePicker.tsx
import { Fragment as Fragment3, jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var isoDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
var monthAt = (date, offset) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
var monthLabel = new Intl.DateTimeFormat("ru", { month: "long", year: "numeric" });
function CellDatePicker({ value, title, min, max, context, beforeOpen, onPick, onClose }) {
  const trigger = useRef5(null);
  const panel = useRef5(null);
  const scroll = useRef5(null);
  const prepend = useRef5(null);
  const [open, setOpen] = useState4(false);
  const [months, setMonths] = useState4([]);
  const [cursor, setCursor] = useState4("");
  const [position, setPosition] = useState4({ left: 0, top: 0 });
  const selected = parseGridDate(value);
  const start = parseGridDate(context?.range?.start || "");
  const end = parseGridDate(context?.range?.end || "");
  const startLabel = context?.range?.startLabel || "\u041D\u0430\u0447\u0430\u043B\u043E \u043F\u0435\u0440\u0438\u043E\u0434\u0430";
  const endLabel = context?.range?.endLabel || "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435 \u043F\u0435\u0440\u0438\u043E\u0434\u0430";
  const markers = (context?.markers || []).map((marker) => ({ ...marker, iso: parseGridDate(marker.value) }));
  const hasContext = !!context?.range || markers.length > 0;
  const allowed = (iso) => (!min || iso >= min) && (!max || iso <= max);
  const close = (restore) => {
    setOpen(false);
    if (restore) onClose();
  };
  useLayoutEffect5(() => {
    if (!open) return;
    const place = () => {
      if (!trigger.current || !panel.current) return;
      const rect = trigger.current.getBoundingClientRect();
      const { width, height } = panel.current.getBoundingClientRect();
      setPosition({
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
        top: rect.bottom + height + 4 <= window.innerHeight - 8 ? rect.bottom + 4 : Math.max(8, rect.top - height - 4)
      });
    };
    place();
    const target = scroll.current?.querySelector(`[data-day="${cursor}"]`);
    if (target && scroll.current) {
      const month = target.closest("[data-month]");
      scroll.current.scrollTop = month?.offsetTop ?? 0;
      target.focus({ preventScroll: true });
    }
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useLayoutEffect5(() => {
    if (prepend.current && scroll.current) {
      scroll.current.scrollTop = scroll.current.scrollHeight - prepend.current.height + prepend.current.top;
      prepend.current = null;
    }
  }, [months]);
  useEffect3(() => {
    if (!open) return;
    const outside = (event) => {
      if (!panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) close(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  const moveCursor = (delta) => {
    const next = /* @__PURE__ */ new Date(`${cursor}T12:00:00`);
    next.setDate(next.getDate() + delta);
    const iso = isoDay(next);
    if (!allowed(iso)) return;
    setCursor(iso);
    setMonths((previous) => {
      if (monthAt(next, 0) < previous[0]) return [monthAt(next, 0), ...previous];
      if (monthAt(next, 0) > previous[previous.length - 1]) return [...previous, monthAt(next, 0)];
      return previous;
    });
  };
  useLayoutEffect5(() => {
    if (!open) return;
    scroll.current?.querySelector(`[data-day="${cursor}"]`)?.focus({ preventScroll: true });
  }, [cursor, months]);
  useLayoutEffect5(() => {
    const container = scroll.current;
    const day = container?.querySelector(`[data-day="${cursor}"]`);
    if (!container || !day) return;
    if (day.offsetTop < container.scrollTop) container.scrollTop = day.offsetTop;
    else if (day.offsetTop + day.offsetHeight > container.scrollTop + container.clientHeight) {
      container.scrollTop = day.offsetTop + day.offsetHeight - container.clientHeight;
    }
  }, [cursor]);
  return /* @__PURE__ */ jsxs4(Fragment3, { children: [
    /* @__PURE__ */ jsx4(
      "button",
      {
        ref: trigger,
        type: "button",
        className: "sg-calendar-trigger",
        "aria-label": `\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C: ${title}`,
        title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C",
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        onMouseDown: (event) => {
          event.preventDefault();
          event.stopPropagation();
        },
        onDoubleClick: (event) => event.stopPropagation(),
        onKeyDown: (event) => event.stopPropagation(),
        onClick: (event) => {
          event.stopPropagation();
          if (open) {
            close(true);
            return;
          }
          if (!beforeOpen()) return;
          const initial = selected || parseGridDate(context?.initialDate || "") || isoDay(/* @__PURE__ */ new Date());
          const bounded = min && initial < min ? min : max && initial > max ? max : initial;
          const date = /* @__PURE__ */ new Date(`${bounded}T12:00:00`);
          setCursor(bounded);
          setMonths([-1, 0, 1].map((offset) => monthAt(date, offset)));
          setOpen(true);
        },
        children: /* @__PURE__ */ jsx4(CalendarDays, { size: 14, "aria-hidden": "true" })
      }
    ),
    open && createPortal4(/* @__PURE__ */ jsxs4(
      "div",
      {
        ref: panel,
        className: "sg-calendar",
        "data-selection-role": context?.selectionRole,
        "data-context": hasContext || void 0,
        "data-sg-portal": "",
        role: "dialog",
        "aria-label": `\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C: ${title}`,
        style: { ...position, position: "fixed", zIndex: 1200 },
        onMouseDown: (event) => event.stopPropagation(),
        onClick: (event) => event.stopPropagation(),
        onDoubleClick: (event) => event.stopPropagation(),
        onBlur: (event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) close(false);
        },
        onKeyDown: (event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            close(true);
          }
          const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
          if (delta) {
            event.preventDefault();
            moveCursor(delta);
          }
        },
        children: [
          hasContext && /* @__PURE__ */ jsxs4("div", { className: "sg-calendar-heading", children: [
            "\u0412\u044B\u0431\u043E\u0440: ",
            title.toLocaleLowerCase("ru")
          ] }),
          /* @__PURE__ */ jsx4("div", { className: "sg-calendar-scroll", ref: scroll, onScroll: () => {
            const element = scroll.current;
            if (!element || prepend.current) return;
            if (element.scrollTop < 80) {
              prepend.current = { height: element.scrollHeight, top: element.scrollTop };
              setMonths((previous) => [monthAt(previous[0], -1), ...previous]);
            } else if (element.scrollTop + element.clientHeight > element.scrollHeight - 80) {
              setMonths((previous) => [...previous, monthAt(previous[previous.length - 1], 1)]);
            }
          }, children: months.map((month) => /* @__PURE__ */ jsxs4("section", { "data-month": isoDay(month), children: [
            /* @__PURE__ */ jsx4("div", { className: "sg-calendar-month", children: monthLabel.format(month).replace(/\s*г\.$/, "") }),
            /* @__PURE__ */ jsxs4("div", { className: "sg-calendar-days", children: [
              ["\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431", "\u0412\u0441"].map((day) => /* @__PURE__ */ jsx4("span", { className: "sg-calendar-weekday", children: day }, day)),
              Array.from({ length: (month.getDay() + 6) % 7 }, (_, index) => /* @__PURE__ */ jsx4("span", {}, `empty-${index}`)),
              Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => {
                const date = new Date(month.getFullYear(), month.getMonth(), index + 1), iso = isoDay(date);
                const labels = [iso === start ? startLabel : "", iso === end ? endLabel : "", ...markers.filter((marker) => marker.iso === iso).map((marker) => marker.label)].filter(Boolean);
                return /* @__PURE__ */ jsx4(
                  "button",
                  {
                    type: "button",
                    "data-day": iso,
                    "aria-label": [date.toLocaleDateString("ru"), ...labels].join(", "),
                    title: labels.length ? labels.join(" \xB7 ") : void 0,
                    "data-range-start": iso === start || void 0,
                    "data-range-end": iso === end || void 0,
                    "data-in-range": !!start && !!end && start <= end && iso >= start && iso <= end || void 0,
                    "data-marked": markers.some((marker) => marker.iso === iso) || void 0,
                    "aria-pressed": iso === selected,
                    "aria-current": iso === isoDay(/* @__PURE__ */ new Date()) ? "date" : void 0,
                    disabled: !allowed(iso),
                    tabIndex: iso === cursor ? 0 : -1,
                    className: `sg-calendar-day${date.getDay() === 0 || date.getDay() === 6 ? " is-weekend" : ""}`,
                    onFocus: () => setCursor(iso),
                    onClick: () => {
                      onPick(iso);
                      close(true);
                    },
                    children: index + 1
                  },
                  iso
                );
              })
            ] })
          ] }, isoDay(month))) })
        ]
      }
    ), document.body)
  ] });
}

// src/components/SimpleGridVendor/SimpleGrid.tsx
import { Fragment as Fragment5, jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function ownGridElements(root, selector) {
  return root ? Array.from(root.querySelectorAll(selector)).filter((element) => element.closest("[data-sg]") === root) : [];
}
function normalizeColumnGroups(definitions, columns) {
  const positions = new Map(columns.map((column, index) => [column.id, index]));
  const owned = /* @__PURE__ */ new Set();
  const groupIds = /* @__PURE__ */ new Set();
  const summaryIds = new Set(positions.keys());
  const result = [];
  for (const definition of definitions) {
    const localLeaves = /* @__PURE__ */ new Set();
    const localGroups = /* @__PURE__ */ new Set();
    const visiting = /* @__PURE__ */ new Set();
    const visit = (entry) => {
      if (!entry || visiting.has(entry) || !entry.id || groupIds.has(entry.id) || localGroups.has(entry.id) || !Array.isArray(entry.children) || !entry.children.length || !entry.summaryColumn || !Number.isFinite(entry.summaryColumn.width) || entry.summaryColumn.width <= 0 || typeof entry.summaryColumn.getValue !== "function") return null;
      localGroups.add(entry.id);
      visiting.add(entry);
      const children = [];
      const leafIds = [];
      for (const child of entry.children) {
        if (typeof child === "string") {
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
      const indexes = leafIds.map((id) => positions.get(id));
      if (indexes.some((index, i) => i > 0 && index !== indexes[i - 1] + 1)) return null;
      return { definition: entry, children, leafIds, summaryId: "" };
    };
    const group = visit(definition);
    if (!group) continue;
    localLeaves.forEach((id) => owned.add(id));
    localGroups.forEach((id) => groupIds.add(id));
    const assignSummary = (entry) => {
      let id = `__sg_summary_${entry.definition.id}`;
      while (summaryIds.has(id)) id += "_";
      summaryIds.add(id);
      entry.summaryId = id;
      entry.children.forEach((child) => {
        if (typeof child !== "string") assignSummary(child);
      });
    };
    assignSummary(group);
    result.push(group);
  }
  return result;
}
var SG_CELL_ICON_WIDTH = 14;
var SG_CELL_ICON_GAP = 4;
var headerIconNode = (icon, position, id) => !icon ? null : /* @__PURE__ */ jsx5(
  "span",
  {
    "aria-hidden": "true",
    className: "sg-header-icon",
    "data-testid": `sg-header-icon-${id}`,
    style: position === "after" ? { marginLeft: SG_CELL_ICON_GAP } : { marginRight: SG_CELL_ICON_GAP },
    children: icon
  }
);
var SG_HISTORY_LIMIT = 100;
var SG_DEFAULT_SELECTION_LINE = "#217346";
var SG_DEFAULT_SELECTION_FILL = "#e8f1ec";
var SG_REORDER_THRESHOLD = 5;
function dropSlot(midpoints, position) {
  let slot = 0;
  while (slot < midpoints.length && position >= midpoints[slot]) slot += 1;
  return slot;
}
function ChevronDownIcon() {
  return /* @__PURE__ */ jsx5(
    "svg",
    {
      "aria-hidden": "true",
      fill: "currentColor",
      height: "14",
      stroke: "none",
      viewBox: "0 0 24 24",
      width: "14",
      children: /* @__PURE__ */ jsx5("path", { d: "M7 10h10l-5 5z" })
    }
  );
}
var cellBase = "align-middle border-b border-r border-[#dfe1e6] p-0";
function cellLocked(row, rowIndex, column) {
  return Boolean(column.isDisabled?.(row, rowIndex) || column.isSkeleton?.(row, rowIndex));
}
function formatEditingValue(column, value) {
  if (value.trimStart().startsWith("=")) return value;
  if (column?.kind === "number" || column?.validation?.type === "number") return canonicalGridDecimal(value);
  if (!column?.editor && (column?.validation?.type === "date" || column?.format?.kind === "date")) {
    return formatGridValue({ kind: "date" }, value);
  }
  return value;
}
var columnMenuIconPaths = {
  "sort-asc": ["m3 16 4 4 4-4", "M7 20V4", "M20 8h-5", "M15 10V6.5a2.5 2.5 0 0 1 5 0V10", "M15 14h5l-5 6h5"],
  "sort-desc": ["m3 16 4 4 4-4", "M7 4v16", "M15 4h5l-5 6h5", "M15 20v-3.5a2.5 2.5 0 0 1 5 0V20", "M20 18h-5"],
  "clear-filter": ["M12.531 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l.427-.473", "m16.5 3.5 5 5", "m21.5 3.5-5 5"],
  filter: ["M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"]
};
function ColumnMenuIcon({ name, size = 16 }) {
  return /* @__PURE__ */ jsx5(
    "svg",
    {
      "aria-hidden": "true",
      focusable: "false",
      "data-sg-menu-icon": name,
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { flexShrink: 0 },
      children: columnMenuIconPaths[name].map((path) => /* @__PURE__ */ jsx5("path", { d: path }, path))
    }
  );
}
function ColumnMenu({ column, columns, options, selected, sort, hidden, button, close, apply, reset, changeSort, changeHidden }) {
  const panelRef = useRef6(null);
  const searchRef = useRef6(null);
  const columnsButtonRef = useRef6(null);
  const submenuRef = useRef6(null);
  const focusSubmenuRef = useRef6(false);
  const [submenuOpen, setSubmenuOpen] = useState5(false);
  const [submenuPosition, setSubmenuPosition] = useState5({ top: 0, left: 0 });
  const [search, setSearch] = useState5("");
  const [checked, setChecked] = useState5(() => new Set(selected ?? options.map((option) => option.value)));
  const [scrollTop, setScrollTop] = useState5(0);
  const [position, setPosition] = useState5({ top: 0, left: 0 });
  const filtered = options.filter((option) => option.label.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")));
  const matching = filtered.filter((option) => checked.has(option.value));
  const first = Math.max(0, Math.floor(scrollTop / 28) - 2);
  const shown = filtered.slice(first, first + 12);
  const finish = () => {
    close();
    button.focus({ preventScroll: true });
  };
  const place = () => {
    const rect = button.getBoundingClientRect();
    const height = panelRef.current?.offsetHeight || 430;
    setPosition({ left: Math.max(8, Math.min(rect.right - 280, window.innerWidth - 288)), top: Math.max(8, Math.min(rect.bottom + 1, window.innerHeight - height - 8)) });
  };
  useLayoutEffect6(() => {
    place();
    (searchRef.current ?? panelRef.current)?.focus({ preventScroll: true });
  }, []);
  useLayoutEffect6(() => {
    if (!submenuOpen || !columnsButtonRef.current || !panelRef.current) return;
    const trigger = columnsButtonRef.current.getBoundingClientRect();
    const panel = panelRef.current.getBoundingClientRect();
    const width = submenuRef.current?.offsetWidth || 240;
    const height = submenuRef.current?.offsetHeight || Math.min(columns.length * 28 + 46, window.innerHeight - 16);
    const left = panel.right + width <= window.innerWidth - 8 ? panel.right - 1 : panel.left - width + 1;
    setSubmenuPosition({ left: Math.max(8, Math.min(left, window.innerWidth - width - 8)), top: Math.max(8, Math.min(trigger.top, window.innerHeight - height - 8)) });
    if (focusSubmenuRef.current) {
      submenuRef.current?.querySelector("input, button")?.focus();
      focusSubmenuRef.current = false;
    }
  }, [submenuOpen, position, columns.length]);
  useEffect4(() => {
    const outside = (event) => {
      if (!panelRef.current?.contains(event.target) && !submenuRef.current?.contains(event.target) && !button.contains(event.target)) finish();
    };
    window.addEventListener("mousedown", outside);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("mousedown", outside);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, []);
  const item = (label, action, icon) => /* @__PURE__ */ jsxs5("button", { type: "button", className: `sg-menu-action${icon ? "" : " sg-menu-action-no-icon"}`, onMouseEnter: () => setSubmenuOpen(false), onClick: action, children: [
    icon && /* @__PURE__ */ jsx5(ColumnMenuIcon, { name: icon }),
    /* @__PURE__ */ jsx5("span", { children: label })
  ] });
  return createPortal5(
    /* @__PURE__ */ jsxs5(
      "div",
      {
        "data-sg-portal": "",
        className: "sg-column-menu",
        "aria-label": column ? `\u041C\u0435\u043D\u044E \u0441\u0442\u043E\u043B\u0431\u0446\u0430 ${column.title || column.id}` : "\u0412\u0438\u0434\u0438\u043C\u043E\u0441\u0442\u044C \u0441\u0442\u043E\u043B\u0431\u0446\u043E\u0432",
        role: "dialog",
        tabIndex: -1,
        ref: panelRef,
        style: { top: position.top, left: position.left },
        onMouseDown: (event) => event.stopPropagation(),
        onClick: (event) => event.stopPropagation(),
        onCopy: (event) => event.stopPropagation(),
        onCut: (event) => event.stopPropagation(),
        onPaste: (event) => event.stopPropagation(),
        onKeyDown: (event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            if (submenuOpen) {
              setSubmenuOpen(false);
              columnsButtonRef.current?.focus();
            } else finish();
          }
          if (event.key === "Tab") {
            const focusRoot = submenuRef.current?.contains(event.target) ? submenuRef.current : panelRef.current;
            const controls = [...focusRoot?.querySelectorAll("button:not(:disabled), input:not(:disabled), .sg-menu-values") ?? []].filter((element) => element.getClientRects().length > 0);
            const index = controls.indexOf(document.activeElement);
            if (event.shiftKey && index <= 0) {
              event.preventDefault();
              controls[controls.length - 1]?.focus();
            } else if (!event.shiftKey && index === controls.length - 1) {
              event.preventDefault();
              controls[0]?.focus();
            }
          }
        },
        children: [
          !column && /* @__PURE__ */ jsx5("strong", { children: "\u0421\u0442\u043E\u043B\u0431\u0446\u044B" }),
          column?.getValue && /* @__PURE__ */ jsxs5(Fragment5, { children: [
            item("\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430 \u043F\u043E \u0432\u043E\u0437\u0440\u0430\u0441\u0442\u0430\u043D\u0438\u044E", () => {
              changeSort({ columnId: column.id, direction: "asc" });
              finish();
            }, "sort-asc"),
            item("\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430 \u043F\u043E \u0443\u0431\u044B\u0432\u0430\u043D\u0438\u044E", () => {
              changeSort({ columnId: column.id, direction: "desc" });
              finish();
            }, "sort-desc"),
            sort?.columnId === column.id && item("\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0443", () => {
              changeSort(null);
              finish();
            }),
            /* @__PURE__ */ jsxs5("button", { className: "sg-menu-action", type: "button", disabled: selected === void 0, onClick: () => {
              reset();
              finish();
            }, children: [
              /* @__PURE__ */ jsx5(ColumnMenuIcon, { name: "clear-filter" }),
              /* @__PURE__ */ jsx5("span", { children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440" })
            ] })
          ] }),
          column && item("\u0421\u043A\u0440\u044B\u0442\u044C \u0441\u0442\u043E\u043B\u0431\u0435\u0446", () => {
            changeHidden([...hidden, column.id]);
            finish();
          }),
          /* @__PURE__ */ jsxs5(
            "button",
            {
              ref: columnsButtonRef,
              className: "sg-menu-action sg-menu-action-no-icon sg-submenu-trigger",
              type: "button",
              "aria-haspopup": "dialog",
              "aria-expanded": submenuOpen,
              onMouseEnter: () => setSubmenuOpen(true),
              onClick: () => setSubmenuOpen(true),
              onKeyDown: (event) => {
                if (event.key !== "ArrowRight") return;
                event.preventDefault();
                event.stopPropagation();
                if (submenuOpen) submenuRef.current?.querySelector("input, button")?.focus();
                else {
                  focusSubmenuRef.current = true;
                  setSubmenuOpen(true);
                }
              },
              children: [
                /* @__PURE__ */ jsx5("span", { children: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u0442\u043E\u043B\u0431\u0446\u044B" }),
                /* @__PURE__ */ jsx5("svg", { "aria-hidden": "true", width: "12", height: "12", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsx5("path", { d: "m9 5 7 7-7 7z" }) })
              ]
            }
          ),
          column?.getValue && /* @__PURE__ */ jsxs5(Fragment5, { children: [
            /* @__PURE__ */ jsx5("input", { ref: searchRef, className: "sg-menu-search", "aria-label": "\u041F\u043E\u0438\u0441\u043A \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439", placeholder: "\u041F\u043E\u0438\u0441\u043A", value: search, onChange: (event) => {
              setSearch(event.target.value);
              setScrollTop(0);
              const list = panelRef.current?.querySelector(".sg-menu-values");
              if (list) list.scrollTop = 0;
            } }),
            /* @__PURE__ */ jsxs5("label", { className: "sg-menu-option", children: [
              /* @__PURE__ */ jsx5(
                "input",
                {
                  type: "checkbox",
                  checked: filtered.length > 0 && matching.length === filtered.length,
                  disabled: !filtered.length,
                  ref: (node) => {
                    if (node) node.indeterminate = matching.length > 0 && matching.length < filtered.length;
                  },
                  onChange: (event) => {
                    const next = new Set(checked);
                    filtered.forEach(({ value }) => event.target.checked ? next.add(value) : next.delete(value));
                    setChecked(next);
                  }
                }
              ),
              "\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0432\u0441\u0451"
            ] }),
            /* @__PURE__ */ jsxs5(
              "div",
              {
                className: "sg-menu-values",
                tabIndex: 0,
                "aria-label": "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0444\u0438\u043B\u044C\u0442\u0440\u0430",
                onScroll: (event) => setScrollTop(event.currentTarget.scrollTop),
                onKeyDown: (event) => {
                  const directions = { ArrowDown: 28, ArrowUp: -28, PageDown: 196, PageUp: -196, Home: -filtered.length * 28, End: filtered.length * 28 };
                  if (directions[event.key] !== void 0) {
                    event.preventDefault();
                    event.currentTarget.scrollTop += directions[event.key];
                  }
                },
                children: [
                  /* @__PURE__ */ jsx5("div", { style: { height: filtered.length * 28, position: "relative" }, children: shown.map((option, index) => /* @__PURE__ */ jsxs5("label", { className: "sg-menu-option", style: { position: "absolute", top: (first + index) * 28, width: "100%" }, children: [
                    /* @__PURE__ */ jsx5("input", { type: "checkbox", checked: checked.has(option.value), onChange: (event) => {
                      const next = new Set(checked);
                      if (event.target.checked) next.add(option.value);
                      else next.delete(option.value);
                      setChecked(next);
                    } }),
                    /* @__PURE__ */ jsx5("span", { title: option.label, children: option.label })
                  ] }, option.value)) }),
                  !filtered.length && /* @__PURE__ */ jsx5("p", { children: "\u041D\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs5("div", { className: "sg-menu-footer", children: [
              /* @__PURE__ */ jsx5("button", { type: "button", disabled: !matching.length, onClick: () => {
                apply(!search && matching.length === options.length ? null : matching.map((option) => option.value));
                finish();
              }, children: "\u041E\u041A" }),
              /* @__PURE__ */ jsx5("button", { type: "button", onClick: finish, children: "\u041E\u0442\u043C\u0435\u043D\u0430" })
            ] })
          ] }),
          !column?.getValue && item("\u0417\u0430\u043A\u0440\u044B\u0442\u044C", finish),
          submenuOpen && createPortal5(
            /* @__PURE__ */ jsxs5(
              "div",
              {
                ref: submenuRef,
                "data-sg-portal": "",
                className: "sg-column-submenu",
                role: "dialog",
                "aria-label": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u0442\u043E\u043B\u0431\u0446\u044B",
                style: { top: submenuPosition.top, left: submenuPosition.left },
                onMouseDown: (event) => event.stopPropagation(),
                onClick: (event) => event.stopPropagation(),
                onKeyDown: (event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    event.stopPropagation();
                    setSubmenuOpen(false);
                    columnsButtonRef.current?.focus();
                  }
                },
                children: [
                  /* @__PURE__ */ jsx5("div", { className: "sg-menu-columns", children: columns.map((entry) => /* @__PURE__ */ jsxs5("label", { className: "sg-menu-option", children: [
                    /* @__PURE__ */ jsx5("input", { type: "checkbox", checked: !hidden.has(entry.id), onChange: (event) => changeHidden(event.target.checked ? [...hidden].filter((id) => id !== entry.id) : [...hidden, entry.id]) }),
                    entry.title || "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F"
                  ] }, entry.id)) }),
                  /* @__PURE__ */ jsx5("button", { type: "button", className: "sg-menu-action sg-menu-action-no-icon", onClick: () => changeHidden([]), children: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435" })
                ]
              }
            ),
            document.body
          )
        ]
      }
    ),
    document.body
  );
}
function SimpleGrid({
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
  renderRowDetails,
  rowDetailsAppearance = "flat",
  selectionColor = SG_DEFAULT_SELECTION_LINE,
  selectionFill = SG_DEFAULT_SELECTION_FILL,
  mergedCells,
  frozenColumnIds,
  cellComments,
  onCellCommentAdd,
  onCellCommentOpen,
  revealCell
}) {
  const wrapperRef = useRef6(null);
  const rowNumberMeasureRef = useRef6(null);
  const gutterMeasurementRef = useRef6(null);
  const [numberGutterWidth, setGutterWidth] = useState5(24);
  const gutterWidth = showRowHeaders ? (rowHeaderWidth === void 0 ? numberGutterWidth : Math.max(24, rowHeaderWidth)) + (rowSelectionMode ? 24 : 0) : 0;
  const [internalSelectedRowKeys, setInternalSelectedRowKeys] = useState5(defaultSelectedRowKeys);
  const [internalHidden, setInternalHidden] = useState5(defaultHiddenColumnIds);
  const [internalCollapsedGroups, setInternalCollapsedGroups] = useState5(defaultCollapsedGroupIds);
  const [internalFilters, setInternalFilters] = useState5(defaultColumnFilters);
  const [internalSort, setInternalSort] = useState5(defaultSort);
  const filters = columnFilters ?? internalFilters;
  const appliedSort = sort === void 0 ? internalSort : sort;
  const [menu, setMenu] = useState5(null);
  const [columnActionMenu, setColumnActionMenu] = useState5(null);
  const actionColumn = columnActionMenu ? columnsProp.find((column) => column.id === columnActionMenu.columnId) : void 0;
  const [rowMenu, setRowMenu] = useState5(null);
  const rowMenuRef = useRef6(null);
  const [cellMenu, setCellMenu] = useState5(null);
  const [menuError, setMenuError] = useState5(null);
  const cellMenuTargetRef = useRef6(null);
  const pendingInsertedKey = useRef6(null);
  const [internalRowHeights, setInternalRowHeights] = useState5(defaultRowHeights);
  const [heightPreview, setHeightPreview] = useState5(null);
  const heightOverrides = rowHeights ?? internalRowHeights;
  const heightOverridesRef = useRef6(heightOverrides);
  heightOverridesRef.current = heightOverrides;
  const resizeCleanup = useRef6(null);
  useEffect4(() => () => resizeCleanup.current?.(), []);
  const commitRowHeights = (next) => {
    if (rowHeights === void 0) setInternalRowHeights(next);
    onRowHeightsChange?.({ ...next });
  };
  const getRowHeight = (key) => {
    const value = heightPreview?.keys.has(key) ? heightPreview.height : heightOverrides[key];
    return Math.max(22, Number.isFinite(value) ? value : Number.isFinite(rowHeight) ? rowHeight : 22);
  };
  const presentRowKeys = useMemo2(() => sourceRows.map(rowKey), [sourceRows, rowKey]);
  const selectedRows = useMemo2(() => {
    const requested = new Set(selectedRowKeys ?? internalSelectedRowKeys);
    return new Set(presentRowKeys.filter((key) => requested.has(key)));
  }, [presentRowKeys, selectedRowKeys, internalSelectedRowKeys]);
  const rowSelectionAnchor = useRef6(null);
  const selectAllRowsRef = useRef6(null);
  const updateSelectedRows = (keys) => {
    if (selectedRowKeys === void 0) setInternalSelectedRowKeys(keys);
    onSelectedRowKeysChange?.(keys);
  };
  const toggleSelectedRow = (rowIndex, checked, extend) => {
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
  const [orderIds, setOrderIds] = useState5(null);
  const physicalColumns = useMemo2(() => {
    if (!orderIds) return columnsProp;
    const byId = new Map(columnsProp.map((column) => [column.id, column]));
    const ordered = orderIds.map((id) => byId.get(id)).filter((column) => Boolean(column));
    const seen = new Set(ordered.map((column) => column.id));
    return [...ordered, ...columnsProp.filter((column) => !seen.has(column.id))];
  }, [columnsProp, orderIds]);
  const groups = useMemo2(() => normalizeColumnGroups(columnGroups ?? [], columnsProp), [columnGroups, columnsProp]);
  const allGroups = useMemo2(() => {
    const list = [];
    const visit = (group) => {
      list.push(group);
      group.children.forEach((child) => {
        if (typeof child !== "string") visit(child);
      });
    };
    groups.forEach(visit);
    return list;
  }, [groups]);
  const collapsedGroups = useMemo2(() => new Set(collapsedGroupIds ?? internalCollapsedGroups), [collapsedGroupIds, internalCollapsedGroups]);
  const summaryGroups = useMemo2(() => new Map(allGroups.map((group) => [group.summaryId, group])), [allGroups]);
  const [groupRowPreview, setGroupRowPreview] = useState5(null);
  const [groupRowWidths, setGroupRowWidths] = useState5({});
  const columns = useMemo2(() => allGroups.length ? [...physicalColumns, ...allGroups.map((group) => ({
    ...group.definition.summaryColumn,
    id: group.summaryId,
    title: group.definition.title,
    readOnly: !group.definition.summaryColumn.setValue,
    getValue: (row) => group.definition.summaryColumn.getValue(groupRowPreview && rowKey(groupRowPreview) === rowKey(row) ? groupRowPreview : row),
    renderValue: group.definition.summaryColumn.renderValue ? (row, index) => group.definition.summaryColumn.renderValue(groupRowPreview && rowKey(groupRowPreview) === rowKey(row) ? groupRowPreview : row, index) : void 0
  }))] : physicalColumns, [physicalColumns, allGroups, groupRowPreview, rowKey]);
  const manuallyHidden = useMemo2(() => new Set(hiddenColumnIds ?? internalHidden), [hiddenColumnIds, internalHidden]);
  const columnProjection = useMemo2(() => {
    const visibleIds = [];
    const paths = /* @__PURE__ */ new Map();
    const positions = new Map(physicalColumns.map((column, index) => [column.id, index]));
    const visit = (group, parents) => {
      if (collapsedGroups.has(group.definition.id)) {
        visibleIds.push(group.summaryId);
        paths.set(group.summaryId, parents);
        return;
      }
      const path = [...parents, group];
      const children = [...group.children].sort((a, b) => {
        const first = (child) => typeof child === "string" ? positions.get(child) : Math.min(...child.leafIds.map((id) => positions.get(id)));
        return first(a) - first(b);
      });
      for (const child of children) {
        if (typeof child !== "string") visit(child, path);
        else if (!manuallyHidden.has(child)) {
          visibleIds.push(child);
          paths.set(child, path);
        }
      }
    };
    const owner = new Map(groups.flatMap((group) => group.leafIds.map((id) => [id, group])));
    const emitted = /* @__PURE__ */ new Set();
    for (const column of physicalColumns) {
      const group = owner.get(column.id);
      if (group) {
        if (!emitted.has(group)) {
          emitted.add(group);
          visit(group, []);
        }
      } else if (!manuallyHidden.has(column.id)) {
        visibleIds.push(column.id);
        paths.set(column.id, []);
      }
    }
    return { visibleIds, paths };
  }, [physicalColumns, groups, collapsedGroups, manuallyHidden]);
  const hiddenColumns = useMemo2(() => {
    const visible = new Set(columnProjection.visibleIds);
    return new Set(columns.filter((column) => !visible.has(column.id)).map((column) => column.id));
  }, [columns, columnProjection]);
  const sourceEvaluator = useMemo2(() => createGridEvaluator(sourceRows, physicalColumns), [sourceRows, physicalColumns]);
  const outline = useMemo2(() => {
    if (!rowGroupKey || !rowBanner) return void 0;
    const keys = /* @__PURE__ */ new Set();
    sourceRows.forEach((row, index) => {
      if (rowBanner(row, index)) keys.add(rowKey(row));
    });
    return { groupKey: rowGroupKey, isBanner: (row) => keys.has(rowKey(row)) };
  }, [rowGroupKey, rowBanner, sourceRows, rowKey]);
  const rowIndexes = useMemo2(() => {
    const projected2 = projectGridRows(sourceRows, physicalColumns, filters, appliedSort, sourceEvaluator, void 0, outline);
    if (!outline || !collapsedRowGroupKeys?.length) return projected2;
    const collapsed = new Set(collapsedRowGroupKeys);
    return projected2.filter((index) => outline.isBanner(sourceRows[index]) || !collapsed.has(outline.groupKey(sourceRows[index]) || ""));
  }, [sourceRows, physicalColumns, filters, appliedSort, sourceEvaluator, outline, collapsedRowGroupKeys]);
  const rows = useMemo2(() => rowIndexes.map((index) => sourceRows[index]), [sourceRows, rowIndexes]);
  const headerLabelCharacters = useMemo2(() => rowHeaderLabel ? sourceRows.reduce((max, row, index) => {
    const label = rowHeaderLabel(row, index);
    return typeof label === "number" || typeof label === "string" ? Math.max(max, String(label).length) : max;
  }, 1) : 0, [sourceRows, rowHeaderLabel]);
  const rowViewProjected = filters.some((filter) => physicalColumns.some((column) => column.id === filter.columnId && column.getValue)) || Boolean(appliedSort && physicalColumns.some((column) => column.id === appliedSort.columnId && column.getValue));
  const projected = Boolean(outline && collapsedRowGroupKeys?.length) || rowViewProjected;
  const sourceIndex = (index) => rowIndexes[index] ?? sourceRows.length + Math.max(0, index - rows.length);
  const visibleRowKeys = useMemo2(() => rows.map(rowKey), [rows, rowKey]);
  const bannerKeys = useMemo2(() => {
    const keys = /* @__PURE__ */ new Set();
    if (rowBanner) rows.forEach((row, index) => {
      if (rowBanner(row, index)) keys.add(rowKey(row));
    });
    return keys;
  }, [rowBanner, rows, rowKey]);
  const visibleSelectedCount = visibleRowKeys.filter((key) => selectedRows.has(key)).length;
  useLayoutEffect6(() => {
    if (selectAllRowsRef.current) selectAllRowsRef.current.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < visibleRowKeys.length;
  }, [rowSelectionMode, visibleSelectedCount, visibleRowKeys.length]);
  const updateHidden = (ids) => {
    if (hiddenColumnIds === void 0) setInternalHidden(ids);
    onHiddenColumnIdsChange?.(ids);
  };
  const updateFilters = (next) => {
    if (columnFilters === void 0) setInternalFilters(next);
    onColumnFiltersChange?.(next);
  };
  const updateSort = (next) => {
    if (sort === void 0) setInternalSort(next);
    onSortChange?.(next);
  };
  const visibleCols = useMemo2(() => {
    const positions = new Map(columns.map((column, index) => [column.id, index]));
    return columnProjection.visibleIds.map((id) => positions.get(id));
  }, [columns, columnProjection]);
  const navCols = useMemo2(() => visibleCols.filter((index) => !(columns[index].render && !columns[index].navigable)), [columns, visibleCols]);
  const navIndexOf = useCallback((columnIndex) => navCols.indexOf(columnIndex), [navCols]);
  const navigationIdsInOrder = useCallback((ids) => {
    const position = (id) => {
      const group = summaryGroups.get(id);
      return group ? Math.min(...group.leafIds.map((leaf) => ids.indexOf(leaf))) : ids.indexOf(id);
    };
    return navCols.map((index) => columns[index].id).sort((a, b) => position(a) - position(b));
  }, [navCols, columns, summaryGroups]);
  const merges = useMemo2(() => {
    const anchors = /* @__PURE__ */ new Map();
    const covered = /* @__PURE__ */ new Map();
    for (const merge of mergedCells ?? []) {
      if (projected) break;
      const row = Math.floor(merge.row);
      const col = Math.floor(merge.col);
      if (row < 0 || col < 0 || row >= rows.length || col >= physicalColumns.length) continue;
      const rowSpan = Math.max(1, Math.min(Math.floor(merge.rowSpan) || 1, rows.length - row));
      const colSpan = Math.max(1, Math.min(Math.floor(merge.colSpan) || 1, physicalColumns.length - col));
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
  const [active, setActive] = useState5(() => resolveViewCell(viewState?.selection?.active, visibleRowKeys, navCols.map((index) => columns[index].id)));
  const [groupRowEditor, setGroupRowEditor] = useState5(null);
  useEffect4(() => {
    if (!groupRowEditor) setGroupRowPreview(null);
  }, [groupRowEditor]);
  useEffect4(() => {
    if (groupRowEditor && (!collapsedGroups.has(groupRowEditor.groupId) || !sourceRows.some((row) => rowKey(row) === groupRowEditor.key))) setGroupRowEditor(null);
  }, [groupRowEditor, collapsedGroups, sourceRows, rowKey]);
  const [focus, setFocus] = useState5(() => resolveViewCell(viewState?.selection?.focus, visibleRowKeys, navCols.map((index) => columns[index].id)));
  const viewRestore = useGridViewState(wrapperRef, { state: viewState, onChange: onViewStateChange, keys: visibleRowKeys, ids: navCols.map((index) => columns[index].id), active, focus });
  const previousViewState = useRef6(viewState);
  useLayoutEffect6(() => {
    if (previousViewState.current === viewState) return;
    previousViewState.current = viewState;
    if (!viewState?.selection) return;
    const ids = navCols.map((index) => columns[index].id);
    setActive(resolveViewCell(viewState.selection.active, visibleRowKeys, ids));
    setFocus(resolveViewCell(viewState.selection.focus, visibleRowKeys, ids));
  }, [viewState, visibleRowKeys, navCols, columns]);
  const [copiedRange, setCopiedRange] = useState5(null);
  const copiedRowsRef = useRef6(null);
  const clipboardLayout = JSON.stringify([visibleRowKeys, navCols.map((index) => columns[index].id)]);
  const [gutterSelection, setGutterSelection] = useState5(null);
  const [columnSelection, setColumnSelection] = useState5(null);
  const headerGrabCleanup = useRef6(null);
  useEffect4(() => () => headerGrabCleanup.current?.(), []);
  const [dragging, setDragging] = useState5(false);
  const [editing, setEditing] = useState5(false);
  useEffect4(() => {
    setCopiedRange(null);
  }, [sourceRows, editing]);
  useEffect4(() => {
    copiedRowsRef.current = null;
  }, [clipboardLayout]);
  const [searchStarted, setSearchStarted] = useState5(false);
  const [draft, setDraft] = useState5("");
  const [editError, setEditError] = useState5(null);
  const draftRef = useRef6(draft);
  draftRef.current = draft;
  const editPreviewRef = useRef6(onEditPreview);
  editPreviewRef.current = onEditPreview;
  useEffect4(() => {
    const column = active ? columns[navCols[active.navIndex]] : void 0;
    const row = active ? rows[active.row] : void 0;
    editPreviewRef.current?.(editing && row && column?.setValue ? column.setValue(row, normalizeGridValue(column, draft)) : null);
  }, [editing, draft, active?.row, active?.navIndex]);
  const editSnapshotRef = useRef6(null);
  const caretRequestRef = useRef6(null);
  const [fillTarget, setFillTarget] = useState5(null);
  const fillDragRef = useRef6(null);
  const fillTargetRef = useRef6(null);
  const pointerMovedRef = useRef6(false);
  const reorderRef = useRef6(null);
  const [reorder, setReorder] = useState5(null);
  const historyRef = useRef6({ undo: [], redo: [] });
  const rowsRef = useRef6(sourceRows);
  rowsRef.current = sourceRows;
  const orderIdsRef = useRef6(orderIds);
  orderIdsRef.current = orderIds;
  const columnsPropRef = useRef6(columnsProp);
  columnsPropRef.current = columnsProp;
  const activeRef = useRef6(active);
  activeRef.current = active;
  const focusRef = useRef6(focus);
  focusRef.current = focus;
  const skipProjectionRemapRef = useRef6(false);
  const editBaselineRef = useRef6(null);
  const editAppliedRef = useRef6(false);
  const captureSelection = useCallback(() => {
    const a = activeRef.current;
    const f = focusRef.current;
    return a && f ? { active: a, focus: f, activeKey: rows[a.row] && rowKey(rows[a.row]), focusKey: rows[f.row] && rowKey(rows[f.row]), activeColumn: columns[navCols[a.navIndex]]?.id, focusColumn: columns[navCols[f.navIndex]]?.id } : null;
  }, [rows, rowKey, columns, navCols]);
  const snapshotOf = useCallback((kind) => ({
    rows: kind === "rows" ? editBaselineRef.current ?? rowsRef.current : null,
    // The effective order, not the raw state: `null` means "props order", and
    // undoing the first reorder must restore it as an explicit list.
    orderIds: kind === "order" ? orderIdsRef.current ?? columnsPropRef.current.map((column) => column.id) : null,
    selection: captureSelection()
  }), [captureSelection]);
  const pushUndoSnapshot = useCallback((kind) => {
    const stack = historyRef.current;
    stack.undo.push(snapshotOf(kind));
    if (stack.undo.length > SG_HISTORY_LIMIT) stack.undo.shift();
    stack.redo = [];
  }, [snapshotOf]);
  const emit = useCallback((next) => {
    if (!projected) {
      rowsRef.current = next;
      onChange(next);
      return;
    }
    const mapped = sourceRows.slice();
    next.forEach((row, index) => {
      if (index < rowIndexes.length) mapped[rowIndexes[index]] = row;
      else mapped.push(row);
    });
    rowsRef.current = mapped;
    onChange(mapped);
  }, [onChange, projected, sourceRows, rowIndexes]);
  const emitRows = useCallback((next, source = false) => {
    pushUndoSnapshot("rows");
    if (source) {
      rowsRef.current = next;
      onChange(next);
    } else emit(next);
  }, [emit, onChange, pushUndoSnapshot]);
  const restoreSelection = useCallback((snap, keys, order = columns) => {
    const rowCount = keys.length;
    if (!navCols.length || !rowCount) {
      setActive(null);
      setFocus(null);
      return;
    }
    if (!snap) return;
    const ids = navigationIdsInOrder(order.map((column) => column.id));
    const clamp = (cell, key, columnId) => {
      const row = key === void 0 ? -1 : keys.indexOf(key);
      let col = columnId === void 0 ? -1 : ids.indexOf(columnId);
      if (col < 0 && columnId) {
        const summary = summaryGroups.get(columnId);
        col = ids.findIndex((id) => summaryGroups.get(id)?.leafIds.includes(columnId) || summary && (summary.leafIds.includes(id) || summaryGroups.get(id)?.leafIds.some((leaf) => summary.leafIds.includes(leaf))));
      }
      return { row: row >= 0 ? row : Math.max(0, Math.min(cell.row, rowCount - 1)), navIndex: col >= 0 ? col : Math.max(0, Math.min(cell.navIndex, navCols.length - 1)) };
    };
    setActive(clamp(snap.active, snap.activeKey, snap.activeColumn));
    setFocus(clamp(snap.focus, snap.focusKey, snap.focusColumn));
  }, [navCols.length, columns, navigationIdsInOrder, summaryGroups]);
  const applyHistoryEntry = useCallback((entry) => {
    skipProjectionRemapRef.current = true;
    if (entry.rows) onChange(entry.rows);
    if (entry.orderIds) {
      setOrderIds(entry.orderIds);
      onColumnOrderChange?.(entry.orderIds.slice());
    }
    const targetRows = entry.rows ?? sourceRows;
    const targetColumns = entry.orderIds ? [...physicalColumns].sort((a, b) => entry.orderIds.indexOf(a.id) - entry.orderIds.indexOf(b.id)) : physicalColumns;
    const keys = projectGridRows(targetRows, targetColumns, filters, appliedSort, createGridEvaluator(targetRows, targetColumns)).map((index) => rowKey(targetRows[index]));
    restoreSelection(entry.selection, keys, targetColumns);
  }, [onChange, onColumnOrderChange, restoreSelection, physicalColumns, filters, appliedSort, sourceRows, rowKey]);
  const runUndo = useCallback(() => {
    const stack = historyRef.current;
    const entry = stack.undo.pop();
    if (!entry) return;
    stack.redo.push(snapshotOf(entry.rows !== null ? "rows" : "order"));
    if (stack.redo.length > SG_HISTORY_LIMIT) stack.redo.shift();
    applyHistoryEntry(entry);
  }, [applyHistoryEntry, snapshotOf]);
  const runRedo = useCallback(() => {
    const stack = historyRef.current;
    const entry = stack.redo.pop();
    if (!entry) return;
    stack.undo.push(snapshotOf(entry.rows !== null ? "rows" : "order"));
    if (stack.undo.length > SG_HISTORY_LIMIT) stack.undo.shift();
    applyHistoryEntry(entry);
  }, [applyHistoryEntry, snapshotOf]);
  const [widthOverrides, setWidthOverrides] = useState5(() => ({ ...defaultColumnWidths }));
  const widthOverridesRef = useRef6({ ...defaultColumnWidths });
  const updateResizeGeometry = useRef6(null);
  const [resizingColumn, setResizingColumn] = useState5(null);
  const [hoveredResizeColumn, setHoveredResizeColumn] = useState5(null);
  const commitWidthOverrides = useCallback((map) => {
    widthOverridesRef.current = map;
    setWidthOverrides(map);
    onColumnWidthsChange?.({ ...map });
  }, [onColumnWidthsChange]);
  const resizeColumnsFor = useCallback((columnId) => {
    const nav = navCols.findIndex((index) => columns[index].id === columnId);
    const isHeaderRange = active !== null && focus !== null && columnSelection?.active === active && columnSelection.focus === focus && Math.min(active.row, focus.row) === 0 && Math.max(active.row, focus.row) === rows.length - 1 && nav >= Math.min(active.navIndex, focus.navIndex) && nav <= Math.max(active.navIndex, focus.navIndex);
    return (isHeaderRange ? navCols.slice(Math.min(active.navIndex, focus.navIndex), Math.max(active.navIndex, focus.navIndex) + 1).map((index) => columns[index]) : columns.filter((column) => column.id === columnId)).filter((column) => column.resizable !== false);
  }, [active, focus, columnSelection, navCols, columns, rows.length]);
  const beginColumnResize = useCallback((columnId, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (reorderRef.current) return;
    headerGrabCleanup.current?.();
    resizeCleanup.current?.();
    const targets = resizeColumnsFor(columnId);
    if (!targets.length) return;
    const declared = columns.find((column) => column.id === columnId)?.width ?? 0;
    const header = ownGridElements(wrapperRef.current, "thead th[data-column-index]").find((element) => columns[Number(element.dataset.columnIndex)]?.id === columnId);
    const measured = header?.getBoundingClientRect().width ?? 0;
    const startWidth = measured > 0 ? measured : widthOverridesRef.current[columnId] ?? declared;
    const start = { id: columnId, startX: event.clientX, startWidth };
    document.body.style.cursor = "col-resize";
    setResizingColumn(columnId);
    const root = wrapperRef.current;
    const table = root?.querySelector(":scope > table");
    const nativePreview = !!table && !root?.hasAttribute("data-sg-virtual");
    const colElements = table ? Array.from(table.querySelectorAll(":scope > colgroup > col")) : [];
    const frozenElements = ownGridElements(root, "[data-sg-frozen-position]");
    const originalStyles = nativePreview ? [table, ...colElements, ...frozenElements].map((element) => ({ element, width: element.style.width, minWidth: element.style.minWidth, left: element.style.left })) : [];
    const paintWidthPreview = () => {
      const map = widthOverridesRef.current;
      if (!nativePreview) {
        setWidthOverrides(map);
        return;
      }
      const offsets = [gutterWidth];
      visibleCols.forEach((index, position) => {
        const column = columns[index];
        const width = map[column.id] ?? column.width;
        const col = colElements[position + Number(showRowHeaders)];
        if (col) col.style.width = column.grow && map[column.id] === void 0 ? "" : `${width}px`;
        offsets.push(offsets[position] + width);
      });
      table.style.width = `${offsets[offsets.length - 1]}px`;
      table.style.minWidth = visibleCols.some((index) => columns[index].grow && map[columns[index].id] === void 0) ? "100%" : "";
      frozenElements.forEach((element) => {
        element.style.left = `${offsets[Number(element.dataset.sgFrozenPosition)]}px`;
      });
      updateResizeGeometry.current?.();
    };
    let frame = null;
    const onMove = (moveEvent) => {
      const next = Math.max(SG_MIN_COLUMN_WIDTH, start.startWidth + (moveEvent.clientX - start.startX));
      if (targets.every((column) => widthOverridesRef.current[column.id] === next)) return;
      const map = { ...widthOverridesRef.current };
      targets.forEach((column) => {
        map[column.id] = next;
      });
      widthOverridesRef.current = map;
      if (frame === null) frame = requestAnimationFrame(() => {
        frame = null;
        paintWidthPreview();
      });
    };
    const cleanup = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      originalStyles.forEach(({ element, width, minWidth, left }) => {
        element.style.width = width;
        element.style.minWidth = minWidth;
        element.style.left = left;
      });
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("blur", onUp);
      resizeCleanup.current = null;
    };
    const onUp = () => {
      cleanup();
      setResizingColumn(null);
      const map = { ...widthOverridesRef.current };
      targets.forEach((column) => {
        if (map[column.id] === column.width) delete map[column.id];
      });
      commitWidthOverrides(map);
    };
    resizeCleanup.current = cleanup;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("blur", onUp);
  }, [columns, commitWidthOverrides, resizeColumnsFor, visibleCols, gutterWidth, showRowHeaders]);
  const resetColumnWidth = useCallback((columnId) => {
    const targets = resizeColumnsFor(columnId);
    if (targets.every((column) => widthOverridesRef.current[column.id] === void 0)) return;
    const map = { ...widthOverridesRef.current };
    targets.forEach((column) => {
      delete map[column.id];
    });
    commitWidthOverrides(map);
  }, [commitWidthOverrides, resizeColumnsFor]);
  const virtual = virtualize && !renderRowDetails && groups.length === 0 && merges.anchors.size === 0 && bannerKeys.size === 0 && !visibleCols.some((index) => columns[index].wrap || (columns[index].maxLines ?? 1) > 1);
  const fixedRowHeight = Math.max(22, Number.isFinite(rowHeight) ? rowHeight : 22);
  const rowOffsets = useMemo2(() => {
    if (!heightPreview && !Object.keys(heightOverrides).length) return null;
    const offsets = [0];
    for (const row of rows) offsets.push(offsets[offsets.length - 1] + getRowHeight(rowKey(row)));
    return offsets;
  }, [rows, rowKey, heightOverrides, heightPreview, fixedRowHeight]);
  const rowTop = (index) => rowOffsets ? rowOffsets[index] : index * fixedRowHeight;
  const rowAtOffset = (offset) => {
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
  const [viewport, setViewport] = useState5({ top: 0, left: 0, width: 800, height: virtualHeight });
  const [horizontallyScrolled, setHorizontallyScrolled] = useState5(false);
  const frozenShadowRef = useRef6(null);
  const [bannerTop, setBannerTop] = useState5(0);
  const collapseSignature = JSON.stringify([...collapsedRowGroupKeys || []].sort());
  const previousCollapseSignature = useRef6(collapseSignature);
  const collapseScrollAnchor = useRef6(null);
  const outlineTail = useRef6(0);
  const captureCollapseScroll = (target) => {
    const root = wrapperRef.current;
    if (!root || !rowGroupKey || !(target instanceof Element)) return;
    if (!target.closest("button[aria-expanded]") || target.closest("[data-sg]") !== root) return;
    let scroller = root;
    while (scroller && scroller !== document.body) {
      if (/^(auto|scroll|overlay)$/.test(getComputedStyle(scroller).overflowY)) break;
      scroller = scroller.parentElement;
    }
    scroller = scroller && scroller !== document.body ? scroller : document.scrollingElement;
    if (!scroller) return;
    const viewportTop = scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top + scroller.clientTop;
    const headerBottom = Math.max(viewportTop, ...ownGridElements(root, "thead th").map((header) => header.getBoundingClientRect().bottom));
    const banners = ownGridElements(root, ".sg-row-banner");
    const banner = target.closest(".sg-row-banner") || (target.closest("[data-sg-corner-content]") ? banners.find((row2) => row2.closest("tbody").getBoundingClientRect().bottom > headerBottom) : void 0);
    const row = banner && rows[Number(banner.dataset.rowIndex)];
    if (!banner || !row) return;
    collapseScrollAnchor.current = { key: rowKey(row), top: Math.max(headerBottom, banner.getBoundingClientRect().top), scroller };
  };
  useLayoutEffect6(() => {
    const changed = previousCollapseSignature.current !== collapseSignature;
    previousCollapseSignature.current = collapseSignature;
    const anchor = collapseScrollAnchor.current;
    collapseScrollAnchor.current = null;
    const root = wrapperRef.current;
    if (!root) return;
    if (!rowGroupKey) {
      outlineTail.current = 0;
      root.style.paddingBottom = "";
      return;
    }
    if (!changed) return;
    if (!anchor) {
      outlineTail.current = 0;
      root.style.paddingBottom = "";
      return;
    }
    const banner = ownGridElements(root, ".sg-row-banner").find((element) => {
      const row = rows[Number(element.dataset.rowIndex)];
      return row && rowKey(row) === anchor.key;
    });
    if (!banner) return;
    const { scroller } = anchor;
    const desired = Math.max(0, scroller.scrollTop + banner.getBoundingClientRect().top - anchor.top);
    const baseHeight = scroller.scrollHeight - outlineTail.current;
    outlineTail.current = Math.max(0, Math.ceil(desired + scroller.clientHeight - baseHeight));
    root.style.paddingBottom = outlineTail.current ? `${outlineTail.current}px` : "";
    scroller.scrollTop = desired;
  }, [collapseSignature, rowGroupKey, rows, rowKey]);
  useLayoutEffect6(() => {
    const root = wrapperRef.current;
    if (!root || !stickyRowBanners) return;
    let frame = null;
    const constrain = () => {
      frame = null;
      let scroller = root;
      while (scroller && scroller !== document.body) {
        const overflow = getComputedStyle(scroller).overflowY;
        if (overflow === "auto" || overflow === "scroll" || overflow === "overlay") break;
        scroller = scroller.parentElement;
      }
      const top = scroller && scroller !== document.body ? scroller.getBoundingClientRect().top + scroller.clientTop : 0;
      const headers = ownGridElements(root, "thead th");
      const inset = Math.max(0, ...headers.map((header) => (parseFloat(header.style.top) || 0) + header.getBoundingClientRect().height));
      const banners = ownGridElements(root, ".sg-row-banner");
      const positions = banners.map((banner) => {
        const cells = Array.from(banner.children);
        const bottom = banner.closest("tbody").getBoundingClientRect().bottom;
        return { cells, push: Math.min(0, bottom - top - inset - banner.getBoundingClientRect().height) };
      });
      positions.forEach(({ cells, push }) => cells.forEach((cell) => {
        cell.style.transform = push < 0 ? `translateY(${push}px)` : "";
      }));
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(constrain);
    };
    const measure = () => {
      const headers = ownGridElements(root, "thead th");
      const top = Math.max(0, ...headers.map((header) => (parseFloat(header.style.top) || 0) + header.getBoundingClientRect().height));
      setBannerTop((previous) => previous === top ? previous : top);
      schedule();
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ownGridElements(root, "thead th").forEach((header) => observer?.observe(header));
    observer?.observe(root);
    ownGridElements(root, "tbody").forEach((body) => observer?.observe(body));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", schedule, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", schedule, true);
      if (frame !== null) cancelAnimationFrame(frame);
      ownGridElements(root, ".sg-row-banner > td").forEach((cell) => {
        cell.style.transform = "";
      });
    };
  }, [stickyRowBanners, columns, showColumnHeaders, visibleRowKeys]);
  useLayoutEffect6(() => {
    const updateFrozenScroll = () => {
      let element = wrapperRef.current;
      let scrolled = false;
      while (element) {
        if (element.scrollLeft > 0) scrolled = true;
        element = element.parentElement;
      }
      setHorizontallyScrolled(scrolled);
    };
    updateFrozenScroll();
    window.addEventListener("scroll", updateFrozenScroll, true);
    return () => window.removeEventListener("scroll", updateFrozenScroll, true);
  }, []);
  const scrollFrameRef = useRef6(null);
  const readViewport = useCallback(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const next = { top: root.scrollTop, left: root.scrollLeft, width: root.clientWidth || 800, height: root.clientHeight || virtualHeight };
    setViewport((previous) => previous.top === next.top && previous.left === next.left && previous.width === next.width && previous.height === next.height ? previous : next);
  }, [virtualHeight]);
  useLayoutEffect6(() => {
    if (!virtual) return;
    readViewport();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(readViewport) : null;
    if (wrapperRef.current) observer?.observe(wrapperRef.current);
    window.addEventListener("resize", readViewport);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", readViewport);
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
  const measureGutterWidth = useCallback(() => {
    const root = wrapperRef.current;
    if (!root) return;
    if (headerLabelCharacters) {
      const digitWidth2 = rowNumberMeasureRef.current?.getBoundingClientRect().width || 7;
      const width2 = Math.max(30, Math.ceil(headerLabelCharacters * digitWidth2) + 17);
      setGutterWidth((previous) => previous === width2 ? previous : width2);
      return;
    }
    let top = 0;
    let bottom = window.innerHeight;
    const scrollPositions = [rows.length, window.scrollY];
    let ancestor = root;
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
    const header = ownGridElements(root, "thead th")[0];
    if (header) top = Math.max(top, header.getBoundingClientRect().bottom);
    if (bottom <= top) return;
    const mountedRows = ownGridElements(root, "tbody tr[data-row-index]");
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
    const scrollKey = scrollPositions.join(":");
    const width = lastMeasurement?.scrollKey === scrollKey ? Math.max(lastMeasurement.width, requiredWidth) : requiredWidth;
    gutterMeasurementRef.current = { scrollKey, width };
    setGutterWidth((previous) => previous === width ? previous : width);
  }, [rows.length, headerLabelCharacters]);
  useLayoutEffect6(() => {
    measureGutterWidth();
  }, [columns, draft, editing, gutterWidth, measureGutterWidth, rows, viewport, widthOverrides]);
  useEffect4(() => {
    let frame = null;
    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        measureGutterWidth();
      });
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (wrapperRef.current) observer?.observe(wrapperRef.current);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [measureGutterWidth]);
  const columnOffsets = useMemo2(() => {
    const offsets = [gutterWidth];
    for (const index of visibleCols) offsets.push(offsets[offsets.length - 1] + (widthOverrides[columns[index].id] ?? columns[index].width));
    return offsets;
  }, [columns, gutterWidth, visibleCols, widthOverrides]);
  const frozenCount = useMemo2(
    () => frozenColumnCount(
      frozenColumnIds,
      visibleCols.map((index) => columns[index].id),
      (id) => [...summaryGroups.values()].find((group) => group.leafIds.includes(id))?.summaryId
    ),
    [frozenColumnIds, visibleCols, columns, summaryGroups]
  );
  const frozenLefts = useMemo2(() => Array.from({ length: frozenCount }, (_, position) => columnOffsets[position]), [columnOffsets, frozenCount]);
  useLayoutEffect6(() => {
    const root = wrapperRef.current;
    const shadow = frozenShadowRef.current;
    if (!root || !shadow || !frozenCount) return;
    const update = () => {
      const columnId = columns[visibleCols[frozenCount - 1]].id;
      const edge = ownGridElements(root, "thead th[data-column-index], tbody td[data-sg-frozen-position]").find((element) => element.style.position === "sticky" && (element.dataset.testid === `sg-colheader-${columnId}` || element.dataset.testid?.endsWith(`-${columnId}`)));
      if (!edge) {
        shadow.style.display = "none";
        return;
      }
      const rect = root.getBoundingClientRect();
      let top = Math.max(0, rect.top);
      let bottom = Math.min(window.innerHeight, rect.bottom);
      let right = window.innerWidth;
      let left = 0;
      let ancestor2 = root;
      while (ancestor2) {
        const style = getComputedStyle(ancestor2);
        const bounds = ancestor2.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
          top = Math.max(top, bounds.top + ancestor2.clientTop);
          bottom = Math.min(bottom, bounds.top + ancestor2.clientTop + ancestor2.clientHeight);
        }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
          left = Math.max(left, bounds.left + ancestor2.clientLeft);
          right = Math.min(right, bounds.left + ancestor2.clientLeft + ancestor2.clientWidth);
        }
        ancestor2 = ancestor2.parentElement;
      }
      const x = edge.getBoundingClientRect().right;
      const shadowHeight = Math.max(0, bottom - top);
      const shadowWidth = Math.max(0, Math.min(10, right - x));
      const holes = ownGridElements(root, "tr[data-sg-row-details]").map((detail) => {
        const rect2 = detail.getBoundingClientRect();
        const start = Math.max(0, rect2.top - top), end = Math.min(shadowHeight, rect2.bottom - top);
        return end > start ? `M0 ${start} H${shadowWidth} V${end} H0 Z` : "";
      }).filter(Boolean);
      Object.assign(shadow.style, {
        display: bottom > top && x >= left && x < right ? "block" : "none",
        left: `${x}px`,
        top: `${top}px`,
        height: `${Math.max(0, bottom - top)}px`,
        width: `${shadowWidth}px`,
        clipPath: holes.length ? `path(evenodd, 'M0 0 H${shadowWidth} V${shadowHeight} H0 Z ${holes.join(" ")}')` : ""
      });
    };
    update();
    updateResizeGeometry.current = update;
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    let ancestor = root;
    while (ancestor) {
      observer?.observe(ancestor);
      ancestor = ancestor.parentElement;
    }
    return () => {
      if (updateResizeGeometry.current === update) updateResizeGeometry.current = null;
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [horizontallyScrolled, frozenCount, columns, visibleCols, columnOffsets, rows, renderRowDetails]);
  const renderedColumns = useMemo2(() => {
    if (!virtual) return visibleCols.map((index, position) => ({ index, width: columnOffsets[position + 1] - columnOffsets[position], key: columns[index].id }));
    const indexes = /* @__PURE__ */ new Set();
    if (viewRestore.restoring.current && viewRestore.columnId) {
      const index = visibleCols.findIndex((index2) => columns[index2].id === viewRestore.columnId);
      if (index >= 0) indexes.add(index);
    }
    for (let index = 0; index < visibleCols.length; index += 1) {
      if (columnOffsets[index + 1] >= viewport.left - 240 && columnOffsets[index] <= viewport.left + viewport.width + 240) indexes.add(index);
    }
    if (editing && active) {
      const index = visibleCols.indexOf(navCols[active.navIndex]);
      if (index >= 0) indexes.add(index);
    }
    const entries = [];
    let previous = 0;
    for (const index of [...indexes].sort((a, b) => a - b)) {
      if (index > previous) entries.push({ index: null, width: columnOffsets[index] - columnOffsets[previous], key: `gap-${index}` });
      const physical = visibleCols[index];
      entries.push({ index: physical, width: columnOffsets[index + 1] - columnOffsets[index], key: columns[physical].id });
      previous = index + 1;
    }
    if (previous < visibleCols.length) entries.push({ index: null, width: columnOffsets[visibleCols.length] - columnOffsets[previous], key: "gap-end" });
    return entries;
  }, [active, columnOffsets, columns, editing, navCols, viewport.left, viewport.width, virtual, visibleCols, viewState]);
  const headerRows = useMemo2(() => {
    const levels = Math.max(1, ...visibleCols.map((index) => (columnProjection.paths.get(columns[index].id)?.length ?? 0) + 1));
    const result = Array.from({ length: levels }, () => []);
    for (let level = 0; level < levels; level += 1) {
      let position = 0;
      for (const entry of renderedColumns) {
        if (entry.index === null) {
          if (level === 0) result[level].push({ ...entry, start: position, end: position });
          continue;
        }
        const visiblePosition = position;
        position += 1;
        const path = columnProjection.paths.get(columns[entry.index].id) ?? [];
        if (level > path.length) continue;
        if (level === path.length) result[level].push({ ...entry, rowSpan: levels - level, start: visiblePosition, end: visiblePosition + 1 });
        else {
          const group = path[level];
          const previous = result[level][result[level].length - 1];
          if (previous?.group === group) {
            previous.colSpan += 1;
            previous.width += entry.width;
            previous.end = visiblePosition + 1;
          } else result[level].push({ index: null, width: entry.width, key: `group-${group.definition.id}`, group, colSpan: 1, start: visiblePosition, end: visiblePosition + 1 });
        }
      }
    }
    return result;
  }, [renderedColumns, visibleCols, columnProjection, columns]);
  const renderedRows = useMemo2(() => {
    if (!virtual) return rows.map((_, index) => ({ index, height: 0, key: `row-${index}` }));
    const start = Math.max(0, rowAtOffset(viewport.top) - 4);
    const end = Math.min(rows.length, rowAtOffset(viewport.top + viewport.height) + 5);
    const indexes = /* @__PURE__ */ new Set();
    if (viewRestore.restoring.current && viewRestore.rowIndex !== void 0 && viewRestore.rowIndex < rows.length) indexes.add(viewRestore.rowIndex);
    for (let index = start; index < end; index += 1) indexes.add(index);
    if (editing && active && active.row < rows.length) indexes.add(active.row);
    const entries = [];
    let previous = 0;
    for (const index of [...indexes].sort((a, b) => a - b)) {
      if (index > previous) entries.push({ index: null, height: rowTop(index) - rowTop(previous), key: `gap-${index}` });
      entries.push({ index, height: rowTop(index + 1) - rowTop(index), key: `row-${index}` });
      previous = index + 1;
    }
    if (previous < rows.length) entries.push({ index: null, height: rowTop(rows.length) - rowTop(previous), key: "gap-end" });
    return entries;
  }, [active, editing, fixedRowHeight, rowOffsets, rows, viewport.height, viewport.top, virtual, viewState]);
  const focusGrid = useCallback(() => {
    wrapperRef.current?.focus({ preventScroll: true });
  }, []);
  const scrollCellIntoView = useCallback((rowIndex, navIndex) => {
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
      const leftBound = gutter + (frozenCount ? columnOffsets[frozenCount] - gutter : 0);
      if (left < root.scrollLeft + leftBound) root.scrollLeft = Math.max(0, left - leftBound);
      else if (right > root.scrollLeft + width) root.scrollLeft = Math.max(0, right - width);
      readViewport();
      return;
    }
    const column = columns[navCols[navIndex]];
    const cell = column && wrapperRef.current ? ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${rowIndex}-${column.id}"]`)[0] : null;
    if (!(cell instanceof HTMLElement)) return;
    cell.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    if (frozenCount > 0) {
      let ancestor2 = cell.parentElement;
      while (ancestor2 && ancestor2 !== document.body) {
        const overflowX = getComputedStyle(ancestor2).overflowX;
        if ((overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay") && ancestor2.scrollWidth > ancestor2.clientWidth + 1) {
          const edge = ancestor2.getBoundingClientRect().left + ancestor2.clientLeft + columnOffsets[frozenCount];
          const overlap2 = edge - cell.getBoundingClientRect().left;
          if (overlap2 > 0) ancestor2.scrollLeft = Math.max(0, ancestor2.scrollLeft - overlap2);
          break;
        }
        ancestor2 = ancestor2.parentElement;
      }
    }
    const headers = ownGridElements(wrapperRef.current, "thead th");
    if (!headers?.length) return;
    const headerRects = Array.from(headers, (header) => header.getBoundingClientRect()).filter((rect) => rect.height > 0);
    if (!headerRects.length) return;
    const pinned = ownGridElements(wrapperRef.current, ".sg-row-banner > td").map((element) => element.getBoundingClientRect()).filter((rect) => rect.top <= Math.max(...headerRects.map((rect2) => rect2.bottom)) + 1);
    const headerBottom = Math.max(...headerRects.map((rect) => rect.bottom), ...pinned.map((rect) => rect.bottom));
    const overlap = headerBottom - cell.getBoundingClientRect().top;
    if (overlap <= 0) return;
    let ancestor = cell.parentElement;
    while (ancestor && ancestor !== document.body) {
      const overflowY = getComputedStyle(ancestor).overflowY;
      if ((overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") && ancestor.scrollHeight > ancestor.clientHeight + 1) {
        ancestor.scrollTop = Math.max(0, ancestor.scrollTop - overlap);
        return;
      }
      ancestor = ancestor.parentElement;
    }
    window.scrollBy(0, -overlap);
  }, [columnOffsets, columns, fixedRowHeight, rowOffsets, freezeRowHeader, frozenCount, gutterWidth, navCols, readViewport, viewport.width, virtual, virtualHeight, visibleCols, showColumnHeaders]);
  const revealSignature = revealCell ? `${revealCell.rowKey}\0${revealCell.columnId}\0${revealCell.token ?? 0}` : "";
  useEffect4(() => {
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
    const timers = [];
    const highlight = () => {
      scrollCellIntoView(rowIndex, navIndex);
      const node = ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${rowIndex}-${revealCell.columnId}"]`)[0];
      if (!(node instanceof HTMLElement)) return false;
      node.setAttribute("data-comment-reveal", "");
      timers.push(setTimeout(() => node.removeAttribute("data-comment-reveal"), 1800));
      return true;
    };
    timers.push(setTimeout(() => {
      if (!highlight()) timers.push(setTimeout(highlight, 60));
    }, 0));
    focusGrid();
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [revealSignature]);
  useEffect4(() => {
    if (!dragging) return;
    pointerMovedRef.current = false;
    const stop = () => setDragging(false);
    const onMove = () => {
      pointerMovedRef.current = true;
    };
    const onScroll = () => {
      pointerMovedRef.current = false;
    };
    const onLeave = () => stop();
    window.addEventListener("mouseup", stop);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, true);
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll, true);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [dragging]);
  const selection = useMemo2(() => {
    if (!active || !focus) return null;
    if (singleCellSelection) return { min: active, max: active };
    return {
      min: { row: Math.min(active.row, focus.row), navIndex: Math.min(active.navIndex, focus.navIndex) },
      max: { row: Math.max(active.row, focus.row), navIndex: Math.max(active.navIndex, focus.navIndex) }
    };
  }, [active, focus, singleCellSelection]);
  const inSelection = useCallback((rowIndex, navIndex) => navIndex >= 0 && selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row && navIndex >= selection.min.navIndex && navIndex <= selection.max.navIndex, [selection]);
  const evaluator = useCallback((row, col) => col >= physicalColumns.length ? columns[col]?.getValue?.(rows[row]) ?? "" : sourceEvaluator(rowIndexes[row], col), [sourceEvaluator, rowIndexes, physicalColumns.length, columns, rows]);
  const cellEditable = useCallback((columnIndex, rowIndex) => {
    const column = columns[columnIndex];
    if (!column || readOnly || column.readOnly || column.chipsOnly || !column.setValue) return false;
    if (summaryGroups.has(column.id)) return false;
    if (bannerKeys.has(rowKey(rows[rowIndex]))) return false;
    return !cellLocked(rows[rowIndex], sourceIndex(rowIndex), column);
  }, [bannerKeys, rowKey, columns, readOnly, rows, summaryGroups]);
  const applyValue = useCallback((target, value, preview = false) => {
    const column = columns[navCols[target.navIndex]];
    const row = rows[target.row];
    if (!column?.setValue || column.chipsOnly || !row) return;
    if (bannerKeys.has(rowKey(row))) return;
    const normalized = normalizeGridValue(column, value);
    if ((column.getValue?.(row) ?? "") === normalized) {
      if (!preview && editAppliedRef.current) {
        pushUndoSnapshot("rows");
        editAppliedRef.current = false;
        editBaselineRef.current = null;
      }
      return;
    }
    if (preview) editAppliedRef.current = true;
    else emitRows(rows.map((item, index) => index === target.row ? column.setValue(item, normalized) : item));
  }, [bannerKeys, rowKey, columns, emitRows, navCols, rows]);
  const toggleCheckbox = useCallback((rowIndex, navIndex) => {
    const column = columns[navCols[navIndex]];
    const row = rows[rowIndex];
    if (!column?.setValue || column.readOnly || readOnly) return;
    if (cellLocked(row, sourceIndex(rowIndex), column)) return;
    const checked = isGridCheckboxChecked(column.getValue?.(row) ?? "");
    applyValue({ row: rowIndex, navIndex }, checked ? "FALSE" : "TRUE");
  }, [applyValue, columns, navCols, readOnly, rows]);
  const fillSelection = useCallback((value) => {
    if (!selection) return false;
    const targets = [];
    for (let rowIndex = selection.min.row; rowIndex <= selection.max.row; rowIndex += 1) {
      if (bannerKeys.has(rowKey(rows[rowIndex]))) continue;
      for (let navIndex = selection.min.navIndex; navIndex <= selection.max.navIndex; navIndex += 1) {
        const columnIndex = navCols[navIndex];
        const column = columns[columnIndex];
        if (!column?.setValue || column.readOnly || column.chipsOnly || readOnly) continue;
        if (merges.covered.has(`${rowIndex}:${columnIndex}`)) continue;
        if (cellLocked(rows[rowIndex], sourceIndex(rowIndex), column)) continue;
        const normalized = normalizeGridValue(column, value);
        const error = validateGridValue(column.validation, normalized);
        if (error) {
          setEditError(`${column.title || "\u042F\u0447\u0435\u0439\u043A\u0430"}: ${error}`);
          return false;
        }
        targets.push({ row: rowIndex, columnIndex, normalized });
      }
    }
    if (!targets.length) return false;
    const next = rows.slice();
    for (const target of targets) next[target.row] = columns[target.columnIndex].setValue(next[target.row], target.normalized);
    emitRows(next);
    return true;
  }, [bannerKeys, rowKey, columns, emitRows, merges, navCols, readOnly, rows, selection]);
  const commitEdit = useCallback((override, fill = false) => {
    if (!editing || !active) return false;
    const column = columns[navCols[active.navIndex]];
    const raw = override ?? draftRef.current;
    const normalized = normalizeGridValue(column, raw);
    const error = validateGridValue(column.validation, normalized);
    if (error) {
      setEditError(error);
      return false;
    }
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
  const cancelEdit = useCallback(() => {
    const snapshot = editSnapshotRef.current;
    if (snapshot && rows[snapshot.row] !== snapshot.value) {
      emit(rows.map((row, index) => index === snapshot.row ? snapshot.value : row));
    }
    editSnapshotRef.current = null;
    editBaselineRef.current = null;
    editAppliedRef.current = false;
    setEditing(false);
    setEditError(null);
  }, [emit, rows]);
  const previousRowSelectionMode = useRef6(rowSelectionMode);
  useEffect4(() => {
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
  const startEditingCell = useCallback((rowIndex, navIndex, seed, replace = false) => {
    const column = columns[navCols[navIndex]];
    if (!column || column.kind === "checkbox") return false;
    if (!cellEditable(navCols[navIndex], rowIndex)) return false;
    scrollCellIntoView(rowIndex, navIndex);
    const numeric = column.kind === "number" || column.validation?.type === "number";
    editSnapshotRef.current = { row: rowIndex, value: rows[rowIndex] };
    editBaselineRef.current = sourceRows;
    editAppliedRef.current = false;
    caretRequestRef.current = null;
    setSearchStarted(replace);
    setDraft(replace ? numeric ? canonicalGridDecimal(seed) : seed : formatEditingValue(column, seed));
    setEditError(null);
    setEditing(true);
    return true;
  }, [cellEditable, columns, navCols, rows, scrollCellIntoView, sourceRows]);
  const startEditing = useCallback((seed, replace = false) => {
    if (!active) return;
    startEditingCell(active.row, active.navIndex, seed, replace);
  }, [active, startEditingCell]);
  const initialEditRef = useRef6(initialEdit);
  useEffect4(() => {
    const request = initialEditRef.current;
    if (!request) return;
    initialEditRef.current = null;
    if (!rows.length || !navCols.length) return;
    const targetRow = Math.max(0, Math.min(rows.length - 1, request.rowIndex ?? 0));
    const columnIndex = request.columnId ? columns.findIndex((column) => column.id === request.columnId) : navCols.find((index) => cellEditable(index, targetRow));
    const navIndex = navCols.indexOf(columnIndex ?? -1);
    if (columnIndex === void 0 || columnIndex < 0 || navIndex < 0) return;
    setActive({ row: targetRow, navIndex });
    setFocus({ row: targetRow, navIndex });
    startEditingCell(targetRow, navIndex, request.value, true);
  }, []);
  const initialFocusRef = useRef6(initialFocus);
  useEffect4(() => {
    const request = initialFocusRef.current;
    initialFocusRef.current = null;
    if (!request || initialEdit || viewState?.selection || !rows.length || !navCols.length) return;
    const targetRow = Math.max(0, Math.min(rows.length - 1, request.rowIndex ?? 0));
    const columnIndex = request.columnId ? columns.findIndex((column) => column.id === request.columnId) : navCols.find((index) => cellEditable(index, targetRow));
    const navIndex = navCols.indexOf(columnIndex ?? -1);
    if (columnIndex === void 0 || columnIndex < 0 || navIndex < 0) return;
    setActive({ row: targetRow, navIndex });
    setFocus({ row: targetRow, navIndex });
    focusGrid();
  }, []);
  const toggleGroup = (group) => {
    if (editing && !commitEdit()) return;
    const next = new Set(collapsedGroups);
    if (next.has(group.definition.id)) next.delete(group.definition.id);
    else next.add(group.definition.id);
    const ids = [...next];
    if (collapsedGroupIds === void 0) setInternalCollapsedGroups(ids);
    onCollapsedGroupIdsChange?.(ids);
    focusGrid();
  };
  const groupToggle = (group, side = "right") => /* @__PURE__ */ jsx5(
    "button",
    {
      type: "button",
      className: `sg-group-toggle${side === "left" ? " sg-group-toggle-left" : ""}`,
      "aria-label": `${collapsedGroups.has(group.definition.id) ? "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C" : "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C"} \u0433\u0440\u0443\u043F\u043F\u0443 ${group.definition.title}`,
      "aria-expanded": !collapsedGroups.has(group.definition.id),
      "data-testid": `sg-group-toggle-${group.definition.id}${side === "left" ? "-left" : ""}`,
      onMouseDown: (event) => {
        event.preventDefault();
        event.stopPropagation();
      },
      onKeyDown: (event) => event.stopPropagation(),
      onClick: (event) => {
        event.stopPropagation();
        toggleGroup(group);
      },
      children: /* @__PURE__ */ jsx5("span", { "aria-hidden": "true", children: collapsedGroups.has(group.definition.id) ? "+" : "\u2212" })
    }
  );
  const previousVisibilityRef = useRef6({ hidden: hiddenColumns, navIds: navCols.map((index) => columns[index].id), summaryGroups, finish: () => {
  } });
  useLayoutEffect6(() => {
    const previous = previousVisibilityRef.current;
    const navIds = navCols.map((index) => columns[index].id);
    previousVisibilityRef.current = { hidden: hiddenColumns, navIds, summaryGroups, finish: () => {
      if (editing && !commitEdit()) cancelEdit();
    } };
    if (previous.hidden.size === hiddenColumns.size && [...previous.hidden].every((id) => hiddenColumns.has(id))) return;
    const remap = (cell) => {
      if (!cell || !navIds.length) return null;
      const oldId = previous.navIds[cell.navIndex];
      let index = navIds.indexOf(oldId);
      if (index < 0) {
        const oldSummary = previous.summaryGroups.get(oldId);
        index = navIds.findIndex((id) => {
          const summary = summaryGroups.get(id);
          return summary?.leafIds.includes(oldId) || oldSummary && (oldSummary.leafIds.includes(id) || summary?.leafIds.some((leaf) => oldSummary.leafIds.includes(leaf)));
        });
      }
      return { ...cell, navIndex: index >= 0 ? index : Math.min(cell.navIndex, navIds.length - 1) };
    };
    if (editing) previous.finish();
    setActive(remap);
    setFocus(remap);
    setDragging(false);
    fillDragRef.current = null;
    setFillTarget(null);
    reorderRef.current = null;
    setReorder(null);
  }, [cancelEdit, commitEdit, editing, columns, hiddenColumns, navCols, summaryGroups]);
  const previousProjectionRef = useRef6({ keys: visibleRowKeys, filters, sort: appliedSort, finish: () => {
  } });
  useLayoutEffect6(() => {
    const previous = previousProjectionRef.current;
    previousProjectionRef.current = { keys: visibleRowKeys, filters, sort: appliedSort, finish: () => {
      if (editing && !commitEdit()) cancelEdit();
    } };
    if (skipProjectionRemapRef.current) {
      skipProjectionRemapRef.current = false;
      return;
    }
    const changed = previous.keys.length !== visibleRowKeys.length || previous.keys.some((key, index) => key !== visibleRowKeys[index]);
    const settingsChanged = previous.filters !== filters || previous.sort !== appliedSort;
    if (!projected && !settingsChanged && previous.keys.length === visibleRowKeys.length) return;
    if (!changed && !settingsChanged) return;
    if (settingsChanged) previous.finish();
    const remap = (cell) => {
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
    if (changed) {
      setEditing(false);
      editSnapshotRef.current = null;
    }
  }, [visibleRowKeys, filters, appliedSort, projected, editing, commitEdit, cancelEdit, navCols.length]);
  useEffect4(() => {
    if (!selectionScope) return;
    const activatePeer = (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-sg]") : null;
      if (!target || target === wrapperRef.current || target.getAttribute("data-sg-selection-scope") !== selectionScope) return;
      if (editing && !commitEdit()) cancelEdit();
      setActive(null);
      setFocus(null);
      setGutterSelection(null);
      setColumnSelection(null);
      setCopiedRange(null);
      setDragging(false);
      setEditing(false);
      setEditError(null);
    };
    document.addEventListener("mousedown", activatePeer, true);
    document.addEventListener("focusin", activatePeer, true);
    return () => {
      document.removeEventListener("mousedown", activatePeer, true);
      document.removeEventListener("focusin", activatePeer, true);
    };
  }, [selectionScope, editing, commitEdit, cancelEdit]);
  const closeRowMenu = useCallback(() => {
    setRowMenu(null);
    focusGrid();
  }, [focusGrid]);
  const openRowMenu = (rowIndex, x, y) => {
    if (!rows[rowIndex] || editing && !commitEdit()) return;
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
  useLayoutEffect6(() => {
    if (!rowMenu || !rowMenuRef.current) return;
    const panel = rowMenuRef.current;
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(rowMenu.x, window.innerWidth - rect.width - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(rowMenu.y, window.innerHeight - rect.height - 8))}px`;
    panel.querySelector("button:not(:disabled)")?.focus();
  }, [rowMenu]);
  useEffect4(() => {
    if (!rowMenu) return;
    const outside = (event) => {
      if (!rowMenuRef.current?.contains(event.target)) setRowMenu(null);
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRowMenu();
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [rowMenu, closeRowMenu]);
  useEffect4(() => {
    if (rowMenu && !presentRowKeys.includes(rowMenu.key)) closeRowMenu();
  }, [rowMenu, presentRowKeys, closeRowMenu]);
  useLayoutEffect6(() => {
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
  const insertRow = (below) => {
    if (!rowMenu || readOnly || editing && !commitEdit()) return;
    const current = rowsRef.current;
    const index = current.findIndex((row2) => rowKey(row2) === rowMenu.key);
    if (index < 0) {
      closeRowMenu();
      return;
    }
    const row = createRow();
    const next = current.slice();
    next.splice(index + (below ? 1 : 0), 0, row);
    pendingInsertedKey.current = rowKey(row);
    emitRows(next, true);
    closeRowMenu();
  };
  const resetRowHeight = (key) => {
    const next = { ...heightOverridesRef.current };
    delete next[key];
    commitRowHeights(next);
  };
  const selectedHeightKeys = (rowIndex) => {
    const isGutterRange = gutterSelection?.active === active && gutterSelection?.focus === focus && selection !== null && selection.min.navIndex === 0 && selection.max.navIndex === navCols.length - 1 && rowIndex >= selection.min.row && rowIndex <= selection.max.row;
    return new Set((isGutterRange ? rows.slice(selection.min.row, selection.max.row + 1) : [rows[rowIndex]]).map(rowKey));
  };
  const resetSelectedRowHeights = (rowIndex) => {
    const next = { ...heightOverridesRef.current };
    selectedHeightKeys(rowIndex).forEach((key) => {
      delete next[key];
    });
    commitRowHeights(next);
  };
  const beginRowResize = (event, rowIndex) => {
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
    const measured = event.currentTarget.closest("tr")?.getBoundingClientRect().height ?? 0;
    const startHeight = measured || getRowHeight(key);
    const startY = event.clientY;
    let height = startHeight;
    let moved = false;
    const root = wrapperRef.current;
    const nativePreview = !!root && !root.hasAttribute("data-sg-virtual");
    const previewRows = nativePreview ? ownGridElements(root, "tbody tr[data-row-index]").filter((element) => keys.has(rowKey(rows[Number(element.dataset.rowIndex)]))).map((element) => ({ element, height: element.style.height })) : [];
    let frame = null;
    setHeightPreview({ keys, height: startHeight });
    const cursor = document.body.style.cursor;
    document.body.style.cursor = "row-resize";
    const cleanup = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previewRows.forEach(({ element, height: height2 }) => {
        element.style.height = height2;
      });
      document.body.style.cursor = cursor;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("keydown", cancel);
      window.removeEventListener("blur", blur);
      resizeCleanup.current = null;
    };
    const finish = (apply) => {
      cleanup();
      setHeightPreview(null);
      if (apply && moved) {
        const presentKeys = new Set(rowsRef.current.map(rowKey));
        const next = { ...heightOverridesRef.current };
        let changed = false;
        keys.forEach((key2) => {
          if (presentKeys.has(key2)) {
            next[key2] = height;
            changed = true;
          }
        });
        if (changed) commitRowHeights(next);
      }
    };
    const move = (moveEvent) => {
      height = Math.max(22, Math.round(startHeight + moveEvent.clientY - startY));
      moved = height !== startHeight;
      if (frame === null) frame = requestAnimationFrame(() => {
        frame = null;
        if (nativePreview) {
          previewRows.forEach(({ element }) => {
            element.style.height = `${height}px`;
          });
          updateResizeGeometry.current?.();
        } else setHeightPreview({ keys, height });
      });
    };
    const up = () => finish(true);
    const blur = () => finish(false);
    const cancel = (keyEvent) => {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        finish(false);
      }
    };
    resizeCleanup.current = cleanup;
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("keydown", cancel);
    window.addEventListener("blur", blur);
  };
  const openMenu = (columnId, button) => {
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
  const menuColumn = menu?.columnId ? columns.find((column) => column.id === menu.columnId) : void 0;
  const menuOptions = useMemo2(() => {
    if (!menuColumn?.getValue) return [];
    const col = columns.indexOf(menuColumn);
    const values = new Set(projectGridRows(sourceRows, columns, filters, null, sourceEvaluator, menuColumn.id, outline).filter((index) => !outline?.isBanner(sourceRows[index])).map((row) => sourceEvaluator(row, col)));
    return [...values].map((value) => ({ value, label: value === "" ? "(\u041F\u0443\u0441\u0442\u044B\u0435)" : formatGridValue(menuColumn.format, value) }));
  }, [menuColumn, sourceRows, columns, filters, sourceEvaluator, outline]);
  const applyMove = useCallback((row, navIndex, extend = false) => {
    let to = { row, navIndex };
    if (!extend && active) {
      const activeCol = navCols[active.navIndex];
      const own2 = activeCol === void 0 ? null : merges.covered.get(`${active.row}:${activeCol}`) ?? (merges.anchors.has(`${active.row}:${activeCol}`) ? { col: activeCol, row: active.row } : null);
      const span = own2 ? merges.anchors.get(`${own2.row}:${own2.col}`) : void 0;
      if (own2 && span) {
        const minNav = navIndexOf(own2.col);
        let maxNav = minNav;
        for (let c = own2.col + 1; c < own2.col + span.colSpan; c += 1) {
          const nav = navIndexOf(c);
          if (nav > maxNav) maxNav = nav;
        }
        const maxRow = own2.row + span.rowSpan - 1;
        if (to.row >= own2.row && to.row <= maxRow && to.navIndex >= minNav && to.navIndex <= maxNav) {
          if (to.row > active.row) to = { navIndex: to.navIndex, row: maxRow + 1 };
          else if (to.row < active.row) to = { navIndex: to.navIndex, row: own2.row - 1 };
          else if (to.navIndex > active.navIndex) to = { navIndex: maxNav + 1, row: to.row };
          else if (to.navIndex < active.navIndex) to = { navIndex: minNav - 1, row: to.row };
        }
      }
    }
    if (!extend && active && (to.row < 0 || to.row >= rows.length) && onNavigateOut?.(to.row < 0 ? "up" : "down")) return;
    const target = {
      row: Math.max(0, Math.min(rows.length - 1, to.row)),
      navIndex: Math.max(0, Math.min(navCols.length - 1, to.navIndex))
    };
    const nextCol = navCols[target.navIndex];
    const covered = nextCol === void 0 ? void 0 : merges.covered.get(`${target.row}:${nextCol}`);
    if (covered) {
      const nav = navIndexOf(covered.col);
      if (nav >= 0) {
        target.row = covered.row;
        target.navIndex = nav;
      }
    }
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
  const moveHorizontal = useCallback((delta, wrap) => {
    if (!active) return;
    let row = active.row;
    let navIndex = active.navIndex + delta;
    if (navIndex < 0) {
      if (wrap) {
        navIndex = navCols.length - 1;
        row -= 1;
      } else {
        navIndex = 0;
      }
    } else if (navIndex >= navCols.length) {
      if (wrap) {
        navIndex = 0;
        row += 1;
      } else {
        navIndex = navCols.length - 1;
      }
    }
    applyMove(row, navIndex);
  }, [active, applyMove, navCols.length]);
  const moveActive = useCallback((direction) => {
    if (!active) return;
    if (direction === "down") applyMove(active.row + 1, active.navIndex);
    else if (direction === "up") applyMove(active.row - 1, active.navIndex);
    else if (direction === "right") moveHorizontal(1, true);
    else moveHorizontal(-1, true);
  }, [active, applyMove, moveHorizontal]);
  const selectAll = useCallback(() => {
    setActive({ row: 0, navIndex: 0 });
    setFocus({ row: rows.length - 1, navIndex: navCols.length - 1 });
    focusGrid();
  }, [focusGrid, navCols.length, rows.length]);
  const clearSelection = useCallback(() => {
    if (!selection || readOnly) return;
    const next = rows.slice();
    let changed = false;
    for (let rowIndex = selection.min.row; rowIndex <= selection.max.row; rowIndex += 1) {
      if (bannerKeys.has(rowKey(rows[rowIndex]))) continue;
      for (let navIndex = selection.min.navIndex; navIndex <= selection.max.navIndex; navIndex += 1) {
        const columnIndex = navCols[navIndex];
        const column = columns[columnIndex];
        if (!column?.setValue || column.readOnly || column.chipsOnly) continue;
        if (merges.covered.has(`${rowIndex}:${columnIndex}`)) continue;
        if (cellLocked(next[rowIndex], sourceIndex(rowIndex), column)) continue;
        next[rowIndex] = column.setValue(next[rowIndex], "");
        changed = true;
      }
    }
    if (changed) emitRows(next);
  }, [bannerKeys, rowKey, columns, emitRows, merges, navCols, readOnly, rows, selection]);
  const selectionMatrix = useCallback(() => {
    if (!selection) return [];
    const matrix = [];
    for (let rowIndex = selection.min.row; rowIndex <= selection.max.row; rowIndex += 1) {
      if (bannerKeys.has(rowKey(rows[rowIndex]))) continue;
      const line = [];
      for (let navIndex = selection.min.navIndex; navIndex <= selection.max.navIndex; navIndex += 1) {
        line.push(evaluator(rowIndex, navCols[navIndex]));
      }
      matrix.push(line);
    }
    return matrix;
  }, [bannerKeys, rowKey, evaluator, navCols, rows, selection]);
  const handleCopy = useCallback((event) => {
    if (editing || !selection || readOnly) return;
    const matrix = selectionMatrix();
    if (!matrix.length) return;
    copiedRowsRef.current = {
      rows: Array.from({ length: selection.max.row - selection.min.row + 1 }, (_, offset) => rows[selection.min.row + offset]).filter((row) => row && !bannerKeys.has(rowKey(row))),
      columnIds: Array.from({ length: selection.max.navIndex - selection.min.navIndex + 1 }, (_, offset) => columns[navCols[selection.min.navIndex + offset]]?.id).filter((id) => !!id)
    };
    const text = matrix.map((line) => line.join("	")).join("\n");
    const html = `<table>${matrix.map((line) => `<tr>${line.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</table>`;
    event.clipboardData?.setData("text/plain", text);
    event.clipboardData?.setData("text/html", html);
    event.preventDefault();
    setCopiedRange({ min: { ...selection.min }, max: { ...selection.max } });
  }, [bannerKeys, rowKey, columns, editing, navCols, readOnly, rows, selection, selectionMatrix]);
  const handleCut = useCallback((event) => {
    if (editing || !selection || readOnly) return;
    handleCopy(event);
    setCopiedRange(null);
    clearSelection();
  }, [clearSelection, editing, handleCopy, readOnly, selection]);
  const handlePaste = useCallback((event) => {
    if (editing || readOnly || !active || !rows.length || !navCols.length || !event.clipboardData) return;
    setCopiedRange(null);
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    event.preventDefault();
    const matrix = parseClipboardMatrix(text);
    const origin = selection ? selection.min : active;
    const spanRows = selection ? selection.max.row - selection.min.row + 1 : 1;
    const spanCols = selection ? selection.max.navIndex - selection.min.navIndex + 1 : 1;
    const clipRows = matrix.length;
    const clipCols = matrix[0]?.length ?? 0;
    const tileRows = spanRows > clipRows;
    const tileCols = spanCols > clipCols;
    const blockRows = tileRows ? spanRows : Math.max(spanRows, clipRows);
    const blockCols = tileCols ? spanCols : Math.max(spanCols, clipCols);
    if (!navCols.slice(origin.navIndex, origin.navIndex + blockCols).some((index) => {
      const column = columns[index];
      return column.setValue && !column.readOnly && !column.chipsOnly;
    })) return;
    const next = rows.slice();
    for (let r = 0; r < blockRows; r += 1) {
      const targetRow = origin.row + r;
      if (targetRow < next.length && bannerKeys.has(rowKey(next[targetRow]))) continue;
      while (next.length <= targetRow) next.push(createRow());
      for (let c = 0; c < blockCols; c += 1) {
        const columnIndex = navCols[origin.navIndex + c];
        if (columnIndex === void 0) break;
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
        const source = tileRows || tileCols ? matrix[r % clipRows]?.[c % (clipCols || 1)] ?? "" : matrix[r]?.[c] ?? "";
        const normalized = normalizeGridValue(column, source);
        if (column.kind === "multiselect") {
          const choices = new Set((column.getCandidates?.() ?? []).map((candidate) => candidate.value));
          const pastedValues = parseGridMultiValue(normalized);
          if (normalized && !pastedValues.length || pastedValues.some((item) => !choices.has(item))) {
            setEditError(`${column.title || "\u042F\u0447\u0435\u0439\u043A\u0430"}: \u0432\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435`);
            return;
          }
        }
        const error = validateGridValue(column.validation, normalized);
        if (error) {
          setEditError(`${column.title || "\u042F\u0447\u0435\u0439\u043A\u0430"}: ${error}`);
          return;
        }
        next[targetRow] = column.setValue(next[targetRow], normalized);
      }
    }
    emitRows(next);
    setActive({ ...origin });
    setFocus({ row: origin.row + blockRows - 1, navIndex: Math.min(navCols.length - 1, origin.navIndex + blockCols - 1) });
    setEditError(null);
  }, [active, bannerKeys, rowKey, columns, createRow, emitRows, editing, merges, navCols, readOnly, rows, selection, summaryGroups]);
  const handleKeyDown = (event) => {
    if (event.nativeEvent.isComposing) return;
    if (active && (event.shiftKey && event.key === "F10" || event.key === "ContextMenu")) {
      if (contextMenu && editing) return;
      event.preventDefault();
      const rect = ownGridElements(wrapperRef.current, `[data-testid="sg-rowheader-${active.row}"]`)[0]?.getBoundingClientRect();
      if (contextMenu && !editing) {
        const cellRect = ownGridElements(wrapperRef.current, "[data-testid]").find((element) => element.dataset.testid === `sg-cell-${active.row}-${columns[navCols[active.navIndex]]?.id}`)?.getBoundingClientRect();
        openCellMenu(active.row, active.navIndex, cellRect?.left ?? 8, cellRect?.bottom ?? 8);
      } else openRowMenu(active.row, rect?.right ?? 8, rect?.bottom ?? 8);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && ["z", "y", "\u044F", "\u043D"].includes(event.key.toLowerCase())) {
      if (editing) return;
      event.preventDefault();
      if (event.shiftKey || ["y", "\u043D"].includes(event.key.toLowerCase())) runRedo();
      else runUndo();
      return;
    }
    if (!navCols.length || !rows.length) return;
    if (!active) {
      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Tab", "Enter", "F2"].includes(event.key)) {
        event.preventDefault();
        applyMove(0, 0);
      }
      return;
    }
    const column = columns[navCols[active.navIndex]];
    const value = column?.getValue?.(rows[active.row]) ?? "";
    const extend = event.shiftKey;
    const isCheckbox = column?.kind === "checkbox";
    if ((event.ctrlKey || event.metaKey) && !event.altKey && ["a", "\u0444"].includes(event.key.toLowerCase())) {
      if (editing) return;
      event.preventDefault();
      selectAll();
      return;
    }
    if (virtual && !editing && ["Home", "End", "PageUp", "PageDown"].includes(event.key)) {
      event.preventDefault();
      const base = extend ? focus ?? active : active;
      const pageRows = Math.max(1, Math.floor(((wrapperRef.current?.clientHeight || virtualHeight) - (showColumnHeaders ? 24 : 0)) / fixedRowHeight));
      if (event.key === "PageUp" || event.key === "PageDown") {
        const direction = event.key === "PageDown" ? 1 : -1;
        const target = rowOffsets ? rowAtOffset(rowTop(base.row) + direction * ((wrapperRef.current?.clientHeight || virtualHeight) - (showColumnHeaders ? 24 : 0))) : base.row + direction * pageRows;
        applyMove(target === base.row ? base.row + direction : target, base.navIndex, extend);
      } else {
        const end = event.key === "End";
        const row = event.ctrlKey || event.metaKey ? end ? rows.length - 1 : 0 : base.row;
        applyMove(row, end ? navCols.length - 1 : 0, extend);
      }
      return;
    }
    if (isCheckbox && !editing) {
      if (event.key === " " || event.key === "Enter" || event.key === "F2" || event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        toggleCheckbox(active.row, active.navIndex);
        if (event.key === "Enter") applyMove(active.row + 1, active.navIndex);
        return;
      }
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (editing) {
        if (commitEdit(void 0, true)) focusGrid();
      } else if (cellEditable(navCols[active.navIndex], active.row)) fillSelection(value);
      return;
    }
    if ((event.key === "Enter" || event.key === "F2") && !editing) {
      const summaryColumn = columns[navCols[active.navIndex]];
      const summaryGroup = summaryColumn ? summaryGroups.get(summaryColumn.id) : void 0;
      if (summaryGroup?.definition.rowEditor) {
        const leaf = summaryGroup.leafIds.find((id) => cellEditable(columns.findIndex((column2) => column2.id === id), active.row));
        const anchor = leaf ? ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${active.row}-${summaryColumn.id}"]`)[0] : null;
        if (leaf && anchor) {
          event.preventDefault();
          const key = rowKey(rows[active.row]);
          setGroupRowEditor((previous) => previous && previous.key === key && previous.groupId === summaryGroup.definition.id ? previous : { key, groupId: summaryGroup.definition.id, anchor, focus: { columnId: leaf } });
          return;
        }
      }
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (editing) {
        if (commitEdit()) applyMove(active.row + 1, column?.enterToRowStart ? 0 : active.navIndex);
      } else startEditing(value);
      return;
    }
    if (event.key === "F2") {
      event.preventDefault();
      startEditing(value);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      if (editing && !commitEdit()) return;
      if (!event.shiftKey && column?.tabOut) {
        onTabOut?.();
        return;
      }
      const base = active;
      let navIndex = base.navIndex + (extend ? -1 : 1);
      let row = base.row;
      if (navIndex < 0) {
        navIndex = navCols.length - 1;
        row -= 1;
      } else if (navIndex >= navCols.length) {
        navIndex = 0;
        row += 1;
      }
      applyMove(row, navIndex);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (copiedRange) {
        setCopiedRange(null);
        return;
      }
      if (reorderRef.current) {
        reorderRef.current = null;
        setReorder(null);
        return;
      }
      if (fillDragRef.current) {
        cancelFillDrag();
        return;
      }
      if (editing) {
        setEditing(false);
        setEditError(null);
        focusGrid();
      } else {
        setActive(null);
        setFocus(null);
      }
      return;
    }
    if (event.key.startsWith("Arrow")) {
      if (editing && (event.key === "ArrowLeft" || event.key === "ArrowRight")) return;
      event.preventDefault();
      if (editing && !commitEdit()) return;
      const base = extend ? focus ?? active : active;
      if (event.key === "ArrowDown") applyMove(base.row + 1, base.navIndex, extend);
      else if (event.key === "ArrowUp") applyMove(base.row - 1, base.navIndex, extend);
      else if (event.key === "ArrowLeft") applyMove(base.row, base.navIndex - 1, extend);
      else applyMove(base.row, base.navIndex + 1, extend);
      return;
    }
    if (!editing && (event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault();
      clearSelection();
      return;
    }
    if (!editing && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
      if (!active) return;
      const activeColumn = columns[navCols[active.navIndex]];
      const activeGroup = activeColumn ? summaryGroups.get(activeColumn.id) : void 0;
      if (activeGroup?.definition.rowEditor) {
        const leaf = activeGroup.leafIds.find((id) => cellEditable(columns.findIndex((column2) => column2.id === id), active.row));
        const anchor = leaf ? ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${active.row}-${activeColumn.id}"]`)[0] : null;
        if (leaf && anchor) {
          event.preventDefault();
          setGroupRowEditor({ key: rowKey(rows[active.row]), groupId: activeGroup.definition.id, anchor, seed: { columnId: leaf, value: event.key } });
          return;
        }
      }
      if (cellEditable(navCols[active.navIndex], active.row)) {
        event.preventDefault();
        startEditing(event.key, true);
      }
    }
  };
  const handleCellMouseDown = (event, rowIndex, navIndex) => {
    if (event.target.closest("[data-sg-checkbox]")) return;
    if (event.target.closest("[data-sg-editor]") || event.target.closest("[data-sg-portal]") && !wrapperRef.current?.contains(event.target)) return;
    if (navIndex < 0 || event.button !== 0) return;
    event.preventDefault();
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
  const handleCellMouseOver = (rowIndex, navIndex) => {
    if (fillDragRef.current) {
      if (pointerMovedRef.current) updateFillTarget(rowIndex, navIndex);
      return;
    }
    if (!dragging || navIndex < 0 || !pointerMovedRef.current) return;
    setFocus({ row: rowIndex, navIndex });
  };
  const handleCellClick = (event, rowIndex, navIndex) => {
    if (navIndex < 0) return;
    if (event.target.closest("[data-sg-editor]") || event.target.closest("[data-sg-portal]") && !wrapperRef.current?.contains(event.target)) return;
    if (event.shiftKey && active && !singleCellSelection) {
      setFocus({ row: rowIndex, navIndex });
      scrollCellIntoView(rowIndex, navIndex);
      focusGrid();
      return;
    }
    if (columns[navCols[navIndex]]?.openOnActivate && !pointerMovedRef.current && cellEditable(navCols[navIndex], rowIndex)) {
      startEditingAt(rowIndex, navIndex);
      return;
    }
    if (active?.row === rowIndex && active?.navIndex === navIndex) return;
    setActive({ row: rowIndex, navIndex });
    setFocus({ row: rowIndex, navIndex });
    scrollCellIntoView(rowIndex, navIndex);
    focusGrid();
  };
  const selectRow = (rowIndex) => {
    const nextActive = { row: rowIndex, navIndex: 0 };
    const nextFocus = { row: rowIndex, navIndex: navCols.length - 1 };
    setActive(nextActive);
    setFocus(nextFocus);
    setGutterSelection({ active: nextActive, focus: nextFocus });
  };
  const selectColumn = (columnIndex) => {
    const nav = navIndexOf(columnIndex);
    if (nav < 0) return;
    const nextActive = { row: 0, navIndex: nav };
    const nextFocus = { row: rows.length - 1, navIndex: nav };
    setActive(nextActive);
    setFocus(nextFocus);
    setColumnSelection({ active: nextActive, focus: nextFocus });
  };
  const startHeaderSelection = (kind, anchor) => {
    headerGrabCleanup.current?.();
    const root = wrapperRef.current;
    const selector = kind === "col" ? 'thead [data-testid^="sg-colheader-"]' : 'tbody [data-testid^="sg-rowheader-"]';
    const update = (event) => {
      const target = event.target instanceof Element ? event.target.closest(selector) : null;
      const header = target && target.closest("[data-sg]") === root ? target : ownGridElements(root, selector).find((element) => {
        const rect = element.getBoundingClientRect();
        return kind === "col" ? event.clientX >= rect.left && event.clientX < rect.right : event.clientY >= rect.top && event.clientY < rect.bottom;
      });
      if (!header || header.hasAttribute("data-sg-system")) return;
      const index = kind === "col" ? Number(header.getAttribute("data-column-index")) : Number(header.closest("tr")?.getAttribute("data-row-index"));
      const nav = kind === "col" ? navIndexOf(index) : navCols.length - 1;
      if (nav < 0) return;
      const nextActive = kind === "col" ? { row: 0, navIndex: navIndexOf(anchor) } : { row: anchor, navIndex: 0 };
      const nextFocus = kind === "col" ? { row: rows.length - 1, navIndex: nav } : { row: index, navIndex: nav };
      setActive(nextActive);
      setFocus(nextFocus);
      (kind === "col" ? setColumnSelection : setGutterSelection)({ active: nextActive, focus: nextFocus });
    };
    const cleanup = () => {
      window.removeEventListener("mousemove", update);
      window.removeEventListener("mouseup", cleanup);
      window.removeEventListener("blur", cleanup);
      window.removeEventListener("keydown", cancel);
      headerGrabCleanup.current = null;
    };
    const cancel = (event) => {
      if (event.key === "Escape") cleanup();
    };
    headerGrabCleanup.current = cleanup;
    window.addEventListener("mousemove", update);
    window.addEventListener("mouseup", cleanup);
    window.addEventListener("blur", cleanup);
    window.addEventListener("keydown", cancel);
  };
  const startReorderGrab = (kind, block, start, onClick) => {
    headerGrabCleanup.current?.();
    let moved = false;
    const axis = kind === "col" ? "clientX" : "clientY";
    const onMove = (moveEvent) => {
      if (!moved) {
        if (Math.abs(moveEvent[axis] - start) < SG_REORDER_THRESHOLD) return;
        moved = true;
        const drag = { kind, ...block, drop: block.fromStart };
        reorderRef.current = drag;
        setHoveredResizeColumn(null);
        setReorder(drag);
      }
      updateDropFromPointer(kind, moveEvent.clientX, moveEvent.clientY);
    };
    const onUp = () => {
      cleanup();
      if (moved) finishReorder(kind);
      else onClick();
    };
    const cleanup = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", onKey);
      headerGrabCleanup.current = null;
    };
    const cancel = () => {
      cleanup();
      reorderRef.current = null;
      setReorder(null);
    };
    const onKey = (event) => {
      if (event.key === "Escape") cancel();
    };
    headerGrabCleanup.current = cleanup;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", onKey);
  };
  const beginRowGrab = (event, rowIndex) => {
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
    const inBlock = gutterSelection?.active === active && gutterSelection?.focus === focus && selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row && selection.min.navIndex === 0 && selection.max.navIndex === navCols.length - 1;
    const directHandle = event.target instanceof Element && Boolean(event.target.closest("[data-sg-row-drag-handle]"));
    if (!inBlock) selectRow(rowIndex);
    focusGrid();
    if ((inBlock || directHandle) && !readOnly && !rowViewProjected && (!rowSelectionMode || directHandle) && allowRowReorder) {
      const start = directHandle ? rowIndex : selection.min.row;
      let end = directHandle ? rowIndex : selection.max.row;
      for (let index = start; index <= end; index++) {
        if (rowGroupKey && bannerKeys.has(rowKey(rows[index]))) {
          const id = rowGroupKey(rows[index]);
          while (end + 1 < rows.length && rowGroupKey(rows[end + 1]) === id) end++;
        }
      }
      startReorderGrab("row", { fromStart: start, fromEnd: end }, event.clientY, () => selectRow(rowIndex));
    } else startHeaderSelection("row", rowIndex);
  };
  const beginColumnGrab = (event, columnIndex) => {
    if (event.button !== 0) return;
    const grabbed = columns[columnIndex];
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
    const inBlock = columnSelection?.active === active && columnSelection?.focus === focus && selection !== null && nav >= 0 && nav >= selection.min.navIndex && nav <= selection.max.navIndex && selection.min.row === 0 && selection.max.row === rows.length - 1;
    if (!inBlock) selectColumn(columnIndex);
    focusGrid();
    if (inBlock) {
      const block = { fromStart: visibleCols.indexOf(navCols[selection.min.navIndex]), fromEnd: visibleCols.indexOf(navCols[selection.max.navIndex]) };
      startReorderGrab("col", block, event.clientX, () => selectColumn(columnIndex));
    } else startHeaderSelection("col", columnIndex);
  };
  const updateDropFromPointer = (kind, x, y) => {
    const drag = reorderRef.current;
    const root = wrapperRef.current;
    if (!drag || drag.kind !== kind || !root) return;
    const mids = [];
    const slots = [];
    if (kind === "col") {
      const headers = ownGridElements(root, 'thead [data-testid^="sg-colheader-"]').sort((a, b) => visibleCols.indexOf(Number(a.getAttribute("data-column-index"))) - visibleCols.indexOf(Number(b.getAttribute("data-column-index"))));
      headers.forEach((cell) => {
        if (cell.hasAttribute("data-sg-system")) return;
        const rect = cell.getBoundingClientRect();
        mids.push(rect.left + rect.width / 2);
        slots.push(visibleCols.indexOf(Number(cell.getAttribute("data-column-index"))));
      });
    } else {
      ownGridElements(root, 'tbody tr[data-testid^="sg-row-"]').forEach((row) => {
        const rect = row.getBoundingClientRect();
        mids.push(rect.top + rect.height / 2);
        slots.push(Number(row.getAttribute("data-row-index")));
      });
    }
    const slot = dropSlot(mids, kind === "col" ? x : y);
    const drop = slots.length ? slots[slot] ?? slots[slots.length - 1] + 1 : 0;
    if (drop !== drag.drop) {
      const next = { ...drag, drop };
      reorderRef.current = next;
      setReorder(next);
    }
  };
  const finishReorder = (kind) => {
    const drag = reorderRef.current;
    reorderRef.current = null;
    setReorder(null);
    if (!drag || drag.kind !== kind) return;
    const len = drag.fromEnd - drag.fromStart + 1;
    if (drag.drop > drag.fromStart && drag.drop <= drag.fromEnd) return;
    const insertAt = drag.drop > drag.fromEnd ? drag.drop - len : drag.drop;
    if (insertAt === drag.fromStart) return;
    if (kind === "col") {
      const visibleIds = visibleCols.map((index) => columns[index].id);
      const moved = visibleIds.slice(drag.fromStart, drag.fromEnd + 1);
      const parentOf = (id) => {
        const path = columnProjection.paths.get(id) ?? [];
        return path[path.length - 1];
      };
      if (moved.some((id) => parentOf(id) !== parentOf(moved[0]))) return;
      const leaves = (id) => summaryGroups.get(id)?.leafIds ?? [id];
      const movingIds = new Set(moved.flatMap(leaves));
      const ids = physicalColumns.map((column) => column.id).filter((id) => !movingIds.has(id));
      const moving = physicalColumns.map((column) => column.id).filter((id) => movingIds.has(id));
      const targetId = visibleIds[drag.drop];
      const targetLeaves = targetId ? new Set(leaves(targetId)) : null;
      const targetIndex = targetLeaves ? ids.findIndex((id) => targetLeaves.has(id)) : ids.length;
      ids.splice(targetIndex < 0 ? ids.length : targetIndex, 0, ...moving);
      if (allGroups.some((group) => {
        const indexes = ids.flatMap((id, index) => group.leafIds.includes(id) ? [index] : []);
        return indexes.length !== group.leafIds.length || indexes.some((index, i) => index !== indexes[0] + i);
      })) return;
      if (ids.every((id, index) => id === physicalColumns[index].id)) return;
      pushUndoSnapshot("order");
      const systemIds = new Set(columns.filter((column) => column.render && !column.navigable).map((column) => column.id));
      const ordered = [...ids.filter((id) => !systemIds.has(id)), ...ids.filter((id) => systemIds.has(id))];
      setOrderIds(ordered);
      onColumnOrderChange?.(ordered.slice());
      const nextNavIds = navigationIdsInOrder(ordered);
      const newNavIndex = (id) => nextNavIds.indexOf(id);
      const remap = (cell) => {
        const id = columns[navCols[cell.navIndex]]?.id;
        return id ? { ...cell, navIndex: Math.max(0, newNavIndex(id)) } : cell;
      };
      if (active && focus) {
        const nextActive = remap(active), nextFocus = remap(focus);
        setActive(nextActive);
        setFocus(nextFocus);
        setColumnSelection({ active: nextActive, focus: nextFocus });
      }
    } else {
      const next = rows.slice();
      const moving = next.splice(drag.fromStart, len);
      next.splice(insertAt, 0, ...moving);
      if (outline && collapsedRowGroupKeys?.length) {
        const movingKeys = new Set(moving.map(rowKey));
        const groups2 = new Set(moving.filter(outline.isBanner).map(outline.groupKey));
        const fullMoving = sourceRows.filter((row) => movingKeys.has(rowKey(row)) || groups2.has(outline.groupKey(row)));
        const fullKeys = new Set(fullMoving.map(rowKey));
        const rest = sourceRows.filter((row) => !fullKeys.has(rowKey(row)));
        const target = next.slice(insertAt + moving.length).find((row) => !fullKeys.has(rowKey(row)));
        const destination = target ? rest.findIndex((row) => rowKey(row) === rowKey(target)) : rest.length;
        rest.splice(destination, 0, ...fullMoving);
        if (onRowReorder) onRowReorder(rest, fullMoving.map(rowKey));
        else onChange(rest);
      } else if (onRowReorder) onRowReorder(next, moving.map(rowKey));
      else emitRows(next);
      const remapRow = (rowIndex) => {
        const key = rowKey(rows[rowIndex]);
        const idx = next.findIndex((row) => rowKey(row) === key);
        return idx === -1 ? rowIndex : idx;
      };
      if (active && focus) {
        const nextActive = { ...active, row: remapRow(active.row) }, nextFocus = { ...focus, row: remapRow(focus.row) };
        setActive(nextActive);
        setFocus(nextFocus);
        setGutterSelection({ active: nextActive, focus: nextFocus });
      }
    }
  };
  const reorderMark = (kind, index, lastIndex) => {
    if (!reorder || reorder.kind !== kind) return null;
    if (reorder.drop > reorder.fromStart && reorder.drop <= reorder.fromEnd) {
      return index === reorder.fromStart ? kind === "col" ? "left" : "top" : null;
    }
    if (index === reorder.drop) return kind === "col" ? "left" : "top";
    return index === lastIndex && reorder.drop === lastIndex + 1 ? kind === "col" ? "right" : "bottom" : null;
  };
  const reorderMarkOverlay = (mark) => {
    if (!mark) return null;
    const style = mark === "left" ? { background: selectionColor, bottom: -1, left: -2, top: -1, width: 3 } : mark === "right" ? { background: selectionColor, bottom: -1, right: -2, top: -1, width: 3 } : mark === "top" ? { background: selectionColor, height: 3, left: -1, right: -1, top: -2 } : { background: selectionColor, bottom: -2, height: 3, left: -1, right: -1 };
    return /* @__PURE__ */ jsx5("div", { "aria-hidden": "true", className: "pointer-events-none absolute z-20", "data-testid": "sg-reorder-mark", style });
  };
  const cancelFillDrag = useCallback(() => {
    fillDragRef.current = null;
    fillTargetRef.current = null;
    setFillTarget(null);
  }, []);
  const updateFillTarget = (rowIndex, navIndex) => {
    const drag = fillDragRef.current;
    if (!drag || navIndex < 0) return;
    const { min, max } = drag.source;
    let next = null;
    if (rowIndex > max.row) next = { min: { row: max.row + 1, navIndex: min.navIndex }, max: { row: rowIndex, navIndex: max.navIndex } };
    else if (rowIndex < min.row) next = { min: { row: rowIndex, navIndex: min.navIndex }, max: { row: min.row - 1, navIndex: max.navIndex } };
    else if (navIndex > max.navIndex) next = { min: { row: min.row, navIndex: max.navIndex + 1 }, max: { row: max.row, navIndex } };
    else if (navIndex < min.navIndex) next = { min: { row: min.row, navIndex }, max: { row: max.row, navIndex: min.navIndex - 1 } };
    fillTargetRef.current = next;
    setFillTarget(next);
  };
  const applyFill = useCallback((source, target, series) => {
    if (readOnly) return false;
    const vertical = target.max.row > source.max.row ? 1 : target.min.row < source.min.row ? -1 : 0;
    const horizontal = target.max.navIndex > source.max.navIndex ? 1 : target.min.navIndex < source.min.navIndex ? -1 : 0;
    const lineValues = (rowIndex, navIndex, axis) => {
      const line = [];
      if (axis === "col") {
        for (let row = source.min.row; row <= source.max.row; row += 1) line.push(columns[navCols[navIndex]]?.getValue?.(rows[row]) ?? "");
      } else {
        for (let nav = source.min.navIndex; nav <= source.max.navIndex; nav += 1) line.push(columns[navCols[nav]]?.getValue?.(rows[rowIndex]) ?? "");
      }
      return line;
    };
    const fillLine = (values, count, direction) => {
      if (series) {
        const edge = direction === 1 ? values[values.length - 1] : values[0];
        return extendGridFillLine([edge ?? ""], count, direction);
      }
      return Array.from({ length: count }, (_, index) => values[direction === 1 ? index % values.length : values.length - 1 - index % values.length] ?? "");
    };
    const writes = [];
    const planCell = (rowIndex, navIndex, raw, next, sourceRow) => {
      const columnIndex = navCols[navIndex];
      const column = columns[columnIndex];
      const copyFrom = summaryGroups.get(column?.id || "")?.definition.summaryColumn.copyFrom;
      if (!column?.setValue || column.readOnly || column.chipsOnly) return;
      if (bannerKeys.has(rowKey(next[rowIndex]))) return;
      if (merges.covered.has(`${rowIndex}:${columnIndex}`)) return;
      if (cellLocked(next[rowIndex], sourceIndex(rowIndex), column)) return;
      const normalized = normalizeGridValue(column, raw);
      const error = validateGridValue(column.validation, normalized);
      if (error) {
        setEditError(`${column.title || "\u042F\u0447\u0435\u0439\u043A\u0430"}: ${error}`);
        throw new Error(error);
      }
      writes.push({ row: rowIndex, columnIndex, normalized, ...copyFrom && sourceRow ? { sourceRow, copyFrom } : {} });
    };
    try {
      if (vertical !== 0) {
        const count = target.max.row - target.min.row + 1;
        const next = rows.slice();
        for (let navIndex = source.min.navIndex; navIndex <= source.max.navIndex; navIndex += 1) {
          const filled = fillLine(lineValues(-1, navIndex, "col"), count, vertical);
          for (let index = 0; index < count; index += 1) {
            const row = vertical === 1 ? source.max.row + 1 + index : source.min.row - 1 - index;
            if (row < 0 || row >= next.length) continue;
            const sourceHeight = source.max.row - source.min.row + 1;
            const sourceOffset = vertical === 1 ? index % sourceHeight : sourceHeight - 1 - index % sourceHeight;
            planCell(row, navIndex, filled[index], next, rows[source.min.row + sourceOffset]);
          }
        }
        for (const write of writes) {
          const column = columns[write.columnIndex];
          next[write.row] = write.sourceRow && write.copyFrom ? write.copyFrom(next[write.row], write.sourceRow) : column.setValue(next[write.row], write.normalized);
        }
        if (writes.length) emitRows(next);
      } else if (horizontal !== 0) {
        const count = target.max.navIndex - target.min.navIndex + 1;
        const next = rows.slice();
        for (let rowIndex = source.min.row; rowIndex <= source.max.row; rowIndex += 1) {
          const filled = fillLine(lineValues(rowIndex, -1, "row"), count, horizontal);
          for (let index = 0; index < count; index += 1) {
            const navIndex = horizontal === 1 ? source.max.navIndex + 1 + index : source.min.navIndex - 1 - index;
            if (navIndex < 0 || navIndex >= navCols.length) continue;
            planCell(rowIndex, navIndex, filled[index], next);
          }
        }
        for (const write of writes) {
          const column = columns[write.columnIndex];
          next[write.row] = column.setValue(next[write.row], write.normalized);
        }
        if (writes.length) emitRows(next);
      }
      return writes.length > 0;
    } catch {
      return false;
    }
  }, [bannerKeys, rowKey, columns, emitRows, merges, navCols, readOnly, rows, summaryGroups]);
  const endFillDrag = useCallback((series) => {
    const drag = fillDragRef.current;
    const target = fillTargetRef.current;
    fillDragRef.current = null;
    fillTargetRef.current = null;
    setFillTarget(null);
    if (!drag || !target || !applyFill(drag.source, target, series)) return;
    const union = {
      min: { row: Math.min(drag.source.min.row, target.min.row), navIndex: Math.min(drag.source.min.navIndex, target.min.navIndex) },
      max: { row: Math.max(drag.source.max.row, target.max.row), navIndex: Math.max(drag.source.max.navIndex, target.max.navIndex) }
    };
    const vertical = target.max.row > drag.source.max.row ? 1 : target.min.row < drag.source.min.row ? -1 : 0;
    const horizontal = target.max.navIndex > drag.source.max.navIndex ? 1 : target.min.navIndex < drag.source.min.navIndex ? -1 : 0;
    const anchor = vertical < 0 ? { row: union.max.row, navIndex: union.min.navIndex } : horizontal < 0 ? { row: union.min.row, navIndex: union.max.navIndex } : { row: union.min.row, navIndex: union.min.navIndex };
    setActive(anchor);
    setFocus({
      row: anchor.row === union.min.row ? union.max.row : union.min.row,
      navIndex: anchor.navIndex === union.min.navIndex ? union.max.navIndex : union.min.navIndex
    });
  }, [applyFill]);
  const beginFillDrag = (event) => {
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
    const onMove = () => {
      pointerMovedRef.current = true;
    };
    const onScroll = () => {
      pointerMovedRef.current = false;
    };
    const onUp = (upEvent) => {
      endFillDrag(upEvent.ctrlKey);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll, true);
    };
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, true);
  };
  const startEditingAt = (rowIndex, navIndex) => {
    const columnIndex = navCols[navIndex];
    if (columnIndex === void 0) return;
    if (columns[columnIndex]?.kind === "checkbox") return;
    if (!cellEditable(columnIndex, rowIndex)) return;
    const column = columns[columnIndex];
    scrollCellIntoView(rowIndex, navIndex);
    setActive({ row: rowIndex, navIndex });
    setFocus({ row: rowIndex, navIndex });
    editSnapshotRef.current = { row: rowIndex, value: rows[rowIndex] };
    caretRequestRef.current = null;
    setSearchStarted(false);
    setDraft(formatEditingValue(column, column.getValue?.(rows[rowIndex]) ?? ""));
    setEditError(null);
    setEditing(true);
    focusGrid();
  };
  const handleCellDoubleClick = (rowIndex, navIndex, caretX, caretY) => {
    if (navIndex < 0) return;
    if (columns[navCols[navIndex]]?.kind === "checkbox") return;
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
      caretRequestRef.current = caretX === void 0 || caretY === void 0 ? null : { x: caretX, y: caretY };
      setSearchStarted(false);
      setDraft(formatEditingValue(columns[columnIndex], columns[columnIndex].getValue?.(rows[rowIndex]) ?? ""));
      setEditError(null);
      setEditing(true);
    }
  };
  const handleBlur = (event) => {
    const next = event.relatedTarget;
    if (next && rowMenuRef.current?.contains(next)) return;
    if (next && wrapperRef.current?.contains(next)) return;
    if (editing && !commitEdit()) cancelEdit();
  };
  useEffect4(() => {
    if (!cellMenu) return;
    const target = cellMenuTargetRef.current;
    const row = rows[cellMenu.row];
    const column = columns[navCols[cellMenu.navIndex]];
    if (!target || !row || !column || rowKey(row) !== target.rowKey || column.id !== target.columnId || !contextMenu && !onCellCommentAdd && !onCellCommentOpen) setCellMenu(null);
  }, [cellMenu, rows, columns, navCols, rowKey, contextMenu, onCellCommentAdd, onCellCommentOpen]);
  const closeCellMenu = useCallback((restoreFocus) => {
    setCellMenu(null);
    if (restoreFocus) focusGrid();
  }, [focusGrid]);
  const openCellMenu = (row, navIndex, x, y) => {
    if (!contextMenu && !onCellCommentAdd && !onCellCommentOpen || navIndex < 0 || !rows[row] || editing) return;
    cellMenuTargetRef.current = { rowKey: rowKey(rows[row]), columnId: columns[navCols[navIndex]].id };
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
      setActive(target);
      setFocus(target);
      setGutterSelection(null);
      setColumnSelection(null);
    }
    setCellMenu({ row, navIndex, x, y });
  };
  let cellMenuContext = null;
  let cellMenuItems = [];
  if (cellMenu && (contextMenu || onCellCommentAdd || onCellCommentOpen) && selection && selection.max.row < rows.length && selection.max.navIndex < navCols.length) {
    const column = columns[navCols[cellMenu.navIndex]];
    const row = rows[cellMenu.row];
    if (column && row) {
      const selectedColumns = navCols.slice(selection.min.navIndex, selection.max.navIndex + 1);
      const canClear = !readOnly && rows.slice(selection.min.row, selection.max.row + 1).some((_, offset) => selectedColumns.some((index) => cellEditable(index, selection.min.row + offset)));
      const defaultItems = [
        { id: "copy", label: "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C", shortcut: "Ctrl+C", disabled: !navigator.clipboard?.writeText, onSelect: async () => {
          await navigator.clipboard.writeText(selectionMatrix().map((line) => line.join("	")).join("\n"));
          setCopiedRange({ min: { ...selection.min }, max: { ...selection.max } });
        } },
        {
          id: "edit",
          label: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
          shortcut: "F2",
          disabled: !cellEditable(navCols[cellMenu.navIndex], cellMenu.row) || column.kind === "checkbox",
          onSelect: () => startEditingAt(cellMenu.row, cellMenu.navIndex)
        },
        { id: "clear", label: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435", shortcut: "Delete", disabled: !canClear, onSelect: clearSelection },
        { id: "selection-separator", separator: true },
        { id: "select-all", label: "\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0432\u0441\u0451", shortcut: "Ctrl+A", onSelect: selectAll }
      ];
      const cellNotes = cellComments?.(row, column.id) ?? [];
      const commentTarget = {
        row,
        rowKey: rowKey(row),
        columnId: column.id,
        columnTitle: column.title,
        value: column.getValue?.(row) ?? "",
        anchor: ownGridElements(wrapperRef.current, `[data-testid="sg-cell-${cellMenu.row}-${column.id}"]`)[0] ?? null
      };
      const commentItems = [];
      if (onCellCommentAdd || onCellCommentOpen) {
        commentItems.push({ id: "comment-separator", separator: true });
        if (onCellCommentAdd) commentItems.push({
          id: "comment-add",
          label: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439",
          onSelect: () => onCellCommentAdd(commentTarget)
        });
        if (onCellCommentOpen) commentItems.push({
          id: "comment-open",
          label: cellNotes.length ? `\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438 (${cellNotes.length})` : "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438",
          onSelect: () => onCellCommentOpen(commentTarget)
        });
      }
      const items = [...defaultItems, ...commentItems];
      cellMenuContext = {
        row,
        rowIndex: sourceIndex(cellMenu.row),
        visibleRowIndex: cellMenu.row,
        column,
        columnIndex: columnsProp.findIndex((item) => item.id === column.id),
        value: column.getValue?.(row) ?? "",
        readOnly: !cellEditable(navCols[cellMenu.navIndex], cellMenu.row),
        selection: {
          rows: rows.slice(selection.min.row, selection.max.row + 1),
          rowIndexes: rowIndexes.slice(selection.min.row, selection.max.row + 1),
          columnIds: selectedColumns.map((index) => columns[index].id),
          values: selectionMatrix()
        },
        defaultItems,
        fillSelection,
        clearSelection
      };
      const produced = typeof contextMenu === "function" ? contextMenu(cellMenuContext) : Array.isArray(contextMenu) ? contextMenu : items;
      const hasCommentCommand = produced.some((item) => item.id === "comment-add" || item.id === "comment-open");
      cellMenuItems = hasCommentCommand ? produced : [...produced, ...commentItems];
    }
  }
  const wrapperStyle = {
    cursor: "cell",
    userSelect: "none",
    ...rowGroupKey ? { overflowAnchor: "none", paddingBottom: outlineTail.current || void 0 } : {},
    ...virtual ? { overflow: "auto", height: virtualHeight, overflowAnchor: "none", "--sg-row-height": `${fixedRowHeight - 1}px` } : {}
  };
  return /* @__PURE__ */ jsxs5(
    "div",
    {
      "aria-label": ariaLabel,
      "aria-rowcount": virtual ? rows.length + Number(showColumnHeaders) : void 0,
      "aria-colcount": virtual ? visibleCols.length + Number(showRowHeaders) : void 0,
      className: "relative w-full rounded-md outline-none",
      "data-sg": true,
      "data-sg-selection-scope": selectionScope,
      "data-sg-row-headers": showRowHeaders ? void 0 : "hidden",
      "data-sg-column-headers": showColumnHeaders ? void 0 : "hidden",
      "data-sg-groups": groups.length ? "" : void 0,
      "data-sg-virtual": virtual ? "" : void 0,
      "data-testid": "sg",
      onBlur: handleBlur,
      onCopy: handleCopy,
      onClickCapture: (event) => captureCollapseScroll(event.target),
      onCut: handleCut,
      onKeyDown: handleKeyDown,
      onPaste: handlePaste,
      onScroll: handleViewportScroll,
      ref: wrapperRef,
      role: "grid",
      style: wrapperStyle,
      tabIndex: 0,
      children: [
        horizontallyScrolled && frozenCount > 0 && createPortal5(
          /* @__PURE__ */ jsx5(
            "div",
            {
              ref: frozenShadowRef,
              "data-testid": "sg-frozen-shadow",
              "aria-hidden": "true",
              style: {
                position: "fixed",
                pointerEvents: "none",
                zIndex: 41,
                background: "linear-gradient(to right, rgba(23, 43, 77, 0.14), rgba(23, 43, 77, 0.04) 45%, transparent)"
              }
            }
          ),
          document.body
        ),
        groupRowEditor && (() => {
          const group = allGroups.find((entry) => entry.definition.id === groupRowEditor.groupId);
          const rowIndex = sourceRows.findIndex((row) => rowKey(row) === groupRowEditor.key);
          if (!group || rowIndex < 0 || !collapsedGroups.has(group.definition.id)) return null;
          const details = physicalColumns.filter((column) => group.leafIds.includes(column.id)).map((column) => ({
            ...column,
            grow: false,
            openOnActivate: false,
            editor: column.editor ? (props) => {
              const Editor = column.editor;
              return /* @__PURE__ */ jsx5(Editor, { ...props, rowIndex });
            } : void 0,
            isDisabled: column.isDisabled ? (row) => column.isDisabled(row, rowIndex) : void 0,
            isSkeleton: column.isSkeleton ? (row) => column.isSkeleton(row, rowIndex) : void 0,
            render: column.render ? (row) => column.render(row, rowIndex) : void 0,
            renderValue: column.renderValue ? (row) => column.renderValue(row, rowIndex) : column.getValue && column.kind !== "multiselect" ? (row) => {
              const value = column.getValue(row);
              const display = column.kind !== "checkbox" && value.startsWith("=") && value.length > 1 ? sourceEvaluator(rowIndex, physicalColumns.indexOf(column)) : value;
              return /* @__PURE__ */ jsx5("span", { className: "sg-group-detail-value", style: { display: "block", whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "normal" }, children: formatGridValue(column.format, display) });
            } : void 0,
            // The panel shows one row: per-row icon factories see the original row index.
            icon: typeof column.icon === "function" ? (row) => column.icon(row, rowIndex) : column.icon
          }));
          return /* @__PURE__ */ jsx5(
            SimpleGridCellTable,
            {
              title: group.definition.title,
              anchor: groupRowEditor.anchor,
              rows: [sourceRows[rowIndex]],
              defaultColumnWidths: group.definition.rowEditorWidths ?? groupRowWidths[group.definition.id],
              columns: details,
              rowKey,
              createRow,
              selectionColor,
              selectionFill,
              initialEdit: groupRowEditor.seed,
              initialFocus: groupRowEditor.focus,
              onEditPreview: setGroupRowPreview,
              onColumnWidthsChange: (widths) => {
                setGroupRowWidths((previous) => ({ ...previous, [group.definition.id]: widths }));
                group.definition.onRowEditorWidthsChange?.(widths);
              },
              onChange: (next) => {
                if (next[0]) emitRows(sourceRows.map((row) => rowKey(row) === groupRowEditor.key ? next[0] : row), true);
              },
              readOnly,
              onClose: () => {
                setGroupRowPreview(null);
                setGroupRowEditor(null);
                focusGrid();
              }
            }
          );
        })(),
        menuError && /* @__PURE__ */ jsx5("div", { role: "alert", className: "sg-context-error", children: menuError }),
        cellMenu && cellMenuContext && /* @__PURE__ */ jsx5(
          ContextMenu,
          {
            x: cellMenu.x,
            y: cellMenu.y,
            items: cellMenuItems,
            onClose: closeCellMenu,
            onSelect: (item) => {
              const context = cellMenuContext;
              closeCellMenu(true);
              try {
                Promise.resolve(item.onSelect(context)).catch(() => setMenuError("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0443. \u0414\u043B\u044F \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u043C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C Ctrl+C."));
              } catch {
                setMenuError("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043D\u043E\u0433\u043E \u043C\u0435\u043D\u044E.");
              }
            }
          }
        ),
        rowMenu && createPortal5(
          /* @__PURE__ */ jsxs5(
            "div",
            {
              "data-sg-portal": "",
              className: "sg-row-menu",
              role: "menu",
              "aria-label": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441\u043E \u0441\u0442\u0440\u043E\u043A\u043E\u0439",
              ref: rowMenuRef,
              style: { left: rowMenu.x, top: rowMenu.y },
              onMouseDown: (event) => {
                event.preventDefault();
                event.stopPropagation();
              },
              onClick: (event) => event.stopPropagation(),
              onKeyDown: (event) => {
                event.stopPropagation();
                if (event.key === "Escape" || event.key === "Tab") {
                  event.preventDefault();
                  closeRowMenu();
                  return;
                }
                const buttons = Array.from(event.currentTarget.querySelectorAll("button:not(:disabled)"));
                const index = buttons.indexOf(document.activeElement);
                if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length;
                  buttons[next]?.focus();
                }
              },
              children: [
                /* @__PURE__ */ jsx5("button", { type: "button", role: "menuitem", disabled: readOnly, onClick: () => insertRow(false), children: "\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0432\u044B\u0448\u0435" }),
                /* @__PURE__ */ jsx5("button", { type: "button", role: "menuitem", disabled: readOnly, onClick: () => insertRow(true), children: "\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043D\u0438\u0436\u0435" }),
                /* @__PURE__ */ jsx5("button", { type: "button", role: "menuitem", onClick: () => {
                  resetRowHeight(rowMenu.key);
                  closeRowMenu();
                }, children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0432\u044B\u0441\u043E\u0442\u0443" })
              ]
            }
          ),
          document.body
        ),
        columnActionMenu && actionColumn?.columnActions && /* @__PURE__ */ jsx5(
          ContextMenu,
          {
            ariaLabel: `\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441\u0442\u043E\u043B\u0431\u0446\u0430 ${actionColumn.title}`,
            x: columnActionMenu.x,
            y: columnActionMenu.y,
            items: actionColumn.columnActions,
            onClose: (restore) => {
              if (restore) columnActionMenu.button.focus();
              setColumnActionMenu(null);
            },
            onSelect: (item) => {
              const action = actionColumn.columnActions?.find((action2) => action2.id === item.id);
              setColumnActionMenu(null);
              columnActionMenu.button.focus();
              if (action && !action.disabled) void action.onSelect();
            }
          }
        ),
        menu && /* @__PURE__ */ jsx5(
          ColumnMenu,
          {
            column: menuColumn,
            columns: physicalColumns,
            options: menuOptions,
            selected: filters.find((filter) => filter.columnId === menu.columnId)?.values,
            sort: appliedSort,
            hidden: manuallyHidden,
            button: menu.button,
            close: () => setMenu(null),
            apply: (values) => updateFilters([...filters.filter((filter) => filter.columnId !== menu.columnId), ...values === null || !menu.columnId ? [] : [{ columnId: menu.columnId, values }]]),
            reset: () => updateFilters(filters.filter((filter) => filter.columnId !== menu.columnId)),
            changeSort: updateSort,
            changeHidden: updateHidden
          },
          menu.columnId ?? "columns"
        ),
        !visibleCols.length && /* @__PURE__ */ jsx5("button", { type: "button", className: "sg-columns-restore", onMouseDown: (event) => event.stopPropagation(), onKeyDown: (event) => event.stopPropagation(), onClick: (event) => openMenu(null, event.currentTarget), children: "\u0421\u0442\u043E\u043B\u0431\u0446\u044B \u25BE" }),
        /* @__PURE__ */ jsx5(
          "span",
          {
            "aria-hidden": "true",
            className: "pointer-events-none absolute text-[11px]",
            "data-sg-row-number-measure": "",
            ref: rowNumberMeasureRef,
            style: { visibility: "hidden", top: 0, left: 0, padding: 0, fontWeight: 400, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
            children: "0"
          }
        ),
        /* @__PURE__ */ jsxs5(
          "table",
          {
            className: "w-full table-fixed border-separate border-spacing-0 text-[12px] text-[#172b4d]",
            style: {
              width: columnOffsets[visibleCols.length],
              minWidth: !virtual && visibleCols.some((index) => columns[index].grow && widthOverrides[columns[index].id] === void 0) ? "100%" : void 0
            },
            children: [
              /* @__PURE__ */ jsxs5("colgroup", { children: [
                showRowHeaders && /* @__PURE__ */ jsx5("col", { style: { width: gutterWidth } }),
                renderedColumns.map((entry) => {
                  if (entry.index === null) return /* @__PURE__ */ jsx5("col", { style: { width: entry.width } }, entry.key);
                  const column = columns[entry.index];
                  const width = widthOverrides[column.id];
                  return /* @__PURE__ */ jsx5("col", { style: !virtual && width === void 0 && column.grow ? void 0 : { width: width ?? column.width } }, column.id);
                })
              ] }),
              showColumnHeaders && /* @__PURE__ */ jsx5("thead", { children: headerRows.map((headerRow, level) => /* @__PURE__ */ jsxs5("tr", { style: { height: 24 }, children: [
                showRowHeaders && level === 0 && /* @__PURE__ */ jsx5(
                  "th",
                  {
                    rowSpan: headerRows.length,
                    className: "sticky top-0 border-b border-l border-r border-t border-[#dfe1e6] bg-[#f7f8fa]",
                    style: {
                      left: freezeRowHeader ? 0 : void 0,
                      zIndex: freezeRowHeader ? 40 : 30,
                      textAlign: rowSelectionMode ? "left" : void 0,
                      paddingLeft: rowSelectionMode ? 5 : void 0
                    },
                    children: /* @__PURE__ */ jsxs5("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }, children: [
                      rowSelectionMode && /* @__PURE__ */ jsx5(
                        "input",
                        {
                          ref: selectAllRowsRef,
                          "aria-label": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0432\u0441\u0435 \u0441\u0442\u0440\u043E\u043A\u0438",
                          onKeyDown: (event) => event.stopPropagation(),
                          type: "checkbox",
                          checked: visibleRowKeys.length > 0 && visibleSelectedCount === visibleRowKeys.length,
                          disabled: visibleRowKeys.length === 0,
                          style: { width: 14, height: 14, margin: 0, verticalAlign: "middle", accentColor: selectionColor, cursor: "pointer" },
                          onChange: (event) => {
                            const next = new Set(selectedRows);
                            visibleRowKeys.forEach((key) => event.target.checked ? next.add(key) : next.delete(key));
                            updateSelectedRows(presentRowKeys.filter((key) => next.has(key)));
                          }
                        }
                      ),
                      cornerContent && /* @__PURE__ */ jsx5("span", { "data-sg-corner-content": "", style: { display: "inline-flex", alignItems: "center" }, onMouseDown: (event) => event.stopPropagation(), onKeyDown: (event) => event.stopPropagation(), children: cornerContent })
                    ] })
                  }
                ),
                headerRow.map((entry) => {
                  if (entry.group) {
                    const definition = entry.group.definition;
                    const groupIcon = headerIconNode(definition.headerIcon, definition.headerIconPosition, definition.id);
                    const groupFrozen = frozenCount > 0 && entry.start !== void 0 && entry.end !== void 0 && entry.end <= frozenCount;
                    return /* @__PURE__ */ jsx5(
                      "th",
                      {
                        colSpan: entry.colSpan,
                        scope: "colgroup",
                        className: "sg-group-header",
                        "data-testid": `sg-group-header-${definition.id}`,
                        "data-sg-frozen-position": groupFrozen ? entry.start : void 0,
                        style: {
                          position: "sticky",
                          top: level * 24,
                          zIndex: groupFrozen ? 32 : 30,
                          ...groupFrozen ? { left: frozenLefts[entry.start] } : {}
                        },
                        children: /* @__PURE__ */ jsxs5("span", { className: "sg-column-header-content", children: [
                          /* @__PURE__ */ jsxs5("span", { className: "sg-column-title", title: definition.title, children: [
                            definition.headerIconPosition === "after" ? /* @__PURE__ */ jsxs5(Fragment5, { children: [
                              definition.title,
                              groupIcon
                            ] }) : /* @__PURE__ */ jsxs5(Fragment5, { children: [
                              groupIcon,
                              definition.title
                            ] }),
                            entry.width > 100 && groupToggle(entry.group, "left")
                          ] }),
                          groupToggle(entry.group)
                        ] })
                      },
                      entry.key
                    );
                  }
                  if (entry.index === null) return /* @__PURE__ */ jsx5("th", { "aria-hidden": "true", style: { padding: 0, border: 0, background: "#f7f8fa", position: "sticky", top: 0, zIndex: 30 } }, entry.key);
                  const columnIndex = entry.index;
                  const column = columns[columnIndex];
                  const visibleIndex = visibleCols.indexOf(columnIndex);
                  const prev = visibleIndex > 0 ? columns[visibleCols[visibleIndex - 1]] : null;
                  const isLast = columnIndex === visibleCols[visibleCols.length - 1];
                  const headerNav = navIndexOf(columnIndex);
                  const headerSelected = headerNav >= 0 && selection !== null && headerNav >= selection.min.navIndex && headerNav <= selection.max.navIndex;
                  const resizeHandle = (targetId, targetTitle, side, extraWidth) => /* @__PURE__ */ jsx5(
                    "div",
                    {
                      "aria-label": `\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0448\u0438\u0440\u0438\u043D\u0443 \u043A\u043E\u043B\u043E\u043D\u043A\u0438 ${targetTitle || targetId}`,
                      className: `absolute inset-y-0 ${side}-0 z-20 ${extraWidth} cursor-col-resize`,
                      "data-resizing": resizingColumn === targetId ? "true" : void 0,
                      "data-testid": side === "right" ? `sg-resize-${targetId}` : `sg-resize-${targetId}-left`,
                      onDoubleClick: (event) => {
                        event.stopPropagation();
                        if (!reorderRef.current) resetColumnWidth(targetId);
                      },
                      onMouseDown: (event) => beginColumnResize(targetId, event),
                      onMouseEnter: (event) => {
                        if (!reorderRef.current && event.buttons === 0) setHoveredResizeColumn(targetId);
                      },
                      onMouseLeave: () => setHoveredResizeColumn((previous) => previous === targetId ? null : previous),
                      role: "separator",
                      style: { pointerEvents: reorder ? "none" : void 0 },
                      title: "\u041F\u043E\u0442\u044F\u043D\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0448\u0438\u0440\u0438\u043D\u0443; \u0434\u0432\u043E\u0439\u043D\u043E\u0439 \u043A\u043B\u0438\u043A \u2014 \u0438\u0441\u0445\u043E\u0434\u043D\u0430\u044F"
                    }
                  );
                  const systemColumn = Boolean(column.render && !column.navigable);
                  const headerFrozen = frozenCount > 0 && entry.start !== void 0 && entry.start < frozenCount;
                  return /* @__PURE__ */ jsxs5(
                    "th",
                    {
                      rowSpan: entry.rowSpan,
                      scope: "col",
                      className: `sticky top-0 ${systemColumn ? "" : "cursor-grab"} border-b border-r border-t border-[#dfe1e6] px-1.5 text-[11px] font-semibold tracking-wide text-[#6b778c] ${column.align === "right" ? "text-right" : "text-left"}`,
                      "data-sg-system": systemColumn ? "" : void 0,
                      "data-column-index": columnIndex,
                      "data-sg-frozen-position": headerFrozen ? entry.start : void 0,
                      "data-testid": `sg-colheader-${column.id}`,
                      onMouseDown: (event) => beginColumnGrab(event, columnIndex),
                      style: {
                        top: level * 24,
                        ...headerFrozen ? { left: frozenLefts[entry.start] } : {},
                        background: headerSelected ? selectionFill : "#f7f8fa",
                        borderBottom: headerSelected ? `1px solid ${selectionColor}` : void 0,
                        cursor: reorder?.kind === "col" ? "grabbing" : systemColumn ? "default" : headerSelected && columnSelection?.active === active && columnSelection.focus === focus ? "grab" : "cell",
                        zIndex: headerFrozen ? 32 : resizingColumn === column.id || hoveredResizeColumn === column.id ? 31 : 30
                      },
                      children: [
                        /* @__PURE__ */ jsxs5("span", { className: "sg-column-header-content", children: [
                          /* @__PURE__ */ jsx5("span", { className: "sg-column-title", title: column.title, children: (() => {
                            const summaryGroup = summaryGroups.get(column.id);
                            const icon = headerIconNode(
                              summaryGroup ? summaryGroup.definition.headerIcon : column.headerIcon,
                              (summaryGroup ? summaryGroup.definition.headerIconPosition : column.headerIconPosition) ?? "before",
                              column.id
                            );
                            return (summaryGroup ? summaryGroup.definition.headerIconPosition : column.headerIconPosition) === "after" ? /* @__PURE__ */ jsxs5(Fragment5, { children: [
                              column.title,
                              icon
                            ] }) : /* @__PURE__ */ jsxs5(Fragment5, { children: [
                              icon,
                              column.title
                            ] });
                          })() }),
                          summaryGroups.has(column.id) ? groupToggle(summaryGroups.get(column.id)) : /* @__PURE__ */ jsxs5(Fragment5, { children: [
                            appliedSort?.columnId === column.id && /* @__PURE__ */ jsx5("span", { "aria-label": appliedSort.direction === "asc" ? "\u041F\u043E \u0432\u043E\u0437\u0440\u0430\u0441\u0442\u0430\u043D\u0438\u044E" : "\u041F\u043E \u0443\u0431\u044B\u0432\u0430\u043D\u0438\u044E", children: appliedSort.direction === "asc" ? " \u2191" : " \u2193" }),
                            column.columnActions?.length ? /* @__PURE__ */ jsx5(
                              "button",
                              {
                                type: "button",
                                className: "sg-column-menu-button sg-column-actions-button",
                                "aria-label": `\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441\u0442\u043E\u043B\u0431\u0446\u0430 ${column.title || column.id}`,
                                "aria-haspopup": "menu",
                                "aria-expanded": columnActionMenu?.columnId === column.id,
                                "data-testid": `sg-actions-${column.id}`,
                                title: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441\u0442\u043E\u043B\u0431\u0446\u0430",
                                onMouseDown: (event) => event.stopPropagation(),
                                onPointerDown: (event) => event.stopPropagation(),
                                onKeyDown: (event) => event.stopPropagation(),
                                onClick: (event) => {
                                  event.stopPropagation();
                                  const button = event.currentTarget;
                                  const rect = button.getBoundingClientRect();
                                  setMenu(null);
                                  setColumnActionMenu((previous) => previous?.columnId === column.id ? null : { columnId: column.id, button, x: rect.right - 200, y: rect.bottom + 4 });
                                },
                                children: /* @__PURE__ */ jsx5("span", { "aria-hidden": "true", children: "\u22EF" })
                              }
                            ) : /* @__PURE__ */ jsxs5(Fragment5, { children: [
                              "                    ",
                              /* @__PURE__ */ jsx5(
                                "button",
                                {
                                  type: "button",
                                  className: "sg-column-menu-button",
                                  "aria-label": `\u041C\u0435\u043D\u044E \u0441\u0442\u043E\u043B\u0431\u0446\u0430 ${column.title || column.id}`,
                                  "aria-haspopup": "dialog",
                                  "aria-expanded": Boolean(menu && menu.columnId === column.id),
                                  "data-testid": `sg-menu-${column.id}`,
                                  "data-filtered": filters.some((filter) => filter.columnId === column.id) ? "true" : void 0,
                                  onMouseDown: (event) => event.stopPropagation(),
                                  onKeyDown: (event) => event.stopPropagation(),
                                  title: filters.some((filter) => filter.columnId === column.id) ? "\u0424\u0438\u043B\u044C\u0442\u0440 \u043F\u0440\u0438\u043C\u0435\u043D\u0451\u043D \u2014 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0438\u043B\u0438 \u0441\u0431\u0440\u043E\u0441\u0438\u0442\u044C" : "\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430 \u0438 \u0444\u0438\u043B\u044C\u0442\u0440",
                                  onClick: (event) => {
                                    event.stopPropagation();
                                    openMenu(column.id, event.currentTarget);
                                  },
                                  children: filters.some((filter) => filter.columnId === column.id) ? /* @__PURE__ */ jsx5(ColumnMenuIcon, { name: "filter", size: 14 }) : /* @__PURE__ */ jsx5("span", { "aria-hidden": "true", children: "\u25BE" })
                                }
                              )
                            ] })
                          ] })
                        ] }),
                        prev && prev.resizable !== false ? resizeHandle(prev.id, prev.title || prev.id, "left", "w-1.5") : null,
                        column.resizable === false ? null : resizeHandle(column.id, column.title || column.id, "right", isLast ? "w-3" : "w-1.5"),
                        !reorder && column.resizable !== false && (resizingColumn === column.id || hoveredResizeColumn === column.id) && /* @__PURE__ */ jsx5(
                          "div",
                          {
                            "aria-hidden": "true",
                            "data-testid": `sg-resize-marker-${column.id}`,
                            style: {
                              position: "absolute",
                              pointerEvents: "none",
                              top: "50%",
                              right: -6,
                              width: 10,
                              height: 14,
                              transform: "translateY(-50%)",
                              display: "flex",
                              justifyContent: "space-between",
                              zIndex: 21
                            },
                            children: [0, 1].map((bar) => /* @__PURE__ */ jsx5("span", { style: {
                              width: 2,
                              height: "100%",
                              borderRadius: 1,
                              background: resizingColumn === column.id ? "#4c9aff" : "#97a0af"
                            } }, bar))
                          }
                        ),
                        reorderMarkOverlay(reorderMark("col", visibleCols.indexOf(columnIndex), visibleCols.length - 1))
                      ]
                    },
                    column.id
                  );
                })
              ] }, level)) }),
              (() => {
                const grouped = Boolean(renderRowDetails) && rowDetailsAppearance === "raised" && !rowGroupKey;
                const RowContainer = grouped ? "tbody" : Fragment4;
                const fullWidthSelection = selection !== null && selection.min.navIndex === 0 && selection.max.navIndex === navCols.length - 1;
                const bodyRows = renderedRows.map((entry) => {
                  if (entry.index === null) return /* @__PURE__ */ jsx5("tr", { "aria-hidden": "true", "data-sg-row-spacer": "", children: /* @__PURE__ */ jsx5("td", { colSpan: renderedColumns.length + Number(showRowHeaders), style: { height: entry.height, padding: 0, border: 0, lineHeight: 0, fontSize: 0 } }) }, entry.key);
                  const rowIndex = entry.index;
                  const row = rows[rowIndex];
                  if (bannerKeys.has(rowKey(row))) return /* @__PURE__ */ jsx5(RowContainer, { children: /* @__PURE__ */ jsxs5("tr", { "data-testid": `sg-row-${rowIndex}`, "data-row-index": rowIndex, className: "sg-row-banner", children: [
                    showRowHeaders && /* @__PURE__ */ jsxs5(
                      "td",
                      {
                        "data-testid": `sg-rowheader-${rowIndex}`,
                        className: `${cellBase} border-l text-center text-[11px] text-[#6b778c]`,
                        onMouseDown: (event) => beginRowGrab(event, rowIndex),
                        title: rowViewProjected || !allowRowReorder ? "\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0441\u0442\u0440\u043E\u043A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043F\u0440\u0438 \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0435 \u0438\u043B\u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u0430\u0446\u0438\u0438" : void 0,
                        style: { ...rowHeaderStyle?.(row, sourceIndex(rowIndex)), background: selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row ? selectionFill : rowHeaderStyle?.(row, sourceIndex(rowIndex))?.background || "#f7f8fa", position: stickyRowBanners || freezeRowHeader ? "sticky" : "relative", top: stickyRowBanners ? bannerTop : void 0, left: freezeRowHeader ? 0 : void 0, zIndex: stickyRowBanners ? 29 : freezeRowHeader ? 28 : void 0, fontVariantNumeric: "tabular-nums", cursor: reorder?.kind === "row" ? "grabbing" : "cell" },
                        children: [
                          rowHeaderLabel ? rowHeaderLabel(row, sourceIndex(rowIndex)) : rowIndex + 1,
                          reorderMarkOverlay(reorderMark("row", rowIndex, rows.length - 1))
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxs5("td", { colSpan: renderedColumns.length, style: { padding: 0, border: 0, position: stickyRowBanners ? "sticky" : "relative", top: stickyRowBanners ? bannerTop : void 0, zIndex: stickyRowBanners ? 28 : void 0, "--sg-row-banner-left": `${freezeRowHeader ? gutterWidth : 0}px` }, children: [
                      rowBanner(row, sourceIndex(rowIndex)),
                      reorderMarkOverlay(reorderMark("row", rowIndex, rows.length - 1))
                    ] })
                  ] }, rowKey(row)) }, rowKey(row));
                  const rowTint = rowFill?.(row, sourceIndex(rowIndex));
                  const rowTintImage = rowTint ? `linear-gradient(${rowTint}, ${rowTint})` : void 0;
                  const rowChecked = rowSelectionMode && selectedRows.has(rowKey(row));
                  const canResizeRow = fullWidthSelection && gutterSelection?.active === active && gutterSelection.focus === focus && selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row;
                  const details = renderRowDetails?.(row, sourceIndex(rowIndex));
                  const hasDetails = details != null && details !== false;
                  return /* @__PURE__ */ jsxs5(RowContainer, { ...grouped ? { "data-sg-row-surface": hasDetails ? "raised" : "flat" } : {}, children: [
                    /* @__PURE__ */ jsxs5(
                      "tr",
                      {
                        "data-sg-row-expanded": hasDetails ? rowDetailsAppearance : void 0,
                        "data-testid": `sg-row-${rowIndex}`,
                        "data-row-index": rowIndex,
                        "aria-rowindex": virtual ? rowIndex + 1 + Number(showColumnHeaders) : void 0,
                        style: { height: getRowHeight(rowKey(row)), ...virtual ? { "--sg-row-height": `${getRowHeight(rowKey(row)) - 1}px` } : {} },
                        children: [
                          showRowHeaders && /* @__PURE__ */ jsxs5(
                            "td",
                            {
                              className: `${cellBase} cursor-grab border-l text-center text-[11px] text-[#6b778c]`,
                              "data-testid": `sg-rowheader-${rowIndex}`,
                              onContextMenu: (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                openRowMenu(rowIndex, event.clientX, event.clientY);
                              },
                              onMouseDown: (event) => beginRowGrab(event, rowIndex),
                              title: rowViewProjected || !allowRowReorder ? "\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0441\u0442\u0440\u043E\u043A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043F\u0440\u0438 \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0435 \u0438\u043B\u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u0430\u0446\u0438\u0438" : void 0,
                              style: {
                                ...rowHeaderStyle?.(row, sourceIndex(rowIndex)),
                                fontVariantNumeric: "tabular-nums",
                                background: rowChecked || selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row ? selectionFill : rowHeaderStyle?.(row, sourceIndex(rowIndex))?.background || "#f7f8fa",
                                cursor: rowSelectionMode ? "default" : reorder?.kind === "row" ? "grabbing" : canResizeRow && !readOnly && !projected ? "grab" : "cell",
                                borderRight: selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row ? `1px solid ${selectionColor}` : void 0,
                                position: freezeRowHeader ? "sticky" : "relative",
                                left: freezeRowHeader ? 0 : void 0,
                                // Cover editors/fill handles (20/25), but stay under column headers (30).
                                zIndex: canResizeRow ? 29 : freezeRowHeader ? 28 : void 0
                              },
                              children: [
                                /* @__PURE__ */ jsxs5(
                                  "span",
                                  {
                                    className: "flex h-full items-center justify-center",
                                    style: rowSelectionMode ? { justifyContent: "flex-start", paddingLeft: 5 } : void 0,
                                    children: [
                                      rowSelectionMode && /* @__PURE__ */ jsx5(
                                        "input",
                                        {
                                          "aria-label": `\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u0443 ${rowHeaderLabel && (typeof rowHeaderLabel(row, sourceIndex(rowIndex)) === "string" || typeof rowHeaderLabel(row, sourceIndex(rowIndex)) === "number") ? rowHeaderLabel(row, sourceIndex(rowIndex)) : rowIndex + 1}`,
                                          onMouseDown: (event) => event.stopPropagation(),
                                          onKeyDown: (event) => event.stopPropagation(),
                                          checked: rowChecked,
                                          type: "checkbox",
                                          style: { width: 14, height: 14, margin: "0 8px 0 0", accentColor: selectionColor, cursor: "pointer", flexShrink: 0 },
                                          onClick: (event) => {
                                            event.stopPropagation();
                                            toggleSelectedRow(rowIndex, event.currentTarget.checked, event.shiftKey);
                                          },
                                          onChange: () => {
                                          }
                                        }
                                      ),
                                      /* @__PURE__ */ jsx5("span", { children: rowHeaderLabel ? rowHeaderLabel(row, sourceIndex(rowIndex)) : rowIndex + 1 })
                                    ]
                                  }
                                ),
                                canResizeRow && rowIndex === selection?.max.row && /* @__PURE__ */ jsxs5(
                                  "div",
                                  {
                                    className: "sg-row-resize",
                                    "data-testid": `sg-row-resize-${rowIndex}`,
                                    title: "\u041F\u043E\u0442\u044F\u043D\u0438\u0442\u0435 \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0432\u044B\u0441\u043E\u0442\u044B \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043D\u044B\u0445 \u0441\u0442\u0440\u043E\u043A; \u0434\u0432\u043E\u0439\u043D\u043E\u0439 \u043A\u043B\u0438\u043A \u2014 \u0441\u0431\u0440\u043E\u0441",
                                    "data-resizing": heightPreview?.keys.has(rowKey(row)) ? "true" : void 0,
                                    onMouseDown: (event) => beginRowResize(event, rowIndex),
                                    onDoubleClick: (event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      resetSelectedRowHeights(rowIndex);
                                    },
                                    children: [
                                      /* @__PURE__ */ jsx5("span", {}),
                                      /* @__PURE__ */ jsx5("span", {})
                                    ]
                                  }
                                ),
                                reorderMarkOverlay(reorderMark("row", rowIndex, rows.length - 1))
                              ]
                            }
                          ),
                          renderedColumns.map((columnEntry) => {
                            if (columnEntry.index === null) return /* @__PURE__ */ jsx5("td", { "aria-hidden": "true", style: { padding: 0, border: 0 } }, columnEntry.key);
                            const columnIndex = columnEntry.index;
                            const column = columns[columnIndex];
                            if (merges.covered.has(`${rowIndex}:${columnIndex}`)) return null;
                            const span = merges.anchors.get(`${rowIndex}:${columnIndex}`);
                            const navIndex = navIndexOf(columnIndex);
                            const isActive = navIndex >= 0 && active?.row === rowIndex && active?.navIndex === navIndex;
                            const isEditing = isActive && editing;
                            const rowSpan = span?.rowSpan ?? 1;
                            const colSpan = span?.colSpan ?? 1;
                            const visiblePosition = visibleCols.indexOf(columnIndex);
                            const mergeCrossesFreeze = visiblePosition >= 0 && visiblePosition < frozenCount && visiblePosition + colSpan - 1 >= frozenCount;
                            const frozenCell = visiblePosition >= 0 && visiblePosition < frozenCount && !mergeCrossesFreeze;
                            const selected = navIndex >= 0 ? !isActive && inSelection(rowIndex, navIndex) : fullWidthSelection && selection !== null && rowIndex >= selection.min.row && rowIndex <= selection.max.row;
                            const inRange = !selected && !isActive ? false : inSelection(rowIndex, navIndex);
                            const inFillTarget = !inRange && fillTarget !== null && rowIndex >= fillTarget.min.row && rowIndex <= fillTarget.max.row && navIndex >= fillTarget.min.navIndex && navIndex <= fillTarget.max.navIndex;
                            const isFillCorner = !readOnly && !isEditing && selection !== null && rowIndex === selection.max.row && navIndex === selection.max.navIndex;
                            const frameEdges = (range, width, kind) => ({
                              top: rowIndex === range.min.row ? 0 : -1,
                              left: navIndex === range.min.navIndex ? 0 : -1,
                              right: navIndex === range.max.navIndex ? 0 : -1,
                              bottom: rowIndex === range.max.row ? 0 : -1,
                              borderTop: rowIndex === range.min.row ? `${width} ${kind} ${selectionColor}` : void 0,
                              borderBottom: rowIndex === range.max.row ? `${width} ${kind} ${selectionColor}` : void 0,
                              borderLeft: navIndex === range.min.navIndex ? `${width} ${kind} ${selectionColor}` : void 0,
                              borderRight: navIndex === range.max.navIndex ? `${width} ${kind} ${selectionColor}` : void 0
                            });
                            const value = column.getValue?.(row) ?? "";
                            const display = column.kind !== "checkbox" && value.startsWith("=") && value.length > 1 ? evaluator(rowIndex, columnIndex) : value;
                            const invalid = !isEditing && validateGridValue(column.validation, display);
                            const isList = column.validation?.type === "list";
                            const isCheckbox = column.kind === "checkbox";
                            const isSkeletonCell = !isCheckbox && (column.isSkeleton?.(row, sourceIndex(rowIndex)) ?? false);
                            const isNumber = column.kind === "number" || column.validation?.type === "number";
                            const maxLines = column.maxLines ?? 1;
                            const wrapped = column.wrap === true || column.allowLineBreak === true;
                            const Editor = column.editor ?? (column.kind === "multiselect" ? SimpleGridMultiSelectEditor : column.kind === "autocomplete" || isList ? SimpleGridAutocompleteEditor : SimpleGridTextEditor);
                            const hasCalendar = (typeof column.datePicker === "function" ? column.datePicker(row) : !!column.datePicker) && !column.render && cellEditable(columnIndex, rowIndex);
                            const gutterPad = column.chevron || hasCalendar ? 26 : 4;
                            const cellIcon = !column.icon || column.render || column.renderValue || column.kind === "multiselect" || column.kind === "checkbox" ? null : typeof column.icon === "function" ? column.icon(row, sourceIndex(rowIndex)) : column.icon;
                            const cellIconNode = cellIcon ? /* @__PURE__ */ jsx5(
                              "span",
                              {
                                "aria-hidden": "true",
                                className: "sg-cell-icon",
                                "data-testid": `sg-cell-icon-${rowIndex}-${column.id}`,
                                style: column.iconPosition === "after" ? { marginLeft: SG_CELL_ICON_GAP } : { marginRight: SG_CELL_ICON_GAP },
                                children: cellIcon
                              }
                            ) : null;
                            const iconPadLeft = cellIconNode && column.iconPosition !== "after" ? SG_CELL_ICON_WIDTH + SG_CELL_ICON_GAP : 0;
                            const iconPadRight = cellIconNode && column.iconPosition === "after" && column.align === "right" ? SG_CELL_ICON_WIDTH + SG_CELL_ICON_GAP : 0;
                            const editingTextStyle = wrapped ? { lineHeight: "15px", overflowWrap: "anywhere", padding: `3px 4px`, paddingLeft: 4 + iconPadLeft, paddingRight: gutterPad + iconPadRight, whiteSpace: "pre-wrap" } : maxLines > 1 ? { lineHeight: "14px", overflowWrap: "anywhere", padding: `2px 4px`, paddingLeft: 4 + iconPadLeft, paddingRight: gutterPad + iconPadRight, whiteSpace: "pre-wrap" } : { height: "100%", overflow: "hidden", padding: `3px 4px`, paddingLeft: 4 + iconPadLeft, paddingRight: gutterPad + iconPadRight, whiteSpace: "nowrap" };
                            const candidates = isList ? column.validation.options.map((option) => ({ value: option, label: option })) : column.getCandidates?.() ?? [];
                            const cellNotes = cellComments?.(row, column.id) ?? [];
                            const hasCellNotes = cellNotes.length > 0;
                            const commentTarget = {
                              row,
                              rowKey: rowKey(row),
                              columnId: column.id,
                              columnTitle: column.title,
                              value: column.getValue?.(row) ?? ""
                            };
                            return /* @__PURE__ */ jsxs5(
                              "td",
                              {
                                className: cellBase,
                                colSpan: span?.colSpan,
                                "data-active": isActive ? "true" : void 0,
                                "data-editing": isEditing ? "true" : void 0,
                                "data-comment": hasCellNotes ? "" : void 0,
                                "data-comment-row": hasCellNotes ? rowKey(row) : void 0,
                                "data-comment-column": hasCellNotes ? column.id : void 0,
                                "data-selected": selected ? "true" : void 0,
                                "data-fill-target": inFillTarget ? "true" : void 0,
                                "data-invalid": invalid ? "true" : void 0,
                                "data-calendar": hasCalendar ? "true" : void 0,
                                "data-testid": `sg-cell-${rowIndex}-${column.id}`,
                                "data-sg-frozen-position": frozenCell ? visiblePosition : void 0,
                                "aria-colindex": virtual ? visibleCols.indexOf(columnIndex) + 1 + Number(showRowHeaders) : void 0,
                                onDoubleClick: (event) => handleCellDoubleClick(rowIndex, navIndex, event.clientX, event.clientY),
                                onClick: (event) => handleCellClick(event, rowIndex, navIndex),
                                onMouseDown: (event) => handleCellMouseDown(event, rowIndex, navIndex),
                                onContextMenu: (event) => {
                                  if (!contextMenu || navIndex < 0 || editing) return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openCellMenu(rowIndex, navIndex, event.clientX, event.clientY);
                                },
                                onMouseOver: () => handleCellMouseOver(rowIndex, navIndex),
                                rowSpan: span?.rowSpan,
                                style: {
                                  background: `${rowTintImage ? rowTintImage + " " : ""}${selected || rowChecked && !isActive ? selectionFill : "#fff"}`,
                                  cursor: isEditing ? "text" : void 0,
                                  position: frozenCell ? "sticky" : "relative",
                                  ...frozenCell ? { left: frozenLefts[visiblePosition] } : {},
                                  textAlign: column.align === "right" ? "right" : "left",
                                  // Values anchor to the top edge: text top-left, numbers top-right.
                                  verticalAlign: "top",
                                  scrollMarginLeft: freezeRowHeader ? gutterWidth : void 0,
                                  // Keep scrolling cells and their selection overlays in a lower
                                  // stacking context than frozen cells, so a range frame cannot
                                  // paint over the pinned pane. Editors/fill handles stay above
                                  // the sheet; frozen cells still cover the scrolling sheet.
                                  zIndex: isEditing ? frozenCell ? 27 : 20 : isFillCorner ? frozenCell ? 27 : 25 : frozenCell ? 26 : 0
                                },
                                children: [
                                  column.render ? column.render(row, sourceIndex(rowIndex)) : isCheckbox ? /* @__PURE__ */ jsx5(
                                    "label",
                                    {
                                      className: "flex h-full cursor-pointer items-center px-1.5",
                                      "data-sg-checkbox": "",
                                      "data-testid": `sg-checkbox-${rowIndex}-${column.id}`,
                                      onClick: (event) => event.stopPropagation(),
                                      children: /* @__PURE__ */ jsx5(
                                        "input",
                                        {
                                          "aria-label": column.title || column.id,
                                          checked: isGridCheckboxChecked(value),
                                          className: "h-3.5 w-3.5 cursor-pointer accent-[#217346]",
                                          disabled: !column.setValue || column.readOnly || readOnly || cellLocked(row, sourceIndex(rowIndex), column) || void 0,
                                          onChange: (event) => applyValue({ row: rowIndex, navIndex }, event.target.checked ? "TRUE" : "FALSE"),
                                          type: "checkbox"
                                        }
                                      )
                                    }
                                  ) : isSkeletonCell ? /* @__PURE__ */ jsx5("span", { "aria-hidden": "true", className: "sg-skeleton", "data-testid": `sg-skeleton-${rowIndex}-${column.id}` }) : isEditing ? /* @__PURE__ */ jsx5(Fragment5, { children: /* @__PURE__ */ jsx5(
                                    Editor,
                                    {
                                      align: column.align,
                                      displayValue: column.selectOnly ? column.renderValue?.(row, sourceIndex(rowIndex)) : void 0,
                                      alwaysOpen: isList || Boolean(column.openOnActivate),
                                      applyDraft: (next) => {
                                        setSearchStarted(true);
                                        setDraft(isNumber ? canonicalGridDecimal(next) : next);
                                        if (active) applyValue(active, next, true);
                                      },
                                      cancel: () => {
                                        cancelEdit();
                                        focusGrid();
                                      },
                                      allowLineBreak: column.allowLineBreak === true && !isNumber,
                                      caretAt: caretRequestRef.current,
                                      candidates,
                                      chipCandidates: candidates,
                                      commit: (override) => {
                                        if (commitEdit(override)) focusGrid();
                                      },
                                      commitAndMove: (override, direction = "right") => {
                                        if (!commitEdit(override)) return;
                                        if (direction === "right") moveHorizontal(1, true);
                                        else if (direction === "left") moveHorizontal(-1, true);
                                        else if (direction === "up") applyMove(active.row - 1, active.navIndex);
                                        else applyMove(active.row + 1, active.navIndex);
                                      },
                                      editorData: column.editorData,
                                      highlightMatches: column.highlightMatches !== false && searchStarted,
                                      inputMode: isNumber ? "decimal" : "text",
                                      menuMaxHeight: column.menuRows ? column.menuRows * SG_OPTION_HEIGHT : void 0,
                                      menuWidth: column.grow ? widthOverrides[column.id] : widthOverrides[column.id] ?? column.width,
                                      move: moveActive,
                                      onChange: (next) => {
                                        setSearchStarted(true);
                                        setDraft(isNumber ? canonicalGridDecimal(next) : next);
                                        setEditError(null);
                                      },
                                      placeholder: column.placeholder,
                                      row,
                                      rowIndex: sourceIndex(rowIndex),
                                      selectOnly: column.selectOnly,
                                      textStyle: editingTextStyle,
                                      value: draft
                                    }
                                  ) }) : column.renderValue ? column.renderValue(row, sourceIndex(rowIndex)) : column.kind === "multiselect" ? /* @__PURE__ */ jsx5(
                                    SimpleGridChipDisplay,
                                    {
                                      candidates,
                                      onRemove: !column.chipsOnly && column.setValue && !column.readOnly && !readOnly && !cellLocked(row, sourceIndex(rowIndex), column) ? (item) => applyValue({ row: rowIndex, navIndex }, serializeGridMultiValue(parseGridMultiValue(value).filter((selectedItem) => selectedItem !== item))) : void 0,
                                      readOnly: column.chipsOnly || column.readOnly || readOnly || cellLocked(row, sourceIndex(rowIndex), column),
                                      value: display
                                    }
                                  ) : /* @__PURE__ */ jsxs5(
                                    "span",
                                    {
                                      className: `block ${wrapped ? "" : "h-full overflow-hidden"} ${column.chevron ? "pl-1 pr-[26px]" : "px-1"}`,
                                      "data-testid": `sg-display-${rowIndex}-${column.id}`,
                                      style: wrapped ? {
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                        lineHeight: "15px",
                                        paddingTop: 3,
                                        paddingBottom: 3
                                      } : maxLines > 1 ? {
                                        display: "-webkit-box",
                                        WebkitLineClamp: maxLines,
                                        WebkitBoxOrient: "vertical",
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                        lineHeight: "14px",
                                        paddingTop: 2,
                                        paddingBottom: 2
                                      } : {
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        paddingTop: 3,
                                        paddingBottom: 3
                                      },
                                      title: display || void 0,
                                      children: [
                                        cellIconNode && column.iconPosition !== "after" && cellIconNode,
                                        formatGridValue(column.format, display),
                                        cellIconNode && column.iconPosition === "after" && cellIconNode
                                      ]
                                    }
                                  ),
                                  hasCellNotes && !isEditing && /* @__PURE__ */ jsx5(
                                    CommentMarker,
                                    {
                                      comments: cellNotes,
                                      target: commentTarget,
                                      testId: `sg-comment-marker-${rowIndex}-${column.id}`,
                                      onOpen: onCellCommentOpen
                                    }
                                  ),
                                  hasCalendar && /* @__PURE__ */ jsx5(
                                    CellDatePicker,
                                    {
                                      value: isEditing ? draft : display,
                                      title: column.title,
                                      context: column.getDatePickerContext?.(row),
                                      min: column.validation?.type === "date" ? column.validation.min : void 0,
                                      max: column.validation?.type === "date" ? column.validation.max : void 0,
                                      beforeOpen: () => {
                                        if (editing && !commitEdit()) return false;
                                        setActive({ row: rowIndex, navIndex });
                                        setFocus({ row: rowIndex, navIndex });
                                        return true;
                                      },
                                      onPick: (next) => {
                                        const error = validateGridValue(column.validation, next);
                                        if (error) {
                                          setEditError(error);
                                          return;
                                        }
                                        applyValue({ row: rowIndex, navIndex }, next);
                                      },
                                      onClose: focusGrid
                                    }
                                  ),
                                  !hasCalendar && !isEditing && !column.render && column.chevron && /* @__PURE__ */ jsx5(
                                    "button",
                                    {
                                      "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A",
                                      className: "absolute right-0.5 top-0 grid h-5 w-5 cursor-pointer place-items-center rounded p-0 text-[#98a2b3] hover:bg-[#f1f3f6] hover:text-[#6b778c]",
                                      "data-testid": `sg-chevron-${rowIndex}-${column.id}`,
                                      onClick: (event) => {
                                        event.stopPropagation();
                                        startEditingAt(rowIndex, navIndex);
                                      },
                                      onMouseDown: (event) => event.stopPropagation(),
                                      type: "button",
                                      children: /* @__PURE__ */ jsx5(ChevronDownIcon, {})
                                    }
                                  ),
                                  isActive && editError && /* @__PURE__ */ jsx5(
                                    "div",
                                    {
                                      className: "absolute left-0 top-full z-40 mt-0.5 w-max max-w-[260px] rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 shadow-sm",
                                      "data-testid": "sg-error",
                                      role: "alert",
                                      children: editError
                                    }
                                  ),
                                  invalid && /* @__PURE__ */ jsx5(
                                    "span",
                                    {
                                      className: "pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[7px] border-t-[7px] border-l-transparent border-t-red-500",
                                      "data-testid": `sg-invalid-${rowIndex}-${column.id}`,
                                      style: hasCellNotes ? { right: 10 } : void 0,
                                      title: invalid
                                    }
                                  ),
                                  isFillCorner && /* @__PURE__ */ jsx5(
                                    "div",
                                    {
                                      "aria-hidden": "true",
                                      className: "absolute z-30 h-[7px] w-[7px] cursor-crosshair",
                                      "data-testid": `sg-fill-${rowIndex}-${column.id}`,
                                      onClick: (event) => event.stopPropagation(),
                                      onMouseDown: beginFillDrag,
                                      style: { background: selectionColor, border: "1px solid #fff", right: -3, bottom: -3 }
                                    }
                                  ),
                                  inRange && selection && /* @__PURE__ */ jsx5(
                                    "div",
                                    {
                                      "aria-hidden": "true",
                                      className: "pointer-events-none absolute",
                                      "data-testid": `sg-frame-${rowIndex}-${column.id}`,
                                      style: { ...frameEdges(selection, "1px", "solid"), zIndex: 1 }
                                    }
                                  ),
                                  inFillTarget && fillTarget && /* @__PURE__ */ jsx5(
                                    "div",
                                    {
                                      "aria-hidden": "true",
                                      className: "pointer-events-none absolute",
                                      "data-testid": `sg-marquee-${rowIndex}-${column.id}`,
                                      style: { ...frameEdges(fillTarget, "1px", "dashed"), zIndex: 1 }
                                    }
                                  ),
                                  copiedRange && navIndex >= 0 && rowIndex <= copiedRange.max.row && rowIndex + rowSpan - 1 >= copiedRange.min.row && navIndex <= copiedRange.max.navIndex && navIndex + colSpan - 1 >= copiedRange.min.navIndex && /* @__PURE__ */ jsx5(
                                    "div",
                                    {
                                      "aria-hidden": "true",
                                      className: "sg-copy-marquee pointer-events-none absolute",
                                      "data-testid": `sg-copy-${rowIndex}-${column.id}`,
                                      style: {
                                        top: rowIndex <= copiedRange.min.row ? 0 : -1,
                                        left: navIndex <= copiedRange.min.navIndex ? 0 : -1,
                                        right: navIndex + colSpan - 1 >= copiedRange.max.navIndex ? 0 : -1,
                                        bottom: rowIndex + rowSpan - 1 >= copiedRange.max.row ? 0 : -1,
                                        "--sg-copy-color": selectionColor,
                                        "--sg-copy-top": rowIndex <= copiedRange.min.row ? "1px" : "0px",
                                        "--sg-copy-bottom": rowIndex + rowSpan - 1 >= copiedRange.max.row ? "1px" : "0px",
                                        "--sg-copy-left": navIndex <= copiedRange.min.navIndex ? "1px" : "0px",
                                        "--sg-copy-right": navIndex + colSpan - 1 >= copiedRange.max.navIndex ? "1px" : "0px",
                                        zIndex: 1
                                      }
                                    }
                                  ),
                                  reorderMarkOverlay(reorderMark("col", visibleCols.indexOf(columnIndex), visibleCols.length - 1)),
                                  reorderMarkOverlay(reorderMark("row", rowIndex, rows.length - 1))
                                ]
                              },
                              frozenCell ? `${column.id}:${rowIndex}` : column.id
                            );
                          })
                        ]
                      },
                      rowKey(row)
                    ),
                    hasDetails && /* @__PURE__ */ jsx5("tr", { "data-sg-row-details": "", "data-sg-details-appearance": rowDetailsAppearance, "data-parent-row-key": rowKey(row), children: /* @__PURE__ */ jsx5("td", { colSpan: renderedColumns.length + Number(showRowHeaders), style: { padding: 0, border: 0 }, children: /* @__PURE__ */ jsx5(
                      "div",
                      {
                        "data-sg-details-content": "",
                        style: { cursor: "default", userSelect: "text" },
                        onMouseDown: (event) => event.stopPropagation(),
                        onClick: (event) => event.stopPropagation(),
                        onContextMenu: (event) => event.stopPropagation(),
                        onKeyDown: (event) => event.stopPropagation(),
                        onCopy: (event) => event.stopPropagation(),
                        onCut: (event) => event.stopPropagation(),
                        onPaste: (event) => event.stopPropagation(),
                        onBlur: (event) => event.stopPropagation(),
                        children: details
                      }
                    ) }) })
                  ] }, rowKey(row));
                });
                if (rowGroupKey) {
                  const bodies = [];
                  bodyRows.forEach((node, index) => {
                    const entry = renderedRows[index];
                    const id = entry.index === null ? void 0 : rowGroupKey(rows[entry.index]);
                    let body = bodies[bodies.length - 1];
                    if (!body || body.id !== id) {
                      body = { id, nodes: [] };
                      bodies.push(body);
                    }
                    body.nodes.push(node);
                  });
                  return bodies.map((body, index) => /* @__PURE__ */ jsx5("tbody", { "data-sg-outline-group": body.id, children: body.nodes }, `${body.id || "ungrouped"}:${index}`));
                }
                return grouped ? bodyRows : /* @__PURE__ */ jsx5("tbody", { children: bodyRows });
              })()
            ]
          }
        )
      ]
    }
  );
}
function SimpleGridCellTable({ title, anchor, rows, columns, rowKey, createRow, onChange, onEditPreview, onColumnWidthsChange, defaultColumnWidths, onClose, readOnly, showRowHeaders = false, rowHeaderLabel, allowRowReorder, onRowReorder, selectionColor = "#1E68F5", selectionFill = "#eef4ff", footer, initialEdit, initialFocus }) {
  const panel = useRef6(null);
  const closeRef = useRef6(onClose);
  closeRef.current = onClose;
  const [position, setPosition] = useState5({ left: 8, top: 8 });
  useLayoutEffect6(() => {
    const place = () => {
      if (!anchor.isConnected) {
        closeRef.current();
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const width = panel.current?.getBoundingClientRect().width || columns.reduce((sum, column) => sum + column.width, 0);
      const height = panel.current?.getBoundingClientRect().height || 48;
      const below = rect.bottom;
      const top = below + height <= window.innerHeight - 8 ? below : Math.max(8, rect.top - height);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setPosition((previous) => previous.left === left && previous.top === top ? previous : { left, top });
    };
    place();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    const table = panel.current?.querySelector("table");
    if (table) observer?.observe(table);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor, columns]);
  useEffect4(() => {
    if (!initialEdit && !initialFocus) panel.current?.focus();
    const outside = (event) => {
      const target = event.target;
      if (!(target instanceof Element) || panel.current?.contains(target) || anchor.contains(target) || target.closest("[data-sg-portal]")) return;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && panel.current?.contains(focused)) focused.blur();
      closeRef.current();
    };
    document.addEventListener("click", outside);
    return () => document.removeEventListener("click", outside);
  }, [anchor, initialEdit, initialFocus]);
  return createPortal5(/* @__PURE__ */ jsxs5(
    "div",
    {
      ref: panel,
      "data-sg-portal": "",
      "data-testid": "sg-group-row-editor",
      "data-single-row": rows.length <= 1 ? true : void 0,
      className: "sg-group-row-editor",
      role: "group",
      "aria-label": `${title}: \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0442\u0430\u0431\u043B\u0438\u0446\u044B`,
      tabIndex: -1,
      style: { ...position, font: window.getComputedStyle(anchor).font },
      onMouseDown: (event) => event.stopPropagation(),
      onClick: (event) => event.stopPropagation(),
      onCopy: (event) => event.stopPropagation(),
      onCut: (event) => event.stopPropagation(),
      onPaste: (event) => event.stopPropagation(),
      onKeyDown: (event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          closeRef.current();
        }
      },
      children: [
        /* @__PURE__ */ jsx5("div", { className: "sg-group-row-editor-scroll", children: /* @__PURE__ */ jsx5(
          SimpleGrid,
          {
            rows,
            columns,
            rowKey,
            createRow,
            onChange,
            onEditPreview,
            onColumnWidthsChange,
            defaultColumnWidths,
            initialEdit,
            initialFocus,
            showRowHeaders,
            rowHeaderLabel,
            allowRowReorder,
            onRowReorder,
            rowHeight: 30,
            readOnly,
            selectionColor,
            selectionFill,
            ariaLabel: `${title}: \u043F\u043E\u043B\u044F \u0441\u0442\u0440\u043E\u043A\u0438`
          }
        ) }),
        footer && /* @__PURE__ */ jsx5("div", { className: "sg-cell-table-footer", children: footer })
      ]
    }
  ), document.body);
}
export {
  SimpleGrid,
  SimpleGridCellTable,
  dropSlot
};
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils/mergeClasses.js:
lucide-react/dist/esm/shared/src/utils/toKebabCase.js:
lucide-react/dist/esm/shared/src/utils/toCamelCase.js:
lucide-react/dist/esm/shared/src/utils/toPascalCase.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/shared/src/utils/hasA11yProp.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/calendar-days.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.577.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
