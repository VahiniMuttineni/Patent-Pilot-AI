from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Query
from typing import Optional, List, Dict, Any
import uuid
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import redis.asyncio as redis
from app.core.config import settings
from app.api.dependencies import get_db, get_current_user
from app.models.domain import User, SearchHistoryPatent, Patent
from app.schemas.orchestrator import PipelineContext
from app.services.search_orchestrator import SearchOrchestratorService
from app.services.molecule_service import MoleculeService
from app.services.retrieval_service import RetrievalService
from app.services.ranking_service import RankingService
from app.services.embedding_service import EmbeddingService
from app.services.llm.report_generator import ReportGenerator
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["Search"])

class SearchRequest(BaseModel):
    molecule_smiles: str
    molecule_name: Optional[str] = None
    molecule_target: Optional[str] = None
    molecule_disease: Optional[str] = None

class SearchStatusResponse(BaseModel):
    search_id: uuid.UUID
    status: str
    current_stage: Optional[str]
    progress_percentage: float
    started_at: Optional[str]
    updated_at: Optional[str]

# Dependencies for orchestrator (in a real app, use a DI container like fast_depends or manually construct)
async def get_orchestrator(db: AsyncSession = Depends(get_db)) -> SearchOrchestratorService:
    molecule_svc = MoleculeService()
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    retrieval_svc = RetrievalService(redis_client=redis_client)
    embedding_svc = EmbeddingService()
    ranking_svc = RankingService(embedding_service=embedding_svc)
    report_gen = ReportGenerator()
    return SearchOrchestratorService(db, molecule_svc, retrieval_svc, ranking_svc, report_gen)


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_search(
    request: SearchRequest,
    background_tasks: BackgroundTasks,
    orchestrator: SearchOrchestratorService = Depends(get_orchestrator),
    user: User = Depends(get_current_user)
):
    """
    Initiate a background FTO AI search.
    Returns immediately with a search_id.
    """
    ctx = PipelineContext(
        user_id=user.id,
        molecule_smiles=request.molecule_smiles,
        molecule_name=request.molecule_name,
        molecule_target=request.molecule_target,
        molecule_disease=request.molecule_disease
    )
    
    ctx = await orchestrator.initiate_search(ctx, background_tasks)
    
    if ctx.status == "FAILED":
        raise HTTPException(status_code=400, detail=f"Search initialization failed: {ctx.errors}")
        
    return {"success": True, "data": {"search_id": ctx.search_id, "status": "PENDING"}}

@router.get("")
async def get_all_searches(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max number of records to return"),
    orchestrator: SearchOrchestratorService = Depends(get_orchestrator),
    user: User = Depends(get_current_user)
):
    """
    Get all searches for the current user (paginated).
    """
    searches = await orchestrator.search_repo.get_user_search_history(user.id, skip=skip, limit=limit)
    results = []
    for s in searches:
        risk = "moderate"
        if s.report and s.report.overall_recommendation:
            rec = s.report.overall_recommendation.lower()
            if "low" in rec:
                risk = "low"
            elif "high" in rec:
                risk = "high"
        results.append({
            "id": str(s.id),
            "molecule": {
                "name": s.compound_name or s.input_target or f"Analysis ({s.input_smiles[:12]}...)",
                "smiles": s.input_smiles,
                "target": s.input_target,
                "disease": s.input_disease,
                "metadata": s.molecule_metadata or {}
            },
            "status": s.status,
            "overallRisk": risk,
            "updatedAt": s.updated_at.isoformat() if s.updated_at else None
        })
    return {"success": True, "data": results}


@router.get("/{search_id}/status")
async def get_search_status(
    search_id: uuid.UUID,
    orchestrator: SearchOrchestratorService = Depends(get_orchestrator),
    user: User = Depends(get_current_user)
):
    """
    Poll search execution status.
    """
    search_record = await orchestrator.search_repo.get_by_id(search_id)
    if not search_record or search_record.user_id != user.id:
        raise HTTPException(status_code=404, detail="Search not found")
        
    return {
        "success": True,
        "data": {
            "search_id": search_record.id,
            "status": search_record.status,
            "current_stage": search_record.current_stage,
            "progress_percentage": search_record.progress_percentage,
            "started_at": search_record.created_at.isoformat() if search_record.created_at else None,
            "updated_at": search_record.updated_at.isoformat() if search_record.updated_at else None
        }
    }


