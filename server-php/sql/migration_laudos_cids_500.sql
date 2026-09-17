-- --------------------------------------------------------
-- Migración: ampliar laudos.cids de VARCHAR(60) a VARCHAR(500)
--
-- Mismo bug class ya corregido en migration_cid_255.sql para
-- atestados.cid y formula_leite.cid: el campo es texto libre
-- (el médico escribe uno o varios códigos CID, ej.
-- "CID 10 F33 + CID 10 F40 + CID 10 F41.9"), y con VARCHAR(60)
-- un narrative/diagnóstico un poco más largo trunca el INSERT:
--   SQLSTATE[22001]: String data, right truncated:
--   1406 Data too long for column 'cids' at row 1
-- Al truncar el INSERT/UPDATE, PHP no llega a devolver JSON y el
-- frontend falla con "Unexpected end of JSON input".
-- --------------------------------------------------------

ALTER TABLE laudos
  MODIFY COLUMN cids VARCHAR(500) NULL;
