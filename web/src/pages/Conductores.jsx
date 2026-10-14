import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { Users, Phone, FileText, Coffee, Route, Clock3, Download, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { RiskBadge, Meter, Spinner, Empty } from '../components/ui';
import { fmtDate, toCsv, download } from '../utils/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const empty = { nombre: '', documento: '', email: '', placa: '', telefono: '', licencia: '', empresa: '' };

export default function Conductores() {
  const { pushToast, user } = useApp();
  const [drivers, setDrivers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [shared, setShared] = useState(null); // credenciales listas para compartir

  const isAdmin = user?.rol === 'admin';

  const load = () => api.drivers().then((d) => setDrivers(d.drivers)).catch(() => {});
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!detail) return;
    setDetailData(null);
    api.driver(detail.id).then((d) => setDetailData(d)).catch(() => {});
  }, [detail]);

  useEffect(() => {
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const set = (key, value) => setForm((c) => ({ ...c, [key]: value }));

  function validate() {
    if (!form.nombre.trim()) return 'Nombre es obligatorio';
    if (!form.documento.trim()) return 'Cédula es obligatoria';
    if (!EMAIL_RE.test(form.email)) return 'Correo electrónico inválido';
    if (!form.placa.trim()) return 'Placa es obligatoria';
    return null;
  }

  const reset = () => { setEditing(null); setForm(empty); setFormError(null); };

  const startEdit = (d) => {
    setEditing(d.id);
    setForm({
      nombre: d.nombre || '',
      documento: d.documento || '',
      email: d.email || '',
      placa: d.placa || '',
      telefono: d.telefono || '',
      licencia: d.licencia || '',
      empresa: d.empresa || ''
    });
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (e) => {
    e.preventDefault();
    const erro = validate();
    if (erro) { setFormError(erro); return; }
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        documento: form.documento.trim(),
        email: form.email.trim(),
        placa: form.placa.trim().toUpperCase(),
        telefono: form.telefono.trim() || undefined,
        licencia: form.licencia.trim() || undefined,
        empresa: form.empresa.trim() || undefined
      };
      if (editing) {
        // Al editar no se reenvía la cédula como clave; solo datos.
        await api.updateDriver(editing, payload);
        pushToast('Conductor actualizado', 'success');
      } else {
        const created = await api.createDriver(payload);
        // Tarjeta para compartir credenciales (WhatsApp/copiar): funciona sin correo.
        setShared({
          nombre: created.driver?.nombre || payload.nombre,
          email: created.driver?.email || payload.email,
          cedula: created.driver?.documento || payload.documento,
          telefono: created.driver?.telefono || ''
        });
        if (created.email_enviado) {
          pushToast(
            created.email_preview
              ? `Conductor registrado y correo enviado. Verlo en: ${created.email_preview}`
              : 'Conductor registrado y correo enviado.',
            'success'
          );
        } else {
          pushToast(
            `Conductor registrado. Comparta sus credenciales con la tarjeta de abajo (correo aún no configurado).`,
            'warning'
          );
        }
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`¿Eliminar a ${d.nombre} con TODOS sus datos? Se borran su cuenta de acceso, sus vehículos asignados y su historial (eventos y alertas).`)) return;
    try {
      const res = await api.deleteDriver(d.id);
      const n = res.eliminados || {};
      pushToast(
        `Datos de ${d.nombre} eliminados${n.vehiculos ? ` (${n.vehiculos} vehículo(s), ${n.eventos || 0} evento(s), ${n.alertas || 0} alerta(s))` : ''}`,
        'success'
      );
      if (detail?.id === d.id) setDetail(null);
      await load();
    } catch (err) {
      pushToast(err.message, 'critical');
    }
  };

  const exportCsv = () => {
    download('smartroad-conductores.csv', toCsv(drivers, [
      { label: 'nombre', key: 'nombre' },
      { label: 'documento', key: 'documento' },
      { label: 'correo', key: 'email' },
      { label: 'placa', key: 'placa' },
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
      {isAdmin && (
        <div className="card p-5">
          <p className="section-title">{editing ? 'Editar conductor' : 'Registrar conductor'}</p>
          <p className="mb-4 text-xs text-muted">
            Se crea el usuario de acceso automáticamente: usuario = correo, clave inicial = cédula (hash).
            {editing ? ' La clave no cambia al editar.' : ''}
          </p>
          <form onSubmit={save} className="grid gap-3 md:grid-cols-4">
            <input className="field" placeholder="Nombre *" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
            <input className="field" placeholder="Cédula *" value={form.documento} onChange={(e) => set('documento', e.target.value)} required />
            <input className="field" type="email" placeholder="Correo *" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            <input className="field" placeholder="Placa *" value={form.placa} onChange={(e) => set('placa', e.target.value.toUpperCase())} required />
            <input className="field" placeholder="Teléfono" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
            <input className="field" placeholder="Licencia" value={form.licencia} onChange={(e) => set('licencia', e.target.value)} />
            <input className="field md:col-span-2" placeholder="Empresa" value={form.empresa} onChange={(e) => set('empresa', e.target.value)} />
            {formError && <p className="md:col-span-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-bold text-danger-bright">{formError}</p>}
            <div className="flex gap-2 md:col-span-4">
              <button className="btn-primary" disabled={busy}>
                {editing ? <Pencil size={14} /> : <UserPlus size={14} />}
                {busy ? 'Guardando…' : editing ? 'Actualizar' : 'Registrar'}
              </button>
              {editing && <button type="button" className="btn-ghost" onClick={reset}>Cancelar</button>}
            </div>
          </form>
        </div>
      )}

      {shared && (
        <div className="card space-y-3 border-success/40 p-5">
          <p className="section-title">Credenciales de {shared.nombre} — listas para compartir</p>
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <p className="rounded-lg bg-surface-2 px-3 py-2">Usuario: <b>{shared.email}</b></p>
            <p className="rounded-lg bg-surface-2 px-3 py-2">Clave inicial: <b>{shared.cedula}</b></p>
            <p className="rounded-lg bg-surface-2 px-3 py-2">App: el admin comparte el instalador (APK)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const msg = `Hola ${shared.nombre}, tu cuenta SmartRoad S.O.S está lista.\nUsuario: ${shared.email}\nClave inicial: ${shared.cedula} (cámbiala en tu primer ingreso desde Perfil).`;
                navigator.clipboard?.writeText(msg).then(
                  () => pushToast('Credenciales copiadas. Pégalas en WhatsApp o correo.', 'success'),
                  () => pushToast('No se pudo copiar. Seleccione el texto manualmente.', 'warning')
                );
              }}
            >
              Copiar credenciales
            </button>
            {(() => {
              // wa.me exige indicativo país: Colombia 57 + 10 dígitos.
              let digits = String(shared.telefono || '').replace(/\D/g, '');
              if (/^0/.test(digits)) digits = digits.replace(/^0+/, '');
              if (/^57/.test(digits)) {
                // ya trae indicativo
              } else if (digits.length === 10) {
                digits = `57${digits}`;
              } else {
                return null;
              }
              const msg = encodeURIComponent(
                `Hola ${shared.nombre}, tu cuenta SmartRoad S.O.S está lista.\nUsuario: ${shared.email}\nClave inicial: ${shared.cedula} (cámbiala en tu primer ingreso desde Perfil).`
              );
              return (
                <a
                  className="btn-ghost"
                  href={`https://wa.me/${digits}?text=${msg}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar por WhatsApp
                </a>
              );
            })()}
            <button type="button" className="btn-ghost" onClick={() => setShared(null)}>Cerrar</button>
          </div>
        </div>
      )}

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
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Documento</th>
                <th>Correo / Placa</th>
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
                    <p className="text-[11px] text-muted">{d.email || '—'}</p>
                    <p className="font-mono text-[11px] font-bold">{d.placa || '—'}</p>
                  </td>
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
                    <div className="flex items-center gap-2">
                      <button onClick={() => setDetail(d)} className="text-[11px] font-bold text-info hover:underline">
                        Detalle →
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => startEdit(d)} className="text-info hover:opacity-80" title="Editar">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => remove(d)} className="text-danger-bright hover:opacity-80" title="Eliminar">
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
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
