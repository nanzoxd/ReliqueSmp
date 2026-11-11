// Live Open Graph tags for link-preview bots (Discord, Twitter, ...). Used by the rewrite in vercel.json.
const HOST = 'play.reliquesmp.fun';
const SITE = 'https://relique-smp.vercel.app';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

module.exports = async function handler(req, res) {
  let status = 'Offline';
  try {
    const r = await fetch('https://api.mcstatus.io/v2/status/java/' + encodeURIComponent(process.env.MC_STATUS_ADDR || HOST), {
      headers: { 'User-Agent': 'relique-embed' }
    });
    const d = await r.json();
    if (d && d.online && d.players) status = d.players.online + '/' + d.players.max;
  } catch (e) {}
  const title = 'ReliqueSmp | Semi Private';
  const desc = 'Concept × Stats × Events × Weapons\n\nIP — ' + HOST + '\nOnline — ' + status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  res.status(200).send('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
    '<meta name="theme-color" content="#050a18"><meta property="og:type" content="website">' +
    '<meta property="og:site_name" content="Relique SMP"><meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="' + SITE + '/">' +
    '<meta property="og:image" content="' + SITE + '/og-wide.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="500">' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + esc(title) + '">' +
    '<meta name="twitter:description" content="' + esc(desc) + '"><meta name="twitter:image" content="' + SITE + '/og-wide.png">' +
    '</head><body><a href="' + SITE + '/">' + esc(title) + '</a></body></html>');
};
