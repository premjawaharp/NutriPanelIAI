# NutriPanel

A SaaS application for generating **CFIA-compliant nutrition labels** for Canadian food products. Users search USDA ingredients, build recipes with gram quantities, and get aggregated nutrition per batch, per 100g, and per serving.

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **Prisma 7** + PostgreSQL (Neon)
- **Clerk** (auth)
- **USDA FoodData Central API** (ingredient lookup)

## Architecture

```
Frontend → Internal API (auth + user-scoped) → External API (USDA) / DB → UI
```

- All ingredient and recipe APIs enforce **user ownership** (multi-tenant).
- Business logic lives in backend; frontend is presentation.

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (e.g. [Neon](https://neon.tech))
- [Clerk](https://clerk.com) account
- [USDA FoodData Central API key](https://fdc.nal.usda.gov/api-key-signup.html)

### 1. Install Dependencies

```bash
cd nutripanel
npm install
```

### 2. Environment Variables

Create `.env` in `nutripanel/` with:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_WEBHOOK_SECRET` | Svix secret for `/api/webhooks/clerk` | Yes (for webhooks) |
| `USDA_API_KEY` | FoodData Central API key | Yes (for ingredient search/import) |
| `NGROK_AUTHTOKEN` | ngrok authtoken (for local webhooks) | Optional |
| `NGROK_PORT` | Local port for tunnel (default 3001) | Optional |

### 3. Database Setup

```bash
npx prisma db push    # Sync schema to DB
npx prisma generate   # Regenerate Prisma client
```

### 4. Run Dev Server

```bash
npm run dev
```

App runs at `http://localhost:3000` (or next available port).

---

## Project Structure

### App (`app/`)

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Landing page; sign-in / dashboard CTA |
| `app/layout.tsx` | Root layout with `ClerkProvider` |
| `app/globals.css` | Global styles, button cursor rules |
| `app/dashboard/page.tsx` | Redirects to `/dashboard/ingredients` |
| `app/dashboard/ingredients/page.tsx` | **Ingredient Workspace**: search USDA, import, list, select, remove ingredients |
| `app/dashboard/recipes/new/page.tsx` | **Recipe Builder**: name, servings, grams per ingredient, create recipe, show nutrition |
| `app/sign-in/[[...sign-in]]/page.tsx` | Clerk sign-in |
| `app/sign-up/[[...sign-up]]/page.tsx` | Clerk sign-up |

### API Routes (`app/api/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/webhooks/clerk` | POST | Syncs `user.created`, `user.updated`, `user.deleted` to DB |
| `/api/ingredients/search` | POST | Proxies USDA search; body: `{ query }` |
| `/api/ingredients/import` | POST | Fetches USDA food by `fdcId`, saves `Ingredient` + `NutrientProfile`; body: `{ fdcId }` |
| `/api/ingredients/list` | GET | Returns current user's ingredients |
| `/api/ingredients/list` | DELETE | Removes ingredients; body: `{ ingredientIds: string[] }` |
| `/api/recipes` | GET | Lists user's recipes with nutrition |
| `/api/recipes` | POST | Creates recipe; body: `{ name, servingsCount, batchYieldG?, ingredients: [{ ingredientId, grams }] }` |
| `/api/recipes/[id]/nutrition` | GET | Returns computed nutrition for a recipe |
| `/api/health/db` | GET | DB connectivity check |

### Lib (`lib/`)

| File | Purpose |
|------|---------|
| `lib/db.ts` | Prisma client singleton (PostgreSQL via `@prisma/adapter-pg`) |
| `lib/usda.ts` | `searchUsdaFoods(query)` — calls USDA FDC search API |
| `lib/clerk-user-sync.ts` | `upsertUserFromClerk`, `updateUserNamesIfExists`, `deleteUserByClerkId`; used by webhook |
| `lib/clerk-webhook-log.ts` | `logClerkWebhook()` — structured logs with `[clerk-webhook]` prefix |
| `lib/recipe-nutrition.ts` | `getRecipeNutrition(recipeId, userId)` — aggregates nutrients per batch, per 100g, per serving |

### Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `scripts/db-check.mjs` | List users, verify user by id, delete one user by Clerk id |
| `scripts/ngrok-tunnel.mjs` | Starts ngrok tunnel for local webhook testing |
| `scripts/debug-usda.mjs` | Inspect raw USDA food payload; usage: `node scripts/debug-usda.mjs <fdcId>` |

### Config & Middleware

| File | Purpose |
|------|---------|
| `proxy.ts` | Clerk middleware; protects `/dashboard(.*)` and `/api` routes |
| `prisma/schema.prisma` | Data model: User, Ingredient, NutrientProfile, Recipe, RecipeIngredient, etc. |
| `prisma.config.ts` | Prisma config; loads `DATABASE_URL` from `.env` |

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:users` | Run `scripts/db-check.mjs` |
| `npm run tunnel` | Start ngrok tunnel (requires `NGROK_AUTHTOKEN`) |
| `npm run lint` | Run ESLint |

---

## User Flow

1. **Sign in** → Clerk
2. **Ingredient Workspace** (`/dashboard/ingredients`):
   - Search USDA ingredients
   - Import selected items (stores in DB with nutrient profile)
   - View "My Imported Ingredients", select for recipes, remove as needed
   - Click "Continue to Recipe Builder" with selection
3. **Recipe Builder** (`/dashboard/recipes/new`):
   - Enter recipe name, servings, optional total yield (g)
   - Set grams per ingredient
   - Create recipe → see aggregated nutrition (per batch, per 100g, per serving)

---

## Data Model (Summary)

- **User** — synced from Clerk; owns ingredients and recipes
- **Ingredient** — `createdByUserId`, `sourceType` (USDA/CUSTOM/INTERNAL), `sourceRef` (e.g. FDC id)
- **NutrientProfile** — per-ingredient nutrients (PER_100G basis)
- **Recipe** — `userId`, `name`, `servingsCount`, `batchYieldG`
- **RecipeIngredient** — `recipeId`, `ingredientId`, `grams`

Unique constraint: one ingredient per `(createdByUserId, sourceType, sourceRef)` to prevent duplicate imports per user.

---

## Clerk Webhook Setup

1. In Clerk Dashboard → Webhooks: add endpoint `https://your-domain/api/webhooks/clerk`
2. Subscribe to: `user.created`, `user.updated`, `user.deleted`
3. Copy signing secret → `CLERK_WEBHOOK_SECRET` in `.env`
4. For local dev: run `npm run tunnel`, use ngrok URL + `/api/webhooks/clerk` in Clerk

---

## Future Steps

- CFIA label generator (rounding rules, formatting)
- Recipe list/detail pages
- PDF export for labels
- Subscription/billing integration (Stripe)
