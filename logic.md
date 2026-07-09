# Application Logic Notes

This file records backend and frontend logic decisions as the MTI review application grows.

## Assignment List Editing

### Goal

Admins need to review a generated or manual assignment batch, adjust one reviewer's reviewee list, save the change, and only then send emails.

### Backend Logic

Endpoint:

```text
PUT /assignment-batches/{batch_id}/reviewers/{reviewer_id}/assignments
```

Request body:

```json
{
  "reviewee_ids": [2, 5, 9]
}
```

Flow:

1. Validate that the assignment batch exists.
2. Validate that the reviewer exists.
3. Remove duplicate reviewee IDs while preserving order.
4. Reject empty reviewee lists.
5. Reject self-review assignments where `reviewer_id` is included in `reviewee_ids`.
6. Validate every reviewee exists.
7. Delete only this reviewer's existing assignments for the selected batch.
8. Insert the new reviewee list for that reviewer in the same batch.
9. Return the updated count so the frontend can show confirmation.

Important behavior:

- The update is scoped to one reviewer and one batch.
- Other reviewers in the batch are not changed.
- Emails are not sent when editing. Admin should review and click `Send Emails` separately.

### Frontend Logic

Flow:

1. Admin selects a batch in `Assign Reviews`.
2. Assignments are grouped by reviewer for easier scanning.
3. Admin clicks `Edit` on one reviewer.
4. The edit panel opens with the reviewer's current reviewees pre-selected.
5. Admin can add or remove reviewees.
6. The reviewer is disabled in the selector to prevent self-review.
7. Admin clicks `Save List`.
8. Frontend calls the backend update endpoint.
9. Assignments are re-fetched for the selected batch.
10. The edit panel closes after a successful save.

### Related Manual Assignment Logic

Manual assignment now creates an `AssignmentBatch` with a label like:

```text
Manual Assignment - 02 July 2026 12:30 PM
```

Every manual `ReviewAssignment` is saved with that batch ID, so manual assignments can be filtered and edited like generated monthly batches.

## Automatic Assignment Self-Review Protection

### Goal

When admin enters `Per Person` and `Round`, the generated assignment list must never assign a user to review themselves.

### Current Rotation Rule

The automatic assignment endpoint uses:

```text
POST /assign-reviews/?num={per_person}&round_num={round}
```

Validation rules:

1. At least two users must exist.
2. `num` must be at least `1`.
3. `num` cannot exceed `total_users - 1`.
4. `round_num` must be at least `1`.
5. `round_num + num` cannot exceed `total_users`.

Because `round_num` starts from `1`, the generated reviewee slice starts after the reviewer in the rotation order. This normally prevents self-review.

### Defensive Backend Guard

After building `user_assign_dict`, backend now checks every generated pair before creating the batch:

```text
if reviewer_id appears inside that reviewer's assigned_user_ids, reject the generated list.
```

Important behavior:

- The batch is created only after this validation passes.
- If self-review is detected, the API returns an error and does not save assignments.
- This protects the app if the rotation logic is changed later.

## Manual Assignment Self-Review Protection

### Goal

In manual assignment, the same user must not be selected as both reviewer and reviewee in the same send flow.

### Frontend Logic

1. If a user is already selected as a reviewer, that user is blocked in the reviewee list.
2. If a user is already selected as a reviewee, that user is blocked in the reviewer list.
3. `Select All` only selects eligible users and skips blocked users.
4. Before sending, the frontend checks for overlap between `manualReviewer` and `manualReviewee`.
5. If overlap exists, the send action is stopped and an error toast is shown.

### Backend Logic

Endpoint:

```text
POST /manual-assign/
```

Before creating a manual assignment batch, backend checks:

```text
set(reviewer_ids) intersects set(reviewee_ids)
```

If any user appears in both lists, the API returns `400` and does not create the batch.

## Send Test Email

Use these commands from the project root. They use the current email template in `backend/app/email_utils.py` and SMTP credentials from `backend/.env`.

### Send To The Configured Sender Email

```powershell
python -c "import os, sys; sys.path.insert(0, 'backend'); from app.email_utils import send_html_email; to_email = os.getenv('EMAIL_USER', '').strip(); ok = send_html_email(to_email, 'MTI feedback', 'Admin', [{'name': 'Test User', 'email': to_email, 'role': 'Tester', 'form_url': 'https://mti-review.vercel.app/'}]); print('sent' if ok else 'failed')"
```

### Send To A Specific Email

Replace `saran@mobilise.agency` and `Saran` as needed.

```powershell
python -c "import sys; sys.path.insert(0, 'backend'); from app.email_utils import send_html_email; ok = send_html_email('saran@mobilise.agency', 'MTI feedback', 'Saran', [{'name': 'Test User', 'email': 'test@example.com', 'role': 'Tester', 'form_url': 'https://mti-review.vercel.app/'}]); print('sent' if ok else 'failed')"
```

Expected output:

```text
sent
```
