-- Firma digital + verificación pública para Encaminhamentos, y perfil de
-- clínica completo (hasta ahora `encaminhamentos` sólo tenía `clinic_name`,
-- sin dirección ni el resto de los datos que ya guardan Atestados/Recetas/
-- Pedidos) — necesario para que el pie del PDF firmado pueda mostrar la
-- dirección real de la clínica seleccionada, igual que las otras secciones.
ALTER TABLE encaminhamentos
  ADD COLUMN clinic_secretaria VARCHAR(255) NULL AFTER clinic_name,
  ADD COLUMN clinic_sistema    VARCHAR(255) NULL AFTER clinic_secretaria,
  ADD COLUMN clinic_address    VARCHAR(255) NULL AFTER clinic_sistema,
  ADD COLUMN clinic_phone      VARCHAR(100) NULL AFTER clinic_address,
  ADD COLUMN clinic_cnpj       VARCHAR(100) NULL AFTER clinic_phone,
  ADD COLUMN token             VARCHAR(64)  NULL AFTER clinic_cnpj,
  ADD COLUMN access_code       VARCHAR(64)  NULL AFTER token,
  ADD COLUMN validation_url    VARCHAR(255) NULL AFTER access_code,
  ADD COLUMN qr_content        TEXT         NULL AFTER validation_url;
