<?php
/**
 * Catálogo de la "Conclusão Pericial" del Laudo Pericial Médico.
 *
 * Antes eran 3 valores fijos hardcodeados en el frontend y en el PDF. Ahora
 * viven en la tabla `laudo_conclusoes` (migración
 * migration_laudo_conclusoes.sql) y el médico los administra: agrega, edita el
 * texto y elimina.
 *
 * La fila del laudo guarda el id de la opción elegida en `conclusao` y la lista
 * COMPLETA en `conclusao_opcoes` (JSON), porque el PDF firmado es un documento
 * legal: si la opción se edita o borra después, un laudo ya emitido no puede
 * cambiar de texto. Es el mismo criterio que ya se usa para el emisor.
 */

/**
 * Las 3 opciones originales, hardcodeadas. Sirven de:
 *   - seed de la tabla (migration_laudo_conclusoes.sql), y
 *   - red de seguridad para laudos viejos con `conclusao` pero SIN snapshot
 *     (base migrada a medias): sin esto, un laudo previo a la migración
 *     imprimiría la sección de conclusión vacía.
 *
 * Los ids son los mismos que se guardan en `laudos.conclusao` desde siempre.
 */
function laudo_conclusoes_default(): array {
    return [
        ['id' => 'apto',              'label' => 'Apto(a) para atividades laborais'],
        ['id' => 'inapto_temporario', 'label' => 'Inapto(a) temporariamente para atividades laborais'],
        ['id' => 'inapto_definitivo', 'label' => 'Inapto(a) definitivamente para atividades laborais'],
    ];
}

/**
 * Normaliza el JSON de `conclusao_opcoes` a la misma forma que
 * laudo_conclusoes_default(): lista de ['id' => ..., 'label' => ...] sin
 * entradas vacías. Si el snapshot falta o está corrupto, cae en las 3
 * opciones por defecto.
 *
 * @return array<int, array{id: string, label: string}>
 */
function laudo_conclusoes_parse(?string $json): array {
    $json = trim((string)$json);
    if ($json === '') return laudo_conclusoes_default();

    $decoded = json_decode($json, true);
    if (!is_array($decoded)) return laudo_conclusoes_default();

    // Tiene que ser una LISTA de opciones ([{...},{...}]). Un objeto suelto
    // (assoc) es un payload mal formado: iterarlo daría vueltas sobre sus
    // valores y descartaría todo. Se comprueba a mano porque array_is_list()
    // es PHP 8.1 y el proyecto corre en 8.0.
    if ($decoded !== [] && array_keys($decoded) !== range(0, count($decoded) - 1)) {
        return laudo_conclusoes_default();
    }

    $out = [];
    foreach ($decoded as $opt) {
        if (!is_array($opt)) continue;
        $id    = trim((string)($opt['id']    ?? ''));
        $label = trim((string)($opt['label'] ?? ''));
        if ($id === '' || $label === '') continue;
        $out[] = ['id' => $id, 'label' => $label];
    }
    return $out ?: laudo_conclusoes_default();
}

/**
 * Catálogo actual desde la base, en orden de aparición. Si la tabla todavía
 * no existe (migración no aplicada) devuelve null para que el llamador use
 * laudo_conclusoes_default().
 *
 * @return array<int, array{id: string, label: string}>|null
 */
function laudo_conclusoes_catalog(PDO $pdo): ?array {
    try {
        $stmt = $pdo->query('SELECT id, label FROM laudo_conclusoes ORDER BY sort_order ASC, created_at ASC, id ASC');
        $rows = $stmt->fetchAll();
    } catch (Exception $e) {
        return null; // tabla no existe aún — el llamador usa el default
    }
    if (!$rows) return null;

    $out = [];
    foreach ($rows as $r) {
        $id    = trim((string)($r['id'] ?? ''));
        $label = trim((string)($r['label'] ?? ''));
        if ($id === '' || $label === '') continue;
        $out[] = ['id' => $id, 'label' => $label];
    }
    return $out ?: null;
}

/** Catálogo de la base o, si no hay tabla / está vacía, las 3 por defecto. */
function laudo_conclusoes_or_default(PDO $pdo): array {
    return laudo_conclusoes_catalog($pdo) ?? laudo_conclusoes_default();
}

/** El texto de la opción elegida, o '' si no hay ninguna / no se encuentra. */
function laudo_conclusoes_label(array $options, ?string $id): string {
    $id = trim((string)$id);
    if ($id === '') return '';
    foreach ($options as $opt) {
        if ($opt['id'] === $id) return $opt['label'];
    }
    return '';
}

/**
 * Corta el request con 503 si falta la migración del catálogo de conclusões.
 *
 * Sin este chequeo, guardar un laudo contra una base sin migrar revienta con
 * un PDOException NO capturado ("Unknown column 'conclusao_opcoes'" o la tabla
 * `laudo_conclusoes` inexistente). Con display_errors=Off eso es un 500 de
 * cuerpo VACÍO, y el navegador muestra el inútil "Unexpected end of JSON input".
 * Los GET no pasan por acá: leen con fallbacks (`$row['conclusao_opcoes'] ??
 * null` y laudo_conclusoes_catalog()) y la app sigue funcionando sin migrar.
 */
function laudo_conclusoes_require_schema(PDO $pdo): void {
    try {
        $pdo->query('SELECT 1 FROM laudo_conclusoes LIMIT 1');
        $pdo->query('SELECT conclusao_opcoes FROM laudos LIMIT 1');
    } catch (PDOException $e) {
        http_response_code(503);
        echo json_encode([
            'error' => 'Falta aplicar la migración de Conclusão Pericial. '
                     . 'Ejecutá server-php/sql/migration_laudo_conclusoes.sql en la base.',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
