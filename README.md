# Arca Spark Admin Console - Backend Services

Backend microservices for the Arca Spark Admin Console, providing role-based access control, user onboarding, template management, and logging/monitoring capabilities.

## Architecture

The backend consists of 4 microservices sharing a PostgreSQL database:

| Service | Port | Description |
|---------|------|-------------|
| **rbac-service** | 8001 | Role-Based Access Control - manages roles, permissions, and access validation |
| **user-onboarding-service** | 8002 | User management, demographics, EID generation, registration verification |
| **template-service** | 8003 | Clinical and discharge template management with versioning |
| **logs-service** | 8004 | API logging, monitoring, alerts, transcripts, and analytics |

## Tech Stack

- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 15 (via Docker Compose)
- **ORM:** SQLAlchemy 2.0 with async support
- **Migrations:** Alembic
- **Validation:** Pydantic v2
- **JWT:** python-jose (validation only - tokens issued by frontend)
- **Testing:** pytest + pytest-asyncio

## Project Structure

```
arca-spark-admin/
├── docker-compose.yml          # PostgreSQL + all services
├── shared/                     # Shared utilities package
│   ├── auth.py                 # JWT validation
│   ├── database.py             # DB connection utilities
│   ├── exceptions.py           # Common exceptions
│   ├── middleware.py           # Logging, error handling
│   └── schemas.py              # Common Pydantic schemas
├── rbac-service/               # Port 8001
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── crud.py
│   │   └── routers/
│   ├── tests/
│   ├── alembic/
│   └── requirements.txt
├── user-onboarding-service/    # Port 8002
├── template-service/           # Port 8003
└── logs-service/               # Port 8004
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)

### Running with Docker

```bash
# Clone the repository
git clone https://github.com/surya3arcaai/AdminConsole-spark-steno.git
cd AdminConsole-spark-steno

# Start all services
docker-compose up -d

#restart all services
docker-compose up -d --build

# Check service health
curl http://localhost:8001/health  # RBAC
curl http://localhost:8002/health  # User Onboarding
curl http://localhost:8003/health  # Templates
curl http://localhost:8004/health  # Logs
```

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r shared/requirements.txt
pip install -r rbac-service/requirements.txt
# ... repeat for other services

# Set environment variables
export DATABASE_URL="postgresql://postgres:Password%40123@192.168.112.6:31155/arca-spark"
export JWT_SECRET_KEY="your-secret-key"

# Run a service
cd rbac-service
uvicorn app.main:app --reload --port 8001
```

### Running Tests

```bash
# Activate virtual environment
source venv/bin/activate

# Run all tests (uses SQLite for testing)
DATABASE_URL="sqlite+aiosqlite:///./test.db" python -m pytest rbac-service/tests/ -v
DATABASE_URL="sqlite+aiosqlite:///./test.db" python -m pytest user-onboarding-service/tests/ -v
DATABASE_URL="sqlite+aiosqlite:///./test.db" python -m pytest template-service/tests/ -v
DATABASE_URL="sqlite+aiosqlite:///./test.db" python -m pytest logs-service/tests/ -v
```

## API Documentation

Each service provides interactive API documentation:

- **RBAC Service:** http://localhost:8001/docs
- **User Onboarding:** http://localhost:8002/docs
- **Template Service:** http://localhost:8003/docs
- **Logs Service:** http://localhost:8004/docs

## Service Details

### RBAC Service (Port 8001)

Manages roles, permissions, and access control.

**Key Features:**
- Role CRUD operations
- Permission management
- Role-permission assignments
- User-role assignments
- Access validation
- Pre-defined roles: Doctor, Admin, Supervisor

**Database Tables:** `roles`, `permissions`, `role_permissions`, `user_roles`

### User Onboarding Service (Port 8002)

Handles user management and onboarding workflows.

**Key Features:**
- User CRUD operations
- Demographics management (departments, locations, specializations)
- Employee ID (EID) generation and validation
- Medical registration verification
- Supervisor/reportee assignments
- Audio sample storage for voice recognition

**Database Tables:** `users`, `departments`, `locations`, `specializations`, `eid_config`, `registrations`, `supervisor_assignments`, `audio_samples`

### Template Service (Port 8003)

Manages clinical and discharge templates.

**Key Features:**
- Clinical note templates
- Discharge summary templates
- Template versioning
- Variable substitution (Jinja2)
- Template preview and rendering
- Import/export functionality

**Database Tables:** `templates`, `template_versions`

### Logs Service (Port 8004)

Provides logging, monitoring, and analytics.

**Key Features:**
- API request/response logging
- Container log aggregation
- Database query logging
- Transcript storage and search
- Alert management
- Log export (CSV, JSON, PDF)
- Dashboard metrics and graphs

**Database Tables:** `api_logs`, `container_logs`, `db_logs`, `transcripts`, `alerts`, `export_jobs`, `graph_configs`

## Authentication

Services validate JWT tokens issued by the Arca Spark frontend. All endpoints (except `/health`) require a valid Bearer token.

```bash
# Example authenticated request
curl -H "Authorization: Bearer <token>" http://localhost:8001/roles
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://...` |
| `JWT_SECRET_KEY` | Secret for JWT validation | `your-super-secret-jwt-key-change-in-production` |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `SERVICE_PORT` | Service port | varies by service |

## Database

All services share a single PostgreSQL database (`arca_spark_db`).

**Connection Details (Docker):**
- Host: `localhost`
- Port: `5432`
- Database: `arca_spark_db`
- User: `arca_admin`
- Password: `arca_secret_2026`

## Test Coverage

| Service | Tests | Status |
|---------|-------|--------|
| RBAC Service | 25 | All passing |
| User Onboarding Service | 14 | All passing |
| Template Service | 12 | All passing |
| Logs Service | 18 | All passing |
| **Total** | **69** | **All passing** |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests to ensure all pass
5. Submit a pull request

## License

Proprietary - Arca AI
