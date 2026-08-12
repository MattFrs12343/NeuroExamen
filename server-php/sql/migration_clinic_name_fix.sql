-- --------------------------------------------------------
-- Migración: corrección de nombre de clínica y alta de una
-- nueva clínica de Recetas.
--
--   1. "CLINICA HABID CONSULTAS E XAMES"  ->  "CLINICA HABIB CONSULTAS E XAMES"
--      (la tabla `clinics` de Pedidos ya tiene "CLINICA HABIB" correcta).
--   2. Alta de "PRÓ CLÍNICA VÁRZEA PAULISTA" con perfil completo para
--      mostrarse al imprimir recetas.
--
-- Ejecutar una sola vez:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_clinic_name_fix.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- 1. Corregir "HABID" -> "HABIB" en el selector de clínicas de Recetas
UPDATE receta_clinics
SET name = 'CLINICA HABIB CONSULTAS E XAMES'
WHERE name = 'CLINICA HABID CONSULTAS E XAMES';

-- 2. Incluir PRÓ CLÍNICA VÁRZEA PAULISTA en la sección de Recetas
INSERT INTO receta_clinics (name, address, phone, active)
VALUES (
  'PRÓ CLÍNICA VÁRZEA PAULISTA',
  CONCAT_WS(CHAR(10),
    'Rua Prof. Joaquim Candelário de Freitas, 222',
    'Jd. São Gonçalo - Várzea Paulista - SP',
    'CEP 13220-330'
  ),
  CONCAT_WS(CHAR(10),
    '(11) 4606-0272 • 4596-5927',
    '(11) 94459-6900'
  ),
  1
)
ON DUPLICATE KEY UPDATE
  address = VALUES(address),
  phone   = VALUES(phone);
