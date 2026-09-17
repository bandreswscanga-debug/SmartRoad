import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { Download, TrendingDown, AlertTriangle, Clock3, CalendarRange } from 'lucide-react';
import { StatCard, Spinner, Empty } from '../components/ui';
import FatigueChart from '../components/FatigueChart';
import { toCsv, download, EVENT_LABEL, RISK_COLOR, timeAgo } from '../utils/format';

const DONUT_COLORS = ['#ff4d5a', '#f5b92e', '#4aa8ff', '#a78bfa', '#2bd67b', '#ef2d3c'];

export default function Reportes() {
  const { vehicles } = useApp();
  const [hours, setHours] = useState(24);
  const [fatigue, setFatigue] = useState(null);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.fatigue(hours), api.events(), api.alerts()])
      .then(([f, ev, al]) => {
        if (!mounted) return;
        setFatigue(f.series);
        setEvents(ev.events);
        setAlerts(al.alerts);
      })
      .catch(() => {});
    return () => (mounted = false);
  }, [hours]);

  const dist = useMemo(() => {
    const d = {};
    events.forEach((e) => (d[e.tipo] = (d[e.tipo] || 0) + 1));
    return Object.entries(d).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const riskDist = useMemo(() => {
    const d = { CRITICO: 0, MEDIO: 0, BAJO: 0 };
    events.forEach((e) => (d[e.riesgo] = (d[e.riesgo] || 0) + 1));
    return d;
  }, [events]);

  const driverLoad = useMemo(() => {
    const byConductor = {};
    events.forEach((e) => {
      const key = e.conductor_nombre || 'Sin asignar';
      byConductor[key] = byConductor[key] || { eventos: 0, criticos: 0 };
      byConductor[key].eventos += 1;
      if (e.riesgo === 'CRITICO') byConductor[key].criticos += 1;
    });
    return Object.entries(byConductor).sort((a, b) => b[1].eventos - a[1].eventos);
  }, [events]);

  const exportReport = () => {
    download('smartroad-reporte.csv', toCsv(events, [
      { label: 'fecha', key: 'timestamp' },
      { label: 'tipo', get: (r) => EVENT_LABEL[r.tipo] || r.tipo },
      { label: 'riesgo', key: 'riesgo' },
      { label: 'vehiculo', key: 'vehiculo_codigo' },
      { label: 'conductor', key: 'conductor_nombre' },
      { label: 'respuesta_ms', key: 'respuesta_ms' }
    ]));
  };

  const detect = vehicles.filter((v) => v.riesgo === 'CRITICO').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={AlertTriangle} label="Anomalías 24 h" value={events.length} sub="micro sueños, fatiga, distracción" tone="danger" />
        <StatCard icon={TrendingDown} label="En riesgo crítico" value={detect} sub="vehículos requieren pausa (RF9)" tone={detect ? 'danger' : 'success'} />
        <StatCard icon={Clock3} label="Tiempo resp." value={respLabel(events)} sub="vs. máximo 2 s (RNF1)" />
        <StatCard icon={CalendarRange} label="Alertas gestionadas" value={alerts.filter((a) => a.estado !== 'ACTIVA').length} sub={`${alerts.filter((a) => a.estado === 'ACTIVA').length} activas`} />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="section-title">Tendencia de fatiga de la flotilla</p>
          <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
            {[6, 12, 24, 48].map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`rounded-md px-3 py-1.5 text-[11px] font-bold ${hours === h ? 'bg-surface-3 text-danger-bright' : 'text-faint hover:text-text'}`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
        <FatigueChart series={fatigue} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <p className="section-title mb-4">Distribución por tipo de evento</p>
          {dist.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex items-center gap-6">
              <Donut data={dist} />
              <div className="flex-1 space-y-2.5">
                {dist.map(([k, n], i) => (
                  <div key={k} className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="flex-1 text-xs text-muted">{EVENT_LABEL[k]}</span>
                    <span className="font-mono text-xs font-bold text-text tabular">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <p className="section-title mb-4">Riesgo de eventos registrados</p>
          <div className="space-y-4">
            {Object.entries(riskDist).map(([k, n]) => (
              <div key={k}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-bold" style={{ color: RISK_COLOR[k] }}>{k}</span>
                  <span className="text-muted tabular">{n} eventos</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${events.length ? (n / events.length) * 100 : 0}%`, background: RISK_COLOR[k] }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            <p className="section-title">Carga por conductor</p>
            {driverLoad.map(([name, d]) => (
              <div key={name} className="flex items-center justify-between rounded-lg border border-border-soft bg-surface-2 px-3.5 py-2.5 text-xs">
                <span className="text-muted">{name}</span>
                <span className="text-text tabular">{d.eventos} eventos · <span className={d.criticos ? 'text-danger-bright font-bold' : 'text-success'}>{d.criticos} críticos</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="section-title">Eventos recientes para el reporte</p>
          <button onClick={exportReport} className="btn-ghost text-xs">
            <Download size={14} /> Descargar reporte
          </button>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {events.length === 0 ? (
            <Empty />
          ) : (
            <table className="data-table min-w-[640px]">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Riesgo</th><th>Vehículo</th><th>Conductor</th><th>Respuesta</th></tr></thead>
              <tbody>
                {events.slice(0, 25).map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2/60">
                    <td className="whitespace-nowrap text-[11px] text-muted">{timeAgo(e.timestamp)}</td>
                    <td className="text-xs font-bold">{EVENT_LABEL[e.tipo]}</td>
                    <td><span className="font-mono text-[11px]" style={{ color: RISK_COLOR[e.riesgo] }}>{e.riesgo}</span></td>
                    <td className="text-xs">{e.vehiculo_codigo}</td>
                    <td className="text-xs text-muted">{e.conductor_nombre}</td>
                    <td className="font-mono text-[11px] text-muted tabular">{e.respuesta_ms ? `${e.respuesta_ms} ms` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {!events.length && !fatigue && <Spinner label="Generando analítica…" />}
    </div>
  );
}

function respLabel(events) {
  const withMs = events.filter((e) => e.respuesta_ms && e.respuesta_ms > 0);
  if (!withMs.length) return '—';
  const avg = Math.round(withMs.reduce((a, e) => a + e.respuesta_ms, 0) / withMs.length);
  return `${avg} ms`;
}

function Donut({ data }) {
  const total = data.reduce((a, [, n]) => a + n, 0) || 1;
  let acc = 0;
  const stops = data.map(([, n], i) => {
    const from = (acc / total) * 100;
    acc += n;
    const to = (acc / total) * 100;
    return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${from}% ${to}%`;
  });
  return (
    <div className="relative h-40 w-40 shrink-0">
      <div
        className="h-40 w-40 rounded-full"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular">{total}</span>
        <span className="text-[10px] uppercase tracking-widest text-faint">eventos</span>
      </div>
    </div>
  );
}