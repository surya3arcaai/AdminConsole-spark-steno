"""
CRUD operations for User Onboarding Service.
"""

from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy import select, func, or_, delete, text
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
import logging
from shared.exceptions import NotFoundException, ConflictException, ValidationException

logger = logging.getLogger("arca_spark")


# ============== Department CRUD ==============

async def create_department(db: AsyncSession, data: DepartmentCreate) -> Department:
    from fastapi import HTTPException
    logger.info(f"Creating department request: name='{data.name}', code='{data.code}'")
    existing = await db.execute(select(Department).where(Department.name == data.name))
    if existing.scalar_one_or_none():
        logger.warning(f"Department creation failed: '{data.name}' already exists.")
        raise HTTPException(status_code=409, detail=f"Department '{data.name}' already exists.")

    dept_data = data.model_dump()
    if not dept_data.get("code"):
        import re
        clean_code = re.sub(r'[^A-Z0-9_-]', '', data.name.upper().replace(' ', '_'))[:50]
        dept_data["code"] = clean_code if clean_code else "DEPT"

    try:
        dept = Department(**dept_data)
        db.add(dept)
        await db.flush()
        await db.refresh(dept)
        logger.info(f"Department created successfully: id={dept.id}, name='{dept.name}', code='{dept.code}'")
        return dept
    except Exception as e:
        await db.rollback()
        logger.error(f"Database error creating department '{data.name}': {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Database error creating department: {str(e)}")


async def get_departments(db: AsyncSession) -> List[Department]:
    result = await db.execute(select(Department).order_by(Department.name))
    return list(result.scalars().all())


# ============== Location CRUD ==============

