CREATE DATABASE IF NOT EXISTS sistema_eventos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sistema_eventos;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(190) NOT NULL UNIQUE,
  password_salt CHAR(32) NOT NULL,
  password_hash CHAR(128) NOT NULL,
  rol ENUM('ADMINISTRADOR','ORGANIZADOR','PARTICIPANTE') NOT NULL DEFAULT 'PARTICIPANTE',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS eventos (
  id_evento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(180) NOT NULL,
  descripcion TEXT NULL,
  fecha_inicio DATETIME NOT NULL,
  capacidad INT UNSIGNED NOT NULL,
  estado ENUM('BORRADOR','PUBLICADO','CANCELADO') NOT NULL DEFAULT 'BORRADOR',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_eventos_capacidad CHECK (capacidad > 0),
  INDEX idx_eventos_estado_fecha (estado, fecha_inicio)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inscripciones (
  id_inscripcion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_evento BIGINT UNSIGNED NOT NULL,
  id_participante BIGINT UNSIGNED NOT NULL,
  estado ENUM('ACTIVA','CANCELADA','LISTA_ESPERA') NOT NULL DEFAULT 'ACTIVA',
  fecha_inscripcion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_cancelacion DATETIME NULL,
  token_qr CHAR(64) NOT NULL,
  evento_activo BIGINT UNSIGNED GENERATED ALWAYS AS
    (CASE WHEN estado IN ('ACTIVA','LISTA_ESPERA') THEN id_evento ELSE NULL END) STORED,
  participante_activo BIGINT UNSIGNED GENERATED ALWAYS AS
    (CASE WHEN estado IN ('ACTIVA','LISTA_ESPERA') THEN id_participante ELSE NULL END) STORED,
  UNIQUE KEY uq_inscripcion_activa (evento_activo, participante_activo),
  UNIQUE KEY uq_token_qr (token_qr),
  CONSTRAINT fk_inscripcion_evento FOREIGN KEY (id_evento) REFERENCES eventos(id_evento),
  CONSTRAINT fk_inscripcion_participante FOREIGN KEY (id_participante) REFERENCES usuarios(id_usuario),
  INDEX idx_evento_estado_fecha (id_evento, estado, fecha_inscripcion),
  INDEX idx_participante_fecha (id_participante, fecha_inscripcion)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS asistencias (
  id_asistencia BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_inscripcion BIGINT UNSIGNED NOT NULL,
  id_evento BIGINT UNSIGNED NOT NULL,
  registrada_por BIGINT UNSIGNED NOT NULL,
  fecha_asistencia TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_asistencia_inscripcion UNIQUE (id_inscripcion),
  CONSTRAINT fk_asistencia_inscripcion FOREIGN KEY (id_inscripcion) REFERENCES inscripciones(id_inscripcion),
  CONSTRAINT fk_asistencia_evento FOREIGN KEY (id_evento) REFERENCES eventos(id_evento),
  CONSTRAINT fk_asistencia_organizador FOREIGN KEY (registrada_por) REFERENCES usuarios(id_usuario),
  INDEX idx_asistencia_evento (id_evento, fecha_asistencia)
) ENGINE=InnoDB;
