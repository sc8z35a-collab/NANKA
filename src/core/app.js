// アプリ中核: レンダラ / シーン / カメラ / ループ (Agent A)
import * as THREE from 'three';
import { createBus } from './bus.js';

export function createApp(canvas) {
  const params = new URLSearchParams(location.search);
  const bus = createBus();
  const maxDpr = Number(params.get('dpr')) || 3;           // 超高性能端末前提: 最大3
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false,
  });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor('#CFEBFF', 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#CFEBFF');
  scene.fog = new THREE.Fog('#E3F3FF', 140, 520);

  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 3000);
  camera.position.set(0, 55, 120);
  camera.lookAt(0, 8, 0);

  const clock = new THREE.Clock();
  const updaters = new Set();
  let renderFn = () => renderer.render(scene, camera);
  const size = { w: 1, h: 1 };

  const app = {
    THREE, renderer, scene, camera, clock, canvas, dpr, bus, size, params,
    quality: params.get('q') || 'ultra',
    onUpdate(fn) { updaters.add(fn); return () => updaters.delete(fn); },
    setRenderFn(fn) { renderFn = fn; },
    progress(label, ratio) { bus.emit('progress', { label, ratio }); },
    started: false,
  };

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w === size.w && h === size.h) return;
    size.w = w; size.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 横長画面で縦FOVが狭くなりすぎないよう補正
    camera.fov = w / h > 2 ? 40 : 45;
    camera.updateProjectionMatrix();
    bus.emit('resize', { w, h, dpr });
  }
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  resize();

  // FPS 計測 (?fps=1 で表示)
  let frames = 0, acc = 0; app.fps = 60;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 1 / 20);
    const t = clock.elapsedTime;
    for (const fn of updaters) { try { fn(dt, t); } catch (e) { console.error('[update]', e); updaters.delete(fn); } }
    renderFn(dt, t);
    frames++; acc += dt; if (acc >= 1) { app.fps = frames / acc; frames = 0; acc = 0; bus.emit('fps', app.fps); }
  });

  // タブ非表示時はクロックを止めて復帰時のジャンプを防ぐ
  document.addEventListener('visibilitychange', () => { if (!document.hidden) clock.getDelta(); });
  return app;
}
