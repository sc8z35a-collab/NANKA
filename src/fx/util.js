// fx 共通ユーティリティ
export function landmark(world, id) { return world?.landmarks?.find((l) => l.id === id) || null; }
export function groundY(world, x, z, fallback = 0) {
  const h = world?.getHeightAt?.(x, z);
  return Number.isFinite(h) ? h : fallback;
}
// 柔らかい丸/星スプライトを canvas で生成 (外部画像なし)
export function makeSpriteTexture(THREE, kind = 'soft') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  if (kind === 'star') {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 18 : 62; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
    g.closePath(); g.fill();
  } else {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
