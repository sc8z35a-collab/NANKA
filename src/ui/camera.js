// タッチ専用オービットカメラ (Agent C)
//  1本指ドラッグ = 回転 / 2本指ピンチ = ズーム / 2本指ドラッグ = パン
//  慣性・極角/距離制限・地面めり込み防止・8秒無操作で自動周回・ランドマークへの滑らかなフライト
//  カード表示時は filmOffset で被写体を画面左側の空きエリア中央に寄せる
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// 角度差を -PI..PI に
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

export function createCameraRig(app, world, opts = {}) {
  const { camera, canvas, bus } = app;
  const R = Math.max(40, world?.bounds?.radius || 80);
  const getH = (x, z) => {
    try { const h = world.getHeightAt?.(x, z); return Number.isFinite(h) ? h : -Infinity; } catch { return -Infinity; }
  };

  const cfg = {
    minDist: opts.minDist ?? Math.max(10, R * 0.12),
    maxDist: opts.maxDist ?? R * 3.2,
    minPhi: 0.18, maxPhi: 1.42,          // 極角 (0=真上)
    rotSpeed: 2.6,                        // 画面幅ドラッグで何rad回るか
    friction: 3.2,                        // 慣性の減衰
    idleDelay: 8, idleSpeed: 0.055,       // rad/s
    groundClear: 2.2,
    panLimit: R * 1.1,
  };

  // 現在値と目標値
  const cur = { theta: 0.6, phi: 1.02, dist: R * 1.75, target: new THREE.Vector3(0, R * 0.06, 0) };
  const goal = { theta: cur.theta, phi: cur.phi, dist: cur.dist, target: cur.target.clone() };
  const home = { theta: cur.theta, phi: cur.phi, dist: cur.dist, target: cur.target.clone() };
  const vel = { theta: 0, phi: 0 };
  // 起動直後の「空から降りてくる」イントロ
  cur.dist = R * 2.9; cur.phi = 0.55; cur.theta = goal.theta - 0.9;

  let lastInput = -1e9;  // 最後に触った時刻 (app 経過秒)
  let now = 0;
  let idleBlend = 0;      // 自動周回の効き具合 0..1
  let flight = null;      // { from, to, t, dur, onDone }
  let shiftCur = 0, shiftGoal = 0; // 画面横シフト (幅に対する割合)
  let enabled = true;

  // ---- ポインタ管理 ----
  const ptrs = new Map(); // id -> {x,y,x0,y0,t0}
  let pinch = null;       // {d0, dist0, mx, my}
  let dragMoved = 0;

  const vw = () => canvas.clientWidth || innerWidth;
  const vh = () => canvas.clientHeight || innerHeight;

  function touch() { lastInput = now; if (flight && !flight.locked) flight = null; }

  function onDown(e) {
    if (!enabled) return;
    canvas.setPointerCapture?.(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
    vel.theta = vel.phi = 0;
    if (ptrs.size === 1) dragMoved = 0;
    if (ptrs.size === 2) startPinch();
    touch();
    bus.emit('camera:interact', { type: 'down' });
  }
  function startPinch() {
    const [a, b] = [...ptrs.values()];
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, dist0: goal.dist, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
  const _right = new THREE.Vector3(), _fwd = new THREE.Vector3();
  function onMove(e) {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    dragMoved = Math.max(dragMoved, Math.hypot(p.x - p.x0, p.y - p.y0));
    touch();
    if (ptrs.size === 1) {
      const k = cfg.rotSpeed / vw();
      const dth = -dx * k, dph = -dy * k * 0.8;
      goal.theta += dth; goal.phi = clamp(goal.phi + dph, cfg.minPhi, cfg.maxPhi);
      // 慣性用速度 (指の速度を平滑化)
      const dt = Math.max(1 / 240, (e.timeStamp - (p.ts || e.timeStamp - 16)) / 1000); p.ts = e.timeStamp;
      vel.theta = THREE.MathUtils.lerp(vel.theta, dth / dt, 0.35);
      vel.phi = THREE.MathUtils.lerp(vel.phi, dph / dt, 0.35);
    } else if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      goal.dist = clamp(pinch.dist0 * (pinch.d0 / d), cfg.minDist, cfg.maxDist);
      // 2本指の中点移動 = パン (地面と平行に)
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const pdx = mx - pinch.mx, pdy = my - pinch.my; pinch.mx = mx; pinch.my = my;
      const s = (goal.dist / vh()) * 1.1;
      _right.set(Math.cos(cur.theta), 0, -Math.sin(cur.theta));
      _fwd.set(Math.sin(cur.theta), 0, Math.cos(cur.theta));
      goal.target.addScaledVector(_right, -pdx * s).addScaledVector(_fwd, -pdy * s);
      clampTarget(goal.target);
    }
  }
  function onUp(e) {
    const p = ptrs.get(e.pointerId); if (!p) return;
    ptrs.delete(e.pointerId);
    const dt = performance.now() - p.t0;
    if (ptrs.size === 0) {
      // 指を離す直前に止まっていたら慣性を出さない
      if (e.timeStamp - (p.ts || 0) > 80) vel.theta = vel.phi = 0;
      if (dragMoved < 8 && dt < 320 && !pinch) bus.emit('ui:tap', { x: e.clientX, y: e.clientY });
      pinch = null;
    } else if (ptrs.size === 1) {
      pinch = null; vel.theta = vel.phi = 0;
      const q = [...ptrs.values()][0]; q.x0 = q.x; q.y0 = q.y; dragMoved = 99; // ピンチ後のタップ誤爆防止
    }
    touch();
  }
  // PC 確認用ホイール
  function onWheel(e) { e.preventDefault(); goal.dist = clamp(goal.dist * Math.exp(e.deltaY * 0.0012), cfg.minDist, cfg.maxDist); touch(); }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function clampTarget(t) {
    const r = Math.hypot(t.x, t.z);
    if (r > cfg.panLimit) { t.x *= cfg.panLimit / r; t.z *= cfg.panLimit / r; }
    t.y = clamp(t.y, -R * 0.2, R * 0.6);
  }

  // ---- フライト ----
  function flyTo({ target, dist, phi, theta, dur, shift = 0, locked = false }, onDone) {
    const to = {
      target: target ? target.clone() : goal.target.clone(),
      dist: clamp(dist ?? goal.dist, cfg.minDist, cfg.maxDist),
      phi: clamp(phi ?? goal.phi, cfg.minPhi, cfg.maxPhi),
      theta: theta ?? goal.theta,
    };
    // 最短回転方向
    to.theta = cur.theta + wrap(to.theta - cur.theta);
    const from = { target: cur.target.clone(), dist: cur.dist, phi: cur.phi, theta: cur.theta };
    const travel = from.target.distanceTo(to.target) / R + Math.abs(to.theta - from.theta) * 0.35 + Math.abs(Math.log(to.dist / from.dist));
    flight = { from, to, t: 0, dur: dur ?? clamp(1.1 + travel * 0.9, 1.2, 2.6), onDone, locked };
    vel.theta = vel.phi = 0;
    shiftGoal = shift;
    lastInput = now;
  }

  // ランドマークに寄る: 現在の方位から見て少し斜め上から
  function focusLandmark(lm, { shift = 0.19 } = {}) {
    const r = lm.radius || 6;
    const p = lm.position.clone();
    const tgt = p.clone(); tgt.y += r * 0.55;
    // 外側(島の中心から外向き)から見るか、現在方位を維持するか: 現在方位に近い方を採用しつつ外向きへ寄せる
    const out = Math.atan2(p.x, p.z);
    const th = Math.hypot(p.x, p.z) > R * 0.15 ? cur.theta + wrap(out - cur.theta) * 0.55 : cur.theta;
    flyTo({ target: tgt, dist: clamp(r * 3.4, cfg.minDist, R * 0.9), phi: 1.08, theta: th, shift });
  }
  function goHome() { flyTo({ ...home, target: home.target, shift: 0 }); }

  // ---- 毎フレーム ----
  const _off = new THREE.Vector3();
  function update(dt, t) {
    now = t;
    if (flight) {
      flight.t = Math.min(1, flight.t + dt / flight.dur);
      const k = easeInOut(flight.t);
      const { from, to } = flight;
      // 弧を描く: 途中で少し引いて上がる
      const arc = Math.sin(Math.PI * k) * Math.min(0.35, from.target.distanceTo(to.target) / R);
      cur.target.lerpVectors(from.target, to.target, k);
      cur.dist = Math.exp(THREE.MathUtils.lerp(Math.log(from.dist), Math.log(to.dist), k)) * (1 + arc);
      cur.phi = THREE.MathUtils.lerp(from.phi, to.phi, k) - arc * 0.25;
      cur.theta = THREE.MathUtils.lerp(from.theta, to.theta, k);
      goal.target.copy(cur.target); goal.dist = cur.dist; goal.phi = cur.phi; goal.theta = cur.theta;
      if (flight.t >= 1) { const f = flight; flight = null; goal.dist = to.dist; goal.phi = to.phi; f.onDone?.(); }
    } else {
      // 慣性
      if (ptrs.size === 0) {
        goal.theta += vel.theta * dt; goal.phi = clamp(goal.phi + vel.phi * dt, cfg.minPhi, cfg.maxPhi);
        const f = Math.exp(-cfg.friction * dt); vel.theta *= f; vel.phi *= f;
      }
      // 自動周回
      const idle = ptrs.size === 0 && t - lastInput > cfg.idleDelay;
      idleBlend += ((idle ? 1 : 0) - idleBlend) * damp(idle ? 0.6 : 6, dt);
      goal.theta += cfg.idleSpeed * idleBlend * dt * (opts.idleScale?.() ?? 1);
      // 平滑追従
      const k = damp(ptrs.size ? 18 : 7, dt);
      cur.theta += (goal.theta - cur.theta) * k;
      cur.phi += (goal.phi - cur.phi) * k;
      cur.dist += (goal.dist - cur.dist) * damp(9, dt);
      cur.target.lerp(goal.target, damp(6, dt));
    }

    // 位置計算
    const sp = Math.sin(cur.phi);
    _off.set(sp * Math.sin(cur.theta), Math.cos(cur.phi), sp * Math.cos(cur.theta)).multiplyScalar(cur.dist);
    camera.position.copy(cur.target).add(_off);
    // 地面めり込み防止 (カメラ直下と少し手前を検査)
    const gh = Math.max(getH(camera.position.x, camera.position.z), getH((camera.position.x + cur.target.x) / 2, (camera.position.z + cur.target.z) / 2));
    const minY = gh + cfg.groundClear;
    if (camera.position.y < minY) {
      camera.position.y = minY;
      // 目標極角も押し戻して次フレーム以降の抵抗感を自然に
      const ny = (minY - cur.target.y) / cur.dist;
      const phiLimit = Math.acos(clamp(ny, -1, 1));
      if (goal.phi > phiLimit) goal.phi = cur.phi = Math.max(cfg.minPhi, phiLimit);
    }
    camera.lookAt(cur.target);

    // 横シフト (カード表示時に被写体を左へ)
    shiftCur += (shiftGoal - shiftCur) * damp(5, dt);
    const fw = camera.getFilmWidth();
    const off = shiftCur * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect * fw;
    if (Math.abs(camera.filmOffset - off) > 1e-4) { camera.filmOffset = off; camera.updateProjectionMatrix(); }
  }
  app.onUpdate(update);
  bus.on('resize', () => { camera.filmOffset = -1; }); // 次フレームで再計算させる

  // 初回イントロ: app:start で家の位置へ滑空
  bus.once('app:start', () => flyTo({ ...home, dur: 3.2 }));
  bus.once('app:ready', () => { if (app.started) flyTo({ ...home, dur: 3.2 }); });

  return {
    cfg, cur, goal, home,
    flyTo, focusLandmark, goHome,
    setShift(v) { shiftGoal = v; },
    setEnabled(v) { enabled = v; if (!v) ptrs.clear(); },
    get idle() { return idleBlend > 0.5; },
    get flying() { return !!flight; },
    get dragging() { return ptrs.size > 0; },
    get heading() { return cur.theta; },
    poke: touch,
  };
}
