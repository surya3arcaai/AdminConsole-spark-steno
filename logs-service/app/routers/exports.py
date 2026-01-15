"""Export endpoints."""

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext
from shared.schemas import SuccessResponse
from shared.exceptions import NotFoundException, ValidationException

from ..schemas import ExportRequest, ExportResponse, ExportFormatResponse, ScheduledExportCreate
from .. import crud

router = APIRouter(prefix="/export", tags=["Export"])


@router.post("/", response_model=ExportResponse, status_code=201)
async def create_export(
    data: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a new export job."""
    job = await crud.create_export_job(db, data, current_user.user_id)
    # In production, this would trigger an async task to process the export
    return job


@router.get("/formats", response_model=ExportFormatResponse)
async def get_export_formats(
    current_user: UserContext = Depends(get_current_user),
):
    """Get available export formats and types."""
    return ExportFormatResponse(
        formats=["csv", "json", "pdf"],
        types=["api_logs", "container_logs", "db_logs", "transcripts", "alerts"],
    )


@router.get("/{job_id}/status", response_model=ExportResponse)
async def get_export_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get export job status."""
    job = await crud.get_export_job(db, job_id)
    return job


@router.get("/{job_id}/download")
async def download_export(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Download exported file."""
    job = await crud.get_export_job(db, job_id)

    if job.status.value != "completed":
        raise ValidationException(f"Export job is not completed. Status: {job.status.value}")

    if not job.file_path:
        raise NotFoundException("Export file")

    return FileResponse(
        path=job.file_path,
        filename=f"export_{job_id}.{job.format.value}",
        media_type="application/octet-stream",
    )


@router.post("/schedule", response_model=SuccessResponse)
async def schedule_export(
    data: ScheduledExportCreate,
    current_user: UserContext = Depends(get_current_user),
):
    """Schedule a recurring export."""
    # In production, this would create a cron job
    return SuccessResponse(
        message="Export scheduled successfully",
        data={
            "type": data.type,
            "format": data.format,
            "schedule": data.schedule,
        },
    )
