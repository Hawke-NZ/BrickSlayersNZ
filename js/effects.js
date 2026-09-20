/* ==========================================================
   effects.js: cursor brick-tail, mortar splats + brick rain,
   comic click words, scroll-driven marquees, sound effects.
   Needs jiggle.js first. Exposes window.FX and window.BSFX.
   ========================================================== */
(function () {
  'use strict';
  var J = window.Jiggle;
  var RM = J.RM, FINE = J.FINE, ptr = J.ptr;
  var rnd = J.rnd;

  /* ------------------------------------------------------
     SOUND (off until the visitor flips the switch)
  ------------------------------------------------------ */
  var S = window.BSFX = {
    on: false, ctx: null, lastT: 0,
    toggle: function () {
      S.on = !S.on;
      if (S.on) {
        try {
          if (!S.ctx) S.ctx = new (window.AudioContext || window.webkitAudioContext)();
          if (S.ctx.state === 'suspended') S.ctx.resume();
        } catch (e) { S.on = false; }
      }
      if (S.on) S.pop();
      return S.on;
    },
    thud: function (v) {
      if (!S.on || !S.ctx) return;
      var c = S.ctx, now = c.currentTime;
      if (now - S.lastT < 0.045) return;
      S.lastT = now;
      v = Math.max(0.08, Math.min(v, 1));
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(rnd(120, 170), now);
      o.frequency.exponentialRampToValueAtTime(48, now + 0.13);
      g.gain.setValueAtTime(v * 0.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      o.connect(g); g.connect(c.destination);
      o.start(now); o.stop(now + 0.18);
      var len = Math.floor(c.sampleRate * 0.05), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var n = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain();
      n.buffer = buf; f.type = 'lowpass'; f.frequency.value = 900; ng.gain.value = v * 0.35;
      n.connect(f); f.connect(ng); ng.connect(c.destination); n.start(now);
    },
    pop: function () {
      if (!S.on || !S.ctx) return;
      var c = S.ctx, now = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(rnd(240, 340), now);
      o.frequency.exponentialRampToValueAtTime(rnd(520, 760), now + 0.06);
      g.gain.setValueAtTime(0.07, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      o.connect(g); g.connect(c.destination);
      o.start(now); o.stop(now + 0.1);
    }
  };

  if (RM) { window.FX = { splat: function () {}, rain: function () {}, comic: function () {} }; }

  /* ------------------------------------------------------
     FX CANVAS: mortar splats + brick rain
  ------------------------------------------------------ */
  if (!RM) (function () {
    var cv = document.getElementById('fx');
    if (!cv || !cv.getContext) { window.FX = { splat: function () {}, rain: function () {}, comic: function () {} }; return; }
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, parts = [];
    var MORTAR = ['#f2f2eb', '#d9d3c0', '#b9b3a0', '#9a9482'];
    var BRICKS = ['#c23b22', '#a82f1a', '#d24c30', '#8f2714', '#ffe500', '#f2f2eb', '#0d0b0a'];

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    var FX = window.FX = {};
    FX.splat = function (x, y, n) {
      n = n || 16;
      for (var i = 0; i < n; i++) {
        var a = rnd(0, Math.PI * 2), sp = rnd(2, 10);
        parts.push({ t: 'b', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, r: rnd(2.5, 8), c: MORTAR[(Math.random() * MORTAR.length) | 0], life: rnd(40, 90), g: 0.34 });
      }
      if (parts.length > 700) parts.splice(0, parts.length - 700);
    };
    FX.rain = function (n) {
      for (var i = 0; i < n; i++) {
        parts.push({ t: 'k', x: rnd(-20, W + 20), y: rnd(-260, -30), vx: rnd(-1.2, 1.2), vy: rnd(1, 5), a: rnd(0, 6.28), va: rnd(-0.12, 0.12), w: rnd(34, 58), c: BRICKS[(Math.random() * BRICKS.length) | 0], g: 0.42, life: 999 });
      }
    };

    J.onFrame(function (dt) {
      if (!parts.length) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.life -= dt;
        if (p.t === 'b') {
          p.vx *= 0.985;
          if (p.life <= 0 || p.y > H + 20) { parts.splice(i, 1); continue; }
          var al = Math.min(1, p.life / 25);
          ctx.globalAlpha = al;
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
          ctx.beginPath(); ctx.arc(p.x - p.vx * 1.6, p.y - p.vy * 1.6, p.r * 0.55, 0, 6.283); ctx.fill();
        } else {
          p.a += p.va * dt;
          if (p.y > H + 80) { parts.splice(i, 1); continue; }
          ctx.globalAlpha = 1;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
          var w = p.w, h = w * 0.48;
          ctx.fillStyle = '#0d0b0a'; ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
          ctx.fillStyle = p.c; ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w * 0.3, 3);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (!parts.length) ctx.clearRect(0, 0, W, H);
    });
  })();

  /* ------------------------------------------------------
     COMIC WORDS on click
  ------------------------------------------------------ */
  var WORDS = ['POW', 'THUNK', 'SPLAT', 'BRICK!', 'NAH', 'YEAH NAH', 'CHUR', 'OOF', 'LEVEL!', 'KEVIN?', 'SMOKO', 'MORTAR!'];
  var layer = document.getElementById('comic-layer');
  var lastComic = 0;
  function comic(x, y) {
    if (!layer) return;
    var el = document.createElement('span');
    el.className = 'comic';
    el.textContent = WORDS[(Math.random() * WORDS.length) | 0];
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.setProperty('--r', rnd(-14, 14).toFixed(1) + 'deg');
    layer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
  }
  if (!RM) {
    window.FX.comic = comic;
    document.addEventListener('pointerdown', function (e) {
      var t = e.target;
      if (!t.closest || t.closest('a,button,input,textarea,select,label,summary,.lb,.qform,#pit-canvas,.nav,.panic,[data-grab]')) return;
      var now = Date.now();
      if (now - lastComic < 120) return;
      lastComic = now;
      comic(e.clientX, e.clientY);
      window.FX.splat(e.clientX, e.clientY, 14);
      S.pop();
    }, { passive: true });
  }

  /* ------------------------------------------------------
     CURSOR BRICK TAIL
  ------------------------------------------------------ */
  if (!RM && FINE) (function () {
    var N = 8, els = [], pts = [], hidden = true;
    for (var i = 0; i < N; i++) {
      var d = document.createElement('div');
      d.className = 'tail-brick';
      d.setAttribute('aria-hidden', 'true');
      d.style.opacity = '0';
      document.body.appendChild(d);
      els.push(d);
      pts.push({ x: -100, y: -100, a: 0 });
    }
    var skip = false;
    window.addEventListener('pointermove', function (e) {
      skip = !!(e.target.closest && e.target.closest('.qform,.lb'));
    }, { passive: true });

    J.onFrame(function (dt) {
      var show = ptr.inside && !skip && ptr.type === 'mouse';
      for (var i = 0; i < N; i++) {
        var p = pts[i], tx, ty;
        if (i === 0) { tx = ptr.x; ty = ptr.y; } else { tx = pts[i - 1].x; ty = pts[i - 1].y; }
        if (p.x < -50 && show) { p.x = tx; p.y = ty; }
        var k = (i === 0 ? 0.42 : 0.34) * Math.min(dt, 1.5);
        var dx = tx - p.x, dy = ty - p.y;
        p.x += dx * k; p.y += dy * k;
        if (Math.abs(dx) + Math.abs(dy) > 0.6) {
          var ang = Math.atan2(dy, dx), da = ang - p.a;
          while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
          p.a += da * 0.3;
        }
        var sc = 1 - i * 0.075;
        els[i].style.transform = 'translate3d(' + (p.x - 13).toFixed(1) + 'px,' + (p.y - 6).toFixed(1) + 'px,0) rotate(' + p.a.toFixed(2) + 'rad) scale(' + sc.toFixed(2) + ')';
        els[i].style.opacity = show ? String(0.95 - i * 0.09) : '0';
        if (!show) { p.x = -100; p.y = -100; }
      }
    });
  })();

  /* ------------------------------------------------------
     MARQUEES: drift, get shoved by scrolling, skew with speed
  ------------------------------------------------------ */
  if (!RM) Array.prototype.forEach.call(document.querySelectorAll('.marquee'), function (m) {
    var track = m.querySelector('.marquee-track'), group = track && track.querySelector('.marquee-group');
    if (!group) return;
    var dir = parseFloat(m.getAttribute('data-dir')) || -1, speed = parseFloat(m.getAttribute('data-speed')) || 1;
    var x = 0, gw = 0, vis = true;

    function fill() {
      while (track.children.length > 1) track.removeChild(track.lastChild);
      gw = group.getBoundingClientRect().width;
      if (!gw) return;
      var need = Math.ceil((window.innerWidth * 1.15) / gw) + 1;
      for (var i = 0; i < need; i++) track.appendChild(group.cloneNode(true));
    }
    fill();
    window.addEventListener('resize', fill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fill);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }, { rootMargin: '80px' }).observe(m);
    }
    J.onFrame(function (dt, scrollD) {
      if (!vis || !gw) return;
      x += dir * speed * dt - scrollD * 0.5;
      if (x <= -gw) x += gw;
      if (x > 0) x -= gw;
      var sk = Math.max(-10, Math.min(10, J.scrollV * -0.45));
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) skewX(' + sk.toFixed(2) + 'deg)';
    });
  });
})();
