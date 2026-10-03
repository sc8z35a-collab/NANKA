// 植生: 木 / 茂み / 花畑 / 野花 / 草の葉 / 岩 (Agent B)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { N, mainHeight, rimRadius, riverInfo, pathDist, SPOTS, ISLETS, isletHeight, isletRim, BRIDGE_AT } from './layout.js';
import { mulberry32, createNoise, smoothstep, clamp } from './noise.js';
import { pbr, loadTex, neutralDetail, shared } from './textures.js';

const V3 = THREE.Vector3;
const col = (h) => new THREE.Color(h);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), ps = new V3(), eu = new THREE.Euler();

// ---------------- 風で揺れるシェーダ注入 ----------------
function addWind(mat, { amp = 0.25, freq = 1.2, heightRef = 4, key = 'w' } = {}) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev && prev(sh, r);
    sh.uniforms.uTime = shared.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 io = vec3(0.0);
          #ifdef USE_INSTANCING
            io = instanceMatrix[3].xyz;
          #endif
          float hf = clamp(position.y / ${heightRef.toFixed(2)}, 0.0, 1.5);
          hf *= hf;
          float ph = io.x * 0.11 + io.z * 0.07;
          float gust = 0.6 + 0.4 * sin(uTime * 0.35 + io.x * 0.02 + io.z * 0.015);
          float w = sin(uTime * ${freq.toFixed(2)} + ph) * 0.7 + sin(uTime * ${(freq * 2.3).toFixed(2)} + ph * 1.7) * 0.3;
          transformed.x += w * ${amp.toFixed(3)} * hf * gust;
          transformed.z += cos(uTime * ${(freq * 0.8).toFixed(2)} + ph) * ${(amp * 0.5).toFixed(3)} * hf * gust;
        }`);
  };
  const pk = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (pk ? pk() : '') + 'wind' + key + amp + freq;
  return mat;
}

// ---------------- 配置可否 ----------------
const AVOID = [
  [SPOTS.windmill[0], SPOTS.windmill[1], 9.5],
  [SPOTS.lighthouse[0], SPOTS.lighthouse[1], 9.5],
  [SPOTS.lighthouse[0] - 5, SPOTS.lighthouse[1] + 4, 6.5],
  [SPOTS.village[0], SPOTS.village[1], 11],
  [SPOTS.overlook[0], SPOTS.overlook[1], 5],
  [BRIDGE_AT[0], BRIDGE_AT[1], 4],
  [-56, -16, 6],
];
function freeMain(x, z, { path = 2.4, river = 1.6, flowers = true, edge = 0.94, avoid = 1 } = {}) {
  const R = rimRadius(Math.atan2(z, x)), r = Math.hypot(x, z);
  if (r > R * edge) return false;
  if (pathDist(x, z) < path) return false;
  if (riverInfo(x, z).d < river) return false;
  for (const [ax, az, ar] of AVOID) if (Math.hypot(x - ax, z - az) < ar * avoid) return false;
  if (flowers && Math.hypot((x - SPOTS.flowers[0]) * 0.8, z - SPOTS.flowers[1]) < 15) return false;
  return true;
}

// =================== 木 ===================
function blobGeo(radius, detail, rnd, squash = 1) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const p = g.attributes.position; const n = createNoise(Math.floor(rnd() * 1e6));
  for (let i = 0; i < p.count; i++) {
    ps.fromBufferAttribute(p, i); const l = ps.length(); ps.normalize();
    const d = 1 + 0.16 * n.n3(ps.x * 1.8, ps.y * 1.8, ps.z * 1.8) + 0.06 * n.n3(ps.x * 5, ps.y * 5, ps.z * 5);
    ps.multiplyScalar(l * d); ps.y *= squash; p.setXYZ(i, ps.x, ps.y, ps.z);
  }
  return g;
}
// 樹冠: 複数の塊を合成 + 頂点カラー (下: 濃い→上: 明るい / 擬似AO)
function canopyGeo(seed, type) {
  const rnd = mulberry32(seed);
  const parts = [];
  if (type === 'round') {
    const nb = 6 + Math.floor(rnd() * 3);
    parts.push(blobGeo(2.3, 3, rnd, 0.92).translate(0, 4.6, 0));
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2 + rnd(), r = 1.3 + rnd() * 0.7, y = 3.9 + rnd() * 1.6;
      parts.push(blobGeo(1.2 + rnd() * 0.7, 2, rnd, 0.9).translate(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    parts.push(blobGeo(1.5, 2, rnd).translate(0, 6.2, 0));
  } else if (type === 'cone') {
    for (let i = 0; i < 5; i++) {
      const t = i / 4, r = 2.4 * (1 - t * 0.78), y = 2.4 + i * 1.35;
      const cg = new THREE.ConeGeometry(r, 2.4, 14, 3); const p = cg.attributes.position;
      for (let k = 0; k < p.count; k++) { const yy = p.getY(k); if (yy < 1.1) { const f = 1 + 0.12 * Math.sin(k * 1.7 + i); p.setX(k, p.getX(k) * f); p.setZ(k, p.getZ(k) * f); } if (yy < -1.1) p.setY(k, yy + Math.sin(k * 2.1) * 0.12); }
      parts.push(cg.translate(0, y, 0));
    }
  } else { // 'tall' ポプラ風
    parts.push(blobGeo(1.5, 3, rnd, 2.3).translate(0, 5.6, 0));
    parts.push(blobGeo(1.1, 2, rnd, 1.6).translate(0.5, 4.4, 0.3));
    parts.push(blobGeo(1.0, 2, rnd, 1.6).translate(-0.5, 6.6, -0.2));
  }
  const g = mergeGeometries(parts.map((x) => x.index ? x.toNonIndexed() : x));
  g.computeVertexNormals();
  const p = g.attributes.position, nn = g.attributes.normal, c = new Float32Array(p.count * 3);
  let ymin = Infinity, ymax = -Infinity; for (let i = 0; i < p.count; i++) { ymin = Math.min(ymin, p.getY(i)); ymax = Math.max(ymax, p.getY(i)); }
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - ymin) / (ymax - ymin);
    const r = Math.hypot(p.getX(i), p.getZ(i));
    const ao = 0.72 + 0.28 * clamp(t * 0.8 + nn.getY(i) * 0.25 + r * 0.06, 0, 1);
    const v = ao * (0.95 + 0.1 * Math.sin(i * 0.37));
    c[i * 3] = v; c[i * 3 + 1] = v; c[i * 3 + 2] = v * (0.96 + t * 0.06);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  // 葉のディテール用 UV (球面投影)
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = Math.atan2(p.getZ(i), p.getX(i)) * 1.2; uv[i * 2 + 1] = p.getY(i) * 0.45; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
function trunkGeo(type) {
  const h = type === 'cone' ? 3.2 : type === 'tall' ? 4.2 : 4.4;
  const g = new THREE.CylinderGeometry(0.2, 0.42, h, 9, 4); g.translate(0, h / 2 - 0.2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 0.9) * 0.08); }
  const parts = [g];
  if (type === 'round') { // 枝
    for (let k = 0; k < 3; k++) {
      const b = new THREE.CylinderGeometry(0.08, 0.16, 1.8, 6); b.translate(0, 0.9, 0); b.rotateZ(0.8); b.rotateY(k * 2.1); b.translate(0, 2.6 + k * 0.4, 0); parts.push(b);
    }
  }
  // 根元の張り出し
  for (let k = 0; k < 4; k++) { const r = new THREE.ConeGeometry(0.22, 0.9, 5); r.rotateZ(Math.PI / 2 - 0.35); r.translate(0.32, 0.12, 0); r.rotateY(k * Math.PI / 2 + 0.4); parts.push(r); }
  const m = mergeGeometries(parts.map((x) => x.index ? x.toNonIndexed() : x)); m.computeVertexNormals();
  return m;
}

function leafMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, map: loadTex('grass_d.jpg', { repeat: 1 }), envMapIntensity: 0.7 });
  // 葉: 擬似サブサーフェス (太陽側の縁がほんのり明るい) + 中立ディテール
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec3 _lt = texture2D(map, vMapUv * 2.0).rgb * 2.0;
          diffuseColor.rgb *= mix(vec3(1.0), _lt, 0.55);
        #endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float _rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.5);
        totalEmissiveRadiance += diffuseColor.rgb * _rim * 0.22;`);
  };
  return m;
}

