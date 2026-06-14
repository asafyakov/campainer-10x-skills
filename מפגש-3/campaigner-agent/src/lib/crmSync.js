/**
 * CRM Sync — pulls leads from any configured source and inserts to Supabase.
 *
 * Supported types (configured in client.json under "crm_sync"):
 *   rav_mesar   — Rav Mesar list by ID
 *   (more coming: monday, google_sheets, csv, etc.)
 *
 * Example config in client.json:
 * {
 *   "crm_sync": {
 *     "type": "rav_mesar",
 *     "list_id": 103567,
 *     "ref_field": "ref"
 *   }
 * }
 *
 * The agent tells you the result. Campaigns match by keyword in lead_source.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { syncGoogleSheets } from './connectors/googleSheets.js';

const RM_BASE = 'https://graph.responder.live/v2';
const RM_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 CampaignerAgent/1.0',
};

// ── Rav Mesar helpers ─────────────────────────────────────────────────────────

async function getRmJwt(clientId, clientSecret, userToken) {
  const res = await fetch(`${RM_BASE}/oauth/token`, {
    method: 'POST',
    headers: RM_HEADERS,
    body: JSON.stringify({
      grant_type: 'user_token',
      client_id: parseInt(clientId),
      client_secret: clientSecret,
      user_token: userToken,
    }),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`Rav Mesar auth failed: ${JSON.stringify(data)}`);
  return data.token;
}

async function fetchRmSubscribers(listId, jwt) {
  const res = await fetch(
    `${RM_BASE}/lists/${listId}/subscribers?limit=1000&page=1`,
    { headers: { ...RM_HEADERS, Authorization: `Bearer ${jwt}` } }
  );
  if (!res.ok) throw new Error(`Rav Mesar fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

function extractRmRef(subscriber, refField = 'ref') {
  const pf = subscriber.personal_fields || {};
  const fn = subscriber.fields_names || {};
  for (const [k, v] of Object.entries(fn)) {
    if (v === refField) {
      const val = (pf[k] || '').replace(/[\u200f\u200e]/g, '').trim();
      if (val) return val;
    }
  }
  return null;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function getExistingCrmIds(supabaseUrl, supabaseKey, clientName) {
  // Fetch all existing crm_lead_ids for this client to avoid duplicates.
  // Try both trimmed and original name to handle trailing-space folder names.
  const trimmed = clientName.trim();
  const names = trimmed === clientName ? [clientName] : [clientName, trimmed];
  const allIds = new Set();

  for (const name of names) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/crm_leads?client_name=eq.${encodeURIComponent(name)}&crm_lead_id=not.is.null&select=crm_lead_id&limit=10000`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (!res.ok) throw new Error(`Supabase fetch existing IDs failed: HTTP ${res.status}`);
    const rows = await res.json();
    rows.forEach((r) => allIds.add(r.crm_lead_id));
  }
  return allIds;
}

async function insertLeads(supabaseUrl, supabaseKey, rows) {
  if (!rows.length) return 0;
  const res = await fetch(`${supabaseUrl}/rest/v1/crm_leads`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase insert failed (HTTP ${res.status}): ${err.slice(0, 200)}`);
  }
  return rows.length;
}

// ── Sync strategies ───────────────────────────────────────────────────────────

async function syncRavMesar(client, clientJson, syncConfig, supabaseUrl, supabaseKey) {
  const rm = clientJson.connections?.rav_mesar;
  if (!rm?.client_id || !rm?.client_secret || !rm?.user_token) {
    throw new Error('Missing rav_mesar credentials in client.json (need client_id, client_secret, user_token)');
  }
  if (!syncConfig.list_id) {
    throw new Error('crm_sync.list_id is required for rav_mesar type');
  }

  const jwt = await getRmJwt(rm.client_id, rm.client_secret, rm.user_token);
  const subs = await fetchRmSubscribers(syncConfig.list_id, jwt);

  const existingIds = await getExistingCrmIds(supabaseUrl, supabaseKey, client.name);

  const now = new Date().toISOString();
  const listPrefix = `list${syncConfig.list_id}_`;
  const newRows = [];

  for (const s of subs) {
    const crmLeadId = `${listPrefix}${s.id}`;
    if (existingIds.has(crmLeadId)) continue;

    const ref = extractRmRef(s, syncConfig.ref_field || 'ref') || 'lead';
    let leadDate = (s.list_created || s.created || '').replace(' ', 'T');
    if (!leadDate || leadDate.startsWith('0000')) leadDate = now;
    else if (!leadDate.includes('+')) leadDate += '+00:00';

    newRows.push({
      user_id: null,
      client_id: clientJson.connections?.facebook_ads?.ad_account_id || client.name.trim(),
      client_name: client.name.trim(),
      lead_name: (s.name || '').trim(),
      lead_phone: s.phone || '',
      lead_email: s.email || '',
      lead_source: ref,
      lead_status: 'lead',
      lead_date: leadDate,
      revenue: 0,
      crm_type: 'rav_mesar',
      crm_lead_id: crmLeadId,
      updated_at: now,
    });
  }

  const synced = await insertLeads(supabaseUrl, supabaseKey, newRows);
  return { synced, total: subs.length, skipped: subs.length - newRows.length };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sync a single client's CRM to Supabase (incremental — only new records).
 * @param {{ name: string, folder: string }} client
 * @param {{ url: string, key: string }} supabaseConfig
 * @returns {{ synced: number, total: number, skipped: number, error: string|null }}
 */
export async function syncClientCrm(client, supabaseConfig) {
  const { url, key } = supabaseConfig;

  const clientJsonPath = join(client.folder, 'client.json');
  if (!existsSync(clientJsonPath)) {
    return { synced: 0, total: 0, skipped: 0, error: 'No client.json' };
  }

  let clientJson;
  try {
    clientJson = JSON.parse(readFileSync(clientJsonPath, 'utf-8'));
  } catch {
    return { synced: 0, total: 0, skipped: 0, error: 'Invalid client.json' };
  }

  const syncConfig = clientJson.crm_sync;
  if (!syncConfig?.type) {
    return { synced: 0, total: 0, skipped: 0, error: null }; // Not configured — skip silently
  }

  try {
    if (syncConfig.type === 'rav_mesar') {
      const result = await syncRavMesar(client, clientJson, syncConfig, url, key);
      return { ...result, error: null };
    }
    if (syncConfig.type === 'google_sheets') {
      const result = await syncGoogleSheets(client, clientJson, syncConfig, url, key, {
        getExistingCrmIds,
        insertLeads,
      });
      return { ...result, error: null };
    }
    return { synced: 0, total: 0, skipped: 0, error: `Unknown CRM type: ${syncConfig.type}` };
  } catch (err) {
    return { synced: 0, total: 0, skipped: 0, error: err.message };
  }
}

/**
 * Sync ALL clients that have crm_sync configured.
 * @param {Array} clients
 * @param {{ url: string, key: string }} supabaseConfig
 * @returns {Array}
 */
export async function syncAllClients(clients, supabaseConfig) {
  const results = [];
  for (const client of clients) {
    const result = await syncClientCrm(client, supabaseConfig);
    // Only include clients that had something to do
    if (result.error || result.synced > 0 || result.total > 0) {
      results.push({ client: client.name, ...result });
    }
  }
  return results;
}
