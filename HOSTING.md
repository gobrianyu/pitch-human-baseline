# Hosting Guide - Exposing a Local Server via ngrok

This guide covers sharing the study from your own machine with remote participants. For first-time setup, start with [QUICKSTART.md](QUICKSTART.md). For persistent hosting, see [DEPLOY.md](DEPLOY.md).

## How It Works

The app is served by the Express server (`server.js`, port 3000 by default), which also provides the `/api/*` endpoints and talks to PostgreSQL. ngrok creates a public HTTPS URL that tunnels to that server.

**Requirements:**
- The server is running (`npm start`) with a working `DATABASE_URL` and the schema applied (`db/schema.sql`)
- Your computer stays on, awake, and online for the whole study
- The database is reachable from your machine

A static file server (Python `http.server`, `http-server`, `php -S`) cannot be used, because there would be no API or database.

## Setting Up ngrok

1. Download ngrok from https://ngrok.com/download (or `choco install ngrok` on Windows)
2. Add your auth token from the ngrok dashboard (one-time):
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

## Running

**Terminal 1 - app server**
```bash
npm start
```

**Terminal 2 - tunnel**
```bash
# Basic tunnel
ngrok http 3000

# With basic auth in front of the whole site
ngrok http 3000 --basic-auth="username:password"
```

Share the `https://` URL on the `Forwarding` line. If you set `PORT` in `.env`, use that port instead of 3000.

> Basic auth is not suitable for Prolific participants (they would need the credentials). Use it only for private testing.

## Testing Your Setup

1. Open the ngrok URL in your own browser
2. Enter a test Prolific ID and complete one conversation end to end
3. Check the `user_items` table for your responses (see [DEPLOY.md](DEPLOY.md#viewing-and-exporting-data))
4. Open `<ngrok URL>/health` and confirm it returns `{"status":"ok", ...}`

## Monitoring

- **ngrok dashboard:** http://localhost:4040 shows requests in real time and lets you replay them
- **Server terminal:** logs each API call, data loading, and bot-detection warnings
- **Bot review endpoints:** `/api/bot-stats`, `/api/bot-review`, `/api/bot-flags/:userItemId` (see [DEPLOY.md](DEPLOY.md#bot-detection-review))

## Free vs Paid ngrok

**Free:** HTTPS, random URL that changes on every restart, limited connections per minute. Fine for short studies.

**Paid:** reserved domains and higher connection limits, better for longer studies.

If the URL changes mid-study, participants with the old link will see an error, so keep ngrok running for the entire study.

## Data Collection Notes

- Responses are saved to PostgreSQL as participants go, one row per message in `user_items`
- Participants who close the browser can resume the same batch by re-entering the same Prolific ID, since progress is stored server-side
- Each Prolific ID is assigned conversations it has not seen before

## Troubleshooting

**Server cannot reach the database**
Check that `DATABASE_URL` is set in the shell that runs `npm start` and that the startup log says `Database connected successfully`.

**`Failed to load study data` on startup**
`STUDY_DATA_URL` is unreachable or invalid JSON. If it is a local path, it is resolved relative to the project folder.

**"No more conversation batches available" for a participant**
They have already completed every conversation that still has at least three eligible messages.

**ngrok "command not found"**
Add the ngrok folder to your PATH or call it by full path, e.g. `C:\path\to\ngrok.exe http 3000`.

**Port already in use**
Set another `PORT` in `.env`, restart the server, and run `ngrok http <that port>`.

**Participants see "502 Bad Gateway"**
The server stopped, the computer went to sleep, or the connection dropped. Restart `npm start` (the ngrok tunnel can stay up).

## Stopping

Press `Ctrl+C` in the ngrok terminal and then in the server terminal. Your data stays in the database.
