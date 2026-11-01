# Deployment configuration

## 1. Neon database

Create a Neon PostgreSQL project and copy its **pooled** connection string. Append
`?sslmode=require` if it is not already present. It becomes the backend
`DATABASE_URL` value.

## 2. Cloudinary product images

Create a Cloudinary product and collect its cloud name, API key, and API secret.
Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` for the backend. Django stores uploaded product and
category media in Cloudinary only when `DJANGO_ENV=production`.

## 3. PythonAnywhere Django backend

1. Upload or pull this repository, then create a virtual environment and install
   `backend/requirements.txt`.
2. Copy `backend/.env.example` to a private environment file or add the same
   values to the PythonAnywhere WSGI configuration. Never commit this file.
3. Set `DJANGO_SETTINGS_MODULE=config.settings`, and add the backend directory
   to the WSGI path. Use `backend/config/wsgi.py` as the WSGI entry point.
4. From `backend/`, run `python manage.py migrate` and
   `python manage.py collectstatic --noinput`.
5. Set `DJANGO_ALLOWED_HOSTS` to the exact PythonAnywhere hostname, for example
   `shopowner.pythonanywhere.com`.

## 4. Vercel React frontend

1. Import the repository in Vercel and set **Root Directory** to `frontend`.
2. Vercel auto-detects Vite. The included `frontend/vercel.json` redirects SPA
   routes to the React entry point.
3. Add the Vercel environment variable from `frontend/.env.example`, replacing
   the placeholder with the public PythonAnywhere API URL:
   `https://shopowner.pythonanywhere.com/api/v1`
4. Deploy, then add the resulting Vercel URL to `FRONTEND_URL` and
   `CORS_ALLOWED_ORIGINS` in PythonAnywhere and reload the web app.

## Required production values

| Service | Configuration |
| --- | --- |
| Vercel | `VITE_API_URL` |
| PythonAnywhere | `DJANGO_ENV`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` |
| Neon | `DATABASE_URL` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

The `.env.example` files are safe templates. Keep actual values in each
platform's private environment-variable settings.
