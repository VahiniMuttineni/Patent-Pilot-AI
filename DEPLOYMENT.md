# 🚀 PatentPilot AI - Production Deployment Guide

This document outlines the step-by-step process for deploying the PatentPilot AI platform into production. The architecture consists of a Next.js frontend deployed on Vercel and a FastAPI backend deployed on Render, backed by PostgreSQL and Redis.

---

## 1. Deploy the Backend on Render

Render is configured using Infrastructure-as-Code via the `render.yaml` blueprint.

1.  Log in to your [Render Dashboard](https://dashboard.render.com/).
2.  Navigate to **Blueprints** and click **New Blueprint Instance**.
3.  Connect this GitHub repository.
4.  Render will automatically parse `render.yaml` and prompt you to set the secure environment variables that are marked as `sync: false` (e.g., `SECRET_KEY`, `GROQ_API_KEY`, `LENS_API_TOKEN`).
5.  Click **Apply**.
6.  Render will automatically provision the PostgreSQL database, the Redis cache, and build the Docker container for the FastAPI backend.

### Environment Variable Matrix (Backend)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Must be set to `production`. Triggers structured JSON logging and strict validations. | `production` |
| `SECRET_KEY` | 256-bit secure key for signing JWTs. | Generate with `openssl rand -hex 32` |
| `CORS_ORIGINS` | Comma-separated list of permitted frontend domains. | `https://patentpilot.vercel.app` |
| `LLM_PROVIDER` | AI provider configuration. | `groq` or `gemini` |
| `GROQ_API_KEY` | Required if `LLM_PROVIDER=groq`. | `gsk_...` |
| `LENS_API_TOKEN` | Required for patent claim extraction. | `I0e9XO4GdCd...` |

> [!CAUTION]
> **Database Migrations**
> When deploying to Render for the first time, Alembic migrations run automatically on startup via `async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)`. However, for complex structural changes in the future, you should run Alembic scripts manually via the Render Shell before the new code boots.

---

## 2. Deploy the Frontend on Vercel

The frontend is a purely static and serverless Next.js application.

1.  Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **Add New Project** and import the GitHub repository.
3.  Set the **Framework Preset** to **Next.js**.
4.  Set the **Root Directory** to `frontend`.
5.  Configure the following Environment Variables:

### Environment Variable Matrix (Frontend)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | The public URL of your Render backend API. | `https://patentpilot-api.onrender.com/api/v1` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Client ID for Google login. | `22147878...apps.googleusercontent.com` |

6.  Click **Deploy**.

---

## 3. Production Verification

Once both platforms are deployed, execute this checklist to verify production readiness:

- [ ] **Health Endpoints Pass**: Navigate to `https://patentpilot-api.onrender.com/api/v1/health`. Ensure database, redis, and external providers report `"healthy"` or `"configured"`.
- [ ] **CORS is Enforced**: Attempt to curl the API from an unauthorized origin; ensure it is blocked.
- [ ] **Authentication**: Verify that Google OAuth login redirects correctly to your Vercel domain.
- [ ] **Logging**: Check the Render Logs panel. Ensure logs are outputting in flat JSON format (`{"timestamp": "...", "level": "INFO", ...}`).
- [ ] **Pipeline Validation**: Run a new FTO analysis in the production frontend to ensure RDKit, FAISS, and Groq successfully coordinate.

---

## Troubleshooting

> [!WARNING]
> **Redis Connection Timeouts on Render**
> If the API boot fails due to Redis timeout, check if your Redis instance is spun down (Free Tier). The backend is configured to gracefully degrade and run without cache if Redis fails during startup.

> [!TIP]
> **Database Pooling Limits**
> The application uses an optimized asyncpg connection pool (`pool_size=20`). If you scale Render instances past 4 concurrent nodes, you may need to upgrade your PostgreSQL tier to support more than 100 concurrent connections.
