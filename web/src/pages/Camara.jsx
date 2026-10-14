import { useEffect, useState } from 'react';
import CameraDrowsiness from '../components/CameraDrowsiness';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { Sparkles } from 'lucide-react';

export default function Camara() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-black">Cámara IA</h1>
        <p className="text-xs text-muted">
          Prueba de detección de somnolencia por visión artificial. Aquí se activa la cámara;
          el Monitoreo queda solo para telemetría y flota.
        </p>
      </div>
      <CameraDrowsiness />
      <IaAnalysis />
    </div>
  );
}

function IaAnalysis() {
  const { vehicles, pushToast } = useApp();
  const [estado, setEstado] = useState(null);
  const [vehiculoId, setVehiculoId] = useState('');
  const [nivel, setNivel] = useState('MEDIO');
  const [resultado, setResultado] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.iaEstado().then(setEstado).catch(() => {});
  }, []);

  async function pedir() {
    if (!vehiculoId) {
      pushToast('Seleccione un vehículo para el análisis', 'warning');
      return;
    }
    setBusy(true);
    setResultado(null);
    try {
      const data = await api.iaAnalizar({
        vehiculo_id: Number(vehiculoId),
        tipo: 'FATIGA_PROLONGADA',
        riesgo: nivel,
        descripcion: 'Análisis solicitado desde la sección Cámara del panel.'
      });
      setResultado(data.analisis);
    } catch (err) {
      pushToast(err.message, 'critical');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <p className="flex items-center gap-2 text-sm font-extrabold">
        <Sparkles size={16} className="text-info" /> Análisis IA (Groq, solo backend)
      </p>
      {!estado?.configurada && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          IA no configurada: defina GROQ_API_KEY en backend/.env (key gratis en console.groq.com/keys).
          Modelo de texto: {estado?.modelo_texto || '…'} · Visión: {estado?.modelo_vision || '…'}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <select className="field" value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)}>
          <option value="">Vehículo…</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.codigo} · {v.placa}</option>
          ))}
        </select>
        <select className="field" value={nivel} onChange={(e) => setNivel(e.target.value)}>
          <option value="BAJO">BAJO</option>
          <option value="MEDIO">MEDIO</option>
          <option value="CRITICO">CRITICO</option>
        </select>
        <button className="btn-primary" disabled={busy} onClick={pedir}>
          {busy ? 'Analizando…' : 'Pedir análisis'}
        </button>
      </div>
      {resultado && (
        <p className="rounded-lg border border-border-soft bg-surface-2 px-3.5 py-3 text-xs leading-relaxed">
          {resultado}
        </p>
      )}
    </div>
  );
}
