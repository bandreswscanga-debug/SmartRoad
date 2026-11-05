import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import {
  Activity,
  BrainCircuit,
  Camera,
  CheckCircle2,
  Eye,
  Gauge,
  Loader2,
  Move3d,
  Radio,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  Timer,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Wind
} from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { createDrowsinessDetector, faceMetrics } from '../utils/drowsiness';
import { playAlarm, stopAlarm, playChime } from '../utils/alarm';
import { downloadHtmlReport } from '../utils/report';

const MODEL_URL = '/mediapipe/wasm';
const TASK_URL = '/mediapipe/face_landmarker.task';

let landmarkerPromise = null;
function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(MODEL_URL);
      const options = {
        baseOptions: { modelAssetPath: TASK_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true
      };
      try {
        return await FaceLandmarker.createFromOptions(fileset, options);
      } catch (_gpu) {
        return FaceLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'CPU' }
        });
      }
    })();
  }
  return landmarkerPromise;
}

const LEVEL_STYLE = {
  NORMAL: { pill: 'border-success/50 bg-success/15 text-success', label: 'Sin somnolencia', color: '#2bd67b' },
  BAJO: { pill: 'border-warning/50 bg-warning/15 text-warning', label: 'Signo leve', color: '#f5b92e' },
  MEDIO: { pill: 'border-warning/70 bg-warning/25 text-warning', label: 'Signo moderado', color: '#f59e0b' },
  CRITICO: { pill: 'border-danger/60 bg-danger/25 text-danger-bright', label: '¡SOMNOLENCIA CRÍTICA!', color: '#ef2d3c' }
};

const LEVEL_DESC = {
  NORMAL: 'Ojos abiertos, atención estable y postura al frente.',
  BAJO: 'Parpadeo frecuente o signos leves: mantenga la alerta.',
  MEDIO: 'Cierre de ojos o fatiga en aumento: pausa recomendada.',
  CRITICO: 'Cierre prolongado o micro sueño: alarma sonora activa.'
};

const EMPTY_METRICS = {
  ear: null,
  perclos: 0,
  streak: 0,
  closureMs: 0,
  blinkRate: 0,
  blinks: 0,
  yawn: false,
  distraction: false,
  score: 0,
  threshold: null,
  openEar: null,
  calFrame: 0,
  face: false,
  fps: 0,
  yaw: 0,
  pitch: 0,
  confidence: 0,
  level: 'NORMAL'
};

