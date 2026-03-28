from fastapi import FastAPI, HTTPException, Request
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

app = FastAPI(title="maincue.id API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "billiard_local.db"
XENDIT_API_KEY = "xnd_development_YCsEcMRJs5Ci5XU2BRxmvD2ELE8sOzjXeqS1aIPUvx9zgcOXhn0sBE39IyJ9i"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, balance INTEGER)''')
    c.execute('''CREATE TABLE IF NOT EXISTS tables (id INTEGER PRIMARY KEY, type TEXT, status TEXT, active_until TEXT, active_user_id INTEGER)''')
    c.execute('''CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, table_id INTEGER, status TEXT, duration INTEGER, cost INTEGER, qr_string TEXT, reference_id TEXT)''')
    
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
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

class BookingRequest(BaseModel):
    user_id: int
    table_id: int
    duration: int
    players: str

class LoginRequest(BaseModel):
    username: str

@app.post("/auth/login")
def login(req: LoginRequest):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE name = ?", (req.username,))
    user = c.fetchone()
    
    if not user:
        c.execute("INSERT INTO users (name, balance) VALUES (?, ?)", (req.username, 0))
        conn.commit()
        user_id = c.lastrowid
        c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = c.fetchone()
        
    conn.close()
    return dict(user)

@app.get("/user/{user_id}")
def get_user(user_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    c.execute("SELECT * FROM tables WHERE active_user_id = ?", (user_id,))
    active_table = c.fetchone()
    
    res = dict(user)
    if active_table:
        res["active_table_id"] = active_table["id"]
        res["active_until"] = active_table["active_until"]
    else:
        res["active_table_id"] = None
        
    conn.close()
    return res

@app.get("/tables")
def get_tables():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM tables")
    rows = c.fetchall()
    
    result = []
    now = datetime.now()
    
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
                
        result.append({
            "id": r["id"],
            "type": r["type"],
            "status": status,
            "remaining": remaining,
            "active_user_id": active_user_id
        })
    conn.close()
    return result

@app.post("/book")
def book_table(req: BookingRequest):
    conn = get_db()
    c = conn.cursor()
    
    cost = req.duration * 45000
    
    c.execute("SELECT status FROM tables WHERE id = ?", (req.table_id,))
    row = c.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Meja tidak ditemukan")
    if row["status"] in ["Playing", "Reserved"]:
        raise HTTPException(status_code=400, detail="Meja sedang dipakai atau menunggu pembayaran")
        
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
                    
        # Temporary block table for 15 minutes waiting for payment
        expiry = datetime.now() + timedelta(minutes=15)
        c.execute("UPDATE tables SET status = 'Reserved', active_until = ?, active_user_id = ? WHERE id = ?", (expiry.isoformat(), req.user_id, req.table_id))
        
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
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

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

@app.post("/xendit/webhook")
async def xendit_webhook(request: Request):
    data = await request.json()
    
    event = data.get("event")
    
    if event == "qr.payment": 
        payload = data.get("data", {})
        reference_id = payload.get("reference_id")
        status = payload.get("status")

        if status == "SUCCEEDED":
            conn = get_db()
            c = conn.cursor()
            
            c.execute("SELECT * FROM bookings WHERE reference_id = ?", (reference_id,))
            booking = c.fetchone()
            
            if booking and booking["status"] == "PENDING":
                c.execute("UPDATE bookings SET status = 'SUCCESS' WHERE id = ?", (booking["id"],))
                
                now = datetime.now()
                active_until = now + timedelta(hours=booking["duration"])
                c.execute("UPDATE tables SET status = 'Playing', active_until = ?, active_user_id = ? WHERE id = ?", 
                          (active_until.isoformat(), booking["user_id"], booking["table_id"]))
                
                conn.commit()
            conn.close()

    return {"status": "ok"}

@app.post("/simulate-payment/{booking_id}")
def simulate_payment(booking_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,))
    booking = c.fetchone()
    
    if not booking or booking["status"] != "PENDING":
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid booking")
        
    c.execute("UPDATE bookings SET status = 'SUCCESS' WHERE id = ?", (booking["id"],))
    now = datetime.now()
    active_until = now + timedelta(hours=booking["duration"])
    c.execute("UPDATE tables SET status = 'Playing', active_until = ?, active_user_id = ? WHERE id = ?", 
              (active_until.isoformat(), booking["user_id"], booking["table_id"]))
    
    conn.commit()
    conn.close()
    return {"success": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
