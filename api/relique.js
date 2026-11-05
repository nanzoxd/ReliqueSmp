// Vercel function: proxies /relique/* to the Relique plugin API (plugin's "website" port).
// Works with no env vars (defaults below). Optional overrides in Vercel -> Settings -> Environment Variables: RELIQUE_API, RELIQUE_KEY
const DEFAULT_RELIQUE_API = 'http://ancientsmp.helixcloud.online:8766';
function pluginBase() {
  if (!process.env.RELIQUE_API && !(process.env.RELIQUE_HOST && process.env.RELIQUE_PORT)) return DEFAULT_RELIQUE_API;
  if (process.env.RELIQUE_API) return process.env.RELIQUE_API.replace(/\/+$/, '');
  if (process.env.RELIQUE_HOST && process.env.RELIQUE_PORT) return 'http://' + process.env.RELIQUE_HOST + ':' + process.env.RELIQUE_PORT;
  return '';
}

const kv = require('./_kv');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // Preferred: data the plugin pushes into the linked database (no open port needed).
  if (kv.enabled()) {
    const u0 = new URL(req.url, 'http://x');
    let p0 = u0.searchParams.get('path') || '';
    if (!p0 && u0.pathname.indexOf('/relique/') === 0) p0 = u0.pathname.slice('/relique/'.length);
    p0 = String(p0).replace(/^\/+/, '');
    if (!/^api\/[a-z0-9\/_-]*$/i.test(p0)) return res.status(404).json({ error: 'not found' });
    const q = [];
    u0.searchParams.forEach((v, k) => { if (k !== 'path' && k !== '_') q.push(k + '=' + v); });
    q.sort();
    const key = p0 + (q.length ? '?' + q.join('&') : '');
    try {
      const r = await kv.read([key]);
      if (!r.fresh) return res.status(502).json({ error: 'the Relique plugin is not reporting (server offline or website-sync not set up)' });
      if (r.values[0] == null) return res.status(404).json({ error: 'no data for ' + key });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(r.values[0]);
    } catch (e) {
      return res.status(502).json({ error: 'cannot read the data store', detail: String(e && e.message || e).slice(0, 120) });
    }
  }

  const BASE = pluginBase();
  if (!BASE) return res.status(500).json({ error: 'RELIQUE_API is not set in Vercel' });

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
