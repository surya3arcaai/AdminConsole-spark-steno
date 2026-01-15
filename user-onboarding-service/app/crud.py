"""
CRUD operations for User Onboarding Service.
"""

from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import (
    User, UserStatus, Department, Location, Specialization,
    EIDConfig, Registration, SupervisorAssignment, AudioSample
)
from .schemas import (
    UserCreate, UserUpdate, UserDemographicsUpdate,
    DepartmentCreate, LocationCreate, SpecializationCreate,
    RegistrationCreate, RegistrationUpdate, EIDConfigUpdate,
)
from shared.exceptions import NotFoundException, ConflictException, ValidationException


# ============== Department CRUD ==============

async def create_department(db: AsyncSession, data: DepartmentCreate) -> Department:
    existing = await db.execute(select(Department).where(Department.name == data.name))
    if existing.scalar_one_or_none():
        raise ConflictException(resource=f"Department '{data.name}'")

    dept = Department(**data.model_dump())
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
    return dept


async def get_departments(db: AsyncSession) -> List[Department]:
    result = await db.execute(select(Department).order_by(Department.name))
    return list(result.scalars().all())


# ============== Location CRUD ==============

async def create_location(db: AsyncSession, data: LocationCreate) -> Location:
    existing = await db.execute(select(Location).where(Location.name == data.name))
    if existing.scalar_one_or_none():
        raise ConflictException(resource=f"Location '{data.name}'")

    loc = Location(**data.model_dump())
    db.add(loc)
    await db.flush()
    await db.refresh(loc)
    return loc


async def get_locations(db: AsyncSession) -> List[Location]:
    result = await db.execute(select(Location).order_by(Location.name))
    return list(result.scalars().all())


# ============== Specialization CRUD ==============

async def create_specialization(db: AsyncSession, data: SpecializationCreate) -> Specialization:
    existing = await db.execute(select(Specialization).where(Specialization.name == data.name))
    if existing.scalar_one_or_none():
        raise ConflictException(resource=f"Specialization '{data.name}'")

    spec = Specialization(**data.model_dump())
    db.add(spec)
    await db.flush()
    await db.refresh(spec)
    return spec


async def get_specializations(db: AsyncSession) -> List[Specialization]:
    result = await db.execute(select(Specialization).order_by(Specialization.name))
    return list(result.scalars().all())


# ============== EID CRUD ==============

async def get_or_create_eid_config(db: AsyncSession) -> EIDConfig:
    result = await db.execute(select(EIDConfig))
    config = result.scalar_one_or_none()
    if not config:
        config = EIDConfig()
        db.add(config)
        await db.flush()
        await db.refresh(config)
    return config


async def update_eid_config(db: AsyncSession, data: EIDConfigUpdate) -> EIDConfig:
    config = await get_or_create_eid_config(db)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    await db.flush()
    await db.refresh(config)
    return config


async def generate_eid(db: AsyncSession) -> str:
    config = await get_or_create_eid_config(db)
    eid = config.pattern.format(prefix=config.prefix, sequence=config.current_sequence)
    config.current_sequence += 1
    await db.flush()
    return eid


async def validate_eid(db: AsyncSession, eid: str) -> Tuple[bool, bool]:
    """Returns (is_valid_format, is_available)."""
    config = await get_or_create_eid_config(db)
    is_valid = eid.startswith(config.prefix)

    result = await db.execute(select(User).where(User.eid == eid))
    is_available = result.scalar_one_or_none() is None

    return is_valid, is_available


# ============== User CRUD ==============

async def create_user(db: AsyncSession, data: UserCreate) -> User:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise ConflictException(resource=f"User with email '{data.email}'")

    user = User(**data.model_dump())
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def get_user(db: AsyncSession, user_id: str) -> User:
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.location),
            selectinload(User.specialization),
        )
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User", user_id)
    return user


