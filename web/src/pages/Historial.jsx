import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { Search, Download, CheckCheck, Filter, Eye, EyeOff, AlertTriangle, BellRing, Hourglass, Siren, Car } from 'lucide-react';
import { RiskBadge, Spinner, Empty } from '../components/ui';
import { EVENT_LABEL, timeAgo, fmtDate, toCsv, download } from '../utils/format';

const ICON_MAP = { MICRO_SUENO: Eye, SOMNOLENCIA_ALTA: AlertTriangle, FATIGA_PROLONGADA: Hourglass, DISTRACCION: EyeOff, SOS: Siren, ACCIDENTE: Car };

export default function Historial() {
  const { pushToast, user } = useApp();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ tipo: '', riesgo: '', search: '' });
  const [mode, setMode] = useState('all');

  const load = async (f) => {
    setLoading(true);
    try {
      const params = { ...f };
      if (mode === 'anomalias') params.solo_anomalias = 'true';
      if (!params.tipo) delete params.tipo;
      if (!params.riesgo) delete params.riesgo;
      const { events, total } = await api.events(params);
      setEvents(events);
      setTotal(total);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const f = { ...filters };
    if (!f.search) delete f.search;
    load(f);
  }, [filters.tipo, filters.riesgo, mode]);

  const filtered = useMemo(() => {
    if (!filters.search) return events;
    const q = filters.search.toLowerCase();
    return events.filter(
      (e) =>
        (e.vehiculo_codigo || '').toLowerCase().includes(q) ||
        (e.conductor_nombre || '').toLowerCase().includes(q) ||
        (e.descripcion || '').toLowerCase().includes(q)
    );
  }, [events, filters.search]);

  const ack = async (e) => {
    try {
      await api.ackEvent(e.id, user?.nombre);
      pushToast(`Evento ${e.id} marcado como atendido`, 'success');
      load(filters);
    } catch (err) {
      pushToast(err.message, 'critical');
    }
  };

  const exportCsv = () => {
    download('smartroad-eventos.csv', toCsv(filtered, [
      { label: 'id', key: 'id' },
      { label: 'fecha', key: 'timestamp' },
      { label: 'tipo', get: (r) => EVENT_LABEL[r.tipo] || r.tipo },
      { label: 'riesgo', key: 'riesgo' },
      { label: 'vehiculo', key: 'vehiculo_codigo' },
      { label: 'conductor', key: 'conductor_nombre' },
      { label: 'velocidad_kmh', key: 'velocidad' },
      { label: 'lat', key: 'lat' },
      { label: 'lng', key: 'lng' },
      { label: 'respuesta_ms', key: 'respuesta_ms' },
      { label: 'atendido', key: 'atendido' },
      { label: 'descripcion', key: 'descripcion' }
    ]));
  };

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              className="field pl-9"
              placeholder="Buscar por vehículo, conductor o descripción…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>

          <select className="field w-auto" value={filters.tipo} onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value }))}>
            <option value="">Todos los tipos (RF10)</option>
            {Object.entries(EVENT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select className="field w-auto" value={filters.riesgo} onChange={(e) => setFilters((f) => ({ ...f, riesgo: e.target.value }))}>
            <option value="">Todos los niveles</option>
            <option value="CRITICO">Crítico</option>
            <option value="MEDIO">Medio</option>
            <option value="BAJO">Bajo</option>
          </select>

          <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
            <button
              onClick={() => setMode('all')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold ${mode === 'all' ? 'bg-surface-3 text-text' : 'text-faint hover:text-text'}`}
            >
              <Filter size={12} /> Todos
            </button>
            <button
              onClick={() => setMode('anomalias')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold ${mode === 'anomalias' ? 'bg-danger/25 text-danger-bright' : 'text-faint hover:text-text'}`}
            >
              <AlertTriangle size={12} /> Solo anomalías
            </button>
          </div>

          <button onClick={exportCsv} className="btn-ghost text-xs">
            <Download size={15} /> Exportar CSV
          </button>
        </div>
        <p className="mt-3 text-[11px] text-faint">Registro de eventos y anomalías · {total} coincidencias · respuesta máxima del sistema: ≤ 2 s (RNF1).</p>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty message="Sin eventos que coincidan con los filtros" />
        ) : (
          <table className="data-table min-w-[880px]">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Riesgo</th>
                <th>Vehículo / Conductor</th>
                <th>Descripción</th>
                <th>Resp.</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const Icon = ICON_MAP[e.tipo] || BellRing;
                const atendido = Boolean(e.atendido);
                return (
                  <tr key={e.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${e.riesgo === 'CRITICO' ? 'border-danger/40 bg-danger/10 text-danger-bright' : 'border-border-soft bg-surface-2 text-info'}`}>
                          <Icon size={15} />
                        </span>
                        <span className="whitespace-nowrap text-xs font-bold">{EVENT_LABEL[e.tipo]}</span>
                      </div>
                    </td>
                    <td><RiskBadge riesgo={e.riesgo} small /></td>
                    <td>
                      <p className="text-xs font-bold">{e.vehiculo_codigo}</p>
                      <p className="text-[10px] text-muted">{e.conductor_nombre}</p>
                    </td>
                    <td className="max-w-[280px]">
                      <p className="truncate text-xs text-muted" title={e.descripcion}>{e.descripcion}</p>
                    </td>
                    <td>
                      <span className="font-mono text-[11px] text-muted tabular">
                        {e.respuesta_ms ? `${e.respuesta_ms} ms` : '—'}
                      </span>
                    </td>
                    <td>
                      <p className="text-[11px] font-semibold">{fmtDate(e.timestamp)}</p>
                      <p className="text-[10px] text-faint">{timeAgo(e.timestamp)}</p>
                    </td>
                    <td>
                      {atendido ? (
                        <span className="whitespace-nowrap rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
                          Atendido
                        </span>
                      ) : (
                        <button onClick={() => ack(e)} className="flex items-center gap-1 whitespace-nowrap rounded-full border border-warning/50 bg-warning/10 px-2.5 py-1 text-[10px] font-bold text-warning hover:bg-warning/20">
                          <CheckCheck size={11} /> Sin atender · marcar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}