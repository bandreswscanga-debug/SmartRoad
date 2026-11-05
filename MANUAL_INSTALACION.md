# MANUAL_INSTALACION.md - SmartRoad S.O.S

Documentación base para despliegue del proyecto SmartRoad S.O.S.
Este manual permite que cualquier equipo clone y desplegue el proyecto siguiendo EXCLUSIVAMENTE estas instrucciones, sin necesidad de hacer preguntas verbales al equipo original. Todos los pasos están detallados y no se omite ninguno.

---

## Arquitectura de referencia

El proyecto se despliega con **Docker Compose** sobre dos servicios:

| Servicio | Imagen | Puerto | Descripción |
|----------|--------|--------|-------------|
| `smartroad-mysql` | `mysql:8.0` | 3306 | Base de datos MySQL (persistencia) |
| `smartroad-backend` | `node:20-slim` (build local) | 4000 | API REST + panel web servido estáticamente |

El backend se conecta a MySQL usando la variable `MYSQL_URL`. Si MySQL no está disponible, el backend opera en modo memoria (fallback), pero para producción se requiere MySQL.

---

## Requisitos previos

En el computador donde se va a desplegar, instalar:

1. **Docker Engine** (versión 20.10 o superior)
   - https://docs.docker.com/engine/install/

2. **Docker Compose** (v2, incluido en Docker Desktop o instalado por separado)
   - https://docs.docker.com/compose/install/

Verificar instalación:

```bash
docker --version
docker compose version
```

Ambos comandos deben imprimir una versión sin errores.

---

## Paso 1: Clonar el repositorio

Desde una terminal, ejecutar:

```bash
git clone https://github.com/bandreswscanga-debug/SmartRoad.git
cd SmartRoad
```

Verificar que se clonó correctamente:

```bash
ls -la
```

Debe listar los archivos del repositorio incluyendo `docker-compose.yml`, `backend/`, `web/`, `mobile/`, `MANUAL_INSTALACION.md`, etc.

---

## Paso 2: Verificar rama activa

Todas las instrucciones de este manual asumen la rama **`main`** (contiene todo el despliegue Docker y la documentación).

```bash
git branch --show-current
```

Debe imprimir: `main`

Si no está en `main`, cambiar a ella:

```bash
git checkout main
```

---

## Paso 3: Preparar variables de entorno

Copiar el archivo de ejemplo:

```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env` con los valores del entorno. Los campos mínimos requeridos:

