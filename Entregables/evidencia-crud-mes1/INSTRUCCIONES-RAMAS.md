# Instrucciones para trabajar en dos ramas

Este paquete queda local y no se sube automáticamente. Cada compañero debe crear su rama desde la rama base acordada por el equipo.

## Parte 1

```bash
git switch -c evidencia/parte-1-colaboracion-cruds
```

Debe incluir:

- Colección Postman.
- Evidencia de GET/POST/PUT/DELETE.
- Evidencia de FK inválida.
- Historial de commits del último mes.

## Parte 2

```bash
git switch -c evidencia/parte-2-persistencia-scrum
```

Debe incluir:

- Capturas de persistencia antes/después.
- Capturas de phpMyAdmin/DBeaver.
- Captura del tablero Scrum en Terminado.
- Lista de historias finalizadas.

## Reglas

1. No modificar la rama de la otra persona.
2. No incluir `.env` ni contraseñas.
3. Hacer commits pequeños con mensajes descriptivos.
4. El repositorio central y el tablero Scrum deben ser los reales del equipo.
5. Completar los marcadores `<PEGAR...>` antes de entregar.
6. El orden demerge sugerido es Parte 1 y después Parte 2.

```bash
git log --oneline --since="1 month ago"
git status
```
