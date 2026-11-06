/**
 * Typed endpoints — thin wrapper over axios client.
 * Each function returns the backend DTO shape.
 */
import { api, aiApi, tokenStore, isBackendAvailable } from "./client";

// ── Auth ────────────────────────────────────────────────────────────
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInMs: number;
  userId: string;
  fullName: string;
  email: string;
  role: "USER" | "GUARDIAN" | "POLICE" | "ADMIN";
}

export const authApi = {
  async register(input: {
    fullName: string; email: string; phone?: string;
    password: string; role?: "USER" | "GUARDIAN" | "ADMIN";
    bloodGroup?: string; medicalInfo?: string; stealthPin?: string;
  }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/v1/auth/register", input);
    tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/v1/auth/login", { email, password });
    tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },
  logout() { tokenStore.clear(); },
};

// ── SOS ─────────────────────────────────────────────────────────────
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TriggerType =
  | "MANUAL" | "VOICE" | "SHAKE" | "SMARTWATCH" | "STEALTH_PIN"
  | "VOLUME_PATTERN" | "EMOTION_AI" | "FALL_DETECTION" | "BEHAVIORAL_AI";

export interface SOSAlertDTO {
  id: string;
  userId: string;
  userName: string;
  triggerType: TriggerType;
  riskLevel: RiskLevel;
  confidence: number;
  latitude: number;
  longitude: number;
  areaName?: string;
  status: "ACTIVE" | "ESCALATED" | "RESOLVED" | "DISMISSED";
  batteryPct?: number;
  speedMps?: number;
  heartRate?: number;
  createdAt: string;
}

export const sosApi = {
  async trigger(input: {
    triggerType: TriggerType;
    latitude: number; longitude: number;
    areaName?: string; batteryPct?: number;
    speedMps?: number; heartRate?: number;
  }): Promise<SOSAlertDTO> {
    const { data } = await api.post<SOSAlertDTO>("/api/v1/sos", input);
    return data;
  },
  async resolve(alertId: string): Promise<SOSAlertDTO> {
    const { data } = await api.post<SOSAlertDTO>(`/api/v1/sos/${alertId}/resolve`);
    return data;
  },
  async active(): Promise<SOSAlertDTO[]> {
    const { data } = await api.get<SOSAlertDTO[]>("/api/v1/sos/active");
    return data;
  },
  async pushLocation(loc: {
    latitude: number; longitude: number;
    accuracy?: number; speed?: number; heading?: number; batteryPct?: number;
  }) {
    await api.post("/api/v1/sos/location", loc);
  },
  async getContacts(): Promise<{ id: string; name: string; relation: string; phone: string; email?: string; priority: number }[]> {
    const { data } = await api.get("/api/v1/sos/contacts");
    return data;
  },
  async addContact(contact: { name: string; relation?: string; phone: string; email?: string; priority?: number }): Promise<any> {
    const { data } = await api.post("/api/v1/sos/contacts", contact);
    return data;
  },
  async deleteContact(id: string): Promise<void> {
    await api.delete(`/api/v1/sos/contacts/${id}`);
  },
};

// ── Incidents ───────────────────────────────────────────────────────
export interface IncidentDTO {
  id: string;
  areaName: string;
  latitude?: number;
  longitude?: number;
  type: string;
  severity: number;
  description?: string;
  isAnonymous: boolean;
  verified: boolean;
  upvotes: number;
  reporterName: string;
  createdAt: string;
}

export const incidentApi = {
  async list(page = 0, size = 25): Promise<{ content: IncidentDTO[]; totalElements: number }> {
    const { data } = await api.get("/api/v1/incidents", { params: { page, size } });
    return data;
  },
  async verified(): Promise<IncidentDTO[]> {
    const { data } = await api.get<IncidentDTO[]>("/api/v1/incidents/verified");
    return data;
  },
  async create(input: {
    areaName: string; latitude?: number; longitude?: number;
    type: string; severity: number; description?: string; isAnonymous: boolean;
  }): Promise<IncidentDTO> {
    const { data } = await api.post<IncidentDTO>("/api/v1/incidents", input);
    return data;
  },
  async upvote(id: string) {
    await api.post(`/api/v1/incidents/${id}/upvote`);
  },
  async verify(id: string): Promise<IncidentDTO> {
    const { data } = await api.post<IncidentDTO>(`/api/v1/incidents/${id}/verify`);
    return data;
  },
};

// ── Threat scores ───────────────────────────────────────────────────
export interface ThreatScoreDTO {
  score: number;
  confidence: number;
  riskLevel: RiskLevel;
  factors: Record<string, number>;
  computedAt: string;
}
export const threatApi = {
  async timeline(): Promise<ThreatScoreDTO[]> {
    const { data } = await api.get<ThreatScoreDTO[]>("/api/v1/threat");
    return data;
  },
};

// ── Admin ───────────────────────────────────────────────────────────
export const adminApi = {
  async stats() {
    const { data } = await api.get("/api/v1/admin/stats");
    return data;
  },
};