const TREE_COLORS = ['#8CCB63', '#9ED37A', '#A7DA7F', '#7FC270', '#B4DD86', '#93CF7C'];
const CONE_COLORS = ['#7FBF84', '#8CC78C', '#76B986'];
const BLOSSOM = ['#FFC4D2', '#FFD9E2', '#FFE7A8'];

function plantTrees(app, scene, Q) {
  const rnd = mulberry32(4242);
  const types = ['round', 'round', 'cone', 'tall'];
  const variants = [];
  for (let v = 0; v < 6; v++) { const type = types[v % 4]; variants.push({ type, canopy: canopyGeo(100 + v, type), list: [] }); }
  const trunkGeos = { round: trunkGeo('round'), cone: trunkGeo('cone'), tall: trunkGeo('tall') };

  // 主島: 森(北西・南西)は密に、他はまばら
  const forestN = createNoise(99);
  const target = Math.round(330 * (Q < 1 ? 0.5 : 1));
  let tries = 0;
  const placed = [];
  while (placed.length < target && tries++ < 30000) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 62;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (!freeMain(x, z, { path: 2.8, river: 2.2 })) continue;
    const dens = smoothstep(-0.15, 0.35, forestN.fbm2(x * 0.03, z * 0.03, 3)) * 0.85 + 0.08;
    if (rnd() > dens) continue;
    let ok = true; for (const p of placed) { if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < 14) { ok = false; break; } } if (!ok) continue;
    placed.push([x, z, mainHeight(x, z)]);
  }
  // 小島
  for (const isl of ISLETS) {
    const n = Math.round(isl.R * isl.R * 0.075);
    let k = 0, t = 0;
    while (k < n && t++ < 800) {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * isl.R * 0.8;
      const x = isl.c[0] + Math.cos(a) * rr, z = isl.c[2] + Math.sin(a) * rr;
      if (isl.id === 'east' && Math.hypot(x - (isl.c[0] - 6), z - (isl.c[2] - 4)) < 7) continue;
      if (isl.id === 'west' && Math.hypot(x - isl.c[0], z - isl.c[2]) < 7) continue;
      if (isl.id === 'west' && Math.hypot(x - (isl.c[0] + 18), z - (isl.c[2] + 3)) < 6) continue;
      const h = isletHeight(isl, x, z); if (!Number.isFinite(h)) continue;
      placed.push([x, z, h]); k++;
    }
  }
  for (const [x, z, h] of placed) {
    const v = variants[Math.floor(rnd() * variants.length)];
    v.list.push({ x, y: h - 0.15, z, s: 0.75 + rnd() * 0.6, r: rnd() * Math.PI * 2, c: v.type === 'cone' ? CONE_COLORS[Math.floor(rnd() * 3)] : (rnd() < 0.08 ? BLOSSOM[Math.floor(rnd() * 3)] : TREE_COLORS[Math.floor(rnd() * TREE_COLORS.length)]) });
  }

  const barkMat = pbr('#B89A7E', 'bark', { repeat: 1, rough: 0.95, normal: 1.0 });
  const leafMat = addWind(leafMaterial(), { amp: 0.12, freq: 1.1, heightRef: 7, key: 'leaf' });
  const tc = new THREE.Color();
  const trunks = { round: [], cone: [], tall: [] };
  for (const v of variants) {
    if (!v.list.length) continue;
    const im = new THREE.InstancedMesh(v.canopy, leafMat, v.list.length);
    v.list.forEach((t, i) => {
      eu.set((rnd() - 0.5) * 0.08, t.r, (rnd() - 0.5) * 0.08); q.setFromEuler(eu); sc.set(t.s * (0.9 + rnd() * 0.2), t.s * (0.9 + rnd() * 0.25), t.s * (0.9 + rnd() * 0.2));
      m4.compose(ps.set(t.x, t.y, t.z), q, sc); im.setMatrixAt(i, m4);
      tc.set(t.c).offsetHSL((rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.05); im.setColorAt(i, tc);
      trunks[v.type].push(m4.clone());
    });
    im.castShadow = true; im.receiveShadow = true; im.name = 'trees-' + v.type;
    scene.add(im);
  }
  for (const k of Object.keys(trunks)) {
    if (!trunks[k].length) continue;
    const im = new THREE.InstancedMesh(trunkGeos[k], barkMat, trunks[k].length);
    trunks[k].forEach((mm, i) => im.setMatrixAt(i, mm));
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }
  return placed;
}

