// 操作 & UI (Agent C)
//  - タッチ専用オービットカメラ (camera.js)
//  - ランドマークのタップ判定 (Raycaster + 画面上ピンの許容半径)
//  - 3D上に浮かぶピン (HTML オーバーレイ, 毎フレーム投影, 遮蔽で半透明)
//  - 紹介カード (右38%, 白すりガラス, 写真ギャラリー, まめちしき, 前後送り, スワイプで閉じる)
//  - HUD: 左上ロゴ+みつけたスタンプ / 右上チップ / 左下ミニマップ(方位追従) / 下中央ヒント
// bus 発火: landmark:open {id} / landmark:close / camera:focus {id|null} / ui:press {kind,id?} / ui:discover {id,count,total} / ui:complete
import * as THREE from 'three';
import { createCameraRig } from './camera.js';
import { CONTENT, ORDER, HINTS, SITE } from './content.js';
import { icon } from './icons.js';
import { createMinimap } from './minimap.js';
import { createHalo } from './halo.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const STORE = 'nanka.found.v1';

export function initUI(app, world) {
  const { bus, camera, canvas } = app;
  injectFonts();
  const root = document.getElementById('ui-root') || document.body.appendChild(h('div')).appendChild(h('div'));
  root.classList.add('nk-ui');

  // ランドマーク (B 未統合/欠けがあっても動くように)
  let landmarks = (world.landmarks || []).filter((l) => l && l.position);
  if (!landmarks.length && app.params.has('mock')) landmarks = mockLandmarks(app, world);
  const byId = new Map(landmarks.map((l) => [l.id, l]));
  const ids = ORDER.filter((id) => byId.has(id)).concat(landmarks.map((l) => l.id).filter((id) => !ORDER.includes(id)));
  const info = (id) => CONTENT[id] || { name: byId.get(id)?.name || id, kana: '', en: '', color: '#8FB8FF', tint: '#E8F6FF', icon: 'star', lead: '', body: [], facts: [], trivia: '', photos: [] };

  const rig = createCameraRig(app, world, { idleScale: () => (state.open ? 0.0 : 1) });
  const halo = createHalo(app);
  const state = { open: null, found: loadFound() };
  app.ui = { rig, open: (id) => open(id), close: () => close() };

  // ============ HUD ============
  const hud = h('div', 'nk-hud');
  // 左上: ロゴ + スタンプ
  const brand = h('div', 'nk-brand');
  brand.innerHTML = `<button class="nk-logo" type="button" aria-label="はじめの ばしょへ">
      <span class="nk-logo-word">${[...SITE.title].map((c, i) => `<i style="--i:${i}">${c}</i>`).join('')}</span>
      <span class="nk-logo-sub">${SITE.subtitle}</span></button>
    <div class="nk-stamps" aria-label="みつけた ばしょ"></div>`;
  const stampsEl = brand.querySelector('.nk-stamps');
  hud.appendChild(brand);
  // 右上: チップ
  const chips = h('nav', 'nk-chips'); chips.setAttribute('aria-label', 'ばしょ');
  for (const id of ids) {
    const c = info(id);
    const b = h('button', 'nk-chip', `<span class="nk-chip-ico">${icon(c.icon)}</span><span class="nk-chip-label">${c.name}</span>`);
    b.type = 'button'; b.dataset.id = id; b.style.setProperty('--c', c.color); b.style.setProperty('--t', c.tint);
    b.addEventListener('click', () => { bus.emit('ui:press', { kind: 'chip', id }); open(id); });
    chips.appendChild(b);
  }
  hud.appendChild(chips);
  // 下中央: ヒント
  const hint = h('div', 'nk-hint'); hud.appendChild(hint);
  // 中央上: トースト
  const toast = h('div', 'nk-toast'); hud.appendChild(toast);
  root.appendChild(hud);

  // ピン層
  const pinLayer = h('div', 'nk-pins'); root.appendChild(pinLayer);
  const pins = new Map();
  for (const id of ids) {
    const c = info(id);
    const p = h('button', 'nk-pin', `<span class="nk-pin-bub"><span class="nk-pin-ico">${icon(c.icon)}</span><span class="nk-pin-ok">${icon('check')}</span></span><span class="nk-pin-label">${c.name}</span><span class="nk-pin-tail"></span>`);
    p.type = 'button'; p.style.setProperty('--c', c.color); p.style.setProperty('--t', c.tint); p.setAttribute('aria-label', c.name);
    p.addEventListener('click', (e) => { e.stopPropagation(); bus.emit('ui:press', { kind: 'pin', id }); open(id); });
    pinLayer.appendChild(p);
    pins.set(id, { el: p, lm: byId.get(id), occl: 0, occT: 1, vis: 1, x: -999, y: -999 });
  }

  // ミニマップ
  const minimap = createMinimap(app, world, landmarks, info, {
    onPickLandmark: (id) => { bus.emit('ui:press', { kind: 'minimap', id }); open(id); },
    onPickPoint: (x, z) => { bus.emit('ui:press', { kind: 'minimap' }); if (state.open) close(true); rig.flyTo({ target: new THREE.Vector3(x, Math.max(0, safeH(x, z)) + 2, z), dist: rig.home.dist * 0.75 }); },
    getHeading: () => rig.heading, getTarget: () => rig.cur.target, isFound: (id) => state.found.has(id),
  });
  root.appendChild(minimap.el);

  // ============ 紹介カード ============
  const card = h('aside', 'nk-card'); card.setAttribute('aria-hidden', 'true');
  card.innerHTML = `
    <div class="nk-card-scroll">
      <figure class="nk-gallery"><div class="nk-gallery-track"></div><div class="nk-gallery-dots"></div><figcaption class="nk-credit"></figcaption>
        <div class="nk-stamp-big"><span>${icon('sparkle')}</span><b>はっけん！</b></div></figure>
      <header class="nk-card-head">
        <span class="nk-card-ico"></span>
        <div><p class="nk-card-kana"></p><h2 class="nk-card-title"></h2><p class="nk-card-en"></p></div>
      </header>
      <p class="nk-card-lead"></p>
      <div class="nk-card-body"></div>
      <ul class="nk-facts"></ul>
      <section class="nk-trivia"><h3>${icon('star')}<span>まめちしき</span></h3><p></p></section>
      <p class="nk-card-count"></p>
    </div>
    <footer class="nk-card-foot">
      <button type="button" class="nk-btn nk-prev" aria-label="まえへ">${icon('prev')}</button>
      <button type="button" class="nk-btn nk-close" aria-label="とじる">${icon('close')}<span>とじる</span></button>
      <button type="button" class="nk-btn nk-next" aria-label="つぎへ">${icon('next')}</button>
    </footer>
    <div class="nk-card-grip" aria-hidden="true"></div>`;
  root.appendChild(card);
  const q = (s) => card.querySelector(s);
  const track = q('.nk-gallery-track'), dots = q('.nk-gallery-dots'), credit = q('.nk-credit'), scroller = q('.nk-card-scroll');
  q('.nk-close').addEventListener('click', () => { bus.emit('ui:press', { kind: 'close' }); close(); });
  q('.nk-prev').addEventListener('click', () => { bus.emit('ui:press', { kind: 'prev' }); step(-1); });
  q('.nk-next').addEventListener('click', () => { bus.emit('ui:press', { kind: 'next' }); step(1); });
  brand.querySelector('.nk-logo').addEventListener('click', () => { bus.emit('ui:press', { kind: 'home' }); if (state.open) close(true); rig.goHome(); });

  // 写真を先読み (カードを開いた瞬間に白くならないように)
  const preload = () => Object.values(CONTENT).forEach((c) => c.photos.forEach((p) => { const i = new Image(); i.decoding = 'async'; i.src = p.src; }));
  (window.requestIdleCallback || setTimeout)(preload, 1200);

  let galIdx = 0, galTimer = 0, galN = 0;
  function setGallery(i) {
    if (!galN) return; galIdx = (i + galN) % galN;
    track.querySelectorAll('img').forEach((im, k) => im.classList.toggle('on', k === galIdx));
    dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === galIdx));
    const p = CONTENT[state.open]?.photos[galIdx]; credit.textContent = p ? `写真: ${p.credit}` : '';
    galTimer = 0;
  }
  track.addEventListener('click', () => setGallery(galIdx + 1));

  function fillCard(id) {
    const c = info(id);
    card.style.setProperty('--c', c.color); card.style.setProperty('--t', c.tint);
    q('.nk-card-ico').innerHTML = icon(c.icon);
    q('.nk-card-kana').textContent = c.kana; q('.nk-card-title').textContent = c.name; q('.nk-card-en').textContent = c.en;
    q('.nk-card-lead').textContent = c.lead;
    q('.nk-card-body').innerHTML = c.body.map((t) => `<p>${t}</p>`).join('');
    q('.nk-facts').innerHTML = c.facts.map((f) => `<li><span>${f.k}</span><b>${f.v}</b></li>`).join('');
    q('.nk-trivia p').textContent = c.trivia; q('.nk-trivia').hidden = !c.trivia;
    track.innerHTML = c.photos.map((p, k) => `<img src="${p.src}" alt="${p.alt}" draggable="false" class="${k ? '' : 'on'}" style="--k:${k}">`).join('')
      || `<div class="nk-gallery-empty">${icon(c.icon)}</div>`;
    dots.innerHTML = c.photos.length > 1 ? c.photos.map(() => '<i></i>').join('') : '';
    galN = c.photos.length; galIdx = 0; setGallery(0);
    q('.nk-card-count').textContent = `みつけた ばしょ ${state.found.size} / ${ids.length}`;
    scroller.scrollTop = 0;
  }

  function open(id) {
    const lm = byId.get(id); if (!lm) return;
    const first = !state.found.has(id);
    const switching = !!state.open && state.open !== id;
    state.open = id;
    if (first) { state.found.add(id); saveFound(state.found); }
    card.classList.remove('swap'); void card.offsetWidth;
    if (switching) card.classList.add('swap');
    fillCard(id);
    card.classList.toggle('first', first);
    card.classList.add('open'); card.setAttribute('aria-hidden', 'false');
    document.body.classList.add('card-open');
    chips.querySelectorAll('.nk-chip').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    rig.focusLandmark(lm, { shift: shiftForCard() });
    halo.show(lm, info(id).color);
    renderStamps(first ? id : null);
    hideHint();
    bus.emit('camera:focus', { id });
    bus.emit('landmark:open', { id });
    if (first) {
      bus.emit('ui:discover', { id, count: state.found.size, total: ids.length });
      if (state.found.size === ids.length) setTimeout(() => { showToast(SITE.allFound, 5200, 'big'); bus.emit('ui:complete'); }, 1600);
    }
  }
  function close(silentCamera = false) {
    if (!state.open) return;
    state.open = null;
    card.classList.remove('open', 'swap'); card.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('card-open');
    chips.querySelectorAll('.nk-chip').forEach((b) => b.classList.remove('on'));
    rig.setShift(0);
    if (!silentCamera) rig.flyTo({ dist: Math.min(rig.home.dist, rig.goal.dist * 1.9), phi: Math.min(rig.goal.phi, 1.0), dur: 1.4 });
    halo.hide();
    bus.emit('camera:focus', { id: null });
    bus.emit('landmark:close');
  }
  function step(d) { const i = ids.indexOf(state.open); open(ids[(i + d + ids.length) % ids.length]); }
  const shiftForCard = () => (innerWidth / Math.max(1, innerHeight) > 1.25 ? 0.19 : 0);

  // カードの横スワイプ: 右へ払う = とじる / 写真部分の左右 = 写真送り
  {
    let sx = 0, sy = 0, st = 0, on = false, onGal = false;
    card.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); on = true; onGal = !!e.target.closest('.nk-gallery'); });
    card.addEventListener('pointermove', (e) => {
      if (!on || onGal) return; const dx = e.clientX - sx, dy = e.clientY - sy;
      if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.3) card.style.setProperty('--drag', `${dx}px`);
    });
    const end = (e) => {
      if (!on) return; on = false; card.style.removeProperty('--drag');
      const dx = e.clientX - sx, dy = e.clientY - sy, dt = performance.now() - st;
      if (Math.abs(dx) < Math.abs(dy) * 1.3 || Math.abs(dx) < 40) return;
      if (onGal) setGallery(galIdx + (dx < 0 ? 1 : -1));
      else if (dx > 90 || (dx > 40 && dt < 260)) { bus.emit('ui:press', { kind: 'close' }); close(); }
    };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', () => { on = false; card.style.removeProperty('--drag'); });
  }

  // ============ タップ判定 ============
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  const lmObjects = landmarks.map((l) => l.object).filter(Boolean);
  const findLm = (obj) => { while (obj) { const l = landmarks.find((x) => x.object === obj); if (l) return l; obj = obj.parent; } return null; };
  bus.on('ui:tap', ({ x, y }) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let hit = null;
    if (lmObjects.length) { const hs = ray.intersectObjects(lmObjects, true); if (hs.length) hit = findLm(hs[0].object); }
    if (!hit) { // 画面上で近いピン/ランドマーク (指は太いので広めに)
      let best = 1e9;
      for (const [id, p] of pins) {
        if (p.vis < 0.3) continue;
        const rad = Math.max(42, p.screenR || 0);
        const d = Math.hypot(p.ax - x, p.ay - y);
        if (d < rad && d < best) { best = d; hit = p.lm; }
      }
    }
    if (hit) { bus.emit('ui:press', { kind: 'pick', id: hit.id }); open(hit.id); }
    else if (state.open) { bus.emit('ui:press', { kind: 'close' }); close(); }
    else ripple(x, y);
  });
  function ripple(x, y) { const r = h('i', 'nk-ripple'); r.style.left = `${x}px`; r.style.top = `${y}px`; root.appendChild(r); setTimeout(() => r.remove(), 700); }

  // ============ 遮蔽判定用メッシュ (重い InstancedMesh/Points は除外) ============
  let occluders = [];
  const collectOccluders = () => {
    if (world.occluders) { occluders = world.occluders; return; }
    occluders = [];
    app.scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.visible || o.userData.noOcclude) return;
      if (o.material?.transparent || o.material?.depthWrite === false) return;
      const n = o.geometry?.attributes?.position?.count || 0;
      if (n > 0 && n < 400000) occluders.push(o);
    });
  };
  setTimeout(collectOccluders, 500); setInterval(collectOccluders, 6000);

  // ============ 毎フレーム: ピン投影 ============
  const v = new THREE.Vector3(), top = new THREE.Vector3(), camDir = new THREE.Vector3(), occRay = new THREE.Raycaster();
  let occCursor = 0, frame = 0;
  const pinArr = [...pins.entries()];
  app.onUpdate((dt) => {
    frame++;
    const W = app.size.w, H = app.size.h;
    camera.getWorldDirection(camDir);
    // 1フレーム1ピンだけ遮蔽レイ (負荷分散)
    if (pinArr.length && occluders.length && frame % 2 === 0) {
      const [, p] = pinArr[occCursor++ % pinArr.length];
      top.copy(p.lm.position); top.y += (p.lm.radius || 6) * 1.25;
      const dist = camera.position.distanceTo(top);
      occRay.set(camera.position, top.clone().sub(camera.position).normalize()); occRay.far = dist - (p.lm.radius || 6) * 0.9;
      const lmObj = p.lm.object;
      const hs = occRay.far > 0 ? occRay.intersectObjects(occluders, false) : [];
      p.occT = hs.some((hh) => !isChildOf(hh.object, lmObj)) ? 1 : 0;
    }
    for (const [id, p] of pinArr) {
      const lm = p.lm, r = lm.radius || 6;
      top.copy(lm.position); top.y += r * 1.25 + 1.2;
      v.copy(top).project(camera);
      const behind = v.z > 1 || top.clone().sub(camera.position).dot(camDir) < 0;
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      // ランドマーク中心の投影 (タップ許容半径用)
      const c = lm.position.clone(); c.y += r * 0.5; const cv = c.clone().project(camera);
      p.ax = (cv.x * 0.5 + 0.5) * W; p.ay = (-cv.y * 0.5 + 0.5) * H;
      const d = camera.position.distanceTo(c);
      p.screenR = (r / d) * (H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * 0.9;
      p.occl += (p.occT - p.occl) * Math.min(1, dt * 6);
      const isOpen = state.open === id;
      const offscreen = behind || x < -60 || x > W + 60 || y < -60 || y > H + 60;
      const target = offscreen ? 0 : isOpen ? 0 : state.open ? 0.35 : 1 - p.occl * 0.55;
      p.vis += (target - p.vis) * Math.min(1, dt * 8);
      const scale = THREE.MathUtils.clamp(1.25 - d / (rig.cfg.maxDist * 0.9), 0.62, 1.12);
      p.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%) scale(${(scale * (0.7 + 0.3 * p.vis)).toFixed(3)})`;
      p.el.style.opacity = p.vis.toFixed(3);
      p.el.style.zIndex = String(1000 - Math.round(d));
      p.el.classList.toggle('found', state.found.has(id));
      p.el.classList.toggle('near', d < r * 7 && !state.open);
      p.el.style.pointerEvents = p.vis > 0.3 ? 'auto' : 'none';
    }
    minimap.update(dt);
    // ギャラリー自動送り
    if (state.open && galN > 1) { galTimer += dt; if (galTimer > 5) setGallery(galIdx + 1); }
  });

  // ============ スタンプ / ヒント / トースト ============
  function renderStamps(newId) {
    stampsEl.innerHTML = ids.map((id) => {
      const c = info(id), f = state.found.has(id);
      return `<span class="nk-stamp ${f ? 'on' : ''} ${newId === id ? 'pop' : ''}" style="--c:${c.color};--t:${c.tint}" title="${c.name}">${icon(c.icon)}</span>`;
    }).join('') + `<span class="nk-stamp-count">${state.found.size}<small>/${ids.length}</small></span>`;
  }
  renderStamps();

  let hintI = 0, hintTimer = null, hintGone = false;
  function showHint(i) {
    if (hintGone) return;
    const t = HINTS[i % HINTS.length];
    hint.innerHTML = `<span class="nk-hint-ico">${icon(t.icon)}</span><span>${t.text}</span>`;
    hint.classList.remove('show'); void hint.offsetWidth; hint.classList.add('show');
  }
  function cycleHints() { showHint(hintI++); hintTimer = setTimeout(() => (hintI < HINTS.length * 2 ? cycleHints() : hideHint()), 3600); }
  function hideHint() { hintGone = true; clearTimeout(hintTimer); hint.classList.remove('show'); }
  let toastTimer = null;
  function showToast(text, ms = 3200, kind = '') {
    toast.className = `nk-toast ${kind}`; toast.innerHTML = `<span>${icon('sparkle')}</span>${text}`;
    void toast.offsetWidth; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
  }
  app.ui.toast = showToast;

  // 表示開始
  const reveal = () => {
    document.body.classList.add('ui-ready');
    setTimeout(() => showToast(state.found.size ? `おかえりなさい。みつけた ばしょ ${state.found.size} / ${ids.length}` : SITE.welcome, 4200), 900);
    setTimeout(cycleHints, 2600);
  };
  if (app.started) reveal(); else bus.once('app:start', reveal);
  // 2回目のドラッグ以降はヒントを早めに消す
  let drags = 0; bus.on('camera:interact', () => { if (++drags > 3) setTimeout(hideHint, 1500); });
  // 外部から開閉要求 (他エージェント/デバッグ)
  bus.on('ui:open', ({ id }) => open(id)); bus.on('ui:close', () => close());
  // 戻る(Android バック)でカードを閉じる
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function safeH(x, z) { try { const v2 = world.getHeightAt?.(x, z); return Number.isFinite(v2) ? v2 : 0; } catch { return 0; } }
  return app.ui;
}

function isChildOf(o, root) { while (o) { if (o === root) return true; o = o.parent; } return false; }
function loadFound() { try { return new Set(JSON.parse(localStorage.getItem(STORE) || '[]')); } catch { return new Set(); } }
function saveFound(s) { try { localStorage.setItem(STORE, JSON.stringify([...s])); } catch {} }

function injectFonts() {
  if (document.querySelector('link[data-nk-font]')) return;
  const pre = document.createElement('link'); pre.rel = 'preconnect'; pre.href = 'https://fonts.gstatic.com'; pre.crossOrigin = ''; document.head.appendChild(pre);
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.nkFont = '1';
  l.href = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800&display=swap';
  document.head.appendChild(l);
}

// ?mock=1: B のワールド未統合時の確認用ダミーランドマーク
function mockLandmarks(app, world) {
  const { scene } = app; const R = world.bounds?.radius || 60;
  const defs = [['lighthouse', '#FF9F7A', 0.0], ['windmill', '#8FB8FF', 1.25], ['flowers', '#FFB3C7', 2.5], ['waterfall', '#7FD3E8', 3.75], ['balloon', '#FFD36E', 5.0]];
  return defs.map(([id, col, a]) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(id === 'balloon' ? new THREE.SphereGeometry(4, 24, 16) : new THREE.CylinderGeometry(1.6, 2.4, 9, 16), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 }));
    m.position.y = id === 'balloon' ? 16 : 4.5; m.castShadow = true; g.add(m);
    const r = R * 0.5; g.position.set(Math.sin(a) * r, Math.max(0, world.getHeightAt?.(Math.sin(a) * r, Math.cos(a) * r) || 0), Math.cos(a) * r);
    scene.add(g);
    return { id, name: id, position: g.position.clone(), object: g, radius: id === 'balloon' ? 8 : 6 };
  });
}
