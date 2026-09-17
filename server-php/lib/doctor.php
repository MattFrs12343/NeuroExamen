<?php
/**
 * Datos fijos del médico responsable — mismo valor que src/lib/doctor.ts
 * del lado del frontend. Atestados y Recetas ya guardan un snapshot de
 * nombre/CRM/dirección en su propia fila; Pedidos, Encaminhamentos y
 * Fórmulas Infantis no tienen esas columnas, así que sus signed-pdf.php
 * usan estas constantes directamente en vez de leerlas de la base.
 */
const DOCTOR_NAME    = 'Dr(a). Juan Marcelo Cabello Merida';
const DOCTOR_CRM     = 'CRM 161792 SP';
const DOCTOR_ADDRESS = 'Rua Otacílio de Albuquerque, 95 Vila Maria Alta - São Paulo SP - CEP 02125020';

// CNS y CPF del mismo médico — Fórmulas Infantis Especiais firma con
// CNS+CPF en vez de CRM.
const DOCTOR_CNS = '98001628354706';
const DOCTOR_CPF = '748.632.311-72';
