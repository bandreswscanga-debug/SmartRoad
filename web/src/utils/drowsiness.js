// Detector de somnolencia en el navegador.
// Combina apertura ocular (EAR), blendshapes de MediaPipe (parpadeo/boca),
// PERCLOS por ventana temporal, cierre continuo, parpadeo, bostezo y postura
// de la cabeza. Incluye calibración personal e histéresis para evitar parpadeos
// normales convertidos en falsas alarmas.
export const EYE_LANDMARKS = {
  right: [33, 160, 158, 133, 153, 144],
  left: [362, 385, 387, 263, 373, 380]
};

export const LEVEL_ORDER = { NORMAL: 0, BAJO: 1, MEDIO: 2, CRITICO: 3 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(a, b) {
  if (!a || !b) return 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function earFor(landmarks, side) {
  const points = EYE_LANDMARKS[side].map((i) => landmarks[i]);
  if (!points.every(Boolean)) return null;
  const [p1, p2, p3, p4, p5, p6] = points;
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

function blendshapeMap(blendshapes) {
  const map = {};
  const categories = blendshapes?.categories || (Array.isArray(blendshapes) ? blendshapes : []);
  for (const c of categories) {
    if (c && c.categoryName) map[c.categoryName] = Number(c.score) || 0;
  }
  return map;
}

// Métricas geométricas + blendshapes de un fotograma.
export function faceMetrics(landmarks, blendshapes) {
  if (!landmarks || !landmarks.length) return null;
  const bs = blendshapeMap(blendshapes);
  const earLeft = earFor(landmarks, 'left');
  const earRight = earFor(landmarks, 'right');
  const ear = earLeft != null && earRight != null ? (earLeft + earRight) / 2 : earLeft ?? earRight;

  const mouthLeft = landmarks[78];
  const mouthRight = landmarks[308];
  const mouthTop = landmarks[13];
  const mouthBottom = landmarks[14];
  const mouthWidth = dist(mouthLeft, mouthRight);
  const mar = mouthWidth > 0 ? dist(mouthTop, mouthBottom) / mouthWidth : null;

  const eyeOuter = landmarks[33];
  const eyeInner = landmarks[263];
  const nose = landmarks[1];
  const chin = landmarks[152];
  const forehead = landmarks[10];
  const faceWidth = dist(landmarks[234], landmarks[454]) || dist(eyeOuter, eyeInner) * 2;
  let yaw = 0;
  let pitch = 0;
  if (eyeOuter && eyeInner && nose && faceWidth > 0) {
    const eyeMidX = (eyeOuter.x + eyeInner.x) / 2;
    const eyeMidY = (eyeOuter.y + eyeInner.y) / 2;
    const dx = (nose.x - eyeMidX) / faceWidth;
    yaw = Math.asin(clamp(dx * 2.2, -1, 1)) * (180 / Math.PI);
    if (chin && forehead) {
      const faceHeight = dist(forehead, chin) || 1;
      const noseRatio = (nose.y - eyeMidY) / faceHeight;
      pitch = (noseRatio - 0.36) * 110;
    }
  }

  const blinkLeft = bs.eyeBlinkLeft;
  const blinkRight = bs.eyeBlinkRight;
  const blink =
    blinkLeft != null || blinkRight != null
      ? ((blinkLeft ?? blinkRight ?? 0) + (blinkRight ?? blinkLeft ?? 0)) / 2
      : null;
  const jawOpen = bs.jawOpen ?? null;

  const eyeCenterLeft = eyeOuter && eyeInner
    ? { x: (landmarks[33].x + landmarks[133].x) / 2, y: (landmarks[33].y + landmarks[133].y) / 2 }
    : null;
  const eyeCenterRight = landmarks[362] && landmarks[263]
    ? { x: (landmarks[362].x + landmarks[263].x) / 2, y: (landmarks[362].y + landmarks[263].y) / 2 }
    : null;

  return {
    ear,
    earLeft,
    earRight,
    blink,
    jawOpen,
    mar,
    yaw,
    pitch,
    faceWidth,
    eyeCenterLeft,
    eyeCenterRight,
    confidence: blink != null ? 0.96 : 0.78
  };
}

export function createDrowsinessDetector({
  windowMs = 3000,
  closeMult = 0.62,
  criticoPerclos = 0.55,
  medioPerclos = 0.32,
  bajoPerclos = 0.1,
  criticoClosureMs = 1500,
  medioClosureMs = 700,
  criticoScore = 78,
  medioScore = 52,
  bajoScore = 28
} = {}) {
  let openEar = 0.3;
  let trained = false;
  let window = [];
  let streak = 0;
  let closedSince = null;
  let prevClosed = false;
  let blinkTimes = [];
  let blinks = 0;
  let yawnSince = null;
  let distractedSince = null;
  let level = 'NORMAL';
  let candidate = null;
  let candidateSince = 0;
  let last = null;

  function train(samples) {
    const ears = (samples || [])
      .map((s) => (typeof s === 'number' ? s : s?.ear))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!ears.length) return { trained: false, openEar };
    openEar = Math.max(0.08, median(ears));
    trained = true;
    return { trained: true, openEar };
  }

  function push(sample, now = Date.now()) {
    const s = typeof sample === 'number' ? { ear: sample, t: now } : sample || {};
    const t = Number.isFinite(s.t) ? s.t : now;
    const ear = Number.isFinite(s.ear) ? s.ear : null;
    const blink = Number.isFinite(s.blink) ? s.blink : null;
    const mar = Number.isFinite(s.mar) ? s.mar : null;
    const jawOpen = Number.isFinite(s.jawOpen) ? s.jawOpen : null;
    const yaw = Number.isFinite(s.yaw) ? s.yaw : 0;
    const pitch = Number.isFinite(s.pitch) ? s.pitch : 0;
    const face = ear != null || blink != null;
    const threshold = openEar * closeMult;

    const earClosed = ear != null && ear < threshold;
    const blinkClosed = blink != null && blink > 0.55;
    const closed = face && (earClosed || blinkClosed);
    streak = closed ? streak + 1 : 0;

    window = window.filter((w) => t - w.t <= windowMs);
    window.push({ t, closed });
    const closedCount = window.filter((w) => w.closed).length;
    const perclos = window.length ? closedCount / window.length : 0;

    if (closed) {
      if (closedSince == null) closedSince = t;
    } else {
      closedSince = null;
    }
    const closureMs = closed && closedSince != null ? t - closedSince : 0;

    if (prevClosed && !closed && face) {
      blinks += 1;
      blinkTimes.push(t);
    }
    blinkTimes = blinkTimes.filter((bt) => t - bt <= 60000);
    const blinkRate = blinkTimes.length;
    prevClosed = closed;

    const yawnSignal = (mar != null && mar > 0.55) || (jawOpen != null && jawOpen > 0.5);
    if (yawnSignal) {
      if (yawnSince == null) yawnSince = t;
    } else {
      yawnSince = null;
    }
    const yawn = yawnSince != null && t - yawnSince >= 900;

    const distractedSignal = Math.abs(yaw) > 28 || Math.abs(pitch) > 24;
    if (distractedSignal) {
      if (distractedSince == null) distractedSince = t;
    } else {
      distractedSince = null;
    }
    const distraction = distractedSince != null && t - distractedSince >= 1500;

    const score = Math.round(
      clamp(perclos / criticoPerclos, 0, 1) * 100 * 0.45 +
        clamp(closureMs / criticoClosureMs, 0, 1) * 100 * 0.25 +
        clamp(blinkRate / 40, 0, 1) * 100 * 0.1 +
        (yawn ? 100 : 0) * 0.1 +
        (distraction ? 100 : 0) * 0.1
    );

    let rawLevel = 'NORMAL';
    if (perclos >= criticoPerclos || closureMs >= criticoClosureMs || score >= criticoScore) {
      rawLevel = 'CRITICO';
    } else if (perclos >= medioPerclos || closureMs >= medioClosureMs || score >= medioScore || yawn) {
      rawLevel = 'MEDIO';
    } else if (perclos >= bajoPerclos || score >= bajoScore || blinkRate > 35) {
      rawLevel = 'BAJO';
    }

    // Histéresis: sube rápido ante riesgo y baja lento cuando se recupera.
    const riseMs = { BAJO: 600, MEDIO: 450, CRITICO: 250 };
    const fallMs = { NORMAL: 3000, BAJO: 2500, MEDIO: 2200, CRITICO: 2600 };
    if (rawLevel === level) {
      candidate = null;
    } else {
      if (candidate !== rawLevel) {
        candidate = rawLevel;
        candidateSince = t;
      }
      const need = LEVEL_ORDER[rawLevel] > LEVEL_ORDER[level] ? riseMs[rawLevel] : fallMs[level];
      if (t - candidateSince >= need) {
        level = rawLevel;
        candidate = null;
      }
    }

    last = {
      ear,
      earLeft: s.earLeft ?? null,
      earRight: s.earRight ?? null,
      blink,
      mar,
      yaw,
      pitch,
      face,
      closed,
      perclos,
      streak,
      closureMs,
      blinks,
      blinkRate,
      yawn,
      distraction,
      score,
      level,
      openEar,
      threshold,
      trained,
      confidence: face ? (blink != null ? 0.96 : 0.78) : 0
    };
    return last;
  }

  function reset() {
    window = [];
    streak = 0;
    closedSince = null;
    prevClosed = false;
    blinkTimes = [];
    blinks = 0;
    yawnSince = null;
    distractedSince = null;
    level = 'NORMAL';
    candidate = null;
    candidateSince = 0;
    last = null;
  }

  return {
    push,
    train,
    reset,
    get openEar() {
      return openEar;
    },
    get level() {
      return level;
    },
    get last() {
      return last;
    }
  };
}
