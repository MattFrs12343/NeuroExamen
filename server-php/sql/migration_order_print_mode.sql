-- --------------------------------------------------------
-- Migración: modo de impresión de Pedidos con justificación médica
--
-- Los exámenes Dinamômetro / Estesiômetro / Equilíbrio generan, además de la
-- hoja genérica de pedido, un documento de "RELATÓRIO MÉDICO E JUSTIFICATIVA
-- DE EXAME ESPECIALIZADO". Ahora el médico elige, por pedido, qué imprimir:
--
--   'justification' → solo el documento de justificación médica
--   'order'         → solo la hoja de pedido
--   'both'          → ambos (comportamiento histórico)
--
-- NULL en pedidos ya existentes = 'both' (no cambia ninguna reimpresión ni
-- PDF firmado ya emitido).
--
-- Es idempotente: se puede correr de nuevo sin romper nada.
--
-- Si se corre por consola, usar charset utf8mb4 para no corromper acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_order_print_mode.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
     AND COLUMN_NAME = 'print_mode'
);
SET @add_col := IF(@has_col = 0,
  "ALTER TABLE orders ADD COLUMN print_mode VARCHAR(20) NULL AFTER exam_descriptions",
  'DO 0');
PREPARE st FROM @add_col;
EXECUTE st;
DEALLOCATE PREPARE st;
