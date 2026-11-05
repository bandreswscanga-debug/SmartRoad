import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Globe2, Sheet } from 'lucide-react';

export default function ExportMenu({
  onPdf,
  onExcel,
  onHtml,
  onCsv,
  label = 'Exportar',
  disabled = false,
  align = 'right'
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const run = (fn) => {
    setOpen(false);
    if (typeof fn === 'function') fn();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn-ghost text-xs"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download size={14} /> {label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-40 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl animate-rise ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <MenuItem
            icon={FileText}
            title="PDF listo para entregar"
            desc="Abre el informe y permite guardarlo como PDF"
            onClick={() => run(onPdf)}
          />
          <MenuItem
            icon={Sheet}
            title="Excel (.xls)"
            desc="Tabla con formato, colores y encabezados"
            onClick={() => run(onExcel)}
          />
          <MenuItem
            icon={Globe2}
            title="HTML autocontenido"
            desc="Se abre bien en cualquier navegador"
            onClick={() => run(onHtml)}
          />
          {onCsv && (
            <MenuItem
              icon={FileSpreadsheet}
              title="CSV compatible"
              desc="Para importar en otros sistemas"
              onClick={() => run(onCsv)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, title, desc, onClick }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-start gap-3 border-b border-border-soft px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-2"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-info">
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold text-text">{title}</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-faint">{desc}</span>
      </span>
    </button>
  );
}
