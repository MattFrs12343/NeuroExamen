-- --------------------------------------------------------
-- Migración: catálogo de estudios personalizados
--
-- Crea la tabla `custom_exams`. Cada vez que un médico crea un
-- estudio personalizado desde "Nuevo Pedido", queda guardado aquí
-- y aparece disponible para todos los pedidos futuros (no hay que
-- volver a crearlo).
--
-- Ejecutar una vez en la base de producción (phpMyAdmin o consola).
-- Es idempotente: se puede correr de nuevo sin duplicar datos.
--
-- IMPORTANTE: si se corre por consola, usar charset utf8mb4 para no
-- corromper los acentos:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_custom_exams.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS custom_exams (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  name       VARCHAR(500) NOT NULL,
  created_by CHAR(36)     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_exams_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
