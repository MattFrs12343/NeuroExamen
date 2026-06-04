FPDF — Librería PHP para generación de PDF sin dependencias externas
====================================================================

Descarga requerida:
  http://www.fpdf.org/  →  versión 1.86

Instrucciones:
  1. Descargar fpdf186.zip desde http://www.fpdf.org/
  2. Extraer el archivo fpdf.php a esta carpeta:
     server-php/lib/fpdf/fpdf.php

El archivo fpdf.php NO está incluido en el repositorio porque es una
librería de terceros. Solo se necesita ese único archivo.

Alternativa: si tu hosting tiene Composer disponible, puedes usar:
  composer require setasign/fpdf
y ajustar el require en api/orders/pdf.php.