// =================== 茂み ===================
function plantBushes(scene, Q, trees) {
  const rnd = mulberry32(777);
  const geo = (() => { const parts = []; const r2 = mulberry32(3); for (let i = 0; i < 4; i++) parts.push(blobGeo(0.7 + r2() * 0.35, 2, r2, 0.8).translate((r2() - 0.5) * 1.1, 0.45 + r2() * 0.2, (r2() - 0.5) * 1.1)); const g = mergeGeometries(parts.map((x) => x.toNonIndexed())); g.computeVertexNormals();
    const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const v = 0.78 + 0.22 * clamp(p.getY(i) / 1.1, 0, 1); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v; } g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * 0.8; uv[i * 2 + 1] = p.getY(i) * 0.8 + p.getZ(i) * 0.5; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; })();
  const list = [];
  // 木の根元まわり + 道ばた
  for (const [x, z] of trees) if (rnd() < 0.35) { const a = rnd() * 6.28; list.push([x + Math.cos(a) * 2.2, z + Math.sin(a) * 2.2]); }
  let t = 0; while (list.length < 420 * Q + 60 && t++ < 20000) {
    const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * 60, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const pd = pathDist(x, z); if (pd < 2.2 || pd > 4.5) continue;
    if (!freeMain(x, z, { path: 2.2, river: 1.2, avoid: 0.8 })) continue; list.push([x, z]);
  }
  const mat = addWind(leafMaterial(), { amp: 0.05, freq: 1.6, heightRef: 1.2, key: 'bush' });
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  const tc = new THREE.Color();
  list.forEach(([x, z], i) => {
    const h = mainHeight(x, z); const y = Number.isFinite(h) ? h : -999;
    const s = 0.7 + rnd() * 0.8; m4.compose(ps.set(x, y - 0.1, z), q.setFromAxisAngle(new V3(0, 1, 0), rnd() * 6.28), sc.set(s, s * (0.8 + rnd() * 0.4), s)); im.setMatrixAt(i, m4);
    tc.set(['#8FCB6A', '#A2D67C', '#7FBF6E', '#B0DB86'][Math.floor(rnd() * 4)]); im.setColorAt(i, tc);
  });
  im.castShadow = true; im.receiveShadow = true; scene.add(im);
}

