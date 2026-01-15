FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY user-onboarding-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities
COPY shared /app/shared

# Copy application code
COPY user-onboarding-service/app /app/app
COPY user-onboarding-service/alembic /app/alembic
COPY user-onboarding-service/alembic.ini /app/alembic.ini

# Set Python path
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8002

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
