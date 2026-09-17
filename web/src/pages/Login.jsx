import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { ShieldAlert, Eye, EyeOff, AlertCircle, Loader2, Radio } from 'lucide-react';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('bandreswscanga@hgmail.com');
  const [password, setPassword] = useState('5304566767');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
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
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-info opacity-[0.04] blur-3xl lg:block animate-drift" />

      <div className="relative w-full max-w-[420px] animate-rise">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-danger bg-gradient-to-br from-danger to-[#b91c2c] animate-float animate-glow">
            <ShieldAlert size={44} className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
          </span>
          <div style={{ animation: 'rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) 80ms both' }}>
            <h1 className="text-2xl font-black tracking-tight">
              SmartRoad <span className="text-danger-bright">S.O.S</span>
            </h1>
            <p className="mt-1 text-sm text-muted">Centro de control · Detección de somnolencia</p>
          </div>
        </div>

        <form onSubmit={submit} className="card space-y-5 p-7" style={{ animation: 'rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) 160ms both' }}>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted">
            <Radio size={13} className="animate-pulse text-success" /> Acceso de administrador
          </p>

          <div style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both' }}>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted">Correo electrónico</label>
            <div className="relative">
              <input
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo del administrador"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 280ms both' }}>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted">Contraseña</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                className="field pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
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
            style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 340ms both' }}
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <ShieldAlert size={17} className="transition-transform duration-300 group-hover:scale-110" />}
            {busy ? 'Verificando credenciales…' : 'Ingresar al panel'}
          </button>

          <p className="text-center text-[11px] text-faint" style={{ animation: 'rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) 400ms both' }}>
            Acceso admin · <span className="text-muted">bandreswscanga@hgmail.com</span> / <span className="text-muted">••••••••</span>
          </p>
        </form>

        <p className="mt-5 text-center text-[10px] uppercase tracking-widest text-faint animate-pulse" style={{ animationDuration: '4s', animationDelay: '480ms' }}>
          SENA · SmartRoad S.O.S · ESP32 + RF8 semáforo de riesgo
        </p>
      </div>
    </div>
  );
}