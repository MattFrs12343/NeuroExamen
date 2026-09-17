-- Nueva sección "Laudos" — Laudo Pericial Médico con estructura única por
-- clínica (ver src/data/laudoProfiles.ts): se elige la clínica y se completa
-- su plantilla de laudo pericial (narrativa, CID, diagnóstico, conclusão,
-- período de afastamento, observações). A diferencia de Receituário, el
-- laudo SÍ lleva los datos del paciente (nombre, data de nacimiento, CPF,
-- órgão/benefício) y los datos del emisor fijos de la clínica (médico, CRM,
-- dirección, teléfono) — todo en texto plano en la fila (sin JOIN con
-- `patients`, el nombre puede venir de la búsqueda o tipeado a mano, igual
-- que Receituário). Se persiste al imprimir Y al firmar; la
-- firma+verificación pública (QR/token) exige una fila consultable en la
-- base, como el resto de los documentos (resolveVerificationUrl() en
-- lib/signing.php).
CREATE TABLE IF NOT EXISTS laudos (
  id                  VARCHAR(30)  NOT NULL PRIMARY KEY,
  user_id             CHAR(36)     NOT NULL,
  patient_id          CHAR(36)     NULL,
  patient_name        VARCHAR(255) NULL,
  patient_identity_card VARCHAR(100) NULL,
  patient_birth_date  DATE         NULL,
  patient_phone       VARCHAR(100) NULL,
  orgao               VARCHAR(100) NULL,
  date                DATE         NULL,
  local               VARCHAR(120) NULL,
  narrative           TEXT         NULL,
  cids                VARCHAR(60)  NULL,
  diagnostico         VARCHAR(255) NULL,
  conclusao           VARCHAR(40)  NULL,
  afastamento_dias    INT          NULL,
  observacoes         TEXT         NULL,
  clinic_name         VARCHAR(255) NULL,
  clinic_address      VARCHAR(255) NULL,
  clinic_phone        VARCHAR(100) NULL,
  doctor_name         VARCHAR(255) NULL,
  doctor_crm          VARCHAR(100) NULL,
  template_id         VARCHAR(50)  NULL,
  token               VARCHAR(64)  NULL,
  access_code         VARCHAR(64)  NULL,
  validation_url      VARCHAR(255) NULL,
  qr_content          TEXT         NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_laudos_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- IDs secuenciales sin race condition — mismo patrón que los demás módulos.
CREATE TABLE IF NOT EXISTS laudo_counter (
  year INT NOT NULL PRIMARY KEY,
  seq  INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;