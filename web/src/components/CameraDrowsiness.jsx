import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { Camera, Video, VideoOff, Eye, Activity, Volume2, VolumeX, Loader2, ShieldAlert, Radio, ScanSearch } from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { earFor, createDrowsinessDetector } from '../utils/drowsiness';
import { playAlarm, stopAlarm, playChime } from '../utils/alarm';

const MODEL_URL = '/mediapipe/wasm';
const TASK_URL = '/mediapipe/face_landmarker.task';

let landmarkerPromise = null;
function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(MODEL_URL);
      try {
        return await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: TASK_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1
        });
      } catch (_gpu) {
        return FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: TASK_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numFaces: 1
        });
      }
    })();
  }
  return landmarkerPromise;
}

const LEVEL_STYLE = {
  NORMAL: { pill: 'border-success/50 bg-success/15 text-success', label: 'Sin somnolencia' },
  BAJO: { pill: 'border-warning/50 bg-warning/15 text-warning', label: 'Signo leve' },
  MEDIO: { pill: 'border-warning/60 bg-warning/25 text-warning', label: 'Signo moderado' },
  CRITICO: { pill: 'border-danger/60 bg-danger/25 text-danger-bright', label: '¡SOMNOLENCIA CRÍTICA!' }
};

const LEVEL_DESC = {
  NORMAL: 'Ojos abiertos, atención estable.',
  BAJO: 'Parpadeo frecuente: mantenga la alerta.',
  MEDIO: 'Cierre de ojos en aumento: pausa recomendada.',
  CRITICO: 'Ojos cerrados de forma prolongada: alarma sonora activa.'
};

