FROM python:3.9-slim

WORKDIR /app

# Install build dependencies for pyorc
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app.py .

# Expose port
EXPOSE 8080

# Start command
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8080"]
