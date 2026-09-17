import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { BellRing, Siren, CheckCheck, Navigation, PhoneCall, Truck, MapPin, Clock3 } from 'lucide-react';
import { RiskBadge, Spinner, Empty, Semaphore } from '../components/ui';
import { EVENT_LABEL, timeAgo, fmtClock, RISK_COLOR } from '../utils/format';

export default function Alertas() {
  const { actionAlert, pushToast, config } = useApp();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState({});

  const load = async () => {
    try {
      const { alerts } = await api.alerts();
      setAlerts(alerts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, []);

  const fetchZones = async (id, lat, lng) => {
    if (zones[id]) return;
    try {
      const { zonas } = await api.safeZonesNear(lat, lng);
      setZones((prev) => ({ ...prev, [id]: zonas }));
    } catch {
      /* ignore */
    }
  };

  const run = async (alert, accion, meta) => {
    try {
      await actionAlert(alert.id, accion, meta);
      if (accion === 'EMERGENCIA_LLAMADA') {
        window.open(`tel:${config?.numero_emergencia || '123'}`, '_self');
      }
      await load();
    } catch (err) {
      pushToast(err.message, 'critical');
    }
  };

  const active = alerts.filter((a) => a.estado === 'ACTIVA');

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-danger/60 bg-danger/10 p-5 animate-pulse-ring">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger text-white">
            <Siren size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-danger-bright">{active.length} alerta(s) crítica(s) en curso</p>
            <p className="text-xs text-muted">
              {active.map((a) => `${a.vehiculo_codigo} (${a.conductor_nombre})`).join(' · ')} — alarma del dispositivo activa hasta confirmar reacción (RF3).
            </p>
          </div>
          <Semaphore riesgo="CRITICO" size={18} />
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="border-b border-border px-5 py-4">
          <p className="section-title">Centro de alertas · historial de gestión</p>
        </div>
        {loading ? (
          <Spinner />
        ) : alerts.length === 0 ? (
          <Empty message="Sin alertas registradas" />
        ) : (
          <div className="divide-y divide-border-soft">
            {alerts.map((a) => (
              <div key={a.id} className={`p-5 ${a.estado === 'ACTIVA' ? 'bg-danger/[0.04]' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                      style={{
                        color: a.riesgo === 'CRITICO' ? '#ff4d5a' : '#f5b92e',
                        borderColor: `${RISK_COLOR[a.riesgo]}44`,
                        background: `${RISK_COLOR[a.riesgo]}12`
                      }}
                    >
                      <BellRing size={18} />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold">{EVENT_LABEL[a.tipo]}</p>
                        <RiskBadge riesgo={a.riesgo} small />
                        <EstadoTag estado={a.estado} />
                      </div>
                      <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">{a.descripcion}</p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
                        <span className="flex items-center gap-1"><Truck size={11} /> {a.vehiculo_codigo}</span>
                        <span className="flex items-center gap-1"><MapPin size={11} /> {a.ruta || 'N/D'}</span>
                        <span className="flex items-center gap-1"><Clock3 size={11} /> {timeAgo(a.timestamp)} · {fmtClock(a.timestamp)}</span>
                        <span className="tabular">lat {Number(a.lat).toFixed(4)}, lng {Number(a.lng).toFixed(4)}</span>
                      </p>
                      {a.accion_meta && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-[11px] font-semibold text-success">
                          <CheckCheck size={13} /> {a.accion_meta}
                        </p>
                      )}
                    </div>
                  </div>

                  {a.estado === 'ACTIVA' && (
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-success text-xs" onClick={() => run(a, 'CONFIRMADA')}>
                        <CheckCheck size={14} /> Confirmar
                      </button>
                      <button className="btn-success text-xs !bg-warning !text-black" onClick={() => fetchZones(a.id, a.lat, a.lng)}>
                        <Navigation size={14} /> Zona segura
                      </button>
                      <button className="btn-primary text-xs" onClick={() => run(a, 'EMERGENCIA_LLAMADA')}>
                        <PhoneCall size={14} /> Emergencia
                      </button>
                    </div>
                  )}
                </div>

                {zones[a.id] && (
                  <div className="mt-3 rounded-xl border border-success/30 bg-success/5 p-4 animate-rise">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-success">Zonas seguras sugeridas</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {zones[a.id].map((z) => (
                        <button
                          key={z.id}
                          onClick={() => run(a, 'ZONA_SEGURA', z.nombre)}
                          className="rounded-lg border border-success/25 bg-surface px-3 py-3 text-left hover:border-success hover:bg-success/10"
                        >
                          <p className="text-xs font-bold">{z.nombre}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-success tabular">{z.distancia_km} km</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EstadoTag({ estado }) {
  const map = {
    ACTIVA: ['Activa', 'border-danger/50 bg-danger/15 text-danger-bright'],
    GESTIONADA: ['Gestionada', 'border-success/40 bg-success/10 text-success'],
    EMERGENCIA: ['Emergencia', 'border-warning/60 bg-warning/10 text-warning']
  };
  const [label, cls] = map[estado] || [estado, 'border-border-soft bg-surface-2 text-muted'];
  return <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>{label}</span>;
}