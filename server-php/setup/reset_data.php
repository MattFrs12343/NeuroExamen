<?php
/**
 * reset_data.php — Elimina SOLO pedidos y pacientes de prueba.
 * Preserva: usuarios, credenciales y catálogo de exámenes.
 *
 * Uso CLI:
 *   php setup/reset_data.php
 *
 * O una vez en el navegador:
 *   http://localhost/neuro-api/setup/reset_data.php
 *
 * ADVERTENCIA: Esta operación es irreversible. No ejecutar en producción
 * con datos reales sin hacer un backup previo.
 */

// ── Protección mínima: solo desde CLI o con clave ─────────────────────────
$isCliMode = PHP_SAPI === 'cli';

if (!$isCliMode) {
    // En el navegador, requiere pasar ?confirm=RESET para ejecutar
    if (!isset($_GET['confirm']) || $_GET['confirm'] !== 'RESET') {
        http_response_code(400);
        echo json_encode([
            'error'   => 'Confirmación requerida.',
            'uso'     => 'Agrega ?confirm=RESET a la URL para ejecutar.',
            'ejemplo' => 'http://localhost/neuro-api/setup/reset_data.php?confirm=RESET',
        ]);
        exit;
    }
    header('Content-Type: application/json');
}

require_once __DIR__ . '/../config/database.php';

$pdo = getDB();

$log   = [];
$error = null;

try {
    $pdo->beginTransaction();

    // ── 1. Eliminar relaciones de exámenes en pedidos ─────────────────────
    $stmt = $pdo->exec('DELETE FROM order_exams');
    $log[] = "order_exams eliminados: $stmt filas";

    // ── 2. Eliminar pedidos ───────────────────────────────────────────────
    $stmt = $pdo->exec('DELETE FROM orders');
    $log[] = "orders eliminados: $stmt filas";

    // ── 3. Eliminar pacientes ─────────────────────────────────────────────
    $stmt = $pdo->exec('DELETE FROM patients');
    $log[] = "patients eliminados: $stmt filas";

    // ── 4. Verificar que usuarios y exámenes están intactos ───────────────
    $users = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $exams = $pdo->query('SELECT COUNT(*) FROM exams')->fetchColumn();
    $log[] = "users preservados: $users";
    $log[] = "exams (catálogo) preservados: $exams";

    $pdo->commit();

    $result = [
        'status' => 'ok',
        'mensaje' => 'Reset completado. Datos de prueba eliminados. Credenciales y catálogo de exámenes preservados.',
        'detalle' => $log,
    ];

} catch (Throwable $e) {
    $pdo->rollBack();
    $result = [
        'status' => 'error',
        'mensaje' => 'Error durante el reset. Se revirtieron todos los cambios.',
        'error'   => $e->getMessage(),
    ];
    $error = $e;
}

// ── Output ────────────────────────────────────────────────────────────────
if ($isCliMode) {
    echo "\n── reset_data.php ───────────────────────────────────\n";
    foreach ($log as $line) {
        echo "  ✔ $line\n";
    }
    if ($error) {
        echo "  ✖ ERROR: " . $error->getMessage() . "\n";
        exit(1);
    }
    echo "\n✔ " . $result['mensaje'] . "\n\n";
} else {
    http_response_code($error ? 500 : 200);
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
