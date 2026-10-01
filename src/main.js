// エントリポイント (Agent A)
// 各担当モジュールは動的 import。未完成/エラーでも他は動くようにフェイルソフト。
//  ?solo=world|ui|fx|audio  で指定モジュールのみ有効化 (カンマ区切り可)
//  ?skip=1  ローダ/スタート画面を飛ばす(スクショ・自動テスト用)
import { createApp } from './core/app.js';
import { enterFullscreenLandscape, watchOrientation, showToast } from './core/gate.js';

const $ = (id) => document.getElementById(id);
const app = createApp($('stage'));
window.NANKA = app; // デバッグ用
const solo = (app.params.get('solo') || '').split(',').filter(Boolean);
const enabled = (name) => !solo.length || solo.includes(name);

app.bus.on('progress', ({ label, ratio }) => {
  $('loader-fill').style.width = `${Math.round(ratio * 100)}%`;
  if (label) $('loader-label').textContent = label;
});
watchOrientation(app.bus);

async function load(name, path, fnName, ...args) {
  if (!enabled(name)) return null;
  try {
    const mod = await import(path);
    if (typeof mod[fnName] !== 'function') { console.info(`[main] ${path} に ${fnName} 未実装`); return null; }
    return await mod[fnName](app, ...args);
  } catch (e) {
    console.error(`[main] ${name} の読み込み失敗`, e);
    if (app.params.has('debug')) showToast(`${name}: ${e.message}`);
    return null;
  }
}

function fallbackWorld() {
  // B 未統合時の仮ワールド (明るい仮島)
  const { THREE, scene } = app;
  scene.add(new THREE.HemisphereLight('#DDEFFF', '#BFE3A0', 1.2));
  const sun = new THREE.DirectionalLight('#FFF4E0', 2.6); sun.position.set(60, 100, 40); scene.add(sun);
  const g = new THREE.CylinderGeometry(40, 8, 30, 48, 1); g.translate(0, -15, 0);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#F4E3B5', roughness: 1 })); scene.add(m);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(41, 40, 2, 48), new THREE.MeshStandardMaterial({ color: '#9ED37A', roughness: 1 }));
  scene.add(top);
  return { getHeightAt: () => 1, landmarks: [], sun, bounds: { radius: 60 } };
}

(async () => {
  app.progress('せかいを つくっています…', 0.1);
  const world = (await load('world', './world/world.js', 'initWorld')) || fallbackWorld();
  app.world = world;
  app.progress('しかけを ならべています…', 0.55);
  await load('ui', './ui/ui.js', 'initUI', world);
  app.progress('ひかりと おとを ととのえています…', 0.75);
  await load('fx', './fx/fx.js', 'initFX', world);
  await load('audio', './audio/audio.js', 'initAudio');
  app.progress('できました！', 1);

  // シェーダのコンパイルを先に済ませてカクつきを防ぐ
  try { await app.renderer.compileAsync?.(app.scene, app.camera); } catch {}
  await new Promise((r) => setTimeout(r, 350));
  $('loader').classList.add('hidden');
  app.bus.emit('app:ready');

  const start = async () => {
    if (app.started) return; app.started = true;
    $('start').classList.add('hidden');
    await enterFullscreenLandscape();
    app.bus.emit('app:start');
  };
  if (app.params.has('skip')) { $('start').classList.add('hidden'); app.started = true; app.bus.emit('app:start'); return; }
  $('start').classList.remove('hidden');
  $('start-btn').addEventListener('click', start, { once: true });
  // 全画面が解除されたら、次のタップで再度全画面へ
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && app.started) {
      const re = () => enterFullscreenLandscape(); window.addEventListener('pointerup', re, { once: true });
    }
  });
})();
