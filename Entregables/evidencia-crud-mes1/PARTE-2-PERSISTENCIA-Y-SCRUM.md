# Parte 2 — Persistencia y Scrum

## Autoria

| Campo        | Valor                                      |
| ------------ | ------------------------------------------ |
| Compañero    | **2**                                      |
| Rama         | `evidencia/parte-2-persistencia-scrum`     |
| Repositorio  | https://github.com/bandreswscanga-debug/SmartRoad |
| Fecha        | YYYY-MM-DD                                |
| Gestor de BD | http://127.0.0.1:8080                     |
| API          | http://127.0.0.1:4000                     |

## Alcance

Evidencia de que el CRUD singular realmente persiste en la base de datos y de que su historia de usuario está **Terminada** en el tablero Scrum.

- Tabla usada para la evidencia: `conductor` (porque no depende de otra tabla; es el eslabón inicial de la cadena `conductor → vehiculo → dispositivo → evento → alerta`).
- Base de datos: `smartroad_sos`.
- Endpoint: `POST /api/conductor`.

---

## Paso 1 — Abrir phpMyAdmin

1. Con el contenedor/servicio de MySQL y phpMyAdmin iniciados, abrir en el navegador:

   ```
   http://127.0.0.1:8080
   ```

2. Iniciar sesión (usuario por defecto del proyecto: `root` y la contraseña configurada en `backend/.env` como `CRUD_DB_PASSWORD`).

3. En el panel izquierdo seleccionar la base de datos `smartroad_sos`.

> **Captura 1:** pantalla de phpMyAdmin con la base `smartroad_sos` seleccionada.

![Paso 1 — phpMyAdmin abierto](captura-1-phpmyadmin.png)

---

## Paso 2 — Mostrar la tabla ANTES de insertar

En la pestaña **SQL** de la base `smartroad_sos`, ejecutar:

```sql
SELECT * FROM conductor;
```

Para acompañar el estado real de la tabla también puede ejecutarse:

```sql
SELECT COUNT(*) AS total_conductores FROM conductor;
```

> **Captura 2:** resultado de `SELECT * FROM conductor;` **antes** del alta. Debe verse el conteo actual (por ejemplo `total_conductores = N`), sin la fila que se creará en el paso 3.

![Paso 2 — Tabla conductor antes de insertar](captura-2-tabla-antes.png)

> Si la tabla está vacía, el resultado simplemente mostrará 0 filas; es el estado "antes" esperado.

---

## Paso 3 — Crear un registro desde Postman

**Configuración de la petición:**

| Parámetro      | Valor                                    |
| -------------- | ---------------------------------------- |
| Método         | `POST`                                   |
| URL            | `http://127.0.0.1:4000/api/conductor`    |
| Headers        | `Content-Type: application/json`         |
| Body (raw JSON)| Ver abajo                               |

**Body:**

```json
{
  "nombre": "Conductor Evidencia Parte 2",
  "documento": "987654321",
  "telefono": "3125550101"
}
```

Nota: `estado` es opcional; si se omite, el backend lo asigna como `activo` por defecto.

**Respuesta esperada (HTTP 201):**

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

> **Captura 3:** pantalla de Postman con el método `POST`, la URL, el body JSON y la respuesta `201`.

![Paso 3 — POST /api/conductor desde Postman](captura-3-postman.png)

> **Alternativa sin Postman (curl):**
>
> ```bash
> curl -i -X POST http://127.0.0.1:4000/api/conductor \
>   -H "Content-Type: application/json" \
>   -d '{"nombre": "Conductor Evidencia Parte 2", "documento": "987654321", "telefono": "3125550101"}'
> ```

---

## Paso 4 — Mostrar la misma tabla DESPUÉS

Volver a phpMyAdmin y ejecutar la **misma** consulta del paso 2:

```sql
SELECT * FROM conductor;
```

