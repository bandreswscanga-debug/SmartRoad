# Guion de video de evidencia — SmartRoad S.O.S. (máximo 3 minutos)

Este video demuestra el CRUD del backend. No mostrar cámara, IA ni archivos de contraseña.

## Preparación

- Backend iniciado en `http://localhost:4000`.
- Postman abierto con la colección:
  `postman/SmartRoad-SOS-CRUD.postman_collection.json`
- phpMyAdmin abierto en `http://127.0.0.1:8080`.
- Usar un valor único, por ejemplo `ENTREGA-20260924-01`.

## Secuencia de grabación

1. Mostrar `GET http://localhost:4000/api/health` y estado `200`.
2. En Postman, ejecutar `POST /api/conductor` con:
   ```json
   {
     "nombre": "Conductor evidencia",
     "documento": "ENTREGA-20260924-01",
     "telefono": "3000000000"
   }
   ```
   Mostrar respuesta `201` y guardar el `id_conductor`.
3. Crear vehículo usando ese ID y mostrar `201`.
4. Crear dispositivo usando el `id_vehiculo` y mostrar `201`.
5. Crear evento usando el `id_dispositivo` y mostrar `201`.
6. Crear alerta usando el `id_evento` y mostrar `201`.
7. Ejecutar `GET /api/vehiculo/:id` y mostrar el `JOIN` con `nombre_conductor`.
8. Ejecutar `PUT` de alguna entidad y mostrar `200`.
9. Mostrar una validación inválida: FK inexistente o campo faltante, y mostrar `400`.
10. Abrir phpMyAdmin y mostrar la tabla con el registro nuevo. El dato debe coincidir exactamente con el enviado en Postman.
11. Eliminar en orden inverso: alerta, evento, dispositivo, vehículo y conductor. Mostrar `200`.

## Reglas

- No editar el video: grabación continua de pantalla.
- No mostrar `.env`, contraseñas ni tokens.
- No mostrar la cámara ni funciones de IA en esta entrega.
- Duración máxima: 3 minutos.
- El video debe verse claro, con URL, método, código HTTP y respuesta JSON.
- Las capturas de base de datos antes/después se toman aparte, aunque también aparezcan en el video.
