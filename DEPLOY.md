# Production Deployment Guide

This guide explains how to deploy the Message Placement Study platform to production with a PostgreSQL database. Examples use Render, but the principles apply to Railway, Heroku, DigitalOcean, and other platforms.

## Prerequisites

1. A Render account (https://render.com)
2. Node.js 18+ installed locally (for testing)
3. A Git repository (GitHub, GitLab, or Bitbucket)
4. A study data file reachable by URL or in the repo (see [Creating Your Own Study](README.md#creating-your-own-study))

## Quick Deploy (Recommended)

The repo includes a `render.yaml` blueprint that defines a web service (`proski-human-annos`) and a Postgres database (`proski-db`).

1. Go to https://render.com/dashboard
2. Click **New** → **Blueprint**
3. Connect your Git repository
4. Render creates the database and web service and links them via `DATABASE_URL`
5. **Initialize the schema** (the blueprint does not do this): see [Initialize Database Schema](#initialize-database-schema)
6. Optional: in the web service **Environment** tab, add `STUDY_DATA_URL` to use your own data (defaults to the PITCH benchmark data)

## Manual Deploy (Alternative)

### Step 1: Create Postgres Database

1. **New** → **PostgreSQL**
2. Choose a name, database, user, and region close to your participants
3. Pick a plan (free databases on Render expire, so use a paid plan for real studies)
4. Wait for the database to be ready (1-2 minutes)

### Initialize Database Schema

1. In the database dashboard, click **Connect** → **PSQL Command** and run the command in your terminal
2. Apply the schema:
   ```bash
   psql "<External Database URL>" -f db/schema.sql
   ```
   or paste the contents of `db/schema.sql` into the psql prompt

The script creates `users`, `sessions`, `user_items`, and `bot_flags`, and is safe to re-run (it also adds the bot-detection columns to older databases).

### Step 2: Create Web Service

1. **New** → **Web Service** and connect your repository
2. Configure:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Region**: same as the database

### Step 3: Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Use "Add from Database" → **Internal Database URL** |
| `STUDY_DATA_URL` | No | GitHub raw URL, any public URL, or a path relative to the project root. Defaults to the PITCH benchmark data |
| `NODE_ENV` | No | Set to `production` by the blueprint. In production the database connection uses SSL |
| `PORT` | No | Provided by the platform, defaults to 3000 |

### Step 4: Deploy

Click **Create Web Service**. Render clones the repo, runs `npm install`, starts `npm start`, and gives you a URL such as `https://your-service.onrender.com`.

## Testing Your Deployment

1. Visit `<your URL>/health`: it should return `{"status":"ok", ...}`
2. Check the service logs for `Database connected successfully` and `Study data loaded successfully`
3. Open the site, enter a test Prolific ID, and complete one conversation (send or mark all three messages, then "Complete Task")
4. Verify rows were saved (see below)

Remember to delete your test rows before launching the study.

## Prolific Setup

The completion code and redirect URL are set in `js/config.js` (`prolificCompletionUrl`) and the completion screen in `index.html`. Update both to your own study's completion code before launching.

## Viewing and Exporting Data

Each message is stored as one row in `user_items`. A participant's batch shares a `batch_id`, with `message_index` 1-3.

```sql
-- Responses with participant IDs
SELECT u.prolific_id, ui.batch_id, ui.message_index, ui.knowledge_item_id,
       ui.conversation_id, ui.user_choice, ui.not_relevant, ui.reasoning,
       ui.completed_at
FROM user_items ui
JOIN users u ON u.id = ui.user_id
WHERE ui.status = 'completed'
ORDER BY ui.completed_at;
```

Export to CSV from psql:
```bash
psql "$DATABASE_URL" -c "\copy (SELECT u.prolific_id, ui.* FROM user_items ui JOIN users u ON u.id = ui.user_id WHERE ui.status = 'completed') TO 'responses.csv' CSV HEADER"
```

`user_choice` is the turn number after which the message was placed (`NULL` when `not_relevant` is true). `ground_truth` and `item_data` hold the original item as JSON.

## Bot Detection Review

Each submission carries a bot-detection score, a full report, and timing data. Individual violations are stored in `bot_flags`. Review endpoints:

- `GET /api/bot-stats`: counts of clean (score < 21), suspicious (21-50), and flagged (51+) submissions
- `GET /api/bot-review?minScore=21&limit=100`: submissions at or above a score
- `GET /api/bot-flags/:userItemId`: violations for one submission

These endpoints are unauthenticated, so avoid exposing them publicly if that matters for your study.

## Local Development

### Using a Render Database

1. `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to the **External** connection string
3. Load the variables into your shell (the server reads `process.env` and does not load `.env` itself), e.g. `set -a; source .env; set +a`
4. `npm run dev`
5. Visit http://localhost:3000

### Using Local Postgres

1. Start Postgres, for example with Docker:
   ```bash
   docker run --name postgres-local -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
   ```
2. Create the database and apply the schema:
   ```bash
   createdb message_study
   psql -d message_study -f db/schema.sql
   ```
3. Set `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/message_study"` and `NODE_ENV=development` in `.env`, load it into your shell, then run `npm run dev`
