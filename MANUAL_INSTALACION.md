# MANUAL_INSTALACION.md - SmartRoad S.O.S

Documentación base para despliegue del proyecto SmartRoad S.O.S.
Este manual permite que cualquier equipo clone y desplegue el proyecto siguiendo EXCLUSIVAMENTE estas instrucciones, sin necesidad de hacer preguntas verbales al equipo original.

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

```bash
git clone https://github.com/bandreswscanga-debug/SmartRoad.git
cd SmartRoad
```

---

## Paso 2: Cambiar a la rama de despliegue

Todas las instrucciones de este manual asumen la rama **`instalacion`**. No usar `main`.

```bash
git checkout instalacion
```

Verificar rama actual:

```bash
git branch --show-current
```

Debe imprimir: `instalacion`

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

El `docker-compose.yml` ya incluye valores por defecto para desarrollo local. Si solo se quiere probar en localhost, se puede omitir editar el `.env`.

---

## Paso 4: Levantar los servicios con Docker Compose

Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

Qué hace este comando:
- Descarga la imagen `mysql:8.0`
- Construye la imagen del backend (`backend/Dockerfile`)
- Crea la red `smartroadsos_default`
- Crea el volumen `smartroadsos_smartroad_mysql_data`
- Inicia MySQL y espera a que esté saludable
- Inicia el backend (ejecuta `docker-entrypoint.sh` que aplica el esquema de BD y arranca el servidor)

---

## Paso 5: Verificar que los servicios estén corriendo

```bash
docker ps --filter name=smartroad
```

Salida esperada (ejemplo):

```
NAMES               STATUS                    PORTS
smartroad-backend   Up X minutes              0.0.0.0:4000->4000/tcp
smartroad-mysql     Up X minutes (healthy)    0.0.0.0:3306->3306/tcp
```

Ambos contenedores deben mostrar `Up` (y MySQL debe mostrar `healthy`).

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
| 3306 | MySQL | Base de datos (solo accesible dentro de la red Docker) |

Si el puerto 4000 ya está en uso, modificar `docker-compose.yml` en la sección `ports` del servicio `backend` (ej. `4001:4000`) y usar `http://localhost:4001` para el health check.

---

## Paso 9: Checklist de validación final

Antes de considerar el despliegue exitoso, verificar:

- [ ] `git branch --show-current` imprime `instalacion`
- [ ] `docker ps` muestra `smartroad-backend` y `smartroad-mysql` con estado `Up`
- [ ] MySQL muestra estado `(healthy)`
- [ ] `curl http://localhost:4000/api/health` devuelve `"ok":true` y `"conectado":true`
- [ ] `curl -I http://localhost:4000/api/docs` devuelve `200 OK`

Si algún punto falla, consultar el `RUNBOOK_INCIDENTES.md`.

---

## Notas importantes

- No hacer commit directo sobre `main`. Usar ramas `feat/` o `fix/` y abrir Pull Request.
- Nunca commitear secretos (claves, contraseñas, tokens) en git. Usar `.env` local.
- El volumen `smartroadsos_smartroad_mysql_data` persiste los datos de MySQL entre reinicios.
- Para usar en otros computadores, solo se requiere clonar el repo, cambiar a `instalacion` y ejecutar `docker compose up -d --build`.
