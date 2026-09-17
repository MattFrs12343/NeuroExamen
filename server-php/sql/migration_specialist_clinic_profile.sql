-- Migration: scope specialist_catalog entries per clinic profile
-- NULL clinic_profile = shared/default specialist, visible under every profile.
-- A specific value ('neuromobius' | 'neuroisbe') scopes the specialist to that clinic only.

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'specialist_catalog'
    AND COLUMN_NAME = 'clinic_profile'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE specialist_catalog ADD COLUMN clinic_profile VARCHAR(20) NULL AFTER name',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
