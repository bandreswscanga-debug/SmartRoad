import { useApp } from '../store/AppContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: AlertTriangle,
  info: Info
};

const COLORS = {
  success: 'text-success border-success/40',
  warning: 'text-warning border-warning/40',
  critical: 'text-danger-bright border-danger/50',
  info: 'text-info border-info/40'
};

export default function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed right-4 top-20 z-[70] flex w-[320px] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 shadow-2xl animate-rise ${COLORS[t.type] || COLORS.info}`}
          >
            <Icon size={18} className="shrink-0" />
            <p className="flex-1 text-xs font-semibold">{t.message}</p>
            <button onClick={() => dismissToast(t.id)} className="text-faint hover:text-text" title="Cerrar">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}