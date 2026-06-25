# MTI Completion And Go-Live Plan

## Goal

Complete the MTI Employee Review System, stabilize the existing backend/frontend, verify the full review workflow, and deploy it as a live internal application.

## Current Project Snapshot

- Backend: FastAPI, SQLAlchemy, environment-based database connection, Gmail SMTP email notifications.
- Frontend: React dashboard with user management, department management, assignment generation, manual assignment, and assignment viewing.
- Database: `DATABASE_URL` driven. The code supports cloud database usage, while older docs still mention local MySQL.
- Current status: frontend build works, backend Python syntax compiles, but several runtime and workflow gaps need to be fixed before launch.

## Phase 1: Repository Cleanup And Baseline

Status: completed. Baseline documentation and ignore rules have been updated. Scratch/history files are ignored for now rather than deleted.

1. Decide which files are production source. Status: completed.
   - Keep: `backend/app/main.py`, `models.py`, `schemas.py`, `database.py`, `email_utils.py`, `logging_config.py`.
   - Keep: `frontend/src`, `frontend/public`, `frontend/package.json`, `frontend/package-lock.json`.
   - Review/remove or ignore: `main copy*.py`, `email_utils copy.py`, `assign.py`, `test.py`, `backend.zip`, `backend/logs/`, generated `frontend/build/`.

2. Update `.gitignore`. Status: completed.
   - Ignore `backend/logs/`.
   - Ignore `backend.zip`.
   - Ignore all backend copy/scratch files if they are not needed.
   - Confirm `backend/.env`, `backend/venv/`, and `frontend/node_modules/` remain ignored.

3. Normalize documentation. Status: completed for `README.md`; deeper deployment docs will be added after backend and database decisions are finalized.
   - Update `README.md` to match the real app state.
   - Clarify whether production database is MySQL, PostgreSQL, Neon, Render, or another provider.
   - Remove stale table definitions that no longer match SQLAlchemy models.

## Phase 2: Backend Stabilization

1. Fix known API bugs.
   - Change `/reviews/detailed/` from `models.Review.review_id` to `models.Review.id`.
   - Avoid calling `Base.metadata.create_all(bind=engine)` when `engine` is `None`.
   - Remove the duplicate `get_db()` definition from `main.py` and use `app.database.get_db`.

2. Harden database operations.
   - Add proper validation for creating users and departments.
   - Prevent duplicate department names if required.
   - Validate user email and `form_url`.
   - Make delete operations safe by deleting or blocking related reviews and assignments before deleting users/departments.

3. Complete assignment behavior.
   - Decide final automatic assignment rule:
     - rotation-based assignment, or
     - smart no-repeat assignment with monthly batch history.
   - Implement one clean algorithm.
   - Ensure no self-review assignments.
   - Ensure assignment counts are balanced and predictable.
   - Ensure every generated assignment belongs to an `AssignmentBatch`.

4. Complete manual assignment behavior.
   - Create a batch for manual assignments, or clearly mark manual assignments separately.
   - Decide whether manual assignment should send emails immediately.
   - If yes, uncomment and harden email sending.
   - Return accurate `emails_sent` and `emails_failed` counts.

5. Complete email behavior.
   - Include each reviewee's `form_url` in automatic assignment emails.
   - Keep per-reviewee "Start Review" links.
   - Add plain text fallback if needed.
   - Log email failures without breaking the entire assignment process.

## Phase 3: Database Migration

1. Confirm production database engine.
   - If PostgreSQL/Neon: create PostgreSQL migration SQL.
   - If MySQL: create MySQL migration SQL.

2. Create migration script for required schema.
   - `departments`
   - `users`
   - `assignment_batches`
   - `review_list`
   - `reviews`

3. Confirm columns match models.
   - `users.form_url`
   - `review_list.batch_id`
   - `review_list.assigned_at`
   - `reviews.id`

4. Add indexes and constraints.
   - Unique email where required.
   - Foreign keys for reviewer, reviewee, department, and batch.
   - Indexes for batch filtering and reviewer/reviewee lookups.

## Phase 4: Frontend Stabilization

Status: in progress. Frontend build warnings and the stale default React test have been fixed.

1. Fix test/tooling issues. Status: completed for current smoke coverage.
   - Resolve Jest compatibility with `react-router-dom@7`.
   - Replace the stale default React test in `App.test.js`.
   - Add a smoke test for rendering the dashboard.

2. Improve frontend API reliability.
   - Wrap initial `fetchUsers`, `fetchDepartments`, and `fetchBatches` calls with error handling.
   - Show user-friendly error toasts when backend is offline.
   - Add loading states for major dashboard sections.

