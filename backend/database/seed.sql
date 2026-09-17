USE smartroad_sos;

INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES
('Administrador Demo', 'bandreswscanga@hgmail.com', '$2a$10$1n5eZVI1Gw8YochstPImMeD6HvKmHG4wNjRFAEwfuUBKDv.nnEwFe', 'admin', 1),
('Juan Pérez', 'juan@smartroad-demo.com', '$2a$10$oIQOtaBgybv9t5E8H8MR8OpwNAFxfZHJ705HM9sRou.A7t31UE2mC', 'conductor', 1)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

INSERT INTO conductores (id, nombre, documento, telefono, licencia, empresa, jornada_horas, ultimo_descanso, kilometros, fatiga_actual, viajes) VALUES
(1, 'Juan Pérez', '79.123.456', '+57 311 000 1122', 'C3', 'Transportes Ruta 45', 7.5, '02:40', 412, 38, 6),
(2, 'Lucía Gómez', '1.024.567.890', '+57 315 000 3344', 'C1', 'Transportes Ruta 45', 5.0, '05:10', 268, 22, 4),
(3, 'Carlos Ruiz', '79.900.123', '+57 300 000 5566', 'C3', 'Flota Andina', 6.2, '03:55', 310, 45, 5),
(4, 'Ana Torres', '1.098.765.432', '+57 320 000 7788', 'C3', 'Transportes Ruta 45', 11.4, '07:20', 655, 86, 3)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO vehiculos (id, codigo, nombre, placa, tipo, modelo, conductor_id, ruta, estado, riesgo, lat, lng, velocidad, bateria, imei) VALUES
(1, 'TRK-001', 'Double Troque', 'SRD-001', 'Carga pesada', 2022, 1, 'Ruta 45', 'MOVIENDO', 'BAJO', 4.7031, -74.1292, 92, 100, 'SRD-1001'),
(2, 'TRK-002', 'Camión Sencillo', 'SRD-002', 'Carga media', 2021, 2, 'Ruta 25', 'MOVIENDO', 'BAJO', 4.6611, -74.0923, 90, 100, 'SRD-1002'),
(3, 'VAN-007', 'Van Distribución', 'SRD-007', 'Utilitario', 2023, 3, 'Ruta 80', 'DETENIDO', 'MEDIO', 4.6881, -74.0651, 0, 100, 'SRD-1007'),
(4, 'TRK-004', 'Tractocamión', 'SRD-004', 'Carga pesada', 2020, 4, 'Ruta 45', 'MOVIENDO', 'CRITICO', 4.7162, -74.0783, 87, 100, 'SRD-1004')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO telemetria (vehiculo_id, imei, bateria, senal_gps, fps, latencia_ms) VALUES
(1, 'SRD-1001', 100, 11, 14, 42),
(2, 'SRD-1002', 98, 12, 15, 38),
(3, 'SRD-1007', 76, 9, 10, 44),
(4, 'SRD-1004', 64, 10, 6, 51)
ON DUPLICATE KEY UPDATE imei = VALUES(imei);

INSERT INTO eventos (tipo, riesgo, canal, vehiculo_id, lat, lng, velocidad, descripcion, respuesta_ms, atendido, atendido_por, timestamp) VALUES
('MICRO_SUENO', 'MEDIO', 'CAMARA', 1, 4.7001, -74.1277, 84, 'Cierre de ojos prolongado detectado (1.4 s).', 1850, 1, 'Panel web', NOW() - INTERVAL 220 MINUTE),
('FATIGA_PROLONGADA', 'MEDIO', 'CAMARA', 3, 4.6810, -74.0620, 0, 'Jornada superior a 6 horas sin pausa programada.', 0, 1, 'Panel web', NOW() - INTERVAL 190 MINUTE),
('DISTRACCION', 'BAJO', 'CAMARA', 2, 4.6602, -74.0911, 78, 'Desvío de mirada fuera de la vía durante 2 s.', 0, 1, 'Panel web', NOW() - INTERVAL 150 MINUTE),
('SOMNOLENCIA_ALTA', 'CRITICO', 'CAMARA', 4, 4.7120, -74.0790, 91, 'Inclinación de cabeza con ojos cerrados. Alarma activada.', 1612, 1, 'Panel web', NOW() - INTERVAL 120 MINUTE),
('MICRO_SUENO', 'MEDIO', 'CAMARA', 1, 4.7012, -74.1281, 81, 'Cierre de ojos prolongado detectado (1.2 s).', 1230, 1, 'Panel web', NOW() - INTERVAL 95 MINUTE),
('FATIGA_PROLONGADA', 'CRITICO', 'SENSOR', 4, 4.7131, -74.0810, 89, 'Detección de fatiga elevada: PERCLOS 82 %. Se sugiere pausa.', 0, 1, 'Panel web', NOW() - INTERVAL 70 MINUTE),
('DISTRACCION', 'BAJO', 'CAMARA', 3, 4.6833, -74.0608, 34, 'Uso de celular detectado brevemente.', 0, 1, 'Panel web', NOW() - INTERVAL 45 MINUTE),
('SOMNOLENCIA_ALTA', 'CRITICO', 'CAMARA', 4, 4.7140, -74.0822, 88, 'Bostezos repetidos e inclinación de cabeza.', 1480, 1, 'Panel web', NOW() - INTERVAL 28 MINUTE),
('SOS', 'CRITICO', 'SENSOR', 4, 4.7152, -74.0801, 46, 'Señal SOS enviada al centro de control por no reacción a la alarma.', 1950, 0, NULL, NOW() - INTERVAL 9 MINUTE);

INSERT INTO alertas (tipo, evento_id, vehiculo_id, riesgo, lat, lng, velocidad, descripcion, estado, iniciada_por, timestamp) VALUES
('SOMNOLENCIA_ALTA', (SELECT MAX(id) FROM eventos), 4, 'CRITICO', 4.7152, -74.0801, 46, 'El sistema no detecta reacción del conductor ana torres (TRK-004) ante la alarma. Se recomienda intervención inmediata.', 'ACTIVA', 'AUTO', NOW() - INTERVAL 9 MINUTE);

INSERT INTO zonas_seguras (nombre, tipo, lat, lng) VALUES
('Estación Terpel Km 41', 'PARQUEADERO_SEGURO', 4.7180, -74.0750),
('Área de descanso Villeta', 'PARQUEADERO_SEGURO', 5.0129, -74.4739),
('C.C. Gran Estación', 'ZONA_URBANA', 4.6590, -74.0705),
('Estación de Servicio El Dorado', 'PARQUEADERO_SEGURO', 4.6908, -74.1400),
('Paradero La Mesa', 'PARQUEADERO_SEGURO', 4.6352, -74.4618);