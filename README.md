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
- **Registro de conductores** — alta pública con RUT/cédula, carnet de conducir, vehículo y estado de verificación pendiente para revisión administrativa.
- **Informe integral** — desde Conductores se puede generar un documento imprimible para guardar como PDF con datos personales, vehículo, resumen operativo y últimos eventos de somnolencia.
- **Portal independiente del conductor** — el registro crea la cuenta inmediatamente; `/conductor` solo muestra sus propios datos y eventos voluntarios, nunca la simulación del panel administrativo.
- **Persistencia de respaldo** — cuando no hay MySQL, los registros y eventos propios se guardan en `backend/data/driver-data.json` (ese archivo está ignorado por Git).

## Cómo ejecutar

### 1. Backend (puerto 4000)

> En este entorno no hay `npm`, se usa **pnpm**.  
> 📚 Estado detallado del proyecto, RF cubiertos y roadmap: [`docs/ESTADO_DEL_PROYECTO.md`](docs/ESTADO_DEL_PROYECTO.md).  
> 📦 Historial de versiones: [`CHANGELOG.md`](CHANGELOG.md).

```bash
cd backend
pnpm install
pnpm db:setup    # aplica esquema + seed en MySQL (opcional; ver MYSQL_URL en backend/.env)
pnpm test        # suite automatizada (6 tests) sobre el módulo transversal
pnpm start       # http://localhost:4000/api/health · Swagger: http://localhost:4000/api/docs
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

Screens: Login y registro de conductor · Monitoreo (semáforo RF8 + fatiga en vivo) · SOS (RF4) · Historial personal (RF10) · Configuración (CU-05) · Perfil y exportación PDF.

URL de la API por defecto en este equipo: `http://192.168.137.163:4000`. Para el emulador Android usa `http://10.0.2.2:4000`; para un celular en la misma red cambia `baseUrl` por la IPv4 del computador que ejecuta el backend.

## Endpoints principales

| Método | Ruta                       | Descripción                          |
| ------ | -------------------------- | ------------------------------------ |
| POST   | `/api/auth/login`          | JWT                                 |
| POST   | `/api/auth/register-driver` | Registro público de conductor; queda en estado `PENDIENTE` |
| GET    | `/api/drivers/me/profile` | Perfil del conductor autenticado |
| GET    | `/api/drivers/me/events` | Solo eventos propios del conductor autenticado |
| POST   | `/api/telemetry/driver-drowsiness-test` | Registra una prueba voluntaria del conductor |
| POST   | `/api/telemetry/driver-sos` | Registra un SOS asociado al conductor móvil |
| GET    | `/api/dashboard/summary`   | Resumen del centro de control       |
| GET    | `/api/vehicles`            | Flota con estado y riesgo           |
| GET/PUT| `/api/config`              | Configuración de alertas (CU-05)    |
| GET    | `/api/events`              | Historial de eventos (RF10)         |
| GET    | `/api/alerts`              | Alertas activas/resueltas           |
| POST   | `/api/telemetry/event`     | Ingreso telemetría (ESP32/app móvil); si el riesgo es CRITICO o tipo SOS crea una alerta activa (RF4) |
| POST   | `/api/telemetry/drowsiness-test` | Prueba del módulo de cámara IA del panel (`nivel`: BAJO/MEDIO/CRITICO); CRITICO genera alerta activa |
| GET    | `/api/live/stream`         | SSE en tiempo real                  |
| GET    | `/api/safe-zones`          | Zonas seguras (RF9)                 |
| GET    | `/api/system/logs`         | Trazabilidad `system_logs` (solo admin) |
| GET    | `/api/docs`                | Documentación de la API (Swagger UI) |

## Módulo transversal (Fase 2)

- **`/api/health`**: ruta pública que devuelve estado del servidor, uptime y un ping a la base de datos.
- **`system_logs`**: tabla de trazabilidad ciega (id, fecha_hora, nivel INFO/WARNING/ERROR, origen_ip, mensaje)
  con auto-registro de intentos de login fallido y errores de conexión a la base de datos.

## Notas de entorno verificadas

- Instalado con pnpm 11 (sin npm); en `web/pnpm-workspace.yaml` se habilitó `allowBuilds: esbuild`.
- Tailwind v4: sin `@apply` de clases de componentes; utilidades inline.
- CORS restringido a orígenes configurados (`CORS_ORIGIN` en `backend/.env`, por defecto `http://localhost:5173,http://localhost:4173`); peticiones de otros orígenes no reciben `Access-Control-Allow-Origin`.
- Firma de alertas: al hacer clic en **Confirmar atención** en el modal crítico del panel, se reenvía el evento vía SSE a todas las sesiones; el panel reacciona a `alert_resolved` (quita la alerta, para la alarma sonora y avisa con toast).
- El módulo de cámara IA (`web/src/components/CameraDrowsiness.jsx`) está integrado en **Monitoreo** y registra eventos/alarmas vía `POST /api/telemetry/drowsiness-test` (antes estaba huérfano y roto).
- Las alertas críticas reproducen una **alarma sonora en el panel** que se silencia al confirmar o cerrar el modal (RF3); los CRITICO/SOS repetidos no generan alertas duplicadas.
- La app móvil carga el token persistido automáticamente (`ApiClient`), por lo que Historial y Configuración ya no fallan con 401.