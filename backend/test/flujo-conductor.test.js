'use strict';

// Flujo completo del conductor (paso 6): registro por admin, login con
// cédula, alcance filtrado, IDs ajenos bloqueados, perfil y cambio de clave.
process.env.MYSQL_URL = '';
process.env.JWT_SECRET = 'smartroad_sos_secret_test';
delete process.env.GROQ_API_KEY;

const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/server');

let server;
let base;

test.before(async () => {
  const { app } = await createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function request(p, { method = 'GET', body, token } = {}) {
  const res = await fetch(base + p, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_err) {
    /* body vacío */
  }
  return { status: res.status, json };
}

const conductor = {
  nombre: 'Flujo Prueba',
  documento: '555666777',
  email: 'flujo@smartroad-demo.com',
  placa: 'FLJ-001',
  telefono: '3005556666'
};

let adminToken;
let conductorToken;
let conductorId;

test('admin registra conductor: crea usuario con clave=cedula', async () => {
  adminToken = (await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@smartroad-demo.com', password: 'Admin123' }
  })).json.token;
  assert.ok(adminToken);
  const { status, json } = await request('/api/drivers', { method: 'POST', token: adminToken, body: conductor });
  assert.equal(status, 201);
  assert.equal(json.driver.documento, conductor.documento);
  assert.equal(json.user.email, conductor.email);
  assert.equal(json.user.must_change_password, 1);
  assert.equal(json.email_enviado, false); // sin correo configurado, registro igual
  assert.ok(json.email_error);
  conductorId = json.driver.id;
});

test('duplicados de cedula y correo devuelven 409', async () => {
  const dupCed = await request('/api/drivers', {
    method: 'POST', token: adminToken,
    body: { ...conductor, email: 'otro@smartroad-demo.com', placa: 'OTR-001' }
  });
  assert.equal(dupCed.status, 409);
  const dupMail = await request('/api/drivers', {
    method: 'POST', token: adminToken,
    body: { ...conductor, documento: '000111222', placa: 'OTR-002' }
  });
  assert.equal(dupMail.status, 409);
});

test('no-admin no puede registrar conductores (403)', async () => {
  const ct = (await request('/api/auth/login', {
    method: 'POST', body: { email: conductor.email, password: conductor.documento }
  })).json.token;
  conductorToken = ct;
  const { status } = await request('/api/drivers', { method: 'POST', token: ct, body: conductor });
  assert.equal(status, 403);
});

test('conductor entra con correo+cedula y solo se ve a si mismo', async () => {
  const { json } = await request('/api/drivers', { token: conductorToken });
  assert.equal(json.drivers.length, 1);
  assert.equal(json.drivers[0].id, conductorId);
});

test('conductor no ve datos ajenos cambiando IDs (403)', async () => {
  assert.equal((await request('/api/drivers/1', { token: conductorToken })).status, 403);
  assert.equal((await request('/api/vehicles/4', { token: conductorToken })).status, 403);
  const adminEvents = (await request('/api/events', { token: adminToken })).json.events;
  assert.ok(adminEvents.length > 0);
  const ajeno = adminEvents[0].id;
  assert.equal((await request(`/api/events/${ajeno}`, { token: conductorToken })).status, 403);
  const adminAlerts = (await request('/api/alerts', { token: adminToken })).json.alerts;
  if (adminAlerts.length) {
    assert.equal((await request(`/api/alerts/${adminAlerts[0].id}`, { token: conductorToken })).status, 403);
  }
});

test('perfil ignora correo y clave aunque lleguen', async () => {
  const { json } = await request('/api/profile', {
    method: 'PUT', token: conductorToken,
    body: { nombre: 'Flujo Actualizado', telefono: '3000000001', email: 'hack@evil.com', password: 'hackeada' }
  });
  assert.equal(json.user.email, conductor.email);
  assert.equal(json.user.nombre, 'Flujo Actualizado');
  assert.equal(json.conductor.telefono, '3000000001');
});

test('cambio de clave y reingreso con la nueva', async () => {
  const ch = await request('/api/auth/change-password', {
    method: 'POST', token: conductorToken,
    body: { actual: conductor.documento, nueva: 'NuevaClave99' }
  });
  assert.equal(ch.status, 200);
  const relog = await request('/api/auth/login', {
    method: 'POST', body: { email: conductor.email, password: 'NuevaClave99' }
  });
  assert.equal(relog.status, 200);
  assert.equal(relog.json.must_change_password, false);
});
