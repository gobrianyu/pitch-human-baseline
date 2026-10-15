# Production Deployment Guide

This guide explains how to deploy the Message Placement Study platform to production with a PostgreSQL database. Examples use Render, but the principles apply to Railway, Heroku, DigitalOcean, and other platforms.

## Prerequisites

1. A Render account (https://render.com)
2. Node.js installed locally (for testing)
3. Git repository set up (GitHub, GitLab, or Bitbucket)

## Quick Deploy (Recommended)

The easiest way to deploy is using the `render.yaml` blueprint:

1. Go to https://render.com/dashboard
2. Click **New** → **Blueprint**
3. Connect your Git repository
4. Render will automatically:
   - Create a Postgres database
   - Create a web service
   - Link them together
   - Deploy your app

## Manual Deploy (Alternative)

### Step 1: Create Postgres Database

1. Go to https://render.com/dashboard
2. Click **New** → **PostgreSQL**
3. Configure:
   - **Name**: `message-study-db` (or your choice)
   - **Database**: `message_study`
   - **User**: `study_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free (or paid for production)
4. Click **Create Database**
5. Wait for database to be ready (takes 1-2 minutes)

### Step 2: Initialize Database Schema

1. In your database dashboard, click **Connect** → **PSQL Command**
2. Copy the `psql` command
3. Run it in your terminal
4. Once connected, copy and paste the contents of `db/schema.sql`
5. Execute it

Alternatively, use the web shell in Render dashboard or any Postgres client with the Internal Database URL.

### Step 3: Create Web Service

1. Click **New** → **Web Service**
2. Connect your Git repository
3. Configure:
   - **Name**: `message-study-platform`
   - **Environment**: `Node`
   - **Region**: Same as database
   - **Branch**: `main` (or your deployment branch)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for production)

### Step 4: Add Environment Variables

In your web service settings, go to **Environment** tab and add:

- **Key**: `DATABASE_URL`
- **Value**: Click "Add from Database" → Select your database → Choose "Internal Database URL"

Render will automatically set `NODE_ENV=production`.

### Step 5: Deploy

Click **Create Web Service**. Render will:
1. Clone your repository
2. Install dependencies
3. Start the server
4. Provide you with a URL (e.g., `https://message-study-platform.onrender.com`)

## Step 6: Test Your Deployment

1. Visit your Render URL
2. Enter a test Prolific ID
3. Complete the study workflow
4. Check the database to verify data was saved

## Local Development

### Using Render Database

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
# Copy from Render dashboard -> Database -> Connection String (External)
DATABASE_URL="postgresql://user:password@host:port/database"
PORT=3000
NODE_ENV=development
```

3. Run the server:
```bash
npm run dev
```

4. Visit http://localhost:3000

### Using Local Postgres

1. Install PostgreSQL locally or use Docker:
```bash
docker run --name postgres-local -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

2. Create database and run schema:
```bash
createdb message_study
psql -d message_study -f db/schema.sql
```

3. Create `.env`:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/message_study"
PORT=3000
NODE_ENV=development
```

4. Run the server:
```bash
npm run dev
```
