import { listClients } from '../project.js';
import { CLAUDE_BIN } from '../executor.js';
import { execSync } from 'child_process';

function getClaudeVersion() {
  try {
    return execSync(`"${CLAUDE_BIN}" --version`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

export function healthRoute(projectDir, secret) {
  return (req, res) => {
    const clients = listClients(projectDir);
    const claudeVersion = getClaudeVersion();
    res.json({
      status: 'ok',
      version: '0.1.0',
      secret,
      projectDir,
      clientCount: clients.length,
      clients: clients.map((c) => ({ name: c.name, folder: c.folder })),
      claude: {
        bin: CLAUDE_BIN,
        version: claudeVersion,
        ready: claudeVersion !== null,
      },
      timestamp: new Date().toISOString(),
    });
  };
}
