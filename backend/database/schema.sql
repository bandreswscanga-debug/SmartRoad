SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS smartroad_sos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartroad_sos;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin','conductor') NOT NULL DEFAULT 'conductor',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conductores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  documento VARCHAR(30) NOT NULL UNIQUE,
  telefono VARCHAR(30),
  licencia VARCHAR(10),
  empresa VARCHAR(120),
  jornada_horas DECIMAL(4,2) DEFAULT 0,
  ultimo_descanso VARCHAR(10),
  kilometros INT DEFAULT 0,
  fatiga_actual INT DEFAULT 0,
  viajes INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(80),
  placa VARCHAR(12) NOT NULL,
  tipo VARCHAR(50),
  modelo INT,
  conductor_id INT,
  ruta VARCHAR(80),
  estado ENUM('MOVIENDO','DETENIDO','INACTIVO') NOT NULL DEFAULT 'DETENIDO',
  riesgo ENUM('BAJO','MEDIO','CRITICO') NOT NULL DEFAULT 'BAJO',
  lat DECIMAL(10,6) DEFAULT 4.6097,
  lng DECIMAL(10,6) DEFAULT -74.0817,
  velocidad INT DEFAULT 0,
  bateria DECIMAL(5,1) DEFAULT 100,
  imei VARCHAR(40),
  ultima_actividad TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conductor_id) REFERENCES conductores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS telemetria (
  vehiculo_id INT PRIMARY KEY,
  imei VARCHAR(40),
  bateria DECIMAL(5,1) DEFAULT 100,
  senal_gps INT DEFAULT 10,
  fps INT DEFAULT 12,
  latencia_ms INT DEFAULT 40,
  ultimo_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('MICRO_SUENO','SOMNOLENCIA_ALTA','FATIGA_PROLONGADA','DISTRACCION','SOS','ACCIDENTE') NOT NULL,
  riesgo ENUM('BAJO','MEDIO','CRITICO') NOT NULL DEFAULT 'MEDIO',
  canal ENUM('CAMARA','SENSOR') DEFAULT 'CAMARA',
  vehiculo_id INT,
  lat DECIMAL(10,6),
  lng DECIMAL(10,6),
  velocidad INT,
  descripcion VARCHAR(255),
  respuesta_ms INT,
  atendido TINYINT(1) NOT NULL DEFAULT 0,
  atendido_por VARCHAR(120),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  evento_id INT,
  vehiculo_id INT,
  riesgo ENUM('BAJO','MEDIO','CRITICO') NOT NULL DEFAULT 'CRITICO',
  lat DECIMAL(10,6),
  lng DECIMAL(10,6),
  velocidad INT,
  descripcion VARCHAR(255),
  estado ENUM('ACTIVA','GESTIONADA','EMERGENCIA') NOT NULL DEFAULT 'ACTIVA',
  accion VARCHAR(30),
  accion_meta VARCHAR(255),
  iniciada_por ENUM('AUTO','MANUAL') DEFAULT 'AUTO',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE SET NULL,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS zonas_seguras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  tipo ENUM('PARQUEADERO_SEGURO','ZONA_URBANA','HOSPITAL') DEFAULT 'PARQUEADERO_SEGURO',
  lat DECIMAL(10,6) NOT NULL,
  lng DECIMAL(10,6) NOT NULL
);

CREATE TABLE IF NOT EXISTS configuracion (
  id INT PRIMARY KEY DEFAULT 1,
  alerta_sonora TINYINT(1) DEFAULT 1,
  alerta_vibracion TINYINT(1) DEFAULT 1,
  alerta_visual TINYINT(1) DEFAULT 0,
  numero_emergencia VARCHAR(20) DEFAULT '123',
  sensibilidad INT DEFAULT 70,
  tiempo_ojos_cerrados_ms INT DEFAULT 1600,
  umbral_amarillo INT DEFAULT 50,
  umbral_rojo INT DEFAULT 80,
  auto_sos TINYINT(1) DEFAULT 1,
  solicitar_pausa TINYINT(1) DEFAULT 1
);

INSERT INTO configuracion (id) VALUES (1) ON DUPLICATE KEY UPDATE id = 1;

CREATE TABLE IF NOT EXISTS system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nivel ENUM('INFO','WARNING','ERROR') NOT NULL DEFAULT 'INFO',
  origen_ip VARCHAR(45),
  mensaje VARCHAR(512) NOT NULL
);

CREATE INDEX idx_eventos_timestamp ON eventos(timestamp);
CREATE INDEX idx_eventos_riesgo ON eventos(riesgo);
CREATE INDEX idx_alertas_estado ON alertas(estado);
CREATE INDEX idx_vehiculos_estado ON vehiculos(estado);