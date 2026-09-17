import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { Truck, Users, BellRing, Activity, AlertTriangle, ShieldCheck, ArrowRight, AlertOctagon, Radar, MapPin, Navigation } from 'lucide-react';
import { StatCard, Semaphore, RiskBadge, Spinner } from '../components/ui';
import LiveCamera from '../components/LiveCamera';
import FatigueChart from '../components/FatigueChart';
import RouteMap from '../components/RouteMap';
import { Link } from 'react-router-dom';
import { EVENT_LABEL, timeAgo, fmtClock, RISK_COLOR, RISK_LABEL } from '../utils/format';

export default function Dashboard() {
  const { summary, vehicles, activeAlerts, refreshAll, user } = useApp();
  const [fatigue, setFatigue] = useState(null);
  const [zones, setZones] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.fatigue(24), api.safeZonesNear(4.7031, -74.1292), api.recentAlerts()])
      .then(([f, z, r]) => {
        if (!mounted) return;
        setFatigue(f.series);
        setZones(z.zonas);
        setRecent(r.alerts);
      })
      .catch(() => {});
    const id = setInterval(refreshAll, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [refreshAll]);

  const focus = vehicles.find((v) => v.riesgo === 'CRITICO') || vehicles[0];

  const riskDist = useMemo(() => {
    const d = { BAJO: 0, MEDIO: 0, CRITICO: 0 };
    vehicles.forEach((v) => (d[v.riesgo] = (d[v.riesgo] || 0) + 1));
    return d;
  }, [vehicles]);

  const totalVehicles = vehicles.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Bienvenido, <span className="font-bold text-text">{user?.nombre || 'operador'}</span></p>
          <p className="text-xs text-faint">Supervisión en tiempo real de la flotilla · SmartRoad S.O.S</p>
        </div>
        {activeAlerts.length > 0 ? (
          <span className="flex items-center gap-2 rounded-lg border border-danger/50 bg-danger/15 px-4 py-2 text-xs font-bold text-danger-bright animate-pulse-ring">
            <AlertOctagon size={16} /> {activeAlerts.length} alerta(s) crítica(s) sin atender
          </span>
        ) : (
          <span className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-2 text-xs font-bold text-success">
            <ShieldCheck size={16} /> Sistema operando con normalidad
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Truck} label="Vehículos" value={summary?.vehiculos ?? '—'} sub={`${summary?.vehiculos_activos ?? 0} en movimiento`} tone="info" />
        <StatCard icon={Users} label="Conductores" value={summary?.conductores ?? '—'} sub="monitoreo activo (RF7)" tone="success" />
        <StatCard
          icon={activeAlerts.length ? AlertTriangle : BellRing}
          label="Alertas activas"
          value={summary?.alertas_activas ?? '—'}
          sub={summary?.alertas_activas ? 'requieren atención' : 'sin alertas críticas'}
          tone={activeAlerts.length ? 'danger' : 'success'}
        />
        <StatCard icon={Activity} label="Eventos 24 h" value={summary?.eventos_24h ?? '—'} sub="anomalías y señales registradas (RF10)" tone="warning" />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center rounded-2xl border border-border bg-surface p-4 card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <span className="led led-on" style={{ color: '#ef2d3c', background: '#ef2d3c', width: 16, height: 16 }} />
            <span className="led" style={{ color: '#f5b92e' }} />
            <span className="led" style={{ color: '#2bd67b' }} />
          </div>
          <p className="text-xs">
            <span className="font-bold text-text">Módulo de riesgo activo (RF8):</span>{' '}
            <span className="text-muted">semáforo verde/amarillo/rojo según estado del conductor. </span>
            <span className="text-success">Normal</span>
            <span className="text-muted"> · </span>
            <span className="text-warning">Alerta (sugiere pausa, RF9)</span>
            <span className="text-muted"> · </span>
            <span className="text-danger-bright">Peligro (SOS, RF4)</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Semaphore riesgo={activeAlerts.length ? 'CRITICO' : 'BAJO'} />
          <Link to="/monitoreo" className="btn-ghost px-3 py-2 text-xs">
            <Radar size={14} /> Monitoreo
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <LiveCamera vehicle={focus} height={340} />
          <RouteMap vehicles={vehicles} zones={zones} height={420} />
        </div>

        <div className="space-y-6">
          <FatigueChart series={fatigue} />

          {totalVehicles > 0 && (
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="section-title">Distribución de riesgo de flota</p>
                <RiskBadge riesgo={activeAlerts.length ? 'CRITICO' : 'BAJO'} small />
              </div>
              <div className="flex items-center gap-6">
                <RiskDonut data={riskDist} total={totalVehicles} />
                <div className="flex-1 space-y-2.5">
                  {['CRITICO', 'MEDIO', 'BAJO'].map((k) => (
                    <div key={k} className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK_COLOR[k] }} />
                      <span className="flex-1 text-xs text-muted">{RISK_LABEL[k]}</span>
                      <span className="font-mono text-xs font-bold text-text tabular">{riskDist[k] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="section-title">Zonas seguras cercanas (RF9)</p>
              <Navigation size={14} className="text-success" />
            </div>
            <div className="space-y-2">
              {zones.length === 0 && <p className="py-6 text-center text-xs text-faint">Calculando distancia…</p>}
              {zones.slice(0, 4).map((z) => (
                <div key={z.id} className="flex items-center justify-between rounded-lg border border-border-soft bg-surface-2 px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-[11px] text-muted">
                    <MapPin size={12} className="text-success" /> {z.nombre}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-success tabular">{z.distancia_km} km</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="section-title">Últimas alertas</p>
              <Link to="/alertas" className="flex items-center gap-1 text-[11px] font-semibold text-info hover:underline">
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-2.5">
              {recent.length === 0 && <p className="py-8 text-center text-xs text-faint">Sin alertas recientes</p>}
              {recent.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border-soft bg-surface-2 p-3.5 transition-colors hover:bg-surface-3/50">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ color: RISK_COLOR[a.riesgo], background: `${RISK_COLOR[a.riesgo]}14` }}
                  >
                    {a.riesgo === 'CRITICO' ? <AlertOctagon size={16} /> : <BellRing size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold">{EVENT_LABEL[a.tipo] || a.tipo}</p>
                      <RiskBadge riesgo={a.riesgo} small />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {a.vehiculo_codigo} · {a.conductor_nombre} · {a.estado === 'ACTIVA' ? <span className="text-danger-bright font-semibold">ACTIVA</span> : a.accion || 'atendida'}
                    </p>
                    <p className="mt-1 text-[10px] text-faint">{timeAgo(a.timestamp)} · {fmtClock(a.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!summary && <Spinner label="Cargando panel…" />}
    </div>
  );
}

function RiskDonut({ data, total }) {
  const colors = { BAJO: '#2bd67b', MEDIO: '#f5b92e', CRITICO: '#ef2d3c' };
  const keys = ['CRITICO', 'MEDIO', 'BAJO'].filter((k) => data[k] > 0);
  let acc = 0;
  const stops = keys.map((k) => {
    const from = (acc / Math.max(1, total)) * 100;
    acc += data[k];
    const to = (acc / Math.max(1, total)) * 100;
    return `${colors[k]} ${from}% ${to}%`;
  });

  return (
    <div className="relative h-36 w-36 shrink-0">
      <div
        className="h-36 w-36 rounded-full"
        style={{
          background: stops.length ? `conic-gradient(${stops.join(', ')})` : `conic-gradient(#2bd67b 0 100%)`,
          boxShadow: `0 0 0 8px var(--color-surface-2), inset 0 0 0 1px var(--color-border)`
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full">
        <span className="text-3xl font-black tabular" style={{ textShadow: `0 0 18px ${data.CRITICO ? '#ef2d3c55' : 'transparent'}` }}>
          {total}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-faint">vehículos</span>
      </div>
    </div>
  );
}