import { spawn, execSync } from 'child_process';
import { join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';

/**
 * Resolve the `claude` binary path.
 * Checks all common install locations so the agent works even when
 * the user's shell PATH doesn't include ~/.local/bin (common on Mac).
 */
function findClaudeBinary() {
  const home = homedir();
  const candidates = [
    'claude',                                         // In PATH
    join(home, '.local', 'bin', 'claude'),            // Standard npm global install (Mac/Linux)
    join(home, '.npm-global', 'bin', 'claude'),       // Custom npm prefix
    join(home, 'Library', 'pnpm', 'claude'),          // pnpm (Mac)
    join(home, '.pnpm', 'claude'),                    // pnpm (Linux)
    '/usr/local/bin/claude',                          // Homebrew / manual
    '/opt/homebrew/bin/claude',                       // Homebrew (Apple Silicon)
  ];
  for (const bin of candidates) {
    try {
      execSync(`"${bin}" --version`, { stdio: 'ignore' });
      return bin;
    } catch { /* not here */ }
  }
  // Nothing found — return best-guess path so spawn gives a clear error
  return join(home, '.local', 'bin', 'claude');
}

const CLAUDE_BIN = findClaudeBinary();

/** Exposed for /health so the dashboard can show which binary is in use */
export { CLAUDE_BIN };

/**
 * Execute a Claude Code command in a given working directory.
 *
 * Uses `claude` CLI in non-interactive mode with --print flag.
 * IMPORTANT: --print mode needs --dangerouslySkipPermissions to allow
 * tool use (Read, Edit, Bash, etc.) without interactive prompts.
 * Slash commands (/skill) don't work in --print mode — we send
 * text prompts that describe what to do instead.
 *
 * @param {string} prompt — The instruction to send to Claude Code
 * @param {string} cwd — Working directory (project root or client folder)
 * @param {object} opts — { timeout (ms) }
 * @returns {Promise<{ success: boolean, output: string, error?: string }>}
 */
export function executeClaudeCode(prompt, cwd, opts = {}) {
  return new Promise((resolvePromise) => {
    const args = [
      '--print',                        // Non-interactive: send prompt, get response, exit
      '--output-format', 'text',        // Plain text output
      '--dangerously-skip-permissions',   // Allow tool use without interactive prompts
      prompt,
    ];

    const proc = spawn(CLAUDE_BIN, args, {
      cwd,
      // No timeout — Claude Code knows when it's done. Let it run.
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ success: true, output: stdout.trim() });
      } else {
        resolvePromise({ success: false, output: stdout.trim(), error: stderr.trim() || `Exit code ${code}` });
      }
    });

    proc.on('error', (err) => {
      resolvePromise({ success: false, output: '', error: err.message });
    });
  });
}

/**
 * Execute a skill by name on a specific client.
 *
 * NOTE: Slash commands (/analytics etc.) don't work in --print mode.
 * Instead, we load the skill's SKILL.md content and inject it as context,
 * then send a natural-language prompt that triggers the same behavior.
 */
export function executeSkill(skillName, clientFolder, extraPrompt, projectDir) {
  // Build a rich prompt instead of a slash command
  const prompt = [
    `You are running the "${skillName}" skill.`,
    extraPrompt ? `User instructions: ${extraPrompt}` : '',
    `Read the CLAUDE.md in the current directory for client context.`,
    `Execute the skill fully and return the results.`,
  ].filter(Boolean).join('\n');

  const cwd = clientFolder || projectDir;

  return executeClaudeCode(prompt, cwd, { timeout: 180000 });
}

/**
 * Describe a tool use event in Hebrew for progress display.
 */
function describeToolUse(toolName, input) {
  switch (toolName) {
    case 'Read':       return `קורא: ${basename(input.file_path || '')}`;
    case 'Bash':       return `מריץ פקודה: ${(input.command || '').slice(0, 60)}`;
    case 'Grep':       return `מחפש: ${input.pattern || ''}`;
    case 'Glob':       return `סורק קבצים: ${input.pattern || ''}`;
    case 'Edit':       return `עורך: ${basename(input.file_path || '')}`;
    case 'Write':      return `כותב: ${basename(input.file_path || '')}`;
    case 'WebFetch':   return `מביא נתונים מהרשת...`;
    case 'WebSearch':  return `מחפש ברשת: ${(input.query || '').slice(0, 40)}`;
    case 'Skill':      return `מפעיל סקיל: ${input.skill || ''}`;
    case 'TodoWrite':  return `מעדכן משימות...`;
    default:           return `${toolName}...`;
  }
}

/** Extract just the file name from a path. */
function basename(p) {
  if (!p) return '';
  return p.split('/').pop() || p;
}

/**
 * Stream Claude Code output as real-time events.
 *
 * Uses `--print --verbose --output-format stream-json` which emits
 * one JSON object per line. The actual event types are:
 *
 *   {"type":"system","subtype":"init", ...}                          — init
 *   {"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","input":{...}}]}} — tool call
 *   {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}                    — text chunk
 *   {"type":"user","message":{"content":[{"type":"tool_result",...}]}}                           — tool result
 *   {"type":"result","subtype":"success","result":"...", ...}                                    — done
 *
 * @param {string} prompt
 * @param {string} cwd
 * @param {function} onEvent — called with { type, data } for each progress/text/done event
 * @param {object} opts — { timeout (ms) }
 * @returns {Promise<{ success: boolean, output: string, error?: string }>}
 */
export function streamClaudeCode(prompt, cwd, onEvent, opts = {}) {
  return new Promise((resolvePromise) => {
    const args = [
      '--print',
      '--verbose',                        // Required for stream-json in --print mode
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      prompt,
    ];

    const proc = spawn(CLAUDE_BIN, args, {
      cwd,
      // No timeout — let Claude Code run until it finishes naturally.
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let fullOutput = '';
    let buffer = '';

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      // Parse complete JSON lines (each line is a separate JSON object)
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);

          if (event.type === 'system' && event.subtype === 'init') {
            // Session started — optionally report
            onEvent({ type: 'progress', data: 'Claude Code מתחבר...' });
          }
          else if (event.type === 'assistant' && event.message?.content) {
            // Assistant message — may contain text, tool_use, or thinking blocks
            for (const block of event.message.content) {
              if (block.type === 'tool_use') {
                const desc = describeToolUse(block.name || '', block.input || {});
                onEvent({ type: 'progress', data: desc });
              }
              else if (block.type === 'text' && block.text) {
                fullOutput += block.text;
                onEvent({ type: 'text', data: block.text });
              }
              // Skip 'thinking' blocks — internal reasoning
            }
          }
          else if (event.type === 'user' && event.message?.content) {
            // Tool result — report completion
            for (const block of event.message.content) {
              if (block.type === 'tool_result') {
                onEvent({ type: 'progress', data: 'תוצאה התקבלה, ממשיך...' });
              }
            }
          }
          else if (event.type === 'result') {
            // Final result
            if (event.result) fullOutput = event.result;
          }
          // Skip rate_limit_event and other internal events
        } catch { /* not valid JSON — skip */ }
      }
    });

    proc.stderr.on('data', (data) => {
      // Log stderr for debugging but don't fail
      const msg = data.toString().trim();
      if (msg) onEvent({ type: 'stderr', data: msg });
    });

    proc.on('close', (code) => {
      resolvePromise({ success: code === 0, output: fullOutput.trim() });
    });

    proc.on('error', (err) => {
      resolvePromise({ success: false, output: '', error: err.message });
    });
  });
}
