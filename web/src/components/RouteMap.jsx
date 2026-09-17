import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { MapPin, Navigation, Crosshair } from 'lucide-react';
import { RISK_COLOR } from '../utils/format';

const W = 860;
const H = 500;
const B = { minLat: 4.44, maxLat: 5.16, minLng: -74.56, maxLng: -73.98 };
const PAD = 34;

export default function RouteMap({ vehicles, zones, height, title = 'Mapa en vivo · corredor Ruta 45' }) {
  const { criticalAlert, summary } = useApp();

  const proj = useMemo(() => {
    const sx = (W - PAD * 2) / (B.maxLng - B.minLng);
    const sy = (H - PAD * 2) / (B.maxLat - B.minLat);
    return {
      x: (lng) => PAD + (lng - B.minLng) * sx,
      y: (lat) => PAD + (B.maxLat - lat) * sy
    };
  }, []);

  const cities = [
    { name: 'Bogotá', lat: 4.6097, lng: -74.0817 },
    { name: 'Villeta', lat: 5.0129, lng: -74.4739 },
    { name: 'La Mesa', lat: 4.6352, lng: -74.4618 },
    { name: 'Zipaquirá', lat: 5.022, lng: -74.003 }
  ];

  const routePath =
    `M ${proj.x(-74.4739)} ${proj.y(5.0129)} ` +
    `L ${proj.x(-74.4618)} ${proj.y(4.6352)} ` +
    `L ${proj.x(-74.32)} ${proj.y(4.62)} ` +
    `L ${proj.x(-74.0817)} ${proj.y(4.6097)}`;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-info">
            <MapPin size={17} />
          </span>
          <div>
            <h3 className="section-title">{title}</h3>
            <p className="mt-0.5 text-[11px] text-faint">Posición GPS de la flotilla · actualización 4 s</p>
          </div>
        </div>
        <div className="hidden items-center gap-3 text-[10px] text-faint md:flex">
          {Object.entries(RISK_COLOR).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="relative grid-dots" style={{ height: height || 440, background: '#0b1017' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.1" fill="#ffffff" opacity="0.05" />
            </pattern>
            <radialGradient id="hot1" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#ef2d3c" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef2d3c" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width={W} height={H} fill="url(#grid)" />

          <path d={routePath} fill="none" stroke="#22304a" strokeWidth="26" strokeLinecap="round" opacity="0.5" />
          <path d={routePath} fill="none" stroke="#2e425f" strokeWidth="10" strokeLinecap="round" strokeDasharray="3 10" style={{ animation: 'dash 1.2s linear infinite' }} />
          <path d={routePath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" opacity="0.35" />

          {zones?.map((z) => (
            <g key={z.id} transform={`translate(${proj.x(z.lng)} ${proj.y(z.lat)})`}>
              <circle r="16" fill="#2bd67b" opacity="0.12" />
              <circle r="5.5" fill="#2bd67b" stroke="#0b1017" strokeWidth="2" />
              <text y="-10" textAnchor="middle" fontSize="9" fill="#2bd67b" fontWeight="bold">
                {z.nombre}
              </text>
            </g>
          ))}

          {criticalAlert && (
            <g transform={`translate(${proj.x(criticalAlert.lng)} ${proj.y(criticalAlert.lat)})`}>
              <circle r="54" fill="url(#hot1)">
                <animate attributeName="r" values="30;60;30" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle r="9" fill="#ef2d3c" stroke="#fff" strokeWidth="2">
                <animate attributeName="r" values="7;11;7" dur="1s" repeatCount="indefinite" />
              </circle>
              <text y="-16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ff4d5a">¡SOS!</text>
            </g>
          )}

          {cities.map((c) => (
            <g key={c.name} transform={`translate(${proj.x(c.lng)} ${proj.y(c.lat)})`}>
              <circle r="4" fill="#44536c" />
              <text y="-8" textAnchor="middle" fontSize="9" fill="#8794aa">{c.name}</text>
            </g>
          ))}

          {vehicles?.map((v) => {
            const c = RISK_COLOR[v.riesgo] || '#93a0b4';
            return (
              <g key={v.id} transform={`translate(${proj.x(v.lng)} ${proj.y(v.lat)})`}>
                {v.riesgo === 'CRITICO' && <circle r="22" fill={c} opacity="0.15"><animate attributeName="r" values="16;30;16" dur="1.4s" repeatCount="indefinite" /></circle>}
                <circle r="8" fill={c} stroke="#0b1017" strokeWidth="2" style={v.riesgo === 'CRITICO' ? { filter: `drop-shadow(0 0 6px ${c})` } : {}} />
                <rect x="-30" y="12" width="60" height="14" rx="7" fill="#141a24" stroke="#262f3e" />
                <text y="22.5" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#e8edf4">{v.codigo}</text>
              </g>
            );
          })}
        </svg>

        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border border-border bg-surface/90 px-3 py-2 text-[11px] text-muted backdrop-blur">
          <Crosshair size={13} className="text-info" />
          {vehicles?.length || 0} unidades visibles · {summary?.alertas_activas ?? 0} alerta(s) activa(s)
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface/90 px-3 py-2 text-[11px] font-semibold text-success backdrop-blur">
          <Navigation size={13} /> GPS SAT
        </div>
      </div>
    </div>
  );
}