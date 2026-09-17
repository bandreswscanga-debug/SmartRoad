import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, LogOut, Wifi, WifiOff, UserCircle2, ShieldCheck, Sun, Moon, RefreshCw, Menu, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { fmtUptime, fmtClock } from '../utils/format';

export default function Header({ title, subtitle, onMenu, menuOpen }) {
  const { user, activeAlerts, connected, serverUptime, summary, logout, theme, toggleTheme, refreshAll, pushToast } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const status = summary?.sistema?.estado || 'ACTIVO';

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    pushToast('Panel actualizado en tiempo real', 'info');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        {onMenu && (
          <button
            onClick={onMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted lg:hidden"
            title={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 md:flex">
            <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Tiempo operativo</span>
            <span className="font-mono text-xs font-bold text-text tabular">{fmtUptime(serverUptime)}</span>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 md:flex">
            <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Reloj</span>
            <span className="font-mono text-xs font-bold text-text tabular">{fmtClock(now.toISOString())}</span>
          </div>

          <SystemState state={status} />

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-text hover:border-border"
              title="Actualizar datos"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-text hover:border-border"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={() => navigate('/alertas')}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-danger/40 hover:text-text"
              title="Alertas activas"
            >
            <BellRing size={17} />
            {activeAlerts.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white animate-pulse-ring">
                {activeAlerts.length}
              </span>
            )}
          </button>
          </div>

          <div className="hidden items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-1.5 sm:flex">
            {user?.rol === 'admin' ? (
              <ShieldCheck size={19} className="text-success" />
            ) : (
              <UserCircle2 size={19} className="text-info" />
            )}
            <div className="leading-tight">
              <p className="text-xs font-bold">{user?.nombre || 'Usuario'}</p>
              <p className="text-[10px] uppercase tracking-wider text-faint">{user?.rol === 'admin' ? 'Administrador' : 'Conductor'}</p>
            </div>
            <button onClick={logout} title="Cerrar sesión" className="ml-1 text-faint transition-colors hover:text-danger-bright">
              <LogOut size={16} />
            </button>
          </div>

          <StatusDot connected={connected} />

          <button
            onClick={logout}
            title="Cerrar sesión"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-faint transition-colors hover:text-danger-bright sm:hidden"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

function SystemState({ state }) {
  const isAlert = state === 'ALERTA';
  const isInactive = state === 'INACTIVO';
  return (
    <span
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
        isAlert
          ? 'border-danger/60 bg-danger/15 text-danger-bright animate-pulse-ring'
          : isInactive
            ? 'border-warning/40 bg-warning/10 text-warning'
            : 'border-success/40 bg-success/10 text-success'
      }`}
    >
      <span className={`relative flex h-2 w-2 ${isAlert ? 'animate-ping' : 'animate-pulse'}`}>
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isAlert ? 'bg-danger' : isInactive ? 'bg-warning' : 'bg-success'}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${isAlert ? 'bg-danger' : isInactive ? 'bg-warning' : 'bg-success'}`} />
      </span>
      {isAlert ? 'Alerta' : isInactive ? 'Sin actividad' : 'Sistema activo'}
    </span>
  );
}

function StatusDot({ connected }) {
  return connected ? (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success" title="Tiempo real conectado">
      <Wifi size={15} /> RX
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-warning" title="Usando respaldo de pedido">
      <WifiOff size={15} /> POLL
    </span>
  );
}