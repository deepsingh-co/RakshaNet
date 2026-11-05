/**
 * Typed endpoints for the advanced feature lab.
 *
 * Each call uses the real service when that service is configured, and the
 * on-device engine in `localBackend.ts` otherwise. This is what makes the
 * feature modules usable without the original Spring Boot / FastAPI services.
 */
import { api, aiApi, tokenStore, isBackendAvailable, isFeaturesAiConfigured } from "./client";
import {
  localAi,
  localAdmin,
  localBlockchain,
  localIncidents,
  localPods,
  localResponders,
  localSafeRide,
  localSos,
  localThreat,
  localVoiceCode,
} from "./localBackend";

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
    if (!isBackendAvailable()) return localSos.trigger(input) as SOSAlertDTO;
    const { data } = await api.post<SOSAlertDTO>("/api/v1/sos", input);
    return data;
  },
  async resolve(alertId: string): Promise<SOSAlertDTO> {
    if (!isBackendAvailable()) return localSos.resolve(alertId) as SOSAlertDTO;
    const { data } = await api.post<SOSAlertDTO>(`/api/v1/sos/${alertId}/resolve`);
    return data;
  },
  async active(): Promise<SOSAlertDTO[]> {
    if (!isBackendAvailable()) return localSos.active() as SOSAlertDTO[];
    const { data } = await api.get<SOSAlertDTO[]>("/api/v1/sos/active");
    return data;
  },
  async pushLocation(loc: {
    latitude: number; longitude: number;
    accuracy?: number; speed?: number; heading?: number; batteryPct?: number;
  }) {
    if (!isBackendAvailable()) { localSos.pushLocation(); return; }
    await api.post("/api/v1/sos/location", loc);
  },
  async getContacts(): Promise<{ id: string; name: string; relation: string; phone: string; email?: string; priority: number }[]> {
    if (!isBackendAvailable()) return localSos.contacts() as any;
    const { data } = await api.get("/api/v1/sos/contacts");
    return data;
  },
  async addContact(contact: { name: string; relation?: string; phone: string; email?: string; priority?: number }): Promise<any> {
    if (!isBackendAvailable()) return localSos.addContact(contact);
    const { data } = await api.post("/api/v1/sos/contacts", contact);
    return data;
  },
  async deleteContact(id: string): Promise<void> {
    if (!isBackendAvailable()) { localSos.deleteContact(id); return; }
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
    if (!isBackendAvailable()) return localIncidents.list(page, size) as any;
    const { data } = await api.get("/api/v1/incidents", { params: { page, size } });
    return data;
  },
  async verified(): Promise<IncidentDTO[]> {
    if (!isBackendAvailable()) return localIncidents.verified() as IncidentDTO[];
    const { data } = await api.get<IncidentDTO[]>("/api/v1/incidents/verified");
    return data;
  },
  async create(input: {
    areaName: string; latitude?: number; longitude?: number;
    type: string; severity: number; description?: string; isAnonymous: boolean;
  }): Promise<IncidentDTO> {
    if (!isBackendAvailable()) return localIncidents.create(input) as IncidentDTO;
    const { data } = await api.post<IncidentDTO>("/api/v1/incidents", input);
    return data;
  },
  async upvote(id: string) {
    if (!isBackendAvailable()) { localIncidents.upvote(id); return; }
    await api.post(`/api/v1/incidents/${id}/upvote`);
  },
  async verify(id: string): Promise<IncidentDTO> {
    if (!isBackendAvailable()) return localIncidents.verify(id) as IncidentDTO;
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
    if (!isBackendAvailable()) return localThreat.timeline() as ThreatScoreDTO[];
    const { data } = await api.get<ThreatScoreDTO[]>("/api/v1/threat");
    return data;
  },
};

// ── Admin ───────────────────────────────────────────────────────────
export const adminApi = {
  async stats() {
    if (!isBackendAvailable()) return localAdmin.stats();
    const { data } = await api.get("/api/v1/admin/stats");
    return data;
  },
};

