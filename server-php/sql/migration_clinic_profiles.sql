-- --------------------------------------------------------
-- SUPERADA por migration_receta_clinics_separate.sql — esta migración
-- mezclaba las clínicas de Recetas dentro de `clinics` (la tabla de
-- Pedidos). Se mantiene el archivo solo como historial; NO ejecutar
-- en instalaciones nuevas. Usar migration_receta_clinics_separate.sql.
-- --------------------------------------------------------
--
-- Migración: perfiles completos de clínicas (para autocompletar
-- "Identificação do Emitente" en Recetas)
--
-- Agrega a `clinics` los campos secretaria/sistema/address/phone/cnpj
-- y carga los datos completos de las clínicas que deben autocompletarse
-- al seleccionarlas. Usa ON DUPLICATE KEY UPDATE sobre `name` (ya es
-- UNIQUE), así que es seguro re-ejecutar sin duplicar filas.
--
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_clinic_profiles.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- NOTA: sin IF NOT EXISTS (no es portable entre versiones de MySQL/MariaDB).
-- No re-ejecutar esta sección si las columnas ya existen.
ALTER TABLE clinics
  ADD COLUMN secretaria VARCHAR(255) NULL,
  ADD COLUMN sistema    VARCHAR(255) NULL,
  ADD COLUMN address    VARCHAR(255) NULL,
  ADD COLUMN phone      VARCHAR(100) NULL,
  ADD COLUMN cnpj       VARCHAR(100) NULL;

INSERT INTO clinics (name, secretaria, sistema, address, phone, cnpj) VALUES
  ('PRO-CLINICA AMERICANA', NULL, NULL,
   'AVENIDA DE CILLO, 1447 - AMERICANA', '19 - 4040-4574', '40.810.924.0001-78'),

  ('PRO-CLINICA SUMARE', NULL, NULL,
   'AV. Jose Mancini, 516 - Sumare-SP', '19 - 33088277', NULL),

  ('CLINICA MED CENTER', NULL, NULL,
   'PROFESSOR FRANCISCO PINHEIRO 258, - SÃO PAULO- SP', '11-20169088', '24802394/0001-60'),

  ('PREFEITURA DO MUNICIPIO DE FRANCO DA ROCHA', 'Secretaria da saúde', 'Sistema Único de Saúde',
   'Rua Nelson Rodrigues, s/n° - Centro', '4800-1900', '46.523.080/001-60'),

  ('CLINILESTE', NULL, NULL,
   'AVENIDA ITAQUERA, 2477 - BARRIO JARDIM MARINA, ITAQUERA - SÃO PAULO', '(11) 27412011', NULL),

  ('CLINICA SAUDE CAMPINAS', NULL, NULL,
   'R/ BERNARDINO DE CAMPOS # 927 - CENTRO DE CAMPINAS', '(19) 21216601', NULL),

  ('CLINICA MEDICA PARQUE SÃO LUIZ', NULL, NULL,
   'Avenida Papa João Paulo I, 2852 - Vila Aeroporto', '(11) 2432-5252 / (11) 2433-2233 / WhatsApp (11) 97559-7701', NULL),

  ('CLINICA HABID CONSULTAS E XAMES', NULL, NULL,
   'Rua Americo Salvador Novelli 154, Andar - Sl 501 - Centro de Itaquera - SP', '11-25792326', 'CNES 7552726'),

  ('NEURO SÃO PAULO', NULL, NULL,
   'RUA DR EDSON DE MELO Nº 114 - SÃO PAULO - SP', '(11) 97743-5813', NULL),

  ('CLINICA DOC SAUDE', NULL, NULL,
   'AVENIDA PAULO FERREIRA, 2578 - SÃO PAULO- SP - PIRITUBA - CEP 02916-000', '1148585536', NULL),

  ('CLINICA EU SOU LUZ', NULL, NULL,
   'PRAÇA NIPPON, 105 - JARDIM JAPÃO', '(11) 3164-3894', NULL)

ON DUPLICATE KEY UPDATE
  secretaria = VALUES(secretaria),
  sistema    = VALUES(sistema),
  address    = VALUES(address),
  phone      = VALUES(phone),
  cnpj       = VALUES(cnpj);
