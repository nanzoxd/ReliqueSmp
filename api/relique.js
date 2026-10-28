// Vercel function: proxies /relique/* to the Relique plugin API (plugin port 28435).
// Optional overrides in Vercel -> Settings -> Environment Variables: RELIQUE_API, RELIQUE_KEY
const BASE = (process.env.RELIQUE_API || 'http://139.99.22.24:28435').replace(/\/+$/, '');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // Work out the plugin path from the original URL (/relique/api/stats?sort=elo),
  // falling back to the rewritten ?path= value.
  const u = new URL(req.url, 'http://x');
  let path = u.searchParams.get('path') || '';
  if (!path && u.pathname.indexOf('/relique/') === 0) path = u.pathname.slice('/relique/'.length);
  path = String(path).replace(/^\/+/, '');
  if (!/^api\/[a-z0-9\/_-]*$/i.test(path)) return res.status(404).json({ error: 'not found' });

  const qs = new URLSearchParams();
  u.searchParams.forEach((v, k) => { if (k !== 'path') qs.append(k, v); });
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
