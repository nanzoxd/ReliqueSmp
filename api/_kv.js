// Reads the data the Relique plugin pushes into the Upstash Redis database (see website-sync in the plugin's config.yml).
// Vercel adds these variables itself when you connect an Upstash/KV database to the project.
const URL_ = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
const PREFIX = 'relique:';
const FRESH_MS = 120000;           // plugin must have reported within the last 2 minutes
const cache = new Map();           // tiny per-instance cache so busy sites don't hammer the database

exports.enabled = () => !!(URL_ && TOKEN);

// Returns { fresh: boolean, values: [string|null, ...] } for the given keys (without prefix).
exports.read = async function read(keys) {
  const ck = keys.join('|');
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.t < 8000) return hit.v;
  const path = ['heartbeat'].concat(keys).map(k => encodeURIComponent(PREFIX + k)).join('/');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(URL_ + '/mget/' + path, { headers: { Authorization: 'Bearer ' + TOKEN }, signal: ctl.signal });
    if (!r.ok) throw new Error('database ' + r.status);
    const d = await r.json();
    const arr = Array.isArray(d.result) ? d.result : [];
    const hb = Number(arr[0] || 0);
    const v = { fresh: !!hb && Date.now() - hb < FRESH_MS, values: arr.slice(1) };
    cache.set(ck, { t: Date.now(), v });
    return v;
  } finally { clearTimeout(t); }
};
