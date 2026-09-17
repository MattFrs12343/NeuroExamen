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
INSERT INTO laudo_clinics
  (clinic_name, doctor_name, doctor_crm, clinic_name_fiscal, clinic_address, clinic_phone, base_info, default_narrative, local)
VALUES
  ('CLINICA SAUDE CAMPINAS',
   'DR. JUAN MARCELO CABELLO MERIDA',
   'CRM: 161792/SP',
   'CLINICA MEDICA E ODONTOLOGICA N&V LTDA',
   'RUA BERNARDINO DE CAMPOS, 927 - CENTRO - CAMPINAS / SP',
   '(19) 99558-9842',
   'Segundo informações prestadas pela(o) paciente, averiguadas em registros de prontuários médicos e exames complementares.',
   'Declaro que o referido paciente encontra-se em seguimento por Ansiedade, Estados Depressivos, e Agorafobia.\nCID 10 F33 + CID 10 F40 + CID 10 F41.9\nFaz uso de inúmeras drogas psicotrópicas em altas doses com efeito sedativo dado o efeito psicotrópico do tratamento não apresenta condições laborais atuais.\nPaciente foi encaminhado para PSIQUIATRIA para iniciar seu processo de reabilitação não conseguindo fazer nenhuma atividade física nem laboral por tempo indeterminado.\nConforme laudo em anexo do especialista em anexo.\nA segurado acima relata que não tem condições de exercer sua atividade laborativas.\nSolicito do prezado colega medico-perito, que após sua análise detalhada desta ponderação e considerando-se os fatos relatados de seu impedimento da sua atividade laborativa com base nas informações prestadas pelo médico especialista (Relatório médico em anexo), com regulamento pelo decreto número 3.048/1999.\nDesta forma, solicito desse órgão a realização da perícia medica e caracterização de sua incapacidade e a concessão do benefício para que o funcionária/segurada possa usufruir dos direitos previdenciários.',
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
   'Segundo informações prestadas pela(o) paciente, averiguadas em registros de prontuários médicos e exames complementares.',
   'Declaro que o referido paciente encontra-se em seguimento por Ansiedade, Estados Depressivos, e Agorafobia.\nCID 10 F33 + CID 10 F40 + CID 10 F41.9\nFaz uso de inúmeras drogas psicotrópicas em altas doses com efeito sedativo dado o efeito psicotrópico do tratamento não apresenta condições laborais atuais.\nPaciente foi encaminhado para PSIQUIATRIA para iniciar seu processo de reabilitação não conseguindo fazer nenhuma atividade física nem laboral por tempo indeterminado.\nConforme laudo em anexo do especialista em anexo.\nA segurado acima relata que não tem condições de exercer sua atividade laborativas.\nSolicito do prezado colega medico-perito, que após sua análise detalhada desta ponderação e considerando-se os fatos relatados de seu impedimento da sua atividade laborativa com base nas informações prestadas pelo médico especialista (Relatório médico em anexo), com regulamento pelo decreto número 3.048/1999.\nDesta forma, solicito desse órgão a realização da perícia medica e caracterização de sua incapacidade e a concessão do benefício para que o funcionária/segurada possa usufruir dos direitos previdenciários.',
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