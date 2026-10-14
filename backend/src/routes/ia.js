const express = require('express');
const { requireAuth } = require('../middleware/auth');
const groq = require('../services/groq');
const { conductorVehicleIds } = require('../services/scope');

// Endpoints de IA (Groq). La key vive solo en el backend (GROQ_API_KEY).
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

  return router;
};
