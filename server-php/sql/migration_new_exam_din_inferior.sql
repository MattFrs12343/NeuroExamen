-- --------------------------------------------------------
-- Migración: nuevo examen de catálogo (Dinamômetro — membros inferiores)
--
-- Agrega al catálogo `exams`:
--   - din-02: evaluación de fuerza bilateral de miembros inferiores
--     (categoría cat_din, junto a din-01 que es de miembros superiores)
--
-- Ejecutar una vez en la base de producción (phpMyAdmin o consola).
-- Es idempotente: se puede correr de nuevo sin duplicar datos.
--
-- IMPORTANTE: si se corre por consola, usar charset utf8mb4 para no
-- corromper los acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_new_exam_din_inferior.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

INSERT IGNORE INTO exams (id, category, name) VALUES
  ('din-02', 'cat_din', 'exam_din_02');