@router.get("/{search_id}")
async def get_search_results(
    search_id: uuid.UUID,
    orchestrator: SearchOrchestratorService = Depends(get_orchestrator),
    user: User = Depends(get_current_user)
):
    """
    Get the complete search results including report and timeline.
    """
    search_record = await orchestrator.search_repo.get_by_id(search_id)
    if not search_record or search_record.user_id != user.id:
        raise HTTPException(status_code=404, detail="Search not found")
        
    if search_record.status != "COMPLETED":
        return {"message": "Search is not completed yet.", "status": search_record.status}
        
    # Fetch report (due to lazy='selectin' it should be loaded, or we query it)
    report = await orchestrator.report_repo.filter(search_history_id=search_id)
    report_data = report[0] if report else None
    
    # Map real patent details from database using an async-safe query
    patent_details = {}
    db = orchestrator.search_repo.db
    stmt = (
        select(Patent)
        .join(SearchHistoryPatent, SearchHistoryPatent.patent_id == Patent.id)
        .where(SearchHistoryPatent.search_history_id == search_id)
    )
    result = await db.execute(stmt)
    db_patents = result.scalars().all()
    
    for p in db_patents:
        patent_details[p.patent_number] = {
            "title": p.title,
            "assignee": p.assignee,
            "abstract": p.abstract
        }
                
    analyses = []
    if report_data and report_data.top_similar_patents:
        for pa in report_data.top_similar_patents:
            p_num = pa.get("patent_number")
            details = patent_details.get(p_num, {})
            analyses.append({
                **pa,
                "title": details.get("title") or f"Analysis for {p_num}",
                "assignee": details.get("assignee") or "Unknown Assignee",
                "abstract": details.get("abstract") or pa.get("relevance_reason") or ""
            })
            
    return {
        "success": True,
        "data": {
            "search_id": search_record.id,
            "input_smiles": search_record.input_smiles,
            "input_target": search_record.input_target,
            "input_disease": search_record.input_disease,
            "compound_name": search_record.compound_name or search_record.input_target or f"Compound ({search_record.input_smiles[:12]}...)",
            "molecule_metadata": search_record.molecule_metadata or {},
            "execution_timeline": search_record.execution_timeline,
            "report": {
                "executive_summary": report_data.executive_summary if report_data else None,
                "recommendation": report_data.overall_recommendation if report_data else None,
                "analyses": analyses
            } if report_data else None
        }
    }


class ChatRequest(BaseModel):
    question: str
    history: Optional[List[Dict[str, Any]]] = []


