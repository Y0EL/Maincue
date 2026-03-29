import requests
import json
import time

BASE_URL = "http://localhost:8000"

def run_tests():
    print("--- STARTING TESTS ---")
    
    # 1. Test Login
    print("\n1. Testing Login...")
    login_data = {
        "firebase_uid": "test_uid_999",
        "name": "Super Tester",
        "email": "super@tester.com"
    }
    
    res = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if res.status_code != 200:
        print(f"❌ Login failed! {res.status_code} - {res.text}")
        return
        
    user_data = res.json()
    token = user_data.get("token")
    user_id = user_data.get("id")
    print(f"✅ Login success! User ID: {user_id}, Token received: {token[:15]}...")
    
    # 2. Test Get User WITHOUT token (Should fail)
    print("\n2. Testing Protected Route Without Token...")
    res = requests.get(f"{BASE_URL}/user/{user_id}")
    if res.status_code == 403:
        print(f"✅ Route protected correctly! Got {res.status_code}")
    else:
        print(f"❌ FAILED! Expected 403, got {res.status_code} - {res.text}")
        
    # 3. Test Get User WITH token (Should succeed)
    print("\n3. Testing Protected Route With Token...")
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/user/{user_id}", headers=headers)
    if res.status_code == 200:
        print(f"✅ Authorized access success! User Name: {res.json().get('name')}")
    else:
        print(f"❌ Authorized access failed! {res.status_code} - {res.text}")

    # 4. Test Booking WITH token
    print("\n4. Testing Booking...")
    booking_data = {
        "user_id": user_id,
        "table_id": 1,
        "duration": 2,
        "players": "1-2"
    }
    
    res = requests.post(f"{BASE_URL}/book", json=booking_data, headers=headers)
    if res.status_code == 200:
        print(f"✅ Booking success! Booking ID: {res.json().get('booking_id')}")
    elif res.status_code == 400 and "sedang dipakai" in res.text.lower():
        print(f"✅ Expected failure (Table already booked by previous test): {res.text}")
    else:
        print(f"❌ Booking failed! {res.status_code} - {res.text}")
        
    print("\n--- ALL TESTS COMPLETED ---")

if __name__ == "__main__":
    run_tests()
