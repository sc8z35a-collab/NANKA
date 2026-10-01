// テクスチャ & マテリアル補助 (Agent B)
// 写真テクスチャは Poly Haven (CC0) を「明るさ中立(平均0.5)のディテール」に加工済み。
// → 色は material.color / 頂点カラーで決め、テクスチャは ×2 で質感だけ足す（暗くならない）。
import * as THREE from 'three';

const BASE = new URL('./tex/', import.meta.url).href;
const cache = new Map();
let maxAniso = 8;

export function setAnisotropy(renderer) { maxAniso = renderer.capabilities.getMaxAnisotropy?.() || 8; }

export function loadTex(name, { repeat = 1, data = true } = {}) {
  const key = name + '|' + repeat;
  if (cache.has(key)) return cache.get(key);
  const t = new THREE.TextureLoader().load(BASE + name);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = maxAniso;
  t.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(key, t);
  return t;
}

// 全テクスチャ読み込み完了を待つ Promise
export function texturesReady() {
  const list = [...cache.values()];
  return Promise.all(list.map((t) => (t.image && t.image.complete !== false && t.image.width) ? null
    : new Promise((r) => { const iv = setInterval(() => { if (t.image && t.image.width) { clearInterval(iv); r(); } }, 50); setTimeout(() => { clearInterval(iv); r(); }, 8000); })));
}

// "中立ディテール" パッチ: map を ×2 して乗算 (map の平均 0.5 → 色そのまま)
export function neutralDetail(mat, strength = 1) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev && prev(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec3 _dt = texture2D( map, vMapUv ).rgb * 2.0;
  diffuseColor.rgb *= mix(vec3(1.0), _dt, ${strength.toFixed(3)});
#endif`);
  };
  mat.customProgramCacheKey = () => 'nd' + strength;
  return mat;
}

// 標準的な PBR 材質（色 + 中立ディテール + 法線）
export function pbr(color, tex, { repeat = 1, rough = 0.85, metal = 0, normal = 0.7, detail = 1, side, vc = false, env = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: metal, vertexColors: vc, envMapIntensity: env,
    map: tex ? loadTex(`${tex}_d.jpg`, { repeat }) : null,
    normalMap: tex && normal > 0 ? loadTex(`${tex}_n.jpg`, { repeat }) : null,
  });
  if (m.normalMap) m.normalScale.set(normal, normal);
  if (side) m.side = side;
  if (tex) neutralDetail(m, detail);
  return m;
}

// キャンバスでソフトな丸スプライト（しぶき・霧用）
export function softDotTexture(size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 窓ガラスに映る空 (小さなグラデ)
export function glassMaterial(tint = '#DDF2FF') {
  return new THREE.MeshPhysicalMaterial({
    color: tint, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.55,
    clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6,
  });
}

// 共有 wind/time uniform
export const shared = { uTime: { value: 0 }, uWind: { value: new THREE.Vector2(1, 0.35) } };
