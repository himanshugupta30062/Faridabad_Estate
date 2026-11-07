import ipaddress
import logging
import os
import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx

log = logging.getLogger("emailer")
EMAIL_BASE_URL = "https://integrations.emergentagent.com"

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str):
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": os.environ["EMAIL_FROM_NAME"]}
    if os.environ.get("EMAIL_REPLY_TO"):
        payload["contact_email"] = os.environ["EMAIL_REPLY_TO"]
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{EMAIL_BASE_URL}/api/v1/email/send", headers={"X-Email-Key": os.environ["EMERGENT_EMAIL_KEY"]},
                         json=payload)
    if r.status_code >= 400:
        try:
            info = r.json()
        except ValueError:
            info = {"message": r.text}
        log.warning("Lead alert email not sent (%s): %s %s", r.status_code, info.get("code", ""), info.get("message", ""))
        return None
    return r.json().get("id")


async def send_lead_alert(lead: dict):
    """Fire-and-forget team alert for a new lead; recipient comes from server config only."""
    recipients = [e.strip() for e in (os.environ.get("LEAD_ALERT_EMAIL") or "").split(",") if e.strip()]
    if not recipients:
        log.warning("Hot lead alert skipped: LEAD_ALERT_EMAIL not configured")
        return
    rows = [("Name", lead.get("name")), ("Phone", lead.get("phone")), ("Intent", (lead.get("intent") or "").title()),
            ("Location", lead.get("location")), ("Budget", lead.get("budget_label")),
            ("Lead temperature", lead.get("temperature")), ("Source", lead.get("source")),
            ("Enquiry type", lead.get("enquiry_type"))]
    trs = "".join(f'<tr><td style="padding:6px 12px;color:#777">{escape(k)}</td><td style="padding:6px 12px;color:#111">'
                  f'{escape(str(v))}</td></tr>' for k, v in rows if v)
    brand = escape(os.environ["EMAIL_FROM_NAME"])
    html = (f'<table role="presentation" width="100%" style="font-family:Arial,sans-serif;background:#FAF9F6"><tr><td style="padding:24px">'
            f'<p style="font-size:18px;color:#111;margin:0 0 12px">New {escape(lead.get("temperature") or "")} enquiry on Faridabad Estates</p>'
            f'<table role="presentation" style="background:#fff;border:1px solid #E5E1D8">{trs}</table>'
            f'<p style="color:#333;font-size:14px;margin-top:16px">{escape(lead.get("summary") or "")}</p>'
            f'<p style="font-size:12px;color:#888">Open the Faridabad Estates admin dashboard to view the full enquiry. Sent by {brand}.</p>'
            f'</td></tr></table>')
    try:
        sent = False
        for to in recipients:
            sent = bool(await send_email(to=to, subject=f"HOT lead: {lead.get('name')} — {lead.get('location') or 'Faridabad'}", html=html)) or sent
        if sent and lead.get("id"):
            from db import db
            await db.leads.update_one({"id": lead["id"]}, {"$set": {"hot_alert_sent": True}})
    except Exception as e:
        log.error("Lead alert failed: %s", e)
