# Quick Start - Run Locally & Share via ngrok

The study needs the Node.js server (`server.js`) and a PostgreSQL database. A plain static file server (e.g. `python -m http.server`) will **not** work, because the app calls the `/api/*` endpoints.

## Prerequisites

- Node.js 18 or newer
- A PostgreSQL database (a free Render database or a local Postgres both work, see [DEPLOY.md](DEPLOY.md#local-development))
- A free [ngrok](https://ngrok.com/download) account (only to share with remote participants)

## Step 1: Install & Configure

```bash
npm install
cp .env.example .env      # on Windows PowerShell: Copy-Item .env.example .env
```

Edit `.env`:
- `DATABASE_URL`: your PostgreSQL connection string
- `STUDY_DATA_URL`: where your study data lives (defaults to the PITCH benchmark data). See [Creating Your Own Study](README.md#creating-your-own-study)

Note: `server.js` reads environment variables from the process, so load `.env` in your shell (or set the variables directly) before starting. Example for bash: `set -a; source .env; set +a`.

## Step 2: Create the Database Tables

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

The script is safe to re-run.

## Step 3: Start the Server

```bash
npm start
```

You should see `Server running on port 3000`, `Database connected successfully`, and `Study data loaded successfully`.

## Step 4: Test Locally

1. Open http://localhost:3000
2. Accept the consent text and enter a test Prolific ID
3. Complete one conversation end to end (all three messages sent or marked not relevant, then "Complete Task")
4. Confirm rows appear in the `user_items` table

## Step 5: Share with ngrok

1. Install ngrok and add your auth token (one-time): `ngrok config add-authtoken YOUR_TOKEN`
2. In a **new terminal** (keep the server running):
   ```bash
   ngrok http 3000
   ```
3. Copy the `https://....ngrok-free.app` URL from the `Forwarding` line and share it with participants

More options (basic auth, monitoring, troubleshooting): [HOSTING.md](HOSTING.md). For persistent hosting: [DEPLOY.md](DEPLOY.md).
