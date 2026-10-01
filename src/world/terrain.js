// 浮島の地形メッシュ (上面: 草/道/川岸, 下面: 層状の岩) (Agent B)
import * as THREE from 'three';
import { N, mainHeight, rimRadius, riverInfo, pathDist, SPOTS, ISLETS, isletRim, isletHeight, WATER_Y } from './layout.js';
import { createNoise, smoothstep, clamp, lerp } from './noise.js';
import { loadTex, neutralDetail } from './textures.js';

const C = (h) => new THREE.Color(h);
const GRASS_A = C('#93CD6E'), GRASS_B = C('#B9E28A'), GRASS_C = C('#CDEB9C'), GRASS_D = C('#A6D67A');
const PATH = C('#EAD8A6'), PATH_EDGE = C('#D8E3A0'), SAND = C('#F1E2B8'), BED = C('#BFE3CF'), MOSS = C('#A9D58A');
const STRATA = ['#F2DFB2', '#E6C99A', '#EED6AA', '#DDBE93', '#E9D2A8', '#D8B88E'].map(C);
const ROCK_TIP = C('#CDB08A');

// ---------- 地面マテリアル (草/砂の2種ディテールを頂点属性でブレンド) ----------
function groundMaterial() {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.93, metalness: 0,
    map: loadTex('grass_d.jpg'), normalMap: loadTex('grass_n.jpg'),
    envMapIntensity: 0.6,
  });
  m.normalScale.set(0.55, 0.55);
  const sandMap = loadTex('sand_d.jpg');
  m.onBeforeCompile = (sh) => {
    sh.uniforms.sandMap = { value: sandMap };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPath; varying float vPath; varying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPath = aPath; vWPos = (modelMatrix * vec4(position,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D sandMap; varying float vPath; varying vec3 vWPos;')
      .replace('#include <map_fragment>', `
        vec3 gA = texture2D(map, vMapUv).rgb * 2.0;
        vec3 gB = texture2D(map, vMapUv * 0.27 + vec2(0.31, 0.17)).rgb * 2.0;
        vec3 g = mix(vec3(1.0), gA * mix(vec3(1.0), gB, 0.45), 0.9);
        vec3 s = texture2D(sandMap, vMapUv * 1.4).rgb * 2.0;
        s = mix(vec3(1.0), s, 0.8);
        diffuseColor.rgb *= mix(g, s, smoothstep(0.15, 0.85, vPath));`);
  };
  m.customProgramCacheKey = () => 'nanka-ground';
  return m;
}

// ---------- 下面 (岩) マテリアル ----------
function rockMaterial() {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0,
    map: loadTex('rock_d.jpg'), normalMap: loadTex('rock_n.jpg'), envMapIntensity: 0.7,
  });
  m.normalScale.set(1.1, 1.1);
  neutralDetail(m, 0.85);
  return m;
}

const tmpC = new THREE.Color();

