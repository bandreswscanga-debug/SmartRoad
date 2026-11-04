# RUNBOOK DE INCIDENTES – SmartRoad S.O.S. | Equipo A

**Versión:** 1.1  
**Sistema:** SmartRoad S.O.S.  
**Responsable:** Equipo A  
**Tipo:** Diagnóstico, Contención, Recuperación y Cierre de Incidentes  
**Tiempo Máximo de Resolución (SLA):** 10 Minutos  
**Entorno Aplicable:** Local / Desarrollo

---

## 1. Objetivo

Establecer un procedimiento claro, ordenado y verificable para identificar, diagnosticar, contener, recuperar y documentar incidentes que afecten la disponibilidad o correcto funcionamiento de SmartRoad S.O.S., garantizando la continuidad del servicio con el menor tiempo de interrupción posible.

## 2. Alcance

Este Runbook cubre los siguientes componentes del monorepo:

- **Backend:** API REST con Node.js, Express y `pnpm` (`backend/`) – Puerto `4000`
- **Base de Datos:** MySQL 8.0 o MariaDB (con mecanismo *fallback* en memoria si no existe conexión)
- **Frontend Web:** Panel de vigilancia con React + Vite + Tailwind CSS (`web/`) – Puerto `5173`
- **Aplicación Móvil:** App Flutter para el conductor (`mobile/`)
- **Monitoreo:** Uptime Kuma (si se encuentra configurado)
- **Pruebas Automatizadas:** Suite de tests ubicada en `backend/test/`

## 3. Arquitectura del Sistema

| Componente | Tecnología | Puerto/Endpoint | Observaciones |
| :---------- | :----------- | :-------------- | :------------- |
| **API Backend** | Node.js + Express | `http://localhost:4000` | Punto central de autenticación, eventos, conductores y alertas. |
| **Health Check** | REST | `GET /api/health` | Permite validar estado del API y conexión a la Base de Datos. |
| **Documentación API** | Swagger | `http://localhost:4000/api/docs` | Útil para validar endpoints en caso de duda. |
| **Panel Web** | React + Vite | `http://localhost:5173` | Se conecta al backend vía proxy `/api`. |
| **Base de Datos** | MySQL / MariaDB | `3306` | Esquema definido en `backend/database/schema.sql`. |
| **App Móvil** | Flutter | N/A (Dispositivo/Emulador) | Consume la API mediante la IP/URL configurada. |

## 4. Clasificación de Incidentes

| Nivel | Descripción | Prioridad | Acción Requerida |
| :----- | :------------ | :---------- | :---------------- |
| **P1** | Backend caído completamente o sin respuesta ante peticiones. | Crítica | Atención inmediata. Seguir diagnóstico desde el Paso 1. |
| **P2** | Base de Datos inaccesible, con error de conexión o credenciales incorrectas. | Alta | Verificar `.env`, servicio MySQL/MariaDB y Health Check. |
| **P3** | Panel Web sin conexión con la API (errores 500, CORS o red). | Media-Alta | Validar proxy, CORS_ORIGIN y estado del backend. |
| **P4** | Aplicación Móvil sin conexión con el servidor. | Media | Revisar IP/puerto configurado en la app Flutter. |
| **P5** | Errores funcionales menores, vistas parciales o datos incompletos. | Baja | Diagnóstico sin afectar el arranque general del sistema. |

## 5. Procedimiento de Diagnóstico

Siga los pasos en **orden estricto**. No salte al reinicio sin haber identificado la causa.

### Paso 1: Verificar disponibilidad del Backend

**Objetivo:** Comprobar si la API responde.

