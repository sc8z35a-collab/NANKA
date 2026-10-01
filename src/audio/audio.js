// サウンド: すべて WebAudio で合成 (外部音源なし) — 旧 D 担当 → A 引き継ぎ
// 環境音: 風(フィルタノイズ) + 遠い波(低域ノイズのうねり) + 鳥のさえずり(FMチャープ) + やさしいパッド和音
// 効果音: タップ「ぽん」/ カード開「きらりん」/ カード閉「ふわっ」
export function initAudio(app) {
  const { bus } = app;
  let ctx = null, master = null, sfxBus = null, ambBus = null, started = false;
  let muted = localStorage.getItem('nanka:muted') === '1';

  // ---- ミュートボタン (右下, カード表示中は隠す) ----
  const btn = document.createElement('button');
  btn.className = 'mute-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'おと');
  const icon = () => { btn.innerHTML = muted ? svgOff : svgOn; btn.classList.toggle('off', muted); };
  const svgOn = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const svgOff = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  icon();
  const style = document.createElement('style');
  style.textContent = `
  .mute-btn{position:fixed;right:calc(16px + var(--sar,0px));bottom:calc(16px + var(--sab,0px));z-index:30;width:48px;height:48px;border-radius:50%;
    border:0;background:rgba(255,255,255,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#5AA9E6;
    box-shadow:0 8px 22px rgba(60,90,120,.18);display:grid;place-items:center;transition:transform .2s, opacity .3s;pointer-events:auto}
  .mute-btn svg{width:24px;height:24px}
  .mute-btn.off{color:#A9B6C2}
  .mute-btn:active{transform:scale(.9)}
  body.card-open .mute-btn{opacity:0;pointer-events:none}`;
  document.head.appendChild(style);
  document.body.appendChild(btn);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    muted = !muted; localStorage.setItem('nanka:muted', muted ? '1' : '0'); icon();
    if (!started) start();
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.15);
    if (!muted) tap(0.8);
  });

  // ---- 初期化: ユーザー操作 (app:start) の中で ----
  function start() {
    if (started) return; started = true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.55; ambBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    // 簡易リバーブ (合成インパルス)
    const rev = ctx.createConvolver(); rev.buffer = impulse(2.6, 2.2);
    const revGain = ctx.createGain(); revGain.gain.value = 0.35; rev.connect(revGain).connect(master);
    sfxBus.connect(rev); ambBus.connect(rev);
    ctx.resume?.();
    master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 1.2); // フェードイン
    startWind(); startWaves(); startPad(); scheduleBirds();
  }
  // AudioContext はユーザー操作中でないと作れない (autoplay policy)。?skip 時は最初のタッチまで待つ
  const gesture = () => navigator.userActivation ? navigator.userActivation.isActive : true;
  bus.on('app:start', () => { if (gesture()) start(); });
  window.addEventListener('pointerup', () => { if (!started && app.started) start(); else ctx?.resume?.(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : ctx.resume(); });

  // ---- 素材ユーティリティ ----
  function noiseBuffer(sec = 2, color = 'pink') {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18; }
    }
    return buf;
  }
  function impulse(sec, decay) {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  function loopNoise(color) { const s = ctx.createBufferSource(); s.buffer = noiseBuffer(4, color); s.loop = true; s.start(); return s; }
  function lfo(freq, depth, target, offset) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = freq; g.gain.value = depth;
    o.connect(g).connect(target); o.start(); if (offset !== undefined) target.value = offset; return o;
  }

  // ---- 環境音 ----
  function startWind() {
    const src = loopNoise('pink');
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = 0.25;
    lfo(0.07, 250, bp.frequency, 500); lfo(0.11, 0.12, g.gain, 0.22);
    const pan = ctx.createStereoPanner(); lfo(0.05, 0.6, pan.pan, 0);
    src.connect(bp).connect(g).connect(pan).connect(ambBus);
  }
  function startWaves() {
    const src = loopNoise('brown');
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = ctx.createGain(); g.gain.value = 0.0;
    lfo(0.09, 0.16, g.gain, 0.18);
    src.connect(lp).connect(g).connect(ambBus);
  }
  function startPad() {
    // ゆったり移り変わる明るい和音 (Cmaj7 → Fmaj7 → Am7 → G6)
    const chords = [[261.6, 329.6, 392.0, 493.9], [349.2, 440.0, 523.3, 659.3], [220.0, 261.6, 329.6, 392.0], [196.0, 246.9, 293.7, 329.6]];
    const padGain = ctx.createGain(); padGain.gain.value = 0.045;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    padGain.connect(lp).connect(ambBus);
    const voices = chords[0].map((f) => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.001;
      const g = ctx.createGain(); g.gain.value = 0.5; o.connect(g); o2.connect(g); g.connect(padGain); o.start(); o2.start();
      return { o, o2 };
    });
    let k = 0;
    setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      k = (k + 1) % chords.length; const t = ctx.currentTime;
      voices.forEach((v, i) => { v.o.frequency.setTargetAtTime(chords[k][i], t, 1.5); v.o2.frequency.setTargetAtTime(chords[k][i] * 2.001, t, 1.5); });
    }, 9000);
  }
  function chirp(t, base, pan) {
    const o = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.type = 'sine'; mod.frequency.value = 40 + Math.random() * 30; mg.gain.value = base * 0.08;
    mod.connect(mg).connect(o.frequency);
    o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), t + 0.09);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    p.pan.value = pan; o.connect(g).connect(p).connect(ambBus); o.start(t); mod.start(t); o.stop(t + 0.15); mod.stop(t + 0.15);
  }
  function scheduleBirds() {
    const next = () => {
      if (ctx && ctx.state === 'running') {
        const t = ctx.currentTime + 0.05, base = 2200 + Math.random() * 1800, pan = Math.random() * 1.6 - 0.8, n = 2 + (Math.random() * 4 | 0);
        for (let i = 0; i < n; i++) chirp(t + i * (0.12 + Math.random() * 0.06), base * (1 + (Math.random() - 0.5) * 0.1), pan);
      }
      setTimeout(next, 2500 + Math.random() * 6000);
    };
    setTimeout(next, 1500);
  }

  // ---- 効果音 ----
  function tone(t, f, dur, type = 'sine', vol = 0.2, glide) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function tap(v = 1) { if (!ctx) return; const t = ctx.currentTime; tone(t, 880, 0.12, 'sine', 0.18 * v, 1320); tone(t, 1760, 0.08, 'sine', 0.05 * v); }
  function openSfx() { if (!ctx) return; const t = ctx.currentTime; [784, 988, 1175, 1568].forEach((f, i) => tone(t + i * 0.07, f, 0.5, 'triangle', 0.12)); }
  function closeSfx() {
    if (!ctx) return; const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.5); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
    bp.frequency.setValueAtTime(2400, t); bp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    s.connect(bp).connect(g).connect(sfxBus); s.start(t); s.stop(t + 0.5);
    tone(t, 660, 0.25, 'sine', 0.08, 440);
  }
  bus.on('ui:press', () => tap());
  bus.on('ui:tap', () => tap(0.6));
  bus.on('landmark:open', openSfx);
  bus.on('landmark:close', closeSfx);

  app.audio = { start, tap, openSfx, closeSfx, get ctx() { return ctx; }, get muted() { return muted; } };
  return app.audio;
}
