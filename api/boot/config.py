import logging
from typing import Dict, Any, List, Optional
from decouple import config as decouple_config


class Settings:
    """Centralized application settings."""

    # Application settings
    APP_NAME: str = decouple_config("APP_NAME", default="OpenReplay")
    ROOT_PATH: str = decouple_config("root_path", default="/api")
    DOCS_URL: str = decouple_config("docs_url", default="")
    REDOC_URL: str = decouple_config("redoc_url", default="")
    TRACK_TIME: bool = decouple_config("TRACK_TIME", default=False, cast=bool)

    # Logging - get raw string value without casting
    _LOG_LEVEL_STR: str = decouple_config("LOGLEVEL", default="WARNING")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # PostgreSQL settings
    PG_HOST: str = decouple_config("pg_host", default="localhost")
    PG_DBNAME: str = decouple_config("pg_dbname", default="orpy")
    PG_USER: str = decouple_config("pg_user", default="orpy")
    PG_PASSWORD: str = decouple_config("pg_password", default="orpy")
    PG_PORT: int = decouple_config("pg_port", cast=int, default=5432)
    PG_AIO_MINCONN: int = decouple_config("PG_AIO_MINCONN", cast=int, default=1)
    PG_AIO_MAXCONN: int = decouple_config("PG_AIO_MAXCONN", cast=int, default=5)

    # CORS settings
    CORS_ORIGINS: List[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    @property
    def LOG_LEVEL(self) -> int:
        """Convert string log level to an integer constant."""
        level_map = {
            "CRITICAL": logging.CRITICAL,
            "FATAL": logging.FATAL,
            "ERROR": logging.ERROR,
            "WARNING": logging.WARNING,
            "WARN": logging.WARN,
            "INFO": logging.INFO,
            "DEBUG": logging.DEBUG,
            "NOTSET": logging.NOTSET,
        }

        # If it's a digit string, convert to int
        if self._LOG_LEVEL_STR.isdigit():
            return int(self._LOG_LEVEL_STR)

        # If it's a known level name, return the corresponding value
        return level_map.get(self._LOG_LEVEL_STR.upper(), logging.WARNING)

    @property
    def pg_dsn(self) -> Dict[str, Any]:
        """Return PostgreSQL connection parameters as a dictionary."""
        return {
            "host": self.PG_HOST,
            "dbname": self.PG_DBNAME,
            "user": self.PG_USER,
            "password": self.PG_PASSWORD,
            "port": self.PG_PORT,
            "application_name": f"AIO{self.APP_NAME}",
        }

    def configure_logging(self) -> None:
        """Configure application logging."""
        logging.basicConfig(
            level=self.LOG_LEVEL,
            format=self.LOG_FORMAT
        )
        logging.info(f">Loglevel set to: {self._LOG_LEVEL_STR} ({self.LOG_LEVEL})")


# Create a singleton instance
settings = Settings()
