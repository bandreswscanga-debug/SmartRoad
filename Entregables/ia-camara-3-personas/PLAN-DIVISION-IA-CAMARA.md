# División de trabajo — IA de cámara para SmartRoad S.O.S.

Este plan divide el módulo de visión por computador entre 3 integrantes. El archivo queda local y no se sube automáticamente al repositorio.

## Objetivo común

Usar la cámara del computador para detectar:

- Ojos cerrados y PERCLOS.
- Cabeceo y movimiento repetitivo de cabeza.
- Cabeza inclinada.
- Bostezos.
- Giro de cabeza/distracción.

La imagen se procesa en el navegador. El backend recibe únicamente el evento y nivel de riesgo.

---

## Tú (Integrante 1) — Visión artificial y cámara

**Rama sugerida:** `feat/ia-vision-camara`

**Archivos promedio:**

```text
web/src/components/CameraDrowsiness.jsx
web/src/utils/drowsiness.js
web/public/mediapipe/
```

**Responsabilidades:**

1. Solicitar permiso de cámara con `getUserMedia`.
2. Mostrar video local y canvas de landmarks.
3. Cargar MediaPipe Face Landmarker.
4. Implementar calibración personal.
5. Detectar EAR y PERCLOS.
6. Detectar cabeceo, cabeza inclinada, bostezo y giro.
7. Ajustar umbrales para evitar falsos positivos.
8. Detener cámara y liberar tracks al salir.
9. Probar con buena luz, poca luz, gafas y rostro parcialmente oculto.

**No debe modificar:** rutas del backend ni archivos de persistencia.

**Criterio de entrega:**

- El botón **Iniciar cámara** funciona.
- La calibración termina y muestra progreso.
- Los indicadores de ojos, cabeceo, bostezo y cabeza aparecen en pantalla.
- `pnpm build` finaliza sin errores.

---

## Compañero/a 2 — Backend, eventos y alertas

**Rama sugerida:** `feat/ia-backend-alertas`

**Archivos promedio:**

```text
backend/src/routes/telemetry.js
backend/src/services/storage.js
backend/src/services/engine.js
backend/src/routes/events.js
backend/src/routes/alerts.js
```

**Responsabilidades:**

1. Recibir el evento de la cámara.
2. Validar `nivel` y los datos de la detección.
3. Guardar el evento en MySQL.
4. Crear o reutilizar una alerta crítica sin duplicados.
5. Emitir actualización por SSE.
6. Resolver la alerta cuando el conductor vuelve a un estado normal.
7. Mantener la relación con vehículo y conductor.
8. Añadir pruebas de API para evento, alerta y recuperación.

**Contrato sugerido para la cámara:**

```json
{
  "nivel": "MEDIO",
  "descripcion": "Bostezo y movimiento de cabeza detectado",
  "confidence": 0.87,
  "source": "camera",
  "signals": {
    "ear": 0.18,
    "perclos": 0.42,
    "nodCount": 2,
    "headDown": true,
    "yawn": true,
    "yaw": 4.2
  }
}
```

**Criterio de entrega:**

- El evento aparece en el historial.
- Una detección crítica genera una sola alerta activa.
- La recuperación cambia el estado de la alerta.
- La prueba de backend termina correctamente.

---

## Compañero/a 3 — Integración, QA y evidencias

**Rama sugerida:** `feat/ia-qa-evidencia`

**Archivos promedio:**

```text
web/src/pages/Monitoreo.jsx
web/src/api/client.js
web/src/components/
backend/test/
Entregables/
```

**Responsabilidades:**

1. Verificar que el botón de cámara se vea en Monitoreo.
2. Validar permisos de cámara en Firefox y Chrome.
3. Probar el rostro en distintos escenarios.
4. Confirmar que la calibración no se bloquea.
5. Probar que el evento llega al backend.
6. Confirmar que la alerta aparece en el panel.
7. Probar que Detener libera la cámara.
8. Documentar una vidéo de máximo 3 minutos.
9. Tomar capturas de evidencia.
10. Ejecutar builds y pruebas finales.

**Matriz mínima de pruebas:**

| Caso | Resultado esperado |
|---|---|
| Rostro-centered | Calibración completa |
| Ojos cerrados | Nivel medio/crítico |
| Cabeceo repetido | Contador de cabeceo aumenta |
| Cabeza inclinada | Riesgo medio/crítico |
| Bostezo | Riesgo medio |
| Giro de cabeza | Posible distracción |
| Sin rostro | No generar alarma crítica |
| Detener cámara | Stream cerrado |
| Backend apagado | La cámara local no se bloquea |

**Criterio de entrega:**

- Vídeo funcional de la prueba.
- Capturas de API y persistencia.
- Evidencia de cámara funcionando.
- Checklist completo y sin errores de build.

---

## Contrato y coordinación

### Regla de propiedad de archivos

- Tú (Integrante 1) modificas componentes de visión.
- Compañero/a 2 modifica backend y alertas.
- Compañero/a 3 modifica integración, pruebas y evidencias.
- Si un archivo compartido debe cambiar, primero se avisa en el grupo y se asigna un único responsable.

### Orden de integración

1. Tú (Integrante 1) entregas la cámara y sus señales.
2. Compañero/a 2 conecta esas señales con eventos y alertas.
3. Compañero/a 3 prueba la integración completa y genera evidencias.
4. Se revisan juntas las pruebas antes de hacer merge.

### Ramas

```bash
git fetch origin
git switch main
git pull --ff-only

git switch -c feat/ia-vision-camara
git switch -c feat/ia-backend-alertas
git switch -c feat/ia-qa-evidencia
```

No hacer merge directo a `main` hasta que las tres partes estén revisadas.

---

## Comandos de verificación

```bash
# Frontend
cd /home/oswal/SmartRoadSOS/web
pnpm install
pnpm build

# Backend
cd /home/oswal/SmartRoadSOS/backend
pnpm install
pnpm db:setup
pnpm test
pnpm start

# Ejecutar frontend
cd /home/oswal/SmartRoadSOS/web
pnpm dev
```

## Enlaces de ejecución

```text
Frontend: http://localhost:5173
Monitoreo: http://localhost:5173/monitoreo
Backend: http://localhost:4000
Health: http://localhost:4000/api/health
phpMyAdmin: http://127.0.0.1:8080
```

## Estado inicial

La base actual ya tiene:

```text
MediaPipe Face Landmarker
Detección EAR/PERCLOS
Cámara del navegador
Componente de Monitoreo
Endpoint de evento de drowsiness
Alertas y SSE existentes
```

El siguiente trabajo de las tres personas es completar y validar la integración de las nuevas señales de cabeza, bostezo y distracción.
