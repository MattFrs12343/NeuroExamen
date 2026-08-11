-- --------------------------------------------------------
-- Migración: campos de identificación del paciente en recetas
--
-- Agrega patient_org_emissor, patient_city y patient_uf a `recetas`,
-- para que el bloque "IDENTIFICAÇÃO DO PACIENTE" de la receta impresa
-- salga completo (Org. Emisor, Ciudad, UF) en vez de líneas en blanco.
--
-- Ejecutar una sola vez (no es idempotente: si ya corriste esta
-- migración, no la vuelvas a correr o vas a obtener un error de
-- "Duplicate column name").
--
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_receta_patient_fields.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

ALTER TABLE recetas
  ADD COLUMN patient_org_emissor VARCHAR(100) NULL AFTER patient_address,
  ADD COLUMN patient_city        VARCHAR(100) NULL AFTER patient_org_emissor,
  ADD COLUMN patient_uf          VARCHAR(10)  NULL AFTER patient_city;
