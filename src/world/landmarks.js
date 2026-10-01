// ランドマーク 5 種 (Agent B): lighthouse / windmill / flowers / waterfall / balloon
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SPOTS, RIVER, mainHeight, rimRadius, ISLETS, WATER_Y } from './layout.js';
import { pbr, glassMaterial, softDotTexture, shared } from './textures.js';
import { mulberry32 } from './noise.js';

const V3 = THREE.Vector3;
const col = (h) => new THREE.Color(h);

// ---- 小物ヘルパ ----
function mesh(geo, mat, { cast = true, recv = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
function paintGeo(geo, color) { // 頂点カラーで一色塗り (merge 用)
  const c = col(color), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;
}
function hitProxy(radius, height, y = 0) {
  const g = new THREE.CylinderGeometry(radius, radius, height, 12); g.translate(0, y + height / 2, 0);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ visible: false }));
  m.name = 'hit'; return m;
}
// 窓 (白枠 + 空色ガラス)
function windowGeo(w, h, depth = 0.12) {
  const parts = [];
  const f = 0.09;
  const frame = [[0, h / 2 - f / 2, w, f], [0, -h / 2 + f / 2, w, f], [-w / 2 + f / 2, 0, f, h], [w / 2 - f / 2, 0, f, h], [0, 0, f * 0.7, h], [0, 0, w, f * 0.7]];
  for (const [x, y, ww, hh] of frame) { const b = new THREE.BoxGeometry(ww, hh, depth); b.translate(x, y, depth / 2); parts.push(paintGeo(b, '#FFFFFF')); }
  const glass = new THREE.PlaneGeometry(w - f, h - f); glass.translate(0, 0, 0.02); parts.push(paintGeo(glass, '#A9D3F0'));
  const sill = new THREE.BoxGeometry(w + 0.2, 0.08, 0.25); sill.translate(0, -h / 2 - 0.02, 0.12); parts.push(paintGeo(sill, '#F4EEE2'));
  return mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g));
}
function doorGeo(w, h, color = '#86BBD0') {
  const parts = [];
  const d = new THREE.BoxGeometry(w, h, 0.12); d.translate(0, h / 2, 0.06); parts.push(paintGeo(d, color));
  const arch = new THREE.CylinderGeometry(w / 2, w / 2, 0.12, 16, 1, false, 0, Math.PI); arch.rotateX(Math.PI / 2); arch.rotateZ(Math.PI / 2); arch.rotateY(0); arch.translate(0, h, 0.06);
  parts.push(paintGeo(arch, color));
  const frameL = new THREE.BoxGeometry(0.12, h, 0.18); frameL.translate(-w / 2 - 0.04, h / 2, 0.06); parts.push(paintGeo(frameL, '#FFFFFF'));
  const frameR = frameL.clone(); frameR.translate(w + 0.08, 0, 0); parts.push(paintGeo(frameR, '#FFFFFF'));
  const knob = new THREE.SphereGeometry(0.07, 8, 6); knob.translate(w * 0.32, h * 0.5, 0.16); parts.push(paintGeo(knob, '#F2D27A'));
  for (let i = 0; i < 3; i++) { const p = new THREE.BoxGeometry(w * 0.8, 0.04, 0.02); p.translate(0, h * (0.25 + i * 0.25), 0.13); parts.push(paintGeo(p, '#A9D3E2')); }
  return mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g));
}
const VC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, envMapIntensity: 0.9 });

// 地面に置く: 足元の数点の最小高さ
function groundY(x, z, r = 2) {
  let h = Infinity;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const y = mainHeight(x + Math.cos(a) * r, z + Math.sin(a) * r); if (y < h) h = y; }
  return Math.min(h, mainHeight(x, z));
}

