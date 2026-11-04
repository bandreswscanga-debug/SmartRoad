import { useState } from 'react';
import { Activity, Camera, CheckCircle2, TestTube2 } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import CameraDrowsiness from '../components/CameraDrowsiness';

export default function ConductorMonitoreo() {
  const { pushToast } = useApp();
  const [busy, setBusy] = useState(false);

  async function registerTest(level) {
    setBusy(true);
    try {
      await api.testDriverDrowsiness(level, `Prueba voluntaria desde el monitoreo del conductor (${level}).`);
      pushToast('La prueba quedó guardada en tus eventos', 'success');
    } catch (error) {
      pushToast(error.message, 'warning');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5 md:col-span-2">
          <p className="section-title mb-2"><Activity size={16} /> Monitoreo personal</p>
          <p className="text-sm leading-6 text-muted">Usa la cámara para realizar una prueba de somnolencia durante tu conducción. Los resultados se guardan únicamente en tu historial personal.</p>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success"><CheckCircle2 size={16} /> Los eventos simulados del administrador no se muestran aquí.</div>
        </div>
        <div className="card flex flex-col justify-between p-5">
          <div><p className="section-title"><Camera size={16} /> Prueba manual</p><p className="mt-2 text-xs text-muted">Registra un evento solo cuando estés probando el sistema.</p></div>
          <button disabled={busy} onClick={() => registerTest('MEDIO')} className="btn-primary mt-5 text-xs"><TestTube2 size={15} />{busy ? 'Guardando…' : 'Registrar prueba'}</button>
        </div>
      </div>
      <CameraDrowsiness />
    </div>
  );
}
