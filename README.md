# Billiard Pro oleh Maincue
*Sistem Reservasi dan Manajemen Premium untuk Billiard Hall*

## Gambaran Umum
Billiard Pro adalah aplikasi tingkat produksi (production-grade) yang dirancang untuk mendukung operasional arena billiard modern. Sistem ini menyediakan manajemen meja secara *real-time*, reservasi dinamis berbasis kode QR, pengawasan administratif terstruktur, serta antarmuka pengguna yang imersif yang dibangun menggunakan tumpukan teknologi modern berkinerja tinggi.

## Arsitektur dan Tumpukan Teknologi
**Frontend:** 
- Next.js 15, React 19, Tailwind CSS v4
- Framer Motion untuk transisi antarmuka
- React-Zxing untuk pemindaian QR berbasis peramban (browser)

**Backend:**
- Python FastAPI
- SQLite untuk persistensi data terstruktur
- WebSockets untuk sinkronisasi klien dua arah secara seketika (*real-time*)

**Keamanan:**
- Firebase Authentication untuk identitas pengguna dinamis
- JWT (JSON Web Tokens) untuk otorisasi API dan sesi Admin
- Isolasi kredensial berbasis lingkungan (Environment)

## Fitur Sistem

### 1. Operasional Meja Real-Time
- Pelacakan status langsung (Tersedia, Bermain, Dipesan) yang memanfaatkan koneksi WebSocket latensi sangat rendah, yang sepenuhnya mengeliminasi kebutuhan proses perbaruan interval (*polling*).
- Kedaluwarsa sesi secara otomatis dan mekanisme penguncian basis data untuk mencegah pemesanan ganda (double-booking) secara bersamaan.

### 2. Antarmuka Reservasi Klien
- Antarmuka (UI) responsif yang menampilkan bahasa desain premium terstruktur serta desain abstrak.
- Kemampuan pemesanan multi-meja yang memungkinkan pemilihan blok waktu secara dinamis.
- Arsitektur dompet (Wallet) yang mendukung pemotongan saldo transaksional secara instan.
- Pengalaman interaktif melalui *modal* asli (native) untuk konfirmasi pesanan dan tinjauan acara kaya teks (rich-text).

### 3. Operasional Administratif
- Pusat Komando yang diamankan oleh token, dapat diakses sepenuhnya melalui rute `/admin`.
- Pemindai QR Web terintegrasi yang memungkinkan staf di lokasi untuk memverifikasi pesanan pelanggan secara fisik sekaligus untuk memicu penghitung waktu mundur.
- Dasbor operasional langsung yang menampilkan pencatatan pendapatan transaksional yang telah terverifikasi secara akurat.
- Kapabilitas Sistem Manajemen Konten (CMS) untuk menyusun pengumuman acara berformat teks kaya (HTML) serta tautan *Call-To-Action* (panggilan bertindak) eksternal secara dinamis untuk pelanggan.

## Konfigurasi Sistem
Keseluruhan kode proyek ini dipisahkan secara ketat menjadi dua domain independen (Klien dan API) guna mendukung strategi pengerahan/peluncuran (deployment) yang dapat dipisahkan aslinya.

### Aplikasi Frontend (`app/`)
Buat berkas `.env.local` untuk mendefinisikan konfigurasi lingkungan klien. Variabel berikut akan digabungkan pada proses pemaketan (*build*).
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# Variabel routing dasar (wajib dirubah ke domain asli saat deployment):
NEXT_PUBLIC_API_URL=https://[DOMAIN_ANDA]/api
NEXT_PUBLIC_WS_URL=wss://[DOMAIN_ANDA]/api/ws
```

### API Backend (`backend/`)
Buat berkas `.env` di direktori akar *backend* untuk mengamankan seluruh kredensial dari sistem kontrol versi terbuka (misal: Git/GitHub).
```env
FIREBASE_API_KEY=...
JWT_SECRET=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
XENDIT_API_KEY=...
```

## Menjalankan Lingkungan Pengembangan (Development)

**1. Inisialisasi API Layanan (Backend)**
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# atau jalankan melalui python main.py
```
*Catatan: Instansi basis data SQLite (`billiard_local.db`) beserta data contoh akan otomatis diinisialisasi pada saat kode pertama kali dijalankan.*

**2. Inisialisasi Aplikasi Klien (Frontend)**
```bash
cd app
npm install
npm run dev
```
Antarmuka layanan pelanggan dapat diakses dan diuji pada url: `http://localhost:3000`.
Rute pengaturan administratif terpusat dapat diakses pada url: `http://localhost:3000/admin`.

## Panduan Pengerahan (Deployment)
- **Pengembangan Frontend:** Proses artifak kode menggunakan perintah `npm run build`. Kerahkan tumpukan sistem ini menggunakan Node.js ke peladen atau layanan modern seperti Vercel. Pastikan seluruh variabel *environment* telah diinjeksi dengan tepat selama pipa implementasi berjalan (CI/CD pipeline).
- **Pengembangan Backend:** Jalankan basis Python FastAPI melalui utilitas peladen produksi (seperti Gunicorn/Uvicorn). Serta *Proxy HTTP* (misalnya Nginx) yang sangat wajib dikonfigurasi untuk meneruskan koneksi dasar ke rute `/api` dan untuk meningkatkan (*upgrade*) kemampuan protokol secara spesifik agar WebSockets di rute `/api/ws` dapat beroperasi normal.

---
*Maincue, 2026. Merupakan Produk Kepemilikan (Proprietary) yang Bersifat Rahasia.*
