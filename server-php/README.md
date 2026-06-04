# NeuroExamenes — Backend PHP (hosting compartido)

Backend reescrito en PHP puro + MySQL para funcionar en cualquier hosting compartido con cPanel/Hostinger.

## Estructura

```
server-php/
├── .env                   ← Credenciales MySQL y JWT_SECRET
├── .htaccess              ← Rewrite rules (mod_rewrite Apache)
├── index.php              ← Front controller / router
│
├── config/
│   └── database.php       ← Conexión PDO a MySQL
│
├── middleware/
│   ├── cors.php           ← Headers CORS
│   └── auth.php           ← JWT HS256 (sin dependencias)
│
├── api/
│   ├── auth/
│   │   ├── register.php
│   │   ├── login.php
│   │   ├── me.php
│   │   ├── profile.php
│   │   └── password.php
│   ├── patients/
│   │   └── index.php
│   ├── exams/
│   │   └── index.php
│   └── orders/
│       ├── index.php
│       └── pdf.php
│
├── lib/
│   └── fpdf/
│       ├── README.txt     ← Instrucciones para descargar fpdf.php
│       └── fpdf.php       ← Descargar desde http://www.fpdf.org/
│
├── setup/
│   └── seed.php           ← Crear usuario titular (ejecutar 1 vez)
│
└── sql/
    └── schema.sql         ← Tablas MySQL + catálogo de exámenes
```

---

## Despliegue en hosting compartido (cPanel / Hostinger)

### 1. Crear la base de datos MySQL
En **phpMyAdmin**:
- Crear base de datos `neuroexamenes` (utf8mb4_unicode_ci)
- Crear un usuario MySQL con todos los permisos sobre esa DB
- Importar `sql/schema.sql` (crea tablas + seed de exámenes)

### 2. Subir los archivos PHP
Subir todo el contenido de `server-php/` a una carpeta en el hosting,
por ejemplo:
```
public_html/api/
```
O en un subdominio como `api.tudominio.com`.

### 3. Configurar `.env`
Editar `server-php/.env` con los datos reales:
```
DB_HOST=localhost
DB_NAME=neuroexamenes
DB_USER=tu_usuario_mysql
DB_PASS=tu_password_mysql
JWT_SECRET=cambia_esto_por_un_secreto_seguro
```

### 4. Descargar FPDF
- Ir a http://www.fpdf.org/
- Descargar fpdf186.zip
- Colocar `fpdf.php` en `lib/fpdf/fpdf.php`

### 5. Crear usuario médico titular
Abrir en el navegador (una sola vez):
```
https://tudominio.com/api/setup/seed.php
```
Luego **eliminar o renombrar** `setup/seed.php` por seguridad.

### 6. Configurar el frontend
En el proyecto React, crear `.env` (o `.env.local`):
```
VITE_API_URL=https://tudominio.com/api
```
Luego compilar:
```bash
npm run build
```
Subir el contenido de `dist/` a `public_html/`.

---

## API — mismos endpoints que el backend Node.js

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/profile
PUT    /api/auth/password

GET    /api/patients
POST   /api/patients
PUT    /api/patients/{id}
DELETE /api/patients/{id}

GET    /api/exams

GET    /api/orders
POST   /api/orders
PUT    /api/orders/{id}
DELETE /api/orders/{id}
GET    /api/orders/{id}/pdf
```

Todos los endpoints (excepto login y register) requieren:
```
Authorization: Bearer <token>
```

---

## Notas técnicas

- JWT implementado manualmente en HS256 — sin dependencias externas
- Contraseñas con `password_hash()` / `password_verify()` (bcrypt nativo de PHP)
- Consultas con PDO + prepared statements (seguro contra SQL injection)
- Campos JSON (`customExams`, `examDescriptions`) almacenados como JSON en MySQL 5.7+
- El `.htaccess` requiere que Apache tenga `mod_rewrite` activado (estándar en cPanel)
