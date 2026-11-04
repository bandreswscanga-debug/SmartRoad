import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CarFront, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';

const initial = {
  nombre: '', email: '', password: '', documento: '', licencia: '', telefono: '',
  empresa: '', placa: '', tipo_vehiculo: '', modelo_vehiculo: '', tipo_sangre: ''
};

export default function RegistroConductor() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.registerDriver({ ...form, modelo_vehiculo: form.modelo_vehiculo ? Number(form.modelo_vehiculo) : undefined });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg px-4 grid-dots">
        <div className="card w-full max-w-[520px] space-y-5 p-8 text-center">
          <CheckCircle2 className="mx-auto text-success" size={52} />
          <h1 className="text-2xl font-black">Registro recibido</h1>
          <p className="text-sm leading-6 text-muted">Tu cuenta quedó creada y puedes iniciar sesión inmediatamente como conductor. El estado documental queda registrado para control administrativo.</p>
          <button className="btn-primary w-full" onClick={() => navigate('/login')}>Volver al inicio de sesión</button>
        </div>
      </div>
    );
  }

  const fields = [
    ['nombre', 'Nombre completo', 'text', 'Ej. María Rodríguez', true],
    ['documento', 'RUT / cédula', 'text', 'Número de identificación', true],
    ['licencia', 'Carnet de conducir', 'text', 'Categoría y número', true],
    ['telefono', 'Teléfono', 'tel', '+57 300 000 0000', true],
    ['email', 'Correo electrónico', 'email', 'correo@ejemplo.com', true],
    ['password', 'Contraseña', 'password', 'Mínimo 8 caracteres', true],
    ['empresa', 'Empresa (opcional)', 'text', 'Nombre de la empresa', false],
    ['placa', 'Placa del vehículo', 'text', 'ABC123', true],
    ['tipo_vehiculo', 'Tipo de vehículo', 'text', 'Camión, van, automóvil...', true],
    ['modelo_vehiculo', 'Modelo / año', 'number', '2024', false]
  ];

  return (
    <div className="min-h-screen bg-bg px-4 py-10 grid-dots">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-text"><ArrowLeft size={15} /> Volver al acceso</Link>
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger"><CarFront className="text-white" size={28} /></span>
          <div><h1 className="text-2xl font-black">Registro de conductor</h1><p className="text-sm text-muted">Crea tu perfil para solicitar verificación.</p></div>
        </div>
        <form onSubmit={submit} className="card space-y-6 p-6 sm:p-8">
          <div className="flex gap-3 rounded-xl border border-info/30 bg-info/10 p-4 text-xs leading-5 text-muted">
            <ShieldCheck className="shrink-0 text-info" size={18} />
            <span>Solicitamos tu RUT o cédula y carnet de conducir para mantener tu ficha legal. Tu cuenta se crea de inmediato; el estado documental queda visible para control administrativo.</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label, type, placeholder, required]) => (
              <label key={key} className="text-[11px] font-bold uppercase tracking-widest text-muted">
                {label}{required && ' *'}
                <input className="field mt-1.5 normal-case tracking-normal" type={type} placeholder={placeholder} value={form[key]} onChange={update(key)} required={required} minLength={key === 'password' ? 8 : undefined} />
              </label>
            ))}
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted">Tipo de sangre *
              <select className="field mt-1.5 normal-case tracking-normal" value={form.tipo_sangre} onChange={update('tipo_sangre')} required>
                <option value="">Selecciona</option>{['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger-bright">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}{busy ? 'Creando cuenta…' : 'Crear cuenta de conductor'}</button>
        </form>
      </div>
    </div>
  );
}
