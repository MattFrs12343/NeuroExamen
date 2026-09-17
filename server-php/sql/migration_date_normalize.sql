-- --------------------------------------------------------
-- Migración: Fechas en formato único (DD/MM/YYYY → ISO)
--
-- Hasta ahora dos módulos guardaban las fechas escritas a mano por el
-- médico en formato brasileño (15/09/2026) mientras el resto usaba ISO
-- (2026-09-15). Eso rompía los filtros por fecha, el orden de columnas y
-- las vistas previas de impresión (que esperan ISO).
--
-- Esta migración NO toca nada del resto de tablas (laudos, orders, recetas,
-- encaminhamentos, receituarios) porque ahí `date` ya era ISO.
--
-- Normaliza las columnas de `atestados` y `formula_leite` que puedan tener
-- formato brasileño, dejando intactas las que ya están en ISO (el WHERE con
-- el regex solo matchea DD/MM/YYYY).
--
-- Ejecutar una vez en producción (phpMyAdmin o consola). Es idempotente.
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- --------------------------------------------------------
-- atestados : fechas simples (dd/mm/aaaa)
-- --------------------------------------------------------
UPDATE atestados
   SET care_date         = DATE_FORMAT(STR_TO_DATE(care_date, '%d/%m/%Y'), '%Y-%m-%d')
 WHERE care_date REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$';

UPDATE atestados
   SET patient_birth_date = DATE_FORMAT(STR_TO_DATE(patient_birth_date, '%d/%m/%Y'), '%Y-%m-%d')
 WHERE patient_birth_date REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$';

-- --------------------------------------------------------
-- atestados : fecha-hora (dd/mm/aaaa - HH:MM:SS)
-- --------------------------------------------------------
UPDATE atestados
   SET issued_at = DATE_FORMAT(STR_TO_DATE(issued_at, '%d/%m/%Y - %H:%i:%s'), '%Y-%m-%d %H:%i:%s')
 WHERE issued_at REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4} - [0-9]{2}:[0-9]{2}:[0-9]{2}$';

UPDATE atestados
   SET signed_at = DATE_FORMAT(STR_TO_DATE(signed_at, '%d/%m/%Y - %H:%i:%s'), '%Y-%m-%d %H:%i:%s')
 WHERE signed_at REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4} - [0-9]{2}:[0-9]{2}:[0-9]{2}$';

-- --------------------------------------------------------
-- formula_leite : fechas simples (dd/mm/aaaa)
-- --------------------------------------------------------
UPDATE formula_leite
   SET first_consult_date = DATE_FORMAT(STR_TO_DATE(first_consult_date, '%d/%m/%Y'), '%Y-%m-%d')
 WHERE first_consult_date REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$';

UPDATE formula_leite
   SET patient_birth_date = DATE_FORMAT(STR_TO_DATE(patient_birth_date, '%d/%m/%Y'), '%Y-%m-%d')
 WHERE patient_birth_date REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$';

UPDATE formula_leite
   SET footer_date = DATE_FORMAT(STR_TO_DATE(footer_date, '%d/%m/%Y'), '%Y-%m-%d')
 WHERE footer_date REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$';

UPDATE formula_leite
   SET data_retorno = DATE_FORMAT(STR_TO_DATE(data_retorno, '%d/%m/%Y'), '%Y-%m-%d')
 WHERE data_retorno REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$';

UPDATE formula_leite
   SET previsao_provocacao = DATE_FORMAT(STR_TO_DATE(previsao_provocacao, '%d/%m/%Y'), '%Y-%m-%d')
 WHERE previsao_provocacao REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$';