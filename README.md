# HTIE v3 — VS Code Project Structure & Setup Guide

## 📁 Folder Structure (open this folder in VS Code)

```
htie_project/                        ← Open THIS folder in VS Code
│
├── app.py                           ← Flask server (main backend)
├── requirements.txt                 ← Python packages to install
├── .env                             ← Local environment variables
├── .gitignore                       ← Git ignore rules
├── htie_profiles.db                 ← SQLite DB (auto-created on first run)
│
├── sw.js                            ← ★ Service Worker (MUST be at root)
│                                       Served at: https://yoursite.com/sw.js
│
└── static/                          ← All frontend files
    ├── index.html                   ← Main HTML (the full app UI)
    ├── htie.js                      ← All JavaScript logic
    ├── favicon.svg                  ← Browser tab icon + home screen icon
    └── manifest.json                ← PWA manifest (install metadata)
```

---

## ★ WHY These Files Are Critical for PWA Install Button

| File | Served At | Why It's Needed |
|------|-----------|-----------------|
| `sw.js` | `/sw.js` (root) | Must be at root scope to control all pages. Blob URLs **never** trigger `beforeinstallprompt` |
| `manifest.json` | `/static/manifest.json` | Must have `Content-Type: application/manifest+json` header. Flask sets this. |
| `app.py` | — | Sets correct headers, serves sw.js from root, provides HTTPS via deployment |
| HTTPS | Any cloud host | Browsers **refuse** PWA install on plain HTTP. Required for install button. |

---

## 🚀 VS Code Setup — Step by Step

### Step 1 — Open the project
```
File → Open Folder → select htie_project/
```

### Step 2 — Open the integrated terminal
```
Terminal → New Terminal     (or Ctrl + `)
```

### Step 3 — Create a virtual environment
```bash
python -m venv venv
```

### Step 4 — Activate it
```bash
# Windows
venv\Scripts\activate

# Mac / Linux
source venv/bin/activate
```

### Step 5 — Install packages
```bash
pip install -r requirements.txt
```

### Step 6 — Run the server
```bash
python app.py
```

### Step 7 — Open in browser
```
http://localhost:5000
```

> ⚠️ PWA install button will NOT appear on localhost HTTP.
> You must deploy with HTTPS for the button to show.

---

## 🌐 Deploy to Render (Free — HTTPS Automatic)

1. Push project to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Set these values:

| Field | Value |
|-------|-------|
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app` |
| Environment | Python 3 |

5. Click Deploy → Render gives you `https://yourapp.onrender.com`
6. Visit it in Chrome → **install button appears** ✓

---

## 🔗 API Endpoints (from app.py)

| Method | URL | What it does |
|--------|-----|-------------|
| `GET`  | `/` | Serves the app |
| `GET`  | `/sw.js` | Serves service worker (scope: /) |
| `GET`  | `/static/manifest.json` | Serves manifest with correct headers |
| `GET`  | `/api/profile/<user_id>` | Load saved typing profile |
| `POST` | `/api/profile` | Save typing session result |
| `DELETE` | `/api/profile/<user_id>` | Delete profile + all sessions |
| `GET`  | `/api/sessions/<user_id>` | Get last 20 sessions |
| `GET`  | `/api/health` | Health check (for Render) |

---

## 📦 PWA Install Flow (complete picture)

```
User visits https://yourapp.onrender.com  (HTTPS required)
          ↓
Browser downloads /sw.js → registers it
          ↓
Browser reads /static/manifest.json
          ↓
Both conditions met → browser fires beforeinstallprompt
          ↓
htie.js catches it → saves to deferredPrompt
          ↓
Gold install bar appears at top of page
          ↓
User clicks ⬇ Install App
          ↓
deferredPrompt.prompt() → native OS dialog appears
          ↓
User clicks Install
          ↓
App added to home screen / desktop
          ↓
appinstalled event fires → bar hides ✓
```

---

## 🧩 VS Code Extensions (Recommended)

Install these from the Extensions panel (`Ctrl+Shift+X`):

| Extension | Why |
|-----------|-----|
| **Python** (Microsoft) | IntelliSense, debugger for app.py |
| **Pylance** | Type checking for Python |
| **Flask Snippets** | Flask route shortcuts |
| **Live Server** | Preview HTML (note: use Flask for full PWA) |
| **SQLite Viewer** | View htie_profiles.db visually in VS Code |
| **ESLint** | JavaScript linting for htie.js |
| **Prettier** | Auto-format HTML/JS/JSON |
| **GitLens** | Git history and blame |

---

## 🐛 Debug in VS Code (for app.py)

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Flask",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/app.py",
      "env": {
        "FLASK_DEBUG": "true",
        "PORT": "5000"
      },
      "console": "integratedTerminal"
    }
  ]
}
```
Then press **F5** to run Flask with the VS Code debugger. Set breakpoints in app.py by clicking the red dot beside any line number.