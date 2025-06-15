import sentry_sdk
from app.main import webhook_errors

# ... existing code ...

# ... existing code ...

# In exception handling blocks for webhook flows, add:
# webhook_errors.inc()
# sentry_sdk.capture_exception(e)

# ... existing code ...
