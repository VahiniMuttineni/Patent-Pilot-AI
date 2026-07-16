<div align="center">

# 🧬 PatentPilot AI — Enterprise Freedom-to-Operate (FTO) & Chemical Intelligence Engine

**Next-Generation AI Agent Platform for Automated Chemical Patentability Analysis, Prior Art Discovery & Markush Structure Overlap Assessment.**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![RDKit](https://img.shields.io/badge/RDKit-2023.09-green?style=for-the-badge)](https://www.rdkit.org/)
[![FAISS](https://img.shields.io/badge/FAISS-Vector_Search-blue?style=for-the-badge)](https://github.com/facebookresearch/faiss)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.0-8E75B2?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

</div>

## 📌 Executive Summary

**PatentPilot AI** bridges molecular chemistry and patent law. It allows pharmaceutical researchers, patent attorneys, and biotech founders to perform automated **Freedom-to-Operate (FTO)** evaluations, **Prior Art Discovery**, and **Markush Structure Overlap Analysis** in seconds.

By combining **RDKit chemical informatics**, public molecular databases (**PubChem, ChEMBL, ChemSpider, OpenAlex, PubMed**), **FAISS vector similarity retrieval**, and **Google Gemini multi-agent synthesis**, PatentPilot AI eliminates hundreds of hours of manual patent landscape searching.

---

## 🏗️ Overall System Architecture

```mermaid
graph TD
    subgraph Client Layer
        UI["Next.js 15 App Router<br/>(Tailwind CSS, OKLCH Design System, Framer Motion)"]
    end

    subgraph Backend API Gateway (FastAPI Async)
        Router["REST / RAG SSE Endpoints"]
        Orchestrator["Search Orchestrator Engine"]
        CompoundResolver["Deterministic Compound Resolution Pipeline"]
    end

    subgraph Chemical Informatics Engine
        RDKit["RDKit Core<br/>(ECFP4 Morgan Fingerprints, LogP, TPSA, Lipinski)"]
    end

    subgraph Public Molecular & Literature Data
        PubChem["PubChem PUG REST API"]
        ChEMBL["EBI ChEMBL API"]
        ChemSpider["RSC / ChemSpider ID"]
        OpenAlex["OpenAlex Research API"]
        PubMed["NCBI PubMed API"]
    end

    subgraph AI Vector & Synthesis Layer
        FAISS["FAISS Dense Vector Store"]
        Embeddings["Embedding Service"]
        LLM["Google Gemini 2.0 Multi-Agent RAG"]
    end

    subgraph Persistence Layer
        DB[(PostgreSQL Database)]
        Cache[(Redis Response Cache)]
    end

    UI --> Router
    Router --> Orchestrator
    Orchestrator --> CompoundResolver
    CompoundResolver --> RDKit
    CompoundResolver --> PubChem
    CompoundResolver --> ChEMBL
    CompoundResolver --> ChemSpider
    Orchestrator --> OpenAlex
    Orchestrator --> PubMed
    Orchestrator --> Embeddings
    Embeddings --> FAISS
    FAISS --> LLM
    Orchestrator --> LLM
    Orchestrator --> DB
    Orchestrator --> Cache
```

---

## 🔬 Deterministic Compound Resolution Pipeline

PatentPilot AI enforces a **strict deterministic compound identity pipeline** prior to generating AI analysis or structural descriptors:

```
SMILES Input ➔ RDKit Canonicalization ➔ PubChem ➔ ChemSpider ➔ ChEMBL ➔ RDKit Fallback
```

### Resolution Execution Steps

1. **Step 1 — RDKit Canonicalization**:
   - Parses SMILES, generating **Canonical SMILES**, **Isomeric SMILES**, **InChI**, **InChIKey**, **Formula**, **Exact Mass**, **MW**, **LogP**, **TPSA**, **HBD**, **HBA**, **Rotatable Bonds**, **Heavy Atom Count**, and **Ring Count**.
   - If canonicalization fails, execution halts immediately with an HTTP 400 validation error.
2. **Step 2 — PubChem Query**:
   - Queries PubChem PUG REST API by Canonical SMILES for **Preferred Title**, **IUPAC Name**, **CID**, **Synonyms**, and **Registry XRefs**.
3. **Step 3 — ChemSpider Query**:
   - Resolves **ChemSpider ID** and common synonyms.
4. **Step 4 — ChEMBL Query**:
   - Resolves **ChEMBL ID**, **Molecule Type**, and biological targets.
5. **Step 5 — RDKit Structural Fallback**:
   - **ONLY** if all public databases fail to index the molecule, generates a structural description (e.g. *"Aromatic Carboxylic Compound"*).

### Deterministic Confidence Matrix

| Confidence | Verification Level | Provider Sources |
| :--- | :--- | :--- |
| **100%** | Multi-Database Cross-Verified | PubChem + ChemSpider + ChEMBL |
| **95%** | Primary Provider Verified | PubChem |
| **90%** | Specialized Verified | ChemSpider + ChEMBL |
| **80%** | Biological Verified | ChEMBL Only |
| **40%** | Structural Fallback Only | RDKit Pharmacophore Classification |

---

## 🎯 Retrieval Strategy & Multi-Stage Ranking

PatentPilot AI implements a **hybrid multi-stage retrieval architecture** combining exact chemical fingerprint similarity, semantic vector embeddings, and live scientific literature:

```
                          [ Input Query / SMILES ]
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
  ┌─────────────┐             ┌─────────────┐             ┌─────────────┐
  │ RDKit ECFP4 │             │ FAISS Vector│             │  Literature │
  │ Fingerprint │             │ Embedding   │             │ OpenAlex /  │
  │ Similarity  │             │  Search     │             │   PubMed    │
  └──────┬──────┘             └──────┬──────┘             └──────┬──────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     ▼
                      ┌─────────────────────────────┐
                      │  Explainable Score Fusion   │
                      │  (Tanimoto + Dense + Risk)  │
                      └──────────────┬──────────────┘
                                     ▼
                      ┌─────────────────────────────┐
                      │    Top Ranked Prior Art     │
                      └─────────────────────────────┘
```

1. **RDKit ECFP4 Tanimoto Similarity**:
   - Computes 2048-bit Morgan Fingerprints (radius 2) for both input SMILES and patent Markush structures.
   - Calculates exact Tanimoto similarity metrics ($0.0 - 1.0$).
2. **Dense Vector Embeddings & FAISS Search**:
   - Encodes patent claims, abstracts, and prior art into high-dimensional embeddings using sentence transformers.
   - Executes $O(\log N)$ fast nearest-neighbor lookups in a FAISS index.
3. **Scientific Literature API Integration**:
   - Queries OpenAlex (`language:en` filtered) and NCBI PubMed for recent peer-reviewed articles, non-patent prior art (NPL), and clinical trial disclosures.
4. **Explainable Ranking Engine**:
   - Blends chemical structural similarity ($40\%$), semantic claim overlap ($40\%$), and legal risk factors ($20\%$) into an explainable composite risk score (`LOW`, `MODERATE`, `HIGH`).

---

## 🤖 AI Workflow & RAG Architecture

### Multi-Agent Synthesis Pipeline

```
Raw Patents & Papers ➔ Markush Boundary Parsing ➔ Claim Overlap Evaluator ➔ FTO Executive Report
```

- **Markush Claim Boundary Evaluator**: Inspects R-group generic structures in patent claims to detect literal or Doctrine of Equivalents infringement.
- **FTO Executive Synthesizer**: Generates executive summaries, patent risk matrices, bioisosteric workaround suggestions, and clearance recommendations using **Google Gemini 2.0**.
- **Interactive RAG Research Assistant**: Real-time vector-backed QA interface allowing researchers to query structural overlaps, claim numbers, and clearance workarounds with precise citations.

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15.5 (App Router)** | React 19, Turbopack, SSR, Dynamic Routing |
| **Styling & UI** | **Vanilla CSS + OKLCH Variables** | Custom Design System, Modern Glassmorphism, Dual Theme (Dark Obsidian / Clean Light) |
| **State & Query** | **TanStack React Query v5** | Server State Caching, Background Sync, Optimistic Updates |
| **Backend Framework** | **Python 3.13 + FastAPI** | Asynchronous OpenAPI Gateway, Background Tasks, Pydantic v2 |
| **Chemical Informatics** | **RDKit (C++ Wrappers)** | SMILES Validation, ECFP4 Fingerprinting, Physicochemical Descriptors |
| **Vector Index** | **FAISS (Facebook AI)** | High-dimensional dense vector indexing and similarity search |
| **Database** | **PostgreSQL + SQLAlchemy 2.0** | Relational data persistence, Async ORM, Cascade Deletion |
| **Caching Layer** | **Redis** | High-speed response caching for external literature APIs |
| **AI Synthesis** | **Google Gemini 2.0 API** | LLM Report Generation, Markush Analysis & Conversational RAG |
| **External Providers** | **PubChem, ChEMBL, OpenAlex** | Real-time public compound and literature resolution |

---

## 📋 Assumptions Made

1. **Deterministic Priority Rule**: Verified public database names (PubChem Title, IUPAC Name) take absolute priority over fallback structural classifications. Structural fallback labels are strictly prohibited when a database match exists.
2. **SMILES Standard Form**: Input SMILES are canonicalized via RDKit before processing to handle tautomers and stereochemical representations consistently.
3. **Real-Time Data Availability**: External services (PubChem, OpenAlex) are treated as resilient REST APIs with automatic cross-reference fallbacks in case of timeout.

---

## ⚖️ Technical Trade-Offs

| Decision | Trade-Off | Rationale |
| :--- | :--- | :--- |
| **In-Memory FAISS Index vs Cloud Vector DB** | Local memory footprint vs zero cost & ultra-fast local latency | Provides instant local vector queries for prototyping and isolated deployments. |
| **OKLCH Theme System vs Tailwind Utility Classes** | Custom CSS variables vs out-of-the-box utility classes | Delivers pixel-perfect luxury aesthetics, dark mode switching, and smooth OKLCH color transitions. |
| **PubChem Rest PUG + Local Drug DB Fallback** | Sub-millisecond offline fallback vs API network roundtrips | Guarantees instant 100% availability for major pharmaceutical drugs (Aspirin, Ibuprofen, Paracetamol, Metformin, Imatinib, etc.). |

---

## 🚀 Future Improvements Roadmap

- [ ] **Capacitor Mobile Bundle Integration**: Native iOS and Android application build target using `@capacitor/core`.
- [ ] **3D Molecular Conformer Visualization**: Integration of 3Dmol.js for interactive energy-minimized conformer rendering.
- [ ] **USPTO & EPO Direct Bulk API Sync**: Real-time webhook integration with official patent office XML filings.
- [ ] **Distributed FAISS GPU Index**: Multi-GPU accelerated vector similarity searches for multi-million compound databases.

---

## 🛠️ Local Development & Running Guide

### Prerequisites

- **Node.js** `>= 18.x`
- **Python** `>= 3.11`
- **PostgreSQL** & **Redis** (Optional: dev server falls back gracefully if Redis is unavailable)

---

### Step 1 — Clone Repository & Setup Environment

```bash
git clone https://github.com/vahinimuttineni/patentpilot.git
cd patentpilot-frontend
```

#### Create Backend Environment File (`backend/.env`):

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/patentpilot
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
SECRET_KEY=your_secret_key_here
```

#### Create Frontend Environment File (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

---

### Step 2 — Backend Setup (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

*Backend server will run at: `http://localhost:8000` (Swagger docs available at `http://localhost:8000/docs`)*

---

### Step 3 — Frontend Setup (Next.js 15)

```bash
cd frontend
npm install
npm run dev
```

*Frontend application will run at: `http://localhost:3000`*

---

### Step 4 — Verification Checklist

Verify local functionality using the test molecules:

```bash
# Test Compound Resolution & FTO Execution
1. Aspirin      (CC(=O)Oc1ccccc1C(=O)O)       -> CID 2244
2. Ibuprofen    (CC(C)Cc1ccc(C(C)C(=O)O)cc1)  -> CID 3672
3. Paracetamol  (CC(=O)Nc1ccc(O)cc1)          -> CID 1983
4. Metformin    (CN(C)C(=N)NC(=N)N)            -> CID 4091
5. Caffeine     (CN1C=NC2=C1C(=O)N(C(=O)N2C)C) -> CID 2519
6. Imatinib     (Cc1ccc(NC(=O)...)            -> CID 5291
```

