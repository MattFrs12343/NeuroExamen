-- Nueva sección "Receituário" — hoja de receituário libre (sin paciente):
-- se elige una clínica y se escribe texto libre, sin listado/historial en
-- el UI. Solo se persiste un registro cuando el médico firma digitalmente
-- ("Assinar e Imprimir") — la firma+verificación pública (QR/token) exige
-- una fila consultable en la base, igual que el resto de los documentos
-- (ver resolveVerificationUrl() en lib/signing.php). La impresión simple
-- ("Imprimir", sin firma) nunca llega a tocar esta tabla.
CREATE TABLE IF NOT EXISTS receituarios (
  id                VARCHAR(30)  NOT NULL PRIMARY KEY,
  user_id           CHAR(36)     NOT NULL,
  clinic_name       VARCHAR(255) NULL,
  clinic_secretaria VARCHAR(255) NULL,
  clinic_sistema    VARCHAR(255) NULL,
  clinic_address    VARCHAR(255) NULL,
  clinic_phone      VARCHAR(100) NULL,
  clinic_cnpj       VARCHAR(100) NULL,
  content           TEXT         NOT NULL,
  token             VARCHAR(64)  NULL,
  access_code       VARCHAR(64)  NULL,
  validation_url    VARCHAR(255) NULL,
  qr_content        TEXT         NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_receituarios_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- IDs secuenciales sin race condition — mismo patrón que receta_counter.
CREATE TABLE IF NOT EXISTS receituario_counter (
  year INT NOT NULL PRIMARY KEY,
  seq  INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
