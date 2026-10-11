# LeadIQ Backend

REST API for **LeadIQ** — a smart lead qualification and analytics platform. Built with
Node.js, Express, TypeScript (ESM), MongoDB and Mongoose.

This repository is **independent** from the frontend (`leadiq-frontend`). It contains no
frontend source code.

## Features

- Full CRUD for leads with server-side validation (Zod).
- Deterministic, transparent lead scoring engine (0–100) with configurable criteria.
- Priority assignment (High / Medium / Low) via documented thresholds.
- CSV import (PapaParse) with validation, duplicate detection and import preview.
- Search, filtering, sorting and pagination on leads.
- Analytics aggregation computed from the actual stored leads.
- Filtered CSV export (with formula-injection protection).
- Consistent JSON error responses and a health endpoint.

## Tech Stack

- Node.js + Express 4
- TypeScript (ESM, `NodeNext`)
- MongoDB + Mongoose
- Zod for request validation
- Multer (memory storage, 20 MB CSV limit)
- PapaParse for CSV parsing/serialization

## Project Structure

```
src/
  config/       env, database connection, scoring defaults
  controllers/  request handlers (thin layer)
  middleware/   error handling, validation, upload, async wrapper
  models/       Mongoose schemas (Lead, Setting)
  routes/       Express routers, mounted under /api
  services/     scoring, dedup, import, export, analytics, settings
  types/        shared TypeScript types
  utils/        normalization + CSV helpers
  validators/   Zod schemas
  app.ts        Express app factory (CORS, routes, error handling)
  index.ts      bootstrap + DB connection + listen
```

## Getting Started

### Prerequisites

- Node.js 18+
- A running local MongoDB instance (`mongodb://127.0.0.1:27017`)

### Install

```bash
npm install
```

### Configure

Copy `.env.example` to `.env` and adjust if needed:

```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/leadiq
FRONTEND_ORIGIN=http://localhost:5173
FRONTEND_ORIGIN_PROD=https://your-frontend.example.com
MAX_CSV_SIZE_MB=20
```

### Run (development)

```bash
npm run dev
```

### Build & run (production)

```bash
npm run build
npm start
```

Verify the API:

```bash
curl http://localhost:3000/api/health
```

## API Contract

All routes are versioned under `/api`. Successful responses are JSON. Errors use a
consistent shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

| Method | Endpoint                | Description                                        |
| ------ | ----------------------- | -------------------------------------------------- |
| GET    | `/api/health`           | Health check + DB connection state                 |
| GET    | `/api/leads`            | List/search/filter/sort/paginate leads             |
| GET    | `/api/leads/:id`        | Retrieve one lead                                  |
| POST   | `/api/leads`            | Create a lead                                      |
| PATCH  | `/api/leads/:id`        | Update lead fields or status                       |
| DELETE | `/api/leads/:id`        | Delete a lead                                      |
| POST   | `/api/leads/import`     | Import/validate CSV (`multipart/form-data`)        |
| POST   | `/api/leads/rescore`    | Recompute scores for all leads                     |
| GET    | `/api/leads/export`     | Export filtered leads to CSV                       |
| GET    | `/api/analytics`        | Dashboard metrics and distributions                |
| GET    | `/api/settings`         | Get scoring configuration                          |
| PUT    | `/api/settings`         | Update scoring configuration                       |

### `GET /api/leads` query parameters

| Param             | Type                                       | Description                          |
| ----------------- | ------------------------------------------ | ------------------------------------ |
| `q`               | string                                     | Search company, contact, email, domain |
| `industry`        | string                                     | Case-insensitive match               |
| `location`        | string                                     | Case-insensitive match               |
| `status`          | New \| Contacted \| Qualified \| Disqualified | Exact status                      |
| `priority`        | High \| Medium \| Low                      | Exact priority                       |
| `minScore`        | 0–100                                      | Minimum score                        |
| `maxScore`        | 0–100                                      | Maximum score                        |
| `minCompleteness` | 0–100                                      | Minimum data completeness            |
| `maxCompleteness` | 0–100                                      | Maximum data completeness            |
| `sort`            | score \| companyName \| employeeCount \| createdAt \| completeness | Sort field |
| `order`           | asc \| desc                                | Sort direction (default `desc`)      |
| `page`            | integer ≥ 1                                | Page number (default 1)              |
| `limit`           | 1–200                                      | Page size (default 20)               |

Response:

```json
{
  "data": [/* Lead */],
  "page": 1,
  "limit": 20,
  "total": 42,
  "totalPages": 3,
  "facets": { "industries": ["SaaS"], "locations": ["Boston"] }
}
```

### `POST /api/leads/import`

`multipart/form-data` with:

- `file` (required) — the CSV file (max 20 MB, `.csv`/`.txt`).
- `commit` — `"true"` (default) to save, `"false"` to preview only.
- `skipDuplicates` — `"true"` (default) to skip duplicates on commit.

The same endpoint powers preview and commit: call with `commit=false` to preview,
then `commit=true` to persist. Duplicate detection uses normalized company names and
normalized website domains. Two leads are duplicates if either key matches.

## Lead Scoring

