"""
Demographics management endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext

from ..schemas import (
    DepartmentCreate, DepartmentResponse,
    LocationCreate, LocationResponse,
    SpecializationCreate, SpecializationResponse,
    DemographicsResponse,
    EIDConfigUpdate, EIDConfigResponse,
)
from .. import crud

router = APIRouter(prefix="/demographics", tags=["Demographics"])


@router.get("/", response_model=DemographicsResponse)
async def get_all_demographics(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get all demographic options (departments, locations, specializations)."""
    departments = await crud.get_departments(db)
    locations = await crud.get_locations(db)
    specializations = await crud.get_specializations(db)
    return DemographicsResponse(
        departments=departments,
        locations=locations,
        specializations=specializations,
    )


# ============== Departments ==============

@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """List all departments."""
    return await crud.get_departments(db)


@router.post("/departments", response_model=DepartmentResponse, status_code=201)
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a new department."""
    return await crud.create_department(db, data)


# ============== Locations ==============

@router.get("/locations", response_model=List[LocationResponse])
async def list_locations(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """List all locations."""
    return await crud.get_locations(db)


@router.post("/locations", response_model=LocationResponse, status_code=201)
async def create_location(
    data: LocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a new location."""
    return await crud.create_location(db, data)


# ============== Specializations ==============

@router.get("/specializations", response_model=List[SpecializationResponse])
async def list_specializations(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """List all specializations."""
    return await crud.get_specializations(db)


@router.post("/specializations", response_model=SpecializationResponse, status_code=201)
async def create_specialization(
    data: SpecializationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a new specialization."""
    return await crud.create_specialization(db, data)


# ============== EID Configuration ==============

@router.get("/eid/config", response_model=EIDConfigResponse)
async def get_eid_config(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get EID generation configuration."""
    return await crud.get_or_create_eid_config(db)


@router.put("/eid/config", response_model=EIDConfigResponse)
async def update_eid_config(
    data: EIDConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Update EID generation configuration."""
    return await crud.update_eid_config(db, data)