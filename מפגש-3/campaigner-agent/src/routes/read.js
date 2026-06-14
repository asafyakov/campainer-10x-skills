import { readClientFile } from '../project.js';

export function readRoute(projectDir) {
  return (req, res) => {
    // Express 5 safety — req.body may be undefined if no body parser matched
    const body = req.body || {};
    const { clientName, filename } = body;

    if (!clientName || !filename) {
      return res.status(400).json({ error: 'Missing clientName or filename' });
    }

    // Security: block path traversal
    if (filename.includes('..') || filename.startsWith('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const content = readClientFile(projectDir, clientName, filename);
    if (content === null) {
      return res.status(404).json({ error: `File not found: ${clientName}/${filename}` });
    }

    res.json({ content, clientName, filename });
  };
}
