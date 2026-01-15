FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY rbac-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities
COPY shared /app/shared

# Copy application code
COPY rbac-service/app /app/app
COPY rbac-service/alembic /app/alembic
COPY rbac-service/alembic.ini /app/alembic.ini

# Set Python path
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
