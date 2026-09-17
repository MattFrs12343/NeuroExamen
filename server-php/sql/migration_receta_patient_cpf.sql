-- --------------------------------------------------------
-- Migración: CPF del paciente en recetas
--
-- Añade la columna `patient_cpf` a la tabla `recetas` para guardar
-- un snapshot del CPF tal como se escribe en el formulario. El valor
-- es texto libre (admite números, letras y caracteres) y se imprime
-- junto a la dirección del paciente.
--
-- Es idempotente: puede ejecutarse varias veces sin error.
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'recetas'
    AND COLUMN_NAME  = 'patient_cpf'
);

SET @ddl := IF(@has_col = 0,
  'ALTER TABLE recetas ADD COLUMN patient_cpf VARCHAR(100) NULL AFTER patient_address',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;