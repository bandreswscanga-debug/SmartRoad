# Estado del proyecto — SmartRoad S.O.S

**Versión:** v0.1.0-beta
**Fecha del corte:** 17/09/2026
**Equipo:** Oswal Alexander Wscanga Bandres

---

## 1. Resumen

SmartRoad S.O.S es un sistema de detección de somnolencia y fatiga del conductor basado en
visión artificial y telemetría en tiempo real. El proyecto está en **fase beta**: el núcleo
funciona y el **módulo transversal** (requisito universal Health Check + Trazabilidad) está
completado, probado y versionado.

Estado por capa:

| Capa | Tecnología | Estado | Nota |
| --- | --- | --- | --- |
| Backend | Node.js + Express 5 + MySQL (MariaDB 10.4) | ✅ Funcional | Modo persistente con fallback en memoria |
| Panel web | React + Vite + Tailwind | ✅ Build OK | Servido por el backend en `/` |
| App móvil | Flutter | ⚠️ Cambios aplicados | Pendiente compilar con SDK Flutter |

## 2. Cobertura de requerimientos funcionales

| RF | Descripción | Estado |
| --- | --- | --- |
| RF1 | Detección de somnolencia / micro sueños ≤ 2 s (RNF1) | ✅ `MICRO_SUENO`, `SOMNOLENCIA_ALTA`, `FATIGA_PROLONGADA`, `DISTRACCION` |
| RF2 | Alerta al conductor (sonora/vibración/visual) | ✅ Configurable (CU-05) |
| RF3 | Alerta persistente hasta reacción | ✅ Sin alertas duplicadas |
| RF4 | SOS manual y automático con GPS | ✅ CRITICO/SOS escalan a alerta ACTIVA |
| RF8 | Semáforo de riesgo verde/amarillo/rojo | ✅ Panel y app |
| RF9 | Sugerencia de pausa | ✅ Config `solicitar_pausa` + zonas seguras |
| RF10 | Registro y seguimiento de eventos | ✅ Historial + consultas a BD real |
| RF11/RNF | Panel web, mapas, estadísticas, gestión | ✅ |
| **Transversal** | Health check `/api/health` | ✅ Público, uptime + ping a BD |
| **Transversal** | Trazabilidad ciega `system_logs` | ✅ Auto-registro de fallos de login y errores de BD |

## 3. Módulo transversal (requisito universal)

### 3.1 Endpoint público `/api/health`

Responde un JSON con estado del servidor, tiempo de actividad y resultado del ping a la base:

```json
{
  "ok": true,
  "estado": "OK",
  "servicio": "SmartRoad S.O.S API",
  "version": "1.0.0",
  "uptime": 310,
  "uptime_human": "0h 5m 10s",
  "db": { "conectado": true, "latencia_ms": 2, "motor": "mysql" },
  "now": "2026-09-17T20:05:03.904Z"
}
```

### 3.2 Tabla `system_logs` (trazabilidad ciega)

Sin llaves foráneas complejas, campos exactos del requerimiento:

| Campo | Tipo |
| --- | --- |
| `id` | INT AUTO_INCREMENT PRIMARY KEY |
| `fecha_hora` | DATETIME DEFAULT CURRENT_TIMESTAMP |
| `nivel` | ENUM('INFO','WARNING','ERROR') |
| `origen_ip` | VARCHAR(45) |
| `mensaje` | VARCHAR(512) NOT NULL |

El backend **inserta automáticamente** un registro ante:

- Intento de login fallido (contraseña incorrecta o usuario inexistente) → `ERROR`.
- Errores de conexión a la base de datos (fallo de una consulta o del pool) → `ERROR`.
- Login exitoso → `INFO` (trazabilidad adicional).

Lectura: `GET /api/system/logs` (solo administradores).

### 3.3 Resiliencia comprobada

Con la base de datos apagada en tiempo de ejecución:

- El health check reporta `db.conectado: false` sin caer.
- Las peticiones devuelven `500` controlado (el servidor **no se cae**).
- Al reiniciar MySQL, el mismo proceso se reconecta solo (uptime continuo).
- Evidencia: prueba realizada apagando/encendiendo MariaDB durante la sesión del 17/09/2026.

