/* ==========================================================
   RELIQUE HOME VIDEOS  (the "Watch Relique SMP" row at the end of Home)

   HOW TO ADD A VIDEO
   1. Open YouTube and copy the video link.
   2. Paste it between the quotes of the next empty number below.
      Any of these link styles work:
        'https://www.youtube.com/watch?v=VIDEO_ID'
        'https://youtu.be/VIDEO_ID'
        'https://www.youtube.com/shorts/VIDEO_ID'
        'VIDEO_ID'   (just the 11-character id)
   3. Want a caption under a video? Replace the '' with:
        { url: 'https://youtu.be/VIDEO_ID', title: 'My caption' }
   4. Save the file. Empty slots are skipped, and the order of the
      numbers is the order on the site.
   ========================================================== */

window.RELIQUE_VIDEOS = {
  title: 'Watch Relique SMP',
  subtitle: 'Videos and highlights from the server.',

  videos: [
    /* 1  */ 'https://youtu.be/s6naKooW18g?si=jV1pmJ4g_kj7jl8_',
    /* 2  */ '',
    /* 3  */ '',
    /* 4  */ '',
    /* 5  */ '',
    /* 6  */ '',
    /* 7  */ '',
    /* 8  */ '',
    /* 9  */ '',
    /* 10 */ ''
  ]
};


/* ----------------------------------------------------------
   Below this line: the code that builds the row. No need to edit.
   ---------------------------------------------------------- */
(function () {
  var cfg = window.RELIQUE_VIDEOS || {};
  var root = document.getElementById('hx-videos');
  if (!root) return;

  function parseId(u) {
    u = String(u || '').trim();
    if (/^[\w-]{11}$/.test(u)) return u;
    var m = u.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/|\/v\/)([\w-]{11})/);
    return m ? m[1] : '';
  }

  var items = (cfg.videos || []).map(function (v) {
    var o = typeof v === 'string' ? { url: v } : (v || {});
    return { id: parseId(o.url || o.id), title: o.title || '' };
  }).filter(function (v) { return v.id; });

  if (!items.length) return;                       /* nothing to show: row stays hidden */

  /* ---- styles (kept here so this file is self-contained) ---- */
  var css = '' +
    '#hx-videos .vd-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:6px}' +
    '#hx-videos .vd-grid{list-style:none;margin:22px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:22px}' +
    '#hx-videos .vd-tile{margin:0;min-width:0}' +
    '#hx-videos [hidden]{display:none!important}' +
    '.vd-card{position:relative;display:block;width:100%;aspect-ratio:16/9;padding:0;border:1px solid var(--cd-edge,rgba(150,208,255,.22));border-radius:22px;overflow:hidden;background:#050a18 center/cover no-repeat;cursor:pointer;color:#fff;box-shadow:0 24px 50px -28px rgba(0,0,0,.8)}' +
    '.vd-card:focus-visible{outline:2px solid var(--glow,#7fd0ff);outline-offset:3px}' +
    '.vd-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(2,6,16,.7));pointer-events:none}' +
    '.vd-play{position:absolute;left:50%;top:50%;z-index:1;width:68px;height:48px;margin:-24px 0 0 -34px;border-radius:14px;background:#f00;display:grid;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,.45);transition:transform .2s}' +
    '.vd-play svg{width:22px;height:22px;fill:#fff;margin-left:2px}' +
    '.vd-card:hover .vd-play{transform:scale(1.08)}' +
    '.vd-cap{position:absolute;left:16px;right:16px;bottom:12px;z-index:1;text-align:left;font:600 14px/1.3 var(--font-b,system-ui);text-shadow:0 1px 6px rgba(0,0,0,.8)}' +
    '.vd-frame{display:block;width:100%;aspect-ratio:16/9;border:1px solid var(--cd-edge,rgba(150,208,255,.22));border-radius:22px;background:#000}' +
    '@media (prefers-reduced-motion:reduce){.vd-play{transition:none}}';
  var st = document.createElement('style');
  st.id = 'rq-videos-css';
  st.textContent = css;
  document.head.appendChild(st);

  /* ---- heading ---- */
  var h = root.querySelector('#hx-videos-h'), sub = root.querySelector('.hx-sub');
  if (cfg.title) h.textContent = cfg.title;
  if (cfg.subtitle) sub.textContent = cfg.subtitle; else sub.hidden = true;
  
  /* ---- slides ---- */
  var track = root.querySelector('.vd-grid');
  var NS = 'http://www.w3.org/2000/svg';
  items.forEach(function (v, i) {
    var li = document.createElement('li');
    li.className = 'vd-tile';

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'vd-card';
    b.setAttribute('aria-label', 'Play video ' + (i + 1) + (v.title ? ': ' + v.title : ''));
    b.style.backgroundImage = 'url(https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg)';

    var play = document.createElement('span');
    play.className = 'vd-play';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M8 5v14l11-7z');
    svg.appendChild(p);
    play.appendChild(svg);
    b.appendChild(play);

    if (v.title) {
      var cap = document.createElement('span');
      cap.className = 'vd-cap';
      cap.textContent = v.title;
      b.appendChild(cap);
    }

    /* click swaps the thumbnail for the real player (nothing loads from YouTube until then) */
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.className = 'vd-frame';
      f.src = 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&rel=0';
      f.title = v.title || 'Relique SMP video ' + (i + 1);
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      li.replaceChild(f, b);
      f.focus();
    });

    li.appendChild(b);
    track.appendChild(li);
  });

  root.hidden = false;
  var rl = document.getElementById('rqVideosLink');
  if (rl) rl.hidden = false;
})();
