-- --------------------------------------------------------
-- Migración: Atestado Médico
--
-- Crea las tablas `atestados` y `atestado_counter`.
-- Sigue el mismo patrón que `encaminhamentos` (tabla + counter
-- para IDs secuenciales sin race condition).
--
-- Ejecutar una vez en la base de producción (phpMyAdmin o consola).
-- Es idempotente: se puede correr de nuevo sin duplicar datos.
--
-- IMPORTANTE: si se corre por consola, usar charset utf8mb4 para no
-- corromper los acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_atestados.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Tabla: atestados
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS atestados (
  id                      VARCHAR(30)   NOT NULL PRIMARY KEY,
  patient_id              CHAR(36)      NOT NULL,
  user_id                 CHAR(36)      NOT NULL,
  patient_birth_date      VARCHAR(40)   NULL,
  patient_address         TEXT          NULL,
  issued_at               VARCHAR(40)   NULL,
  token                   VARCHAR(64)   NULL,
  access_code             VARCHAR(64)   NULL,
  validation_url          VARCHAR(255)  NULL,
  qr_content              TEXT          NULL,
  cid                     VARCHAR(20)   NULL,
  care_start_time         VARCHAR(20)   NULL,
  care_end_time           VARCHAR(20)   NULL,
  care_date               VARCHAR(30)   NULL,
  rest_days               VARCHAR(10)   NULL,
  observation             TEXT          NULL,
  doctor_name             VARCHAR(255)  NULL,
  doctor_crm              VARCHAR(100)  NULL,
  doctor_address          TEXT          NULL,
  clinic_name             VARCHAR(255)  NULL,
  clinic_secretaria       VARCHAR(255)  NULL,
  clinic_sistema          VARCHAR(255)  NULL,
  clinic_address          VARCHAR(255)  NULL,
  clinic_phone            VARCHAR(100)  NULL,
  clinic_cnpj             VARCHAR(100)  NULL,
  signed_at               VARCHAR(40)   NULL,
  digital_prescription_url VARCHAR(255) NULL,
  created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_atestados_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_atestados_user    FOREIGN KEY (user_id)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: atestado_counter  (IDs secuenciales sin race condition)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS atestado_counter (
  year INT  NOT NULL PRIMARY KEY,
  seq  INT  NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
