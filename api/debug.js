// Temporary diagnostic: open https://YOUR-SITE/api/debug  (delete this file when done)
async function t(name, url) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json', 'User-Agent': 'relique-debug' } });
    const body = (await r.text()).slice(0, 300);
    return { name, url, status: r.status, body };
  } catch (e) {
    return { name, url, error: String(e && e.message || e), cause: String(e && e.cause && (e.cause.code || e.cause.message) || '') };
  } finally { clearTimeout(to); }
}
module.exports = async (req, res) => {
  const plugin = (process.env.RELIQUE_API || 'http://139.99.22.24:28435').replace(/\/+$/, '');
  const mc = process.env.MC_STATUS_ADDR || '139.99.22.24:21322';
  const out = await Promise.all([
    t('plugin /api/online', plugin + '/api/online'),
    t('plugin /api/stats', plugin + '/api/stats?sort=elo'),
    t('mcstatus ' + mc, 'https://api.mcstatus.io/v2/status/java/' + encodeURIComponent(mc)),
    t('mcstatus no-port', 'https://api.mcstatus.io/v2/status/java/139.99.22.24')
  ]);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(JSON.stringify({ env: { RELIQUE_API: process.env.RELIQUE_API || '(not set)', MC_STATUS_ADDR: process.env.MC_STATUS_ADDR || '(not set)' }, results: out }, null, 2));
};
