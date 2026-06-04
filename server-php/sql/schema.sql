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
  identity_card VARCHAR(100) NOT NULL UNIQUE,
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
  code_cid          VARCHAR(20)  NOT NULL DEFAULT '',
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
  ('din-01',     'cat_din',     'exam_din_01'),
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
  ('est-02',     'cat_est',     'exam_est_02');
