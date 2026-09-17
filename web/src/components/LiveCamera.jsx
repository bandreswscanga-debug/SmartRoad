import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Camera, MicOff, Wifi, Gauge } from 'lucide-react';
import { RISK_COLOR, fmtClock } from '../utils/format';

export default function LiveCamera({ vehicle, height }) {
  const { serverUptime } = useApp();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 260);
    return () => clearInterval(t);
  }, []);

  const risk = vehicle?.riesgo || 'BAJO';
  const danger = risk === 'CRITICO';
  const seed = (tick * 7919) % 100;
  const perclos = danger ? 78 + ((seed * 7) % 20) : risk === 'MEDIO' ? 45 + ((seed * 9) % 22) : 8 + ((seed * 3) % 9);
  const eyes = danger ? 'Cerrados' : seed % 4 === 0 ? 'Semi-cerrados' : 'Abiertos';
  const live = tick % 30 < 26;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${danger ? 'border-danger/70 animate-pulse-ring' : 'border-border'} bg-black shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}
      style={height ? { height } : {}}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#131a26] via-[#0c1017] to-[#05060a]" />
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)' }} />

      <DriverScene risk={risk} perclos={perclos} />

      <div className="absolute inset-x-2 top-[38%] bottom-[26%] rounded-xl border border-[#ff4d5a]/60">
        <span className="absolute -left-px -top-px h-4 w-4 border-l-2 border-t-2 border-[#ff4d5a]" />
        <span className="absolute -right-px -top-px h-4 w-4 border-r-2 border-t-2 border-[#ff4d5a]" />
        <span className="absolute -bottom-px -left-px h-4 w-4 border-b-2 border-l-2 border-[#ff4d5a]" />
        <span className="absolute -bottom-px -right-px h-4 w-4 border-b-2 border-r-2 border-[#ff4d5a]" />
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-[45%] h-10 bg-gradient-to-b from-transparent via-[#ff4d5a]/25 to-transparent opacity-70" style={{ animation: 'scan 3.4s linear infinite' }} />

      <div className="absolute right-3 top-3 flex items-center gap-2">
        <span className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] font-bold backdrop-blur ${danger ? 'border-danger/70 bg-danger/25 text-danger-bright' : 'border-border bg-black/50 text-green-400'}`}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> REC
        </span>
        <span className="flex items-center gap-1 rounded-md border border-border bg-black/50 px-2 py-1 font-mono text-[10px] text-muted backdrop-blur">
          <CamIcon /> SRD-CAM·4K
        </span>
      </div>

      <div className="absolute left-3 top-3 font-mono text-[10px] tracking-wider text-muted backdrop-blur">
        <span className="text-green-400">●</span> {fmtClock(new Date().toISOString())} UTC-5
        <span className="mx-2 text-faint">|</span>
        {vehicle?.codigo} · {vehicle?.placa}
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
        <div className="rounded-lg border border-border bg-black/60 px-3 py-2 backdrop-blur">
          <p className="text-[9px] font-bold uppercase tracking-widest text-faint">{vehicle?.conductor_nombre || 'Conductor'}</p>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] font-bold">
            <span className="text-muted">PERCLOS</span>
            <span className="tabular" style={{ color: RISK_COLOR[risk] }}>{perclos}%</span>
            <span className="text-muted">Ojos</span>
            <span style={{ color: danger ? '#ff4d5a' : '#2bd67b' }}>{eyes}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-md border border-border bg-black/60 px-2 py-1 text-[10px] text-muted backdrop-blur">
            <MicOff size={11} /> MUTE
          </span>
          <span className="flex items-center gap-1 rounded-md border border-border bg-black/60 px-2 py-1 text-[10px] font-semibold text-green-400 backdrop-blur">
            <Wifi size={11} /> ESP32
          </span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 hidden flex-col gap-1 rounded-lg border border-border bg-black/60 px-2.5 py-2 backdrop-blur sm:flex">
        <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-faint">
          <Gauge size={11} /> Fatiga
        </p>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, perclos)}%`, background: RISK_COLOR[risk] }}
          />
        </div>
        <p className="font-mono text-[10px] font-bold tabular" style={{ color: RISK_COLOR[risk] }}>
          {perclos}% · {live ? 'LIVE' : 'procesando'}
        </p>
        <p className="font-mono text-[10px] text-faint tabular">uptime {fmtUptimeShort(serverUptime)}</p>
      </div>

      {danger && (
        <div className="absolute inset-x-0 top-16 flex justify-center">
          <span className="flex items-center gap-2 rounded-lg border border-danger bg-black/70 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-danger-bright backdrop-blur">
            <span className="h-2 w-2 animate-ping rounded-full bg-danger" />
            Alerta crítica detectada — alarma activa
          </span>
        </div>
      )}
    </div>
  );
}

function DriverScene({ risk, perclos }) {
  const closed = risk === 'CRITICO' || perclos > 70;
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
      <svg viewBox="0 0 320 320" className="h-full max-h-[92%] w-auto" preserveAspectRatio="xMidYMax meet">
        <defs>
          <radialGradient id="skin" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#6b4a33" />
            <stop offset="100%" stopColor="#3d2a1c" />
          </radialGradient>
        </defs>
        <g>
          <circle cx="160" cy="118" r="62" fill="url(#skin)" />
          <rect x="100" y="150" width="120" height="150" rx="30" fill="#2a2530" />
          <rect x="128" y="176" width="64" height="70" rx="12" fill="url(#skin)" />
          <rect x="132" y="150" width="32" height="24" rx="6" fill="#2a2530" />
          <rect x="156" y="150" width="32" height="24" rx="6" fill="#2a2530" />
          <circle cx="160" cy="102" r="10" fill="#0c0a08" />
          <circle cx="160" cy="274" r="14" fill="#1d1a22" />
          <circle cx="160" cy="274" r="5" fill="#ff4d5a" />

          <g transform="translate(132 90)">
            <g className="animate-blink" style={{ transformOrigin: 'center', animationDuration: closed ? '1.1s' : '4.4s' }}>
              <rect x="0" y="0" width="16" height="20" rx="8" fill="#1c1712" />
              <rect x="20" y="0" width="16" height="20" rx="8" fill="#1c1712" />
            </g>
          </g>

          <rect x="128" y="120" width="64" height="14" rx="7" fill="#2a2530" />

          <g opacity="0.5">
            <path d="M160 300 Q150 288 160 278" stroke="#3a2b1f" strokeWidth="2" fill="none" />
            <path d="M160 300 Q170 288 160 278" stroke="#3a2b1f" strokeWidth="2" fill="none" />
          </g>
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_30%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}

function CamIcon() {
  return <Camera size={11} />;
}

function fmtUptimeShort(sec) {
  const h = Math.floor((sec || 0) / 3600);
  const m = Math.floor(((sec || 0) % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}