```bash
curl -i http://localhost:4000/api/health
Resultado esperado:
HTTP/1.1 200 OK
{"status":"ok","db":{"conectado":true}, ...}
Si NO responde:
- Windows: netstat -ano | findstr :4000
- Linux/macOS: ss -tlnp | grep :4000 o lsof -i :4000
- Ver procesos Node: ps aux | grep node (Linux/macOS) / Administrador de Tareas (Windows)
Paso 2: Verificar conexión a Base de Datos
Revisar el campo db.conectado obtenido en el Health Check.
- Si "conectado": true → La conexión con MySQL/MariaDB es correcta.
- Si "conectado": false o no aparece → Existe un fallo de conexión con la BD.
Comprobar servicio:
- MySQL (Linux): sudo systemctl status mysql
- MariaDB (Linux): sudo systemctl status mariadb
- Windows: Verificar "MySQL80" / "MariaDB" desde services.msc
Revisar credenciales: Validar MYSQL_URL o las variables DB_HOST, DB_USER, DB_PASSWORD, DB_NAME en backend/.env.
Nota: Si MySQL no está disponible, el backend puede iniciar con datos en memoria o con backend/data/driver-data.json como respaldo, dependiendo de la configuración actual.
Paso 3: Revisar logs del Backend
Desde la raíz del proyecto:
cd backend
pnpm start
Prestar atención a los siguientes mensajes:
- Errores de conexión MySQL (ECONNREFUSED, Access denied, ER_BAD_DB_ERROR)
- Errores de JWT (JWT_SECRET ausente o inválido)
- Errores de CORS
- Fallos al cargar el esquema/seed

Paso 4: Verificar el Panel Web
Comprobar disponibilidad:
curl -I http://localhost:5173
Si no responde o presenta errores en consola del navegador:
cd web
pnpm install
pnpm dev
Verificar en consola del navegador (DevTools > Network) que las peticiones a /api/... sean exitosas (códigos 200, 201).

Paso 5: Ejecutar pruebas automatizadas
Validar integridad del backend:
cd backend
pnpm test
Resultado esperado: Todas las pruebas deben finalizar con PASS / sin fallos críticos.

6. Procedimiento de Recuperación
Aplicar ÚNICAMENTE la acción correspondiente al componente afectado.
Componente	Comando / Acción	Observaciones
Backend caído	cd backend && pnpm install && pnpm start	Verificar que backend/.env existe y contiene las variables mínimas.
Base de Datos detenida (MySQL)	sudo systemctl restart mysql	Esperar ~10-15 segundos antes de volver a levantar el backend.
Base de Datos detenida (MariaDB)	sudo systemctl restart mariadb	Idéntico al anterior.
Frontend caído	cd web && pnpm install && pnpm dev	Asegurarse que el backend ya esté respondiendo en :4000.
Conflicto de puertos	Liberar el puerto afectado (:4000 o :5173)	Usar netstat/ss/lsof para identificar el PID y terminarlo.
Fallo por variables de entorno	Revisar backend/.env	Verificar PORT, JWT_SECRET, MYSQL_URL/credenciales, CORS_ORIGIN y TOKEN_EXPIRES.
Fallo de dependencias	pnpm install en backend/ y/o web/	Ejecutar siempre tras cambios en package.json o al clonar por primera vez.
IMPORTANTE: Bajo NINGUNA circunstancia se deben eliminar, truncar o modificar tablas directamente sin contar con autorización explícita y un respaldo previo.

7. Validación Posterior a la Solución (Smoke Test)
Una vez aplicada la corrección, realizar esta validación obligatoria:
Ítem	Verificación	Esperado
1. Health Check API	curl -i http://localhost:4000/api/health	HTTP/1.1 200 OK + "db":{"conectado":true}
2. Swagger / API Docs	Abrir http://localhost:4000/api/docs	Carga correctamente sin errores en consola.
3. Panel Web	Abrir http://localhost:5173	Login carga, sin errores de red/CORS en DevTools.
4. Autenticación	Probar inicio de sesión con credencial válida	Acceso correcto al dashboard.
5. Pruebas Automatizadas	cd backend && pnpm test	Todas las pruebas en estado PASS.
6. Monitoreo	Revisar Uptime Kuma (si aplica)	Servicio UP / Sin alertas activas.
7. Tiempos Objetivo de Respuesta

8 Actividad	Tiempo Asignado	Meta
Identificación del incidente	2 minutos	Detectar síntoma, nivel y componente afectado.
Diagnóstico	3 minutos	Seguir los pasos 1-5 hasta hallar causa raíz.
Contención / Corrección	3 minutos	Aplicar recuperación acorde al fallo.
Validación y Pruebas	2 minutos	Ejecutar Smoke Test completo.
TOTAL	10 minutos	Cumplir con el SLA establecido.

9. Registro del Incidente (Obligatorio)
Todo incidente debe ser documentado inmediatamente en el acta de soporte con la siguiente información:
Campo	Descripción
Fecha y Hora	Fecha exacta y hora en la que se detectó el incidente (DD/MM/AAAA - HH:MM).
Reportado por	Nombre y rol de quien reporta el incidente.
Servicio Afectado	Backend / Base de Datos / Frontend Web / App Móvil / Otro (especificar).
Nivel de Prioridad	P1 / P2 / P3 / P4 / P5.
Descripción del Problema	Descripción clara y objetiva del síntoma observado.
Evidencia del Error	Captura de pantalla, salida de curl, logs del backend, errores de consola, etc.
Causa Raíz Identificada	¿Qué generó el incidente? (Ej.: Servicio MySQL detenido, .env incompleto, puerto ocupado).
Solución Aplicada	Comandos ejecutados, archivos revisados o acciones realizadas paso a paso.
Pruebas Realizadas	Resultado del Health Check, pnpm test y validación del panel web.
Tiempo Total de Recuperación	Tiempo desde la detección hasta la validación exitosa (en minutos).
Estado	EN PROCESO / RESUELTO / ESCALADO
Responsable de Atención	Integrante del Equipo A que atendió el incidente.

10. Criterios de Cierre
El incidente ÚNICAMENTE podrá darse por CERRADO cuando se cumplan TODOS los siguientes puntos:
- Disponibilidad: El componente afectado se encuentra completamente funcional.
- Health Check: GET /api/health responde con HTTP 200 OK y db.conectado: true (cuando aplique).
- Integración: Backend, Base de Datos y Panel Web se comunican correctamente.
- Pruebas: pnpm test finaliza sin errores.
- Validación Funcional: Se logró iniciar sesión y acceder a las vistas principales sin errores.
- Documentación: Se diligenció completamente el formato del punto 9 con evidencias adjuntas.
- Sin Alertas: Uptime Kuma no registra caídas activas (si se encuentra habilitado).