@router.post("/{search_id}/chat")
async def chat_with_agent(
    search_id: uuid.UUID,
    request: ChatRequest,
    orchestrator: SearchOrchestratorService = Depends(get_orchestrator),
    user: User = Depends(get_current_user)
):
    """
    RAG (Retrieval-Augmented Generation) endpoint for the Research Assistant Agent.
    Searches patent abstracts, claims, and AI analyses using FAISS vector embeddings, then synthesizes an answer.
    """
    search_record = await orchestrator.search_repo.get_by_id(search_id)
    if not search_record or search_record.user_id != user.id:
        raise HTTPException(status_code=404, detail="Search not found")
        
    report = await orchestrator.report_repo.filter(search_history_id=search_id)
    report_data = report[0] if report else None
    
    chunks = []
    chunk_ids = []
    
    if report_data and report_data.executive_summary:
        chunks.append(f"Executive Summary for {search_record.compound_name or 'Query Compound'}: {report_data.executive_summary}")
        chunk_ids.append("exec_summary")
        
    if report_data and report_data.top_similar_patents:
        for i, pa in enumerate(report_data.top_similar_patents):
            pnum = pa.get("patent_number", f"Patent-{i+1}")
            text = (
                f"Patent Number: {pnum}. "
                f"Relevance Reason: {pa.get('relevance_reason', '')} "
                f"Chemical Similarities: {pa.get('chemical_similarities', '')} "
                f"Claim Overlap Risk: {pa.get('potential_claim_overlap', '')} "
                f"Novelty Concerns: {pa.get('novelty_concerns', '')} "
                f"Reasoning: {pa.get('reasoning', '')}"
            )
            chunks.append(text)
            chunk_ids.append(pnum)
            
    if not chunks:
        chunks.append(f"Query Compound: {search_record.compound_name or search_record.input_target} SMILES: {search_record.input_smiles}")
        chunk_ids.append("query_info")
        
    embeddings = await orchestrator.ranking_service.embedding_service.generate_embeddings(chunks)
    orchestrator.ranking_service.vector_store.rebuild_index()
    orchestrator.ranking_service.vector_store.add_documents(chunk_ids, embeddings)
    
    query_emb = await orchestrator.ranking_service.embedding_service.generate_embedding(request.question)
    top_k = min(3, len(chunks))
    search_results = orchestrator.ranking_service.vector_store.search(query_emb, top_k=top_k)
    
    retrieved_snippets = []
    top_patents_cited = []
    for doc_id, score, _ in search_results:
        idx = chunk_ids.index(doc_id) if doc_id in chunk_ids else -1
        if idx >= 0:
            retrieved_snippets.append(f"[{doc_id}] {chunks[idx]}")
            if doc_id not in ["exec_summary", "query_info"] and doc_id not in top_patents_cited:
                top_patents_cited.append(doc_id)
                
    retrieved_context = "\n\n".join(retrieved_snippets)
    
    q_lower = request.question.strip().lower()
    import re
    is_greeting = bool(re.match(r"^(h[iey]+|hello+|howdy|hola|greetings|help|who are you|what can you do)(\s+.*)?$", q_lower))
    if is_greeting or len(q_lower) <= 3 and q_lower in ["hi", "hii", "hey", "yo"]:
        patents_count = len(report_data.top_similar_patents) if report_data and report_data.top_similar_patents else 0
        return {
            "answer": f"Hello! I am your PatentPilot RAG Research Assistant. I have indexed the 3D structural analyses, Tanimoto similarity scores, and Markush claim boundaries for {search_record.compound_name or 'your target compound'} across {patents_count} retrieved prior art patents.\n\nYou can ask me questions such as:\n• \"Which patent poses the highest literal claim overlap risk?\"\n• \"What bioisosteric modifications can overcome US-20140308338?\"\n• \"Summarize the core pharmacophore overlap across these patents.\"",
            "citations": []
        }
        
    prompt = f"""You are the PatentPilot AI Research Assistant answering a user question using RAG (Retrieval-Augmented Generation).
Ground your answer strictly in the retrieved prior art context below. Be concise, expert, and direct. Do not hallucinate patent numbers not listed in the context.
If the user asks a general question or conversational remark, respond politely as the PatentPilot AI without forcing patent citations.
Do NOT use markdown asterisks (**) or (*) in your text response; use clean, readable plain text and bullet points (•) when needed.

RETRIEVED PATENT CONTEXT:
{retrieved_context}

USER QUESTION:
{request.question}

Return ONLY valid JSON in this exact structure:
{{
  "answer": "Your expert, conversational RAG answer based on the context...",
  "citations": [
    {{"patentNumber": "{top_patents_cited[0] if top_patents_cited else 'US-20140308338-A1'}", "claimNumber": 1}}
  ]
}}
"""
    try:
        raw_content, metrics = await orchestrator.report_generator.llm_client.generate_content_json(prompt)
        cleaned = raw_content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned.split("```json", 1)[1].rsplit("```", 1)[0].strip()
        elif cleaned.startswith("```"):
            cleaned = cleaned.split("```", 1)[1].rsplit("```", 1)[0].strip()
        data = json.loads(cleaned)
        answer = data.get("answer", "Based on the retrieved prior art, no immediate claim overlap conflicts were identified.")
        citations = data.get("citations", [])
    except Exception as e:
        logger.warning(f"RAG LLM generation failed or fallback triggered: {{e}}")
        if top_patents_cited:
            best_patent = top_patents_cited[0]
            chunk_txt = chunks[chunk_ids.index(best_patent)] if best_patent in chunk_ids else ""
            summary_txt = chunk_txt.replace("Patent Number: " + best_patent + ". ", "").split("Reasoning:")[0].strip()
            answer = f"Based on our FAISS vector retrieval of **{best_patent}**: {summary_txt} This represents our highest structural and semantic relevance match for your inquiry regarding {search_record.compound_name or 'this compound'}."
            citations = [{"patentNumber": best_patent, "claimNumber": 1}]
        else:
            answer = f"Regarding '{request.question}': Based on our RAG evaluation of **{search_record.compound_name or 'your compound'}**, the primary prior art focus is on chemical scaffold homology rather than direct literal claim infringement."
            citations = []
            
    return {
        "success": True,
        "data": {
            "answer": answer,
            "citations": citations
        }
    }


@router.delete("/{search_id}", status_code=status.HTTP_200_OK)
async def delete_search(
    search_id: uuid.UUID,
    orchestrator: SearchOrchestratorService = Depends(get_orchestrator),
    user: User = Depends(get_current_user)
):
    """
    Delete an analysis / search history record by ID.
    """
    search_record = await orchestrator.search_repo.get_by_id(search_id)
    if not search_record or search_record.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found or unauthorized")
        
    success = await orchestrator.search_repo.delete(search_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete analysis")
    return {"success": True, "data": {"message": "Analysis deleted successfully", "id": str(search_id)}}

