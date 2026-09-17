from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "AI Employee Platform"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PUBLIC_APP_URL: str = "http://localhost:3000"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/yapayzekacalisan"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # S3 / MinIO
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "tenants"
    S3_REGION: str = "us-east-1"

    # LLM Gateway
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    DEFAULT_LLM_MODEL: str = "anthropic/claude-3.7-sonnet"
    FALLBACK_LLM_MODEL: str = "openai/gpt-4o-mini"

    # Agent Runtime
    OPENCLAW_GATEWAY_URL: str = "http://localhost:8080"
    DEFAULT_WORKSPACE_ROOT: str = "/data/tenants"

    # Security
    JWT_SECRET: str = "super-secret-jwt-signing-key-replace-in-prod-minimum-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
