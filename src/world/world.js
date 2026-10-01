// 3D ワールド エントリ (Agent B)  — BOARD 契約: initWorld(app) → world
import * as THREE from 'three';
import { createSky, loadEnvironment, SUN_DIR } from './sky.js';
import { createTerrain } from './terrain.js';
import { getHeightAt } from './layout.js';
import { setAnisotropy, texturesReady, shared } from './textures.js';

export async function initWorld(app) {
  const { scene, renderer } = app;
  setAnisotropy(renderer);
  app.progress?.('そらを ひろげています…', 0.12);
  const sky = createSky(app);
  const envP = loadEnvironment(app);

  app.progress?.('しまを うかべています…', 0.2);
  const terrain = createTerrain(app);
  scene.add(terrain.group);

  const landmarks = [];
  const extras = {};
  const parts = [
    ['./flora.js', 'createFlora'],
    ['./landmarks.js', 'createLandmarks'],
    ['./clouds.js', 'createClouds'],
    ['./props.js', 'createProps'],
  ];
  let k = 0;
  for (const [path, fn] of parts) {
    k++;
    app.progress?.('しまを かざっています…', 0.2 + 0.3 * (k / parts.length));
    try {
      const mod = await import(path);
      if (mod[fn]) {
        const r = await mod[fn](app, { terrain, getHeightAt, landmarks, extras });
        if (r) Object.assign(extras, r);
      }
    } catch (e) { console.warn(`[world] ${path} 失敗`, e); }
  }

  app.onUpdate((dt, t) => { shared.uTime.value = t; });
  await Promise.race([Promise.all([envP, texturesReady()]), new Promise((r) => setTimeout(r, 9000))]);

  const world = {
    getHeightAt,
    landmarks,
    sun: sky.sun,
    hemi: sky.hemi,
    sunDir: SUN_DIR.clone(),
    bounds: { radius: 72, center: new THREE.Vector3(0, 6, 0) },
    terrain, sky, extras,
  };
  if (app.params?.get('solo') === 'world' || app.params?.has('worldcam')) soloCamera(app, world);
  return world;
}

// 単体確認用: ゆっくり周回するカメラ (?solo=world, ?cam=x,y,z,tx,ty,tz で固定)
function soloCamera(app, world) {
  const cam = app.params.get('cam');
  if (cam) {
    const v = cam.split(',').map(Number);
    app.camera.position.set(v[0], v[1], v[2]); app.camera.lookAt(v[3] ?? 0, v[4] ?? 6, v[5] ?? 0);
    return;
  }
  app.onUpdate((dt, t) => {
    const a = t * 0.05 + 0.6;
    app.camera.position.set(Math.cos(a) * 135, 62, Math.sin(a) * 135);
    app.camera.lookAt(0, 4, 0);
  });
}
