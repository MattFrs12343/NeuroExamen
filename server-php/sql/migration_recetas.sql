-- --------------------------------------------------------
-- Migración: Recetas médicas (prescripciones)
--
-- Crea las tablas `medication_catalog`, `recetas` y `receta_counter`.
-- Sigue el mismo patrón que `custom_exams` / `orders` / `order_counter`.
--
-- Ejecutar una vez en la base de producción (phpMyAdmin o consola).
-- Es idempotente: se puede correr de nuevo sin duplicar datos.
--
-- IMPORTANTE: si se corre por consola, usar charset utf8mb4 para no
-- corromper los acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_recetas.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Tabla: medication_catalog  (medicamentos frecuentes sugeridos)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS medication_catalog (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  created_by CHAR(36)     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_medication_catalog_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: recetas
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS recetas (
  id               VARCHAR(30)  NOT NULL PRIMARY KEY,
  patient_id       CHAR(36)     NOT NULL,
  user_id          CHAR(36)     NOT NULL,
  date             DATE         NULL,
  clinic_name      VARCHAR(255) NULL,
  clinic_secretaria VARCHAR(255) NULL,
  clinic_sistema   VARCHAR(255) NULL,
  clinic_address   VARCHAR(255) NULL,
  clinic_phone     VARCHAR(100) NULL,
  clinic_cnpj      VARCHAR(100) NULL,
  via1             TINYINT(1)   NOT NULL DEFAULT 0,
  via2             TINYINT(1)   NOT NULL DEFAULT 0,
  patient_address  VARCHAR(255) NULL,
  ident_nome       VARCHAR(255) NULL,
  ident_doc        VARCHAR(100) NULL,
  ident_address    VARCHAR(255) NULL,
  patient_org_emissor VARCHAR(100) NULL,
  patient_city     VARCHAR(100) NULL,
  patient_uf       VARCHAR(10)  NULL,
  observations     TEXT         NULL,
  medications      JSON         NOT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recetas_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_recetas_user    FOREIGN KEY (user_id)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: receta_counter  (IDs secuenciales sin race condition)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS receta_counter (
  year INT  NOT NULL PRIMARY KEY,
  seq  INT  NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