| Variable | Valor sugerido (local) | Obligatorio |
|----------|------------------------|-------------|
| `PORT` | `4000` | Sí |
| `NODE_ENV` | `production` | Sí |
| `MYSQL_URL` | `mysql://smartroad:smartroad@mysql:3306/smartroad_sos` | Sí |
| `JWT_SECRET` | cadena de 64 caracteres hexadecimales | Sí |
| `TOKEN_EXPIRES` | `12h` | No |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:4173` | No |

Generar un `JWT_SECRET` de 64 hex:

```bash
openssl rand -hex 32
```

Copiar el resultado generado y pegarlo en `backend/.env` en la línea `JWT_SECRET=`.

El `docker-compose.yml` ya incluye valores por defecto para desarrollo local. Si solo se quiere probar en localhost, se puede omitir editar el `.env` (usará los valores del compose).

---

## Paso 4: Levantar los servicios con Docker Compose

Desde la raíz del repositorio, ejecutar:

```bash
docker compose up -d --build
```

Qué hace este comando, en orden:

1. Descarga la imagen `mysql:8.0` desde Docker Hub.
2. Construye la imagen del backend usando `backend/Dockerfile`.
3. Crea la red Docker `smartroadsos_default`.
4. Crea el volumen persistente `smartroadsos_smartroad_mysql_data`.
5. Inicia el contenedor `smartroad-mysql` y espera a que esté saludable (healthcheck).
6. Inicia el contenedor `smartroad-backend` ejecutando `backend/docker-entrypoint.sh`, el cual:
   - Espera a que MySQL esté disponible en el puerto 3306.
   - Aplica el esquema de base de datos (`pnpm db:setup`).
   - Inicia el servidor Node.js en el puerto 4000.

Esperar a que ambos contenedores estén corriendo (puede tardar entre 1 y 3 minutos la primera vez por la descarga de imágenes e instalación de dependencias).

---

## Paso 5: Verificar que los servicios estén corriendo

Ejecutar:

```bash
docker ps --filter name=smartroad
```

Salida esperada (ejemplo):

```
NAMES               STATUS                    PORTS
smartroad-backend   Up X minutes              0.0.0.0:4000->4000/tcp
smartroad-mysql     Up X minutes (healthy)    0.0.0.0:3306->3306/tcp
```

Ambos contenedores deben mostrar `Up` (y MySQL debe mostrar `healthy`). Si alguno muestra `Exited`, `Restarting` o no aparece, consultar el `RUNBOOK_INCIDENTES.md`.

---

## Paso 6: Validar endpoints del API

Health check:

```bash
curl -s http://localhost:4000/api/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "estado": "OK",
  "servicio": "SmartRoad S.O.S API",
  "version": "1.0.0",
  "db": {
    "conectado": true,
    "motor": "mysql",
    "latencia_ms": 1
  }
}
```

Swagger UI (documentación de la API):

```bash
curl -s -I http://localhost:4000/api/docs
```

Debe devolver `HTTP/1.1 200 OK` (o redirección HTML).

Panel web (servido estáticamente por el backend):

```bash
curl -s -I http://localhost:4000/
```

Debe devolver `HTTP/1.1 200 OK`.

---

## Paso 7: Comandos de operación diaria

Ver logs del backend:

```bash
docker compose logs -f backend
```

Ver logs de MySQL:

```bash
docker compose logs -f smartroad-mysql
```

Detener servicios (sin borrar datos):

```bash
docker compose stop
```

Detener y eliminar contenedores (mantiene volúmenes de datos):

```bash
docker compose down
```

Detener y eliminar todo incluyendo volúmenes (BORRA DATOS DE MySQL):

```bash
docker compose down -v
```

Reconstruir y levantar tras un cambio de código:

```bash
docker compose up -d --build
```

---

## Paso 8: Puertos utilizados

| Puerto | Servicio | Uso |
|--------|----------|-----|
| 4000 | backend | API REST + panel web + Swagger |
| 3307 | MySQL | Base de datos (solo accesible desde el host; dentro de Docker sigue en 3306) |

Si el puerto 3307 ya está en uso, modificar `docker-compose.yml` en la sección `ports` del servicio `mysql` (ej. `3308:3306`). El puerto derecho (`3306`) nunca debe cambiar porque es el que usa el backend dentro de la red Docker.

Si el puerto 4000 ya está en uso, modificar `docker-compose.yml` en la sección `ports` del servicio `backend` (ej. `4001:4000`) y usar `http://localhost:4001` para el health check.


---

## Paso 9: App móvil (Flutter) - opcional

La aplicación móvil para conductores está en el directorio `mobile/`. Requiere Flutter SDK instalado.

```bash
cd mobile
flutter pub get
flutter run
```

En la pantalla de login, campo **Servidor**, poner:
- Local: `http://localhost:4000`
- Nube: `https://TU-SERVICIO.onrender.com`

---

## Paso 10: Checklist de validación final

Antes de considerar el despliegue exitoso, verificar todos los siguientes puntos:

- [ ] `git branch --show-current` imprime `main`
- [ ] `docker --version` e `docker compose version` imprimen versiones sin error
- [ ] `docker ps` muestra `smartroad-backend` y `smartroad-mysql` con estado `Up`
- [ ] MySQL muestra estado `(healthy)`
- [ ] `curl http://localhost:4000/api/health` devuelve `"ok":true` y `"conectado":true`
- [ ] `curl -I http://localhost:4000/api/docs` devuelve `200 OK`
- [ ] `curl -I http://localhost:4000/` devuelve `200 OK`

Si algún punto falla, consultar el `RUNBOOK_INCIDENTES.md`.

---

## Notas importantes

- Todo el código, documentación y archivos Docker están en la rama `main`. No es necesario cambiar de rama.
- Nunca commitear secretos (claves, contraseñas, tokens) en git. Usar `.env` local.
- El volumen `smartroadsos_smartroad_mysql_data` persiste los datos de MySQL entre reinicios.
- Para desplegar en otros computadores, solo se requiere clonar el repo, verificar que está en `main` y ejecutar `docker compose up -d --build`.
- Solo se requiere Docker + Docker Compose en el computador destino (no se necesita instalar Node.js, pnpm ni MySQL manualmente).
