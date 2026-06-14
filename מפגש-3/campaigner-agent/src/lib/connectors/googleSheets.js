/**
 * Google Sheets CRM connector — agent-side (Node.js, runs in campaigner-agent).
 *
 * Fetches rows from a shared Google Sheet and inserts new leads into Supabase.
 * Requires the sheet to be "Anyone with the link can view" and a Google Cloud
 * API key with the Sheets API enabled.
 *
 * crm_sync config in client.json:
 * {
 *   "type": "google_sheets",
 *   "sheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
 *   "range": "Sheet1!A:F",            // tab name + column range, default "Sheet1!A:Z"
 *   "api_key": "AIzaSy...",           // Google Cloud API key
 *   "header_row": true,               // first row contains column headers
 *   "columns": {                      // map field → header name in the sheet
 *     "name":  "שם",
 *     "phone": "טלפון",
 *     "email": "אימייל",
 *     "ref":   "utm_campaign",        // the campaign-identifying column
 *     "date":  "תאריך"
 *   },
 *   "ref_format": "plain"             // "plain" (default) | "utm" (full utm string)
 * }
 */

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Fetch all rows from a Google Sheet via the Sheets API v4.
 * Returns a 2D array of string values.
 */
async function fetchSheetRows(sheetId, range, apiKey) {
  const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CampaignerAgent/1.0' },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Google Sheets fetch failed (HTTP ${res.status}): ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.values || [];
}

/**
 * Normalize the ref/utm column value to a clean campaign identifier.
 * - "plain" (default): use value as-is
 * - "utm": parse query string and extract utm_campaign value
 *   e.g. "utm_campaign=vesta&utm_source=facebook" → "vesta"
 *   Also handles full URLs: "https://...?utm_campaign=vesta&..." → "vesta"
 */
function normalizeRef(rawValue, refFormat = 'plain', utmParam = 'utm_campaign') {
  if (!rawValue) return '';
  const val = rawValue.trim();
  if (refFormat !== 'utm') return val;
  try {
    const qs = val.includes('?') ? val.split('?')[1] : val;
    return new URLSearchParams(qs).get(utmParam) || val;
  } catch {
    return val;
  }
}

/**
 * Sync a Google Sheets source for one client.
 * Incremental: only inserts leads not already in Supabase.
 *
 * @param {{ name: string, folder: string }} client
 * @param {object} clientJson — parsed client.json
 * @param {object} syncConfig — client.json crm_sync block
 * @param {string} supabaseUrl
 * @param {string} supabaseKey
 * @param {{ getExistingCrmIds: Function, insertLeads: Function }} helpers — shared from crmSync.js
 * @returns {{ synced: number, total: number, skipped: number }}
 */
export async function syncGoogleSheets(client, clientJson, syncConfig, supabaseUrl, supabaseKey, { getExistingCrmIds, insertLeads }) {
  const {
    sheet_id,
    range = 'Sheet1!A:Z',
    api_key,
    header_row = true,
    columns = {},
    ref_format = 'plain',
    utm_param = 'utm_campaign',
  } = syncConfig;

  if (!sheet_id) throw new Error('crm_sync.sheet_id is required for google_sheets type');
  if (!api_key)  throw new Error('crm_sync.api_key is required for google_sheets type');

  const rows = await fetchSheetRows(sheet_id, range, api_key);
  if (!rows.length) return { synced: 0, total: 0, skipped: 0 };

  // Build header→column-index map from first row
  let dataRows = rows;
  const headerIndex = {};
  if (header_row && rows.length > 0) {
    rows[0].forEach((h, i) => { headerIndex[(h || '').trim()] = i; });
    dataRows = rows.slice(1);
  }

  function getCol(row, colName) {
    if (!colName) return '';
    if (typeof colName === 'number') return (row[colName] || '').trim();
    const idx = headerIndex[colName];
    return idx != null ? (row[idx] || '').trim() : '';
  }

  const existingIds = await getExistingCrmIds(supabaseUrl, supabaseKey, client.name);
  const now = new Date().toISOString();
  // Use last 8 chars of sheet_id as stable prefix (sheet IDs are 44-char strings)
  const sheetPrefix = `sheet_${sheet_id.slice(-8)}_`;
  const newRows = [];

  dataRows.forEach((row, idx) => {
    const leadName  = getCol(row, columns.name);
    const leadPhone = getCol(row, columns.phone).replace(/\D/g, '');
    const leadEmail = getCol(row, columns.email);
    const rawRef    = getCol(row, columns.ref);
    const rawDate   = getCol(row, columns.date);

    // Skip completely empty rows
    if (!leadName && !leadPhone) return;

    // Stable ID: prefer phone digits (stable across re-runs), fall back to row index
    const stableId  = leadPhone || String(idx);
    const crmLeadId = `${sheetPrefix}${stableId}`;
    if (existingIds.has(crmLeadId)) return;

    const leadSource = normalizeRef(rawRef, ref_format, utm_param);

    // Parse and normalize date
    let leadDate = rawDate || now;
    if (leadDate && !leadDate.includes('T')) leadDate = leadDate.replace(' ', 'T');
    if (leadDate && !leadDate.includes('+') && !leadDate.endsWith('Z')) leadDate += '+00:00';

    newRows.push({
      user_id:    null,
      client_id:  clientJson.connections?.facebook_ads?.ad_account_id || client.name.trim(),
      client_name: client.name.trim(),
      lead_name:  leadName,
      lead_phone: leadPhone,
      lead_email: leadEmail,
      lead_source: leadSource || 'lead',
      lead_status: 'lead',
      lead_date:  leadDate,
      revenue:    0,
      crm_type:   'google_sheets',
      crm_lead_id: crmLeadId,
      updated_at: now,
    });
  });

  const synced = await insertLeads(supabaseUrl, supabaseKey, newRows);
  return { synced, total: dataRows.length, skipped: dataRows.length - newRows.length };
}
