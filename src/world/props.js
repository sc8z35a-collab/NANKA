// 小物: 村の家 / 橋 / 吊り橋 / 柵 / 街灯 / ベンチ / 道標 / 井戸 / 桟橋 / 煙 (Agent B)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SPOTS, PATHS, RIVER, BRIDGE_AT, mainHeight, ISLETS, isletHeight, pathDist, rimRadius, WATER_Y } from './layout.js';
import { cottage, signTexture } from './landmarks.js';
import { pbr, softDotTexture, shared } from './textures.js';
import { mulberry32 } from './noise.js';

const V3 = THREE.Vector3;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), ps = new V3(), eu = new THREE.Euler();
const mesh = (g, m, c = true) => { const x = new THREE.Mesh(g, m); x.castShadow = c; x.receiveShadow = true; return x; };

function placeOn(obj, x, z, yOff = 0, h = mainHeight) { obj.position.set(x, h(x, z) + yOff, z); return obj; }

// ---- 村 ----
function village(scene, smokeSources) {
  const [vx, vz] = SPOTS.village;
  const houses = [
    { dx: -7.5, dz: -2, ry: 0.5, o: { w: 5.2, d: 4.2, h: 3.0, wall: '#FFF5E6', roof: '#E9886E', seed: 1 } },
    { dx: 6.8, dz: -3.5, ry: -0.45, o: { w: 4.6, d: 4.0, h: 2.8, wall: '#FFFBF2', roof: '#8FB8E8', seed: 2 } },
    { dx: -1, dz: -9, ry: 0.05, o: { w: 6.0, d: 4.4, h: 3.4, wall: '#FFF0E0', roof: '#F2B26B', seed: 4 } },
    { dx: 9.5, dz: 5.5, ry: -1.3, o: { w: 4.2, d: 3.6, h: 2.6, wall: '#F7FBF3', roof: '#9FCB8A', seed: 5 } },
    { dx: -9, dz: 6, ry: 1.25, o: { w: 4.4, d: 3.8, h: 2.7, wall: '#FFF6EE', roof: '#E7A3B5', seed: 6 } },
  ];
  for (const h of houses) {
    const c = cottage(h.o); const x = vx + h.dx, z = vz + h.dz;
    let y = Infinity; for (const [ox, oz] of [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2], [0, 0]]) y = Math.min(y, mainHeight(x + ox, z + oz));
    c.position.set(x, y - 0.25, z); c.rotation.y = Math.atan2(vx - x, vz - z) + (h.ry * 0.2); scene.add(c);
    if (c.userData.chimneyTop) { const p = c.userData.chimneyTop.clone(); c.updateMatrixWorld(); p.applyMatrix4(c.matrixWorld); smokeSources.push(p); }
  }
  // 井戸
  const stone = pbr('#E8DECF', 'stone', { repeat: 1, rough: 0.95, normal: 1 });
  const wood = pbr('#C99A6E', 'wood', { repeat: 1 });
  const roofM = pbr('#E9886E', 'roof', { repeat: 0.8 });
  const well = new THREE.Group();
  well.add(mesh(new THREE.CylinderGeometry(1.25, 1.35, 1.0, 20, 1, true), stone).translateY(0.5));
  const rim = mesh(new THREE.TorusGeometry(1.25, 0.18, 8, 24), stone); rim.rotation.x = Math.PI / 2; rim.position.y = 1.0; well.add(rim);
  const wat = new THREE.Mesh(new THREE.CircleGeometry(1.15, 20), new THREE.MeshStandardMaterial({ color: '#8FD3E6', roughness: 0.1 })); wat.rotation.x = -Math.PI / 2; wat.position.y = 0.6; well.add(wat);
  for (const s of [-1, 1]) well.add(mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), wood).translateX(s * 1.1).translateY(1.6));
  const wr = mesh(new THREE.ConeGeometry(1.7, 0.9, 4), roofM); wr.rotation.y = Math.PI / 4; wr.position.y = 3.05; well.add(wr);
  const bucket = mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.35, 10), wood); bucket.position.set(0.3, 1.25, 0); well.add(bucket);
  placeOn(well, vx, vz, -0.05); scene.add(well);
  // 洗濯ロープ + 布
  const ropeM = new THREE.MeshStandardMaterial({ color: '#F2EADB', roughness: 0.9 });
  const a = new V3(vx - 4, mainHeight(vx - 4, vz + 4) + 2.2, vz + 4), b = new V3(vx + 3, mainHeight(vx + 3, vz + 6.5) + 2.2, vz + 6.5);
  for (const p of [a, b]) { const pole = mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.3), wood); pole.position.set(p.x, p.y - 1.1, p.z); scene.add(pole); }
  const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(new V3(0, -0.35, 0)), b);
  scene.add(mesh(new THREE.TubeGeometry(curve, 20, 0.02, 4), ropeM, false));
  const cloths = ['#FFFFFF', '#FFD36E', '#8FB8FF', '#FFB3C7', '#B8E28A'];
  const clothes = [];
  for (let i = 0; i < 5; i++) {
    const p = curve.getPoint(0.12 + i * 0.18);
    const g = new THREE.PlaneGeometry(0.75, 0.9, 4, 4); g.translate(0, -0.45, 0);
    const m = mesh(g, new THREE.MeshStandardMaterial({ color: cloths[i], side: THREE.DoubleSide, roughness: 0.9 }));
    m.position.copy(p); m.lookAt(p.clone().add(new V3(-(b.z - a.z), 0, b.x - a.x))); scene.add(m); clothes.push(m);
  }
  // 樽・木箱
  const crate = mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), wood);
  for (const [dx, dz, s] of [[4, 1, 1], [4.7, 1.8, 0.8], [-4, -5, 1]]) { const c = crate.clone(); c.scale.setScalar(s); placeOn(c, vx + dx, vz + dz, 0.4 * s); c.rotation.y = dx; scene.add(c); }
  const barrel = new THREE.LatheGeometry([...Array(9)].map((_, i) => new THREE.Vector2(0.42 + Math.sin(i / 8 * Math.PI) * 0.08, i / 8 * 1.1)), 16);
  for (const [dx, dz] of [[-5, 3], [-5.6, 2.2]]) { const br = mesh(barrel, wood); placeOn(br, vx + dx, vz + dz, -0.02); scene.add(br); }
  return { clothes };
}

