-- --------------------------------------------------------
-- Migración: Fórmulas Infantis Especiais (ficha CNES/leite)
--
-- Crea las tablas `formula_leite` y `formula_leite_counter`.
-- Sigue el mismo patrón que `atestados` (tabla + counter para IDs
-- secuenciales sin race condition). Los campos repetibles (sintomas,
-- exames, historial de peso, tipos de fórmula) se guardan como JSON,
-- igual que `recetas.medications`.
--
-- Ejecutar una vez en la base de producción (phpMyAdmin o consola).
-- Es idempotente: se puede correr de nuevo sin duplicar datos.
--
-- IMPORTANTE: si se corre por consola, usar charset utf8mb4 para no
-- corromper los acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_formula_leite.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Tabla: formula_leite
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS formula_leite (
  id                        VARCHAR(30)   NOT NULL PRIMARY KEY,
  patient_id                CHAR(36)      NOT NULL,
  user_id                   CHAR(36)      NOT NULL,

  first_consult_date        VARCHAR(40)   NULL,

  -- A) Identificação
  patient_birth_date        VARCHAR(40)   NULL,
  mother_name                VARCHAR(255)  NULL,
  patient_cns                VARCHAR(40)   NULL,
  professional_name          VARCHAR(255)  NULL,
  institution_name            VARCHAR(255)  NULL,
  cnes                        VARCHAR(40)   NULL,
  solicitation                VARCHAR(255)  NULL,
  quantity_month               VARCHAR(40)   NULL,
  cid                           VARCHAR(20)   NULL,
  diagnostico                   TEXT          NULL,

  -- B) Sinais e sintomas clínicos presentes
  symptoms_notes                 TEXT          NULL,
  symptoms                       JSON          NULL,

  -- C) Exames subsidiários realizados
  exams                           JSON          NULL,

  -- D) Avaliação da condição nutricional
  weight_kg                        VARCHAR(20)   NULL,
  height_cm                         VARCHAR(20)   NULL,
  percentile_below_10                VARCHAR(10)   NULL,
  weight_deceleration                 VARCHAR(10)   NULL,
  weight_deceleration_time             VARCHAR(60)   NULL,
  nutrition_history                     JSON          NULL,

  -- Rodapé / assinatura do médico responsável (CNS + CPF)
  footer_date                            VARCHAR(40)   NULL,
  doctor_cns                              VARCHAR(40)   NULL,
  doctor_cpf                               VARCHAR(40)   NULL,

  -- F) Conduta (uso restrito a SES-SP)
  conduta_option                           VARCHAR(20)   NULL,
  formula_latas                             VARCHAR(20)   NULL,
  formula_meses                              VARCHAR(20)   NULL,
  formula_types                               JSON          NULL,
  data_retorno                                 VARCHAR(40)   NULL,
  previsao_provocacao                           VARCHAR(40)   NULL,
  avaliador                                      VARCHAR(255)  NULL,

  created_at                                      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_formula_leite_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_formula_leite_user    FOREIGN KEY (user_id)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla: formula_leite_counter  (IDs secuenciales sin race condition)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS formula_leite_counter (
  year INT  NOT NULL PRIMARY KEY,
  seq  INT  NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
