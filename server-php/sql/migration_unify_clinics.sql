-- --------------------------------------------------------
-- Migración: UNIFICAR las 3 tablas de clínicas en UNA sola
--
-- Antes existían tres fuentes de clínicas/nombres:
--   * clinics          — catálogo simple (Pedidos / Encaminhamentos / Fórmula)
--   * receta_clinics   — perfil del emisor (Recetas / Atestados)
--   * laudo_clinics    — perfil de Laudo Pericial (médico, narrativa, logo)
-- Con nombres en mayúsculas/minúsculas y con/sin acentos que representaban
-- el MISMO sitio (ej: 'CLINICA SAÚDE CAMPINAS' / 'CLINICA SAUDE CAMPINAS' /
-- 'clinica_saude_campinas'), imposibles de unir por string.
--
-- Esta migración crea `clinic_profiles`:
--   * name          — nombre para mostrar (mayúsculas),
--   * name_key      — clave única normalizada (sin acentos/números/letras
--                     solo): 'clinica_saude_campinas' → 'clinicasaudecampinas'.
--                     UNIQUE → el propio motor impide duplicados por nombre.
--   * has_receta_profile / has_laudo_profile — en qué módulos se usa.
--   * columnas de perfil de receta + de laudo en la misma fila (la clínica
--     es UN registro con SUS direcciones/datos correspondientes).
--
-- NO toca las tablas originales (quedan como respaldo) ni los snapshots de
-- clinic_name/template_id de los documentos históricos: esos se resuelven
-- por name_key, así que los documentos viejos siguen encontrando su clínica.
--
-- Es idempotente: se puede correr varias veces sin duplicar filas.
-- Requiere MySQL 8+ (REGEXP_REPLACE para la normalización).
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Función de clave canónica (equivalente a clinic_key() en PHP y a
-- normalizeClinicKey() en el frontend): minúsculas, sin acentos ni signos.
-- Se usa SOLO para migrar/verificar; en producción la clave la calcula PHP.
-- --------------------------------------------------------
DROP FUNCTION IF EXISTS clinic_key_norm;
DELIMITER //
CREATE FUNCTION clinic_key_norm(p VARCHAR(255)) RETURNS VARCHAR(255) DETERMINISTIC NO SQL
BEGIN
    DECLARE s VARCHAR(255) DEFAULT LOWER(p);
    SET s = REPLACE(s, 'á', 'a'); SET s = REPLACE(s, 'à', 'a');
    SET s = REPLACE(s, 'â', 'a'); SET s = REPLACE(s, 'ã', 'a');
    SET s = REPLACE(s, 'ä', 'a'); SET s = REPLACE(s, 'é', 'e');
    SET s = REPLACE(s, 'è', 'e'); SET s = REPLACE(s, 'ê', 'e');
    SET s = REPLACE(s, 'ë', 'e'); SET s = REPLACE(s, 'í', 'i');
    SET s = REPLACE(s, 'ì', 'i'); SET s = REPLACE(s, 'î', 'i');
    SET s = REPLACE(s, 'ï', 'i'); SET s = REPLACE(s, 'ó', 'o');
    SET s = REPLACE(s, 'ò', 'o'); SET s = REPLACE(s, 'ô', 'o');
    SET s = REPLACE(s, 'õ', 'o'); SET s = REPLACE(s, 'ö', 'o');
    SET s = REPLACE(s, 'ú', 'u'); SET s = REPLACE(s, 'ù', 'u');
    SET s = REPLACE(s, 'û', 'u'); SET s = REPLACE(s, 'ü', 'u');
    SET s = REPLACE(s, 'ç', 'c'); SET s = REPLACE(s, 'ñ', 'n');
    SET s = REPLACE(s, 'ý', 'y'); SET s = REPLACE(s, 'ÿ', 'y');
    RETURN REGEXP_REPLACE(s, '[^a-z0-9]', '');
END//
DELIMITER ;

