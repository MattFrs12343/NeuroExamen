-- --------------------------------------------------------
-- Migración: catálogo de clínicas / instituciones
--
-- Crea la tabla `clinics` y la carga con el listado inicial.
-- La lista alimenta el combobox del campo "Clínica / Institución"
-- en el frontend. orders.clinic_name NO cambia (sigue guardando texto).
--
-- Ejecutar una vez en la base de producción (phpMyAdmin o consola).
-- Es idempotente: se puede correr de nuevo sin duplicar datos.
--
-- IMPORTANTE: si se corre por consola, usar charset utf8mb4 para no
-- corromper los acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_clinics.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

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
  ('MED CENTER GUAIANASES');
