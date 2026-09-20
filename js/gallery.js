/* ==========================================================
   gallery.js: the auto-updating Instagram gallery.

   Order of play:
     1. Show the last good feed from this browser's cache (if any),
        otherwise stand-in brick-bond artwork, so the grid is never empty.
     2. Fetch the live feed (config.js > feed.url). Success = replace tiles.
     3. No feed URL? Try gallery.json (manual posts) instead.
     4. While the page stays open, re-check every few minutes.

   The feed normaliser accepts Behold.so JSON, Instagram Graph API JSON
   (direct or via the Cloudflare Worker), or a plain array of
   { permalink, image, caption }.
   ========================================================== */
(function () {
  'use strict';
  var CFG = window.BRICKSLAYERS || {};
  var FEED = CFG.feed || {};
  var IG = CFG.instagram || 'brick_slayersnz';
  var PROFILE = 'https://www.instagram.com/' + IG + '/';
  var MAX = Math.max(1, FEED.maxPosts || 12);
  var CACHE_KEY = 'bs_feed_v1';
  var J = window.Jiggle;

  var grid = document.getElementById('grid');
  var statusEl = document.getElementById('feed-status');
  if (!grid) return;

  /* ---------- helpers ---------- */
  function safeUrl(u) {
    if (typeof u !== 'string' || !u) return '';
    if (/^(https?:)?\/\//i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '';   // javascript:, data:, etc.
    return u;                                          // relative path
  }
  function txt(s) { return typeof s === 'string' ? s : ''; }
  function firstLine(s, n) {
    s = txt(s).replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    if (isNaN(d)) return '';
    try { return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
  }
  function store(get, val) {
    try {
      if (get) return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      localStorage.setItem(CACHE_KEY, JSON.stringify(val));
    } catch (e) { /* private mode etc. */ }
    return null;
  }

  /* ---------- normalise any supported feed shape ---------- */
  function normalise(json) {
    var arr = Array.isArray(json) ? json : (json && (json.posts || json.data || json.items || json.media)) || [];
    if (!Array.isArray(arr)) return [];
    var out = [];
    arr.forEach(function (p) {
      if (!p || typeof p !== 'object') return;
      var type = txt(p.mediaType || p.media_type || p.type || 'IMAGE').toUpperCase();
      var sizes = p.sizes || {};
      function sz(k) { return sizes[k] && (sizes[k].mediaUrl || sizes[k].url); }
      var video = type === 'VIDEO';
      var thumb = sz('medium') || sz('small') || sz('large') || p.thumbnailUrl || p.thumbnail_url ||
                  (video ? '' : (p.mediaUrl || p.media_url || p.image || p.src || p.url));
      var big = sz('large') || sz('full') || sz('medium') || p.thumbnailUrl || p.thumbnail_url ||
                (video ? '' : (p.mediaUrl || p.media_url || p.image || p.src || p.url)) || thumb;
      thumb = safeUrl(thumb); big = safeUrl(big) || thumb;
      if (!thumb) return;
      var link = safeUrl(p.permalink || p.link || '');
      out.push({
        id: String(p.id || link || thumb),
        permalink: /^https?:/i.test(link) ? link : PROFILE,
        thumb: thumb, big: big,
        caption: txt(p.caption || p.prunedCaption || p.text || ''),
        ts: p.timestamp || p.date || '',
        video: video
      });
    });
    return out.slice(0, MAX);
  }

  /* ---------- stand-in art: real brick bond patterns ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var PAL = {
    brick:  { b: ['#c23b22', '#a82f1a', '#d24c30', '#8f2714'], m: '#f2f2eb' },
    char:   { b: ['#2a2624', '#3a3431', '#1c1917', '#4a423d'], m: '#f2f2eb' },
    hazard: { b: ['#ffe500', '#ffd000', '#fff066', '#f2c800'], m: '#0d0b0a' },
    clay:   { b: ['#d9773f', '#c4622d', '#e08a52', '#b5541f'], m: '#0d0b0a' },
    cream:  { b: ['#f2f2eb', '#e2dccb', '#d3ccb7', '#ece6d6'], m: '#c23b22' },
    night:  { b: ['#c23b22', '#a82f1a', '#d24c30', '#ffe500'], m: '#0d0b0a' }
  };
  function bondSVG(type, pal, seed) {
    var R = rng(seed), P = PAL[pal], out = [];
    function brick(x, y, w, h, rot) {
      var c = P.b[(R() * P.b.length) | 0];
      out.push('<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w + '" height="' + h + '" rx="2" fill="' + c +
        '" stroke="#0d0b0a" stroke-width="2.5"' + (rot ? ' transform="rotate(' + rot.toFixed(1) + ' ' + (x + w / 2).toFixed(1) + ' ' + (y + h / 2).toFixed(1) + ')"' : '') + '/>');
    }
    var r, x, i, j;
    if (type === 'stretcher' || type === 'stack' || type === 'header') {
      var bw = type === 'header' ? 44 : 88, step = bw + 4;
      for (r = 0; r < 14; r++) for (x = -step; x < 420; x += step) brick(x + (type === 'stack' ? 0 : (r % 2) * step / 2) + 2, r * 32 + 2, bw, 28);
    } else if (type === 'monk' || type === 'garden') {
      var pat = type === 'monk' ? [88, 88, 44] : [88, 88, 88, 44];
      var total = pat.reduce(function (a, b) { return a + b + 4; }, 0);
      for (r = 0; r < 14; r++) {
        var x0 = -((r * (type === 'monk' ? 70 : 92)) % total);
        for (x = x0 - total; x < 420; x += total) { var cx = x; pat.forEach(function (w) { brick(cx + 2, r * 32 + 2, w, 28); cx += w + 4; }); }
      }
    } else if (type === 'wonky') {
      for (r = 0; r < 14; r++) for (x = -92; x < 420; x += 92) brick(x + (r % 2) * 46 + 2 + (R() - 0.5) * 8, r * 32 + 2 + (R() - 0.5) * 6, 88, 28, (R() - 0.5) * 6);
    } else if (type === 'flemish') {
      for (r = 0; r < 14; r++) {
        x = -140 + (r % 2) * 70;
        for (; x < 420; x += 140) { brick(x + 2, r * 32 + 2, 88, 28); brick(x + 92 + 2, r * 32 + 2, 44, 28); }
      }
    } else if (type === 'english') {
      for (r = 0; r < 14; r++) {
        var hd = r % 2, w2 = hd ? 44 : 88, st = w2 + 4;
        for (x = -st; x < 420; x += st) brick(x + (hd ? 24 : 0) + 2, r * 32 + 2, w2, 28);
      }
    } else if (type === 'soldier') {
      for (i = 0; i < 14; i++) for (j = -1; j < 5; j++) brick(i * 32 + 2, j * 92 + (i % 2) * 46 + 2, 28, 88);
    } else if (type === 'basket' || type === 'diamond') {
      var n = type === 'diamond' ? 16 : 7, off = type === 'diamond' ? -6 : 0;
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
        var cx = (i + off) * 64, cy = (j + off) * 64;
        if ((i + j) % 2) { brick(cx + 2, cy + 2, 60, 28); brick(cx + 2, cy + 34, 60, 28); }
        else { brick(cx + 2, cy + 2, 28, 60); brick(cx + 34, cy + 2, 28, 60); }
      }
      if (type === 'diamond') return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="' + P.m + '"/><g transform="translate(200 200) rotate(45) scale(.9) translate(-200 -200)">' + out.join('') + '</g></svg>';
    } else { // chaos
      for (i = 0; i < 70; i++) brick(R() * 380 - 20, R() * 380 - 20, 50 + R() * 50, 22 + R() * 14, R() * 180 - 90);
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="' + P.m + '"/>' + out.join('') + '</svg>';
  }
  function svgURI(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }

  var BONDS = [
    ['stretcher', 'brick', 'Stretcher bond', 'the classic. the default. the icon.'],
    ['flemish', 'char', 'Flemish bond', 'fancy. we do not judge.'],
    ['stack', 'hazard', 'Stack bond', 'no overlap. brave.'],
    ['basket', 'clay', 'Basket weave', 'yes, with bricks.'],
    ['english', 'night', 'English bond', 'tea break bond.'],
    ['soldier', 'cream', 'Soldier course', 'standing to attention.'],
    ['header', 'brick', 'Header bond', 'all ends, no sides.'],
    ['diamond', 'hazard', 'Diamond weave', 'dizzy.'],
    ['monk', 'clay', 'Monk bond', 'two long, one short. very zen.'],
    ['garden', 'cream', 'Garden wall bond', 'for walls with nothing to prove.'],
    ['wonky', 'brick', 'Wonky bond', 'not ours. never ours.'],
    ['chaos', 'night', 'Chaos bond', 'not recommended. spiritually accurate.']
  ];
  function artFor(i) { var b = BONDS[i % BONDS.length]; return svgURI(bondSVG(b[0], b[1], 11 + i * 7)); }

  /* ---------- rendering ---------- */
  var tiles = [], current = [], mode = 'art', lastSig = '';

  function clearTiles() {
    tiles.forEach(function (t) { if (J && J.unregister) J.unregister(t); });
    tiles = [];
    grid.textContent = '';
  }

  function addTile(i, data, pop) {
    var a = document.createElement('a');
    a.className = 'tile' + (pop ? ' pop' : '') + ((i % 7 === 0 && data.big !== undefined) ? ' big' : '');
    var rot = ((i * 37) % 9 - 4) * 0.7;
    a.setAttribute('data-jiggle', '');
    a.setAttribute('data-rot', rot.toFixed(1));
    a.setAttribute('data-gain', '0.8');
    a.style.setProperty('--tape', (((i * 53) % 11) - 5) + 'deg');
    if (pop) a.style.animationDelay = (i * 55) + 'ms';

    var img = document.createElement('img');
    img.loading = 'lazy'; img.decoding = 'async'; img.draggable = false;
    img.width = 400; img.height = 400;
    var cap = document.createElement('div');
    cap.className = 'cap';
    var b = document.createElement('b');
    var small = document.createElement('span');

    if (data.art) {
      var bond = BONDS[i % BONDS.length];
      img.src = artFor(i);
      img.alt = 'Stand-in artwork: ' + bond[2] + ' brick pattern';
      b.textContent = bond[2]; small.textContent = bond[3];
      a.href = PROFILE; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', bond[2] + ' artwork. Opens our Instagram.');
    } else {
      img.src = data.thumb;
      img.alt = firstLine(data.caption, 110) || 'Brick Slayers NZ job photo';
      img.addEventListener('error', function () { img.onerror = null; img.src = artFor(i); }, { once: true });
      b.textContent = firstLine(data.caption, 60) || 'Fresh off the tools';
      small.textContent = fmtDate(data.ts);
      a.href = data.permalink; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', (firstLine(data.caption, 80) || 'Job photo') + '. View larger.');
      a.addEventListener('click', function (e) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault(); openLB(i, a);
      });
      if (data.video) { var v = document.createElement('span'); v.className = 'vid'; v.textContent = 'VIDEO'; a.appendChild(v); }
    }
    cap.appendChild(b); cap.appendChild(small);
    a.insertBefore(img, a.firstChild);
    a.appendChild(cap);
    grid.appendChild(a);
    tiles.push(a);
    if (J && J.register) J.register(a);
  }

  function renderArt() {
    clearTiles(); current = []; mode = 'art'; lastSig = 'art';
    for (var i = 0; i < BONDS.length; i++) addTile(i, { art: true }, false);
    setStatus('');
  }
  function renderPosts(posts, pop, label) {
    clearTiles(); current = posts; mode = 'live';
    posts.forEach(function (p, i) { addTile(i, p, pop); });
    lastSig = posts.map(function (p) { return p.id; }).join('|');
    setStatus(label || '');
  }
  function setStatus(s) { if (statusEl) statusEl.textContent = s; }
  function stamp() {
    var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'Synced from Instagram • ' + current.length + ' posts • checked ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* ---------- lightbox ---------- */
  var lb = document.getElementById('lb'), lbImg = document.getElementById('lb-img'), lbCap = document.getElementById('lb-cap'),
      lbLink = document.getElementById('lb-link'), lbX = document.getElementById('lb-x'), lbPrev = document.getElementById('lb-prev'),
      lbNext = document.getElementById('lb-next'), lbFig = document.getElementById('lb-fig');
  var lbIndex = 0, lbReturn = null;

  function showLB(i) {
    var p = current[i]; if (!p) return;
    lbIndex = i;
    lbImg.src = p.big;
    lbImg.alt = firstLine(p.caption, 140) || 'Brick Slayers NZ job photo';
    var d = fmtDate(p.ts);
    lbCap.textContent = (d ? d + ' — ' : '') + firstLine(p.caption, 420);
    lbLink.href = p.permalink;
    lbLink.textContent = p.video ? 'Watch on Instagram' : 'View on Instagram';
    var multi = current.length > 1;
    lbPrev.hidden = lbNext.hidden = !multi;
    lbFig.style.animation = 'none'; void lbFig.offsetWidth; lbFig.style.animation = '';
  }
  function openLB(i, opener) {
    if (!lb) return;
    lbReturn = opener || document.activeElement;
    showLB(i);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lbX.focus();
  }
  function closeLB() {
    if (!lb || lb.hidden) return;
    lb.hidden = true; lbImg.removeAttribute('src');
    document.body.style.overflow = '';
    if (lbReturn && lbReturn.focus) lbReturn.focus();
  }
  function stepLB(d) { if (current.length) showLB((lbIndex + d + current.length) % current.length); }

  if (lb) {
    lbX.addEventListener('click', closeLB);
    lbPrev.addEventListener('click', function () { stepLB(-1); });
    lbNext.addEventListener('click', function () { stepLB(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLB(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLB();
      else if (e.key === 'ArrowLeft') stepLB(-1);
      else if (e.key === 'ArrowRight') stepLB(1);
      else if (e.key === 'Tab') {
        var f = [lbX, lbPrev, lbNext, lbLink].filter(function (el) { return el && !el.hidden; });
        var idx = f.indexOf(document.activeElement);
        if (e.shiftKey && idx <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (idx === f.length - 1 || idx === -1)) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ---------- fetching ---------- */
  function getJSON(url, ms) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 9000);
    return fetch(url, { cache: 'no-cache', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(function (e) { clearTimeout(timer); throw e; });
  }

  function loadLive(first) {
    return getJSON(FEED.url).then(function (json) {
      var posts = normalise(json);
      if (!posts.length) throw new Error('feed had no usable posts');
      store(false, { t: Date.now(), posts: posts });
      var sig = posts.map(function (p) { return p.id; }).join('|');
      if (sig !== lastSig) renderPosts(posts, true, '');
      current = posts;
      setStatus(stamp());
      return true;
    });
  }
  function loadLocal() {
    if (!CFG.localFeed) return Promise.resolve(false);
    return getJSON(CFG.localFeed, 5000).then(function (json) {
      var posts = normalise(json);
      if (!posts.length) return false;
      renderPosts(posts, true, '');
      return true;
    }).catch(function () { return false; });
  }

  // 1. instant paint
  var cached = store(true);
  if (cached && cached.posts && cached.posts.length && FEED.url) renderPosts(cached.posts.slice(0, MAX), false, '');
  else renderArt();

  // 2/3. go get the real thing
  if (FEED.url) {
    loadLive(true).catch(function (e) {
      if (window.console) console.warn('[Brick Slayers] Instagram feed failed:', e && e.message);
      if (mode === 'art') loadLocal();
    });
    var mins = Math.max(2, FEED.refreshMinutes || 10);
    setInterval(function () { if (!document.hidden) loadLive(false).catch(function () {}); }, mins * 60000);
  } else {
    loadLocal();
  }

  window.BSGallery = { normalise: normalise, render: function (posts) { renderPosts(normalise(posts), true, ''); } };
})();
