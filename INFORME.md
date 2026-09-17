# Informe completo — Mejoras al proyecto SmartRoad S.O.S

**Fecha:** 16/09/2026 · **Entorno:** Linux (Hyprland) · `~/SmartRoadSOS` (no es repositorio git)

---

## 1. Resumen ejecutivo

Se auditaron y mejoraron las tres capas del sistema (backend, panel web y app móvil). El trabajo se
dividió en **dos rondas**: la primera corrigió bugs que rompían funciones anunciadas (cámara IA,
alarma sonora, botón de cierre de toasts, APK falso, backend sin arranque por ruta de schema) y la
segunda cerró el **ciclo de vida completo de las alertas** (sin duplicados + auto-resolución por
recuperación del conductor) y endureció el backend (CORS).

Todo el código se verificó con build de producción del panel web y smoke tests reales contra la API.
La app móvil **no se pudo compilar** porque `flutter`/`dart` no están instalados en este equipo.

---

## 2. Estado inicial (diagnóstico)

| Componente | Problema detectado |
| --- | --- |
| Backend `scripts/setup-db.js` | Ruta de `schema.sql` apuntaba a `backend/database/schema.sql` como si estuviera en `src/` → `db:setup` rompía |
| Backend `/telemetry/event` | Los eventos `SOS`/`CRITICO` **no escalaban** a alerta activa (incumple RF4) |
| Backend | No existía endpoint para el módulo de cámara IA del panel (el front lo llamaba y daba 404) |
| Backend CORS | `app.use(cors())` abría todos los orígenes |
| Backend `getEvent` (MySQL) | No devolvía `vehiculo_codigo`/`conductor_nombre` (unión a vehículos/conductor) |
| Web `CameraDrowsiness.jsx` | Componente **huérfano** (no estaba montado) y llamaba a un método inexistente |
| Web `Monitoreo.jsx` | Medidor de fatiga **invertido** + `useEffect` que re-ejecutaba la petición cada ~4 s (bucle por SSE) |
| Web `AppContext.jsx` | No exponía `dismissToast`; `alert_resolved` estaba mal manejado |
| Web `Toasts.jsx` | Botón **X** no cerraba el toast |
| Web `alarm.js` | No desbloqueaba el `AudioContext` del navegador → la alarma fallaba por autoplay |
| Web `CriticalAlertModal.jsx`/`Alertas.jsx` | Número de emergencia **fijo `tel:123`** en vez de `config.numero_emergencia` |
| Web `AppMovil.jsx` | **APK falso/QR falso**, URL API equivocada, copy engañoso ("GPS conectado" sin GPS) |
| Web `format.js` | `timeAgo`/`fmtUptime` sin guardas (NaN/null) |
| Web `Header.jsx` | Estado `INACTIVO` del sistema no contemplado |
| Web `RouteMap.jsx` | Color inválido `#3b5d` (hex corto) |
| Móvil `api.dart` | No cargaba el token persistido → Historial/Config devolvían **401** |
| Móvil `login_screen.dart` | Guardaba el usuario con `Map.toString()` (JSON roto) |
| Móvil `config_screen.dart` | `TextEditingController` creado en cada build y nunca liberado |

---

## 3. Mejoras aplicadas — BACKEND (`backend/`)

### 3.1 Ronda 1 (bugs + RF faltantes)
- `src/scripts/setup-db.js`: corregida la ruta del esquema (`..` → `.., ..`) buscando
  `backend/database/schema.sql`.
- `src/services/storage.js` (`MemoryStore`):
  - `createEvent` y `createAlert` ahora adjuntan `vehiculo_codigo`, `conductor_nombre` y `ruta`
    automáticamente desde el vehículo.
- `src/routes/telemetry.js`:
  - `POST /event` **escala** eventos `CRITICO`/`SOS` a alerta activa (helper `maybeCriticalAlert`)
    y difunde `alert_critical` por SSE (RF4).
  - Nuevo endpoint **`POST /telemetry/drowsiness-test`** para la cámara IA del panel:
    `nivel: BAJO|MEDIO|CRITICO` → `DISTRACCION|MICRO_SUENO|SOMNOLENCIA_ALTA`, canal `CAMARA`,
    público (default vehículo `TRK-001`), genera alerta si `CRITICO`, valida niveles.

### 3.2 Ronda 2 (ciclo de vida de la alerta + seguridad)
- `src/routes/telemetry.js`:
  - **Dedupe de alertas**: si el vehículo ya tiene una alerta ACTIVA, un nuevo CRITICO/SOS ya **no
    crea una alerta duplicada** (`{created:false}` devuelve la existente y no re-dispara la alarma
    sonora en el panel).
  - **Auto-resolución por recuperación** (`maybeRecover`): si llega un evento con `riesgo: BAJO` o
    tipo `OK / SANO / SOS_RESUELTO / SOS_CANCELADO / RECUPERADO / DESTINO` mientras el vehículo tiene
    una alerta ACTIVA, la alerta pasa a `GESTIONADA` (`accion: ZONA_SEGURA`), el evento se marca
    `atendido`, el vehículo vuelve a riesgo `BAJO` y se emite `alert_resolved` por SSE.
- `src/services/storage.js` (ambos stores):
  - Nuevos métodos `getActiveAlertByVehicle()` y `countActiveAlerts()`.
  - `MySqlStore.getEvent` ahora hace `LEFT JOIN` a vehículos/conductores (consistencia con `listEvents`).
- `src/server.js`: **CORS restringido** a orígenes de `CORS_ORIGIN` (env, default
  `http://localhost:5173,http://localhost:4173`); otros orígenes no reciben `Access-Control-Allow-Origin`.

---

## 4. Mejoras aplicadas — PANEL WEB (`web/`)

