-- --------------------------------------------------------
-- Migración: ampliar orders.code_cid de VARCHAR(20) a VARCHAR(255)
--
-- Corrige el error al guardar pedidos:
--   SQLSTATE[22001]: String data, right truncated:
--   1406 Data too long for column 'code_cid' at row 1
--
-- El campo CID es de texto libre y puede contener el código más su
-- descripción o varios códigos, que superan los 20 caracteres.
-- --------------------------------------------------------

ALTER TABLE orders
  MODIFY COLUMN code_cid VARCHAR(255) NOT NULL DEFAULT '';
