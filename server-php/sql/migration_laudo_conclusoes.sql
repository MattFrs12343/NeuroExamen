-- --------------------------------------------------------
-- Migración: catálogo de "Conclusão Pericial" administrable
--
-- Antes la Conclusão Pericial eran 3 valores fijos y hardcodeados
-- ('apto' | 'inapto_temporario' | 'inapto_definitivo') en el frontend
-- (NewLaudo.tsx), en la plantilla de impresión (PrintLaudoTemplate.tsx) y
-- en el PDF firmado (api/laudos/signed-pdf.php). Esta migración la vuelve una
-- lista que el médico administra: agregar, editar (cambiar el texto) y
-- eliminar opciones.
--
-- IMPORTANTE — POR QUÉ EL LAUDO GUARDA UN SNAPSHOT DE LA LISTA:
-- el PDF de un laudo firmado es un documento legal. Si el médico edita o
-- borra una opción DESPUÉS de firmar, el texto de un laudo ya emitido no
-- puede cambiar (la verificación pública descarga ese mismo PDF). Por eso
-- `laudos.conclusao` guarda el id de la opción elegida y
-- `laudos.conclusao_opcoes` guarda la lista COMPLETA tal como se veía al
-- firmar, en JSON. Es el mismo criterio que ya usa el módulo para el emisor
-- (doctor_name / clinic_address / clinic_phone se snapshotan).
--
-- Las filas existentes se backfillean con las 3 opciones originales, así que
-- los laudos ya firmados siguen imprimiendo exactamente lo mismo que antes.
--
-- Es idempotente: se puede correr de nuevo sin duplicar datos.
--
-- Si se corre por consola, usar charset utf8mb4 para no corromper acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_laudo_conclusoes.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- ── 1. Catálogo de opciones ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laudo_conclusoes (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  label      VARCHAR(500) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  created_by CHAR(36)     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_laudo_conclusoes_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed con las 3 opciones que ya existían hardcodeadas. Se conservan los ids
-- originales para que `laudos.conclusao` siga apuntando a la misma opción.
-- Los textos son los de lib/laudoConclusoes.php::laudo_conclusoes_default() y
-- coinciden con i18n.ts (laudo_apto / laudo_inapto_temporario /
-- laudo_inapto_definitivo) — que pasan a ser solo el texto por defecto.
INSERT INTO laudo_conclusoes (id, label, sort_order) VALUES
  ('apto',                'Apto(a) para atividades laborais',                     1),
  ('inapto_temporario',   'Inapto(a) temporariamente para atividades laborais',   2),
  ('inapto_definitivo',   'Inapto(a) definitivamente para atividades laborais',  3)
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

-- ── 2. Snapshot de la lista en cada laudo ───────────────────────────────────
-- `conclusao` pasa de VARCHAR(40) a VARCHAR(64): las opciones nuevas reciben
-- ids del estilo 'concl-<16 hex>' (como custom_exams / medications).
ALTER TABLE laudos MODIFY COLUMN conclusao VARCHAR(64) NULL;

-- Reejecutable: sólo agrega la columna si todavía no existe.
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'laudos'
     AND COLUMN_NAME = 'conclusao_opcoes'
);
SET @add_col := IF(@has_col = 0,
  'ALTER TABLE laudos ADD COLUMN conclusao_opcoes TEXT NULL AFTER conclusao',
  'DO 0');
PREPARE st FROM @add_col;
EXECUTE st;
DEALLOCATE PREPARE st;

-- ── 3. Backfill: laudos con conclusión pero sin snapshot ────────────────────
-- Se les pega la lista original de 3 opciones, idéntica a la que se imprimía
-- antes de esta migración. Un laudo nuevo sin conclusión marcada NO lleva
-- snapshot (sección vacía = no se imprime), igual que antes.
UPDATE laudos
   SET conclusao_opcoes = '[{"id":"apto","label":"Apto(a) para atividades laborais"},{"id":"inapto_temporario","label":"Inapto(a) temporariamente para atividades laborais"},{"id":"inapto_definitivo","label":"Inapto(a) definitivamente para atividades laborais"}]'
 WHERE conclusao IS NOT NULL
   AND conclusao <> ''
   AND (conclusao_opcoes IS NULL OR conclusao_opcoes = '');

-- ── Verificación ─────────────────────────────────────────────────────────────
SELECT id, label, sort_order FROM laudo_conclusoes ORDER BY sort_order ASC;
SELECT CONCAT('laudos con snapshot de conclusão = ', COUNT(*)) AS resultado
  FROM laudos WHERE conclusao_opcoes IS NOT NULL AND conclusao_opcoes <> '';
