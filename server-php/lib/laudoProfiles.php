<?php
/**
 * Perfil de Laudo por clínica — se lee de la tabla única `clinic_profiles`
 * (migración migration_unify_clinics.sql), identificando la fila por
 * `name_key` (clave canónica sin mayúsculas ni acentos).
 *
 * Los datos del emisor (doctor_name, doctor_crm, clinic_name_fiscal,
 * clinic_address, clinic_phone) se snapshotean además en la fila de
 * `laudos` al crear el registro, pero base_info, default_narrative, local y
 * logo_path NO se versionan por laudo: son siempre los del perfil ACTUAL de
 * la clínica, así que el generador de PDF firmado (api/laudos/signed-pdf.php)
 * los resuelve acá consultando la base.
 *
 * getLaudoProfileRow() busca por template_id (que hoy es el NOMBRE de la
 * clínica elegida en el dropdown) y, si no, por clinic_name (snapshot en la
 * fila) y por la key interna vieja 'clinica_saude_campinas' (laudos creados
 * antes de la generalización por clínica). Todas esas claves se normalizan
 * con clinic_key() así que apuntan a la misma fila de clinic_profiles.
 */
require_once __DIR__ . '/clinicKey.php';

/**
 * Devuelve la fila de clinic_profiles que matchee, o null.
 *
 * Solo se buscan filas con has_laudo_profile = 1: los documentos históricos
 * que no tengan perfil de laudo propio (ej: "+DOUTOR CLINICA E LABORATÓRIO",
 * que en la migración quedó con perfil de receta pero sin datos de laudo)
 * deben seguir resolviendo al perfil genérico (Campinas), igual que antes de
 * la unificación. Cuando una de esas clínicas guarde su perfil de laudo
 * (POST /api/laudo-clinics -> has_laudo_profile = 1), empieza a resolver a
 * la suya.
 */
function getLaudoProfileRow(PDO $pdo, ?string $templateId, ?string $clinicName = null): ?array {
    $keys = [];
    if ($templateId) $keys[] = $templateId;
    if ($clinicName) $keys[] = $clinicName;
    $keys[] = 'clinica_saude_campinas'; // compatibilidad: key interna de laudos viejos

    foreach (array_unique(array_filter($keys)) as $k) {
        $key = clinic_key($k);
        $stmt = $pdo->prepare('SELECT * FROM clinic_profiles WHERE name_key = ? AND active = 1 AND has_laudo_profile = 1 LIMIT 1');
        $stmt->execute([$key]);
        try {
            $row = $stmt->fetch();
        } catch (Exception $e) {
            continue; // tabla no existe aún — comportarse como sin perfil
        }
        if ($row) return $row;
    }
    return null;
}

/** Párrafo fijo "Base de informações" del laudo, o '' si la clínica no tiene. */
function getLaudoBaseInfo(PDO $pdo, ?string $templateId, ?string $clinicName = null): string {
    $row = getLaudoProfileRow($pdo, $templateId, $clinicName);
    return $row['base_info'] ?? '';
}

/** Narrativa con la que arranca la plantilla (editable por el médico). */
function getLaudoDefaultNarrative(PDO $pdo, ?string $templateId): ?string {
    $row = getLaudoProfileRow($pdo, $templateId);
    return $row['default_narrative'] ?? null;
}

/** Local por defecto (ciudad - UF), ej: "Campinas - SP". */
function getLaudoLocal(PDO $pdo, ?string $templateId): ?string {
    $row = getLaudoProfileRow($pdo, $templateId);
    return $row['local'] ?? null;
}

/** Doctor del laudo por clínica (fallback si la fila no tiene snapshot). */
function getLaudoDoctorName(PDO $pdo, ?string $templateId, ?string $fallback = null): ?string {
    $row = getLaudoProfileRow($pdo, $templateId);
    return $row['doctor_name'] ?? $fallback;
}

/** CRM del doctor (fallback si la fila no tiene snapshot). */
function getLaudoDoctorCrm(PDO $pdo, ?string $templateId, ?string $fallback = null): ?string {
    $row = getLaudoProfileRow($pdo, $templateId);
    return $row['doctor_crm'] ?? $fallback;
}

/**
 * Pasa 'CLINICA SAUDE CAMPINAS' / 'clinica_saude_campinas' / etc. a una key
 * canónica (minúsculas, sin acentos ni caracteres especiales) para comparar
 * nombres. IMPORTANTE: debe ser accent-insensitive — receta guarda
 * "CLINICA SAÚDE CAMPINAS" (con tilde) y laudo "SAUDE" (sin),
 * y el fallback del logo / la detección de Campinas dependen de que ambos
 * normalicen a la MISMA key.
 */
function laudoClinicKey(?string $s): string {
    return clinic_key($s);
}

/** TRUE si el nombre/template corresponde a la clínica Campinas. */
function isLaudoCampinasClinic(?string $templateId, ?string $clinicName = null): bool {
    return laudoClinicKey($templateId) === 'clinicasaudecampinas'
        || (($clinicName !== null) && laudoClinicKey($clinicName) === 'clinicasaudecampinas');
}

/**
 * Logo del laudo por clínica como data URI base64 (para TCPDF con prefijo '@'
 * y para <img src="data:..."> en el frontend).
 *
 * Orden de resolución:
 *   1. El `logo` guardado en `clinic_profiles` (subido desde la UI).
 *   2. Si la clínica es Campinas y no tiene logo propio, el archivo
 *      server-php/assets/logo-saude-campinas.png (el logo original, que vive
 *      en disco y no en la BD).
 * Otras clínicas sin logo devuelven null — el membretado sale sin logo.
 */
function getLaudoLogoDataUri(PDO $pdo, ?string $templateId, ?string $clinicName = null): ?string {
    $row = getLaudoProfileRow($pdo, $templateId, $clinicName);
    if ($row && !empty($row['logo'])) {
        return $row['logo'];
    }
    if (isLaudoCampinasClinic($templateId, $clinicName)) {
        $file = __DIR__ . '/../assets/logo-saude-campinas.png'; // lib/ -> raíz server-php
        if (file_exists($file)) {
            $mime = mime_content_type($file) ?: 'image/png';
            return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($file));
        }
    }
    return null;
}