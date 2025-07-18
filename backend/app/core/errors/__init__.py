"""
Error handling utilities for the application.
"""

import os

# Import error counters from dedicated module to avoid circular imports
from app.core.error_counters import order_failures, payment_failures
