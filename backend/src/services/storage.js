const mysql = require('mysql2/promise');

const RIS = ['BAJO', 'MEDIO', 'CRITICO'];

function riskRank(r) {
  return RIS.indexOf(r);
}

class MemoryStore {
  constructor(deps) {
    Object.assign(this, deps);
    this._seq = deps.seq;
  }

  async ping() {
    return { ok: true, latencia_ms: 0 };
  }

  async writeLog(entry) {
    const id = (this._seq.log = (this._seq.log || 0) + 1);
    const row = {
      id,
      fecha_hora: new Date().toISOString(),
      nivel: entry.nivel || 'INFO',
      origen_ip: entry.origen_ip || null,
      mensaje: String(entry.mensaje || '').slice(0, 512)
    };
    this.logs.unshift(row);
    if (this.logs.length > 1000) this.logs.length = 1000;
    return { ...row };
  }

  async listSystemLogs(limit = 100) {
    return this.logs.slice(0, Number(limit) || 100);
  }

  next(col) {
    return ++this._seq[col];
  }

  async findUserByEmail(email) {
    return this.users.find((u) => u.email === email) || null;
  }

  async getUserById(id) {
    return this.users.find((u) => u.id === Number(id)) || null;
  }

  async listVehicles() {
    return this.vehicles.map((v) => ({ ...v })).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  async getVehicle(id) {
    return this.vehicles.find((v) => v.id === Number(id)) || null;
  }

  async getVehicleByCode(code) {
    return this.vehicles.find((v) => v.codigo === code) || null;
  }

  async updateVehicle(id, patch) {
    const v = this.vehicles.find((x) => x.id === Number(id));
    if (!v) return null;
    Object.assign(v, patch);
    v.ultima_actividad = new Date().toISOString();
    return { ...v };
  }

  async listDrivers() {
    return this.drivers.map((d) => ({
      ...d,
      vehiculo: this.vehicles.find((v) => v.conductor_id === d.id) || null
    }));
  }

  async getDriver(id) {
    return this.drivers.find((d) => d.id === Number(id)) || null;
  }

  async listEvents(filter = {}) {
    let rows = [...this.events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (filter.tipo) rows = rows.filter((e) => e.tipo === filter.tipo);
    if (filter.riesgo) rows = rows.filter((e) => e.riesgo === filter.riesgo);
    if (filter.vehiculo_id) rows = rows.filter((e) => e.vehiculo_id === Number(filter.vehiculo_id));
    if (filter.desde) rows = rows.filter((e) => new Date(e.timestamp) >= new Date(filter.desde));
    if (filter.hasta) rows = rows.filter((e) => new Date(e.timestamp) <= new Date(filter.hasta));
    if (!filter.solo_anomalias || filter.solo_anomalias !== 'true') return rows;
    return rows.filter((e) => e.riesgo !== 'BAJO');
  }

  async getEvent(id) {
    return this.events.find((e) => e.id === Number(id)) || null;
  }

  async createEvent(evt) {
    const vehicle = evt.vehiculo_id ? this.vehicles.find((v) => v.id === Number(evt.vehiculo_id)) : null;
    const row = {
      id: this.next('event'),
      atendido: false,
      atendido_por: null,
      vehiculo_codigo: vehicle?.codigo || null,
      conductor_nombre: vehicle?.conductor_nombre || null,
      ruta: vehicle?.ruta || null,
      ...evt,
      timestamp: evt.timestamp || new Date().toISOString()
    };
    this.events.unshift(row);
    return { ...row };
  }

  async updateEvent(id, patch) {
    const e = this.events.find((x) => x.id === Number(id));
    if (!e) return null;
    Object.assign(e, patch);
    return { ...e };
  }

  async listActiveAlerts() {
    return this.alerts.filter((a) => a.estado === 'ACTIVA').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async getActiveAlertByVehicle(vehiculoId) {
    return this.alerts.find((a) => a.vehiculo_id === Number(vehiculoId) && a.estado === 'ACTIVA') || null;
  }

  async countActiveAlerts() {
    return this.alerts.filter((a) => a.estado === 'ACTIVA').length;
  }

  async listAlerts(filter = {}) {
    let rows = [...this.alerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (filter.estado) rows = rows.filter((a) => a.estado === filter.estado);
    return rows;
  }

  async getAlert(id) {
    return this.alerts.find((a) => a.id === Number(id)) || null;
  }

  async createAlert(al) {
    const vehicle = al.vehiculo_id ? this.vehicles.find((v) => v.id === Number(al.vehiculo_id)) : null;
    const row = {
      id: this.next('alert'),
      estado: 'ACTIVA',
      accion: null,
      accion_meta: null,
      vehiculo_codigo: vehicle?.codigo || null,
      conductor_nombre: vehicle?.conductor_nombre || null,
      ruta: vehicle?.ruta || null,
      ...al,
      timestamp: al.timestamp || new Date().toISOString()
    };
    this.alerts.unshift(row);
    return { ...row };
  }

  async updateAlert(id, patch) {
    const a = this.alerts.find((x) => x.id === Number(id));
    if (!a) return null;
    Object.assign(a, patch);
    return { ...a };
  }

  async upsertTelemetry(vehiculoId, data) {
    let t = this.telemetry.find((x) => x.vehiculo_id === Number(vehiculoId));
    if (!t) {
      t = { vehiculo_id: Number(vehiculoId), imei: data.imei || 'N/D', ultimo_heartbeat: null };
      this.telemetry.push(t);
    }
    Object.assign(t, data, { ultimo_heartbeat: new Date().toISOString() });
    return { ...t };
  }

  async getTelemetry(vehiculoId) {
    return this.telemetry.find((t) => t.vehiculo_id === Number(vehiculoId)) || null;
  }

  async getConfig() {
    return { ...this.config };
  }

  async updateConfig(patch) {
    Object.assign(this.config, patch);
    return { ...this.config };
  }

  async listSafeZones() {
    return [...this.safezones];
  }

  async getKeyConfig() {
    return this.config;
  }
}

class MySqlStore {
  constructor(pool) {
    this.pool = pool;
  }

  async q(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (err) {
      try {
        await this.pool.execute(
          'INSERT INTO system_logs (nivel, origen_ip, mensaje) VALUES ("ERROR", NULL, ?)',
          [String(err && err.message ? err.message : 'Error de conexión a la base de datos').slice(0, 512)]
        );
      } catch (_logErr) {
        console.warn('[storage] No se pudo registrar el error de BD en system_logs:', _logErr.message);
      }
      throw err;
    }
  }

  row(rows) {
    return rows[0] || null;
  }

  async ping() {
    const t0 = Date.now();
    await this.q('SELECT 1');
    return { ok: true, latencia_ms: Date.now() - t0 };
  }

  async writeLog(entry) {
    const [res] = await this.pool.execute(
      'INSERT INTO system_logs (nivel, origen_ip, mensaje) VALUES (?, ?, ?)',
      [entry.nivel || 'INFO', entry.origen_ip || null, String(entry.mensaje || '').slice(0, 512)]
    );
    return { id: res.insertId, fecha_hora: new Date().toISOString(), nivel: entry.nivel || 'INFO', origen_ip: entry.origen_ip || null, mensaje: String(entry.mensaje || '').slice(0, 512) };
  }

  async listSystemLogs(limit = 100) {
    const n = Math.min(Math.max(Number(limit) || 100, 1), 1000);
    const rows = await this.q('SELECT id, fecha_hora, nivel, origen_ip, mensaje FROM system_logs ORDER BY id DESC LIMIT ?', [n]);
    return rows;
  }

  async findUserByEmail(email) {
    const rows = await this.q('SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ? LIMIT 1', [email]);
    return this.row(rows);
  }

  async getUserById(id) {
    const rows = await this.q('SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE id = ? LIMIT 1', [id]);
    return this.row(rows);
  }

  vehicleShape(v) {
    if (!v) return null;
    return {
      id: v.id,
      codigo: v.codigo,
      nombre: v.nombre,
      placa: v.placa,
      tipo: v.tipo,
      modelo: v.modelo,
      conductor_id: v.conductor_id,
      conductor_nombre: v.conductor_nombre,
      ruta: v.ruta,
      estado: v.estado,
      riesgo: v.riesgo,
      lat: Number(v.lat),
      lng: Number(v.lng),
      velocidad: Number(v.velocidad),
      bateria: Number(v.bateria),
      imei: v.imei,
      ultima_actividad: v.ultima_actividad
    };
  }

  async listVehicles() {
    const rows = await this.q('SELECT v.*, d.nombre AS conductor_nombre FROM vehiculos v LEFT JOIN conductores d ON d.id = v.conductor_id ORDER BY v.codigo');
    return rows.map((r) => this.vehicleShape(r));
  }

  async getVehicle(id) {
    const rows = await this.q('SELECT v.*, d.nombre AS conductor_nombre FROM vehiculos v LEFT JOIN conductores d ON d.id = v.conductor_id WHERE v.id = ? LIMIT 1', [id]);
    return this.vehicleShape(this.row(rows));
  }

  async getVehicleByCode(code) {
    const rows = await this.q('SELECT v.*, d.nombre AS conductor_nombre FROM vehiculos v LEFT JOIN conductores d ON d.id = v.conductor_id WHERE v.codigo = ? LIMIT 1', [code]);
    return this.vehicleShape(this.row(rows));
  }

  async updateVehicle(id, patch) {
    const allowed = ['estado', 'riesgo', 'lat', 'lng', 'velocidad', 'bateria', 'conductor_id'];
    const keys = Object.keys(patch).filter((k) => allowed.includes(k));
    if (!keys.length) return this.getVehicle(id);
    const vals = keys.map((k) => patch[k]);
    vals.push(id);
    await this.q(
      `UPDATE vehiculos SET ${keys.map((k) => `${k} = ?`).join(', ')}, ultima_actividad = NOW() WHERE id = ?`,
      vals
    );
    return this.getVehicle(id);
  }

  async listDrivers() {
    const rows = await this.q(
      'SELECT d.*, v.id AS vehiculo_id, v.codigo AS vehiculo_codigo, v.riesgo AS vehiculo_riesgo FROM conductores d LEFT JOIN vehiculos v ON v.conductor_id = d.id ORDER BY d.nombre'
    );
    return rows.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      documento: d.documento,
      telefono: d.telefono,
      licencia: d.licencia,
      empresa: d.empresa,
      jornada_horas: Number(d.jornada_horas),
      ultimo_descanso: d.ultimo_descanso,
      kilometros: Number(d.kilometros),
      fatiga_actual: Number(d.fatiga_actual),
      viajes: Number(d.viajes),
      riesgo: d.fatiga_actual >= 80 ? 'CRITICO' : d.fatiga_actual >= 50 ? 'MEDIO' : 'BAJO',
      vehiculo: d.vehiculo_id ? { id: d.vehiculo_id, codigo: d.vehiculo_codigo, riesgo: d.vehiculo_riesgo } : null
    }));
  }

  async getDriver(id) {
    const rows = await this.q('SELECT * FROM conductores WHERE id = ? LIMIT 1', [id]);
    return this.row(rows);
  }

  async listEvents(filter = {}) {
    const cond = [];
    const params = [];
    if (filter.tipo) {
      cond.push('tipo = ?');
      params.push(filter.tipo);
    }
    if (filter.riesgo) {
      cond.push('riesgo = ?');
      params.push(filter.riesgo);
    }
    if (filter.vehiculo_id) {
      cond.push('vehiculo_id = ?');
      params.push(Number(filter.vehiculo_id));
    }
    if (filter.desde) {
      cond.push('timestamp >= ?');
      params.push(filter.desde);
    }
    if (filter.hasta) {
      cond.push('timestamp <= ?');
      params.push(filter.hasta);
    }
    if (filter.solo_anomalias === 'true') cond.push('riesgo <> "BAJO"');
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const rows = await this.q(`SELECT e.*, v.codigo AS vehiculo_codigo, v.ruta, d.nombre AS conductor_nombre FROM eventos e LEFT JOIN vehiculos v ON v.id = e.vehiculo_id LEFT JOIN conductores d ON d.id = v.conductor_id ${where} ORDER BY e.timestamp DESC`, params);
    return rows.map((r) => ({ ...r, lat: Number(r.lat), lng: Number(r.lng), velocidad: Number(r.velocidad), respuesta_ms: Number(r.respuesta_ms || 0) }));
  }

  async getEvent(id) {
    const rows = await this.q(
      'SELECT e.*, v.codigo AS vehiculo_codigo, v.ruta, d.nombre AS conductor_nombre FROM eventos e LEFT JOIN vehiculos v ON v.id = e.vehiculo_id LEFT JOIN conductores d ON d.id = v.conductor_id WHERE e.id = ? LIMIT 1',
      [id]
    );
    const r = this.row(rows);
    return r
      ? { ...r, lat: Number(r.lat), lng: Number(r.lng), velocidad: Number(r.velocidad), respuesta_ms: Number(r.respuesta_ms || 0) }
      : null;
  }

  async createEvent(evt) {
    const cols = ['tipo', 'riesgo', 'canal', 'vehiculo_id', 'lat', 'lng', 'velocidad', 'descripcion', 'respuesta_ms', 'timestamp'];
    const vals = cols.map((c) => evt[c]);
    await this.q(
      `INSERT INTO eventos (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals.map((v) => (v === undefined ? null : v))
    );
    const [ins] = await this.q('SELECT LAST_INSERT_ID() AS id');
    return this.getEvent(ins.id);
  }

  async updateEvent(id, patch) {
    const allowed = ['atendido', 'atendido_por'];
    const keys = Object.keys(patch).filter((k) => allowed.includes(k) && patch[k] !== undefined);
    if (keys.length) {
      await this.q(`UPDATE eventos SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => patch[k]), Number(id)]);
    }
    return this.getEvent(id);
  }

  async listActiveAlerts() {
    const rows = await this.q('SELECT * FROM alertas WHERE estado = "ACTIVA" ORDER BY timestamp DESC');
    return rows.map((r) => ({ ...r, lat: Number(r.lat), lng: Number(r.lng), velocidad: Number(r.velocidad) }));
  }

  async getActiveAlertByVehicle(vehiculoId) {
    const rows = await this.q('SELECT * FROM alertas WHERE vehiculo_id = ? AND estado = "ACTIVA" ORDER BY timestamp DESC LIMIT 1', [Number(vehiculoId)]);
    const r = this.row(rows);
    return r ? { ...r, lat: Number(r.lat), lng: Number(r.lng), velocidad: Number(r.velocidad) } : null;
  }

  async countActiveAlerts() {
    const rows = await this.q('SELECT COUNT(*) AS n FROM alertas WHERE estado = "ACTIVA"');
    return Number(rows[0].n);
  }

  async listAlerts(filter = {}) {
    const rows = await this.q('SELECT * FROM alertas ORDER BY timestamp DESC', []);
    let out = rows.map((r) => ({ ...r, lat: Number(r.lat), lng: Number(r.lng), velocidad: Number(r.velocidad) }));
    if (filter.estado) out = out.filter((a) => a.estado === filter.estado);
    return out;
  }

  async getAlert(id) {
    const rows = await this.q('SELECT * FROM alertas WHERE id = ? LIMIT 1', [id]);
    const r = this.row(rows);
    return r ? { ...r, lat: Number(r.lat), lng: Number(r.lng), velocidad: Number(r.velocidad) } : null;
  }

  async createAlert(al) {
    await this.q(
      'INSERT INTO alertas (tipo, evento_id, vehiculo_id, riesgo, lat, lng, velocidad, descripcion, estado, iniciada_por, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "ACTIVA", ?, ?)',
      [al.tipo, al.evento_id || null, al.vehiculo_id, al.riesgo, al.lat, al.lng, al.velocidad || 0, al.descripcion || '', al.iniciada_por || 'AUTO', al.timestamp || new Date().toISOString()]
    );
    const [ins] = await this.q('SELECT LAST_INSERT_ID() AS id');
    return this.getAlert(ins.id);
  }

  async updateAlert(id, patch) {
    const allowed = ['estado', 'accion', 'accion_meta'];
    const keys = Object.keys(patch).filter((k) => allowed.includes(k) && patch[k] !== undefined);
    if (keys.length) {
      await this.q(`UPDATE alertas SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => patch[k]), Number(id)]);
    }
    return this.getAlert(id);
  }

  async upsertTelemetry(vehiculoId, data) {
    await this.q(
      'INSERT INTO telemetria (vehiculo_id, imei, bateria, senal_gps, fps, latencia_ms, ultimo_heartbeat) VALUES (?, ?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE bateria = VALUES(bateria), senal_gps = VALUES(senal_gps), fps = VALUES(fps), latencia_ms = VALUES(latencia_ms), ultimo_heartbeat = NOW()',
      [Number(vehiculoId), data.imei || 'N/D', data.bateria ?? 100, data.senal_gps ?? 10, data.fps ?? 12, data.latencia_ms ?? 40]
    );
    const rows = await this.q('SELECT * FROM telemetria WHERE vehiculo_id = ? LIMIT 1', [Number(vehiculoId)]);
    return this.row(rows);
  }

  async getTelemetry(vehiculoId) {
    const rows = await this.q('SELECT * FROM telemetria WHERE vehiculo_id = ? LIMIT 1', [Number(vehiculoId)]);
    return this.row(rows);
  }

  async getConfig() {
    const rows = await this.q('SELECT * FROM configuracion LIMIT 1');
    return this.row(rows) || null;
  }

  async getKeyConfig() {
    const rows = await this.q('SELECT alerta_sonora, alerta_vibracion, alerta_visual, numero_emergencia, sensibilidad, umbral_amarillo, umbral_rojo, auto_sos, solicitar_pausa FROM configuracion LIMIT 1');
    return this.row(rows) || null;
  }

  async updateConfig(patch) {
    const allowed = ['alerta_sonora', 'alerta_vibracion', 'alerta_visual', 'numero_emergencia', 'sensibilidad', 'tiempo_ojos_cerrados_ms', 'umbral_amarillo', 'umbral_rojo', 'auto_sos', 'solicitar_pausa'];
    const keys = Object.keys(patch).filter((k) => allowed.includes(k) && patch[k] !== undefined);
    if (keys.length) {
      await this.q(
        `UPDATE configuracion SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = 1`,
        keys.map((k) => (typeof patch[k] === 'boolean' ? patch[k] ? 1 : 0 : patch[k]))
      );
    }
    return this.getConfig();
  }

  async listSafeZones() {
    const rows = await this.q('SELECT * FROM zonas_seguras ORDER BY nombre');
    return rows.map((r) => ({ ...r, lat: Number(r.lat), lng: Number(r.lng) }));
  }
}

async function createStore() {
  const memory = require('./seed').buildStore();
  if (process.env.MYSQL_URL) {
    try {
      const pool = mysql.createPool(process.env.MYSQL_URL);
      await pool.query('SELECT 1');
      console.log('[storage] Conectado a MySQL. Modo persistente.');
      const store = new MySqlStore(pool);
      store.motor = 'mysql';
      return store;
    } catch (err) {
      memory.fallbackReason = err.message;
      console.warn('[storage] No se pudo conectar a MySQL, usando almacenamiento en memoria.', err.message);
    }
  }
  const store = new MemoryStore(memory);
  store.motor = 'memory';
  store.fallbackReason = memory.fallbackReason || null;
  return store;
}

module.exports = { createStore, riskRank, RIS };