// =====================================================================
// 灯台
// =====================================================================
function buildLighthouse() {
  const g = new THREE.Group(); g.name = 'lighthouse';
  const H = 17;
  // 石の土台
  const baseMat = pbr('#EADFCB', 'stone', { repeat: 1, rough: 0.92, normal: 1 });
  const base = mesh(new THREE.CylinderGeometry(4.6, 5.2, 1.6, 40), baseMat); base.position.y = 0.3; g.add(base);
  const step = mesh(new THREE.CylinderGeometry(5.6, 5.9, 0.5, 40), baseMat); step.position.y = -0.3; g.add(step);

  // 塔: Lathe + 縞の頂点カラー
  const prof = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; prof.push(new THREE.Vector2(3.5 - 1.15 * t - 0.25 * Math.sin(t * Math.PI) * 0.3, 1.1 + t * H)); }
  const tg = new THREE.LatheGeometry(prof, 64);
  const n = tg.attributes.position.count, c = new Float32Array(n * 3);
  const white = col('#FFFDF8'), red = col('#F07C6C');
  for (let i = 0; i < n; i++) {
    const y = tg.attributes.position.getY(i);
    const band = Math.floor((y - 1.1) / (H / 5)) % 2 === 1;
    const cc = band ? red : white; c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const towerMat = pbr('#FFFFFF', 'plaster', { repeat: 3, rough: 0.7, normal: 0.6, vc: true });
  const tower = mesh(tg, towerMat); g.add(tower);
  // UV を再設定 (Lathe は u=周, v=高さ)
  const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 5);

  // ドアと窓
  const door = mesh(doorGeo(1.3, 2.0), VC); door.position.set(0, 1.0, 3.42); door.rotation.x = -0.06; g.add(door);
  const wg = windowGeo(0.7, 1.0);
  [[0.3, 6, 0.7], [2.4, 10, 0.4], [4.1, 14, 0.2]].forEach(([a, y]) => {
    const r = 3.5 - 1.15 * ((y - 1.1) / H) + 0.02;
    const w = mesh(wg, VC, { cast: false }); w.position.set(Math.sin(a) * r, y, Math.cos(a) * r); w.rotation.y = a; g.add(w);
  });

  // ギャラリー (バルコニー)
  const topY = H + 1.1;
  const deckMat = pbr('#F6F1E7', 'plaster', { repeat: 2, rough: 0.6 });
  const deck = mesh(new THREE.CylinderGeometry(3.4, 2.5, 0.6, 48), deckMat); deck.position.y = topY; g.add(deck);
  // 持ち送り (ブラケット)
  const brk = new THREE.BoxGeometry(0.22, 0.8, 0.7); brk.translate(0, -0.55, 0);
  const brkI = new THREE.InstancedMesh(brk, deckMat, 24); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; m4.compose(new V3(Math.sin(a) * 2.55, topY, Math.cos(a) * 2.55), q.setFromAxisAngle(new V3(0, 1, 0), a), new V3(1, 1, 1)); brkI.setMatrixAt(i, m4); }
  brkI.castShadow = true; g.add(brkI);
  // 手すり
  const railMat = new THREE.MeshStandardMaterial({ color: '#8FB8D8', roughness: 0.4, metalness: 0.35 });
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), railMat, 40);
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; m4.makeTranslation(Math.sin(a) * 3.25, topY + 0.85, Math.cos(a) * 3.25); posts.setMatrixAt(i, m4); }
  g.add(posts);
  for (const [y, r] of [[topY + 1.4, 0.07], [topY + 0.85, 0.04]]) { const rail = mesh(new THREE.TorusGeometry(3.25, r, 6, 80), railMat); rail.rotation.x = Math.PI / 2; rail.position.y = y; g.add(rail); }

  // ランタン室
  const lanternY = topY + 0.3;
  const wallLow = mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.9, 32), deckMat); wallLow.position.y = lanternY + 0.45; g.add(wallLow);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.4, 32, 1, true), glassMaterial('#E8F7FF')); glass.position.y = lanternY + 2.1; g.add(glass);
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), railMat, 10);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; m4.makeTranslation(Math.sin(a) * 1.72, lanternY + 2.1, Math.cos(a) * 1.72); bars.setMatrixAt(i, m4); }
  bars.castShadow = true; g.add(bars);
  // ランプ (温かい白。ネオン禁止なので控えめな発光)
  const lampMat = new THREE.MeshStandardMaterial({ color: '#FFF4D6', emissive: '#FFE7B0', emissiveIntensity: 0.9, roughness: 0.3 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), lampMat); lamp.position.y = lanternY + 2.0; g.add(lamp);
  // 回転レンズ + 光のすじ
  const rot = new THREE.Group(); rot.position.y = lanternY + 2.0; g.add(rot);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.3, 6, 1, true), new THREE.MeshPhysicalMaterial({ color: '#FFFBEF', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.5, clearcoat: 1, side: THREE.DoubleSide }));
  rot.add(lens);
  const beamGeo = new THREE.CylinderGeometry(0.35, 5.5, 42, 24, 1, true); beamGeo.translate(0, 21, 0); beamGeo.rotateZ(-Math.PI / 2);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending,
    uniforms: { uOp: { value: 0.16 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uOp; varying vec2 vUv; void main(){ float a=(1.0-vUv.y)*(1.0-vUv.y)*uOp*(0.6+0.4*sin(vUv.x*6.2831)); gl_FragColor=vec4(1.0,0.97,0.88,a); }',
  });
  for (const s of [1, -1]) { const b = new THREE.Mesh(beamGeo, beamMat); b.scale.x = s; rot.add(b); }
  // 屋根
  const roofMat = pbr('#F07C6C', 'roof', { repeat: 2, rough: 0.6, normal: 0.5, detail: 0.5 });
  const roof = mesh(new THREE.ConeGeometry(2.15, 1.8, 32), roofMat); roof.position.y = lanternY + 4.2; g.add(roof);
  const rim = mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.25, 32), deckMat); rim.position.y = lanternY + 3.35; g.add(rim);
  const ball = mesh(new THREE.SphereGeometry(0.3, 16, 12), railMat); ball.position.y = lanternY + 5.25; g.add(ball);
  // 風見鶏 (矢印)
  const vane = new THREE.Group(); vane.position.y = lanternY + 5.6; g.add(vane);
  const rod = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2), railMat); vane.add(rod);
  const arrow = mesh(new THREE.ConeGeometry(0.15, 0.5, 8), railMat); arrow.rotation.z = -Math.PI / 2; arrow.position.set(0.7, 0.4, 0); vane.add(arrow);
  const tail = mesh(new THREE.BoxGeometry(0.4, 0.3, 0.03), railMat); tail.position.set(-0.6, 0.4, 0); vane.add(tail);
  const shaft = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3), railMat); shaft.rotation.z = Math.PI / 2; shaft.position.y = 0.4; vane.add(shaft);

  // 灯台守の小屋
  const hut = cottage({ w: 5, d: 4, h: 2.8, wall: '#FFF8EC', roof: '#8FB8E8', chimney: true, seed: 3 });
  hut.position.set(-6.5, -0.2, 2.5); hut.rotation.y = 0.5; g.add(hut);

  g.add(hitProxy(4, 24, -1));
  return { group: g, rot, vane, lamp, lampMat };
}

