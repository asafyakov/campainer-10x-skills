/**
 * CORS middleware — allows dashboard origins only.
 * Accepts localhost (dev) and the production Vercel domain.
 */
const ALLOWED_ORIGINS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^https:\/\/agency-dashboard-10x[a-z0-9-]*\.vercel\.app$/,
  /^https:\/\/campaigner10x[a-z0-9-]*\.vercel\.app$/,
];

let AGENT_SECRET = null;

/** Generate a secret token on startup. Dashboard must send it in X-Agent-Key header. */
export function initSecret() {
  AGENT_SECRET = crypto.randomUUID();
  return AGENT_SECRET;
}

export function corsMiddleware(req, res, next) {
  // Host validation — only accept requests to localhost/127.0.0.1
  const host = req.headers.host || '';
  if (!host.startsWith('localhost:') && !host.startsWith('127.0.0.1:')) {
    return res.status(403).json({ error: 'Forbidden: invalid host' });
  }

  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some((re) => re.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Agent-Key');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Secret token validation (skip for /health — dashboard uses it to discover the secret)
  if (req.path !== '/health' && AGENT_SECRET) {
    const key = req.headers['x-agent-key'];
    if (key !== AGENT_SECRET) {
      return res.status(401).json({ error: 'Unauthorized: invalid agent key' });
    }
  }

  next();
}
