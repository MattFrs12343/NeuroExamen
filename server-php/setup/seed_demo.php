<?php
/**
 * seed_demo.php — Inserta pacientes y pedidos de DEMO para probar la paginación.
 *
 * Uso:
 *   php setup/seed_demo.php
 *   o abrir una vez en el navegador: https://tudominio.com/api/setup/seed_demo.php
 *
 * AVISO: Solo para desarrollo/testing. No ejecutar en producción con datos reales.
 */
require_once __DIR__ . '/../config/database.php';

$pdo = getDB();

// ── Buscar el usuario titular para asignarle los pedidos ─────────────────
$stmt = $pdo->query('SELECT id, name FROM users LIMIT 1');
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    die("✖ No hay ningún usuario en la base de datos. Ejecuta seed.php primero.\n");
}

$userId   = $user['id'];
$userName = $user['name'];

// ── Función para generar UUID v4 ─────────────────────────────────────────
function uuid(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0,0xffff), mt_rand(0,0xffff),
        mt_rand(0,0xffff),
        mt_rand(0,0x0fff)|0x4000,
        mt_rand(0,0x3fff)|0x8000,
        mt_rand(0,0xffff), mt_rand(0,0xffff), mt_rand(0,0xffff)
    );
}

// ── Pacientes de demo ────────────────────────────────────────────────────
$demoPacientes = [
    ['Maria Silva Santos',        '123.456.789-01', 45],
    ['João Carlos Oliveira',      '234.567.890-12', 62],
    ['Ana Beatriz Fernandes',     '345.678.901-23', 38],
    ['Carlos Eduardo Mendes',     '456.789.012-34', 55],
    ['Luciana Aparecida Costa',   '567.890.123-45', 41],
    ['Roberto Alves Pereira',     '678.901.234-56', 70],
    ['Fernanda Lima Rodrigues',   '789.012.345-67', 33],
    ['Paulo Roberto Nascimento',  '890.123.456-78', 58],
    ['Juliana Moreira Carvalho',  '901.234.567-89', 47],
    ['Marcos Antônio Vieira',     '012.345.678-90', 66],
    ['Patrícia Gonçalves Souza',  '111.222.333-44', 52],
    ['André Luís Barbosa',        '222.333.444-55', 39],
    ['Camila Dias Araújo',        '333.444.555-66', 29],
    ['Ricardo Santos Martins',    '444.555.666-77', 74],
    ['Vanessa Rocha Lima',        '555.666.777-88', 44],
    ['Diego Henrique Batista',    '666.777.888-99', 31],
    ['Cristiane Ferreira Nunes',  '777.888.999-00', 60],
    ['Felipe Augusto Ramos',      '888.999.000-11', 48],
    ['Simone Aparecida Teixeira', '999.000.111-22', 53],
    ['Bruno César Cavalcanti',    '100.200.300-40', 36],
];

// ── Exámenes disponibles para los pedidos de demo ────────────────────────
$examesDisponiveis = [
    ['eeg-01'],
    ['pev-01', 'pev-02'],
    ['enm-sup-01', 'enm-sup-02'],
    ['enm-inf-01', 'enm-inf-02'],
    ['rm-01', 'rm-03'],
    ['tc-01'],
    ['eeg-01', 'pev-01'],
    ['enm-sup-01', 'enm-inf-01'],
    ['rm-01', 'rm-07', 'rm-08'],
    ['cog-01', 'cog-02'],
    ['us-01'],
    ['est-01', 'est-02'],
    ['fac-01'],
    ['din-01'],
    ['rm-02', 'rm-05'],
];

// ── CIDs de demo ─────────────────────────────────────────────────────────
$cids = ['G40.9','G35','G20','G43.9','G51.0','G47.3','G62.9','G72.9','G80.0','G93.1',
         'G25.0','G30.9','G45.9','G50.0','G60.0'];

// ── Statuses de demo ─────────────────────────────────────────────────────
$statuses = ['Concluido','Concluido','Concluido','Pendiente','Concluido',
             'Cancelado','Concluido','Pendiente','Concluido','Concluido'];

$pacienteIds = [];
$inserted    = 0;
$skipped     = 0;

echo "── Insertando pacientes ─────────────────────────────\n";

foreach ($demoPacientes as [$nome, $cpf, $idade]) {
    // Verificar si ya existe
    $chk = $pdo->prepare('SELECT id FROM patients WHERE identity_card = ?');
    $chk->execute([$cpf]);
    $exist = $chk->fetch();

    if ($exist) {
        $pacienteIds[] = $exist['id'];
        echo "  · Ya existe: $nome\n";
        $skipped++;
    } else {
        $pid = uuid();
        $ins = $pdo->prepare('INSERT INTO patients (id, name, identity_card, age) VALUES (?, ?, ?, ?)');
        $ins->execute([$pid, $nome, $cpf, $idade]);
        $pacienteIds[] = $pid;
        echo "  ✔ Creado: $nome\n";
        $inserted++;
    }
}

echo "\n── Insertando pedidos ───────────────────────────────\n";

$ordersInserted = 0;
$baseDate       = new DateTime('2025-01-01');

// Generar 40 pedidos distribuidos a lo largo de 2025-2026
for ($i = 0; $i < 40; $i++) {
    // Generar ID estilo ORD-XXXXXX
    $orderId = 'DEMO-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT);

    // Verificar si ya existe
    $chk = $pdo->prepare('SELECT id FROM orders WHERE id = ?');
    $chk->execute([$orderId]);
    if ($chk->fetch()) {
        echo "  · Ya existe: $orderId\n";
        continue;
    }

    // Datos del pedido
    $patientId = $pacienteIds[$i % count($pacienteIds)];
    $interval  = new DateInterval('P' . ($i * 9) . 'D'); // cada ~9 días
    $date      = clone $baseDate;
    $date->add($interval);
    $dateStr   = $date->format('Y-m-d');
    $cid       = $cids[$i % count($cids)];
    $status    = $statuses[$i % count($statuses)];
    $exams     = $examesDisponiveis[$i % count($examesDisponiveis)];

    // Insertar pedido
    $ins = $pdo->prepare(
        'INSERT INTO orders (id, patient_id, user_id, date, code_cid, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())'
    );
    $ins->execute([$orderId, $patientId, $userId, $dateStr, $cid, $status]);

    // Insertar exámenes del pedido
    $insExam = $pdo->prepare('INSERT IGNORE INTO order_exams (order_id, exam_id) VALUES (?, ?)');
    foreach ($exams as $examId) {
        $insExam->execute([$orderId, $examId]);
    }

    echo "  ✔ Pedido $orderId — $dateStr — CID: $cid — Status: $status\n";
    $ordersInserted++;
}

echo "\n── Resumen ──────────────────────────────────────────\n";
echo "  Pacientes creados : $inserted\n";
echo "  Pacientes omitidos: $skipped\n";
echo "  Pedidos creados   : $ordersInserted\n";
echo "✔ seed_demo.php completado.\n";