// ---- 小道沿いの柵 (ところどころ) ----
function fences(scene) {
  const wood = pbr('#D6B48C', 'wood', { repeat: 0.6, rough: 0.9 });
  const postG = new THREE.CylinderGeometry(0.09, 0.11, 1.1, 6); postG.translate(0, 0.55, 0);
  const railG = new THREE.BoxGeometry(1, 0.08, 0.06);
  const posts = [], rails = [];
  const segs = [[1, 0.0, 0.35, 1], [1, 0.5, 0.95, -1], [3, 0.55, 0.95, 1], [2, 0.1, 0.8, -1]];
  for (const [pi, t0, t1, sideS] of segs) {
    const path = PATHS[pi];
    // 折れ線を等間隔サンプリング
    const pts = []; let total = 0; const L = [];
    for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); L.push(l); total += l; }
    const sample = (t) => { let d = t * total; for (let i = 0; i < L.length; i++) { if (d <= L[i]) { const f = d / L[i]; return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f, Math.atan2(path[i + 1][1] - path[i][1], path[i + 1][0] - path[i][0])]; } d -= L[i]; } const n = path.length - 1; return [path[n][0], path[n][1], 0]; };
    const step = 2.2 / total;
    let prev = null;
    for (let t = t0; t <= t1; t += step) {
      const [x, z, a] = sample(t); const ox = -Math.sin(a) * 2.1 * sideS, oz = Math.cos(a) * 2.1 * sideS;
      const px = x + ox, pz = z + oz, h = mainHeight(px, pz); if (!Number.isFinite(h)) { prev = null; continue; }
      const p = new V3(px, h - 0.05, pz); posts.push(p);
      if (prev) for (const yy of [0.45, 0.85]) rails.push([prev.clone().add(new V3(0, yy, 0)), p.clone().add(new V3(0, yy, 0))]);
      prev = p;
    }
  }
  const pim = new THREE.InstancedMesh(postG, wood, posts.length);
  posts.forEach((p, i) => { m4.compose(p, q.setFromAxisAngle(new V3(0, 1, 0), i), sc.set(1, 0.9 + (i % 3) * 0.06, 1)); pim.setMatrixAt(i, m4); });
  const rim = new THREE.InstancedMesh(railG, wood, rails.length);
  rails.forEach(([a, b], i) => { const mid = a.clone().add(b).multiplyScalar(0.5); const d = b.clone().sub(a); const len = d.length(); q.setFromUnitVectors(new V3(1, 0, 0), d.normalize()); m4.compose(mid, q, sc.set(len, 1, 1)); rim.setMatrixAt(i, m4); });
  pim.castShadow = rim.castShadow = true; pim.receiveShadow = rim.receiveShadow = true;
  scene.add(pim, rim);
}

