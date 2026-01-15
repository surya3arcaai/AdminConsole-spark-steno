"""Transcript log endpoints."""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext
from shared.schemas import PaginatedResponse

from ..schemas import TranscriptCreate, TranscriptResponse, ExportRequest, ExportResponse
from .. import crud

router = APIRouter(prefix="/transcripts", tags=["Transcripts"])


@router.get("/", response_model=PaginatedResponse[TranscriptResponse])
async def list_transcripts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """List all transcripts."""
    skip = (page - 1) * page_size
    transcripts, total = await crud.get_transcripts(db, skip=skip, limit=page_size)
    return PaginatedResponse.create(items=transcripts, total=total, page=page, page_size=page_size)


@router.post("/", response_model=TranscriptResponse, status_code=201)
async def create_transcript(
    data: TranscriptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a new transcript."""
    transcript = await crud.create_transcript(db, data)
    return transcript


@router.get("/search", response_model=PaginatedResponse[TranscriptResponse])
async def search_transcripts(
    query: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Search transcripts by content."""
    skip = (page - 1) * page_size
    transcripts, total = await crud.search_transcripts(db, query, skip, page_size)
    return PaginatedResponse.create(items=transcripts, total=total, page=page, page_size=page_size)


@router.get("/user/{user_id}", response_model=PaginatedResponse[TranscriptResponse])
async def get_transcripts_by_user(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get transcripts for a specific user."""
    skip = (page - 1) * page_size
    transcripts, total = await crud.get_transcripts(db, user_id=user_id, skip=skip, limit=page_size)
    return PaginatedResponse.create(items=transcripts, total=total, page=page, page_size=page_size)


@router.get("/range", response_model=PaginatedResponse[TranscriptResponse])
async def get_transcripts_by_date(
    start_date: datetime,
    end_date: datetime,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get transcripts within a date range."""
    skip = (page - 1) * page_size
    transcripts, total = await crud.get_transcripts(
        db, start_date=start_date, end_date=end_date, skip=skip, limit=page_size
    )
    return PaginatedResponse.create(items=transcripts, total=total, page=page, page_size=page_size)


@router.get("/{transcript_id}", response_model=TranscriptResponse)
async def get_transcript(
    transcript_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get a specific transcript."""
    transcript = await crud.get_transcript(db, transcript_id)
    return transcript


@router.post("/export", response_model=ExportResponse, status_code=201)
async def export_transcripts(
    data: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Export transcripts."""
    data.type = "transcripts"
    job = await crud.create_export_job(db, data, current_user.user_id)
    return job
