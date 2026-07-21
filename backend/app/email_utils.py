import os
import logging
import json
from datetime import date, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
LOGO_URL = "https://imgh.in/host/sojylu"
Email_banner = "https://marketingcampaign.online/Mobilise_website/mti/email_banner.jpeg"
load_dotenv(ENV_FILE)
logger = logging.getLogger("mti")
RESEND_EMAIL_URL = "https://api.resend.com/emails"

def _review_period(today=None):
    today = today or date.today()
    previous_month = today.replace(day=1) - timedelta(days=1)

    if previous_month.year == today.year:
        return f"{previous_month.strftime('%b')} and {today.strftime('%B %Y')}"

    return f"{previous_month.strftime('%b %Y')} and {today.strftime('%B %Y')}"


def _current_month_due_date(today=None):    
    today = today or date.today()
    return f"8 {today.strftime('%B %Y')}"


def send_html_email(to_email, subject, recipient_name, assigned_users):
    """
    Sends a professionally formatted HTML email with the list of assigned users.
    assigned_users: list of dicts with 'name', 'email', 'role' keys
    """
    try:
        resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
        sender_email = os.getenv("EMAIL_FROM", "").strip()

        if not resend_api_key or not sender_email:
            logger.error(
                "Resend configuration missing | RESEND_API_KEY_set=%s EMAIL_FROM_set=%s",
                bool(resend_api_key),
                bool(sender_email),
            )
            return False

        review_period = _review_period()
        due_date = _current_month_due_date()

        user_rows = ""
        for i, user in enumerate(assigned_users, 1):
            bg_color = "#f8fafb" if i % 2 == 0 else "#ffffff"
            form_link = user.get('form_url') or "http://localhost:3000"
            user_rows += f"""
            <tr style="background-color: {bg_color};">
                <td style="padding: 12px 16px; border-bottom: 1px solid #e8ecf0; color: #4a5568; font-size: 14px;">{i}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e8ecf0; color: #1a202c; font-weight: 600; font-size: 14px;">{user['name']}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e8ecf0; text-align: center;">
                    <a href="{form_link}" style="display: inline-block; background-color: #E6F7F8; color: #12484c; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; border: 1px solid #A8DDE1;">Start Review &rarr;</a>
                </td>
            </tr>
            """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Inter', 'Segoe UI', Arial, sans-serif;">
        <!--MC_Preview_Text -->
        <div style="font-size:0px; color:#e3e3e3;">
        Requesting feedback for teammates
        </div>
        <!-- Non-width spacer -->
        <div style="font-size: 0px;">
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp; &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp; &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp; &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp; &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp; &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; background-color: #f0f4f8; margin: 0; padding: 0;">
                <tr>
                    <td align="center" style="padding: 32px 16px;">
                        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width: 640px; max-width: 640px; border-collapse: collapse; margin: 0 auto;">
                            <!-- Header -->
                            <tr>
                                <td background="{Email_banner}" valign="top" style="background-color: #12484c; background-image: url('{Email_banner}'), linear-gradient(135deg, #12484c 0%, #08747C 100%); background-size: cover; background-position: top right; background-repeat: no-repeat; border-radius: 16px 16px 0 0; height: 180px; min-height: 180px; padding: 24px 32px; text-align: left; box-sizing: border-box;">
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="height: 45px; line-height: 45px; font-size: 1px;">&nbsp;</td>
                                        </tr>
                                        <tr>
                                            <td align="left" style="color: #ffffff; font-size: 30px; line-height: 36px; font-weight: 700;">MIT Feedback</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td style="background-color: #ffffff; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="color: #2d3748; font-size: 16px; line-height: 22px; padding: 0 0 8px 0;">Hi,</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #4a5568; font-size: 14px; line-height: 22px; padding: 0 0 24px 0;">
                                                You are requested to provide your feedback for the following team members for <b>April, May and June</b> using these links:
                                            </td>
                                        </tr>

                                        <!-- Table -->
                                        <tr>
                                            <td style="padding: 0;">
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e8ecf0;">
                                                    <thead>
                                                        <tr style="background-color: #12484c;">
                                                            <th style="padding: 12px 16px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">#</th>
                                                            <th style="padding: 12px 16px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Name</th>
                                                            <th style="padding: 12px 16px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {user_rows}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td style="padding: 24px 0 0 0; color: #4a5568; font-size: 14px; line-height: 22px;">
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                                                    <tr>
                                                        <td style="padding: 0 0 12px 0; color: #4a5568; font-size: 14px; line-height: 22px;"><strong>Note:</strong> Please use this opportunity to add your opinions and thoughts.</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 0 0 12px 0; color: #4a5568; font-size: 14px; line-height: 22px;">Highlights are instances or qualities that go above and beyond the call of duty.</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 0 0 12px 0; color: #4a5568; font-size: 14px; line-height: 22px;">Lowlights are points where there is an opportunity for the person to improve. These don't necessarily mean negatives, rather, they are advice that could help make them better. Please don't leave it without pointers.</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 0 0 12px 0; color: #4a5568; font-size: 14px; line-height: 22px;">Your input is valuable and will remain confidential. Please ensure it is submitted by the end of the day on <strong>14 July 2026</strong>.</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 0 0 12px 0; color: #4a5568; font-size: 14px; line-height: 22px;">Kindly note that no reminders will be sent, and failure to complete the feedback may impact your evaluation score.</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 0; color: #4a5568; font-size: 14px; line-height: 22px;">Regards,<br>Chitra</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="padding: 32px 0 0 0;">
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; border-top: 1px solid #e8ecf0;">
                                                    <tr>
                                                        <td align="center" style="padding: 24px 0 0 0; color: #a0aec0; font-size: 12px; line-height: 18px;">This is an automated message. Please do not reply.</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        payload = json.dumps({
            "from": sender_email,
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }).encode("utf-8")
        request = Request(
            RESEND_EMAIL_URL,
            data=payload,
            headers={
                "Authorization": f"Bearer {resend_api_key}",
                "Content-Type": "application/json",
                "User-Agent": "mti-review-system/1.0",
            },
            method="POST",
        )

        with urlopen(request, timeout=30) as response:
            response_data = json.loads(response.read().decode("utf-8"))

        logger.info(
            "HTML email sent through Resend | to_email=%s subject=%s email_id=%s",
            to_email,
            subject,
            response_data.get("id"),
        )
        return True

    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        logger.error(
            "Resend API rejected email | to_email=%s status_code=%s response=%s",
            to_email,
            exc.code,
            error_body,
        )
        return False
    except URLError as exc:
        logger.error(
            "Resend API connection failed | to_email=%s error=%s",
            to_email,
            exc.reason,
        )
        return False
    except Exception as exc:
        logger.exception("HTML email failed | to_email=%s error=%s", to_email, exc)
        return False
