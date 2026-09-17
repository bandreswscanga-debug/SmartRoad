import { Smartphone, Activity, History, SlidersHorizontal, Siren, Bluetooth, MapPin, Bell, Download, TerminalSquare } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useState } from 'react';

export default function AppMovil() {
  const { config } = useApp();
  const [showCommands, setShowCommands] = useState(false);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-6">
          <p className="section-title mb-2">Aplicación móvil para el conductor</p>
          <h2 className="text-xl font-black">
            SmartRoad <span className="text-danger-bright">S.O.S</span> <span className="text-muted text-base">· Flutter</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Prototipo Flutter para el conductor: semáforo de riesgo (RF8), botón SOS (RF4),
            historial de eventos (RF10) y configuración de alertas (CU-05). El enlace al
            ESP32 (BLE/Wi-Fi) y el GPS real están en desarrollo; los valores de la app son simulados.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Feature icon={Activity} title="Monitoreo en vivo" desc="Nivel de fatiga estimado (simulado) y semáforo verde/amarillo/rojo." />
            <Feature icon={History} title="Historial" desc="Registro de micro sueños y alertas con ubicación y nivel de riesgo." />
            <Feature icon={SlidersHorizontal} title="Configuración de alerta" desc="Sonido, vibración o luz. Umbrales y sensibilidad (CU-05)." />
            <Feature icon={Siren} title="Botón SOS" desc="Envío de la señal de emergencia al centro de control (RF4)." />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Chip icon={Bluetooth} label="Enlace ESP32 · en desarrollo" />
            <Chip icon={MapPin} label="GPS · en desarrollo" />
            <Chip icon={Bell} label="Alerta sonora (RNF6)" />
            <Chip icon={Smartphone} label="Android" />
          </div>
        </div>

        <div className="relative">
          <div className="card h-full p-6">
            <p className="section-title mb-4">Build</p>
            <div className="rounded-2xl border border-border bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger-bright">
                  <TerminalSquare size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">APK del conductor</p>
                  <p className="text-[11px] text-faint">Se compila con Flutter desde la carpeta mobile/ · paquete com.seaa.smartroad.sos</p>
                </div>
              </div>
              <button className="btn-primary mt-4 w-full" onClick={() => setShowCommands((v) => !v)}>
                <Download size={16} /> {showCommands ? 'Ocultar pasos' : 'Ver pasos para compilar'}
              </button>
              {showCommands && (
                <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-bg p-3 text-[11px] leading-relaxed text-muted animate-rise">
{`cd SmartRoadSOS/mobile
flutter pub get
flutter build apk --release
# → build/app/outputs/flutter-apk/app-release.apk`}
                </pre>
              )}
            </div>
            <ul className="mt-5 space-y-2 text-[11px] text-muted">
              <li className="flex justify-between gap-2"><span>Framework</span><span className="font-mono text-text">Flutter · Dart</span></li>
              <li className="flex justify-between gap-2"><span>API backend</span><span className="font-mono text-text">http://10.0.2.2:4000</span></li>
              <li className="flex justify-between gap-2"><span>N° emergencia</span><span className="font-mono text-text">{config?.numero_emergencia || '123'}</span></li>
            </ul>
          </div>
        </div>
      </div>

      <Phones />
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-soft bg-surface-2 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger-bright">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-xs font-bold text-text">{title}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">{desc}</p>
      </div>
    </div>
  );
}

function Chip({ icon: Icon, label }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-muted">
      <Icon size={12} className="text-info" /> {label}
    </span>
  );
}

function Phones() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <PhoneMock
        screen="monitor"
        title="Monitoreo en vivo"
        desc="Semáforo de riesgo (RF8) · PERCLOS + estado del dispositivo"
      />
      <PhoneMock
        screen="history"
        title="Historial de eventos"
        desc="Registro de somnolencia con GPS, tiempo y nivel de riesgo"
      />
      <PhoneMock
        screen="settings"
        title="Configuración"
        desc="Tipo de alerta, sensibilidad y número de emergencia (CU-05)"
      />
    </div>
  );
}

function PhoneMock({ screen, title, desc }) {
  return (
    <div className="card p-6 animate-rise">
      <div className="mx-auto w-64">
        <div className="relative mx-auto h-[430px] overflow-hidden rounded-[36px] border-[7px] border-[#1b2230] bg-[#0a0e14] shadow-2xl">
          <div className="absolute left-1/2 top-0 z-10 h-4 w-24 -translate-x-1/2 rounded-b-xl bg-[#171d29]" />
          <div className="absolute inset-0 overflow-hidden">
            {screen === 'monitor' && <Monitor />}
            {screen === 'history' && <HistoryUi />}
            {screen === 'settings' && <SettingsUi />}
          </div>
        </div>
      </div>
      <div className="mt-5 text-center">
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">{desc}</p>
      </div>
    </div>
  );
}

