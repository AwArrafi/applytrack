# Deploy ApplyTrack

Panduan menaruh ApplyTrack online. Contoh domain: `applytrack.my.id` (ganti dengan domain Anda).

| Bagian | Layanan | Alamat |
|---|---|---|
| Frontend (Next.js) | Vercel | `https://applytrack.my.id` |
| Backend (Django) | Render, region Singapore | `https://api.applytrack.my.id` |
| Database (PostgreSQL 17) | Neon, region Singapore | (hanya diakses backend) |
| Domain, DNS, email masuk | Cloudflare | |
| Email keluar (reset kata sandi) | Resend | `no-reply@applytrack.my.id` |

## 0. Sebelum online

- [ ] **Next.js ≥ 16.4.1** (16.4.0 punya celah keamanan kritis). Cek: `frontend/package.json`.
- [ ] CI hijau di `main`.

## 1. Rahasia

Buat tiga nilai acak yang **berbeda**, simpan di password manager, jangan di-commit:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

- `DJANGO_SECRET_KEY`
- `FRONTEND_PROXY_SECRET` (sama persis di Render dan Vercel)
- `INBOUND_EMAIL_SECRET` (sama persis di Render dan Worker Cloudflare)

## 2. Neon (database)

1. Project `applytrack`, region **AWS Asia Pacific 1 (Singapore)**, Postgres **17**, database `applytrack`.
2. Salin connection string **langsung** (bukan pooled). Itulah `DATABASE_URL`, berakhiran `?sslmode=require`.

## 3. Render (backend)

New → Web Service → hubungkan repo GitHub.

| Setelan | Isi |
|---|---|
| Region | Singapore |
| Branch | `main` (deploy otomatis setiap merge) |
| Root Directory | `backend` |
| Runtime | Python 3 (versi dari `backend/.python-version`) |
| Build Command | `./build.sh` |
| Start Command | `gunicorn config.wsgi` |
| Instance Type | Free (naikkan ke Starter kalau jeda bangun ~1 menit mengganggu) |
| Health Check Path | `/api/health/` (tidak menyentuh database) |

`build.sh` menjalankan `pip install`, `collectstatic`, `migrate`, dan `createcachetable` setiap deploy.

**Environment variables:**

| Nama | Nilai |
|---|---|
| `PYTHON_VERSION` | `3.12.4` |
| `WEB_CONCURRENCY` | `2` (jumlah proses gunicorn; RAM Free 512 MB) |
| `DJANGO_SECRET_KEY` | rahasia #1 |
| `DATABASE_URL` | dari Neon |
| `DJANGO_ALLOWED_HOSTS` | `api.applytrack.my.id` (alamat `*.onrender.com` otomatis diizinkan) |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://api.applytrack.my.id` |
| `DJANGO_ADMIN_URL` | jalur admin yang sulit ditebak, diakhiri `/`, mis. `kelola-7f3a/` |
| `DJANGO_HSTS_SECONDS` | `3600` dulu; naikkan ke `31536000` setelah semua berjalan beberapa minggu |
| `FRONTEND_URL` | `https://applytrack.my.id` |
| `FRONTEND_PROXY_SECRET` | rahasia #2 |
| `EMAIL_HOST` | `smtp.resend.com` |
| `EMAIL_PORT` | `2587` (Render Free memblokir 25, 465, 587) |
| `EMAIL_HOST_USER` | `resend` |
| `EMAIL_HOST_PASSWORD` | API key Resend |
| `DEFAULT_FROM_EMAIL` | `ApplyTrack <no-reply@applytrack.my.id>` |

`DJANGO_DEBUG` **jangan diisi** (bawaannya `False`).

## 4. Vercel (frontend)

Add New → Project → import repo.

| Setelan | Isi |
|---|---|
| Root Directory | `frontend` |
| Framework | Next.js (terdeteksi otomatis) |

**Environment variables:** `API_URL` = `https://api.applytrack.my.id/api`, `FRONTEND_PROXY_SECRET` = rahasia #2, `CONTACT_EMAIL` = alamat untuk permintaan data pribadi (tampil di `/privacy`).

## 5. Domain dan DNS (Cloudflare)

1. Beli domain, tambahkan ke Cloudflare, lalu ganti nameserver di registrar ke nameserver Cloudflare.
2. Vercel → Settings → Domains → tambah `applytrack.my.id`; Render → Settings → Custom Domains → tambah `api.applytrack.my.id`. Keduanya menampilkan record DNS yang harus dibuat.
3. Buat record itu di Cloudflare dengan **Proxy status: DNS only** (awan abu-abu), supaya Vercel dan Render bisa menerbitkan sertifikat HTTPS sendiri.

## 6. Resend (email keluar)

Domains → Add domain `applytrack.my.id` → pasang record DNS yang ditampilkan (SPF, DKIM) di Cloudflare (DNS only) → tunggu **Verified** → buat API key.

## 7. Akun admin

Render Free tidak punya shell, jadi buat dari laptop yang terhubung langsung ke Neon (PowerShell, di folder `backend`):

```powershell
$env:DATABASE_URL = "<connection string Neon>"
.venv\Scripts\python manage.py createsuperuser
Remove-Item Env:DATABASE_URL
```

## 8. Uji di production

1. `https://api.applytrack.my.id/api/health/?db=1` → `{"status": "ok"}`.
2. Smoke test (folder `frontend`), dengan token akun uji:
   `$env:BASE_URL = "https://applytrack.my.id"; node scripts/smoke.mjs <token>`
3. Daftar akun baru, tambah lamaran, coba **Lupa kata sandi** (email harus masuk), lalu **Hapus akun**.
4. Biarkan 15+ menit, buka lagi: catat lama bangunnya.

## 9. Impor email otomatis (setelah langkah 8 lancar)

1. Cloudflare → Email → Email Routing untuk `inbound.applytrack.my.id`.
2. Buat Worker dari `infra/cloudflare-email-worker.js`, secrets `API_URL` dan `INBOUND_EMAIL_SECRET`.
3. Routing rules → Catch-all → Send to Worker.
4. Render: `INBOUND_EMAIL_DOMAIN` = `inbound.applytrack.my.id`, `INBOUND_EMAIL_SECRET` = rahasia #3.
5. Uji saat Render sedang tidur: teruskan satu email JobStreet, cek lamarannya masuk.

## Setiap deploy berikutnya

- Merge PR ke `main` → Render dan Vercel deploy otomatis.
- Ada migrasi database? Buat **snapshot manual di Neon** dulu.
- Mengubah terjemahan (`django.po`)? Jalankan `python manage.py compilemessages --ignore=.venv` dan commit `django.mo` (CI menolak kalau lupa).