// =====================================================================
// 小さな家 (村・灯台守・小島で共用)
// =====================================================================
export function cottage({ w = 5, d = 4, h = 3, wall = '#FFF7EA', roof = '#E9886E', trim = '#FFFFFF', chimney = true, seed = 1 } = {}) {
  const rnd = mulberry32(seed);
  const g = new THREE.Group(); g.name = 'cottage';
  const wallMat = pbr(wall, 'plaster', { repeat: 1.2, rough: 0.85, normal: 0.8 });
  const roofMat = pbr(roof, 'roof', { repeat: 1.6, rough: 0.7, normal: 0.9, detail: 0.7 });
  const woodMat = pbr('#C79C74', 'wood', { repeat: 1, rough: 0.8 });
  const stoneMat = pbr('#E2D6C2', 'stone', { repeat: 1, rough: 0.95 });
  // 基礎
  const found = mesh(new THREE.BoxGeometry(w + 0.4, 0.7, d + 0.4), stoneMat); found.position.y = 0.15; g.add(found);
  const body = mesh(new THREE.BoxGeometry(w, h, d), wallMat); body.position.y = 0.5 + h / 2; g.add(body);
  // 切妻屋根 (三角柱 + 厚み)
  const rh = d * 0.42 + 0.6, over = 0.45;
  const shape = new THREE.Shape(); shape.moveTo(-d / 2 - over, 0); shape.lineTo(0, rh); shape.lineTo(d / 2 + over, 0); shape.lineTo(d / 2 + over - 0.25, -0.18); shape.lineTo(0, rh - 0.3); shape.lineTo(-d / 2 - over + 0.25, -0.18); shape.closePath();
  const rg = new THREE.ExtrudeGeometry(shape, { depth: w + over * 2, bevelEnabled: false }); rg.translate(0, 0, -(w + over * 2) / 2); rg.rotateY(Math.PI / 2);
  // UV: 世界座標系で張り直し
  const p = rg.attributes.position, u = rg.attributes.uv; for (let i = 0; i < p.count; i++) u.setXY(i, p.getX(i) * 0.4, (p.getY(i) + Math.abs(p.getZ(i))) * 0.4);
  const r = mesh(rg, roofMat); r.position.y = 0.5 + h; g.add(r);
  // 妻壁 (三角)
  const gs = new THREE.Shape(); gs.moveTo(-d / 2, 0); gs.lineTo(0, rh - 0.35); gs.lineTo(d / 2, 0); gs.closePath();
  const gg = new THREE.ShapeGeometry(gs); gg.rotateY(Math.PI / 2);
  for (const s of [1, -1]) { const m = mesh(gg, wallMat); m.position.set(s * w / 2 * 0.999, 0.5 + h, 0); m.rotation.y = s > 0 ? 0 : Math.PI; g.add(m); }
  // 破風板
  const trimMat = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.7 });
  // ドア・窓
  const dr = mesh(doorGeo(1.0, 1.7, ['#86BBD0', '#F2B48C', '#A8CF8E', '#E7A3B5'][Math.floor(rnd() * 4)]), VC); dr.position.set(w * 0.18, 0.5, d / 2); g.add(dr);
  const wg = windowGeo(0.9, 0.9);
  const wins = [[-w * 0.25, d / 2, 0], [w / 2, 0, Math.PI / 2], [-w / 2, 0, -Math.PI / 2], [w * 0.2, -d / 2, Math.PI], [-w * 0.22, -d / 2, Math.PI]];
  for (const [x, z, ry] of wins) { const m = mesh(wg, VC, { cast: false }); m.position.set(x, 0.5 + h * 0.55, z); m.rotation.y = ry; g.add(m); }
  // 植木箱 + 花
  const box = mesh(new THREE.BoxGeometry(1.0, 0.25, 0.3), woodMat); box.position.set(-w * 0.25, 0.5 + h * 0.55 - 0.62, d / 2 + 0.2); g.add(box);
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 9);
  const m4 = new THREE.Matrix4(); const fc = ['#FF9FB2', '#FFD36E', '#FFFFFF', '#FF9F7A'];
  for (let i = 0; i < 9; i++) { m4.makeTranslation(-w * 0.25 - 0.4 + i * 0.1, 0.5 + h * 0.55 - 0.45 + rnd() * 0.06, d / 2 + 0.2 + (rnd() - 0.5) * 0.12); fl.setMatrixAt(i, m4); fl.setColorAt(i, col(fc[i % 4])); }
  g.add(fl);
  // 煙突
  if (chimney) {
    const ch = mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), stoneMat); ch.position.set(-w * 0.3, 0.5 + h + rh * 0.6, -d * 0.18); g.add(ch);
    const cap = mesh(new THREE.BoxGeometry(0.75, 0.15, 0.75), trimMat); cap.position.set(-w * 0.3, 0.5 + h + rh * 0.6 + 0.85, -d * 0.18); g.add(cap);
    g.userData.chimneyTop = new V3(-w * 0.3, 0.5 + h + rh * 0.6 + 1.0, -d * 0.18);
  }
  // 玄関ステップ
  const st = mesh(new THREE.BoxGeometry(1.4, 0.25, 0.6), stoneMat); st.position.set(w * 0.18, 0.4, d / 2 + 0.35); g.add(st);
  return g;
}

