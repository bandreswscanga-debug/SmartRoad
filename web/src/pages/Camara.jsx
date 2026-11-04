import CameraDrowsiness from '../components/CameraDrowsiness';

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
    </div>
  );
}
