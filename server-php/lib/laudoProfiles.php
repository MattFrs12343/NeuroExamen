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
 * Alias de logo — el catálogo guarda el MISMO consultório con más de una
 * escritura ("CLINICA SÃO LUIZ", "CLINICA MEDICA SÃO LUIZ",
 * "CLINICA MEDICA PARQUE SÃO LUIZ"), pero en assets hay un solo archivo. Esta
 * tabla mapea la key normalizada de cada variante al archivo real, así ninguna
 * se queda sin membrete.
 *
 * SÃO LUIZ: el original (ClinicasLaudos/SAO LUIZ.docx) es de Av. Papa João
 * Paulo I, Jd. Pres. Dutra, Guarulhos — 389x114, el mismo que
 * assets/logo-clinicamedicaparquesaoluiz.png.
 *
 * DOCS SAÚDE: mismo consultório, dos catálogos con nombre distinto —
 * `clinics` (Pedidos) la tiene como "DOCS SUA CLINICA DE SAÚDE"
 * (key docssuaclinicadesaude) pero el archivo subido se llama según el
 * nombre usado en Recetas/Laudo, "CLINICA DOC SAUDE"
 * (assets/logo-clinicadocsaude.png). Sin este alias, los pedidos de esa
 * clínica salían sin marca de agua porque la key no coincidía con ningún
 * archivo.
 *
 * HABIB: en clinic_profiles hay DOS filas para el mismo consultório
 * ("CLINICA HABIB", id 33, key clinicahabib — la usada al subir
 * assets/logo-clinicahabib.png) y ("CLINICA HABIB CONSULTAS E XAMES", id 9,
 * key clinicahabibconsultasexames — la que aparece realmente en el selector
 * de Pedidos). Sin este alias, elegir la segunda no encontraba el logo.
 */
function laudo_logo_aliases(): array {
    static $map = [
        'clinicasaoluiz'      => 'clinicamedicaparquesaoluiz',
        'clinicamedicasaoluiz' => 'clinicamedicaparquesaoluiz',
        'docssuaclinicadesaude' => 'clinicadocsaude',
        'clinicahabibconsultasexames' => 'clinicahabib',
    ];
    return $map;
}

/**
 * Archivo de disco con el logo de la clínica (server-php/assets/logo-*.png),
 * usando exclusivamente clinic_key() — sin tocar la BD.
 *
 * Resolución:
 *   1. Se escanean los archivos assets/logo-*.png y cada nombre se normaliza
 *      con clinic_key() (se le quita el prefijo 'logo-' y la extensión y luego
 *      se aplica clinic_key tal cual): así un archivo que se llame
 *      'logo-PRO-CLINICA AMERICANA.png' queda en la key 'proclinicaamericana'
 *      exactamente igual que el nombre fiscal.
 *   2. Se busca el que coincida con clinic_key() del templateId/clinicName.
 *      Si no hay coincidencia exacta se prueba la tabla de alias
 *      laudo_logo_aliases() (mismo consultório con otra escritura).
 *   3. Si la clínica es Campinas, además del nombre canónico se acepta su
 *      archivo histórico logo-saude-campinas.png.
 *
 * Si la clínica no tiene archivo propio devuelve null — NO hay logo genérico de
 * la plataforma: cada clínica muestra su propia marca o ninguna.
 *
 * Devuelve la RUTA del archivo (o null si no hay ninguno).
 */
function getLaudoLogoFile(PDO $pdo, ?string $templateId, ?string $clinicName = null): ?string {
    $assetsDir = __DIR__ . '/../assets/';

    $byKey = [];
    foreach (glob($assetsDir . 'logo-*.png') ?: [] as $file) {
        $stem = preg_replace('/^logo-/i', '', pathinfo($file, PATHINFO_FILENAME));
        $k = clinic_key($stem);
        if ($k !== '') $byKey[$k] = $file;
    }
    if ($byKey === []) return null;

    foreach (array_unique(array_filter([
        laudoClinicKey($templateId) ?: null,
        laudoClinicKey($clinicName) ?: null,
    ])) as $k) {
        if (isset($byKey[$k])) return $byKey[$k];
        // Mismo consultório escrito de otra forma ("CLINICA SÃO LUIZ" vs
        // "CLINICA MEDICA PARQUE SÃO LUIZ") → su archivo es el mismo.
        $alias = laudo_logo_aliases()[$k] ?? null;
        if ($alias !== null && isset($byKey[$alias])) return $byKey[$alias];
    }

    // Campinas: el archivo histórico se llama distinto de la key canónica.
    if (isLaudoCampinasClinic($templateId, $clinicName)
        && isset($byKey['saudecampinas'])) {
        return $byKey['saudecampinas'];
    }

    // Sin logo propio: null. Antes devolvía logo-neuromobius.png y eso pintaba
    // la marca de la plataforma en el membrete de clínicas que no son ella.
    return null;
}

/**
 * Devuelve la fila de clinic_profiles del perfil de laudo PROPIO de la
 * clínica (sin el fallback genérico de Campinas). A diferencia de
 * getLaudoProfileRow(), acá NO se agrega 'clinica_saude_campinas' a la lista
 * de keys: una clínica sin perfil de laudo propio devuelve null.
 *
 * Se usa para resolver el LOGO — el logo NO se hereda: cada clínica muestra
 * su propia marca o ninguna, nunca la de la clínica "formato".
 */
function getLaudoOwnProfileRow(PDO $pdo, ?string $templateId, ?string $clinicName = null): ?array {
    $keys = [];
    if ($templateId) $keys[] = $templateId;
    if ($clinicName) $keys[] = $clinicName;

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

/**
 * Logo del laudo por clínica como data URI base64 (para TCPDF con prefijo '@'
 * y para <img src="data:..."> en el frontend).
 *
 * Orden de resolución:
 *   1. El `logo` guardado en el perfil de laudo PROPIO de la clínica en
 *      `clinic_profiles` (subido desde la UI). NO se usa el fallback genérico
 *      de Campinas: antes, al resolver con getLaudoProfileRow(), cualquier
 *      clínica sin perfil propio (ej: "+DOUTOR CLINICA E LABORATÓRIO")
 *      terminaba con el logo de Campinas en su membrete.
 *   2. El `assets/logo-*.png` de la propia clínica en disco (resuelto por
 *      clinic_key() — ver getLaudoLogoFile).
 *
 * Sin logo propio devuelve null: una clínica sin marca se imprime sin membrete
 * (el layout reserva el hueco igual), nunca con el logo de otra clínica.
 */
function getLaudoLogoDataUri(PDO $pdo, ?string $templateId, ?string $clinicName = null): ?string {
    $own = getLaudoOwnProfileRow($pdo, $templateId, $clinicName);
    if ($own && !empty($own['logo'])) {
        return $own['logo'];
    }

    $file = getLaudoLogoFile($pdo, $templateId, $clinicName);
    if ($file !== null && is_file($file)) {
        $mime = mime_content_type($file) ?: 'image/png';
        return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($file));
    }
    return null;
}