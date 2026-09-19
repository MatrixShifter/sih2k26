export type UserRole = "bidder" | "officer";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  bidder_id: number | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  user: User;
}

export interface Bidder {
  id: number;
  legal_name: string;
  trade_name: string | null;
  registered_address: string;
  state: string;
  pincode: string;
  contact_email: string;
  contact_phone: string;
  director_name: string | null;
  annual_turnover_inr: string | number | null;
  years_experience: number | null;
  udyam_number: string | null;
  gstin: string | null;
  pan: string | null;
  cin: string | null;
  nsic_registration: string | null;
  dpiit_startup_number: string | null;
  epfo_code: string | null;
  esic_code: string | null;
  created_at: string;
}

export type DocumentType =
  | "udyam"
  | "gst"
  | "pan"
  | "mca21"
  | "epfo"
  | "esic"
  | "digilocker"
  | "nsic"
  | "startup_india"
  | "financial"
  | "experience"
  | "work_order"
  | "oem"
  | "technical";

export interface Requirement {
  id: number;
  requirement: string;
  title?: string | null;
  description?: string | null;
  category: string;
  mandatory: boolean;
  required_value?: string | null;
  comparison_operator?: string | null;
  weight?: number | null;
  threshold: number | null;
  currency: string | null;
  evidence_types: string[] | null;
  notes: string | null;
}

export interface Tender {
  id: number;
  gem_bid_number: string;
  title: string;
  department: string;
  category: string;
  estimated_value_inr: string | number;
  closing_date: string;
  description: string;
  requirements: Requirement[];
  created_at: string;
}

export interface DocumentRecord {
  id: number;
  bidder_id: number;
  bid_id: number;
  document_type: DocumentType;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  status: "uploaded" | "verified" | "failed";
  issued_name: string | null;
  expiry_date: string | null;
  expiry_state: string;
  integrity_status: string;
  sha256_hash?: string | null;
  version?: number;
  is_duplicate?: boolean;
  duplicate_of_doc_id?: number | null;
  validation_results?: {
    document_id: number;
    document_type: string;
    original_filename: string;
    status: "PASS" | "FAIL" | "NEEDS_REVIEW" | string;
    summary: string;
    confidence: number;
    rules_count: number;
    passed_rules_count: number;
    failed_rules_count: number;
    review_rules_count: number;
    rules_evaluated: Array<{
      rule: string;
      status: "PASS" | "FAIL" | "NEEDS_REVIEW" | string;
      extracted: string;
      expected: string;
      reason: string;
    }>;
    associated_requirement_ids?: number[];
    flags?: Array<{ severity: string; message: string }>;
    registry_verification_note?: string;
    simulated?: boolean;
  } | null;
  extracted_fields: Record<string, unknown> | null;
  uploaded_by_user_id: number;
  created_at: string;
}

export interface RequirementResult {
  requirement_id: number;
  requirement: string;
  requirement_text?: string;
  title?: string;
  description?: string | null;
  category: string;
  mandatory: boolean;
  required_evidence?: string;
  evidence: string;
  bidder_evidence?: string;
  verification_status?: string;
  extracted_values?: Record<string, unknown>;
  expected_values?: Record<string, unknown>;
  comparison_operator?: string;
  required_value?: string;
  extracted_value_display?: string;
  expected_value_display?: string;
  weight?: number;
  comparison_result?: "COMPLIANT" | "NON-COMPLIANT" | "MISSING" | "EXPIRED" | "MISMATCH" | "NEEDS REVIEW" | "PASS" | "FAIL" | "NEEDS_REVIEW" | "NOT_EVALUATED" | string;
  status: "COMPLIANT" | "NON-COMPLIANT" | "MISSING" | "EXPIRED" | "MISMATCH" | "NEEDS REVIEW" | "PASS" | "FAIL" | "NEEDS_REVIEW" | "NOT_EVALUATED" | "PARTIAL" | string;
  confidence: number;
  risk?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  explanation?: string;
  reason: string;
  source_document?: string | null;
  source_document_id?: number | null;
  source_page?: number | null;
  source_section?: string | null;
  extracted_text_snippet?: string | null;
  highlighted_box?: { top: number; left: number; width: number; height: number } | null;
  reviewer_status?: "PENDING" | "ACCEPTED" | "OVERRIDDEN" | string;
  officer_override?: {
    overridden: boolean;
    previous_status: string;
    new_status: string;
    reason: string;
    notes?: string;
    officer_name?: string;
    timestamp?: string;
  } | null;
}

export interface AnomalyItem {
  id: string;
  category: "CONTRADICTION" | "RISK_SIGNAL" | "DOCUMENT_INTEGRITY";
  type: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  bid_id?: number;
  bid_reference?: string;
  bidder_name?: string;
  tender_gem_number?: string;
  detail: string;
  timestamp: string;
}

export interface BidderSummary {
  id: number;
  legal_name: string;
  trade_name?: string | null;
  registered_address: string;
  state: string;
  pincode: string;
  contact_email: string;
  contact_phone: string;
  director_name?: string | null;
  annual_turnover_inr?: number | null;
  years_experience?: number | null;
  udyam_number?: string | null;
  gstin?: string | null;
  pan?: string | null;
  cin?: string | null;
  nsic_registration?: string | null;
  dpiit_startup_number?: string | null;
  epfo_code?: string | null;
  esic_code?: string | null;
  created_at: string;
  total_bids: number;
  total_documents: number;
  latest_score?: number | null;
  latest_risk?: "low" | "medium" | "high" | null;
  latest_recommendation?: "approve" | "request_clarification" | "reject" | null;
}

