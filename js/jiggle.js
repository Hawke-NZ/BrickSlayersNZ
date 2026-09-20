/* ==========================================================
   jiggle.js: a small spring-physics engine for DOM elements.

   Mark up any element with:
     data-jiggle   springy element (hover, click shockwaves, scroll wobble)
     data-repel    also gets shoved around by the cursor
     data-grab     can be dragged with a mouse and flung; springs back
     data-twitch   randomly convulses while idle
     data-skew     (headings) only skews with scroll speed
     data-rot="n"  resting rotation in degrees
     data-gain="n" strength multiplier for everything (default 1)

   The engine owns `transform` on these elements.
   Exposes window.Jiggle.
   ========================================================== */
(function () {
  'use strict';

  var mq = window.matchMedia;
  var RM = !!(mq && mq('(prefers-reduced-motion: reduce)').matches);
  var FINE = !!(mq && mq('(pointer: fine)').matches);
  var ptr = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0, inside: false, type: 'mouse' };
  var J = window.Jiggle = { RM: RM, FINE: FINE, ptr: ptr, scrollV: 0, frameFns: [] };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  J.rnd = rnd; J.clamp = clamp;
  J.onFrame = function (fn) { J.frameFns.push(fn); };

  /* ---------- reduced motion: static rotations only ---------- */
  if (RM) {
    var noop = function () {};
    J.register = function (el) {
      var r = parseFloat(el.getAttribute('data-rot')) || 0;
      if (r) el.style.transform = 'rotate(' + r + 'deg)';
    };
    J.unregister = J.shock = J.poke = J.panic = J.kick = noop;
    J.state = function (el) { return { x: 0, y: 0, r: parseFloat(el.getAttribute('data-rot')) || 0, s: 0 }; };
    Array.prototype.forEach.call(document.querySelectorAll('[data-jiggle]'), J.register);
    return;
  }

  /* ---------- the jelly ---------- */
  var items = [];
  var byEl = typeof WeakMap === 'function' ? new WeakMap() : null;
  var io = null;

  function Jelly(el) {
    this.el = el;
    this.base = parseFloat(el.getAttribute('data-rot')) || 0;
    this.gain = el.hasAttribute('data-gain') ? parseFloat(el.getAttribute('data-gain')) : 1;
    this.k = 0.085; this.c = 0.12;
    this.x = this.y = this.vx = this.vy = 0;
    this.r = this.vr = 0;
    this.s = this.vs = 0;
    this.sk = this.vsk = 0;
    this.skewOnly = el.hasAttribute('data-skew') && !el.hasAttribute('data-jiggle');
    this.repel = el.hasAttribute('data-repel');
    this.grab = el.hasAttribute('data-grab') && FINE;
    this.twitch = el.hasAttribute('data-twitch');
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.visible = false;
    this.asleep = false;
    this.dragging = false;
    this.tx = 0; this.ty = 0; this.sx0 = 0; this.sy0 = 0; this.x0 = 0; this.y0 = 0;
    this.cx = 0; this.cy = 0;
  }

  Jelly.prototype.wake = function () { this.asleep = false; };

  Jelly.prototype.step = function (dt, scrollD) {
    var g = this.gain;

    if (this.skewOnly) {
      if (scrollD) this.vsk += scrollD * 0.035 * g;
      this.vsk += (-0.09 * this.sk - 0.10 * this.vsk) * dt;
      this.sk += this.vsk * dt;
      this.sk = clamp(this.sk, -5, 5);
      if (Math.abs(this.sk) + Math.abs(this.vsk) < 0.01) { this.sk = this.vsk = 0; this.asleep = true; this.writeRest(); }
      return;
    }

    var k = this.k, c = this.c;
    var ax, ay;
    var ar = -k * 1.2 * this.r - c * 1.1 * this.vr;
    var as = -0.14 * this.s - 0.11 * this.vs;
    var ask = -0.09 * this.sk - 0.10 * this.vsk;

    if (this.dragging) {
      ax = (this.tx - this.x) * 0.3 - 0.24 * this.vx;
      ay = (this.ty - this.y) * 0.3 - 0.24 * this.vy;
      ar += clamp(this.vx * 0.12, -2.5, 2.5) - this.r * 0.05;
    } else {
      ax = -k * this.x - c * this.vx;
      ay = -k * this.y - c * this.vy;
      if (scrollD) {
        this.vy += scrollD * 0.15 * g;
        this.vr += scrollD * 0.02 * this.dir * g;
        this.vsk += scrollD * 0.03 * g;
      }
    }

    if (this.repel && ptr.inside && FINE && !this.dragging) {
      var rect = this.el.getBoundingClientRect();
      this.cx = rect.left + rect.width / 2 - this.x;
      this.cy = rect.top + rect.height / 2 - this.y;
      var dx = this.cx - ptr.x, dy = this.cy - ptr.y;
      var R = 160, d2 = dx * dx + dy * dy;
      if (d2 < R * R) {
        var d = Math.sqrt(d2) || 1, f = (1 - d / R) * g;
        ax += dx / d * f * 2.1 + ptr.vx * 0.07 * f;
        ay += dy / d * f * 2.1 + ptr.vy * 0.07 * f;
        ar += dx / d * f * 1.1 + ptr.vx * 0.05 * f;
        as += f * 0.02;
        this.asleep = false;
      }
    }

    this.vx += ax * dt; this.vy += ay * dt; this.vr += ar * dt; this.vs += as * dt; this.vsk += ask * dt;
    this.x += this.vx * dt; this.y += this.vy * dt; this.r += this.vr * dt; this.s += this.vs * dt; this.sk += this.vsk * dt;

    this.sk = clamp(this.sk, -6, 6);
    this.r = clamp(this.r, -35, 35);
    this.s = clamp(this.s, -0.4, 0.5);

    var e = Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.vx) + Math.abs(this.vy) +
            Math.abs(this.r) + Math.abs(this.vr) + Math.abs(this.s) * 10 + Math.abs(this.vs) * 10 +
            Math.abs(this.sk) + Math.abs(this.vsk);
    if (e < 0.03 && !this.dragging) {
      this.x = this.y = this.vx = this.vy = this.r = this.vr = this.s = this.vs = this.sk = this.vsk = 0;
      this.asleep = true;
      this.writeRest();
    }
  };

  Jelly.prototype.writeRest = function () {
    this.el.style.transform = this.skewOnly ? '' : (this.base ? 'rotate(' + this.base + 'deg)' : '');
  };

  Jelly.prototype.write = function () {
    if (this.skewOnly) {
      this.el.style.transform = 'skewY(' + this.sk.toFixed(2) + 'deg)';
      return;
    }
    var sp = Math.abs(this.vx), sq = Math.abs(this.vy);
    var sx = 1 + this.s + Math.min(sp * 0.006, 0.2) - Math.min(sq * 0.003, 0.1);
    var sy = 1 + this.s + Math.min(sq * 0.006, 0.2) - Math.min(sp * 0.003, 0.1);
    this.el.style.transform =
      'translate3d(' + this.x.toFixed(2) + 'px,' + this.y.toFixed(2) + 'px,0) ' +
      'rotate(' + (this.base + this.r).toFixed(2) + 'deg) ' +
      'skewX(' + this.sk.toFixed(2) + 'deg) ' +
      'scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
  };

  /* ---------- registration ---------- */
  J.register = function (el) {
    if (!el || (byEl && byEl.has(el))) return;
    var j = new Jelly(el);
    items.push(j);
    if (byEl) byEl.set(el, j);
    j.writeRest();
    if (io) io.observe(el); else j.visible = true;

    if (!j.skewOnly) {
      if (FINE) {
        el.addEventListener('pointerenter', function (e) {
          if (e.pointerType !== 'mouse' || j.dragging) return;
          var g = j.gain;
          j.vs += 0.08 * g; j.vr += rnd(-4, 4) * g; j.vy -= rnd(1, 3) * g; j.wake();
        });
      }
      if (j.grab) {
        el.setAttribute('draggable', 'false');
        el.addEventListener('dragstart', function (e) { e.preventDefault(); });
        el.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'touch' || e.button !== 0) return;
          e.preventDefault();
          j.dragging = true; j.wake();
          j.sx0 = e.clientX; j.sy0 = e.clientY; j.x0 = j.x; j.y0 = j.y; j.tx = j.x; j.ty = j.y;
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
          el.style.zIndex = 40;
          j.vs += 0.06;
        });
        el.addEventListener('pointermove', function (e) {
          if (!j.dragging) return;
          j.tx = j.x0 + (e.clientX - j.sx0);
          j.ty = j.y0 + (e.clientY - j.sy0);
        });
        var end = function (e) {
          if (!j.dragging) return;
          j.dragging = false; j.wake();
          j.vs -= 0.05;
          try { el.releasePointerCapture(e.pointerId); } catch (_) {}
          setTimeout(function () { if (!j.dragging) el.style.zIndex = ''; }, 900);
        };
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
      }
    }
    return j;
  };

  J.unregister = function (el) {
    for (var i = items.length - 1; i >= 0; i--) {
      if (items[i].el === el) { items.splice(i, 1); break; }
    }
    if (io) io.unobserve(el);
    if (byEl) byEl.delete(el);
  };

  J.poke = function (el, o) {
    var j = byEl && byEl.get(el);
    if (!j) return;
    o = o || {};
    j.vx += (o.x || 0) * j.gain; j.vy += (o.y || 0) * j.gain;
    j.vr += (o.r || 0) * j.gain; j.vs += (o.s || 0) * j.gain;
    j.wake();
  };

  /* read an element's current spring state (used by the string board) */
  J.state = function (el) {
    var j = byEl && byEl.get(el);
    return j ? { x: j.x, y: j.y, r: j.r + j.base, s: j.s } : { x: 0, y: 0, r: 0, s: 0 };
  };

  /* fling an element off its resting spot so it springs back in (entrance animation) */
  J.kick = function (el, o) {
    var j = byEl && byEl.get(el);
    if (!j || j.skewOnly) return;
    o = o || {};
    j.x += (o.x || 0); j.y += (o.y || 0); j.r += (o.r || 0); j.s += (o.s || 0);
    j.wake(); j.write();
  };

  /* radial shove away from a point */
  J.shock = function (x, y, power, radius) {
    radius = radius || 280;
    power = power == null ? 1 : power;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.visible || it.skewOnly || it.dragging) continue;
      var rect = it.el.getBoundingClientRect();
      var cx = rect.left + rect.width / 2 - it.x, cy = rect.top + rect.height / 2 - it.y;
      var dx = cx - x, dy = cy - y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > radius) continue;
      if (d < 1) { dx = rnd(-1, 1); dy = -1; d = 1; }
      var f = (1 - d / radius) * power * it.gain;
      it.vx += dx / d * f * 9; it.vy += dy / d * f * 9 - f * 2;
      it.vr += (dx >= 0 ? 1 : -1) * f * 6; it.vs += f * 0.1;
      it.wake();
    }
  };

  /* everything visible goes off */
  J.panic = function (power) {
    power = power || 1;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.visible || it.skewOnly || it.dragging) continue;
      it.vx += rnd(-14, 14) * power * it.gain;
      it.vy += rnd(-16, 6) * power * it.gain;
      it.vr += rnd(-10, 10) * power * it.gain;
      it.vs += rnd(0, 0.18) * power * it.gain;
      it.wake();
    }
  };

  /* ---------- observers + pointer tracking ---------- */
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var j = byEl && byEl.get(en.target);
        if (j) { j.visible = en.isIntersecting; if (en.isIntersecting) j.wake(); }
      });
    }, { rootMargin: '120px 0px' });
  }

  window.addEventListener('pointermove', function (e) {
    var t = e.timeStamp || performance.now();
    var dtm = Math.max(t - ptr.t, 1);
    var vx = 0, vy = 0;
    if (ptr.inside) {
      vx = (e.clientX - ptr.x) / (dtm / 16.667);
      vy = (e.clientY - ptr.y) / (dtm / 16.667);
    }
    ptr.vx = clamp(ptr.vx * 0.4 + vx * 0.6, -60, 60);
    ptr.vy = clamp(ptr.vy * 0.4 + vy * 0.6, -60, 60);
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = t; ptr.inside = true; ptr.type = e.pointerType;
  }, { passive: true });
  document.addEventListener('mouseleave', function () { ptr.inside = false; });
  window.addEventListener('blur', function () { ptr.inside = false; });
  window.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') ptr.inside = false; }, { passive: true });
  window.addEventListener('pointercancel', function () { ptr.inside = false; }, { passive: true });

  /* click shockwave (skips form controls and modals so nothing wanders off mid-typing) */
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' && e.target.closest && e.target.closest('.nav-links,#pit-canvas')) return;
    if (e.target.closest && e.target.closest('.qform,.lb,.nav,#pit-canvas')) return;
    J.shock(e.clientX, e.clientY, 0.75, 260);
  }, { passive: true });

  /* ---------- main loop ---------- */
  var last = 0, lastScroll = window.pageYOffset, nextTwitch = 900, running = true;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!last) last = now;
    var ms = Math.min(now - last, 60);
    last = now;
    var dt = Math.min(ms / 16.667, 2.2);

    var sy = window.pageYOffset;
    var scrollD = clamp(sy - lastScroll, -60, 60);
    lastScroll = sy;
    J.scrollV = J.scrollV * 0.82 + scrollD * 0.18;
    ptr.vx *= 0.86; ptr.vy *= 0.86;

    nextTwitch -= ms;
    if (nextTwitch <= 0) {
      nextTwitch = rnd(450, 1500);
      var pool = [];
      for (var q = 0; q < items.length; q++) if (items[q].visible && items[q].twitch && !items[q].dragging) pool.push(items[q]);
      if (pool.length) {
        var t = pool[(Math.random() * pool.length) | 0], g = t.gain;
        t.vx += rnd(-2.2, 2.2) * g; t.vy += rnd(-2.6, 1.2) * g; t.vr += rnd(-4, 4) * g; t.vs += rnd(0.02, 0.09) * g; t.wake();
      }
    }

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.visible) continue;
      if (it.asleep && !scrollD && !(it.repel && ptr.inside)) continue;
      if (it.asleep) it.asleep = false;
      it.step(dt, scrollD);
      if (!it.asleep) it.write();
    }

    for (var f = 0; f < J.frameFns.length; f++) J.frameFns[f](dt, scrollD, now);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { running = false; }
    else if (!running) { running = true; last = 0; requestAnimationFrame(frame); }
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-jiggle],[data-skew]'), J.register);
  requestAnimationFrame(frame);
})();
