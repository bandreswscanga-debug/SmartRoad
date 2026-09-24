# SmartRoad S.O.S. — Entrega Final (CRUD mes 1)

**Grupo:** SmartRoad S.O.S.
**Fecha:** 2026-09-24
**Tipo de arquitectura:** API REST (Node.js + Express + MySQL)

Este documento sigue la estructura de entrega solicitada en Classroom. Las secciones
1 a 4 corresponden a los 4 bloques obligatorios.

---

## 1. Trazabilidad y Trabajo Colaborativo (Git)

### 1.1 Enlace al repositorio central

**Repositorio:** https://github.com/bandreswscanga-debug/SmartRoad

| Detalle  | Valor |
| -------- | ----- |
| Rama de evidencia | `evidencia/parte-2-persistencia-scrum` |
| Rama principal | `main` |
| Último commit | `71caec5 docs(entregable): evidencia parte 2 - persistencia y scrum` |

### 1.2 Evidencia de Commits (historial del último mes)

> **Captura 1** — Pantallazo del historial de commits del último mes (ejecutar `git log --all --oneline --decorate --graph` dentro del repositorio).

![Captura 1 — Historial de commits del último mes](captura-commits.png)

**Respaldado por el historial textual (2026-08-24 a 2026-09-24, 12 commits):**

```
* 71caec5 (origin/evidencia/parte-2-persistencia-scrum) docs(entregable): evidencia parte 2 - persistencia y scrum
* 66d71fd (main) feat(backend): agrega CRUD singular de SmartRoad
* d6df991 (v0.1.0-beta) docs: estado del proyecto (fase beta), changelog y README actualizado
* 27a59e2 test(backend): suite automatizada y refactor para testing
* d16c3ca feat(backend): documentacion OpenAPI de la API (Swagger UI en /api/docs)
* 4eef847 feat(backend): endurecimiento de seguridad
* 919f779 docs: corregir nombre del integrante en los reportes de la Fase 1
* 441b7e7 feat(mobile): app del conductor en Flutter
* d357e8e feat(web): panel de control del centro de vigilancia (React + Vite + Tailwind)
* 71652ee feat(backend): API REST con JWT, telemetria, alertas y modulo transversal /api/health + system_logs
* 9e189d9 docs: documentacion del proyecto y entregables de la Fase 1 (auto-auditoria + auditoria grupo par)
* 705fe7f chore: definir .gitignore del monorepo (node_modules, dist, build, .env, secretos)
```

---

## 2. Evidencia Funcional de los CRUDs

**Arquitectura:** API REST → se adjunta la **exportación JSON de la colección de Postman**.

### 2.1 Archivo de la colección

Archivo adjunto en este repositorio:

> **`Entregables/evidencia-crud-mes1/SmartRoadSOS-CRUD.postman_collection.json`**

Contiene **25 peticiones** (GET, POST, PUT y DELETE) sobre las 5 entidades principales
(`conductor`, `vehiculo`, `dispositivo`, `evento`, `alerta`), con `baseUrl = http://127.0.0.1:4000`.

### 2.2 Peticiones incluidas