// =====================================================================
// 風車
// =====================================================================
function buildWindmill() {
  const g = new THREE.Group(); g.name = 'windmill';
  const stoneMat = pbr('#E7DCC8', 'stone', { repeat: 1.5, rough: 0.95, normal: 1.1 });
  const bodyMat = pbr('#FFF6E6', 'plaster', { repeat: 2, rough: 0.85, normal: 0.8 });
  const woodMat = pbr('#C99A6E', 'wood', { repeat: 1, rough: 0.8, normal: 0.8 });
  const capMat = pbr('#D98E70', 'roof', { repeat: 1.2, rough: 0.7, normal: 0.9 });
  // 石の基部
  const base = mesh(new THREE.CylinderGeometry(4.9, 5.4, 2.6, 8), stoneMat); base.position.y = 0.6; g.add(base);
  // 塔 (八角・テーパー)
  const H = 11;
  const body = mesh(new THREE.CylinderGeometry(3.0, 4.5, H, 8, 6), bodyMat); body.position.y = 1.9 + H / 2; g.add(body);
  // 角の柱 (縁取り)
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#E6D2B5', roughness: 0.8 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const b0 = new V3(Math.cos(a) * 4.5 * Math.cos(Math.PI / 8) / Math.cos(Math.PI / 8), 1.9, Math.sin(a) * 4.5);
    const bottom = new V3(Math.sin(a) * 4.55, 1.9, Math.cos(a) * 4.55), top = new V3(Math.sin(a) * 3.05, 1.9 + H, Math.cos(a) * 3.05);
    const len = bottom.distanceTo(top);
    const e = mesh(new THREE.BoxGeometry(0.22, len, 0.22), edgeMat);
    e.position.copy(bottom).add(top).multiplyScalar(0.5); e.lookAt(top); e.rotateX(Math.PI / 2); g.add(e);
  }
  // 中段のステージ (回廊)
  const stY = 5.2;
  const stage = mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.3, 8), woodMat); stage.position.y = stY; g.add(stage);
  const m4 = new THREE.Matrix4();
  const postI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), woodMat, 32);
  for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; m4.makeTranslation(Math.sin(a) * 5.45, stY + 0.6, Math.cos(a) * 5.45); postI.setMatrixAt(i, m4); }
  postI.castShadow = true; g.add(postI);
  const rail = mesh(new THREE.TorusGeometry(5.45, 0.07, 6, 8), woodMat); rail.rotation.x = Math.PI / 2; rail.rotation.z = Math.PI / 8; rail.position.y = stY + 1.1; g.add(rail);
  // ステージの支柱 (斜め)
  const brI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 3.6, 0.16), woodMat, 8);
  const q = new THREE.Quaternion(), e1 = new THREE.Euler();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; e1.set(0.42, a, 0, 'YXZ'); q.setFromEuler(e1); m4.compose(new V3(Math.sin(a) * 4.9, stY - 1.7, Math.cos(a) * 4.9), q, new V3(1, 1, 1)); brI.setMatrixAt(i, m4); }
  brI.castShadow = true; g.add(brI);
  // ドア・窓
  const dr = mesh(doorGeo(1.4, 2.2, '#9CC4DA'), VC); dr.position.set(0, 1.9, 4.38); dr.rotation.x = -0.13; g.add(dr);
  const wg = windowGeo(0.8, 1.1);
  [[0, 8.5, 3.55], [Math.PI * 0.75, 4.0, 4.2], [-Math.PI * 0.6, 10.5, 3.2]].forEach(([a, y, r]) => { const w = mesh(wg, VC, { cast: false }); w.position.set(Math.sin(a) * r, y, Math.cos(a) * r); w.rotation.set(-0.13, a, 0, 'YXZ'); g.add(w); });
  // キャップ (ボート型の屋根)
  const capY = 1.9 + H;
  const cap = new THREE.Group(); cap.position.y = capY; g.add(cap);
  const ring = mesh(new THREE.CylinderGeometry(3.4, 3.3, 0.5, 24), woodMat); cap.add(ring);
  const domeG = new THREE.SphereGeometry(3.3, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2); domeG.scale(1, 1.05, 1.25);
  const dome = mesh(domeG, capMat); dome.position.y = 0.2; cap.add(dome);
  const ridge = mesh(new THREE.TorusGeometry(3.45, 0.12, 8, 40, Math.PI), woodMat); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1.25, 1.05, 1); ridge.position.y = 0.2; cap.add(ridge);
  // 羽根 (回転)
  const hub = new THREE.Group(); hub.position.set(0, 1.2, 3.9); hub.rotation.x = -0.14; cap.add(hub);
  const axle = mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 16), woodMat); axle.rotation.x = Math.PI / 2; axle.position.z = -0.6; hub.add(axle);
  const sails = new THREE.Group(); hub.add(sails); sails.position.z = 0.55;
  const hubCap = mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshStandardMaterial({ color: '#E9D3A8', roughness: 0.5 })); sails.add(hubCap);
  const clothMat = new THREE.MeshStandardMaterial({ color: '#FFFDF6', roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
  const latParts = [];
  const L = 13.5, W = 2.5;
  for (let k = 0; k < 4; k++) {
    const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2 + 0.3; sails.add(arm);
    const spar = mesh(new THREE.BoxGeometry(0.42, L + 1, 0.42), woodMat); spar.position.y = (L + 1) / 2 - 0.4; arm.add(spar);
    // 格子
    const lat = [];
    for (let i = 0; i <= 18; i++) { const y = 2.2 + i * (L - 2.2) / 18; const b = new THREE.BoxGeometry(W, 0.1, 0.1); b.translate(W / 2 + 0.2, y, 0.08); lat.push(b); }
    for (const x of [0.2 + W * 0.5, 0.2 + W]) { const b = new THREE.BoxGeometry(0.12, L - 2.2, 0.12); b.translate(x, 2.2 + (L - 2.2) / 2, 0.08); lat.push(b); }
    const la = mesh(mergeGeometries(lat), woodMat); arm.add(la);
    // 帆布 (少したわむ)
    const cg = new THREE.PlaneGeometry(W - 0.15, L - 2.6, 6, 16);
    const cp = cg.attributes.position; for (let i = 0; i < cp.count; i++) { const x = cp.getX(i) / (W / 2), y = cp.getY(i) / ((L - 2.6) / 2); cp.setZ(i, -0.18 * (1 - x * x) * (1 - y * y * 0.6)); }
    cg.computeVertexNormals(); cg.translate(W / 2 + 0.2, 2.2 + (L - 2.2) / 2, 0.02);
    const cl = mesh(cg, clothMat); arm.add(cl);
    // 反対側の細い格子
    const fl = new THREE.BoxGeometry(0.6, L - 2.2, 0.06); fl.translate(-0.45, 2.2 + (L - 2.2) / 2, 0.06); latParts.push(fl);
    const fm = mesh(fl, woodMat); arm.add(fm);
  }
  // 尾部の梁 (向きを変える棒)
  const tailBeam = mesh(new THREE.BoxGeometry(0.3, 0.3, 7), woodMat); tailBeam.position.set(0, -2.2, -5.2); tailBeam.rotation.x = -0.75; cap.add(tailBeam);
  const wheel = mesh(new THREE.TorusGeometry(0.9, 0.1, 6, 16), woodMat); wheel.position.set(0, -4.6, -7.6); cap.add(wheel);
  // 粉袋と荷車
  const sackMat = new THREE.MeshStandardMaterial({ color: '#F1E4C6', roughness: 1 });
  for (let i = 0; i < 4; i++) { const s = mesh(new THREE.SphereGeometry(0.5, 12, 10), sackMat); s.scale.set(1, 1.25, 0.85); s.position.set(3.4 + (i % 2) * 0.9, 0.55 + Math.floor(i / 2) * 0.9, 4.0 + (i % 2) * 0.3); g.add(s); }
  g.add(hitProxy(6, 30, -1));
  return { group: g, sails, cap };
}

// =====================================================================
// 気球
// =====================================================================
function buildBalloon() {
  const g = new THREE.Group(); g.name = 'balloon';
  // 外皮: 涙型の Lathe
  const prof = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48; // 0=下, 1=上
    const y = t * 13;
    let r = Math.sin(Math.pow(t, 0.75) * Math.PI) * 6.2;
    if (t < 0.25) r = THREE.MathUtils.lerp(1.05, Math.sin(Math.pow(0.25, 0.75) * Math.PI) * 6.2, Math.pow(t / 0.25, 1.4));
    if (t > 0.97) r *= (1 - t) / 0.03 * 0.6 + 0.4 * (1 - (t - 0.97) / 0.03);
    prof.push(new THREE.Vector2(Math.max(r, 0.001), y));
  }
  const gores = 16;
  const eg = new THREE.LatheGeometry(prof, gores * 6);
  const pa = eg.attributes.position, n = pa.count, cc = new Float32Array(n * 3);
  const palette = ['#FF9F7A', '#FFD36E', '#8FB8FF', '#FFFFFF', '#B8E28A', '#FFB3C7'].map(col);
  for (let i = 0; i < n; i++) {
    const x = pa.getX(i), z = pa.getZ(i), y = pa.getY(i);
    // 膨らんだゴアの形 (ゴア中央を少し外へ)
    const a = Math.atan2(z, x), f = ((a / (Math.PI * 2)) * gores + gores) % 1;
    const bulge = 1 + 0.035 * Math.sin(f * Math.PI);
    pa.setX(i, x * bulge); pa.setZ(i, z * bulge);
    const gi = Math.floor(((a / (Math.PI * 2)) * gores + gores)) % gores;
    let c = palette[gi % 4];
    if (y > 9.3 && y < 10.3) c = palette[3];
    if (y < 2.6) c = palette[(gi + 2) % 6];
    cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b;
  }
  eg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  eg.computeVertexNormals();
  const envMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.5, sheenColor: col('#FFFFFF'), side: THREE.DoubleSide });
  const env = mesh(eg, envMat); env.position.y = 4.0; g.add(env);
  // 縫い目のロープ
  const seamMat = new THREE.MeshStandardMaterial({ color: '#F4ECDD', roughness: 0.8 });
  const seamPts = prof.map((p) => p);
  for (let k = 0; k < gores; k++) {
    const a = k / gores * Math.PI * 2;
    const pts = seamPts.filter((_, i) => i % 2 === 0).map((p) => new V3(Math.sin(a) * p.x * 1.004, p.y + 4.0, Math.cos(a) * p.x * 1.004));
    const sg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 4, false);
    g.add(mesh(sg, seamMat, { cast: false }));
  }
  // バーナー枠
  const metal = new THREE.MeshStandardMaterial({ color: '#C9D6E2', roughness: 0.3, metalness: 0.7 });
  const burner = mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.6, 16), metal); burner.position.y = 2.6; g.add(burner);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 12), new THREE.MeshBasicMaterial({ color: '#FFD9A0', transparent: true, opacity: 0.0 }));
  flame.position.y = 3.3; g.add(flame);
  // バスケット
  const wicker = pbr('#D9B486', 'wood', { repeat: 1, rough: 0.95, normal: 1.2 });
  const basket = mesh(new THREE.CylinderGeometry(1.25, 1.05, 1.4, 4, 3), wicker); basket.rotation.y = Math.PI / 4; basket.position.y = -0.7; g.add(basket);
  const rimB = mesh(new THREE.TorusGeometry(1.25, 0.12, 6, 4), new THREE.MeshStandardMaterial({ color: '#B98E62', roughness: 0.9 })); rimB.rotation.x = Math.PI / 2; rimB.rotation.z = Math.PI / 4; rimB.position.y = 0.02; rimB.scale.set(1.0, 1.0, 1); g.add(rimB);
  // ロープ
  const ropeMat = new THREE.MeshStandardMaterial({ color: '#EADFC9', roughness: 0.9 });
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    const top = new V3(Math.sin(a) * 1.05, 4.0, Math.cos(a) * 1.05);
    const bot = new V3(Math.sin(Math.round(k / 2) * Math.PI / 2 + Math.PI / 4) * 0.85, 0.05, Math.cos(Math.round(k / 2) * Math.PI / 2 + Math.PI / 4) * 0.85);
    const rg = new THREE.CylinderGeometry(0.03, 0.03, top.distanceTo(bot), 4); const r = mesh(rg, ropeMat, { cast: false });
    r.position.copy(top).add(bot).multiplyScalar(0.5); r.lookAt(top); r.rotateX(Math.PI / 2); g.add(r);
  }
  // 砂袋
  const sack = new THREE.MeshStandardMaterial({ color: '#EFE2C2', roughness: 1 });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const s = mesh(new THREE.SphereGeometry(0.2, 10, 8), sack); s.scale.y = 1.3; s.position.set(Math.sin(a) * 1.32, -0.35, Math.cos(a) * 1.32); g.add(s); }
  // 旗 (なびく)
  const flagG = new THREE.PlaneGeometry(1.4, 0.7, 10, 2); flagG.translate(0.7, 0, 0);
  const flag = mesh(flagG, new THREE.MeshStandardMaterial({ color: '#FF9F7A', side: THREE.DoubleSide, roughness: 0.8 }), { cast: false });
  flag.position.set(0, 17.6, 0); g.add(flag);
  const pole = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), metal); pole.position.set(0, 17.2, 0); g.add(pole);
  g.add(hitProxy(6.5, 20, -1.6));
  return { group: g, flag, flagG, flame };
}