function Monitor() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger text-[10px] font-black text-white">SOS</span>
          <span className="text-[11px] font-bold">SmartRoad SOS</span>
        </div>
        <span className="flex items-center gap-1 text-[8px] font-bold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> EN VIVO
        </span>
      </div>

      <div className="mt-3 rounded-2xl bg-[#0c1119] p-3">
        <div className="flex items-center justify-around rounded-xl border border-border-soft bg-surface-2 py-4">
          <Dot color="#2bd67b" label="OK" active={false} />
          <Dot color="#f5b92e" label="ALERTA" active={false} />
          <Dot color="#ef2d3c" label="PELIGRO" active />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Mini label="Fatiga" value="86%" danger />
        <Mini label="Ojos" value="Cerrados" danger />
        <Mini label="Velocidad" value="87 km/h" />
        <Mini label="GPS" value="4.716 · -74.078" />
      </div>

      <div className="mt-auto rounded-2xl border border-danger/60 bg-danger/15 p-3 text-center">
        <p className="text-[9px] font-black uppercase tracking-widest text-danger-bright animate-pulse">Alarma activa</p>
        <p className="mt-1 text-[10px] text-muted">Reaccione para detener la alerta</p>
      </div>

      <button className="mt-3 w-full rounded-xl bg-danger py-3 text-[11px] font-black uppercase tracking-wider text-white">SOS de emergencia</button>
    </div>
  );
}

function Dot({ color, label, active }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`h-4 w-4 rounded-full ${active ? '' : ''}`} style={{ background: active ? color : '#22304a', boxShadow: active ? `0 0 12px ${color}` : 'none' }} />
      <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: active ? color : '#5d6b80' }}>{label}</span>
    </div>
  );
}

function Mini({ label, value, danger }) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface-2 p-2.5">
      <p className="text-[8px] font-bold uppercase tracking-widest text-faint">{label}</p>
      <p className="mt-0.5 text-[11px] font-black tabular" style={{ color: danger ? '#ff4d5a' : '#e8edf4' }}>{value}</p>
    </div>
  );
}

function HistoryUi() {
  const rows = [
    { t: 'Micro sueño', r: 'MEDIO', time: '08:42', color: '#f5b92e' },
    { t: 'Somnolencia alta', r: 'CRITICO', time: '07:15', color: '#ef2d3c' },
    { t: 'Distracción', r: 'BAJO', time: '06:58', color: '#2bd67b' },
    { t: 'Fatiga prolongada', r: 'MEDIO', time: '06:02', color: '#f5b92e' },
    { t: 'SOS enviado', r: 'CRITICO', time: '05:44', color: '#ef2d3c' }
  ];
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold">Historial</span>
        <span className="rounded-lg border border-border-soft px-2 py-0.5 text-[8px] text-faint">TODOS</span>
      </div>
      <div className="mt-3 flex-1 space-y-2 overflow-hidden">
        {rows.map((r) => (
          <div key={r.t} className="flex items-center gap-2.5 rounded-xl border border-border-soft bg-surface-2 p-2.5">
            <span className="h-7 w-7 rounded-lg" style={{ background: `${r.color}14`, boxShadow: `inset 0 0 0 1.5px ${r.color}` }} />
            <div className="flex-1">
              <p className="text-[10px] font-bold">{r.t}</p>
              <p className="text-[8px] text-faint">Ruta 45 · 15:26 · GPS</p>
            </div>
            <span className="text-[8px] font-bold uppercase" style={{ color: r.color }}>{r.r}</span>
          </div>
        ))}
      </div>
      <button className="mt-2 rounded-xl bg-surface-2 py-2.5 text-[10px] font-bold text-muted">Ver los 40 registros</button>
    </div>
  );
}

function SettingsUi() {
  const rows = [
    { t: 'Alerta sonora', on: true },
    { t: 'Vibración', on: true },
    { t: 'Alerta visual', on: false },
    { t: 'SOS automático', on: true }
  ];
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold">Configuración</span>
        <span className="text-[8px] text-faint">CU-05</span>
      </div>
      <div className="mt-3 flex-1 space-y-2 overflow-hidden">
        {rows.map((r) => (
          <div key={r.t} className="flex items-center justify-between rounded-xl border border-border-soft bg-surface-2 p-2.5">
            <span className="text-[10px] font-semibold">{r.t}</span>
            <span className={`relative h-4 w-8 rounded-full ${r.on ? 'bg-success' : 'bg-[#22304a]'}`}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white ${r.on ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
          </div>
        ))}
        <div className="rounded-xl border border-border-soft bg-surface-2 p-2.5">
          <p className="text-[10px] font-semibold">Número de emergencia</p>
          <p className="mt-1 font-mono text-[11px] font-bold text-text tabular">123</p>
        </div>
        <div className="rounded-xl border border-border-soft bg-surface-2 p-2.5">
          <p className="text-[10px] font-semibold">Sensibilidad</p>
          <div className="mt-2 h-1.5 rounded-full bg-[#22304a]">
            <div className="h-full w-[70%] rounded-full bg-danger" />
          </div>
        </div>
        <div className="rounded-xl border border-border-soft bg-surface-2 p-2.5">
          <p className="text-[10px] font-semibold">Dispositivo</p>
          <p className="mt-0.5 text-[9px] text-faint">ESP32 · SRD-1004 · Conectado</p>
        </div>
      </div>
      <button className="mt-2 rounded-xl bg-danger py-2.5 text-[10px] font-black uppercase tracking-wider text-white">Guardar</button>
    </div>
  );
}