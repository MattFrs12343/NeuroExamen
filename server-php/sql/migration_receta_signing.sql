-- Columnas de firma digital + verificación pública para Recetas — mismo
-- patrón que ya tiene `atestados` (token/access_code/validation_url/
-- qr_content). `access_code` no se usa hoy (se descartó el patrón de
-- "código de acceso" decorativo que no llevaba a ningún lado — ver
-- signing.php), pero se agrega igual por si se necesita a futuro y para
-- que el esquema quede parejo entre tablas.
ALTER TABLE recetas
  ADD COLUMN token          VARCHAR(64)  NULL AFTER medications,
  ADD COLUMN access_code    VARCHAR(64)  NULL AFTER token,
  ADD COLUMN validation_url VARCHAR(255) NULL AFTER access_code,
  ADD COLUMN qr_content     TEXT         NULL AFTER validation_url;
