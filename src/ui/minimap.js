// 水彩風ミニマップ (Agent C)
//  world.getHeightAt を格子サンプリングして島の形を「絵の具のにじみ」風に描く (起動時1回だけ)
//  マップは進行方向が上になるよう回転。視野の扇・ランドマークのアイコン・みつけた印。
//  タップ: アイコン付近 → そのランドマーク / それ以外の島の上 → そこへ移動。長押しでなく単タップ。
import { ICONS } from './icons.js';

export function createMinimap(app, world, landmarks, info, cb) {
  const R = Math.max(40, world?.bounds?.radius || 80) * 1.12; // 表示半径(ワールド単位)
  const el = document.createElement('div'); el.className = 'nk-minimap';
  el.innerHTML = `<div class="nk-mm-disc"><canvas class="nk-mm-base"></canvas><div class="nk-mm-icons"></div>
    <svg class="nk-mm-cone" viewBox="-50 -50 100 100"><defs><radialGradient id="nkcone" r=".5" cx="0" cy="0" gradientUnits="userSpaceOnUse" gradientTransform="scale(100)">
      <stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <path d="M0 0L-15 -34A37 37 0 0 1 15 -34Z" fill="url(#nkcone)"/><circle r="3.6" fill="#FF9F7A" stroke="#fff" stroke-width="1.6"/></svg></div>
    <div class="nk-mm-north"><b>N</b></div><div class="nk-mm-ring"></div>`;
  const disc = el.querySelector('.nk-mm-disc');
  const base = el.querySelector('canvas');
  const iconsEl = el.querySelector('.nk-mm-icons');
  const north = el.querySelector('.nk-mm-north');
  const cone = el.querySelector('.nk-mm-cone');

  // ---- ベース絵 ----
  const S = 360; base.width = base.height = S;
  function paint() {
    const g = base.getContext('2d');
    // 空の紙
    const bg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    bg.addColorStop(0, '#F4FBFF'); bg.addColorStop(1, '#D6EEFF');
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    // 高さサンプル
    const N = 120, hs = new Float32Array(N * N); let maxH = -1e9, minH = 1e9, landCount = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = ((i + 0.5) / N * 2 - 1) * R, z = ((j + 0.5) / N * 2 - 1) * R;
      let y = -Infinity; try { y = world.getHeightAt?.(x, z); } catch {}
      if (!Number.isFinite(y) || y < -50) y = -Infinity; else { landCount++; maxH = Math.max(maxH, y); minH = Math.min(minH, y); }
      hs[j * N + i] = y;
    }
    // オフスクリーンで陸マスク
    const off = document.createElement('canvas'); off.width = off.height = N; const og = off.getContext('2d'); const id = og.createImageData(N, N);
    const span = Math.max(1, maxH - minH);
    for (let k = 0; k < N * N; k++) {
      const y = hs[k]; const o = k * 4;
      if (y === -Infinity) { id.data[o + 3] = 0; continue; }
      const t = (y - minH) / span;
      // 低い=砂色っぽい若草 → 高い=明るい草色
      id.data[o] = 186 - t * 40; id.data[o + 1] = 222 + t * 10; id.data[o + 2] = 140 - t * 30; id.data[o + 3] = 255;
    }
    og.putImageData(id, 0, 0);
    if (!landCount) { // ワールドが高さを返さない場合: 円形の島
      og.fillStyle = '#B5DE90'; og.beginPath(); og.arc(N / 2, N / 2, N * 0.38, 0, Math.PI * 2); og.fill();
    }
    // にじみ: 外側に砂色の縁 → 本体 → 白いハイライト
    g.save(); g.imageSmoothingEnabled = true;
    g.filter = 'blur(6px)'; g.globalAlpha = 0.55; g.drawImage(tint(off, '#F4E3B5'), -4, 2, S + 8, S + 8);
    g.filter = 'blur(2.2px)'; g.globalAlpha = 1; g.drawImage(off, 0, 0, S, S);
    g.filter = 'blur(8px)'; g.globalAlpha = 0.35; g.globalCompositeOperation = 'soft-light'; g.drawImage(tint(off, '#FFFFFF'), -6, -8, S, S);
    g.restore();
    // 紙の粒
    const grain = g.getImageData(0, 0, S, S); const d = grain.data;
    for (let k = 0; k < d.length; k += 4) { const n = (Math.random() - 0.5) * 10; d[k] += n; d[k + 1] += n; d[k + 2] += n; }
    g.putImageData(grain, 0, 0);
    // 雲のうず (装飾)
    g.globalAlpha = 0.5; g.strokeStyle = '#FFFFFF'; g.lineWidth = 3; g.lineCap = 'round';
    for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.3, rr = S * (0.43 + (k % 2) * 0.03); g.beginPath(); g.arc(S / 2 + Math.cos(a) * rr, S / 2 + Math.sin(a) * rr, 9 + (k % 3) * 4, Math.PI, Math.PI * 1.9); g.stroke(); }
    g.globalAlpha = 1;
  }
  function tint(src, color) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c; }
  try { paint(); } catch (e) { console.warn('[minimap] paint', e); }

  // ---- アイコン ----
  const items = landmarks.map((lm) => {
    const c = info(lm.id);
    const b = document.createElement('span'); b.className = 'nk-mm-ico'; b.style.setProperty('--c', c.color);
    b.innerHTML = ICONS[c.icon] || ''; iconsEl.appendChild(b);
    return { lm, el: b, u: lm.position.x / R, v: lm.position.z / R };
  });
  for (const it of items) { it.el.style.left = `${50 + it.u * 50}%`; it.el.style.top = `${50 + it.v * 50}%`; }

  // ---- タップ ----
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => {
    const r = disc.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * 2 - 1, py = (e.clientY - r.top) / r.height * 2 - 1;
    // 回転を戻してワールド座標へ
    const a = -rot; const u = px * Math.cos(a) - py * Math.sin(a), v = px * Math.sin(a) + py * Math.cos(a);
    let best = null, bd = 0.2;
    for (const it of items) { const d = Math.hypot(it.u - u, it.v - v); if (d < bd) { bd = d; best = it; } }
    if (best) cb.onPickLandmark(best.lm.id);
    else if (Math.hypot(u, v) < 1) cb.onPickPoint(u * R, v * R);
  });

  // ---- 更新 ----
  let rot = 0;
  function update() {
    // カメラ方位 theta: カメラは target + (sinθ, cosθ)*d にいる → 視線は -(sinθ,cosθ)。視線方向を画面上に。
    // 視線の水平成分 (-sinθ, -cosθ) を画面上 (0,-1) に向ける回転角 = θ
    const th = cb.getHeading();
    rot = th;
    disc.style.transform = `rotate(${rot}rad)`;
    for (const it of items) {
      it.el.style.transform = `translate(-50%,-50%) rotate(${-rot}rad)`;
      it.el.classList.toggle('on', cb.isFound(it.lm.id));
    }
    north.style.transform = `rotate(${rot}rad)`;
    const t = cb.getTarget();
    cone.style.left = `${50 + (t.x / R) * 50}%`; cone.style.top = `${50 + (t.z / R) * 50}%`;
    // disc 内で視線方向へ向ける (画面上では常に上向き)
    cone.style.transform = `translate(-50%,-50%) rotate(${-rot}rad)`;
  }
  return { el, update, repaint: paint };
}
