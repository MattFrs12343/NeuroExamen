-- --------------------------------------------------------
-- Migración: Teléfono del paciente en los 5 módulos de documentos
--
-- Agrega patient_phone a orders, recetas, encaminhamentos, atestados y
-- formula_leite — sigue el mismo patrón "snapshot por documento" que ya
-- usan patient_address/patient_cpf/patient_age en vez de vivir en la tabla
-- `patients` (el usuario lo pidió explícitamente así: cada sección "Dados
-- do Paciente" tiene su propio campo editable, para una futura acción de
-- WhatsApp por documento).
--
-- Idempotente: verifica cada columna antes de agregarla, se puede correr
-- más de una vez sin errores.
--
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_patient_phone.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @db = DATABASE();

-- orders.patient_phone
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'orders' AND column_name = 'patient_phone') = 0,
  'ALTER TABLE orders ADD COLUMN patient_phone VARCHAR(30) NULL AFTER code_cid',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- recetas.patient_phone
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'recetas' AND column_name = 'patient_phone') = 0,
  'ALTER TABLE recetas ADD COLUMN patient_phone VARCHAR(30) NULL AFTER patient_cpf',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- encaminhamentos.patient_phone
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'encaminhamentos' AND column_name = 'patient_phone') = 0,
  'ALTER TABLE encaminhamentos ADD COLUMN patient_phone VARCHAR(30) NULL AFTER patient_age',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- atestados.patient_phone
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'atestados' AND column_name = 'patient_phone') = 0,
  'ALTER TABLE atestados ADD COLUMN patient_phone VARCHAR(30) NULL AFTER patient_address',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- formula_leite.patient_phone
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'formula_leite' AND column_name = 'patient_phone') = 0,
  'ALTER TABLE formula_leite ADD COLUMN patient_phone VARCHAR(30) NULL AFTER patient_cns',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
