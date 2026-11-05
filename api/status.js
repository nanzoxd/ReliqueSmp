// Vercel serverless function: GET /api/status
// Checks the Minecraft server from the server side, so the real address never reaches visitors.
//
// Set the address in Vercel -> Project -> Settings -> Environment Variables:
//   MC_STATUS_ADDR = <ip>:<port>
// (Don't hard-code it here if your GitHub repo is public.)

const kv = require('./_kv');

module.exports = async function handler(req, res) {
  // If the plugin is linked and reporting, trust it: it knows exactly who is online.
  if (kv.enabled()) {
    try {
      const r = await kv.read(['status']);
      if (r.fresh && r.values[0]) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(200).send(r.values[0]);
      }
    } catch (e) { /* fall through to the ping below */ }
  }
  const addr = process.env.MC_STATUS_ADDR || 'ancientsmp.helixcloud.online:19132';
  res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=40');

  try {
    const r = await fetch('https://api.mcstatus.io/v2/status/java/' + encodeURIComponent(addr), {
      headers: { 'User-Agent': 'relique-site-status' }
    });
    if (!r.ok) throw new Error('upstream ' + r.status);
    const d = await r.json();
    // Only send back what the page needs. No host, no port, no IP.
    return res.status(200).json({
      online: !!d.online,
      players: { online: d.players ? d.players.online : 0, max: d.players ? d.players.max : 0 },
      motd: d.motd && d.motd.clean ? String(d.motd.clean) : '',
      icon: d.icon || ''
    });
  } catch (e) {
    return res.status(502).json({ error: 'status check failed' });
  }
};
