// 島のレイアウトと高さ関数 (Agent B)
// 単位 ≒ メートル。主島は原点中心・半径 ~60。
import { createNoise, clamp, lerp, smoothstep, distToPolyline } from './noise.js';

export const N = createNoise(20261001);
export const WATER_Y = 2.6;          // 池・川の水面

// ランドマーク位置 (xz)。y は高さ関数から
export const SPOTS = {
  windmill: [-24, -12],
  lighthouse: [47, -27],
  flowers: [25, 17],
  pond: [3, -3],
  waterfallExit: null, // 下で計算
  village: [-2, -34],
  overlook: [6, 40],
};

// 川: 池 → 北西の崖へ
export const RIVER = [[3, -3], [-6, 7], [-14, 15], [-23, 24], [-33, 34], [-44, 45], [-52, 53]];
// 小道ネットワーク
export const PATHS = [
  [[-60, -16], [-48, -15], [-36, -13], [-27, -12]],                                     // 西の吊り橋 → 風車
  [[-22, -13], [-12, -18], [2, -19], [16, -21], [28, -24], [38, -26], [44, -27]],      // 風車 → 灯台
  [[8, -19], [12, -8], [15, 2], [19, 10], [23, 14]],                                    // → 花畑
  [[-24, -9], [-25, 2], [-21, 10], [-15, 17], [-8, 25], [0, 33], [6, 39]],              // → 川を渡って北の見晴らし
  [[-2, -20], [-2, -28], [-2, -33]],                                                    // → 村
];
export const BRIDGE_AT = [-15, 17]; // 道と川の交点

// 主島の縁半径 (角度ごと)
export function rimRadius(theta) {
  let r = 58 + 5.5 * N.fbm2(Math.cos(theta) * 1.3 + 7, Math.sin(theta) * 1.3 + 3, 4) + 2.2 * N.n2(Math.cos(theta) * 5, Math.sin(theta) * 5);
  // 灯台の岬
  const tl = Math.atan2(SPOTS.lighthouse[1], SPOTS.lighthouse[0]);
  r += 10 * Math.exp(-(angDiff(theta, tl) ** 2) / (2 * 0.16 ** 2));
  // 西の吊り橋たもと
  const tb = Math.atan2(-16, -60);
  r += 4 * Math.exp(-(angDiff(theta, tb) ** 2) / (2 * 0.1 ** 2));
  return r;
}
export const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

const gauss = (x, z, cx, cz, s) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));

// 川・道の距離キャッシュ不要の直接計算 (getHeightAt は C/D が毎フレーム呼ぶので軽く保つ)
export function riverInfo(x, z) {
  const pond = Math.hypot(x - SPOTS.pond[0], z - SPOTS.pond[1]) - 7.5;
  const rv = distToPolyline(x, z, RIVER);
  const w = lerp(2.6, 3.6, rv.t); // 下流ほど広い
  return { d: Math.min(pond, rv.d - w), pond, t: rv.t };
}
export function pathDist(x, z) {
  let d = Infinity;
  for (const p of PATHS) { const r = distToPolyline(x, z, p).d; if (r < d) d = r; }
  return d;
}

// 生の地形 (川や道の影響前)
function baseHeight(x, z) {
  let h = 4.6;
  h += 3.2 * N.fbm2(x * 0.018 + 3.1, z * 0.018 - 1.7, 4);
  h += 0.7 * N.fbm2(x * 0.09, z * 0.09, 3);
  h += 10.5 * gauss(x, z, SPOTS.windmill[0], SPOTS.windmill[1], 13);    // 風車の丘
  h += 4.0 * gauss(x, z, -36, 14, 12);                                   // 北西の丘
  h += 3.0 * gauss(x, z, 10, 34, 14);                                    // 北の見晴らし
  // 灯台の台地
  const dl = Math.hypot(x - SPOTS.lighthouse[0], z - SPOTS.lighthouse[1]);
  h = lerp(h, 9.5, smoothstep(13, 6, dl));
  // 花畑は ゆるやかに平ら
  const df = Math.hypot((x - SPOTS.flowers[0]) * 0.8, z - SPOTS.flowers[1]);
  h = lerp(h, 4.4 + 0.5 * N.n2(x * 0.05, z * 0.05), smoothstep(18, 9, df));
  // 村は平ら
  const dv = Math.hypot(x - SPOTS.village[0], z - SPOTS.village[1]);
  h = lerp(h, 4.2, smoothstep(14, 7, dv));
  return h;
}

// 主島の上面高さ (縁より外は -Infinity)
export function mainHeight(x, z, { withWater = true } = {}) {
  const r = Math.hypot(x, z);
  const R = rimRadius(Math.atan2(z, x));
  const s = r / R;
  if (s > 1.0) return -Infinity;
  let h = baseHeight(x, z);
  // 道は少し平らに & 掘る
  const pd = pathDist(x, z);
  if (pd < 3.5) h -= 0.18 * (1 - smoothstep(0.8, 3.5, pd));
  // 川と池
  const ri = riverInfo(x, z);
  const bank = smoothstep(4.5, -0.2, ri.d);     // 0 外, 1 川の中
  const bed = WATER_Y - 0.6 - 1.0 * smoothstep(0, -3, ri.d);
  h = lerp(Math.max(h, WATER_Y + 0.55 + 0.6 * smoothstep(-0.5, 5, ri.d)), bed, bank);
  // 縁の丸み (草が崖に回り込む)
  const e = smoothstep(0.86, 1.0, s);
  h -= e * e * 3.2;
  return h;
}

// 小島の定義
export const ISLETS = [
  { id: 'west', c: [-96, 9, -20], R: 21, seed: 11, depth: 34, hills: 2.4 },     // 吊り橋の先 (家と木)
  { id: 'east', c: [92, -4, 42], R: 17, seed: 23, depth: 28, hills: 1.6 },      // 気球の島
  { id: 'south', c: [24, -22, -104], R: 13, seed: 37, depth: 24, hills: 2.0 },  // 岩と木
  { id: 'north', c: [-58, -34, 100], R: 10, seed: 41, depth: 18, hills: 1.4 },  // 小さな森
  { id: 'tiny', c: [70, 18, -86], R: 6, seed: 53, depth: 11, hills: 0.8 },      // 浮き岩
];
export function isletRim(isl, theta) {
  const n = isl.noise || (isl.noise = createNoise(isl.seed));
  return isl.R * (1 + 0.16 * n.fbm2(Math.cos(theta) * 1.5, Math.sin(theta) * 1.5, 3));
}
export function isletHeight(isl, x, z) {
  const n = isl.noise || (isl.noise = createNoise(isl.seed));
  const lx = x - isl.c[0], lz = z - isl.c[2];
  const r = Math.hypot(lx, lz), R = isletRim(isl, Math.atan2(lz, lx));
  const s = r / R;
  if (s > 1) return -Infinity;
  let h = isl.c[1] + 1.2 + isl.hills * (0.6 + n.fbm2(lx * 0.06, lz * 0.06, 3)) * (1 - s * s);
  const e = smoothstep(0.82, 1.0, s);
  h -= e * e * 2.4;
  return h;
}

// 公開: 全島を通した地表高さ
export function getHeightAt(x, z) {
  const m = mainHeight(x, z);
  if (m > -Infinity) return m;
  for (const isl of ISLETS) {
    const dx = x - isl.c[0], dz = z - isl.c[2];
    if (dx * dx + dz * dz < (isl.R * 1.25) ** 2) { const h = isletHeight(isl, x, z); if (h > -Infinity) return h; }
  }
  return -60; // 雲海の高さ
}
