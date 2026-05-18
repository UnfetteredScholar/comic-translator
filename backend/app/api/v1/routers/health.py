from fastapi import APIRouter
from schema.health import HealthResponse, HealthStatus
from datetime import datetime
from core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status=HealthStatus.HEALTHY,
        message="OK",
        version=settings.APP_VERSION,
        timestamp=datetime.now(),
    )
