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

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
