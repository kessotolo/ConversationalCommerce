"""
Logging configuration for the application.
"""
import logging
import sys
from typing import Any, Dict, Optional

# Configure the root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Create a logger instance that will be imported by other modules
logger = logging.getLogger("app")

# Set the log level (can be overridden by environment variables)
logger.setLevel(logging.INFO)


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger with the specified name.
    
    Args:
        name: The name of the logger
        
    Returns:
        A logger instance
    """
    if name:
        return logging.getLogger(f"app.{name}")
    return logger


def configure_logging(config: Dict[str, Any]) -> None:
    """
    Configure logging based on application settings.
    
    Args:
        config: Application configuration
    """
    log_level = config.get("log_level", "INFO").upper()
    logger.setLevel(getattr(logging, log_level))
