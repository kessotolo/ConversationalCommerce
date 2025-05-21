from fastapi import Request, Depends, HTTPException
from app.core.security.clerk import verify_clerk_token, ClerkTokenData


async def require_auth(request: Request) -> ClerkTokenData:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split(" ")[1]
    return verify_clerk_token(token)
