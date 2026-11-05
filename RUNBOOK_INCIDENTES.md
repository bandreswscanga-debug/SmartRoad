# RUNBOOK_INCIDENTES.md - SmartRoad S.O.S

Guía de diagnóstico y resolución de incidentes para el despliegue Docker de SmartRoad S.O.S.

Objetivo: diagnosticar y resolver el problema en **menos de 10 minutos** usando exclusivamente este documento.

---

## Cómo usar este runbook

1. Identificar el síntoma del incidente.
2. Ir a la sección correspondiente.
3. Seguir los pasos de diagnóstico en orden.
4. Aplicar la resolución indicada.
5. Validar con `curl http://localhost:4000/api/health`.

Si después de seguir todos los pasos el problema persiste, registrar un **"Defecto de Documentación"** con los comandos ejecutados y sus salidas.

---

## Comando de validación rápido

Ejecutar antes y después de cada resolución:

```bash
curl -s http://localhost:4000/api/health
```

Respuesta saludable esperada:

```json
{"ok":true,"estado":"OK","db":{"conectado":true,"motor":"mysql"}}
```

---

## Incidente 1: El backend no responde (puerto 4000 caído)

### Síntomas
- `curl http://localhost:4000/api/health` devuelve error de conexión o timeout.
- El navegador no carga `http://localhost:4000`.

### Diagnóstico

**Paso 1:** Verificar estado del contenedor:

```bash
docker ps --filter name=smartroad
```

- Si `smartroad-backend` no aparece o muestra `Exited` / `Restarting`: ir a Resolución A.
- Si aparece `Up`: ir a Paso 2.

**Paso 2:** Verificar logs del backend:

```bash
docker compose logs --tail 50 backend
```

- Si hay errores de "Address already in use": puerto 4000 ocupado (ver Incidente 4).
- Si hay errores de conexión a MySQL: ir a Incidente 2.
- Si hay errores de build o dependencias: ir a Incidente 5.

**Paso 3:** Verificar que el puerto 4000 esté escuchando:

```bash
ss -tlnp | grep 4000
```

### Resolución A: Contenedor detenido o reiniciando

```bash
docker compose up -d --build backend
```

Luego validar health check.

---

## Incidente 2: MySQL no conecta / DB no conectado

### Síntomas
- Health check devuelve `"conectado":false` o `"motor":"memory"`.
- Logs del backend muestran `[storage] No se pudo conectar a MySQL`.

### Diagnóstico

**Paso 1:** Verificar estado de MySQL:

```bash
docker ps --filter name=smartroad-mysql --format "table {{.Names}}\t{{.Status}}"
```

- Si muestra `(healthy)`: ir a Paso 2.
- Si muestra `Starting`, `Restarting` o `Exited`: ir a Resolución A.

**Paso 2:** Verificar variable `MYSQL_URL` en el contenedor:

```bash
docker compose exec backend sh -c 'echo $MYSQL_URL'
```

Debe imprimir algo como `mysql://smartroad:smartroad@mysql:3306/smartroad_sos`.

**Paso 3:** Probar conectividad desde backend a MySQL:

```bash
docker compose exec backend sh -c 'mysqladmin ping -h mysql -u smartroad -psmartroad'
```

### Resolución A: MySQL no está sano

```bash
docker compose up -d --build smartroad-mysql
```

Esperar a que pase a `(healthy)` (máximo 30 segundos), luego reiniciar backend:

```bash
docker compose restart backend
```

Validar health check.

### Resolución B: Variable MYSQL_URL incorrecta

Editar `docker-compose.yml` en la sección `environment` del servicio `backend`, corregir `MYSQL_URL`, luego:

```bash
docker compose up -d --build backend
```

---

## Incidente 3: Health check falla pero el contenedor está Up

### Síntomas
- `docker ps` muestra `smartroad-backend` como `Up`.
- `curl http://localhost:4000/api/health` devuelve error o timeout.

### Diagnóstico

**Paso 1:** Verificar si el proceso interno está escuchando:

```bash
docker compose exec backend sh -c 'ss -tlnp | grep 4000'
```

- Si no devuelve nada: el proceso Node.js no arrancó. Ver logs:

```bash
docker compose logs --tail 30 backend
```

- Si devuelve algo: el puerto está mapeado incorrectamente (ver Incidente 4).

**Paso 2:** Verificar logs de arranque:

```bash
docker compose logs --tail 30 backend
```

Buscar `[SmartRoad S.O.S] API lista en http://localhost:4000`.

### Resolución

```bash
docker compose restart backend
```

Esperar 5 segundos y validar health check.

---

## Incidente 4: Puerto 4000 ya está en uso

### Síntomas
- Logs del backend muestran `Error: listen EADDRINUSE: address already in use :::4000`.
- Otro servicio ya ocupa el puerto 4000 en el host.

### Diagnóstico

```bash
ss -tlnp | grep 4000
```

Identificar el proceso que ocupa el puerto.

### Resolución

Opción 1: Detener el servicio que ocupa el puerto (si no es necesario).

