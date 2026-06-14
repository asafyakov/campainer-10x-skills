import { syncClientCrm, syncAllClients } from '../lib/crmSync.js';
import { listClients } from '../project.js';

/**
 * POST /crm/sync
 * Body: { clientName?: string }
 * - No clientName → sync ALL clients
 * - With clientName → sync that client only
 */
export function crmSyncRoute(projectDir, getSupabaseConfig) {
  return async (req, res) => {
    const config = getSupabaseConfig();
    if (!config.url || !config.key) {
      return res.status(500).json({
        error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.',
      });
    }

    const { clientName } = req.body || {};
    const clients = listClients(projectDir);

    try {
      if (clientName) {
        const client = clients.find(
          (c) => c.name === clientName || c.name.toLowerCase().includes(clientName.toLowerCase())
        );
        if (!client) {
          return res.status(404).json({ error: `Client "${clientName}" not found` });
        }
        const result = await syncClientCrm(client, config);
        return res.json({ results: [{ client: client.name, ...result }] });
      }

      const results = await syncAllClients(clients, config);
      const totalSynced = results.reduce((s, r) => s + (r.synced || 0), 0);
      return res.json({ results, totalSynced });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
}
