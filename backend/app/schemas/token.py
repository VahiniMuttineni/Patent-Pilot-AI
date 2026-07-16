from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    full_name: str | None = None
    email: str | None = None


class TokenPayload(BaseModel):
    sub: str | None = None
