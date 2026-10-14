# Parte 1 — Colaboración Git y evidencia funcional de CRUD

**Responsable sugerido:** compañero/a 1  
**Rama sugerida:** `evidencia/parte-1-colaboracion-cruds`

> Esta parte cubre el 20% de repositorio/colaboración y el 40% de funcionamiento de los CRUD. No se deben inventar commits, repositorios ni capturas: se deben tomar de las cuentas y tablero reales del equipo.

## 1. Repositorio central

Completar antes de entregar:

- GitHub/GitLab: https://github.com/bandreswscanga-debug/SmartRoad
- Integrantes: `<NOMBRE_1>`, `<NOMBRE_2>`, `<NOMBRE_3>`
- Fecha de corte: `<FECHA_ACTUAL>`

## 2. Evidencia de commits

1. Abrir el repositorio central.
2. Entrar a **History / Commits**.
3. Filtrar el último mes.
4. Capturar la pantalla completa donde se vean autores distintos, fechas y mensajes.
5. Guardar como:

```text
01-git-historial-ultimo-mes.png
```

Deben aparecer commits reales de al menos dos integrantes. La rama de este compañero puede contener el commit de su parte, pero no se debe subir nada automáticamente desde este entorno.

## 3. Preparar la API

El backend principal queda en:

```text
/home/oswal/SmartRoadSOS/backend
```

En una terminal:

```bash
cd /home/oswal/SmartRoadSOS/backend
pnpm install
pnpm db:setup
pnpm start
```

La API debe quedar en:

```text
http://127.0.0.1:4000
```

Comprobar:

```bash
curl http://127.0.0.1:4000/api/health
```

## 4. Colección Postman

Importar estos archivos en Postman:

```text
Entregables/evidencia-crud-mes1/postman/SmartRoad-SOS-CRUD.postman_collection.json
Entregables/evidencia-crud-mes1/postman/SmartRoad-SOS-Local.postman_environment.json
```

La colección cubre las cinco tablas y las operaciones:

```text
GET, POST, PUT y DELETE
```

para `conductor`, `vehiculo`, `dispositivo`, `evento` y `alerta`.

### Orden de ejecución

1. Crear conductor.
2. Crear vehículo usando el ID del conductor.
3. Crear dispositivo usando el ID del vehículo.
4. Crear evento usando el ID del dispositivo.
5. Crear alerta usando el ID del evento.
6. Ejecutar las lecturas de cada entidad individualmente y actualizar cada entidad.
7. Ejecutar las validaciones negativas.
8. Eliminar en orden inverso: alerta, evento, dispositivo, vehículo y conductor.

La colección guarda automáticamente los IDs en variables de Postman. Antes de cada ejecución, cambia `unique_tag` y `placa_tag` a valores nuevos (por ejemplo `EV260924B` y `P60924B`) para evitar duplicados y respetar el límite de 20 caracteres de `placa`.

## 5. Capturas funcionales

Tomar capturas legibles de:

```text
02-postman-get-conductor.png
03-postman-post-conductor.png
04-postman-put-conductor.png
05-postman-delete-conductor.png
06-postman-vehiculo-join.png
07-postman-fk-invalida-400.png
08-postman-cadena-completa.png
```

En cada captura deben verse la URL, el método y el código de respuesta. No capturar solamente el código; debe verse el cuerpo JSON o la respuesta.

## 6. Evidencia de errores esperados

| Prueba | Respuesta esperada |
|---|---:|
| Falta un campo NOT NULL | 400 |
| FK que no existe | 400 |
| GET de ID inexistente | 404 |
| Vehículo con dispositivo duplicado | 409 |
| POST correcto | 201 |
| GET/PUT/DELETE correctos | 200 |

## 7. Commit de esta parte

Revisar que no se incluyan contraseñas ni `.env`:

```bash
git status
git add Entregables/evidencia-crud-mes1
git commit -m "evidencia: agrega pruebas funcionales CRUD"
```

El compañero decide si hace `push` a su rama. Este entorno no hace push.

## 8. Checklist de entrega

- [ ] URL real del repositorio completada.
- [ ] Historial del último mes capturado.
- [ ] Colección Postman importada y ejecutada.
- [ ] GET, POST, PUT y DELETE visibles.
- [ ] FK inválida devuelve 400.
- [ ] JOIN de vehículo visible.
- [ ] Commit realizado en la rama de la Parte 1.
