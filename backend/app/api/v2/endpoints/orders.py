from fastapi import APIRouter, Depends

from app.api.v1.endpoints.orders import *

router = APIRouter()

# All v2 endpoints currently reuse v1 logic. Update here for breaking changes.
# See backend/README.md for versioning and migration strategy.
