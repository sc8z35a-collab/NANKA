// 花畑を舞う蝶 (10匹, 羽ばたき)
import { landmark, groundY } from './util.js';
export function createButterflies({ app, world, scene, THREE }) {
  const fl = landmark(world, 'flowers');
  const home = fl ? fl.position.clone() : new THREE.Vector3(0, 2, 0);
  const area = fl ? Math.max(8, fl.radius * 1.4) : 14;
  // 右半円の羽: x>0 に広がる。lookAt は +Z を進行方向に向けるので胴体は Z 軸
  const wingGeo = new THREE.CircleGeometry(0.5, 14, -Math.PI / 2, Math.PI);
  wingGeo.rotateX(-Math.PI / 2); wingGeo.scale(1, 1, 0.8);
  const colors = ['#FFD36E', '#8FB8FF', '#FF9F7A', '#FFFFFF', '#C9A8FF', '#9EE6C8'];
  const list = [];
  for (let i = 0; i < 10; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide, roughness: 0.6 });
    const g = new THREE.Group();
    const L = new THREE.Mesh(wingGeo, mat), Rw = new THREE.Mesh(wingGeo, mat);
    Rw.scale.x = -1;
    const pivL = new THREE.Group(), pivR = new THREE.Group(); pivL.add(L); pivR.add(Rw);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.4, 3, 6), new THREE.MeshStandardMaterial({ color: '#8C7A6B', roughness: 1 }));
    body.rotation.x = Math.PI / 2;
    g.add(pivL, pivR, body); g.scale.setScalar(0.9 + Math.random() * 0.6);
    scene.add(g);
    list.push({ g, pivL, pivR, ph: Math.random() * 10, sp: 0.4 + Math.random() * 0.4, r: area * (0.3 + Math.random() * 0.7), h: 1.2 + Math.random() * 2.5 });
  }
  const ahead = new THREE.Vector3();
  return {
    update(dt, t) {
      for (const b of list) {
        const a = t * b.sp + b.ph;
        const x = home.x + Math.cos(a) * b.r + Math.sin(a * 2.3) * 2;
        const z = home.z + Math.sin(a * 1.3) * b.r;
        const y = groundY(world, x, z, home.y) + b.h + Math.sin(a * 5) * 0.5;
        ahead.set(x, y, z).multiplyScalar(2).sub(b.g.position); // 進行方向 = 2*新 - 旧
        b.g.position.set(x, y, z);
        b.g.lookAt(ahead);
        const f = Math.sin(t * 18 + b.ph) * 1.1;
        b.pivL.rotation.z = f; b.pivR.rotation.z = -f;
      }
    },
  };
}
