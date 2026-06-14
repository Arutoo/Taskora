# Taskora

A team project management web app for creating workspaces, assigning tasks, tracking progress, and collaborating in real time.

**Live app:** https://taskora-omega.vercel.app

---

## Features

- Workspace creation with invite codes
- Task management with priority, status, and deadlines
- Real-time updates via Socket.IO
- Role-based access (leader / member)
- Email notifications and deadline reminders
- Activity logs, comments, and resource shortcuts
- Email verification on signup

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL (hosted on Neon) |
| Real-time | Socket.IO |
| Email | Brevo (Sendinblue) |
| Deployment | Vercel (frontend + serverless API), Render (real-time server) |

---

## Project Structure

```
Taskora/
├── App/                    # Backend (Express + Prisma)
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # Database queries
│   │   ├── routes/         # Express routers
│   │   ├── middlewares/    # Auth, error handling, role check
│   │   ├── sockets/        # Socket.IO event handlers
│   │   ├── jobs/           # Cron jobs (deadline reminders, overdue)
│   │   └── utils/          # JWT, hashing, email, response helpers
│   └── prisma/
│       └── schema.prisma   # Database schema
│
├── FE/                     # Frontend (React + Vite)
│   └── src/
│       ├── pages/          # Route-level page components
│       ├── components/     # Shared UI components
│       ├── lib/api/        # API client and typed fetch functions
│       └── hooks/          # Theme and auth context
│
└── Documents/              # Sprint reports, SRD, system design docs
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or a [Neon](https://neon.tech) connection string)
- Brevo account (for email)

### 1. Backend (`App/`)

```bash
cd App
cp .env.example .env
# Fill in .env (see Environment Variables section below)

npm install
npx prisma migrate dev
npm run dev
```

Backend runs at `http://localhost:3000`.

### 2. Frontend (`FE/`)

```bash
cd FE
cp .env.example .env   # if exists, otherwise create .env
# Set VITE_API_URL=http://localhost:3000

npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Environment Variables (Backend)

Create `App/.env` from `App/.env.example`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT access token secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (min 32 chars) |
| `JWT_EXPIRY` | Access token expiry (e.g. `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry (e.g. `7d`) |
| `PORT` | Server port (default `3000`) |
| `CLIENT_ORIGIN` | Frontend URL for CORS (e.g. `http://localhost:5173`) |
| `NODE_ENV` | `development` or `production` |
| `CRON_SECRET` | Secret for cron job endpoints |
| `SOCKET_INTERNAL_SECRET` | Internal secret for socket server |
| `BREVO_API_KEY` | Brevo API key for sending emails |
| `EMAIL_FROM_ADDRESS` | Sender email address |
| `EMAIL_FROM_NAME` | Sender display name |

---

## Database Schema (Key Models)

- **User** — account with email verification
- **Workspace** — project space with invite code, owned by a leader
- **WorkspaceMember** — user role in a workspace (`leader` / `member`)
- **Task** — work item with priority, status, assignees, and deadline
- **Comment** — threaded comments on tasks
- **Notification** — in-app notifications (invite, assignment, deadline, etc.)
- **ActivityLog** — audit trail of workspace actions
- **ResourceShortcut** — quick-access links per workspace

---

## Deployment Architecture

| Service | Provider | Purpose |
|---|---|---|
| Frontend + Serverless API | [Vercel](https://vercel.com) | Hosts the React frontend and stateless API routes |
| Real-time Server | [Render](https://render.com) | Runs the persistent Node.js + Socket.IO server (requires long-lived connections) |
| Database | [Neon](https://neon.tech) | Serverless PostgreSQL — branching and connection pooling via Neon |

> Vercel serverless functions are stateless and cannot hold WebSocket connections, so the Socket.IO server runs separately on Render.

---

## Deployed App

Visit **https://taskora-omega.vercel.app** — no setup needed.

1. Sign up with your email
2. Verify your email via the confirmation link
3. Create a workspace or join one with an invite code
4. Create tasks, assign members, and track progress

---

## Available Scripts

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run Jest tests |
| `npm run prisma:migrate` | Run database migrations |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
