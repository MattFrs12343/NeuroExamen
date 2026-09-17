-- --------------------------------------------------------
-- Migración: alta/corrección de la clínica "+DOUTOR CLINICA E
-- LABORATÓRIO" (consistente con el naming "+DOUTOR" usado por
-- "CLINICA +DOUTOR PRESIDENTE DUTRA").
--
-- Cubre dos escenarios posibles en la base real:
--   1. La clínica ya existe como "DOUTOR CLINICA E LABORATÓRIO"
--      (dada de alta por migration_receta_clinic_doutor.sql) -> se
--      renombra a "+DOUTOR CLINICA E LABORATÓRIO".
--   2. La clínica todavía no existe (esa migración nunca se corrió
--      en esta base) -> se da de alta directamente con el nombre
--      nuevo, con el mismo perfil (dirección/teléfono) que iba a
--      usar migration_receta_clinic_doutor.sql.
--
-- Actualiza ambas tablas (`clinics` para Pedidos / Encaminhamentos,
-- `receta_clinics` para Recetas / Atestados). Idempotente: se puede
-- correr más de una vez sin duplicar ni fallar. No afecta pedidos/
-- recetas ya emitidos (guardan el nombre como snapshot de texto al
-- momento de la emisión).
--
-- Ejecutar una sola vez:
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_clinic_doutor_plus.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- 1. Tabla `clinics` (Pedidos / Encaminhamentos)
UPDATE clinics
SET name = '+DOUTOR CLINICA E LABORATÓRIO'
WHERE name = 'DOUTOR CLINICA E LABORATÓRIO';

INSERT IGNORE INTO clinics (name) VALUES ('+DOUTOR CLINICA E LABORATÓRIO');

-- 2. Tabla `receta_clinics` (Recetas / Atestados — perfil completo)
UPDATE receta_clinics
SET name = '+DOUTOR CLINICA E LABORATÓRIO'
WHERE name = 'DOUTOR CLINICA E LABORATÓRIO';

INSERT INTO receta_clinics (name, secretaria, sistema, address, phone, cnpj)
VALUES (
  '+DOUTOR CLINICA E LABORATÓRIO',
  NULL,
  NULL,
  'Av. Papa João Paulo I, 3086 - Jardim Pres. Dutra, Guarulhos/SP - CEP: 07174-000',
  '11 98958 0281 | 11 94772 5760',
  NULL
)
ON DUPLICATE KEY UPDATE
  address = VALUES(address),
  phone   = VALUES(phone);
