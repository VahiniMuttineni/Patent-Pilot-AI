from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

class PatentAnalysis(BaseModel):
    patent_number: str = Field(..., description="The unified patent number or ID.")
    markush_smiles: Optional[str] = Field(None, description="The Markush or claim structure SMILES for this patent.")
    relevance_reason: str = Field(..., description="Why this patent was retrieved.")
    chemical_similarities: str = Field(..., description="Details on chemical structural similarities.")
    novelty_concerns: str = Field(..., description="Specific novelty concerns compared to the query molecule.")
    potential_claim_overlap: str = Field(..., description="Analysis of potential claim overlap.")
    confidence: float = Field(..., description="AI confidence score for this analysis (0.0 to 1.0).")
    risk_level: str = Field(..., description="Risk level: Low, Medium, or High.")
    reasoning: str = Field(..., description="Detailed grounding evidence for these claims.")

class PatentabilityReportSchema(BaseModel):
    executive_summary: str = Field(..., description="High-level executive summary of the FTO analysis.")
    patent_analyses: List[PatentAnalysis] = Field(..., description="Detailed analysis of each provided top-ranked patent.")
    overall_novelty_concerns: str = Field(..., description="Overall assessment of novelty concerns across all patents.")
    patents_requiring_manual_review: List[str] = Field(..., description="List of patent numbers requiring human legal review.")
    recommendation: str = Field(..., description="Overall FTO recommendation. MUST strictly be one of: 'Low Patent Risk', 'Requires Expert Review', or 'High Patent Risk'.")
    overall_confidence: float = Field(..., description="Overall AI confidence in the report (0.0 to 1.0).")
    reasoning: str = Field(..., description="Supporting reasoning for the final recommendation.")
    
    model_config = ConfigDict(from_attributes=True)
