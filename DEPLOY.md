# Despliegue en nube (para que la app funcione en cualquier dispositivo)

Un solo servicio sirve API + panel web (el backend sirve `web/dist`).
Plan gratuito sugerido: **Render** (API+web) + **PlanetScale** (MySQL).

> Nunca commitee secretos: van en el dashboard de Render, no en git.

## 1. Cuentas (usted las crea, 10 min)

1. **GitHub**: el repo ya está en `bandreswscanga-debug/SmartRoad`.
2. **PlanetScale** (planetscale.com, gratis): crear base `smartroad_sos` →
   copiar la **connection string** (`mysql://...?ssl=true`).
   Debe admitir claves foráneas (PlanetScale las soporta).
3. **Render** (render.com, gratis): New → Web Service → conectar el repo.
   Render detecta `render.yaml` solo; complete a mano con estos valores:
   - Build: `cd web && pnpm install && pnpm build && cd ../backend && pnpm install`
   - Start: `node src/server.js`
   - Health check: `/api/health`

## 2. Variables de entorno en Render (obligatorias marcadas *)

| Variable | Valor |
| --- | --- |
| `NODE_ENV` * | `production` |
| `JWT_SECRET` * | 64 hex generados (mínimo 32 caracteres) |
| `MYSQL_URL` * | connection string de PlanetScale |
| `TELEMETRY_API_KEY` | cualquiera (para ESP32/app) |
| `SMTP_HOST/PORT/USER/PASS/MAIL_FROM` | Brevo (ya los tiene en el `.env` local) |
| `APK_DOWNLOAD_URL` | link de Drive del APK |
| `GROQ_API_KEY` | opcional (IA) |

## 3. Cargar esquema y datos (una vez)

En Render → Shell del servicio:

```bash
cd backend && MYSQL_URL="<pegar>" pnpm db:setup
```

Verifique: `https://SU-SERVICIO.onrender.com/api/health` → `"motor":"mysql"`.

## 4. App en cualquier celular (sin rebuild)

En el login de la app, campo **Servidor**: `https://SU-SERVICIO.onrender.com`
→ ingresar. El panel web queda en la misma URL.

## Notas

- Plan free de Render **duerme** tras ~15 min sin uso: la primera petición
  tarda ~50 s en despertar. Normal en gratis.
- Límite Brevo gratis: 300 correos/día.
- Si cambia de proveedor MySQL, basta con cambiar `MYSQL_URL`.
