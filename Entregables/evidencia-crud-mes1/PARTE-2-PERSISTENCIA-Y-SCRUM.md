# Parte 2 — Persistencia en base de datos y cierre Scrum

**Responsable sugerido:** compañero/a 2  
**Rama sugerida:** `evidencia/parte-2-persistencia-scrum`

> Esta parte cubre el 30% de persistencia y el 10% de tablero Scrum. Las capturas deben ser reales y tomadas el mismo día de la entrega.

## 1. Preparar la base de datos

La aplicación usa la base `smartroad_sos` en:

```text
127.0.0.1:3306
```

El gestor local de phpMyAdmin está disponible en:

```text
http://127.0.0.1:8080
```

Si no abre, usar DBeaver, TablePlus o la consola MySQL. Usuario, contraseña y base se toman de:

```text
/home/oswal/SmartRoadSOS/backend/.env
```

No escribir la contraseña en el documento ni en capturas de código.

## 2. Captura 1 — Estado inicial

1. Abrir phpMyAdmin/DBeaver.
2. Seleccionar `smartroad_sos`.
3. Abrir la tabla `conductor`.
4. Mostrar la tabla antes de insertar el registro de evidencia.
5. Capturar el nombre de la base, la tabla y las columnas.

Archivo sugerido:

```text
10-db-conductor-antes.png
```

## 3. Captura 2 — Registro persistido

1. En Postman, ejecutar la petición **Crear conductor**.
2. Usar un valor único, por ejemplo `EV260924A`.
3. Copiar el valor exacto enviado en `documento` y `nombre`.
4. En el gestor de base de datos, abrir nuevamente `smartroad_sos.conductor`.
5. Capturar la misma tabla con el registro recién insertado.

Archivo sugerido:

```text
11-db-conductor-despues.png
```

La captura debe mostrar exactamente el mismo `documento` enviado en Postman. Si la Parte 1 creó la cadena completa, capturar también la relación conductor/vehículo en:

```text
12-db-vehiculo-conductor.png
```

## 4. Segunda persistencia recomendada

Para demostrar más de una entidad:

- Crear un vehículo con un `id_conductor` válido.
- Crear un dispositivo para ese vehículo.
- Crear un evento para ese dispositivo.
- Crear una alerta para ese evento.
- Capturar la misma tabla antes y después, sin borrar el registro hasta tomar la evidencia.

## 5. Tablero Scrum

Abrir Jira, Trello o GitHub Projects del equipo y capturar el tablero completo con:

- Columna **Terminado / Done** visible.
- Historias de configuración base, login y CRUDs de Semanas 1 a 4.
- Fecha de actualización visible o una tarjeta de actualización reciente.
- Estado real, sin mover historias que todavía no estén terminadas.

Archivo sugerido:

```text
13-scrum-tablero-terminado.png
```

Historias mínimas que deben aparecer terminadas:

- [ ] Configuración base del proyecto.
- [ ] Login y autenticación.
- [ ] CRUD de conductores.
- [ ] CRUD de vehículos.
- [ ] CRUD de dispositivos.
- [ ] CRUD de eventos.
- [ ] CRUD de alertas.

## 6. Commit de esta parte

```bash
git status
git add Entregables/evidencia-crud-mes1
git commit -m "evidencia: agrega persistencia y cierre scrum"
```

No incluir `.env`, contraseñas ni archivos binarios innecesarios en el commit. El compañero puede hacer `push` únicamente a su rama.

## 7. Checklist de entrega

- [ ] Captura 1 muestra tabla antes de insertar.
- [ ] Captura 2 muestra el registro nuevo.
- [ ] El dato de Postman coincide exactamente con MySQL.
- [ ] La base y la tabla son visibles en la captura.
- [ ] Tablero Scrum con historias en Terminado.
- [ ] Fecha/actualización reciente visible.
- [ ] Commit de la Parte 2 realizado.
