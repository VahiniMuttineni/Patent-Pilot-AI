# ==============================================================================
# Multi-stage production Dockerfile for Scientific Python API
# ==============================================================================

# STAGE 1: Builder
# ------------------------------------------------------------------------------
FROM python:3.11-slim as builder

# Avoid writing .pyc files & enable unbuffered stdout/stderr
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install build dependencies for scientific packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
# Install dependencies into the virtual environment
RUN pip install --no-cache-dir -U pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# STAGE 2: Production Runtime
# ------------------------------------------------------------------------------
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PATH="/opt/venv/bin:$PATH"
ENV ENVIRONMENT=production

# CRITICAL MEMORY OPTIMIZATION FOR FREE TIERS (512MB RAM Limit)
# Limits glibc memory arenas to prevent severe memory fragmentation from PyTorch/Faiss/RDKit
ENV MALLOC_ARENA_MAX=2
# Force garbage collection to run more aggressively
ENV PYTHONGC=2

# Install runtime dependencies only (libpq for asyncpg, X11 for RDKit drawing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgomp1 \
    libxrender1 \
    libxext6 \
    libexpat1 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -g 999 pythonapp && \
    useradd -r -u 999 -g pythonapp pythonapp

WORKDIR /app

# Copy virtual env from builder
COPY --from=builder --chown=pythonapp:pythonapp /opt/venv /opt/venv

# Copy application source code
COPY --chown=pythonapp:pythonapp . /app/

USER pythonapp

# Expose port (Render sets $PORT dynamically)
EXPOSE 8000

# Start command utilizing Render's dynamic PORT binding
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