// =====================================================================
// 滝 (川が島の縁から落ちる)
// =====================================================================
function findLip() {
  const [ax, az] = RIVER[RIVER.length - 3], [bx, bz] = RIVER[RIVER.length - 1];
  let last = null;
  for (let i = 0; i <= 400; i++) {
    const t = i / 400, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    const R = rimRadius(Math.atan2(z, x));
    if (Math.hypot(x, z) > R * 0.995) break;
    last = [x, z];
  }
  const dir = new V3(bx - ax, 0, bz - az).normalize();
  return { x: last[0], z: last[1], dir };
}

function buildWaterfall(Q) {
  const g = new THREE.Group(); g.name = 'waterfall';
  const lip = findLip();
  const out = lip.dir.clone();
  const side = new V3(-out.z, 0, out.x);
  // 落下の曲線 (放物線→崖沿い)
  const pts = [];
  const steps = 60, fallH = 92;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = WATER_Y + 0.05 - fallH * t * t * 0.9 - t * fallH * 0.1;
    const o = Math.min(t * 18, 1) * 3.2 + t * 7.5;
    pts.push(new V3(lip.x + out.x * (o - 0.5), y, lip.z + out.z * (o - 0.5)));
  }
  const width0 = 6.6;
  const pos = [], uv = [], idx = [];
  const segW = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = pts[i];
    const w = width0 * (1 + t * 0.9);
    for (let j = 0; j <= segW; j++) {
      const s = j / segW - 0.5;
      const bulge = Math.cos(s * Math.PI) * 0.7 * Math.min(t * 6, 1);
      pos.push(p.x + side.x * s * w + out.x * bulge, p.y, p.z + side.z * s * w + out.z * bulge);
      uv.push(j / segW, t);
    }
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < segW; j++) { const a = i * (segW + 1) + j, b = a + 1, c = a + segW + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx); fg.computeVertexNormals();
  const fallMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
    vertexShader: `varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){
        float sp = uTime * 1.25;
        vec2 p = vec2(vUv.x * 18.0, vUv.y * 9.0 - sp * (1.0 + vUv.y));
        float s1 = vn(vec2(p.x, p.y * 0.35));
        float s2 = vn(vec2(p.x * 2.3 + 7.0, p.y * 0.8 - sp));
        float streak = smoothstep(0.35, 0.95, s1 * 0.6 + s2 * 0.5);
        vec3 c = mix(vec3(0.72, 0.9, 0.96), vec3(1.0), streak * 0.85 + vUv.y * 0.5);
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        float a = (0.55 + streak * 0.45) * edge;
        a *= smoothstep(1.0, 0.55, vUv.y);                // 下で霧に溶ける
        a *= 0.55 + 0.45 * smoothstep(0.0, 0.03, vUv.y);
        // 細かいちぎれ
        a *= mix(1.0, smoothstep(0.25, 0.6, vn(vec2(vUv.x * 30.0, vUv.y * 40.0 - sp * 4.0))), smoothstep(0.35, 0.8, vUv.y));
        gl_FragColor = vec4(c, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const fall = new THREE.Mesh(fg, fallMat); fall.renderOrder = 3; g.add(fall);

  // しぶき・霧 (Points)
  const dot = softDotTexture(128);
  const NM = Math.round(900 * Q);
  const mp = new Float32Array(NM * 3), ms = new Float32Array(NM), mph = new Float32Array(NM);
  const rnd = mulberry32(77);
  for (let i = 0; i < NM; i++) {
    const t = Math.pow(rnd(), 0.7);
    const k = Math.min(steps, Math.floor(t * steps)); const p = pts[k];
    const w = width0 * (1 + t * 0.9) * 0.7;
    mp[i * 3] = p.x + side.x * (rnd() - 0.5) * w * 1.6 + out.x * (rnd() * 4 + t * 4);
    mp[i * 3 + 1] = p.y + (rnd() - 0.5) * 4;
    mp[i * 3 + 2] = p.z + side.z * (rnd() - 0.5) * w * 1.6 + out.z * (rnd() * 4 + t * 4);
    ms[i] = 1.5 + t * 9 + rnd() * 3; mph[i] = rnd() * 10;
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); mg.setAttribute('aSize', new THREE.BufferAttribute(ms, 1)); mg.setAttribute('aPh', new THREE.BufferAttribute(mph, 1));
  const mistMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uMap: { value: dot }, uScale: { value: 400 } },
    vertexShader: `attribute float aSize; attribute float aPh; uniform float uTime; uniform float uScale; varying float vA;
      void main(){ vec3 p = position; p.y += sin(uTime*0.6 + aPh)*0.8; p.x += sin(uTime*0.3 + aPh*1.7)*0.9;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = aSize * uScale / -mv.z; vA = 0.32 * (0.6 + 0.4*sin(uTime*0.8+aPh)); }`,
    fragmentShader: `uniform sampler2D uMap; varying float vA; void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.0), t.a * vA); }`,
  });
  const mist = new THREE.Points(mg, mistMat); mist.frustumCulled = false; mist.renderOrder = 4; g.add(mist);

  // 虹 (うすい)
  const rb = new THREE.Mesh(new THREE.RingGeometry(14, 17.5, 96, 1, 0, Math.PI), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vP; void main(){ vUv=uv; vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; vec3 hsv(float h){ return clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); }
      void main(){ float r = (length(vP.xy)-14.0)/3.5; float ang = atan(vP.y, vP.x)/3.14159;
        vec3 c = mix(vec3(1.0), hsv(0.83 - r*0.83), 0.55);
        float a = smoothstep(0.0,0.15,r)*smoothstep(1.0,0.85,r)*0.22*smoothstep(0.0,0.25,ang)*smoothstep(1.0,0.75,ang);
        gl_FragColor = vec4(c, a); }`,
  }));
  const mid = pts[Math.round(steps * 0.45)];
  rb.position.set(mid.x + out.x * 9, mid.y - 4, mid.z + out.z * 9);
  rb.lookAt(rb.position.clone().add(out)); rb.renderOrder = 5;
  g.add(rb);

  // 縁の岩 (流れ口)
  const rockMat = pbr('#E2D2B6', 'rock', { repeat: 1, rough: 0.95, normal: 1.2 });
  for (let k = 0; k < 9; k++) {
    const s = (k / 8 - 0.5) * 1.35, sz = 0.6 + rnd() * 0.9;
    const geo = new THREE.IcosahedronGeometry(sz, 2); const pp = geo.attributes.position;
    for (let i = 0; i < pp.count; i++) { const f = 1 + (rnd() - 0.5) * 0.35; pp.setXYZ(i, pp.getX(i) * f, pp.getY(i) * f * 0.7, pp.getZ(i) * f); }
    geo.computeVertexNormals();
    if (Math.abs(s) < 0.42) continue;
    const r = mesh(geo, rockMat);
    r.position.set(lip.x + side.x * s * width0, WATER_Y + 0.1, lip.z + side.z * s * width0); g.add(r);
  }
  const center = pts[Math.round(steps * 0.12)].clone();
  const hit = hitProxy(7, 40, 0); hit.position.set(center.x, center.y - 34, center.z); g.add(hit);
  return { group: g, fallMat, mistMat, lip, center: new V3(lip.x + out.x * 2, WATER_Y - 6, lip.z + out.z * 2) };
}

