# FINERP

Customer and jewel backed loan management with customer records, loan schedules, payments, collection reports, and account settings.

## Stack

- Frontend: Next.js 16, React 19, TypeScript
- Backend: Django 5.2, Django REST Framework, JWT authentication
- Local development database: SQLite
- Production database: PostgreSQL through `DATABASE_URL`
- Production media: private S3 compatible object storage with expiring signed URLs

## Run locally (PowerShell)

From the repository root, install and start the backend:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:DJANGO_DEBUG = "true"
$env:DJANGO_SECRET_KEY = (& .\.venv\Scripts\python.exe -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())").Trim()
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

In another terminal, run the frontend:

```powershell
cd frontend
$env:BACKEND_URL = "http://127.0.0.1:8000"
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `BACKEND_URL` is only used by the local Next.js server; deployed API routing is configured in the root `vercel.json`.

## Render backend

Configure the Render web service with:

- Root Directory: `backend`
- Build Command: `bash build.sh`
- Start Command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-1} --timeout 120 --access-logfile - --error-logfile -`
- Health Check Path: `/healthz/`

`build.sh` installs dependencies, applies migrations, and collects Django static assets. Set these Render environment variables before deploying:

| Variable | Value |
| --- | --- |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_SECRET_KEY` | Generate a private random value in Render |
| `DJANGO_ALLOWED_HOSTS` | `finerp-wpku.onrender.com` plus the exact Vercel/custom domain if Django receives that host |
| `DATABASE_URL` | Internal connection URL for the production PostgreSQL database |
| `DJANGO_TRUST_X_FORWARDED_PROTO` | `True` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Comma-separated HTTPS Vercel/custom frontend origins |
| `AWS_STORAGE_BUCKET_NAME` | Private S3 compatible bucket name |
| `AWS_S3_REGION_NAME` | Bucket region (use the provider's required value) |
| `AWS_ACCESS_KEY_ID` | Restricted bucket access key |
| `AWS_SECRET_ACCESS_KEY` | Matching secret key |

For an S3 compatible provider, also set `AWS_S3_ENDPOINT_URL`. Set `AWS_S3_ADDRESSING_STYLE` to `path` if required by that provider. Keep bucket public access blocked; Django returns short-lived signed URLs for stored photos. Do not put these secrets in Git or Vercel.

## Vercel frontend

Use the repository root as the Vercel project root and set the framework to **Services**. The root `vercel.json` routes `/api`, `/admin`, and `/static` to Render; other paths go to the Next.js service. Uploaded images load from the private S3 compatible bucket using signed URLs.

## Deployment notes

- Production startup fails intentionally if the secret key, allowed hosts, PostgreSQL URL, or S3 media configuration is missing. SQLite and local media are for development only.
- Existing photo files must be copied to the configured bucket using the same relative names before production uses the existing database. Back up any files currently on Render before redeploying; Render service filesystems are ephemeral.
- Configure `DJANGO_EMAIL_*` variables only if the application is set up to send email.
- HSTS is enabled for one year in production. Subdomain coverage and preload remain disabled until separately reviewed.

## Main areas

- Dashboard overview
- Customer records and loan schedules
- Customer transactions and jewel details
- Payment collection and payment history
- Today, monthly, and overall collection reports
- Profile settings and user management