// ---- 川の木橋 (アーチ) ----
function riverBridge(scene) {
  const wood = pbr('#D2A97C', 'wood', { repeat: 0.7, rough: 0.85, normal: 0.9 });
  const [bx, bz] = BRIDGE_AT;
  // 川の向き
  const dir = new V3(RIVER[3][0] - RIVER[2][0], 0, RIVER[3][1] - RIVER[2][1]).normalize();
  const g = new THREE.Group();
  const span = 9.5, W = 2.6;
  const planks = 22;
  for (let i = 0; i < planks; i++) {
    const t = i / (planks - 1) - 0.5; const y = Math.cos(t * Math.PI) * 1.1;
    const p = mesh(new THREE.BoxGeometry(0.4, 0.12, W), wood); p.position.set(t * span, y, 0); p.rotation.z = -Math.sin(t * Math.PI) * 0.35; p.rotation.y = (i % 2 ? 0.02 : -0.02); g.add(p);
  }
  for (const s of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16 - 0.5; pts.push(new V3(t * span, Math.cos(t * Math.PI) * 1.1 + 1.0, s * W / 2)); }
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.08, 6), wood));
    for (let i = 0; i <= 6; i++) { const t = i / 6 - 0.5; const y = Math.cos(t * Math.PI) * 1.1; g.add(mesh(new THREE.BoxGeometry(0.14, 1.05, 0.14), wood).translateX(t * span).translateY(y + 0.5).translateZ(s * W / 2)); }
    // 下の梁
    const bpts = []; for (let i = 0; i <= 16; i++) { const t = i / 16 - 0.5; bpts.push(new V3(t * span * 1.02, Math.cos(t * Math.PI) * 1.1 - 0.2, s * (W / 2 - 0.2))); }
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bpts), 32, 0.12, 6), wood));
  }
  g.position.set(bx, WATER_Y + 0.6, bz);
  g.rotation.y = -Math.atan2(dir.z, dir.x) + Math.PI / 2;
  scene.add(g);
}