export default function CameraDrowsiness() {
  const { pushToast } = useApp();
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [level, setLevel] = useState('NORMAL');
  const [metrics, setMetrics] = useState({ ear: null, perclos: 0, streak: 0, threshold: null, calFrame: 0, face: false });
  const [alarmOn, setAlarmOn] = useState(false);

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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  function stopEverything() {
    cancelAnimationFrame(rafRef.current);
    stopAlarm();
    alarmStateRef.current = { on: false };
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function notify(nivel) {
    const now = Date.now();
    const cooldown = nivel === 'CRITICO' ? 12000 : 25000;
    if (now - (notifyLockRef.current[nivel] || 0) < cooldown) return;
    notifyLockRef.current[nivel] = now;
    try {
      const descripcion =
        nivel === 'CRITICO'
          ? 'Modo de prueba (cámara web del panel): signos críticos de somnolencia — cierre prolongado de ojos. Alarma sonora activada.'
          : 'Modo de prueba (cámara web del panel): signos moderados de somnolencia detectados.';
      const res = await api.testDrowsiness(nivel, descripcion);
      if (nivel === 'CRITICO') {
        pushToast(res.alert ? `Alerta crítica realtime: ${res.alert.vehiculo_codigo}` : 'Alerta crítica registrada', 'critical');
      } else {
        pushToast('Evento de prueba registrado en historial', 'warning');
      }
    } catch (_e) {
      /* backend offline: la alarma local sigue funcionando */
    }
  }

  const handleLevelRef = useRef(null);
  handleLevelRef.current = (next) => {
    const prev = levelRef.current;
    if (prev === next) return;
    levelRef.current = next;
    setLevel(next);
    if (next === 'CRITICO') {
      playAlarm();
      alarmStateRef.current = { on: true };
      setAlarmOn(true);
      notify('CRITICO');
      return;
    }
    if (next === 'MEDIO' && !alarmStateRef.current.on) {
      playChime(0.22);
      notify('MEDIO');
      return;
    }
    if (alarmStateRef.current.on && (prev === 'CRITICO' || prev === 'MEDIO')) {
      stopAlarm();
      alarmStateRef.current = { on: false };
      setAlarmOn(false);
    }
    if (next === 'MEDIO' && prev !== 'CRITICO') notify('MEDIO');
  };

  async function startTest() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite usar la cámara. Necesita un contexto seguro (localhost o HTTPS) y permisos de cámara.');
      setPhase('error');
      return;
    }
    setPhase('starting');
    setError(null);
    setLevel('NORMAL');
    levelRef.current = 'NORMAL';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      await getLandmarker();
      if (!mountedRef.current) return;

      detectorRef.current = createDrowsinessDetector();
      calibEarsRef.current = [];
      alarmStateRef.current = { on: false };
      setAlarmOn(false);
      setPhase('calibrating');
      pushToast('Modo de prueba: calibrando la IA con sus ojos (mire al frente, sin pestañear), luego mostrando el video', 'info');
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
    }
  }

  function stopTest() {
    stopEverything();
    detectorRef.current = null;
    setPhase('idle');
    setLevel('NORMAL');
    levelRef.current = 'NORMAL';
    setAlarmOn(false);
    setMetrics({ ear: null, perclos: 0, streak: 0, threshold: null, calFrame: 0, face: false });
  }

  function runLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(runLoop);
      return;
    }
    const g = canvas.getContext('2d');
    let lastVideoTime = -1;

    const tick = async () => {
      const ph = phaseRef.current;
      if (!mountedRef.current || (ph !== 'calibrating' && ph !== 'running')) return;
      const detector = detectorRef.current;
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
          const landmarker = await getLandmarker();
          const result = landmarker.detectForVideo(video, performance.now());
          paint(g, result);
          const lm = result.faceLandmarks && result.faceLandmarks[0];
          if (!lm || !detector) {
            if (detector) detector.push(null);
            setMetrics((m) => ({ ...m, face: Boolean(lm) }));
          } else {
            const left = earFor(lm, 'left');
            const right = earFor(lm, 'right');
            const ear = left != null && right != null ? (left + right) / 2 : left ?? right;
            if (ear == null) {
              detector.push(null);
              setMetrics((m) => ({ ...m, face: true }));
            } else if (ph === 'calibrating') {
              calibEarsRef.current.push(ear);
              setMetrics((m) => ({ ...m, ear, calFrame: calibEarsRef.current.length, face: true }));
              if (calibEarsRef.current.length >= 60) {
                detector.train(calibEarsRef.current);
                setPhase('running');
                setMetrics((m) => ({ ...m, openEar: detector.openEar, threshold: detector.openEar * 0.62, calFrame: 60 }));
                pushToast('IA calibrada: umbral personal de ojos cerrados listo', 'success');
              }
            } else {
              const res = detector.push(ear);
              setMetrics((m) => ({ ...m, ear: res.ear, perclos: res.perclos, streak: res.streak, threshold: res.threshold, openEar: res.openEar, face: true }));
              if (typeof handleLevelRef.current === 'function') handleLevelRef.current(res.level);
            }
          }
        } catch (_e) {
          /* frame fallido: se continúa con el siguiente */
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function paint(g, result) {
    const w = g.canvas.width;
    const h = g.canvas.height;
    g.clearRect(0, 0, w, h);
    if (!result.faceLandmarks || !result.faceLandmarks[0]) return;
    const lm = result.faceLandmarks[0];
    const sets = { left: [362, 385, 387, 263, 373, 380], right: [33, 160, 158, 133, 153, 144] };
    g.lineWidth = 2;
    for (const key of ['left', 'right']) {
      const pts = sets[key].map((i) => lm[i]);
      if (!pts.every(Boolean)) continue;
      g.beginPath();
      g.moveTo(pts[0].x * w, pts[0].y * h);
      if (key === 'left') g.strokeStyle = '#22d3ee';
      else g.strokeStyle = '#f472b6';
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x * w, pts[i].y * h);
      g.stroke();
    }
  }

  return (
    <div className="card space-y-4 p-5 animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${phase === 'idle' || phase === 'error' ? 'border-border bg-surface-2 text-info' : 'border-danger/50 bg-danger/15 text-danger-bright'}`}>
            <ScanSearch size={19} />
          </span>
          <div>
            <p className="text-sm font-extrabold">Modo de prueba · Detección de somnolencia (IA)</p>
            <p className="text-[11px] text-muted">Cámara del panel · FaceMesh (478 puntos) + EAR/PERCLOS con calibración personal</p>
          </div>
        </div>
        {phase === 'idle' || phase === 'error' || phase === 'starting' ? (
          <div className="flex items-center gap-2">
            {phase === 'starting' && <Loader2 size={16} className="animate-spin text-info" />}
            <button className="btn-primary" onClick={startTest} disabled={phase === 'starting'}>
              <Video size={16} /> Iniciar cámara
            </button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={stopTest}>
            <VideoOff size={16} /> Detener
          </button>
        )}
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

      {(phase === 'calibrating' || phase === 'running') && (
        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <div className="relative overflow-hidden rounded-xl border border-border bg-black">
            <video ref={videoRef} className="aspect-video w-full object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ transform: 'scaleX(-1)' }} />
            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${LEVEL_STYLE[level].pill}`}>
                {LEVEL_STYLE[level].label}
              </span>
              {alarmOn && (
                <span className="flex items-center gap-1.5 rounded-lg border border-danger/60 bg-danger px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white animate-pulse-ring">
                  <Volume2 size={12} /> Alarma sonora
                </span>
              )}
            </div>
            {phase === 'calibrating' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55">
                <Loader2 size={26} className="animate-spin text-warning" />
                <p className="text-xs font-bold uppercase tracking-widest text-warning">Calibrando la IA · mirar al frente con los ojos abiertos</p>
                <p className="text-[10px] text-muted">
                  {Math.min(60, metrics.calFrame)}/60 cuadros{metrics.ear != null ? ` · EAR ${metrics.ear.toFixed(2)}` : ' · buscando rostro…'}
                </p>
              </div>
            )}
            {phase === 'running' && !metrics.face && (level === 'NORMAL' || level === 'BAJO') && (
              <div className="absolute inset-x-3 bottom-3 rounded-lg border border-warning/40 bg-black/70 px-3 py-2 text-[11px] text-warning">
                <Radio size={12} className="mr-1 inline animate-pulse" /> Sin rostro a la vista: posiciónese frente a la cámara.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border-soft bg-surface-2 p-3.5">
              <p className={`text-[11px] font-extrabold uppercase tracking-widest ${level === 'CRITICO' ? 'text-danger-bright' : level === 'MEDIO' || level === 'BAJO' ? 'text-warning' : 'text-success'}`}>
                {LEVEL_STYLE[level].label}
              </p>
              <p className="mt-1 text-xs text-muted">{LEVEL_DESC[level]}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-center">
              <Metric icon={Eye} label="Apertura ocular (EAR)" value={metrics.ear != null ? metrics.ear.toFixed(3) : '—'} />
              <Metric icon={Activity} label="PERCLOS (ventana 3 s)" value={`${Math.round(metrics.perclos * 100)} %`} />
              <Metric icon={Eye} label="Umbral personal" value={metrics.threshold != null ? metrics.threshold.toFixed(3) : '—'} />
              <Metric icon={ShieldAlert} label="Cierre continuo" value={`${metrics.streak} cuadros`} />
            </div>

            <div className="rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-[10px] leading-relaxed text-faint">
              La IA procesa su rostro dentro del navegador; el video nunca sale de este equipo. Al superar el umbral, se registra un evento/alerta en el panel y suena la alarma.
              Si no hay alguien registrado (0 rostros), no se dispara alarma.
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
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-[11px] text-muted">
          <Camera size={14} className="shrink-0 text-info" />
          Active la cámara para una prueba en vivo: la IA detecta el cierre de ojos (EAR/PERCLOS), se calibra con su mirada (~2 s) y ante signos de somnolencia dispara la alarma sonora y registra eventos en el historial del panel.
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border-soft bg-surface-2 px-2.5 py-2.5">
      <p className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-faint">
        <Icon size={10} /> {label}
      </p>
      <p className="mt-1.5 font-mono text-sm font-bold text-text tabular">{value}</p>
    </div>
  );
}