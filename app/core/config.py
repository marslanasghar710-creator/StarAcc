from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "StarAcc"
    environment: str = "dev"
    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/staracc"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    invitation_expire_days: int = 7
    algorithm: str = "HS256"
    file_storage_root: str = "/tmp/staracc_uploads"
    file_upload_max_bytes: int = 10 * 1024 * 1024
    file_upload_allowed_mime_types: str = "application/pdf,image/png,image/jpeg,text/csv,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
