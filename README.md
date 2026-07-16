# 🧬 PatentPilot AI
> **AI-Assisted Freedom-to-Operate (FTO) Workspace** — Automated Chemical Patentability Analysis, Prior Art Discovery & Markush Structure Overlap Engine.

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![RDKit](https://img.shields.io/badge/RDKit-Cheminformatics-2D9C72?style=for-the-badge)](https://www.rdkit.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.0-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3-orange?style=for-the-badge)](https://groq.com/)

[Explore Workspace](#-overall-architecture) • [AI Pipeline](#-ai-workflow) • [API Documentation](#-api-endpoints) • [Deployment Guide](#-docker-deployment)

</div>

---

## 📌 1. Project Overview
**PatentPilot AI** is a state-of-the-art cheminformatics SaaS platform designed to bridge molecular chemistry and patent law. It enables pharmaceutical researchers, patent attorneys, and biotech founders to perform automated **Freedom-to-Operate (FTO)** evaluations, **Prior Art Discovery**, and **Markush Structure Overlap Analysis** in seconds.

---

## ⚠️ 2. Problem Statement
Bringing a new therapeutic molecule or chemical formulation to market requires exhaustive legal clearance. Traditional Freedom-to-Operate (FTO) searches are:
* **Slow and Expensive**: Relying on manual compound matching across legal text indices that cost thousands of dollars per query.
* **Cheminformatics Blindness**: Traditional keyword search engines miss complex Markush claim definitions (generic structural formulas covering families of millions of chemical analogs).
* **Information Overload**: Legal teams are flooded with thousands of irrelevant search results, making manual synthesis of novelty concerns slow and error-prone.

---

## 💡 3. Solution
PatentPilot AI solves these inefficiencies by automating the scientific and legal mapping workflow:
1. **Deterministic Chemical Resolution**: Standardizes complex input structures using RDKit canonicalization.
2. **Hybrid Retrieval**: Queries structured patent databases (Lens.org API) and scientific literature (NCBI PubMed) simultaneously.
3. **FAISS-Based Semantic Search**: Ranks prior art using high-density vector embeddings of patent abstracts and claim structures.
4. **LLM-Powered FTO Synthesis**: Uses Groq (Llama 3.3) and Gemini 2.0 to perform target claim overlap checks, calculate confidence scores, and synthesize formal enterprise-grade patentability reports.

---

## ⭐ 4. Key Features
* 🧬 **Deterministic Structure Resolution**: Resolves SMILES inputs into verified compound names, database IDs (PubChem, ChemSpider, ChEMBL), and physicochemical descriptors in real time.
* 🔍 **Multi-Provider Retrieval Engine**: Concurrently queries Lens.org Patent API, NCBI PubMed, and public molecular registries.
* 🧮 **FAISS Semantic Similarity Ranking**: Embeds patent texts via Google Generative AI to compute precise cosine-similarity matches against user queries.
* 🤖 **Autonomous Multi-Agent FTO Analysis**: Automatically analyzes individual patent claims, maps Markush claim boundaries, and assesses potential legal overlaps.
* 📄 **Enterprise PDF & DOCX Export**: One-click generation of beautifully formatted, executive-grade print layouts ready for stakeholders.
* 💬 **RAG Chat Copilot**: An interactive research assistant to ask technical or legal questions directly about the retrieved patent corpus.

---

## 🏗️ 5. Overall Architecture
The application is designed as a decoupled modern architecture. 
* **Frontend**: Next.js 15 (App Router, Tailwind CSS, TanStack Query) providing an interactive workspace layout.
* **Backend**: FastAPI asynchronous REST gateway managing concurrent upstream integrations, RDKit processing, and background worker threads.

---

## 🤖 6. AI Workflow
```mermaid
graph TD
    A[SMILES / Compound Query] --> B[RDKit Structural Standardization]
    B --> C[Concurrent Upstream API Searches]
    C --> D[FAISS Vector Embedding & Ranking]
    D --> E[Top-K Prior Art Extraction]
    E --> F[Multi-Agent Analysis: Groq Llama 3.3]
    F --> G[FTO Risk Classification: Low, Moderate, High]
    G --> H[Final Patentability Report Generation]
```

---

## 🎯 7. Retrieval Strategy
1. **Deterministic Canonicalization**: Input SMILES are standardized via RDKit to resolve structure variations.
2. **Metadata Bootstrapping**: Queries PubChem, ChEMBL, and ChemSpider to resolve synonyms, targets, and classifications.
3. **Targeted Patent Search**: Performs exact phrase and structural queries using the Lens.org Patent Search API.
4. **Academic Literature Search**: Queries NCBI PubMed for clinical literature and mechanism-of-action papers.
5. **FAISS Dense Vector Indexing**: Abstracts are vectorized into 768-dimensional embeddings using Gemini `embedding-001`.
6. **Similarity-Weighted Ranking**: Combines semantic cosine similarity, molecular similarity, and priority recency metrics.

---

## 🛠️ 8. Technology Stack

### Backend Stack
* **Web Framework**: FastAPI (Uvicorn, Asynchronous ASGI)
* **Cheminformatics**: RDKit (C++ scientific wrappers for Python)
* **Vector Index**: FAISS (Facebook AI Similarity Search) & NumPy
* **ORM & Database**: SQLAlchemy 2.0 (AsyncPG driver) & PostgreSQL
* **Caching**: Redis (Async client configuration support)
* **AI Model Engine**: Google Gemini API & Groq Llama 3.3

### Frontend Stack
* **Web Framework**: Next.js 15.5 (React 19, TypeScript)
* **Styling**: Tailwind CSS
* **State Management**: TanStack React Query v5
* **Interactions**: Framer Motion, Lucide React
* **OAuth**: Google OAuth 2.0 Integration

---

## 📁 9. Folder Structure
```text
patentpilot-frontend/
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints, middleware, and dependency injection
│   │   ├── core/           # Config settings, security, and database connections
│   │   ├── models/         # SQLAlchemy database models
│   │   ├── repositories/   # Database access layer (BaseRepository, SearchRepository)
│   │   ├── schemas/        # Pydantic validation schemas
│   │   ├── services/       # Core business logic, LLM clients, and provider adapters
│   │   └── main.py         # App entry point
│   ├── migrations/         # Alembic database migration files
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages and routing layout
│   │   ├── components/     # Reusable UI widgets and workspace panels
│   │   ├── contexts/       # Auth and Global contexts
│   │   ├── lib/            # Axios API client setup
│   │   └── services/       # API abstraction services (Search, Auth)
│   ├── package.json
│   └── tailwind.config.ts
└── README.md
```

---

## 🗺️ 10. System Architecture Diagram
```mermaid
flowchart TB
    subgraph Client ["Client Interface (Next.js 15)"]
        UI["Web Workspace / Dashboard"]
        AuthContext["Auth Context / Session"]
    end

    subgraph BackendGateway ["API Gateway (FastAPI)"]
        Router["REST Routers"]
        Middleware["CORS / Rate Limiting Middleware"]
        DbSession["Async Database Session"]
    end

    subgraph ServiceLayer ["Service Layer"]
        Orchestrator["Search Orchestrator"]
        MoleculeSvc["RDKit Molecule Service"]
        RetrievalSvc["Concurrent Retrieval Service"]
        RankingSvc["FAISS Ranking Service"]
        ReportGen["LLM Report Generator"]
    end

    subgraph CloudLayer ["External Integrations"]
        GeminiEmb["Google Gemini Embeddings"]
        Groq["Groq Llama 3.3 API"]
        Lens["Lens.org Patent API"]
        NCBI["NCBI PubMed API"]
    end

    UI --> Middleware
    Middleware --> Router
    Router --> Orchestrator
    Orchestrator --> MoleculeSvc
    Orchestrator --> RetrievalSvc
    Orchestrator --> RankingSvc
    Orchestrator --> ReportGen
    
    RetrievalSvc --> Lens
    RetrievalSvc --> NCBI
    RankingSvc --> GeminiEmb
    ReportGen --> Groq
    
    DbSession --> PostgreSQL[("PostgreSQL Database")]
    Orchestrator --> DbSession
```

---

## 🔄 11. API Flow
```mermaid
sequenceDiagram
    participant User as Web Client
    participant API as FastAPI Gateway
    participant DB as PostgreSQL
    participant Search as Search Service
    participant LLM as Groq / Gemini

    User->>API: POST /api/v1/search (SMILES Input)
    API->>Search: Standardize structure & lookup databases
    Search->>API: Return Compound Metadata
    API->>DB: INSERT Search History (PENDING status)
    API-->>User: HTTP 202 Accepted (Return Search ID)
    
    Note over API,LLM: Background Pipeline Executing
    Search->>LLM: Fetch Embeddings & Generate Report
    Search->>DB: UPDATE Search History (COMPLETED, Save Report)
    
    loop Poll Status
        User->>API: GET /api/v1/search/{id}/status
        API->>DB: Fetch record status
        DB-->>API: Status (PENDING/RUNNING/COMPLETED)
        API-->>User: Return status JSON
    end
```

---

## 💾 12. Database Design
```mermaid
erDiagram
    USERS ||--o{ SEARCH_HISTORY : "initiates"
    SEARCH_HISTORY ||--o{ SEARCH_HISTORY_PATENT : "contains"
    PATENTS ||--o{ SEARCH_HISTORY_PATENT : "referenced_in"
    SEARCH_HISTORY ||--o| REPORTS : "has"
    SEARCH_HISTORY ||--o{ PATENT_ANALYSIS : "analyzed_in"
    PATENTS ||--o{ PATENT_ANALYSIS : "has_analysis"

    USERS {
        uuid id PK
        string email
        string full_name
        string hashed_password
    }

    SEARCH_HISTORY {
        uuid id PK
        uuid user_id FK
        string input_smiles
        string compound_name
        string status
        string current_stage
        float progress_percentage
        jsonb molecule_metadata
    }

    PATENTS {
        uuid id PK
        string patent_number UK
        string title
        string assignee
        text abstract
        string publication_date
        string source
    }

    SEARCH_HISTORY_PATENT {
        uuid search_history_id FK
        uuid patent_id FK
        float final_score
        jsonb component_scores
    }

    REPORTS {
        uuid id PK
        uuid search_history_id FK
        text executive_summary
        jsonb top_similar_patents
        text novelty_concerns
        string overall_recommendation
        float patent_risk_score
        float confidence
    }

    PATENT_ANALYSIS {
        uuid id PK
        uuid search_history_id FK
        uuid patent_id FK
        text why_retrieved
        text novelty_concerns
        text potential_claim_overlap
        float confidence_score
        string risk_level
    }
```

---

## 🔑 13. Authentication Flow
PatentPilot AI integrates a secure JWT authentication flow supporting both password login and Google OAuth 2.0 client-side credential verification:
1. **Google OAuth 2.0 Redirect**: Client initiates authorization via Google login API.
2. **Access Token Handshake**: Client POSTs the retrieved Google access token to `/api/v1/auth/google`.
3. **Verification**: Backend contacts Google endpoint (`/oauth2/v3/userinfo`) to verify signature, retrieve email, and confirm profile.
4. **Token Generation**: Backend registers/updates user details and issues an encrypted JWT access token (expires in 60 minutes) and a secure refresh token.
5. **Subsequent API calls**: Bearer token is appended inside client-side interceptors for authenticated routing.

---

## 🧪 14. Patent Analysis Pipeline
```text
   +-----------------------------------------------------+
   |           Ingest Canonical SMILES structure          |
   +--------------------------+--------------------------+
                              |
                              v
   +--------------------------+--------------------------+
   |          Fetch Patents (Lens.org Patent API)         |
   +--------------------------+--------------------------+
                              |
                              v
   +--------------------------+--------------------------+
   |      Compute Embeddings (Gemini embedding-001)       |
   +--------------------------+--------------------------+
                              |
                              v
   +--------------------------+--------------------------+
   |        Rank Similarity (FAISS Cosine Similarity)     |
   +--------------------------+--------------------------+
                              |
                              v
   +--------------------------+--------------------------+
   |     Perform RAG Overlap Audit (Groq Llama 3.3)      |
   +--------------------------+--------------------------+
                              |
                              v
   +--------------------------+--------------------------+
   |           Save Report & Patents to PostgreSQL        |
   +-----------------------------------------------------+
```

---

## 🧬 15. Molecular Similarity Search Pipeline
The molecular screening engine employs both deterministic fingerprint comparisons and semantic search:
1. **RDKit Molecule Construction**: The raw SMILES input is parsed into a C++ `ROMol` molecular graph structure.
2. **Structure Verification**: Ensures correct valence bonds and checks aromatic configurations.
3. **ECFP4 Fingerprints**: Generates 2048-bit Morgan Fingerprints representing topological environments of atoms.
4. **Similarity Filtering**: Performs Tanimoto similarity comparisons between ECFP4 fingerprints of input structure against reference database patents (typically thresholding $\ge 0.82$).

---

## ⚖️ 16. Assumptions
1. **English-Only Focus**: Upstream legal queries are constrained to English language records to maximize LLM processing compatibility.
2. **Free-Tier Limits**: Rate limits are assumed to be managed gracefully via background queues and client loading states to work on free Cloud plans.
3. **Database Consistency**: Assumes PostgreSQL dynamically initializes schemas using SQLAlchemy `create_all` during backend lifespan lifecycle.

---

## 📉 17. Trade-offs
1. **Cloud Embeddings vs. Local Sentence-Transformers**:
   * *Trade-off*: We offload all vectorizations to Google Gemini API instead of running local Python PyTorch models.
   * *Reasoning*: Ripping out heavy PyTorch packages reduced the Docker image size by over 1.2GB and cut RAM usage down to 200MB, allowing the application to deploy seamlessly on Free Tier hosts.
2. **Stateless App Client Routing**:
   * *Trade-off*: PDF and DOCX reports are compiled using purely client-side rendering libraries.
   * *Reasoning*: Saves significant CPU overhead on the backend and reduces server execution times.

---

## 🔮 18. Future Improvements
1. **Dynamic Patent PDF Parser**: Allow users to drag-and-drop local PDF patent sheets to parse and scan claims in private workspaces.
2. **Expanded Search Regions**: Integrate European Patent Office (EPO) and China National Intellectual Property Administration (CNIPA) native search layers.
3. **WASM RDKit**: Move molecule layout rendering completely client-side by integrating WASM RDKit bindings.

---

## 💿 19. Installation Guide
Ensure you have the following prerequisites installed on your system:
* **Python** `>= 3.11`
* **Node.js** `>= 18.x`
* **PostgreSQL** (running locally on port 5432 or active cloud URI)

---

## 💻 20. Local Development Setup

### Step 1: Environment Variables
Create a `.env` file in the `backend/` directory:
```env
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/patentpilot
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
LENS_API_TOKEN=your_lens_api_token
NCBI_API_KEY=your_ncbi_api_key
CHEMSPIDER_API_KEY=your_chemspider_api_key
SECRET_KEY=generate_a_secure_random_string
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Create a `.env.local` file in the `frontend/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

---

## 🚀 21. Running the Backend
```bash
cd backend

# Initialize Virtual Environment
python3 -m venv venv
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🖥️ 22. Running the Frontend
```bash
cd frontend

# Install Packages
npm install

# Run Development Server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the workspace.

---

## 🐳 23. Docker Deployment
Deploy the entire application as Docker containers:
```bash
# Build the production docker container for the backend
docker build -t patentpilot-backend ./backend

# Run the container
docker run -p 8000:8000 --env-file ./backend/.env patentpilot-backend
```

---

## ☁️ 24. Render Deployment (Backend)
1. Create a **Web Service** on Render.
2. Link it to your GitHub Repository containing the `backend/` directory.
3. Configure the following settings:
   * **Root Directory**: `backend`
   * **Runtime**: `Docker`
   * **Dockerfile Path**: `Dockerfile`
   * **Build Context**: `.`
4. Add all environment variables listed in Section 20 into the Render **Environment** tab.

---

## ⚡ 25. Vercel Deployment (Frontend)
1. Go to your Vercel Dashboard.
2. Click **New Project** and import the frontend directory.
3. Set the Environment Variable:
   * `NEXT_PUBLIC_API_URL` = Your Render backend URL endpoint `/api/v1`.
4. Click **Deploy**.

---

## 🔌 26. API Endpoints

### Authentication
* `POST /api/v1/auth/google` - Verifies Google OAuth token and logs user in.
* `POST /api/v1/auth/login` - Local username/password fallback login.

### Search & FTO Pipeline
* `POST /api/v1/search` - Start background molecule retrieval and report synthesis.
* `GET /api/v1/search` - Retrieve historical searches for the logged-in user.
* `GET /api/v1/search/{search_id}/status` - Poll current stage execution and progress percentage.
* `GET /api/v1/search/{search_id}` - Retrieve completed patentability reports and mapped citations.
* `POST /api/v1/search/{search_id}/chat` - Submit a conversational RAG question about the retrieved patent corpus.

### Cheminformatics
* `GET /api/v1/molecules/render-svg` - Generates clean vector SVG molecule drawings from SMILES query parameter.

---

## 🖼️ 27. Screenshots Placeholder
> *Add interactive dashboard and enterprise report preview screenshots here.*

---

## 👥 28. Contributors
* **Vahini Muttineni** - *Lead Software Engineer & Cheminformatics Architect*

---

## 📄 29. License
Distributed under the **MIT License**. See `LICENSE` for more information.
