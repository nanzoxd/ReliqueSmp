// Vercel function: GET /api/discord-status?key=SECRET[&setup=1]
// Posts / edits a Discord "Components V2" status card (container + separators) through a webhook.
//
// Vercel -> Settings -> Environment Variables:
//   DISCORD_WEBHOOK_URL  = https://discord.com/api/webhooks/<id>/<token>
//   STATUS_SECRET        = any long random string (protects this endpoint)
//   DISCORD_MESSAGE_ID   = (set after the first run, see below)
//   MC_STATUS_ADDR       = optional, address to ping (defaults to the public IP below)
//
// 1) Open  /api/discord-status?key=SECRET&setup=1  once -> posts the card and returns its message id.
// 2) Put that id in DISCORD_MESSAGE_ID and redeploy.
// 3) Call  /api/discord-status?key=SECRET  every minute (cron-job.org or Vercel Cron) -> the card edits itself.

const kv = require('./_kv');

const DISPLAY_IP = 'play.reliquesmp.fun';
const SITE = 'https://relique-smp.vercel.app';
const ACCENT = 0x3b82f6;

async function getStatus() {
  if (kv.enabled()) {
    try {
      const r = await kv.read(['status']);
      if (r.fresh && r.values[0]) {
        const d = typeof r.values[0] === 'string' ? JSON.parse(r.values[0]) : r.values[0];
        return { online: !!d.online, now: d.players ? d.players.online : 0, max: d.players ? d.players.max : 0 };
      }
    } catch (e) { /* fall back to ping */ }
  }
  try {
    const addr = process.env.MC_STATUS_ADDR || DISPLAY_IP;
    const r = await fetch('https://api.mcstatus.io/v2/status/java/' + encodeURIComponent(addr), {
      headers: { 'User-Agent': 'relique-discord-status' }
    });
    const d = await r.json();
    return { online: !!d.online, now: d.players ? d.players.online : 0, max: d.players ? d.players.max : 0 };
  } catch (e) {
    return { online: false, now: 0, max: 0 };
  }
}

function buildPayload(s) {
  const unix = Math.floor(Date.now() / 1000);
  const onlineLine = s.online
    ? '**Online** — ● ' + s.now + '/' + s.max
    : '**Online** — ○ Server offline';
  return {
    flags: 1 << 15, // IS_COMPONENTS_V2
    components: [{
      type: 17, // Container
      accent_color: ACCENT,
      components: [
        { type: 12, items: [{ media: { url: SITE + '/og-wide.png' } }] }, // banner
        { type: 10, content: '## ReliqueSmp | Semi Private\nConcept × Stats × Events × Weapons' },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: '**IP** — `' + DISPLAY_IP + '`' },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: onlineLine },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: '-# Updated <t:' + unix + ':R> • ' + SITE.replace('https://', '') }
      ]
    }]
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const q = new URL(req.url, 'http://x').searchParams;
  if (!process.env.STATUS_SECRET || q.get('key') !== process.env.STATUS_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const hook = (process.env.DISCORD_WEBHOOK_URL || '').replace(/\/+$/, '');
  if (!hook) return res.status(500).json({ error: 'DISCORD_WEBHOOK_URL is not set' });

  const payload = buildPayload(await getStatus());
  const msgId = process.env.DISCORD_MESSAGE_ID;

  try {
    let r;
    if (q.get('setup') === '1') {
      r = await fetch(hook + '?wait=true&with_components=true', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: 'discord', detail: d });
      return res.status(200).json({ ok: true, message_id: d.id, next: 'Set DISCORD_MESSAGE_ID to this value and redeploy.' });
    }
    if (!msgId) return res.status(400).json({ error: 'DISCORD_MESSAGE_ID not set. Run once with &setup=1 first.' });
    r = await fetch(hook + '/messages/' + msgId + '?with_components=true', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!r.ok) return res.status(502).json({ error: 'discord', status: r.status, detail: await r.text() });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'request failed' });
  }
};
