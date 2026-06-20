from fastapi import APIRouter

from app.routers.deps import DbSession
from app.schemas.dashboard import DashboardSummary
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: DbSession):
    return dashboard_service.get_summary(db)
