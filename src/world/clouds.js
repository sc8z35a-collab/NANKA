// 雲 (もこもこ積雲) + 雲海 + はるか下の海 + 遠景の島影 (Agent B)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32, createNoise } from './noise.js';
import { SUN_DIR, PALETTE } from './sky.js';
import { shared } from './textures.js';

const V3 = THREE.Vector3;

// --- 積雲 1 個分のジオメトリ: 球の集合 → 頂点カラーに 太陽方向の明暗 & 底の影 を焼く ---
function cloudGeo(seed, size = 1) {
  const rnd = mulberry32(seed); const n = createNoise(seed);
  const parts = [];
  const count = 9 + Math.floor(rnd() * 7);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const x = (rnd() - 0.5) * 26 * size, z = (rnd() - 0.5) * 12 * size;
    const r = (4 + rnd() * 5.5) * size * (1 - Math.abs(x) / (26 * size) * 0.8);
    const y = r * 0.45 + rnd() * 3 * size;
    const g = new THREE.IcosahedronGeometry(r, 3);
    const p = g.attributes.position; const v = new V3();
    for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const l = v.length(); v.normalize(); const d = 1 + 0.08 * n.n3(v.x * 2 + i, v.y * 2, v.z * 2); v.multiplyScalar(l * d); p.setXYZ(k, v.x, v.y, v.z); }
    g.translate(x, y, z); parts.push(g.toNonIndexed());
  }
  const g = mergeGeometries(parts);
  // 平らな底
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { if (p.getY(i) < 0) p.setY(i, p.getY(i) * 0.25); }
  g.computeVertexNormals();
  const c = new Float32Array(p.count * 3), nn = g.attributes.normal;
  let ymax = 0; for (let i = 0; i < p.count; i++) ymax = Math.max(ymax, p.getY(i));
  const top = new THREE.Color('#FFFFFF'), mid = new THREE.Color('#F4F9FF'), low = new THREE.Color('#D7E7F8'), warm = new THREE.Color('#FFF6E8');
  const tc = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const h = Math.max(0, p.getY(i)) / ymax;
    const sunL = Math.max(0, nn.getX(i) * SUN_DIR.x + nn.getY(i) * SUN_DIR.y + nn.getZ(i) * SUN_DIR.z);
    tc.copy(low).lerp(mid, Math.min(1, h * 1.6)).lerp(top, Math.min(1, h * 0.6 + sunL * 0.6));
    tc.lerp(warm, Math.pow(sunL, 3) * 0.4);
    c[i * 3] = tc.r; c[i * 3 + 1] = tc.g; c[i * 3 + 2] = tc.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

