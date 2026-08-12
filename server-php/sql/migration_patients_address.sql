-- --------------------------------------------------------
-- Migración: dirección persistente del paciente
--
-- Añade la columna `address` a la tabla `patients` para que la
-- dirección quede guardada en el paciente (no solo en cada receta),
-- editable, y se precargue automáticamente en próximas recetas.
--
-- Es idempotente: puede ejecutarse varias veces sin error.
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'patients'
    AND COLUMN_NAME  = 'address'
);

SET @ddl := IF(@has_col = 0,
  'ALTER TABLE patients ADD COLUMN address TEXT NULL AFTER age',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
