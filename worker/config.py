import os
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings, loaded from environment variables.
    """
    log_level: str = "INFO"
    
    # New setting for log file path
    log_file_path: Path = Field(default_factory=lambda: Path(os.getenv("LOG_FILE_PATH", "/data/logs/worker.log")))

    # Path settings
    DATA_DIR: Path = Field(default_factory=lambda: Path(os.getenv("DATA_DIR", "/data")))
    
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

def get_settings() -> Settings:
    """Provides a singleton instance of the settings."""
    return Settings()