- `src/api/client.js`: `request()` con `AbortController` + timeout (12 s) y método `testDrowsiness()`.
- `src/pages/Monitoreo.jsx`:
  - **`CameraDrowsiness` montado** (antes huérfano) con sus niveles BAJO/MEDIO/CRITICO.
  - Medidor de fatiga **corregido** (función `fatigueFor`: CRITICO 86 / MEDIO 62 / BAJO 24).
  - Fin del **bucle de refetch** (`useEffect` con deps correctas + `eslint-disable`).
  - Pill de estado de conexión (Wifi / WifiOff).
- `src/store/AppContext.jsx`:
  - Expone `dismissToast`; **`primeAudio()`** al montar (desbloquea audio por autoplay).
  - Reproduce/alza la **alarma sonora** en `alert_critical`; la detiene en `actionAlert`,
    `dismissCritical` y `logout` (RF3).
  - Handler `alert_resolved` reescrito: quita la alerta de la lista, corta la alarma, cierra el modal
    y notifica con toast `Alerta atendida` (sincroniza sesiones múltiples).
- `src/utils/alarm.js`: nuevo `primeAudio()`.
- `src/components/Toasts.jsx`: botón X → `dismissToast(t.id)`.
- `src/components/CriticalAlertModal.jsx`: usa `config.numero_emergencia`, maneja errores con toast,
  guard NaN en cronómetro.
- `src/pages/Alertas.jsx`: botón de emergencia abre `tel:` con el número configurado.
- `src/pages/AppMovil.jsx`: **eliminado el APK/QR falso**; pasos reales de compilación
  (`flutter build apk`); URL API corregida a `http://10.0.2.2:4000`; copy honesto (ESP32/GPS "en desarrollo").
- `src/utils/format.js`: guardas null/NaN en `timeAgo`/`fmtUptime`; `download()` revoca el objeto URL.
- `src/components/Header.jsx`: `SystemState` soporta el estado `INACTIVO` (ámbar).
- `src/components/RouteMap.jsx`: color corregido `#3b82f6` (era `#3b5d`).

---

## 5. Mejoras aplicadas — APP MÓVIL (`mobile/`)

- `lib/services/api.dart` (ApiClient):
  - Carga automática del **token persistido** (`SharedPreferences srs_token`) antes de cada petición
    → Historial y Configuración dejaron de devolver **401**.
  - Ante un `401` se limpia el token local (la sesión expira limpiamente).
- `lib/screens/login_screen.dart`: el usuario se persiste con `jsonEncode` (antes `Map.toString()`).
- `lib/screens/config_screen.dart`: `TextEditingController` como campo con `dispose()` (antes se
  recreaba en cada build).

> Nota: no se pudo compilar/ejecutar la app (no hay Flutter/Dart instalado). Los cambios son
> sintácticos y de flujo; requieren `flutter analyze` en un equipo con el SDK.

---

## 6. Pruebas realizadas (evidencia)

1. **Build web de producción**: `pnpm build` → éxito (1597 módulos, `dist/` generado).
2. **Backend arranca** y `/api/health` responde `{"ok":true,...}`.
3. **Login JWT**: admin `bandreswscanga@hgmail.com` → token válido.
4. **`drowsiness-test` CRITICO (TRK-001)** → crea evento `SOMNOLENCIA_ALTA` + alerta ACTIVA.
5. **`drowsiness-test` CRITICO repetido** → devuelve la **misma alerta** (sin duplicados).
6. **`drowsiness-test` MEDIO** → evento `MICRO_SUENO`, `alert: null` (correcto).
7. **`drowsiness-test` nivel inválido** → `400 {"error":"nivel debe ser BAJO, MEDIO o CRITICO"}`.
8. **`/telemetry/event SOS` (VAN-007)** → crea alerta ACTIVA con `vehiculo_codigo`.
9. **Recuperación** (`tipo:OK, riesgo:BAJO` en VAN-007) → alerta `GESTIONADA`/`ZONA_SEGURA`,
   vehículo a riesgo `BAJO`, `recovered` devuelto.
10. **CORS**: origen `http://localhost:5173` recibe `Access-Control-Allow-Origin`;
    `http://evil.example` **no** lo recibe.

---

## 7. Quedan pendientes / recomendaciones

- **App móvil**: compilar con `flutter analyze/build` (falta SDK). Pendientes razonables:
  redirigir a Login ante `401`, pantalla de detalle de evento, sonido/vibración vía `SystemSound`.
- **MySQL**: probar `pnpm db:setup` + modo persistente con `MYSQL_URL` real (aquí se usa memoria).
- **Seguridad**: hash de contraseñas (hoy hay contraseñas planas en memoria), `JWT_SECRET` en env,
  `helmet`, validación de entrada con un esquema (zod/joi), límite de tasa en `/auth/login`.
- **Tests automatizados**: no hay suite; conviene Vitest (web), node:test (backend) y `integration`.
- **Git**: el proyecto no es repositorio git; recomendable inicializar y commitear el estado actual.

---

## 8. Anexo — cómo ejecutar

```bash
# Backend (puerto 4000) — en memoria por defecto
cd backend && pnpm start          # http://localhost:4000/api/health

# Panel web (proxy → :4000)
cd web && pnpm dev                # http://localhost:5173
#         pnpm build              # dist/ (también servido por el backend en /)

# App móvil (requiere SDK Flutter)
cd mobile && flutter pub get && flutter run
```

Credenciales demo: admin `bandreswscanga@hgmail.com` / `5304566767` · conductor `juan@smartroad.com` / `conductor123`.

Endpoints destacados: `POST /api/telemetry/event`, `POST /api/telemetry/drowsiness-test`,
`GET /api/live/stream` (SSE), `POST /api/alerts/:id/actions`.