// =================== 花 ===================
function flowerGeo(kind) {
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.018, 0.026, 0.62, 4); stem.translate(0, 0.31, 0); parts.push([stem, 'stem']);
  const leaf = new THREE.PlaneGeometry(0.1, 0.24); leaf.translate(0, 0.12, 0); leaf.rotateZ(0.7); leaf.translate(0.02, 0.12, 0); parts.push([leaf, 'stem']);
  if (kind === 'tulip') {
    const cup = new THREE.SphereGeometry(0.085, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62); cup.scale(1, 1.5, 1); cup.rotateX(Math.PI); cup.translate(0, 0.74, 0);
    const p = cup.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); if (p.getY(i) > 0.76) p.setY(i, p.getY(i) + Math.max(0, Math.cos(a * 3)) * 0.03); }
    parts.push([cup, 'head']);
  } else if (kind === 'daisy') {
    for (let k = 0; k < 8; k++) { const pt = new THREE.PlaneGeometry(0.04, 0.1); pt.translate(0, 0.07, 0); pt.rotateX(-Math.PI / 2 + 0.25); pt.rotateY(k / 8 * Math.PI * 2); pt.translate(0, 0.64, 0); parts.push([pt, 'head']); }
    const ce = new THREE.SphereGeometry(0.035, 6, 4); ce.scale(1, 0.5, 1); ce.translate(0, 0.645, 0); parts.push([ce, 'center']);
  } else { // 'puff' ポンポン (アリウム/クローバー)
    const b = new THREE.IcosahedronGeometry(0.075, 1); b.translate(0, 0.66, 0); parts.push([b, 'head']);
  }
  // 頂点カラー: stem=緑, head=白(インスタンス色で着色), center=黄
  const geos = parts.map(([g, role]) => {
    g = g.index ? g.toNonIndexed() : g;
    const n = g.attributes.position.count, c = new Float32Array(n * 3), w = new Float32Array(n);
    const cc = role === 'stem' ? col('#7DBA5E') : role === 'center' ? col('#FFC94D') : col('#FFFFFF');
    for (let i = 0; i < n; i++) { c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b; w[i] = role === 'head' ? 1 : 0; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('aHead', new THREE.BufferAttribute(w, 1));
    g.deleteAttribute('uv'); return g;
  });
  return mergeGeometries(geos);
}
function flowerMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aHead;')
      // インスタンス色は花びらだけに乗せる
      .replace('#include <color_vertex>', `
        vColor = vec3(1.0);
        #ifdef USE_COLOR
          vColor.xyz *= color.xyz;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vColor.xyz *= mix(vec3(1.0), instanceColor.xyz, aHead);
        #endif`);
  };
  m.customProgramCacheKey = () => 'flower';
  return addWind(m, { amp: 0.09, freq: 2.0, heightRef: 0.7, key: 'flower' });
}

