"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  GanttChart,
  type Task,
  type GanttChartHandle,
  withoutDeps, expired, inDateRange, progressInRange, nameContains, or,
  type TaskPredicate,
} from "gantt-lib";
import { isTaskParent, getAllDescendants } from "gantt-lib";
import {
  MAIN_CHART_CUSTOM_DAYS,
  MAIN_CHART_WEEKEND_PREDICATE,
  reflowTasksForBusinessDays,
  createSampleTasks,
} from "@/data/sampleTasks";

export default function ConstructionChart() {
  const [tasks, setTasks] = useState<Task[]>(createSampleTasks);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [showTaskList, setShowTaskList] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [disableTaskNameEditing, setDisableTaskNameEditing] = useState(false);
  const [highlightExpired, setHighlightExpired] = useState(true);
  const [businessDays, setBusinessDays] = useState(true);
  const [disableTaskDrag, setDisableTaskDrag] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskPredicate | undefined>(undefined);
  const [taskFilterId, setTaskFilterId] = useState<string | undefined>(undefined);
  const [filterMode, setFilterMode] = useState<'highlight' | 'hide'>('highlight');
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0);

  useEffect(() => {
    if (!businessDays) return;
    setTasks((prev) => reflowTasksForBusinessDays(prev, MAIN_CHART_WEEKEND_PREDICATE));
  }, [businessDays]);

  const ganttChartRef = useRef<GanttChartHandle>(null);

  const searchResultIds = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return tasks
      .filter((task) => task.name.toLowerCase().split(/\s+/).some((word) => word.startsWith(normalizedQuery)))
      .map((task) => task.id);
  }, [searchQuery, tasks]);

  const highlightedSearchTaskIds = useMemo(() => new Set(searchResultIds), [searchResultIds]);
  const activeSearchTaskId = searchResultIds[activeSearchResultIndex] ?? searchResultIds[0];

  useEffect(() => { setActiveSearchResultIndex(0); }, [searchQuery]);

  useEffect(() => {
    if (searchResultIds.length === 0) {
      if (activeSearchResultIndex !== 0) setActiveSearchResultIndex(0);
      return;
    }
    if (activeSearchResultIndex > searchResultIds.length - 1) {
      setActiveSearchResultIndex(searchResultIds.length - 1);
    }
  }, [activeSearchResultIndex, searchResultIds]);

  useEffect(() => {
    if (!activeSearchTaskId) return;
    ganttChartRef.current?.scrollToRow(activeSearchTaskId);
  }, [activeSearchTaskId]);

  const handleChange = useCallback((updatedTasks: Task[]) => {
    setTasks(prev => {
      const updatedMap = new Map(updatedTasks.map(t => [t.id, t]));
      return prev.map(t => updatedMap.get(t.id) ?? t);
    });
  }, []);

  const handleAdd = useCallback((task: Task) => {
    setTasks(prev => [...prev, task]);
  }, []);

  const handleDelete = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const handleInsertAfter = useCallback((taskId: string, newTask: Task) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;
      if (isTaskParent(taskId, prev)) {
        const descendants = getAllDescendants(taskId, prev);
        const lastIndex = descendants.length > 0
          ? prev.findIndex(t => t.id === descendants[descendants.length - 1].id)
          : prev.findIndex(t => t.id === taskId);
        if (lastIndex === -1) return prev;
        const newTasks = [...prev];
        newTasks.splice(lastIndex + 1, 0, { ...newTask, parentId: undefined });
        return newTasks;
      }
      const index = prev.findIndex(t => t.id === taskId);
      if (index === -1) return prev;
      const newTasks = [...prev];
      newTasks.splice(index + 1, 0, { ...newTask, parentId: task.parentId });
      return newTasks;
    });
  }, []);

  const handleReorder = useCallback((reorderedTasks: Task[]) => {
    setTasks(reorderedTasks);
  }, []);

  const handleSearchResultStep = useCallback((direction: -1 | 1) => {
    if (searchResultIds.length === 0) return;
    setActiveSearchResultIndex((prev) => {
      const nextIndex = prev + direction;
      if (nextIndex < 0) return searchResultIds.length - 1;
      if (nextIndex >= searchResultIds.length) return 0;
      return nextIndex;
    });
  }, [searchResultIds]);

  const filterBtnStyle = (active?: boolean, color?: string) => ({
    padding: '4px 12px',
    fontSize: '0.875rem',
    borderRadius: '6px',
    border: '1px solid',
    cursor: 'pointer',
    backgroundColor: active ? (color || '#1f2937') : 'transparent',
    color: active ? '#ffffff' : '#374151',
    borderColor: active ? (color || '#1f2937') : '#d1d5db',
  });

  return (
    <section className="demo-section">
      <h2 className="demo-section-title">Construction Project</h2>
      <div className="demo-controls">
        <button className={`demo-btn ${showTaskList && showChart ? "demo-btn-active" : "demo-btn-muted"}`} onClick={() => { setShowTaskList(true); setShowChart(true); }}>Оба</button>
        <button className={`demo-btn ${showTaskList && !showChart ? "demo-btn-active" : "demo-btn-muted"}`} onClick={() => { setShowTaskList(true); setShowChart(false); }}>Только список</button>
        <button className={`demo-btn ${!showTaskList && showChart ? "demo-btn-active" : "demo-btn-muted"}`} onClick={() => { setShowTaskList(false); setShowChart(true); }}>Только календарь</button>
        <button className={`demo-btn ${showTaskList ? "demo-btn-danger" : "demo-btn-primary"}`} onClick={() => setShowTaskList(!showTaskList)}>{showTaskList ? "Hide Task List" : "Show Task List"}</button>
        <button className="demo-btn demo-btn-purple" onClick={() => ganttChartRef.current?.scrollToToday()}>Today</button>
        <button className="demo-btn demo-btn-secondary" onClick={() => ganttChartRef.current?.collapseAll()}>▲ Collapse All</button>
        <button className="demo-btn demo-btn-secondary" onClick={() => ganttChartRef.current?.expandAll()}>▼ Expand All</button>
        <button className={`demo-btn ${disableTaskNameEditing ? "demo-btn-muted" : "demo-btn-active"}`} onClick={() => setDisableTaskNameEditing(!disableTaskNameEditing)}>{disableTaskNameEditing ? "Enable Name Editing" : "Disable Name Editing"}</button>
        <button className={`demo-btn ${highlightExpired ? "demo-btn-danger" : "demo-btn-muted"}`} onClick={() => setHighlightExpired(!highlightExpired)}>{highlightExpired ? "Disable Expired Highlight" : "Enable Expired Highlight"}</button>
        <button className={`demo-btn ${businessDays ? "demo-btn-active" : "demo-btn-muted"}`} onClick={() => setBusinessDays(!businessDays)}>{businessDays ? "Рабочие дни: ON" : "Рабочие дни: OFF"}</button>
        <button className={`demo-btn ${disableTaskDrag ? "demo-btn-danger" : "demo-btn-muted"}`} onClick={() => setDisableTaskDrag(!disableTaskDrag)}>{disableTaskDrag ? "Drag: OFF" : "Drag: ON"}</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Поиск:</span>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); handleSearchResultStep(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); handleSearchResultStep(-1); } }}
          placeholder="Начните вводить слово из названия задачи"
          style={{ minWidth: '280px', padding: '8px 12px', fontSize: '0.875rem', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
        />
        <button className="demo-btn demo-btn-secondary" onClick={() => handleSearchResultStep(-1)} disabled={searchResultIds.length === 0}>↑</button>
        <button className="demo-btn demo-btn-secondary" onClick={() => handleSearchResultStep(1)} disabled={searchResultIds.length === 0}>↓</button>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {searchResultIds.length === 0 ? (searchQuery.trim() ? 'Совпадений нет' : 'Введите начало слова') : `${activeSearchResultIndex + 1} / ${searchResultIds.length}`}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Фильтры:</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={filterMode === 'hide'} onChange={(e) => setFilterMode(e.target.checked ? 'hide' : 'highlight')} style={{ cursor: 'pointer' }} />
          Скрывать несовпадающие
        </label>
        <button onClick={() => { setTaskFilter(undefined); setTaskFilterId(undefined); }} style={filterBtnStyle(!taskFilterId)}>Все</button>
        <button onClick={() => { setTaskFilter(() => withoutDeps()); setTaskFilterId('withoutDeps'); }} style={filterBtnStyle(taskFilterId === 'withoutDeps')}>Без зависимостей</button>
        <button onClick={() => { setTaskFilter(() => expired()); setTaskFilterId('expired'); }} style={filterBtnStyle(taskFilterId === 'expired', '#dc2626')}>Просроченные</button>
        <button onClick={() => { setTaskFilter(() => nameContains('Подготов')); setTaskFilterId('nameContains:Подготов'); }} style={filterBtnStyle()}>Содержит "Подготов"</button>
        <button onClick={() => { setTaskFilter(() => progressInRange(50, 100)); setTaskFilterId('progressInRange:50:100'); }} style={filterBtnStyle()}>Прогресс 50-100%</button>
        <button onClick={() => { setTaskFilter(() => inDateRange(new Date(Date.UTC(2026, 1, 1)), new Date(Date.UTC(2026, 1, 10)))); setTaskFilterId('inDateRange:2026-02-01:2026-02-10'); }} style={filterBtnStyle()}>1-10 февраля</button>
        <button onClick={() => { setTaskFilter(() => or(expired(), withoutDeps())); setTaskFilterId('or:expired:withoutDeps'); }} style={filterBtnStyle()}>Просроченные ИЛИ без зависимостей</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Масштаб:</span>
        <button onClick={() => setViewMode('day')} style={filterBtnStyle(viewMode === 'day')}>По дням</button>
        <button onClick={() => setViewMode('week')} style={filterBtnStyle(viewMode === 'week')}>По неделям</button>
        <button onClick={() => setViewMode('month')} style={filterBtnStyle(viewMode === 'month')}>По месяцам</button>
      </div>

      <div className="demo-chart-card">
        <GanttChart
          ref={ganttChartRef}
          tasks={tasks}
          taskFilter={taskFilter}
          dayWidth={viewMode === 'month' ? 2.5 : viewMode === 'week' ? 8 : 24}
          rowHeight={36}
          onTasksChange={handleChange}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onInsertAfter={handleInsertAfter}
          onReorder={handleReorder}
          containerHeight={"80dvh"}
          showTaskList={showTaskList}
          showChart={showChart}
          taskListWidth={600}
          disableTaskNameEditing={disableTaskNameEditing}
          highlightExpiredTasks={highlightExpired}
          viewMode={viewMode}
          businessDays={businessDays}
          customDays={MAIN_CHART_CUSTOM_DAYS}
          highlightedTaskIds={highlightedSearchTaskIds}
          disableTaskDrag={disableTaskDrag}
          filterMode={filterMode}
        />
      </div>
    </section>
  );
}
