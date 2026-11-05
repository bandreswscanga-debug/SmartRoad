# Paso a seguir - SmartRoad S.O.S

Guía para que cualquier compañero pueda levantar el proyecto en local y desplegarlo sin tocar la rama `main`.

## Rama de trabajo

Trabaja siempre en la rama **`instalacion`** (ya creada). No hagas commit directo sobre `main`.

```bash
git checkout instalacion
git pull origin instalacion
```

## Requisitos previos

- Node.js + pnpm (backend y panel web)
- Flutter SDK (app móvil)
- Cuenta en PlanetScale (MySQL) y Render (despliegue) si quieres llevarlo a la nube

## 1. Desarrollo local (backend + panel web)

Desde la raíz del repo:

```bash
# Instalar dependencias del backend
cd backend && pnpm install && cd ..

# Instalar dependencias del panel web
cd web && pnpm install && cd ..

# Copiar variables de entorno del backend
cp backend/.env.example backend/.env
# Edita backend/.env con tu MYSQL_URL, JWT_SECRET, SMTP y GROQ_API_KEY
```

Levanta todo con el script incluido:

```bash
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

- Panel web: http://localhost:5173
- API / Swagger: http://localhost:4000/api/docs
- Health: http://localhost:4000/api/health
- Admin demo: bandreswscanga@hgmail.com / 5304566767

Logs: /tmp/smartroad-sos/backend.log y /tmp/smartroad-sos/web.log

## 2. App móvil (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

En la pantalla de login, campo **Servidor**, pon:
- Local: `http://localhost:4000`
- Nube: `https://TU-SERVICIO.onrender.com`

## 3. Base de datos (una sola vez)

En PlanetScale crea la base `smartroad_sos` y copia la connection string.

Luego ejecuta:

```bash
cd backend
MYSQL_URL="<tu-connection-string>" pnpm db:setup
```

Verifica: `http://localhost:4000/api/health` debe devolver `"motor":"mysql"`.

## 4. Despliegue en Render (nube)

1. Conecta el repo `bandreswscanga-debug/SmartRoad` a Render (Web Service).
2. Render detecta `render.yaml`. Completa:
   - Build: `cd web && pnpm install && pnpm build && cd ../backend && pnpm install`
   - Start: `node src/server.js`
   - Health check: `/api/health`
3. Agrega las variables de entorno obligatorias en Render:
   - `NODE_ENV=production`
   - `JWT_SECRET` (64 hex)
   - `MYSQL_URL` (connection string de PlanetScale)
   - `PUBLIC_BASE_URL` (URL de Render)
   - `SMTP_HOST/PORT/USER/PASS/MAIL_FROM`
   - `GROQ_API_KEY` (opcional, IA)
4. En Render → Shell del servicio ejecuta:
   ```bash
   cd backend && MYSQL_URL="<pegar>" pnpm db:setup
   ```

## 5. Reglas de equipo

- Nunca commitees secretos (claves, contraseñas, tokens) en git. Usa `.env` local y el dashboard de Render.
- No hagas push directo a `main`. Usa ramas `feat/` o `fix/` y abre Pull Request.
- Antes de pedir review, corre `./scripts/start-dev.sh` y verifica que el panel web y el backend respondan.

## Estructura del repo

```
backend/   -> API Node.js + MySQL (puerto 4000)
web/       -> Panel web React (puerto 5173)
mobile/    -> App Flutter (conductores)
scripts/   -> script de inicio rápido
render.yaml-> configuración de despliegue Render
```

## Rama resultante

Rama activa: **`instalacion`**
