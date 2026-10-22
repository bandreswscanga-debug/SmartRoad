const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth, sign } = require('../middleware/auth');
const { clientIp } = require('../services/tracer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL = 200;
const MAX_PASSWORD = 128;

function validateLogin(email, password) {
  if (!email || !password) return 'Correo y contraseña son obligatorios';
  if (String(email).length > MAX_EMAIL || !EMAIL_RE.test(String(email))) return 'Correo electrónico inválido';
  if (String(password).length < 4 || String(password).length > MAX_PASSWORD) {
    return 'La contraseña debe tener entre 4 y 128 caracteres';
  }
  return null;
}

function validateRegistro({ nombre, email, password, tipo_persona, telefono_contacto }) {
  if (!nombre || String(nombre).trim().length < 2) return 'El nombre es obligatorio';
  if (String(nombre).length > 120) return 'El nombre es demasiado largo';
  if (!email || !password) return 'Correo y contraseña son obligatorios';
  if (String(email).length > MAX_EMAIL || !EMAIL_RE.test(String(email))) return 'Correo electrónico inválido';
  if (String(password).length < 4 || String(password).length > MAX_PASSWORD) {
    return 'La contraseña debe tener entre 4 y 128 caracteres';
  }
  if (tipo_persona && !['persona_natural', 'empresa'].includes(tipo_persona)) {
    return 'Tipo de persona inválido';
  }
  if (tipo_persona === 'empresa' && (!telefono_contacto || String(telefono_contacto).trim().length < 1)) {
    return 'El número de contacto es obligatorio para empresas';
  }
  if (telefono_contacto && String(telefono_contacto).length > 30) {
    return 'El número de contacto es demasiado largo';
  }
  return null;
}

module.exports = (store, ctx = {}) => {
  const router = express.Router();
  const tracer = ctx.tracer;

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    const erro = validateLogin(email, password);
    if (erro) return res.status(400).json({ error: erro });
    const ip = tracer ? clientIp(req) : null;
    const user = await store.findUserByEmail(String(email).toLowerCase());
    if (!user) {
      tracer?.trace('ERROR', `[AUTH] Intento de login fallido para "${email}" (usuario no existe).`, ip);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      tracer?.trace('ERROR', `[AUTH] Intento de login fallido para "${email}" (contraseña incorrecta).`, ip);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    if (!user.activo) return res.status(403).json({ error: 'Usuario inactivo' });
    tracer?.trace('INFO', `[AUTH] Login exitoso de "${email}" (${user.rol}).`, ip);
    const token = sign(user);
    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  });

  router.post('/registro', async (req, res) => {
    const { nombre, email, password, tipo_persona = 'persona_natural', telefono_contacto } = req.body || {};
    const error = validateRegistro({ nombre, email, password, tipo_persona, telefono_contacto });
    if (error) return res.status(400).json({ error });
    const ip = tracer ? clientIp(req) : null;
    const emailLower = String(email).toLowerCase();
    const existe = await store.findUserByEmail(emailLower);
    if (existe) {
      tracer?.trace('ERROR', `[AUTH] Intento de registro fallido para "${emailLower}" (correo ya registrado).`, ip);
      return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
    }
    const password_hash = await bcrypt.hash(String(password), 10);
    const user = await store.createUser({
      nombre: String(nombre).trim(),
      email: emailLower,
      password_hash,
      rol: 'conductor',
      tipo_persona,
      telefono_contacto: tipo_persona === 'empresa' ? String(telefono_contacto).trim() : null
    });
    tracer?.trace('INFO', `[AUTH] Registro exitoso de "${emailLower}" (${user.tipo_persona}).`, ip);
    const token = sign(user);
    res.status(201).json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, tipo_persona: user.tipo_persona, telefono_contacto: user.telefono_contacto } });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await store.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  });

  router.put('/perfil', requireAuth, async (req, res) => {
    const { nombre, email, telefono_contacto } = req.body || {};
    try {
      const user = await store.updateUser(req.user.id, {
        nombre: nombre ? String(nombre).trim() : undefined,
        email: email ? String(email).trim() : undefined,
        telefono_contacto: telefono_contacto !== undefined ? String(telefono_contacto).trim() : undefined
      });
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
      tracer?.trace('INFO', `[AUTH] Perfil actualizado de "${user.email}".`, null);
      res.json({ user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, tipo_persona: user.tipo_persona, telefono_contacto: user.telefono_contacto } });
    } catch (err) {
      if (err.status === 409) return res.status(409).json({ error: err.message });
      throw err;
    }
  });

  return router;
};