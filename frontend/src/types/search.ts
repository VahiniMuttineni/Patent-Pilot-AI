export interface CreateSearchRequest {
  molecule_smiles: string;
  molecule_name?: string;
}

export interface CreateSearchResponse {
  search_id: string;
  status: string;
}

export interface SearchStatusResponse {
  search_id: string;
  status: string;
  current_stage: string | null;
  progress_percentage: number;
  started_at: string | null;
  updated_at: string | null;
}

export interface PatentAnalysis {
  patent_number: string;
  markush_smiles?: string;
  relevance_reason: string;
  chemical_similarities: string;
  novelty_concerns: string;
  potential_claim_overlap: string;
  confidence: number;
  risk_level: string;
  reasoning: string;
  title?: string;
  assignee?: string;
  abstract?: string;
}

export interface SearchReport {
  executive_summary: string;
  recommendation: string;
  analyses: PatentAnalysis[];
}

export interface ExecutionEvent {
  timestamp: string;
  stage: string;
  message: string;
  status?: string;
}

export interface MoleculeMetadata {
  canonical_smiles: string;
  compound_name?: string;
  molecular_formula: string;
  molecular_weight: number;
  num_atoms: number;
  num_bonds: number;
  heavy_atom_count: number;
  ring_count: number;
  logp?: number;
  tpsa?: number;
  num_hbd?: number;
  num_hba?: number;
  num_rotatable_bonds?: number;
  lipinski_violations?: number;
  lipinski_compliant?: boolean;
  pharmacophore_features?: string[];
  [key: string]: any;
}

export interface SearchResultResponse {
  search_id: string;
  input_smiles: string;
  compound_name?: string;
  molecule_metadata?: MoleculeMetadata;
  execution_timeline: ExecutionEvent[];
  report: SearchReport | null;
}
