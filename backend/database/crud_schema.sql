-- Esquema CRUD solicitado para SmartRoad S.O.S.
CREATE DATABASE IF NOT EXISTS smartroad_sos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartroad_sos;

CREATE TABLE IF NOT EXISTS conductor (
  id_conductor INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  documento VARCHAR(50) NOT NULL UNIQUE,
  telefono VARCHAR(20) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vehiculo (
  id_vehiculo INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(20) NOT NULL UNIQUE,
  tipo VARCHAR(50) NOT NULL,
  id_conductor INT NOT NULL,
  CONSTRAINT fk_vehiculo_conductor FOREIGN KEY (id_conductor)
    REFERENCES conductor(id_conductor) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dispositivo (
  id_dispositivo INT AUTO_INCREMENT PRIMARY KEY,
  tipo_sensor VARCHAR(50) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  id_vehiculo INT NOT NULL UNIQUE,
  CONSTRAINT fk_dispositivo_vehiculo FOREIGN KEY (id_vehiculo)
    REFERENCES vehiculo(id_vehiculo) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evento (
  id_evento INT AUTO_INCREMENT PRIMARY KEY,
  tipo_evento VARCHAR(50) NOT NULL,
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  nivel_riesgo VARCHAR(20) NOT NULL,
  id_dispositivo INT NOT NULL,
  CONSTRAINT fk_evento_dispositivo FOREIGN KEY (id_dispositivo)
    REFERENCES dispositivo(id_dispositivo) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alerta (
  id_alerta INT AUTO_INCREMENT PRIMARY KEY,
  tipo_alerta VARCHAR(50) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  id_evento INT NOT NULL,
  CONSTRAINT fk_alerta_evento FOREIGN KEY (id_evento)
    REFERENCES evento(id_evento) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
