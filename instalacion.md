# MANUAL DE INSTALACIÓN - SmartRoad S.O.S.

**Versión:** 1.0  
**Rama objetivo:** `experimental/implementacion-cambios-integrantes`  
**Objetivo:** Permitir clonar, desplegar y ejecutar SmartRoad S.O.S. en entorno local siguiendo únicamente este documento.

---

## 1. Objetivo

Describir de forma clara y ordenada el proceso para instalar, levantar y verificar el funcionamiento del proyecto SmartRoad S.O.S. utilizando Docker Compose.

---

## 2. Arquitectura que se va a levantar

Al seguir este manual se levantarán los siguientes servicios:

| Servicio | Imagen / Build | Puerto | Descripción |
|---|---|---|---|
| **nginx** | `nginx:alpine` | `80:80` | Proxy inverso y balanceador de carga entre las 4 réplicas del backend. |
| **backend** | Build local desde `Dockerfile` (4 réplicas) | `4000` (solo interno) | API REST Node.js + Express. |
| **db** | `mysql:8.4` | `3306` (solo interno) | Base de datos MySQL. Se inicializa con `backend/database/schema.sql`. |
| **dozzle** | `amir20/dozzle:latest` | `8080:8080` | Visor de logs en tiempo real de todos los contenedores. |
| **locust** | `locustio/locust:latest` | `8089:8089` | Panel de pruebas de carga contra el balanceador Nginx. |
| **web (Vite)** | Local con `pnpm` | `5173:5173` | Panel web de vigilancia. Se levanta por separado. |

> El tráfico del API debe entrar **únicamente** por `http://localhost` a través de Nginx.

---

## 3. Requisitos Previos

Tener instalados los siguientes programas:

| Software | Versión Mínima | Comprobación |
|---|---|---|
| **Git** | 2.30+ | `git --version` |
| **Docker Desktop** (Windows/Mac) o **Docker Engine + Docker Compose** (Linux) | 20.10+ | `docker --version` y `docker compose version` |
| **Node.js** | 18+ | `node --version` |
| **pnpm** | 8+ | `pnpm --version` |

Si no tienes `pnpm`, instálalo con: 

```bash
npm install -g pnpm
```
 ## 4. Instalación Paso a Paso

# Paso 1: Clonar el repositorio
Abrir una terminal en la carpeta donde se quiera descargar el proyecto y ejecutar:
```bash
git clone https://github.com/bandreswscanga-debug/SmartRoad.git
cd SmartRoad
git checkout experimental/implementacion-cambios-integrantes
```
Comprobar que se encuentra en la rama correcta:
git branch --show-current
Debe mostrar: experimental/implementacion-cambios-integrantes
# Paso 2: Revisar archivos necesarios
Desde la raíz del proyecto, verificar que existan estos archivos/carpetas:
docker-compose.yml
Dockerfile
nginx/default.conf
locust/locustfile.py
backend/database/schema.sql
backend/.env.example
Todos deben existir tal como vienen en este repositorio.
# Paso 3: Configurar el archivo .env del Backend
Entrar a la carpeta backend y crear el archivo .env copiando el ejemplo:
```bash
cd backend
cp .env.example .env
```
No es obligatorio editarlo para levantar con Docker Compose, ya que este se encarga de las variables de conexión con MySQL.
Volver a la raíz del proyecto:
cd ..
# Paso 4: Levantar el stack con Docker Compose
Desde la raíz del proyecto, ejecutar el siguiente comando para construir las imágenes, levantar todos los contenedores y crear 4 réplicas del backend:
```bash
docker compose up --build -d --scale backend=4
```
La primera vez tardará unos minutos mientras descarga las imágenes y construye el backend.
 # Paso 5: Verificar que todos los contenedores estén arriba
Esperar unos 30 - 60 segundos y comprobar el estado:
docker compose ps
Resultado esperado: 
- db debe aparecer como Up (healthy)
- backend-1, backend-2, backend-3, backend-4 deben aparecer como Up
- nginx, dozzle, locust deben aparecer como Up
# Paso 6: Levantar el panel web
Abrir otra terminal en la raíz del proyecto y ejecutar:
```bash
cd web
pnpm install
pnpm dev
```
Cuando termine, el panel web quedará disponible en:
http://localhost:5173
## 5. Verificación del Funcionamiento
Realizar estas comprobaciones para confirmar que todo quedó correctamente levantado.
Comprobación	URL / Comando
API a través de Nginx	http://localhost
Health Check	Abrir http://localhost/api/health o ejecutar curl -i http://localhost/api/health
Documentación Swagger	http://localhost/api/docs
Panel Web	http://localhost:5173
Visor de Logs (Dozzle)	http://localhost:8080
Pruebas de Carga (Locust)	http://localhost:8089
Credenciales por defecto para el panel web:
- Correo: bandreswscanga@hgmail.com
- Contraseña: 5304566767
 ó
- Correo:admin@smartroad-demo.com
- Contraseña: Admin123
## 6. Comandos Útiles
Acción	Comando	Notas
Ver estado de contenedores	docker compose ps	Rápida revisión de todo el stack
Ver logs de todos los servicios	docker compose logs -f	Ver todo lo que está ocurriendo
Ver logs solo del backend	docker compose logs -f backend	Útil para revisar el API
Reiniciar todo	docker compose restart	Reinicia contenedores sin borrar volúmenes
Apagar todo el stack	docker compose down	Detiene y elimina contenedores. Los datos de MySQL se conservan en el volumen smartroad_mysql_data
Volver a levantar tras apagar	docker compose up -d --scale backend=4	No necesita --build si no hubo cambios
Reconstruir tras cambios	docker compose up --build -d --scale backend=4	Usar solo si se modificó código, Dockerfile o dependencias
## 7. Recomendaciones Importantes
- Siempre entrar por http://localhost. Ese es el balanceador Nginx con las 4 réplicas.
- El panel web SIEMPRE se levanta aparte con pnpm dev en web/. No está dentro de Docker.
- No borres volúmenes a menos que sea estrictamente necesario. docker compose down -v elimina toda la base de datos.
- Los puertos 80, 8080, 8089 y 5173 deben estar libres antes de levantar.
- Si es la primera vez, espera a que db quede healthy antes de probar el Health Check. Puede tardar unos segundos tras iniciar.
