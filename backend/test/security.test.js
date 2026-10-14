'use strict';

// Pruebas de seguridad del módulo transversal y de los controles de acceso.
process.env.MYSQL_URL = '';
process.env.JWT_SECRET = 'smartroad_sos_secret_test_para_la_suite_de_seguridad';
process.env.SIMULATION_ENABLED = '0';
process.env.TELEMETRY_API_KEY = 'clave-de-dispositivo-de-prueba';

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

async function request(p, { method = 'GET', body, token, headers = {} } = {}) {
  const res = await fetch(base + p, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_err) {
    /* respuesta sin cuerpo JSON */
  }
  return { status: res.status, json, headers: res.headers };
}

async function login(email, password) {
  const r = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  return r.json && r.json.token;
}

const adminToken = () => login('admin@smartroad-demo.com', 'Admin123');
const driverToken = () => login('juan@smartroad-demo.com', 'Conductor123');

test('cabeceras de seguridad: CSP, nosniff, referrer y permissions policy', async () => {
  const res = await fetch(base + '/api/health');
  const csp = res.headers.get('content-security-policy') || '';
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.match(res.headers.get('permissions-policy') || '', /camera=\(self\)/);
  assert.equal(res.headers.get('x-request-id') !== null, true, 'debe devolverse X-Request-Id');
});

test('el health no filtra el detalle del error de base de datos', async () => {
  const { json } = await request('/api/health');
  assert.equal(json.ok, true);
  assert.equal(json.simulacion, false, 'con SIMULATION_ENABLED=0 la simulación debe estar apagada');
  assert.ok(!('error' in (json.db || {})), 'db no debe incluir el mensaje de error');
});

test('CRUD singular exige autenticación y rol admin en las escrituras', async () => {
  const sinToken = await request('/api/conductor');
  assert.equal(sinToken.status, 401);
  assert.equal(sinToken.json.error, 'Token requerido');

  const token = await adminToken();
  // Con token válido la petición supera la autenticación: si el CRUD singular
  // responde 500 es porque su pool MySQL (CRUD_DB_*) no está disponible en este
  // entorno, no porque el control de acceso haya fallado.
  const lectura = await request('/api/conductor', { token });
  assert.notEqual(lectura.status, 401);
  assert.notEqual(lectura.status, 403);

  const escrituraSinAdmin = await request('/api/conductor', {
    method: 'POST',
    body: { nombre: 'Prueba', documento: 'DOC-1', telefono: '3000000000' },
    token: await driverToken()
  });
  assert.equal(escrituraSinAdmin.status, 403, 'escribir en el CRUD exige rol admin');
});

test('la prueba de la IA exige sesión y no acepta niveles fuera del enum', async () => {
  const sinToken = await request('/api/telemetry/drowsiness-test', {
    method: 'POST',
    body: { nivel: 'CRITICO' }
  });
  assert.equal(sinToken.status, 401);

  const token = await adminToken();
  const invalido = await request('/api/telemetry/drowsiness-test', {
    method: 'POST',
    body: { nivel: 'TRAPOSO' },
    token
  });
  assert.equal(invalido.status, 400);
});

test('la telemetría valida rangos, enums y formato antes de tocar la base de datos', async () => {
  const token = await adminToken();
  const device = { 'x-device-key': 'clave-de-dispositivo-de-prueba' };

  const riesgoInvalido = await request('/api/telemetry/event', {
    method: 'POST',
    body: { codigo: 'TRK-001', tipo: 'SOMNOLENCIA_ALTA', riesgo: 'ALTISIMO' },
    headers: device
  });
  assert.equal(riesgoInvalido.status, 400);

  const latInvalida = await request('/api/telemetry/event', {
    method: 'POST',
    body: { codigo: 'TRK-001', tipo: 'SOS', riesgo: 'CRITICO', lat: 999 },
    headers: device
  });
  assert.equal(latInvalida.status, 200, 'una latitud fuera de rango se descarta, no se guarda');
  const evento = await request('/api/events?limit=1', { token });
  assert.ok(evento.json.events.every((e) => e.lat === null || (e.lat >= -90 && e.lat <= 90)));
});

