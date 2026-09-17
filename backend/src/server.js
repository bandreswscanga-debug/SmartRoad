require('dotenv').config();
require('express-async-errors');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createStore } = require('./services/storage');
const { createEngine } = require('./services/engine');
const { createTracer } = require('./services/tracer');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/openapi');
const vehicleRoutes = require('./routes/vehicles');
const driverRoutes = require('./routes/drivers');
const eventRoutes = require('./routes/events');
const alertRoutes = require('./routes/alerts');
const telemetryRoutes = require('./routes/telemetry');
const dashboardRoutes = require('./routes/dashboard');
const configRoutes = require('./routes/config');
const safezoneRoutes = require('./routes/safezones');

async function createApp() {
  const store = await createStore();
  const engine = createEngine(store);
  const tracer = createTracer(store);
  const ctx = { store, broadcast: engine.broadcast, uptimeSec: engine.uptimeSec, tracer };

  if (store.fallbackReason) {
    tracer.error(
      `[DB] Error de conexión a la base de datos: ${store.fallbackReason}. Operando en memoria (fallback).`
    );
  }

  const app = express();
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(express.json({ limit: '100kb' }));
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Intente nuevamente en unos minutos.' }
  });
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true
    })
  );

  app.get('/api/health', async (_req, res) => {
    const uptime = engine.uptimeSec();
    let db = { conectado: false, latencia_ms: null, motor: store.motor };
    try {
      const p = await store.ping();
      db = { conectado: p.ok === true, latencia_ms: p.latencia_ms, motor: store.motor };
    } catch (err) {
      db = { conectado: false, latencia_ms: null, motor: store.motor, error: err.message };
      tracer.error(`[HEALTH] Falló el ping a la base de datos: ${err.message}`);
    }
    res.json({
      ok: true,
      estado: 'OK',
      servicio: 'SmartRoad S.O.S API',
      version: '1.0.0',
      uptime: uptime,
      uptime_human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      db,
      now: new Date().toISOString()
    });
  });

  app.use('/api/auth', authLimiter, authRoutes(store, ctx));
  app.use('/api/dashboard', dashboardRoutes(store, ctx));
  app.use('/api/vehicles', vehicleRoutes(store));
  app.use('/api/drivers', driverRoutes(store));
  app.use('/api/events', eventRoutes(store));
  app.use('/api/alerts', alertRoutes(store, ctx));
  app.use('/api/telemetry', telemetryRoutes(store, ctx));
  app.use('/api/config', configRoutes(store, ctx));
  app.use('/api/safe-zones', safezoneRoutes(store));

  app.get('/api/system/logs', requireAuth, requireAdmin, async (req, res) => {
    try {
      const logs = await tracer.list(req.query.limit || 100);
      res.json({ total: logs.length, logs });
    } catch (err) {
      res.status(500).json({ error: 'No se pudieron leer los logs', detalle: err.message });
    }
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'SmartRoad S.O.S API — Documentación' }));

  app.get('/api/live/stream', engine.sseHandler);

  const distDir = path.resolve(__dirname, '../../web/dist');
  app.use(express.static(distDir));
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  app.use((err, _req, res, _next) => {
    const mensaje = String(err && err.message ? err.message : err);
    const esBD = /query|connect|ECONNREFUSED|pool|ER_|can't|database/i.test(mensaje);
    tracer.error(
      `[SERVER] ${esBD ? 'Error de conexión a la base de datos' : 'Error no controlado'}: ${mensaje.slice(0, 400)}`
    );
    console.error('[SmartRoad S.O.S] Error:', mensaje);
    res.status(500).json({ error: 'Error interno del servidor', detalle: esBD ? 'Fallo al conectar con la base de datos' : mensaje.slice(0, 200) });
  });

  return { app, engine, store, tracer, ctx };
}

async function start() {
  const { app, engine } = await createApp();
  const PORT = Number(process.env.PORT) || 4000;
  return app.listen(PORT, () => {
    console.log(`[SmartRoad S.O.S] API lista en http://localhost:${PORT}`);
    engine.start();
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('[SmartRoad S.O.S] Error al iniciar el servidor:', err);
    process.exit(1);
  });
}

module.exports = { createApp, start };