export default function CameraDrowsiness() {
  const { pushToast } = useApp();
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [level, setLevel] = useState('NORMAL');
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [history, setHistory] = useState([]);
  const [alarmOn, setAlarmOn] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiResult, setAiResult] = useState({ loading: false, text: null, error: null, model: null });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const phaseRef = useRef('idle');
  const detectorRef = useRef(null);
  const calibEarsRef = useRef([]);
  const notifyLockRef = useRef({ CRITICO: 0, MEDIO: 0 });
  const alarmStateRef = useRef({ on: false });
  const levelRef = useRef('NORMAL');
  const mountedRef = useRef(true);
  const lastDetectRef = useRef(0);
  const lastUiRef = useRef(0);
  const historyRef = useRef([]);
  const fpsRef = useRef({ frames: 0, since: 0, value: 0 });
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    mountedRef.current = true;
    api
      .iaStatus()
      .then((s) => mountedRef.current && setAiStatus(s))
      .catch(() => mountedRef.current && setAiStatus({ configurada: false }));
    return () => {
      mountedRef.current = false;
      stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // El video se monta con la fase; el stream se adhiere cuando ya existe.
  useEffect(() => {
    if (phase !== 'calibrating' && phase !== 'running') return;
    const video = videoRef.current;
    if (video && streamRef.current && video.srcObject !== streamRef.current) {
      video.muted = true;
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }
  }, [phase]);

  function stopEverything() {
    cancelAnimationFrame(rafRef.current);
    stopAlarm();
    alarmStateRef.current = { on: false };
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function notify(nivel, m) {
    const now = Date.now();
    const cooldown = nivel === 'CRITICO' ? 12000 : 25000;
    if (now - (notifyLockRef.current[nivel] || 0) < cooldown) return;
    notifyLockRef.current[nivel] = now;
    try {
      const detalle =
        `PERCLOS ${Math.round((m?.perclos || 0) * 100)}%, ` +
        `cierre ${Math.round(m?.closureMs || 0)} ms, ` +
        `parpadeos ${m?.blinkRate || 0}/min, ` +
        `bostezo ${m?.yawn ? 'sí' : 'no'}.`;
      const descripcion =
        nivel === 'CRITICO'
          ? `Modo de prueba (cámara web del panel): signos críticos de somnolencia. ${detalle}`
          : `Modo de prueba (cámara web del panel): signos moderados de somnolencia. ${detalle}`;
      const res = await api.testDrowsiness(nivel, descripcion);
      if (nivel === 'CRITICO') {
        pushToast(
          res.alert ? `Alerta crítica realtime: ${res.alert.vehiculo_codigo}` : 'Alerta crítica registrada',
          'critical'
        );
      } else {
        pushToast('Evento de prueba registrado en historial', 'warning');
      }
    } catch (_e) {
      /* backend offline: la alarma local sigue funcionando */
    }
  }

  const handleLevelRef = useRef(null);
  handleLevelRef.current = (next, m) => {
    const prev = levelRef.current;
    if (prev === next) return;
    levelRef.current = next;
    setLevel(next);
    if (next === 'CRITICO') {
      playAlarm();
      alarmStateRef.current = { on: true };
      setAlarmOn(true);
      notify('CRITICO', m);
      return;
    }
    if (next === 'MEDIO' && !alarmStateRef.current.on) {
      playChime(0.22);
      notify('MEDIO', m);
      return;
    }
    if (alarmStateRef.current.on && (prev === 'CRITICO' || prev === 'MEDIO')) {
      stopAlarm();
      alarmStateRef.current = { on: false };
      setAlarmOn(false);
      if (next === 'NORMAL' || next === 'BAJO') {
        pushToast('Conductor recuperado: alarma silenciada', 'success');
      }
    }
    if (next === 'MEDIO' && prev !== 'CRITICO') notify('MEDIO', m);
  };

  async function startTest() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite usar la cámara. Necesita un contexto seguro (localhost o HTTPS) y permisos de cámara.');
      setPhase('error');
      return;
    }
    setPhase('starting');
    phaseRef.current = 'starting';
    setError(null);
    setLevel('NORMAL');
    levelRef.current = 'NORMAL';
    setHistory([]);
    historyRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 540 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setPhase('calibrating');
      phaseRef.current = 'calibrating';
      await new Promise((resolve) => setTimeout(resolve, 0));
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('El reproductor de video no está listo. Pulse Iniciar cámara de nuevo.');
      }
      const playing = await new Promise((resolve) => {
        if (!video.paused && video.currentTime > 0 && video.readyState >= 3) return resolve(true);
        const to = setTimeout(() => resolve(false), 8000);
        video.onplaying = () => {
          clearTimeout(to);
          resolve(true);
        };
      });
      video.onplaying = null;
      if (!playing || video.paused) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('La cámara entrega imagen congelada o no reproduce. Cierre otras apps que la usen y pulse Iniciar de nuevo.');
      }
      await getLandmarker();
      if (!mountedRef.current) return;

      detectorRef.current = createDrowsinessDetector({ windowMs: 3000 });
      calibEarsRef.current = [];
      alarmStateRef.current = { on: false };
      setAlarmOn(false);
      fpsRef.current = { frames: 0, since: performance.now(), value: 0 };
      lastVideoTimeRef.current = -1;
      pushToast('Calibrando la IA: mire al frente con los ojos abiertos durante 2 segundos', 'info');
      runLoop();
    } catch (err) {
      if (!mountedRef.current) return;
      stopEverything();
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilítelo en el navegador y reintente.'
          : err?.name === 'NotFoundError'
            ? 'No se detectó una cámara conectada.'
            : `No se pudo iniciar la IA de visión: ${err?.message || err}`;
      setError(msg);
      setPhase('error');
      phaseRef.current = 'error';
    }
  }

  function recalibrate() {
    if (!streamRef.current) return;
    detectorRef.current = createDrowsinessDetector({ windowMs: 3000 });
    calibEarsRef.current = [];
    levelRef.current = 'NORMAL';
    setLevel('NORMAL');
    setHistory([]);
    historyRef.current = [];
    setPhase('calibrating');
    phaseRef.current = 'calibrating';
    pushToast('Recalibrando: mire al frente con los ojos abiertos', 'info');
  }

  function stopTest() {
    stopEverything();
    detectorRef.current = null;
    setPhase('idle');
    phaseRef.current = 'idle';
    setLevel('NORMAL');
    levelRef.current = 'NORMAL';
    setAlarmOn(false);
    setMetrics({ ...EMPTY_METRICS });
    setHistory([]);
    historyRef.current = [];
  }

  function runLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(runLoop);
      return;
    }
    const g = canvas.getContext('2d');

    const tick = async () => {
      const ph = phaseRef.current;
      if (!mountedRef.current || (ph !== 'calibrating' && ph !== 'running')) return;
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      if (now - lastDetectRef.current < 50 || video.currentTime === lastVideoTimeRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastDetectRef.current = now;
      lastVideoTimeRef.current = video.currentTime;

      // FPS suavizado.
      const fps = fpsRef.current;
      fps.frames += 1;
      if (now - fps.since >= 1000) {
        fps.value = Math.round((fps.frames * 1000) / (now - fps.since));
        fps.frames = 0;
        fps.since = now;
      }

      try {
        const landmarker = await getLandmarker();
        const result = landmarker.detectForVideo(video, now);
        const lm = result.faceLandmarks && result.faceLandmarks[0];
        const fm = lm ? faceMetrics(lm, result.faceBlendshapes && result.faceBlendshapes[0]) : null;
        paint(g, video, result, fm, levelRef.current);

        const detector = detectorRef.current;
        if (!detector) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (!fm || fm.ear == null) {
          detector.push(null, Date.now());
          setMetrics((m) => ({ ...m, face: false, fps: fps.value, confidence: 0 }));
        } else if (ph === 'calibrating') {
          calibEarsRef.current.push(fm.ear);
          setMetrics((m) => ({
            ...m,
            ear: fm.ear,
            calFrame: calibEarsRef.current.length,
            face: true,
            fps: fps.value,
            confidence: Math.round(fm.confidence * 100)
          }));
          if (calibEarsRef.current.length >= 60) {
            detector.train(calibEarsRef.current);
            setPhase('running');
            setMetrics((m) => ({ ...m, openEar: detector.openEar, threshold: detector.openEar * 0.62, calFrame: 60 }));
            pushToast('IA calibrada: umbral personal de ojos cerrados listo', 'success');
          }
        } else {
          const res = detector.push({ ...fm, t: Date.now() });
          if (now - lastUiRef.current >= 100) {
            lastUiRef.current = now;
            setMetrics({ ...res, fps: fps.value, calFrame: 60 });
            historyRef.current = [...historyRef.current.slice(-89), {
              ear: res.ear,
              perclos: res.perclos,
              score: res.score,
              t: Date.now()
            }];
            setHistory(historyRef.current);
          }
          if (typeof handleLevelRef.current === 'function') handleLevelRef.current(res.level, res);
        }
      } catch (_e) {
        /* fotograma fallido: se continúa con el siguiente */
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function paint(g, video, result, fm, currentLevel) {
    const w = video.videoWidth || 960;
    const h = video.videoHeight || 540;
    if (g.canvas.width !== w || g.canvas.height !== h) {
      g.canvas.width = w;
      g.canvas.height = h;
    }
    g.clearRect(0, 0, w, h);
    if (!result.faceLandmarks || !result.faceLandmarks[0]) return;
    const lm = result.faceLandmarks[0];
    const color = (LEVEL_STYLE[currentLevel] || LEVEL_STYLE.NORMAL).color;

    // Malla facial completa (478 puntos) con brillo tenue.
    drawConnections(g, lm, FaceLandmarker.FACE_LANDMARKS_TESSELATION, 'rgba(34,211,238,0.11)', w / 900, w, h);

    // Contorno del rostro con halo del color del riesgo.
    g.save();
    g.shadowColor = color;
    g.shadowBlur = 14;
    drawConnections(g, lm, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, color, Math.max(2, w / 420), w, h);
    g.restore();

    // Ojos y cejas. El estado cerrado/bostezo lo aporta el detector (último
    // fotograma), ya que faceMetrics solo calcula geometría y blendshapes.
    const lastState = detectorRef.current && detectorRef.current.last;
    const eyeColor = (fm && (fm.closed || (lastState && lastState.closed))) ? '#ef2d3c' : '#2bd67b';
    drawConnections(g, lm, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, eyeColor, Math.max(2, w / 420), w, h);
    drawConnections(g, lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, eyeColor, Math.max(2, w / 420), w, h);
    drawConnections(g, lm, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, 'rgba(34,211,238,0.55)', Math.max(1, w / 700), w, h);
    drawConnections(g, lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, 'rgba(34,211,238,0.55)', Math.max(1, w / 700), w, h);

    // Boca: ámbar si hay bostezo.
    const mouthColor = (fm && (fm.yawn || (lastState && lastState.yawn))) ? '#f5b92e' : 'rgba(244,114,182,0.85)';
    drawConnections(g, lm, FaceLandmarker.FACE_LANDMARKS_LIPS, mouthColor, Math.max(1.5, w / 560), w, h);

    // Iris (si el modelo los entrega).
    drawIris(g, lm, 468, w, h);
    drawIris(g, lm, 473, w, h);

    // Caja de seguimiento con esquinas.
    const pts = [];
    for (const c of FaceLandmarker.FACE_LANDMARKS_FACE_OVAL) {
      if (lm[c.start]) pts.push(lm[c.start]);
      if (lm[c.end]) pts.push(lm[c.end]);
    }
    if (pts.length) {
      let minX = 1;
      let minY = 1;
      let maxX = 0;
      let maxY = 0;
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const pad = 12;
      const x = Math.max(0, minX * w - pad);
      const y = Math.max(0, minY * h - pad);
      const rw = Math.min(w - x, (maxX - minX) * w + pad * 2);
      const rh = Math.min(h - y, (maxY - minY) * h + pad * 2);
      const len = Math.min(rw, rh) * 0.18;
      g.save();
      g.strokeStyle = color;
      g.lineWidth = Math.max(2, w / 420);
      g.shadowColor = color;
      g.shadowBlur = 10;
      g.beginPath();
      // esquina superior izquierda
      g.moveTo(x, y + len);
      g.lineTo(x, y);
      g.lineTo(x + len, y);
      // superior derecha
      g.moveTo(x + rw - len, y);
      g.lineTo(x + rw, y);
      g.lineTo(x + rw, y + len);
      // inferior derecha
      g.moveTo(x + rw, y + rh - len);
      g.lineTo(x + rw, y + rh);
      g.lineTo(x + rw - len, y + rh);
      // inferior izquierda
      g.moveTo(x + len, y + rh);
      g.lineTo(x, y + rh);
      g.lineTo(x, y + rh - len);
      g.stroke();
      g.restore();

      g.save();
      g.font = `700 ${Math.max(11, Math.round(w / 64))}px "JetBrains Mono", monospace`;
      const label = `IA · ${currentLevel}${fm ? ` · ${Math.round(fm.confidence * 100)}%` : ''}`;
      const textW = g.measureText(label).width;
      g.fillStyle = 'rgba(0,0,0,0.62)';
      g.fillRect(x, Math.max(0, y - 26), textW + 18, 22);
      g.fillStyle = color;
      g.fillText(label, x + 9, Math.max(15, y - 11));
      g.restore();
    }
  }

  async function analyzeFrame() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      pushToast('Inicie la cámara antes de analizar un fotograma', 'warning');
      return;
    }
    const maxW = 720;
    const scale = Math.min(1, maxW / (video.videoWidth || maxW));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((video.videoWidth || maxW) * scale);
    canvas.height = Math.round((video.videoHeight || maxW) * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.72);
    setAiResult({ loading: true, text: null, error: null, model: null });
    try {
      const res = await api.analyzeImage(
        image,
        'Analiza el rostro del conductor: ojos, signos de fatiga, postura y nivel de somnolencia. Indica una acción inmediata.'
      );
      setAiResult({ loading: false, text: res.analisis, error: null, model: res.model });
    } catch (err) {
      setAiResult({ loading: false, text: null, error: err.message, model: null });
    }
  }

  function downloadAiReport() {
    if (!aiResult.text) return;
    const lines = aiResult.text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    downloadHtmlReport({
      filename: 'smartroad-informe-ia',
      title: 'Informe de análisis IA · Cámara de somnolencia',
      subtitle: 'Evaluación del fotograma y métricas del detector en vivo',
      meta: [
        { label: 'Fecha', value: new Date().toLocaleString('es-CO') },
        { label: 'Nivel detectado', value: level },
        { label: 'Modelo', value: aiResult.model || '—' }
      ],
      kpis: [
        { label: 'PERCLOS', value: `${Math.round(metrics.perclos * 100)} %`, tone: metrics.perclos > 0.5 ? 'danger' : 'success' },
        { label: 'Cierre continuo', value: `${Math.round(metrics.closureMs)} ms`, tone: metrics.closureMs > 700 ? 'danger' : 'info' },
        { label: 'Parpadeos', value: `${metrics.blinkRate}/min`, tone: 'warning' },
        { label: 'Confianza', value: `${Math.round(metrics.confidence || 0)} %`, tone: 'success' }
      ],
      sections: [
        {
          title: 'Análisis del modelo de visión',
          description: 'Respuesta generada por el modelo a partir del fotograma capturado.',
          columns: [{ label: 'Hallazgo', key: 'texto' }],
          rows: lines.map((texto) => ({ texto }))
        }
      ],
      notes: [
        'Este informe es una ayuda operativa y no reemplaza la evaluación humana.',
        'Ante un nivel CRÍTICO, detenga el vehículo en un lugar seguro y active el protocolo de emergencia.'
      ]
    });
  }

  const aiConfigured = Boolean(aiStatus?.configurada);
  const color = (LEVEL_STYLE[level] || LEVEL_STYLE.NORMAL).color;

  return (
    <div className="card space-y-4 p-5 animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${phase === 'idle' || phase === 'error' ? 'border-border bg-surface-2 text-info' : 'border-danger/50 bg-danger/15 text-danger-bright'}`}>
            <ScanSearch size={19} />
          </span>
          <div>
            <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
              Detección de somnolencia (IA)
              <span className="rounded-full border border-info/40 bg-info/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-info">
                FaceMesh 478 puntos
              </span>
              <span className="rounded-full border border-purple/40 bg-purple/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple">
                EAR + PERCLOS + blendshapes
              </span>
            </p>
            <p className="text-[11px] text-muted">
              Cámara del panel · calibración personal · análisis de ojos, boca y postura en tiempo real
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {phase === 'idle' || phase === 'error' || phase === 'starting' ? (
            <>
              {phase === 'starting' && <Loader2 size={16} className="animate-spin text-info" />}
              <button className="btn-primary" onClick={startTest} disabled={phase === 'starting'}>
                <Video size={16} /> Iniciar cámara
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={recalibrate}>
                <RefreshCw size={15} /> Recalibrar
              </button>
              <button className="btn-secondary" onClick={stopTest}>
                <VideoOff size={16} /> Detener
              </button>
            </>
          )}
        </div>
      </div>

      {phase === 'starting' && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-xs text-muted">
          <Loader2 size={15} className="animate-spin text-info" /> Solicitando cámara y cargando la IA de visión…
        </div>
      )}

      {phase === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-3 text-xs font-medium text-danger-bright">
          <ShieldAlert size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {(phase === 'starting' || phase === 'calibrating' || phase === 'running') && (
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-black shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
              <video
                ref={videoRef}
                className="aspect-video w-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_45%,rgba(0,0,0,0.45)_100%)]" />

              <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${LEVEL_STYLE[level].pill}`}>
                  {LEVEL_STYLE[level].label}
                </span>
                <span className="flex items-center gap-1 rounded-lg border border-border bg-black/55 px-2 py-1 font-mono text-[10px] font-bold text-green-400 backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" /> REC
                </span>
                <span className="rounded-lg border border-border bg-black/55 px-2 py-1 font-mono text-[10px] text-muted backdrop-blur">
                  {metrics.fps} FPS
                </span>
                {alarmOn && (
                  <span className="flex items-center gap-1.5 rounded-lg border border-danger/60 bg-danger px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white animate-pulse-ring">
                    <Volume2 size={12} /> Alarma
                  </span>
                )}
              </div>

              <div className="absolute right-3 top-3 flex items-center gap-2">
                <span className="rounded-lg border border-border bg-black/55 px-2 py-1 font-mono text-[10px] text-muted backdrop-blur">
                  SRD-CAM · IA
                </span>
              </div>

              {phase === 'calibrating' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="none"
                        stroke="#f5b92e"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={2 * Math.PI * 34 * (1 - Math.min(60, metrics.calFrame) / 60)}
                        style={{ transition: 'stroke-dashoffset 120ms linear' }}
                      />
                    </svg>
                    <span className="font-mono text-sm font-bold text-warning">{Math.min(60, metrics.calFrame)}/60</span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-warning">Calibrando · mire al frente con los ojos abiertos</p>
                  <p className="text-[10px] text-muted">
                    {metrics.ear != null ? `EAR ${metrics.ear.toFixed(3)}` : 'buscando rostro…'} · mantenga el rostro dentro del recuadro
                  </p>
                </div>
              )}

              {phase === 'running' && !metrics.face && (level === 'NORMAL' || level === 'BAJO') && (
                <div className="absolute inset-x-3 bottom-3 rounded-lg border border-warning/40 bg-black/70 px-3 py-2 text-[11px] text-warning">
                  <Radio size={12} className="mr-1 inline animate-pulse" /> Sin rostro a la vista: posiciónese frente a la cámara.
                </div>
              )}

              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
                <div className="rounded-lg border border-border bg-black/60 px-3 py-2 backdrop-blur">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-faint">Lectura en vivo</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold">
                    <span className="text-muted">EAR</span>
                    <span style={{ color }}>{metrics.ear != null ? metrics.ear.toFixed(3) : '—'}</span>
                    <span className="text-muted">PERCLOS</span>
                    <span style={{ color }}>{Math.round(metrics.perclos * 100)}%</span>
                    <span className="text-muted">Ojos</span>
                    <span style={{ color: metrics.closed ? '#ef2d3c' : '#2bd67b' }}>
                      {metrics.closed ? 'Cerrados' : 'Abiertos'}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-black/60 px-3 py-2 text-right backdrop-blur">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-faint">Cierre continuo</p>
                  <p className="font-mono text-sm font-bold tabular" style={{ color }}>
                    {Math.round(metrics.closureMs)} ms
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] text-faint">
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5">
                <Eye size={11} className="text-info" /> Ojos y cejas
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5">
                <Wind size={11} className="text-warning" /> Boca / bostezo
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5">
                <Move3d size={11} className="text-purple" /> Postura de cabeza
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5">
                <Gauge size={11} className="text-success" /> Puntaje de fatiga
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border-soft bg-surface-2 p-4">
              <div className="flex items-center gap-4">
                <ScoreGauge score={metrics.score} level={level} color={color} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-extrabold uppercase tracking-widest ${level === 'CRITICO' ? 'text-danger-bright' : level === 'MEDIO' || level === 'BAJO' ? 'text-warning' : 'text-success'}`}>
                    {LEVEL_STYLE[level].label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{LEVEL_DESC[level]}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">
                    <CheckCircle2 size={11} style={{ color }} /> Confianza {Math.round(metrics.confidence || 0)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Metric icon={Eye} label="Apertura ocular (EAR)" value={metrics.ear != null ? metrics.ear.toFixed(3) : '—'} />
              <Metric icon={Activity} label="PERCLOS (3 s)" value={`${Math.round(metrics.perclos * 100)} %`} />
              <Metric icon={Timer} label="Cierre continuo" value={metrics.closureMs >= 1000 ? `${(metrics.closureMs / 1000).toFixed(1)} s` : `${Math.round(metrics.closureMs)} ms`} />
              <Metric icon={Wind} label="Parpadeos / min" value={metrics.blinkRate ?? 0} />
              <Metric icon={Move3d} label="Cabeza (yaw / pitch)" value={`${Math.round(metrics.yaw || 0)}° / ${Math.round(metrics.pitch || 0)}°`} />
              <Metric icon={ShieldAlert} label="Bostezo" value={metrics.yawn ? 'Detectado' : 'No'} tone={metrics.yawn ? 'warning' : undefined} />
            </div>

            <Sparkline data={history} color={color} />

            <div className="rounded-xl border border-border-soft bg-surface-2 p-3.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-faint">
                  <BrainCircuit size={12} className="text-purple" /> Análisis IA del fotograma
                </p>
                {aiConfigured && aiResult.text && (
                  <button onClick={downloadAiReport} className="text-[10px] font-bold text-info hover:underline">
                    Descargar informe
                  </button>
                )}
              </div>

              {!aiConfigured ? (
                <p className="rounded-lg border border-border bg-surface px-3 py-2.5 text-[10px] leading-relaxed text-faint">
                  El análisis con modelo de lenguaje está desactivado. Configure <span className="font-mono text-text">GROQ_API_KEY</span> en
                  el backend para obtener una segunda opinión del fotograma. La detección local sigue funcionando sin internet.
                </p>
              ) : (
                <>
                  <button
                    className="btn-ghost w-full text-[11px]"
                    onClick={analyzeFrame}
                    disabled={aiResult.loading || phase !== 'running'}
                  >
                    {aiResult.loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-purple" />}
                    {aiResult.loading ? 'Analizando fotograma…' : 'Analizar fotograma con IA'}
                  </button>
                  {aiResult.error && (
                    <p className="mt-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[10px] text-danger-bright">
                      {aiResult.error}
                    </p>
                  )}
                  {aiResult.text && (
                    <div className="mt-2 rounded-lg border border-purple/30 bg-purple/5 px-3 py-2.5">
                      <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted">{aiResult.text}</p>
                      {aiResult.model && (
                        <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-faint">Modelo: {aiResult.model}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-[10px] leading-relaxed text-faint">
              La IA procesa su rostro dentro del navegador; el video nunca sale de este equipo. Al superar el umbral se registra un
              evento/alerta en el panel y suena la alarma. Si no hay rostro, no se dispara la alarma.
            </div>

            {alarmOn && (
              <button
                className="btn-secondary w-full"
                onClick={() => {
                  stopAlarm();
                  alarmStateRef.current = { on: false };
                  setAlarmOn(false);
                }}
              >
                <VolumeX size={16} /> Silenciar alarma
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'idle' && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-[11px] text-muted">
          <Camera size={14} className="mt-0.5 shrink-0 text-info" />
          <span>
            Active la cámara para una prueba en vivo. La IA se calibra con su mirada (~2 s) y combina apertura ocular, PERCLOS,
            parpadeo, bostezo y postura para detectar somnolencia. Ante signos críticos dispara la alarma sonora y registra el evento
            en el historial del panel.
          </span>
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score, level, color }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 250ms ease, stroke 250ms ease', filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular" style={{ color }}>
          {pct}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-faint">Fatiga</span>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-border-soft bg-surface-2 px-2.5 py-2.5">
      <p className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-faint">
        <Icon size={10} /> {label}
      </p>
      <p className={`mt-1.5 text-center font-mono text-sm font-bold tabular ${tone === 'warning' ? 'text-warning' : 'text-text'}`}>
        {value}
      </p>
    </div>
  );
}

function Sparkline({ data, color }) {
  const width = 260;
  const height = 58;
  const points = data.slice(-60);
  if (points.length < 2) {
    return (
      <div className="rounded-xl border border-border-soft bg-surface-2 px-3.5 py-3">
        <p className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-faint">
          <span className="flex items-center gap-1.5"><Activity size={11} /> Tendencia</span>
          <span className="font-mono text-[9px]">sin datos</span>
        </p>
        <div className="flex h-[58px] items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-faint">
          La gráfica aparece al iniciar la detección
        </div>
      </div>
    );
  }
  const toPoint = (value, index) => {
    const x = (index / Math.max(1, points.length - 1)) * width;
    const y = height - (Math.max(0, Math.min(100, value)) / 100) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const scoreLine = points.map((p, i) => toPoint(p.score, i)).join(' ');
  const perclosLine = points.map((p, i) => toPoint(p.perclos * 100, i)).join(' ');
  return (
    <div className="rounded-xl border border-border-soft bg-surface-2 px-3.5 py-3">
      <p className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-faint">
        <span className="flex items-center gap-1.5"><Activity size={11} /> Tendencia (60 lecturas)</span>
        <span className="flex items-center gap-2 font-mono text-[9px]">
          <span style={{ color }}>■ fatiga</span>
          <span className="text-info">■ perclos</span>
        </span>
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[58px] w-full overflow-visible">
        <line x1="0" y1={height - (55 / 100) * (height - 6) - 3} x2={width} y2={height - (55 / 100) * (height - 6) - 3} stroke="rgba(239,45,60,0.35)" strokeDasharray="4 4" strokeWidth="1" />
        <polyline points={perclosLine} fill="none" stroke="#4aa8ff" strokeWidth="1.5" strokeOpacity="0.65" />
        <polyline points={scoreLine} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color}66)` }} />
      </svg>
    </div>
  );
}

function drawConnections(g, lm, connections, color, width, w, h) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  for (const c of connections) {
    const a = lm[c.start];
    const b = lm[c.end];
    if (!a || !b) continue;
    g.moveTo(a.x * w, a.y * h);
    g.lineTo(b.x * w, b.y * h);
  }
  g.stroke();
}

function drawIris(g, lm, index, w, h) {
  const center = lm[index];
  if (!center) return;
  const edge = lm[index + 1];
  const radius = edge ? Math.hypot((center.x - edge.x) * w, (center.y - edge.y) * h) : w * 0.012;
  g.save();
  g.strokeStyle = 'rgba(34,211,238,0.85)';
  g.lineWidth = Math.max(1, w / 700);
  g.shadowColor = '#22d3ee';
  g.shadowBlur = 8;
  g.beginPath();
  g.arc(center.x * w, center.y * h, Math.max(2, radius), 0, Math.PI * 2);
  g.stroke();
  g.restore();
}