test('la telemetría exige credencial de dispositivo o sesión de operador', async () => {
  const anonimo = await request('/api/telemetry/heartbeat', {
    method: 'POST',
    body: { codigo: 'TRK-001' }
  });
  assert.equal(anonimo.status, 401);

  const claveIncorrecta = await request('/api/telemetry/heartbeat', {
    method: 'POST',
    body: { codigo: 'TRK-001' },
    headers: { 'x-device-key': 'incorrecta' }
  });
  assert.equal(claveIncorrecta.status, 401);

  const conClave = await request('/api/telemetry/heartbeat', {
    method: 'POST',
    body: { codigo: 'TRK-001', bateria: 88 },
    headers: { 'x-device-key': 'clave-de-dispositivo-de-prueba' }
  });
  assert.equal(conClave.status, 200);

  // El SOS de la app móvil llega con JWT: no debe quedar bloqueado.
  const conSesion = await request('/api/telemetry/event', {
    method: 'POST',
    body: { codigo: 'TRK-001', tipo: 'SOS', riesgo: 'CRITICO' },
    token: await driverToken()
  });
  assert.equal(conSesion.status, 200);
});

test('el flujo SSE exige un ticket de un solo uso', async () => {
  const sinTicket = await fetch(base + '/api/live/stream');
  assert.equal(sinTicket.status, 401);
  await sinTicket.text();

  const token = await adminToken();
  const issued = await request('/api/live/ticket', { method: 'POST', token });
  assert.equal(issued.status, 200);
  assert.ok(issued.json.ticket.length > 20);

  const controller = new AbortController();
  const res = await fetch(`${base}/api/live/stream?ticket=${encodeURIComponent(issued.json.ticket)}`, {
    signal: controller.signal
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/event-stream/);
  controller.abort();
  await res.text().catch(() => {});

  // El mismo ticket no sirve dos veces.
  const reutilizado = await fetch(base + `/api/live/stream?ticket=${encodeURIComponent(issued.json.ticket)}`);
  assert.equal(reutilizado.status, 401);
  await reutilizado.text();
});

test('ack de evento registra al usuario autenticado, no al enviado en el cuerpo', async () => {
  const token = await adminToken();
  const creado = await request('/api/telemetry/event', {
    method: 'POST',
    body: { codigo: 'TRK-002', tipo: 'DISTRACCION', riesgo: 'BAJO' },
    headers: { 'x-device-key': 'clave-de-dispositivo-de-prueba' }
  });
  assert.equal(creado.status, 200);
  const id = creado.json.event.id;

  const ack = await request(`/api/events/${id}/ack`, {
    method: 'POST',
    body: { atendido_por: 'Falso Operador' },
    token
  });
  assert.equal(ack.status, 200);
  assert.notEqual(ack.json.event.atendido_por, 'Falso Operador');
  assert.match(ack.json.event.atendido_por, /Administrador Demo/);
});

test('el rate limit de login responde 429 tras varios intentos fallidos', async () => {
  let limite = false;
  for (let i = 0; i < 15; i += 1) {
    const r = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@smartroad-demo.com', password: 'incorrecta' }
    });
    if (r.status === 429) {
      limite = true;
      assert.match(r.json.error, /Demasiados intentos/);
      break;
    }
  }
  assert.ok(limite, 'debe activarse el límite de intentos de inicio de sesión');
});

test('el token no puede firmarse con rol admin sin conocer el secreto', async () => {
  const jwt = require('jsonwebtoken');
  const falso = jwt.sign({ id: 1, rol: 'admin', nombre: 'Intruso' }, 'secreto-falso', {
    issuer: 'smartroad-sos',
    audience: 'smartroad-sos-panel',
    expiresIn: '1h'
  });
  const r = await request('/api/system/logs', { token: falso });
  assert.equal(r.status, 401);
});
