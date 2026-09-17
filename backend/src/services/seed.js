const bcrypt = require('bcryptjs');

const nowIso = () => new Date().toISOString();
const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

function buildStore() {
  const state = {
    users: [],
    vehicles: [],
    drivers: [],
    events: [],
    alerts: [],
    telemetry: [],
    config: {
      alerta_sonora: true,
      alerta_vibracion: true,
      alerta_visual: false,
      numero_emergencia: '123',
      sensibilidad: 70,
      tiempo_ojos_cerrados_ms: 1600,
      umbral_amarillo: 50,
      umbral_rojo: 80,
      auto_sos: true,
      solicitar_pausa: true
    },
    safezones: [],
    logs: []
  };

  let seq = { user: 0, vehicle: 0, driver: 0, event: 0, alert: 0 };

  const masterPassword = bcrypt.hashSync('Admin123', 10);
  const userPassword = bcrypt.hashSync('Conductor123', 10);

  state.users.push(
    { id: ++seq.user, nombre: 'Administrador Demo', email: 'admin@smartroad-demo.com', password_hash: masterPassword, rol: 'admin', activo: 1, creado: hoursAgo(240) },
    { id: ++seq.user, nombre: 'Juan Pérez', email: 'juan@smartroad-demo.com', password_hash: userPassword, rol: 'conductor', activo: 1, creado: hoursAgo(240) }
  );

  state.drivers.push(
    { id: ++seq.driver, nombre: 'Juan Pérez', documento: '79.123.456', telefono: '+57 311 000 1122', licencia: 'C3', empresa: 'Transportes Ruta 45', jornada_horas: 7.5, ultimo_descanso: '02:40', kilometros: 412, fatiga_actual: 38, viajes: 6, riesgo: 'BAJO' },
    { id: ++seq.driver, nombre: 'Lucía Gómez', documento: '1.024.567.890', telefono: '+57 315 000 3344', licencia: 'C1', empresa: 'Transportes Ruta 45', jornada_horas: 5.0, ultimo_descanso: '05:10', kilometros: 268, fatiga_actual: 22, viajes: 4, riesgo: 'BAJO' },
    { id: ++seq.driver, nombre: 'Carlos Ruiz', documento: '79.900.123', telefono: '+57 300 000 5566', licencia: 'C3', empresa: 'Flota Andina', jornada_horas: 6.2, ultimo_descanso: '03:55', kilometros: 310, fatiga_actual: 45, viajes: 5, riesgo: 'MEDIO' },
    { id: ++seq.driver, nombre: 'Ana Torres', documento: '1.098.765.432', telefono: '+57 320 000 7788', licencia: 'C3', empresa: 'Transportes Ruta 45', jornada_horas: 11.4, ultimo_descanso: '07:20', kilometros: 655, fatiga_actual: 86, viajes: 3, riesgo: 'CRITICO' }
  );

  const veh = [
    { codigo: 'TRK-001', nombre: 'Double Troque', placa: 'SRD-001', tipo: 'Carga pesada', modelo: 2022, conductor_id: 1, ruta: 'Ruta 45', base_lat: 4.7031, base_lng: -74.1292 },
    { codigo: 'TRK-002', nombre: 'Camión Sencillo', placa: 'SRD-002', tipo: 'Carga media', modelo: 2021, conductor_id: 2, ruta: 'Ruta 25', base_lat: 4.6611, base_lng: -74.0923 },
    { codigo: 'VAN-007', nombre: 'Van Distribución', placa: 'SRD-007', tipo: 'Utilitario', modelo: 2023, conductor_id: 3, ruta: 'Ruta 80', base_lat: 4.6881, base_lng: -74.0651 },
    { codigo: 'TRK-004', nombre: 'Tractocamión', placa: 'SRD-004', tipo: 'Carga pesada', modelo: 2020, conductor_id: 4, ruta: 'Ruta 45', base_lat: 4.7162, base_lng: -74.0783 }
  ];

  const riskByVehicle = { 1: 'BAJO', 2: 'BAJO', 3: 'MEDIO', 4: 'CRITICO' };
  const stateByVehicle = { 1: 'MOVIENDO', 2: 'MOVIENDO', 3: 'DETENIDO', 4: 'MOVIENDO' };

  veh.forEach((v, idx) => {
    const vid = idx + 1;
    state.vehicles.push({
      id: vid,
      codigo: v.codigo,
      nombre: v.nombre,
      placa: v.placa,
      tipo: v.tipo,
      modelo: v.modelo,
      conductor_id: v.conductor_id,
      conductor_nombre: state.drivers.find((d) => d.id === v.conductor_id).nombre,
      ruta: v.ruta,
      estado: stateByVehicle[vid] || 'DETENIDO',
      riesgo: riskByVehicle[vid] || 'BAJO',
      lat: v.base_lat,
      lng: v.base_lng,
      velocidad: vid === 4 ? 87 : vid === 3 ? 0 : 92,
      bateria: 100,
      imei: `SRD-${String(1000 + vid)}`,
      ultima_actividad: nowIso()
    });
    state.telemetry.push({
      vehiculo_id: vid,
      imei: `SRD-${String(1000 + vid)}`,
      bateria: 100,
      senal_gps: 11,
      fps: vid === 4 ? 6 : 14,
      latencia_ms: 42,
      ultimo_heartbeat: nowIso()
    });
  });

  const ev = [
    { tipo: 'MICRO_SUENO', riesgo: 'MEDIO', canal: 'CAMARA', vehiculo_id: 1, lat: 4.7001, lng: -74.1277, velocidad: 84, descripcion: 'Cierre de ojos prolongado detectado (1.4 s).', atendido: true, mins: 220, ms: 1850 },
    { tipo: 'FATIGA_PROLONGADA', riesgo: 'MEDIO', canal: 'CAMARA', vehiculo_id: 3, lat: 4.6810, lng: -74.0620, velocidad: 0, descripcion: 'Jornada superior a 6 horas sin pausa programada.', atendido: true, mins: 190, ms: 0 },
    { tipo: 'DISTRACCION', riesgo: 'BAJO', canal: 'CAMARA', vehiculo_id: 2, lat: 4.6602, lng: -74.0911, velocidad: 78, descripcion: 'Desvío de mirada fuera de la vía durante 2 s.', atendido: true, mins: 150, ms: 0 },
    { tipo: 'SOMNOLENCIA_ALTA', riesgo: 'CRITICO', canal: 'CAMARA', vehiculo_id: 4, lat: 4.7120, lng: -74.0790, velocidad: 91, descripcion: 'Inclinación de cabeza con ojos cerrados. Alarma activada.', atendido: true, mins: 120, ms: 1612 },
    { tipo: 'MICRO_SUENO', riesgo: 'MEDIO', canal: 'CAMARA', vehiculo_id: 1, lat: 4.7012, lng: -74.1281, velocidad: 81, descripcion: 'Cierre de ojos prolongado detectado (1.2 s).', atendido: true, mins: 95, ms: 1230 },
    { tipo: 'FATIGA_PROLONGADA', riesgo: 'CRITICO', canal: 'SENSOR', vehiculo_id: 4, lat: 4.7131, lng: -74.0810, velocidad: 89, descripcion: 'Detección de fatiga elevada: PERCLOS 82 %. Se sugiere pausa.', atendido: true, mins: 70, ms: 0 },
    { tipo: 'DISTRACCION', riesgo: 'BAJO', canal: 'CAMARA', vehiculo_id: 3, lat: 4.6833, lng: -74.0608, velocidad: 34, descripcion: 'Uso de celular detectado brevemente.', atendido: true, mins: 45, ms: 0 },
    { tipo: 'SOMNOLENCIA_ALTA', riesgo: 'CRITICO', canal: 'CAMARA', vehiculo_id: 4, lat: 4.7140, lng: -74.0822, velocidad: 88, descripcion: 'Bostezos repetidos e inclinación de cabeza.', atendido: true, mins: 28, ms: 1480 },
    { tipo: 'SOS', riesgo: 'CRITICO', canal: 'SENSOR', vehiculo_id: 4, lat: 4.7152, lng: -74.0801, velocidad: 46, descripcion: 'Señal SOS enviada al centro de control por no reacción a la alarma.', atendido: false, mins: 9, ms: 1950 }
  ];

  ev.forEach((e, i) => {
    const v = state.vehicles.find((x) => x.id === e.vehiculo_id);
    state.events.push({
      id: ++seq.event,
      tipo: e.tipo,
      riesgo: e.riesgo,
      canal: e.canal,
      vehiculo_id: v.id,
      vehiculo_codigo: v.codigo,
      conductor_nombre: v.conductor_nombre,
      ruta: v.ruta,
      lat: e.lat,
      lng: e.lng,
      velocidad: e.velocidad,
      descripcion: e.descripcion,
      respuesta_ms: e.ms,
      atendido: e.atendido,
      atendido_por: e.atendido ? 'Panel web' : null,
      timestamp: minsAgo(e.mins)
    });
  });

  state.alerts.push({
    id: ++seq.alert,
    tipo: 'SOMNOLENCIA_ALTA',
    evento_id: state.events[state.events.length - 1].id,
    vehiculo_id: 4,
    vehiculo_codigo: 'TRK-004',
    conductor_nombre: 'Ana Torres',
    ruta: 'Ruta 45',
    riesgo: 'CRITICO',
    lat: 4.7152,
    lng: -74.0801,
    velocidad: 46,
    descripcion: 'El sistema no detecta reacción del conductor ante la alarma sonora continua. Se requiere intervención urgente.',
    estado: 'ACTIVA',
    accion: null,
    accion_meta: null,
    timestamp: minsAgo(9),
    iniciada_por: 'AUTO'
  });

  state.safezones.push(
    { id: 1, nombre: 'Estación Terpel Km 41', tipo: 'PARQUEADERO_SEGURO', lat: 4.7180, lng: -74.0750 },
    { id: 2, nombre: 'Área de descanso Villeta', tipo: 'PARQUEADERO_SEGURO', lat: 5.0129, lng: -74.4739 },
    { id: 3, nombre: 'C.C. Gran Estación', tipo: 'ZONA_URBANA', lat: 4.6590, lng: -74.0705 },
    { id: 4, nombre: 'Estación de Servicio El Dorado', tipo: 'PARQUEADERO_SEGURO', lat: 4.6908, lng: -74.1400 },
    { id: 5, nombre: 'Paradero La Mesa', tipo: 'PARQUEADERO_SEGURO', lat: 4.6352, lng: -74.4618 }
  );

  return {
    state,
    seq,
    users: state.users,
    vehicles: state.vehicles,
    drivers: state.drivers,
    events: state.events,
    alerts: state.alerts,
    telemetry: state.telemetry,
    safezones: state.safezones,
    logs: state.logs,
    config: state.config
  };
}

module.exports = { buildStore, nowIso };