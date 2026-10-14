import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { Camera, Video, VideoOff, Eye, Activity, Volume2, VolumeX, Loader2, ShieldAlert, Radio, ScanSearch } from 'lucide-react';
import { createDrowsinessDetector } from '../utils/drowsiness';
import { playAlarm, stopAlarm, playChime } from '../utils/alarm';

// face-api.js se carga diferido (import dinámico): si el módulo fallara,
// no tumba la app completa, solo este modo.
let faceapi = null;
async function loadFaceApi() {
  if (!faceapi) {
    const mod = await import('face-api.js');
    faceapi = mod.default || mod;
  }
  return faceapi;
}

const MODEL_URL = '/models';
const CALIB_FRAMES = 30;
const CALIB_TIMEOUT_MS = 45000;

let modelsPromise = null;
async function ensureModels() {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const fa = await loadFaceApi();
      // CPU puro: funciona sin WebGL/GPU (equipos donde MediaPipe no corre).
      try {
        fa.tf.setBackend('cpu');
        await fa.tf.ready();
      } catch (_e) {
        /* sigue con el backend por defecto */
      }
      await fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    })();
  }
  return modelsPromise;
}

function dist2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// EAR con 68 puntos: cada ojo trae 6 puntos [p1..p6].
function ear68(eye) {
  if (!eye || eye.length < 6) return null;
  const [p1, p2, p3, p4, p5, p6] = eye;
  const horizontal = 2 * dist2D(p1, p4);
  if (!horizontal) return null;
  return (dist2D(p2, p6) + dist2D(p3, p5)) / horizontal;
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

export default function FaceApiCamera() {
  const { pushToast } = useApp();
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [level, setLevel] = useState('NORMAL');
  const [metrics, setMetrics] = useState({ ear: null, perclos: 0, streak: 0, threshold: null, calFrame: 0, face: false, frames: 0, inferMs: null });
  const [alarmOn, setAlarmOn] = useState(false);
  const [etapa, setEtapa] = useState('En espera');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const phaseRef = useRef('idle');
  const detectorRef = useRef(null);
  const calibEarsRef = useRef([]);
  const calibStartRef = useRef(0);
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
          ? 'Modo alterno face-api (cámara web del panel): signos críticos de somnolencia. Alarma sonora activada.'
          : 'Modo alterno face-api (cámara web del panel): signos moderados de somnolencia detectados.';
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
  };

  async function startTest() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite usar la cámara. Necesita localhost o HTTPS y permisos.');
      setPhase('error');
      return;
    }
    setPhase('starting');
    setError(null);
    setEtapa('Pidiendo permiso a la cámara…');
    setLevel('NORMAL');
    levelRef.current = 'NORMAL';
    let permissionStuck = false;
    const permissionTimer = setTimeout(() => {
      permissionStuck = true;
      if (phaseRef.current === 'starting') {
        setEtapa('Sin respuesta de la cámara');
        setError('La cámara no responde: acepte el permiso o cierre otras apps que la usen, y reintente.');
        setPhase('error');
      }
    }, 30000);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
        audio: false
      });
      clearTimeout(permissionTimer);
      if (permissionStuck) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('El reproductor de video no está listo. Pulse Iniciar cámara de nuevo.');
      }
      video.srcObject = stream;
      video.muted = true;
      await video.play().catch(() => {});
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
        throw new Error('La cámara entrega imagen congelada o no reproduce. Cierre otras apps que la usen y reintente.');
      }
      setEtapa('Cargando modelos face-api (tiny + 68 puntos)…');
      await Promise.race([
        ensureModels(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Modelos face-api: tiempo agotado, revise su conexión.')), 60000)
        )
      ]);
      if (!mountedRef.current) return;
      detectorRef.current = createDrowsinessDetector();
      calibEarsRef.current = [];
      calibStartRef.current = Date.now();
      alarmStateRef.current = { on: false };
      setAlarmOn(false);
      setEtapa('Modelo listo, calibrando con su mirada…');
      setPhase('calibrating');
      pushToast('Modo alterno: calibrando con sus ojos (mire al frente), luego mostrando el video', 'info');
      runLoop();
    } catch (err) {
      clearTimeout(permissionTimer);
      if (!mountedRef.current) return;
      stopEverything();
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilítelo en el navegador y reintente.'
          : err?.name === 'NotFoundError'
            ? 'No se detectó una cámara conectada.'
            : `No se pudo iniciar (face-api): ${err?.message || err}`;
      setEtapa('Error al iniciar');
      setError(msg);
      setPhase('error');
    }
  }

  function stopTest() {
    stopEverything();
    detectorRef.current = null;
    setPhase('idle');
    setEtapa('En espera');
    setLevel('NORMAL');
    levelRef.current = 'NORMAL';
    setAlarmOn(false);
    setMetrics({ ear: null, perclos: 0, streak: 0, threshold: null, calFrame: 0, face: false, frames: 0, inferMs: null });
  }

  function finishCalibration() {
    const detector = detectorRef.current;
    if (!detector) return;
    detector.train(calibEarsRef.current);
    setPhase('running');
    setEtapa('Activa');
    setMetrics((m) => ({ ...m, openEar: detector.openEar, threshold: detector.openEar * 0.62, calFrame: CALIB_FRAMES }));
    pushToast('IA alterna calibrada: umbral personal listo', 'success');
  }

  function failCalibration() {
    stopEverything();
    setEtapa('Falló la calibración');
    setError('No se detectó un rostro estable. Verifique buena luz frontal, mire al frente a ~50 cm y que ninguna otra app use la cámara. Luego pulse Iniciar cámara.');
    setPhase('error');
  }

  function recalibrate() {
    if (phaseRef.current !== 'calibrating') return;
    calibEarsRef.current = [];
    calibStartRef.current = Date.now();
    setMetrics((m) => ({ ...m, calFrame: 0 }));
    pushToast('Calibración reiniciada: mire al frente con los ojos abiertos', 'info');
  }

  function runLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(runLoop);
      return;
    }
    if (canvas && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }
    setMetrics((m) => ({ ...m, video: `${video.videoWidth}x${video.videoHeight}` }));
    const g = canvas.getContext('2d');
    let lastVideoTime = -1;
    let frozenFrames = 0;

    const tick = async () => {
      const ph = phaseRef.current;
      if (!mountedRef.current || (ph !== 'calibrating' && ph !== 'running')) return;
      const detector = detectorRef.current;
      if (video.currentTime !== lastVideoTime) {
        frozenFrames = 0;
        lastVideoTime = video.currentTime;
        setMetrics((m) => ({ ...m, frozen: false }));
        try {
          const fa = await loadFaceApi();
          const t0 = performance.now();
          const det = await fa
            .detectSingleFace(video, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
            .withFaceLandmarks();
          const inferMs = Math.round(performance.now() - t0);
          paint(g, det);
          setMetrics((m) => ({ ...m, frames: (m.frames || 0) + 1, detectError: null, inferMs, face: Boolean(det) }));
          const lm = det && det.landmarks;
          let ear = null;
          if (lm) {
            const left = ear68(lm.getLeftEye());
            const right = ear68(lm.getRightEye());
            ear = left != null && right != null ? (left + right) / 2 : left ?? right;
          }
          if (ear == null || !detector) {
            if (detector && det) detector.push(null);
            if (ph === 'calibrating' && Date.now() - calibStartRef.current > CALIB_TIMEOUT_MS) {
              failCalibration();
            }
          } else if (ph === 'calibrating') {
            calibEarsRef.current.push(ear);
            setMetrics((m) => ({ ...m, ear, calFrame: calibEarsRef.current.length }));
            if (calibEarsRef.current.length >= CALIB_FRAMES) {
              finishCalibration();
            } else if (Date.now() - calibStartRef.current > CALIB_TIMEOUT_MS) {
              failCalibration();
            }
          } else {
            const res = detector.push(ear);
            setMetrics((m) => ({ ...m, ear: res.ear, perclos: res.perclos, streak: res.streak, threshold: res.threshold, openEar: res.openEar }));
            if (typeof handleLevelRef.current === 'function') handleLevelRef.current(res.level);
          }
        } catch (_e) {
          setMetrics((m) => ({ ...m, detectError: String(_e?.message || _e).slice(0, 120) }));
        }
      } else {
        frozenFrames += 1;
        if (frozenFrames > 300) {
          setMetrics((m) => ({ ...m, frozen: true }));
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function paint(g, det) {
    const w = g.canvas.width;
    const h = g.canvas.height;
    g.clearRect(0, 0, w, h);
    if (!det) return;
    const box = det.detection.box;
    g.lineWidth = 2;
    g.strokeStyle = '#22c55e';
    g.strokeRect(box.x, box.y, box.width, box.height);
    const lm = det.landmarks;
    if (!lm) return;
    const drawEye = (eye, color) => {
      if (!eye || eye.length < 6) return;
      g.beginPath();
      g.moveTo(eye[0].x, eye[0].y);
      g.strokeStyle = color;
      for (let i = 1; i < eye.length; i++) g.lineTo(eye[i].x, eye[i].y);
      g.closePath();
      g.stroke();
    };
    drawEye(lm.getLeftEye(), '#22d3ee');
    drawEye(lm.getRightEye(), '#f472b6');
    const mouth = lm.getMouth();
    if (mouth && mouth.length) {
      g.beginPath();
      g.moveTo(mouth[0].x, mouth[0].y);
      g.strokeStyle = '#f59e0b';
      for (let i = 1; i < mouth.length; i++) g.lineTo(mouth[i].x, mouth[i].y);
      g.closePath();
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
            <p className="text-sm font-extrabold">Modo alterno · face-api.js (TinyFace + 68 puntos)</p>
            <p className="text-[11px] text-muted">Motor local distinto · CPU · ojos y boca · v1-alterna</p>
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

      {phase !== 'idle' && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-xs text-muted">
          {(phase === 'starting' || phase === 'calibrating') && <Loader2 size={15} className="animate-spin text-info" />}
          <span><b>Estado:</b> {etapa}</span>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-3 text-xs font-medium text-danger-bright">
          <ShieldAlert size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {(phase === 'idle' || phase === 'error') ? (
        <div className="overflow-hidden rounded-xl border border-border bg-black" style={{ display: 'none' }} aria-hidden="true">
          <video ref={videoRef} className="aspect-video w-full object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ transform: 'scaleX(-1)' }} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <div className="relative overflow-hidden rounded-xl border border-border bg-black">
            <video ref={videoRef} className="aspect-video w-full object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ transform: 'scaleX(-1)' }} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[72%] w-[46%] rounded-[50%] border-2 border-dashed border-white/40" />
            </div>
            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-3">
              <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${LEVEL_STYLE[level].pill}`}>
                {LEVEL_STYLE[level].label}
              </span>
            </div>
            {phase === 'calibrating' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 p-4 text-center">
                <Loader2 size={26} className="animate-spin text-warning" />
                <p className="text-xs font-bold uppercase tracking-widest text-warning">Calibrando IA alterna · mirar al frente</p>
                <p className="text-[10px] text-muted">
                  {Math.min(CALIB_FRAMES, metrics.calFrame)}/{CALIB_FRAMES} cuadros{metrics.ear != null ? ` · EAR ${metrics.ear.toFixed(2)}` : ' · buscando rostro…'}
                </p>
                {metrics.frozen && (
                  <p className="rounded-lg border border-danger/50 bg-danger/15 px-3 py-2 text-[11px] font-bold text-danger-bright">
                    Imagen congelada: pulse Detener e Iniciar de nuevo.
                  </p>
                )}
                <button
                  type="button"
                  onClick={recalibrate}
                  className="mt-1 rounded-lg border border-warning/50 bg-black/60 px-3 py-1.5 text-[11px] font-bold text-warning hover:bg-warning/15"
                >
                  Reiniciar calibración
                </button>
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

            <div className="rounded-lg border border-border-soft bg-surface px-3.5 py-2.5 font-mono text-[10px] leading-relaxed text-faint">
              diag · video {metrics.video || '—'} · cuadros {metrics.frames || 0} · rostro {metrics.face ? 'SÍ' : 'no'}{metrics.frozen ? ' · CONGELADA' : ''}{metrics.inferMs != null ? ` · IA ${metrics.inferMs} ms` : ''}
              {metrics.detectError ? ` · error: ${metrics.detectError}` : ''}
            </div>
          </div>
        </div>
      )}

      {phase === 'idle' && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-[11px] text-muted">
          <Camera size={14} className="shrink-0 text-info" />
          Motor alterno local (face-api.js): TinyFaceDetector + 68 puntos (ojos y boca), CPU puro sin WebGL. Calibra con su mirada y dispara alarma y eventos igual que el modo principal.
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border-soft bg-surface-2 px-2.5 py-2">
      <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-faint">
        <Icon size={10} /> {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-text tabular">{value}</p>
    </div>
  );
}
