// フォーカス中ランドマークの足元に出る、やわらかい花冠リング (Agent C)
// ネオン禁止: 加算合成は使わず通常合成の白〜パステル。ゆっくり脈打ち、花びらの点が回る。
import * as THREE from 'three';

function ringTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const cx = S / 2;
  // ふんわり円
  const rg = g.createRadialGradient(cx, cx, S * 0.30, cx, cx, S * 0.5);
  rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.55, 'rgba(255,255,255,.85)'); rg.addColorStop(0.75, 'rgba(255,255,255,.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  // 点線の花びら
  g.fillStyle = 'rgba(255,255,255,1)';
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * S * 0.4, cx + Math.sin(a) * S * 0.4, 7, 4, a, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function createHalo(app) {
  const { scene } = app;
  const tex = ringTexture();
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -4;
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 5; ring.userData.noOcclude = true; ring.visible = false;
  const ring2 = ring.clone(); ring2.material = mat.clone(); ring2.userData.noOcclude = true;
  const grp = new THREE.Group(); grp.add(ring, ring2); grp.userData.noOcclude = true; scene.add(grp);
  let target = 0, alpha = 0, size = 10, color = new THREE.Color('#fff'), t0 = 0, follow = null;

  app.onUpdate((dt, t) => {
    alpha += (target - alpha) * Math.min(1, dt * 4);
    const vis = alpha > 0.01; ring.visible = ring2.visible = vis; if (!vis) return;
    if (follow) grp.position.set(follow.position.x, follow.position.y + 0.25, follow.position.z);
    const k = t - t0;
    const pulse = 1 + Math.sin(k * 2.2) * 0.04;
    ring.scale.setScalar(size * pulse); ring.rotation.z = k * 0.25;
    mat.opacity = alpha * 0.85; mat.color.copy(color).lerp(new THREE.Color('#fff'), 0.45);
    // 外へ広がる波紋
    const w = (k * 0.55) % 1;
    ring2.scale.setScalar(size * (1 + w * 0.8)); ring2.rotation.z = -k * 0.15;
    ring2.material.opacity = alpha * (1 - w) * 0.5; ring2.material.color.copy(color).lerp(new THREE.Color('#fff'), 0.2);
  });
  return {
    show(lm, col) { follow = lm.object && lm.id !== 'balloon' ? { position: lm.position } : { position: lm.position }; size = (lm.radius || 6) * 2.6; color.set(col || '#fff'); target = 1; t0 = app.clock.elapsedTime; },
    hide() { target = 0; },
  };
}
