-- --------------------------------------------------------
-- Migración: Encaminhamento para Especialista
--
-- Crea las tablas `specialist_catalog`, `encaminhamentos`,
-- `encaminhamento_specialists` y `encaminhamento_counter`.
-- Sigue el mismo patrón que `medication_catalog`/`recetas` y
-- `exams`/`orders`/`order_exams` (catálogo + pivot many-to-many).
--
-- Ejecutar una vez en la base de producción (phpMyAdmin o consola).
-- Es idempotente: se puede correr de nuevo sin duplicar datos.
--
-- IMPORTANTE: si se corre por consola, usar charset utf8mb4 para no
-- corromper los acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_encaminhamentos.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Tabla: specialist_catalog  (especialistas para Encaminhamentos)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS specialist_catalog (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  created_by CHAR(36)     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_specialist_catalog_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO specialist_catalog (id, name) VALUES
  ('spec-neuropsicopedagoga', 'Neuropsicopedagoga'),
  ('spec-neuropsicologa',     'Neuropsicóloga'),
  ('spec-terapia-aba',        'Especialista em Terapia ABA'),
  ('spec-psicologa-tcc',      'Psicóloga TCC'),
  ('spec-psicologa',          'Psicóloga');

-- --------------------------------------------------------
-- Tabla: encaminhamentos
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS encaminhamentos (
  id           VARCHAR(30)  NOT NULL PRIMARY KEY,
  patient_id   CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  date         DATE         NULL,
  patient_age  VARCHAR(20)  NULL,
  hd           TEXT         NULL,
  motivo       TEXT         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_encaminhamentos_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_encaminhamentos_user    FOREIGN KEY (user_id)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: encaminhamento_specialists  (pivot)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS encaminhamento_specialists (
  encaminhamento_id VARCHAR(30) NOT NULL,
  specialist_id     VARCHAR(64) NOT NULL,
  PRIMARY KEY (encaminhamento_id, specialist_id),
  CONSTRAINT fk_es_encaminhamento FOREIGN KEY (encaminhamento_id) REFERENCES encaminhamentos(id) ON DELETE CASCADE,
  CONSTRAINT fk_es_specialist     FOREIGN KEY (specialist_id)     REFERENCES specialist_catalog(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: encaminhamento_counter  (IDs secuenciales sin race condition)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS encaminhamento_counter (
  year INT  NOT NULL PRIMARY KEY,
  seq  INT  NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
