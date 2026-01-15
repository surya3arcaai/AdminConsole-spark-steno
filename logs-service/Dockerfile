FROM python:3.11-slim

WORKDIR /app

COPY logs-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared /app/shared
COPY logs-service/app /app/app
COPY logs-service/alembic /app/alembic
COPY logs-service/alembic.ini /app/alembic.ini

# Create exports directory
RUN mkdir -p /app/exports

ENV PYTHONPATH=/app

EXPOSE 8004

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004"]
