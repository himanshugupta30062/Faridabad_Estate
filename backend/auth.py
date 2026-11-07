import os
import uuid
from datetime import datetime, timezone, timedelta

import bcrypt
import httpx
import jwt
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from db import db

JWT_ALGORITHM = "HS256"
router = APIRouter(prefix="/api/auth")


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def admin_allowlist() -> set:
    raw = os.environ.get("ADMIN_EMAILS", "") + "," + os.environ.get("ADMIN_EMAIL", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh", "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def set_cookie(response: Response, key: str, value: str, max_age: int):
    response.set_cookie(key=key, value=value, httponly=True, secure=True, samesite="none", max_age=max_age, path="/")


def public_user(u: dict) -> dict:
    return {"user_id": u["user_id"], "email": u["email"], "name": u.get("name", ""), "role": u.get("role", "admin"),
            "picture": u.get("picture")}


async def _user_from_session_token(token: str):
    s = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not s:
        return None
    exp = s["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        return None
    return await db.users.find_one({"user_id": s["user_id"]}, {"_id": 0, "password_hash": 0})


async def get_current_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return user


async def get_current_user(request: Request) -> dict:
    access = request.cookies.get("access_token")
    session_token = request.cookies.get("session_token")
    bearer = request.headers.get("Authorization", "")
    bearer = bearer[7:] if bearer.startswith("Bearer ") else None
    user = None
    for tok in [access, bearer]:
        if not tok or user:
            continue
        try:
            payload = jwt.decode(tok, _secret(), algorithms=[JWT_ALGORITHM])
            if payload.get("type") == "access":
                user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        except jwt.InvalidTokenError:
            pass
    for tok in [session_token, bearer]:
        if tok and not user:
            user = await _user_from_session_token(tok)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


@router.post("/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")
    user = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": body.name.strip(),
            "password_hash": hash_password(body.password), "role": "visitor", "created_at": datetime.now(timezone.utc)}
    await db.users.insert_one(dict(user))
    set_cookie(response, "access_token", create_access_token(user["user_id"], email), 900)
    set_cookie(response, "refresh_token", create_refresh_token(user["user_id"]), 604800)
    return public_user(user)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    fwd = request.headers.get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")
    ident = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    if attempt and attempt.get("count", 0) >= 5:
        locked = attempt.get("last")
        if locked.tzinfo is None:
            locked = locked.replace(tzinfo=timezone.utc)
        if now - locked < timedelta(minutes=15):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": ident})
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one({"identifier": ident}, {"$inc": {"count": 1}, "$set": {"last": now}}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    set_cookie(response, "access_token", create_access_token(user["user_id"], email), 900)
    set_cookie(response, "refresh_token", create_refresh_token(user["user_id"]), 604800)
    return public_user(user)


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    tok = request.cookies.get("refresh_token")
    if not tok:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(tok, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    set_cookie(response, "access_token", create_access_token(user["user_id"], user["email"]), 900)
    return {"ok": True}


class SessionIn(BaseModel):
    session_id: str


@router.post("/google/session")
async def google_session(body: SessionIn, response: Response):
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                        headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in failed. Please try again.")
    data = r.json()
    email = data["email"].lower()
    if email not in admin_allowlist():
        raise HTTPException(status_code=403, detail=f"{email} is not authorised as a Faridabad Estates admin.")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": data.get("name", ""),
                "picture": data.get("picture"), "role": "admin", "created_at": datetime.now(timezone.utc)}
        await db.users.insert_one(dict(user))
    else:
        await db.users.update_one({"email": email}, {"$set": {"picture": data.get("picture"), "role": "admin"}})
        user["role"] = "admin"
    await db.user_sessions.insert_one({"user_id": user["user_id"], "session_token": data["session_token"],
                                       "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                                       "created_at": datetime.now(timezone.utc)})
    set_cookie(response, "session_token", data["session_token"], 604800)
    return public_user(user)


@router.get("/me")
async def me(request: Request):
    return public_user(await get_current_user(request))


@router.post("/logout")
async def logout(request: Request, response: Response):
    tok = request.cookies.get("session_token")
    if tok:
        await db.user_sessions.delete_one({"session_token": tok})
    for k in ["access_token", "refresh_token", "session_token"]:
        response.delete_cookie(k, path="/", secure=True, samesite="none")
    return {"ok": True}


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    if not await db.users.find_one({"email": email}):
        await db.users.insert_one({"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": "Faridabad Estates Admin",
                                   "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]), "role": "admin",
                                   "created_at": datetime.now(timezone.utc)})
