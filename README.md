# MTI Employee Review System

An internal tool for managing employee peer-review assignments, review submission, and email notifications.

## Project Status

This project is under active completion. The core backend and dashboard exist, but several production-readiness tasks remain. See [plan.md](plan.md) for the implementation and go-live roadmap.

Known current gaps:

- Automatic assignment needs final business-rule confirmation and cleanup.
- Manual assignment currently creates records, but email sending is disabled in the backend.
- Frontend production build works, but the default test setup needs repair.
- Documentation and schema are being aligned with the real codebase.
- Authentication is not implemented yet.

## Tech Stack

Backend:

- FastAPI
- SQLAlchemy
- Pydantic
- Uvicorn
- Environment-based database configuration

Frontend:

- React
- React Router
- Axios
- Tailwind CSS setup
- Create React App tooling

Email:

- Gmail SMTP with app password

Database:

- Configured through `DATABASE_URL`
- Final production provider still needs confirmation before go-live

## Source Structure

```text
MTI/
  backend/
    app/
      main.py              # FastAPI routes and app setup
      models.py            # SQLAlchemy models
      schemas.py           # Pydantic request models
      database.py          # DB engine/session setup
      email_utils.py       # SMTP email helpers
      logging_config.py    # App logging setup
    requirements.txt
    alter_db.py            # Historical migration helper
    alter_db2.py           # Historical migration helper

  frontend/
    public/
    src/
      components/
        Dashboard.js       # Admin dashboard
        ReviewForm.js      # Review submission form
      App.js
      config.js
      index.js
    package.json
    package-lock.json

  plan.md                  # Completion and deployment roadmap
  walkthrough.md           # Historical feature walkthrough
  implementation_plan.md   # Historical feature plan
```

Scratch/history files such as `main copy*.py`, `email_utils copy.py`, `assign.py`, and `test.py` are not considered production source.

## Local Backend Setup

From the project root:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=your_database_url
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=MTI Admin <reviews@your_verified_domain.com>
ALLOWED_ORIGINS=http://localhost:3000,https://mti-review.vercel.app
```

Run the backend:

```bash
uvicorn app.main:app --reload
```

Backend URLs:

- API: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`

## Local Frontend Setup

From the project root:

```bash
cd frontend
npm install
npm start
```

Optional local API config:

```bash
copy .env.example .env
```

Then edit `frontend/.env` if your backend is not running on:

```env
REACT_APP_API_URL=https://wind-racing-catherine-opponent.trycloudflare.com
```

Frontend URL:

```text
http://localhost:3000
```

For production, set `REACT_APP_API_URL` in the frontend hosting provider to the deployed backend URL. For the current Cloudflare Tunnel backend, use `https://wind-racing-catherine-opponent.trycloudflare.com`.

## Main Workflows

Admin dashboard:

1. Add departments.
2. Add users with name, email, department, and employee review URL.
3. Generate automatic review assignments.
4. View assignments by batch.
5. Create manual assignments.
6. Send assignment emails once backend email behavior is finalized.

Review flow:

1. Reviewer receives assigned reviewees.
2. Reviewer opens each review link.
3. Reviewer submits rating and feedback.
4. Backend validates that the reviewer is allowed to review that reviewee.

## Important Files To Ignore

These files and folders should not be committed:

- `backend/.env`
- `backend/venv/`
- `backend/logs/`
- `frontend/.env`
- `frontend/node_modules/`
- `frontend/build/`
- `backend.zip`
- scratch files such as `backend/app/main copy*.py`

## Useful Commands

Backend syntax check:

```bash
python -m py_compile backend\app\main.py backend\app\models.py backend\app\schemas.py backend\app\database.py backend\app\email_utils.py backend\app\logging_config.py
```

Frontend build:

```bash
cd frontend
npm.cmd run build
```

Frontend tests:

```bash
cd frontend
npm.cmd test -- --watchAll=false
```

Note: use `npm.cmd` in PowerShell if local execution policy blocks `npm.ps1`.

## Go-Live Direction

The intended path to production is:

1. Stabilize backend runtime issues.
2. Finalize assignment and email behavior.
3. Confirm database provider and migration SQL.
4. Move frontend API URL to environment config.
5. Add basic tests and complete manual QA.
6. Deploy backend, database, and frontend.
7. Restrict CORS and protect secrets.

See [plan.md](plan.md) for the full checklist.

For deployment steps, see [DEPLOYMENT.md](DEPLOYMENT.md).
