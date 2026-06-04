# NeuroExamenes

Sistema de gestión de pedidos médicos para exámenes neurológicos y neurofisiológicos, desarrollado para clínicas especializadas en neurología.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?style=flat-square&logo=postgresql&logoColor=white)

---

## Sobre el proyecto

NeuroExamenes permite a médicos neurólogos crear y gestionar solicitudes de exámenes para sus pacientes de forma rápida y organizada. Cada pedido queda registrado con el diagnóstico CID-10, los exámenes requeridos y el estado de seguimiento, y puede imprimirse o exportarse a PDF en formato A4 profesional.

La aplicación funciona en dos modos:

- **Con backend activo** — datos almacenados en PostgreSQL, autenticación JWT completa.
- **Sin backend (modo local)** — datos en `localStorage`, útil para desarrollo y pruebas.

---

## Funcionalidades

- Registro e inicio de sesión de médicos
- Creación y edición de pedidos médicos con selección de múltiples exámenes
- Catálogo de 38 exámenes neurológicos organizados en 10 categorías
- Gestión de pacientes con búsqueda por nombre o documento
- Filtrado de pedidos por estado, fecha y paciente
- Exportación a PDF y vista de impresión A4
- Dashboard con métricas de actividad diaria
- Soporte multiidioma: Español y Portugués (Brasil)
- Diseño responsive adaptado a escritorio y móvil

---

## Tecnologías

### Frontend

| Herramienta | Uso |
|---|---|
| React 19 + TypeScript | UI y lógica de componentes |
| Vite | Servidor de desarrollo y build |
| Tailwind CSS | Estilos |
| React Hook Form + Zod | Formularios y validación |
| i18next | Internacionalización |
| Axios | Llamadas HTTP al backend |
| Lucide React | Iconos |

### Backend

| Herramienta | Uso |
|---|---|
| Node.js + Express | Servidor API REST |
| Prisma ORM | Acceso a base de datos |
| PostgreSQL | Base de datos relacional |
| JWT + Bcrypt | Autenticación y seguridad |
| PDFKit | Generación de documentos PDF |

---

## Estructura del proyecto

```
NeuroExamenes/
│
├── src/                        # Aplicación frontend (React)
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Layout.tsx
│   │   └── PrintTemplate.tsx
│   ├── views/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── NewOrder.tsx
│   │   ├── OrdersList.tsx
│   │   ├── Patients.tsx
│   │   └── Profile.tsx
│   ├── context/
│   │   └── AppContext.tsx      # Estado global de la app
│   ├── types/
│   │   └── index.ts            # Tipos TypeScript
│   ├── data/
│   │   └── seedData.ts         # Datos iniciales (modo local)
│   └── i18n.ts
│
├── server/                     # Backend Node.js
│   ├── src/
│   │   └── index.ts            # API REST + autenticación
│   └── prisma/
│       └── schema.prisma       # Esquema de base de datos
│
├── public/
├── index.html
└── vite.config.ts
```

---

## Instalación

### Requisitos previos

- Node.js 18 o superior
- PostgreSQL 14 o superior
- npm

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/neuroexamenes.git
cd neuroexamenes
```

### 2. Instalar dependencias

```bash
# Frontend
npm install

# Backend
cd server
npm install
```

### 3. Configurar variables de entorno

Crear el archivo `server/.env`:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/neuroexamenes"
JWT_SECRET="clave_secreta_segura"
PORT=5000
```

### 4. Inicializar la base de datos

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
```

Al iniciar el servidor por primera vez, se crea automáticamente el usuario del médico titular a partir de los datos configurados en el código.

### 5. Ejecutar el proyecto

```bash
# Terminal 1 — Backend
cd server
npm run dev
# Disponible en http://localhost:5000

# Terminal 2 — Frontend
npm run dev
# Disponible en http://localhost:5173
```

---

## Scripts

### Frontend

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción
npm run preview   # Vista previa del build
npm run lint      # Linting
```

### Backend

```bash
npm run dev               # Desarrollo con hot reload
npm run build             # Compilar TypeScript
npm start                 # Iniciar en producción
npm run prisma:generate   # Generar cliente Prisma
npm run prisma:migrate    # Aplicar migraciones
```

---

## API REST

Todos los endpoints (excepto auth) requieren el header:

```
Authorization: Bearer <token>
```

### Autenticación

```
POST   /api/auth/register     Registrar médico
POST   /api/auth/login        Iniciar sesión
```

### Pacientes

```
GET    /api/patients          Listar pacientes
POST   /api/patients          Registrar paciente
```

### Exámenes

```
GET    /api/exams             Catálogo de exámenes
```

### Pedidos

```
GET    /api/orders            Listar pedidos (soporta filtros: patient, status, startDate, endDate)
POST   /api/orders            Crear pedido
PUT    /api/orders/:id        Actualizar pedido
DELETE /api/orders/:id        Eliminar pedido
GET    /api/orders/:id/pdf    Descargar PDF del pedido
```

---

## Modelo de datos

```prisma
model User {
  id               String   @id @default(uuid())
  name             String
  email            String   @unique
  passwordHash     String
  specialty        String
  crmLicense       String
  rqeSpecialty     String
  registrationDate DateTime @default(now())
  orders           Order[]
}

model Patient {
  id           String   @id @default(uuid())
  name         String
  identityCard String   @unique
  age          Int?
  orders       Order[]
}

model Order {
  id           String      @id
  patientId    String
  userId       String
  date         String
  codeCID      String
  observations String?
  status       String      @default("Pendiente")
  exams        OrderExam[]
  createdAt    DateTime    @default(now())
}

model Exam {
  id       String      @id
  category String
  name     String
  orders   OrderExam[]
}

model OrderExam {
  orderId String
  examId  String
  @@id([orderId, examId])
}
```

---

## Catálogo de exámenes

38 exámenes distribuidos en 10 categorías:

| Categoría | Cantidad |
|---|---|
| EEG | 4 |
| Potenciales Evocados | 4 |
| Electroneuromiografía | 4 |
| Face | 3 |
| Testes Cognitivos | 4 |
| Dinamómetro | 2 |
| Resonancia Magnética | 6 |
| Tomografía Computadorizada | 3 |
| Ultrasonografía | 3 |
| Estesiómetro | 2 |

---

## Estados de pedidos

| Estado | Descripción |
|---|---|
| `Pendiente` | Pedido creado, examen aún no realizado |
| `Concluido` | Examen completado |
| `Cancelado` | Pedido anulado |

---

## Despliegue

### Frontend — Vercel / Netlify

```bash
npm run build
# Subir contenido de /dist
```

### Backend — Railway / Render

```bash
cd server
npm run build
npm start
```

Variables de entorno necesarias en producción:

```
DATABASE_URL
JWT_SECRET
PORT
```

---

## Licencia

MIT
