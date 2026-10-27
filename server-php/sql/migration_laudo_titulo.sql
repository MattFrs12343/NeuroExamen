-- --------------------------------------------------------
-- Migración: título del laudo elegible por documento
--
-- Antes el título impreso era un literal fijo, "LAUDO PERICIAL MÉDICO",
-- hardcodeado en tres lugares (i18n.ts, PrintLaudoTemplate.tsx y
-- api/laudos/signed-pdf.php). Ahora el médico elige, laudo por laudo (no es
-- un default de clínica como el resto del perfil), entre esa variante y
-- "LAUDO MÉDICO" (versión corta) — ver NewLaudo.tsx (selector arriba del
-- título) y Laudo.tituloTipo en src/types/index.ts.
--
-- Las filas existentes quedan en 'pericial' (DEFAULT), que es el título
-- histórico — ningún laudo ya firmado cambia su texto.
--
-- Es idempotente: se puede correr de nuevo sin romper nada.
--
-- Si se corre por consola, usar charset utf8mb4 para no corromper acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_laudo_titulo.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'laudos'
     AND COLUMN_NAME = 'titulo_tipo'
);
SET @add_col := IF(@has_col = 0,
  "ALTER TABLE laudos ADD COLUMN titulo_tipo ENUM('pericial','medico') NOT NULL DEFAULT 'pericial' AFTER template_id",
  'DO 0');
PREPARE st FROM @add_col;
EXECUTE st;
DEALLOCATE PREPARE st;

-- ── Verificación ─────────────────────────────────────────────────────────────
SELECT titulo_tipo, COUNT(*) AS total FROM laudos GROUP BY titulo_tipo;
