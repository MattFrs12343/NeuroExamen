-- --------------------------------------------------------
-- Migración: permitir receta sin fecha
--
-- La fecha de la receta ahora es opcional: se puede guardar/imprimir
-- sin fecha, y se puede elegir cualquier fecha pasada o futura sin
-- restricción (esto último ya lo permite el <input type="date">, no
-- requiere cambios de esquema).
--
-- Ejecutar una sola vez. Es seguro re-ejecutar (MODIFY COLUMN no falla
-- si ya está en el estado deseado).
--
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_receta_date_nullable.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

ALTER TABLE recetas
  MODIFY COLUMN date DATE NULL;
