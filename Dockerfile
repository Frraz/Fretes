# ==============================================================================
# Dockerfile — Fretes (Controle de Fretes SF & SJ)
# Multi-stage build seguindo padrão dos demais sistemas no servidor
# ==============================================================================

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONHASHSEED=random

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* \
    && rm -rf /wheels

RUN addgroup --system fretes \
    && adduser --system --ingroup fretes --no-create-home fretes

COPY --chown=fretes:fretes . .

RUN mkdir -p /app/staticfiles \
    && chown -R fretes:fretes /app/staticfiles \
    && find /app -type f -name "*.pyc" -delete \
    && find /app -type d -name "__pycache__" -delete

USER fretes

EXPOSE 8000

ENTRYPOINT ["/usr/bin/tini", "--"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS -o /dev/null -w "%{http_code}" http://localhost:8000/ \
    | grep -qE "^(200|301|302)$" || exit 1