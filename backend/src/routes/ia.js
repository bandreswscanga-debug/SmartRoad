const express = require('express');
const { requireAuth } = require('../middleware/auth');
const groq = require('../services/groq');
const { conductorVehicleIds } = require('../services/scope');

// Endpoints de IA (Groq). La key vive solo en el backend (GROQ_API_KEY).
// Si no hay key, el copiloto responde con un resumen operativo local calculado
// con los datos reales del panel (sin inventar información).
module.exports = (store) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/estado', (_req, res) => {
    res.json({
      configurada: groq.configured(),
      modelo_texto: groq.textModel(),
      modelo_vision: groq.visionModel()
    });
  });

  // Reúne el contexto real de la operación, ya filtrado por rol.
  async function gatherContext(req) {
    let vehicles = await store.listVehicles();
    let alerts = await store.listAlerts();
    let events = await store.listEvents();
    let drivers = await store.listDrivers();

    if (req.user.rol === 'conductor') {
      const ids = await conductorVehicleIds(store, req.user);
      vehicles = vehicles.filter((v) => ids.includes(v.id));
      alerts = alerts.filter((a) => ids.includes(Number(a.vehiculo_id)));
      events = events.filter((e) => ids.includes(Number(e.vehiculo_id)));
      drivers = drivers.filter(
        (d) => Number(d.usuario_id) === Number(req.user.id) || d.email === req.user.email
      );
    }

    const config = await store.getKeyConfig().catch(() => null);
    const activas = alerts.filter((a) => a.estado === 'ACTIVA');
    const criticos = vehicles.filter((v) => v.riesgo === 'CRITICO');
    return { vehicles, alerts, events, drivers, config, activas, criticos };
  }

  // Contexto compacto en texto para el modelo.
  function renderContext(c) {
    const { vehicles, events, drivers, config, activas, criticos } = c;
    const lines = [];

    lines.push(`Fecha/hora: ${new Date().toLocaleString('es-CO')}`);
    lines.push(`Flota: ${vehicles.length} vehículos, ${drivers.length} conductores.`);
    lines.push(
      `Riesgo de flota: ${criticos.length} en CRITICO, ` +
        `${vehicles.filter((v) => v.riesgo === 'MEDIO').length} en MEDIO, ` +
        `${vehicles.filter((v) => v.riesgo === 'BAJO').length} en BAJO.`
    );
    if (config) {
      lines.push(
        `Configuración de alertas: sonido=${config.alerta_sonora ?? '—'}, ` +
          `vibración=${config.alerta_vibracion ?? '—'}, ` +
          `visual=${config.alerta_visual ?? '—'}, ` +
          `SOS automático=${config.sos_automatico ?? '—'}, ` +
          `emergencia=${config.numero_emergencia || '—'}.`
      );
    }

    if (vehicles.length) {
      lines.push('', 'VEHÍCULOS:');
      for (const v of vehicles.slice(0, 20)) {
        lines.push(
          `- ${v.codigo || v.id} (${v.placa || 'sin placa'}): ${v.estado || '—'}, ` +
            `riesgo ${v.riesgo || '—'}, ${v.velocidad ?? '—'} km/h, ` +
            `conductor ${v.conductor_nombre || 'sin asignar'}, ruta ${v.ruta || '—'}, ` +
            `batería ${v.bateria ?? '—'}%.`
        );
      }
    }

    if (activas.length) {
      lines.push('', 'ALERTAS ACTIVAS:');
      for (const a of activas.slice(0, 12)) {
        lines.push(
          `- #${a.id} ${a.tipo} en ${a.vehiculo_codigo || a.vehiculo_id}: ` +
            `${a.descripcion || 'sin descripción'} (${a.timestamp || '—'}).`
        );
      }
    } else {
      lines.push('', 'ALERTAS ACTIVAS: ninguna.');
    }

    if (events.length) {
      lines.push('', 'ÚLTIMOS EVENTOS:');
      for (const e of events.slice(0, 15)) {
        lines.push(
          `- ${e.timestamp || '—'} · ${e.tipo} · ${e.riesgo} · ` +
            `${e.vehiculo_codigo || e.vehiculo_id} · ${e.conductor_nombre || '—'} · ` +
            `${e.descripcion || ''}`.trim()
        );
      }
    }

    return lines.join('\n').slice(0, 7000);
  }

  async function buildContext(req) {
    return renderContext(await gatherContext(req));
  }

  function riskCount(c, level) {
    return c.vehicles.filter((v) => v.riesgo === level).length;
  }

  // Resumen determinista con datos reales (funciona sin GROQ_API_KEY).
  function localResumen(c) {
    const medios = riskCount(c, 'MEDIO');
    const bajos = riskCount(c, 'BAJO');
    const lines = [];

    lines.push('## Resumen operativo del turno');
    lines.push(`- Flota: ${c.vehicles.length} vehículo(s) y ${c.drivers.length} conductor(es).`);
    lines.push(`- Riesgo: ${c.criticos.length} crítico(s), ${medios} medio(s), ${bajos} bajo(s).`);

    if (c.activas.length) {
      lines.push(`- Alertas activas: ${c.activas.length}.`);
      for (const a of c.activas.slice(0, 5)) {
        lines.push(
          `  - ${a.tipo || 'Alerta'} · ${a.vehiculo_codigo || a.vehiculo_id} · ${a.descripcion || 'sin descripción'}`
        );
      }
    } else {
      lines.push('- Sin alertas activas en este momento.');
    }

    if (c.criticos.length) {
      lines.push('', '## Prioridad inmediata');
      for (const v of c.criticos.slice(0, 5)) {
        lines.push(
          `- ${v.codigo || v.id} (${v.placa || 'sin placa'}): ` +
            `${v.conductor_nombre || 'sin conductor'} · ${v.velocidad ?? '—'} km/h · ${v.ruta || 'sin ruta'}`
        );
      }
    }

    lines.push('', '## Acciones recomendadas');
    const acciones = [];
    if (c.criticos.length || c.activas.length) {
      acciones.push('Contactar a los conductores en riesgo crítico y ordenar una pausa inmediata.');
    }
    if (medios) acciones.push('Programar pausas preventivas para los vehículos en riesgo medio.');
    acciones.push('Revisar el historial de eventos y exportar el reporte del turno en PDF.');
    acciones.push('Verificar descansos y jornadas antes del próximo relevo.');
    acciones.forEach((a, i) => lines.push(`${i + 1}. ${a}`));

    lines.push(
      '',
      '_Resumen generado localmente con los datos reales del panel. Configure GROQ_API_KEY para preguntas abiertas con IA._'
    );
    return lines.join('\n');
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Respuesta local para preguntas frecuentes cuando no hay proveedor de IA.
  function localRespuesta(c, pregunta) {
    const q = normalize(pregunta);
    const medios = riskCount(c, 'MEDIO');

    if (/(reporte|exportar|pdf|excel|entrega)/.test(q)) {
      return [
        '## Reporte recomendado',
        '- **PDF**: informe listo para entregar (Historial → Exportar → PDF).',
        '- **Excel**: tabla con formato para análisis y filtros.',
        '- **HTML**: se abre en cualquier navegador sin dependencias.',
        '- **CSV**: para importar en otro sistema.',
        '',
        'Incluya el periodo, los eventos críticos y las acciones tomadas. El botón **Exportar** está en Historial, Reportes y Conductores.'
      ].join('\n');
    }

    if (/(pausa|descanso|conductor|fatiga|riesgo|critico)/.test(q)) {
      const lines = ['## Conductores que requieren atención'];
      if (c.criticos.length) {
        for (const v of c.criticos.slice(0, 6)) {
          lines.push(
            `- **${v.conductor_nombre || 'Sin conductor'}** · ${v.codigo || v.id} (${v.placa || 'sin placa'}) · riesgo CRÍTICO · ${v.ruta || 'sin ruta'}`
          );
        }
        lines.push('', 'Ordene pausa inmediata, confirme el estado del conductor y active el protocolo SOS si no responde.');
      } else {
        lines.push('- No hay vehículos en riesgo crítico ahora mismo.');
      }
      if (medios) {
        lines.push('', `Hay ${medios} vehículo(s) en riesgo medio: programe pausas preventivas.`);
      }
      return lines.join('\n');
    }

    if (/(alerta|sos|emergencia)/.test(q)) {
      const lines = ['## Alertas activas'];
      if (!c.activas.length) return '## Alertas activas\n- No hay alertas activas en este momento.';
      for (const a of c.activas.slice(0, 8)) {
        lines.push(
          `- **${a.tipo || 'Alerta'}** · ${a.vehiculo_codigo || a.vehiculo_id} · ${a.descripcion || 'sin descripción'}`
        );
      }
      lines.push('', 'Confirme la atención de cada alerta desde el panel o llame al conductor antes de cerrarla.');
      return lines.join('\n');
    }

    if (/(flota|resumen|estado|turno|vehiculo)/.test(q)) {
      return localResumen(c);
    }

    return [
      localResumen(c),
      '',
      '_Para preguntas abiertas, configure GROQ_API_KEY en el backend (console.groq.com)._'
    ].join('\n');
  }

  // Analiza un evento (por id o datos directos). El conductor solo los suyos.
  router.post('/analizar', async (req, res) => {
    const { evento_id, vehiculo_id, tipo, riesgo, descripcion, velocidad } = req.body || {};
    let evento = { tipo, riesgo, descripcion, velocidad, vehiculo_id };
    let vehiculo = null;
    if (evento_id) {
      evento = await store.getEvent(evento_id);
      if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    }
    const vid = Number(evento?.vehiculo_id ?? vehiculo_id);
    if (Number.isFinite(vid)) {
      vehiculo = await store.getVehicle(vid);
      if (!vehiculo) return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    if (req.user.rol === 'conductor') {
      const ids = await conductorVehicleIds(store, req.user);
      if (!vehiculo || !ids.includes(vehiculo.id)) {
        return res.status(403).json({ error: 'No puede analizar datos de otro conductor' });
      }
    }
    if (!vehiculo && !evento?.tipo && !evento?.descripcion) {
      return res.status(400).json({ error: 'Envíe evento_id o datos (tipo/descripcion) y vehiculo_id' });
    }
    const conductor = req.user.rol === 'conductor' ? await store.getConductorByUserId(req.user.id) : null;
    const result = await groq.analyzeEvent({ evento, vehiculo, conductor });
    if (!result.ok) return res.status(result.status || 500).json({ error: result.error });
    res.json({ analisis: result.content, modelo: result.model });
  });

  // Analiza una imagen de la cámara (dataURL o URL). Límite de tamaño 1.5 MB.
  router.post('/analizar-imagen', async (req, res) => {
    const { image, prompt } = req.body || {};
    if (!image || typeof image !== 'string' || image.length > 2000000) {
      return res.status(400).json({ error: 'Imagen inválida o muy pesada (máx ~1.5 MB).' });
    }
    const result = await groq.analyzeImage({ image, prompt });
    if (!result.ok) return res.status(result.status || 500).json({ error: result.error });
    res.json({ analisis: result.content, modelo: result.model });
  });

  // Copiloto: pregunta libre con contexto real de la operación.
  router.post('/consulta', async (req, res) => {
    const { pregunta, historial } = req.body || {};
    if (!pregunta || !String(pregunta).trim()) {
      return res.status(400).json({ error: 'Escribe una pregunta para el copiloto.' });
    }
    const ctx = await gatherContext(req);
    const contexto = renderContext(ctx);

    if (!groq.configured()) {
      return res.json({
        respuesta: localRespuesta(ctx, pregunta),
        modelo: 'local',
        local: true,
        contexto: contexto.slice(0, 1200)
      });
    }

    const result = await groq.consultar({
      pregunta,
      historial: Array.isArray(historial) ? historial : [],
      contexto
    });
    if (!result.ok) {
      return res.json({
        respuesta: localRespuesta(ctx, pregunta),
        modelo: 'local',
        local: true,
        aviso: result.error,
        contexto: contexto.slice(0, 1200)
      });
    }
    res.json({ respuesta: result.content, modelo: result.model, contexto: contexto.slice(0, 1200) });
  });

  // Resumen operativo generado por IA (o local si no hay proveedor).
  router.get('/resumen', async (req, res) => {
    const ctx = await gatherContext(req);
    if (!groq.configured()) {
      return res.json({ resumen: localResumen(ctx), modelo: 'local', local: true });
    }
    const contexto = renderContext(ctx);
    const result = await groq.consultar({
      pregunta:
        'Genera un resumen operativo del turno: estado de la flota, riesgos, alertas activas y 3 acciones recomendadas. Usa bullets.',
      contexto
    });
    if (!result.ok) {
      return res.json({ resumen: localResumen(ctx), modelo: 'local', local: true, aviso: result.error });
    }
    res.json({ resumen: result.content, modelo: result.model });
  });

  return router;
};
