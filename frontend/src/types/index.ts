export type RiskLevel = "low" | "moderate" | "high";
export type ConfidenceBand = "low" | "medium" | "high";
export type ReviewStatus = "unreviewed" | "approved" | "disputed";
export type AnalysisStatus = "draft" | "retrieving" | "analyzing" | "ready" | "reported";

export interface Molecule {
  smiles: string;
  name?: string;
  metadata?: any;
}

export interface PatentSource {
  name: "SureChEMBL" | "PubChem" | "Google Patents";
}

export interface Patent {
  id: string;
  title: string;
  patentNumber: string;
  publicationDate: string;
  assignee: string;
  abstract: string;
  source: PatentSource["name"];
  similarityScore: number; // 0-100
  riskLevel: RiskLevel;
  confidence: ConfidenceBand;
  status: ReviewStatus;
  jurisdiction: string;
  aiRationale: string;
  similarRegions: string[];
  noveltyConcerns: string[];
  claims: { number: number; text: string; matchedSubstring?: string }[];
}

export interface Analysis {
  id: string;
  molecule: Molecule;
  createdAt: string;
  updatedAt: string;
  status: AnalysisStatus;
  overallRisk?: RiskLevel;
  patents: Patent[];
  notes?: string;
}

export interface ActivityItem {
  id: string;
  type: "created" | "approved" | "disputed" | "reported" | "note";
  message: string;
  timestamp: string;
}

export interface ChatCitation {
  patentId: string;
  patentNumber: string;
  claimNumber?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
}
