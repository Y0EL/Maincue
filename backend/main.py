from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from typing import List, Optional
from datetime import datetime, timedelta
import os
import urllib.request
import json
import base64
import uuid
import uuid
import random
from dotenv import load_dotenv
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_Maincue_Billiard_Premium_2026_Key_Secure_Auth")
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")

def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        if not payload.get("admin"):
            raise HTTPException(status_code=403, detail="Akses ditolak (Bukan Admin)")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")


app = FastAPI(title="maincue.id API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "billiard_local.db"
XENDIT_API_KEY = os.getenv("XENDIT_API_KEY")


def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, balance INTEGER)''')
    try:
        c.execute("ALTER TABLE users ADD COLUMN firebase_uid TEXT UNIQUE")
    except sqlite3.OperationalError:
        pass
    try:
        c.execute("ALTER TABLE users ADD COLUMN email TEXT")
    except sqlite3.OperationalError:
        pass

    c.execute('''CREATE TABLE IF NOT EXISTS tables (id INTEGER PRIMARY KEY, type TEXT, status TEXT, active_until TEXT, active_user_id INTEGER)''')
    c.execute('''CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, table_id INTEGER, status TEXT, duration INTEGER, cost INTEGER, qr_string TEXT, reference_id TEXT)''')
    
    # Add new QR verification logic to bookings
    try:
        c.execute("ALTER TABLE bookings ADD COLUMN verification_code TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        c.execute("ALTER TABLE bookings ADD COLUMN is_verified BOOLEAN DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    # Create events table
    c.execute('''CREATE TABLE IF NOT EXISTS events (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT NOT NULL,
                  date TEXT NOT NULL,
                  description TEXT,
                  image_url TEXT
             )''')
    try:
        c.execute("ALTER TABLE events ADD COLUMN content_html TEXT DEFAULT ''")
    except:
        pass
    try:
        c.execute("ALTER TABLE events ADD COLUMN cta_text TEXT DEFAULT ''")
    except:
        pass
    try:
        c.execute("ALTER TABLE events ADD COLUMN cta_link TEXT DEFAULT ''")
    except:
        pass
             
    # Insert dummy events if empty
    c.execute("SELECT COUNT(*) FROM events")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO events (title, date, description, image_url) VALUES (?, ?, ?, ?)", 
                 ("Weekly 8-Ball Tournament", "Next Friday, 19:00", "Join our elite weekly tournament. First prize is 5 Million IDR.", "none"))
        c.execute("INSERT INTO events (title, date, description, image_url) VALUES (?, ?, ?, ?)", 
                 ("MainCue DJ Night", "Saturday, 21:00", "Live DJ performance while you break the racks.", "none"))
    
    # Insert tables if empty
    c.execute("SELECT COUNT(*) FROM tables")
    if c.fetchone()[0] == 0:
        for i in range(1, 9):
            tbl_type = "VIP" if i <= 2 else "Reguler"
            c.execute("INSERT INTO tables (id, type, status, active_until, active_user_id) VALUES (?, ?, ?, ?, ?)", (i, tbl_type, "Available", None, None))
            
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

class BookingRequest(BaseModel):
    user_id: int
    table_id: int
    duration: int
    players: str

class LoginRequest(BaseModel):
    token: str
    name: str
    email: Optional[str] = None

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class EventCreateRequest(BaseModel):
    title: str
    date: str
    description: str
    image_url: Optional[str] = "none"
    content_html: Optional[str] = ""
    cta_text: Optional[str] = ""
    cta_link: Optional[str] = ""

@app.post("/auth/login")
def login(req: LoginRequest):
    firebase_api_key = os.getenv("FIREBASE_API_KEY")
    if not firebase_api_key:
        raise HTTPException(status_code=500, detail="Server Error: FIREBASE_API_KEY belum dikonfigurasi di .env")
        
    # Verifikasi Token Resmi Firebase via Google Identity Toolkit
    lookup_url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={firebase_api_key}"
    req_google = urllib.request.Request(lookup_url, data=json.dumps({"idToken": req.token}).encode('utf-8'))
    req_google.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req_google, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Autentikasi Firebase Gagal: {str(e)}")
        
    if "users" not in data or len(data["users"]) == 0:
        raise HTTPException(status_code=401, detail="Token Invalid/Palsu. Ditolak.")
        
    firebase_uid = data["users"][0]["localId"]
    real_email = data["users"][0].get("email", req.email)
    
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE firebase_uid = ?", (firebase_uid,))
    user = c.fetchone()
    
    if not user:
        c.execute("INSERT INTO users (name, email, firebase_uid, balance) VALUES (?, ?, ?, ?)", (req.name, real_email, firebase_uid, 0))
        conn.commit()
        user_id = c.lastrowid
        c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = c.fetchone()
        
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    user_dict = dict(user)
    
    # Cek apakah dia punya tiket yang sudah dibayar (Bisa banyak / rombongan)
    c.execute("SELECT id, table_id, duration, verification_code FROM bookings WHERE user_id = ? AND status = 'PAID' AND is_verified = 0 ORDER BY id DESC", (user_dict["id"],))
    pending_tickets = [dict(row) for row in c.fetchall()]
    user_dict["pending_tickets"] = pending_tickets
        
    payload = {
        "user_id": user_dict["id"],
        "exp": int((datetime.now() + timedelta(days=7)).timestamp())
    }
    user_dict["token"] = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    conn.close()
    return user_dict

@app.post("/admin/login")
def admin_login(req: AdminLoginRequest):
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "maincue123")
    
    if req.username == admin_user and req.password == admin_pass:
        payload = {
            "admin": True,
            "exp": int((datetime.now() + timedelta(days=1)).timestamp())
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        return {"token": token, "success": True}
    raise HTTPException(status_code=401, detail="Username atau password salah")

@app.get("/admin/stats")
def admin_stats(admin=Depends(verify_admin_token)):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT SUM(cost), COUNT(id) FROM bookings WHERE is_verified = 1")
    row = c.fetchone()
    conn.close()
    
    return {
        "revenue": row[0] or 0,
        "verified_bookings": row[1] or 0
    }

@app.get("/events")
def get_events():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM events ORDER BY id DESC")
    events = [dict(r) for r in c.fetchall()]
    conn.close()
    return events

@app.post("/admin/events")
def add_event(req: EventCreateRequest, admin=Depends(verify_admin_token)):
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT INTO events (title, date, description, image_url, content_html, cta_text, cta_link) VALUES (?, ?, ?, ?, ?, ?, ?)",
              (req.title, req.date, req.description, req.image_url, req.content_html, req.cta_text, req.cta_link))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Event berhasil ditambahkan"}

@app.delete("/admin/events/{event_id}")
def delete_event(event_id: int, admin=Depends(verify_admin_token)):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM events WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Event dihapus"}

@app.get("/user/{user_id}")
def get_user(user_id: int, auth_user_id: int = Depends(verify_token)):
    if user_id != auth_user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak (Token tidak sesuai)")
        
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    c.execute("SELECT * FROM tables WHERE active_user_id = ? AND status = 'Playing'", (user_id,))
    active_tables = c.fetchall()
    
    res = dict(user)
    
    # Kumpulkan semua meja aktif yang dia mainkan
    res["active_tables"] = [{"id": t["id"], "active_until": t["active_until"]} for t in active_tables]
    
    # Kumpulkan tiket pending (yang belum discan)
    c.execute("SELECT id, table_id, duration, verification_code FROM bookings WHERE user_id = ? AND status = 'PAID' AND is_verified = 0 ORDER BY id DESC", (user_id,))
    res["pending_tickets"] = [dict(row) for row in c.fetchall()]
        
    conn.close()
    return res

@app.get("/tables")
async def get_tables():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM tables")
    rows = c.fetchall()
    
    result = []
    now = datetime.now()
    has_expired_changes = False
    
    for r in rows:
        status = r["status"]
        remaining = None
        active_user_id = r["active_user_id"]
        
        if r["status"] == "Playing" and r["active_until"]:
            active_until = datetime.fromisoformat(r["active_until"])
            if now >= active_until:
                status = "Available"
                active_user_id = None
                conn.execute("UPDATE tables SET status = ?, active_until = NULL, active_user_id = NULL WHERE id = ?", (status, r['id']))
                conn.commit()
                has_expired_changes = True
            else:
                diff = active_until - now
                hours, remainder = divmod(diff.seconds, 3600)
                minutes = remainder // 60
                remaining = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
                
        # Handle "Reserved" status timeout (QR payment has expired)
        if r["status"] == "Reserved" and r["active_until"]:
            active_until = datetime.fromisoformat(r["active_until"])
            if now >= active_until:
                status = "Available"
                active_user_id = None
                conn.execute("UPDATE tables SET status = ?, active_until = NULL, active_user_id = NULL WHERE id = ?", (status, r['id']))
                conn.commit()
                has_expired_changes = True
                
        result.append({
            "id": r["id"],
            "type": r["type"],
            "status": status,
            "remaining": remaining,
            "active_user_id": active_user_id
        })
    conn.close()
    
    if has_expired_changes:
        await manager.broadcast("tables_updated")
        
    return result

@app.post("/book")
async def book_table(req: BookingRequest, auth_user_id: int = Depends(verify_token)):
    if req.user_id != auth_user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak (Token tidak sesuai)")
        
    conn = get_db()
    c = conn.cursor()
    
    cost = req.duration * 45000
    
    c.execute("SELECT status FROM tables WHERE id = ?", (req.table_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Meja tidak ditemukan")
        
    # Optimistic locking prevent Race Condition (Double Booking)
    expiry = datetime.now() + timedelta(minutes=15)
    c.execute("UPDATE tables SET status = 'Reserved', active_until = ?, active_user_id = ? WHERE id = ? AND status = 'Available'", (expiry.isoformat(), req.user_id, req.table_id))
    if c.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Meja sedang dipakai atau baru saja dibooking pengguna lain.")
    conn.commit()
        
    # Create Booking using Xendit
    ext_id = f"bkg_{uuid.uuid4().hex[:8]}"
    
    try:
        url = "https://api.xendit.co/qr_codes"
        auth_str = f"{XENDIT_API_KEY}:"
        b64_auth_str = base64.b64encode(auth_str.encode()).decode()
        
        data = {
            "reference_id": ext_id,
            "type": "DYNAMIC",
            "currency": "IDR",
            "amount": cost
        }
        
        req_xendit = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'))
        req_xendit.add_header('Authorization', f'Basic {b64_auth_str}')
        req_xendit.add_header('Content-Type', 'application/json')
        req_xendit.add_header('api-version', '2022-07-31')
        
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req_xendit, timeout=10) as response:
                    res_data = json.loads(response.read().decode('utf-8'))
                    qr_string = res_data.get('qr_string')
                    break
            except Exception as e:
                if attempt == 2:
                    raise e
                    
        # Insert booking
        c.execute("INSERT INTO bookings (user_id, table_id, status, duration, cost, qr_string, reference_id) VALUES (?, ?, 'PENDING', ?, ?, ?, ?)", (req.user_id, req.table_id, req.duration, cost, qr_string, ext_id))
        booking_id = c.lastrowid
        conn.commit()
        
        return {
            "success": True, 
            "booking_id": booking_id, 
            "qr_string": qr_string,
            "amount": cost
        }
            
    except Exception as e:
        # Rollback temporary reserved status if Xendit failed
        c.execute("UPDATE tables SET status = 'Available', active_until = NULL, active_user_id = NULL WHERE id = ?", (req.table_id,))
        conn.commit()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        await manager.broadcast("tables_updated")

@app.get("/booking/{booking_id}")
def get_booking(booking_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,))
    booking = c.fetchone()
    conn.close()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return dict(booking)

@app.post("/admin/verify-ticket")
async def verify_ticket(verification_code: str, admin=Depends(verify_admin_token)):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM bookings WHERE verification_code = ? AND is_verified = 0", (verification_code,))
    booking = c.fetchone()
    
    if not booking:
        conn.close()
        raise HTTPException(status_code=404, detail="Tiket tidak valid atau sudah digunakan")
        
    # Start the timer
    now = datetime.now()
    active_until = now + timedelta(hours=booking["duration"])
    c.execute("UPDATE tables SET status = 'Playing', active_until = ? WHERE id = ?", (active_until.isoformat(), booking["table_id"]))
    c.execute("UPDATE bookings SET is_verified = 1 WHERE id = ?", (booking["id"],))
    
    conn.commit()
    conn.close()
    await manager.broadcast("tables_updated")
    return {"status": "success", "message": "Tiket berhasil diverifikasi. Waktu dimulai."}

@app.post("/xendit/webhook")
async def xendit_webhook(request: Request):
    signature = request.headers.get("x-callback-token")
    env_token = os.getenv("XENDIT_WEBHOOK_TOKEN")
    if env_token and signature != env_token:
        raise HTTPException(status_code=403, detail="Invalid callback token")

    data = await request.json()
    event = data.get("event")
    
    if event == "qr.payment": 
        # This is for QR code payment success
        status = data.get("data", {}).get("status")
        reference_id = data.get("data", {}).get("reference_id")
        
        if status == "SUCCEEDED":
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM bookings WHERE reference_id = ?", (reference_id,))
            booking = c.fetchone()
            
            if booking and booking["status"] == "PENDING":
                v_code = f"MC-{random.randint(1000, 9999)}"
                c.execute("UPDATE bookings SET status = 'PAID', verification_code = ? WHERE id = ?", (v_code, booking["id"]))
                c.execute("UPDATE tables SET status = 'Reserved' WHERE id = ?", (booking["table_id"],))
                conn.commit()
                await manager.broadcast("tables_updated")
            conn.close()
            
    return {"status": "ok"}

@app.post("/simulate-payment/{booking_id}")
async def simulate_payment(booking_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,))
    booking = c.fetchone()
    
    if not booking or booking["status"] != "PENDING":
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid booking")
        
    v_code = f"MC-{random.randint(1000, 9999)}"
    c.execute("UPDATE bookings SET status = 'PAID', verification_code = ? WHERE id = ?", (v_code, booking["id"]))
    c.execute("UPDATE tables SET status = 'Reserved' WHERE id = ?", (booking["table_id"],))
    
    conn.commit()
    conn.close()
    await manager.broadcast("tables_updated")
    return {"success": True, "verification_code": v_code}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
