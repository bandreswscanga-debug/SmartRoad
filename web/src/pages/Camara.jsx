import CameraDrowsiness from '../components/CameraDrowsiness';

export default function Camara() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-black">Cámara IA</h1>
        <p className="text-xs text-muted">
          Detección de somnolencia por visión artificial. Usa los botones para iniciar o detener la cámara.
        </p>
      </div>
      <CameraDrowsiness />
    </div>
  );
}
