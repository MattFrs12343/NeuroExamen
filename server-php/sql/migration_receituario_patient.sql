-- --------------------------------------------------------
-- Migración: nombre del paciente + fecha de consulta en receituário
--
-- Añade `patient_name` (texto libre, sin vínculo a la tabla `patients`)
-- y `date` (fecha de consulta) a `receituarios` — se muestran dentro del
-- recuadro de escritura, debajo del título (ver PrintReceituarioTemplate.tsx
-- y Receituario.tsx). Ambas columnas son opcionales.
--
-- Es idempotente: puede ejecutarse varias veces sin error.
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @has_patient_name := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'receituarios'
    AND COLUMN_NAME  = 'patient_name'
);

SET @ddl := IF(@has_patient_name = 0,
  'ALTER TABLE receituarios ADD COLUMN patient_name VARCHAR(255) NULL AFTER clinic_cnpj',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_date := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'receituarios'
    AND COLUMN_NAME  = 'date'
);

SET @ddl := IF(@has_date = 0,
  'ALTER TABLE receituarios ADD COLUMN date DATE NULL AFTER patient_name',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
