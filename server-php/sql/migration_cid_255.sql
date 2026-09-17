-- --------------------------------------------------------
-- Migración: ampliar atestados.cid y formula_leite.cid
-- de VARCHAR(20) a VARCHAR(500)
--
-- Corrige el error al guardar atestados:
--   SQLSTATE[22001]: String data, right truncated:
--   1406 Data too long for column 'cid' at row 1
--
-- Al truncar el INSERT/UPDATE, PHP no llega a devolver JSON y el
-- frontend falla con "Unexpected end of JSON input".
--
-- El campo CID es de texto libre (código + descripción, varios
-- códigos, etc.). Primer intento con VARCHAR(255) (2026-09-10
-- mañana) resultó insuficiente en la práctica; se probó TEXT
-- (2026-09-10 tarde) y finalmente se fijó en VARCHAR(500) a pedido
-- explícito. Mismo problema ya corregido antes para orders.code_cid
-- en migration_code_cid_255.sql.
-- --------------------------------------------------------

ALTER TABLE atestados
  MODIFY COLUMN cid VARCHAR(500) NULL;

ALTER TABLE formula_leite
  MODIFY COLUMN cid VARCHAR(500) NULL;
