import type {
  BidDetail,
  BidListItem,
  BidStatus,
  CompareOut,
  ComplianceCheck,
  DocumentRecord,
  DocumentType,
  NotificationItem,
  OfficerKpis,
  PaginatedAudit,
  AuditIntegrityResult,
  PaginatedBids,
  Tender,
  TokenResponse,
  User,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function token(): string | null {
  return localStorage.getItem("complygem_token");
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  asText = false
): Promise<T> {
  const headers = new Headers(init.headers);
  if (
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type") &&
    !asText
  ) {
    headers.set("Content-Type", "application/json");
  }
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  if (asText) {
    if (!res.ok) throw new ApiError(res.status, "http_error", res.statusText);
    return (await res.text()) as T;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "http_error",
      err?.message ?? res.statusText
    );
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (payload: Record<string, unknown>) =>
    request<TokenResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request<User>("/api/auth/me"),
  listTenders: () => request<Tender[]>("/api/tenders"),
  getTender: (id: number) => request<Tender>(`/api/tenders/${id}`),
  extractRequirements: (id: number) =>
    request<Tender>(`/api/tenders/${id}/extract-requirements`, {
      method: "POST",
    }),
  listBids: (params: {
    q?: string;
    status?: BidStatus | "";
    risk?: string;
    verification?: string;
    score_min?: string;
    score_max?: string;
    date_from?: string;
    date_to?: string;
    tender_id?: number;
    sort?: string;
    skip?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v));
    });
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<PaginatedBids>(`/api/bids${suffix}`);
  },
  createBid: (tenderId: number) =>
    request<BidDetail>("/api/bids", {
      method: "POST",
      body: JSON.stringify({ tender_id: tenderId }),
    }),
  getBid: (id: number) => request<BidDetail>(`/api/bids/${id}`),
  verifyBid: (id: number) =>
    request<ComplianceCheck>(`/api/bids/${id}/verify`, { method: "POST" }),
  getScore: (id: number) =>
    request<Record<string, unknown>>(`/api/bids/${id}/score`),
  getRisk: (id: number) =>
    request<Record<string, unknown>>(`/api/bids/${id}/risk`),
  approve: (id: number, notes: string, override_reason?: string) =>
    request<BidDetail>(`/api/bids/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes, override_reason: override_reason || null }),
    }),
  reject: (id: number, notes: string, override_reason?: string) =>
    request<BidDetail>(`/api/bids/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ notes, override_reason: override_reason || null }),
    }),
  clarify: (id: number, notes: string, override_reason?: string) =>
    request<BidDetail>(`/api/bids/${id}/clarification`, {
      method: "POST",
      body: JSON.stringify({ notes, override_reason: override_reason || null }),
    }),
  decideBid: (
    id: number,
    decision: "approved" | "rejected" | "clarification",
    notes: string,
    override_reason?: string
  ) => {
    const action =
      decision === "approved"
        ? "approve"
        : decision === "rejected"
        ? "reject"
        : "clarification";
    return request<BidDetail>(`/api/bids/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify({ notes, override_reason: override_reason || null }),
    });
  },
  listDocuments: (bidId: number) =>
    request<DocumentRecord[]>(`/api/bids/${bidId}/documents`),
  uploadDocument: (
    arg1: number | File,
    arg2: DocumentType | File,
    arg3?: number | DocumentType
  ) => {
    const isLegacy = typeof arg1 === "number";
    const bidId = isLegacy ? (arg1 as number) : (arg3 as number | undefined);
    const file = isLegacy ? (arg2 as File) : (arg1 as File);
    const documentType = isLegacy
      ? (arg3 as DocumentType)
      : (arg2 as DocumentType);
    if (bidId === undefined || !file || !documentType) {
      throw new ApiError(
        400,
        "INVALID_UPLOAD",
        "A valid bid ID, file and document type are required."
      );
    }
    const body = new FormData();
    body.append("file", file);
    body.append("document_type", documentType);
    return request<DocumentRecord>(`/api/bids/${bidId}/documents`, {
      method: "POST",
      body,
    });
  },
  uploadDocumentWithProgress: (
    bidId: number,
    file: File,
    documentType: DocumentType,
    onProgress: (percent: number) => void
  ) =>
    new Promise<DocumentRecord>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const body = new FormData();
      body.append("file", file);
      body.append("document_type", documentType);
      xhr.open("POST", `${API_BASE}/api/bids/${bidId}/documents`);
      const t = token();
      if (t) xhr.setRequestHeader("Authorization", `Bearer ${t}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable)
          onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300)
          resolve(data as DocumentRecord);
        else
          reject(
            new ApiError(
              xhr.status,
              data?.error?.code ?? "UPLOAD_FAILED",
              data?.error?.message ?? "Upload failed."
            )
          );
      };
      xhr.onerror = () =>
        reject(
          new ApiError(
            0,
            "NETWORK_ERROR",
            "Upload failed. Check your connection."
          )
        );
      xhr.send(body);
    }),
  deleteDocument: (id: number) =>
    request<void>(`/api/documents/${id}`, { method: "DELETE" }),
  documentUrl: (id: number) => `${API_BASE}/api/documents/${id}/file`,
  downloadDocument: async (id: number, filename: string) => {
    const t = token();
    const res = await fetch(`${API_BASE}/api/documents/${id}/file`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
    if (!res.ok)
      throw new ApiError(
        res.status,
        "DOWNLOAD_FAILED",
        "Document could not be downloaded."
      );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
  listAudit: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<PaginatedAudit>(`/api/audit-logs${suffix}`);
  },
  verifyAuditIntegrity: () =>
    request<AuditIntegrityResult>("/api/audit-logs/verify-integrity"),
  backfillAuditChain: () =>
    request<{ status: string; events_chained: number }>(
      "/api/audit-logs/backfill-chain",
      { method: "POST" }
    ),
  simulateAuditTampering: (eventId: number) =>
    request<{ status: string; message: string }>(
      `/api/audit-logs/simulate-tampering?event_id=${eventId}`,
      { method: "POST" }
    ),
  restoreAuditChain: () =>
    request<{ status: string; events_resealed: number }>(
      "/api/audit-logs/restore-chain",
      { method: "POST" }
    ),
  bidAudit: (id: number) =>
    request<PaginatedAudit>(`/api/bids/${id}/audit-log`),
  reportHtml: (id: number) =>
    request<string>(`/api/bids/${id}/report`, {}, true),
  assistant: (id: number, question: string) =>
    request<{ answer: string; grounded: boolean }>(
      `/api/bids/${id}/assistant`,
      {
        method: "POST",
        body: JSON.stringify({ question }),
      }
    ),
  kpis: () => request<OfficerKpis>("/api/officer/kpis"),
  compare: (tenderId: number, bidIds: number[]) =>
    request<CompareOut>(
      `/api/officer/compare?tender_id=${tenderId}&bid_ids=${bidIds.join(",")}`
    ),
  notifications: () => request<NotificationItem[]>("/api/notifications"),
  markRead: (id: number) =>
    request<NotificationItem>(`/api/notifications/${id}/read`, {
      method: "POST",
    }),
  createTender: (payload: {
    gem_bid_number: string;
    title: string;
    department: string;
    category: string;
    estimated_value_inr: number;
    closing_date: string;
    description: string;
    source_text?: string;
  }) =>
    request<Tender>("/api/tenders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addRequirement: (tenderId: number, payload: {
    requirement: string;
    category?: string;
    mandatory?: boolean;
    threshold?: number | null;
    currency?: string | null;
    evidence_types?: string[];
    notes?: string;
  }) =>
    request<Tender>(`/api/tenders/${tenderId}/requirements`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateRequirement: (tenderId: number, reqId: number, payload: Record<string, unknown>) =>
    request<Tender>(`/api/tenders/${tenderId}/requirements/${reqId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteRequirement: (tenderId: number, reqId: number) =>
    request<Tender>(`/api/tenders/${tenderId}/requirements/${reqId}`, {
      method: "DELETE",
    }),
  overrideRequirement: (
    bidId: number,
    reqId: number,
    newStatus: string,
    reason: string,
    notes?: string
  ) =>
    request<BidDetail>(`/api/bids/${bidId}/requirements/${reqId}/override`, {
      method: "POST",
      body: JSON.stringify({ new_status: newStatus, reason, notes }),
    }),
  listBidders: (params?: { q?: string; state?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.state) qs.set("state", params.state);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<any[]>(`/api/bidders${suffix}`);
  },
  getBidder: (id: number) => request<any>(`/api/bidders/${id}`),
  createBidder: (payload: Record<string, unknown>) =>
    request<any>("/api/bidders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listAllDocuments: (params?: { q?: string; document_type?: string; status?: string; integrity?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.document_type) qs.set("document_type", params.document_type);
    if (params?.status) qs.set("status", params.status);
    if (params?.integrity) qs.set("integrity", params.integrity);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<any[]>(`/api/documents${suffix}`);
  },
  listAnomalies: (params?: { severity?: string }) => {
    const qs = new URLSearchParams();
    if (params?.severity) qs.set("severity", params.severity);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<any[]>(`/api/officer/anomalies${suffix}`);
  },
  updateTender: (id: number, payload: Record<string, unknown>) =>
    request<Tender>(`/api/tenders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteTender: (id: number) =>
    request<void>(`/api/tenders/${id}`, {
      method: "DELETE",
    }),
  uploadTenderDocument: (tenderId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<any>(`/api/tenders/${tenderId}/documents`, {
      method: "POST",
      body: form,
    });
  },
  updateBidder: (id: number, payload: Record<string, unknown>) =>
    request<any>(`/api/bidders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteBidder: (id: number) =>
    request<void>(`/api/bidders/${id}`, {
      method: "DELETE",
    }),
  updateExtractedFields: (documentId: number, payload: { extracted_fields: Record<string, unknown>; integrity_status?: string; expiry_date?: string }) =>
    request<any>(`/api/documents/${documentId}/extracted-fields`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getVigilanceRelationships: (params?: { tender_id?: number; risk_level?: string }) => {
    const qs = new URLSearchParams();
    if (params?.tender_id) qs.set("tender_id", String(params.tender_id));
    if (params?.risk_level && params.risk_level !== "all") qs.set("risk_level", params.risk_level);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<{
      disclaimer: string;
      total_alerts: number;
      stats: {
        high_risk: number;
        medium_risk: number;
        low_risk: number;
        pending_review: number;
      };
      alerts: Array<{
        alert_id: string;
        title: string;
        risk_level: "HIGH" | "MEDIUM" | "LOW";
        risk_score: number;
        disclaimer: string;
        bidder_a: any;
        bidder_b: any;
        indicators: Array<{
          code: string;
          title: string;
          severity: string;
          detail: string;
          evidence: any;
        }>;
        indicator_count: number;
        action_status: string;
        action_reason?: string;
        officer_name?: string;
        action_date?: string;
      }>;
      graph: {
        nodes: Array<{
          id: string;
          label: string;
          fullName?: string;
          type: "BIDDER" | "DIRECTOR" | "ADDRESS" | "PHONE" | "DOCUMENT_HASH";
          category?: string;
          bidderId?: number;
          state?: string;
          director?: string;
          hasAlert?: boolean;
          docName?: string;
        }>;
        edges: Array<{
          id: string;
          source: string;
          target: string;
          relationship: string;
          color?: string;
        }>;
      };
    }>(`/api/vigilance/relationships${suffix}`);
  },
  recordVigilanceAction: (payload: {
    alert_id: string;
    action: "ACKNOWLEDGE" | "INVESTIGATE" | "DISMISS" | "ESCALATE";
    reason?: string;
    notes?: string;
  }) =>
    request<{
      status: string;
      action_id: number;
      alert_id: string;
      action: string;
      officer_name: string;
      created_at: string;
    }>("/api/vigilance/action", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getVigilanceActions: (params?: { alert_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.alert_id) qs.set("alert_id", params.alert_id);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<
      Array<{
        id: number;
        alert_id: string;
        action: string;
        officer_id?: number;
        officer_name?: string;
        reason?: string;
        notes?: string;
        created_at?: string;
      }>
    >(`/api/vigilance/actions${suffix}`);
  },
  getDeliveryBatches: (params?: { tender_id?: number }) => {
    const qs = new URLSearchParams();
    if (params?.tender_id) qs.set("tender_id", String(params.tender_id));
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<any[]>(`/api/deliveries/batches${suffix}`);
  },
  getBatchAssets: (batchId: number, statusFilter?: string) => {
    const qs = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") qs.set("status_filter", statusFilter);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<any[]>(`/api/deliveries/batches/${batchId}/assets${suffix}`);
  },
  lookupDeliveryAsset: (query: string) => {
    const qs = new URLSearchParams({ query });
    return request<any>(`/api/deliveries/assets/lookup?${qs}`);
  },
  verifyDeliveryAsset: (payload: {
    asset_id_or_serial: string;
    actual_spec: Record<string, unknown>;
    inspection_notes?: string;
    status_override?: string;
  }) =>
    request<any>("/api/deliveries/assets/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  requestPhysicalInspection: (
    assetId: string,
    payload: { target_components: string[]; instructions: string }
  ) =>
    request<any>(`/api/deliveries/assets/${assetId}/request-inspection`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getPhysicalInspections: (statusFilter?: string) => {
    const qs = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") qs.set("status_filter", statusFilter);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<any[]>(`/api/deliveries/inspections${suffix}`);
  },
  getPrototypeTestDevices: () =>
    request<{ notice: string; devices: any[] }>("/api/deliveries/test-devices"),
  getInspectionCases: (statusFilter?: string) => {
    const qs = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") qs.set("status_filter", statusFilter);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<any[]>(`/api/deliveries/inspection-cases${suffix}`);
  },
  getInspectionCase: (caseId: string) =>
    request<any>(`/api/deliveries/inspection-cases/${caseId}`),
  createCaseFromAsset: (assetId: string) =>
    request<any>("/api/deliveries/inspection-cases/create-from-asset", {
      method: "POST",
      body: JSON.stringify({ asset_id: assetId }),
    }),
  submitInspectionDecision: (
    caseId: string,
    payload: {
      final_decision: "ACCEPT" | "REJECT" | "RETEST" | "HOLD" | "REQUEST_CLARIFICATION";
      decision_justification: string;
      checklist?: any[];
      officer_remarks?: string;
    }
  ) =>
    request<any>(`/api/deliveries/inspection-cases/${caseId}/decision`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  seedDemo: () =>
    request<{ status: string; message: string; data: any }>("/api/demo/seed", {
      method: "POST",
    }),
  getDemoStatus: () =>
    request<{
      active: boolean;
      tender_id?: number;
      gem_bid_number?: string;
      title?: string;
      estimated_value_inr?: number;
      requirements_count?: number;
      fictional_disclaimer?: string;
    }>("/api/demo/status"),
  updateInspectionChecklist: (
    caseId: string,
    payload: {
      checklist: any[];
      officer_remarks?: string;
    }
  ) =>
    request<any>(`/api/deliveries/inspection-cases/${caseId}/checklist`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

export type { BidListItem };
