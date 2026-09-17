-- --------------------------------------------------------
-- Migración: nuevos exámenes de catálogo (Equilíbrio y MoCA)
--
-- Agrega al catálogo `exams`:
--   - cog-03: Rastreo Cognitivo MoCA (categoría cat_cog)
--   - equ-01: Equilíbrio, evaluación estática y dinámica (nueva categoría cat_equ)
--
-- Ejecutar una vez en la base de producción (phpMyAdmin o consola).
-- Es idempotente: se puede correr de nuevo sin duplicar datos.
--
-- IMPORTANTE: si se corre por consola, usar charset utf8mb4 para no
-- corromper los acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_new_exams_equilibrio_moca.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

INSERT IGNORE INTO exams (id, category, name) VALUES
  ('cog-03', 'cat_cog', 'exam_cog_03'),
  ('equ-01', 'cat_equ', 'exam_equ_01');
