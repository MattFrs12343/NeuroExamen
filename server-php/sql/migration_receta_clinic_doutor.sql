-- --------------------------------------------------------
-- Migración: nueva clínica "DOUTOR CLINICA E LABORATÓRIO"
--
-- Agrega la clínica con perfil completo a `receta_clinics`
-- (selector de Recetas y Atestados) y su nombre a `clinics`
-- (Pedidos / Encaminhamentos).
--
-- Idempotente: INSERT con ON DUPLICATE KEY UPDATE / INSERT IGNORE,
-- se puede ejecutar más de una vez sin duplicar datos.
--
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_receta_clinic_doutor.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- 1. Perfil completo en receta_clinics (Recetas + Atestados)
INSERT INTO receta_clinics (name, secretaria, sistema, address, phone, cnpj)
VALUES (
  'DOUTOR CLINICA E LABORATÓRIO',
  NULL,
  NULL,
  'Av. Papa João Paulo I, 3086 - Jardim Pres. Dutra, Guarulhos/SP - CEP: 07174-000',
  '11 98958 0281 | 11 94772 5760',
  NULL
)
ON DUPLICATE KEY UPDATE
  address = VALUES(address),
  phone   = VALUES(phone);

-- 2. Nombre en clinics (Pedidos / Encaminhamentos)
INSERT IGNORE INTO clinics (name) VALUES ('DOUTOR CLINICA E LABORATÓRIO');