// =====================================================================
// 花畑の看板アーチ (花そのものは flora.js)
// =====================================================================
function buildFlowerGate() {
  const g = new THREE.Group(); g.name = 'flowers-gate';
  const woodMat = pbr('#D3A979', 'wood', { repeat: 1, rough: 0.85 });
  for (const s of [-1, 1]) { const p = mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.4, 10), woodMat); p.position.set(s * 1.8, 1.7, 0); g.add(p); }
  const arc = mesh(new THREE.TorusGeometry(1.8, 0.14, 8, 32, Math.PI), woodMat); arc.position.y = 3.4; g.add(arc);
  // アーチのつる花
  const rnd = mulberry32(5);
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 70);
  const lf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: '#9FD67E', roughness: 0.8, flatShading: true }), 90);
  const m4 = new THREE.Matrix4(); const cs = ['#FFB3C7', '#FFFFFF', '#FFD36E', '#FF9F7A'];
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI, isPost = i % 3 === 0; let x, y;
    if (isPost) { x = (rnd() < 0.5 ? -1 : 1) * 1.8; y = rnd() * 3.4; } else { x = Math.cos(a) * 1.8; y = 3.4 + Math.sin(a) * 1.8; }
    m4.makeTranslation(x + (rnd() - 0.5) * 0.3, y, (rnd() - 0.5) * 0.35);
    lf.setMatrixAt(i, m4);
    if (i < 70) { m4.makeTranslation(x + (rnd() - 0.5) * 0.35, y + (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.4); fl.setMatrixAt(i, m4); fl.setColorAt(i, col(cs[i % 4])); }
  }
  lf.castShadow = true; g.add(lf, fl);
  // 看板
  const sign = mesh(new THREE.BoxGeometry(2.4, 0.7, 0.1), new THREE.MeshStandardMaterial({ map: signTexture('はなばたけ'), roughness: 0.8 }));
  sign.position.set(0, 4.25, 0.12); g.add(sign);
  return g;
}
export function signTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 150; const x = c.getContext('2d');
  x.fillStyle = '#F6E7C8'; x.fillRect(0, 0, 512, 150);
  for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(190,150,100,${0.05 + Math.random() * 0.08})`; x.beginPath(); const y = Math.random() * 150; x.moveTo(0, y); x.bezierCurveTo(170, y + 6, 340, y - 6, 512, y + 3); x.stroke(); }
  x.strokeStyle = '#D9B98A'; x.lineWidth = 10; x.strokeRect(5, 5, 502, 140);
  x.fillStyle = '#6C7F92'; x.font = 'bold 84px "Hiragino Maru Gothic ProN","M PLUS Rounded 1c",system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 256, 80);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// =====================================================================
export function createLandmarks(app, ctx) {
  const { scene } = app;
  const Q = app.quality === 'low' ? 0.35 : 1;
  const L = ctx.landmarks;

  // 灯台
  const lh = buildLighthouse();
  const [lx, lz] = SPOTS.lighthouse;
  lh.group.position.set(lx, groundY(lx, lz, 5) + 0.1, lz); lh.group.rotation.y = Math.atan2(lx, lz) + 0.2;
  scene.add(lh.group);
  L.push({ id: 'lighthouse', name: '灯台', position: lh.group.position.clone().add(new V3(0, 12, 0)), object: lh.group, hit: lh.group.getObjectByName('hit'), radius: 9 });

  // 風車
  const wm = buildWindmill();
  const [wx, wz] = SPOTS.windmill;
  wm.group.position.set(wx, groundY(wx, wz, 4.5) - 0.2, wz);
  wm.group.rotation.y = -0.85; // 羽根を島の中心・南側へ向ける
  scene.add(wm.group);
  L.push({ id: 'windmill', name: '風車', position: wm.group.position.clone().add(new V3(0, 10, 0)), object: wm.group, hit: wm.group.getObjectByName('hit'), radius: 10 });

  // 花畑 (flora が後で花を group に入れる)
  const fg = new THREE.Group(); fg.name = 'flowers';
  const [fx, fz] = SPOTS.flowers;
  fg.position.set(0, 0, 0);
  const gate = buildFlowerGate(); gate.position.set(fx - 13.5, mainHeight(fx - 13.5, fz - 3), fz - 3); gate.rotation.y = -Math.PI / 2 + 0.25; fg.add(gate);
  const fhit = hitProxy(13, 4, 0); fhit.position.set(fx, mainHeight(fx, fz) - 1, fz); fhit.scale.set(1.15, 1, 0.85); fg.add(fhit);
  scene.add(fg);
  L.push({ id: 'flowers', name: '花畑', position: new V3(fx, mainHeight(fx, fz) + 1.5, fz), object: fg, hit: fhit, radius: 13 });
  ctx.extras.flowerGroup = fg;

  // 滝
  const wf = buildWaterfall(Q);
  scene.add(wf.group);
  L.push({ id: 'waterfall', name: '滝', position: wf.center.clone(), object: wf.group, hit: wf.group.getObjectByName('hit'), radius: 10 });

  // 気球 (東の小島の上に浮かぶ)
  const bl = buildBalloon();
  const east = ISLETS.find((i) => i.id === 'east');
  const bBase = new V3(east.c[0] - 6, east.c[1] + 20, east.c[2] - 4);
  bl.group.position.copy(bBase); scene.add(bl.group);
  const blLM = { id: 'balloon', name: '気球', position: bBase.clone().add(new V3(0, 9, 0)), object: bl.group, hit: bl.group.getObjectByName('hit'), radius: 9 };
  L.push(blLM);

  // ---- アニメーション ----
  const fp = bl.flagG.attributes.position, fx0 = Float32Array.from(fp.array);
  let burnT = 0;
  app.onUpdate((dt, t) => {
    lh.rot.rotation.y = t * 0.6;
    lh.vane.rotation.y = Math.sin(t * 0.3) * 0.4 + 1.2;
    lh.lampMat.emissiveIntensity = 0.8 + 0.15 * Math.sin(t * 2.0);
    wm.sails.rotation.z = -t * 0.55;
    wf.fallMat.uniforms.uTime.value = t;
    wf.mistMat.uniforms.uTime.value = t;
    wf.mistMat.uniforms.uScale.value = app.size.h * 0.9;
    // 気球: ふわふわ上下 + ゆっくり旋回
    const g = bl.group;
    g.position.set(bBase.x + Math.sin(t * 0.07) * 4, bBase.y + Math.sin(t * 0.45) * 1.4 + Math.sin(t * 0.17) * 1.6, bBase.z + Math.cos(t * 0.07) * 4);
    g.rotation.y = t * 0.05; g.rotation.z = Math.sin(t * 0.4) * 0.025; g.rotation.x = Math.cos(t * 0.33) * 0.02;
    blLM.position.set(g.position.x, g.position.y + 9, g.position.z);
    // 旗のなびき
    for (let i = 0; i < fp.count; i++) { const x = fx0[i * 3]; fp.setZ(i, Math.sin(x * 3 - t * 5) * 0.12 * x); }
    fp.needsUpdate = true;
    // バーナー時々点火
    burnT -= dt; if (burnT < -6 - Math.random() * 6) burnT = 1.2;
    bl.flame.material.opacity = burnT > 0 ? 0.65 * Math.min(1, burnT * 3) : 0;
    bl.flame.scale.y = 0.8 + Math.random() * 0.4;
  });
  return { lighthouse: lh, windmill: wm, waterfall: wf, balloon: bl };
}
