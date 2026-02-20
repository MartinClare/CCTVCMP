# AXON Vision Central Monitoring Platform (CMP)

A production-ready full-stack application for centralized construction AI safety monitoring. Tracks incidents, manages live camera feeds, enforces role-based access control, and surfaces analytics dashboards for project safety teams.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | PostgreSQL via [Neon](https://neon.tech) |
| ORM | Prisma 5 |
| Auth | JWT (HS256) in HTTP-only cookies |
| Styling | TailwindCSS 3 + shadcn/ui-style components |
| Charts | Recharts |
| Testing | Vitest + Testing Library |
| Deployment | Vercel |

---

## Features

- **Authentication** — Email/password signup & signin with bcrypt hashing and secure HTTP-only JWT cookies
- **RBAC** — Four roles: `admin`, `project_manager`, `safety_officer`, `viewer` — enforced at the middleware and API level
- **Incidents** — Full lifecycle: `open → acknowledged → resolved` with audit log on every transition
- **Live Monitoring** — Camera grid view per project and zone
- **Analytics** — Daily incident trends, risk distribution, and PPE compliance charts
- **KPI Dashboard** — Total incidents, high-risk count, avg response time, compliance rate
- **Projects & Users** — API-managed via admin/PM roles

---

## Project Structure

```
app/
  (protected)/
    dashboard/       # KPI overview
    live/            # Camera grid
    incidents/       # Incident table + actions
    analytics/       # Charts
    reports/         # Export placeholder
    settings/        # Config placeholder
  api/
    auth/signin      # POST
    auth/signup      # POST
    auth/signout     # POST
    incidents/       # GET, POST
    incidents/[id]/  # GET, PATCH
    projects/        # GET, POST
    users/           # GET, POST
    analytics/       # GET
  signin/
  signup/
components/
  ui/                # Button, Card, Input, Badge, Table
  layout/            # AppShell, Sidebar, TopNavbar
  auth/              # AuthForm
  incidents/         # IncidentTable, IncidentActions
  live/              # CameraGrid
  analytics/         # Charts
  kpi-cards.tsx
lib/
  auth.ts            # JWT sign/verify, cookie helpers
  prisma.ts          # Prisma singleton
  rbac.ts            # Role access checks
  analytics.ts       # Snapshot builder
  workflows/
    incident.ts      # Status transition logic
  validations/
    auth.ts          # Zod schemas
    incidents.ts
prisma/
  schema.prisma
  seed.ts
tests/
  unit/rbac.test.ts
  integration/incident-workflow.test.ts
middleware.ts        # Edge RBAC guard
```

---

## Database Schema

| Table | Description |
|---|---|
| `users` | Authenticated users with role |
| `projects` | Construction site projects |
| `zones` | Risk zones within a project |
| `cameras` | Cameras assigned to zones |
| `incidents` | Safety incidents with lifecycle status |
| `incident_logs` | Audit log for every incident action |
| `daily_metrics` | Aggregated daily KPI data per project |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET="a-long-random-secret-minimum-32-characters"
```

> **Neon users:** Use the pooled connection string (hostname contains `-pooler`). Remove `&channel_binding=require` from the URL — Prisma does not support it.

---

## Local Setup

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/dashboard`.

### Demo accounts (seeded)

| Email | Password | Role |
|---|---|---|
| `admin@axonvision.com` | `Admin@123456` | `admin` |
| `safety@axonvision.com` | `Safety@123456` | `safety_officer` |

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint checks |
| `npm run test` | Run all tests |
| `npm run test:coverage` | Coverage report |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Apply DB migrations |
| `npm run prisma:seed` | Seed demo data |
| `npm run db:push` | Push schema without migration (dev only) |

---

## API Reference

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password }` | Register new user |
| POST | `/api/auth/signin` | `{ email, password }` | Sign in, sets cookie |
| POST | `/api/auth/signout` | — | Clears auth cookie |

### Incidents

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/incidents` | List all incidents |
| POST | `/api/incidents` | Create incident |
| GET | `/api/incidents/[id]` | Get single incident with logs |
| PATCH | `/api/incidents/[id]` | Update status or assignee |

### Other

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/projects` | List or create projects |
| GET/POST | `/api/users` | List or create users (admin only) |
| GET | `/api/analytics` | Trend data + KPI snapshot |

---

## Role Permissions

| Route / Action | admin | project_manager | safety_officer | viewer |
|---|:---:|:---:|:---:|:---:|
| Dashboard, Live, Incidents, Analytics | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ |
| `/api/users` | ✅ | ❌ | ❌ | ❌ |
| `/api/projects` | ✅ | ✅ | ❌ | ❌ |

---

## Deploying to Vercel

1. Push this repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings:
   - `DATABASE_URL`
   - `JWT_SECRET`
4. Deploy — Vercel auto-runs `npm run build`

> Prisma client is generated automatically via the `postinstall` script.

---

## Running Tests

```bash
npm run test            # run all tests
npm run test:coverage   # with coverage report
```

Tests cover:
- RBAC role access logic (`tests/unit/rbac.test.ts`)
- Incident status transition workflow (`tests/integration/incident-workflow.test.ts`)

---

## Security Notes

- Passwords are hashed with bcrypt (12 rounds)
- JWTs are signed HS256 and stored in HTTP-only, SameSite strict cookies
- All API routes verify the auth cookie before any DB access
- Role checks are enforced in both middleware (edge) and API handlers
- Never commit `.env` — it is excluded via `.gitignore`
