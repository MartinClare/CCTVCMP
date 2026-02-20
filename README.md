# AXON Vision Central Monitoring Platform (CMP)

Production-ready Next.js 14 full-stack app for centralized construction AI safety monitoring.

## Setup

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Demo admin credentials: `admin@axonvision.com` / `Admin@123456`

## Routes

Pages:
- `/dashboard`
- `/live`
- `/incidents`
- `/analytics`
- `/reports`
- `/settings`
- `/signin`
- `/signup`

API:
- `/api/auth/signup`
- `/api/auth/signin`
- `/api/auth/signout`
- `/api/incidents`
- `/api/incidents/[id]`
- `/api/projects`
- `/api/users`
- `/api/analytics`

## Tests

```bash
npm run test
```

## Deploy

Set `DATABASE_URL` and `JWT_SECRET` in Vercel and deploy.