const FIELD_ROWS = ['#FF9FB2', '#FFD36E', '#FFFFFF', '#FF9F7A', '#C6B4FF', '#FFB3C7', '#FFE9A8', '#8FB8FF'];
const WILD = ['#FFFFFF', '#FFE07A', '#FFB3C7', '#C9B8FF', '#FFFFFF', '#A9CCFF'];

function plantFlowers(scene, Q, flowerGroup) {
  const rnd = mulberry32(31337);
  const kinds = ['tulip', 'daisy', 'puff'];
  const geos = kinds.map(flowerGeo);
  const mat = flowerMaterial();
  const lists = { tulip: [], daisy: [], puff: [] };
  // ---- 花畑: 色の帯 (ゆるくカーブ) ----
  const [fx, fz] = SPOTS.flowers;
  const ang = 0.55, ca = Math.cos(ang), sa = Math.sin(ang);
  const total = Math.round(9000 * Q);
  let t = 0, count = 0;
  while (count < total && t++ < total * 4) {
    const u = (rnd() - 0.5) * 30, v = (rnd() - 0.5) * 22;
    const x = fx + u * ca - v * sa, z = fz + u * sa + v * ca;
    if (Math.hypot((x - fx) * 0.8, z - fz) > 14 + N.n2(x * 0.2, z * 0.2) * 1.5) continue;
    if (pathDist(x, z) < 1.5) continue;
    const vv = v + Math.sin(u * 0.25) * 1.4;
    const row = Math.floor((vv + 11) / 2.1);
    const inRow = ((vv + 11) / 2.1) % 1;
    if (inRow > 0.78 && rnd() < 0.85) continue; // 帯の間の小道
    const h = mainHeight(x, z); if (!Number.isFinite(h)) continue;
    const kind = row % 3 === 2 ? 'puff' : row % 3 === 1 ? 'daisy' : 'tulip';
    lists[kind].push({ x, y: h - 0.02, z, c: FIELD_ROWS[((row % FIELD_ROWS.length) + FIELD_ROWS.length) % FIELD_ROWS.length], s: 0.9 + rnd() * 0.5 });
    count++;
  }
  // ---- 島じゅうの野花 (かたまりで) ----
  const wild = Math.round(5000 * Q);
  const clump = createNoise(5);
  t = 0; let w = 0;
  while (w < wild && t++ < wild * 10) {
    const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * 62, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (clump.fbm2(x * 0.08, z * 0.08, 2) < 0.18) continue;
    if (!freeMain(x, z, { path: 1.6, river: 0.8, flowers: false, avoid: 0.6, edge: 0.97 })) continue;
    const h = mainHeight(x, z);
    const ci = Math.floor((clump.n2(x * 0.05 + 9, z * 0.05) * 0.5 + 0.5) * WILD.length);
    lists[rnd() < 0.6 ? 'daisy' : 'puff'].push({ x, y: h - 0.02, z, c: WILD[clamp(ci, 0, WILD.length - 1)], s: 0.6 + rnd() * 0.45 });
    w++;
  }
  const tc = new THREE.Color();
  kinds.forEach((k, ki) => {
    const L = lists[k]; if (!L.length) return;
    const im = new THREE.InstancedMesh(geos[ki], mat, L.length);
    L.forEach((f, i) => {
      eu.set((rnd() - 0.5) * 0.25, rnd() * 6.28, (rnd() - 0.5) * 0.25); q.setFromEuler(eu);
      m4.compose(ps.set(f.x, f.y, f.z), q, sc.set(f.s, f.s * (0.85 + rnd() * 0.35), f.s)); im.setMatrixAt(i, m4);
      tc.set(f.c).offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.06); im.setColorAt(i, tc);
    });
    im.receiveShadow = true; im.castShadow = false; im.name = 'flowers-' + k;
    (flowerGroup || scene).add(im);
  });
  return count + w;
}