function cloudMaterial() {
  // ライティングは頂点カラーに焼いてあるので Basic + フレネルで縁を透けさせる
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true, vertexColors: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
    vertexShader: /* glsl */`
      varying vec3 vC; varying vec3 vN; varying vec3 vV; uniform float uTime;
      #include <fog_pars_vertex>
      void main(){
        vC = color;
        vec3 p = position;
        #ifdef USE_INSTANCING
          vec4 w = modelMatrix * instanceMatrix * vec4(p,1.0);
          vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        #else
          vec4 w = modelMatrix * vec4(p,1.0);
          vN = normalize(mat3(modelMatrix) * normal);
        #endif
        // ゆっくり膨らむ
        w.xyz += vN * sin(uTime * 0.25 + w.x * 0.05 + w.y * 0.08) * 0.35;
        vV = normalize(cameraPosition - w.xyz);
        vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying vec3 vN; varying vec3 vV;
      #include <fog_pars_fragment>
      void main(){
        float f = abs(dot(normalize(vN), normalize(vV)));
        float a = smoothstep(0.0, 0.45, f);
        vec3 c = vC + (1.0 - f) * 0.06;
        gl_FragColor = vec4(c, a * 0.96);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  return m;
}

// --- 雲海 (島の下に広がる、ふわっとした層) ---
function cloudSea(Q) {
  const geo = new THREE.PlaneGeometry(5200, 5200, 1, 1); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: shared.uTime, uSun: { value: SUN_DIR.clone() }, uHorizon: { value: new THREE.Color(PALETTE.horizon) }, uLayer: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uSun; uniform vec3 uHorizon; uniform float uLayer; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*vn(p); p=p*2.02+vec2(3.1,1.7); a*=.5; } return s; }
      void main(){
        vec2 p = vW.xz * 0.006 + vec2(uTime * 0.004, uTime * 0.0025) + uLayer * 3.7;
        float c = fbm(p + fbm(p * 0.6) * 0.8);
        float d = length(vW.xz - cameraPosition.xz);
        float dens = smoothstep(0.32 + uLayer * 0.08, 0.72, c);
        // 擬似ライティング: ノイズの勾配
        float e = 0.02; float cx = fbm(p + vec2(e, 0.0)); float cz = fbm(p + vec2(0.0, e));
        vec3 n = normalize(vec3((c - cx) * 9.0, 1.0, (c - cz) * 9.0));
        float l = 0.82 + 0.18 * max(dot(n, uSun), 0.0);
        vec3 col = mix(vec3(0.86, 0.92, 0.98), vec3(1.0), dens) * l;
        float fade = 1.0 - smoothstep(900.0, 2500.0, d);
        float a = mix(dens * 0.92, 1.0, smoothstep(700.0, 2300.0, d)); // 遠くは一面の雲
        col = mix(col, uHorizon, smoothstep(600.0, 2500.0, d));
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * (uLayer > 0.5 ? 0.55 : 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const g = new THREE.Group();
  const lower = new THREE.Mesh(geo, mat); lower.position.y = -150; lower.renderOrder = -5; g.add(lower);
  const m2 = mat.clone(); m2.uniforms = { ...mat.uniforms, uLayer: { value: 1 } }; m2.uniforms.uTime = shared.uTime;
  const upper = new THREE.Mesh(geo, m2); upper.position.y = -118; upper.renderOrder = -4; g.add(upper);
  return g;
}

// --- 遠景の浮島シルエット (空色に溶ける) ---
function farIslands(scene) {
  const rnd = mulberry32(909);
  const mat = new THREE.MeshBasicMaterial({ color: '#CFE4F5', fog: false, transparent: true, opacity: 0.85 });
  const topMat = new THREE.MeshBasicMaterial({ color: '#C6E3D4', fog: false, transparent: true, opacity: 0.85 });
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.4, d = 720 + rnd() * 600;
    const R = 25 + rnd() * 45;
    const cone = new THREE.ConeGeometry(R, R * (1.3 + rnd()), 9, 1); cone.rotateX(Math.PI);
    const m = new THREE.Mesh(cone, mat); const y = -40 + rnd() * 120;
    m.position.set(Math.cos(a) * d, y - R * 0.7, Math.sin(a) * d); g.add(m);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R, 4, 9), topMat); top.position.set(m.position.x, y + 1, m.position.z); g.add(top);
    // 小さな木のシルエット
    for (let k = 0; k < 6; k++) { const t = new THREE.Mesh(new THREE.SphereGeometry(R * 0.12, 6, 4), topMat); const aa = rnd() * 6.28, rr = rnd() * R * 0.8; t.position.set(m.position.x + Math.cos(aa) * rr, y + 3 + R * 0.06, m.position.z + Math.sin(aa) * rr); g.add(t); }
  }
  g.renderOrder = -6;
  scene.add(g);
  return g;
}

export function createClouds(app) {
  const { scene } = app;
  const Q = app.quality === 'low' ? 0.4 : 1;
  const mat = cloudMaterial();
  const variants = [0, 1, 2, 3, 4].map((k) => cloudGeo(300 + k, 1));
  const rnd = mulberry32(17);
  const clouds = [];
  const count = Math.round(46 * Q);
  const ims = variants.map((v) => new THREE.InstancedMesh(v, mat, Math.ceil(count / variants.length) + 2));
  ims.forEach((m) => { m.count = 0; m.frustumCulled = false; m.renderOrder = 6; scene.add(m); });
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const ring = rnd();
    const d = ring < 0.45 ? 95 + rnd() * 120 : 220 + rnd() * 500;
    const y = ring < 0.45 ? (rnd() < 0.5 ? -50 - rnd() * 50 : 30 + rnd() * 45) : -90 + rnd() * 200;
    const s = 0.7 + rnd() * (ring < 0.45 ? 0.8 : 1.8);
    const vi = i % variants.length, im = ims[vi];
    clouds.push({ im, idx: im.count++, a, d, y, s, sp: (0.004 + rnd() * 0.006) * (rnd() < 0.5 ? 1 : 0.7), ry: rnd() * 6.28 });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), p = new V3(), up = new V3(0, 1, 0);
  // 小さな はぐれ雲 (近景に少し)
  const puffs = cloudGeo(999, 0.35);
  const pim = new THREE.InstancedMesh(puffs, mat, 18); pim.frustumCulled = false; pim.renderOrder = 6; scene.add(pim);
  const pl = []; for (let i = 0; i < 18; i++) pl.push({ a: rnd() * 6.28, d: 70 + rnd() * 50, y: 18 + rnd() * 30, s: 0.6 + rnd() * 0.7, sp: 0.01 + rnd() * 0.01, ry: rnd() * 6 });

  const sea = cloudSea(Q); scene.add(sea);
  // はるか下の海 (雲の切れ間から見える)
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#8ED6EA', fog: false }));
  ocean.position.y = -260; ocean.renderOrder = -7; scene.add(ocean);
  farIslands(scene);

  app.onUpdate((dt, t) => {
    mat.uniforms.uTime.value = t;
    for (const c of clouds) {
      const a = c.a + t * c.sp;
      m4.compose(p.set(Math.cos(a) * c.d, c.y + Math.sin(t * 0.1 + c.a) * 1.5, Math.sin(a) * c.d), q.setFromAxisAngle(up, c.ry - a), sc.set(c.s, c.s * 0.9, c.s));
      c.im.setMatrixAt(c.idx, m4);
    }
    for (const im of ims) im.instanceMatrix.needsUpdate = true;
    pl.forEach((c, i) => { const a = c.a + t * c.sp; m4.compose(p.set(Math.cos(a) * c.d, c.y, Math.sin(a) * c.d), q.setFromAxisAngle(up, c.ry), sc.set(c.s, c.s, c.s)); pim.setMatrixAt(i, m4); });
    pim.instanceMatrix.needsUpdate = true;
  });
  return { cloudSea: sea };
}