// ── Next-Gen AI Services (FastAPI on :8000) ──────────────────────────
export const aiServicesApi = {
  async detectDeepfake(audioBlob: Blob): Promise<any> {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.wav");
    const { data } = await aiApi.post("/ai/deepfake", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  async companionChat(userId: string, message: string): Promise<any> {
    const { data } = await aiApi.post("/ai/companion/chat", { user_id: userId, message });
    return data;
  },
  async companionRemember(userId: string, content: string, category = "general", importance = 0.5): Promise<any> {
    const { data } = await aiApi.post("/ai/companion/remember", {
      user_id: userId, content, category, importance,
    });
    return data;
  },
  async analyzeStalker(observation: {
    mac_address: string; signal_strength: number; distance_meters: number;
    duration_seconds: number; first_seen: number; last_seen: number;
    observation_count: number; location_changes: number;
  }): Promise<any> {
    const { data } = await aiApi.post("/ai/stalker/analyze", observation);
    return data;
  },
  async broadcastMesh(payload: {
    source_node: string;
    nodes: any[];
    max_hops?: number;
  }): Promise<any> {
    const { data } = await aiApi.post("/ai/mesh/broadcast", payload);
    return data;
  },
  async rankBystanders(responders: any[], topK = 5): Promise<any> {
    const { data } = await aiApi.post("/ai/bystander/rank", { responders, top_k: topK });
    return data;
  },
  async recognizeGesture(readings: any[]): Promise<any> {
    const { data } = await aiApi.post("/ai/gesture/recognize", { readings });
    return data;
  },
  async walkChat(message: string, userName: string, walkStage = "middle", destination?: string, distanceWalked = 0.0): Promise<any> {
    const { data } = await aiApi.post("/ai/walk/chat", {
      user_message: message, user_name: userName, walk_stage: walkStage, destination, distance_walked: distanceWalked
    });
    return data;
  },
  async traumaCoach(message: string, userName: string): Promise<any> {
    const { data } = await aiApi.post("/ai/trauma/coach", { user_message: message, user_name: userName });
    return data;
  },
  async getTherapists(location = "Delhi"): Promise<any> {
    const { data } = await aiApi.get("/ai/trauma/therapists", { params: { location } });
    return data;
  },
  async generateFir(payload: {
    user_name: string; user_phone: string; incident_type: string;
    date: string; location: string; description: string;
    accused?: string; witnesses?: string[]; evidence?: string[];
  }): Promise<any> {
    const { data } = await aiApi.post("/ai/legal/fir", payload);
    return data;
  },
};

// ── Safety Pods (Spring Boot Relational DB) ──────────────────────────
export interface SafetyPodDTO {
  id: string;
  name: string;
  code: string;
  members: number;
  active: boolean;
  creatorName?: string;
  memberNames?: string;
  sosTriggeredBy?: string;
  createdAt: string;
}

export const podsApi = {
  async list(userName: string): Promise<SafetyPodDTO[]> {
    const { data } = await api.get<SafetyPodDTO[]>("/api/v1/pods", { params: { userName } });
    return data;
  },
  async create(name: string, userName: string): Promise<SafetyPodDTO> {
    const { data } = await api.post<SafetyPodDTO>("/api/v1/pods/create", { name, userName });
    return data;
  },
  async join(code: string, userName: string): Promise<SafetyPodDTO> {
    const { data } = await api.post<SafetyPodDTO>("/api/v1/pods/join", { code, userName });
    return data;
  },
  async triggerSos(code: string, userName: string): Promise<SafetyPodDTO> {
    const { data } = await api.post<SafetyPodDTO>(`/api/v1/pods/${code}/sos`, { userName });
    return data;
  },
  async resolveSos(code: string): Promise<SafetyPodDTO> {
    const { data } = await api.post<SafetyPodDTO>(`/api/v1/pods/${code}/sos/resolve`, {});
    return data;
  },
  async delete(code: string, userName: string): Promise<void> {
    await api.delete(`/api/v1/pods/${code}`, { params: { userName } });
  },
};

export interface ActiveResponderDTO {
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  profession: string;
  verifiedIdentity: boolean;
  isMedicalProfessional: boolean;
}

export const trackingApi = {
  async activeResponders(): Promise<ActiveResponderDTO[]> {
    const { data } = await api.get<ActiveResponderDTO[]>("/api/v1/tracking/active-responders");
    return data;
  },
};

// ── Blockchain Evidence Chain ───────────────────────────────────────
export interface EvidenceBlockDTO {
  id: string;
  blockIndex: number;
  timestamp: string;
  type: string;
  description: string;
  prevHash: string;
  hash: string;
  tampered: boolean;
  userId: string;
}

export const blockchainApi = {
  async getChain(): Promise<EvidenceBlockDTO[]> {
    const { data } = await api.get<EvidenceBlockDTO[]>("/api/v1/blockchain");
    return data;
  },
  async addEvidence(input: { type: string; description: string }): Promise<EvidenceBlockDTO> {
    const { data } = await api.post<EvidenceBlockDTO>("/api/v1/blockchain/add", input);
    return data;
  },
  async verifyChain(): Promise<boolean> {
    const { data } = await api.get<boolean>("/api/v1/blockchain/verify");
    return data;
  },
  async tamperBlock(id: string): Promise<EvidenceBlockDTO> {
    const { data } = await api.post<EvidenceBlockDTO>(`/api/v1/blockchain/${id}/tamper`);
    return data;
  },
};

export { isBackendAvailable };
