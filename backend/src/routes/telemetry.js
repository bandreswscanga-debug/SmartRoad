const express = require('express');

module.exports = (store, ctx) => {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { codigo, imei } = req.body || {};
    if (!codigo || !imei) return res.status(400).json({ error: 'codigo e imei son obligatorios' });
    const vehicle = await store.getVehicleByCode(codigo);
    if (!vehicle) return res.status(404).json({ error: 'Vehículo no registrado. Verifique el código.' });
    const t = await store.upsertTelemetry(vehicle.id, { imei, bateria: 100 });
    await store.updateVehicle(vehicle.id, { estado: vehicle.estado || 'MOVIENDO' });
    if (ctx && ctx.broadcast) ctx.broadcast('telemetry', { vehiculo: { ...vehicle, estado: 'MOVIENDO' } });
    res.json({ ok: true, device: t });
  });

  router.post('/heartbeat', async (req, res) => {
    const { codigo, bateria, senal_gps, fps, latencia_ms } = req.body || {};
    if (!codigo) return res.status(400).json({ error: 'codigo es obligatorio' });
    const vehicle = await store.getVehicleByCode(codigo);
    if (!vehicle) return res.status(404).json({ error: 'Vehículo no registrado' });
    const t = await store.upsertTelemetry(vehicle.id, {
      bateria: bateria ?? 100,
      senal_gps: senal_gps ?? 10,
      fps: fps ?? 12,
      latencia_ms: latencia_ms ?? 40
    });
    if (ctx && ctx.broadcast) ctx.broadcast('telemetry', { vehiculo: vehicle });
    res.json({ ok: true, device: t });
  });

  router.post('/event', async (req, res) => {
    const { codigo, tipo, riesgo, lat, lng, velocidad, descripcion } = req.body || {};
    if (!codigo || !tipo) return res.status(400).json({ error: 'codigo y tipo son obligatorios' });
    const vehicle = await store.getVehicleByCode(codigo);
    if (!vehicle) return res.status(404).json({ error: 'Vehículo no registrado' });
    const dataEvent = await store.createEvent({
      tipo,
      riesgo: riesgo || 'MEDIO',
      canal: 'SENSOR',
      vehiculo_id: vehicle.id,
      lat,
      lng,
      velocidad,
      descripcion: descripcion || `Evento ${tipo} reportado por el dispositivo ESP32 (${codigo}).`
    });
    const outcome = await maybeCriticalAlert(store, dataEvent, vehicle);
    let recovered = null;
    if (!outcome.alert) recovered = await maybeRecover(store, dataEvent, vehicle);
    if (ctx && ctx.broadcast) {
      ctx.broadcast('event', { event: outcome.event });
      if (outcome.created) ctx.broadcast('alert_critical', { alert: outcome.alert });
      if (recovered) ctx.broadcast('alert_resolved', { alert: recovered });
    }
    res.json({ ok: true, event: outcome.event, alert: outcome.alert, recovered });
  });

  router.post('/drowsiness-test', async (req, res) => {
    const { nivel, descripcion, codigo, lat, lng, velocidad } = req.body || {};
    const nv = String(nivel || '').toUpperCase();
    if (!['BAJO', 'MEDIO', 'CRITICO'].includes(nv)) {
      return res.status(400).json({ error: 'nivel debe ser BAJO, MEDIO o CRITICO' });
    }
    const vehicle = await store.getVehicleByCode(codigo || 'TRK-001');
    if (!vehicle) return res.status(404).json({ error: 'Vehículo no registrado' });
    const typeByLevel = { CRITICO: 'SOMNOLENCIA_ALTA', MEDIO: 'MICRO_SUENO', BAJO: 'DISTRACCION' };
    const dataEvent = await store.createEvent({
      tipo: typeByLevel[nv],
      riesgo: nv,
      canal: 'CAMARA',
      vehiculo_id: vehicle.id,
      lat: lat ?? vehicle.lat,
      lng: lng ?? vehicle.lng,
      velocidad: velocidad ?? vehicle.velocidad,
      descripcion: descripcion || `Modo de prueba (cámara del panel): nivel ${nv} de somnolencia detectado.`
    });
    const outcome = nv === 'CRITICO' ? await maybeCriticalAlert(store, dataEvent, vehicle) : { created: false, alert: null, event: dataEvent };
    let recovered = null;
    if (!outcome.alert) recovered = await maybeRecover(store, dataEvent, vehicle);
    if (ctx && ctx.broadcast) {
      ctx.broadcast('event', { event: outcome.event });
      if (outcome.created) ctx.broadcast('alert_critical', { alert: outcome.alert });
      if (recovered) ctx.broadcast('alert_resolved', { alert: recovered });
    }
    res.json({ ok: true, event: outcome.event, alert: outcome.alert, recovered });
  });

  return router;
};

const RECOVERY_TIPOS = new Set(['OK', 'SANO', 'SOS_RESUELTO', 'SOS_CANCELADO', 'RECUPERADO', 'DESTINO']);

async function maybeCriticalAlert(store, dataEvent, vehicle) {
  const critical = dataEvent.riesgo === 'CRITICO' || dataEvent.tipo === 'SOS';
  if (!critical) return { created: false, alert: null, event: dataEvent };
  const existing = await store.getActiveAlertByVehicle(vehicle.id);
  if (existing) {
    await store.updateVehicle(vehicle.id, { riesgo: 'CRITICO' });
    return { created: false, alert: existing, event: dataEvent };
  }
  await store.updateVehicle(vehicle.id, { riesgo: 'CRITICO' });
  const alert = await store.createAlert({
    tipo: dataEvent.tipo,
    evento_id: dataEvent.id,
    vehiculo_id: vehicle.id,
    riesgo: 'CRITICO',
    lat: dataEvent.lat,
    lng: dataEvent.lng,
    velocidad: dataEvent.velocidad || 0,
    descripcion: `El sistema no detecta reacción del conductor ${vehicle.conductor_nombre} (${vehicle.codigo}) ante la alarma. Se recomienda intervención inmediata.`,
    iniciada_por: 'AUTO'
  });
  return { created: true, alert, event: dataEvent };
}

async function maybeRecover(store, dataEvent, vehicle) {
  const sane = dataEvent.riesgo === 'BAJO' || RECOVERY_TIPOS.has(dataEvent.tipo);
  if (!sane) return null;
  const open = await store.getActiveAlertByVehicle(vehicle.id);
  if (!open) return null;
  await store.updateVehicle(vehicle.id, { riesgo: 'BAJO' });
  const resolved = await store.updateAlert(open.id, {
    estado: 'GESTIONADA',
    accion: 'ZONA_SEGURA',
    accion_meta: `Conductor recuperado — telemetría normal (${vehicle.codigo})`
  });
  await store.updateEvent(dataEvent.id, { atendido: true, atendido_por: 'Auto-resuelta por recuperación del conductor' });
  return resolved;
}