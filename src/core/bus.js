// 超軽量イベントバス (Agent A)
export function createBus() {
  const map = new Map();
  return {
    on(evt, fn) { (map.get(evt) || map.set(evt, new Set()).get(evt)).add(fn); return () => map.get(evt)?.delete(fn); },
    once(evt, fn) { const off = this.on(evt, (p) => { off(); fn(p); }); return off; },
    emit(evt, payload) {
      if (window.__NANKA_DEBUG) console.debug('[bus]', evt, payload);
      map.get(evt)?.forEach((fn) => { try { fn(payload); } catch (e) { console.error(`[bus:${evt}]`, e); } });
    },
  };
}