// ---- 吊り橋 (主島 ↔ 西の小島) ----
function ropeBridge(app, scene) {
  const west = ISLETS.find((i) => i.id === 'west');
  const A = new V3(-57, 0, -16); A.y = mainHeight(A.x, A.z) - 0.1;
  const Bx = west.c[0] + 17.5, Bz = west.c[2] + 2.5; const B = new V3(Bx, isletHeight(west, Bx, Bz) - 0.1, Bz);
  const wood = pbr('#CFA677', 'wood', { repeat: 0.5, rough: 0.9 });
  const ropeM = new THREE.MeshStandardMaterial({ color: '#EADCC2', roughness: 0.95 });
  const dir = B.clone().sub(A); const len = Math.hypot(dir.x, dir.z); const side = new V3(-dir.z, 0, dir.x).normalize();
  const sag = 3.0, W = 1.25;
  const deckAt = (t) => A.clone().lerp(B, t).add(new V3(0, -Math.sin(t * Math.PI) * sag, 0));
  const N = Math.round(len / 0.55);
  const plank = new THREE.BoxGeometry(0.42, 0.08, W * 2);
  const im = new THREE.InstancedMesh(plank, wood, N);
  const ang = Math.atan2(dir.z, dir.x);
  const swayRef = [];
  for (let i = 0; i < N; i++) { const t = (i + 0.5) / N; const p = deckAt(t); const slope = Math.atan2(deckAt(t + 0.01).y - p.y, len * 0.01); eu.set(0, -ang, slope + (i % 3 - 1) * 0.02, 'YXZ'); m4.compose(p, q.setFromEuler(eu), sc.set(1, 1, 1 - (i % 4) * 0.03)); im.setMatrixAt(i, m4); swayRef.push(p); }
  im.castShadow = true; im.receiveShadow = true; scene.add(im);
  // 手すりロープ + 縦ロープ
  for (const s of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(deckAt(t).add(side.clone().multiplyScalar(s * W)).add(new V3(0, 1.15 - Math.sin(t * Math.PI) * -0.4, 0))); }
    scene.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.05, 5), ropeM, false));
    const lo = []; for (let i = 0; i <= 30; i++) { const t = i / 30; lo.push(deckAt(t).add(side.clone().multiplyScalar(s * W)).add(new V3(0, -0.02, 0))); }
    scene.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lo), 60, 0.04, 5), ropeM, false));
    const vg = []; for (let i = 1; i < 30; i++) { const t = i / 30; const a = deckAt(t).add(side.clone().multiplyScalar(s * W)); const h = 1.15 + Math.sin(t * Math.PI) * 0.4; const c = new THREE.CylinderGeometry(0.018, 0.018, h, 3); c.translate(a.x, a.y + h / 2, a.z); vg.push(c); }
    scene.add(mesh(mergeGeometries(vg), ropeM, false));
  }
  // 両端の柱
  for (const P of [A, B]) for (const s of [-1, 1]) {
    const p = mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.2, 8), wood); p.position.copy(P).add(side.clone().multiplyScalar(s * W)).add(new V3(0, 1.0, 0)); scene.add(p);
    const cap = mesh(new THREE.SphereGeometry(0.2, 8, 6), wood); cap.position.copy(p.position).add(new V3(0, 1.15, 0)); scene.add(cap);
  }
  // 西の小島の家
  const hut = cottage({ w: 4.5, d: 3.8, h: 2.6, wall: '#FFF9EF', roof: '#9FCB8A', seed: 9 });
  const hx = west.c[0] + 1, hz = west.c[2] - 1; hut.position.set(hx, isletHeight(west, hx, hz) - 0.25, hz); hut.rotation.y = Math.PI / 2 + 0.3; scene.add(hut);
  return { smoke: (() => { const p = hut.userData.chimneyTop?.clone(); if (!p) return null; hut.updateMatrixWorld(); return p.applyMatrix4(hut.matrixWorld); })() };
}

