"""
User management endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext
from shared.schemas import PaginatedResponse, SuccessResponse

from app import crud
from app.schemas import (
        UserCreate, RegisterUserRequest, UserUpdate, UserDemographicsUpdate,
        UserResponse, UserDetailResponse,
        RegistrationCreate, RegistrationUpdate, RegistrationResponse, VerifyRegistrationResponse,
        SupervisorAssignRequest, SupervisorResponse, ReporteeResponse,
        EIDGenerateResponse, EIDValidateResponse,
    )

router = APIRouter(tags=["Users"])


# ============== User CRUD ==============

@router.post("/registerUser", response_model=UserResponse, status_code=201)
async def register_user(
    data: RegisterUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Register a new user with Keycloak & database entry."""
    user = await crud.create_user_with_keycloak(
        db=db,
        name=data.name,
        email=data.email,
        phone=data.phone,
        password=data.password,
        department_id=data.department_id,
        hospital_id=data.hospital_id or data.location_id,
        specialization_id=data.specialization_id
    )
    return user


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a new user."""
    user = await crud.create_user(db, data)
    return user


@router.get("/", response_model=PaginatedResponse[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """List all users."""
    skip = (page - 1) * page_size
    users, total = await crud.get_users(db, skip=skip, limit=page_size)
    return PaginatedResponse.create(items=users, total=total, page=page, page_size=page_size)


@router.get("/search", response_model=PaginatedResponse[UserResponse])
async def search_users(
    query: Optional[str] = Query(None, description="Search by name, email, or EID"),
    department_id: Optional[str] = None,
    hospital_id: Optional[str] = None,
    location_id: Optional[str] = None,
    specialization_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Search users by various criteria."""
    skip = (page - 1) * page_size
    users, total = await crud.get_users(
        db,
        skip=skip,
        limit=page_size,
        query=query,
        department_id=department_id,
        location_id=hospital_id or location_id,
        specialization_id=specialization_id,
        status=status,
    )
    return PaginatedResponse.create(items=users, total=total, page=page, page_size=page_size)


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get a user by ID with full details."""
    user = await crud.get_user(db, user_id)
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Update a user."""
    user = await crud.update_user(db, user_id, data)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Delete a user."""
    await crud.delete_user(db, user_id)


@router.put("/{user_id}/demographics", response_model=UserResponse)
async def update_user_demographics(
    user_id: str,
    data: UserDemographicsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Update user demographics (department, location, specialization)."""
    user = await crud.update_user_demographics(db, user_id, data)
    return user


# ============== EID Management ==============

@router.post("/eid/generate", response_model=EIDGenerateResponse)
async def generate_eid(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Generate a new unique Employee ID."""
    eid = await crud.generate_eid(db)
    return EIDGenerateResponse(eid=eid)


@router.get("/eid/validate/{eid}", response_model=EIDValidateResponse)
async def validate_eid(
    eid: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Validate an Employee ID format and availability."""
    is_valid, is_available = await crud.validate_eid(db, eid)
    return EIDValidateResponse(eid=eid, is_valid=is_valid, is_available=is_available)


@router.put("/{user_id}/eid", response_model=UserResponse)
async def assign_eid(
    user_id: str,
    eid: Optional[str] = Query(None, description="Specific EID to assign, or auto-generate if not provided"),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Assign an Employee ID to a user."""
    user = await crud.assign_eid_to_user(db, user_id, eid)
    return user


# ============== Registration ==============

@router.post("/{user_id}/registration", response_model=RegistrationResponse, status_code=201)
async def set_registration(
    user_id: str,
    data: RegistrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Set registration number from medical council."""
    registration = await crud.create_registration(db, user_id, data)
    return registration


@router.get("/{user_id}/registration", response_model=RegistrationResponse)
async def get_registration(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get user's registration details."""
    registration = await crud.get_registration(db, user_id)
    return registration


@router.put("/{user_id}/registration", response_model=RegistrationResponse)
async def update_registration(
    user_id: str,
    data: RegistrationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Update user's registration details."""
    registration = await crud.update_registration(db, user_id, data)
    return registration


@router.post("/{user_id}/registration/verify", response_model=VerifyRegistrationResponse)
async def verify_registration(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Verify registration with medical council."""
    registration = await crud.verify_registration(db, user_id)
    return VerifyRegistrationResponse(
        registration_number=registration.registration_number,
        verified=registration.verified,
        verified_at=registration.verified_at,
        message="Registration verified successfully",
    )


# ============== Supervisor Management ==============

@router.post("/{user_id}/supervisor", response_model=SuccessResponse, status_code=201)
async def assign_supervisor(
    user_id: str,
    data: SupervisorAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Assign a supervisor to a user."""
    await crud.assign_supervisor(db, user_id, data.supervisor_id, current_user.user_id)
    return SuccessResponse(message=f"Supervisor assigned to user {user_id}")


@router.get("/{user_id}/supervisor", response_model=SupervisorResponse)
async def get_supervisor(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get user's assigned supervisor."""
    assignment = await crud.get_supervisor(db, user_id)
    return SupervisorResponse(
        id=assignment.id,
        user_id=assignment.user_id,
        supervisor_id=assignment.supervisor_id,
        supervisor_name=assignment.supervisor.name if assignment.supervisor else None,
        assigned_at=assignment.assigned_at,
        assigned_by=assignment.assigned_by,
    )


@router.put("/{user_id}/supervisor", response_model=SuccessResponse)
async def change_supervisor(
    user_id: str,
    data: SupervisorAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Change user's supervisor."""
    await crud.change_supervisor(db, user_id, data.supervisor_id, current_user.user_id)
    return SuccessResponse(message=f"Supervisor changed for user {user_id}")


@router.delete("/{user_id}/supervisor", status_code=204)
async def remove_supervisor(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Remove supervisor assignment from user."""
    await crud.remove_supervisor(db, user_id)


@router.get("/{supervisor_id}/reportees", response_model=PaginatedResponse[ReporteeResponse])
async def get_reportees(
    supervisor_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get all reportees for a supervisor."""
    skip = (page - 1) * page_size
    assignments, total = await crud.get_reportees(db, supervisor_id, skip=skip, limit=page_size)
    items = [
        ReporteeResponse(
            id=a.id,
            user_id=a.user_id,
            user_name=a.user.name,
            user_email=a.user.email,
            assigned_at=a.assigned_at,
        )
        for a in assignments
    ]
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)
