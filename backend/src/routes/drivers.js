const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateConductor(body, isUpdate = false) {
  const { nombre, documento, email, placa } = body || {};
  if (!isUpdate) {
    if (!nombre || !String(nombre).trim()) return 'Nombre es obligatorio';
    if (!documento || !String(documento).trim()) return 'Cédula (documento) es obligatoria';
    if (!email || !EMAIL_RE.test(String(email))) return 'Correo electrónico inválido';
    if (!placa || !String(placa).trim()) return 'Placa es obligatoria';
  } else {
    if (email !== undefined && !EMAIL_RE.test(String(email))) return 'Correo electrónico inválido';
    if (nombre !== undefined && !String(nombre).trim()) return 'Nombre inválido';
    if (documento !== undefined && !String(documento).trim()) return 'Cédula inválida';
    if (placa !== undefined && !String(placa).trim()) return 'Placa inválida';
  }
  return null;
}

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

module.exports = (store) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    // Conductor solo se ve a sí mismo; admin ve la flota completa.
    if (req.user.rol === 'conductor') {
      const me = await store.getConductorByUserId(req.user.id);
      return res.json({ drivers: me ? [me] : [] });
    }
    const drivers = await store.listDrivers();
    res.json({ drivers });
  });

  router.get('/:id', async (req, res) => {
    const driver = await store.getDriver(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Conductor no encontrado' });
    if (req.user.rol === 'conductor') {
      const me = await store.getConductorByUserId(req.user.id);
      if (!me || me.id !== driver.id) return res.status(403).json({ error: 'No puede ver datos de otro conductor' });
    }
    const vehicle = (await store.listDrivers()).find((d) => d.id === driver.id);
    const levels = await store.listEvents({ vehiculo_id: (vehicle && vehicle.vehiculo_id) || undefined });
    res.json({ driver, vehicle, fatiga: levels.slice(0, 40) });
  });

  // Crear conductor (solo admin): crea usuario rol conductor con clave = cédula (hash).
  router.post('/', requireAdmin, async (req, res) => {
    const erro = validateConductor(req.body);
    if (erro) return res.status(400).json({ error: erro });
    const nombre = String(req.body.nombre).trim();
    const documento = String(req.body.documento).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const placa = String(req.body.placa).trim().toUpperCase();
    const { telefono, licencia, empresa } = req.body;

    if (await store.findConductorByDocumento(documento)) {
      return res.status(409).json({ error: 'La cédula ya está registrada' });
    }
    if (await store.findConductorByEmail(email) || await store.findUserByEmail(email)) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const password_hash = await bcrypt.hash(documento, 10);
    let user = null;
    try {
      user = await store.createUser({
        nombre,
        email,
        password_hash,
        rol: 'conductor',
        activo: 1,
        cedula: documento,
        must_change_password: 1
      });
      const driver = await store.createConductor({
        nombre,
        documento,
        telefono: telefono ? String(telefono).trim() : null,
        email,
        placa,
        usuario_id: user.id,
        licencia: licencia ? String(licencia).trim() : null,
        empresa: empresa ? String(empresa).trim() : null
      });
      res.status(201).json({ driver, user: publicUser(user) });
    } catch (err) {
      // Si el conductor falló pero el usuario se creó, se revierte para no dejar huérfanos.
      if (user && user.id && typeof store.q !== 'function') {
        const idx = (store.users || []).findIndex((u) => u.id === user.id);
        if (idx >= 0) store.users.splice(idx, 1);
      }
      throw err;
    }
  });

  router.put('/:id', requireAdmin, async (req, res) => {
    const current = await store.getDriver(req.params.id);
    if (!current) return res.status(404).json({ error: 'Conductor no encontrado' });
    const erro = validateConductor(req.body, true);
    if (erro) return res.status(400).json({ error: erro });
    const patch = {};
    if (req.body.nombre !== undefined) patch.nombre = String(req.body.nombre).trim();
    if (req.body.documento !== undefined) patch.documento = String(req.body.documento).trim();
    if (req.body.telefono !== undefined) patch.telefono = req.body.telefono ? String(req.body.telefono).trim() : null;
    if (req.body.email !== undefined) patch.email = String(req.body.email).trim().toLowerCase();
    if (req.body.placa !== undefined) patch.placa = String(req.body.placa).trim().toUpperCase();
    if (req.body.licencia !== undefined) patch.licencia = req.body.licencia ? String(req.body.licencia).trim() : null;
    if (req.body.empresa !== undefined) patch.empresa = req.body.empresa ? String(req.body.empresa).trim() : null;

    // Duplicados: se excluye el propio registro.
    if (patch.documento && patch.documento !== current.documento) {
      if (await store.findConductorByDocumento(patch.documento)) {
        return res.status(409).json({ error: 'La cédula ya está registrada' });
      }
    }
    if (patch.email && patch.email !== (current.email || '').toLowerCase()) {
      if (await store.findConductorByEmail(patch.email) || await store.findUserByEmail(patch.email)) {
        return res.status(409).json({ error: 'El correo ya está registrado' });
      }
    }

    const driver = await store.updateConductor(current.id, patch);
    // Se sincroniza el nombre/correo en el usuario vinculado (la clave no cambia aquí).
    if (current.usuario_id && (patch.nombre || patch.email)) {
      const sync = {};
      if (patch.nombre) sync.nombre = patch.nombre;
      if (patch.email) sync.email = patch.email;
      await store.updateUser(current.usuario_id, sync);
    }
    res.json({ driver });
  });

  router.delete('/:id', requireAdmin, async (req, res) => {
    const current = await store.getDriver(req.params.id);
    if (!current) return res.status(404).json({ error: 'Conductor no encontrado' });
    await store.deleteConductor(current.id);
    res.json({ ok: true });
  });

  return router;
};
