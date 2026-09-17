import { RISK_COLOR, RISK_LABEL } from '../utils/format';
import { Loader2 } from 'lucide-react';

export function RiskBadge({ riesgo, small }) {
  const color = RISK_COLOR[riesgo] || '#93a0b4';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide border ${
        small ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'
      }`}
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {RISK_LABEL[riesgo] || riesgo}
    </span>
  );
}

export function Semaphore({ riesgo, size = 14 }) {
  const levels = ['BAJO', 'MEDIO', 'CRITICO'];
  const colors = { BAJO: '#2bd67b', MEDIO: '#f5b92e', CRITICO: '#ef2d3c' };
  const active = levels.indexOf(riesgo);
  return (
    <div className="flex items-center gap-2">
      {levels.map((lv, i) => (
        <span
          key={lv}
          className={i === active ? 'led led-on' : 'led'}
          style={{ color: colors[lv], background: i === active ? colors[lv] : 'transparent', width: size, height: size }}
        />
      ))}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'text', widgets }) {
  const accent = tone === 'danger' ? '#ef2d3c' : tone === 'success' ? '#2bd67b' : tone === 'warning' ? '#f5b92e' : '#4aa8ff';
  return (
    <div className="card card-hover p-5 flex flex-col gap-3 animate-rise relative overflow-hidden group">
      <div
        className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-[0.09] transition-transform duration-500 group-hover:scale-150"
        style={{ background: accent }}
      />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}66, transparent)` }} />
      <div className="flex items-center justify-between">
        <p className="section-title">{label}</p>
        {Icon && (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-110"
            style={{
              color: accent,
              background: `${accent}12`,
              borderColor: `${accent}33`
            }}
          >
            <Icon size={18} />
          </span>
        )}
      </div>
      <div>
        <p
          className="text-[34px] font-black tabular leading-none"
          style={{ color: accent, textShadow: `0 0 22px ${accent}55` }}
        >
          {value}
        </p>
        {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
      </div>
      {widgets}
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="section-title">{children}</h3>
      {right}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted">
      <Loader2 size={26} className="animate-spin text-danger" />
      <p className="text-xs">{label || 'Cargando…'}</p>
    </div>
  );
}

export function Empty({ message }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-2 text-faint">
      <p className="text-sm">{message || 'Sin datos'}</p>
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-success' : 'bg-surface-3'}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

export function Meter({ value, label, thresholds = [50, 80] }) {
  const color = value >= thresholds[1] ? '#ef2d3c' : value >= thresholds[0] ? '#f5b92e' : '#2bd67b';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted">{label}</span>
        <span className="font-bold tabular" style={{ color }}>
          {Math.round(value)}
          <span className="text-faint"> %</span>
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color, boxShadow: `0 0 8px ${color}88` }}
        />
        {thresholds.map((t) => (
          <span key={t} className="absolute inset-y-0 w-px bg-white/30" style={{ left: `${t}%` }} />
        ))}
      </div>
    </div>
  );
}