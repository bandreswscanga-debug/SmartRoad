const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

module.exports = (store, ctx = {}) => {
  const router = express.Router();
  router.use(requireAuth, requireAdmin);

  router.get('/', async (_req, res) => {
    res.json({ users: await store.listUsers() });
  });

  router.post('/', async (req, res) => {
    const { nombre, email, password, rol = 'conductor', activo = true, placa, tipo_vehiculo, tipo_sangre } = req.body || {};
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    if (!['admin', 'conductor'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
    if (password.length < 4 || password.length > 128) return res.status(400).json({ error: 'La contraseña debe tener entre 4 y 128 caracteres' });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (await store.findUserByEmail(normalizedEmail)) return res.status(409).json({ error: 'El correo ya está registrado' });
    const user = await store.createUser({
      nombre: String(nombre).trim(),
      email: normalizedEmail,
      password_hash: await bcrypt.hash(password, 10),
      rol,
      activo: Boolean(activo),
      placa: rol === 'conductor' ? String(placa || '').trim() || null : null,
      tipo_vehiculo: rol === 'conductor' ? String(tipo_vehiculo || '').trim() || null : null,
      tipo_sangre: rol === 'conductor' ? String(tipo_sangre || '').trim() || null : null
    });
    ctx.tracer?.trace('INFO', `[AUDIT] Usuario creado por ${req.user.email}: ${normalizedEmail}`);
    res.status(201).json({ user: publicUser(user) });
  });

  router.put('/:id', async (req, res) => {
    const current = await store.getUserById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { nombre, email, password, rol, activo, placa, tipo_vehiculo, tipo_sangre } = req.body || {};
    const patch = {};
    if (nombre !== undefined) patch.nombre = String(nombre).trim();
    if (email !== undefined) {
      patch.email = String(email).trim().toLowerCase();
      const existing = await store.findUserByEmail(patch.email);
      if (existing && existing.id !== current.id) return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    if (rol !== undefined) {
      if (!['admin', 'conductor'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
      patch.rol = rol;
    }
    if (activo !== undefined) patch.activo = Boolean(activo);
    if (password) patch.password_hash = await bcrypt.hash(password, 10);
    if (current.rol === 'conductor' || rol === 'conductor') {
      if (placa !== undefined) patch.placa = String(placa).trim() || null;
      if (tipo_vehiculo !== undefined) patch.tipo_vehiculo = String(tipo_vehiculo).trim() || null;
      if (tipo_sangre !== undefined) patch.tipo_sangre = String(tipo_sangre).trim() || null;
    }
    const user = await store.updateUser(current.id, patch);
    ctx.tracer?.trace('INFO', `[AUDIT] Usuario actualizado por ${req.user.email}: ${current.email}`);
    res.json({ user: publicUser(user) });
  });

  router.delete('/:id', async (req, res) => {
    if (Number(req.params.id) === Number(req.user.id)) return res.status(400).json({ error: 'No puede eliminar su propio usuario' });
    const current = await store.getUserById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Usuario no encontrado' });
    await store.deleteUser(current.id);
    ctx.tracer?.trace('INFO', `[AUDIT] Usuario eliminado por ${req.user.email}: ${current.email}`);
    res.json({ ok: true });
  });

  return router;
};
