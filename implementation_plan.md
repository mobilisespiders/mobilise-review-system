# Feature Implementation Plan

A set of three new features to be added to the MTI Review System.

---

## Feature 1  User "Employee URL" Field (Role  Form URL)

Replace the plain `role` text input when creating a user with a field called **Employee URL**  a URL field where the admin enters each user's **individual review form URL** (e.g. `https://mti.app/review/john-doe`). This URL will be stored in the existing `role` column (or a new dedicated column  see Open Questions), and will be included in assignment emails.

### Proposed Changes

---

#### [MODIFY] [models.py](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/backend/app/models.py)
- Rename `role` column to `form_url` (or add it alongside `role`) in the `User` table.
- Add a new `AssignmentBatch` table with `id`, `generated_at` (timestamp), and `month_year` (string like `"2026-04"`) to track each generation run.
- Update `ReviewAssignment` to include a `batch_id` FK referencing `AssignmentBatch`.

#### [MODIFY] [main.py](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/backend/app/main.py)
- Update `POST /users/` to accept `form_url` instead of `role`.
- Update `GET /users/` to return `form_url`.

#### [MODIFY] [Dashboard.js](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/frontend/src/components/Dashboard.js)
- Change "Role" input to "Employee URL" input (type=`url`) in the Add User form.
- Show the URL in the users table as a clickable link instead of the role badge.

---

## Feature 2  Individual Reviewee Links in Emails

When assignment emails are sent, each **row in the email table for a reviewee** will include their personal `form_url` as a clickable **"Start Review "** button instead of a generic link.

### Proposed Changes

#### [MODIFY] [email_utils.py](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/backend/app/email_utils.py)
- `send_html_email`: Replace the generic CTA button with **per-reviewee review links** in each table row, using the `form_url` stored per user.
- Add a `form_url` key to `assigned_users` dicts.

#### [MODIFY] [main.py](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/backend/app/main.py)
- Pass `form_url` along with `name`, `email` when building `assigned_user_details` in `/manual-assign/` and `/assign-reviews/`.

---

## Feature 3  Smart Monthly List Generation with History

This is the most significant change. The current `assign-reviews` endpoint deletes all old assignments and randomly re-assigns. The new logic must:

1. **Store each generation as a named "batch"** (tied to the current month).
2. **On "Generate New"**  run smart assignment that **avoids repeat pairings** from all previous batches.
3. **Dashboard shows the LATEST batch** by default, with a **month filter** to view older batches.

### Algorithm

```
For each user A:
  - Get all users B that A has NEVER been assigned to review (across all past batches)
  - From eligible users, pick N users, trying to balance across departments:
      - First pick from other departments (cross-dept picks)
      - If not enough, pick from same dept (to fill up to N)
  - If all users have been reviewed already (full rotation), reset eligibility for A and start fresh
```

**Department balancing rule:** Try to pick `num_per_user / num_departments` from each dept, fill gaps with same-department users.

### Proposed Changes

#### [MODIFY] [models.py](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/backend/app/models.py)
- Add `AssignmentBatch` table:
  ```python
  class AssignmentBatch(Base):
      __tablename__ = "assignment_batches"
      id = Column(Integer, primary_key=True)
      generated_at = Column(TIMESTAMP, server_default=func.now())
      month_year = Column(String(7))  # e.g. "2026-04"
      label = Column(String(50))      # e.g. "April 2026"
  ```
- Add `batch_id` FK column to `ReviewAssignment`.

#### [MODIFY] [main.py](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/backend/app/main.py)
- `POST /assign-reviews/`  full rewrite:
  - Create a new `AssignmentBatch` record for this month.
  - Do NOT delete old assignments.
  - Query all **past** reviewerreviewee pairs for each user.
  - Run smart assignment algorithm (dept-balanced, no repeats).
  - Save new assignments under new `batch_id`.
  - Send emails with individual reviewee links.
- Add `GET /assignment-batches/`  list all batches (id, label, month_year, count).
- Add `GET /assignments/?batch_id=X`  filter assignments by batch.

#### [MODIFY] [Dashboard.js](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/frontend/src/components/Dashboard.js)
- On "Assign Reviews" tab:
  - Fetch latest batch on load; show all assignments from that batch.
  - Add a **"Filter by Month"** dropdown that lists past batches and refetches assignments for selected batch.
  - The "Generate New" button triggers the new smart generation endpoint.
  - After generation, auto-select the new batch.

---

## Open Questions

> [!IMPORTANT]
> **Role vs Form URL**: The `User` model currently has a `role` column. The request says to replace "role" with "Employee URL". Should we:
> - **Option A**: Rename the column from `role` to `form_url` (breaking change, needs DB migration)
> - **Option B**: Keep `role` but add a new `form_url` column (safe, backward compatible)
>
> **I recommend Option B**  add a new `form_url` column alongside `role`. This avoids breaking the existing `/submit-review/` validation logic. Please confirm.

> [!IMPORTANT]
> **DB Migration**: We're using Neon (PostgreSQL). `Base.metadata.create_all()` will NOT auto-add columns to existing tables. A manual `ALTER TABLE` SQL is needed. I'll provide the exact SQL to run in Neon console.

---

## Verification Plan

### Automated
- Restart the backend and call `GET /users/`  verify `form_url` field appears.
- Call `POST /assign-reviews/` twice  verify no duplicate pairings in second batch.
- Call `GET /assignment-batches/`  verify two batch records exist.

### Manual
- Check the "Assign Reviews" tab: the latest batch should auto-load.
- Select a previous month in the filter  assignments for that batch shown.
- Check email received: each reviewee row should have a "Start Review" link with their personal URL.
- Add user with Employee URL  verify it shows as a clickable link in the users table.

