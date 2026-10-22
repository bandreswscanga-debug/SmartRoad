import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import {
  ShieldAlert,
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

const TIPOS = [
  { id: 'persona_natural', label: 'Persona natural', icon: User },
  { id: 'empresa', label: 'Empresa', icon: Building2 }
];

export default function Registro() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('persona_natural');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        nombre,
        email,
        password,
        tipo_persona: tipo,
        telefono_contacto: tipo === 'empresa' ? telefono : null
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
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
            onClick={() => navigate('/login', { replace: true })}
            className="absolute left-0 top-0 text-[11px] font-bold uppercase tracking-widest text-muted hover:text-text transition-colors"
          >
            <ArrowLeft size={12} className="inline mr-1" /> Volver al ingreso
          </button>
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-danger bg-gradient-to-br from-danger to-[#b91c2c] animate-float animate-glow">
            <ShieldAlert size={44} className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
          </span>
          <div style={{ animation: 'rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) 80ms both' }}>
            <h1 className="text-2xl font-black tracking-tight">
              SmartRoad <span className="text-danger-bright">S.O.S</span>
            </h1>
            <p className="mt-1 text-sm text-muted">Crear cuenta · Registro de usuario</p>
          </div>
        </div>

        {/* Selector de tipo de persona */}
        <div className="mb-6 flex items-center gap-1 border border-muted/30 rounded-xl p-1">
          {TIPOS.map((t) => {
            const Icon = t.icon;
            const activo = tipo === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  activo
                    ? 'bg-danger text-white shadow-sm'
                    : 'text-muted hover:text-text hover:bg-muted/50'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} className="card space-y-5 p-7" style={{ animation: 'rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) 160ms both' }}>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted">
            <ShieldAlert size={13} className="text-success" /> Nueva cuenta de acceso
          </p>

          {/* Nombre */}
          <div style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both' }}>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted">
              Nombre completo {tipo === 'empresa' ? '(razón social)' : ''}
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="text"
                className="field pl-9"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={tipo === 'empresa' ? 'Razón social de la empresa' : 'Nombres y apellidos'}
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

          {/* Teléfono (solo empresa) */}
          {tipo === 'empresa' && (
            <div style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 310ms both' }}>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted">
                Número de contacto (proveedor)
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
                  required
                />
              </div>
              <p className="mt-1 text-[10px] text-faint">
                Este número se usará para contactar al proveedor de la empresa.
              </p>
            </div>
          )}

          {/* Contraseña */}
          <div style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 340ms both' }}>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type={show ? 'text' : 'password'}
                className="field pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={4}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300 ${show ? 'text-danger' : 'text-faint hover:text-text'}`}
              >
                {show ? <EyeOff size={16} className="animate-pulse" /> : <Eye size={16} />}
              </button>
            </div>
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
            style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 400ms both' }}
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <ShieldAlert size={17} className="transition-transform duration-300 group-hover:scale-110" />}
            {busy ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>

          <p className="text-center text-[11px] text-faint" style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 460ms both' }}>
            ¿Ya tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="text-danger underline underline-offset-4 hover:text-danger-bright"
            >
              Inicia sesión
            </button>
          </p>

          <p className="mt-5 text-center text-[10px] uppercase tracking-widest text-faint animate-pulse" style={{ animationDuration: '4s', animationDelay: '480ms' }}>
            SENA · SmartRoad S.O.S · Registro de conductor / empresa
          </p>
        </form>
      </div>
    </div>
  );
}
