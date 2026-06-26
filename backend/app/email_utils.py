import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from dotenv import load_dotenv

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_FILE)
logger = logging.getLogger("mti")

# 🔹 Send HTML email with styled user list
def send_html_email(to_email, subject, recipient_name, assigned_users):
    """
    Sends a professionally formatted HTML email with the list of assigned users.
    assigned_users: list of dicts with 'name', 'email', 'role' keys
    """
    try:
        sender_email = os.getenv("EMAIL_USER", "").strip()
        sender_password = os.getenv("EMAIL_PASS", "").replace(" ", "").strip()

        if not sender_email or not sender_password:
            logger.error("Email configuration missing | EMAIL_USER_set=%s EMAIL_PASS_set=%s", bool(sender_email), bool(sender_password))
            return False

        user_rows = ""
        for i, user in enumerate(assigned_users, 1):
            bg_color = "#f8fafb" if i % 2 == 0 else "#ffffff"
            form_link = user.get('form_url') or "http://localhost:3000"
            user_rows += f"""
            <tr style="background-color: {bg_color};">
                <td style="padding: 12px 16px; border-bottom: 1px solid #e8ecf0; color: #4a5568; font-size: 14px;">{i}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e8ecf0; color: #1a202c; font-weight: 600; font-size: 14px;">{user['name']}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e8ecf0; color: #4a5568; font-size: 14px;">{user.get('email', '')}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e8ecf0; text-align: center;">
                    <a href="{form_link}" style="display: inline-block; background-color: #e6f7fb; color: #127993; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; border: 1px solid #b2e0eb;">Start Review &rarr;</a>
                </td>
            </tr>
            """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #127993 0%, #0f6075 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Review Assignment</h1>
                    <p style="color: #b2e0eb; margin: 0; font-size: 14px;">You have been assigned new reviews</p>
                </div>

                <!-- Body -->
                <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                    <p style="color: #2d3748; font-size: 16px; margin: 0 0 8px 0;">Hi <strong>{recipient_name}</strong>,</p>
                    <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                        You have been assigned to review the following colleagues. Please complete your reviews at your earliest convenience.
                    </p>

                    <!-- Summary Badge -->
                    <div style="background-color: #e6f7fb; border-left: 4px solid #127993; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                        <p style="margin: 0; color: #127993; font-weight: 600; font-size: 14px;">📋 {len(assigned_users)} user(s) assigned to you</p>
                    </div>

                    <!-- Table -->
                    <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e8ecf0;">
                        <thead>
                            <tr style="background-color: #127993;">
                                <th style="padding: 12px 16px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">#</th>
                                <th style="padding: 12px 16px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Name</th>
                                <th style="padding: 12px 16px; text-align: left; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Email</th>
                                <th style="padding: 12px 16px; text-align: center; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {user_rows}
                        </tbody>
                    </table>

                    <!-- Footer -->
                    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8ecf0; text-align: center;">
                        <p style="color: #a0aec0; font-size: 12px; margin: 0;">This is an automated message from the Admin Team.</p>
                        <p style="color: #a0aec0; font-size: 12px; margin: 4px 0 0 0;">Please do not reply to this email.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart()
        msg['From'] = f"Admin Team <{sender_email}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        with smtplib.SMTP('smtp.gmail.com', 587, timeout=30) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)

        logger.info("HTML email sent | to_email=%s subject=%s", to_email, subject)
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error("SMTP authentication failed | code=%s response=%s", e.smtp_code, e.smtp_error)
        return False
    except smtplib.SMTPRecipientsRefused as e:
        logger.error("SMTP recipients refused | recipients=%s", list(e.recipients.keys()))
        return False
    except smtplib.SMTPException as e:
        logger.error("SMTP error while sending email | to_email=%s error=%s", to_email, e)
        return False
    except Exception as e:
        logger.exception("HTML email failed | to_email=%s error=%s", to_email, e)
        return False
