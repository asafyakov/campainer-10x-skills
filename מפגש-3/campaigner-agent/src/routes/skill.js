import { executeSkill, executeClaudeCode, streamClaudeCode } from '../executor.js';
import { listClients } from '../project.js';

function resolveClientFolder(clientName, projectDir) {
  if (!clientName) return null;
  const clients = listClients(projectDir);
  const match = clients.find((c) => c.name === clientName || c.name.includes(clientName));
  return match?.folder || null;
}

export function skillRoute(projectDir) {
  return async (req, res) => {
    const body = req.body || {};
    const { skill, clientName, prompt } = body;

    if (!skill && !prompt) {
      return res.status(400).json({ error: 'Missing "skill" or "prompt" field' });
    }

    const clientFolder = resolveClientFolder(clientName, projectDir);
    if (clientName && !clientFolder) {
      return res.status(404).json({ error: `Client "${clientName}" not found` });
    }

    const cwd = clientFolder || projectDir;

    try {
      let result;
      if (skill) {
        result = await executeSkill(skill, cwd, prompt || '', projectDir);
      } else {
        result = await executeClaudeCode(prompt, cwd);
      }

      res.json({
        success: result.success,
        output: result.output,
        error: result.error || null,
        client: clientName || null,
        skill: skill || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

/**
 * SSE streaming endpoint — sends real-time progress from Claude Code.
 *
 * Events sent to the client:
 *   data: {"type":"progress","data":"קורא: file.js"}\n\n
 *   data: {"type":"text","data":"partial output..."}\n\n
 *   data: {"type":"done","data":"full final output"}\n\n
 *   data: {"type":"error","data":"error message"}\n\n
 */
export function skillStreamRoute(projectDir) {
  // NOTE: Intentionally NOT async — Express 5 auto-awaits async handlers
  // and may finalize the response when the promise resolves. SSE needs
  // the connection to stay open, so we manage the promise manually.
  return (req, res) => {
    const body = req.body || {};
    const { clientName, prompt } = body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing "prompt" field' });
    }

    const clientFolder = resolveClientFolder(clientName, projectDir);
    const cwd = clientFolder || projectDir;

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Keep connection alive with a comment every 15s
    const keepAlive = setInterval(() => {
      try { res.write(': keepalive\n\n'); } catch { /* closed */ }
    }, 15000);

    const sendEvent = (type, data) => {
      try {
        res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
      } catch { /* connection may be closed */ }
    };

    sendEvent('progress', 'Agent מתחיל לעבוד...');

    // Handle client disconnect — use res.on('close') not req.on('close').
    // req 'close' fires when the request body is fully consumed (which
    // express.json() already did), NOT when the client disconnects.
    let aborted = false;
    res.on('close', () => { aborted = true; });

    // Run streaming — don't return the promise to Express
    streamClaudeCode(prompt, cwd, (event) => {
      if (aborted) return;
      if (event.type === 'progress' || event.type === 'text') {
        sendEvent(event.type, event.data);
      }
    }, { timeout: 180000 })
      .then((result) => {
        if (!aborted) sendEvent('done', result.output);
      })
      .catch((err) => {
        if (!aborted) sendEvent('error', err.message || 'Unknown error');
      })
      .finally(() => {
        clearInterval(keepAlive);
        if (!aborted) res.end();
      });
  };
}
