/**
 * Background task queue — allows multiple Claude Code tasks to run in parallel.
 * Dashboard sends tasks, gets immediate response, polls for results.
 *
 * Two modes:
 *   POST /task/start       — non-streaming (uses executeClaudeCode)
 *   POST /task/start-stream — streaming with progress (uses streamClaudeCode)
 *
 * Both share the same task store and status/list endpoints.
 */
import { executeClaudeCode, streamClaudeCode } from '../executor.js';
import { listClients } from '../project.js';
import crypto from 'crypto';

// In-memory task store
const tasks = new Map();

function resolveClientFolder(clientName, projectDir) {
  if (!clientName) return null;
  const clients = listClients(projectDir);
  const match = clients.find((c) => c.name === clientName || c.name.includes(clientName));
  return match?.folder || null;
}

/**
 * Create a new task entry with all required fields.
 */
function createTask(prompt, clientName, label) {
  const taskId = crypto.randomUUID().slice(0, 8);
  const task = {
    id: taskId,
    label: label || prompt.slice(0, 50),
    clientName: clientName || null,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    output: null,
    error: null,
    // Streaming fields
    progress: null,         // Latest progress message (Hebrew)
    progressLog: [],        // Last N progress messages for history
  };
  tasks.set(taskId, task);
  return task;
}

/**
 * POST /task/start — Start a background task (non-streaming).
 * Returns immediately with taskId.
 */
export function taskStartRoute(projectDir) {
  return (req, res) => {
    const body = req.body || {};
    const { prompt, clientName, label } = body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing "prompt" field' });
    }

    const clientFolder = resolveClientFolder(clientName, projectDir);
    const cwd = clientFolder || projectDir;
    const task = createTask(prompt, clientName, label);

    // Run in background — don't await
    executeClaudeCode(prompt, cwd, { timeout: 180000 })
      .then((result) => {
        task.status = result.success ? 'done' : 'error';
        task.output = result.output;
        task.error = result.error || null;
        task.completedAt = new Date().toISOString();
      })
      .catch((err) => {
        task.status = 'error';
        task.error = err.message;
        task.completedAt = new Date().toISOString();
      });

    // Return immediately
    res.json({ taskId: task.id, status: 'running', label: task.label });
  };
}

/**
 * POST /task/start-stream — Start a background task WITH streaming progress.
 *
 * Uses streamClaudeCode() to get real-time events from Claude Code.
 * Progress is stored on the task object so the dashboard can poll
 * GET /task/status/:id and see `progress` + `progressLog`.
 */
export function taskStartStreamRoute(projectDir) {
  return (req, res) => {
    const body = req.body || {};
    const { prompt, clientName, label } = body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing "prompt" field' });
    }

    const clientFolder = resolveClientFolder(clientName, projectDir);
    const cwd = clientFolder || projectDir;
    const task = createTask(prompt, clientName, label);

    const MAX_LOG = 30; // Keep last N progress entries

    // Run streaming in background — don't await
    streamClaudeCode(prompt, cwd, (event) => {
      if (event.type === 'progress') {
        task.progress = event.data;
        task.progressLog.push({
          time: new Date().toISOString(),
          message: event.data,
        });
        // Trim log to last MAX_LOG entries
        if (task.progressLog.length > MAX_LOG) {
          task.progressLog = task.progressLog.slice(-MAX_LOG);
        }
      }
      else if (event.type === 'text') {
        // Accumulate partial text — latest snippet as progress
        const snippet = event.data.slice(0, 80);
        if (snippet.trim()) {
          task.progress = `כותב: ${snippet}${event.data.length > 80 ? '...' : ''}`;
        }
      }
    }, { timeout: 180000 })
      .then((result) => {
        task.status = result.success ? 'done' : 'error';
        task.output = result.output;
        task.error = result.error || null;
        task.completedAt = new Date().toISOString();
        task.progress = result.success ? 'הושלם' : 'נכשל';
      })
      .catch((err) => {
        task.status = 'error';
        task.error = err.message;
        task.completedAt = new Date().toISOString();
        task.progress = `שגיאה: ${err.message}`;
      });

    // Return immediately
    res.json({ taskId: task.id, status: 'running', label: task.label });
  };
}

/**
 * GET /task/status/:id — Check status of a specific task.
 * Returns the task with latest progress message.
 */
export function taskStatusRoute() {
  return (req, res) => {
    const { id } = req.params;
    const task = tasks.get(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  };
}

/**
 * GET /tasks — List all tasks (active + recent completed).
 */
export function taskListRoute() {
  return (req, res) => {
    const all = Array.from(tasks.values())
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, 20); // Keep last 20

    const running = all.filter((t) => t.status === 'running').length;
    const done = all.filter((t) => t.status === 'done').length;

    res.json({ running, done, tasks: all });
  };
}

/**
 * Clean up old tasks (keep last 50)
 */
setInterval(() => {
  if (tasks.size > 50) {
    const sorted = Array.from(tasks.entries())
      .sort((a, b) => new Date(b[1].startedAt) - new Date(a[1].startedAt));
    sorted.slice(50).forEach(([id]) => tasks.delete(id));
  }
}, 60000);
