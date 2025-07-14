from cloudinary import config

from app.app.core.config.settings import get_settings
settings = get_settings()


def configure_cloudinary():
    """Configure Cloudinary with settings from environment variables."""
    config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
