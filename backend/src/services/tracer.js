const NIVELES = ['INFO', 'WARNING', 'ERROR'];

function clientIp(req) {
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim().slice(0, 45);
  return (req.ip || req.socket?.remoteAddress || 'desconocido').slice(0, 45);
}

function createTracer(store) {
  async function trace(nivel, mensaje, ip) {
    const nivelOk = NIVELES.includes(nivel) ? nivel : 'INFO';
    try {
      return await store.writeLog({ nivel: nivelOk, origen_ip: ip || null, mensaje });
    } catch (err) {
      console.warn('[tracer] No se pudo registrar en system_logs:', err.message);
      return null;
    }
  }

  return {
    trace,
    info: (mensaje, ip) => trace('INFO', mensaje, ip),
    warning: (mensaje, ip) => trace('WARNING', mensaje, ip),
    error: (mensaje, ip) => trace('ERROR', mensaje, ip),
    list: (limit) => store.listSystemLogs(limit),
    clientIp
  };
}

module.exports = { createTracer, clientIp };