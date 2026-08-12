-- --------------------------------------------------------
-- Migración: backfill de `patients.address` desde recetas existentes
--
-- La migración `migration_patients_address.sql` solo crea la columna;
-- los pacientes ya existentes quedan con address = NULL aunque tengan
-- recetas antiguas con `patient_address` cargado. Este script copia,
-- para cada paciente, el `patient_address` de su receta más reciente
-- que tenga ese dato, hacia `patients.address`.
--
-- Es idempotente y seguro de re-ejecutar: solo completa pacientes que
-- todavía tienen address vacío, nunca pisa una dirección ya guardada
-- (por ejemplo, una editada a mano después del deploy).
-- --------------------------------------------------------

SET NAMES utf8mb4;

UPDATE patients p
JOIN (
  SELECT r.patient_id, r.patient_address
  FROM recetas r
  JOIN (
    SELECT patient_id, MAX(created_at) AS max_created
    FROM recetas
    WHERE patient_address IS NOT NULL AND patient_address <> ''
    GROUP BY patient_id
  ) latest
    ON latest.patient_id = r.patient_id
   AND latest.max_created = r.created_at
   AND r.patient_address IS NOT NULL AND r.patient_address <> ''
) addr ON addr.patient_id = p.id
SET p.address = addr.patient_address
WHERE p.address IS NULL OR p.address = '';
