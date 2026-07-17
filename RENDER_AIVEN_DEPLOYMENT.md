# Render + Aiven Deployment Guide

This guide deploys the MTI backend on Render and connects it to an Aiven MySQL database.

## Important SMTP Note

The current app sends email with SMTP from `backend/app/email_utils.py`.

Render Free web services block outbound SMTP ports `25`, `465`, and `587`. Gmail SMTP uses port `587`, so email sending requires either:

- a paid Render web service instance, or
- replacing SMTP with an email API provider later.

The included `render.yaml` uses `plan: starter` for this reason.

## Backend Environment Variables

Add these in Render under the backend service's **Environment** tab.

```env
DATABASE_URL=mysql+mysqlconnector://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_SSL_CA_PATH=
EMAIL_USER=your_sender_email@gmail.com
EMAIL_PASS=your_gmail_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
ALLOWED_ORIGINS=http://localhost:3000,https://mti-review.vercel.app
```

Notes:

- `EMAIL_PASS` must be a Gmail App Password, not the normal Gmail account password.
- If Aiven requires a CA certificate, upload the CA as a Render secret file and set `DATABASE_SSL_CA_PATH` to the mounted file path.
- If Aiven gives a database URL with special characters in the password, URL-encode the password before placing it in `DATABASE_URL`.

## Render Setup

Option A: Blueprint deploy

1. Push the repository to GitHub.
2. In Render, create a new Blueprint from the repository.
3. Render will read `render.yaml`.
4. Fill all `sync: false` environment variables in the dashboard.
5. Deploy.

Option B: Manual web service

1. Create a new Render Web Service from the GitHub repository.
2. Set root directory:

```text
backend
```

3. Set build command:

```bash
pip install -r requirements.txt
```

4. Set start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

5. Add the environment variables listed above.
6. Deploy.

## Aiven MySQL Setup

1. Create an Aiven MySQL service.
2. Copy host, port, username, password, and database name.
3. Build the SQLAlchemy URL:

```env
DATABASE_URL=mysql+mysqlconnector://USER:PASSWORD@HOST:PORT/DATABASE
```

4. If Aiven SSL CA verification is enabled:
   - download the CA certificate from Aiven,
   - upload it to Render as a secret file,
   - set `DATABASE_SSL_CA_PATH` to the Render file path.

## Frontend Setup

In Vercel, set:

```env
REACT_APP_API_URL=https://your-render-backend.onrender.com
```

In Render, update:

```env
ALLOWED_ORIGINS=https://mti-review.vercel.app,https://your-vercel-preview-url.vercel.app
```

Redeploy both services after changing environment variables.

## Smoke Test

1. Open the Render backend root URL:

```text
https://your-render-backend.onrender.com/
```

Expected:

```json
{"message":"Backend is running"}
```

2. Open:

```text
https://your-render-backend.onrender.com/docs
```

3. Open the Vercel frontend.
4. Confirm users and departments load.
5. Generate a small assignment batch.
6. Click `Send Emails`.
7. Confirm the email is delivered.

## Local Checks Before Deploy

From the project root:

```powershell
python -m compileall backend\app
```

From `frontend/`:

```powershell
npm.cmd run build
```
