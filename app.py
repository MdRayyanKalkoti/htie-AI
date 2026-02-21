"""
app.py — HTIE Flask Backend
Run: pip install flask flask-cors && python app.py
Open: http://localhost:5000
Deploy to Render: gunicorn app:app  (HTTPS auto = install button works)
"""

import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory

try:
    from flask_cors import CORS
except ImportError:
    CORS = None

# static_folder=None so we control ALL routes — no conflict with our
# manifest Content-Type override or the /static/<path> handler.
app = Flask(__name__, static_folder=None)
if CORS:
    CORS(app)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
DB_PATH    = os.path.join(BASE_DIR, 'htie_profiles.db')


# ── DATABASE ──────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY, sessions INTEGER DEFAULT 0,
        total_wpm REAL DEFAULT 0, best_wpm REAL DEFAULT 0,
        total_acc REAL DEFAULT 0, sig_delay INTEGER DEFAULT 120,
        style_class TEXT DEFAULT "AVERAGE", last_update TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT,
        wpm REAL, accuracy REAL, avg_delay INTEGER,
        style_class TEXT, sentence TEXT, recorded_at TEXT)''')
    conn.commit()
    conn.close()

init_db()


# ── ★ PWA CRITICAL — these two routes make install button appear ──

@app.route('/sw.js')
def service_worker():
    # Must be at ROOT /sw.js — scope covers whole app
    # /static/sw.js would only scope /static/ and prompt never fires
    resp = send_from_directory(BASE_DIR, 'sw.js')
    resp.headers['Content-Type']           = 'application/javascript'
    resp.headers['Service-Worker-Allowed'] = '/'
    resp.headers['Cache-Control']          = 'no-cache'
    return resp

@app.route('/static/manifest.json')
def manifest():
    # Must send application/manifest+json header or browser ignores it
    resp = send_from_directory(STATIC_DIR, 'manifest.json')
    resp.headers['Content-Type'] = 'application/manifest+json'
    return resp


# ── MAIN APP + STATIC ─────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory(STATIC_DIR, 'index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(STATIC_DIR, filename)


# ── API — Typing Profiles ─────────────────────────────────

@app.route('/api/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute('SELECT * FROM profiles WHERE user_id=?', (user_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({'found': False}), 404
    return jsonify({'found': True, 'user_id': row[0], 'sessions': row[1],
        'total_wpm': round(row[2],1), 'best_wpm': round(row[3],1),
        'total_acc': round(row[4],1), 'sig_delay': row[5],
        'style_class': row[6], 'last_update': row[7]})

@app.route('/api/profile', methods=['POST'])
def save_profile():
    data = request.get_json()
    if not data or 'user_id' not in data:
        return jsonify({'error': 'user_id required'}), 400
    uid   = data['user_id']
    wpm   = float(data.get('wpm', 0))
    acc   = float(data.get('accuracy', 0))
    delay = int(data.get('avg_delay', 120))
    style = data.get('style_class', 'AVERAGE')
    sent  = data.get('sentence', '')
    now   = datetime.utcnow().isoformat()
    conn  = sqlite3.connect(DB_PATH)
    c     = conn.cursor()
    row   = c.execute('SELECT sessions,total_wpm,best_wpm,total_acc FROM profiles WHERE user_id=?',(uid,)).fetchone()
    if row:
        s, ow, bw, oa = row
        s += 1
        c.execute('UPDATE profiles SET sessions=?,total_wpm=?,best_wpm=?,total_acc=?,sig_delay=?,style_class=?,last_update=? WHERE user_id=?',
            (s, (ow*(s-1)+wpm)/s, max(bw,wpm), (oa*(s-1)+acc)/s, delay, style, now, uid))
    else:
        c.execute('INSERT INTO profiles VALUES (?,1,?,?,?,?,?,?)', (uid,wpm,wpm,acc,delay,style,now))
    c.execute('INSERT INTO sessions (user_id,wpm,accuracy,avg_delay,style_class,sentence,recorded_at) VALUES (?,?,?,?,?,?,?)',
        (uid,wpm,acc,delay,style,sent,now))
    conn.commit()
    conn.close()
    return jsonify({'saved': True, 'user_id': uid})

@app.route('/api/profile/<user_id>', methods=['DELETE'])
def delete_profile(user_id):
    conn = sqlite3.connect(DB_PATH)
    conn.execute('DELETE FROM profiles WHERE user_id=?', (user_id,))
    conn.execute('DELETE FROM sessions WHERE user_id=?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'deleted': True})

@app.route('/api/sessions/<user_id>')
def get_sessions(user_id):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute('SELECT wpm,accuracy,avg_delay,style_class,sentence,recorded_at FROM sessions WHERE user_id=? ORDER BY id DESC LIMIT 20',(user_id,)).fetchall()
    conn.close()
    return jsonify([{'wpm':r[0],'accuracy':r[1],'avg_delay':r[2],'style':r[3],'sentence':r[4],'recorded':r[5]} for r in rows])

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'app': 'HTIE v3', 'db': os.path.exists(DB_PATH)})


# ── RUN ───────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f'\n  HTIE v3 → http://localhost:{port}\n')
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG','true')=='true')