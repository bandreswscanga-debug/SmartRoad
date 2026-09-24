# CRUD SmartRoad S.O.S. — Evidence técnica

El CRUD singular está integrado en este backend sin eliminar las rutas plurales existentes.

## Cadena y archivos

```text
conductor → vehiculo → dispositivo → evento → alerta
```

- `src/routes/smartroad-crud.routes.js`: monta los 25 endpoints REST.
- `src/smartroad-crud/db.js`: pool `mysql2/promise` creado desde variables de entorno.
- `src/smartroad-crud/model.js`: consultas SQL parametrizadas y JOIN.
- `src/smartroad-crud/controller.js`: respuestas HTTP y validaciones.
- `src/smartroad-crud/validation.js`: validación de campos e IDs.
- `database/crud_schema.sql`: esquema de las cinco tablas.
- `src/server.js`: monta el CRUD en `/api`.
- `src/scripts/setup-db.js`: aplica `schema.sql` y `crud_schema.sql`.

## Configuración

Las credenciales están en `.env` y las variables específicas del CRUD son:

```env
CRUD_DB_HOST=127.0.0.1
CRUD_DB_PORT=3306
CRUD_DB_USER=root
CRUD_DB_PASSWORD=...
CRUD_DB_NAME=smartroad_sos
CRUD_DB_CONNECTION_LIMIT=10
```

No se guardan credenciales en el código.

## Endpoints

Para cada tabla `conductor`, `vehiculo`, `dispositivo`, `evento` y `alerta`:

```text
GET    /api/<tabla>
GET    /api/<tabla>/:id
POST   /api/<tabla>
PUT    /api/<tabla>/:id
DELETE /api/<tabla>/:id
```

Ejemplo:

```text
GET http://localhost:4000/api/conductor
GET http://localhost:4000/api/vehiculo
GET http://localhost:4000/api/dispositivo
GET http://localhost:4000/api/evento
GET http://localhost:4000/api/alerta
```

## Comprobación local

```bash
cd /home/oswal/SmartRoadSOS/backend
pnpm install
pnpm db:setup
pnpm start
```

En otra terminal:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/conductor
```

La respuesta de `GET /api/vehiculo` incluye `nombre_conductor`, `telefono_conductor` y `estado_conductor` mediante `JOIN`.

## Evidencia de validaciones

- Campo obligatorio ausente: `400`.
- FK inexistente: `400`.
- Registro inexistente: `404`.
- Relación 1:1 violada o duplicado: `409`.
- Creación: `201`.
- Lectura, actualización y eliminación correctas: `200`.

La prueba integral ejecutada cubre las cinco tablas, las cinco operaciones CRUD, las FK, los JOIN y la eliminación en orden inverso de la cadena.
