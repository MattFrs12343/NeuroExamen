-- --------------------------------------------------------
-- Migración: perfil de plantilla (template_id) en encaminhamentos
--
-- Añade la columna `template_id` a la tabla `encaminhamentos`
-- para recordar con qué perfil de impresión se emitió cada
-- documento (neuromobius | neuroisbe). Los registros existentes
-- quedan en NULL → el frontend los trata como 'neuromobius'.
--
-- Es idempotente: puede ejecutarse varias veces sin error.
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'encaminhamentos'
    AND COLUMN_NAME  = 'template_id'
);

SET @ddl := IF(@has_col = 0,
  'ALTER TABLE encaminhamentos ADD COLUMN template_id VARCHAR(20) NULL AFTER clinic_name',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;