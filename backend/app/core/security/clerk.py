import httpx
from jose import jwt, JWTError
from fastapi import HTTPException, status
from functools import lru_cache
from pydantic import BaseModel
from typing import Dict

CLERK_ISSUER = "https://api.clerk.dev"  # or your custom Clerk domain
CLERK_JWKS_URL = f"{CLERK_ISSUER}/.well-known/jwks.json"


class ClerkTokenData(BaseModel):
    sub: str
    email: str | None = None


@lru_cache()
def get_clerk_jwks() -> Dict:
    try:
        response = httpx.get(CLERK_JWKS_URL, timeout=5.0)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError:
        raise HTTPException(
            status_code=500, detail="Unable to fetch Clerk JWKS")


def verify_clerk_token(token: str) -> ClerkTokenData:
    jwks = get_clerk_jwks()
    try:
        header = jwt.get_unverified_header(token)
        key = next((k for k in jwks["keys"]
                   if k["kid"] == header["kid"]), None)

        if not key:
            raise HTTPException(status_code=401, detail="Invalid token key")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=None,
            issuer=CLERK_ISSUER,
        )

        return ClerkTokenData(**payload)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