// 汎用: 浮島メッシュを作る
// opts: { cx, cz, rimFn(theta), heightFn(x,z), colorFn(x,z,h,s)->{color,path}, depth, NT, NR, seed, under: {bulge} }
function buildIsland(opts) {
  const { cx = 0, cz = 0, rimFn, heightFn, colorFn, depth, NT, NR, seed = 7 } = opts;
  const nz = createNoise(seed);
  // ---- 上面 (極座標グリッド) ----
  const pos = [], col = [], uv = [], pathA = [], idx = [];
  const rows = NR + 1, cols = NT;
  const rimH = new Float32Array(NT), rimX = new Float32Array(NT), rimZ = new Float32Array(NT);
  for (let i = 0; i <= NR; i++) {
    // 縁ほど細かく
    const u = i / NR; const s = Math.max(1e-3, 1 - Math.pow(1 - u, 1.6));
    for (let j = 0; j < NT; j++) {
      const th = (j / NT) * Math.PI * 2;
      const R = rimFn(th) * (i === NR ? 0.9995 : 1);
      const x = cx + Math.cos(th) * R * s, z = cz + Math.sin(th) * R * s;
      let h = heightFn(x, z);
      if (!Number.isFinite(h)) h = heightFn(cx + Math.cos(th) * R * s * 0.995, cz + Math.sin(th) * R * s * 0.995);
      pos.push(x, h, z); uv.push(x / 5.5, z / 5.5);
      const c = colorFn(x, z, h, s);
      col.push(c.color.r, c.color.g, c.color.b); pathA.push(c.path || 0);
      if (i === NR) { rimH[j] = h; rimX[j] = x; rimZ[j] = z; }
    }
  }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NT; j++) {
    const a = i * cols + j, b = i * cols + ((j + 1) % NT), c = (i + 1) * cols + j, d = (i + 1) * cols + ((j + 1) % NT);
    idx.push(a, c, b, b, c, d);
  }
  const top = new THREE.BufferGeometry();
  top.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  top.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  top.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  top.setAttribute('aPath', new THREE.Float32BufferAttribute(pathA, 1));
  top.setIndex(idx);
  top.computeVertexNormals();
  top.computeTangents?.();

  // ---- 下面 (逆円錐の岩塊) ----
  const UR = opts.underRows || 90;
  const up = [], uc = [], uuv = [], ui = [];
  const minRim = Math.min(...rimH);
  const bottomY = minRim - depth;
  for (let i = 0; i <= UR; i++) {
    const v = i / UR;
    for (let j = 0; j <= NT; j++) {
      const jj = j % NT, th = (jj / NT) * Math.PI * 2;
      const rx = rimX[jj] - cx, rz = rimZ[jj] - cz, R0 = Math.hypot(rx, rz);
      // 断面: 上はほぼ垂直の崖 → 下で絞れて先端へ
      let prof = v < 0.06 ? 1 + 0.02 * Math.sin(v / 0.06 * Math.PI) : Math.pow(1 - (v - 0.06) / 0.94, 0.85) * (1 - 0.1 * Math.sin(v * Math.PI));
      prof = Math.max(prof, 0.0);
      const y0 = lerp(rimH[jj] - 0.05, bottomY, Math.pow(v, 0.92));
      // 岩のゴツゴツ (3D ノイズで半径方向に変位 + 縦の筋)
      const nx = Math.cos(th), nzv = Math.sin(th);
      const big = nz.fbm3(nx * 2.2 + 3, y0 * 0.045, nzv * 2.2, 4);
      const ridge = Math.abs(nz.n3(th * 9, y0 * 0.02, 1.3));
      const fine = nz.fbm3(nx * 9, y0 * 0.16, nzv * 9, 3);
      const strata = Math.sin(y0 * 0.85 + big * 4) * 0.5 + 0.5;
      let disp = (big * 0.16 + (0.5 - ridge) * 0.07 + fine * 0.035 + (strata > 0.82 ? 0.025 : 0)) * R0 * (0.3 + 0.7 * Math.sin(Math.min(v * 1.25, 1) * Math.PI) + 0.2);
      if (v < 0.015) disp = 0;
      const r = Math.max(0.3, R0 * prof + disp * (prof > 0.02 ? 1 : 0));
      const tipJ = v > 0.97 ? (v - 0.97) / 0.03 : 0;
      const x = cx + nx * r * (1 - tipJ), z = cz + nzv * r * (1 - tipJ);
      const y = y0 + (v > 0.8 ? -nz.n2(th * 3, 9) * depth * 0.12 * (v - 0.8) / 0.2 : 0);
      up.push(x, y, z);
      uuv.push(th * R0 / 9, y / 9);
      // 層の色 (明るい砂岩系)
      const band = Math.floor((y * 0.32 + big * 2.4 + 100)) % STRATA.length;
      tmpC.copy(STRATA[band]).lerp(STRATA[(band + 1) % STRATA.length], strata * 0.5);
      tmpC.lerp(ROCK_TIP, smoothstep(0.55, 1, v) * 0.6);
      if (v < 0.035) tmpC.lerp(MOSS, 1 - v / 0.035);           // 縁は苔
      const ao = 1 - 0.12 * smoothstep(0.0, 0.3, v) * (1 - Math.max(0, nx * -0.42 + nzv * 0.52) * 0.5);
      tmpC.multiplyScalar(ao);
      uc.push(tmpC.r, tmpC.g, tmpC.b);
    }
  }
  for (let i = 0; i < UR; i++) for (let j = 0; j < NT; j++) {
    const a = i * (NT + 1) + j, b = a + 1, c = a + (NT + 1), d = c + 1;
    ui.push(a, b, c, b, d, c);
  }
  const under = new THREE.BufferGeometry();
  under.setAttribute('position', new THREE.Float32BufferAttribute(up, 3));
  under.setAttribute('color', new THREE.Float32BufferAttribute(uc, 3));
  under.setAttribute('uv', new THREE.Float32BufferAttribute(uuv, 2));
  under.setIndex(ui);
  under.computeVertexNormals();
  return { top, under, rim: { x: rimX, z: rimZ, h: rimH }, bottomY };
}

