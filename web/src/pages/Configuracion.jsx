import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { Volume2, Vibrate, Eye, PhoneCall, Gauge, Save, Timer, AlertTriangle } from 'lucide-react';
import { Toggle, Spinner } from '../components/ui';

export default function Configuracion() {
  const { config, user, pushToast } = useApp();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (config && !form) setForm({ ...config });
  }, [config, form]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isAdmin = user?.rol === 'admin';

  const save = async () => {
    if (!isAdmin) {
      pushToast('Solo administradores pueden modificar la configuración', 'warning');
      return;
    }
    setBusy(true);
    try {
      const { config: saved } = await api.updateConfig(form);
      setForm({ ...saved });
      pushToast('Configuración guardada y sincronizada con los dispositivos', 'success');
    } catch (err) {
      pushToast(err.message, 'critical');
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <Spinner label="Cargando configuración…" />;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="card p-6">
          <p className="section-title mb-1">Tipo de alerta al conductor (CU-05 / RF2)</p>
          <p className="mb-5 text-xs text-muted">Seleccione cómo quiere ser alertado el conductor cuando se detecte somnolencia.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Option icon={Volume2} title="Alerta sonora" desc="Tono agudo para despertar al conductor (RF2 / RNF6)" checked={form.alerta_sonora} onChange={(v) => set('alerta_sonora', v)} />
            <Option icon={Vibrate} title="Vibración" desc="Vibración en el volante o dispositivo" checked={form.alerta_vibracion} onChange={(v) => set('alerta_vibracion', v)} />
            <Option icon={Eye} title="Alerta visual" desc="Luz del semáforo de riesgo (RF8)" checked={form.alerta_visual} onChange={(v) => set('alerta_visual', v)} />
          </div>
        </div>

        <div className="card p-6">
          <p className="section-title mb-5">Umbrales del sistema de riesgo</p>
          <div className="space-y-6">
            <RangeInput
              icon={Gauge}
              label="Sensibilidad del sensor"
              value={form.sensibilidad}
              min={20}
              max={100}
              onChange={(v) => set('sensibilidad', v)}
              hint={`${form.sensibilidad}% · mayor valor = detección más temprana de micro sueños (RF1)`}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold">
                  Umbral amarillo <span className="text-warning">(alerta)</span>
                </label>
                <input type="range" min={20} max={90} value={form.umbral_amarillo} onChange={(e) => set('umbral_amarillo', Number(e.target.value))} className="w-full accent-yellow-400" />
                <p className="mt-1 text-[11px] text-faint">Actual: {form.umbral_amarillo} % — sobre este valor se sugiere pausa (RF9).</p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold">
                  Umbral rojo <span className="text-danger-bright">(peligro / SOS)</span>
                </label>
                <input type="range" min={30} max={100} value={form.umbral_rojo} onChange={(e) => set('umbral_rojo', Number(e.target.value))} className="w-full accent-red-500" />
                <p className="mt-1 text-[11px] text-faint">Actual: {form.umbral_rojo} % — sobre este valor se activa emergencia (RF4/RF8).</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <p className="section-title mb-5">Configuración de emergencia (RF4)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
                <PhoneCall size={14} className="text-info" /> Número de emergencia
              </label>
              <input className="field font-mono" value={form.numero_emergencia} onChange={(e) => set('numero_emergencia', e.target.value)} disabled={!isAdmin} />
            </div>
            <div className="space-y-3 sm:pt-5">
              <div className="flex items-center justify-between rounded-lg border border-border-soft bg-surface-2 px-4 py-3">
                <div>
                  <p className="text-xs font-bold">SOS automático (RF4)</p>
                  <p className="text-[11px] text-faint">Después de N segundos sin reacción</p>
                </div>
                <Toggle checked={form.auto_sos} onChange={(v) => set('auto_sos', v)} disabled={!isAdmin} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border-soft bg-surface-2 px-4 py-3">
                <div>
                  <p className="text-xs font-bold">Sugerir pausa (RF9)</p>
                  <p className="text-[11px] text-faint">Aviso automático al detectar fatiga</p>
                </div>
                <Toggle checked={form.solicitar_pausa} onChange={(v) => set('solicitar_pausa', v)} disabled={!isAdmin} />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border-soft bg-surface-2 p-4">
            <label className="flex items-center gap-1.5 text-xs font-bold">
              <Timer size={14} className="text-info" /> Tiempo de cierre de ojos para considerar micro sueño (RF1)
            </label>
            <div className="mt-3 flex items-center gap-3">
              <input type="range" min={400} max={3000} step={100} value={form.tiempo_ojos_cerrados_ms} onChange={(e) => set('tiempo_ojos_cerrados_ms', Number(e.target.value))} className="flex-1 accent-red-500" disabled={!isAdmin} />
              <span className="w-24 text-right font-mono text-sm font-bold text-text tabular">
                {((form.tiempo_ojos_cerrados_ms || 0) / 1000).toFixed(1)} s
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-6 lg:sticky lg:top-20">
          <p className="section-title mb-4">Resumen</p>
          <dl className="space-y-3 text-xs">
            <Row k="Alerta sonora" v={form.alerta_sonora ? 'Activada' : 'Desactivada'} tone={form.alerta_sonora ? 'ok' : 'no'} />
            <Row k="Vibración" v={form.alerta_vibracion ? 'Activada' : 'Desactivada'} tone={form.alerta_vibracion ? 'ok' : 'no'} />
            <Row k="Alerta visual (RF8)" v={form.alerta_visual ? 'Activada' : 'Solo semáforo físico'} tone="muted" />
            <Row k="Emergencia" v={form.numero_emergencia} tone="muted" mono />
            <Row k="Respuesta (RNF1)" v="≤ 2 segundos" tone="ok" />
            <Row k="Acceso" v={isAdmin ? 'Administrador' : 'Solo lectura'} tone={isAdmin ? 'ok' : 'no'} />
          </dl>

          <button onClick={save} disabled={busy || !isAdmin} className="btn-primary mt-5 w-full">
            <Save size={16} /> {busy ? 'Guardando…' : 'Guardar configuración'}
          </button>

          {!isAdmin && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-[11px] text-warning">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Guardar configuración está restringido. Inicie sesión como administrador.
            </p>
          )}
        </div>

        <div className="card p-6">
          <p className="section-title mb-3">Dispositivos ESP32</p>
          <p className="text-[11px] leading-relaxed text-muted">
            La configuración se sincroniza a la flotilla mediante la API REST ({'POST /api/telemetry/heartbeat'}). El dispositivo se inicia automáticamente con el vehículo (RF6) y es difícil de desactivar (RNF7).
          </p>
        </div>
      </div>
    </div>
  );
}

function Option({ icon: Icon, title, desc, checked, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`cursor-pointer select-none rounded-xl border p-4 text-left transition-all ${checked ? 'border-success/60 bg-success/10' : 'border-border bg-surface-2 hover:bg-surface-3'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${checked ? 'bg-success text-black' : 'bg-surface-3 text-muted'}`}>
          <Icon size={17} />
        </span>
        <Toggle checked={checked} onChange={() => onChange(!checked)} disabled={disabled} />
      </div>
      <p className="mt-3 text-xs font-bold">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{desc}</p>
    </div>
  );
}

function RangeInput({ icon: Icon, label, value, min, max, onChange, hint }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-xs font-bold">
        <Icon size={14} className="text-info" /> {label}
      </label>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-red-500" />
        <span className="w-14 text-right font-mono text-sm font-bold tabular">{value}%</span>
      </div>
      <p className="mt-1.5 text-[11px] text-faint">{hint}</p>
    </div>
  );
}

function Row({ k, v, tone, mono }) {
  const color = tone === 'ok' ? 'text-success' : tone === 'no' ? 'text-danger-bright' : 'text-muted';
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className={`font-semibold ${color} ${mono ? 'font-mono tabular' : ''}`}>{v}</dd>
    </div>
  );
}