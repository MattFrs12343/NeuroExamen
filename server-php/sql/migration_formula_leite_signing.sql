-- Firma digital + verificación pública para Fórmulas Infantis Especiais.
-- No hay perfil de clínica que agregar acá (institution_name ya existe y es
-- sólo texto libre, sin dirección/teléfono/CNPJ como en las otras
-- secciones) — únicamente las 4 columnas de verificación.
ALTER TABLE formula_leite
  ADD COLUMN token          VARCHAR(64)  NULL AFTER avaliador,
  ADD COLUMN access_code    VARCHAR(64)  NULL AFTER token,
  ADD COLUMN validation_url VARCHAR(255) NULL AFTER access_code,
  ADD COLUMN qr_content     TEXT         NULL AFTER validation_url;
