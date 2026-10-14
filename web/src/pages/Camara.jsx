import { useState } from 'react';
import CameraDrowsiness from '../components/CameraDrowsiness';
import FaceApiCamera from '../components/FaceApiCamera';

export default function Camara() {
  const [modo, setModo] = useState('mediapipe');
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-black">Cámara IA</h1>
        <p className="text-xs text-muted">
          Prueba de detección de somnolencia por visión artificial. Aquí se activa la cámara;
          el Monitoreo queda solo para telemetría y flota.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          className={modo === 'mediapipe' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setModo('mediapipe')}
        >
          Modo MediaPipe
        </button>
        <button
          className={modo === 'faceapi' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setModo('faceapi')}
        >
          Modo alterno face-api
        </button>
      </div>
      {modo === 'mediapipe' ? <CameraDrowsiness /> : <FaceApiCamera />}
    </div>
  );
}
