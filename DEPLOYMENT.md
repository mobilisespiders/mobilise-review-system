# MTI Deployment Guide

This guide moves MTI from local development to hosted frontend, backend, and database services.

## Readiness

The app is ready for an internal test deployment.

It is not ready for a public production launch until admin authentication is added. The dashboard can create and delete users, departments, assignments, and send emails, so access should be controlled before sharing it widely.

Already ready for deployment testing:

- Frontend API URL uses `REACT_APP_API_URL`.
- Backend CORS uses `ALLOWED_ORIGINS`.
- Backend compile passes.
- Frontend build and test pass.
- Assignment generation and email sending are separated.

Recommended before company-wide launch:

- Add admin login.
- Confirm final database schema.
- Smoke test hosted email delivery.
- Keep all secrets in hosting environment variables only.

## Recommended Free Stack

Frontend: Vercel

- Good for React static apps.
- Supports Git deployments.
- Supports project environment variables.

Backend: Railway Free plan for testing

- Good developer experience for FastAPI.
- Free plan currently gives small monthly credit and limited resources.
- Monitor usage because free resources are limited.

Database: TiDB Cloud Starter

- MySQL-compatible.
- Managed online database.
- Current Starter free quota is suitable for this app's early usage.

Avoid Render Free for this app if email is required:

- Render Free Web Services document that outbound traffic on SMTP ports `25`, `465`, and `587` is not supported.
- This app currently uses Gmail SMTP on port `587`.

## Local Final Checks

From project root:

```bash
python -m py_compile backend\app\main.py backend\app\database.py backend\app\models.py backend\app\schemas.py backend\app\email_utils.py backend\app\logging_config.py
```

From `frontend/`:

```bash
npm.cmd test -- --watchAll=false
npm.cmd run build
```

Expected result:

- Backend compile passes.
- Frontend test passes.
- Frontend build passes.

## Environment Variables

Backend:

```env
DATABASE_URL=mysql+mysqlconnector://USER:PASSWORD@HOST:PORT/DATABASE
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
ALLOWED_ORIGINS=http://localhost:3000,https://mti-review.vercel.app
```

Frontend:

```env
REACT_APP_API_URL=https://match-directive-conference-style.trycloudflare.com
```

## Step 1: Push To GitHub

1. Confirm secrets are not committed.
2. Confirm ignored files stay local:
   - `backend/.env`
   - `frontend/.env`
   - `backend/logs/`
   - `frontend/build/`
   - `frontend/node_modules/`
3. Push the repository to GitHub.

## Step 2: Create TiDB Cloud Database

1. Sign in to TiDB Cloud.
2. Create a TiDB Cloud Starter instance.
3. Open the instance and click Connect.
4. Choose MySQL connection details.
5. Copy host, port, username, password, and database name.
6. Build the SQLAlchemy URL:

```env
DATABASE_URL=mysql+mysqlconnector://USER:PASSWORD@HOST:4000/DATABASE
```

Notes:

- TiDB Cloud Starter is MySQL-compatible.
- If TiDB requires TLS parameters for the connection, use the connection instructions from the TiDB dashboard and adapt `DATABASE_URL` or `backend/app/database.py`.
- For a new database, the backend creates tables on startup with `Base.metadata.create_all(...)`.

## Step 3: Deploy Backend On Railway

1. Sign in to Railway.
2. Create a new project.
3. Deploy from GitHub.
4. Select this repository.
5. Set service root directory:

```text
backend
```

6. Set build command:

```bash
pip install -r requirements.txt
```

7. Set start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

8. Add variables:

```env
DATABASE_URL=mysql+mysqlconnector://USER:PASSWORD@HOST:4000/DATABASE
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
ALLOWED_ORIGINS=http://localhost:3000
```

9. Deploy.
10. Open:

```text
https://your-backend-domain/
https://your-backend-domain/docs
```

Expected root response:

```json
{"message":"Backend is running"}
```

## Step 4: Deploy Frontend On Vercel

1. Sign in to Vercel.
2. Add New Project.
3. Import the same GitHub repository.
4. Set root directory:

```text
frontend
```

5. Framework preset:

```text
Create React App
```

6. Build command:

```bash
npm run build
```

7. Output directory:

```text
build
```

8. Add variable:

```env
REACT_APP_API_URL=https://match-directive-conference-style.trycloudflare.com
```

9. Deploy.
10. Copy the generated Vercel URL.

## Step 5: Update Backend CORS

After Vercel deploys, update Railway:

```env
ALLOWED_ORIGINS=https://mti-review.vercel.app
```

For local and production:

```env
ALLOWED_ORIGINS=http://localhost:3000,https://mti-review.vercel.app
```

Redeploy or restart the backend after changing this variable.

## Step 6: Smoke Test

1. Open the Vercel frontend URL.
2. Confirm dashboard loads.
3. Create a department.
4. Create at least two users.
5. Generate assignments:
   - `Per Person = 1`
   - `Round = 1`
6. Confirm the assignment table shows reviewer and reviewee data.
7. Click Send Emails.
8. Confirm email delivery.
9. Open backend `/docs`.
10. Confirm these endpoints respond:
    - `GET /users/`
    - `GET /departments/`
    - `GET /assignments/`

## Rollback

Frontend:

- Use Vercel deployment history to redeploy an older deployment.

Backend:

- Use Railway deployment history or redeploy an earlier Git commit.

Database:

- Export or back up important data before testing destructive delete flows.

## Official References

- Vercel Git deployments: https://vercel.com/docs/git
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Railway FastAPI guide: https://docs.railway.com/guides/fastapi
- Railway pricing/plans: https://docs.railway.com/pricing/plans
- Render free limitations: https://render.com/docs/free
- TiDB Cloud plans: https://docs.pingcap.com/tidbcloud/select-cluster-tier/