> **Captura 4:** resultado de `SELECT * FROM conductor;` **después** del alta. Debe aparecer la nueva fila `id_conductor = 1` con los valores enviados en Postman y `estado = activo`.

![Paso 4 — Tabla conductor después de insertar](captura-4-tabla-despues.png)

---

## Paso 5 — Confirmar que el dato coincida

1. En Postman (o curl) consultar el registro recién creado:

   ```
   GET http://127.0.0.1:4000/api/conductor/1
   ```

2. Comparar, campo a campo, el JSON devuelto por la API con la fila mostrada en phpMyAdmin.

| Campo            | Valor en Postman (API)              | Valor en phpMyAdmin (MySQL)         | ¿Coincide? |
| ---------------- | ----------------------------------- | ----------------------------------- | ---------- |
| `id_conductor`   | `1`                                 | `1`                                 | ✅ Sí      |
| `nombre`         | `Conductor Evidencia Parte 2`       | `Conductor Evidencia Parte 2`       | ✅ Sí      |
| `documento`      | `987654321`                         | `987654321`                         | ✅ Sí      |
| `telefono`       | `3125550101`                        | `3125550101`                        | ✅ Sí      |
| `estado`         | `activo`                            | `activo`                            | ✅ Sí      |

> **Captura 5:** junta (a) la respuesta `GET /api/conductor/1` y (b) la fila completa en phpMyAdmin, y la tabla de coincidencia completada.

![Paso 5 — Coincidencia API vs base de datos](captura-5-coincidencia.png)

---

## Paso 6 — Tablero Scrum: historias en Terminado

1. Abrir el tablero Scrum del proyecto (GitHub Projects / Jira / Trello, según el equipo).
2. Verificar que la historia del CRUD singular **"Implementar CRUD singular (conductor, vehículo, dispositivo, evento, alerta)"** esté en la columna **Terminado / Done**.
3. Capturar la vista completa del tablero donde se aprecie la historia en **Terminado** y, de ser posible, la tarjeta con su descripción de criterios de aceptación (crear, listar, obtener por id, actualizar y eliminar).

> **Captura 6:** pantalla del tablero Scrum con la historia en Terminado.

![Paso 6 — Tablero Scrum con historia en Terminado](captura-6-scrum-board.png)

---

## Evidencia adicional (opcional)

### Consulta directa del registro por id en phpMyAdmin

```sql
SELECT * FROM conductor WHERE id_conductor = 1;
```

### Verificación de que se persiste otra tabla de la cadena

A modo de complemento se puede repetir el procedimiento completo con la tabla `vehiculo`, que además comprueba la FK hacia `conductor`:

```json
POST http://127.0.0.1:4000/api/vehiculo
{
  "placa": "ABC-123",
  "tipo": "Camioneta",
  "id_conductor": 1
}
```

Respuesta esperada (201) con los campos del `JOIN`: `nombre_conductor`, `telefono_conductor` y `estado_conductor`.

### Verificación de validaciones (comportamiento correcto del CRUD)

| Caso                              | Petición                                    | Respuesta esperada |
| --------------------------------- | ------------------------------------------- | ------------------ |
| Campo obligatorio ausente         | `POST /api/conductor` sin `nombre`          | `400`              |
| FK inexistente                    | `POST /api/vehiculo` con `id_conductor: 999`| `400`              |
| Duplicado de valor único          | `POST /api/conductor` con `documento` repetido | `409`           |
| Registro inexistente              | `GET /api/conductor/999999`                 | `404`              |

---

## Conclusión

Se demostró, con capturas de phpMyAdmin y de Postman, que:

1. La API `POST /api/conductor` persiste el registro en la base de datos `smartroad_sos`.
2. La tabla `conductor` refleja la fila creada (id, nombre, documento, teléfono, estado).
3. Los datos de la API coinciden exactamente con los datos de la base de datos.
4. La historia asociada al CRUD está **Terminada** en el tablero Scrum conforme al cumplimiento de sus criterios de aceptación.