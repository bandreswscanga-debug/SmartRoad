import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { Users, Phone, FileText, Coffee, Route, Clock3, Download } from 'lucide-react';
import { RiskBadge, Meter, Spinner, Empty } from '../components/ui';
import { fmtDate, toCsv, download } from '../utils/format';

export default function Conductores() {
  const { pushToast } = useApp();
  const [drivers, setDrivers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailData, setDetailData] = useState(null);

  useEffect(() => {
    api.drivers().then((d) => setDrivers(d.drivers)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!detail) return;
    setDetailData(null);
    api.driver(detail.id).then((d) => setDetailData(d)).catch(() => {});
  }, [detail]);

  useEffect(() => {
    const id = setInterval(() => {
      api.drivers().then((d) => setDrivers(d.drivers)).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const exportCsv = () => {
    download('smartroad-conductores.csv', toCsv(drivers, [
      { label: 'nombre', key: 'nombre' },
      { label: 'documento', key: 'documento' },
      { label: 'telefono', key: 'telefono' },
      { label: 'licencia', key: 'licencia' },
      { label: 'empresa', key: 'empresa' },
      { label: 'jornada_horas', key: 'jornada_horas' },
      { label: 'ultimo_descanso', key: 'ultimo_descanso' },
      { label: 'kilometros', key: 'kilometros' },
      { label: 'fatiga_actual', key: 'fatiga_actual' },
      { label: 'riesgo', key: 'riesgo' },
      { label: 'vehiculo', get: (r) => r.vehiculo?.codigo || 'Sin asignar' }
    ]));
  };

  return (
    <div className="space-y-6">
      <div className="card overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <p className="section-title">Seguimiento del estado de cada conductor (RF10)</p>
          {drivers.length > 0 && (
            <button onClick={exportCsv} className="btn-ghost text-xs">
              <Download size={14} /> Exportar CSV
            </button>
          )}
        </div>
        {drivers.length === 0 ? (
          <Empty />
        ) : (
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Documento</th>
                <th>Vehículo asignado</th>
                <th>Jornada</th>
                <th>Último descanso</th>
                <th>Kilómetros</th>
                <th>Índice de fatiga</th>
                <th>Riesgo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${d.fatiga_actual >= 80 ? 'border-danger/50 bg-danger/15 text-danger-bright' : d.fatiga_actual >= 50 ? 'border-warning/50 bg-warning/10 text-warning' : 'border-success/40 bg-success/10 text-success'}`}>
                        <Users size={16} />
                      </span>
                      <div>
                        <p className="text-xs font-bold">{d.nombre}</p>
                        <p className="text-[10px] text-faint">{d.empresa}</p>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-[11px] text-muted">{d.documento}</td>
                  <td>
                    <p className="text-xs font-bold">{d.vehiculo?.codigo || 'Sin asignar'}</p>
                    <p className="text-[10px] text-faint">{d.vehiculo?.riesgo ? `riesgo ${d.vehiculo.riesgo}` : '—'}</p>
                  </td>
                  <td className="text-xs tabular">{d.jornada_horas} h</td>
                  <td className="text-xs text-muted">{d.ultimo_descanso}</td>
                  <td className="text-xs tabular">{d.kilometros} km</td>
                  <td>
                    <div className="w-40"><Meter value={d.fatiga_actual} label="" /></div>
                  </td>
                  <td><RiskBadge riesgo={d.riesgo} small /></td>
                  <td>
                    <button onClick={() => setDetail(d)} className="text-[11px] font-bold text-info hover:underline">
                      Detalle →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="card w-full max-w-2xl p-6 animate-rise" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${detail.fatiga_actual >= 80 ? 'border-danger/50 bg-danger/15 text-danger-bright' : 'border-success/40 bg-success/10 text-success'}`}>
                  <Users size={26} />
                </span>
                <div>
                  <p className="text-lg font-black">{detail.nombre}</p>
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <Phone size={12} /> {detail.telefono} · <FileText size={12} /> Licencia {detail.licencia}
                  </p>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-faint hover:text-text">✕</button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-faint"><Clock3 size={12} /> Jornada actual</p>
                <p className="mt-1 text-2xl font-black tabular">{detailData && detailData.driver ? detailData.driver.jornada_horas : detail.jornada_horas} h</p>
              </div>
              <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-faint"><Coffee size={12} /> Último descanso</p>
                <p className="mt-1 text-2xl font-black tabular">{detail.ultimo_descanso}</p>
              </div>
              <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-faint"><Route size={12} /> Kilómetros recorridos</p>
                <p className="mt-1 text-2xl font-black tabular">{detail.kilometros} km</p>
              </div>
              <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-faint">Vehículo</p>
                <p className="mt-1 text-2xl font-black">{detail.vehiculo?.codigo || '—'}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border-soft bg-surface-2 p-4">
              <p className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-faint">
                Índice de fatiga en tiempo real
                <RiskBadge riesgo={detail.riesgo} small />
              </p>
              <Meter value={detail.fatiga_actual} label="Fatiga ponderada (PERCLOS, bostezos, inclinación)" />
              <p className="mt-3 text-[11px] text-faint">
                {detail.fatiga_actual >= 80
                  ? 'El sistema sugiere detener de inmediato y realizar una pausa (RF9). Posible activación de SOS (RF4).'
                  : detail.fatiga_actual >= 50
                    ? 'Riesgo medio: el sistema sugiere una pausa preventiva (RF9).'
                    : 'Conductor en condición normal de alerta.'}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] text-muted">
                Eventos registrados: <span className="font-bold text-text tabular">{detailData?.fatiga?.length || 0}</span>
              </div>
              {detailData?.fatiga?.slice(0, 5).map((e) => (
                <span key={e.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-[10px] text-muted">
                  {e.tipo?.replaceAll('_', ' ')} · {fmtDate(e.timestamp)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {!drivers.length && <Spinner label="Cargando conductores…" />}
    </div>
  );
}