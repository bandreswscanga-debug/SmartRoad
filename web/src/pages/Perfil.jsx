import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import {
  ShieldAlert,
  Mail,
  User,
  Building2,
  Phone,
  ArrowLeft,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function Perfil() {
  const { user, updateProfile, pushToast } = useApp();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [email, setEmail] = useState(user?.email || '');
  const [telefono, setTelefono] = useState(user?.telefono_contacto || '');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setEmail(user.email || '');
      setTelefono(user.telefono_contacto || '');
    }
  }, [user]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await updateProfile({
        nombre,
        email,
        telefono_contacto: telefono
      });
      pushToast('Perfil actualizado correctamente', 'success');
    } catch (err) {
      setError(err.message);
      pushToast(err.message || 'No se pudo actualizar el perfil', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-bg px-4 grid-dots">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-danger opacity-[0.07] blur-3xl animate-drift" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-danger opacity-[0.05] blur-3xl animate-drift2" />

      <div className="relative w-full max-w-[460px] animate-rise">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="absolute left-0 top-0 text-[11px] font-bold uppercase tracking-widest text-muted hover:text-text transition-colors"
          >
            <ArrowLeft size={12} className="inline mr-1" /> Volver al panel
          </button>
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-info bg-gradient-to-br from-info to-[#0891b2] animate-float animate-glow">
            <User size={44} className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
          </span>
          <div style={{ animation: 'rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) 80ms both' }}>
            <h1 className="text-2xl font-black tracking-tight">
              Mi <span className="text-info-bright">Perfil</span>
            </h1>
            <p className="mt-1 text-sm text-muted">
              Edita tus datos de cuenta
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="card space-y-5 p-7" style={{ animation: 'rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) 160ms both' }}>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted">
            <ShieldAlert size={13} className="text-success" /> Información de la cuenta
          </p>

          <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-4">
            Rol: {user?.rol === 'admin' ? 'Administrador' : 'Conductor'}
            {user?.tipo_persona === 'empresa' ? ' · Empresa' : ' · Persona natural'}
          </p>

          {/* Nombre */}
          <div style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both' }}>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted">
              Nombre completo {user?.tipo_persona === 'empresa' ? '(razón social)' : ''}
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="text"
                className="field pl-9"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={user?.tipo_persona === 'empresa' ? 'Razón social de la empresa' : 'Nombres y apellidos'}
                autoComplete="name"
                required
              />
            </div>
          </div>

          {/* Correo */}
          <div style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 280ms both' }}>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted">Correo electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="email"
                className="field pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Teléfono (siempre visible para editar, requerido si empresa) */}
          <div style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 310ms both' }}>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted">
              Número de contacto {user?.tipo_persona === 'empresa' ? '(proveedor)' : '(opcional)'}
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="tel"
                className="field pl-9"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+57 300 000 0000"
                autoComplete="tel"
              />
            </div>
            {user?.tipo_persona === 'empresa' && (
              <p className="mt-1 text-[10px] text-faint">
                Este número se usará para contactar al proveedor de la empresa.
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-3 text-xs font-medium text-danger-bright animate-shake" key={error} style={{ animationIterationCount: 3 }}>
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary group w-full !py-3"
            style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 340ms both' }}
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <ShieldAlert size={17} className="transition-transform duration-300 group-hover:scale-110" />}
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>

          <p className="mt-6 text-center text-[11px] text-faint" style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 400ms both' }}>
            ¿Volver al inicio?{' '}
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="text-info underline underline-offset-4 hover:text-info-bright"
            >
              Ir al panel
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
