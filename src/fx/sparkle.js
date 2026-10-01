// landmark:open 時のきらめき (明るい金色〜白、加算ではなく通常合成で柔らかく)
import { makeSpriteTexture } from './util.js';
export function createSparkle({ app, world, scene, THREE }) {
  const N = 80;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: makeSpriteTexture(THREE, 'star'), color: '#FFE7A3', size: 1.6, transparent: true,
    depthWrite: false, opacity: 0, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.visible = false; scene.add(pts);
  let t0 = -10;
  app.bus.on('landmark:open', (e) => {
    const id = typeof e === 'string' ? e : e?.id;
    const lm = world?.landmarks?.find((l) => l.id === id); if (!lm) return;
    const c = lm.position, r = lm.radius || 4;
    for (let i = 0; i < N; i++) {
      pos[i * 3] = c.x + (Math.random() - 0.5) * r; pos[i * 3 + 1] = c.y + Math.random() * r * 1.5; pos[i * 3 + 2] = c.z + (Math.random() - 0.5) * r;
      const a = Math.random() * Math.PI * 2;
      vel[i * 3] = Math.cos(a) * 2; vel[i * 3 + 1] = 2 + Math.random() * 3; vel[i * 3 + 2] = Math.sin(a) * 2;
      life[i] = 0.6 + Math.random() * 0.8;
    }
    geo.attributes.position.needsUpdate = true; t0 = 0; pts.visible = true;
  });
  return {
    update(dt) {
      if (!pts.visible) return;
      t0 += dt;
      for (let i = 0; i < N; i++) { pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt; vel[i * 3 + 1] -= dt * 2; }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = Math.max(0, 1 - t0 / 1.6);
      if (t0 > 1.6) pts.visible = false;
    },
  };
}