// ---- 街灯・ベンチ・道標 ----
function streetProps(scene) {
  const metal = new THREE.MeshStandardMaterial({ color: '#8FB0C8', roughness: 0.45, metalness: 0.5 });
  const wood = pbr('#D2A97C', 'wood', { repeat: 0.6 });
  const lampHead = new THREE.MeshStandardMaterial({ color: '#FFF8E6', emissive: '#FFEFC8', emissiveIntensity: 0.35, roughness: 0.3 });
  const lamp = () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.2, 8), metal).translateY(1.6)); g.add(mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.2, 10), metal).translateY(0.1)); const hd = mesh(new THREE.SphereGeometry(0.28, 16, 12), lampHead, false); hd.position.y = 3.35; g.add(hd); const cap = mesh(new THREE.ConeGeometry(0.34, 0.3, 10), metal); cap.position.y = 3.7; g.add(cap); return g; };
  const bench = () => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(1.8, 0.07, 0.16), wood).translateY(0.5).translateZ(-0.2 + i * 0.2)); for (let i = 0; i < 2; i++) g.add(mesh(new THREE.BoxGeometry(1.8, 0.16, 0.06), wood).translateY(0.8 + i * 0.22).translateZ(-0.33).rotateX(-0.15)); for (const s of [-0.75, 0.75]) { g.add(mesh(new THREE.BoxGeometry(0.08, 0.5, 0.5), metal).translateX(s).translateY(0.25)); g.add(mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), metal).translateX(s).translateY(0.75).translateZ(-0.33)); } return g; };
  const PL = [[-6, -20], [10, -19.5], [24, -23], [14, -6], [-24, 3], [-10, 23], [2, 35]];
  PL.forEach(([x, z], i) => { const l = lamp(); placeOn(l, x + 2.2, z + 1.0, -0.05); scene.add(l); });
  // ベンチ: 見晴らし台・池のほとり・灯台前
  const BL = [[SPOTS.overlook[0] + 1, SPOTS.overlook[1] + 2, Math.PI], [9, -9, -0.9], [40, -21, -2.2], [-17, -6, 1.2]];
  BL.forEach(([x, z, r]) => { const b = bench(); placeOn(b, x, z, -0.03); b.rotation.y = r; scene.add(b); });
  // 道標
  const post = new THREE.Group();
  post.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 8), wood).translateY(1.3));
  const arrows = [['とうだい', -0.3, 2.2], ['ふうしゃ', 2.6, 1.85], ['はなばたけ', 1.2, 1.5]];
  for (const [t, ry, y] of arrows) {
    const sh = new THREE.Shape(); sh.moveTo(0, -0.18); sh.lineTo(1.3, -0.18); sh.lineTo(1.55, 0); sh.lineTo(1.3, 0.18); sh.lineTo(0, 0.18); sh.closePath();
    const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }); ag.translate(0.08, 0, -0.03);
    const tex = signTexture(t);
    const ar = new THREE.Mesh(ag, [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: '#E8D2A8', roughness: 0.8 })]);
    // ShapeGeometry UV は形状座標 → 正規化
    const uv = ag.attributes.uv, pp = ag.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pp.getX(i) - 0.08) / 1.55, (pp.getY(i) + 0.18) / 0.36);
    ar.castShadow = true; ar.position.y = y; ar.rotation.y = ry; post.add(ar);
  }
  placeOn(post, 6, -16.5, -0.05); scene.add(post);
  // 見晴らし台 (木のデッキ)
  const deck = new THREE.Group();
  const dw = pbr('#D9B48A', 'wood', { repeat: 1.2 });
  deck.add(mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.25, 12), dw).translateY(0.6));
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; deck.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.4, 6), dw).translateX(Math.cos(a) * 3.1).translateZ(Math.sin(a) * 3.1).translateY(0.1)); }
  const tel = new THREE.Group(); tel.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 8), metal).translateY(1.3)); const tube = mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 12), metal); tube.rotation.z = Math.PI / 2 - 0.2; tube.position.y = 2.0; tel.add(tube); tel.position.set(0.8, 0, 1.2); deck.add(tel);
  placeOn(deck, SPOTS.overlook[0], SPOTS.overlook[1], 0); scene.add(deck);
}

// ---- 煙 (村の煙突) ----
function chimneySmoke(app, scene, sources) {
  if (!sources.length) return;
  const N = 26 * sources.length;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N), src = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const s = sources[i % sources.length]; src[i * 3] = s.x; src[i * 3 + 1] = s.y; src[i * 3 + 2] = s.z; seed[i] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(src, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: shared.uTime, uMap: { value: softDotTexture(64) }, uScale: { value: 400 } },
    vertexShader: `attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA;
      void main(){ float t = fract(uTime * 0.07 + aSeed); vec3 p = position + vec3(t * 5.0 + sin(t*6.0+aSeed*20.0)*0.6, t * 9.0, t * 2.5);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.2 + t * 4.5) * uScale / -mv.z; vA = (1.0 - t) * smoothstep(0.0, 0.08, t) * 0.45; }`,
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vec3(0.98,0.98,1.0), a * vA); }',
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 7; scene.add(pts);
  app.onUpdate(() => { mat.uniforms.uScale.value = app.size.h * 0.9; });
}

