"""
Audio sample management endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext

from ..config import settings
from ..schemas import AudioSampleResponse, AudioSampleValidateResponse
from .. import crud

router = APIRouter(tags=["Audio Samples"])


@router.post("/{user_id}/audio", response_model=AudioSampleResponse, status_code=201)
async def upload_audio_sample(
    user_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Upload an audio sample for a user.

    Supported formats: wav, mp3, m4a, ogg
    Maximum size: 5MB
    """
    # Validate file format
    file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if file_ext not in settings.allowed_audio_formats:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid audio format. Allowed: {', '.join(settings.allowed_audio_formats)}"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    max_size = settings.max_audio_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_audio_size_mb}MB"
        )

    # Create audio sample
    sample = await crud.create_audio_sample(
        db,
        user_id=user_id,
        filename=file.filename or f"audio.{file_ext}",
        file_data=content,
        format=file_ext,
    )
    return sample


@router.get("/{user_id}/audio", response_model=List[AudioSampleResponse])
async def list_audio_samples(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """List all audio samples for a user."""
    samples = await crud.get_audio_samples(db, user_id)
    return samples


@router.get("/{user_id}/audio/{sample_id}", response_model=AudioSampleResponse)
async def get_audio_sample_info(
    user_id: str,
    sample_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get audio sample metadata."""
    sample = await crud.get_audio_sample(db, user_id, sample_id)
    return sample


@router.get("/{user_id}/audio/{sample_id}/download")
async def download_audio_sample(
    user_id: str,
    sample_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Download the audio sample file."""
    sample = await crud.get_audio_sample(db, user_id, sample_id)

    # Determine content type
    content_types = {
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "m4a": "audio/mp4",
        "ogg": "audio/ogg",
    }
    content_type = content_types.get(sample.format, "application/octet-stream")

    return Response(
        content=sample.file_data,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{sample.filename}"'
        }
    )


@router.delete("/{user_id}/audio/{sample_id}", status_code=204)
async def delete_audio_sample(
    user_id: str,
    sample_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Delete an audio sample."""
    await crud.delete_audio_sample(db, user_id, sample_id)


@router.post("/{user_id}/audio/{sample_id}/validate", response_model=AudioSampleValidateResponse)
async def validate_audio_sample(
    user_id: str,
    sample_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Validate audio sample quality.

    In production, this would run quality checks on the audio.
    """
    sample = await crud.validate_audio_sample(db, user_id, sample_id)
    return AudioSampleValidateResponse(
        id=sample.id,
        validated=sample.validated,
        message="Audio sample validated successfully",
    )
