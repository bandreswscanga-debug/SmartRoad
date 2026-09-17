import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { Truck, BatteryMedium, Satellite, Cpu, Zap, Navigation, Camera, Radio, Wifi, WifiOff } from 'lucide-react';
import { RiskBadge, Semaphore, Meter, Spinner } from '../components/ui';
import LiveCamera from '../components/LiveCamera';
import CameraDrowsiness from '../components/CameraDrowsiness';
import { timeAgo, fmtClock } from '../utils/format';

export default function Monitoreo() {
  const { vehicles, activeAlerts, connected } = useApp();
  const [selectedId, setSelectedId] = useState(null);
  const [telems, setTelems] = useState({});
  const [zones, setZones] = useState([]);

  const selected = useMemo(
    () => vehicles.find((v) => v.id === selectedId) || vehicles.find((v) => v.riesgo === 'CRITICO') || vehicles[0],
    [vehicles, selectedId]
  );

  useEffect(() => {
    if (!selected) return;
    const { id, lat, lng } = selected;
    setZones([]);
    let mounted = true;
    Promise.all([api.vehicle(id), api.safeZonesNear(lat, lng)])
      .then(([v, z]) => {
        if (!mounted) return;
        setTelems((prev) => ({ ...prev, [v.vehicle.id]: v.telemetry }));
        setZones(z.zonas);
      })
      .catch(() => {});
    const poll = setInterval(() => api.safeZonesNear(lat, lng).then((z) => mounted && setZones(z.zonas)).catch(() => {}), 15000);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  if (!vehicles.length) return <Spinner label="Conectando con la flotilla…" />;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <CameraDrowsiness />

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest ${
              connected ? 'border-success/40 bg-success/10 text-success' : 'border-warning/40 bg-warning/10 text-warning'
            }`}
          >
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? 'Flotilla en tiempo real' : 'Flotilla · esperando tiempo real'}
          </span>
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                selected?.id === v.id
                  ? 'border-danger/50 bg-danger/15 text-danger-bright'
                  : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-text'
              }`}
            >
              {v.codigo}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {vehicles.map((v) => {
            const t = telems[v.id];
            const active = v.riesgo === 'CRITICO';
            return (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`card p-4 text-left transition-all hover:border-border/70 ${
                  active ? 'border-danger/60 hover:border-danger animate-pulse-ring' : ''
                } ${selected?.id === v.id ? 'ring-2 ring-danger/40' : ''} animate-rise`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${active ? 'border-danger/50 bg-danger/15 text-danger-bright' : 'border-border bg-surface-2 text-info'}`}>
                      <Truck size={17} />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold leading-tight">{v.codigo}</p>
                      <p className="text-[10px] uppercase tracking-wider text-faint">{v.tipo} · {v.placa}</p>
                    </div>
                  </div>
                  <Semaphore riesgo={v.riesgo} />
                </div>

                <div className="mb-3 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-muted">{v.conductor_nombre}</span>
                  <RiskBadge riesgo={v.riesgo} small />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <Metric icon={Zap} label="Velocidad" value={`${v.velocidad} km/h`} />
                  <Metric icon={Satellite} label="GPS" value={`${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`} />
                  <Metric icon={BatteryMedium} label="Batería ESP32" value={`${t?.bateria ?? v.bateria}%`} />
                  <Metric icon={Radio} label="Última señal" value={timeAgo(v.ultima_actividad)} />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-2.5 text-[10px] font-bold uppercase tracking-widest">
                  <span className={v.estado === 'MOVIENDO' ? 'text-success' : 'text-warning'}>
                    {v.estado === 'MOVIENDO' ? '● En movimiento' : '● Detenido'}
                  </span>
                  <span className="text-faint">{v.ruta}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="card space-y-5 p-5 animate-rise self-start xl:sticky xl:top-20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black">{selected.codigo} <span className="text-sm font-bold text-faint">· {selected.placa}</span></p>
              <p className="text-xs text-muted">{selected.nombre} · {selected.conductor_nombre}</p>
              <p className="mt-0.5 text-[11px] text-faint">{selected.ruta} · actualizado {timeAgo(selected.ultima_actividad)}</p>
            </div>
            <RiskBadge riesgo={selected.riesgo} />
          </div>

          <LiveCamera vehicle={selected} height={220} />

          <div className="grid grid-cols-3 gap-2 text-center">
            <TinyStat label="FPS" value={telems[selected.id]?.fps ?? '—'} />
            <TinyStat label="Satélites" value={telems[selected.id]?.senal_gps ?? '—'} />
            <TinyStat label="Latencia" value={`${telems[selected.id]?.latencia_ms ?? '—'} ms`} />
          </div>

          <div className="space-y-4 border-t border-border-soft pt-4">
            <Meter value={selected.bateria} label="Carga del dispositivo" />
            <Meter value={fatigueFor(selected.riesgo)} label="Índice de fatiga estimado" thresholds={[50, 80]} />
          </div>

          <div className="rounded-xl border border-border-soft bg-surface-2 p-3.5">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-success">
              <Navigation size={12} /> Zonas seguras cercanas
            </p>
            <div className="mt-2.5 space-y-1.5">
              {zones.slice(0, 3).map((z) => (
                <div key={z.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">{z.nombre}</span>
                  <span className="font-bold text-success tabular">{z.distancia_km} km</span>
                </div>
              ))}
              {!zones.length && <p className="text-[11px] text-faint">Calculando distancia…</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[11px] text-muted">
            <Camera size={14} className="text-info" /> Monitoreo constante del conductor (RF7) · cámara operativa.
          </div>

          {activeAlerts.filter((a) => a.vehiculo_id === selected.id).length > 0 && (
            <p className="rounded-lg border border-danger/50 bg-danger/15 px-3 py-2.5 text-[11px] font-bold text-danger-bright">
              ¡Este vehículo tiene una alerta crítica activa!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function fatigueFor(riesgo) {
  const map = { CRITICO: 86, MEDIO: 62, BAJO: 24 };
  return map[riesgo] ?? 40;
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

function TinyStat({ label, value }) {
  return (
    <div className="rounded-lg border border-border-soft bg-surface-2 px-2 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-faint">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-bold text-text tabular">{value}</p>
    </div>
  );
}