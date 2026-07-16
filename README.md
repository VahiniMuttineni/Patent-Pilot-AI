# 🧬 PatentPilot AI

> Automated Chemical Patentability Analysis, Prior Art Discovery & Markush Structure Overlap Engine.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![RDKit](https://img.shields.io/badge/RDKit-Chemical_Informatics-green?style=flat-square)](https://www.rdkit.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.0-8E75B2?style=flat-square&logo=google)](https://ai.google.dev/)

---

## 📌 Overview

**PatentPilot AI** bridges molecular chemistry and patent law. It allows pharmaceutical researchers, patent attorneys, and biotech founders to perform automated **Freedom-to-Operate (FTO)** evaluations, **Prior Art Discovery**, and **Markush Structure Overlap Analysis** in seconds.

---

## 🏗️ Overall Architecture

The application is structured as a modern decoupled SaaS platform, relying heavily on a Python asynchronous backend for scientific computing and a Next.js frontend for an interactive client workspace.

```mermaid
graph TD
    subgraph client ["Client Layer"]
        UI["Next.js 15 App Router<br/>Tailwind CSS & OKLCH Theme"]
    end

    subgraph gateway ["Backend API Gateway"]
        Router["FastAPI REST Endpoints"]
        Orchestrator["Search Orchestrator"]
        CompoundResolver["Compound Resolution Pipeline"]
    end

    subgraph engine ["Chemical & AI Core"]
        RDKit["RDKit Fingerprints & Descriptors"]
        NumPy["NumPy Cosine Similarity Matrix"]
        LLM["Google Gemini 2.0 Agent"]
    end

    subgraph external ["Public Data Providers"]
        PubChem["PubChem REST API"]
        ChEMBL["EBI ChEMBL API"]
        OpenAlex["OpenAlex Literature API"]
        GeminiEmbeddings["Gemini text-embedding-004"]
    end

    UI --> Router
    Router --> Orchestrator
    Orchestrator --> CompoundResolver
    CompoundResolver --> RDKit
    CompoundResolver --> PubChem
    CompoundResolver --> ChEMBL
    Orchestrator --> OpenAlex
    Orchestrator --> NumPy
    NumPy --> GeminiEmbeddings
    Orchestrator --> LLM
```

---

## 🎯 Retrieval Strategy

PatentPilot AI employs a hybrid retrieval pipeline to fetch and rank the most relevant prior art for a given chemical structure. 

1. **Deterministic Resolution**: Before any retrieval happens, the system resolves the input SMILES string against PubChem, ChemSpider, and ChEMBL to identify the canonical compound name (e.g., "Aspirin" instead of just SMILES).
2. **Broad Literature Search**: The system concurrently queries OpenAlex (`language:en` filtered) and NCBI PubMed using the resolved compound name and target disease.
3. **Exact Structural Similarity (Tanimoto)**: ECFP4 Morgan Fingerprints are generated using RDKit to find exact or highly similar sub-structures.
4. **Semantic Embedding Retrieval**: Patent abstracts and claims are vectorized via Google Gemini's `text-embedding-004` API.
5. **In-Memory Cosine Similarity Ranking**: A localized NumPy matrix computes the cosine similarity between the input's embedding and the retrieved literature embeddings to rank the top $K$ most relevant prior art documents.

---

## 🤖 AI Workflow

Once the top $K$ patents are retrieved, the system triggers a **Multi-Agent RAG (Retrieval-Augmented Generation) Workflow** powered by Google Gemini 2.0:

1. **Individual Patent Analysis**: The AI independently evaluates each retrieved patent, extracting Markush structures and explicitly mapping potential claim overlaps.
2. **Infringement Scoring**: The AI assigns a mathematically weighted "Confidence Score" and a categorical "Risk Level" (LOW, MEDIUM, HIGH) to each patent.
3. **Executive Synthesis**: A final synthesis prompt consumes all individual analyses to generate an overarching "Freedom-to-Operate" executive report, highlighting novelty concerns and providing a final legal recommendation.

---

## 🛠️ Technologies Used

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15.5, React 19, Tailwind CSS | Fast SSR performance, interactive workspace layout |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2.0 | High-concurrency async REST gateway & background pipelines |
| **Cheminformatics** | RDKit (C++ wrappers) | Deterministic SMILES canonicalization & exact structural drawing |
| **Vector Search** | NumPy Matrix Math | Zero-memory overhead in-memory dense vector indexing |
| **Embeddings** | Gemini `text-embedding-004` | Cloud-offloaded embeddings to save server RAM |
| **AI Agent** | Gemini `gemini-2.0-flash` | Automated report generation & conversational RAG |
| **Persistence** | PostgreSQL & Redis | Relational storage with cascade deletion & API caching |

---

## ⚖️ Assumptions Made

1. **Input Validity**: The system assumes the user inputs a valid SMILES string.
2. **Sufficient Public Data**: The FTO analysis relies heavily on the presence of the molecule in public databases (OpenAlex/PubChem) to bootstrap the search process.
3. **English-Only Prior Art**: Currently, the system primarily filters and evaluates English-language patents and literature to ensure maximum accuracy from the LLM.
4. **Display Priority**: Verified compound names (PubChem Title, IUPAC) take 100% priority in the UI over structural fallback descriptions.

---

## 📉 Trade-offs

1. **NumPy vs Dedicated Vector DB (FAISS/Pinecone)**: 
   - *Trade-off*: We intentionally ripped out FAISS and local `sentence-transformers` in favor of NumPy and Cloud Embeddings.
   - *Why*: This drastically reduced the backend Docker container size by over 1GB and saved ~300MB of RAM, allowing the heavy scientific application to fit cleanly into Free Tier cloud deployments (like Render's 512MB RAM limit). The trade-off is a slight increase in network latency for embeddings, which is negligible for small-batch FTO searches.
2. **Asynchronous RDKit Rendering**:
   - *Trade-off*: Molecule SVGs are generated dynamically via backend endpoints rather than shipping a heavy WASM RDKit module to the frontend. This keeps the initial page load time blazing fast but requires a persistent network connection for image generation.

---

## 🚀 Future Improvements

1. **PDF Parsing Support**: Allow users to directly upload existing patent PDFs to extract and run FTO analysis on non-indexed patents.
2. **Multi-Lingual Prior Art**: Integrate Google Translate APIs to evaluate Chinese and European patents concurrently.
3. **Pinecone/Milvus Integration**: If the application scales to scanning millions of chemical sub-structures, migrate the local NumPy matrix to a distributed Vector DB.
4. **Interactive Markush Builder**: Provide a frontend canvas where chemists can draw structures manually instead of requiring raw SMILES strings.

---

## 💻 Instructions for Running the Project Locally

### Prerequisites
* **Node.js** `>= 18.x`
* **Python** `>= 3.11`
* **PostgreSQL** (running on port 5432)
* **Redis** (running on port 6379)

### 1. Environment Configuration

Create `backend/.env`:
```env
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/patentpilot
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
SECRET_KEY=your_random_secure_string_here
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 2. Launch Backend (FastAPI — Port 8000)
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Database Migrations
alembic upgrade head

# Start Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Launch Frontend (Next.js 15 — Port 3000)
```bash
cd frontend

# Install packages
npm install

# Start Development Server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

### Verification Targets

Test identity resolution and FTO execution locally with:
* **Aspirin**: `CC(=O)Oc1ccccc1C(=O)O` (PubChem CID 2244)
* **Ibuprofen**: `CC(C)Cc1ccc(C(C)C(=O)O)cc1` (PubChem CID 3672)
* **Paracetamol**: `CC(=O)Nc1ccc(O)cc1` (PubChem CID 1983)
