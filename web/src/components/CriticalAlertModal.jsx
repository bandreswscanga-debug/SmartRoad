import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Siren, MapPin, PhoneCall, CheckCheck, Navigation, ShieldCheck, X, Truck, User } from 'lucide-react';
import { api } from '../api/client';
import { RISK_COLOR, timeAgo, fmtClock } from '../utils/format';
import { Semaphore } from './ui';

export default function CriticalAlertModal({ alert }) {
  const { actionAlert, dismissCritical, config, pushToast } = useApp();
  const [zones, setZones] = useState(null);
  const [busy, setBusy] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    setZones(null);
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [alert]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => (document.body.style.overflow = '');
  }, []);

  const loadZones = async () => {
    try {
      const { zonas } = await api.safeZonesNear(alert.lat, alert.lng);
      setZones(zonas);
    } catch {
      setZones([]);
    }
  };

  const run = async (accion, meta) => {
    setBusy(accion);
    try {
      await actionAlert(alert.id, accion, meta);
      if (accion === 'EMERGENCIA_LLAMADA') {
        window.open(`tel:${config?.numero_emergencia || '123'}`, '_self');
      }
    } catch (err) {
      pushToast(err?.message || 'No se pudo procesar la acción', 'critical');
    } finally {
      setBusy(null);
    }
  };

  const elapsed = useMemo(() => {
    const ts = alert.timestamp ? Date.parse(alert.timestamp) : Date.now();
    return Math.max(0, Math.floor((Date.now() - ts) / 1000));
  }, [alert.timestamp]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        style={{ animation: 'shake 0.5s ease-in-out 3' }}
        onClick={dismissCritical}
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-danger/60 bg-surface shadow-[0_0_80px_rgba(239,45,60,0.35)] animate-rise">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-danger via-danger-bright to-danger" />

        <div className="flex items-center justify-between gap-4 border-b border-border bg-danger/10 px-6 py-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger text-white animate-pulse-ring">
              <Siren size={26} />
            </span>
            <div>
              <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-danger-bright">
                Alerta crítica
                <span className="rounded bg-danger/20 px-2 py-0.5 text-[10px] font-bold text-danger-bright">SIN REACCIÓN DEL CONDUCTOR</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {alert.tipo?.replaceAll('_', ' ')} · {timeAgo(alert.timestamp)} · {fmtClock(alert.timestamp)}
              </p>
            </div>
          </div>
          <button onClick={dismissCritical} className="text-faint transition-colors hover:text-white" title="Minimizar">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <InfoCell icon={Truck} label="Vehículo" value={alert.vehiculo_codigo} />
              <InfoCell icon={User} label="Conductor" value={alert.conductor_nombre || 'Sin asignar'} />
              <InfoCell icon={MapPin} label="Ruta" value={alert.ruta || 'N/D'} />
              <InfoCell
                icon={MapPin}
                label="Posición GPS"
                value={`${Number(alert.lat).toFixed(4)}, ${Number(alert.lng).toFixed(4)}`}
                mono
              />
            </div>

            <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-danger-bright">Descripción del evento</p>
              <p className="mt-2 text-sm leading-relaxed text-text">{alert.descripcion}</p>
            </div>

            <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Indicador de riesgo (RF8)</p>
                <Semaphore riesgo={alert.riesgo} />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-black tabular" style={{ color: RISK_COLOR[alert.riesgo] }}>
                  {elapsed}s
                </span>
                <span className="text-xs text-muted">sin respuesta del conductor</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 self-start rounded-xl border border-border-soft bg-surface-2 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Nivel de riesgo</p>
            <span
              className="text-3xl font-black uppercase tracking-wider"
              style={{ color: RISK_COLOR[alert.riesgo] }}
            >
              {alert.riesgo}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-success">
              <ShieldCheck size={14} /> Respuesta ≤ 2 s (RNF1)
            </span>
          </div>
        </div>

        {zones && (
          <div className="mx-6 mb-2 rounded-xl border border-success/30 bg-success/5 p-4 animate-rise">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-success">
              <Navigation size={14} /> Zonas seguras cerca del vehículo
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {zones.length === 0 && <p className="text-xs text-muted">No se encontraron zonas cercanas.</p>}
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => run('ZONA_SEGURA', z.nombre)}
                  disabled={busy}
                  className="rounded-lg border border-success/25 bg-surface px-3 py-3 text-left transition-all hover:border-success hover:bg-success/10"
                >
                  <p className="text-xs font-bold text-text">{z.nombre}</p>
                  <p className="mt-1 text-[11px] font-semibold text-success tabular">{z.distancia_km} km</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-border p-6">
          <button className="btn-success flex-1 min-w-[180px]" onClick={() => run('CONFIRMADA')} disabled={busy === 'CONFIRMADA'}>
            <CheckCheck size={17} />
            {busy === 'CONFIRMADA' ? 'Confirmando…' : 'Confirmar atención'}
          </button>
          <button
            className="btn-success flex-1 min-w-[180px] !bg-warning !text-black hover:!brightness-110"
            onClick={zones ? () => setZones(null) : loadZones}
            disabled={busy}
          >
            <Navigation size={17} />
            {zones ? 'Ocultar zonas' : 'Buscar zona segura'}
          </button>
          <button className="btn-primary flex-1 min-w-[180px]" onClick={() => run('EMERGENCIA_LLAMADA')} disabled={busy === 'EMERGENCIA_LLAMADA'}>
            <PhoneCall size={17} />
            {busy === 'EMERGENCIA_LLAMADA' ? 'Llamando…' : 'Llamar emergencia'}
          </button>
        </div>
        <p className="bg-surface-2 px-6 py-3 text-[11px] text-faint">
          Alerta emitida por el sistema SmartRoad S.O.S (RF4). La alarma sonora del dispositivo permanece activa hasta confirmar reacción del conductor (RF3).
        </p>
      </div>
    </div>
  );
}

function InfoCell({ icon: Icon, label, value, mono }) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface-2 p-3.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-faint">
        <Icon size={12} /> {label}
      </p>
      <p className={`mt-1.5 truncate text-sm font-bold ${mono ? 'font-mono tabular' : ''}`}>{value}</p>
    </div>
  );
}