export interface GlobalDocumentItem {
  id: number;
  bid_id: number;
  bid_reference: string;
  tender_id: number;
  tender_gem_bid_number: string;
  tender_title: string;
  bidder_id: number;
  bidder_legal_name: string;
  document_type: DocumentType;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  status: "uploaded" | "verified" | "failed";
  integrity_status: string;
  expiry_date?: string | null;
  expiry_state: string;
  extracted_fields?: Record<string, unknown> | null;
  created_at: string;
}

export interface Contradiction {
  severity: string;
  field: string;
  left: { source: string; value: string };
  right: { source: string; value: string };
  note: string;
}

export interface RiskFactor {
  code: string;
  severity: string;
  detail: string;
}

export interface RelatedBidder {
  bidder_id: number;
  legal_name: string;
  confidence: number;
  matching_attributes: string[];
  review_signal: string;
}

export interface ComplianceCheck {
  id: number;
  bidder_id: number;
  tender_id: number;
  bid_id: number;
  overall_score: number;
  confidence: number;
  risk_level: "low" | "medium" | "high";
  recommendation: "approve" | "request_clarification" | "reject";
  summary: string;
  score_breakdown: {
    weights?: Record<string, number>;
    earned?: Record<string, number>;
    lines?: string[];
    officer_actions?: string[];
    failed_requirements?: string[];
  };
  requirement_results: RequirementResult[];
  contradictions: Contradiction[];
  risk_factors: RiskFactor[];
  related_bidders: RelatedBidder[];
  findings: Record<string, unknown>[];
  triggered_by_user_id: number | null;
  created_at: string;
  simulated_verification: boolean;
}

export type BidStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "clarification"
  | "approved"
  | "rejected";
export type VerificationStatus = "pending" | "verified" | "failed";

export interface BidListItem {
  id: number;
  reference_code: string;
  tender_id: number;
  gem_bid_number: string;
  title: string;
  department: string;
  estimated_value_inr: string | number;
  closing_date: string;
  status: BidStatus;
  verification_status: VerificationStatus;
  bidder_id: number;
  bidder_legal_name: string;
  overall_score: number | null;
  risk_level: "low" | "medium" | "high" | null;
  recommendation: ComplianceCheck["recommendation"] | null;
  updated_at: string;
  created_at: string;
}

export interface BidDetail {
  id: number;
  reference_code: string;
  status: BidStatus;
  verification_status: VerificationStatus;
  decision_notes: string | null;
  override_reason: string | null;
  decided_at: string | null;
  tender: Tender;
  bidder: Bidder;
  documents: DocumentRecord[];
  latest_check: ComplianceCheck | null;
  verification_results: {
    id: number;
    check_key: string;
    source: string;
    status: string;
    simulated: boolean;
    summary: string;
    payload: Record<string, unknown> | null;
    created_at?: string;
  }[];
  created_at: string;
  updated_at: string;
  simulated_verification: boolean;
}

export interface AuditLog {
  id: number;
  sequence_number?: number;
  actor_user_id: number | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  bid_id: number | null;
  result: string | null;
  detail: string;
  previous_value?: any;
  new_value?: any;
  reason?: string | null;
  previous_event_hash?: string | null;
  event_hash?: string | null;
  extra: Record<string, unknown> | null;
  created_at: string;
}

export type TenderListItem = BidListItem;
export type TenderDetail = BidDetail;

export interface PaginatedBids {
  items: BidListItem[];
  total: number;
}

export interface PaginatedAudit {
  items: AuditLog[];
  total: number;
}

export interface AuditIntegrityResult {
  is_valid: boolean;
  status: "VERIFIED_INTACT" | "INTEGRITY_COMPROMISED";
  total_events: number;
  genesis_hash: string;
  head_hash: string;
  verified_at: string;
  broken_chain_count: number;
  discrepancies: Array<{
    event_id: number;
    sequence: number;
    action: string;
    link_intact: boolean;
    hash_intact: boolean;
    stored_hash: string | null;
    computed_hash: string;
    stored_prev_hash: string | null;
    expected_prev_hash: string;
  }>;
  chain_summary: Array<{
    id: number;
    sequence: number;
    action: string;
    actor_role: string;
    actor_name: string;
    short_hash: string;
    short_prev_hash: string;
    created_at: string | null;
  }>;
}

export interface OfficerKpis {
  total_bids: number;
  pending_verification: number;
  verified: number;
  high_risk: number;
  average_score: number;
  awaiting_officer_action: number;
  expiring_certificates: number;
  total_tenders?: number;
  active_tenders?: number;
  completed_tenders?: number;
  total_bidders?: number;
  documents_uploaded?: number;
  documents_processed?: number;
  pending_reviews?: number;
  high_risk_bidders?: number;
  compliance_distribution?: {
    high_80_100?: number;
    mid_60_79?: number;
    low_below_60?: number;
  };
  risk_distribution?: {
    low?: number;
    medium?: number;
    high?: number;
    critical?: number;
  };
  recent_activity?: {
    id: number;
    action: string;
    detail: string;
    actor_role: string;
    created_at: string;
  }[];
}

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  kind: string;
  bid_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface CompareOut {
  tender: Tender;
  bids: BidDetail[];
}
