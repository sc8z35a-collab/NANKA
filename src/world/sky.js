// 空ドーム + 太陽 + 環境光 (Agent B)
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { shared } from './textures.js';

export const PALETTE = {
  zenith: '#86C3FA',
  upper: '#A9D6FF',
  horizon: '#E6F5FF',
  below: '#F2F9FF',
  sun: '#FFF6E2',
  fog: '#E2F2FF',
};

export const SUN_DIR = new THREE.Vector3(-0.42, 0.74, 0.52).normalize();

export function createSky(app) {
  const { scene } = app;
  const lin = (hex) => new THREE.Color(hex); // THREE.Color は sRGB hex → linear で保持
  const uniforms = {
    uZenith: { value: lin(PALETTE.zenith) },
    uUpper: { value: lin(PALETTE.upper) },
    uHorizon: { value: lin(PALETTE.horizon) },
    uBelow: { value: lin(PALETTE.below) },
    uSunCol: { value: lin(PALETTE.sun) },
    uSunDir: { value: SUN_DIR.clone() },
    uTime: shared.uTime,
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
        gl_Position.z = gl_Position.w; // 常に最遠
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uZenith, uUpper, uHorizon, uBelow, uSunCol, uSunDir;
      uniform float uTime;
      varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float y = d.y;
        // 空のグラデーション (地平付近を広く明るく)
        vec3 col = mix(uHorizon, uUpper, smoothstep(0.0, 0.28, y));
        col = mix(col, uZenith, smoothstep(0.25, 0.95, y));
        col = mix(col, uBelow, smoothstep(0.0, -0.25, y));
        // 太陽: 円盤 + 柔らかいハロ (ネオンにならないよう控えめ)
        float sd = max(dot(d, uSunDir), 0.0);
        col += uSunCol * (pow(sd, 6.0) * 0.18 + pow(sd, 64.0) * 0.35);
        col = mix(col, uSunCol * 1.25, smoothstep(0.9993, 0.99965, sd));
        // 高層の すじ雲 (薄く)
        if (y > 0.02) {
          vec2 uv = d.xz / (y + 0.18) * 1.6;
          uv += vec2(uTime * 0.004, uTime * 0.0015);
          float c = fbm(uv * vec2(1.0, 3.2) + fbm(uv * 0.7) * 1.4);
          c = smoothstep(0.52, 0.86, c) * smoothstep(0.02, 0.22, y) * (1.0 - smoothstep(0.6, 1.0, y));
          col = mix(col, vec3(1.0) * 1.02, c * 0.42);
        }
        // 地平の かすみ
        col = mix(col, uHorizon * 1.02, (1.0 - smoothstep(0.0, 0.09, abs(y))) * 0.55);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  mat.toneMapped = true;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2600, 64, 32), mat);
  dome.name = 'skyDome'; dome.frustumCulled = false; dome.renderOrder = -10;
  scene.add(dome);

  scene.background = null;
  scene.fog = new THREE.Fog(PALETTE.fog, 260, 1500);
  app.renderer.setClearColor(PALETTE.horizon, 1);

  // ライト: 空(上)と草(下)の半球光 + 暖白の太陽
  const hemi = new THREE.HemisphereLight('#D6ECFF', '#CFE6B0', 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF3DE', 2.9);
  sun.position.copy(SUN_DIR).multiplyScalar(160);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  const SM = app.quality === 'low' ? 1024 : 4096;
  sun.shadow.mapSize.set(SM, SM);
  const S = 78;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 20, far: 380 });
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 3;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);

  // 遠景の島用に、影なしの補助光 (空からのやわらかい回り込み)
  const fill = new THREE.DirectionalLight('#E9F4FF', 0.45);
  fill.position.set(80, 40, -100);
  scene.add(fill);

  return { dome, sun, hemi, fill, uniforms };
}

// 環境マップ (Poly Haven CC0 HDRI: kloofendal_48d_partly_cloudy_puresky)
export async function loadEnvironment(app) {
  const { renderer, scene } = app;
  try {
    const hdr = await new HDRLoader().loadAsync(new URL('./tex/sky_1k.hdr', import.meta.url).href);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(hdr).texture;
    hdr.dispose(); pm.dispose();
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    scene.environmentRotation = new THREE.Euler(0, 1.2, 0);
    return env;
  } catch (e) {
    console.warn('[world] HDRI 読込失敗 → 環境マップなし', e);
    return null;
  }
}