// =================== 草の葉 (大量) ===================
function grassBlades(scene, Q) {
  const rnd = mulberry32(2024);
  // 葉 1 本: 3 段の細い三角帯, 少し曲げる
  const bl = new THREE.BufferGeometry();
  const P = [], C = [], I = [];
  const blades = 3;
  for (let b = 0; b < blades; b++) {
    const a = b / blades * Math.PI * 2 + 0.3, ox = Math.cos(a) * 0.06, oz = Math.sin(a) * 0.06, bend = 0.12 + b * 0.04;
    const base = P.length / 3;
    const segs = 3;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, w = 0.045 * (1 - t * 0.85), y = t * (0.42 + b * 0.08);
      const bx = ox + Math.cos(a) * bend * t * t, bz = oz + Math.sin(a) * bend * t * t;
      P.push(bx - Math.sin(a) * w, y, bz + Math.cos(a) * w, bx + Math.sin(a) * w, y, bz - Math.cos(a) * w);
      const g = 0.72 + 0.28 * t; C.push(g, g, g, g, g, g);
    }
    for (let s = 0; s < segs; s++) { const k = base + s * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  bl.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  bl.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  bl.setIndex(I); bl.computeVertexNormals();
  // 法線を上向きに寄せる (地面と馴染ませる)
  const nn = bl.attributes.normal; for (let i = 0; i < nn.count; i++) { nn.setXYZ(i, nn.getX(i) * 0.3, 1, nn.getZ(i) * 0.3); } nn.normalize?.();
  const mat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), { amp: 0.11, freq: 2.2, heightRef: 0.5, key: 'grass' });
  const total = Math.round(60000 * Q);
  const im = new THREE.InstancedMesh(bl, mat, total);
  const tc = new THREE.Color(); let n = 0, t = 0;
  const base = [col('#8FCB66'), col('#A9D97B'), col('#9BD06E'), col('#B9E08A')];
  while (n < total && t++ < total * 3) {
    const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * 63, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const R = rimRadius(Math.atan2(z, x)); if (rr > R * 0.985) continue;
    if (pathDist(x, z) < 1.25 + rnd() * 0.5) continue;
    if (riverInfo(x, z).d < 0.6) continue;
    if (Math.hypot(x - SPOTS.village[0], z - SPOTS.village[1]) < 8) continue;
    const h = mainHeight(x, z);
    const s = 0.7 + rnd() * 0.9;
    eu.set((rnd() - 0.5) * 0.3, rnd() * 6.28, (rnd() - 0.5) * 0.3); q.setFromEuler(eu);
    m4.compose(ps.set(x, h - 0.03, z), q, sc.set(s, s * (0.7 + rnd() * 0.8), s)); im.setMatrixAt(n, m4);
    tc.copy(base[Math.floor(rnd() * 4)]).offsetHSL(0, 0, (N.n2(x * 0.1, z * 0.1)) * 0.06); im.setColorAt(n, tc);
    n++;
  }
  im.count = n; im.receiveShadow = true; im.name = 'grass-blades';
  scene.add(im);
  return n;
}

