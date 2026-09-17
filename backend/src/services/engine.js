const { riskRank, RIS } = require('./storage');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createEngine(store) {
  const clients = new Set();
  const startedAt = Date.now();

  function broadcast(type, data) {
    const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (_e) {
        clients.delete(res);
      }
    }
  }

  function sseHandler(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write(`retry: 5000\n\n`);
    res.write(`event: connected\ndata: {"ok":true}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  }

  async function start() {
    const tick = 4000;
    await runSimulationLoop(tick);
    await runScenarioScheduler();
  }

  async function runSimulationLoop(ms) {
    await loop();
    setInterval(loop, ms);

    async function loop() {
      try {
        const cfg = await store.getKeyConfig();
        const vehicles = await store.listVehicles();
        for (const v of vehicles) {
          const moving = v.estado === 'MOVIENDO';
          const step = moving ? 0.0009 : 0;
          const nextLat = v.lat + (moving ? (Math.random() - 0.5) * step : (Math.random() - 0.5) * 0.0001);
          const nextLng = v.lng + (moving ? (Math.random() - 0.4) * step : (Math.random() - 0.5) * 0.0001);
          const velocidad = Math.max(0, (v.velocidad || 80) + Math.round((Math.random() - 0.5) * 8));
          const battery = Math.max(8, (v.bateria || 100) - Math.random() * 0.02);
          await store.updateVehicle(v.id, {
            lat: nextLat,
            lng: nextLng,
            velocidad,
            bateria: Math.round(battery * 10) / 10
          });
          await store.upsertTelemetry(v.id, {
            senal_gps: 8 + Math.round(Math.random() * 5),
            fps: 8 + Math.round(Math.random() * 8),
            latencia_ms: 30 + Math.round(Math.random() * 40)
          });
        }
        const vehiclesNow = await store.listVehicles();
        broadcast('telemetry', { vehiculos: vehiclesNow });
        broadcast('system', { tipo: 'heartbeat', uptime: Math.round((Date.now() - startedAt) / 1000) });
      } catch (err) {
        console.error('[engine] loop error:', err.message);
      }
    }
  }

  async function runScenarioScheduler() {
    await sleep(8000);
    await maybeEscalate();
    setInterval(maybeEscalate, 95000);
  }

  async function maybeEscalate() {
    try {
      const active = await store.listActiveAlerts();
      if (active.length >= 3) return;
      const eligible = (await store.listVehicles()).filter((v) => v.riesgo !== 'CRITICO');
      if (!eligible.length) return;
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      const escalated = await store.updateVehicle(pick.id, { riesgo: 'CRITICO' });
      const evt = await store.createEvent({
        tipo: 'SOMNOLENCIA_ALTA',
        riesgo: 'CRITICO',
        canal: 'CAMARA',
        vehiculo_id: pick.id,
        lat: escalated.lat,
        lng: escalated.lng,
        velocidad: escalated.velocidad,
        descripcion: 'Inclinación de cabeza con cierre prolongado de ojos. El dispositivo ha activado la alarma sonora continúa.',
        respuesta_ms: Math.round(400 + Math.random() * 1400)
      });
      const alert = await store.createAlert({
        tipo: evt.tipo,
        evento_id: evt.id,
        vehiculo_id: pick.id,
        riesgo: 'CRITICO',
        lat: escalated.lat,
        lng: escalated.lng,
        velocidad: escalated.velocidad,
        descripcion: `El sistema no detecta reacción del conductor ${pick.conductor_nombre} (${pick.codigo}) ante la alarma. Se recomienda intervención inmediata.`,
        iniciada_por: 'AUTO'
      });
      broadcast('alert_critical', { alert });
      broadcast('event', { event: evt });
    } catch (err) {
      console.error('[engine] escalation error:', err.message);
    }
  }

  return {
    broadcast,
    sseHandler,
    start,
    uptimeSec: () => Math.round((Date.now() - startedAt) / 1000)
  };
}

module.exports = { createEngine };