-- --------------------------------------------------------
-- Migración: campos de emisor e identificación exactos de receta.png
--
-- Agrega a `recetas` los campos que faltaban para replicar el
-- formulario de la plantilla de referencia:
--   - Dados do Emitente: Secretaria, Sistema, checkboxes 1ª/2ª via
--   - Identificação do Paciente: Nome, Ident., Endereço (propios,
--     independientes del "Endereço" de Dados do Paciente)
--
-- Ejecutar una sola vez (no es idempotente: si ya corriste esta
-- migración, no la vuelvas a correr o vas a obtener un error de
-- "Duplicate column name").
--
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_receta_emitter_ident_fields.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

ALTER TABLE recetas
  ADD COLUMN clinic_secretaria VARCHAR(255) NULL AFTER clinic_name,
  ADD COLUMN clinic_sistema    VARCHAR(255) NULL AFTER clinic_secretaria,
  ADD COLUMN via1              TINYINT(1)   NOT NULL DEFAULT 0 AFTER clinic_cnpj,
  ADD COLUMN via2              TINYINT(1)   NOT NULL DEFAULT 0 AFTER via1,
  ADD COLUMN ident_nome        VARCHAR(255) NULL AFTER patient_address,
  ADD COLUMN ident_doc         VARCHAR(100) NULL AFTER ident_nome,
  ADD COLUMN ident_address     VARCHAR(255) NULL AFTER ident_doc;
