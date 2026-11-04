import { useEffect, useState } from 'react';
import { Activity, CarFront, Download, LogOut, ShieldCheck, TestTube2, UserRound, Gauge, CalendarClock } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { fmtDate, EVENT_LABEL, RISK_COLOR } from '../utils/format';
import { downloadDriverPdf } from '../utils/pdf';

export default function ConductorInicio({ showEvents = false }) {
  const { user, logout, pushToast } = useApp();
  const [driver, setDriver] = useState(null);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [profile, history] = await Promise.all([
        api.driverProfile(),
        showEvents ? api.driverEvents() : Promise.resolve({ events: [] })
      ]);
      setDriver(profile.driver);
      setEvents(history.events || []);
    } catch (error) {
      pushToast(error.message, 'warning');
    }
  }

  useEffect(() => { load();   }, [showEvents]);

  async function createTestEvent() {
    setBusy(true);
    try {
      await api.testDriverDrowsiness('MEDIO', 'Prueba voluntaria de somnolencia realizada por el conductor.');
      await load();
      pushToast('Evento de prueba guardado correctamente', 'success');
    } catch (error) {
      pushToast(error.message, 'warning');
    } finally {
      setBusy(false);
    }
  }

  async function printPdf() {
    if (!driver) return;
    try {
      await downloadDriverPdf({ driver, email: user?.email, events, filename: `smartroad-${driver.documento}.pdf` });
      pushToast('PDF descargado correctamente', 'success');
    } catch (error) {
      pushToast(error.message, 'critical');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Bienvenido, <span className="font-bold text-text">{driver?.nombre || user?.nombre}</span></p>
          <p className="text-xs text-faint">Tu información y actividad personal en SmartRoad S.O.S.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={printPdf} className="btn-ghost text-xs" disabled={!driver}><Download size={14} /> Exportar datos (PDF)</button>
          <button onClick={logout} className="btn-ghost text-xs"><LogOut size={14} /> Cerrar sesión</button>
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="card hidden flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <img src="/smartroad-logo.png" alt="SmartRoad S.O.S" className="h-14 w-36 object-contain" />
            <div><p className="text-lg font-black">Mi espacio de conductor</p><p className="text-xs text-muted">Sesión independiente · {user?.email}</p></div>
          </div>
          <button onClick={logout} className="btn-ghost text-xs"><LogOut size={14} /> Cerrar sesión</button>
        </header>

        {showEvents && <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Summary icon={CarFront} label="Mi vehículo" value={driver?.placa || 'Sin placa'} sub={driver?.tipo_vehiculo || 'Por registrar'} />
          <Summary icon={Gauge} label="Fatiga actual" value={`${driver?.fatiga_actual || 0}/100`} sub={driver?.riesgo || 'BAJO'} />
          <Summary icon={Activity} label="Mis eventos" value={events.length} sub="eventos propios guardados" />
          <Summary icon={CalendarClock} label="Jornada" value={`${driver?.jornada_horas || 0} h`} sub={`${driver?.kilometros || 0} km recorridos`} />
        </div>}

        <section className="grid gap-4 md:grid-cols-3">
          <div className={`card p-5 ${showEvents ? 'md:col-span-2' : 'md:col-span-3'}`}>
            <p className="section-title mb-4"><UserRound size={15} /> Mis datos registrados</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Data label="Nombre" value={driver?.nombre} /><Data label="Documento" value={driver?.documento} />
              <Data label="Licencia" value={driver?.licencia} /><Data label="Teléfono" value={driver?.telefono} />
              <Data label="Empresa" value={driver?.empresa || 'Independiente'} /><Data label="Tipo de sangre" value={driver?.tipo_sangre} />
            </div>
          </div>
          {showEvents && <div className="card p-5">
            <p className="section-title mb-4"><CarFront size={15} /> Mi vehículo</p>
            <Data label="Placa" value={driver?.placa} /><Data label="Tipo" value={driver?.tipo_vehiculo} /><Data label="Modelo" value={driver?.modelo_vehiculo || '—'} />
          </div>}
        </section>

        {showEvents && <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="section-title"><Activity size={15} /> Mis eventos registrados</p><p className="mt-1 text-xs text-muted">Los eventos del panel administrativo simulado no aparecen aquí.</p></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={printPdf} className="btn-ghost text-xs" disabled={!driver}><Download size={14} /> Generar PDF</button>
              <button onClick={createTestEvent} className="btn-primary text-xs" disabled={busy}><TestTube2 size={14} /> {busy ? 'Guardando…' : 'Registrar prueba'}</button>
            </div>
          </div>
          {!events.length ? <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted"><ShieldCheck className="mx-auto mb-2 text-success" size={25} />No tienes eventos de somnolencia registrados.</div> : (
            <div className="mt-5 overflow-x-auto"><table className="data-table min-w-[650px]"><thead><tr><th>Fecha</th><th>Evento</th><th>Riesgo</th><th>Descripción</th></tr></thead><tbody>
              {events.map((event) => <tr key={event.id}><td className="text-xs text-muted">{fmtDate(event.timestamp)}</td><td className="text-xs font-bold">{EVENT_LABEL[event.tipo] || event.tipo}</td><td className="text-xs font-bold" style={{ color: RISK_COLOR[event.riesgo] }}>{event.riesgo}</td><td className="text-xs text-muted">{event.descripcion || '—'}</td></tr>)}
            </tbody></table></div>
          )}
        </section>}
      </div>
    </div>
  );
}

function Data({ label, value }) {
  return <div className="rounded-lg border border-border-soft bg-surface-2 p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-faint">{label}</p><p className="mt-1 text-sm font-bold">{value || '—'}</p></div>;
}

function Summary({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-faint"><Icon size={14} className="text-info" />{label}</div>
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{sub}</p>
    </div>
  );
}
