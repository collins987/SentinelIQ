from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # ...existing code...
    
    # CORS Configuration - Allow all localhost origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    CORS_EXPOSE_HEADERS: List[str] = ["*"]
    
    # ...existing code...

settings = Settings()