| Entidad | GET (listar) | GET (por id) | POST (crear) | PUT (actualizar) | DELETE (eliminar) |
| ------- | ------------ | ------------ | ------------ | ---------------- | ----------------- |
| `conductor` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `vehiculo` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dispositivo` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `evento` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `alerta` | ✅ | ✅ | ✅ | ✅ | ✅ |

Ejemplo del cuerpo de `POST /api/conductor`:

```json
{
  "nombre": "Conductor Evidencia Parte 2",
  "documento": "987654321",
  "telefono": "3125550101"
}
```

### 2.3 Cómo importarla (para reproducir la evidencia)

1. Abrir Postman → **Import** → seleccionar el archivo `.postman_collection.json`.
2. Verificar la variable `{{baseUrl}}` (colección → Variables → `http://127.0.0.1:4000`).
3. Ejecutar las peticiones en orden: crear la cadena completa
   `conductor → vehiculo → dispositivo → evento → alerta` (respetando los id's generados).

> **Captura 2** (opcional, recomendado) — Pantallazo de Postman mostrando la colección
> importada con las peticiones y al menos una respuesta 201.

![Captura 2 — Colección de Postman importada](captura-postman-coleccion.png)

---

## 3. Evidencia de Persistencia (el backend sí conecta)

Se demuestra que el registro creado desde Postman **persiste** en la base de datos
(`smartroad_sos`, gestor usado: **phpMyAdmin** — http://127.0.0.1:8080).

### 3.1 Registro insertado en la prueba

Petición ejecutada:

```
POST http://127.0.0.1:4000/api/conductor
Content-Type: application/json
```

```json
{
  "nombre": "Conductor Evidencia Parte 2",
  "documento": "987654321",
  "telefono": "3125550101"
}
```

Respuesta recibida (HTTP 201):

```json
{
  "exito": true,
  "mensaje": "Registro creado correctamente.",
  "datos": {
    "id_conductor": 1,
    "nombre": "Conductor Evidencia Parte 2",
    "documento": "987654321",
    "telefono": "3125550101",
    "estado": "activo"
  }
}
```

### 3.2 Captura 1 — La tabla ANTES del registro

Consulta SQL ejecutada en phpMyAdmin:

```sql
SELECT * FROM conductor;
```

> **Captura 3** — Resultado de `SELECT * FROM conductor;` **antes** de ejecutar el POST
> (sin la fila `Conductor Evidencia Parte 2`).

![Captura 3 — Tabla conductor antes de insertar](captura-tabla-antes.png)

### 3.3 Captura 2 — La misma tabla DESPUÉS del registro

La **misma** consulta SQL ejecutada después del POST:

```sql
SELECT * FROM conductor;
```

> **Captura 4** — Resultado de `SELECT * FROM conductor;` **después** del POST: aparece
> la fila `id_conductor = 1` con los valores insertados (prueba de que el dato viajó por
> la API y quedó persistido en MySQL).

![Captura 4 — Tabla conductor después de insertar](captura-tabla-despues.png)

### 3.4 Comparación API vs base de datos

| Campo          | Valor Postman (API)                | Valor phpMyAdmin (MySQL)          | ¿Coincide? |
| -------------- | ---------------------------------- | --------------------------------- | ---------- |
| `id_conductor` | `1`                                | `1`                               | ✅ Sí      |
| `nombre`       | `Conductor Evidencia Parte 2`      | `Conductor Evidencia Parte 2`     | ✅ Sí      |
| `documento`    | `987654321`                        | `987654321`                       | ✅ Sí      |
| `telefono`     | `3125550101`                       | `3125550101`                      | ✅ Sí      |
| `estado`       | `activo`                           | `activo`                          | ✅ Sí      |

---

## 4. Cierre Ágil (Scrum)

> **Captura 5** — Pantallazo del tablero Scrum (GitHub Projects / Trello / Jira) a la
> fecha de hoy, mostrando las Historias de Usuario de las **Semanas 1 a 4** en la columna
> **Terminado**:
>
> - 📋 Configuración base del proyecto (estructura del monorepo y repositorio Git).
> - 🔐 Login / autenticación (JWT, `POST /api/auth/login`).
> - 🗄️ CRUDs de las entidades principales (`conductor`, `vehiculo`, `dispositivo`, `evento`, `alerta`) — historia **Terminada** del CRUD singular.

![Captura 5 — Tablero Scrum con historias en Terminado](captura-scrum-board.png)

---

## Lista de verificación antes de exportar el PDF

- [ ] Insertar la captura del historial de commits en **1.2**.
- [ ] Adjuntar `SmartRoadSOS-CRUD.postman_collection.json` (o demostrar su importación).
- [ ] Pegar las capturas de phpMyAdmin **antes** y **después** del registro en **3.2 / 3.3**.
- [ ] Tomar el pantallazo del tablero Scrum actualizado a la fecha de hoy en **4**.
- [ ] Exportar a PDF (ver instrucciones abajo) y subir a Classroom.

### Cómo generar el PDF

Opción A — **VSCode** (recomendado):
1. Abrir la carpeta del repositorio en VSCode.
2. Instalar la extensión **Markdown PDF** (yzane).
3. Click derecho sobre `ENTREGA-FINAL-CLASSROOM.md` → **Markdown PDF: Export (pdf)**.
4. El PDF queda en la misma carpeta incluyendo las imágenes.

Opción B — **Sin instalar nada**:
1. Copiar el contenido del `.md` a Google Docs.
2. Insertar las capturas donde corresponde.
3. Archivo → Descargar → PDF.

### Entrega a Classroom

1. Cargar **`ENTREGA-FINAL-CLASSROOM.pdf`** en la tarea de Classroom.
2. **Opcional:** agregar el enlace del repositorio
   `https://github.com/bandreswscanga-debug/SmartRoad` en el campo de "Comentarios/Tarea".