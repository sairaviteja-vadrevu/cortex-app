from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # LLM provider keys
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    google_api_key: Optional[str] = None

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # LLM settings
    llm_timeout_scene: int = 120
    llm_timeout_pass2: int = 120
    llm_max_retries: int = 2

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "storyboard_ai"

    # Klein image generation
    klein_api_key: Optional[str] = None

    # Replicate
    replicate_key: Optional[str] = None

    # JWT
    jwt_secret: str = "default-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expiry_days: int = 30

    # Gemini (legacy cortex)
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.0-flash-lite"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
