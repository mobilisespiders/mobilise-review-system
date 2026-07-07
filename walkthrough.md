# Walkthrough: Manual Assignment List & Email Feature

## What Was Built

A new **Manual Assign** feature that lets the admin:
1. **Select recipients**  pick one or multiple people who will receive the email
2. **Select users to assign**  check off specific users from the list
3. **Preview & send**  review the selections and send styled HTML emails

---

## Files Changed

### Backend

#### [email_utils.py](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/backend/app/email_utils.py)
- Added `send_html_email()` function that sends a professionally styled HTML email with:
  - Gradient header with "Review Assignment" title
  - Summary badge showing count of assigned users
  - Styled table with user name, email, and role columns
  - "Submit Your Reviews" CTA button
  - Plain text fallback for email clients that don't support HTML

#### [schemas.py](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/backend/app/schemas.py)
- Added `ManualAssignRequest` Pydantic model with `recipient_ids` and `assignee_ids` (both `List[int]`)

#### [main.py](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/backend/app/main.py)
- Added `POST /manual-assign/` endpoint that:
  - Validates recipient and assignee IDs exist in the database
  - Skips self-assignments and duplicate assignments
  - Creates `ReviewAssignment` records for each recipientassignee pair
  - Sends HTML emails to each recipient
  - Returns counts of assignments created, skipped, and emails sent/failed

---

### Frontend

#### [Dashboard.js](file:///d:/Saran/Mobilise%20Internal%20Projects/MTI/frontend/src/components/Dashboard.js)

**New Feature: Manual Assign Tab**  A 3-step wizard:

| Step | Description |
|------|-------------|
| **Step 1** | Select recipients with search bar, select all, checkbox list |
| **Step 2** | Select users to assign with same controls, shows selected recipients as tags |
| **Step 3** | Preview both lists side-by-side, summary banner, "Send Emails" button with loading spinner |

**UI Improvements across all tabs:**
- Sidebar: gradient background (`#127993`  `#0a4a59`), icons for each nav item, active state with glassmorphism
- Cards: hover lift + shadow animations, rounded corners, subtle borders
- Toast notification system (success/error/info) replacing `alert()`
- Header: date display + live clock badge
- Welcome page: stat cards with colored numbers
- Smooth `fadeUp` animations on tab switch
- Inter font loaded from Google Fonts

---

## Verified

The app was tested in the browser:

![Welcome screen with sidebar and stats](file:///C:/Users/Admin/.gemini/antigravity/brain/162ac3c8-4dc8-4a46-9574-8ca78001a099/.system_generated/click_feedback/click_feedback_1776145635411.png)

![Step 1: Recipient selection with search and checkboxes](file:///C:/Users/Admin/.gemini/antigravity/brain/162ac3c8-4dc8-4a46-9574-8ca78001a099/.system_generated/click_feedback/click_feedback_1776145668085.png)

![Step 2: User assignment selection with recipients shown as tags](file:///C:/Users/Admin/.gemini/antigravity/brain/162ac3c8-4dc8-4a46-9574-8ca78001a099/.system_generated/click_feedback/click_feedback_1776145692517.png)

-  Dashboard loads without errors
-  All sidebar tabs navigate correctly
-  Manual Assign step wizard works end-to-end
-  Recipient/assignee selection with search and select-all works
-  Step indicator tracks progress visually

---

## Send One Test Email

Run this command from the project root to send one test email using the current backend email template and the credentials in `backend/.env`.

```powershell
python -c "import os, sys; sys.path.insert(0, 'backend'); from app.email_utils import send_html_email; to_email = os.getenv('EMAIL_USER', '').strip(); ok = send_html_email(to_email, 'MTI feedback', 'Admin', [{'name': 'Test User', 'email': to_email, 'role': 'Tester', 'form_url': 'https://mti-review.vercel.app/'}]); print('sent' if ok else 'failed')"
```

Expected output:

```text
sent
```

This sends the test email to the configured `EMAIL_USER` address, currently `mobilisespiders@gmail.com`.


