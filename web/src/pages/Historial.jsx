import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { Download, CheckCheck, Filter, Eye, EyeOff, AlertTriangle, BellRing, Hourglass, Siren, Car, UserRound, X, Clock } from 'lucide-react';
import { RiskBadge, Spinner, Empty } from '../components/ui';
import ExportMenu from '../components/ExportMenu';
import { EVENT_LABEL, timeAgo, fmtDate, toCsv, download } from '../utils/format';
import { downloadHtmlReport, exportExcel, printReport } from '../utils/report';

const ICON_MAP = { MICRO_SUENO: Eye, SOMNOLENCIA_ALTA: AlertTriangle, FATIGA_PROLONGADA: Hourglass, DISTRACCION: EyeOff, SOS: Siren, ACCIDENTE: Car };

const initials = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

export default function Historial() {
  const { pushToast, user } = useApp();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ tipo: '', riesgo: '' });
  const [mode, setMode] = useState('all');
  const [person, setPerson] = useState(null);
  const [personEvents, setPersonEvents] = useState([]);
  const [personLoading, setPersonLoading] = useState(false);

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

  const filtered = events;

  // Personas que aparecen en el historial visible (para acceso directo a su ficha).
  const people = useMemo(() => {
    const map = new Map();
    for (const e of filtered) {
      const nombre = e.conductor_nombre;
      if (!nombre) continue;
      const row = map.get(nombre) || { nombre, total: 0, criticos: 0, ultimo: null };
      row.total += 1;
      if (e.riesgo === 'CRITICO') row.criticos += 1;
      if (!row.ultimo || new Date(e.timestamp) > new Date(row.ultimo)) row.ultimo = e.timestamp;
      map.set(nombre, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);

  const personStats = useMemo(() => {
    const criticos = personEvents.filter((e) => e.riesgo === 'CRITICO').length;
    const atendidos = personEvents.filter((e) => e.atendido).length;
    const ultimo = personEvents.reduce((max, e) => {
      const t = new Date(e.timestamp).getTime();
      return t > max ? t : max;
    }, 0);
    return { total: personEvents.length, criticos, atendidos, ultimo: ultimo ? new Date(ultimo).toISOString() : null };
  }, [personEvents]);

  // Historial completo: se consulta sin filtros para traer todos los eventos de la persona.
  const openPerson = async (nombre) => {
    if (!nombre) return;
    setPerson({ nombre });
    setPersonLoading(true);
    setPersonEvents([]);
    try {
      const { events: all } = await api.events();
      setPersonEvents(all.filter((e) => e.conductor_nombre === nombre));
    } catch (err) {
      pushToast(err.message, 'critical');
    } finally {
      setPersonLoading(false);
    }
  };

  useEffect(() => {
    if (!person) return undefined;
    const onKey = (ev) => { if (ev.key === 'Escape') setPerson(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [person]);

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

  const exportColumns = [
    { label: 'ID', key: 'id', width: '50px' },
    { label: 'Fecha', format: (r) => fmtDate(r.timestamp) },
    { label: 'Tipo', format: (r) => EVENT_LABEL[r.tipo] || r.tipo },
    { label: 'Riesgo', key: 'riesgo' },
    { label: 'Vehículo', key: 'vehiculo_codigo' },
    { label: 'Conductor', key: 'conductor_nombre' },
    { label: 'Velocidad', format: (r) => (r.velocidad != null ? `${r.velocidad} km/h` : '—') },
    { label: 'GPS', format: (r) => (r.lat != null && r.lng != null ? `${r.lat}, ${r.lng}` : '—') },
    { label: 'Respuesta', format: (r) => (r.respuesta_ms ? `${r.respuesta_ms} ms` : '—') },
    { label: 'Atendido', format: (r) => Boolean(r.atendido) },
    { label: 'Descripción', key: 'descripcion' }
  ];

  const reportConfig = () => {
    const criticos = filtered.filter((e) => e.riesgo === 'CRITICO').length;
    const atendidos = filtered.filter((e) => e.atendido).length;
    const conMs = filtered.filter((e) => e.respuesta_ms > 0);
    const avg = conMs.length ? `${Math.round(conMs.reduce((a, e) => a + e.respuesta_ms, 0) / conMs.length)} ms` : '—';
    const filtros = [
      filters.tipo ? EVENT_LABEL[filters.tipo] : 'Todos los tipos',
      filters.riesgo || 'Todos los niveles',
      mode === 'anomalias' ? 'Solo anomalías' : 'Todos los eventos'
    ].join(' · ');
    return {
      filename: `smartroad-eventos-${new Date().toISOString().slice(0, 10)}`,
      title: 'Historial de eventos y anomalías',
      subtitle: 'Registro de somnolencia, distracción y emergencias del conductor (RF10)',
      meta: [
        { label: 'Generado por', value: user?.nombre || 'Operador' },
        { label: 'Filtros aplicados', value: filtros },
        { label: 'Registros', value: `${filtered.length} de ${total}` }
      ],
      kpis: [
        { label: 'Eventos', value: filtered.length, tone: 'info', sub: 'en la selección actual' },
        { label: 'Críticos', value: criticos, tone: 'danger', sub: 'requieren atención' },
        { label: 'Atendidos', value: atendidos, tone: 'success', sub: 'con seguimiento cerrado' },
        { label: 'Respuesta media', value: avg, tone: 'warning', sub: 'objetivo ≤ 2 s (RNF1)' }
      ],
      sections: [
        {
          title: 'Detalle de eventos',
          description: 'Cada fila corresponde a un evento registrado por la telemetría o la cámara IA.',
          columns: exportColumns,
          rows: filtered,
          empty: 'No hay eventos que coincidan con los filtros seleccionados.'
        }
      ],
      notes: [
        'Los eventos CRÍTICOS deben revisarse y marcarse como atendidos por el operador.',
        'La respuesta del sistema debe mantenerse por debajo de 2 segundos (RNF1).'
      ],
      footer: `SmartRoad S.O.S · ${filtered.length} registro(s) exportado(s)`
    };
  };

  const exportPdf = () => printReport(reportConfig());
  const exportHtml = () => downloadHtmlReport(reportConfig());
  const exportXls = () => {
    const cfg = reportConfig();
    exportExcel({
      filename: cfg.filename,
      title: cfg.title,
      subtitle: cfg.subtitle,
      meta: cfg.meta,
      columns: exportColumns,
      rows: filtered
    });
  };

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
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

          <ExportMenu
            label="Exportar"
            onPdf={exportPdf}
            onExcel={exportXls}
            onHtml={exportHtml}
            onCsv={exportCsv}
            disabled={!filtered.length}
          />
        </div>
        <p className="mt-3 text-[11px] text-faint">Registro de eventos y anomalías · {total} coincidencias · respuesta máxima del sistema: ≤ 2 s (RNF1).</p>
      </div>

      {people.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserRound size={15} className="text-info" />
            <p className="section-title">Conductores en el historial</p>
            <span className="rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">
              {people.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <button
                key={p.nombre}
                type="button"
                onClick={() => openPerson(p.nombre)}
                title={`Ver el historial completo de ${p.nombre}`}
                className="group flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-left transition-all hover:border-info/50 hover:bg-info/10"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-info/15 text-[10px] font-black text-info">
                  {initials(p.nombre)}
                </span>
                <span className="whitespace-nowrap text-xs font-bold text-text group-hover:text-info">{p.nombre}</span>
                <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-muted">{p.total}</span>
                {p.criticos > 0 && (
                  <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-bold text-danger-bright">
                    {p.criticos} crít.
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-faint">Haz clic en un nombre para abrir su historial completo, sin filtros.</p>
        </div>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty message="Sin eventos que coincidan con los filtros" />
        ) : (
          <table className="data-table min-w-[1020px]">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Riesgo</th>
                <th>Vehículo</th>
                <th>Conductor</th>
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
                      <p className="text-xs font-bold">{e.vehiculo_codigo || '—'}</p>
                    </td>
                    <td>
                      {e.conductor_nombre ? (
                        <button
                          type="button"
                          onClick={() => openPerson(e.conductor_nombre)}
                          title={`Ver el historial completo de ${e.conductor_nombre}`}
                          className="group flex items-center gap-1.5 text-left text-xs font-bold text-info hover:underline"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info/15 text-[9px] font-black text-info">
                            {initials(e.conductor_nombre)}
                          </span>
                          <span className="whitespace-nowrap">{e.conductor_nombre}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
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

      {person && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={() => setPerson(null)}
        >
          <div
            className="card my-auto flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-history-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-info/15 text-base font-black text-info">
                  {initials(person.nombre)}
                </span>
                <div>
                  <h2 id="person-history-title" className="text-lg font-black">{person.nombre}</h2>
                  <p className="text-xs text-muted">Historial completo del conductor · todos los eventos, sin filtros</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPerson(null)}
                className="rounded-lg border border-border bg-surface-2 p-2 text-muted transition-colors hover:text-text"
                aria-label="Cerrar historial"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-border-soft bg-surface-2 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Eventos</p>
                  <p className="mt-1 text-2xl font-black tabular text-text">{personStats.total}</p>
                </div>
                <div className="rounded-xl border border-danger/25 bg-danger/10 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Críticos</p>
                  <p className="mt-1 text-2xl font-black tabular text-danger-bright">{personStats.criticos}</p>
                </div>
                <div className="rounded-xl border border-success/25 bg-success/10 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Atendidos</p>
                  <p className="mt-1 text-2xl font-black tabular text-success">{personStats.atendidos}</p>
                </div>
                <div className="rounded-xl border border-border-soft bg-surface-2 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Último evento</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-text">
                    <Clock size={13} className="text-info" />
                    {personStats.ultimo ? timeAgo(personStats.ultimo) : '—'}
                  </p>
                </div>
              </div>

              {personLoading ? (
                <Spinner label={`Cargando el historial de ${person.nombre}…`} />
              ) : personEvents.length === 0 ? (
                <Empty message="Esta persona no tiene eventos registrados" />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border-soft">
                  <table className="data-table min-w-[980px]">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Evento</th>
                        <th>Riesgo</th>
                        <th>Vehículo</th>
                        <th>Velocidad</th>
                        <th>Resp.</th>
                        <th>GPS</th>
                        <th>Estado</th>
                        <th>Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personEvents.map((e) => {
                        const Icon = ICON_MAP[e.tipo] || BellRing;
                        return (
                          <tr key={e.id}>
                            <td>
                              <p className="whitespace-nowrap text-[11px] font-semibold">{fmtDate(e.timestamp)}</p>
                              <p className="text-[10px] text-faint">{timeAgo(e.timestamp)}</p>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${e.riesgo === 'CRITICO' ? 'border-danger/40 bg-danger/10 text-danger-bright' : 'border-border-soft bg-surface-2 text-info'}`}>
                                  <Icon size={13} />
                                </span>
                                <span className="whitespace-nowrap text-xs font-bold">{EVENT_LABEL[e.tipo] || e.tipo}</span>
                              </div>
                            </td>
                            <td><RiskBadge riesgo={e.riesgo} small /></td>
                            <td className="whitespace-nowrap text-xs font-bold">{e.vehiculo_codigo || '—'}</td>
                            <td className="whitespace-nowrap text-[11px] text-muted tabular">{e.velocidad != null ? `${e.velocidad} km/h` : '—'}</td>
                            <td className="whitespace-nowrap font-mono text-[11px] text-muted tabular">{e.respuesta_ms ? `${e.respuesta_ms} ms` : '—'}</td>
                            <td className="whitespace-nowrap font-mono text-[10px] text-muted tabular">
                              {e.lat != null && e.lng != null ? `${Number(e.lat).toFixed(4)}, ${Number(e.lng).toFixed(4)}` : '—'}
                            </td>
                            <td>
                              {e.atendido ? (
                                <span className="whitespace-nowrap rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">Atendido</span>
                              ) : (
                                <span className="whitespace-nowrap rounded-full border border-warning/50 bg-warning/10 px-2.5 py-1 text-[10px] font-bold text-warning">Sin atender</span>
                              )}
                            </td>
                            <td className="max-w-[280px]">
                              <p className="text-xs text-muted" title={e.descripcion}>{e.descripcion}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t border-border px-5 py-3 text-[11px] text-faint">
              {personEvents.length} evento(s) registrados para {person.nombre} · {personStats.criticos} crítico(s) · {personStats.atendidos} atendido(s)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}