// ---- 池の小舟と桟橋 ----
function pondDock(app, scene) {
  const [px, pz] = SPOTS.pond;
  const wood = pbr('#CFA677', 'wood', { repeat: 0.6 });
  const dock = new THREE.Group();
  for (let i = 0; i < 9; i++) dock.add(mesh(new THREE.BoxGeometry(2.0, 0.1, 0.38), wood).translateZ(i * 0.42).translateY(WATER_Y + 0.35));
  for (const [x, z] of [[-0.9, 0], [0.9, 0], [-0.9, 3.3], [0.9, 3.3]]) dock.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6), wood).translateX(x).translateZ(z).translateY(WATER_Y - 0.2));
  dock.position.set(px + 4.5, 0, pz - 6.6); dock.rotation.y = 0.9; scene.add(dock);
  // 小舟
  const hullS = new THREE.Shape(); hullS.moveTo(-1.2, 0); hullS.quadraticCurveTo(0, -0.9, 1.2, 0); hullS.lineTo(-1.2, 0);
  const boat = new THREE.Group();
  const hull = new THREE.LatheGeometry([new THREE.Vector2(0.01, -0.3), new THREE.Vector2(0.55, -0.22), new THREE.Vector2(0.72, 0.05), new THREE.Vector2(0.75, 0.22)], 20); hull.scale(1, 1, 2.2);
  boat.add(mesh(hull, pbr('#FFFFFF', 'wood', { repeat: 0.6, rough: 0.6 })));
  const stripe = mesh(new THREE.TorusGeometry(0.74, 0.04, 6, 24), new THREE.MeshStandardMaterial({ color: '#FF9F7A' })); stripe.rotation.x = Math.PI / 2; stripe.scale.set(1, 2.2, 1); stripe.position.y = 0.2; boat.add(stripe);
  boat.add(mesh(new THREE.BoxGeometry(1.3, 0.06, 0.3), wood).translateY(0.08));
  boat.position.set(px - 2, WATER_Y + 0.1, pz + 1.5); boat.rotation.y = 0.6; scene.add(boat);
  app.onUpdate((dt, t) => { boat.position.y = WATER_Y + 0.12 + Math.sin(t * 1.3) * 0.04; boat.rotation.z = Math.sin(t * 1.1) * 0.03; boat.rotation.x = Math.cos(t * 0.9) * 0.025; });
  // 睡蓮
  const rnd = mulberry32(8);
  const pad = new THREE.CircleGeometry(0.45, 14, 0.3, Math.PI * 2 - 0.5); pad.rotateX(-Math.PI / 2);
  const pim = new THREE.InstancedMesh(pad, new THREE.MeshStandardMaterial({ color: '#9ED37A', roughness: 0.6, side: THREE.DoubleSide }), 26);
  const lot = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.14, 1), new THREE.MeshStandardMaterial({ color: '#FFC9D6', roughness: 0.5 }), 9);
  for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, r = 3 + rnd() * 3.6; const s = 0.6 + rnd() * 0.8; m4.compose(ps.set(px + Math.cos(a) * r, WATER_Y + 0.03, pz + Math.sin(a) * r), q.setFromAxisAngle(new V3(0, 1, 0), rnd() * 6.28), sc.set(s, 1, s)); pim.setMatrixAt(i, m4); if (i < 9) { m4.compose(ps.set(px + Math.cos(a) * r, WATER_Y + 0.12, pz + Math.sin(a) * r), q.identity(), sc.set(1, 0.7, 1)); lot.setMatrixAt(i, m4); } }
  pim.receiveShadow = true; scene.add(pim, lot);
}

export function createProps(app) {
  const { scene } = app;
  const smoke = [];
  const v = village(scene, smoke);
  fences(scene);
  riverBridge(scene);
  const rb = ropeBridge(app, scene); if (rb.smoke) smoke.push(rb.smoke);
  streetProps(scene);
  pondDock(app, scene);
  chimneySmoke(app, scene, smoke);
  // 洗濯物がゆれる
  app.onUpdate((dt, t) => { v.clothes.forEach((c, i) => { c.rotation.x = Math.sin(t * 1.7 + i) * 0.18 + 0.1; }); });
  // 小島の浮遊 (ゆっくり上下)
  return {};
}
