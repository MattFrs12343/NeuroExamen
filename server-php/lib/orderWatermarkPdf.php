<?php
/**
 * TCPDF+FPDI con marca de agua del logo de la clínica del PEDIDO en todas
 * las hojas — mismo mecanismo que LaudoWatermarkPdf (lib/laudoWatermarkPdf.php),
 * pero extendiendo \setasign\Fpdi\Tcpdf\Fpdi en vez de TCPDF puro: Pedidos
 * necesita además importPage()/useTemplate() para empalmar las páginas
 * capturadas de los exámenes genéricos (ver api/orders/signed-pdf.php).
 * Header() dibuja ANTES del contenido de cada hoja (lo que incluye el
 * useTemplate() de una página capturada, opaca) — así que la marca solo
 * queda visible debajo del texto vectorial de los documentos especializados,
 * nunca debajo de una página capturada (la tapa el raster).
 */
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/clinicKey.php';
require_once __DIR__ . '/laudoProfiles.php';

class OrderWatermarkFpdi extends \setasign\Fpdi\Tcpdf\Fpdi {
    /** PNG del logo de la clínica ya decodificado, o null = sin marca. */
    public ?string $wmBin = null;

    public function Header(): void {
        if ($this->wmBin === null) {
            return;
        }
        $imgDim = @getimagesizefromstring($this->wmBin);
        if ($imgDim === false || (int) $imgDim[0] <= 0) {
            return;
        }
        $wmW = 160;
        $wmH = $wmW * ($imgDim[1] / $imgDim[0]);
        $pw  = $this->getPageWidth();
        $ph  = $this->getPageHeight();
        $this->SetAlpha(0.15);
        $this->Image('@' . $this->wmBin, ($pw - $wmW) / 2, ($ph - $wmH) / 2, $wmW, 0, 'PNG');
        $this->SetAlpha(1.0);
    }
}

/**
 * Logo de la clínica del pedido como data URI (para pasarle '@'.base64 a
 * Image()) — primero la base de datos (clinic_profiles.logo, CUALQUIER
 * clínica activa, sin el filtro has_laudo_profile que usa Laudos), después
 * el archivo estático assets/logo-{clinica}.png que ya usa Laudos. null si
 * la clínica no tiene logo en ningún lado (el pedido sale sin marca).
 */
function getOrderClinicLogoDataUri(PDO $pdo, ?string $clinicName): ?string {
    if (!$clinicName) return null;
    $key = clinic_key($clinicName);
    if ($key === '') return null;

    $stmt = $pdo->prepare('SELECT logo FROM clinic_profiles WHERE name_key = ? AND active = 1 LIMIT 1');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if ($row && !empty($row['logo'])) {
        return $row['logo'];
    }

    $file = getLaudoLogoFile($pdo, null, $clinicName);
    if ($file !== null && is_file($file)) {
        $mime = mime_content_type($file) ?: 'image/png';
        return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($file));
    }
    return null;
}
