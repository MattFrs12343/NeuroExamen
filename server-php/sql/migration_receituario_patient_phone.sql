-- --------------------------------------------------------
-- Migración: teléfono del paciente en receituários
--
-- Añade `patient_phone` a `receituarios` — texto libre, opcional, usado
-- SOLO para el botón "Enviar por WhatsApp" en ReceituariosList.tsx. Nunca
-- se imprime en la plantilla (PrintReceituarioTemplate.tsx no lo lee).
--
-- Es idempotente: puede ejecutarse varias veces sin error.
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'receituarios'
    AND COLUMN_NAME  = 'patient_phone'
);

SET @ddl := IF(@has_col = 0,
  'ALTER TABLE receituarios ADD COLUMN patient_phone VARCHAR(30) NULL AFTER patient_name',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
