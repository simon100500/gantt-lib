// START_MODULE_CONTRACT
// PURPOSE: Render the native SimpleGrid as GanttChart's task list.
// SCOPE: Present visible task rows, shared geometry, hierarchy controls and editable fields; delegate mutations to GanttChart.
// INPUTS: Visible tasks and row geometry, collapsed tree state and host callbacks.
// OUTPUTS: SimpleGrid row changes and expand/collapse events; no scheduling side effects.
// DEPENDS: SimpleGridVendor, GanttChart task types.
// END_MODULE_CONTRACT
import React, { useMemo } from 'react';
import type { Task } from '../GanttChart';
import { SimpleGrid } from '../SimpleGridVendor/runtime.js';
import type { SimpleGridColumn } from '../SimpleGridVendor/types';

const NO_FILTERS: [] = [];

interface Props {
  tasks: Task[];
  allTasks: Task[];
  rowHeight: number;
  rowHeights: number[];
  headerHeight: number;
  width: number;
  show: boolean;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  onChange: (rows: Task[]) => void;
  nameReadOnly: boolean;
  readOnly: boolean;
  hiddenColumns?: readonly string[];
  columnWidths?: Record<string, number | undefined>;
  error: string;
  onTaskSelect: (id: string | null) => void;
  enableTaskMultiSelect?: boolean;
  selectedTaskIds?: Set<string>;
  onSelectedTaskIdsChange?: (ids: Set<string>) => void;
}

export function SimpleGridTaskList({ tasks, allTasks, rowHeight, rowHeights, headerHeight, width, show, collapsed, onToggleCollapse, onChange, nameReadOnly, readOnly, hiddenColumns, columnWidths, error, onTaskSelect, enableTaskMultiSelect, selectedTaskIds, onSelectedTaskIdsChange }: Props) {
  const parents = useMemo(() => new Set(allTasks.flatMap(task => task.parentId ? [task.parentId] : [])), [allTasks]);
  const byId = useMemo(() => new Map(allTasks.map(task => [task.id, task])), [allTasks]);
  const heights = useMemo(() => Object.fromEntries(tasks.map((task, index) => [task.id, rowHeights[index] ?? rowHeight])), [tasks, rowHeights, rowHeight]);
  const columns = useMemo<SimpleGridColumn<Task>[]>(() => ([
    { id: 'name', title: 'Имя', width: columnWidths?.name ?? 220, readOnly: nameReadOnly, isDisabled: task => !!task.locked,
      getValue: task => task.name, setValue: (task, value) => ({ ...task, name: value }),
      renderValue: task => {
        let depth = 0; let parent = task.parentId; const seen = new Set<string>();
        while (parent && !seen.has(parent)) { seen.add(parent); depth++; parent = byId.get(parent)?.parentId; }
        return <span style={{ display: 'flex', alignItems: 'center', paddingLeft: depth * 16, minWidth: 0 }}>
          {parents.has(task.id) && <button type="button" aria-label={`${collapsed.has(task.id) ? 'Раскрыть' : 'Свернуть'} ${task.name}`} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: '0 4px' }} onMouseDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onToggleCollapse(task.id); }}>{collapsed.has(task.id) ? '▸' : '▾'}</button>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</span>
        </span>;
      } },
    ...(['startDate', 'endDate'] as const).map(id => ({ id, title: id === 'startDate' ? 'Начало' : 'Окончание', width: columnWidths?.[id] ?? 120,
      validation: { type: 'date' as const }, format: { kind: 'date' as const }, datePicker: true,
      isDisabled: (task: Task) => !!task.locked, getValue: (task: Task) => task[id] instanceof Date ? (task[id] as Date).toISOString().slice(0, 10) : String(task[id]).slice(0, 10),
      setValue: (task: Task, value: string) => ({ ...task, [id]: value }) })),
    { id: 'progress', title: '%', width: columnWidths?.progress ?? 65, readOnly: true, getValue: task => String(task.progress ?? 0) },
    { id: 'dependencies', title: 'Связи', width: columnWidths?.dependencies ?? 100, readOnly: true, getValue: task => (task.dependencies ?? []).map(dep => dep.taskId).join(', ') },
  ] as SimpleGridColumn<Task>[]).filter(column => !hiddenColumns?.includes(column.id)), [byId, parents, collapsed, onToggleCollapse, nameReadOnly, columnWidths, hiddenColumns]);
  return <div className={`gantt-tl-overlay gantt-simple-grid${show ? '' : ' gantt-tl-hidden'}`} style={{ '--tasklist-width': `${width}px`, '--gantt-grid-header-height': `${headerHeight + 1}px` } as React.CSSProperties}>
    <div onClickCapture={event => {
      const target = event.target as HTMLElement;
      if (target.closest('button, input')) return;
      const row = target.closest<HTMLElement>('[data-row-index]');
      if (row && target.closest('[data-testid^="sg-cell-"]')) onTaskSelect(tasks[Number(row.dataset.rowIndex)]?.id ?? null);
    }}>
    {error && <div role="status" className="gantt-simple-grid-error">{error}</div>}
    <SimpleGrid rows={tasks} columns={columns} rowKey={task => task.id} onChange={onChange} createRow={() => ({ id: '', name: '', startDate: '', endDate: '' })} readOnly={readOnly} rowHeight={rowHeight} rowHeights={heights} showRowHeaders={!hiddenColumns?.includes('number')} rowSelectionMode={enableTaskMultiSelect}
      allowRowReorder={false} columnFilters={NO_FILTERS} sort={null}
      selectedRowKeys={selectedTaskIds ? Array.from(selectedTaskIds) : undefined}
      onSelectedRowKeysChange={onSelectedTaskIdsChange ? keys => onSelectedTaskIdsChange(new Set(keys)) : undefined} />
    </div>
  </div>;
}
