"""Optional SMTP email. If SMTP_HOST is unset, sending is skipped (logged only)."""

import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST", "").strip())


def send_email(to_address: str, subject: str, plain_body: str) -> None:
    """Send a plain-text email. No-op when SMTP is not configured."""
    if not _smtp_configured():
        logger.info("Email skipped (SMTP not configured): to=%s subject=%s", to_address, subject)
        return

    host = os.environ["SMTP_HOST"].strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")
    from_addr = os.getenv("SMTP_FROM", user or "noreply@localhost")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_address
    msg.set_content(plain_body)

    try:
        if use_tls:
            with smtplib.SMTP(host, port, timeout=30) as smtp:
                smtp.starttls()
                if user:
                    smtp.login(user, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=30) as smtp:
                if user:
                    smtp.login(user, password)
                smtp.send_message(msg)
        logger.info("Email sent: to=%s subject=%s", to_address, subject)
    except Exception:
        logger.exception("Failed to send email to %s", to_address)
