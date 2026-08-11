-- --------------------------------------------------------
-- Migración correctiva: separar las clínicas de Recetas de `clinics`
--
-- migration_clinic_profiles.sql había agregado columnas de perfil y
-- filas nuevas directamente en `clinics` (la tabla que usa Pedidos).
-- Esto las mueve a una tabla propia `receta_clinics`, y deja `clinics`
-- exactamente como estaba antes (solo las clínicas originales de
-- Pedidos, sin columnas de perfil).
--
-- Ejecutar una sola vez, después de haber corrido migration_clinic_profiles.sql.
-- No es idempotente (el DROP COLUMN falla si ya se corrió).
--
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_receta_clinics_separate.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- 1. Tabla separada para las clínicas con perfil completo (Recetas)
CREATE TABLE IF NOT EXISTS receta_clinics (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  secretaria VARCHAR(255) NULL,
  sistema    VARCHAR(255) NULL,
  address    VARCHAR(255) NULL,
  phone      VARCHAR(100) NULL,
  cnpj       VARCHAR(100) NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_receta_clinics_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Copiar los perfiles que ya estaban cargados en `clinics` (si existen)
INSERT INTO receta_clinics (name, secretaria, sistema, address, phone, cnpj)
SELECT name, secretaria, sistema, address, phone, cnpj
FROM clinics
WHERE address IS NOT NULL OR phone IS NOT NULL OR cnpj IS NOT NULL
   OR secretaria IS NOT NULL OR sistema IS NOT NULL
ON DUPLICATE KEY UPDATE
  secretaria = VALUES(secretaria),
  sistema    = VALUES(sistema),
  address    = VALUES(address),
  phone      = VALUES(phone),
  cnpj       = VALUES(cnpj);

-- 3. Quitar de `clinics` las filas que no pertenecían originalmente ahí.
--    IMPORTANTE: se usa BINARY para comparar byte a byte — la colación
--    por defecto (accent-insensitive, ej. utf8mb4_0900_ai_ci) trata
--    'CLINICA SAUDE CAMPINAS' y 'CLINICA SAÚDE CAMPINAS' como iguales,
--    y sin BINARY este DELETE borraría también la fila original con
--    tilde que sí pertenece a Pedidos.
DELETE FROM clinics WHERE BINARY name IN (
  'PRO-CLINICA AMERICANA',
  'PRO-CLINICA SUMARE',
  'CLINICA MED CENTER',
  'PREFEITURA DO MUNICIPIO DE FRANCO DA ROCHA',
  'CLINICA SAUDE CAMPINAS',
  'CLINICA MEDICA PARQUE SÃO LUIZ',
  'CLINICA HABID CONSULTAS E XAMES',
  'NEURO SÃO PAULO',
  'CLINICA DOC SAUDE'
);

-- 3b. Asegurar que la clínica original con tilde siga existiendo en
--     `clinics` (por si la migración de perfiles ya la había fusionado
--     con la variante sin tilde por la colación accent-insensitive).
INSERT IGNORE INTO clinics (name) VALUES ('CLINICA SAÚDE CAMPINAS');

-- 4. Revertir las columnas de perfil agregadas a `clinics` (ya viven en receta_clinics)
ALTER TABLE clinics
  DROP COLUMN secretaria,
  DROP COLUMN sistema,
  DROP COLUMN address,
  DROP COLUMN phone,
  DROP COLUMN cnpj;