// =================== 岩 ===================
function scatterRocks(scene, Q) {
  const rnd = mulberry32(555);
  const geos = [0, 1, 2].map((k) => {
    const g = new THREE.IcosahedronGeometry(1, 3); const p = g.attributes.position; const n = createNoise(800 + k);
    for (let i = 0; i < p.count; i++) { ps.fromBufferAttribute(p, i); const d = 1 + 0.28 * n.n3(ps.x * 1.3, ps.y * 1.3, ps.z * 1.3) + 0.08 * n.n3(ps.x * 4, ps.y * 4, ps.z * 4); ps.multiplyScalar(d); ps.y *= 0.62; if (ps.y < -0.2) ps.y = -0.2 + (ps.y + 0.2) * 0.3; p.setXYZ(i, ps.x, ps.y, ps.z); }
    g.computeVertexNormals();
    const uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5 + p.getZ(i) * 0.3, p.getY(i) * 0.5);
    return g;
  });
  const mat = pbr('#E6DCCB', 'rock', { repeat: 1, rough: 0.95, normal: 1.2 });
  const L = [[], [], []]; let t = 0;
  while (L[0].length + L[1].length + L[2].length < 140 && t++ < 6000) {
    const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * 62, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const ri = riverInfo(x, z);
    const nearRiver = ri.d > 0.2 && ri.d < 3; const R = rimRadius(Math.atan2(z, x));
    const nearEdge = rr > R * 0.86 && rr < R * 0.97;
    if (!(nearRiver || nearEdge || rnd() < 0.15)) continue;
    if (!freeMain(x, z, { path: 1.8, river: 0.1, flowers: true, edge: 0.97, avoid: 0.9 })) continue;
    L[Math.floor(rnd() * 3)].push([x, mainHeight(x, z), z, (nearRiver ? 0.35 : 0.5) + rnd() * (nearEdge ? 1.4 : 0.7)]);
  }
  L.forEach((list, k) => {
    const im = new THREE.InstancedMesh(geos[k], mat, list.length);
    list.forEach(([x, y, z, s], i) => { m4.compose(ps.set(x, y - s * 0.12, z), q.setFromEuler(eu.set(rnd() * 0.3, rnd() * 6.28, rnd() * 0.3)), sc.set(s, s * (0.7 + rnd() * 0.6), s * (0.8 + rnd() * 0.4))); im.setMatrixAt(i, m4); });
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  });
  // 飛び石 (川)
  const stones = [];
  for (let i = 0; i < 5; i++) stones.push([-5.6 + i * 0.1 + i * -1.4 * 0.0, 7]);
}

export function createFlora(app, ctx) {
  const { scene } = app;
  const Q = app.quality === 'low' ? 0.3 : 1;
  const trees = plantTrees(app, scene, Q);
  plantBushes(scene, Q, trees);
  const nf = plantFlowers(scene, Q, ctx.extras.flowerGroup);
  const ng = grassBlades(scene, Q);
  scatterRocks(scene, Q);
  return { trees: trees.length, flowerCount: nf, grassCount: ng };
}
