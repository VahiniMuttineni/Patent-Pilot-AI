# 🧬 PatentPilot AI

> Automated Chemical Patentability Analysis, Prior Art Discovery & Markush Structure Overlap Engine.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![RDKit](https://img.shields.io/badge/RDKit-Chemical_Informatics-green?style=flat-square)](https://www.rdkit.org/)
[![FAISS](https://img.shields.io/badge/FAISS-Vector_Search-blue?style=flat-square)](https://github.com/facebookresearch/faiss)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.0-8E75B2?style=flat-square&logo=google)](https://ai.google.dev/)

---

## 📌 Overview

**PatentPilot AI** bridges molecular chemistry and patent law. It allows pharmaceutical researchers, patent attorneys, and biotech founders to perform automated **Freedom-to-Operate (FTO)** evaluations, **Prior Art Discovery**, and **Markush Structure Overlap Analysis** in seconds.

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph client ["Client Layer"]
        UI["Next.js 15 App Router<br/>Tailwind CSS & OKLCH Theme"]
    end

    subgraph gateway ["Backend API Gateway"]
        Router["FastAPI REST & RAG Endpoints"]
        Orchestrator["Search Orchestrator"]
        CompoundResolver["Compound Resolution Pipeline"]
    end

    subgraph engine ["Chemical & AI Core"]
        RDKit["RDKit Fingerprints & Descriptors"]
        FAISS["FAISS Dense Vector Index"]
        LLM["Google Gemini 2.0 Agent"]
    end

    subgraph external ["Public Data Providers"]
        PubChem["PubChem REST API"]
        ChEMBL["EBI ChEMBL API"]
        OpenAlex["OpenAlex Literature API"]
    end

    UI --> Router
    Router --> Orchestrator
    Orchestrator --> CompoundResolver
    CompoundResolver --> RDKit
    CompoundResolver --> PubChem
    CompoundResolver --> ChEMBL
    Orchestrator --> OpenAlex
    Orchestrator --> FAISS
    FAISS --> LLM
```

---

## 🔬 Compound Resolution Pipeline

A 5-step deterministic resolution pipeline resolves molecule identities from public databases before resorting to structural fallback descriptions:

$$\text{SMILES Input} \longrightarrow \text{RDKit Canonicalization} \longrightarrow \text{PubChem} \longrightarrow \text{ChemSpider} \longrightarrow \text{ChEMBL} \longrightarrow \text{RDKit Fallback}$$

### Resolution Confidence Matrix

* **100% — Multi-Database Verified**: Verified by PubChem + ChemSpider + ChEMBL
* **95% — PubChem Verified**: Primary public database match (e.g. Aspirin, CID 2244)
* **90% — Specialized DB Match**: ChemSpider + ChEMBL cross-verification
* **80% — ChEMBL Match**: Verified bioactivity database record
* **40% — Structural Fallback**: RDKit structural functional group classification (used strictly when unindexed)

---

## 🎯 Retrieval & AI Workflow

1. **ECFP4 Morgan Fingerprint Similarity**: Calculates exact Tanimoto similarity metrics using RDKit ($0.0 - 1.0$).
2. **Dense Vector Search**: Encodes patent claims into dense vector embeddings indexed with FAISS.
3. **Scientific Literature Integration**: Queries OpenAlex (`language:en` filtered) and NCBI PubMed for recent prior art.
4. **Markush Overlap & Report Synthesis**: Google Gemini 2.0 multi-agent engine evaluates R-group claim boundaries and synthesizes executive FTO reports.

---

## 🛠️ Technology Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15.5, React 19, Tailwind CSS | Fast SSR performance, interactive workspace layout |
| **Backend** | Python 3.13, FastAPI, SQLAlchemy 2.0 | High-concurrency async REST gateway & background pipelines |
| **Cheminformatics** | RDKit (C++ wrappers) | Deterministic SMILES canonicalization & ECFP4 fingerprinting |
| **Vector Search** | FAISS (Facebook Research) | Low-latency in-memory dense vector indexing |
| **AI Agent** | Google Gemini 2.0 | Automated report generation & conversational RAG |
| **Persistence** | PostgreSQL & Redis | Relational storage with cascade deletion & literature API caching |

---

## ⚖️ Assumptions & Trade-Offs

* **Display Priority Rule**: Verified compound names (PubChem Title, IUPAC) take 100% priority. Fallback descriptions (e.g. *"Aromatic Carboxylic Compound"*) are strictly hidden when a database match exists.
* **In-Memory FAISS vs Cloud Vector DB**: Uses local FAISS vector store for zero-cost, sub-millisecond local queries.
* **Offline Caching**: Built-in zero-latency lookup for major pharmaceuticals (Aspirin, Ibuprofen, Paracetamol, Metformin, Imatinib, etc.).

---

## 🚀 Local Setup Guide

### Prerequisites
* **Node.js** `>= 18.x`
* **Python** `>= 3.11`
* **PostgreSQL** & **Redis**

### 1. Environment Configuration

Create `backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/patentpilot
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
SECRET_KEY=your_secret_key_here
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 2. Launch Backend (FastAPI — Port 8000)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Launch Frontend (Next.js 15 — Port 3000)
```bash
cd frontend
npm install
npm run dev
```

---

### Verification Targets

Test identity resolution and FTO execution with:
* **Aspirin**: `CC(=O)Oc1ccccc1C(=O)O` (PubChem CID 2244)
* **Ibuprofen**: `CC(C)Cc1ccc(C(C)C(=O)O)cc1` (PubChem CID 3672)
* **Paracetamol**: `CC(=O)Nc1ccc(O)cc1` (PubChem CID 1983)
* **Metformin**: `CN(C)C(=N)NC(=N)N` (PubChem CID 4091)
* **Caffeine**: `CN1C=NC2=C1C(=O)N(C(=O)N2C)C` (PubChem CID 2519)
