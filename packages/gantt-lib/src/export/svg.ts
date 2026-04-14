import { getBusinessDaysCount, isTaskParent } from '../core/scheduling';
import type { TaskPredicate } from '../filters';
import type { LinkType } from '../types';
import { calculateDependencyPath, calculateGridLines, calculateMilestoneGeometry, calculateMonthGridLines, calculateTaskBar, calculateWeekGridLines, calculateWeekendBlocks, resolveTaskHorizontalGeometry } from '../utils/geometry';
import { detectCycles, getAllDependencyEdges } from '../utils/dependencyUtils';
import { createCustomDayPredicate, formatDateRangeLabel, getMonthBlocks, getMonthSpans, getMultiMonthDays, getWeekBlocks, getWeekSpans, getYearSpans, parseUTCDate, type CustomDayConfig } from '../utils/dateUtils';
import { isTaskExpired } from '../utils/expired';
import { normalizeHierarchyTasks } from '../utils/hierarchyOrder';
import { isMilestoneTask, normalizeTaskDatesForType } from '../utils/taskType';
import type { ExportToPdfHeaderOptions, Task } from '../components/GanttChart/GanttChart';

export interface GanttSvgExportOptions<TTask extends Task = Task> {
  width?: number;
  dayWidth?: number;
  rowHeight?: number;
  headerHeight?: number;
  taskListWidth?: number;
  includeTaskList?: boolean;
  includeChart?: boolean;
  padding?: number;
  title?: string;
  subtitle?: string;
  header?: ExportToPdfHeaderOptions;
  viewMode?: 'day' | 'week' | 'month';
  customDays?: CustomDayConfig[];
  isWeekend?: (date: Date) => boolean;
  businessDays?: boolean;
  taskFilter?: TaskPredicate;
  filterMode?: 'highlight' | 'hide';
  collapsedParentIds?: Set<string>;
  highlightedTaskIds?: Set<string>;
  highlightExpiredTasks?: boolean;
  showTodayIndicator?: boolean;
}

const COLORS = {
  bg: '#ffffff',
  border: '#e0e0e0',
  muted: '#6b7280',
  text: '#111827',
  taskBar: '#3b82f6',
  parentBar: '#782FC4',
  progressAccepted: '#22c55e',
  progressCompleted: '#fbbf24',
  dependency: '#666666',
  dependencyCycle: '#ef4444',
  weekend: '#fdf2f8',
  today: '#ef4444',
  expired: '#ef4444',
};