async def get_users(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    query: Optional[str] = None,
    department_id: Optional[str] = None,
    location_id: Optional[str] = None,
    specialization_id: Optional[str] = None,
    status: Optional[str] = None,
) -> Tuple[List[User], int]:
    base_query = select(User)
    count_query = select(func.count(User.id))

    # Apply filters
    if query:
        search = f"%{query}%"
        filter_cond = or_(User.name.ilike(search), User.email.ilike(search), User.eid.ilike(search))
        base_query = base_query.where(filter_cond)
        count_query = count_query.where(filter_cond)

    if department_id:
        base_query = base_query.where(User.department_id == department_id)
        count_query = count_query.where(User.department_id == department_id)

    if location_id:
        base_query = base_query.where(User.location_id == location_id)
        count_query = count_query.where(User.location_id == location_id)

    if specialization_id:
        base_query = base_query.where(User.specialization_id == specialization_id)
        count_query = count_query.where(User.specialization_id == specialization_id)

    if status:
        base_query = base_query.where(User.status == UserStatus(status))
        count_query = count_query.where(User.status == UserStatus(status))

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(base_query.offset(skip).limit(limit).order_by(User.name))
    users = result.scalars().all()

    return list(users), total


async def update_user(db: AsyncSession, user_id: str, data: UserUpdate) -> User:
    user = await get_user(db, user_id)
    update_data = data.model_dump(exclude_unset=True)

    if "status" in update_data:
        update_data["status"] = UserStatus(update_data["status"])

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user)
    return user


async def update_user_demographics(db: AsyncSession, user_id: str, data: UserDemographicsUpdate) -> User:
    user = await get_user(db, user_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.flush()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user_id: str) -> None:
    user = await get_user(db, user_id)
    await db.delete(user)
    await db.flush()


async def assign_eid_to_user(db: AsyncSession, user_id: str, eid: Optional[str] = None) -> User:
    user = await get_user(db, user_id)
    if user.eid:
        raise ConflictException(message=f"User already has EID: {user.eid}")

    if eid:
        is_valid, is_available = await validate_eid(db, eid)
        if not is_available:
            raise ConflictException(message=f"EID '{eid}' is already in use")
        user.eid = eid
    else:
        user.eid = await generate_eid(db)

    await db.flush()
    await db.refresh(user)
    return user


# ============== Registration CRUD ==============

async def create_registration(db: AsyncSession, user_id: str, data: RegistrationCreate) -> Registration:
    await get_user(db, user_id)

    existing = await db.execute(select(Registration).where(Registration.user_id == user_id))
    if existing.scalar_one_or_none():
        raise ConflictException(message="User already has a registration")

    reg_number_exists = await db.execute(
        select(Registration).where(Registration.registration_number == data.registration_number)
    )
    if reg_number_exists.scalar_one_or_none():
        raise ConflictException(message=f"Registration number '{data.registration_number}' already exists")

    registration = Registration(user_id=user_id, **data.model_dump())
    db.add(registration)
    await db.flush()
    await db.refresh(registration)
    return registration


async def get_registration(db: AsyncSession, user_id: str) -> Registration:
    result = await db.execute(select(Registration).where(Registration.user_id == user_id))
    registration = result.scalar_one_or_none()
    if not registration:
        raise NotFoundException("Registration for user", user_id)
    return registration


