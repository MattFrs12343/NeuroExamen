-- --------------------------------------------------------
-- Migración: campo "Clínica / Institución" en encaminhamentos
--
-- Añade la columna `clinic_name` a la tabla `encaminhamentos`
-- para que cada encaminhamento pueda guardar la clínica o
-- institución destino (igual que `orders.clinic_name`).
--
-- Es idempotente: puede ejecutarse varias veces sin error.
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'encaminhamentos'
    AND COLUMN_NAME  = 'clinic_name'
);

SET @ddl := IF(@has_col = 0,
  'ALTER TABLE encaminhamentos ADD COLUMN clinic_name VARCHAR(255) NULL AFTER motivo',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