// 主島の色
function mainColor(x, z, h, s) {
  const n1 = N.fbm2(x * 0.035 + 11, z * 0.035 - 4, 3), n2 = N.n2(x * 0.16, z * 0.16);
  tmpC.copy(GRASS_A).lerp(GRASS_B, clamp(0.5 + n1 * 0.9, 0, 1));
  tmpC.lerp(GRASS_C, clamp(n2 * 0.5, 0, 0.35));
  tmpC.lerp(GRASS_D, smoothstep(5, 14, h) * 0.3);
  // 花畑の地面は少し黄緑
  const df = Math.hypot((x - SPOTS.flowers[0]) * 0.8, z - SPOTS.flowers[1]);
  tmpC.lerp(C('#C6E28E'), smoothstep(16, 8, df) * 0.5);
  // 道
  const pd = pathDist(x, z);
  const pw = 1.35 + 0.35 * N.n2(x * 0.3, z * 0.3);
  const pathT = 1 - smoothstep(pw - 0.4, pw + 0.5, pd);
  tmpC.lerp(PATH_EDGE, (1 - smoothstep(pw, pw + 1.4, pd)) * 0.45);
  tmpC.lerp(PATH, pathT);
  // 川岸と川底
  const ri = riverInfo(x, z);
  const sandT = 1 - smoothstep(0.2, 1.8 + n2 * 0.6, ri.d);
  tmpC.lerp(SAND, sandT * 0.85);
  tmpC.lerp(BED, smoothstep(-0.2, -1.6, ri.d));
  // 村の広場
  const dv = Math.hypot(x - SPOTS.village[0], z - SPOTS.village[1]);
  const plaza = 1 - smoothstep(6.5, 8, dv);
  tmpC.lerp(C('#EBDDB3'), plaza * 0.9);
  // 縁は少し明るく乾いた草
  tmpC.lerp(C('#C9E59A'), smoothstep(0.9, 1, s) * 0.4);
  return { color: tmpC.clone(), path: Math.max(pathT, sandT * 0.9, plaza) };
}

function isletColor(isl) {
  const n = createNoise(isl.seed + 1);
  return (x, z, h, s) => {
    tmpC.copy(GRASS_A).lerp(GRASS_B, clamp(0.5 + n.fbm2(x * 0.05, z * 0.05, 3), 0, 1));
    tmpC.lerp(C('#C9E59A'), smoothstep(0.85, 1, s) * 0.4);
    return { color: tmpC.clone(), path: 0 };
  };
}

