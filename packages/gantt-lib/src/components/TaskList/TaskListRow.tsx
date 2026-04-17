"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { Task, TaskListMenuCommand } from "../GanttChart";
import type { LinkType } from "../../types";
import type { CustomDayConfig } from "../../utils/dateUtils";
import { parseUTCDate, normalizeTaskDates, createCustomDayPredicate } from "../../utils/dateUtils";
import { isMilestoneTask, normalizeTaskDatesForType } from "../../utils/taskType";
import {
  getBusinessDaysCount,
  addBusinessDays,
  subtractBusinessDays,
  alignToWorkingDay,
  buildTaskRangeFromEnd,
  buildTaskRangeFromStart,
  getDependencyLag,
  calculateSuccessorDate,
  clampTaskRangeForIncomingFS,
  normalizeDependencyLag,
  isTaskParent,
  findParentId,
  getChildren,
  recalculateIncomingLags,
} from "../../core/scheduling";
import { Input } from "../ui/Input";
import { DatePicker } from "../ui/DatePicker";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/Popover";
import { LINK_TYPE_ICONS } from "./DepIcons";
import type { TaskListColumn as NewTaskListColumn } from "./columns/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const LINK_TYPE_ORDER: LinkType[] = ["FS", "SS", "FF", "SF"];

const getInclusiveDurationDays = (
  startDate: string | Date,
  endDate: string | Date,
): number => {
  const start = parseUTCDate(startDate);
  const end = parseUTCDate(endDate);
  return Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1,
  );
};

const getEndDateFromDuration = (
  startDate: string | Date,
  durationDays: number,
): string => {
  const start = parseUTCDate(startDate);
  return new Date(start.getTime() + (durationDays - 1) * DAY_MS)
    .toISOString()
    .split("T")[0];
};

// ---------------------------------------------------------------------------
// DepChip — local unified component used in both single-chip cell and popover
// ---------------------------------------------------------------------------
interface DepChipProps {
  lag?: number;
  dep: { taskId: string; type: LinkType };
  taskId: string;
  taskNumber?: string;
  taskNumberMap?: Record<string, string>;
  predecessorName?: string;
  predecessorTaskNumber?: string;
  selectedChip: TaskListRowProps["selectedChip"];
  disableDependencyEditing: boolean;
  onChipSelect: TaskListRowProps["onChipSelect"];
  onRowClick: TaskListRowProps["onRowClick"];
  onScrollToTask: TaskListRowProps["onScrollToTask"];
  onRemoveDependency: TaskListRowProps["onRemoveDependency"];
  onChipSelectClear: () => void;
  /** The successor task (needed for lag date computation) */
  task: Task;
  /** All tasks (needed to find predecessor dates) */
  allTasks: Task[];
  /** Callback to save date changes after lag modification */
  onTasksChange?: TaskListRowProps["onTasksChange"];
  businessDays?: boolean;
  weekendPredicate: (date: Date) => boolean;
}

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const DragHandleIcon = () => (
  <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
    <circle cx="2" cy="2" r="1.5" />
    <circle cx="8" cy="2" r="1.5" />
    <circle cx="2" cy="7" r="1.5" />
    <circle cx="8" cy="7" r="1.5" />
    <circle cx="2" cy="12" r="1.5" />
    <circle cx="8" cy="12" r="1.5" />
  </svg>
);

const VerticalDotsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const UngroupIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12h10" />
    <path d="m6 9-3 3 3 3" />
    <path d="M13 6h8" />
    <path d="M13 18h8" />
  </svg>
);

const TASK_COLOR_PALETTE = [
  // { label: "Палисандр", value: "#A61E4D" },
  // { label: "Киноварь", value: "#E8590C" },
  // { label: "Жёлт", value: "#eec45c" },
  { label: "Киноварь2", value: "#fe724e" },
  // { label: "Оранжевый", value: "#F08C00" },
  { label: "Оранжевый2", value: "#ff991f" },
  { label: "Золотой", value: "#e5c800" },
  { label: "Бирюза", value: "#58d8a3" },
  { label: "Палисандр", value: "#d64a7b" },
  { label: "Песочный", value: "#997B10" },
  { label: "Шартрез", value: "#A3BE00" },
  { label: "Голубой", value: "#03c7e6" },
  { label: "Виноград2", value: "#8678d9" },
  { label: "Серый2", value: "#6b778c" },
  { label: "Лесной", value: "#2B8A3E" },
  // { label: "Лесной3", value: "#60b838" },
  // { label: "Бирюза", value: "#0B7285" },
  // { label: "Серый", value: "#495057" },
  // { label: "Океан", value: "#5244ff" },
  // { label: "Океан2", value: "#0626ba" },
  // { label: "Виноград", value: "#AE3EC9" },
] as const;

const ChevronRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const LINK_TYPE_LABELS_RU: Record<LinkType, string> = {
  FS: "ОН",
  SS: "НН",
  FF: "ОО",
  SF: "НО",
};

function formatTaskNumberLabel(taskNumber?: string): string {
  return taskNumber ? `${taskNumber}. ` : "";
}

// ---------------------------------------------------------------------------
// HierarchyButton — Single button with left/right arrows for hierarchy navigation
// ---------------------------------------------------------------------------
interface HierarchyButtonProps {
  /** Whether the task is a child (can be promoted) */
  isChild: boolean;
  /** Row index - first row cannot demote */
  rowIndex: number;
  /** Whether demote action should be shown for this row */
  canDemote: boolean;
  /** Callback when promote is clicked (left arrow) */
  onPromote?: (e: React.MouseEvent) => void;
  /** Callback when demote is clicked (right arrow) */
  onDemote?: (e: React.MouseEvent) => void;
}

const ArrowLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const ArrowRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const HierarchyButton: React.FC<HierarchyButtonProps> = ({
  isChild,
  rowIndex: _rowIndex,
  canDemote,
  onPromote,
  onDemote,
}) => {
  const canPromote = isChild && onPromote;
  const showDemote = canDemote && !!onDemote;

  if (!canPromote && !showDemote) return null;

  return (
    <>
      {canPromote && (
        <button
          type="button"
          className="gantt-tl-name-action-btn gantt-tl-action-hierarchy"
          onClick={(e) => {
            e.stopPropagation();
            onPromote!(e);
          }}
          title="Повысить уровень"
        >
          <ArrowLeft />
        </button>
      )}
      {showDemote && (
        <button
          type="button"
          className="gantt-tl-name-action-btn gantt-tl-action-hierarchy"
          onClick={(e) => {
            e.stopPropagation();
            onDemote!(e);
          }}
          title="Понизить уровень"
        >
          <ArrowRight />
        </button>
      )}
    </>
  );
};

function formatDepDescription(type: LinkType, lag: number | undefined): string {
  const effectiveLag = lag ?? 0;

  if (type === "FS") {
    if (effectiveLag > 0)
      return `Начать через ${effectiveLag} дн. после окончания`;
    if (effectiveLag < 0)
      return `Начать за ${Math.abs(effectiveLag)} дн. до окончания`;
    return `Начать сразу после окончания`;
  }
  if (type === "FF") {
    if (effectiveLag > 0)
      return `Завершить через ${effectiveLag} дн. после окончания`;
    if (effectiveLag < 0)
      return `Завершить за ${Math.abs(effectiveLag)} дн. до окончания`;
    return `Завершить после окончания`;
  }
  if (type === "SS") {
    if (effectiveLag > 0)
      return `Начать через ${effectiveLag} дн. после начала`;
    if (effectiveLag < 0)
      return `Начать за ${Math.abs(effectiveLag)} дн. до начала`;
    return `Начать вместе с началом`;
  }
  if (type === "SF") {
    if (effectiveLag > 0)
      return `Завершить через ${effectiveLag} дн. после начала`;
    if (effectiveLag < 0)
      return `Завершить за ${Math.abs(effectiveLag)} дн. до начала`;
    return `Завершить до начала`;
  }
  return "";
}

