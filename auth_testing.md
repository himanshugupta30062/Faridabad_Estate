# Auth testing (PropMitra)
- Admin email/password: see /app/memory/test_credentials.md. POST /api/auth/login sets httpOnly cookies access_token (15 min) + refresh_token (7 d). GET /api/auth/me returns user. /api/auth/refresh renews access token.
- Google (Emergent managed): /admin/login "Continue with Google" -> auth.emergentagent.com -> back to /admin#session_id=... -> POST /api/auth/google/session. Only emails in ADMIN_EMAILS env allowed (else 403).
- To simulate a Google session: insert into db.users {user_id, email, role:'admin'} and db.user_sessions {user_id, session_token, expires_at: +7d}; send cookie session_token or header Authorization: Bearer <token>.
- All /api/admin/* routes require auth (401 otherwise).