## 4. Seguridad aplicada

- `helmet`: cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, etc.).
- Rate limit en `/api/auth`: 10 intentos / 15 min (protección contra fuerza bruta) → HTTP 429.
- Validación de entrada en login (formato de correo y longitud de contraseña ≤ 128).
- Límite de 100 kb en el cuerpo de las peticiones JSON.
- CORS restringido a orígenes configurados en `CORS_ORIGIN`.
- Secretos fuera del repositorio (`.env` en `.gitignore`).

## 5. Pruebas y evidencia

Suite automatizada (6/6 passing) en `backend/test/api.test.js`:

| Test | Resultado |
| --- | --- |
| `GET /api/health` → ok, uptime y ping a BD | ✅ |
| Validación de entrada en login (correo inválido → 400) | ✅ |
| Login fallido → 401 **y** queda en `system_logs` (ERROR) | ✅ |
| Login exitoso → token JWT + registro INFO | ✅ |
| `/api/system/logs` exige auth y rol admin (401/403) | ✅ |
| `/api/docs` expone Swagger | ✅ |

Smoke tests contra la API real (modo MySQL/XAMPP): health, auth fallido/exitoso, caída y
recuperación de la base de datos.

## 6. API — endpoints principales

Documentación interactiva: **http://localhost:4000/api/docs** (Swagger UI).

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/api/health` | Público | Health check: estado + uptime + ping BD |
| POST | `/api/auth/login` | Público | Login JWT (con rate limit) |
| GET | `/api/auth/me` | Bearer | Usuario autenticado |
| GET | `/api/system/logs` | Admin | Trazabilidad (`system_logs`) |
| GET | `/api/dashboard/summary` | Bearer | Resumen del centro |
| GET | `/api/vehicles` | Bearer | Flota y estado |
| GET/PUT | `/api/config` | Bearer | Configuración de alertas (CU-05) |
| POST | `/api/telemetry/event` | Público | Evento ESP32/móvil (CRITICO/SOS → alerta) |
| POST | `/api/telemetry/drowsiness-test` | Público | Prueba del módulo cámara IA |
| GET | `/api/live/stream` | Público | Eventos SSE en tiempo real |
| GET | `/api/docs` | Público | Documentación de la API |

## 7. Roadmap hacia el MVP (diciembre)

| Hito | Alcance | Estado |
| --- | --- | --- |
| M1 | Cerrar ciclo de vida de alertas (sin duplicados + auto-resolución) | ✅ Completado |
| M2 | Módulo transversal Health Check + Trazabilidad | ✅ Completado |
| M3 | Seguridad base (helmet, rate limit, validación) | ✅ Completado |
| M4 | Testing automatizado del backend | ✅ Completado |
| M5 | Build del cliente móvil (Flutter SDK + emulador en CI) | ⏳ Pendiente |
| M6 | Integración ESP32/telemetría real (MQTT) | ⏳ Pendiente |
| M7 | Despliegue (Docker / servidor) y revisión previa a entrega | ⏳ Pendiente |

## 8. Cómo ejecutar

```bash
# Base de datos (XAMPP)
sudo /opt/lampp/lampp start

# Backend (puerto 4000) — requiere pnpm 11
cd backend
pnpm install
pnpm db:setup          # aplica esquema + seed (MYSQL_URL en backend/.env)
pnpm start             # http://localhost:4000/api/health
pnpm test              # suite automatizada (6 tests)

# Panel web (opcional, servido también por el backend en /)
cd web && pnpm dev     # http://localhost:5173

# App móvil (requiere SDK Flutter)
cd mobile && flutter pub get && flutter run
```

Credenciales demo (modo MySQL): `bandreswscanga@hgmail.com` / `5304566767`.

## 9. Riesgos vigentes

La matriz de riesgos completa está en `Entregables/FASE1_AUTO_AUDITORIA.pdf`. Los dos riesgos
principales al MVP: (1) cliente móvil sin compilar por falta de SDK y (2) integración del
hardware ESP32 real. Ambos tienen mitigación definida (hitos M5 y M6).

---

Referencia: `README.md` · `INFORME.md` · `CHANGELOG.md` · `Entregables/`