-- NeuroExamenes — MySQL Schema
-- Ejecutar esto en phpMyAdmin o MySQL CLI para crear las tablas

CREATE DATABASE IF NOT EXISTS neuroexamenes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE neuroexamenes;

-- --------------------------------------------------------
-- Tabla: users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  specialty        VARCHAR(255) NOT NULL,
  crm_license      VARCHAR(100) NOT NULL DEFAULT '123456',
  rqe_specialty    VARCHAR(100) NOT NULL DEFAULT '98765',
  registration_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: patients
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  identity_card VARCHAR(100) NULL,
  age           INT          NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: exams  (catálogo)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
  id       VARCHAR(50)  NOT NULL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  name     VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: orders
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                VARCHAR(30)  NOT NULL PRIMARY KEY,
  patient_id        CHAR(36)     NOT NULL,
  user_id           CHAR(36)     NOT NULL,
  date              DATE         NOT NULL,
  code_cid          VARCHAR(255) NOT NULL DEFAULT '',
  patient_phone     VARCHAR(30)  NULL,
  clinic_name       VARCHAR(255) NULL,
  observations      TEXT         NULL,
  status            VARCHAR(30)  NOT NULL DEFAULT 'Pendiente',
  custom_exams      JSON         NULL,
  exam_descriptions JSON         NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_user    FOREIGN KEY (user_id)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: order_exams  (pivot)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_exams (
  order_id VARCHAR(30) NOT NULL,
  exam_id  VARCHAR(50) NOT NULL,
  PRIMARY KEY (order_id, exam_id),
  CONSTRAINT fk_oe_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oe_exam  FOREIGN KEY (exam_id)  REFERENCES exams(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: login_attempts  (rate limiting)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip         VARCHAR(45)  NOT NULL,
  attempted_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_time (ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: order_counter  (IDs secuenciales sin race condition)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_counter (
  year INT  NOT NULL PRIMARY KEY,
  seq  INT  NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: clinics  (catálogo de clínicas / instituciones)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinics (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clinics_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO clinics (name) VALUES
  ('PRO CLINICA SUMARÉ'),
  ('PRO CLINICA AMERICANA'),
  ('PRO CLINICA VARZEA PAULISTA'),
  ('DOCS SUA CLINICA DE SAÚDE'),
  ('CLINICA HABIB'),
  ('CLINILESTE'),
  ('CLINICA SAÚDE CAMPINAS'),
  ('CLINICA +DOUTOR PRESIDENTE DUTRA'),
  ('CLINICA SÃO LUIZ'),
  ('CLINICA EU SOU LUZ'),
  ('CLINICA HUMANAR'),
  ('MED CENTER GUAIANASES'),
  ('+DOUTOR CLINICA E LABORATÓRIO');

-- --------------------------------------------------------
-- Tabla: receta_clinics  (clínicas con perfil completo — exclusivas de
-- Recetas, separadas de `clinics` que usa Pedidos)
-- --------------------------------------------------------
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

INSERT INTO receta_clinics (name, secretaria, sistema, address, phone, cnpj) VALUES
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
   'PRAÇA NIPPON, 105 - JARDIM JAPÃO', '(11) 3164-3894', NULL),
  ('+DOUTOR CLINICA E LABORATÓRIO', NULL, NULL,
   'Av. Papa João Paulo I, 3086 - Jardim Pres. Dutra, Guarulhos/SP - CEP: 07174-000', '11 98958 0281 | 11 94772 5760', NULL)
ON DUPLICATE KEY UPDATE
  secretaria = VALUES(secretaria),
  sistema    = VALUES(sistema),
  address    = VALUES(address),
  phone      = VALUES(phone),
  cnpj       = VALUES(cnpj);


-- --------------------------------------------------------
-- Tabla: custom_exams  (estudios personalizados creados por los médicos)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_exams (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  name       VARCHAR(500) NOT NULL,
  created_by CHAR(36)     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_exams_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- --------------------------------------------------------
-- Tabla: medication_catalog  (medicamentos frecuentes sugeridos)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS medication_catalog (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  created_by CHAR(36)     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_medication_catalog_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: recetas
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS recetas (
  id               VARCHAR(30)  NOT NULL PRIMARY KEY,
  patient_id       CHAR(36)     NOT NULL,
  user_id          CHAR(36)     NOT NULL,
  date             DATE         NULL,
  clinic_name      VARCHAR(255) NULL,
  clinic_secretaria VARCHAR(255) NULL,
  clinic_sistema   VARCHAR(255) NULL,
  clinic_address   VARCHAR(255) NULL,
  clinic_phone     VARCHAR(100) NULL,
  clinic_cnpj      VARCHAR(100) NULL,
  via1             TINYINT(1)   NOT NULL DEFAULT 0,
  via2             TINYINT(1)   NOT NULL DEFAULT 0,
  patient_address  VARCHAR(255) NULL,
  patient_cpf      VARCHAR(100) NULL,
  patient_phone    VARCHAR(30)  NULL,
  ident_nome       VARCHAR(255) NULL,
  ident_doc        VARCHAR(100) NULL,
  ident_address    VARCHAR(255) NULL,
  patient_org_emissor VARCHAR(100) NULL,
  patient_city     VARCHAR(100) NULL,
  patient_uf       VARCHAR(10)  NULL,
  observations     TEXT         NULL,
  medications      JSON         NOT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recetas_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_recetas_user    FOREIGN KEY (user_id)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: receta_counter  (IDs secuenciales sin race condition)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS receta_counter (
  year INT  NOT NULL PRIMARY KEY,
  seq  INT  NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: specialist_catalog  (especialistas para Encaminhamentos)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS specialist_catalog (
  id             VARCHAR(64)  NOT NULL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  clinic_profile VARCHAR(20)  NULL,
  created_by     CHAR(36)     NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_specialist_catalog_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO specialist_catalog (id, name) VALUES
  ('spec-neuropsicopedagoga', 'Neuropsicopedagoga'),
  ('spec-neuropsicologa',     'Neuropsicóloga'),
  ('spec-terapia-aba',        'Especialista em Terapia ABA'),
  ('spec-psicologa-tcc',      'Psicóloga TCC'),
  ('spec-psicologa',          'Psicóloga');

-- --------------------------------------------------------
-- Tabla: encaminhamentos  (encaminhamento para especialista)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS encaminhamentos (
  id           VARCHAR(30)  NOT NULL PRIMARY KEY,
  patient_id   CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  date         DATE         NULL,
  patient_age  VARCHAR(20)  NULL,
  patient_phone VARCHAR(30) NULL,
  hd           TEXT         NULL,
  motivo       TEXT         NULL,
  clinic_name  VARCHAR(255) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_encaminhamentos_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_encaminhamentos_user    FOREIGN KEY (user_id)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: encaminhamento_specialists  (pivot)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS encaminhamento_specialists (
  encaminhamento_id VARCHAR(30) NOT NULL,
  specialist_id     VARCHAR(64) NOT NULL,
  PRIMARY KEY (encaminhamento_id, specialist_id),
  CONSTRAINT fk_es_encaminhamento FOREIGN KEY (encaminhamento_id) REFERENCES encaminhamentos(id) ON DELETE CASCADE,
  CONSTRAINT fk_es_specialist     FOREIGN KEY (specialist_id)     REFERENCES specialist_catalog(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: encaminhamento_counter  (IDs secuenciales sin race condition)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS encaminhamento_counter (
  year INT  NOT NULL PRIMARY KEY,
  seq  INT  NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO exams (id, category, name) VALUES
  ('eeg-01',     'cat_eeg',     'exam_eeg_01'),
  ('pev-01',     'cat_pev',     'exam_pev_01'),
  ('pev-02',     'cat_pev',     'exam_pev_02'),
  ('enm-sup-01', 'cat_enm_sup', 'exam_enm_sup_01'),
  ('enm-sup-02', 'cat_enm_sup', 'exam_enm_sup_02'),
  ('enm-sup-03', 'cat_enm_sup', 'exam_enm_sup_03'),
  ('enm-inf-01', 'cat_enm_inf', 'exam_enm_inf_01'),
  ('enm-inf-02', 'cat_enm_inf', 'exam_enm_inf_02'),
  ('enm-inf-03', 'cat_enm_inf', 'exam_enm_inf_03'),
  ('enm-inf-04', 'cat_enm_inf', 'exam_enm_inf_04'),
  ('fac-01',     'cat_face',    'exam_fac_01'),
  ('cog-01',     'cat_cog',     'exam_cog_01'),
  ('cog-02',     'cat_cog',     'exam_cog_02'),
  ('cog-03',     'cat_cog',     'exam_cog_03'),
  ('din-01',     'cat_din',     'exam_din_01'),
  ('din-02',     'cat_din',     'exam_din_02'),
  ('rm-01',      'cat_rm',      'exam_rm_01'),
  ('rm-02',      'cat_rm',      'exam_rm_02'),
  ('rm-03',      'cat_rm',      'exam_rm_03'),
  ('rm-04',      'cat_rm',      'exam_rm_04'),
  ('rm-05',      'cat_rm',      'exam_rm_05'),
  ('rm-06',      'cat_rm',      'exam_rm_06'),
  ('rm-07',      'cat_rm',      'exam_rm_07'),
  ('rm-08',      'cat_rm',      'exam_rm_08'),
  ('tc-01',      'cat_tc',      'exam_tc_01'),
  ('us-01',      'cat_us',      'exam_us_01'),
  ('est-01',     'cat_est',     'exam_est_01'),
  ('est-02',     'cat_est',     'exam_est_02'),
  ('equ-01',     'cat_equ',     'exam_equ_01');
