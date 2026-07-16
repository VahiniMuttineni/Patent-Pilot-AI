from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import Optional, List, Union

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "PatentPilot API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Environment Profile
    ENVIRONMENT: str = "development" # Can be "development", "testing", "production"
    
    # CORS Configuration
    # Can be a comma-separated string: "http://localhost:3000,https://my-vercel-app.vercel.app"
    CORS_ORIGINS: Union[str, List[str]] = ["*"]

    # Security
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_HERE"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8

    # Database
    DATABASE_URL: Optional[str] = None
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "patentpilot"
    POSTGRES_PORT: int = 5432
    
    # Connection Pooling (for production)
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 1800

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            # SQLAlchemy asyncpg requires 'postgresql+asyncpg://' scheme
            if self.DATABASE_URL.startswith("postgres://"):
                return self.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
            elif self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Redis Cache
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"

    # LLM Provider Configuration
    LLM_PROVIDER: str = "groq"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # External APIs
    GOOGLE_CLIENT_ID: Optional[str] = None
    LENS_API_TOKEN: Optional[str] = None
    NCBI_API_KEY: Optional[str] = None
    CHEMSPIDER_API_KEY: Optional[str] = None
    EPO_CLIENT_ID: Optional[str] = None
    EPO_CLIENT_SECRET: Optional[str] = None

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_ignore_empty=True, extra="ignore")

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        """Fail fast if critical environment variables are missing in production."""
        if self.ENVIRONMENT.lower() == "production":
            # 1. Database Check
            if not self.DATABASE_URL:
                raise ValueError("DATABASE_URL must be provided in production.")
                
            # 2. Secret Key Check
            if not self.SECRET_KEY or self.SECRET_KEY == "YOUR_SUPER_SECRET_KEY_HERE":
                raise ValueError("A secure SECRET_KEY must be provided in production.")
                
            # 3. LLM Check
            if self.LLM_PROVIDER == "groq" and not self.GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY is required when LLM_PROVIDER is 'groq'.")
            elif self.LLM_PROVIDER == "gemini" and not self.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is required when LLM_PROVIDER is 'gemini'.")
                
            # 4. CORS Check
            if isinstance(self.CORS_ORIGINS, list) and "*" in self.CORS_ORIGINS:
                raise ValueError("CORS_ORIGINS must not be '*' in production. Specify exact domains.")
                
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return self.CORS_ORIGINS

settings = Settings()
