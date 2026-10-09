-- --------------------------------------------------------
-- Migración: quitar el texto pre-escrito de los perfiles de laudo
--
-- CLINICA SAUDE CAMPINAS venía sembrada con una base info y una narrativa
-- COMPLETA de ejemplo, con CIDs y el diagnóstico de un paciente real. Peor:
-- el fallback de formato de la UI (getLaudoProfileFor() en
-- src/lib/laudoClinic.ts) heredaba ese texto a TODAS las clínicas que no
-- tuvieran perfil propio, así que el texto de un paciente terminaba en
-- formularios — y potencialmente en PDFs firmados — de otras clínicas.
--
-- El sistema no debe traer texto pre-escrito: la base info y la narrativa las
-- escribe el médico para cada paciente, y cada clínica carga las suyas desde
-- el editor de perfil de laudo (ícono de lápiz arriba del formulario de
-- Laudo), que ya permite guardar texto propio por clínica.
--
-- ALCANCE — borra solo el texto que venía del seed:
--   · la fila de Campinas (name_key `clinicasaudecampinas`: "CLINICA SAUDE
--     CAMPINAS", "CLINICA SAÚDE CAMPINAS" y "clinica_saude_campinas"
--     normalizan a esa misma key), y
--   · cualquier fila que contenga LITERALMENTE ese texto (por si se copió a
--     otra clínica o quedó de una corrida anterior de la unificación).
-- NO toca el texto que el médico haya escrito para su propia clínica: eso se
-- edita desde la pantalla, no desde acá.
--
-- Idempotente: se puede correr de más de una vez sin efectos.
--
--   mysql --default-character-set=utf8mb4 -u USER -p DB < migration_limpar_texto_laudo_clinics.sql
-- --------------------------------------------------------

SET NAMES utf8mb4;

-- La tabla que LEE la app hoy es clinic_profiles (ver lib/laudoProfiles.php);
-- se limpia primero para que el texto desaparezca de la app de inmediato.
UPDATE clinic_profiles
   SET base_info         = NULL,
       default_narrative = NULL
 WHERE name_key = 'clinicasaudecampinas'
    OR base_info = 'Segundo informações prestadas pela(o) paciente, averiguadas em registros de prontuários médicos e exames complementares.'
    OR default_narrative LIKE 'Declaro que o referido paciente encontra-se em seguimento por Ansiedade%';

-- laudo_clinics es la tabla vieja (precursor de clinic_profiles) y de donde
-- migration_unify_clinics.sql copia los perfiles. Se limpia también para que
-- una futura corrida de esa migración no vuelva a copiar el texto.
-- Es condicional porque en instalaciones ya unificadas (las más nuevas) esa
-- tabla directamente no existe y el UPDATE revienta con error 1146.
SET @old_table := (
  SELECT COUNT(*) FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'laudo_clinics'
);
SET @clear_old := IF(@old_table > 0,
  'UPDATE laudo_clinics
      SET base_info         = NULL,
          default_narrative = NULL
    WHERE clinic_name IN (''CLINICA SAUDE CAMPINAS'', ''clinica_saude_campinas'')
       OR base_info = ''Segundo informações prestadas pela(o) paciente, averiguadas em registros de prontuários médicos e exames complementares.''
       OR default_narrative LIKE ''Declaro que o referido paciente encontra-se em seguimento por Ansiedade%''',
  'DO 0');
PREPARE st FROM @clear_old;
EXECUTE st;
DEALLOCATE PREPARE st;

-- --------------------------------------------------------
-- Verificación
-- --------------------------------------------------------
SELECT name_key,
       IF(base_info IS NULL OR base_info = '', 'vazio', 'TEXTO')         AS base_info,
       IF(default_narrative IS NULL OR default_narrative = '', 'vazio', 'TEXTO') AS narrativa
  FROM clinic_profiles
 WHERE has_laudo_profile = 1
 ORDER BY name_key;
