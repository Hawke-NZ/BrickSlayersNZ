/* ==========================================================
   pit.js: THE PIT. Real rigid-body physics (matter-js) with
   bricks that have faces and watch your cursor.
   Mouse: drag + fling bricks, click gaps for more.
   Touch: touch a brick to drag it (page still scrolls if you
   touch empty space), tap gaps for more.
   ========================================================== */
(function () {
  'use strict';
  var M = window.Matter, J = window.Jiggle;
  var canvas = document.getElementById('pit-canvas'), stage = document.getElementById('pit-stage');
  if (!M || !J || !canvas || !stage || !canvas.getContext) return;

  var RM = J.RM, ptr = J.ptr, rnd = J.rnd;
  var Engine = M.Engine, Bodies = M.Bodies, Body = M.Body, Composite = M.Composite,
      Constraint = M.Constraint, Events = M.Events, Query = M.Query;

  var ctx = canvas.getContext('2d');
  var engine = Engine.create({ gravity: { x: 0, y: 1.15 } });
  var world = engine.world;
  var counter = document.getElementById('pit-n');

  var STEP = 1000 / 60;
  var W = 0, H = 0, bw = 70, bh = 33, dpr = 1;
  var walls = [], floor = null, bricks = [];
  var MAX = 140, cleaning = false, visible = false, started = false;
  var drag = null, rect = { left: 0, top: 0 };
  var COLORS = ['#c23b22', '#a82f1a', '#d24c30', '#8f2714', '#c23b22', '#ffe500', '#f2f2eb', '#0d0b0a'];

  /* ---------- sizing ---------- */
  function size() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bw = Math.max(52, Math.min(92, W * 0.07)); bh = bw * 0.47;
    buildWalls();
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i], p = b.position;
      var nx = Math.max(bw / 2, Math.min(W - bw / 2, p.x)), ny = Math.min(p.y, H - bh);
      if (nx !== p.x || ny !== p.y) Body.setPosition(b, { x: nx, y: ny });
    }
  }
  function buildWalls() {
    for (var i = 0; i < walls.length; i++) Composite.remove(world, walls[i]);
    var t = 90;
    floor = Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, { isStatic: true, friction: 0.9 });
    var left = Bodies.rectangle(-t / 2, H / 2 - 1500, t, H + 3000, { isStatic: true, friction: 0.2 });
    var right = Bodies.rectangle(W + t / 2, H / 2 - 1500, t, H + 3000, { isStatic: true, friction: 0.2 });
    walls = [floor, left, right];
    Composite.add(world, walls);
  }

  /* ---------- bricks ---------- */
  function count() { if (counter) counter.textContent = bricks.length; }
  function make(x, y, vx, vy) {
    var b = Bodies.rectangle(x, y, bw, bh, {
      chamfer: { radius: 3 }, restitution: 0.28, friction: 0.7, frictionStatic: 0.9, frictionAir: 0.004, density: 0.0018
    });
    b.bs = {
      color: COLORS[(Math.random() * COLORS.length) | 0],
      eyes: Math.random() < 0.6, mouth: Math.random() < 0.4, mad: Math.random() < 0.3,
      e1: rnd(0.13, 0.22), e2: rnd(0.09, 0.17), blink: 0, nextBlink: rnd(60, 300)
    };
    Body.setAngle(b, rnd(-0.6, 0.6));
    Body.setVelocity(b, { x: vx == null ? rnd(-2, 2) : vx, y: vy == null ? rnd(0, 3) : vy });
    Body.setAngularVelocity(b, rnd(-0.08, 0.08));
    Composite.add(world, b);
    bricks.push(b);
    if (bricks.length > MAX) { var old = bricks.shift(); if (drag && drag.b === old) endDrag(); Composite.remove(world, old); }
    count();
    return b;
  }
  function rain(n, gap) {
    if (cleaning) return;
    var i = 0;
    if (RM) { for (; i < n; i++) make(rnd(bw, W - bw), rnd(-bh * 6, -bh), 0, 2); settle(420); return; }
    var id = setInterval(function () {
      make(rnd(bw, Math.max(bw + 1, W - bw)), -bh * 2, rnd(-1.5, 1.5), rnd(2, 6));
      if (++i >= n) clearInterval(id);
    }, gap || 70);
  }
  function quake() {
    if (cleaning) return;
    for (var i = 0; i < bricks.length; i++) {
      Body.setVelocity(bricks[i], { x: rnd(-7, 7), y: -rnd(9, 20) });
      Body.setAngularVelocity(bricks[i], rnd(-0.22, 0.22));
    }
    if (window.BSFX) window.BSFX.thud(1);
    if (RM) { settle(420); return; }
    stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
    setTimeout(function () { stage.classList.remove('shake'); }, 600);
  }
  function clean() {
    if (cleaning || !bricks.length) return;
    cleaning = true;
    if (RM) { clear(); cleaning = false; return; }
    Composite.remove(world, floor);
    setTimeout(function () {
      for (var i = 0; i < bricks.length; i++) Composite.remove(world, bricks[i]);
      bricks = []; count();
      Composite.add(world, floor);
      cleaning = false;
    }, 1500);
  }
  function clear() {
    for (var i = 0; i < bricks.length; i++) Composite.remove(world, bricks[i]);
    bricks = []; count(); draw(1);
  }
  function settle(steps) { for (var i = 0; i < steps; i++) { limit(); Engine.update(engine, STEP); } draw(1); }

  function limit() {
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i], v = b.velocity, s = Math.sqrt(v.x * v.x + v.y * v.y);
      if (s > 32) Body.setVelocity(b, { x: v.x * 32 / s, y: v.y * 32 / s });
      if (b.position.y > H + 400 && !cleaning) { Body.setPosition(b, { x: rnd(bw, W - bw), y: -bh * 2 }); Body.setVelocity(b, { x: 0, y: 2 }); }
    }
  }

  /* ---------- drawing ---------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function drawBrick(b, gx, gy, look, dtf) {
    var s = b.bs, w = bw, h = bh;
    ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
    rr(-w / 2, -h / 2, w, h, 4); ctx.fillStyle = '#0d0b0a'; ctx.fill();
    rr(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5, 3); ctx.fillStyle = s.color; ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.17)';
    ctx.fillRect(-w / 2 + 7, h / 2 - 8, w * 0.3, 2.5); ctx.fillRect(w * 0.12, -h / 2 + 6, w * 0.22, 2.5);

    if (s.eyes) {
      var dark = s.color === '#0d0b0a';
      var eyeC = dark ? '#ffe500' : '#0d0b0a', pupC = dark ? '#0d0b0a' : '#ffe500';
      var ex = [-w * 0.2, w * 0.17], ey = [-h * 0.04, -h * 0.1], er = [h * s.e1, h * s.e2];
      var lx = 0, ly = 0;
      if (look) {
        var dx = gx - b.position.x, dy = gy - b.position.y, ca = Math.cos(-b.angle), sa = Math.sin(-b.angle);
        var ax = dx * ca - dy * sa, ay = dx * sa + dy * ca, ll = Math.sqrt(ax * ax + ay * ay) || 1;
        var amt = Math.min(1, ll / 100);
        lx = ax / ll * amt; ly = ay / ll * amt;
      }
      s.nextBlink -= dtf;
      if (s.nextBlink <= 0) { s.blink = 7; s.nextBlink = rnd(90, 320); }
      if (s.blink > 0) s.blink -= dtf;
      for (var i = 0; i < 2; i++) {
        if (s.blink > 0) {
          ctx.strokeStyle = eyeC; ctx.lineWidth = 2.5; ctx.beginPath();
          ctx.moveTo(ex[i] - er[i], ey[i]); ctx.lineTo(ex[i] + er[i], ey[i]); ctx.stroke();
        } else {
          ctx.fillStyle = eyeC; ctx.beginPath(); ctx.arc(ex[i], ey[i], er[i], 0, 6.283); ctx.fill();
          ctx.fillStyle = pupC; ctx.beginPath(); ctx.arc(ex[i] + lx * er[i] * 0.5, ey[i] + ly * er[i] * 0.5, er[i] * 0.42, 0, 6.283); ctx.fill();
        }
      }
      if (s.mad) {
        ctx.strokeStyle = eyeC; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
        ctx.moveTo(ex[0] - er[0], ey[0] - er[0] - 2); ctx.lineTo(ex[0] + er[0] + 3, ey[0] - er[0] * 0.5 - 2);
        ctx.moveTo(ex[1] + er[1], ey[1] - er[1] - 2); ctx.lineTo(ex[1] - er[1] - 3, ey[1] - er[1] * 0.4 - 2);
        ctx.stroke();
      }
      if (s.mouth) {
        var y0 = h * 0.17, x0 = -w * 0.22, mw = w * 0.44, n = 5;
        ctx.beginPath(); ctx.moveTo(x0, y0);
        for (var t = 1; t <= n; t++) ctx.lineTo(x0 + mw * t / n, y0 + (t % 2 ? h * 0.15 : 0));
        ctx.lineTo(x0 + mw, h * 0.34); ctx.lineTo(x0, h * 0.34); ctx.closePath();
        ctx.fillStyle = '#f2f2eb'; ctx.fill(); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0d0b0a'; ctx.stroke();
      }
    }
    ctx.restore();
  }
  function draw(dtf) {
    ctx.clearRect(0, 0, W, H);
    var gx = ptr.x - rect.left, gy = ptr.y - rect.top, look = ptr.inside;
    for (var i = 0; i < bricks.length; i++) drawBrick(bricks[i], gx, gy, look, dtf);
  }

  /* ---------- input ---------- */
  function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function pick(x, y) { var f = Query.point(bricks, { x: x, y: y }); return f.length ? f[f.length - 1] : null; }
  function startDrag(x, y) {
    var b = pick(x, y);
    if (!b) return false;
    var c = Constraint.create({
      pointA: { x: x, y: y }, bodyB: b, pointB: { x: x - b.position.x, y: y - b.position.y },
      stiffness: 0.2, damping: 0.12, length: 0
    });
    Composite.add(world, c);
    drag = { c: c, b: b };
    return true;
  }
  function moveDrag(x, y) { if (drag) { drag.c.pointA.x = x; drag.c.pointA.y = y; } }
  function endDrag() {
    if (!drag) return;
    Composite.remove(world, drag.c); drag = null;
    canvas.classList.remove('dragging');
  }
  function spawnAt(x, y) {
    if (cleaning) return;
    make(Math.max(bw / 2, Math.min(W - bw / 2, x)), Math.max(-bh, y), rnd(-3, 3), rnd(-2, 2));
    if (window.FX && window.FX.comic) window.FX.comic(x + rect.left, y + rect.top);
    if (window.BSFX) window.BSFX.pop();
  }

  if (!RM) {
    /* mouse + pen */
    canvas.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      var p = pos(e);
      if (startDrag(p.x, p.y)) {
        canvas.classList.add('dragging');
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      } else spawnAt(p.x, p.y);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerType === 'touch') return;
      var p = pos(e); moveDrag(p.x, p.y);
    });
    canvas.addEventListener('pointerup', function (e) { if (e.pointerType !== 'touch') endDrag(); });
    canvas.addEventListener('pointercancel', function (e) { if (e.pointerType !== 'touch') endDrag(); });

    /* touch: only capture the gesture when a brick is touched */
    var tapStart = null, dragTouch = null;
    canvas.addEventListener('touchstart', function (e) {
      if (dragTouch != null) return;
      var t = e.changedTouches[0], p = pos(t);
      if (startDrag(p.x, p.y)) { dragTouch = t.identifier; canvas.classList.add('dragging'); e.preventDefault(); tapStart = null; }
      else tapStart = { x: p.x, y: p.y, t: Date.now(), id: t.identifier };
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === dragTouch) { var p = pos(t); moveDrag(p.x, p.y); if (e.cancelable) e.preventDefault(); }
        else if (tapStart && t.identifier === tapStart.id) {
          var q = pos(t); if (Math.abs(q.x - tapStart.x) + Math.abs(q.y - tapStart.y) > 12) tapStart = null;
        }
      }
    }, { passive: false });
    function tEnd(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === dragTouch) { dragTouch = null; endDrag(); }
        else if (tapStart && t.identifier === tapStart.id) {
          if (e.type === 'touchend' && Date.now() - tapStart.t < 450) spawnAt(tapStart.x, tapStart.y);
          tapStart = null;
        }
      }
    }
    canvas.addEventListener('touchend', tEnd);
    canvas.addEventListener('touchcancel', tEnd);
  }

  function bind(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
  bind('pit-more', function () { rain(12, 60); });
  bind('pit-quake', quake);
  bind('pit-clean', clean);

  /* collision thuds */
  Events.on(engine, 'collisionStart', function (ev) {
    if (!window.BSFX || !window.BSFX.on) return;
    var pairs = ev.pairs, best = 0;
    for (var i = 0; i < pairs.length; i++) {
      var a = pairs[i].bodyA, b = pairs[i].bodyB;
      var dvx = a.velocity.x - b.velocity.x, dvy = a.velocity.y - b.velocity.y;
      var s = Math.sqrt(dvx * dvx + dvy * dvy);
      if (s > best) best = s;
    }
    if (best > 2.5) window.BSFX.thud(Math.min(best / 18, 1));
  });

  /* ---------- lifecycle ---------- */
  size();
  if ('ResizeObserver' in window) new ResizeObserver(function () { size(); if (RM) draw(1); }).observe(stage);
  else window.addEventListener('resize', size);

  function firstShow() {
    if (started) return;
    started = true;
    rain(RM ? 42 : 44, 65);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) firstShow();
    }, { threshold: 0.12 }).observe(stage);
  } else { visible = true; firstShow(); }

  var acc = 0;
  J.onFrame(function (dt) {
    if (RM || !visible || !W) return;
    var r = stage.getBoundingClientRect(); rect.left = r.left; rect.top = r.top;
    acc += dt * STEP;
    var n = 0;
    while (acc >= STEP && n < 3) { limit(); Engine.update(engine, STEP); acc -= STEP; n++; }
    if (n === 3) acc = 0;
    draw(dt);
  });

  window.Pit = { quake: quake, rain: rain, clean: clean, isVisible: function () { return visible; } };
})();