-- --------------------------------------------------------
-- Tabla única
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinic_profiles (
    id                    INT NOT NULL AUTO_INCREMENT,
    name                  VARCHAR(255) NOT NULL,
    name_key              VARCHAR(255) NOT NULL,
    active                TINYINT(1) NOT NULL DEFAULT 1,
    has_receta_profile    TINYINT(1) NOT NULL DEFAULT 0,
    has_laudo_profile     TINYINT(1) NOT NULL DEFAULT 0,
    -- perfil de receta / atestado
    secretaria            VARCHAR(255) NULL,
    sistema               VARCHAR(255) NULL,
    address               VARCHAR(255) NULL,
    phone                 VARCHAR(100) NULL,
    cnpj                  VARCHAR(100) NULL,
    -- perfil de laudo
    doctor_name           VARCHAR(255) NULL,
    doctor_crm            VARCHAR(100) NULL,
    clinic_name_fiscal    VARCHAR(255) NULL,
    clinic_address        VARCHAR(255) NULL,
    clinic_phone          VARCHAR(100) NULL,
    base_info             TEXT NULL,
    default_narrative     TEXT NULL,
    local                 VARCHAR(120) NULL,
    logo                  LONGTEXT NULL,
    primary_color         VARCHAR(20) NOT NULL DEFAULT '#0F4C81',
    primary_dark          VARCHAR(20) NOT NULL DEFAULT '#0a3a63',
    created_at            datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_clinic_profiles_name_key (name_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- ALIMENTAR: receta_clinics primero (el nombre con acentos/más datos
-- es el que quedará como display), luego clinics, luego laudo_clinics.
-- ON DUPLICATE KEY: machaca por name_key (maúsculas/minúsculas/acentos).
-- --------------------------------------------------------
INSERT INTO clinic_profiles
    (name, name_key, active, has_receta_profile,
     secretaria, sistema, address, phone, cnpj)
SELECT r.name, clinic_key_norm(r.name), r.active, 1,
       r.secretaria, r.sistema, r.address, r.phone, r.cnpj
FROM receta_clinics r
ON DUPLICATE KEY UPDATE
    active = GREATEST(clinic_profiles.active, VALUES(active)),
    has_receta_profile = 1,
    secretaria = VALUES(secretaria),
    sistema    = VALUES(sistema),
    address    = VALUES(address),
    phone      = VALUES(phone),
    cnpj       = VALUES(cnpj);

INSERT INTO clinic_profiles
    (name, name_key, active)
SELECT c.name, clinic_key_norm(c.name), c.active
FROM clinics c
ON DUPLICATE KEY UPDATE
    active = GREATEST(clinic_profiles.active, VALUES(active));

INSERT INTO clinic_profiles
    (name, name_key, active, has_laudo_profile,
     doctor_name, doctor_crm, clinic_name_fiscal,
     clinic_address, clinic_phone,
     base_info, default_narrative, local,
     logo, primary_color, primary_dark)
SELECT l.clinic_name, clinic_key_norm(l.clinic_name), l.active, 1,
       l.doctor_name, l.doctor_crm, l.clinic_name_fiscal,
       l.clinic_address, l.clinic_phone,
       l.base_info, l.default_narrative, l.local,
       l.logo, l.primary_color, l.primary_dark
FROM laudo_clinics l
ON DUPLICATE KEY UPDATE
    active = GREATEST(clinic_profiles.active, VALUES(active)),
    has_laudo_profile = 1,
    doctor_name        = VALUES(doctor_name),
    doctor_crm         = VALUES(doctor_crm),
    clinic_name_fiscal = VALUES(clinic_name_fiscal),
    clinic_address     = VALUES(clinic_address),
    clinic_phone       = VALUES(clinic_phone),
    base_info          = VALUES(base_info),
    default_narrative  = VALUES(default_narrative),
    local              = VALUES(local),
    logo               = VALUES(logo),
    primary_color      = VALUES(primary_color),
    primary_dark       = VALUES(primary_dark);

-- --------------------------------------------------------
-- Verificación inmediata: cuántas clínicas únicas quedaron
-- --------------------------------------------------------
SELECT CONCAT('clinic_profiles = ', COUNT(*)) AS resultado FROM clinic_profiles;