<?php
/**
 * Clave canónica de clínica — el sistema guarda las clínicas en UNA sola
 * tabla (`clinic_profiles`, migración migration_unify_clinics.sql) y las
 * identifica por `name_key`: nombre en minúsculas, sin acentos ni signos.
 *
 * Esto unifica variantes del mismo sitio escritas con mayúsculas/minúsculas
 * o con/sin acentos (ej: "CLINICA SAÚDE CAMPINAS", "CLINICA SAUDE CAMPINAS"
 * y "clinica_saude_campinas" → la MISMA key `clinicasaudecampinas`).
 *
 * El frontend replica esta normalización en src/lib/clinic.ts
 * (normalizeClinicKey), con la misma salida en minúsculas [a-z0-9].
 */

function clinic_key(?string $s): string {
    $s = (string)$s;
    if (function_exists('iconv')) {
        $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
        if (is_string($t)) $s = $t;
    } elseif (function_exists('mb_convert_encoding')) {
        $s = mb_convert_encoding($s, 'ASCII', 'UTF-8');
    }
    return strtolower((string)preg_replace('/[^a-z0-9]/i', '', (string)$s));
}