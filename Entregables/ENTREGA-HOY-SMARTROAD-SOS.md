# SmartRoad S.O.S. — Entrega de hoy

**Fecha:** 24 de septiembre de 2026  
**Alcance:** CRUD backend Node.js + Express + MySQL

## 1. Repositorio

- GitHub: https://github.com/bandreswscanga-debug/SmartRoad
- Commit del CRUD: `66d71fd`
- Rama base: `main`

## 2. Backend y CRUD

El CRUD singular está integrado en:

```text
/home/oswal/SmartRoadSOS/backend
```

Cadena de entidades:

```text
conductor → vehiculo → dispositivo → evento → alerta
```

Endpoints para cada entidad:

```text
GET    /api/<tabla>
GET    /api/<tabla>/:id
POST   /api/<tabla>
PUT    /api/<tabla>/:id
DELETE /api/<tabla>/:id
```

Entidades:

```text
/api/conductor
/api/vehiculo
/api/dispositivo
/api/evento
/api/alerta
```

Validaciones:

- Campos NOT NULL: `400`.
- FK inexistente: `400`.
- Registro inexistente: `404`.
- Duplicado o relación 1:1: `409`.
- Creación correcta: `201`.
- GET, PUT y DELETE correctos: `200`.

## 3. Base de datos

La base utilizada es:

```text
smartroad_sos
```

El esquema CRUD está en:

```text
/home/oswal/SmartRoadSOS/backend/database/crud_schema.sql
```

El gestor local está disponible en:

```text
http://127.0.0.1:8080
```

## 4. División de la entrega entre tres compañeros

### Compañero/a 1 — Git y evidencia funcional

Rama sugerida:

```bash
evidencia/parte-1-colaboracion-cruds
```

Responsabilidades:

- Historial de commits.
- Colección Postman.
- Evidencia de GET, POST, PUT y DELETE.
- Validación de FK y campos obligatorios.

### Compañero/a 2 — Persistencia

Rama sugerida:

```bash
evidencia/parte-2-persistencia-scrum
```

Responsabilidades:

- Captura de la tabla antes de insertar.
- Crear un registro desde Postman.
- Captura de la misma tabla después.
- Confirmar que el dato de Postman coincide con MySQL.

### Compañero/a 3 — Scrum y cierre de calidad

Rama sugerida:

```bash
evidencia/parte-3-scrum-calidad
```

Responsabilidades:

- Captura del tablero Scrum.
- Verificar historias en Terminado.
- Revisar checklist de evidencia.
- Verificar que el repositorio no incluya archivos privados.

## 5. Evidencias que debe entregar el equipo

- Enlace del repositorio.
- Historial de commits de varios integrantes.
- Colección Postman o video de máximo 3 minutos.
- Dos capturas de la base de datos: antes y después.
- Captura del tablero Scrum con historias terminadas.

## 6. Comandos de ejecución

```bash
# Backend
cd /home/oswal/SmartRoadSOS/backend
pnpm install
pnpm db:setup
pnpm test
pnpm start

# API
curl http://localhost:4000/api/health
curl http://localhost:4000/api/conductor
```

## 7. Enlaces

```text
API: http://localhost:4000
Health: http://localhost:4000/api/health
phpMyAdmin: http://127.0.0.1:8080
```

## Nota final

Este documento contiene únicamente la entrega actual del CRUD y sus evidencias.
