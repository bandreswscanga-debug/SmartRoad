import { useMemo } from 'react';
import { RISK_COLOR, fmtClock } from '../utils/format';

const W = 640;
const H = 260;
const P = { l: 44, r: 14, t: 18, b: 30 };

export default function FatigueChart({ series }) {
  const data = useMemo(() => {
    if (!series || !series.length) return null;
    const pts = series.map((p) => ({ t: new Date(p.t), nivel: Number(p.nivel) || 0 }));
    const minT = pts[0].t.getTime();
    const maxT = pts[pts.length - 1].t.getTime();
    const maxN = 100;
    const xs = (t) => P.l + ((t - minT) / Math.max(1, maxT - minT)) * (W - P.l - P.r);
    const ys = (n) => P.t + ((maxN - n) / maxN) * (H - P.t - P.b);
    return { pts, xs, ys };
  }, [series]);

  if (!data) {
    return (
      <div className="card p-5">
        <p className="section-title mb-3">Gráfico de fatiga</p>
        <div className="flex h-[220px] items-center justify-center text-xs text-faint">Sin datos</div>
      </div>
    );
  }

  const line = data.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${data.xs(p.t).toFixed(1)},${data.ys(p.nivel).toFixed(1)}`).join(' ');
  const area = `${line} L${data.xs(data.pts[data.pts.length - 1].t).toFixed(1)},${(H - P.b).toFixed(1)} L${data.xs(data.pts[0].t).toFixed(1)},${(H - P.b).toFixed(1)} Z`;
  const latest = data.pts[data.pts.length - 1];
  const color = latest.nivel >= 80 ? '#ef2d3c' : latest.nivel >= 50 ? '#f5b92e' : '#2bd67b';
  const gradId = 'fg-grad';

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="section-title">Gráfico de fatiga · flota</p>
        <div className="flex items-center gap-3 text-[10px] text-faint">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Normal</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Alerta</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" /> Peligro</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 20, 40, 60, 80, 100].map((n) => {
          const y = data.ys(n);
          const isT = n === 50 || n === 80;
          return (
            <g key={n}>
              <line x1={P.l} x2={W - P.r} y1={y} y2={y} stroke={isT ? (n === 80 ? '#ef2d3c66' : '#f5b92e55') : '#1d2636'} strokeDasharray={isT ? '5 5' : undefined} />
              <text x={P.l - 7} y={y + 3} textAnchor="end" fontSize="9" fill={isT ? (n === 80 ? '#ef2d3c' : '#f5b92e') : '#5d6b80'} className="tabular">
                {n}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {data.pts.map((p, i) => {
          if (p.nivel >= 80) {
            return (
              <circle key={i} cx={data.xs(p.t)} cy={data.ys(p.nivel)} r="4.5" fill="#ef2d3c" opacity="0.9">
                <animate attributeName="r" values="3;6;3" dur="1.6s" repeatCount="indefinite" />
              </circle>
            );
          }
          return null;
        })}

        <circle cx={data.xs(latest.t)} cy={data.ys(latest.nivel)} r="5" fill={color} stroke="#0f131b" strokeWidth="2.5">
          <animate attributeName="r" values="4;7;4" dur="1.8s" repeatCount="indefinite" />
        </circle>

        <text x={W - P.r} y={H - 10} textAnchor="end" fontSize="9" fill="#5d6b80">
          {fmtClock(new Date(data.pts[0].t).toISOString())} → {fmtClock(new Date(data.pts[data.pts.length - 1].t).toISOString())}
        </text>
      </svg>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-border-soft bg-surface-2 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Fatiga actual ponderada</p>
          <p className="mt-1 text-2xl font-black tabular" style={{ color }}>
            {latest.nivel}
            <span className="text-sm font-bold text-muted"> % </span>
            <span className="text-xs font-semibold" style={{ color }}>{latest.nivel >= 80 ? '· riesgo crítico' : latest.nivel >= 50 ? '· sugerir pausa (RF9)' : '· condición normal'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}