3. Align UI with backend behavior.
   - Manual Assign should say "Send Emails" only if backend actually sends emails.
   - Batch dropdown should clearly show latest batch and manual/generated batch labels.
   - Assignment counts should match selected batch.

4. Add production configuration. Status: completed for frontend API URL.
   - Replace hardcoded `BASE_URL` with environment config.
   - Use `.env` files such as:
     - `REACT_APP_API_URL=http://localhost:8000` for local development.
     - `REACT_APP_API_URL=https://your-backend-url` for production.

## Phase 5: Review Form Completion

1. Decide final review URL design.
   - Option A: each employee has an external form URL stored in `form_url`.
   - Option B: build an internal route such as `/review/:reviewerId/:revieweeId`.

2. If using internal review forms:
   - Add frontend route for `ReviewForm`.
   - Load reviewer/reviewee details from URL or token.
   - Prevent arbitrary review submission.
   - Show clean success/error states.

3. If using external form URLs:
   - Ensure every user has a valid `form_url`.
   - Ensure email links open the correct external form.
   - Document how admins create and maintain employee URLs.

## Phase 6: Security And Production Readiness

1. Environment variables.
   - `DATABASE_URL`
   - `EMAIL_USER`
   - `EMAIL_PASS`
   - `FRONTEND_URL`
   - `ALLOWED_ORIGINS`

2. CORS. Status: completed.
   - Replace `allow_origins=["*"]` with production frontend URL.

3. Secrets.
   - Keep all secrets out of git.
   - Rotate exposed or shared Gmail app passwords if necessary.

4. Admin access.
   - Decide whether the internal tool needs login before launch.
   - Minimum recommendation: protect dashboard behind authentication before public deployment.

5. Logging.
   - Keep request logging.
   - Avoid logging sensitive secrets.
   - Ensure log files are ignored by git.

## Phase 7: Testing Plan

1. Backend tests.
   - Create department.
   - Create users.
   - Generate assignments.
   - Verify no self-review.
   - Verify batch filtering.
   - Submit valid review.
   - Reject invalid/unassigned review.
   - Manual assignment creation.

2. Frontend tests.
   - Dashboard renders.
   - Users/departments tables render.
   - Assignment tab renders.
   - Manual assignment wizard can move through steps.

3. Manual QA.
   - Add departments.
   - Add users with form URLs.
   - Generate assignments.
   - Confirm emails are sent.
   - Open review links.
   - Submit reviews.
   - Check reviews in backend.
   - Check assignment batch history.

## Phase 8: Deployment Plan

1. Backend hosting.
   - Recommended for testing: Railway Free plan.
   - Avoid Render Free while Gmail SMTP is required because Render Free blocks common SMTP ports.
   - Start command:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - Set environment variables in hosting dashboard.

2. Database hosting.
   - Use a managed database.
   - Recommended for MySQL-compatible free online database: TiDB Cloud Starter.
   - Confirm TLS connection settings from the TiDB dashboard before final deployment.

3. Frontend hosting.
   - Recommended: Vercel.
   - Build command:
     ```bash
     npm run build
     ```
   - Publish directory:
     ```bash
     build
     ```
   - Set `REACT_APP_API_URL` to deployed backend URL.

4. Domain and HTTPS.
   - Add custom domain if required.
   - Ensure frontend and backend both use HTTPS.

## Phase 9: Go-Live Checklist

- Backend starts successfully in production.
- Frontend loads using production API URL.
- Database migration is complete.
- Admin can create departments.
- Admin can create users.
- Admin can generate assignments.
- Manual assignment works as intended.
- Emails are delivered.
- Review links work.
- Reviews can be submitted.
- Invalid reviews are blocked.
- Dashboard shows assignment batches.
- Logs are available for debugging.
- Secrets are not committed.
- CORS allows only the production frontend.

## Suggested Execution Order

1. Clean ignored/generated files and documentation.
2. Fix backend runtime bugs.
3. Complete assignment and email behavior.
4. Add or confirm database migrations.
5. Fix frontend tests and environment config.
6. Run full local QA.
7. Deploy backend and database.
8. Deploy frontend.
9. Run production smoke test.
10. Hand over final URLs, credentials process, and operating notes.

## Immediate Next Tasks

1. Fix `/reviews/detailed/`.
2. Fix backend startup behavior when `DATABASE_URL` is missing.
3. Decide final assignment algorithm.
4. Decide whether review links are internal or external.
5. Convert frontend `BASE_URL` to environment-based config.
6. Fix frontend test setup.
7. Prepare production database migration.
