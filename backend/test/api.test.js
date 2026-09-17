'use strict';

process.env.MYSQL_URL = '';
process.env.JWT_SECRET = 'smartroad_sos_secret_test';

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

async function loginAdmin() {
  const r = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@smartroad-demo.com', password: 'Admin123' }
  });
  return r.json.token;
}

test('GET /api/health responde estado, uptime y ping a la BD', async () => {
  const { status, json } = await request('/api/health');
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.estado, 'OK');
  assert.equal(typeof json.uptime, 'number');
  assert.ok(json.uptime >= 0);
  assert.ok(json.uptime_human.length > 0);
  assert.equal(json.db.motor, 'memory');
  assert.equal(json.db.conectado, true);
  assert.equal(typeof json.db.latencia_ms, 'number');
});

test('POST /api/auth/login valida la entrada (correo inválido -> 400)', async () => {
  const { status, json } = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'no-es-correo', password: 'Admin123' }
  });
  assert.equal(status, 400);
  assert.equal(json.error, 'Correo electrónico inválido');
});

test('Login fallido (contraseña incorrecta) -> 401 y queda en system_logs', async () => {
  const ldn = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@smartroad-demo.com', password: 'clave_incorrecta' }
  });
  assert.equal(ldn.status, 401);
  assert.equal(ldn.json.error, 'Credenciales inválidas');

  const token = await loginAdmin();
  const logs = await request('/api/system/logs?limit=100', { token });
  assert.equal(logs.status, 200);
  const intento = logs.json.logs.find(
    (l) => l.nivel === 'ERROR' && /contraseña incorrecta/.test(l.mensaje)
  );
  assert.ok(intento, 'debe existir un registro ERROR de login fallido');
  assert.ok(intento.origen_ip, 'el log debe guardar el origen_ip');
});

test('Login exitoso -> token JWT y registro INFO', async () => {
  const r = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@smartroad-demo.com', password: 'Admin123' }
  });
  assert.equal(r.status, 200);
  assert.ok(r.json.token.length > 20);
  assert.equal(r.json.user.rol, 'admin');

  const logs = await request('/api/system/logs?limit=100', { token: r.json.token });
  const info = logs.json.logs.find((l) => l.nivel === 'INFO' && /Login exitoso/.test(l.mensaje));
  assert.ok(info, 'debe existir un registro INFO del login exitoso');
});

test('GET /api/system/logs exige autenticación y rol admin', async () => {
  const sinToken = await request('/api/system/logs');
  assert.equal(sinToken.status, 401);

  const tokenConductor = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'juan@smartroad-demo.com', password: 'Conductor123' }
  });
  const conConductor = await request('/api/system/logs', { token: tokenConductor.json.token });
  assert.equal(conConductor.status, 403);
});

test('GET /api/docs expone la documentación OpenAPI', async () => {
  const res = await fetch(base + '/api/docs');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(/swagger-ui/.test(html));
});