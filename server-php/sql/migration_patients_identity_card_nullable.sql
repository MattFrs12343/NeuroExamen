-- --------------------------------------------------------
-- Migración: identity_card de pacientes nullable + limpieza
--
-- Objetivo:
--   1) Quitar el UNIQUE + NOT NULL de `identity_card` para que un
--      paciente pueda registrarse sin documento (CPF/DNI).
--   2) Limpiar los datos falsos que generaba el frontend:
--        - 'NA-<timestamp>'   (placeholder generado al dejar el campo vacío)
--        - 'N/A'
--        - ''  (cadena vacía)
--      Esos pacientes quedan con identity_card = NULL.
--
-- Ejecutar UNA vez (idempotente):
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_patients_identity_card_nullable.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) Eliminar el índice único de identity_card si existe
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'patients'
    AND INDEX_NAME   = 'identity_card'
);
SET @sql := IF(@idx_exists > 0,
  'ALTER TABLE patients DROP INDEX identity_card',
  'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 2) Hacer la columna nullable
ALTER TABLE patients MODIFY identity_card VARCHAR(100) NULL;

-- 3) Limpiar placeholders falsos
UPDATE patients
SET identity_card = NULL
WHERE identity_card IS NOT NULL
  AND (TRIM(identity_card) = ''
    OR TRIM(identity_card) = 'N/A'
    OR TRIM(identity_card) LIKE 'NA-%');

SET FOREIGN_KEY_CHECKS = 1;
