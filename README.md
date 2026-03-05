# PayrollManager

App web multi-tenant para gestión de personal y liquidación de haberes. Next.js 16, Prisma 7, PostgreSQL (Supabase), deploy en Vercel.

## Credenciales del seed

```
admin@demo.com  / password123  (Owner)
viewer@demo.com / password123  (Viewer)
```

## Stack

| Capa | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js v4 (credentials) |
| ORM | Prisma 7 |
| DB | PostgreSQL (Supabase) |
| Validación | Zod + React Hook Form |
| Tests | Vitest (45 unit tests) |
| Deploy | Vercel |

## Desarrollo local

```bash
git clone https://github.com/TU_USUARIO/payroll-manager.git
cd payroll-manager
npm install
cp .env.example .env
# Completar .env con tus credenciales

npm run db:generate   # Genera Prisma client
npm run db:migrate    # Crea tablas en PostgreSQL
npm run db:seed       # Carga datos de ejemplo
npm run dev           # → http://localhost:3000
npm test              # 45 unit tests
```

## Variables de entorno

```bash
# .env
DATABASE_URL="postgresql://postgres.[ref]:[pass]@[host]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[pass]@[host]:5432/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="genera-con-openssl-rand-base64-32"
```

## Deploy en Vercel

1. **Supabase**: crear proyecto → copiar `DATABASE_URL` (pooled) y `DIRECT_URL` (direct)
2. **GitHub**: hacer push del repo
3. **Vercel**: importar repo → agregar env vars → deploy
4. **Post-deploy**: correr `npm run db:migrate` con `DIRECT_URL` apuntando a Supabase

### Env vars en Vercel

```
DATABASE_URL      = postgresql://...?pgbouncer=true   (Transaction pooler - puerto 6543)
DIRECT_URL        = postgresql://...                   (Direct - puerto 5432)
NEXTAUTH_URL      = https://tu-app.vercel.app
NEXTAUTH_SECRET   = [openssl rand -base64 32]
```

## Arquitectura multi-tenant

- Cada usuario puede pertenecer a múltiples negocios con roles: **OWNER / ADMIN / VIEWER**
- Toda query incluye `where: { businessId }` — no hay fuga de datos entre negocios
- `requireBusinessAccess(businessId, userId, minRole)` valida acceso en cada handler

## Cálculo de liquidación

### Fórmula

```
TOTAL = sueldo_período + Σextras - anticipos - descuentos

sueldo_período:
  WEEKLY    → base × 12 / 52
  BIWEEKLY  → base / 2
  MONTHLY   → base × (días_período / días_mes)

valor_hora:
  Opción A → base / 200
  Opción B → base / (horas_diarias × días_laborales)

extra_tipo → horas × valor_hora × multiplicador_tipo
```

### Ejemplo (seed - Enero 2025)

| Empleado | Frecuencia | Sueldo base | Extras | Anticipos | TOTAL |
|---|---|---|---|---|---|
| Ana García | Mensual | $800.000 | $66.000 | $0 | **$866.000** |
| Carlos López | Quincenal | $600.000 | $48.000 | -$50.000 | **$298.000** |
| María Torres | Semanal | $500.000 | $37.500 | -$30.000 | **~$122.884** |

## Seguridad (checklist)

- [x] Todas las rutas protegidas con NextAuth middleware
- [x] `requireBusinessAccess()` en cada API handler
- [x] Roles: OWNER > ADMIN > VIEWER
- [x] Todas las queries filtran por `businessId`
- [x] Validación Zod en todos los inputs
- [x] Passwords con bcryptjs (12 rounds)
- [x] Soft delete en empleados
- [ ] RLS en Supabase (recomendado para producción)
- [ ] Rate limiting en auth endpoints

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/login|register/
│   ├── (dashboard)/[businessId]/
│   │   ├── page.tsx          # Dashboard KPIs
│   │   ├── employees/        # CRUD empleados
│   │   ├── overtime/         # Horas extras + import CSV
│   │   ├── payroll/          # Liquidaciones + export CSV
│   │   └── settings/         # Config + feriados
│   ├── api/businesses/[businessId]/
│   │   ├── employees/        # GET/POST/PUT/DELETE
│   │   ├── overtime/         # GET/POST/DELETE + CSV import
│   │   ├── advances/         # GET/POST/DELETE
│   │   ├── payroll/          # GET/POST + preview
│   │   │   └── [periodId]/export/  # CSV export
│   │   └── config/           # GET/PUT + holidays POST
│   └── actions/              # Server Actions (employees, businesses)
├── lib/
│   ├── auth.ts               # NextAuth + requireBusinessAccess
│   ├── db.ts                 # Prisma singleton
│   ├── payroll/
│   │   ├── calculator.ts     # Funciones puras de cálculo ← core
│   │   ├── calculator.test.ts # 45 unit tests
│   │   ├── csv-export.ts     # Generador CSV
│   │   └── types.ts          # Tipos TS
│   └── validations/          # Schemas Zod
└── components/
    ├── layout/               # Sidebar, TopBar, config forms
    ├── employees/            # Tabla + form dialog
    ├── overtime/             # Tabla + form + CSV import
    └── payroll/              # Lista + generate dialog + preview
```

## Próximas mejoras

- Export PDF (jspdf ya instalado, falta template)
- Invitar usuarios por email
- Audit log de cambios
- Rate limiting en endpoints de auth
- RLS en Supabase
- Tests E2E con Playwright
- Paginación en tablas grandes
- Conceptos custom (viáticos, bonos)
