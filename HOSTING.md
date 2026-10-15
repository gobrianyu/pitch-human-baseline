# Hosting Guide - Exposing via ngrok

This guide shows how to host the Message Placement Validation Tool locally and expose it via ngrok for remote participants.

## Prerequisites

1. **ngrok account** (free tier works fine)
   - Sign up at https://ngrok.com/
   - Download ngrok: https://ngrok.com/download
   - Get your auth token from the dashboard

2. **Local web server** (choose one option below)

## Step-by-Step Setup

### Option 1: Using Python (Recommended - Usually Pre-installed)

#### Python 3.x (Most Common)
```bash
# Navigate to the project directory
cd /path/to/your/project

# Start HTTP server on port 8000
python -m http.server 8000
```

#### Python 2.x (If you have older Python)
```bash
python -m SimpleHTTPServer 8000
```

You should see:
```
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

### Option 2: Using Node.js (If you have npm installed)

```bash
# Navigate to the project directory
cd /path/to/your/project

# Install http-server globally (one-time)
npm install -g http-server

# Start server
http-server -p 8000
```

You should see:
```
Starting up http-server, serving ./
Available on:
  http://127.0.0.1:8000
```

### Option 3: Using PHP (If you have PHP installed)

```bash
# Navigate to the project directory
cd /path/to/your/project

# Start PHP built-in server
php -S localhost:8000
```

## Setting Up ngrok

### 1. Install ngrok

#### Windows
1. Download ngrok from https://ngrok.com/download
2. Extract the zip file
3. Move `ngrok.exe` to a folder in your PATH (e.g., `C:\Windows\System32`) or keep it in a dedicated folder

#### Alternative: Use Chocolatey (Windows Package Manager)
```bash
choco install ngrok
```

### 2. Authenticate ngrok

```bash
# Replace YOUR_AUTH_TOKEN with your actual token from ngrok.com dashboard
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 3. Create Tunnel

Open a **NEW terminal/command prompt** (keep the web server running in the first one):

```bash
# Basic tunnel (HTTP only)
ngrok http 8000

# With custom subdomain (requires paid plan)
ngrok http 8000 --subdomain=my-study-tool

# With basic auth protection (recommended for sensitive data)
ngrok http 8000 --basic-auth="username:password"
```

You should see output like:
```
ngrok

Session Status                online
Account                       your@email.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:8000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### 4. Share the URL

The line that says `Forwarding` contains your public URL:
```
https://abc123.ngrok-free.app
```

**Share this HTTPS URL with your participants.**

## Complete Workflow

Here's the complete process in two terminal windows:

### Terminal 1 - Web Server
```bash
cd /path/to/your/project
python -m http.server 8000
```
**Keep this running!**

### Terminal 2 - ngrok Tunnel
```bash
ngrok http 8000
```
**Keep this running!**

Copy the `https://` URL from the ngrok output and share it.

## Testing Your Setup

1. Open the ngrok URL in your own browser first
2. Verify the application loads correctly
3. Test completing an item end-to-end
4. Check the results page works
5. Share with participants once confirmed

## Monitoring & Management

### ngrok Web Interface

While ngrok is running, you can access a local dashboard at:
```
http://localhost:4040
```

This shows:
- All HTTP requests in real-time
- Request/response details
- Connection statistics
- Replay requests for debugging

### Viewing Participants' Activity

The web server terminal shows each request:
```
127.0.0.1 - - [13/Aug/2026 10:30:15] "GET / HTTP/1.1" 200 -
127.0.0.1 - - [13/Aug/2026 10:30:15] "GET /css/styles.css HTTP/1.1" 200 -
127.0.0.1 - - [13/Aug/2026 10:30:15] "GET /js/app.js HTTP/1.1" 200 -
```

## Important Considerations

### Free vs Paid ngrok

**Free Tier:**
- ✅ HTTPS support
- ✅ Random URL (changes each restart)
- ✅ Good for short studies
- ❌ URL expires when ngrok restarts
- ❌ No custom subdomain
- ❌ Limited connections per minute

**Paid Plans:**
- ✅ Reserved subdomains
- ✅ More simultaneous connections
- ✅ Better for professional studies

### Security Best Practices

1. **Use HTTPS**: ngrok provides this automatically (use the `https://` URL, not `http://`)

2. **Add authentication** (optional but recommended):
   ```bash
   ngrok http 8000 --basic-auth="studyuser:securepass123"
   ```
   Participants will need to enter username/password.

3. **Monitor access**: Keep the ngrok dashboard open to see who's connecting

4. **Time-limited access**: Only run ngrok during study hours

5. **Backup results**: Have participants send you their JSON data immediately after completion

### Data Collection Notes

- **No backend**: All data stays in participants' browsers (sessionStorage)
- **Manual collection**: Participants must copy/paste their JSON results to you
- **No automatic tracking**: You won't see results until they send them
- **Session-based**: If they close the browser, their progress is lost

### Alternatives for Production Use

If you need better data collection, consider:

1. **GitHub Pages** (free, but no backend for data collection)
2. **Netlify/Vercel** (free tier available, better for longer studies)
3. **Firebase Hosting + Firestore** (free tier, adds automatic data collection)
4. **Cloud server** (AWS/Azure/GCP - costs money but full control)

## Troubleshooting

### ngrok "command not found"
- Windows: Make sure `ngrok.exe` is in your PATH or use full path: `C:\path\to\ngrok.exe http 8000`
- Add to PATH: Search "Environment Variables" → Edit PATH → Add ngrok folder

### Port Already in Use
```bash
# Try a different port
python -m http.server 8001
ngrok http 8001
```

### CORS Errors
- Not an issue with ngrok (it proxies everything correctly)
- Make sure you're using a proper web server, not just opening `index.html` in browser

### Participants See "502 Bad Gateway"
- Your local web server stopped → Restart it
- Your computer went to sleep → Keep it awake
- Internet connection issue → Check connectivity

### ngrok URL Changes Every Time
- Free tier generates random URLs
- Either: Keep same session running, or upgrade to paid plan for reserved subdomain

## Quick Reference Commands

```bash
# Start web server (choose one)
python -m http.server 8000
npx http-server -p 8000
php -S localhost:8000

# Start ngrok tunnel
ngrok http 8000

# With authentication
ngrok http 8000 --basic-auth="user:pass"

# View ngrok dashboard
# Open browser to: http://localhost:4040
```

## Stopping Everything

1. **Stop ngrok**: Press `Ctrl+C` in the ngrok terminal
2. **Stop web server**: Press `Ctrl+C` in the server terminal

Your local files are unchanged - you can restart anytime.
