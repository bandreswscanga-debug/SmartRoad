const express = require('express');
const { requireAuth } = require('../middleware/auth');

const ACTION_TO_ESTADO = {
  CONFIRMADA: 'GESTIONADA',
  ZONA_SEGURA: 'GESTIONADA',
  EMERGENCIA_LLAMADA: 'EMERGENCIA'
};

const ACTION_LABEL = {
  CONFIRMADA: 'Atención confirmada por',
  ZONA_SEGURA: 'Zona segura sugerida:',
  EMERGENCIA_LLAMADA: 'Llamada a emergencias iniciada:'
};

module.exports = (store, ctx) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    const alerts = await store.listAlerts(req.query);
    res.json({ alerts, total: alerts.length });
  });

  router.get('/active', async (_req, res) => {
    const alerts = await store.listActiveAlerts();
    res.json({ alerts });
  });

  router.get('/:id', async (req, res) => {
    const alert = await store.getAlert(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' });
    res.json({ alert });
  });

  router.post('/:id/actions', async (req, res) => {
    const { accion, meta } = req.body || {};
    const accionId = String(accion || '').toUpperCase();
    if (!ACTION_TO_ESTADO[accionId]) {
      return res.status(400).json({ error: 'Acción inválida. Use CONFIRMADA, ZONA_SEGURA o EMERGENCIA_LLAMADA' });
    }
    const updated = await store.updateAlert(req.params.id, {
      estado: ACTION_TO_ESTADO[accionId],
      accion: accionId,
      accion_meta: `${ACTION_LABEL[accionId]} ${req.user.nombre}${meta ? ` · ${meta}` : ''}`
    });
    if (!updated) return res.status(404).json({ error: 'Alerta no encontrada' });
    if (updated.evento_id) {
      await store.updateEvent(updated.evento_id, { atendido: true, atendido_por: updated.accion_meta });
    }
    if (ctx && ctx.broadcast) {
      ctx.broadcast('alert_resolved', { alert: updated });
      ctx.broadcast('system', { type: 'alert_resolved', message: `Alerta ${updated.accion} en ${updated.vehiculo_codigo}` });
    }
    res.json({ alert: updated });
  });

  return router;
};