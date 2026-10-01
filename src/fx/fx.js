// 演出: ポストプロセス + パーティクル (旧 D 担当 → A 引き継ぎ)
// 明るいパステルのみ。Bloom は ≤0.35 で“光のにじみ”程度。ネオン的発光は使わない。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createPetals } from './petals.js';
import { createButterflies } from './butterflies.js';
import { createBirds } from './birds.js';
import { createSparkle } from './sparkle.js';

// ミニチュア感を出すティルトシフト + ほんのり暖色のビネット(白方向)
const TiltShiftShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    focus: { value: 0.5 },      // 画面 y (0..1) のピント中心
    band: { value: 0.22 },      // ピントの合う帯の半幅
    amount: { value: 2.2 },     // ボケ量(px @1x)
    dpr: { value: 1 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float focus, band, amount, dpr;
    varying vec2 vUv;
    void main(){
      float d = smoothstep(band, band + 0.35, abs(vUv.y - focus));
      vec2 px = amount * dpr * d / resolution;
      vec4 c = texture2D(tDiffuse, vUv) * 0.2270270;
      c += texture2D(tDiffuse, vUv + vec2(px.x*1.3846, px.y*1.3846)) * 0.1581081;
      c += texture2D(tDiffuse, vUv - vec2(px.x*1.3846, px.y*1.3846)) * 0.1581081;
      c += texture2D(tDiffuse, vUv + vec2(-px.x*3.2307, px.y*3.2307)) * 0.0351351;
      c += texture2D(tDiffuse, vUv + vec2(px.x*3.2307, -px.y*3.2307)) * 0.0351351;
      c += texture2D(tDiffuse, vUv + vec2(px.x*1.3846, -px.y*1.3846)) * 0.1581081;
      c += texture2D(tDiffuse, vUv - vec2(px.x*1.3846, -px.y*1.3846)) * 0.1581081;
      c += texture2D(tDiffuse, vUv + vec2(px.x*3.2307, px.y*3.2307)) * 0.0351351;
      c += texture2D(tDiffuse, vUv - vec2(px.x*3.2307, px.y*3.2307)) * 0.0351351;
      c.rgb /= (0.2270270 + 4.0*0.1581081 + 4.0*0.0351351);
      // 白っぽいビネット (暗くしない = 暗色禁止ルール)
      vec2 q = vUv - 0.5; float v = smoothstep(0.35, 0.85, length(q * vec2(1.0, 0.8)));
      c.rgb = mix(c.rgb, vec3(1.0, 0.985, 0.95), v * 0.18);
      gl_FragColor = c;
    }`,
};

export function initFX(app, world) {
  const { renderer, scene, camera, bus } = app;
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(app.dpr);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.55, 0.92);
  composer.addPass(bloom);

  const tilt = new ShaderPass(TiltShiftShader);
  tilt.uniforms.dpr.value = app.dpr;
  composer.addPass(tilt);

  composer.addPass(new OutputPass());   // トーンマップ + sRGB 変換
  const smaa = new SMAAPass();
  composer.addPass(smaa);               // OutputPass 後 = sRGB 空間でAA (推奨順)

  const resize = ({ w, h }) => {
    composer.setSize(w, h);
    tilt.uniforms.resolution.value.set(w * app.dpr, h * app.dpr);
  };
  bus.on('resize', resize); resize(app.size);

  // カード表示中(左 62% が 3D)はピント帯を少し広げる
  let bandTarget = 0.22;
  bus.on('landmark:open', () => { bandTarget = 0.3; });
  bus.on('landmark:close', () => { bandTarget = 0.22; });
  const noTilt = app.params.has('notilt');
  app.onUpdate((dt) => {
    tilt.uniforms.band.value += (bandTarget - tilt.uniforms.band.value) * Math.min(1, dt * 3);
    tilt.uniforms.amount.value = noTilt ? 0 : 2.2;
  });

  app.setRenderFn(() => composer.render());

  // --- パーティクル類 ---
  const ctx = { app, world, scene, THREE };
  const parts = [createPetals(ctx), createButterflies(ctx), createBirds(ctx), createSparkle(ctx)];
  app.onUpdate((dt, t) => { for (const p of parts) p.update?.(dt, t); });

  app.fx = { composer, bloom, tilt, smaa, parts };
  return app.fx;
}