Scores are computed server-side, deterministically, from `src/config/scoring.ts` (overridable
via `/api/settings`). Max total = 100:

| Criterion                 | Weight | Notes                                                    |
| ------------------------- | ------ | -------------------------------------------------------- |
| Industry fit              | 25     | Full points if in target industries                      |
| Company size              | 20     | Full within `minEmployees`–`maxEmployees`, partial outside |
| Revenue threshold         | 15     | Full at/above `minRevenue`, partial below                |
| Website present           | 10     |                                                          |
| Contact information       | 15     | Full for email + name, partial for one                   |
| Data completeness         | 15     | Scaled by percentage of key fields present               |

- **Unknown ≠ mismatch.** Missing data is reported as "unknown" (listed in `missing`) and
  does **not** deduct points beyond not earning them.
- Priority thresholds: **High ≥ 70**, **Medium ≥ 45**, otherwise **Low**.
- Each lead stores a `breakdown` with positive factors, missing fields, reasons and a
  suggested next action. Scores are **estimates** based on available data — not guaranteed
  buying intent.

## Deduplication Rules

1. `normalizedCompanyName`: lowercased, punctuation removed, common suffixes
   (`inc`, `llc`, `ltd`, `corp`, `gmbh`, …) stripped.
2. `websiteDomain`: hostname extracted from the website URL, `www.` removed, lowercased.

A record is a duplicate if **either** key matches an existing lead (or an earlier row in the
same file). Duplicates are surfaced in the import preview and skipped on commit by default.

## Sample CSV

A fictional sample dataset is available at `samples/sample-leads.csv`. Supported headers
(aliases accepted): `company_name`, `website`, `industry`, `location`, `employee_count`,
`revenue`, `contact_name`, `email`, `linkedin_url`, `lead_source`, `status`.

## Limits & Security

- CSV uploads are limited to 20 MB (configurable) and one file per request.
- Uploads are kept in memory and never written to disk.
- CSV export prefixes cells beginning with `= + - @` to prevent spreadsheet formula injection.
- No credentials or connection strings are committed; `.env` is gitignored.

## Deployment

1. Provision MongoDB (Atlas or self-hosted) and set `MONGODB_URI`.
2. Set `NODE_ENV=production`, `PORT`, and `FRONTEND_ORIGIN_PROD` to your deployed frontend URL.
3. Build and start:
   ```bash
   npm ci
   npm run build
   npm start
   ```
4. Deploy `dist/` with the process manager of your choice (Render, Railway, Fly.io, EC2, etc.).
5. Confirm `GET /api/health` returns `status: "ok"` and `db: "connected"`.

## Limitations

- Scoring is heuristic and rule-based; it does not predict actual conversion.
- No web scraping, enrichment, email verification or AI-generated intelligence.
- CSV import is synchronous and best suited to moderate file sizes.
- Authentication/authorization is out of scope for this challenge.

## Docker Setup

Run all services (MongoDB + Ollama + model init + backend) with Docker Compose.

### Prerequisites

- Docker and Docker Compose installed
- Internet access for the first model download (~2-4 GB)
- ~8 GB RAM recommended

### Quick start

```bash
docker compose up --build
```

### Commands

```bash
docker compose up --build -d   # start detached
docker compose logs -f         # follow logs
docker compose down            # stop and remove containers
```

> `docker compose down -v` also removes the named volumes, deleting the MongoDB
> data and the downloaded Ollama models.

Run these from the `leadiq-backend` directory (the compose file builds the
frontend from `../leadiq-frontend`).

## Deploy to Render

The repository includes a `render.yaml` blueprint. Render must run the
TypeScript build, otherwise `node dist/index.js` fails with `MODULE_NOT_FOUND`,
because `dist/` is gitignored and not present in the repository.

### Option A - Blueprint (uses render.yaml)

New -> Blueprint -> select this repo. Render reads `render.yaml`:

- Build: `npm ci --include=dev && npm run build`
- Start: `npm start`
- Health check: `/api/health`

### Option B - Existing web service (dashboard)

In **Settings**, set:

- **Build Command:** `npm install --include=dev && npm run build`
- **Start Command:** `npm start`

Then **Manual Deploy -> Clear build cache & deploy**.

> `--include=dev` is required: `typescript` is a devDependency, so if
> `NODE_ENV=production` causes the install to skip dev dependencies the build
> fails with no `dist/` output.

### Required environment variables

| Key                   | Notes                                             |
| --------------------- | ------------------------------------------------- |
| `MONGODB_URI`         | MongoDB Atlas connection string                   |
| `FRONTEND_ORIGIN`     | dev frontend origin, e.g. `http://localhost:5173` |
| `FRONTEND_ORIGIN_PROD`| deployed frontend URL (CORS; required in production) |
| `OLLAMA_URL`          | reachable Ollama base URL for AI features         |
| `OLLAMA_MODEL`        | defaults to `qwen3:4b`                            |

> The Render free web service cannot host Ollama in-container. Point
> `OLLAMA_URL` at a reachable Ollama instance, otherwise AI features fail at
> runtime (the server still boots).

After deploy, confirm `GET /api/health` returns `status: "ok"` and
`db: "connected"`.
