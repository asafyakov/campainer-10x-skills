import { listClients, readClientFile } from '../project.js';

export function clientsRoute(projectDir) {
  return (req, res) => {
    const clients = listClients(projectDir);
    const enriched = clients.map((c) => {
      // Read CLAUDE.md first 500 chars for summary
      const claude = readClientFile(projectDir, c.name, 'CLAUDE.md');
      const summary = claude ? claude.slice(0, 500) : '';
      return { ...c, summary };
    });
    res.json({ clients: enriched });
  };
}
