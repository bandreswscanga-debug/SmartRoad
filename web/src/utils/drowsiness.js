export const EYE_LANDMARKS = {
  right: [33, 160, 158, 133, 153, 144],
  left: [362, 385, 387, 263, 373, 380]
};

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function earFor(landmarks, side) {
  const [p1, p2, p3, p4, p5, p6] = EYE_LANDMARKS[side].map((i) => landmarks[i]);
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return null;
  const vertical = dist(p2, p6) + dist(p3, p5);
  const horizontal = 2 * dist(p1, p4);
  if (horizontal === 0) return null;
  return vertical / horizontal;
}

export function median(list) {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export const LEVEL_ORDER = { NORMAL: 0, BAJO: 1, MEDIO: 2, CRITICO: 3 };

export function createDrowsinessDetector({ windowSize = 90, closeMult = 0.62, criticoPerclos = 0.6, medioPerclos = 0.35, bajoPerclos = 0.12, criticoStreak = 90, medioStreak = 28 } = {}) {
  let openEar = 0.3;
  let window = [];
  let streak = 0;

  function train(ears) {
    if (!ears.length) return { trained: false, openEar };
    openEar = Math.max(0.08, median(ears));
    return { trained: true, openEar };
  }

  function push(ear) {
    const closed = ear != null && ear < openEar * closeMult;
    streak = closed ? streak + 1 : 0;
    window = window.length >= windowSize ? [...window.slice(1), closed] : [...window, closed];
    const closedCount = window.filter(Boolean).length;
    const perclos = window.length ? closedCount / window.length : 0;
    let level = 'NORMAL';
    if (perclos >= criticoPerclos || streak >= criticoStreak) level = 'CRITICO';
    else if (perclos >= medioPerclos || streak >= medioStreak) level = 'MEDIO';
    else if (perclos >= bajoPerclos) level = 'BAJO';
    return { ear, closed, perclos, streak, level, openEar, threshold: openEar * closeMult };
  }

  function reset() {
    window = [];
    streak = 0;
  }

  return { push, train, reset, get openEar() { return openEar; } };
}