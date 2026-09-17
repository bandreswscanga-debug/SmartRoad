let ctx = null;
let nodes = null;
let timer = null;
let primed = false;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function primeAudio() {
  audio();
  if (primed) return;
  primed = true;
  const unlock = () => audio();
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
}

export function playChime(dur = 0.18) {
  const ac = audio();
  if (!ac) return;
  try {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'triangle';
    o.frequency.value = 1318;
    g.gain.setValueAtTime(0.001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.28, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(ac.currentTime);
    o.stop(ac.currentTime + dur + 0.05);
  } catch (_e) {
    /* audio no disponible */
  }
}

export function playAlarm() {
  const ac = audio();
  if (!ac) return;
  stopAlarm();
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 620;
    gain.gain.value = 0.22;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    let step = 0;
    timer = setInterval(() => {
      step = (step + 1) % 4;
      const f = step < 2 ? 860 : 620;
      const g = step < 2 ? 0.3 : 0.16;
      osc.frequency.setValueAtTime(f, ac.currentTime);
      gain.gain.setValueAtTime(g, ac.currentTime);
    }, 240);
    nodes = { osc, gain };
  } catch (_e) {
    /* audio no disponible */
  }
}

export function stopAlarm() {
  if (timer) clearInterval(timer);
  timer = null;
  if (nodes && ctx) {
    try {
      nodes.gain.gain.setValueAtTime(0.001, ctx.currentTime);
      nodes.osc.stop(ctx.currentTime + 0.02);
    } catch (_e) {
      /* ya detenido */
    }
    nodes = null;
  }
}