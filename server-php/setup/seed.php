<?php
/**
 * Seed de producción — ejecutar UNA VEZ tras importar el schema.sql
 * Crea el usuario médico titular si no existe.
 *
 * Uso desde CLI:
 *   php setup/seed.php
 *
 * O abrir en el navegador una sola vez:
 *   https://tudominio.com/api/setup/seed.php
 *   (luego eliminar o proteger este archivo)
 */
require_once __DIR__ . '/../config/database.php';

// ── Configuración del usuario titular ──────────────────────────────────────
$PROD_EMAIL    = 'jmcabello_merida@hotmail.com';
$PROD_PASSWORD = 'password'; // Cambia esto antes de ejecutar en producción
$PROD_NAME     = 'Dr. Juan Marcelo Cabello Mérida';
$PROD_SPEC     = 'Neurología Clínica y Neurofisiología';
$PROD_CRM      = '123456';
$PROD_RQE      = '98765';
// ────────────────────────────────────────────────────────────────────────────

$pdo = getDB();

// ── Crear tablas auxiliares si no existen ────────────────────────────────
$pdo->exec("CREATE TABLE IF NOT EXISTS login_attempts (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_time (ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
echo "✔ Tabla login_attempts verificada.\n";

$pdo->exec("CREATE TABLE IF NOT EXISTS order_counter (
    year INT NOT NULL PRIMARY KEY,
    seq  INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
echo "✔ Tabla order_counter verificada.\n";

// Remove demo accounts
$demoEmails = ['doctor@neuro.com', 'demo@neuro.com', 'test@neuro.com'];
$in         = implode(',', array_fill(0, count($demoEmails), '?'));
$stmt       = $pdo->prepare("DELETE FROM users WHERE email IN ($in)");
$stmt->execute($demoEmails);
$deleted = $stmt->rowCount();
if ($deleted > 0) {
    echo "✔ $deleted cuenta(s) demo eliminada(s).\n";
}

// Create production user if not exists
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$PROD_EMAIL]);
$existing = $stmt->fetch();

if (!$existing) {
    $id   = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
    $hash = password_hash($PROD_PASSWORD, PASSWORD_BCRYPT);
    $now  = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare(
        'INSERT INTO users (id, name, email, password_hash, specialty, crm_license, rqe_specialty, registration_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$id, $PROD_NAME, $PROD_EMAIL, $hash, $PROD_SPEC, $PROD_CRM, $PROD_RQE, $now]);
    echo "✔ Usuario creado: $PROD_EMAIL\n";
} else {
    echo "✔ Usuario ya existe: $PROD_EMAIL\n";
}

echo "✔ Seed completado.\n";
