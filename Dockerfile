# Dockerfile — used for Hugging Face Spaces (Docker SDK) or any container host.
# Hugging Face Spaces expects the app on port 7860.
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements-deploy.txt .
RUN pip install --no-cache-dir -r requirements-deploy.txt

# Copy the application code, models and metrics
COPY . .

ENV PORT=7860
EXPOSE 7860

CMD ["gunicorn", "wsgi:app", "--bind", "0.0.0.0:7860", "--workers", "1", "--threads", "4", "--timeout", "120"]