// ── Next-Gen AI Services ────────────────────────────────────────────
export const aiServicesApi = {
  async detectDeepfake(audioBlob: Blob): Promise<any> {
    if (!isFeaturesAiConfigured) return localAi.detectDeepfake(audioBlob);
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.wav");
    const { data } = await aiApi.post("/ai/deepfake", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  async companionChat(userId: string, message: string): Promise<any> {
    if (!isFeaturesAiConfigured) return localAi.companionChat(userId, message);
    const { data } = await aiApi.post("/ai/companion/chat", { user_id: userId, message });
    return data;
  },
  async companionRemember(userId: string, content: string, category = "general", importance = 0.5): Promise<any> {
    if (!isFeaturesAiConfigured) return localAi.companionRemember(userId, content, category);
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
    if (!isFeaturesAiConfigured) return localAi.analyzeStalker(observation);
    const { data } = await aiApi.post("/ai/stalker/analyze", observation);
    return data;
  },
  async broadcastMesh(payload: {
    source_node: string;
    nodes: any[];
    max_hops?: number;
  }): Promise<any> {
    if (!isFeaturesAiConfigured) return localAi.broadcastMesh(payload);
    const { data } = await aiApi.post("/ai/mesh/broadcast", payload);
    return data;
  },
  async rankBystanders(responders: any[], topK = 5): Promise<any> {
    if (!isFeaturesAiConfigured) return localAi.rankBystanders(responders, topK);
    const { data } = await aiApi.post("/ai/bystander/rank", { responders, top_k: topK });
    return data;
  },
  async recognizeGesture(readings: any[]): Promise<any> {
    if (!isFeaturesAiConfigured) return localAi.recognizeGesture(readings);
    const { data } = await aiApi.post("/ai/gesture/recognize", { readings });
    return data;
  },
  async walkChat(message: string, userName: string, walkStage = "middle", destination?: string, distanceWalked = 0.0): Promise<any> {
    if (!isFeaturesAiConfigured) return localAi.walkChat(message, userName, walkStage, destination, distanceWalked);
    const { data } = await aiApi.post("/ai/walk/chat", {
      user_message: message, user_name: userName, walk_stage: walkStage, destination, distance_walked: distanceWalked
    });
    return data;
  },
  async traumaCoach(message: string, userName: string): Promise<any> {
    if (!isFeaturesAiConfigured) return localAi.traumaCoach(message, userName);
    const { data } = await aiApi.post("/ai/trauma/coach", { user_message: message, user_name: userName });
    return data;
  },
  async getTherapists(location = "Delhi"): Promise<any> {
    if (!isFeaturesAiConfigured) return localAi.getTherapists(location);
    const { data } = await aiApi.get("/ai/trauma/therapists", { params: { location } });
    return data;
  },
  async generateFir(payload: {
    user_name: string; user_phone: string; incident_type: string;
    date: string; location: string; description: string;
    accused?: string; witnesses?: string[]; evidence?: string[];
  }): Promise<any> {
    if (!isFeaturesAiConfigured) return localAi.generateFir(payload);
    const { data } = await aiApi.post("/ai/legal/fir", payload);
    return data;
  },
};

// ── Safety Pods ─────────────────────────────────────────────────────
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
    if (!isBackendAvailable()) return localPods.list(userName) as SafetyPodDTO[];
    const { data } = await api.get<SafetyPodDTO[]>("/api/v1/pods", { params: { userName } });
    return data;
  },
  async create(name: string, userName: string): Promise<SafetyPodDTO> {
    if (!isBackendAvailable()) return localPods.create(name, userName) as SafetyPodDTO;
    const { data } = await api.post<SafetyPodDTO>("/api/v1/pods/create", { name, userName });
    return data;
  },
  async join(code: string, userName: string): Promise<SafetyPodDTO> {
    if (!isBackendAvailable()) return localPods.join(code, userName) as SafetyPodDTO;
    const { data } = await api.post<SafetyPodDTO>("/api/v1/pods/join", { code, userName });
    return data;
  },
  async triggerSos(code: string, userName: string): Promise<SafetyPodDTO> {
    if (!isBackendAvailable()) return localPods.triggerSos(code, userName) as SafetyPodDTO;
    const { data } = await api.post<SafetyPodDTO>(`/api/v1/pods/${code}/sos`, { userName });
    return data;
  },
  async resolveSos(code: string): Promise<SafetyPodDTO> {
    if (!isBackendAvailable()) return localPods.resolveSos(code) as SafetyPodDTO;
    const { data } = await api.post<SafetyPodDTO>(`/api/v1/pods/${code}/sos/resolve`, {});
    return data;
  },
  async delete(code: string, userName: string): Promise<void> {
    if (!isBackendAvailable()) { localPods.remove(code, userName); return; }
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
    if (!isBackendAvailable()) return localResponders.active() as ActiveResponderDTO[];
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
    if (!isBackendAvailable()) return localBlockchain.getChain() as Promise<EvidenceBlockDTO[]>;
    const { data } = await api.get<EvidenceBlockDTO[]>("/api/v1/blockchain");
    return data;
  },
  async addEvidence(input: { type: string; description: string }): Promise<EvidenceBlockDTO> {
    if (!isBackendAvailable()) return localBlockchain.addEvidence(input) as Promise<EvidenceBlockDTO>;
    const { data } = await api.post<EvidenceBlockDTO>("/api/v1/blockchain/add", input);
    return data;
  },
  async verifyChain(): Promise<boolean> {
    if (!isBackendAvailable()) return localBlockchain.verifyChain();
    const { data } = await api.get<boolean>("/api/v1/blockchain/verify");
    return data;
  },
  async tamperBlock(id: string): Promise<EvidenceBlockDTO> {
    if (!isBackendAvailable()) return localBlockchain.tamperBlock(id) as Promise<EvidenceBlockDTO>;
    const { data } = await api.post<EvidenceBlockDTO>(`/api/v1/blockchain/${id}/tamper`);
    return data;
  },
};

