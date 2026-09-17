import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Radar, History, BarChart3, Users, BellRing, Smartphone, Settings, ShieldAlert
} from 'lucide-react';
import { useApp } from '../store/AppContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/monitoreo', label: 'Monitoreo', icon: Radar },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/conductores', label: 'Conductores', icon: Users },
  { to: '/alertas', label: 'Alertas', icon: BellRing },
  { to: '/app-movil', label: 'App Móvil', icon: Smartphone },
  { to: '/configuracion', label: 'Configuración', icon: Settings }
];

export default function Sidebar({ open, onClose }) {
  const { activeAlerts } = useApp();
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col border-r border-border bg-surface transition-transform duration-300 lg:translate-x-0 lg:w-[236px] ${
          open ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger bg-gradient-to-br from-danger to-[#b91c2c] shadow-[0_8px_20px_rgba(239,45,60,0.35)]">
            <ShieldAlert size={24} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight">
              SmartRoad <span className="text-danger-bright">S.O.S</span>
            </p>
            <p className="text-[10px] uppercase tracking-widest text-faint">Centro de control</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold transition-all ${
                  isActive
                    ? 'bg-danger/15 text-danger-bright border border-danger/25'
                    : 'text-muted border border-transparent hover:bg-surface-2 hover:text-text'
                }`
              }
            >
              <Icon size={17} className="transition-transform group-hover:scale-110" />
              {label}
              {label === 'Alertas' && activeAlerts.length > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white animate-pulse-ring">
                  {activeAlerts.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="rounded-xl border border-border-soft bg-surface-2 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-faint">Sistema</p>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-success">
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> ACTIVO
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Monitoreo autónomo de somnolencia. Detección <span className="text-text">≤ 2 s</span> (RNF1).
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}