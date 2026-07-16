import logging
import json
import sys
from datetime import datetime, timezone
from app.core.config import settings

class JSONFormatter(logging.Formatter):
    """
    Formatter that outputs JSON strings for parsed production logging.
    Used on Render to make logs easily searchable by Log drains/Datadog.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "environment": settings.ENVIRONMENT
        }
        
        # Inject custom attributes added via 'extra' dictionary
        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id
        if hasattr(record, "search_id"):
            log_obj["search_id"] = record.search_id
        if hasattr(record, "process_time_ms"):
            log_obj["process_time_ms"] = record.process_time_ms
            
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_obj)

def setup_logging():
    """
    Configures the root logger based on the environment profile.
    """
    root_logger = logging.getLogger()
    
    # Remove existing handlers to avoid duplicates
    if root_logger.handlers:
        for handler in root_logger.handlers:
            root_logger.removeHandler(handler)
            
    handler = logging.StreamHandler(sys.stdout)
    
    if settings.ENVIRONMENT.lower() == "production":
        root_logger.setLevel(logging.INFO)
        handler.setFormatter(JSONFormatter())
    else:
        root_logger.setLevel(logging.DEBUG)
        formatter = logging.Formatter(
            fmt="%(asctime)s - %(levelname)s - [%(name)s] - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        
    root_logger.addHandler(handler)
    
    # Silence chatty third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    return logging.getLogger("patentpilot")

logger = setup_logging()
