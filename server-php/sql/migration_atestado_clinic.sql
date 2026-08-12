-- --------------------------------------------------------
-- Migración: Columnas de clínica (emissor) en atestados
--
-- Agrega a `atestados` las mismas columnas de clínica que ya
-- existen en `recetas` (clinic_name, clinic_secretaria, ...),
-- para que el bloque "Dados do Emitente / Clínica" pueda
-- guardarse e imprimirse también en los atestados.
--
-- Idempotente: verifica cada columna antes de agregarla, por lo
-- que se puede ejecutar más de una vez sin errores.
--
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_atestado_clinic.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @db = DATABASE();

-- clinic_name
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'atestados' AND column_name = 'clinic_name') = 0,
  'ALTER TABLE atestados ADD COLUMN clinic_name VARCHAR(255) NULL AFTER issued_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- clinic_secretaria
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'atestados' AND column_name = 'clinic_secretaria') = 0,
  'ALTER TABLE atestados ADD COLUMN clinic_secretaria VARCHAR(255) NULL AFTER clinic_name',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- clinic_sistema
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'atestados' AND column_name = 'clinic_sistema') = 0,
  'ALTER TABLE atestados ADD COLUMN clinic_sistema VARCHAR(255) NULL AFTER clinic_secretaria',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- clinic_address
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'atestados' AND column_name = 'clinic_address') = 0,
  'ALTER TABLE atestados ADD COLUMN clinic_address VARCHAR(255) NULL AFTER clinic_sistema',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- clinic_phone
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'atestados' AND column_name = 'clinic_phone') = 0,
  'ALTER TABLE atestados ADD COLUMN clinic_phone VARCHAR(100) NULL AFTER clinic_address',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- clinic_cnpj
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'atestados' AND column_name = 'clinic_cnpj') = 0,
  'ALTER TABLE atestados ADD COLUMN clinic_cnpj VARCHAR(100) NULL AFTER clinic_phone',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
