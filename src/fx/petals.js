// 風に舞う花びら (InstancedMesh, 600枚)
import { landmark } from './util.js';
export function createPetals({ app, world, scene, THREE }) {
  const N = app.quality === 'low' ? 200 : 600;
  // 少し反った花びら形状
  const geo = new THREE.PlaneGeometry(0.9, 0.6, 3, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, x * x * 0.6); }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7, metalness: 0, transparent: true, opacity: 0.95, emissive: '#FFE6EE', emissiveIntensity: 0.35 });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false; mesh.castShadow = false;
  const palette = ['#FFC4D6', '#FFD9E4', '#FFFFFF', '#FFE8B8', '#FFB8C8', '#F8D3FF'].map((c) => new THREE.Color(c));
  const R = Math.max(40, (world?.bounds?.radius || 60) * 0.9);
  const fl = landmark(world, 'flowers');
  const origin = fl ? fl.position.clone() : new THREE.Vector3();
  const P = [];
  for (let i = 0; i < N; i++) {
    const p = {
      x: origin.x + (Math.random() - 0.5) * R * 1.6, y: origin.y + 2 + Math.random() * 30, z: origin.z + (Math.random() - 0.5) * R * 1.6,
      rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
      sx: 0.6 + Math.random() * 1.6, sy: 0.6 + Math.random() * 1.4, ph: Math.random() * 100, s: 0.7 + Math.random() * 0.7,
    };
    P.push(p); mesh.setColorAt(i, palette[i % palette.length]);
  }
  scene.add(mesh);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const wind = new THREE.Vector3(2.2, 0, 0.9);
  return {
    mesh,
    update(dt, t) {
      const gust = 1 + Math.sin(t * 0.37) * 0.5 + Math.sin(t * 1.3) * 0.2;
      for (let i = 0; i < N; i++) {
        const p = P[i];
        p.x += (wind.x * gust + Math.sin(t * 0.8 + p.ph) * 0.8) * dt;
        p.z += (wind.z * gust + Math.cos(t * 0.6 + p.ph) * 0.8) * dt;
        p.y += (Math.sin(t * 1.7 + p.ph) * 0.6 - 0.45) * dt;
        p.rx += p.sx * dt; p.ry += p.sy * dt; p.rz += dt * 0.5;
        // 範囲外は風上へ戻す
        const dx = p.x - origin.x, dz = p.z - origin.z;
        if (dx * dx + dz * dz > R * R * 1.2 || p.y < origin.y - 25) {
          p.x = origin.x - wind.x / 2.4 * R * 0.8 + (Math.random() - 0.5) * R * 0.6;
          p.z = origin.z - wind.z / 2.4 * R * 0.8 + (Math.random() - 0.5) * R * 1.4;
          p.y = origin.y + 3 + Math.random() * 28;
        }
        e.set(p.rx, p.ry, p.rz); q.setFromEuler(e); v.set(p.x, p.y, p.z); sc.setScalar(p.s);
        m.compose(v, q, sc); mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
