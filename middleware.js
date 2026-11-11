// Vercel Routing Middleware: runs BEFORE static files, so bots hitting "/" get the live embed page.
// Normal visitors pass straight through to index.html.
export const config = { matcher: '/' };

const BOTS = /Discordbot|Twitterbot|facebookexternalhit|Slackbot|TelegramBot|WhatsApp|LinkedInBot/i;

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (BOTS.test(ua)) {
    const dest = new URL('/api/embed', request.url);
    return new Response(null, { headers: { 'x-middleware-rewrite': dest.toString() } });
  }
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}
