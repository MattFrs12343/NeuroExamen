-- Migración: tabla laudo_clinics — perfil de laudo por clínica.
-- Vincula por nombre con receta_clinics (la fuente de verdad de las
-- clínicas del sistema). Cada fila contiene los datos del emisor
-- (médico, CRM, dirección, teléfono), la base info, la narrativa
-- default, el local y el logo del membrete (data URI base64, opcional).
--
-- Uso:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_laudo_clinics.sql
CREATE TABLE IF NOT EXISTS laudo_clinics (
  id                INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  clinic_name       VARCHAR(255) NOT NULL,
  doctor_name       VARCHAR(255) NULL,
  doctor_crm        VARCHAR(100) NULL,
  clinic_name_fiscal VARCHAR(255) NULL,
  clinic_address    VARCHAR(255) NULL,
  clinic_phone      VARCHAR(100) NULL,
  base_info         TEXT         NULL,
  default_narrative TEXT         NULL,
  local             VARCHAR(120) NULL,
  logo              LONGTEXT     NULL,
  primary_color     VARCHAR(20)  NOT NULL DEFAULT '#0F4C81',
  primary_dark      VARCHAR(20)  NOT NULL DEFAULT '#0a3a63',
  active            TINYINT(1)   NOT NULL DEFAULT 1,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_laudo_clinics_name (clinic_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed: CLINICA SAÚDE CAMPINAS — la única clínica con perfil hoy.
-- El logo NO va acá: se resuelve (como data URI base64) desde el archivo
-- server-php/assets/logo-saude-campinas.png vía getLaudoLogoDataUri()
-- cuando el perfil no tiene uno cargado (ver lib/laudoProfiles.php).
-- La fila con clinic_name = 'clinica_saude_campinas' es de compatibilidad
-- para laudos viejos cuyo template_id guardaba esa key interna.
--
-- base_info y default_narrative van a NULL a propósito: el sistema NO debe
-- traer texto pre-escrito. Antes esta clínica traía una base info y una
-- narrativa completa de ejemplo (con CIDs y diagnóstico de un paciente real)
-- que el fallback de formato de la UI le copiaba a todas las clínicas sin
-- perfil propio — con el riesgo de firmar un laudo con el texto de otro.
-- El médico escribe la base info y la narrativa de cada paciente, y cada
-- clínica puede cargar las suyas desde el editor de perfil de laudo.
INSERT INTO laudo_clinics
  (clinic_name, doctor_name, doctor_crm, clinic_name_fiscal, clinic_address, clinic_phone, base_info, default_narrative, local)
VALUES
  ('CLINICA SAUDE CAMPINAS',
   'DR. JUAN MARCELO CABELLO MERIDA',
   'CRM: 161792/SP',
   'CLINICA MEDICA E ODONTOLOGICA N&V LTDA',
   'RUA BERNARDINO DE CAMPOS, 927 - CENTRO - CAMPINAS / SP',
   '(19) 99558-9842',
   NULL,
   NULL,
   'Campinas - SP')
ON DUPLICATE KEY UPDATE
  doctor_name        = VALUES(doctor_name),
  doctor_crm         = VALUES(doctor_crm),
  clinic_name_fiscal = VALUES(clinic_name_fiscal),
  clinic_address     = VALUES(clinic_address),
  clinic_phone       = VALUES(clinic_phone),
  base_info          = VALUES(base_info),
  default_narrative  = VALUES(default_narrative),
  local              = VALUES(local);

-- Fila de compatibilidad: laudos viejos con template_id = 'clinica_saude_campinas'
INSERT INTO laudo_clinics
  (clinic_name, doctor_name, doctor_crm, clinic_name_fiscal, clinic_address, clinic_phone, base_info, default_narrative, local)
VALUES
  ('clinica_saude_campinas',
   'DR. JUAN MARCELO CABELLO MERIDA',
   'CRM: 161792/SP',
   'CLINICA MEDICA E ODONTOLOGICA N&V LTDA',
   'RUA BERNARDINO DE CAMPOS, 927 - CENTRO - CAMPINAS / SP',
   '(19) 99558-9842',
   NULL,
   NULL,
   'Campinas - SP')
ON DUPLICATE KEY UPDATE
  doctor_name        = VALUES(doctor_name),
  doctor_crm         = VALUES(doctor_crm),
  clinic_name_fiscal = VALUES(clinic_name_fiscal),
  clinic_address     = VALUES(clinic_address),
  clinic_phone       = VALUES(clinic_phone),
  base_info          = VALUES(base_info),
  default_narrative  = VALUES(default_narrative),
  local              = VALUES(local);