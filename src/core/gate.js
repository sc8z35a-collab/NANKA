// 全画面 + 横向きロック + 開始ゲート (Agent A)
export async function enterFullscreenLandscape() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
  } catch (e) { console.warn('fullscreen failed', e); }
  try { await screen.orientation?.lock?.('landscape'); } catch (e) { /* PC等では失敗して正常 */ }
}

export function watchOrientation(bus) {
  const mq = matchMedia('(orientation: landscape)');
  const emit = () => bus.emit('orientation', { landscape: mq.matches });
  mq.addEventListener('change', emit); emit();
  return mq;
}

export function showToast(msg, ms = 4000) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}
