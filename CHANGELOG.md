# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Este proyecto no ha tenido lanzamientos públicos numerados uniformemente hasta esta versión.

## [Sin publicar]

### IA y operación
- Detección de somnolencia en el panel web reconstruida: malla facial de 478 puntos,
  blendshapes de MediaPipe, PERCLOS por ventana temporal, parpadeo, bostezo, postura
  de cabeza, puntaje de riesgo, calibración personal e histéresis.
- Nuevo **Copiloto IA** (`/asistente`) con contexto real de flota, alertas y eventos;
  endpoints `POST /api/ia/consulta` y `GET /api/ia/resumen` sobre Groq.
- Panel de inicio con flujo operativo guiado y acciones rápidas.

### Correo y APK
- Correo de bienvenida rediseñado (HTML profesional) con credenciales y pasos de inicio.
- Adjunto automático del APK cuando respeta el límite del proveedor; si no, botón de
  descarga directa servido por `GET /api/app/apk` (siempre incluido en el correo).
- `GET /api/app-info` con estado, tamaño y modo de entrega del APK.
- Reenvío del correo desde Conductores (`POST /api/drivers/:id/resend-welcome`).

### Exportaciones
- Menú de exportación en Historial, Reportes y Conductores: PDF (impresión A4),
  Excel con formato, HTML autocontenido y CSV con BOM UTF-8.
- Informes con encabezado de marca, KPIs, tablas con insignias de riesgo y notas.

## [v0.1.0-beta] — 2026-09-17

Fase beta del sistema. Primer lanzamiento versionado del monorepo.

### Módulo transversal (requisito universal)
- Endpoint público `GET /api/health`: estado, uptime y ping a la base de datos.
- Tabla `system_logs` (trazabilidad ciega) con auto-registro de:
  - Intentos de login fallidos (contraseña incorrecta / usuario inexistente) como `ERROR`.
  - Errores de conexión a la base de datos como `ERROR`.
  - Logins exitosos como `INFO`.
- Lectura administrativa de trazabilidad en `GET /api/system/logs` (rol admin).
- Resiliencia: el servidor no cae ante caída de BD y se reconecta automáticamente.

### Backend
- Refactor para testing: `createApp()` exportada; el servidor escucha solo al ejecutarse directo.
- Suite automatizada (node:test): 6 tests para health, autenticación, `system_logs` y Swagger.
- Documentación OpenAPI (Swagger UI) en `GET /api/docs`.
- Corrección de JOIN en `/api/events` para el modo MySQL.
- Seed alineado a credenciales demo documentadas.

### Seguridad
- Cabeceras de seguridad con `helmet`.
- Rate limit en `/api/auth` (10 intentos / 15 min).
- Validación de entrada en login (correo y longitud de contraseña).
- Límite de 100 kb en peticiones JSON; CORS restringido.

### Operación
- Configuración pnpm 11 reproducible (`pnpm-workspace.yaml` + `.npmrc`).
- Esquema y seed aplicados sobre MariaDB (XAMPP).

### Documentación
- `docs/ESTADO_DEL_PROYECTO.md`: estado por capa, RF, módulo transversal, pruebas y roadmap.
- `README.md` actualizado (endpoints y comandos).
- Entregables de la Fase 1 (auto-auditoría y auditoría de grupo par) en `Entregables/`.

## Pendientes hacia MVP
- Compilar y validar la app móvil (SDK Flutter).
- Integración ESP32/telemetría real (MQTT).
- Despliegue (Docker) y revisión final antes de la entrega de diciembre.