const FONT_FAMILY = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const DEFAULT_DAY_WIDTH = 40;
const DEFAULT_ROW_HEIGHT = 40;
const DEFAULT_HEADER_HEIGHT = 40;
const DEFAULT_TASK_LIST_WIDTH = 660;
const DEFAULT_PADDING = 24;
const MIN_TASK_LIST_WIDTH = 530;
const MILESTONE_SIZE = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const esc = (value: unknown): string => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const rgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const darken = (hex: string, amount: number): string => {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = clamp(parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = clamp(parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const fmtDate = (date: string | Date): string => {
  const parsed = parseUTCDate(date);
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
};

const fmtExportDate = (value?: ExportToPdfHeaderOptions['exportDate']): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
};

function getTaskNumber(tasks: Task[], index: number): string {
  const task = tasks[index];
  if (!task) return '';
  if (!task.parentId) {
    let rootIndex = 0;
    for (let i = 0; i < index; i++) if (!tasks[i].parentId) rootIndex++;
    return String(rootIndex + 1);
  }
  const parentIndex = tasks.findIndex((candidate) => candidate.id === task.parentId);
  if (parentIndex === -1) return String(index + 1);
  const parentNumber = getTaskNumber(tasks, parentIndex);
  let siblingIndex = 0;
  for (let i = 0; i < index; i++) if (tasks[i].parentId === task.parentId) siblingIndex++;
  return `${parentNumber}.${siblingIndex + 1}`;
}

const getTaskDepth = (taskId: string, tasks: Task[]): number => {
  let depth = 0;
  let current = tasks.find((task) => task.id === taskId);
  while (current?.parentId) {
    depth++;
    current = tasks.find((task) => task.id === current?.parentId);
  }
  return depth;
};

const resolveVisibleTasks = (
  orderedTasks: Task[],
  collapsedParentIds: Set<string>,
  filterMode: 'highlight' | 'hide',
  taskFilter?: TaskPredicate,
): Task[] => {
  const parentMap = new Map(orderedTasks.map((task) => [task.id, task.parentId]));
  const isCollapsed = (parentId: string | undefined): boolean => {
    let current = parentId;
    while (current) {
      if (collapsedParentIds.has(current)) return true;
      current = parentMap.get(current);
    }
    return false;
  };
  const visible = orderedTasks.filter((task) => !isCollapsed(task.parentId));
  return filterMode === 'hide' && taskFilter ? visible.filter(taskFilter) : visible;
};

const isTaskHidden = (taskId: string, collapsedParentIds: Set<string>, taskMap: Map<string, Task>): boolean => {
  const task = taskMap.get(taskId);
  return Boolean(task?.parentId && collapsedParentIds.has(task.parentId));
};

const findVisibleAncestor = (task: Task, collapsedParentIds: Set<string>, taskMap: Map<string, Task>): Task | null => {
  if (!task.parentId || !collapsedParentIds.has(task.parentId)) return null;
  const parent = taskMap.get(task.parentId);
  if (!parent) return null;
  return parent.parentId && collapsedParentIds.has(parent.parentId)
    ? findVisibleAncestor(parent, collapsedParentIds, taskMap)
    : parent;
};

const areBothHiddenInSameParent = (a: string, b: string, collapsedParentIds: Set<string>, taskMap: Map<string, Task>): boolean => {
  const first = taskMap.get(a);
  const second = taskMap.get(b);
  if (!first?.parentId || !second?.parentId) return false;
  const firstAncestor = findVisibleAncestor(first, collapsedParentIds, taskMap);
  const secondAncestor = findVisibleAncestor(second, collapsedParentIds, taskMap);
  return Boolean(firstAncestor && secondAncestor && firstAncestor.id === secondAncestor.id);
};

const columns = (businessDays: boolean) => ([
  { id: 'number', header: '\u2116', width: 40 },
  { id: 'name', header: '\u0418\u043C\u044F', width: 200 },
  { id: 'startDate', header: '\u041D\u0430\u0447\u0430\u043B\u043E', width: 90 },
  { id: 'endDate', header: '\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435', width: 90 },
  { id: 'duration', header: businessDays ? '\u0414\u043D. (\u0440)' : '\u0414\u043D.', width: 60 },
  { id: 'progress', header: '%', width: 50 },
  { id: 'dependencies', header: '\u0421\u0432\u044F\u0437\u0438', width: 120 },
]);

export function renderGanttToSvg<TTask extends Task = Task>(tasks: TTask[], options?: GanttSvgExportOptions<TTask>): string {
  const {
    width,
    dayWidth = DEFAULT_DAY_WIDTH,
    rowHeight = DEFAULT_ROW_HEIGHT,
    headerHeight = DEFAULT_HEADER_HEIGHT,
    taskListWidth = DEFAULT_TASK_LIST_WIDTH,
    includeTaskList = true,
    includeChart = true,
    padding = DEFAULT_PADDING,
    title,
    subtitle,
    header,
    viewMode = 'day',
    customDays,
    isWeekend,
    businessDays = true,
    taskFilter,
    filterMode = 'highlight',
    collapsedParentIds = new Set<string>(),
    highlightedTaskIds = new Set<string>(),
    highlightExpiredTasks = false,
    showTodayIndicator = true,
  } = options ?? {};

  const normalizedTasks = normalizeHierarchyTasks(tasks.map((task) => normalizeTaskDatesForType(task)));
  const visibleTasks = resolveVisibleTasks(normalizedTasks, collapsedParentIds, filterMode, taskFilter);
  const matchedTaskIds = taskFilter ? new Set(visibleTasks.filter(taskFilter).map((task) => task.id)) : new Set<string>();
  const effectiveHighlights = filterMode === 'hide' ? new Set<string>() : new Set([...highlightedTaskIds, ...matchedTaskIds]);
  const dateRange = getMultiMonthDays(normalizedTasks);
  const monthStart = dateRange.length > 0
    ? new Date(Date.UTC(dateRange[0].getUTCFullYear(), dateRange[0].getUTCMonth(), 1))
    : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const effectiveTaskListWidth = includeTaskList ? Math.max(taskListWidth, MIN_TASK_LIST_WIDTH) : 0;
  const effectiveDayWidth = width && includeChart && dateRange.length > 0
    ? Math.max(4, (width - padding * 2 - effectiveTaskListWidth) / dateRange.length)
    : dayWidth;
  const gridWidth = includeChart ? Math.round(dateRange.length * effectiveDayWidth) : 0;
  const bodyHeight = visibleTasks.length * rowHeight;
  const topHeaderHeight = title || subtitle || header?.logoUrl || header?.projectName || header?.serviceName || header?.exportDate ? 64 : 0;
  const svgWidth = Math.round(width ?? (padding * 2 + effectiveTaskListWidth + gridWidth));
  const svgHeight = Math.round(padding * 2 + topHeaderHeight + headerHeight + bodyHeight);
  const x0 = padding;
  const y0 = padding + topHeaderHeight;
  const chartX = x0 + effectiveTaskListWidth;
  const headerRowHeight = headerHeight / 2;
  const weekendPredicate = createCustomDayPredicate({ customDays, isWeekend });
  const taskNumberMap = Object.fromEntries(normalizedTasks.map((task, index) => [task.id, getTaskNumber(normalizedTasks, index)])) as Record<string, string>;

  const taskListSvg = includeTaskList ? (() => {
    let colX = x0;
    const head = columns(businessDays).map((col) => {
      const current = colX;
      colX += col.width;
      return `<rect x="${current}" y="${y0}" width="${col.width}" height="${headerHeight}" fill="${COLORS.bg}" stroke="${COLORS.border}"/><text x="${current + 8}" y="${y0 + headerHeight / 2 + 4}" font-size="12" font-weight="600" fill="${COLORS.muted}">${esc(col.header)}</text>`;
    }).join('');
    const body = visibleTasks.map((task, index) => {
      const rowY = y0 + headerHeight + index * rowHeight;
      const isParent = isTaskParent(task.id, normalizedTasks);
      const fill = effectiveHighlights.has(task.id) ? rgba('#facc15', 0.24) : COLORS.bg;
      const depth = getTaskDepth(task.id, normalizedTasks);
      const duration = businessDays
        ? getBusinessDaysCount(parseUTCDate(task.startDate), parseUTCDate(task.endDate), weekendPredicate)
        : Math.round((parseUTCDate(task.endDate).getTime() - parseUTCDate(task.startDate).getTime()) / DAY_MS) + 1;
      const values: Record<string, string> = {
        number: taskNumberMap[task.id] ?? '',
        name: task.name,
        startDate: fmtDate(task.startDate),
        endDate: fmtDate(task.endDate),
        duration: String(duration),
        progress: task.progress != null ? `${Math.max(0, Math.min(100, Math.round(task.progress)))}%` : '',
        dependencies: (task.dependencies ?? []).map((dep) => `${taskNumberMap[dep.taskId] || dep.taskId} ${dep.type}${dep.lag === 0 ? '' : dep.lag > 0 ? ` +${dep.lag}` : ` ${dep.lag}`}`).join(', '),
      };
      let cellX = x0;
      return columns(businessDays).map((col) => {
        const current = cellX;
        cellX += col.width;
        const isName = col.id === 'name';
        const indent = isName ? depth * 16 : 0;
        const hasChildren = isParent && isName;
        const triangleX = current + 8 + indent;
        const textX = current + 8 + indent + (hasChildren ? 14 : 0);
        const triangle = hasChildren
          ? (collapsedParentIds.has(task.id)
            ? `<path d="M ${triangleX} ${rowY + rowHeight / 2 - 5} L ${triangleX + 8} ${rowY + rowHeight / 2} L ${triangleX} ${rowY + rowHeight / 2 + 5} Z" fill="${COLORS.muted}"/>`
            : `<path d="M ${triangleX - 1} ${rowY + rowHeight / 2 - 4} L ${triangleX + 7} ${rowY + rowHeight / 2 - 4} L ${triangleX + 3} ${rowY + rowHeight / 2 + 4} Z" fill="${COLORS.muted}"/>`)
          : '';
        return `<rect x="${current}" y="${rowY}" width="${col.width}" height="${rowHeight}" fill="${fill}" stroke="${COLORS.border}"/>${triangle}<text x="${textX}" y="${rowY + rowHeight / 2 + 5}" font-size="12" font-weight="${isParent && isName ? '600' : '400'}" fill="${COLORS.text}">${esc(values[col.id])}</text>`;
      }).join('');
    }).join('');
    return `<g data-export-layer="task-list">${head}${body}</g>`;
  })() : '';

  const chartSvg = includeChart ? (() => {
    const lines = viewMode === 'week'
      ? calculateWeekGridLines(dateRange, effectiveDayWidth)
      : viewMode === 'month'
        ? calculateMonthGridLines(dateRange, effectiveDayWidth)
        : calculateGridLines(dateRange, effectiveDayWidth);
    const weekendBlocks = viewMode === 'day' ? calculateWeekendBlocks(dateRange, effectiveDayWidth, weekendPredicate) : [];
    const background = `
      <rect x="${chartX}" y="${y0}" width="${gridWidth}" height="${headerHeight}" fill="${COLORS.bg}" stroke="${COLORS.border}"/>
      <line x1="${chartX}" y1="${y0 + headerRowHeight}" x2="${chartX + gridWidth}" y2="${y0 + headerRowHeight}" stroke="${COLORS.border}"/>
      <rect x="${chartX}" y="${y0 + headerHeight}" width="${gridWidth}" height="${bodyHeight}" fill="${COLORS.bg}" stroke="${COLORS.border}"/>
      ${weekendBlocks.map((block) => `<rect x="${chartX + block.left}" y="${y0 + headerHeight}" width="${block.width}" height="${bodyHeight}" fill="${COLORS.weekend}"/>`).join('')}
      ${lines.map((line) => `<line x1="${chartX + line.x}" y1="${y0}" x2="${chartX + line.x}" y2="${y0 + headerHeight + bodyHeight}" stroke="${line.isMonthStart ? COLORS.border : '#edf0f2'}" stroke-width="${line.isMonthStart ? 1.25 : 1}"/>`).join('')}
      ${visibleTasks.map((task, index) => {
        const rowY = y0 + headerHeight + index * rowHeight;
        const highlight = effectiveHighlights.has(task.id) ? `<rect x="${chartX}" y="${rowY}" width="${gridWidth}" height="${rowHeight}" fill="${rgba('#facc15', 0.24)}"/>` : '';
        const dividerTop = task.divider === 'top' ? `<line x1="${chartX}" y1="${rowY}" x2="${chartX + gridWidth}" y2="${rowY}" stroke="#d4bceb"/>` : '';
        const dividerBottom = task.divider === 'bottom' ? `<line x1="${chartX}" y1="${rowY + rowHeight}" x2="${chartX + gridWidth}" y2="${rowY + rowHeight}" stroke="#d4bceb"/>` : '';
        return `${highlight}<line x1="${chartX}" y1="${rowY + rowHeight}" x2="${chartX + gridWidth}" y2="${rowY + rowHeight}" stroke="${COLORS.border}"/>${dividerTop}${dividerBottom}`;
      }).join('')}
    `;

    const headerLabels = (() => {
      if (viewMode === 'week') {
        let topX = chartX;
        const top = getWeekSpans(dateRange).map((span) => {
          const current = topX;
          topX += span.days * effectiveDayWidth;
          const label = `${span.month.toLocaleString('ru-RU', { month: 'long', timeZone: 'UTC' }).replace(/^./, (c) => c.toUpperCase())} ${span.month.getUTCFullYear()}`;
          return `<text x="${current + 8}" y="${y0 + headerRowHeight / 2 + 4}" font-size="12" font-weight="600" fill="${COLORS.text}">${esc(label)}</text>`;
        }).join('');
        let bottomX = chartX;
        const bottom = getWeekBlocks(dateRange).map((block) => {
          const widthPx = block.days * effectiveDayWidth;
          const node = `<text x="${bottomX + widthPx / 2}" y="${y0 + headerHeight - headerRowHeight / 2 + 4}" text-anchor="middle" font-size="12" fill="${COLORS.text}">${block.days === 7 ? String(block.startDate.getUTCDate()).padStart(2, '0') : ''}</text>`;
          bottomX += widthPx;
          return node;
        }).join('');
        return top + bottom;
      }
      if (viewMode === 'month') {
        let topX = chartX;
        const top = getYearSpans(dateRange).map((span) => {
          const current = topX;
          topX += span.days * effectiveDayWidth;
          return `<text x="${current + 8}" y="${y0 + headerRowHeight / 2 + 4}" font-size="12" font-weight="600" fill="${COLORS.text}">${span.year.getUTCFullYear()}</text>`;
        }).join('');
        let bottomX = chartX;
        const bottom = getMonthBlocks(dateRange).map((block) => {
          const widthPx = block.days * effectiveDayWidth;
          const label = block.days >= 15 ? block.startDate.toLocaleString('ru-RU', { month: 'long', timeZone: 'UTC' }).replace(/^./, (c) => c.toUpperCase()) : '';
          const node = `<text x="${bottomX + widthPx / 2}" y="${y0 + headerHeight - headerRowHeight / 2 + 4}" text-anchor="middle" font-size="12" fill="${COLORS.text}">${esc(label)}</text>`;
          bottomX += widthPx;
          return node;
        }).join('');
        return top + bottom;
      }
      let topX = chartX;
      const top = getMonthSpans(dateRange).map((span) => {
        const current = topX;
        topX += span.days * effectiveDayWidth;
        const label = `${span.month.toLocaleString('ru-RU', { month: 'long', timeZone: 'UTC' }).replace(/^./, (c) => c.toUpperCase())} ${span.month.getUTCFullYear()}`;
        return `<text x="${current + 8}" y="${y0 + headerRowHeight / 2 + 4}" font-size="12" font-weight="600" fill="${COLORS.text}">${esc(label)}</text>`;
      }).join('');
      const now = new Date();
      const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).getTime();
      const bottom = dateRange.map((day, index) => `<text x="${chartX + index * effectiveDayWidth + effectiveDayWidth / 2}" y="${y0 + headerHeight - headerRowHeight / 2 + 4}" text-anchor="middle" font-size="12" fill="${day.getTime() === today ? COLORS.today : weekendPredicate(day) ? COLORS.muted : COLORS.text}">${day.getUTCDate()}</text>`).join('');
      return top + bottom;
    })();

    const taskMap = new Map(normalizedTasks.map((task) => [task.id, task]));
    const taskPositions = new Map<string, { left: number; right: number; centerX: number; rowTop: number; isVirtual: boolean }>();
    const taskIndices = new Map<string, number>();
    visibleTasks.forEach((task, index) => {
      const geometry = resolveTaskHorizontalGeometry(task, monthStart, effectiveDayWidth);
      taskPositions.set(task.id, { left: geometry.left, right: geometry.right, centerX: geometry.centerX, rowTop: index * rowHeight, isVirtual: false });
      taskIndices.set(task.id, index);
    });
    if (collapsedParentIds.size > 0) {
      normalizedTasks.forEach((task) => {
        if (taskPositions.has(task.id) || !isTaskHidden(task.id, collapsedParentIds, taskMap)) return;
        const ancestor = findVisibleAncestor(task, collapsedParentIds, taskMap);
        const ancestorPos = ancestor ? taskPositions.get(ancestor.id) : undefined;
        if (!ancestorPos) return;
        const geometry = resolveTaskHorizontalGeometry(task, monthStart, effectiveDayWidth);
        taskPositions.set(task.id, { left: geometry.left, right: geometry.right, centerX: geometry.centerX, rowTop: ancestorPos.rowTop, isVirtual: true });
      });
    }
    const cycleTasks = new Set(detectCycles(normalizedTasks).cyclePath || []);
    const deps = getAllDependencyEdges(normalizedTasks).map((edge) => {
      const predecessor = taskPositions.get(edge.predecessorId);
      const successor = taskPositions.get(edge.successorId);
      const predecessorTask = taskMap.get(edge.predecessorId);
      const successorTask = taskMap.get(edge.successorId);
      if (!predecessor || !successor || !predecessorTask || !successorTask) return '';
      if (collapsedParentIds.size > 0 && areBothHiddenInSameParent(edge.predecessorId, edge.successorId, collapsedParentIds, taskMap)) return '';
      const reverseOrder = taskIndices.get(edge.predecessorId) !== undefined && taskIndices.get(edge.successorId) !== undefined
        ? taskIndices.get(edge.predecessorId)! > taskIndices.get(edge.successorId)!
        : predecessor.rowTop > successor.rowTop;
      const fromY = reverseOrder ? predecessor.rowTop + 10 : predecessor.rowTop + rowHeight - 10;
      const toY = reverseOrder ? successor.rowTop + rowHeight - 6 : successor.rowTop + 6;
      const fromX = isMilestoneTask(predecessorTask) ? predecessor.centerX : ((edge.type === 'SS' || edge.type === 'SF') ? predecessor.left : predecessor.right);
      const toX = isMilestoneTask(successorTask) ? successor.centerX : ((edge.type === 'FF' || edge.type === 'SF') ? successor.right : successor.left);
      const path = calculateDependencyPath({ x: chartX + fromX, y: y0 + headerHeight + fromY }, { x: chartX + toX, y: y0 + headerHeight + toY }, edge.type === 'FF' || edge.type === 'SF');
      const stroke = cycleTasks.has(edge.predecessorId) || cycleTasks.has(edge.successorId) ? COLORS.dependencyCycle : COLORS.dependency;
      const lag = edge.lag !== 0 ? `<text x="${chartX + (edge.lag < 0 ? toX + 14 : toX - 14)}" y="${y0 + headerHeight + (reverseOrder ? fromY - 4 : fromY + 12)}" text-anchor="middle" font-size="10" fill="${stroke}">${edge.lag > 0 ? `+${edge.lag}` : edge.lag}</text>` : '';
      return `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#gantt-export-arrow)"${predecessor.isVirtual || successor.isVirtual ? ' stroke-dasharray="4 2" opacity="0.6"' : ''}/>${lag}`;
    }).join('');

    const bars = visibleTasks.map((task, index) => {
      const normalizedTask = normalizeTaskDatesForType(task);
      const rowY = y0 + headerHeight + index * rowHeight;
      const isParent = isTaskParent(task.id, normalizedTasks);
      const milestone = isMilestoneTask(normalizedTask);
      const barColor = highlightExpiredTasks && isTaskExpired(normalizedTask) ? COLORS.expired : (task.color || COLORS.taskBar);
      const progress = task.progress == null ? 0 : Math.max(0, Math.min(100, Math.round(task.progress)));
      const progressColor = progress === 100 ? (task.accepted ? COLORS.progressAccepted : COLORS.progressCompleted) : darken(barColor, 0.25);
      const start = parseUTCDate(normalizedTask.startDate);
      const end = parseUTCDate(normalizedTask.endDate);
      const label = formatDateRangeLabel(start, end);
      if (milestone) {
        const geometry = calculateMilestoneGeometry(start, monthStart, effectiveDayWidth, MILESTONE_SIZE);
        const cx = chartX + geometry.centerX;
        const cy = rowY + rowHeight / 2;
        const half = geometry.size / 2;
        return `<polygon points="${cx} ${cy - half}, ${cx + half} ${cy}, ${cx} ${cy + half}, ${cx - half} ${cy}" fill="${barColor}" stroke="${rgba(barColor, 0.45)}"/><text x="${cx - half - 6}" y="${cy + 4}" text-anchor="end" font-size="11" fill="${COLORS.muted}">${esc(label)}</text><text x="${cx + half + 10}" y="${cy + 4}" font-size="12" font-weight="500" fill="${darken(barColor, 0.25)}">${esc(task.name)}</text>`;
      }
      const geometry = calculateTaskBar(start, end, monthStart, effectiveDayWidth);
      const barX = chartX + geometry.left;
      const barWidth = Math.max(1, geometry.width);
      const barY = rowY + (isParent ? 10 : Math.max(8, (rowHeight - 18) / 2));
      const barHeight = isParent ? 14 : 18;
      const childCount = normalizedTasks.filter((candidate) => candidate.parentId === task.id).length;
      const duration = businessDays ? getBusinessDaysCount(start, end, weekendPredicate) : Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
      const rightLabel = `${isParent ? childCount : duration}${progress > 0 ? ` ${progress}%` : ''} ${task.name}`;
      const fillColor = progress >= 100 ? progressColor : (isParent ? (task.color || COLORS.parentBar) : barColor);
      const progressWidth = progress > 0 && progress < 100 ? Math.round(barWidth * progress / 100) : 0;
      const parentExtras = isParent
        ? `<polygon points="${barX} ${barY + barHeight - 1}, ${barX + 10} ${barY + barHeight - 1}, ${barX + 6} ${barY + barHeight + 7}, ${barX} ${barY + barHeight + 7}" fill="${fillColor}"/><polygon points="${barX + barWidth - 10} ${barY + barHeight - 1}, ${barX + barWidth} ${barY + barHeight - 1}, ${barX + barWidth} ${barY + barHeight + 7}, ${barX + barWidth - 6} ${barY + barHeight + 7}" fill="${fillColor}"/>`
        : '';
      return `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="${isParent ? 8 : 6}" ry="${isParent ? 8 : 6}" fill="${fillColor}"/>${parentExtras}${progressWidth > 0 ? `<rect x="${barX}" y="${barY}" width="${progressWidth}" height="${barHeight}" rx="${isParent ? 8 : 6}" ry="${isParent ? 8 : 6}" fill="${progressColor}"/>` : ''}<text x="${barX - 6}" y="${rowY + rowHeight / 2 + 4}" text-anchor="end" font-size="11" fill="${COLORS.muted}">${esc(label)}</text><text x="${barX + barWidth + 10}" y="${rowY + rowHeight / 2 + 4}" font-size="12" font-weight="500" fill="${darken(fillColor, 0.2)}">${esc(rightLabel)}</text>`;
    }).join('');

    const today = (() => {
      if (!showTodayIndicator) return '';
      const now = new Date();
      const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const index = dateRange.findIndex((day) => day.getTime() === todayUtc.getTime());
      return index === -1 ? '' : `<line x1="${chartX + Math.round(index * effectiveDayWidth)}" y1="${y0}" x2="${chartX + Math.round(index * effectiveDayWidth)}" y2="${y0 + headerHeight + bodyHeight}" stroke="${COLORS.today}" stroke-width="1.5"/>`;
    })();

    return `<g data-export-layer="chart"><defs><marker id="gantt-export-arrow" markerWidth="8" markerHeight="6" markerUnits="userSpaceOnUse" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${COLORS.dependency}"/></marker></defs>${background}${headerLabels}${today}${deps}${bars}</g>`;
  })() : '';

  const topHeader = topHeaderHeight > 0 ? (() => {
    const leftX = padding;
    const textX = leftX + (header?.logoUrl ? 44 : 0);
    const service = header?.serviceName ? `${header.serviceName}${header?.projectName ? ' /' : ''}` : '';
    const project = header?.projectName || title || '';
    return `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${COLORS.bg}"/><line x1="${padding}" y1="${padding + topHeaderHeight - 12}" x2="${svgWidth - padding}" y2="${padding + topHeaderHeight - 12}" stroke="${COLORS.border}"/>${header?.logoUrl ? `<image href="${esc(header.logoUrl)}" x="${leftX}" y="${padding + 4}" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>` : ''}${service ? `<text x="${textX}" y="${padding + 18}" font-size="15" font-weight="600" fill="${COLORS.text}">${esc(service)}</text>` : ''}${project ? `<text x="${textX}" y="${padding + 38}" font-size="16" font-weight="600" fill="${COLORS.text}">${esc(project)}</text>` : ''}${subtitle ? `<text x="${textX}" y="${padding + 56}" font-size="12" fill="${COLORS.muted}">${esc(subtitle)}</text>` : ''}${fmtExportDate(header?.exportDate) ? `<text x="${svgWidth - padding}" y="${padding + 20}" text-anchor="end" font-size="12" fill="${COLORS.muted}">${esc(fmtExportDate(header?.exportDate))}</text>` : ''}`;
  })() : `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${COLORS.bg}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${esc(title || header?.projectName || 'Gantt chart export')}" font-family="${esc(FONT_FAMILY)}">${topHeader}${taskListSvg}${chartSvg}</svg>`;
}
