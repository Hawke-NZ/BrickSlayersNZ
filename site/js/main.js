/* ==========================================================
   main.js: wiring. Config, nav, ransom-note headline, mutating
   tagline, red-string board, quote form, boot screen, panic.
   ========================================================== */
(function () {
  'use strict';
  var CFG = window.BRICKSLAYERS || {};
  var J = window.Jiggle || { RM: true, ptr: {}, onFrame: function () {}, register: function () {}, poke: function () {}, kick: function () {}, state: function () { return { x: 0, y: 0, r: 0 }; }, panic: function () {}, rnd: function (a, b) { return a + Math.random() * (b - a); } };
  var RM = J.RM, rnd = J.rnd;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var EMAIL = CFG.email || 'brickslayersnz@gmail.com';
  var IG = CFG.instagram || 'brick_slayersnz';
  var PROFILE = 'https://www.instagram.com/' + IG + '/';

  /* ---------- toast ---------- */
  var toastEl = $('#toast'), toastT = 0;
  function toast(msg, ms) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 2600);
  }

  /* ---------- apply config to the markup ---------- */
  $$('a[href^="mailto:"]').forEach(function (a) { a.setAttribute('href', 'mailto:' + EMAIL); });
  $$('.email-link').forEach(function (a) { a.textContent = EMAIL; });
  $$('[data-copy]').forEach(function (b) { b.setAttribute('data-copy', EMAIL); });
  $$('[data-ig-link]').forEach(function (a) {
    a.setAttribute('href', PROFILE);
    if (a.textContent.indexOf('@') > -1) a.textContent = a.textContent.replace(/@[\w.]+/, '@' + IG);
  });
  if (CFG.phone) {
    var tel = String(CFG.phone).replace(/[^\d+]/g, '');
    document.documentElement.classList.add('has-phone');
    $$('[data-phone-link]').forEach(function (a) { a.href = 'tel:' + tel; a.textContent = CFG.phone; });
    var cta = $('.hero-cta');
    if (cta) {
      var call = document.createElement('a');
      call.className = 'btn btn-brick'; call.href = 'tel:' + tel; call.textContent = 'Call ' + CFG.phone;
      call.setAttribute('data-jiggle', '');
      cta.appendChild(call); J.register(call);
    }
  }

  /* ---------- copy buttons ---------- */
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea');
      ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); }
      document.body.removeChild(ta);
    });
  }
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      copyText(b.getAttribute('data-copy')).then(function () { toast('COPIED. NOW GO EMAIL US.'); }, function () { toast('Could not copy. Select it by hand, legend.'); });
    });
  });

  /* ---------- nav ---------- */
  var burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  var sfx = $('#sfx');
  if (sfx) sfx.addEventListener('click', function () {
    var on = window.BSFX ? window.BSFX.toggle() : false;
    sfx.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('b', sfx).textContent = on ? 'ON' : 'OFF';
    toast(on ? 'SOUND ON. YOU ASKED FOR THIS.' : 'SOUND OFF. COWARD.');
  });

  /* NZ clock */
  var clock = $('#clock');
  if (clock) {
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-NZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'Pacific/Auckland' }); } catch (e) { fmt = null; }
    var tick = function () { clock.textContent = fmt ? fmt.format(new Date()) : new Date().toTimeString().slice(0, 8); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- ransom-note headline ---------- */
  (function () {
    var h1 = $('.ransom');
    if (!h1) return;
    h1.setAttribute('aria-label', 'Brick Slayers NZ');
    var seq = { 'BRICK': ['c3', 'c1', 'c2', 'c4', 'c6'], 'SLAYERS': ['c2', 'c4', 'c1', 'c3', 'c6', 'c5', 'c4'], 'NZ': ['cnz', 'cnz'] };
    $$('.ransom-line, .ransom-nz', h1).forEach(function (line) {
      var word = line.textContent.trim();
      line.textContent = '';
      line.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch, i) {
        var s = document.createElement('span');
        s.className = 'rl ' + ((seq[word] || [])[i] || 'c1');
        s.textContent = ch;
        s.style.setProperty('--s', rnd(0.9, 1.1).toFixed(2));
        s.style.setProperty('--y', rnd(-0.07, 0.07).toFixed(3) + 'em');
        s.setAttribute('data-jiggle', ''); s.setAttribute('data-repel', ''); s.setAttribute('data-grab', ''); s.setAttribute('data-twitch', '');
        s.setAttribute('data-rot', rnd(-6, 6).toFixed(1));
        line.appendChild(s);
        J.register(s);
      });
    });
  })();

  /* ---------- mutating tagline ---------- */
  (function () {
    var el = $('#mutant');
    if (!el || RM) return;
    var phrases = [
      "SOUTH AUCKLAND'S MOST UNWELL BRICKLAYERS",
      'STRAIGHT LINES. CROOKED MINDS.',
      'MORTAR IN. WALLS OUT.',
      'THE PLUMB LINE DOES NOT LIE.',
      'TROWEL FIRST. QUESTIONS LATER.',
      'KEVIN IS WATCHING.',
      'NO CRACKS DETECTED. SUSPICIOUS.',
      'WALLS THAT SLAP.'
    ];
    var glyphs = '#%&$@!?/\\<>[]{}=+*01', i = 0, timer = 0;
    function scramble(to) {
      var f = 0, total = 16;
      clearInterval(timer);
      timer = setInterval(function () {
        f++;
        var reveal = Math.floor(to.length * f / total), out = '';
        for (var k = 0; k < to.length; k++) out += (k < reveal || to[k] === ' ') ? to[k] : glyphs[(Math.random() * glyphs.length) | 0];
        el.textContent = out;
        if (f >= total) { clearInterval(timer); el.textContent = to; }
      }, 38);
    }
    setInterval(function () {
      if (document.hidden) return;
      i = (i + 1) % phrases.length;
      scramble(phrases[i]);
    }, 3800);
  })();

  /* ---------- evidence board: red strings with real sag physics ---------- */
  (function () {
    var board = $('#board'), svg = $('#strings');
    if (!board || !svg) return;
    var cards = $$('.card', board), NS = 'http://www.w3.org/2000/svg', links = [], heads = {}, geo = [], visible = true;
    board.classList.add('strings-on');

    function offsetIn(el) {
      var x = 0, y = 0, n = el;
      while (n && n !== board) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x: x, y: y };
    }
    function mk(tag, attrs) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }
    function layout() {
      svg.setAttribute('viewBox', '0 0 ' + board.offsetWidth + ' ' + board.offsetHeight);
      geo = cards.map(function (c) {
        var o = offsetIn(c);
        return { cx: o.x + c.offsetWidth / 2, cy: o.y + c.offsetHeight / 2, hh: c.offsetHeight / 2 - 2 };
      });
      var cols = 1;
      if (cards.length > 1 && cards[1].offsetLeft > cards[0].offsetLeft + 20) cols = (cards.length > 2 && cards[2].offsetLeft > cards[1].offsetLeft + 20) ? 3 : 2;
      var P = cols === 3 ? [['0t', '1t'], ['1t', '2t'], ['3t', '4t'], ['4t', '5t'], ['0b', '3t'], ['0b', '4t'], ['1b', '3t'], ['1b', '4t'], ['1b', '5t'], ['2b', '4t'], ['2b', '5t']]
            : cols === 2 ? [['0t', '1t'], ['2t', '3t'], ['4t', '5t'], ['0b', '2t'], ['0b', '3t'], ['1b', '2t'], ['1b', '3t'], ['2b', '4t'], ['2b', '5t'], ['3b', '4t'], ['3b', '5t']]
            : [['0b', '1t'], ['1b', '2t'], ['2b', '3t'], ['3b', '4t'], ['4b', '5t']];
      P = P.filter(function (p) { return cards[parseInt(p[0], 10)] && cards[parseInt(p[1], 10)]; });
      svg.textContent = '';
      var used = {};
      links = P.map(function (p) {
        var sh = mk('path', { 'class': 's-shadow' }), ln = mk('path', { 'class': 's-line' });
        svg.appendChild(sh); svg.appendChild(ln);
        used[p[0]] = used[p[1]] = true;
        return { a: p[0], b: p[1], sh: sh, ln: ln, x: null, y: 0, vx: 0, vy: 0, gap: p[0].slice(-1) === 'b' || cols === 1 };
      });
      heads = {};
      Object.keys(used).forEach(function (k) {
        var g = mk('g', {});
        g.appendChild(mk('circle', { cx: 2, cy: 4, r: 12, fill: 'rgba(0,0,0,.45)' }));
        g.appendChild(mk('circle', { r: 12, fill: '#c23b22', stroke: '#0d0b0a', 'stroke-width': 3 }));
        g.appendChild(mk('circle', { cx: -4, cy: -4, r: 4, fill: '#ff8a78' }));
        svg.appendChild(g);
        heads[k] = g;
      });
      draw(0);
    }
    function pinPos(key) {
      var i = parseInt(key, 10), g = geo[i], st = J.state(cards[i]), th = st.r * Math.PI / 180;
      var vy = key.slice(-1) === 't' ? -g.hh : g.hh;
      return { x: g.cx + st.x - vy * Math.sin(th), y: g.cy + st.y + vy * Math.cos(th) };
    }
    function draw(dt) {
      if (!geo.length) return;
      var pos = {};
      Object.keys(heads).forEach(function (k) {
        var p = pos[k] = pinPos(k);
        heads[k].setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
      });
      for (var i = 0; i < links.length; i++) {
        var L = links[i], a = pos[L.a], b = pos[L.b];
        var dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy);
        var sag = L.gap ? 8 + dist * 0.025 : 12 + dist * 0.06;
        var tx = (a.x + b.x) / 2, ty = (a.y + b.y) / 2 + 2 * sag;
        if (L.x === null || RM || !dt) { L.x = tx; L.y = ty; L.vx = L.vy = 0; }
        else {
          L.vx += ((tx - L.x) * 0.07 - L.vx * 0.09) * dt;
          L.vy += ((ty - L.y) * 0.07 - L.vy * 0.09) * dt;
          L.x += L.vx * dt; L.y += L.vy * dt;
        }
        L.ln.setAttribute('d', 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + 'Q' + L.x.toFixed(1) + ' ' + L.y.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1));
        L.sh.setAttribute('d', 'M' + (a.x + 3).toFixed(1) + ' ' + (a.y + 5).toFixed(1) + 'Q' + (L.x + 3).toFixed(1) + ' ' + (L.y + 5).toFixed(1) + ' ' + (b.x + 3).toFixed(1) + ' ' + (b.y + 5).toFixed(1));
      }
    }
    layout();
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(board);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: '150px' }).observe(board);
    J.onFrame(function (dt) { if (visible) draw(dt); });
  })();

  /* ---------- things drop in with a boing when they scroll into view ---------- */
  if (!RM && 'IntersectionObserver' in window) {
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    var enter = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        enter.unobserve(el);
        if (seen && seen.has(el)) return;
        if (seen) seen.add(el);
        var delay = (parseInt(el.getAttribute('data-i'), 10) || 0) * 90;
        setTimeout(function () { J.kick(el, { y: rnd(50, 90), x: rnd(-30, 30), r: rnd(-8, 8), s: -0.12 }); }, delay);
      });
    }, { rootMargin: '0px 0px 160px 0px' });
    $$('.card').forEach(function (c, i) { c.setAttribute('data-i', i % 3); enter.observe(c); });
    ['.rules', '.qform'].forEach(function (s) { var e = $(s); if (e) enter.observe(e); });
  }

  /* ---------- quote form ---------- */
  (function () {
    var form = $('#quote-form'), out = $('#form-msg'), copyBtn = $('#copy-msg');
    if (!form) return;
    var lastBody = '';
    function val(n) { return (form.elements[n] && form.elements[n].value || '').trim(); }
    function say(msg, err) { out.textContent = msg; out.className = 'form-msg' + (err ? ' err' : ''); }
    $$('input,textarea,select', form).forEach(function (f) { f.addEventListener('input', function () { f.classList.remove('bad'); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (val('company')) { say('Sent. (Robots are not welcome here.)'); return; }   // honeypot
      var name = val('name'), contact = val('contact'), bad = false;
      ['name', 'contact'].forEach(function (n) {
        var f = form.elements[n];
        if (!val(n)) { f.classList.add('bad'); bad = true; } else f.classList.remove('bad');
      });
      if (bad) { say('We need your name and a phone or email so we can reply.', true); var first = $('.bad', form); if (first) first.focus(); return; }

      var data = { name: name, contact: contact, suburb: val('suburb'), job: val('job'), message: val('message') };
      lastBody = 'Name: ' + data.name + '\nPhone/email: ' + data.contact + '\nSuburb: ' + (data.suburb || '-') + '\nJob: ' + data.job + '\n\n' + (data.message || '(no details yet)');

      function mailFallback() {
        var subject = 'Quote request: ' + data.job + ' (' + data.name + ')';
        window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lastBody.slice(0, 1800));
        say('Opening your email app. If nothing happens, copy the message and email ' + EMAIL + '.');
        if (copyBtn) copyBtn.hidden = false;
      }
      function celebrate() {
        var r = form.getBoundingClientRect();
        if (window.FX) window.FX.splat(r.left + r.width / 2, r.top + r.height / 2, 30);
        J.poke(form, { y: -8, r: 5, s: 0.05 });
        if (window.BSFX) window.BSFX.thud(0.8);
      }

      if (CFG.formEndpoint) {
        say('Sending...');
        fetch(CFG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); say('Sent. We will be in touch. Go do something productive.'); form.reset(); celebrate(); })
          .catch(function () { mailFallback(); });
      } else { mailFallback(); celebrate(); }
    });

    if (copyBtn) copyBtn.addEventListener('click', function () {
      copyText(lastBody).then(function () { toast('MESSAGE COPIED. PASTE IT INTO AN EMAIL.'); }, function () { toast('Could not copy. Select the text by hand.'); });
    });
  })();

  /* ---------- panic button + konami code ---------- */
  var panicOn = false;
  var POPUPS = [
    ['ERROR.EXE', 'Too many bricks.', 'OK', 'ALSO OK'],
    ['MORTAR.SYS', 'Mortar level: critical.', 'PANIC', 'MORE PANIC'],
    ['kevin.exe', 'I cannot hold this much.', 'WAIT', 'HURRY'],
    ['CONFIRM', 'Are you sure you want to be sure?', 'YES', 'YES'],
    ['TASK MANAGER', 'Task failed successfully.', 'GOOD', 'GREAT'],
    ['SMOKO.EXE', 'Smoko has been requested.', 'GRANTED', 'DENIED'],
    ['THE WALL', 'The wall has noticed you.', 'HI', 'HI']
  ];
  function popups(n) {
    var made = [];
    for (var i = 0; i < n; i++) {
      var p = POPUPS[i % POPUPS.length], w = document.createElement('div');
      w.className = 'win pan'; w.setAttribute('aria-hidden', 'true');
      w.setAttribute('data-jiggle', ''); w.setAttribute('data-rot', rnd(-6, 6).toFixed(1));
      w.style.left = rnd(2, Math.max(4, 100 - 30)).toFixed(1) + '%';
      w.style.top = rnd(12, 78).toFixed(1) + '%';
      var bar = document.createElement('div'); bar.className = 'win-bar';
      var t = document.createElement('span'); t.textContent = p[0]; var x = document.createElement('i'); x.textContent = 'x';
      bar.appendChild(t); bar.appendChild(x);
      var body = document.createElement('div'); body.className = 'win-body';
      var m = document.createElement('p'); m.innerHTML = '<b></b>'; m.firstChild.textContent = p[1];
      var btns = document.createElement('div'); btns.className = 'win-btns';
      [p[2], p[3]].forEach(function (label) { var s = document.createElement('span'); s.textContent = label; btns.appendChild(s); });
      body.appendChild(m); body.appendChild(btns); w.appendChild(bar); w.appendChild(body);
      document.body.appendChild(w);
      J.register(w);
      J.kick(w, { y: -rnd(80, 200), r: rnd(-15, 15), s: -0.2 });
      made.push(w);
    }
    return made;
  }
  function panic() {
    if (panicOn) return;
    if (RM) { toast('Reduced motion is on, so the wall is quietly fine.'); return; }
    panicOn = true;
    document.body.classList.add('panic-on');
    toast('WHAT DID I SAY.', 1800);
    J.panic(1.4);
    if (window.FX) { window.FX.rain(60); }
    if (window.Pit && window.Pit.isVisible()) window.Pit.quake();
    if (window.BSFX) window.BSFX.thud(1);
    var pops = popups(7), n = 0;
    var iv = setInterval(function () {
      n++;
      if (window.FX) window.FX.rain(9);
      J.panic(0.5);
      if (window.BSFX) window.BSFX.thud(0.6);
      if (n >= 22) clearInterval(iv);
    }, 240);
    setTimeout(function () { toast('...the wall is fine. Kevin is fine.', 3000); }, 5200);
    setTimeout(function () {
      document.body.classList.remove('panic-on');
      pops.forEach(function (w) { J.unregister && J.unregister(w); if (w.parentNode) w.parentNode.removeChild(w); });
      panicOn = false;
    }, 5600);
  }
  var pb = $('#panic');
  if (pb) { pb.addEventListener('click', panic); }
  // get out of the way while someone is filling in the quote form
  var qf = $('#quote-form');
  if (pb && qf && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { pb.classList.toggle('away', en[0].isIntersecting); }, { threshold: 0.05 }).observe(qf);
  }
  var KON = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], kp = 0;
  document.addEventListener('keydown', function (e) {
    var t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kp = (k === KON[kp]) ? kp + 1 : (k === KON[0] ? 1 : 0);
    if (kp === KON.length) { kp = 0; panic(); }
  });

  /* ---------- boot / intercept screen ---------- */
  (function () {
    var boot = $('#boot'), log = $('#boot-log'), root = document.documentElement;
    if (!boot || !log) return;
    if (!root.classList.contains('boot-on')) return;
    try { sessionStorage.setItem('bs_boot', '1'); } catch (e) {}
    boot.hidden = false;
    var lines = [
      '> BRICKOS v1.0 // INTERCEPTED TRANSMISSION',
      '> ESTABLISHING CONNECTION TO SOUTH AKL ........ <span class="ok">[OK]</span>',
      '> LOCATING BRICKS ............................. <span class="ok">[OK]</span>',
      '> MORTAR LEVELS ............................... <span class="ok">NOMINAL</span>',
      '> KEVIN ....................................... <span class="ok">LOAD-BEARING</span>',
      '> CRACKS DETECTED ............................. <span class="bad">0 (SUSPICIOUS)</span>',
      '> ACCESS GRANTED. TRY NOT TO TOUCH ANYTHING.'
    ];
    var i = 0, done = false;
    function finish() {
      if (done) return; done = true;
      clearInterval(iv); clearTimeout(kill);
      boot.classList.add('out');
      setTimeout(function () { boot.hidden = true; root.classList.remove('boot-on'); }, 380);
    }
    var iv = setInterval(function () {
      if (i < lines.length) { log.innerHTML += lines[i++] + '\n'; }
      else { clearInterval(iv); setTimeout(finish, 450); }
    }, 170);
    var kill = setTimeout(finish, 3200);
    boot.addEventListener('click', finish);
    document.addEventListener('keydown', finish, { once: true });
  })();
})();
