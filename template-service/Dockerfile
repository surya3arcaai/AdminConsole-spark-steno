FROM python:3.11-slim

WORKDIR /app

COPY template-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared /app/shared
COPY template-service/app /app/app
COPY template-service/alembic /app/alembic
COPY template-service/alembic.ini /app/alembic.ini

ENV PYTHONPATH=/app

EXPOSE 8003

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