// ── Voice secret code ───────────────────────────────────────────────
export const voiceCodeApi = {
  async get(): Promise<{ active: boolean; hint: string }> {
    if (!isBackendAvailable()) return localVoiceCode.get();
    const { data } = await api.get("/api/v1/voice-code");
    return data;
  },
  async save(phrase: string): Promise<{ hint: string }> {
    if (!isBackendAvailable()) return localVoiceCode.save(phrase);
    const { data } = await api.post("/api/v1/voice-code", { phrase });
    return data;
  },
  async remove(): Promise<void> {
    if (!isBackendAvailable()) { await localVoiceCode.remove(); return; }
    await api.delete("/api/v1/voice-code");
  },
  async verify(spoken: string): Promise<{ match: boolean }> {
    if (!isBackendAvailable()) return localVoiceCode.verify(spoken);
    const { data } = await api.post("/api/v1/voice-code/verify", { spoken });
    return data;
  },
};

// ── Safe ride ───────────────────────────────────────────────────────
export const safeRideApi = {
  async active(): Promise<any | null> {
    if (!isBackendAvailable()) return localSafeRide.active();
    const { data } = await api.get("/api/v1/safe-ride/active");
    return data?.id ? data : null;
  },
  async sendOtp(mobile: string): Promise<{ sent: boolean; devOtp?: string }> {
    if (!isBackendAvailable()) return localSafeRide.sendOtp(mobile);
    const { data } = await api.post("/api/v1/safe-ride/driver-otp/send", { mobile });
    return data;
  },
  async verifyOtp(mobile: string, otp: string): Promise<{ verified: boolean }> {
    if (!isBackendAvailable()) return localSafeRide.verifyOtp(mobile, otp);
    const { data } = await api.post("/api/v1/safe-ride/driver-otp/verify", { mobile, otp });
    return data;
  },
  async start(input: Record<string, unknown>): Promise<any> {
    if (!isBackendAvailable()) return localSafeRide.start(input);
    const { data } = await api.post("/api/v1/safe-ride/start", input);
    return data;
  },
  async addLocation(rideId: string, location: string): Promise<void> {
    if (!isBackendAvailable()) { localSafeRide.addLocation(rideId, location); return; }
    await api.post(`/api/v1/safe-ride/${rideId}/location`, { location });
  },
  async end(rideId: string): Promise<void> {
    if (!isBackendAvailable()) { localSafeRide.end(rideId); return; }
    await api.post(`/api/v1/safe-ride/${rideId}/end`);
  },
};

/** True when the lab is running entirely on this device. */
export const isLocalMode = !isBackendAvailable();

export { isBackendAvailable };
