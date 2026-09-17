# SmartRoad S.O.S 🛡️

Sistema de detección de somnolencia y fatiga del conductor mediante visión artificial, telemetría en tiempo real y emergencia, basado en el ERS "PROYECTO SENA" (requisitos funcionales RF1–RF10).

## Arquitectura

```
┌──────────────┐   MQTT/TCP    ┌──────────────────┐   REST + SSE   ┌──────────────────┐
│  Sensor ESP32 │ ───────────▶ │     Backend      │ ◀────────────▶ │    Panel web     │
│  (cámara +    │   telemetría │  Node + Express  │    JWT, eventos│  React + Vite    │
│   acelerómetro)│             │  MySQL (fallback │                │  (localhost:5173)│
└──────────────┘               │   in-memory)     │                └──────────────────┘
                               │  (localhost:4000)│ ◀────────────▶ App móvil Flutter
                               └──────────────────┘   REST + JWT  (conductor)
```

## Estructura del monorepo

| Carpeta     | Contenido                                                        |
| ----------- | ---------------------------------------------------------------- |
| `backend/`  | API REST (Express 5), JWT, persistencia MySQL con fallback en memoria, motor SSE + simulación |
| `web/`      | Panel de control del centro de vigilancia (React + Vite + Tailwind v4) |
| `mobile/`   | App Flutter del conductor (monitoreo, SOS, historial, configuración) |

## Requisitos (RF) cubiertos

- **RF1** Detección de somnolencia/micro sueños ≤ 2 s (RNF1) — eventos `MICRO_SUENO`, `SOMNOLENCIA_ALTA`, `FATIGA_PROLONGADA`, `DISTRACCION`
- **RF2** Alerta al conductor (sonora / vibración / visual) — configurable (CU-05)
- **RF3** Alerta persistente hasta reacción; **RF4** SOS manual y automático con GPS
- **RF8** Semáforo de riesgo verde/amarillo/rojo en panel y app
- **RF9** Sugerencia de pausa; **RF10** Registro y seguimiento de eventos (historial, reportes)
- **RF11/RNF** Panel web de control, mapas, estadísticas, gestión de conductores

## Cómo ejecutar

### 1. Backend (puerto 4000)

> En este entorno no hay `npm`, se usa **pnpm**. MySQL no está activo → el sistema corre en modo memoria (demo) automáticamente.

```bash
cd backend
pnpm install
pnpm start        # http://localhost:4000/api/health
```

Credenciales admin: `bandreswscanga@hgmail.com` / `5304566767`

Activar MySQL (opcional):

```bash
# configurar MYSQL_URL en backend/.env, p. ej. mysql://root:pass@localhost:3306/smartroad_sos
pnpm db:setup    # crea esquema + seed
pnpm start
```

La simulación crea una alerta crítica ~8 s tras el arranque y luego escala un vehículo no crítico cada ~95 s, emitiendo eventos por **SSE** en `GET /api/live/stream`.

**Ciclo completo de la alerta (RF3/RF4):** si un vehículo ya tiene una alerta ACTIVA, un nuevo evento CRITICO/SOS no duplica la alerta (`created:false`). Si llega un evento de recuperación (`riesgo:BAJO` o tipo `OK / SANO / SOS_RESUELTO / SOS_CANCELADO / RECUPERADO / DESTINO`), la alerta se resuelve automáticamente como `GESTIONADA` y el vehículo vuelve a riesgo `BAJO`, emitiendo `alert_resolved` por SSE.

### 2. Panel web (puerto 5173)

```bash
cd web
pnpm install
pnpm dev         # http://localhost:5173  (proxy /api → :4000)
pnpm build       # build de producción en web/dist
```

### 3. App móvil (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

Screens: Login · Monitoreo (semáforo RF8 + fatiga en vivo) · SOS (RF4) · Historial (RF10) · Configuración (CU-05).

URL de la API por defecto: `http://10.0.2.2:4000` (emulador Android). Se puede cambiar en `mobile/lib/services/api.dart` (`baseUrl`).

## Endpoints principales

| Método | Ruta                       | Descripción                          |
| ------ | -------------------------- | ------------------------------------ |
| POST   | `/api/auth/login`          | JWT                                 |
| GET    | `/api/dashboard/summary`   | Resumen del centro de control       |
| GET    | `/api/vehicles`            | Flota con estado y riesgo           |
| GET/PUT| `/api/config`              | Configuración de alertas (CU-05)    |
| GET    | `/api/events`              | Historial de eventos (RF10)         |
| GET    | `/api/alerts`              | Alertas activas/resueltas           |
| POST   | `/api/telemetry/event`     | Ingreso telemetría (ESP32/app móvil); si el riesgo es CRITICO o tipo SOS crea una alerta activa (RF4) |
| POST   | `/api/telemetry/drowsiness-test` | Prueba del módulo de cámara IA del panel (`nivel`: BAJO/MEDIO/CRITICO); CRITICO genera alerta activa |
| GET    | `/api/live/stream`         | SSE en tiempo real                  |
| GET    | `/api/safe-zones`          | Zonas seguras (RF9)                 |

## Notas de entorno verificadas

- Instalado con pnpm 11 (sin npm); en `web/pnpm-workspace.yaml` se habilitó `allowBuilds: esbuild`.
- Tailwind v4: sin `@apply` de clases de componentes; utilidades inline.
- CORS restringido a orígenes configurados (`CORS_ORIGIN` en `backend/.env`, por defecto `http://localhost:5173,http://localhost:4173`); peticiones de otros orígenes no reciben `Access-Control-Allow-Origin`.
- Firma de alertas: al hacer clic en **Confirmar atención** en el modal crítico del panel, se reenvía el evento vía SSE a todas las sesiones; el panel reacciona a `alert_resolved` (quita la alerta, para la alarma sonora y avisa con toast).
- El módulo de cámara IA (`web/src/components/CameraDrowsiness.jsx`) está integrado en **Monitoreo** y registra eventos/alarmas vía `POST /api/telemetry/drowsiness-test` (antes estaba huérfano y roto).
- Las alertas críticas reproducen una **alarma sonora en el panel** que se silencia al confirmar o cerrar el modal (RF3); los CRITICO/SOS repetidos no generan alertas duplicadas.
- La app móvil carga el token persistido automáticamente (`ApiClient`), por lo que Historial y Configuración ya no fallan con 401.