const DepChip: React.FC<DepChipProps> = ({
  lag,
  dep,
  taskId,
  taskNumber,
  predecessorName,
  predecessorTaskNumber,
  selectedChip,
  disableDependencyEditing,
  onChipSelect,
  onRowClick,
  onScrollToTask,
  onRemoveDependency,
  onChipSelectClear,
  task,
  allTasks,
  onTasksChange,
  businessDays = true,
  weekendPredicate,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const lagAbs = Math.abs(lag ?? 0);
  const [inputAbs, setInputAbs] = useState(lagAbs === 0 ? "" : String(lagAbs));
  useEffect(() => {
    const abs = Math.abs(lag ?? 0);
    setInputAbs(abs === 0 ? "" : String(abs));
  }, [lag]);

  const isSelected =
    selectedChip?.successorId === taskId &&
    selectedChip?.predecessorId === dep.taskId &&
    selectedChip?.linkType === dep.type;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableDependencyEditing) return;
    // Toggle popover and chip selection together
    const nextOpen = !popoverOpen;
    setPopoverOpen(nextOpen);
    if (nextOpen) {
      onChipSelect?.({
        successorId: taskId,
        predecessorId: dep.taskId,
        linkType: dep.type,
      });
      onScrollToTask?.(taskId);
    } else {
      // Only clear selection when explicitly closing via chip click
      onChipSelect?.(null);
    }
  };

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setPopoverOpen(open);
      // Don't clear selectedChip on automatic popover close (e.g. focus loss, escape)
      // Only clear when user explicitly closes via chip click or trash button
    },
    [],
  );

  const handleTrashClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveDependency?.(taskId, dep.taskId, dep.type);
    onChipSelectClear();
    setPopoverOpen(false);
  };

  const handleLagChange = useCallback(
    (newLag: number) => {
      if (!onTasksChange || !allTasks) return;
      const taskById = new Map(allTasks.map((t) => [t.id, t]));
      const predecessor = taskById.get(dep.taskId);
      if (!predecessor) return;

      const predStart = parseUTCDate(predecessor.startDate);
      // Milestone predecessors have zero duration — treat end = start
      const predEnd = predecessor.type === 'milestone' ? predStart : parseUTCDate(predecessor.endDate);
      const origStart = parseUTCDate(task.startDate);
      const origEnd = parseUTCDate(task.endDate);
      const durationMs = origEnd.getTime() - origStart.getTime();
      const normalizedLag = normalizeDependencyLag(
        dep.type,
        newLag,
        predStart,
        predEnd,
        businessDays,
        weekendPredicate,
      );

      const constraintDate = calculateSuccessorDate(
        predStart,
        predEnd,
        dep.type,
        normalizedLag,
        businessDays,
        weekendPredicate,
      );

      let newStart: Date, newEnd: Date;
      if (dep.type === "FS" || dep.type === "SS") {
        newStart = constraintDate;
        if (businessDays) {
          const businessDuration = getBusinessDaysCount(origStart, origEnd, weekendPredicate);
          newEnd = addBusinessDays(constraintDate, businessDuration, weekendPredicate);
        } else {
          newEnd = new Date(constraintDate.getTime() + durationMs);
        }
      } else {
        newEnd = constraintDate;
        if (businessDays) {
          const businessDuration = getBusinessDaysCount(origStart, origEnd, weekendPredicate);
          newStart = subtractBusinessDays(constraintDate, businessDuration, weekendPredicate);
        } else {
          newStart = new Date(constraintDate.getTime() - durationMs);
        }
      }

      onTasksChange([
        {
          ...task,
          startDate: newStart.toISOString().split("T")[0],
          endDate: newEnd.toISOString().split("T")[0],
          dependencies: (task.dependencies ?? []).map((existingDep) =>
            existingDep.taskId === dep.taskId && existingDep.type === dep.type
              ? { ...existingDep, lag: normalizedLag }
              : existingDep
          ),
        },
      ]);
    },
    [dep, task, allTasks, onTasksChange, businessDays, weekendPredicate],
  );

  const handleInputCommit = useCallback(
    (raw: string) => {
      if (raw === "") {
        handleLagChange(0);
        return;
      }
      const parsed = parseInt(raw, 10);
      const effectiveLag = lag ?? 0;
      if (isNaN(parsed)) {
        const abs = Math.abs(effectiveLag);
        setInputAbs(abs === 0 ? "" : String(abs));
        return;
      }
      let newLag: number;
      if (parsed === 0) {
        newLag = 0;
      } else if (dep.type === "SF") {
        newLag = -Math.abs(parsed);
      } else {
        // sign comes from what the user typed: "-4" → negative, "4" → positive
        newLag = parsed; // parseInt preserves the sign from input
      }
      if (newLag !== effectiveLag) handleLagChange(newLag);
    },
    [lag, dep.type, handleLagChange],
  );

  const Icon = LINK_TYPE_ICONS[dep.type];
  const depName = predecessorName ?? dep.taskId;
  const effectiveLag = lag ?? 0;

  // Derive action verb, preWord and afterWhat (sign-dependent for FS/FF/SS)
  const actionVerb =
    dep.type === "FS" || dep.type === "SS" ? "начать" : "завершить";
  const zeroPlaceholder =
    dep.type === "SF"
      ? "чётко"
      : dep.type === "FF"
        ? "вместе"
        : dep.type === "SS"
          ? "вместе"
          : "сразу";
  let afterWhat: string;
  let preWord: string | null = null;
  if (dep.type === "SF") {
    afterWhat =
      effectiveLag < 0
        ? "до начала"
        : effectiveLag === 0
          ? "с началом"
          : "после начала";
    if (effectiveLag > 0) preWord = "через";
    else if (effectiveLag < 0) preWord = "за";
  } else if (dep.type === "SS") {
    afterWhat =
      effectiveLag < 0
        ? "до начала"
        : effectiveLag === 0
          ? "с началом"
          : "после начала";
    if (effectiveLag > 0) preWord = "через";
    else if (effectiveLag < 0) preWord = "за";
  } else {
    // FS, FF
    if (effectiveLag > 0) {
      preWord = "через";
      afterWhat = "после окончания";
    } else if (effectiveLag < 0) {
      preWord = "за";
      afterWhat = "до окончания";
    } else {
      afterWhat = "после окончания";
    }
  }

  return (
    <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <span
          className={`gantt-tl-dep-chip${isSelected ? " gantt-tl-dep-chip-selected" : ""}`}
          onClick={handleClick}
          title={`[${LINK_TYPE_LABELS_RU[dep.type]}] ${formatTaskNumberLabel(predecessorTaskNumber)}${depName}`}
        >
          <Icon />
          {effectiveLag !== 0
            ? effectiveLag > 0
              ? `+${effectiveLag}`
              : `${effectiveLag}`
            : ""}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="gantt-tl-dep-edit-popover"
        portal={true}
        align="start"
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="gantt-tl-dep-edit-task">
            {formatTaskNumberLabel(taskNumber)}
            {task.name}
          </div>
          <div className="gantt-tl-dep-edit-row">
            <span className="gantt-tl-dep-edit-label">
              {actionVerb}
              {preWord ? ` ${preWord}` : ""}
            </span>
            <button
              type="button"
              className="gantt-tl-dep-edit-btn"
              onClick={() => handleLagChange(effectiveLag - 1)}
            >
              −
            </button>
            <input
              type="number"
              className="gantt-tl-dep-edit-input"
              value={inputAbs}
              placeholder={zeroPlaceholder}
              min="0"
              onChange={(e) => setInputAbs(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={(e) => handleInputCommit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInputCommit(inputAbs);
              }}
            />
            {!(dep.type === "SF" && effectiveLag === 0) && (
              <button
                type="button"
                className="gantt-tl-dep-edit-btn"
                onClick={() => handleLagChange(effectiveLag + 1)}
              >
                +
              </button>
            )}
            {effectiveLag !== 0 && <span>д.</span>}
            <span>{afterWhat}</span>
          </div>
          <div className="gantt-tl-dep-edit-pred">
            {formatTaskNumberLabel(predecessorTaskNumber)}
            {depName}
          </div>
          {!disableDependencyEditing && (
            <>
              <hr className="gantt-tl-dep-edit-divider" />
              <div className="gantt-tl-dep-edit-actions">
                <button
                  type="button"
                  className="gantt-tl-dep-edit-close"
                  onClick={() => {
                    setPopoverOpen(false);
                    onChipSelectClear();
                  }}
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  className="gantt-tl-dep-edit-delete"
                  onClick={handleTrashClick}
                >
                  Удалить связь
                </button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export interface TaskListRowProps {
  /** Task data to render */
  task: Task;
  /** Index of the task row (for display in № column) */
  rowIndex: number;
  /** Hierarchical task number (e.g., "1.2.3") */
  taskNumber?: string;
  /** Visible task-list numbers by task id */
  taskNumberMap?: Record<string, string>;
  /** Height of the task row in pixels */
  rowHeight: number;
  /** Callback when task is modified via inline edit. Receives array of changed tasks. */
  onTasksChange?: (tasks: Task[]) => void;
  /** ID of currently selected task */
  selectedTaskId?: string;
  /** Callback when task row is clicked */
  onRowClick?: (taskId: string) => void;
  /** Disable task name editing (default: false) */
  disableTaskNameEditing?: boolean;
  /** Disable dependency editing (default: false) */
  disableDependencyEditing?: boolean;
  /** All tasks (for dependency picker) */
  allTasks?: Task[];
  /** Currently active link type for new dependencies */
  activeLinkType?: LinkType;
  /** Callback to change active link type for new dependencies */
  onSetActiveLinkType?: (linkType: LinkType) => void;
  /** Current dependency picking direction */
  dependencyPickMode?: "predecessor" | "successor";
  /** Callback to change dependency picking direction */
  onSetDependencyPickMode?: (mode: "predecessor" | "successor") => void;
  /** Task ID currently in predecessor-picking mode (null if not picking) */
  selectingPredecessorFor?: string | null;
  /** Callback to set the task currently in predecessor-picking mode */
  onSetSelectingPredecessorFor?: (taskId: string | null) => void;
  /** Callback to add a dependency link */
  onAddDependency?: (
    successorTaskId: string,
    predecessorTaskId: string,
    linkType: LinkType,
  ) => void;
  /** Callback to remove a dependency link */
  onRemoveDependency?: (
    taskId: string,
    predecessorTaskId: string,
    linkType: LinkType,
  ) => void;
  /** Currently selected chip (for predecessor-side delete) */
  selectedChip?: {
    successorId: string;
    predecessorId: string;
    linkType: string;
  } | null;
  /** Callback when a chip is clicked (selects it) */
  onChipSelect?: (
    chip: {
      successorId: string;
      predecessorId: string;
      linkType: LinkType;
    } | null,
  ) => void;
  /** Callback to scroll the chart grid to center this task (called when task name is clicked) */
  onScrollToTask?: (taskId: string) => void;
  /** Callback when task is deleted */
  onDelete?: (taskId: string) => void;
  /** Callback when a new task is inserted below this row */
  onAdd?: (task: Task) => void;
  /** Callback when a new task is inserted after this task */
  onInsertAfter?: (taskId: string, newTask: Task) => void;
  /** ID of task that should enter edit mode on mount (for auto-edit after insert) */
  editingTaskId?: string | null;
  /** Whether this row is currently being dragged (shows semi-transparent) */
  isDragging?: boolean;
  /** Whether this row is the current drag-over target (shows top border indicator) */
  isDragOver?: boolean;
  /** Called when drag starts on the handle for this row */
  onDragStart?: (index: number, e: React.DragEvent) => void;
  /** Called when something is dragged over this row */
  onDragOver?: (index: number, e: React.DragEvent) => void;
  /** Called when something is dropped on this row */
  onDrop?: (index: number, e: React.DragEvent) => void;
  /** Called when drag ends (drop or Escape) */
  onDragEnd?: (e: React.DragEvent) => void;
  /** Set of collapsed parent task IDs */
  collapsedParentIds?: Set<string>;
  /** Callback when collapse/expand button is clicked */
  onToggleCollapse?: (parentId: string) => void;
  /** Callback when task is promoted (parentId removed) */
  onPromoteTask?: (taskId: string) => void;
  /** Callback when task is demoted (parentId set to previous task) */
  onDemoteTask?: (taskId: string, newParentId: string) => void;
  /** Callback when parent task is ungrouped (removed while direct children move one level up) */
  onUngroupTask?: (taskId: string) => void;
  /** Callback when task or task group should be duplicated */
  onDuplicateTask?: (taskId: string) => void;
  /** Whether demote action should be shown for this row */
  canDemoteTask?: boolean;
  /** Whether this child is the last sibling (affects connector icon shape) */
  isLastChild?: boolean;
  /** Nesting depth (0 = root, 1 = child, 2 = grandchild, etc.) */
  nestingDepth?: number;
  /** Whether this row currently has visible children in the rendered task list */
  hasVisibleChildren?: boolean;
  /** For each ancestor above the direct parent: whether its vertical line is full or ends at mid-row */
  ancestorLineModes?: ("full" | "half")[];
  /** Custom day configurations for date picker */
  customDays?: CustomDayConfig[];
  /** Optional base weekend predicate for date picker */
  isWeekend?: (date: Date) => boolean;
  /** Считать duration в рабочих днях */
  businessDays?: boolean;
  /** Whether this row matches the active filter highlight */
  isFilterMatch?: boolean;
  /** Whether filter is in hide mode (simplifies hierarchy rendering to avoid confusion) */
  isFilterHideMode?: boolean;
  /** Resolved columns (built-in + custom) for unified rendering */
  resolvedColumns?: NewTaskListColumn<Task>[];
  /** Additional commands rendered in the three-dots row menu */
  taskListMenuCommands?: TaskListMenuCommand<Task>[];
}

const toISODate = (value: string | Date): string => {
  if (value instanceof Date) return value.toISOString().split("T")[0];
  // Handle full ISO strings like "2026-02-12T00:00:00.000Z"
  if (typeof value === "string" && value.includes("T"))
    return value.split("T")[0];
  return value as string;
};

export const TaskListRow: React.FC<TaskListRowProps> = React.memo(
  ({
    task,
    rowIndex,
    taskNumber,
    taskNumberMap = {},
    rowHeight,
    onTasksChange,
    selectedTaskId,
    onRowClick,
    disableTaskNameEditing = false,
    disableDependencyEditing = false,
    allTasks = [],
    activeLinkType,
    onSetActiveLinkType,
    dependencyPickMode = "successor",
    onSetDependencyPickMode,
    selectingPredecessorFor,
    onSetSelectingPredecessorFor,
    onAddDependency,
    onRemoveDependency,
    selectedChip,
    onChipSelect,
    onScrollToTask,
    onDelete,
    onAdd,
    onInsertAfter,
    editingTaskId,
    isDragging = false,
    isDragOver = false,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    collapsedParentIds = new Set(),
    onToggleCollapse,
    onPromoteTask,
    onDemoteTask,
    onUngroupTask,
    onDuplicateTask,
    canDemoteTask = true,
    isLastChild = true,
    nestingDepth = 0,
    hasVisibleChildren = false,
    ancestorLineModes = [],
    customDays,
    isWeekend,
    businessDays,
    isFilterMatch = false,
    isFilterHideMode = false,
    resolvedColumns,
    taskListMenuCommands = [],
  }) => {
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
    const editingName = editingColumnId === 'name';
    const editingDuration = editingColumnId === 'duration';
    const editingProgress = editingColumnId === 'progress';
    const normalizedTask = useMemo(() => normalizeTaskDatesForType(task), [task]);
    const isMilestone = useMemo(() => isMilestoneTask(normalizedTask), [normalizedTask]);
    const [nameValue, setNameValue] = useState("");
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [durationValue, setDurationValue] = useState(() =>
      getInclusiveDurationDays(normalizedTask.startDate, normalizedTask.endDate),
    );
    const durationInputRef = useRef<HTMLInputElement>(null);
    const dependencySearchInputRef = useRef<HTMLInputElement>(null);
    const dependencySearchListRef = useRef<HTMLDivElement>(null);
    const [progressValue, setProgressValue] = useState(0);
    const progressInputRef = useRef<HTMLInputElement>(null);
    const [overflowOpen, setOverflowOpen] = useState(false);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [colorMenuOpen, setColorMenuOpen] = useState(false);
    const nameConfirmedRef = useRef(false); // Prevent double-save on Enter + blur
    const durationConfirmedRef = useRef(false); // Prevent double-save on Enter + blur
    const progressConfirmedRef = useRef(false); // Prevent double-save on Enter + blur
    const autoEditedForRef = useRef<string | null>(null); // Track which editingTaskId we already auto-entered for
    const editTriggerRef = useRef<"keypress" | "doubleclick" | "autoedit">(
      "doubleclick",
    ); // How editing was started

    const isSelected = selectedTaskId === task.id;

    // Hierarchy computed values
    const isParent = useMemo(
      () => isTaskParent(task.id, allTasks),
      [task.id, allTasks],
    );
    const isChild = task.parentId !== undefined;
    const isMilestoneRow = normalizedTask.type === "milestone";

    // Create custom weekend predicate from props (memoized for performance)
    const weekendPredicate = useMemo(
      () => createCustomDayPredicate({ customDays, isWeekend }),
      [customDays, isWeekend]
    );

    // Memoized duration calculation function (business days vs calendar days)
    const getDuration = useCallback(
      (start: string | Date, end: string | Date) => {
        return businessDays
          ? getBusinessDaysCount(start, end, weekendPredicate)
          : getInclusiveDurationDays(start, end);
      },
      [businessDays, weekendPredicate]
    );

    // Memoized end date calculation function (business days vs calendar days)
    const getEndDate = useCallback(
      (start: string | Date, duration: number) => {
        return businessDays
          ? addBusinessDays(start, duration, weekendPredicate).toISOString().split('T')[0]
          : getEndDateFromDuration(start, duration);
      },
      [businessDays, weekendPredicate]
    );

    const isCollapsed = collapsedParentIds.has(task.id);

    const getHierarchyLineColor = useCallback((columnDepth: number) => {
      return columnDepth % 2 === 0
        ? "#93c5fd"
        : "var(--gantt-hierarchy-line-color)";
    }, []);

    // Picker mode flags for this row
    const isPicking = selectingPredecessorFor != null;
    const isSourceRow = isPicking && selectingPredecessorFor === task.id;
    const [dependencySearchQuery, setDependencySearchQuery] = useState("");
    const [highlightedDependencyIndex, setHighlightedDependencyIndex] = useState(0);

    // Chip data: always reflect the persisted business lag, not the visual calendar gap.
    const chips = useMemo(() => {
      const taskById = new Map((allTasks ?? []).map((t) => [t.id, t]));
      return (task.dependencies ?? []).map((dep) => {
        const pred = taskById.get(dep.taskId);
        const lag = getDependencyLag(dep);
        return { dep, lag, predecessorName: pred?.name ?? dep.taskId };
      });
    }, [task.dependencies, allTasks]);

    const linkWord = chips.length <= 4 ? "связи" : "связей";

    const dependencySearchCandidates = useMemo(() => {
      if (!isSourceRow) return [];

      const normalizedQuery = dependencySearchQuery.trim().toLowerCase();
      return allTasks
        .filter((candidate) => candidate.id !== task.id)
        .map((candidate) => {
          const number = taskNumberMap[candidate.id];
          const label = `${formatTaskNumberLabel(number)}${candidate.name}`;
          const matchingDependencies = dependencyPickMode === "predecessor"
            ? (task.dependencies ?? []).filter((dep) => dep.taskId === candidate.id)
            : (candidate.dependencies ?? []).filter((dep) => dep.taskId === task.id);
          return {
            task: candidate,
            label,
            linkedTypes: matchingDependencies.map((dep) => dep.type),
            isAlreadyLinked: matchingDependencies.length > 0,
            searchable: `${number ?? ""} ${candidate.name}`.toLowerCase(),
          };
        })
        .filter((candidate) =>
          normalizedQuery === "" ? true : candidate.searchable.includes(normalizedQuery)
        );
    }, [
      isSourceRow,
      dependencySearchQuery,
      allTasks,
      task.id,
      activeLinkType,
      dependencyPickMode,
      taskNumberMap,
      task.dependencies,
    ]);

    useEffect(() => {
      if (editingName && nameInputRef.current) {
        nameInputRef.current.focus();
        if (editTriggerRef.current === "keypress") {
          // Cursor to end — the typed char is already in the input, don't select it
          const len = nameInputRef.current.value.length;
          nameInputRef.current.setSelectionRange(len, len);
        } else {
          // Double-click or auto-edit-on-insert: select all for easy replacement
          nameInputRef.current.select();
        }
      }
    }, [editingName]);

    useEffect(() => {
      if (!isSourceRow && dependencySearchQuery !== "") {
        setDependencySearchQuery("");
      }
    }, [isSourceRow, dependencySearchQuery]);

    useEffect(() => {
      setHighlightedDependencyIndex(0);
    }, [dependencySearchQuery, isSourceRow, dependencyPickMode]);

    useEffect(() => {
      if (dependencySearchCandidates.length === 0) {
        setHighlightedDependencyIndex(0);
        return;
      }

      if (highlightedDependencyIndex > dependencySearchCandidates.length - 1) {
        setHighlightedDependencyIndex(dependencySearchCandidates.length - 1);
      }
    }, [dependencySearchCandidates, highlightedDependencyIndex]);

    useEffect(() => {
      if (isSourceRow && dependencySearchInputRef.current) {
        dependencySearchInputRef.current.focus();
        dependencySearchInputRef.current.select();
      }
    }, [isSourceRow, dependencyPickMode, activeLinkType]);

    useEffect(() => {
      if (!isSourceRow || dependencySearchCandidates.length === 0) {
        return;
      }

      const listElement = dependencySearchListRef.current;
      const activeElement = listElement?.querySelector<HTMLElement>(
        `.gantt-tl-dep-source-option[data-index="${highlightedDependencyIndex}"]`
      );

      activeElement?.scrollIntoView({
        block: "nearest",
      });
    }, [isSourceRow, highlightedDependencyIndex, dependencySearchCandidates]);

    // Auto-enter edit mode when this task is created via insert.
    // We track which editingTaskId we already reacted to (autoEditedForRef) so that
    // subsequent re-renders caused by saving the name (which changes task.name) do NOT
    // re-trigger edit mode. Without this guard, saving the name → onTasksChange → new task.name
    // → re-render → effect fires again → edit mode re-entered → user must press Enter twice.
    useEffect(() => {
      if (
        editingTaskId === task.id &&
        !disableTaskNameEditing &&
        autoEditedForRef.current !== editingTaskId
      ) {
        autoEditedForRef.current = editingTaskId;
        nameConfirmedRef.current = false; // Reset stale flag from any previous Enter-key save
        editTriggerRef.current = "autoedit";
        setNameValue(task.name);
        setEditingColumnId('name');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingTaskId, task.id, disableTaskNameEditing]);

    const handleNameClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRowClick?.(task.id);
        onScrollToTask?.(task.id);
      },
      [task.id, onRowClick, onScrollToTask],
    );

    const handleNameDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        if (disableTaskNameEditing) return;
        e.stopPropagation();
        nameConfirmedRef.current = false; // Reset stale flag from any previous Enter-key save
        editTriggerRef.current = "doubleclick";
        setNameValue(task.name);
        setEditingColumnId('name');
      },
      [task.name, disableTaskNameEditing],
    );

    const handleRowKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        // Don't handle row keyboard events when editing progress
        if (editingProgress) return;
        // F2: enter edit mode with cursor at end of existing name
        if (!editingName && !disableTaskNameEditing && e.key === "F2") {
          e.preventDefault();
          nameConfirmedRef.current = false; // Reset stale flag from any previous Enter-key save
          editTriggerRef.current = "keypress"; // 'keypress' trigger = cursor at end (not select-all)
          setNameValue(task.name);
          setEditingColumnId('name');
          return;
        }
      },
      [editingName, disableTaskNameEditing, task.name],
    );

    const handleNameSave = useCallback(() => {
      if (nameConfirmedRef.current) {
        // Already saved via Enter key, skip blur handler
        nameConfirmedRef.current = false;
        return;
      }
      if (nameValue.trim()) {
        onTasksChange?.([{ ...task, name: nameValue.trim() }]);
      }
      setEditingColumnId(null);
    }, [nameValue, task, onTasksChange]);

    const handleNameCancel = useCallback(() => {
      setEditingColumnId(null);
    }, []);

    const handleNameKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          nameConfirmedRef.current = true; // Mark as saved to prevent blur from triggering again
          if (nameValue.trim()) {
            onTasksChange?.([{ ...task, name: nameValue.trim() }]);
          }
          setEditingColumnId(null);
        } else if (e.key === "Escape") {
          handleNameCancel();
        }
      },
      [nameValue, task, onTasksChange, handleNameCancel],
    );

    const handleDurationClick = useCallback(
      (e: React.MouseEvent) => {
        if (task.locked) return;
        e.stopPropagation();
        durationConfirmedRef.current = false;
        setDurationValue(
          isMilestone ? 0 : getDuration(normalizedTask.startDate, normalizedTask.endDate),
        );
        setEditingColumnId('duration');
      },
      [task.locked, normalizedTask.startDate, normalizedTask.endDate, getDuration, isMilestone],
    );

    const applyDurationChange = useCallback((nextDuration: number) => {
      const normalizedDuration = Math.max(0, Math.round(nextDuration) || 0);
      setDurationValue(normalizedDuration);
    }, []);

    const handleDurationSave = useCallback(() => {
      if (durationConfirmedRef.current) {
        durationConfirmedRef.current = false;
        return;
      }
      const rounded = Math.round(durationValue) || 0;
      if (isMilestone && rounded > 0) {
        // Convert milestone → task
        onTasksChange?.([
          { ...task, type: 'task' as const, endDate: getEndDate(task.startDate, rounded) },
        ]);
      } else if (!isMilestone && rounded === 0) {
        // Convert task → milestone
        onTasksChange?.([
          { ...task, type: 'milestone' as const, endDate: task.startDate },
        ]);
      } else if (!isMilestone && rounded > 0) {
        onTasksChange?.([
          { ...task, endDate: getEndDate(task.startDate, rounded) },
        ]);
      }
      // isMilestone && rounded === 0 → no-op, just close
      setEditingColumnId(null);
    }, [durationValue, task, onTasksChange, getEndDate, isMilestone]);

    const handleDurationCancel = useCallback(() => {
      setDurationValue(isMilestone ? 0 : getDuration(normalizedTask.startDate, normalizedTask.endDate));
      setEditingColumnId(null);
    }, [normalizedTask.startDate, normalizedTask.endDate, getDuration, isMilestone]);

    const handleDurationAdjust = useCallback(
      (delta: number) => {
        applyDurationChange(durationValue + delta);
      },
      [applyDurationChange, durationValue],
    );

    const handleDurationKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          durationConfirmedRef.current = true;
          const rounded = Math.round(durationValue) || 0;
          if (isMilestone && rounded > 0) {
            // Convert milestone → task
            onTasksChange?.([
              { ...task, type: 'task' as const, endDate: getEndDate(task.startDate, rounded) },
            ]);
          } else if (!isMilestone && rounded === 0) {
            // Convert task → milestone
            onTasksChange?.([
              { ...task, type: 'milestone' as const, endDate: task.startDate },
            ]);
          } else if (!isMilestone && rounded > 0) {
            onTasksChange?.([
              { ...task, endDate: getEndDate(task.startDate, rounded) },
            ]);
          }
          // isMilestone && rounded === 0 → no-op, just close
          setEditingColumnId(null);
        } else if (e.key === "Escape") {
          handleDurationCancel();
        }
      },
      [durationValue, task, onTasksChange, handleDurationCancel, getEndDate, isMilestone],
    );

    const handleProgressClick = useCallback(
      (e: React.MouseEvent) => {
        if (task.locked) return;
        e.stopPropagation();
        progressConfirmedRef.current = false;
        setProgressValue(task.progress ?? 0);
        setEditingColumnId('progress');
      },
      [task.progress, task.locked],
    );

    const handleProgressSave = useCallback(() => {
      if (progressConfirmedRef.current) {
        progressConfirmedRef.current = false;
        return;
      }
      const clampedValue = Math.max(0, Math.min(100, progressValue));

      // Cascade 100% or 0% progress to all children when parent is marked complete/reset
      if (
        (clampedValue === 100 || clampedValue === 0) &&
        isTaskParent(task.id, allTasks)
      ) {
        const children = getChildren(task.id, allTasks);
        const updatedTasks = [
          { ...task, progress: clampedValue },
          ...children.map((child) => ({ ...child, progress: clampedValue })),
        ];
        onTasksChange?.(updatedTasks);
      } else {
        onTasksChange?.([{ ...task, progress: clampedValue }]);
      }
      setEditingColumnId(null);
    }, [progressValue, task, onTasksChange, allTasks]);

    const handleProgressCancel = useCallback(() => {
      setEditingColumnId(null);
    }, []);

    const handleProgressAdjust = useCallback((delta: number) => {
      setProgressValue((current) =>
        Math.max(0, Math.min(100, current + delta)),
      );
    }, []);

    const handleProgressKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation(); // Prevent row-level keyboard handler from interfering
        if (e.key === "Enter") {
          progressConfirmedRef.current = true;
          const clampedValue = Math.max(0, Math.min(100, progressValue));

          // Cascade 100% or 0% progress to all children when parent is marked complete/reset
          if (
            (clampedValue === 100 || clampedValue === 0) &&
            isTaskParent(task.id, allTasks)
          ) {
            const children = getChildren(task.id, allTasks);
            const updatedTasks = [
              { ...task, progress: clampedValue },
              ...children.map((child) => ({
                ...child,
                progress: clampedValue,
              })),
            ];
            onTasksChange?.(updatedTasks);
          } else {
            onTasksChange?.([{ ...task, progress: clampedValue }]);
          }
          setEditingColumnId(null);
        } else if (e.key === "Escape") {
          handleProgressCancel();
        }
      },
      [progressValue, task, onTasksChange, handleProgressCancel, allTasks],
    );

    useEffect(() => {
      if (editingProgress && progressInputRef.current) {
        progressInputRef.current.focus();
        progressInputRef.current.select();
      }
    }, [editingProgress]);

    useEffect(() => {
      setDurationValue(getDuration(normalizedTask.startDate, normalizedTask.endDate));
    }, [normalizedTask.startDate, normalizedTask.endDate, getDuration]);

    useEffect(() => {
      if (editingDuration && durationInputRef.current) {
        durationInputRef.current.focus();
        durationInputRef.current.select();
      }
    }, [editingDuration]);

    const emitMilestoneDateChange = useCallback((nextDateISO: string) => {
      const alignedDate = businessDays
        ? alignToWorkingDay(new Date(`${nextDateISO}T00:00:00.000Z`), 1, weekendPredicate)
        : new Date(`${nextDateISO}T00:00:00.000Z`);

      const clampedRange = clampTaskRangeForIncomingFS(
        task,
        alignedDate,
        alignedDate,
        allTasks,
        businessDays,
        weekendPredicate
      );
      const normalized = normalizeTaskDatesForType({
        ...task,
        startDate: clampedRange.start.toISOString().split("T")[0],
        endDate: clampedRange.end.toISOString().split("T")[0],
      });
      const startDate = parseUTCDate(normalized.startDate);
      const endDate = parseUTCDate(normalized.endDate);

      onTasksChange?.([
        {
          ...normalized,
          ...(task.dependencies && {
            dependencies: recalculateIncomingLags(
              task,
              startDate,
              endDate,
              allTasks,
              businessDays,
              weekendPredicate
            ),
          }),
        },
      ]);
    }, [task, onTasksChange, allTasks, businessDays, weekendPredicate]);

    // Both date pickers shift the whole task (preserving duration), same as drag-move
    // Also normalizes dates to ensure startDate is always before or equal to endDate
    const handleStartDateChange = useCallback(
      (newDateISO: string) => {
        if (!newDateISO) return;
        if (isMilestone) {
          emitMilestoneDateChange(newDateISO);
          return;
        }
        let nextEndISO: string;
        const normalizedInputStart = businessDays
          ? alignToWorkingDay(new Date(`${newDateISO}T00:00:00.000Z`), 1, weekendPredicate)
          : new Date(`${newDateISO}T00:00:00.000Z`);

        if (businessDays) {
          const duration = getDuration(task.startDate, task.endDate);
          nextEndISO = buildTaskRangeFromStart(
            normalizedInputStart,
            duration,
            true,
            weekendPredicate,
            1
          ).end.toISOString().split("T")[0];
        } else {
          const origStart = parseUTCDate(task.startDate);
          const origEnd = parseUTCDate(task.endDate);
          const durationMs = origEnd.getTime() - origStart.getTime();
          nextEndISO = new Date(normalizedInputStart.getTime() + durationMs).toISOString().split("T")[0];
        }

        const { startDate: normalizedStart, endDate: normalizedEnd } =
          normalizeTaskDates(normalizedInputStart, nextEndISO);
        const clampedRange = clampTaskRangeForIncomingFS(
          task,
          new Date(`${normalizedStart}T00:00:00.000Z`),
          new Date(`${normalizedEnd}T00:00:00.000Z`),
          allTasks,
          businessDays,
          weekendPredicate
        );
        const startDate = clampedRange.start;
        const endDate = clampedRange.end;
        onTasksChange?.([
          {
            ...task,
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            ...(task.dependencies && {
              dependencies: recalculateIncomingLags(
                task,
                startDate,
                endDate,
                allTasks,
                businessDays,
                weekendPredicate
              ),
            }),
          },
        ]);
      },
      [task, onTasksChange, businessDays, getDuration, getEndDate, allTasks, weekendPredicate, isMilestone, emitMilestoneDateChange],
    );

    const handleEndDateChange = useCallback(
      (newDateISO: string) => {
        if (!newDateISO) return;
        if (isMilestone) {
          emitMilestoneDateChange(newDateISO);
          return;
        }
        let nextStartISO: string;
        const normalizedInputEnd = businessDays
          ? alignToWorkingDay(new Date(`${newDateISO}T00:00:00.000Z`), -1, weekendPredicate)
          : new Date(`${newDateISO}T00:00:00.000Z`);

        if (businessDays) {
          const duration = getDuration(task.startDate, task.endDate);
          nextStartISO = buildTaskRangeFromEnd(
            normalizedInputEnd,
            duration,
            true,
            weekendPredicate,
            -1
          ).start.toISOString().split("T")[0];
        } else {
          const origStart = parseUTCDate(task.startDate);
          const origEnd = parseUTCDate(task.endDate);
          const durationMs = origEnd.getTime() - origStart.getTime();
          nextStartISO = new Date(normalizedInputEnd.getTime() - durationMs).toISOString().split("T")[0];
        }

        const { startDate: normalizedStart, endDate: normalizedEnd } =
          normalizeTaskDates(nextStartISO, normalizedInputEnd);
        const clampedRange = clampTaskRangeForIncomingFS(
          task,
          new Date(`${normalizedStart}T00:00:00.000Z`),
          new Date(`${normalizedEnd}T00:00:00.000Z`),
          allTasks,
          businessDays,
          weekendPredicate
        );
        const startDate = clampedRange.start;
        const endDate = clampedRange.end;
        onTasksChange?.([
          {
            ...task,
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            ...(task.dependencies && {
              dependencies: recalculateIncomingLags(
                task,
                startDate,
                endDate,
                allTasks,
                businessDays,
                weekendPredicate
              ),
            }),
          },
        ]);
      },
      [task, onTasksChange, businessDays, getDuration, weekendPredicate, allTasks, isMilestone, emitMilestoneDateChange],
    );

    const handleRowClickInternal = useCallback(() => {
      onRowClick?.(task.id);
    }, [task.id, onRowClick]);

    const handleNumberClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRowClick?.(task.id);
      },
      [task.id, onRowClick],
    );

    const handleToggleCollapse = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleCollapse?.(task.id);
      },
      [task.id, onToggleCollapse],
    );

    // Hierarchy handlers - promote/demote
    const handlePromote = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onPromoteTask?.(task.id);
      },
      [task.id, onPromoteTask],
    );

    const handleDemote = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        // The parent calculation is done in TaskList.tsx's handleDemoteWrapper,
        // which has access to the ordered visible task list and implements the
        // "previous visible task becomes parent" principle.
        // Pass empty string as placeholder — the wrapper ignores this value.
        onDemoteTask?.(task.id, "");
      },
      [task.id, onDemoteTask],
    );

    const handleApplyColor = useCallback(
      (color?: string) => {
        if (!onTasksChange) return;

        const descendantIds = new Set<string>();
        if (isParent) {
          const stack = getChildren(task.id, allTasks);
          while (stack.length > 0) {
            const current = stack.shift();
            if (!current || descendantIds.has(current.id)) continue;
            descendantIds.add(current.id);
            stack.push(...getChildren(current.id, allTasks));
          }
        }

        const updatedTasks: Task[] = [
          { ...task, color },
          ...allTasks
            .filter(candidate => descendantIds.has(candidate.id))
            .map(candidate => ({ ...candidate, color })),
        ];

        onTasksChange(updatedTasks);
        setColorMenuOpen(false);
        setContextMenuOpen(false);
      },
      [allTasks, isParent, onTasksChange, task],
    );

    const handleUngroup = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setContextMenuOpen(false);
        onUngroupTask?.(task.id);
      },
      [onUngroupTask, task.id],
    );

    const visibleCustomMenuCommands = useMemo(
      () =>
        taskListMenuCommands.filter(
          (command) => {
            const scope = command.scope ?? "all";
            if (scope === "group" && !isParent) return false;
            if (scope === "linear" && (isParent || isMilestoneRow)) return false;
            if (scope === "milestone" && !isMilestoneRow) return false;
            return command.isVisible?.(task) ?? true;
          },
        ),
      [taskListMenuCommands, task, isParent, isMilestoneRow],
    );

    const hasContextMenu =
      visibleCustomMenuCommands.length > 0 ||
      !!onDuplicateTask ||
      !!onDelete ||
      !!onTasksChange ||
      (isParent && !!onUngroupTask);

    const handleCustomMenuCommandClick = useCallback(
      (command: TaskListMenuCommand<Task>) =>
        (e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          if (command.closeOnSelect !== false) {
            setContextMenuOpen(false);
            setColorMenuOpen(false);
          }
          command.onSelect(task);
        },
      [task],
    );

    // Dependency handlers
    const handleAddClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onSetSelectingPredecessorFor?.(task.id);
      },
      [task.id, onSetSelectingPredecessorFor],
    );

    const handlePredecessorPick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isPicking || isSourceRow) return;
        if (!selectingPredecessorFor || !activeLinkType) return;
        if (dependencyPickMode === "predecessor") {
          onAddDependency?.(selectingPredecessorFor, task.id, activeLinkType);
        } else {
          onAddDependency?.(task.id, selectingPredecessorFor, activeLinkType);
        }
      },
      [
        isPicking,
        isSourceRow,
        selectingPredecessorFor,
        task.id,
        activeLinkType,
        dependencyPickMode,
        onAddDependency,
      ],
    );

    const handleCancelPicking = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onSetSelectingPredecessorFor?.(null);
      },
      [onSetSelectingPredecessorFor],
    );

    const handleSourceCellClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          handleCancelPicking(e);
        }
      },
      [handleCancelPicking],
    );

    const handleSearchPick = useCallback(
      (pickedTaskId: string) => {
        if (!activeLinkType) return;
        if (dependencyPickMode === "predecessor") {
          onAddDependency?.(task.id, pickedTaskId, activeLinkType);
        } else {
          onAddDependency?.(pickedTaskId, task.id, activeLinkType);
        }
      },
      [activeLinkType, dependencyPickMode, onAddDependency, task.id],
    );

    const handleSearchRemove = useCallback(
      (pickedTaskId: string) => {
        const matchingTypes = dependencyPickMode === "predecessor"
          ? (task.dependencies ?? [])
            .filter((dep) => dep.taskId === pickedTaskId)
            .map((dep) => dep.type)
          : ((allTasks.find((candidate) => candidate.id === pickedTaskId)?.dependencies ?? []))
            .filter((dep) => dep.taskId === task.id)
            .map((dep) => dep.type);

        for (const linkType of matchingTypes) {
          if (dependencyPickMode === "predecessor") {
            onRemoveDependency?.(task.id, pickedTaskId, linkType);
          } else {
            onRemoveDependency?.(pickedTaskId, task.id, linkType);
          }
        }
      },
      [allTasks, dependencyPickMode, onRemoveDependency, task.dependencies, task.id],
    );

    const sourcePickerContent = (
      <div
        className="gantt-tl-dep-source-picker"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gantt-tl-dep-source-direction">
          <button
            type="button"
            className={`gantt-tl-dep-source-direction-btn${dependencyPickMode === "successor" ? " gantt-tl-dep-source-direction-btn-active" : ""}`}
            onClick={() => onSetDependencyPickMode?.("successor")}
          >
            Последователь
          </button>
          <button
            type="button"
            className={`gantt-tl-dep-source-direction-btn${dependencyPickMode === "predecessor" ? " gantt-tl-dep-source-direction-btn-active" : ""}`}
            onClick={() => onSetDependencyPickMode?.("predecessor")}
          >
            Предшественник
          </button>
        </div>
        <div className="gantt-tl-dep-source-types">
          {LINK_TYPE_ORDER.map((linkType) => {
            const Icon = LINK_TYPE_ICONS[linkType];
            return (
              <button
                key={linkType}
                type="button"
                className={`gantt-tl-dep-source-type-btn${activeLinkType === linkType ? " gantt-tl-dep-source-type-btn-active" : ""}`}
                onClick={() => onSetActiveLinkType?.(linkType)}
                aria-label={`Выбрать тип связи ${linkType}`}
                title={linkType}
              >
                <Icon />
                <span>{LINK_TYPE_LABELS_RU[linkType]}</span>
              </button>
            );
          })}
        </div>
        <div className="gantt-tl-dep-source-picker-head">
          <input
            ref={dependencySearchInputRef}
            type="text"
            className="gantt-tl-dep-source-input"
            placeholder={dependencyPickMode === "predecessor" ? "Укажите предшественника" : "Укажите последователя"}
            value={dependencySearchQuery}
            onChange={(e) => setDependencySearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onSetSelectingPredecessorFor?.(null);
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (dependencySearchCandidates.length > 0) {
                  setHighlightedDependencyIndex((current) =>
                    Math.min(current + 1, dependencySearchCandidates.length - 1)
                  );
                }
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                if (dependencySearchCandidates.length > 0) {
                  setHighlightedDependencyIndex((current) => Math.max(current - 1, 0));
                }
                return;
              }
              if (e.key === "Enter" && dependencySearchCandidates[highlightedDependencyIndex]) {
                e.preventDefault();
                const activeCandidate = dependencySearchCandidates[highlightedDependencyIndex];
                if (activeCandidate.isAlreadyLinked) {
                  handleSearchRemove(activeCandidate.task.id);
                } else {
                  handleSearchPick(activeCandidate.task.id);
                }
              }
            }}
          />
        </div>
        <div
          ref={dependencySearchListRef}
          className="gantt-tl-dep-source-list"
        >
          {dependencySearchCandidates.length > 0 ? (
            dependencySearchCandidates.map(({ task: candidate, label, isAlreadyLinked }, index) => (
              <button
                key={candidate.id}
                type="button"
                data-index={index}
                className={`gantt-tl-dep-source-option${index === highlightedDependencyIndex ? " gantt-tl-dep-source-option-active" : ""}${isAlreadyLinked ? " gantt-tl-dep-source-option-linked" : ""}`}
                onClick={() => {
                  if (!isAlreadyLinked) {
                    handleSearchPick(candidate.id);
                  }
                }}
                onMouseEnter={() => setHighlightedDependencyIndex(index)}
                onKeyDown={(e) => {
                  // Allow Delete/Backspace to remove linked items via keyboard
                  if (isAlreadyLinked && (e.key === "Delete" || e.key === "Backspace")) {
                    e.preventDefault();
                    handleSearchRemove(candidate.id);
                  }
                }}
                title={label}
              >
                <span className="gantt-tl-dep-source-option-label">{label}</span>
                {isAlreadyLinked && (
                  <span
                    className="gantt-tl-dep-source-option-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSearchRemove(candidate.id);
                    }}
                    aria-label={`Удалить связь с ${label}`}
                  >
                    ×
                  </span>
                )}
              </button>
            ))
          ) : (
            <span className="gantt-tl-dep-source-hint">Ничего не найдено</span>
          )}
        </div>
      </div>
    );

    // True when this row is the predecessor for the currently selected chip
    const isSelectedPredecessor =
      selectedChip != null && selectedChip.predecessorId === task.id;
    const isSelectedDependencyOwner =
      selectedChip != null && selectedChip.successorId === task.id;

    // Delete the selected dependency from the predecessor row's "Удалить" button
    const handleDeleteSelected = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedChip) return;
        onRemoveDependency?.(
          selectedChip.successorId,
          selectedChip.predecessorId,
          selectedChip.linkType as LinkType,
        );
        onChipSelect?.(null);
      },
      [selectedChip?.successorId, selectedChip?.predecessorId, selectedChip?.linkType, onRemoveDependency, onChipSelect],
    );

    const startDateISO = toISODate(normalizedTask.startDate);
    const endDateISO = editingDuration
      ? getEndDate(normalizedTask.startDate, durationValue)
      : toISODate(normalizedTask.endDate);

    // --- Built-in cell JSX (referenced from resolvedColumns.map) ---
    const numberCell = (
      <div
        className="gantt-tl-cell gantt-tl-cell-number"
        onClick={handleNumberClick}
      >
        <span
          className="gantt-tl-drag-handle"
          draggable={true}
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart?.(rowIndex, e);
          }}
          onDragEnd={(e) => onDragEnd?.(e)}
          onClick={(e) => e.stopPropagation()}
        >
          <DragHandleIcon />
        </span>
        <span className="gantt-tl-num-label">
          {taskNumber || rowIndex + 1}
        </span>
      </div>
    );

    const nameTriggerPaddingLeft =
      isParent
        ? `${nestingDepth * 20 + 28}px`
        : nestingDepth > 0
          ? `${nestingDepth * 20 + 8}px`
          : undefined;

    const nameInputPaddingLeft =
      nestingDepth > 0 ? `${nestingDepth * 20 + 8}px` : undefined;

    const nameCell = (
      <div className="gantt-tl-cell gantt-tl-cell-name">
        {isChild && !editingName && (
          <>
            {!isFilterHideMode && (
              <>
                {/* Ancestor continuation lines — full-height vertical bars for each ongoing ancestor level */}
                {ancestorLineModes.map((mode, idx) =>
                  mode ? (
                    <React.Fragment key={idx}>
                      <span
                        data-testid={`gantt-tl-ancestor-connector-${idx}`}
                        style={{
                          position: "absolute",
                          left: `${idx * 20 + 9}px`,
                          top: 0,
                          height: mode === "half" ? `${rowHeight / 2}px` : `${rowHeight}px`,
                          width: "1.5px",
                          background: getHierarchyLineColor(idx),
                          borderRadius: "1px",
                          pointerEvents: "none",
                        }}
                      />
                      {mode === "half" && (
                        <span
                          data-testid={`gantt-tl-ancestor-connector-cap-${idx}`}
                          style={{
                            position: "absolute",
                            left: `${idx * 20 + 9}px`,
                            top: `${rowHeight / 2 - 0.75}px`,
                            width: "5px",
                            height: "1.5px",
                            background: getHierarchyLineColor(idx),
                            borderRadius: "1px",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </React.Fragment>
                  ) : null
                )}
                {/* Vertical line from parent to last child position */}
                {nestingDepth > 0 && (
                  <span
                    data-testid="gantt-tl-child-connector-vertical"
                    style={{
                      position: "absolute",
                      left: `${(nestingDepth - 1) * 20 + 9}px`,
                      top: 0,
                      height:
                        isLastChild && !hasVisibleChildren
                          ? `${rowHeight / 2}px`
                          : `${rowHeight}px`,
                      width: "1.5px",
                      background: getHierarchyLineColor(nestingDepth - 1),
                      borderRadius: "1px",
                      pointerEvents: "none",
                    }}
                  />
                )}
                {/* Horizontal branch */}
                <span
                  style={{
                    position: "absolute",
                    left: `${(nestingDepth - 1) * 20 + 9}px`,
                    top: `${rowHeight / 2 - 0.75}px`,
                    width: "8px",
                    height: "1.5px",
                    background: getHierarchyLineColor(nestingDepth - 1),
                    borderRadius: "1px",
                    pointerEvents: "none",
                  }}
                />
                {/* End dot */}
                <span
                  style={{
                    position: "absolute",
                    left: `${(nestingDepth - 1) * 20 + 15}px`,
                    top: `${rowHeight / 2 - 2}px`,
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: getHierarchyLineColor(nestingDepth - 1),
                    pointerEvents: "none",
                  }}
                />
              </>
            )}
            {isParent && !editingName && (
              <>
                {!isFilterHideMode && !isCollapsed && (
                  <span
                    style={{
                      position: "absolute",
                      left: `${nestingDepth * 20 + 9}px`,
                      top: `${rowHeight / 2 + 7}px`,
                      height: `${rowHeight / 2 - 7}px`,
                      width: "1.5px",
                      background: getHierarchyLineColor(nestingDepth),
                      borderRadius: "1px",
                      pointerEvents: "none",
                    }}
                  />
                )}
                <button
                  type="button"
                  className={`gantt-tl-collapse-btn ${isCollapsed ? "gantt-tl-collapse-btn-collapsed" : ""}`}
                  onClick={handleToggleCollapse}
                  style={{ left: `${nestingDepth * 20 + 1}px` }}
                  aria-label={isCollapsed ? "Expand children" : "Collapse children"}
                >
                  <ChevronRightIcon />
                </button>
              </>
            )}
          </>
        )}
        {!isChild && isParent && !editingName && (
          <>
            {!isFilterHideMode && !isCollapsed && (
              <span
                data-testid="gantt-tl-parent-connector-tail"
                style={{
                  position: "absolute",
                  left: `${nestingDepth * 20 + 9}px`,
                  top: `${rowHeight / 2 + 7}px`,
                  height: `${rowHeight / 2 - 7}px`,
                  width: "1.5px",
                  background: getHierarchyLineColor(nestingDepth),
                  borderRadius: "1px",
                  pointerEvents: "none",
                }}
              />
            )}
            <button
              type="button"
              className={`gantt-tl-collapse-btn ${isCollapsed ? "gantt-tl-collapse-btn-collapsed" : ""}`}
              onClick={handleToggleCollapse}
              style={{ left: `${nestingDepth * 20 + 1}px` }}
              aria-label={isCollapsed ? "Expand children" : "Collapse children"}
            >
              <ChevronRightIcon />
            </button>
          </>
        )}
        {editingName ? (
          <Input
            ref={nameInputRef}
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            className="gantt-tl-name-input"
            style={{ paddingLeft: nameInputPaddingLeft }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            className={[
              "gantt-tl-name-trigger",
              disableTaskNameEditing ? "gantt-tl-name-locked" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={task.name}
            onClick={handleNameClick}
            onDoubleClick={handleNameDoubleClick}
            style={{
              paddingLeft: nameTriggerPaddingLeft,
              paddingRight: task.color ? "20px" : undefined,
            }}
          >
            <span className="gantt-tl-name-trigger-text">{task.name}</span>
          </button>
        )}
        {!editingName && task.color && (
          <span
            className="gantt-tl-name-color-stripe"
            style={{ backgroundColor: task.color }}
            aria-hidden="true"
          />
        )}
        {!editingName && (onInsertAfter || onDelete || onPromoteTask || onDemoteTask || onUngroupTask || onDuplicateTask || onTasksChange || hasContextMenu) && (
          <div className="gantt-tl-name-actions">
            {onInsertAfter && (
              <button
                type="button"
                className="gantt-tl-name-action-btn gantt-tl-action-insert"
                onClick={(e) => {
                  e.stopPropagation();
                  const now = new Date();
                  const todayISO = new Date(
                    Date.UTC(
                      now.getUTCFullYear(),
                      now.getUTCMonth(),
                      now.getUTCDate(),
                    ),
                  )
                    .toISOString()
                    .split("T")[0];
                  const endISO = new Date(
                    Date.UTC(
                      now.getUTCFullYear(),
                      now.getUTCMonth(),
                      now.getUTCDate() + 7,
                    ),
                  )
                    .toISOString()
                    .split("T")[0];
                  const newTask: Task = {
                    id: crypto.randomUUID(),
                    name: "Новая задача",
                    startDate: todayISO,
                    endDate: endISO,
                    parentId: task.parentId,
                  };
                  onInsertAfter(task.id, newTask);
                }}
                aria-label="Вставить задачу после этой"
              >
                <PlusIcon />
              </button>
            )}
            <HierarchyButton
              isChild={isChild}
              rowIndex={rowIndex}
              canDemote={canDemoteTask}
              onPromote={onPromoteTask ? handlePromote : undefined}
              onDemote={onDemoteTask ? handleDemote : undefined}
            />
            {hasContextMenu && (
              <Popover open={contextMenuOpen} onOpenChange={(open) => {
                setContextMenuOpen(open);
                if (!open) setColorMenuOpen(false);
              }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="gantt-tl-name-action-btn gantt-tl-action-context"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenuOpen((v) => !v);
                    }}
                    aria-label="Дополнительно"
                  >
                    <VerticalDotsIcon />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="gantt-tl-context-menu" portal={true} align="end">
                  {onTasksChange && (
                    <div className="gantt-tl-context-menu-section">
                      <button
                        type="button"
                        className="gantt-tl-context-menu-item gantt-tl-context-menu-item-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setColorMenuOpen((value) => !value);
                        }}
                        aria-expanded={colorMenuOpen}
                      >
                        <span className="gantt-tl-context-menu-item-main">
                          {task.color && (
                            <span
                              className="gantt-tl-color-swatch gantt-tl-color-swatch-inline"
                              style={{ backgroundColor: task.color }}
                              aria-hidden="true"
                            />
                          )}
                          Цвет
                        </span>
                        <ChevronRightIcon />
                      </button>
                      {colorMenuOpen && (
                        <div className="gantt-tl-color-grid">
                          <button
                            type="button"
                            className={`gantt-tl-color-swatch gantt-tl-color-swatch-clear${!task.color ? " is-selected" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyColor(undefined);
                            }}
                            aria-label="Сбросить цвет"
                            title="Сбросить цвет"
                          >
                            <span className="gantt-tl-color-swatch-clear-line" />
                          </button>
                          {TASK_COLOR_PALETTE.map((paletteColor) => (
                            <button
                              key={paletteColor.value}
                              type="button"
                              className={`gantt-tl-color-swatch${task.color === paletteColor.value ? " is-selected" : ""}`}
                              style={{ backgroundColor: paletteColor.value }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyColor(paletteColor.value);
                              }}
                              aria-label={`Выбрать цвет ${paletteColor.label}`}
                              title={paletteColor.label}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {onDuplicateTask && (
                    <button
                      type="button"
                      className="gantt-tl-context-menu-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenuOpen(false);
                        onDuplicateTask(task.id);
                      }}
                    >
                      <CopyIcon />
                      Дублировать
                    </button>
                  )}
                  {visibleCustomMenuCommands.map((command) => (
                    <button
                      key={command.id}
                      type="button"
                      className={`gantt-tl-context-menu-item${command.danger ? " gantt-tl-context-menu-item-danger" : ""}`}
                      onClick={handleCustomMenuCommandClick(command)}
                      disabled={command.isDisabled?.(task) ?? false}
                    >
                      {command.icon}
                      {command.label}
                    </button>
                  ))}
                  {isParent && onUngroupTask && (
                    <button
                      type="button"
                      className="gantt-tl-context-menu-item"
                      onClick={handleUngroup}
                    >
                      <UngroupIcon />
                      Разгруппировать
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="gantt-tl-context-menu-item gantt-tl-context-menu-item-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenuOpen(false);
                        onDelete(task.id);
                      }}
                    >
                      <TrashIcon />
                      Удалить задачу
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>
    );

    const startDateCell = (
      <div
        className="gantt-tl-cell gantt-tl-cell-date"
        onClick={(e) => e.stopPropagation()}
      >
        <DatePicker
          value={startDateISO}
          onChange={handleStartDateChange}
          format="dd.MM.yy"
          portal={true}
          disabled={task.locked}
          isWeekend={weekendPredicate}
          businessDays={businessDays}
        />
      </div>
    );

    const endDateCell = (
      <div
        className="gantt-tl-cell gantt-tl-cell-date"
        onClick={(e) => e.stopPropagation()}
      >
        <DatePicker
          value={endDateISO}
          onChange={handleEndDateChange}
          format="dd.MM.yy"
          portal={true}
          disabled={task.locked}
          isWeekend={weekendPredicate}
          businessDays={businessDays}
        />
      </div>
    );

    const durationCell = (
      <div
        className="gantt-tl-cell gantt-tl-cell-duration"
        onClick={handleDurationClick}
      >
        {editingDuration && (
          <div
            className="gantt-tl-number-editor"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              ref={durationInputRef}
              type="number"
              min={0}
              step={1}
              value={durationValue}
              onChange={(e) =>
                applyDurationChange(parseInt(e.target.value, 10) || 0)
              }
              onBlur={handleDurationSave}
              onKeyDown={handleDurationKeyDown}
              className="gantt-tl-number-input"
            />
            <div className="gantt-tl-number-steppers" aria-hidden="true">
              <button
                type="button"
                className="gantt-tl-number-stepper"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleDurationAdjust(1)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                className="gantt-tl-number-stepper"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleDurationAdjust(-1)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <span
          style={
            editingDuration
              ? { visibility: "hidden", pointerEvents: "none" }
              : undefined
          }
        >
          {isMilestone ? '◆' : `${getDuration(normalizedTask.startDate, normalizedTask.endDate)}д`}
        </span>
      </div>
    );

    const progressCell = (
      <div
        className="gantt-tl-cell gantt-tl-cell-progress"
        onClick={handleProgressClick}
      >
        {editingProgress && (
          <div
            className="gantt-tl-number-editor"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              ref={progressInputRef}
              type="number"
              min={0}
              max={100}
              step={1}
              value={progressValue}
              onChange={(e) =>
                setProgressValue(parseInt(e.target.value, 10) || 0)
              }
              onBlur={handleProgressSave}
              onKeyDown={handleProgressKeyDown}
              className="gantt-tl-number-input"
            />
            <div className="gantt-tl-number-steppers" aria-hidden="true">
              <button
                type="button"
                className="gantt-tl-number-stepper"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleProgressAdjust(1)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                className="gantt-tl-number-stepper"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleProgressAdjust(-1)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <span
          style={
            editingProgress
              ? { visibility: "hidden", pointerEvents: "none" }
              : task.progress === 100
                ? {
                  backgroundColor: "#17c864",
                  borderRadius: "4px",
                  padding: "2px 4px",
                  color: "#ffffff",
                }
                : undefined
          }
        >
          {task.progress
            ? Math.round(task.progress) === 100
              ? "100"
              : `${Math.round(task.progress)}%`
            : "-"}
        </span>
      </div>
    );

    const dependenciesCell = (
      <div
        className="gantt-tl-cell gantt-tl-cell-deps"
        onClick={
          isSourceRow
            ? handleSourceCellClick
            : isPicking
              ? handlePredecessorPick
              : undefined
        }
      >
        {isSourceRow ? (
          <>
            <span
              className="gantt-tl-dep-source-hint"
              onClick={handleCancelPicking}
            >
              Отменить
            </span>
            {sourcePickerContent}
          </>
        ) : isSelectedPredecessor && !disableDependencyEditing ? (
          /* Full-replacement: "Зависит от [name]" → hover → "Удалить" */
          <button
            type="button"
            className="gantt-tl-dep-delete-label"
            onClick={handleDeleteSelected}
            aria-label="Удалить связь"
          >
            <span className="gantt-tl-dep-delete-label-default">
              Связано с
            </span>
            <span className="gantt-tl-dep-delete-label-hover">× удалить</span>
          </button>
        ) : (
          <>
            {chips.length >= 2 ? (
              /* 2+ deps — show only "N связей" summary chip that opens a popover */
              <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="gantt-tl-dep-summary-chip"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOverflowOpen((v) => !v);
                    }}
                  >
                    {chips.length} {linkWord}
                  </button>
                </PopoverTrigger>
                <PopoverContent portal={true} align="start">
                  <div
                    className="gantt-tl-dep-overflow-list"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {chips.map(({ dep, lag, predecessorName }) => (
                      <DepChip
                        key={`${dep.taskId}-${dep.type}`}
                        lag={lag}
                        dep={dep}
                        taskId={task.id}
                        taskNumber={taskNumber}
                        predecessorName={predecessorName}
                        predecessorTaskNumber={taskNumberMap[dep.taskId]}
                        selectedChip={selectedChip}
                        disableDependencyEditing={disableDependencyEditing}
                        onChipSelect={onChipSelect}
                        onRowClick={onRowClick}
                        onScrollToTask={onScrollToTask}
                        onRemoveDependency={onRemoveDependency}
                        onChipSelectClear={() => onChipSelect?.(null)}
                        task={task}
                        allTasks={allTasks}
                        onTasksChange={onTasksChange}
                        businessDays={businessDays}
                        weekendPredicate={weekendPredicate}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : chips.length === 1 ? (
              /* Single chip — unified DepChip */
              <DepChip
                lag={chips[0].lag}
                dep={chips[0].dep}
                taskId={task.id}
                taskNumber={taskNumber}
                predecessorName={chips[0].predecessorName}
                predecessorTaskNumber={taskNumberMap[chips[0].dep.taskId]}
                selectedChip={selectedChip}
                disableDependencyEditing={disableDependencyEditing}
                onChipSelect={onChipSelect}
                onRowClick={onRowClick}
                onScrollToTask={onScrollToTask}
                onRemoveDependency={onRemoveDependency}
                onChipSelectClear={() => onChipSelect?.(null)}
                task={task}
                allTasks={allTasks}
                onTasksChange={onTasksChange}
                businessDays={businessDays}
                weekendPredicate={weekendPredicate}
              />
            ) : null}

            {/* "+" add dependency button — hidden in picker mode and when editing disabled, hover-reveal */}
            {!disableDependencyEditing && !isPicking && (
              <button
                type="button"
                className={`gantt-tl-dep-add gantt-tl-dep-add-hover${selectedChip ? " gantt-tl-dep-add-hidden" : ""}`}
                onClick={handleAddClick}
                aria-label="Добавить связь"
              >
                +
              </button>
            )}
          </>
        )}
      </div>
    );

    const builtInCells: Record<string, React.ReactNode> = {
      number: numberCell,
      name: nameCell,
      startDate: startDateCell,
      endDate: endDateCell,
      duration: durationCell,
      progress: progressCell,
      dependencies: dependenciesCell,
    };

    return (
      <div
        data-filter-match={isFilterMatch ? 'true' : 'false'}
        className={[
          "gantt-tl-row",
          isFilterMatch ? "gantt-tl-row-filter-match" : "",
          isSelected ? "gantt-tl-row-selected" : "",
          isSelectedDependencyOwner ? "gantt-tl-row-dependency-owner" : "",
          isSelectedPredecessor ? "gantt-tl-row-dependency-selected" : "",
          isPicking && !isSourceRow ? "gantt-tl-row-picking" : "",
          isSourceRow ? "gantt-tl-row-picking-self" : "",
          isDragging ? "gantt-tl-row-dragging" : "",
          isDragOver ? "gantt-tl-row-drag-over" : "",
          isChild ? "gantt-tl-row-child" : "",
          isParent ? "gantt-tl-row-parent" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ minHeight: `${rowHeight}px`, position: "relative" }}
        onClick={handleRowClickInternal}
        onKeyDown={handleRowKeyDown}
        onDragOver={(e) => onDragOver?.(rowIndex, e)}
        onDrop={(e) => onDrop?.(rowIndex, e)}
        tabIndex={isSelected ? 0 : -1}
      >
        {resolvedColumns?.map(col => {
          const builtIn = builtInCells[col.id];
          if (builtIn) return <React.Fragment key={col.id}>{builtIn}</React.Fragment>;

          // Custom column
          const isEditing = editingColumnId === col.id;
          const editorFn = col.renderEditor;
          const columnContext = {
            task,
            rowIndex,
            isEditing,
            openEditor: () => {
              if (editorFn) setEditingColumnId(col.id);
            },
            closeEditor: () => {
              if (editingColumnId === col.id) setEditingColumnId(null);
            },
            updateTask: (patch: Partial<Task>) => {
              onTasksChange?.([{ ...task, ...patch } as Task]);
              setEditingColumnId(null);
            },
          };

          return (
            <div
              key={col.id}
              className="gantt-tl-cell gantt-tl-cell-custom"
              data-column-id={`custom:${col.id}`}
              data-custom-column-id={col.id}
              data-custom-column-editing={isEditing ? "true" : "false"}
              data-testid={`custom-cell-${col.id}`}
              onClick={editorFn && !isEditing ? (e) => { e.stopPropagation(); setEditingColumnId(col.id); } : undefined}
              style={{ width: col.width ?? 120, minWidth: col.width ?? 120, flexShrink: 0 }}
            >
              {isEditing && editorFn ? (
                <div
                  data-custom-column-editor={col.id}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {editorFn(columnContext)}
                </div>
              ) : (
                col.renderCell(columnContext)
              )}
            </div>
          );
        })}
      </div>
    );
  },
);

TaskListRow.displayName = "TaskListRow";
export default TaskListRow;

