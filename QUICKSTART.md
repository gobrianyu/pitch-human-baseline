# Quick Start - Host & Expose in 5 Minutes

## For Windows Users

### Step 1: Start Local Server
1. Open Command Prompt or PowerShell
2. Navigate to this folder:
   ```bash
   cd /path/to/your/project
   ```
3. Run:
   ```bash
   python -m http.server 8000
   ```
4. **Keep this terminal open!**

You should see:
```
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

### Step 2: Test Locally (Optional)

1. Open browser to: http://localhost:8000
2. Verify the app loads correctly
3. Test completing one item end-to-end

### Step 3: Install & Setup ngrok (One-Time)

#### Install ngrok
1. Go to https://ngrok.com/download
2. Download for Windows
3. Extract `ngrok.exe` anywhere (e.g., Downloads folder)

#### Get Auth Token
1. Sign up at https://ngrok.com (free)
2. Copy your auth token from the dashboard
3. Open a **new** Command Prompt/PowerShell
4. Run (replace with your token):
   ```bash
   C:\path\to\ngrok.exe config add-authtoken YOUR_TOKEN_HERE
   ```

### Step 4: Create Public Tunnel

In a **new terminal** (keep the server running in the first one):

```bash
# If ngrok is in Downloads folder:
C:\path\to\ngrok.exe http 8000

# If you moved it to a PATH location:
ngrok http 8000
```

### Step 5: Share the URL

Look for the line that says:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:8000
```

**Copy the `https://abc123.ngrok-free.app` URL** and share it with participants.
- Full hosting guide: See [HOSTING.md](HOSTING.md)
- Web interface: http://localhost:4040 (while ngrok running)