"use client";

import { useState, useEffect, useCallback } from "react";
import { GanttChart, type Task } from "gantt-lib";

export default function MCPPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>MCP Test Page</h1>
        <p style={{ color: "#6b7280" }}>Loading tasks from tasks.json...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>MCP Test Page</h1>
        <p style={{ color: "#ef4444" }}>Error: {error}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>MCP Test Page</h1>
      <p style={{ marginBottom: "2rem", color: "#6b7280" }}>
        Gantt chart with tasks loaded from tasks.json
      </p>

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
