const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { riskRank } = require('../services/storage');
const { conductorVehicleIds } = require('../services/scope');

module.exports = (store, ctx) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/summary', async (req, res) => {
    let vehicles = await store.listVehicles();
    const alertsAll = await store.listAlerts();
    const eventsAll = await store.listEvents();
    let alerts = alertsAll;
    let events = eventsAll;
    if (req.user.rol === 'conductor') {
      const ids = await conductorVehicleIds(store, req.user);
      vehicles = vehicles.filter((v) => ids.includes(v.id));
      alerts = alerts.filter((a) => ids.includes(Number(a.vehiculo_id)));
      events = events.filter((e) => ids.includes(Number(e.vehiculo_id)));
    }
    const active = vehicles.filter((v) => v.estado === 'MOVIENDO');
    const activeAlerts = alerts.filter((a) => a.estado === 'ACTIVA');
    const config = await store.getKeyConfig();
    const driversAll = await store.listDrivers();

    const drivers = req.user.rol === 'conductor'
      ? driversAll.filter((d) => Number(d.usuario_id) === Number(req.user.id) || d.email === req.user.email)
      : driversAll;
    const dist = { BAJO: 0, MEDIO: 0, CRITICO: 0 };
    vehicles.forEach((v) => {
      dist[v.riesgo] = (dist[v.riesgo] || 0) + 1;
    });

    const lastDay = events.filter((e) => Date.now() - new Date(e.timestamp).getTime() <= 86400000);
    const anomalyCount = lastDay.reduce((acc, e) => (!e.atendido ? acc + 1 : acc), 0);

    res.json({
      summary: {
        vehiculos: vehicles.length,
        vehiculos_activos: active.length,
        conductores: drivers.length,
        alertas_activas: activeAlerts.length,
        anomalias_sin_atender: anomalyCount,
        eventos_24h: lastDay.length,
        riesgo_distribucion: dist,
        sistema: {
          estado: systemState(active, activeAlerts),
          uptime_seg: ctx.uptimeSec ? Math.round(ctx.uptimeSec()) : 0,
          latencia_ms: 42,
          desde: new Date(Date.now() - (ctx.uptimeSec ? Math.round(ctx.uptimeSec()) * 1000 : 3600000)).toISOString()
        }
      }
    });
  });

  router.get('/fatigue', async (req, res) => {
    const hours = Math.min(96, Math.max(2, Number(req.query.hours) || 24));
    const points = [];
    const start = Date.now() - hours * 3600000;
    let level = 30;
    const step = hours * 60 * 6;
    for (let t = start; t <= Date.now(); t += step * 60000) {
      const drift = Math.sin((Date.now() - t) / 3600000) * 9;
      level += (Math.random() - 0.48) * 7;
      level = Math.max(8, Math.min(96, level));
      points.push({
        t: new Date(t).toISOString(),
        nivel: Math.round(level + drift),
        alertas: Math.round(Math.random() * 2)
      });
    }
    res.json({ series: points, hours });
  });

  router.get('/recent-alerts', async (req, res) => {
    let alerts = await store.listAlerts();
    if (req.user.rol === 'conductor') {
      const ids = await conductorVehicleIds(store, req.user);
      alerts = alerts.filter((a) => ids.includes(Number(a.vehiculo_id)));
    }
    const rows = alerts.slice(0, 6).map((a) => ({
      id: a.id,
      tipo: a.tipo,
      riesgo: a.riesgo,
      estado: a.estado,
      vehiculo_codigo: a.vehiculo_codigo,
      conductor_nombre: a.conductor_nombre,
      timestamp: a.timestamp,
      accion: a.accion
    }));
    res.json({ alerts: rows });
  });

  router.get('/heatmap', async (req, res) => {
    let events = await store.listEvents();
    if (req.user.rol === 'conductor') {
      const ids = await conductorVehicleIds(store, req.user);
      events = events.filter((e) => ids.includes(Number(e.vehiculo_id)));
    }
    res.json({
      puntos: events.slice(0, 30).map((e) => ({ lat: e.lat, lng: e.lng, nivel: riskRank(e.riesgo) + 1 }))
    });
  });

  return router;
};

function systemState(active, activeAlerts) {
  if (activeAlerts.length) return 'ALERTA';
  if (!active.length) return 'INACTIVO';
  return 'ACTIVO';
}