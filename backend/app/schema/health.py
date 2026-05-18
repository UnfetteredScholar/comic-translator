from pydantic import BaseModel
from datetime import datetime
from pydantic_settings import BaseSettings
from enum import Enum


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"


class HealthResponse(BaseModel):
    status: HealthStatus
    message: str
    version: str
    timestamp: datetime
