import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import {
  AlertTriangle,
  BrainCircuit,
  Lightbulb,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2
} from 'lucide-react';

const SUGGESTIONS = [
  'Resume el estado de la flota y los riesgos del turno.',
  '¿Qué conductores requieren una pausa ahora?',
  'Explícame la última alerta crítica y qué hacer.',
  'Genera un plan de acción para las próximas 2 horas.',
  '¿Qué reporte debería exportar para la entrega?'
];

export default function AsistenteIA() {
  const { pushToast } = useApp();
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const bootRef = useRef(false);
  const endRef = useRef(null);

  const scrollToEnd = () => {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  };

  const addMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content, ts: Date.now() }]);
    scrollToEnd();
  };

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    (async () => {
      try {
        const s = await api.iaStatus();
        setStatus(s);
        setBusy(true);
        const res = await api.iaResumen();
        addMessage('assistant', res.resumen);
      } catch (err) {
        setError(err.message);
        addMessage(
          'assistant',
          `No pude generar el resumen del turno: ${err.message}. Revisa la configuración de la IA en el backend.`
        );
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (text) => {
    const pregunta = String(text ?? input).trim();
    if (!pregunta || busy) return;
    setInput('');
    setError(null);
    const historial = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    addMessage('user', pregunta);
    setBusy(true);
    try {
      const res = await api.iaConsulta(pregunta, historial);
      addMessage('assistant', res.respuesta);
    } catch (err) {
      setError(err.message);
      addMessage('assistant', `No pude responder: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const regenerateSummary = async () => {
    if (busy || !status?.configurada) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.iaResumen();
      addMessage('assistant', `Resumen actualizado del turno:\n\n${res.resumen}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setMessages([]);
    setError(null);
    pushToast('Conversación limpiada', 'success');
  };

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-purple/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple/40 bg-purple/15 text-purple shadow-[0_0_30px_rgba(167,139,250,0.25)]">
              <BrainCircuit size={28} />
            </span>
            <div>
              <p className="flex flex-wrap items-center gap-2 text-xl font-black">
                SmartRoad Copilot
                <span className="rounded-full border border-purple/40 bg-purple/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-purple">
                  IA operativa
                </span>
              </p>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
                Asistente del centro de control: responde con el estado real de la flota, alertas y eventos.
                Puede resumir el turno, priorizar riesgos y proponer acciones.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                <span
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bold ${
                    status?.configurada
                      ? 'border-success/40 bg-success/10 text-success'
                      : status
                        ? 'border-warning/40 bg-warning/10 text-warning'
                        : 'border-border bg-surface-2 text-faint'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {status?.configurada ? 'Modelo conectado' : status ? 'Modo local' : 'Comprobando…'}
                </span>
                {status?.modelo_texto && (
                  <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-faint">
                    {status.configurada ? status.modelo_texto : 'resumen local · sin clave'}
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-muted">
                  <ShieldCheck size={11} className="text-success" /> La clave vive solo en el backend
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost text-xs" onClick={regenerateSummary} disabled={busy || !status}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Actualizar resumen
            </button>
            <button className="btn-ghost text-xs" onClick={clear} disabled={!messages.length}>
              <Trash2 size={14} /> Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="card flex min-h-[560px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <p className="section-title">Conversación</p>
            <span className="font-mono text-[10px] text-faint">{messages.length} mensaje(s)</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.length === 0 && !busy && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple/30 bg-purple/10 text-purple">
                  <Sparkles size={28} />
                </span>
                <p className="text-sm font-bold">Pregúntale algo al copiloto</p>
                <p className="max-w-sm text-xs text-muted">
                  Puede analizar la flota, priorizar alertas, explicar eventos y ayudarte a preparar reportes.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <Message key={`${m.ts}-${i}`} role={m.role} content={m.content} />
            ))}

            {busy && (
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple/15 text-purple">
                  <BrainCircuit size={15} />
                </span>
                <div className="rounded-2xl rounded-tl-sm border border-border bg-surface-2 px-4 py-3">
                  <p className="flex items-center gap-2 text-[11px] text-muted">
                    <Loader2 size={13} className="animate-spin text-purple" /> Analizando el contexto de la operación…
                  </p>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[11px] text-danger-bright">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <div className="border-t border-border bg-surface-2/60 px-4 py-3.5">
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                className="field min-h-[46px] resize-none"
                placeholder={status?.configurada ? 'Escribe tu pregunta… (Enter para enviar, Shift+Enter para salto de línea)' : 'Configura GROQ_API_KEY para conversar con el copiloto'}
                value={input}
                disabled={busy || !status?.configurada}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button
                className="btn-primary h-[46px] shrink-0"
                onClick={() => send()}
                disabled={busy || !input.trim() || !status?.configurada}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Enviar
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="section-title mb-3 flex items-center gap-1.5"><Lightbulb size={13} className="text-warning" /> Preguntas sugeridas</p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy || !status?.configurada}
                  className="w-full rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5 text-left text-[11px] leading-snug text-muted transition-colors hover:border-purple/40 hover:bg-purple/5 hover:text-text disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title mb-3">Qué usa como contexto</p>
            <div className="space-y-2 text-[11px] text-muted">
              <ContextRow label="Flota" desc="vehículos, placa, riesgo, velocidad y ruta" />
              <ContextRow label="Conductores" desc="estado, jornada y fatiga registrada" />
              <ContextRow label="Alertas" desc="activas, gestionadas y emergencias" />
              <ContextRow label="Eventos" desc="últimos micro sueños, fatiga y SOS" />
              <ContextRow label="Configuración" desc="alertas y número de emergencia" />
            </div>
          </div>

          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-[10px] leading-relaxed text-muted">
            <p className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider text-warning">
              <AlertTriangle size={11} /> Uso responsable
            </p>
            La IA es una ayuda para el operador. Las decisiones de seguridad y emergencia deben ser confirmadas por una persona.
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ role, content }) {
  const assistant = role === 'assistant';
  return (
    <div className={`flex items-start gap-3 ${assistant ? '' : 'flex-row-reverse'}`}>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
          assistant ? 'bg-purple/15 text-purple' : 'bg-danger/15 text-danger-bright'
        }`}
      >
        {assistant ? <BrainCircuit size={15} /> : 'TÚ'}
      </span>
      <div
        className={`max-w-[85%] rounded-2xl border px-4 py-3 text-[12px] leading-relaxed ${
          assistant
            ? 'rounded-tl-sm border-border bg-surface-2 text-muted'
            : 'rounded-tr-sm border-danger/25 bg-danger/10 text-text'
        }`}
      >
        <RichText text={content} />
      </div>
    </div>
  );
}

function RichText({ text }) {
  const lines = String(text || '').split(/\n/);
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        if (/^[-•*]\s+/.test(trimmed)) {
          return (
            <p key={i} className="flex gap-2">
              <span className="mt-[2px] text-purple">•</span>
              <span>{formatInline(trimmed.replace(/^[-•*]\s+/, ''))}</span>
            </p>
          );
        }
        if (/^\d+[.)]\s+/.test(trimmed)) {
          return (
            <p key={i} className="flex gap-2">
              <span className="font-bold text-purple">{trimmed.match(/^\d+/)[0]}.</span>
              <span>{formatInline(trimmed.replace(/^\d+[.)]\s+/, ''))}</span>
            </p>
          );
        }
        if (/^#{1,3}\s+/.test(trimmed)) {
          return (
            <p key={i} className="pt-1 text-[12px] font-bold text-text">
              {formatInline(trimmed.replace(/^#{1,3}\s+/, ''))}
            </p>
          );
        }
        return <p key={i}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

function formatInline(text) {
  // Negritas simples **texto** sin dependencias.
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-bold text-text">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function ContextRow({ label, desc }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
      <span className="font-bold text-text">{label}</span>
      <span className="text-right text-[10px] text-faint">{desc}</span>
    </div>
  );
}
