// Vercel serverless function: lets the site read MCTiers / SubTiers / PlayerDB from the browser.
// Called as  /api/tiers?url=<encoded https url>
const ALLOWED = ['mctiers.com', 'subtiers.net', 'playerdb.co'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const target = req.query && req.query.url;
  if (!target) return res.status(400).send('missing url');

  let u;
  try { u = new URL(target); } catch (e) { return res.status(400).send('bad url'); }
  if (u.protocol !== 'https:' || !ALLOWED.includes(u.hostname))
    return res.status(403).send('host not allowed');

  try {
    const r = await fetch(u.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'ReliqueSite/1.0' },
    });
    const body = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(r.status).send(body);
  } catch (e) {
    return res.status(502).send('upstream error');
  }
};