// ---------- 水 (池+川) ----------
function waterMaterial() {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uDeep: { value: C('#74CBE0') }, uShallow: { value: C('#B8EDF0') }, uSky: { value: C('#E4F4FF') },
      uSunDir: { value: new THREE.Vector3(-0.42, 0.74, 0.52).normalize() },
    }]),
    vertexShader: /* glsl */`
      attribute float aShore; attribute vec2 aFlow;
      varying float vShore; varying vec2 vFlow; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vShore = aShore; vFlow = aFlow; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz;
        vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uDeep, uShallow, uSky, uSunDir;
      varying float vShore; varying vec2 vFlow; varying vec3 vW;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float wave(vec2 p){ return vn(p)*0.5 + vn(p*2.1+3.)*0.3 + vn(p*4.3-7.)*0.2; }
      void main(){
        vec2 flow = vFlow * uTime * 1.2;
        vec2 p = vW.xz * 0.9;
        float e = 0.08;
        float w0 = wave(p - flow), wx = wave(p + vec2(e,0.) - flow), wz = wave(p + vec2(0.,e) - flow);
        float w1 = wave(p*0.5 + flow*0.3 + vec2(uTime*0.05));
        vec3 n = normalize(vec3((w0-wx)*2.2 + (w1-0.5)*0.1, 1.0, (w0-wz)*2.2));
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        float depthT = smoothstep(0.0, 2.4, vShore);
        vec3 col = mix(uShallow, uDeep, depthT);
        col = mix(col, uSky, fres * 0.7);
        vec3 H = normalize(uSunDir + V);
        float spec = pow(max(dot(n, H), 0.0), 180.0);
        col += vec3(1.0, 0.98, 0.92) * spec * 0.9;
        // 岸の泡 / さざなみ
        float foam = (1.0 - smoothstep(0.0, 0.55, vShore)) * (0.6 + 0.4 * sin(uTime * 2.0 + vW.x * 3.0 + vW.z * 2.0));
        foam += smoothstep(0.72, 0.9, wave(p * 2.0 - flow * 1.5)) * 0.25 * length(vFlow);
        col = mix(col, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.75);
        float a = mix(0.62, 0.9, depthT) + fres * 0.1;
        gl_FragColor = vec4(col, clamp(a + foam * 0.3, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  return m;
}

function buildWater() {
  // 島上面の格子を再サンプリングして、川/池の内側(+余白)の三角形だけ残す
  const NRw = 260, NTw = 900;
  const pos = [], shore = [], flow = [], idx = [], keep = [];
  const R = (th) => rimRadius(th);
  for (let i = 0; i <= NRw; i++) {
    const s = i / NRw;
    for (let j = 0; j < NTw; j++) {
      const th = (j / NTw) * Math.PI * 2;
      const x = Math.cos(th) * R(th) * s * 1.004, z = Math.sin(th) * R(th) * s * 1.004;
      const ri = riverInfo(x, z);
      pos.push(x, WATER_Y, z);
      shore.push(-ri.d);
      keep.push(ri.d < 0.9 ? 1 : 0);
      // 流れ方向: 川の t に沿う (池は弱い)
      const f = ri.pond < 0.5 ? 0.15 : 1;
      flow.push(-0.7 * f, 0.7 * f);
    }
  }
  for (let i = 0; i < NRw; i++) for (let j = 0; j < NTw; j++) {
    const a = i * NTw + j, b = i * NTw + (j + 1) % NTw, c = (i + 1) * NTw + j, d = (i + 1) * NTw + (j + 1) % NTw;
    if (keep[a] || keep[b] || keep[c]) idx.push(a, c, b);
    if (keep[b] || keep[c] || keep[d]) idx.push(b, c, d);
  }
  // 未使用頂点を詰める
  const used = new Int32Array(pos.length / 3).fill(-1); const P = [], S = [], F = [], I = [];
  for (const k of idx) { if (used[k] < 0) { used[k] = P.length / 3; P.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); S.push(shore[k]); F.push(flow[k * 2], flow[k * 2 + 1]); } I.push(used[k]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aShore', new THREE.Float32BufferAttribute(S, 1));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(F, 2));
  g.setIndex(I);
  const mesh = new THREE.Mesh(g, waterMaterial());
  mesh.renderOrder = 2; mesh.name = 'river';
  return mesh;
}

export function createTerrain(app) {
  const group = new THREE.Group(); group.name = 'terrain';
  const gm = groundMaterial(), rm = rockMaterial();
  const main = buildIsland({ rimFn: rimRadius, heightFn: (x, z) => mainHeight(x, z), colorFn: mainColor, depth: 66, NT: 720, NR: 230, seed: 3, underRows: 110 });
  const topMesh = new THREE.Mesh(main.top, gm); topMesh.receiveShadow = true; topMesh.castShadow = true; topMesh.name = 'mainTop';
  const underMesh = new THREE.Mesh(main.under, rm); underMesh.receiveShadow = true; underMesh.castShadow = true; underMesh.name = 'mainUnder';
  group.add(topMesh, underMesh);

  const islets = [];
  for (const isl of ISLETS) {
    const b = buildIsland({
      cx: isl.c[0], cz: isl.c[2], rimFn: (th) => isletRim(isl, th), heightFn: (x, z) => isletHeight(isl, x, z),
      colorFn: isletColor(isl), depth: isl.depth, NT: Math.round(160 + isl.R * 10), NR: Math.round(30 + isl.R * 2.2), seed: isl.seed, underRows: 60,
    });
    const t = new THREE.Mesh(b.top, gm), u = new THREE.Mesh(b.under, rm);
    t.receiveShadow = u.receiveShadow = true; t.castShadow = u.castShadow = true;
    const g = new THREE.Group(); g.name = 'islet-' + isl.id; g.add(t, u);
    g.userData = { isl, base: 0, phase: isl.seed * 0.7 };
    group.add(g); islets.push(g);
  }

  const water = buildWater();
  group.add(water);

  app.onUpdate((dt, t) => {
    water.material.uniforms.uTime.value = t;
  });
  return { group, main, water, islets };
}
