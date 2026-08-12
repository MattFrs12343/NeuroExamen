-- --------------------------------------------------------
-- Migración: origen de clínica en pacientes (patients.origin)
--
-- Añade la columna `origin` para poder tener historiales de
-- pacientes independientes por clínica en Encaminhamentos.
--   NULL / 'neuromobius' → pacientes de NEUROMOBIUS (retrocompatible)
--   'neuroisbe'          → pacientes propios de NEUROISBE
--
-- Es idempotente: puede ejecutarse varias veces sin error.
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'patients'
    AND COLUMN_NAME  = 'origin'
);

SET @ddl := IF(@has_col = 0,
  'ALTER TABLE patients ADD COLUMN origin VARCHAR(20) NULL AFTER age',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;