async def update_registration(db: AsyncSession, user_id: str, data: RegistrationUpdate) -> Registration:
    registration = await get_registration(db, user_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(registration, field, value)
    await db.flush()
    await db.refresh(registration)
    return registration


async def verify_registration(db: AsyncSession, user_id: str) -> Registration:
    """Mark registration as verified. In production, this would integrate with council API."""
    registration = await get_registration(db, user_id)
    registration.verified = True
    registration.verified_at = datetime.utcnow()
    await db.flush()
    await db.refresh(registration)
    return registration


# ============== Supervisor CRUD ==============

async def assign_supervisor(
    db: AsyncSession,
    user_id: str,
    supervisor_id: str,
    assigned_by: Optional[str] = None
) -> SupervisorAssignment:
    await get_user(db, user_id)
    await get_user(db, supervisor_id)

    if user_id == supervisor_id:
        raise ValidationException("User cannot be their own supervisor")

    existing = await db.execute(select(SupervisorAssignment).where(SupervisorAssignment.user_id == user_id))
    if existing.scalar_one_or_none():
        raise ConflictException(message="User already has a supervisor assigned")

    assignment = SupervisorAssignment(
        user_id=user_id,
        supervisor_id=supervisor_id,
        assigned_by=assigned_by,
    )
    db.add(assignment)
    await db.flush()
    await db.refresh(assignment)
    return assignment


async def get_supervisor(db: AsyncSession, user_id: str) -> SupervisorAssignment:
    result = await db.execute(
        select(SupervisorAssignment)
        .options(selectinload(SupervisorAssignment.supervisor))
        .where(SupervisorAssignment.user_id == user_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise NotFoundException("Supervisor assignment for user", user_id)
    return assignment


async def change_supervisor(
    db: AsyncSession,
    user_id: str,
    supervisor_id: str,
    assigned_by: Optional[str] = None
) -> SupervisorAssignment:
    assignment = await get_supervisor(db, user_id)
    await get_user(db, supervisor_id)

    if user_id == supervisor_id:
        raise ValidationException("User cannot be their own supervisor")

    assignment.supervisor_id = supervisor_id
    assignment.assigned_at = datetime.utcnow()
    assignment.assigned_by = assigned_by
    await db.flush()
    await db.refresh(assignment)
    return assignment


async def remove_supervisor(db: AsyncSession, user_id: str) -> None:
    assignment = await get_supervisor(db, user_id)
    await db.delete(assignment)
    await db.flush()


async def get_reportees(
    db: AsyncSession,
    supervisor_id: str,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[SupervisorAssignment], int]:
    await get_user(db, supervisor_id)

    count_result = await db.execute(
        select(func.count(SupervisorAssignment.id))
        .where(SupervisorAssignment.supervisor_id == supervisor_id)
    )
    total = count_result.scalar()

    result = await db.execute(
        select(SupervisorAssignment)
        .options(selectinload(SupervisorAssignment.user))
        .where(SupervisorAssignment.supervisor_id == supervisor_id)
        .offset(skip)
        .limit(limit)
    )
    assignments = result.scalars().all()

    return list(assignments), total


# ============== Audio Sample CRUD ==============

async def create_audio_sample(
    db: AsyncSession,
    user_id: str,
    filename: str,
    file_data: bytes,
    format: str,
    duration_seconds: Optional[int] = None,
) -> AudioSample:
    await get_user(db, user_id)

    sample = AudioSample(
        user_id=user_id,
        filename=filename,
        file_data=file_data,
        format=format,
        size_bytes=len(file_data),
        duration_seconds=duration_seconds,
    )
    db.add(sample)
    await db.flush()
    await db.refresh(sample)
    return sample


async def get_audio_samples(db: AsyncSession, user_id: str) -> List[AudioSample]:
    await get_user(db, user_id)
    result = await db.execute(
        select(AudioSample)
        .where(AudioSample.user_id == user_id)
        .order_by(AudioSample.created_at.desc())
    )
    return list(result.scalars().all())


async def get_audio_sample(db: AsyncSession, user_id: str, sample_id: str) -> AudioSample:
    result = await db.execute(
        select(AudioSample)
        .where(AudioSample.id == sample_id, AudioSample.user_id == user_id)
    )
    sample = result.scalar_one_or_none()
    if not sample:
        raise NotFoundException("Audio sample", sample_id)
    return sample


async def delete_audio_sample(db: AsyncSession, user_id: str, sample_id: str) -> None:
    sample = await get_audio_sample(db, user_id, sample_id)
    await db.delete(sample)
    await db.flush()


async def validate_audio_sample(db: AsyncSession, user_id: str, sample_id: str) -> AudioSample:
    """Mark audio sample as validated. In production, this would run quality checks."""
    sample = await get_audio_sample(db, user_id, sample_id)
    sample.validated = True
    await db.flush()
    await db.refresh(sample)
    return sample
