# app/services/email_service.py
"""
Email delivery service supporting SMTP.
Designed to work with MailHog (dev) and production SMTP servers.

Configuration via app/config.py:
- SMTP_HOST
- SMTP_PORT
- SMTP_USERNAME
- SMTP_PASSWORD
- SMTP_TLS

Can be easily extended for SendGrid, AWS SES, etc.
"""


def send_email(to: str, subject: str, html_content: str) -> bool:
    # Legacy sync email send stub for compatibility
    # Use queue_email for async sending in production
    import smtplib
    from email.mime.text import MIMEText
    try:
        msg = MIMEText(html_content, 'html')
        msg['Subject'] = subject
        msg['From'] = EMAIL_FROM
        msg['To'] = to
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_TLS:
                server.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, [to], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"Sync send_email failed: {e}")
        return False

# Async, queue-based, RBAC-aware email service with metrics and audit logging
import asyncio
from email.message import EmailMessage
from aiosmtplib import SMTP, SMTPException
from prometheus_client import Counter
import logging
from app.config import (
    EMAIL_FROM,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    SMTP_TLS,
)

logger = logging.getLogger("sentineliq.email")

# Prometheus metrics
email_sent_counter = Counter('emails_sent_total', 'Total emails sent', ['role', 'status', 'template'])
email_audit_counter = Counter('emails_audit_total', 'Total email audit logs', ['user_id', 'role', 'action'])

# RBAC enforcement helper
def enforce_email_rbac(user_role, allowed_roles, action, user_id=None):
    if user_role not in allowed_roles:
        logger.warning(f"RBAC: {user_role} not allowed to perform {action}", extra={"user_id": user_id, "role": user_role, "action": action})
        raise PermissionError(f"Role {user_role} not allowed for {action}")

# Email queue and worker
_email_queue = asyncio.Queue()

async def email_worker():
    while True:
        try:
            email_task = await _email_queue.get()
            await _send_email(**email_task)
        except Exception as e:
            logger.error(f"Email worker error: {e}")
        await asyncio.sleep(0.1)

def start_email_worker():
    if not hasattr(start_email_worker, "_started"):
        asyncio.create_task(email_worker())
        start_email_worker._started = True

async def queue_email(to: str, subject: str, html_content: str, template: str, user_id: str, role: str, action: str):
    enforce_email_rbac(role, ["admin", "analyst", "user"], action, user_id)
    await _email_queue.put({
        "to": to,
        "subject": subject,
        "html_content": html_content,
        "template": template,
        "user_id": user_id,
        "role": role,
        "action": action
    })

async def _send_email(to: str, subject: str, html_content: str, template: str, user_id: str, role: str, action: str):
    try:
        # Enforce template-based emails only
        if not template or not template.endswith('.html'):
            logger.error(f"Email template enforcement failed: {template}")
            email_sent_counter.labels(role, 'failed', template).inc()
            return False
        msg = EmailMessage()
        msg["From"] = EMAIL_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content("This email requires an HTML-capable client.")
        msg.add_alternative(html_content, subtype="html")
        smtp = SMTP(hostname=SMTP_HOST, port=SMTP_PORT, use_tls=SMTP_TLS)
        await smtp.connect()
        if SMTP_USERNAME and SMTP_PASSWORD:
            await smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        await smtp.send_message(msg)
        await smtp.quit()
        logger.info(f"Email sent to {to}", extra={"user_id": user_id, "role": role, "action": action, "template": template})
        email_sent_counter.labels(role, 'success', template).inc()
        email_audit_counter.labels(user_id, role, action).inc()
        return True
    except SMTPException as e:
        logger.error(f"SMTP error sending email to {to}: {e}", extra={"user_id": user_id, "role": role, "action": action, "template": template})
        email_sent_counter.labels(role, 'failed', template).inc()
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}", extra={"user_id": user_id, "role": role, "action": action, "template": template})
        email_sent_counter.labels(role, 'failed', template).inc()
        return False