Opción 2: Cambiar el puerto del backend en `docker-compose.yml`:

```yaml
ports:
  - "4001:4000"
```

Luego:

```bash
docker compose up -d --build backend
```

Validar en `http://localhost:4001/api/health`.

---
## Incidente 5: Puerto de MySQL (3306/3307) ya está en uso en el host

### Síntomas
- Error de Docker: `failed to bind host port 0.0.0.0:3306/tcp: address already in use` o similar con 3307.
- Otro servicio (ej. MySQL local instalado) ya ocupa el puerto de MySQL en el host.
- El contenedor `smartroad-mysql` no puede iniciar.

### Diagnóstico

```bash
ss -tlnp | grep -E '3306|3307'
```

Identificar el proceso que ocupa el puerto.

### Resolución

Opción 1: Detener el servicio que ocupa el puerto (si no es necesario).

Opción 2: Cambiar el puerto expuesto de MySQL en `docker-compose.yml`:

```yaml
ports:
  - "3308:3306"
```

El puerto derecho (`3306`) **nunca debe cambiar**, porque es el que usa el backend dentro de la red Docker (`MYSQL_URL: mysql://smartroad:smartroad@mysql:3306/smartroad_sos`). Solo cambia el puerto izquierdo (el del host).

Luego:

```bash
docker compose up -d --build smartroad-mysql
docker compose restart backend
```

Validar:

```bash
curl -s http://localhost:4000/api/health
```

Debe devolver `"conectado":true` y `"motor":"mysql"`.

---
## Incidente 6: Fallo al construir la imagen (build falla)

### Síntomas
- `docker compose up -d --build` falla en el paso de `RUN pnpm install` o `pnpm build`.
- Mensajes de error de npm/pnpm, módulos faltantes, o errores de compilación de Vite.

### Diagnóstico

```bash
docker compose build --no-cache backend 2>&1 | tail -40
```

### Resolución

1. Limpiar caché de Docker y reconstruir:

```bash
docker compose down
docker system prune -f
docker compose up -d --build
```

2. Si persiste, verificar que `backend/package.json` y `web/package.json` estén presentes y correctos.

3. Verificar que no haya cambios no commiteados que rompan el build:

```bash
git status
```

---

## Incidente 6: Dozzle / Nginx / Locust no disponibles (arquitectura de 4 réplicas)

### Síntomas
- Se espera acceder a Dozzle (logs), Nginx (balanceador) o Locust (pruebas de carga) y no responden.

### Diagnóstico

Verificar qué contenedores están corriendo:

```bash
docker ps --filter name=smartroad
```

Si solo aparecen `smartroad-backend` y `smartroad-mysql`, significa que Nginx, Dozzle y Locust no están incluidos en este despliegue base.

### Resolución

Este repositorio en rama `instalacion` despliega solo backend + MySQL. Si la arquitectura de clases requiere 4 réplicas con Nginx, Dozzle y Locust, esos servicios deben añadirse al `docker-compose.yml`:

- **Nginx**: reverse proxy frente al backend (puerto 80).
- **Dozzle**: visor de logs en tiempo real (puerto 8080).
- **Locust**: pruebas de carga (puerto 8089).

Si estos servicios son obligatorios para la prueba, notificar al equipo original para que los agreguen al repositorio y actualicen este manual. Registrar como "Defecto de Documentación" si faltan.

---

## Incidente 7: Datos de MySQL perdidos tras reinicio

### Síntomas
- Tras `docker compose down -v` o eliminación del volumen, los datos de usuarios/conductores se pierden.

### Causa
- `docker compose down -v` elimina el volumen `smartroadsos_smartroad_mysql_data`.

### Resolución

Re-aplicar el esquema y seed:

```bash
docker compose exec backend sh -c 'pnpm db:setup'
```

Esto recrea tablas y datos iniciales desde `backend/database/schema.sql`, `crud_schema.sql` y `seed.sql`.

---

## Matriz de diagnóstico rápido

| Síntoma | Comando primero | Sección del runbook |
|---------|-----------------|---------------------|
| No responde puerto 4000 | `docker ps --filter name=smartroad` | Incidente 1 |
| DB no conectado | `docker ps --filter name=smartroad-mysql` | Incidente 2 |
| Contenedor Up pero no responde | `docker compose exec backend ss -tlnp \| grep 4000` | Incidente 3 |
| Puerto ocupado | `ss -tlnp \| grep 4000` | Incidente 4 |
| Build falla | `docker compose build --no-cache backend` | Incidente 5 |
| Faltan Nginx/Dozzle/Locust | `docker ps` | Incidente 6 |
| Datos perdidos | `docker compose exec backend pnpm db:setup` | Incidente 7 |

---

## Validación de cierre

Después de resolver cualquier incidente, ejecutar:

```bash
curl -s http://localhost:4000/api/health && echo ""
```

Debe devolver `"ok":true` y `"conectado":true`.

Si no se resuelve en menos de 10 minutos, escalar al equipo original y registrar "Defecto de Documentación".
