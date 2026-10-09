<?php
/**
 * TCPDF con marca de agua del logo de la clínica en TODAS las hojas.
 *
 * Usado por api/laudos/signed-pdf.php y por tests/laudo-multi-footer-test.php
 * (la clase vive aparte para que el test ejercite EXACTAMENTE el mismo
 * código que corre en producción, no una copia).
 *
 * ── Por qué una subclase y no dibujar la marca a mano ────────────────────
 * Antes la marca se pintaba en 3 puntos explícitos del endpoint (página 1,
 * la página en la que terminaba el cuerpo, y la página nueva que creaba el
 * rollback del bloque de firma). Pero TCPDF crea páginas POR SU CUENTA en
 * checkPageBreak() cada vez que se desborda SetAutoPageBreak(true, 20)
 * (narrativa larga, observações largas) y esas hojas no pasaban por
 * ninguno de los 3 puntos: salían sin marca de agua. Síntoma exacto —
 * "solo sale en la primera y en la última, donde va la firma".
 *
 * El hook estándar de TCPDF lo resuelve: startPage() llama setHeader()
 * (tcpdf.php) en CADA AddPage() — el normal, el automático de
 * checkPageBreak() y el posterior a rollbackTransaction() — y setHeader()
 * invoca Header() con _outSaveGraphicsState() ya abierto. Como Header()
 * corre al principio de la hoja, la marca queda DETRÁS de todo el contenido
 * (en PDF el último dibujo es el que va adelante). Además inPageBody()
 * devuelve false dentro del header, así que la llamada a Image() no puede
 * disparar una paginación recursiva.
 *
 * Hay que llamar setPrintHeader(true) en el endpoint: sin eso TCPDF salta
 * Header() (setHeader() retorna temprano cuando !print_header).
 *
 * Sin logo ($wmBin === null) la hoja sale sin marca: nunca se usa el logo
 * de otra clínica como marca de agua.
 */

// Registra el autoloader de Composer (TCPDF) — el endpoint ya lo cargó vía
// lib/signing.php, esto es require_once y no duplica nada.
require_once __DIR__ . '/../vendor/autoload.php';

class LaudoWatermarkPdf extends TCPDF {
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
        // Mismo look que PrintLaudoTemplate.tsx: centrada, 140mm de ancho,
        // alto proporcional (height:auto), alpha 0.07.
        $wmW = 140;
        $wmH = $wmW * ($imgDim[1] / $imgDim[0]);
        $pw  = $this->getPageWidth();
        $ph  = $this->getPageHeight();
        $this->SetAlpha(0.07);
        $this->Image('@' . $this->wmBin, ($pw - $wmW) / 2, ($ph - $wmH) / 2, $wmW, 0, 'PNG');
        $this->SetAlpha(1.0);
    }
}