async def create_location(db: AsyncSession, data: LocationCreate) -> Location:
    from fastapi import HTTPException
    existing = await db.execute(select(Location).where(Location.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Location '{data.name}' already exists.")

    try:
        loc = Location(**data.model_dump())
        db.add(loc)
        await db.flush()
        await db.refresh(loc)
        return loc
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Database error creating location: {str(e)}")


async def get_locations(db: AsyncSession) -> List[Location]:
    result = await db.execute(select(Location).order_by(Location.name))
    return list(result.scalars().all())


# ============== Specialization CRUD ==============

async def create_specialization(db: AsyncSession, data: SpecializationCreate) -> Specialization:
    from fastapi import HTTPException
    existing = await db.execute(select(Specialization).where(Specialization.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Specialization '{data.name}' already exists.")

    try:
        spec = Specialization(**data.model_dump())
        db.add(spec)
        await db.flush()
        await db.refresh(spec)
        return spec
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Database error creating specialization: {str(e)}")


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


async def delete_user_from_keycloak(keycloak_user_id: str) -> bool:
    import httpx
    from .config import settings
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_url = f"{settings.keycloak_server_url}/realms/master/protocol/openid-connect/token"
            token_resp = await client.post(
                token_url,
                data={
                    "grant_type": "password",
                    "client_id": "admin-cli",
                    "username": settings.keycloak_admin_username,
                    "password": settings.keycloak_admin_password,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if token_resp.status_code == 200:
                admin_token = token_resp.json().get("access_token")
                delete_url = f"{settings.keycloak_server_url}/admin/realms/{settings.keycloak_realm}/users/{keycloak_user_id}"
                del_resp = await client.delete(
                    delete_url,
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                if del_resp.status_code in [200, 204]:
                    logger.info(f"🧹 Successfully deleted user from Keycloak: {keycloak_user_id}")
                    return True
                else:
                    logger.warning(f"⚠️ Failed to delete user {keycloak_user_id} from Keycloak: {del_resp.status_code} - {del_resp.text}")
    except Exception as e:
        logger.error(f"❌ Exception deleting Keycloak user {keycloak_user_id}: {e}")
    return False


async def create_user_with_keycloak(db: AsyncSession, name: str, email: str, phone: str, password: str) -> User:
    import uuid
    import httpx
    from .config import settings

    logger.info(f"🔑 Starting /registerUser onboarding for email='{email}', name='{name}'")
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        logger.warning(f"❌ User registration failed: User with email '{email}' already exists in PostgreSQL.")
        raise ConflictException(resource=f"User with email '{email}'")

    keycloak_user_id = str(uuid.uuid4())
    created_in_keycloak = False

    try:
        name_parts = (name or "").strip().split()
        first_name = name_parts[0] if name_parts else "-"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else "-"

        async with httpx.AsyncClient(timeout=10.0) as client:
            token_url = f"{settings.keycloak_server_url}/realms/master/protocol/openid-connect/token"
            logger.info(f"🌐 Requesting Keycloak Admin token via admin-cli: {token_url}")
            token_resp = await client.post(
                token_url,
                data={
                    "grant_type": "password",
                    "client_id": "admin-cli",
                    "username": settings.keycloak_admin_username,
                    "password": settings.keycloak_admin_password,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            if token_resp.status_code == 200:
                admin_token = token_resp.json().get("access_token")
                logger.info("✅ Keycloak Admin token successfully obtained.")

                keycloak_user = {
                    "username": email,
                    "email": email,
                    "firstName": first_name,
                    "lastName": last_name,
                    "enabled": True,
                    "emailVerified": False,
                    "credentials": [
                        {
                            "type": "password",
                            "value": password,
                            "temporary": False
                        }
                    ]
                }

                create_user_url = f"{settings.keycloak_server_url}/admin/realms/{settings.keycloak_realm}/users"
                logger.info(f"👤 Creating user in Keycloak realm '{settings.keycloak_realm}': {create_user_url}")
                user_resp = await client.post(
                    create_user_url,
                    json=keycloak_user,
                    headers={
                        "Authorization": f"Bearer {admin_token}",
                        "Content-Type": "application/json"
                    }
                )

                if user_resp.status_code == 201:
                    location = user_resp.headers.get("Location")
                    if location:
                        keycloak_user_id = location.split("/")[-1]
                    created_in_keycloak = True
                    logger.info(f"🎉 Keycloak user created successfully with ID: {keycloak_user_id}")
                elif user_resp.status_code == 409:
                    logger.warning(f"⚠️ User '{email}' already exists in Keycloak (409 Conflict). Fetching existing ID...")
                    search_url = f"{settings.keycloak_server_url}/admin/realms/{settings.keycloak_realm}/users"
                    search_resp = await client.get(
                        search_url,
                        params={"email": email},
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    if search_resp.status_code == 200:
                        users_found = search_resp.json()
                        if users_found:
                            keycloak_user_id = users_found[0]["id"]
                            logger.info(f"Found existing Keycloak user ID: {keycloak_user_id}")
                else:
                    logger.error(f"❌ Keycloak user creation failed: HTTP {user_resp.status_code} - {user_resp.text}")
            else:
                logger.error(f"❌ Keycloak admin token request failed: HTTP {token_resp.status_code} - {token_resp.text}")
    except Exception as e:
        logger.error(f"⚠️ Exception during Keycloak API interaction: {e}", exc_info=True)

    logger.info(f"💾 Saving user to PostgreSQL database with Keycloak ID='{keycloak_user_id}', email='{email}'")
    try:
        user = User(
            id=keycloak_user_id,
            name=name,
            email=email,
            phone=phone,
            status=UserStatus.PENDING.value
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        logger.info(f"✅ User saved to PostgreSQL successfully: id={user.id}")
        return user
    except Exception as e:
        await db.rollback()
        if created_in_keycloak:
            logger.error(f"❌ PostgreSQL database insert failed for '{email}': {e}. Cleaning up Keycloak user '{keycloak_user_id}'...")
            await delete_user_from_keycloak(keycloak_user_id)
        raise e


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
    logger.info(f"🗑️ Deleting user '{user_id}' and all associated records from PostgreSQL and Keycloak...")
    user = await get_user(db, user_id)

    # Fetch existing table names in public schema to avoid transaction abort errors
    tables_res = await db.execute(
        text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    )
    existing_tables = set(r[0] for r in tables_res.fetchall())

    potential_child_tables = [
        "meetings",
        "user_roles",
        "registrations",
        "supervisor_assignments",
        "audio_samples",
        "user_templates",
        "user_clinical_templates",
        "user_discharge_templates",
        "audios",
        "transcripts",
        "audio_recordings"
    ]

    for table_name in potential_child_tables:
        if table_name in existing_tables:
            try:
                if table_name == "supervisor_assignments":
                    await db.execute(
                        text("DELETE FROM supervisor_assignments WHERE user_id = :uid OR supervisor_id = :uid"),
                        {"uid": user_id}
                    )
                else:
                    await db.execute(
                        text(f"DELETE FROM {table_name} WHERE user_id = :uid"),
                        {"uid": user_id}
                    )
                logger.info(f"Cleaned child records from table '{table_name}' for user '{user_id}'")
            except Exception as e:
                logger.warning(f"Warning cleaning child table '{table_name}': {e}")

    await db.delete(user)
    await db.flush()
    await delete_user_from_keycloak(user_id)
    logger.info(f"✅ User '{user_id}' and all associated data successfully deleted from DB and Keycloak.")


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