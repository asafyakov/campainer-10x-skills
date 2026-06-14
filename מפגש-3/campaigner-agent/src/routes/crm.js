import { executeClaudeCode } from '../executor.js';
import { listClients } from '../project.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export function crmRoute(projectDir) {
  return async (req, res) => {
    // Express 5 safety — req.body may be undefined if no body parser matched
    const body = req.body || {};
    const { clientName } = body;

    if (!clientName) {
      return res.status(400).json({ error: 'Missing clientName' });
    }

    // Find client
    const clients = listClients(projectDir);
    const match = clients.find((c) => c.name === clientName || c.name.includes(clientName));
    if (!match) {
      return res.status(404).json({ error: `Client "${clientName}" not found` });
    }

    // Check for crm_config.json
    const configPath = join(match.folder, 'crm_config.json');
    if (!existsSync(configPath)) {
      return res.status(404).json({ error: `No crm_config.json for "${clientName}"` });
    }

    const crmConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

    // Ask Claude Code to fetch CRM data using the config
    const prompt = `Read the file crm_config.json in the current directory.
Based on the CRM type ("${crmConfig.type}"), fetch the leads/contacts from the last 30 days.
Return ONLY a JSON array of leads, each with: { name, date, source, status, phone }.
If you can't connect, return { "error": "reason" }.
Do not explain, just return the JSON.`;

    try {
      const result = await executeClaudeCode(prompt, match.folder, { timeout: 60000 });

      res.json({
        success: result.success,
        clientName,
        crmType: crmConfig.type,
        data: result.output,
        error: result.error || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}
