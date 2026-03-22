# Clocked

Anonymous employer review platform for hourly, trade, and service workers. Think Glassdoor meets Reddit — built for blue-collar workers.

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Frontend | React + Vite |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (anonymous by default, optional email) |
| Payments | Stripe ($2.99/mo, 7-day trial) |
| Maps | Google Places API |
| Hosting | Railway |

## Project Structure

```
app/
  backend/          Express API
    src/
      index.js      Server entry
      routes/       API routes
      middleware/   Auth middleware
      lib/          Prisma client
  frontend/         React + Vite
    src/
      components/   Reusable UI
      pages/        Route pages
      context/      React context (Auth, Theme, Toast)
      lib/          API client + utils
  prisma/
    schema.prisma   Database schema
    seed.js         Seed data (Grand Rapids, MI)
  .env.example      Required env vars
  railway.json      Railway deployment config
```

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Setup

1. **Clone and configure**
   ```bash
   cp .env.example .env
   # Fill in DATABASE_URL, JWT_SECRET, GOOGLE_MAPS_API_KEY
   ```

2. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Set up database**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Seed sample data** (10 Grand Rapids, MI reviews)
   ```bash
   node ../prisma/seed.js
   ```

5. **Start development servers**

   In one terminal:
   ```bash
   cd backend && npm run dev
   ```

   In another terminal:
   ```bash
   cd frontend && npm run dev
   ```

6. Open [http://localhost:5173](http://localhost:5173)

## Deployment on Railway

### Backend Service
1. Create a new Railway service pointing to `/app/backend`
2. Add a PostgreSQL database plugin
3. Set environment variables:
   - `DATABASE_URL` — auto-set by Railway Postgres plugin
   - `JWT_SECRET` — generate with `openssl rand -base64 32`
   - `GOOGLE_MAPS_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET`
   - `FRONTEND_URL` — your frontend Railway URL

### Frontend Service
1. Create a new Railway service pointing to `/app/frontend`
2. Set environment variables:
   - `VITE_API_URL` — your backend Railway URL + `/api`

### After Deploy
Run the seed script once:
```bash
railway run node prisma/seed.js
```

## API Reference

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/anonymous | Create anonymous session |
| POST | /api/auth/register | Register with email |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/posts | Feed (paginated) |
| POST | /api/posts | Create post |
| GET | /api/posts/:id | Single post |
| POST | /api/posts/:id/like | Like post |
| POST | /api/posts/:id/dislike | Dislike post |
| POST | /api/posts/:id/save | Toggle save |
| POST | /api/posts/:id/flag | Flag post |
| GET | /api/posts/:id/comments | Get comments |
| POST | /api/posts/:id/comments | Add comment |
| GET | /api/employers/search | Google Places search |
| GET | /api/employers/top | Most-reviewed employers |
| GET | /api/employers/profile/:placeId | Employer stats |
| POST | /api/subscriptions/checkout | Start Stripe checkout |
| GET | /api/subscriptions/status | Sub status |
| POST | /api/subscriptions/webhook | Stripe webhook |
| GET | /api/notifications | User notifications |
| POST | /api/notifications/read | Mark read |

## Paywall Logic

- Free: first 1-2 sentences visible, rest blurred with "See More" CTA
- Subscribed (`ACTIVE` or `TRIALING`): full review visible
- The truncation happens server-side in `formatPost()` in `backend/src/routes/posts.js`

## Stripe Setup

1. Create a product in Stripe Dashboard
2. Add a recurring price at $2.99/month
3. Copy the Price ID → `STRIPE_PRICE_ID`
4. Set up webhook pointing to `/api/subscriptions/webhook`
5. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## Environment Variables

See `.env.example` for all required variables and descriptions.
