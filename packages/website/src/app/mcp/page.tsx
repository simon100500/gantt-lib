"use client";

import { useState, useEffect, useCallback } from "react";
import { GanttChart, type Task } from "gantt-lib";

export default function MCPPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTaskList, setShowTaskList] = useState(false);

  useEffect(() => {
    fetch("/tasks.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch tasks: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data: Task[]) => {
        setTasks(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      });
  }, []);

  const handleChange = useCallback(
    (updated: Task[] | ((t: Task[]) => Task[])) =>
      setTasks(typeof updated === "function" ? updated : () => updated),
    [],
  );

  const handleAdd = useCallback((task: Task) => {
    setTasks(prev => [...prev, task]);
  }, []);

  if (loading) {
    return (
      <main style={{ padding: "0rem" }}>
        <h1>ИИ строит график</h1>
        <p style={{ color: "#6b7280" }}>Loading tasks from tasks.json...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: "0rem" }}>
        <h1>ИИ строит график</h1>
        <p style={{ color: "#ef4444" }}>Error: {error}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "0rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>ИИ строит график</h1>
      <p style={{ marginBottom: "2rem", color: "#6b7280" }}>
        График загружается из tasks.json
      </p>

      <button
        onClick={() => setShowTaskList(!showTaskList)}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: showTaskList ? "#ef4444" : "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginBottom: "1rem",
        }}
      >
        {showTaskList ? "Hide Task List" : "Show Task List"}
      </button>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "1rem",
        }}
      >
        <GanttChart
          tasks={tasks}
          dayWidth={24}
          rowHeight={36}
          onChange={handleChange}
          onAdd={handleAdd}
          showTaskList={showTaskList}
        />
      </div>

      <div style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
        <p>Tasks loaded: {tasks.length}</p>
        <p style={{ marginTop: "0.5rem" }}>
          Source: <code>/tasks.json</code>
        </p>
      </div>
    </main>
  );
}
