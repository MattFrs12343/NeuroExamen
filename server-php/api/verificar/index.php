<?php
/**
 * GET /api/verificar/{kind}/{token}
 * Página pública (sin autenticación) que muestra los datos REALES de un
 * documento firmado a partir de su código de verificación — es a esto que
 * apunta el QR de los PDF firmados, en vez de a validar.iti.gov.br directo.
 * validar.iti.gov.br es una herramienta de SUBIDA MANUAL de archivo: no
 * muestra nada si sólo se visita la URL, así que un QR que apunte ahí sin
 * más deja al que escanea sin ninguna confirmación visual. Esta página sí
 * muestra algo al instante — pero es honesta sobre lo que prueba: confirma
 * que el documento existe en el sistema con estos datos, no reemplaza la
 * verificación criptográfica de la firma PAdES (para esa, el enlace a
 * validar.iti.gov.br sigue estando, con instrucciones).
 *
 * El código de acceso de 4 dígitos (mismo que va en el mensaje de WhatsApp,
 * junto al link) es obligatorio para ver los datos completos y descargar el
 * PDF — sin él, solo se confirma el nombre del paciente y el tipo de
 * documento (para que sepa que está en la página correcta antes de meter el
 * código). El PDF firmado en sí solo existe en disco si el documento ya fue
 * firmado con "Assinar e Imprimir" — ver signPdfOutput() en lib/signing.php.
 *
 * GET /api/verificar/{kind}/{token}/pdf?code={accessCode} sirve el PDF
 * guardado, revalidando el código server-side (no alcanza con adivinar la
 * URL del PDF, hay que tener también el código).
 *
 * $kind identifica de qué tabla leer — Atestados, Recetas, Pedidos,
 * Encaminhamentos y Fórmulas Infantis comparten esta misma página; cada
 * uno sólo aporta su propio mapeo de columnas en $DOCUMENT_KINDS.
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../lib/doctor.php';
require_once __DIR__ . '/../../lib/signing.php';

$path   = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts  = explode('/', $path);
$idx    = array_search('verificar', $parts);
$kind   = ($idx !== false && isset($parts[$idx + 1])) ? $parts[$idx + 1] : null;
$token  = ($idx !== false && isset($parts[$idx + 2])) ? strtoupper(trim($parts[$idx + 2])) : null;
$action = ($idx !== false && isset($parts[$idx + 3])) ? $parts[$idx + 3] : null;

$esc = fn($v) => htmlspecialchars((string) ($v ?? ''), ENT_QUOTES, 'UTF-8');

// Dates se guardan SIEMPRE en ISO (YYYY-MM-DD o YYYY-MM-DD HH:MM:SS) — se
// muestran en dd/mm/aaaa (ignorando la hora), como en el resto del sistema.
$fmtDate = function (?string $d): ?string {
    if (!$d) { return null; }
    $trimmed = trim($d);
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $trimmed, $m)) {
        $parts = explode('-', $m[0]);
        return "{$parts[2]}/{$parts[1]}/{$parts[0]}";
    }
    return $trimmed;
};

function renderPage(string $bodyHtml, int $status = 200): void {
    header('Content-Type: text/html; charset=UTF-8');
    http_response_code($status);
    echo '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8">'
       . '<meta name="viewport" content="width=device-width, initial-scale=1">'
       . '<title>Verificação de Documento — NeuroExámenes</title>'
       . '<style>
            *{box-sizing:border-box;}
            html,body{width:100%;overflow-x:hidden;}
            body{margin:0;min-height:100vh;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif;color:#111827;padding:24px 16px;display:flex;align-items:center;justify-content:center;}
            .card{width:100%;max-width:440px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);padding:32px 28px;overflow-wrap:break-word;}
            .brand{font-size:12px;font-weight:700;letter-spacing:0.06em;color:#0F4C81;text-transform:uppercase;margin:0 0 18px 0;}
            .badge{display:flex;align-items:center;gap:10px;margin-bottom:20px;}
            .badge-icon{width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;}
            .ok .badge-icon{background:#DCFCE7;color:#16A34A;}
            .err .badge-icon{background:#FEE2E2;color:#DC2626;}
            .badge-text{font-size:16px;font-weight:800;}
            .ok .badge-text{color:#15803D;}
            .err .badge-text{color:#B91C1C;}
            .info{margin:4px 0 18px 0;}
            .info-row{padding:9px 0;border-bottom:1px solid #F1F5F9;}
            .info-label{color:#9CA3AF;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px;}
            .info-value{color:#111827;font-weight:600;font-size:14px;overflow-wrap:break-word;word-break:break-word;}
            .token{display:inline-block;font-family:"Courier New",monospace;font-weight:700;letter-spacing:0.08em;background:#F1F5F9;color:#0F4C81;padding:2px 8px;border-radius:6px;font-size:12.5px;}
            .note{font-size:11.5px;color:#6B7280;line-height:1.6;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin-top:6px;}
            .note b{color:#0F4C81;}
            .note a{color:#0F4C81;font-weight:700;text-decoration:none;}
            p.msg{font-size:14px;color:#4B5563;line-height:1.6;}
            .code-panel{background:#FAFBFC;border:1px solid #E5E9F0;border-radius:16px;padding:28px 24px;margin-top:18px;text-align:center;}
            .code-icon{width:52px;height:52px;border-radius:14px;background:linear-gradient(145deg,#12588f,#0a3a63);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 6px 14px rgba(15,76,129,0.28);}
            .code-icon svg{width:24px;height:24px;}
            .code-panel-title{font-size:14.5px;font-weight:800;color:#111827;margin:0 0 6px;letter-spacing:-0.01em;}
            .code-panel-sub{font-size:12.5px;color:#6B7280;line-height:1.55;margin:0 0 22px;}
            form.code-form{margin-top:0;}
            .code-input{width:100%;font-family:"Courier New",monospace;font-size:30px;letter-spacing:0.55em;text-indent:0.55em;text-align:center;padding:14px 12px;border:2px solid #DCE3EC;border-radius:12px;font-weight:700;color:#0F4C81;background:#fff;margin-bottom:16px;transition:border-color .15s ease,box-shadow .15s ease;}
            .code-input::placeholder{color:#D6DEE8;letter-spacing:0.55em;}
            .code-input:focus{outline:none;border-color:#0F4C81;box-shadow:0 0 0 4px rgba(15,76,129,0.12);}
            .btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;text-align:center;background:linear-gradient(145deg,#12588f,#0a3a63);color:#fff;font-weight:700;font-size:14px;padding:13px;border:0;border-radius:12px;cursor:pointer;text-decoration:none;box-shadow:0 3px 8px rgba(15,76,129,0.3);transition:filter .15s ease,transform .1s ease,box-shadow .15s ease;}
            .btn:hover{filter:brightness(1.08);box-shadow:0 5px 12px rgba(15,76,129,0.35);}
            .btn:active{transform:translateY(1px);}
            .btn svg{width:16px;height:16px;flex-shrink:0;}
            .btn-download{background:linear-gradient(145deg,#1a9c50,#15803D);margin-top:14px;box-shadow:0 3px 8px rgba(21,128,61,0.3);}
            .btn-download:hover{box-shadow:0 5px 12px rgba(21,128,61,0.35);}
            .error-box{display:flex;align-items:center;gap:8px;background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;font-size:12.5px;font-weight:600;padding:10px 12px;border-radius:8px;margin:0 0 14px;text-align:left;}
          </style></head><body>'
       . '<div class="card">'
       . '<p class="brand">NeuroExámenes</p>'
       . $bodyHtml
       . '</div></body></html>';
    exit;
}

function notFoundPage(?string $token): void {
    renderPage(
        '<div class="badge err"><div class="badge-icon">&times;</div><div class="badge-text">Documento não encontrado</div></div>'
      . '<p class="msg">Não existe nenhum documento com o código <span class="token">' . htmlspecialchars((string) ($token ?? ''), ENT_QUOTES, 'UTF-8') . '</span> em nosso sistema.</p>',
        404
    );
}

// Mapa de tipos de documento — cada uno sólo aporta cómo leer "quién firma"
// y "cuándo", el resto de la página (tarjeta, mensajes, nota legal) es
// compartido. Atestados y Recetas ya guardan nombre/CRM del médico y
// dirección de clínica propios; Pedidos y Encaminhamentos usan las mismas
// columnas de clínica (agregadas junto con la firma) pero el médico fijo
// del sistema; Fórmulas Infantis firma con el profesional del formulario y
// CNS/CPF en vez de CRM.
$DOCUMENT_KINDS = [
    'atestados' => [
        'table'      => 'atestados',
        'label'      => 'Atestado Médico',
        'doctorName' => fn($r) => $r['doctor_name'] ?: DOCTOR_NAME,
        'doctorDoc'  => fn($r) => $r['doctor_crm'] ?: DOCTOR_CRM,
        'signedAt'   => fn($r) => $fmtDate($r['signed_at'] ?: ($r['issued_at'] ?? null)),
    ],
    'recetas' => [
        'table'      => 'recetas',
        'label'      => 'Receita Médica',
        'doctorName' => fn($r) => DOCTOR_NAME,
        'doctorDoc'  => fn($r) => DOCTOR_CRM,
        'signedAt'   => fn($r) => $fmtDate($r['date'] ?? null),
    ],
    'orders' => [
        'table'      => 'orders',
        'label'      => 'Pedido de Exames',
        'doctorName' => fn($r) => DOCTOR_NAME,
        'doctorDoc'  => fn($r) => DOCTOR_CRM,
        'signedAt'   => fn($r) => $fmtDate($r['date'] ?? null),
    ],
    'encaminhamentos' => [
        'table'      => 'encaminhamentos',
        'label'      => 'Encaminhamento Médico',
        'doctorName' => fn($r) => DOCTOR_NAME,
        'doctorDoc'  => fn($r) => DOCTOR_CRM,
        'signedAt'   => fn($r) => $fmtDate($r['date'] ?? null),
    ],
    'formula-leite' => [
        'table'      => 'formula_leite',
        'label'      => 'Solicitação de Fórmula Infantil Especial',
        'doctorName' => fn($r) => $r['professional_name'] ?: DOCTOR_NAME,
        'doctorDoc'  => fn($r) => !empty($r['doctor_cpf']) ? ('CPF ' . $r['doctor_cpf']) : null,
        'signedAt'   => fn($r) => $fmtDate($r['footer_date'] ?: ($r['first_consult_date'] ?? null)),
    ],
    // Receituário não tem paciente (texto livre em papel timbrado de uma
    // clínica) — 'hasPatient' => false pula o JOIN com `patients` e troca a
    // linha "Paciente" da página pública pela clínica emissora.
    'receituarios' => [
        'table'      => 'receituarios',
        'label'      => 'Receituário Médico',
        'hasPatient' => false,
        'doctorName' => fn($r) => DOCTOR_NAME,
        'doctorDoc'  => fn($r) => DOCTOR_CRM,
        'signedAt'   => fn($r) => $r['created_at'] ?? null,
    ],
    // Laudo Pericial: lleva los datos del paciente en columnas propias
    // (texto libre, sin JOIN con `patients` — ver api/laudos/index.php).
    // 'patientColumn' acá no menciona la columna real que se muestra como
    // "Paciente" sin hacer el JOIN de `patients`, igual que Recetas.
    'laudos' => [
        'table'      => 'laudos',
        'label'      => 'Laudo Médico Pericial',
        'hasPatient' => true,
        'patientColumn' => 'patient_name',
        'doctorName' => fn($r) => $r['doctor_name'] ?: DOCTOR_NAME,
        'doctorDoc'  => fn($r) => $r['doctor_crm'] ?: DOCTOR_CRM,
        'signedAt'   => fn($r) => $r['created_at'] ?? null,
    ],
];

if (!$kind || !$token || !isset($DOCUMENT_KINDS[$kind])) {
    renderPage(
        '<div class="badge err"><div class="badge-icon">&times;</div><div class="badge-text">Código não informado</div></div>'
      . '<p class="msg">O link de verificação está incompleto ou é inválido.</p>',
        400
    );
}

$cfg   = $DOCUMENT_KINDS[$kind];
$table = $cfg['table'];

$hasPatient = $cfg['hasPatient'] ?? true;
$patientColumn = $cfg['patientColumn'] ?? null;

$pdo = getDB();
try {
    // Si una tabla lleva el nombre del paciente como columna propia
    // ('patientColumn', ejemplo: laudos), se lee directo — sin JOIN con
    // `patients` (no hay patient_id). Caso contrario, el JOIN clásico.
    if ($hasPatient && $patientColumn) {
        $sql = "SELECT d.* FROM `$table` d WHERE d.token = ?";
    } else {
        $sql = $hasPatient
            ? "SELECT d.*, p.name AS patient_name FROM `$table` d JOIN patients p ON p.id = d.patient_id WHERE d.token = ?"
            : "SELECT d.* FROM `$table` d WHERE d.token = ?";
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$token]);
    $doc = $stmt->fetch();
} catch (PDOException $e) {
    // Puede pasar mientras una sección todavía no tiene la migración de
    // firma aplicada (columna `token` inexistente) — se trata igual que
    // "no encontrado" en vez de exponer el error de SQL crudo.
    $doc = false;
}

if (!$doc) {
    notFoundPage($token);
}

$codeSubmitted = trim($_GET['code'] ?? '');
$codeValid     = !empty($doc['access_code']) && hash_equals((string) $doc['access_code'], $codeSubmitted);
$codeWasTried  = $codeSubmitted !== '';

// ------------------------------------------------------------------
// GET /api/verificar/{kind}/{token}/pdf?code=XXXX — sirve el PDF firmado
// guardado en disco. Revalida el código acá mismo (no alcanza con conocer
// la URL del link de verificación).
// ------------------------------------------------------------------
if ($action === 'pdf') {
    if (!$codeValid) {
        renderPage(
            '<div class="badge err"><div class="badge-icon">&times;</div><div class="badge-text">Código de acesso inválido</div></div>'
          . '<p class="msg">Não foi possível confirmar o código de acesso para baixar este documento.</p>',
            403
        );
    }
    if (!hasSavedSignedPdf($table, $doc['id'])) {
        renderPage(
            '<div class="badge err"><div class="badge-icon">&times;</div><div class="badge-text">Documento ainda não disponível</div></div>'
          . '<p class="msg">Este documento ainda não foi assinado digitalmente pelo médico responsável.</p>',
            404
        );
    }
    $pdfPath = signedPdfStoragePath($table, $doc['id']);
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $kind . '_' . $doc['id'] . '.pdf"');
    header('Content-Length: ' . filesize($pdfPath));
    readfile($pdfPath);
    exit;
}

// ------------------------------------------------------------------
// Página HTML — sin código válido, solo confirma paciente + tipo de
// documento y pide el código. Con código válido, muestra todo + descarga.
// ------------------------------------------------------------------
if (!$codeValid) {
    $errorHtml = ($codeWasTried)
        ? '<div class="error-box">&#9888; Código de acesso incorreto. Confira o código enviado junto ao link no WhatsApp.</div>'
        : '';
    $subjectName = $hasPatient ? $doc['patient_name'] : ($doc['clinic_name'] ?? DOCTOR_NAME);
    renderPage(
        '<div class="badge ok"><div class="badge-icon">&#10003;</div><div class="badge-text">Documento encontrado</div></div>'
      . '<p class="msg">Documento de <b>' . $esc($subjectName) . '</b> — ' . $esc($cfg['label']) . '.</p>'
      . '<div class="code-panel">'
      . '<div class="code-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 11V8a6 6 0 1 1 12 0v3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="11" width="16" height="10" rx="2.5" stroke="#fff" stroke-width="2"/><circle cx="12" cy="16" r="1.6" fill="#fff"/></svg></div>'
      . '<p class="code-panel-title">Acesso protegido</p>'
      . '<p class="code-panel-sub">Digite o código de 4 dígitos enviado junto ao link no WhatsApp para ver os detalhes e baixar o documento.</p>'
      . '<form class="code-form" method="GET">'
      . $errorHtml
      . '<input class="code-input" type="text" name="code" placeholder="••••" maxlength="4" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" autofocus>'
      . '<button class="btn" type="submit">Confirmar código</button>'
      . '</form>'
      . '</div>'
    );
}

$signedAt   = $cfg['signedAt']($doc) ?: '—';
$doctorName = $cfg['doctorName']($doc);
$doctorDoc  = $cfg['doctorDoc']($doc);

$row = fn($label, $value) => '<div class="info-row"><div class="info-label">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</div><div class="info-value">' . $value . '</div></div>';

$rows  = $row('Tipo de documento', $esc($cfg['label']));
$rows .= $hasPatient
    ? $row('Paciente', $esc($doc['patient_name']))
    : $row('Clínica', $esc($doc['clinic_name'] ?? '—'));
$rows .= $row('Emitido por', $esc($doctorName) . ($doctorDoc ? ' — ' . $esc($doctorDoc) : ''));
$rows .= $row('Assinado em', $esc($signedAt));
$rows .= $row('Código', '<span class="token">' . $esc($doc['token']) . '</span>');

$hasPdf = hasSavedSignedPdf($table, $doc['id']);
$pdfUrl = rtrim(resolveApiBase(), '/') . '/verificar/' . $kind . '/' . $token . '/pdf?code=' . urlencode($codeSubmitted);
$downloadIcon = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
$downloadHtml = $hasPdf
    ? '<a class="btn btn-download" href="' . $esc($pdfUrl) . '" target="_blank" rel="noopener">' . $downloadIcon . 'Abrir documento assinado (PDF)</a>'
    : '<p class="note">Este documento ainda não foi assinado digitalmente — o PDF estará disponível aqui assim que o médico responsável concluir a assinatura.</p>';

renderPage(
    '<div class="badge ok"><div class="badge-icon">&#10003;</div><div class="badge-text">Documento verificado</div></div>'
  . '<div class="info">' . $rows . '</div>'
  . $downloadHtml
  . '<div class="note" style="margin-top:14px;">Esta confirmação foi gerada pelo sistema NeuroExámenes a partir dos registros do documento. '
  . 'Para a <b>verificação criptográfica completa</b> da assinatura digital (ICP-Brasil), acesse '
  . '<a href="https://validar.iti.gov.br" target="_blank" rel="noopener">validar.iti.gov.br</a> e envie o arquivo PDF.</div>'
);
