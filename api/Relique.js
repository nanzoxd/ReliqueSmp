// Vercel function: proxies /relique/* to the Relique plugin API (works even when a plain rewrite to a custom port fails).
// Default target is your plugin port; override in Vercel -> Settings -> Environment Variables with RELIQUE_API (and RELIQUE_KEY if you set api-key).
const BASE = (process.env.RELIQUE_API || 'http://r99-p.lordcloud.ovh:25551').replace(/\/+$/, '');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const path = String((req.query && req.query.path) || '').replace(/^\/+/, '');
  if (!/^api\/[a-z0-9\/_-]*$/i.test(path)) return res.status(404).json({ error: 'not found' });
  const qs = new URLSearchParams();
  Object.keys(req.query || {}).forEach(k => { if (k !== 'path') [].concat(req.query[k]).forEach(v => qs.append(k, v)); });
  const url = BASE + '/' + path + (qs.toString() ? '?' + qs.toString() : '');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const headers = { Accept: 'application/json' };
    if (process.env.RELIQUE_KEY) headers['X-Api-Key'] = process.env.RELIQUE_KEY;
    const r = await fetch(url, { headers, signal: ctl.signal });
    const body = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    return res.status(r.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: 'cannot reach the Relique API', detail: String(e && e.message || e).slice(0, 120) });
  } finally { clearTimeout(t); }
};
