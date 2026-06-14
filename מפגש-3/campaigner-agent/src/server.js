import express from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { corsMiddleware, initSecret } from './cors.js';
import { healthRoute } from './routes/health.js';
import { skillRoute, skillStreamRoute } from './routes/skill.js';
import { clientsRoute } from './routes/clients.js';
import { readRoute } from './routes/read.js';
import { crmRoute } from './routes/crm.js';
import { crmSyncRoute } from './routes/crmSyncRoute.js';
import { taskStartRoute, taskStartStreamRoute, taskStatusRoute, taskListRoute } from './routes/tasks.js';
import { syncAllClients } from './lib/crmSync.js';
import { listClients } from './project.js';

/**
 * Read Supabase config from env vars or dashboard .env file.
 * Priority: process.env → dashboard/.env → empty (sync disabled)
 */
function parseEnvFile(filePath) {
  try {
    const lines = readFileSync(filePath, 'utf-8').split('\n');
    const vars = {};
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) vars[m[1]] = m[2].trim();
    }
    return vars;
  } catch { return null; }
}

function loadDashboardEnv(projectDir) {
  // Search for .env containing Supabase config in likely locations:
  // 1. Direct subfolder named like "דשבורד סוכנות"
  // 2. Inside מוצרים/קמפיינר 10x/
  // 3. Any nested folder up to 3 levels deep
  const dashNames = ['דשבורד סוכנות ', 'דשבורד סוכנות', 'dashboard'];
  const pathPrefixes = ['', 'מוצרים/קמפיינר 10x/', 'מוצרים/קמפיינר 10x/'];

  for (const prefix of pathPrefixes) {
    for (const name of dashNames) {
      const envPath = join(projectDir, prefix, name, '.env');
      if (existsSync(envPath)) {
        const vars = parseEnvFile(envPath);
        if (vars?.VITE_SUPABASE_URL) return vars;
      }
    }
  }
  // Also try projectDir itself
  const direct = join(projectDir, '.env');
  if (existsSync(direct)) {
    const vars = parseEnvFile(direct);
    if (vars?.VITE_SUPABASE_URL) return vars;
  }
  return {};
}

let _dashboardEnv = null;
function getSupabaseConfig(projectDir) {
  if (!_dashboardEnv && projectDir) _dashboardEnv = loadDashboardEnv(projectDir);
  const env = _dashboardEnv || {};
  return {
    url: process.env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    // Service key for writes (bypasses RLS). Fall back to anon key (read-only).
    key: process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_ANON_KEY || '',
  };
}

/**
 * Schedule daily CRM sync at 06:00 Israel time (UTC+3).
 * Runs once at startup if overdue, then repeats every 24h.
 */
function scheduleDailyCrmSync(projectDir) {
  function msUntilNext6am() {
    const nowUtc = Date.now();
    const israelOffset = 3 * 60 * 60 * 1000;
    const israelNow = nowUtc + israelOffset;
    const d = new Date(israelNow);
    const next6am = new Date(d);
    next6am.setUTCHours(3, 0, 0, 0); // 06:00 Israel = 03:00 UTC
    if (next6am.getTime() <= israelNow) {
      next6am.setUTCDate(next6am.getUTCDate() + 1);
    }
    return next6am.getTime() - nowUtc;
  }

  async function runSync() {
    const config = getSupabaseConfig(projectDir);
    if (!config.url || !config.key) {
      console.log('  [CRM Sync] Skipped — no Supabase config found');
      return;
    }
    console.log('  [CRM Sync] Starting daily sync...');
    const clients = listClients(projectDir);
    const results = await syncAllClients(clients, config).catch((err) => {
      console.error('  [CRM Sync] Error:', err.message);
      return [];
    });
    const total = results.reduce((s, r) => s + (r.synced || 0), 0);
    const withErrors = results.filter((r) => r.error);
    console.log(`  [CRM Sync] Done — ${total} new leads synced across ${results.length} clients`);
    if (withErrors.length) {
      withErrors.forEach((r) => console.warn(`  [CRM Sync]   ⚠ ${r.client}: ${r.error}`));
    }
    // Schedule next run in 24h
    setTimeout(runSync, 24 * 60 * 60 * 1000);
  }

  const delay = msUntilNext6am();
  const nextRun = new Date(Date.now() + delay).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  console.log(`  CRM Sync: scheduled for ${nextRun} (Israel time)`);
  setTimeout(runSync, delay);
}

export function startServer(port, projectDir) {
  const app = express();
  const secret = initSecret();

  app.use(corsMiddleware);
  app.use(express.json({ limit: '5mb' }));

  // Routes
  app.get('/health', healthRoute(projectDir, secret));
  app.post('/skill', skillRoute(projectDir));
  app.post('/skill/stream', skillStreamRoute(projectDir));
  app.get('/clients', clientsRoute(projectDir));
  app.post('/read', readRoute(projectDir));
  app.post('/crm', crmRoute(projectDir));
  app.post('/crm/sync', crmSyncRoute(projectDir, () => getSupabaseConfig(projectDir)));

  // Background task queue (Phase G)
  app.post('/task/start', taskStartRoute(projectDir));
  app.post('/task/start-stream', taskStartStreamRoute(projectDir));
  app.get('/task/status/:id', taskStatusRoute());
  app.get('/tasks', taskListRoute());

  // Bind to 127.0.0.1 ONLY — prevents external network access
  app.listen(port, '127.0.0.1', () => {
    console.log(`  Agent listening on http://127.0.0.1:${port}`);
    console.log(`  Secret: ${secret}`);
    console.log(`  (Dashboard will auto-detect and use this secret)\n`);
    scheduleDailyCrmSync(projectDir);
  });

  return app;
}
